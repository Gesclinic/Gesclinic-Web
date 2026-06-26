-- =============================================================================
-- RPC segura para criar simulações de repasse médico (compatível com sessão custom)
-- =============================================================================

create or replace function public.fn_medical_repasse_create_simulation(
  p_clinic_id uuid,
  p_reference_month int,
  p_reference_year int,
  p_scenario_name text,
  p_repasse_percentage numeric,
  p_revenue_base numeric,
  p_simulated_repasse numeric,
  p_dre_impact numeric,
  p_ebitda_impact numeric,
  p_net_income_impact numeric,
  p_cashflow_impact numeric,
  p_projected_cashflow_impact numeric,
  p_actor_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns public.medical_repasse_simulations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
  v_row public.medical_repasse_simulations%rowtype;
begin
  if p_clinic_id is null then
    raise exception 'clinic_id is required';
  end if;

  if p_actor_id is null then
    raise exception 'actor_id is required';
  end if;

  select exists (
    select 1
    from public.user_clinic_roles ucr
    where ucr.clinic_id = p_clinic_id
      and ucr.user_id = p_actor_id
      and ucr.role in ('admin', 'gestor', 'financeiro', 'director')
  ) into v_allowed;

  if not v_allowed then
    raise exception 'actor has no permission to create simulation for this clinic';
  end if;

  insert into public.medical_repasse_simulations (
    clinic_id,
    reference_month,
    reference_year,
    scenario_name,
    repasse_percentage,
    revenue_base,
    simulated_repasse,
    dre_impact,
    ebitda_impact,
    net_income_impact,
    cashflow_impact,
    projected_cashflow_impact,
    created_by,
    metadata
  ) values (
    p_clinic_id,
    p_reference_month,
    p_reference_year,
    p_scenario_name,
    p_repasse_percentage,
    coalesce(p_revenue_base, 0),
    coalesce(p_simulated_repasse, 0),
    coalesce(p_dre_impact, 0),
    coalesce(p_ebitda_impact, 0),
    coalesce(p_net_income_impact, 0),
    coalesce(p_cashflow_impact, 0),
    coalesce(p_projected_cashflow_impact, 0),
    p_actor_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.fn_medical_repasse_create_simulation(
  uuid,
  int,
  int,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  uuid,
  jsonb
) to anon, authenticated;
