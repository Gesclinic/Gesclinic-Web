-- =============================================================================
-- VALIDACAO POS-MIGRACAO - PHASE 18 REPASSE ENTERPRISE
-- =============================================================================
-- Execute este script apos aplicar:
-- 1) 20260621_repasse_medico_enterprise_erp.sql
-- 2) 20260621_repasse_medico_enterprise_workflow_integration.sql
-- =============================================================================

-- 1) Tabelas obrigatorias
select
  t.table_name,
  case when t.table_name is not null then 'OK' else 'MISSING' end as status
from (
  values
    ('medical_repasse_rules'),
    ('medical_repasse_calculations'),
    ('medical_repasse_approvals'),
    ('medical_repasse_payments'),
    ('medical_repasse_audit'),
    ('medical_repasse_simulations'),
    ('medical_repasse_bank_accounts'),
    ('medical_repasse_forecasts'),
    ('medical_repasse_glosas')
) required(table_name)
left join information_schema.tables t
  on t.table_schema = 'public'
 and t.table_name = required.table_name
order by required.table_name;

-- 2) RLS habilitado
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'medical_repasse_rules',
    'medical_repasse_calculations',
    'medical_repasse_approvals',
    'medical_repasse_payments',
    'medical_repasse_audit',
    'medical_repasse_simulations',
    'medical_repasse_bank_accounts',
    'medical_repasse_forecasts',
    'medical_repasse_glosas'
  )
order by c.relname;

-- 3) Politicas RLS criadas
select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename like 'medical_repasse_%'
order by tablename, policyname;

-- 4) Indices criticos
select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and (
    tablename in (
      'medical_repasse_rules',
      'medical_repasse_calculations',
      'medical_repasse_approvals',
      'medical_repasse_payments',
      'medical_repasse_audit',
      'medical_repasse_bank_accounts',
      'medical_repasse_forecasts',
      'medical_repasse_glosas'
    )
    or indexname = 'ux_medical_repasse_forecasts_calc_horizon'
  )
order by tablename, indexname;

-- 5) Triggers de auditoria e updated_at
select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table like 'medical_repasse_%'
order by event_object_table, trigger_name;

-- 6) Funcoes principais
select
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'fn_medical_repasse_transition',
    'fn_medical_repasse_audit',
    'set_updated_at'
  )
order by p.proname;

-- 7) Smoke test: valida retorno da funcao de transicao (sem alterar dados)
-- NOTE: apenas valida existencia da assinatura (nao executa transition real)
select
  case
    when to_regprocedure('public.fn_medical_repasse_transition(uuid, uuid, text, uuid, text)') is not null
      then 'OK'
    else 'MISSING'
  end as transition_function_signature;

-- 8) Integracao DRE (estrutura minima)
select
  table_name,
  column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'dre_periods'
  and column_name in ('medical_commissions', 'total_operating_expenses', 'operating_income', 'net_income', 'is_projected')
order by column_name;

-- 9) Integracao fluxo projetado (forecasts)
select
  clinic_id,
  status,
  count(*) as total,
  sum(projected_amount) as projected_total
from public.medical_repasse_forecasts
group by clinic_id, status
order by clinic_id, status;

-- 10) Consistencia basica calculos x aprovacoes
select
  c.clinic_id,
  c.reference_year,
  c.reference_month,
  count(*) as total_calculations,
  count(a.id) as total_approval_rows
from public.medical_repasse_calculations c
left join public.medical_repasse_approvals a
  on a.calculation_id = c.id
group by c.clinic_id, c.reference_year, c.reference_month
order by c.reference_year desc, c.reference_month desc;
