-- =============================================================================
-- REPASSE MEDICO ENTERPRISE ERP
-- =============================================================================
-- Core structures for medical production, repasse rules, approvals, payments,
-- glosa analysis, simulations, forecasts, and enterprise audit.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Security helper functions
-- -----------------------------------------------------------------------------
create or replace function public.is_clinic_member(p_clinic_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_clinic_roles ucr
    where ucr.clinic_id = p_clinic_id
      and ucr.user_id = auth.uid()
  );
$$;

create or replace function public.is_clinic_manager(p_clinic_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_clinic_roles ucr
    where ucr.clinic_id = p_clinic_id
      and ucr.user_id = auth.uid()
      and ucr.role in ('admin', 'gestor', 'financeiro', 'director')
  );
$$;

-- -----------------------------------------------------------------------------
-- 1) Rules
-- -----------------------------------------------------------------------------
create table if not exists public.medical_repasse_rules (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  rule_type text not null check (rule_type in ('individual', 'especialidade', 'convenio', 'procedimento')),
  scope_value text,
  professional_id uuid references public.professionals(id) on delete set null,
  specialty text,
  convenio_id uuid,
  procedure_id uuid,
  percentage numeric(7,4),
  fixed_value numeric(14,2),
  progressive_ranges jsonb default '[]'::jsonb,
  applies_to text not null default 'recebido' check (applies_to in ('produzido', 'faturado', 'recebido')),
  ceiling_value numeric(14,2),
  floor_value numeric(14,2),
  valid_from date not null,
  valid_to date,
  priority int not null default 100,
  is_active boolean not null default true,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_medical_repasse_rules_clinic on public.medical_repasse_rules(clinic_id);
create index if not exists idx_medical_repasse_rules_type on public.medical_repasse_rules(clinic_id, rule_type, is_active);
create index if not exists idx_medical_repasse_rules_professional on public.medical_repasse_rules(clinic_id, professional_id);
create index if not exists idx_medical_repasse_rules_priority on public.medical_repasse_rules(clinic_id, priority);

-- -----------------------------------------------------------------------------
-- 2) Calculations
-- -----------------------------------------------------------------------------
create table if not exists public.medical_repasse_calculations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  reference_month int not null check (reference_month between 1 and 12),
  reference_year int not null check (reference_year between 2020 and 2100),
  period_start date not null,
  period_end date not null,
  professional_id uuid not null references public.professionals(id) on delete restrict,
  specialty text,
  unit_id uuid,
  convenio_id uuid,
  procedure_id uuid,
  rule_id uuid references public.medical_repasse_rules(id) on delete set null,
  production_amount numeric(14,2) not null default 0,
  billed_amount numeric(14,2) not null default 0,
  received_amount numeric(14,2) not null default 0,
  glosa_amount numeric(14,2) not null default 0,
  eligible_amount numeric(14,2) not null default 0,
  base_amount numeric(14,2) not null default 0,
  percentage_applied numeric(7,4) not null default 0,
  gross_repasse_amount numeric(14,2) not null default 0,
  discounts_amount numeric(14,2) not null default 0,
  net_repasse_amount numeric(14,2) not null default 0,
  direct_costs_amount numeric(14,2) not null default 0,
  assistential_costs_amount numeric(14,2) not null default 0,
  profitability_amount numeric(14,2) not null default 0,
  status text not null default 'calculado' check (status in ('calculado', 'provisionado', 'aprovado', 'liberado', 'pago', 'cancelado')),
  account_plan_id uuid,
  cost_center_id uuid,
  ap_bill_id uuid,
  forecast_date date,
  approved_at timestamptz,
  approved_by uuid,
  calculated_at timestamptz not null default now(),
  calculated_by uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, professional_id, reference_month, reference_year)
);

create index if not exists idx_medical_repasse_calc_clinic_period on public.medical_repasse_calculations(clinic_id, reference_year, reference_month);
create index if not exists idx_medical_repasse_calc_status on public.medical_repasse_calculations(clinic_id, status);
create index if not exists idx_medical_repasse_calc_professional on public.medical_repasse_calculations(clinic_id, professional_id);
create index if not exists idx_medical_repasse_calc_cost_center on public.medical_repasse_calculations(clinic_id, cost_center_id);
create index if not exists idx_medical_repasse_calc_ap_bill on public.medical_repasse_calculations(ap_bill_id);

-- -----------------------------------------------------------------------------
-- 3) Approvals workflow
-- -----------------------------------------------------------------------------
create table if not exists public.medical_repasse_approvals (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  calculation_id uuid not null references public.medical_repasse_calculations(id) on delete cascade,
  stage text not null check (stage in ('producao', 'auditoria', 'financeiro', 'diretoria', 'pagamento')),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado')),
  approved_by uuid,
  approved_at timestamptz,
  observation text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (calculation_id, stage)
);

create index if not exists idx_medical_repasse_approvals_clinic on public.medical_repasse_approvals(clinic_id);
create index if not exists idx_medical_repasse_approvals_status on public.medical_repasse_approvals(clinic_id, status, stage);

-- -----------------------------------------------------------------------------
-- 4) Payments
-- -----------------------------------------------------------------------------
create table if not exists public.medical_repasse_payments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  calculation_id uuid not null references public.medical_repasse_calculations(id) on delete cascade,
  ap_bill_id uuid,
  bank_account_id uuid,
  transfer_type text not null default 'pix' check (transfer_type in ('pix', 'ted', 'doc', 'conta_corrente', 'conta_poupanca')),
  amount numeric(14,2) not null,
  scheduled_date date,
  paid_at timestamptz,
  proof_url text,
  status text not null default 'agendado' check (status in ('agendado', 'processando', 'pago', 'falhou', 'cancelado')),
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_medical_repasse_payments_clinic on public.medical_repasse_payments(clinic_id);
create index if not exists idx_medical_repasse_payments_status on public.medical_repasse_payments(clinic_id, status);
create index if not exists idx_medical_repasse_payments_calculation on public.medical_repasse_payments(calculation_id);

-- -----------------------------------------------------------------------------
-- 5) Audit log
-- -----------------------------------------------------------------------------
create table if not exists public.medical_repasse_audit (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  entity text not null,
  entity_id uuid,
  action text not null,
  actor_id uuid,
  actor_name text,
  details jsonb not null default '{}'::jsonb,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_medical_repasse_audit_clinic_date on public.medical_repasse_audit(clinic_id, created_at desc);
create index if not exists idx_medical_repasse_audit_entity on public.medical_repasse_audit(clinic_id, entity, entity_id);

-- -----------------------------------------------------------------------------
-- 6) Simulations
-- -----------------------------------------------------------------------------
create table if not exists public.medical_repasse_simulations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  reference_month int not null check (reference_month between 1 and 12),
  reference_year int not null check (reference_year between 2020 and 2100),
  scenario_name text not null,
  repasse_percentage numeric(7,4) not null,
  revenue_base numeric(14,2) not null default 0,
  simulated_repasse numeric(14,2) not null default 0,
  dre_impact numeric(14,2) not null default 0,
  ebitda_impact numeric(14,2) not null default 0,
  net_income_impact numeric(14,2) not null default 0,
  cashflow_impact numeric(14,2) not null default 0,
  projected_cashflow_impact numeric(14,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_medical_repasse_sim_clinic_period on public.medical_repasse_simulations(clinic_id, reference_year, reference_month);

-- -----------------------------------------------------------------------------
-- 7) Bank accounts for repasse payout routing
-- -----------------------------------------------------------------------------
create table if not exists public.medical_repasse_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete cascade,
  bank_account_id uuid,
  bank_name text,
  agency text,
  account_number text,
  account_type text check (account_type in ('pix', 'ted', 'doc', 'conta_corrente', 'conta_poupanca')),
  pix_key text,
  holder_name text,
  holder_document text,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_medical_repasse_bank_accounts_clinic on public.medical_repasse_bank_accounts(clinic_id);
create index if not exists idx_medical_repasse_bank_accounts_professional on public.medical_repasse_bank_accounts(clinic_id, professional_id);

-- -----------------------------------------------------------------------------
-- 8) Forecasts
-- -----------------------------------------------------------------------------
create table if not exists public.medical_repasse_forecasts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  calculation_id uuid references public.medical_repasse_calculations(id) on delete cascade,
  forecast_date date not null,
  horizon_days int not null,
  projected_amount numeric(14,2) not null default 0,
  status text not null default 'projetado' check (status in ('projetado', 'realizado', 'cancelado')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_medical_repasse_forecasts_clinic_date on public.medical_repasse_forecasts(clinic_id, forecast_date);
create index if not exists idx_medical_repasse_forecasts_horizon on public.medical_repasse_forecasts(clinic_id, horizon_days);

-- -----------------------------------------------------------------------------
-- 9) Glosas
-- -----------------------------------------------------------------------------
create table if not exists public.medical_repasse_glosas (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete set null,
  convenio_id uuid,
  procedure_id uuid,
  source_type text not null default 'receivable' check (source_type in ('receivable', 'billing_guide', 'invoice', 'manual')),
  source_id uuid,
  glosa_date date not null,
  amount numeric(14,2) not null,
  status text not null default 'pendente' check (status in ('recuperada', 'recurso', 'perdida', 'pendente')),
  impact_on_repasse numeric(14,2) not null default 0,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_medical_repasse_glosas_clinic_date on public.medical_repasse_glosas(clinic_id, glosa_date);
create index if not exists idx_medical_repasse_glosas_status on public.medical_repasse_glosas(clinic_id, status);
create index if not exists idx_medical_repasse_glosas_professional on public.medical_repasse_glosas(clinic_id, professional_id);

-- -----------------------------------------------------------------------------
-- Generic updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_medical_repasse_rules_updated_at on public.medical_repasse_rules;
create trigger trg_medical_repasse_rules_updated_at
before update on public.medical_repasse_rules
for each row execute function public.set_updated_at();

drop trigger if exists trg_medical_repasse_calculations_updated_at on public.medical_repasse_calculations;
create trigger trg_medical_repasse_calculations_updated_at
before update on public.medical_repasse_calculations
for each row execute function public.set_updated_at();

drop trigger if exists trg_medical_repasse_approvals_updated_at on public.medical_repasse_approvals;
create trigger trg_medical_repasse_approvals_updated_at
before update on public.medical_repasse_approvals
for each row execute function public.set_updated_at();

drop trigger if exists trg_medical_repasse_payments_updated_at on public.medical_repasse_payments;
create trigger trg_medical_repasse_payments_updated_at
before update on public.medical_repasse_payments
for each row execute function public.set_updated_at();

drop trigger if exists trg_medical_repasse_bank_accounts_updated_at on public.medical_repasse_bank_accounts;
create trigger trg_medical_repasse_bank_accounts_updated_at
before update on public.medical_repasse_bank_accounts
for each row execute function public.set_updated_at();

drop trigger if exists trg_medical_repasse_forecasts_updated_at on public.medical_repasse_forecasts;
create trigger trg_medical_repasse_forecasts_updated_at
before update on public.medical_repasse_forecasts
for each row execute function public.set_updated_at();

drop trigger if exists trg_medical_repasse_glosas_updated_at on public.medical_repasse_glosas;
create trigger trg_medical_repasse_glosas_updated_at
before update on public.medical_repasse_glosas
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Audit trigger for critical tables
-- -----------------------------------------------------------------------------
create or replace function public.fn_medical_repasse_audit()
returns trigger
language plpgsql
as $$
declare
  v_clinic_id uuid;
  v_entity_id uuid;
begin
  if tg_op = 'DELETE' then
    v_clinic_id := old.clinic_id;
    v_entity_id := old.id;
  else
    v_clinic_id := new.clinic_id;
    v_entity_id := new.id;
  end if;

  insert into public.medical_repasse_audit (
    clinic_id,
    entity,
    entity_id,
    action,
    actor_id,
    details,
    old_data,
    new_data
  ) values (
    v_clinic_id,
    tg_table_name,
    v_entity_id,
    tg_op,
    auth.uid(),
    jsonb_build_object('trigger', tg_name),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_medical_repasse_rules_audit on public.medical_repasse_rules;
create trigger trg_medical_repasse_rules_audit
after insert or update or delete on public.medical_repasse_rules
for each row execute function public.fn_medical_repasse_audit();

drop trigger if exists trg_medical_repasse_calculations_audit on public.medical_repasse_calculations;
create trigger trg_medical_repasse_calculations_audit
after insert or update or delete on public.medical_repasse_calculations
for each row execute function public.fn_medical_repasse_audit();

drop trigger if exists trg_medical_repasse_payments_audit on public.medical_repasse_payments;
create trigger trg_medical_repasse_payments_audit
after insert or update or delete on public.medical_repasse_payments
for each row execute function public.fn_medical_repasse_audit();

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------
alter table public.medical_repasse_rules enable row level security;
alter table public.medical_repasse_calculations enable row level security;
alter table public.medical_repasse_approvals enable row level security;
alter table public.medical_repasse_payments enable row level security;
alter table public.medical_repasse_audit enable row level security;
alter table public.medical_repasse_simulations enable row level security;
alter table public.medical_repasse_bank_accounts enable row level security;
alter table public.medical_repasse_forecasts enable row level security;
alter table public.medical_repasse_glosas enable row level security;

-- Rules
drop policy if exists medical_repasse_rules_select on public.medical_repasse_rules;
create policy medical_repasse_rules_select on public.medical_repasse_rules
for select using (public.is_clinic_member(clinic_id));

drop policy if exists medical_repasse_rules_write on public.medical_repasse_rules;
create policy medical_repasse_rules_write on public.medical_repasse_rules
for all using (public.is_clinic_manager(clinic_id))
with check (public.is_clinic_manager(clinic_id));

-- Calculations
drop policy if exists medical_repasse_calculations_select on public.medical_repasse_calculations;
create policy medical_repasse_calculations_select on public.medical_repasse_calculations
for select using (public.is_clinic_member(clinic_id));

drop policy if exists medical_repasse_calculations_write on public.medical_repasse_calculations;
create policy medical_repasse_calculations_write on public.medical_repasse_calculations
for all using (public.is_clinic_manager(clinic_id))
with check (public.is_clinic_manager(clinic_id));

-- Approvals
drop policy if exists medical_repasse_approvals_select on public.medical_repasse_approvals;
create policy medical_repasse_approvals_select on public.medical_repasse_approvals
for select using (public.is_clinic_member(clinic_id));

drop policy if exists medical_repasse_approvals_write on public.medical_repasse_approvals;
create policy medical_repasse_approvals_write on public.medical_repasse_approvals
for all using (public.is_clinic_manager(clinic_id))
with check (public.is_clinic_manager(clinic_id));

-- Payments
drop policy if exists medical_repasse_payments_select on public.medical_repasse_payments;
create policy medical_repasse_payments_select on public.medical_repasse_payments
for select using (public.is_clinic_member(clinic_id));

drop policy if exists medical_repasse_payments_write on public.medical_repasse_payments;
create policy medical_repasse_payments_write on public.medical_repasse_payments
for all using (public.is_clinic_manager(clinic_id))
with check (public.is_clinic_manager(clinic_id));

-- Audit
drop policy if exists medical_repasse_audit_select on public.medical_repasse_audit;
create policy medical_repasse_audit_select on public.medical_repasse_audit
for select using (public.is_clinic_member(clinic_id));

drop policy if exists medical_repasse_audit_write on public.medical_repasse_audit;
create policy medical_repasse_audit_write on public.medical_repasse_audit
for all using (public.is_clinic_manager(clinic_id))
with check (public.is_clinic_manager(clinic_id));

-- Simulations
drop policy if exists medical_repasse_simulations_select on public.medical_repasse_simulations;
create policy medical_repasse_simulations_select on public.medical_repasse_simulations
for select using (public.is_clinic_member(clinic_id));

drop policy if exists medical_repasse_simulations_write on public.medical_repasse_simulations;
create policy medical_repasse_simulations_write on public.medical_repasse_simulations
for all using (public.is_clinic_manager(clinic_id))
with check (public.is_clinic_manager(clinic_id));

-- Bank accounts
drop policy if exists medical_repasse_bank_accounts_select on public.medical_repasse_bank_accounts;
create policy medical_repasse_bank_accounts_select on public.medical_repasse_bank_accounts
for select using (public.is_clinic_member(clinic_id));

drop policy if exists medical_repasse_bank_accounts_write on public.medical_repasse_bank_accounts;
create policy medical_repasse_bank_accounts_write on public.medical_repasse_bank_accounts
for all using (public.is_clinic_manager(clinic_id))
with check (public.is_clinic_manager(clinic_id));

-- Forecasts
drop policy if exists medical_repasse_forecasts_select on public.medical_repasse_forecasts;
create policy medical_repasse_forecasts_select on public.medical_repasse_forecasts
for select using (public.is_clinic_member(clinic_id));

drop policy if exists medical_repasse_forecasts_write on public.medical_repasse_forecasts;
create policy medical_repasse_forecasts_write on public.medical_repasse_forecasts
for all using (public.is_clinic_manager(clinic_id))
with check (public.is_clinic_manager(clinic_id));

-- Glosas
drop policy if exists medical_repasse_glosas_select on public.medical_repasse_glosas;
create policy medical_repasse_glosas_select on public.medical_repasse_glosas
for select using (public.is_clinic_member(clinic_id));

drop policy if exists medical_repasse_glosas_write on public.medical_repasse_glosas;
create policy medical_repasse_glosas_write on public.medical_repasse_glosas
for all using (public.is_clinic_manager(clinic_id))
with check (public.is_clinic_manager(clinic_id));
