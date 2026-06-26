-- =============================================================================
-- REPASSE MEDICO ENTERPRISE - WORKFLOW & INTEGRATION AUTOMATION
-- =============================================================================
-- - Status transition guard rails
-- - Automatic approvals log
-- - Automatic forecast outflows (30/60/90/180/365)
-- - Automatic DRE medical commissions sync
-- - Best-effort sync with AP and financial_transactions
-- =============================================================================

create unique index if not exists ux_medical_repasse_forecasts_calc_horizon
  on public.medical_repasse_forecasts(clinic_id, calculation_id, horizon_days);

create or replace function public.fn_medical_repasse_transition(
  p_clinic_id uuid,
  p_calculation_id uuid,
  p_new_status text,
  p_actor_id uuid default auth.uid(),
  p_observation text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calc public.medical_repasse_calculations%rowtype;
  v_old_status text;
  v_new_status text := lower(trim(coalesce(p_new_status, '')));
  v_allowed boolean := false;
  v_stage text;
  v_approval_status text;
  v_status_ap text;
  v_transition_date date;
  v_month_start date;
  v_month_end date;
  v_comm_total numeric(14,2);
  v_actor uuid := coalesce(p_actor_id, auth.uid());
  v_result jsonb;
begin
  if p_clinic_id is null or p_calculation_id is null then
    raise exception 'clinic_id and calculation_id are required';
  end if;

  if v_new_status not in ('calculado', 'provisionado', 'aprovado', 'liberado', 'pago', 'cancelado') then
    raise exception 'invalid status: %', p_new_status;
  end if;

  if not exists (
    select 1
    from public.user_clinic_roles ucr
    where ucr.clinic_id = p_clinic_id
      and ucr.user_id = v_actor
      and ucr.role in ('admin', 'gestor', 'financeiro', 'director')
  ) then
    raise exception 'actor has no permission for this clinic';
  end if;

  select *
    into v_calc
  from public.medical_repasse_calculations
  where id = p_calculation_id
    and clinic_id = p_clinic_id
  for update;

  if not found then
    raise exception 'calculation not found for clinic';
  end if;

  v_old_status := lower(coalesce(v_calc.status, 'calculado'));

  v_allowed := case
    when v_old_status = v_new_status then true
    when v_old_status = 'calculado' and v_new_status in ('provisionado', 'cancelado') then true
    when v_old_status = 'provisionado' and v_new_status in ('aprovado', 'cancelado') then true
    when v_old_status = 'aprovado' and v_new_status in ('liberado', 'cancelado') then true
    when v_old_status = 'liberado' and v_new_status in ('pago', 'cancelado') then true
    when v_old_status = 'cancelado' and v_new_status in ('calculado') then true
    else false
  end;

  if not v_allowed then
    raise exception 'invalid transition: % -> %', v_old_status, v_new_status;
  end if;

  update public.medical_repasse_calculations
     set status = v_new_status,
         approved_at = case when v_new_status in ('aprovado', 'liberado', 'pago') then now() else approved_at end,
         approved_by = case when v_new_status in ('aprovado', 'liberado', 'pago') then v_actor else approved_by end,
         updated_at = now()
   where id = p_calculation_id
     and clinic_id = p_clinic_id
  returning * into v_calc;

  v_stage := case v_new_status
    when 'provisionado' then 'producao'
    when 'aprovado' then 'auditoria'
    when 'liberado' then 'financeiro'
    when 'pago' then 'pagamento'
    else 'diretoria'
  end;

  v_approval_status := case when v_new_status = 'cancelado' then 'rejeitado' else 'aprovado' end;

  insert into public.medical_repasse_approvals (
    clinic_id,
    calculation_id,
    stage,
    status,
    approved_by,
    approved_at,
    observation,
    payload
  ) values (
    p_clinic_id,
    p_calculation_id,
    v_stage,
    v_approval_status,
    v_actor,
    now(),
    p_observation,
    jsonb_build_object('from_status', v_old_status, 'to_status', v_new_status)
  )
  on conflict (calculation_id, stage)
  do update
     set status = excluded.status,
         approved_by = excluded.approved_by,
         approved_at = excluded.approved_at,
         observation = excluded.observation,
         payload = excluded.payload,
         updated_at = now();

  if v_new_status in ('provisionado', 'aprovado', 'liberado') then
    delete from public.medical_repasse_forecasts
     where clinic_id = p_clinic_id
       and calculation_id = p_calculation_id;

    insert into public.medical_repasse_forecasts (
      clinic_id,
      calculation_id,
      forecast_date,
      horizon_days,
      projected_amount,
      status,
      metadata
    )
    select
      p_clinic_id,
      p_calculation_id,
      (coalesce(v_calc.period_end, current_date) + (v.horizon_days || ' days')::interval)::date,
      v.horizon_days,
      coalesce(v_calc.net_repasse_amount, 0),
      'projetado',
      jsonb_build_object('source', 'status_transition', 'status', v_new_status)
    from (values (30), (60), (90), (180), (365)) as v(horizon_days)
    on conflict (clinic_id, calculation_id, horizon_days)
    do update
       set forecast_date = excluded.forecast_date,
           projected_amount = excluded.projected_amount,
           status = excluded.status,
           metadata = excluded.metadata,
           updated_at = now();
  elsif v_new_status = 'pago' then
    update public.medical_repasse_forecasts
       set status = 'realizado',
           updated_at = now()
     where clinic_id = p_clinic_id
       and calculation_id = p_calculation_id;
  elsif v_new_status = 'cancelado' then
    update public.medical_repasse_forecasts
       set status = 'cancelado',
           updated_at = now()
     where clinic_id = p_clinic_id
       and calculation_id = p_calculation_id;
  end if;

  v_month_start := date_trunc('month', coalesce(v_calc.period_start, current_date))::date;
  v_month_end := (v_month_start + interval '1 month' - interval '1 day')::date;

  select coalesce(sum(mrc.net_repasse_amount), 0)
    into v_comm_total
  from public.medical_repasse_calculations mrc
  where mrc.clinic_id = p_clinic_id
    and date_trunc('month', mrc.period_start)::date = v_month_start
    and lower(coalesce(mrc.status, 'calculado')) in ('provisionado', 'aprovado', 'liberado', 'pago');

  insert into public.dre_periods (
    clinic_id,
    period_type,
    period_start_date,
    period_end_date,
    gross_revenue,
    net_revenue,
    total_operating_expenses,
    medical_commissions,
    operating_income,
    net_income,
    is_projected
  ) values (
    p_clinic_id,
    'monthly',
    v_month_start,
    v_month_end,
    0,
    0,
    0,
    v_comm_total,
    -v_comm_total,
    -v_comm_total,
    true
  )
  on conflict (clinic_id, period_type, period_start_date)
  do update
     set medical_commissions = excluded.medical_commissions,
         operating_income = coalesce(dre_periods.net_revenue, 0)
                            - coalesce(dre_periods.total_operating_expenses, 0)
                            - excluded.medical_commissions,
         net_income = coalesce(dre_periods.net_revenue, 0)
                      - coalesce(dre_periods.total_operating_expenses, 0)
                      - excluded.medical_commissions,
         is_projected = case
           when lower(v_new_status) = 'pago' then false
           else true
         end,
         updated_at = now();

  v_transition_date := case
    when v_new_status = 'pago' then current_date
    else coalesce(v_calc.forecast_date, v_calc.period_end + interval '30 days', current_date)::date
  end;

  if to_regclass('public.financial_transactions') is not null then
    begin
      execute
        'delete from public.financial_transactions where origin_module = $1 and origin_id = $2'
      using 'medical_repasse', p_calculation_id;

      begin
        execute
          'insert into public.financial_transactions (
             clinic_id, transaction_type, movement_type, status,
             description, amount, transaction_date, due_date, competency_date,
             origin_module, origin_id, cost_center_id, is_reconciled,
             created_by, updated_by, notes
           ) values (
             $1, $2, $3, $4,
             $5, $6, $7, $8, $9,
             $10, $11, $12, false,
             $13, $13, $14
           )'
        using
          p_clinic_id,
          'EXPENSE',
          case when v_new_status = 'pago' then 'REALIZED' else 'PREDICTED' end,
          case
            when v_new_status = 'pago' then 'paid'
            when v_new_status = 'cancelado' then 'canceled'
            else 'scheduled'
          end,
          'Repasse medico - ' || coalesce(to_char(v_calc.period_start, 'MM/YYYY'), 'periodo'),
          coalesce(v_calc.net_repasse_amount, 0),
          v_transition_date,
          v_transition_date,
          coalesce(v_calc.period_start, current_date),
          'medical_repasse',
          p_calculation_id,
          v_calc.cost_center_id,
          v_actor,
          'Lancamento automatico gerado pela transicao do repasse medico';
      exception when others then
        execute
          'insert into public.financial_transactions (
             clinic_id, type, status, category, description, amount,
             scheduled_date, due_date, origin_module, origin_id,
             cost_center_id, created_by, notes
           ) values (
             $1, $2, $3, $4, $5, $6,
             $7, $8, $9, $10,
             $11, $12, $13
           )'
        using
          p_clinic_id,
          'expense',
          case
            when v_new_status = 'pago' then 'paid'
            when v_new_status = 'cancelado' then 'canceled'
            else 'scheduled'
          end,
          'operational_expense',
          'Repasse medico - ' || coalesce(to_char(v_calc.period_start, 'MM/YYYY'), 'periodo'),
          coalesce(v_calc.net_repasse_amount, 0),
          v_transition_date,
          v_transition_date,
          'medical_repasse',
          p_calculation_id,
          v_calc.cost_center_id,
          v_actor,
          'Fallback schema insert - repasse medico';
      end;
    exception when others then
      insert into public.medical_repasse_audit (
        clinic_id,
        entity,
        entity_id,
        action,
        actor_id,
        details
      ) values (
        p_clinic_id,
        'financial_transactions',
        p_calculation_id,
        'SYNC_FAILED',
        v_actor,
        jsonb_build_object('error', SQLERRM, 'status', v_new_status)
      );
    end;
  end if;

  if v_calc.ap_bill_id is not null and to_regclass('public.ap_bills') is not null then
    v_status_ap := case v_new_status
      when 'provisionado' then 'APPROVED'
      when 'aprovado' then 'APPROVED'
      when 'liberado' then 'SCHEDULED'
      when 'pago' then 'PAID'
      when 'cancelado' then 'CANCELED'
      else upper(v_new_status)
    end;

    begin
      begin
        execute
          'update public.ap_bills
              set status = $1,
                  paid_at = case when $1 = ''PAID'' then now() else paid_at end
            where id = $2 and clinic_id = $3'
        using v_status_ap, v_calc.ap_bill_id, p_clinic_id;
      exception when others then
        execute
          'update public.ap_bills
              set status = $1
            where id = $2 and clinic_id = $3'
        using v_status_ap, v_calc.ap_bill_id, p_clinic_id;
      end;
    exception when others then
      insert into public.medical_repasse_audit (
        clinic_id,
        entity,
        entity_id,
        action,
        actor_id,
        details
      ) values (
        p_clinic_id,
        'ap_bills',
        v_calc.ap_bill_id,
        'SYNC_FAILED',
        v_actor,
        jsonb_build_object('error', SQLERRM, 'status', v_status_ap)
      );
    end;
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
    p_clinic_id,
    'medical_repasse_calculations',
    p_calculation_id,
    'STATUS_TRANSITION',
    v_actor,
    jsonb_build_object(
      'observation', p_observation,
      'approval_stage', v_stage,
      'approval_status', v_approval_status
    ),
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', v_new_status)
  );

  v_result := jsonb_build_object(
    'ok', true,
    'calculation_id', p_calculation_id,
    'old_status', v_old_status,
    'new_status', v_new_status,
    'approval_stage', v_stage,
    'dre_month', to_char(v_month_start, 'YYYY-MM'),
    'medical_commissions_month', coalesce(v_comm_total, 0)
  );

  return v_result;
end;
$$;

grant execute on function public.fn_medical_repasse_transition(uuid, uuid, text, uuid, text) to authenticated;
