-- ============================================
-- FASE 6-8: Preparación Arquitectural
-- Adiciona colunas para convênios, repasse médico e produção médica
-- ============================================
-- Data: 2026-06-06
-- Status: Pronta para aplicar

-- FASE 6: Estrutura de Convênios
ALTER TABLE appointment_services
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS authorization_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS authorization_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS plan_name VARCHAR(255);

-- FASE 7: Preparação Repasse Médico
ALTER TABLE appointment_services
ADD COLUMN IF NOT EXISTS professional_percentage NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS professional_discount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS professional_repay_type VARCHAR(50) DEFAULT 'percentage';

-- FASE 8: Preparação Produção Médica
ALTER TABLE appointment_services
ADD COLUMN IF NOT EXISTS medical_production_id UUID REFERENCES medical_production(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sessions_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sessions_total INTEGER,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_appointment_services_plan_id 
ON appointment_services(plan_id);

CREATE INDEX IF NOT EXISTS idx_appointment_services_medical_production_id 
ON appointment_services(medical_production_id);

CREATE INDEX IF NOT EXISTS idx_appointment_services_status 
ON appointment_services(status);

-- Criar função RPC para cálculo de repasse médico
CREATE OR REPLACE FUNCTION calculate_professional_repay(
  p_value NUMERIC,
  p_percentage NUMERIC,
  p_discount NUMERIC,
  p_repay_type VARCHAR
)
RETURNS NUMERIC AS $$
BEGIN
  IF p_repay_type = 'percentage' THEN
    RETURN (p_value - p_discount) * (p_percentage / 100.0);
  ELSIF p_repay_type = 'fixed' THEN
    RETURN p_discount;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Criar função RPC para sincronizar dados de convênio
CREATE OR REPLACE FUNCTION sync_plan_info_to_service(
  p_service_id UUID,
  p_plan_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_plan_name VARCHAR;
BEGIN
  -- Buscar nome do plano
  SELECT name INTO v_plan_name FROM plans WHERE id = p_plan_id;
  
  -- Atualizar appointment_services
  UPDATE appointment_services
  SET plan_name = v_plan_name,
      updated_at = NOW()
  WHERE id = p_service_id;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON COLUMN appointment_services.plan_id IS 'Referência ao convênio/plano de saúde (FASE 6)';
COMMENT ON COLUMN appointment_services.authorization_number IS 'Número de autorização do convênio (FASE 6)';
COMMENT ON COLUMN appointment_services.professional_percentage IS 'Percentual de repasse médico (FASE 7)';
COMMENT ON COLUMN appointment_services.professional_discount IS 'Valor fixo de repasse médico (FASE 7)';
COMMENT ON COLUMN appointment_services.medical_production_id IS 'Link com registro de produção médica (FASE 8)';
COMMENT ON COLUMN appointment_services.status IS 'Status do serviço: pending, partial, completed, cancelled (FASE 8)';
