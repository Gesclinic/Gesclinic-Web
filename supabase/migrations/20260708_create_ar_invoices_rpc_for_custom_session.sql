-- Permite criar recebiveis canonicos a partir da agenda mesmo quando o login
-- local usa a sessao customizada em vez de uma sessao Supabase Auth completa.

create or replace function public.create_ar_invoices_from_json(
  p_clinic_id uuid,
  p_rows jsonb,
  p_user_id uuid default null,
  p_email text default null
)
returns setof public.ar_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_access boolean;
  v_row jsonb;
  v_clean_row jsonb;
  v_columns text;
  v_select_columns text;
  v_inserted public.ar_invoices;
  v_existing public.ar_invoices;
begin
  if p_clinic_id is null then
    raise exception 'clinic_id is required';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'rows must be a non-empty json array';
  end if;

  select exists (
    select 1
    from public.users u
    where u.clinic_id = p_clinic_id
      and (
        u.id = auth.uid()
        or (p_user_id is not null and u.id = p_user_id)
        or (p_email is not null and lower(u.email) = lower(p_email))
      )
  ) into v_has_access;

  if not v_has_access then
    raise exception 'Access denied for clinic %', p_clinic_id;
  end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    if coalesce((v_row ->> 'clinic_id')::uuid, p_clinic_id) <> p_clinic_id then
      raise exception 'Invalid clinic_id in receivable row';
    end if;

    v_clean_row := (v_row - 'id' - 'created_at' - 'updated_at') || jsonb_build_object('clinic_id', p_clinic_id);

    v_existing := null;
    if v_clean_row ? 'appointment_id' and nullif(v_clean_row ->> 'appointment_id', '') is not null then
      select *
      into v_existing
      from public.ar_invoices ai
      where ai.clinic_id = p_clinic_id
        and ai.appointment_id = (v_clean_row ->> 'appointment_id')::uuid
        and lower(coalesce(ai.status, 'open')) not in ('canceled', 'cancelado', 'reversed', 'estornado')
      order by ai.created_at asc nulls last
      limit 1;

      if v_existing.id is not null then
        return next v_existing;
        continue;
      end if;
    end if;

    select
      string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position),
      string_agg(format('r.%I', c.column_name), ', ' order by c.ordinal_position)
    into v_columns, v_select_columns
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'ar_invoices'
      and c.column_name not in ('id', 'created_at', 'updated_at')
      and v_clean_row ? c.column_name;

    if v_columns is null then
      raise exception 'No valid ar_invoices columns in payload';
    end if;

    execute format(
      'insert into public.ar_invoices (%s) select %s from jsonb_populate_record(null::public.ar_invoices, $1) as r returning *',
      v_columns,
      v_select_columns
    )
    using v_clean_row
    into v_inserted;

    return next v_inserted;
  end loop;

  return;
end;
$$;

grant execute on function public.create_ar_invoices_from_json(uuid, jsonb, uuid, text) to anon, authenticated;

create or replace function public.update_ar_invoice_from_json(
  p_ar_invoice_id uuid,
  p_clinic_id uuid,
  p_patch jsonb,
  p_user_id uuid default null,
  p_email text default null
)
returns public.ar_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_access boolean;
  v_clean_patch jsonb;
  v_columns text;
  v_assignments text;
  v_updated public.ar_invoices;
begin
  if p_ar_invoice_id is null or p_clinic_id is null then
    raise exception 'ar_invoice_id and clinic_id are required';
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'patch must be a json object';
  end if;

  select exists (
    select 1
    from public.users u
    where u.clinic_id = p_clinic_id
      and (
        u.id = auth.uid()
        or (p_user_id is not null and u.id = p_user_id)
        or (p_email is not null and lower(u.email) = lower(p_email))
      )
  ) into v_has_access;

  if not v_has_access then
    raise exception 'Access denied for clinic %', p_clinic_id;
  end if;

  v_clean_patch := p_patch - 'id' - 'clinic_id' - 'created_at' - 'updated_at';

  select
    string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position),
    string_agg(format('%I = r.%I', c.column_name, c.column_name), ', ' order by c.ordinal_position)
  into v_columns, v_assignments
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'ar_invoices'
    and c.column_name not in ('id', 'clinic_id', 'created_at', 'updated_at')
    and v_clean_patch ? c.column_name;

  if v_columns is null then
    raise exception 'No valid ar_invoices columns in patch';
  end if;

  execute format(
    'update public.ar_invoices as target set %s from jsonb_populate_record(null::public.ar_invoices, $1) as r where target.id = $2 and target.clinic_id = $3 returning target.*',
    v_assignments
  )
  using v_clean_patch, p_ar_invoice_id, p_clinic_id
  into v_updated;

  if v_updated.id is null then
    raise exception 'Receivable not found for clinic';
  end if;

  return v_updated;
end;
$$;

grant execute on function public.update_ar_invoice_from_json(uuid, uuid, jsonb, uuid, text) to anon, authenticated;

create or replace function public.get_ar_invoices_for_appointment(
  p_clinic_id uuid,
  p_appointment_id uuid,
  p_user_id uuid default null,
  p_email text default null
)
returns setof public.ar_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_access boolean;
begin
  if p_clinic_id is null or p_appointment_id is null then
    raise exception 'clinic_id and appointment_id are required';
  end if;

  select exists (
    select 1
    from public.users u
    where u.clinic_id = p_clinic_id
      and (
        u.id = auth.uid()
        or (p_user_id is not null and u.id = p_user_id)
        or (p_email is not null and lower(u.email) = lower(p_email))
      )
  ) into v_has_access;

  if not v_has_access then
    raise exception 'Access denied for clinic %', p_clinic_id;
  end if;

  return query
    select *
    from public.ar_invoices ai
    where ai.clinic_id = p_clinic_id
      and ai.appointment_id = p_appointment_id
    order by ai.created_at asc nulls last;
end;
$$;

grant execute on function public.get_ar_invoices_for_appointment(uuid, uuid, uuid, text) to anon, authenticated;

alter table if exists public.cash_register_movements
  add column if not exists created_by uuid;