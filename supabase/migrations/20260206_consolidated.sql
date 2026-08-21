-- ============================================================================
-- Consolidated from 20260206_add_is_mandatory_to_holidays.sql
-- ============================================================================

-- ============================================================================
-- ADD is_mandatory FIELD TO HOLIDAYS
-- Diferencia feriados obrigat├│rios (bloqueiam) de facultativos (apenas aviso)
-- ============================================================================

-- Adicionar coluna is_mandatory ├á tabela holidays
ALTER TABLE public.holidays
ADD COLUMN is_mandatory boolean DEFAULT true;

-- Atualizar feriados facultativos conhecidos
UPDATE public.holidays
SET is_mandatory = false
WHERE name ILIKE '%carnaval%'
   OR name ILIKE '%corpus%'
   OR name ILIKE '%segunda-feira de p├íscoa%'
   OR name ILIKE '%sexta-feira santa%'
   OR name ILIKE '%ponto facultativo%';

-- Criar ├¡ndice para performance
CREATE INDEX IF NOT EXISTS idx_holidays_mandatory
  ON public.holidays (is_mandatory, is_blocked);

-- ============================================================================
-- ATUALIZAR RPC: is_holiday_blocked
-- Agora respeita is_mandatory
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_holiday_blocked(
  p_date date,
  p_clinic_id uuid,
  p_state char(2) default null,
  p_city text default null
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_blocked boolean;
  v_is_mandatory boolean;
BEGIN
  -- Verifica se existe feriado OBRIGAT├ôRIO e BLOQUEADO para o dia
  SELECT
    COALESCE(h.is_blocked, false),
    COALESCE(h.is_mandatory, true)
  INTO v_is_blocked, v_is_mandatory
  FROM holidays h
  WHERE h.date = p_date
    AND h.is_mandatory = true  -- ÔåÉ Apenas feriados obrigat├│rios podem bloquear
    AND h.is_blocked = true
    AND (
      h.clinic_id = p_clinic_id
      OR h.scope = 'NACIONAL'
      OR (h.scope = 'ESTADUAL' AND h.state = p_state)
      OR (h.scope = 'MUNICIPAL' AND h.city = p_city)
    )
  LIMIT 1;

  -- Se n├úo tem feriado obrigat├│rio bloqueado, retorna false
  IF NOT v_is_blocked THEN
    RETURN false;
  END IF;

  -- Se tem e n├úo h├í override manual, retorna true (bloqueado)
  RETURN NOT EXISTS (
    SELECT 1 FROM agenda_day_override
    WHERE date = p_date
      AND clinic_id = p_clinic_id
      AND allow_manual = true
  );
END;
$$;

-- ============================================================================
-- ATUALIZAR RPC: get_holiday_details
-- Adiciona campo is_mandatory ├á resposta
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_holiday_details(
  p_date date,
  p_clinic_id uuid,
  p_state char(2) DEFAULT null,
  p_city text DEFAULT null
) RETURNS TABLE (
  id uuid,
  name text,
  scope text,
  is_blocked boolean,
  is_mandatory boolean,
  has_override boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.name,
    h.scope,
    h.is_blocked,
    COALESCE(h.is_mandatory, true),
    COALESCE(
      (SELECT true FROM agenda_day_override ado
       WHERE ado.date = p_date
       AND ado.clinic_id = p_clinic_id
       AND ado.allow_manual = true
       LIMIT 1),
      false
    )
  FROM holidays h
  WHERE h.date = p_date
    AND (
      h.clinic_id = p_clinic_id
      OR h.scope = 'NACIONAL'
      OR (h.scope = 'ESTADUAL' AND h.state = p_state)
      OR (h.scope = 'MUNICIPAL' AND h.city = p_city)
    )
  ORDER BY
    CASE
      WHEN h.clinic_id = p_clinic_id THEN 1
      WHEN h.scope = 'MUNICIPAL' THEN 2
      WHEN h.scope = 'ESTADUAL' THEN 3
      WHEN h.scope = 'NACIONAL' THEN 4
    END,
    h.created_at DESC;
END;
$$;

-- ============================================================================
-- Consolidated from 20260206_holidays_system.sql
-- ============================================================================

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

-- ├ìndices para performance
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

-- 3. RPC: Verificar se dia ├® feriado bloqueante
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

  -- Se n├úo tem override manual, retorna o status de bloqueio
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

-- Holidays - INSERT (admin/gestor para cl├¡nica, OU sistema para feriados nacionais)
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

-- Holidays - UPDATE (admin/gestor para cl├¡nica, OU sistema para feriados nacionais)
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

-- Holidays - DELETE (admin/gestor para cl├¡nica, OU sistema para feriados nacionais)
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

-- Coment├írios
comment on table holidays is 'Feriados nacionais, estaduais e municipais para bloqueio de agenda';
comment on table agenda_day_override is 'Overrides manuais para abrir agenda em feriados';
comment on column holidays.scope is 'NACIONAL=Brasil todo, ESTADUAL=por UF, MUNICIPAL=por cidade';
comment on column holidays.is_blocked is 'true=bloqueia agenda, false=apenas informativo';
comment on column agenda_day_override.allow_manual is 'true=permite lan├ºamento manual em feriado bloqueado';
