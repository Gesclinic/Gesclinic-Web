-- ============================================================
-- FIX REPASSE_MEDICO - Adicionar colunas faltantes e funções
-- ============================================================

-- Adicionar colunas faltantes
ALTER TABLE IF EXISTS public.repasse_medico
  ADD COLUMN IF NOT EXISTS periodo_mes VARCHAR(7),  -- Format: YYYY-MM
  ADD COLUMN IF NOT EXISTS ano INTEGER,
  ADD COLUMN IF NOT EXISTS mes INTEGER,
  ADD COLUMN IF NOT EXISTS tipo_geracao VARCHAR(50) DEFAULT 'manual';

-- Sincronizar dados de ano/mes a partir de period_start
UPDATE public.repasse_medico
SET 
  ano = EXTRACT(YEAR FROM period_start)::INTEGER,
  mes = EXTRACT(MONTH FROM period_start)::INTEGER,
  periodo_mes = TO_CHAR(period_start, 'YYYY-MM')
WHERE ano IS NULL OR mes IS NULL OR periodo_mes IS NULL;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_repasse_medico_ano_mes ON public.repasse_medico(ano, mes);
CREATE INDEX IF NOT EXISTS idx_repasse_medico_periodo_mes ON public.repasse_medico(periodo_mes);

-- Criar função gerar_repasse_medico
DROP FUNCTION IF EXISTS public.gerar_repasse_medico(INTEGER, UUID, INTEGER, VARCHAR);

CREATE OR REPLACE FUNCTION public.gerar_repasse_medico(
  p_ano INTEGER,
  p_clinic_id UUID,
  p_mes INTEGER,
  p_tipo_geracao VARCHAR
)
RETURNS TABLE (
  id UUID,
  professional_id UUID,
  professional_name TEXT,
  total_appointments INT,
  total_revenue DECIMAL,
  amount_due DECIMAL,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rm.id,
    rm.professional_id,
    rm.professional_name,
    rm.total_appointments,
    rm.total_revenue,
    rm.amount_due,
    rm.status
  FROM public.repasse_medico rm
  WHERE 
    rm.clinic_id = p_clinic_id
    AND rm.ano = p_ano
    AND rm.mes = p_mes
  ORDER BY rm.professional_name;
END;
$$ LANGUAGE plpgsql;

-- Criar função dashboard_repasse_medico
DROP FUNCTION IF EXISTS public.dashboard_repasse_medico(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.dashboard_repasse_medico(
  p_clinic_id UUID,
  p_mes INTEGER,
  p_ano INTEGER
)
RETURNS TABLE (
  total_repasses INT,
  total_due DECIMAL,
  total_paid DECIMAL,
  pending_count INT,
  paid_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INT as total_repasses,
    COALESCE(SUM(amount_due), 0::DECIMAL) as total_due,
    COALESCE(SUM(amount_paid), 0::DECIMAL) as total_paid,
    COUNT(CASE WHEN status = 'pending' THEN 1 END)::INT as pending_count,
    COUNT(CASE WHEN status = 'paid' THEN 1 END)::INT as paid_count
  FROM public.repasse_medico
  WHERE 
    clinic_id = p_clinic_id
    AND ano = p_ano
    AND mes = p_mes;
END;
$$ LANGUAGE plpgsql;

SELECT 'repasse_medico table and functions fixed!' AS status;

