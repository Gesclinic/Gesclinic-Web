-- ============================================================================
-- HOLIDAYS SYSTEM - Feriados com bloqueio de agenda
-- ============================================================================

-- 1. Tabela de feriados
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  name text not null,
  scope text not null check (scope in ('NACIONAL','ESTADUAL','MUNICIPAL')),
  state char(2),
  city text,
  is_blocked boolean default true,
  clinic_id uuid references public.clinics(id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Índices para performance
create unique index if not exists idx_holidays_date_scope_location 
  on holidays (date, scope, coalesce(state,''), coalesce(city,''));

create index if not exists idx_holidays_clinic_date 
  on holidays (clinic_id, date);

create index if not exists idx_holidays_date_blocked 
  on holidays (date, is_blocked);

-- 2. Tabela de override manual
create table if not exists public.agenda_day_override (
  date date not null,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  allow_manual boolean default true,
  opened_by uuid references public.auth.users(id),
  opened_at timestamp with time zone default now(),
  notes text,
  primary key (date, clinic_id)
);

create index if not exists idx_agenda_day_override_clinic_date 
  on agenda_day_override (clinic_id, date);

-- 3. RPC: Verificar se dia é feriado bloqueante
create or replace function public.is_holiday_blocked(
  p_date date,
  p_clinic_id uuid,
  p_state char(2) default null,
  p_city text default null
) returns boolean
language plpgsql
as $$
declare
  v_is_blocked boolean;
begin
  -- Verifica se existe feriado bloqueado para o dia
  select exists (
    select 1
    from holidays h
    where h.date = p_date
      and h.is_blocked = true
      and (
        h.clinic_id = p_clinic_id
        or h.scope = 'NACIONAL'
        or (h.scope = 'ESTADUAL' and h.state = p_state)
        or (h.scope = 'MUNICIPAL' and h.city = p_city)
      )
  ) into v_is_blocked;
  
  -- Se não tem override manual, retorna o status de bloqueio
  if v_is_blocked then
    return not exists (
      select 1 from agenda_day_override
      where date = p_date
        and clinic_id = p_clinic_id
        and allow_manual = true
    );
  end if;
  
  return false;
end;
$$;

-- 4. RPC: Obter detalhes do feriado
create or replace function public.get_holiday_details(
  p_date date,
  p_clinic_id uuid,
  p_state char(2) default null,
  p_city text default null
) returns table (
  id uuid,
  name text,
  scope text,
  is_blocked boolean,
  has_override boolean
) 
language plpgsql
as $$
begin
  return query
  select 
    h.id,
    h.name,
    h.scope,
    h.is_blocked,
    exists (
      select 1 from agenda_day_override o
      where o.date = p_date
        and o.clinic_id = p_clinic_id
        and o.allow_manual = true
    )::boolean as has_override
  from holidays h
  where h.date = p_date
    and (
      h.clinic_id = p_clinic_id
      or h.scope = 'NACIONAL'
      or (h.scope = 'ESTADUAL' and h.state = p_state)
      or (h.scope = 'MUNICIPAL' and h.city = p_city)
    )
  limit 1;
end;
$$;

-- 5. RPC: Abrir agenda manualmente para um feriado
create or replace function public.open_holiday_manual(
  p_date date,
  p_clinic_id uuid,
  p_user_id uuid,
  p_notes text default null
) returns table (
  date date,
  allow_manual boolean,
  opened_by uuid,
  opened_at timestamp with time zone
)
language plpgsql
as $$
begin
  return query
  insert into public.agenda_day_override (date, clinic_id, allow_manual, opened_by, opened_at, notes)
  values (p_date, p_clinic_id, true, p_user_id, now(), p_notes)
  on conflict (date, clinic_id)
  do update set
    allow_manual = true,
    opened_by = p_user_id,
    opened_at = now(),
    notes = coalesce(p_notes, agenda_day_override.notes)
  returning 
    agenda_day_override.date,
    agenda_day_override.allow_manual,
    agenda_day_override.opened_by,
    agenda_day_override.opened_at;
end;
$$;

-- 6. RPC: Fechar override manual
create or replace function public.close_holiday_override(
  p_date date,
  p_clinic_id uuid
) returns boolean
language plpgsql
as $$
begin
  delete from public.agenda_day_override
  where date = p_date and clinic_id = p_clinic_id;
  
  return true;
end;
$$;

-- RLS Policies (Permissivo para leitura, restritivo para escrita)

-- Holidays - READ (Todos podem ler feriados, especialmente NACIONAIS)
create policy if not exists "holidays_read_all" on holidays
  for select using (
    scope = 'NACIONAL'  -- Sempre permite ler feriados nacionais
    or clinic_id = (select auth.uid()::uuid)
    or exists (
      select 1 from public.clinic_users cu
      where cu.clinic_id = holidays.clinic_id
        and cu.user_id = auth.uid()
    )
  );

-- Holidays - INSERT (admin/gestor para clínica, OU sistema para feriados nacionais)
create policy if not exists "holidays_insert" on holidays
  for insert with check (
    clinic_id IS NULL  -- Sistema pode inserir feriados nacionais
    or exists (
      select 1 from public.clinic_users cu
      where cu.clinic_id = holidays.clinic_id
        and cu.user_id = auth.uid()
        and cu.user_role in ('admin', 'gestor')
    )
  );

-- Holidays - UPDATE (admin/gestor para clínica, OU sistema para feriados nacionais)
create policy if not exists "holidays_update" on holidays
  for update with check (
    clinic_id IS NULL  -- Sistema pode atualizar feriados nacionais
    or exists (
      select 1 from public.clinic_users cu
      where cu.clinic_id = holidays.clinic_id
        and cu.user_id = auth.uid()
        and cu.user_role in ('admin', 'gestor')
    )
  );

-- Holidays - DELETE (admin/gestor para clínica, OU sistema para feriados nacionais)
create policy if not exists "holidays_delete" on holidays
  for delete using (
    clinic_id IS NULL  -- Sistema pode deletar feriados nacionais
    or exists (
      select 1 from public.clinic_users cu
      where cu.clinic_id = holidays.clinic_id
        and cu.user_id = auth.uid()
        and cu.user_role in ('admin', 'gestor')
    )
  );

-- Agenda_day_override - READ
create policy if not exists "agenda_day_override_read" on agenda_day_override
  for select using (
    exists (
      select 1 from public.clinic_users
      where clinic_id = agenda_day_override.clinic_id
        and user_id = auth.uid()
    )
  );

-- Agenda_day_override - INSERT/UPDATE (admin/gestor)
create policy if not exists "agenda_day_override_write" on agenda_day_override
  for all with check (
    exists (
      select 1 from public.clinic_users cu
      where cu.clinic_id = agenda_day_override.clinic_id
        and cu.user_id = auth.uid()
        and cu.user_role in ('admin', 'gestor')
    )
  );

-- Comentários
comment on table holidays is 'Feriados nacionais, estaduais e municipais para bloqueio de agenda';
comment on table agenda_day_override is 'Overrides manuais para abrir agenda em feriados';
comment on column holidays.scope is 'NACIONAL=Brasil todo, ESTADUAL=por UF, MUNICIPAL=por cidade';
comment on column holidays.is_blocked is 'true=bloqueia agenda, false=apenas informativo';
comment on column agenda_day_override.allow_manual is 'true=permite lançamento manual em feriado bloqueado';
