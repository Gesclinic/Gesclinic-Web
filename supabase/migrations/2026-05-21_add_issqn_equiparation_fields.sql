-- Migration: Add ISSQN Equiparation Fields
-- Date: 2026-05-21
-- Description: Adiciona campos para rastrear equiparação de ISSQN para ISS

-- ============================================================
-- 1. Tabela: services
-- ============================================================
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS has_issqn_equiparation BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.services.has_issqn_equiparation IS 
'Indica se este serviço pode estar equiparado de ISSQN para ISS. FALSE=padrão ISSQN, TRUE=pode usar ISS';

-- ============================================================
-- 2. Tabela: health_insurances
-- ============================================================
ALTER TABLE public.health_insurances
ADD COLUMN IF NOT EXISTS has_issqn_equiparation BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.health_insurances.has_issqn_equiparation IS 
'Indica se este convênio aplica equiparação ISSQN→ISS. FALSE=usa ISSQN, TRUE=usa ISS para serviços equipáveis';

-- ============================================================
-- 3. Tabela: service_prices (se existir) ou health_insurance_service_prices
-- ============================================================
-- Verificar qual tabela existe e adicionar coluna de override
ALTER TABLE public.service_prices
ADD COLUMN IF NOT EXISTS service_issqn_equiparation BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN public.service_prices.service_issqn_equiparation IS 
'Override por serviço×convênio: NULL=usar padrão, FALSE=forçar ISSQN, TRUE=forçar ISS';

-- ============================================================
-- 4. Criar índices para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_services_issqn_equiparation 
ON public.services(clinic_id, has_issqn_equiparation);

CREATE INDEX IF NOT EXISTS idx_health_insurances_issqn_equiparation 
ON public.health_insurances(clinic_id, has_issqn_equiparation);

-- ============================================================
-- 5. Criar função para determinar equiparação
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_service_tax_treatment(
  p_service_id UUID,
  p_health_insurance_id UUID,
  p_clinic_id UUID
)
RETURNS TABLE (
  service_id UUID,
  health_insurance_id UUID,
  is_issqn_equiparated BOOLEAN,
  tax_type TEXT
) AS $$
DECLARE
  v_service_equiparation BOOLEAN;
  v_insurance_equiparation BOOLEAN;
  v_price_override BOOLEAN;
  v_final_equiparation BOOLEAN;
BEGIN
  -- 1. Verificar equiparação do serviço
  SELECT has_issqn_equiparation INTO v_service_equiparation
  FROM public.services
  WHERE id = p_service_id AND clinic_id = p_clinic_id;

  -- 2. Verificar equiparação do convênio
  SELECT has_issqn_equiparation INTO v_insurance_equiparation
  FROM public.health_insurances
  WHERE id = p_health_insurance_id AND clinic_id = p_clinic_id;

  -- 3. Verificar override no preço
  SELECT service_issqn_equiparation INTO v_price_override
  FROM public.service_prices
  WHERE service_id = p_service_id 
    AND health_insurance_id = p_health_insurance_id
    AND clinic_id = p_clinic_id;

  -- 4. Determinar equiparação final (lógica de prioridade)
  -- Prioridade: override > convênio > serviço
  IF v_price_override IS NOT NULL THEN
    v_final_equiparation := v_price_override;
  ELSIF v_insurance_equiparation IS NOT NULL THEN
    v_final_equiparation := v_service_equiparation AND v_insurance_equiparation;
  ELSE
    v_final_equiparation := FALSE;
  END IF;

  -- 5. Retornar resultado
  RETURN QUERY SELECT
    p_service_id,
    p_health_insurance_id,
    v_final_equiparation,
    CASE 
      WHEN v_final_equiparation THEN 'ISS'
      ELSE 'ISSQN'
    END as tax_type;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. Conceder permissões
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_service_tax_treatment TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_service_tax_treatment TO service_role;
