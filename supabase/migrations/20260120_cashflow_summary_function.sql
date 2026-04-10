-- Update/Create cashflow_summary to use ar_receivables + ap_bills
create or replace function public.cashflow_summary(
  p_clinic_id uuid,
  p_start date,
  p_end date
)
returns table (
  ap_open numeric,
  ap_paid numeric,
  ar_open numeric,
  ar_received numeric
) as $$
begin
  -- AP: total em aberto por período (due_date dentro do range)
  return query
  with ap as (
    select
      coalesce(sum(case when status in ('open','scheduled','partial') and due_date between p_start and p_end then amount end), 0) as open,
      coalesce(sum(case when status = 'paid' and paid_at between p_start and p_end then amount end), 0) as paid
    from public.ap_bills
    where clinic_id = p_clinic_id
  ), ar as (
    select
      coalesce(sum(case when status in ('open','planned','partial','overdue') and data_vencimento between p_start and p_end then valor_liquido end), 0) as open,
      coalesce(sum(case when status = 'received' and data_recebimento between p_start and p_end then valor_liquido end), 0) as received
    from public.ar_receivables
    where clinic_id = p_clinic_id
  )
  select ap.open, ap.paid, ar.open, ar.received from ap cross join ar;
end;
$$ language plpgsql security definer;
