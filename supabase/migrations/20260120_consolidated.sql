-- ============================================================================
-- Consolidated from 20260120_add_active_note_blocked_to_professional_schedules.sql
-- ============================================================================

-- Adiciona campos para controle de disponibilidade, observa├º├úo e bloqueio na tabela de hor├írios dos profissionais
ALTER TABLE professional_schedules
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT FALSE;

-- Opcional: atualiza registros existentes para garantir valores padr├úo
UPDATE professional_schedules SET active = TRUE WHERE active IS NULL;
UPDATE professional_schedules SET blocked = FALSE WHERE blocked IS NULL;

-- ============================================================================
-- Consolidated from 20260120_add_duration_minutes_to_professional_schedules.sql
-- ============================================================================

-- Adiciona campo de dura├º├úo do atendimento ├á tabela de hor├írios dos profissionais
ALTER TABLE professional_schedules
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Opcional: atualiza registros existentes para garantir valor padr├úo
UPDATE professional_schedules SET duration_minutes = 30 WHERE duration_minutes IS NULL;

-- ============================================================================
-- Consolidated from 20260120_add_missing_columns.sql
-- ============================================================================

-- Adicionar coluna brand_color na tabela clinics
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS brand_color VARCHAR(7);

-- Adicionar colunas de data na tabela ar_receivables se ela existir
DO $$
BEGIN
  -- Verificar se a tabela ar_receivables existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ar_receivables') THEN
    ALTER TABLE ar_receivables ADD COLUMN IF NOT EXISTS data_vencimento DATE;
    ALTER TABLE ar_receivables ADD COLUMN IF NOT EXISTS data_recebimento TIMESTAMP WITH TIME ZONE;
    ALTER TABLE ar_receivables ADD COLUMN IF NOT EXISTS valor_liquido NUMERIC(10,2);
  END IF;
END
$$;

-- ============================================================================
-- Consolidated from 20260120_cashflow_summary_function.sql
-- ============================================================================

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
  -- AP: total em aberto por per├¡odo (due_date dentro do range)
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
