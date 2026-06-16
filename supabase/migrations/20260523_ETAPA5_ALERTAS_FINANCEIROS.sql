-- ============================================================================
-- ETAPA 5: ALERTAS FINANCEIROS AUTOMÁTICOS
-- ============================================================================
-- Objetivo: Sistema automático de alertas para situações financeiras críticas
-- Condições: Contas vencidas 30/60/90 dias, Repasses pendentes >7 dias
-- ============================================================================

-- 1. TABELA DE ALERTAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  -- Types: 'overdue_30', 'overdue_60', 'overdue_90', 'pending_repayment_7', 'pending_repayment_14'
  reference_id UUID, -- ID da conta ou repasse
  reference_type VARCHAR(20), -- 'ar_invoice', 'professional_repayment'
  message TEXT NOT NULL,
  severity VARCHAR(10) DEFAULT 'medium', -- 'low', 'medium', 'high'
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high')),
  CONSTRAINT valid_alert_type CHECK (alert_type IN ('overdue_30', 'overdue_60', 'overdue_90', 'pending_repayment_7', 'pending_repayment_14'))
);

-- Índices para performance
CREATE INDEX idx_alerts_clinic_id ON alerts(clinic_id);
CREATE INDEX idx_alerts_resolved ON alerts(resolved);
CREATE INDEX idx_alerts_alert_type ON alerts(alert_type);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

-- 2. FUNÇÃO: VERIFICAR E CRIAR ALERTAS DE CONTAS VENCIDAS
-- ============================================================================
CREATE OR REPLACE FUNCTION check_overdue_invoices()
RETURNS JSONB AS $$
DECLARE
  v_alerts_created INT := 0;
  v_alert_details JSONB := '[]'::JSONB;
  v_clinic_id UUID;
  v_invoice RECORD;
BEGIN
  -- Itera sobre todas as clínicas com contas vencidas
  FOR v_clinic_id IN 
    SELECT DISTINCT clinic_id FROM ar_invoices WHERE status = 'open'
  LOOP
    -- Alerta para contas vencidas >90 dias (ALTA PRIORIDADE)
    INSERT INTO alerts (clinic_id, alert_type, reference_id, reference_type, message, severity)
    SELECT 
      v_clinic_id,
      'overdue_90',
      id,
      'ar_invoice',
      'Conta vencida há mais de 90 dias: ' || patient_name || ' - R$ ' || COALESCE(total_amount, 0)::TEXT,
      'high'
    FROM ar_invoices
    WHERE clinic_id = v_clinic_id
      AND status = 'open'
      AND due_date < CURRENT_DATE - INTERVAL '90 days'
      AND NOT EXISTS (
        SELECT 1 FROM alerts 
        WHERE reference_id = ar_invoices.id 
        AND alert_type = 'overdue_90' 
        AND resolved = FALSE
      );

    GET DIAGNOSTICS v_alerts_created = ROW_COUNT;
    v_alert_details := v_alert_details || jsonb_build_array(jsonb_build_object('type', 'overdue_90', 'count', v_alerts_created));

    -- Alerta para contas vencidas >60 dias
    INSERT INTO alerts (clinic_id, alert_type, reference_id, reference_type, message, severity)
    SELECT 
      v_clinic_id,
      'overdue_60',
      id,
      'ar_invoice',
      'Conta vencida há mais de 60 dias: ' || patient_name || ' - R$ ' || COALESCE(total_amount, 0)::TEXT,
      'high'
    FROM ar_invoices
    WHERE clinic_id = v_clinic_id
      AND status = 'open'
      AND due_date BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '61 days'
      AND NOT EXISTS (
        SELECT 1 FROM alerts 
        WHERE reference_id = ar_invoices.id 
        AND alert_type = 'overdue_60' 
        AND resolved = FALSE
      );

    GET DIAGNOSTICS v_alerts_created = ROW_COUNT;
    v_alert_details := v_alert_details || jsonb_build_array(jsonb_build_object('type', 'overdue_60', 'count', v_alerts_created));

    -- Alerta para contas vencidas >30 dias
    INSERT INTO alerts (clinic_id, alert_type, reference_id, reference_type, message, severity)
    SELECT 
      v_clinic_id,
      'overdue_30',
      id,
      'ar_invoice',
      'Conta vencida há mais de 30 dias: ' || patient_name || ' - R$ ' || COALESCE(total_amount, 0)::TEXT,
      'medium'
    FROM ar_invoices
    WHERE clinic_id = v_clinic_id
      AND status = 'open'
      AND due_date BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE - INTERVAL '31 days'
      AND NOT EXISTS (
        SELECT 1 FROM alerts 
        WHERE reference_id = ar_invoices.id 
        AND alert_type = 'overdue_30' 
        AND resolved = FALSE
      );

    GET DIAGNOSTICS v_alerts_created = ROW_COUNT;
    v_alert_details := v_alert_details || jsonb_build_array(jsonb_build_object('type', 'overdue_30', 'count', v_alerts_created));
  END LOOP;

  RETURN v_alert_details;
END;
$$ LANGUAGE plpgsql;

-- 3. FUNÇÃO: VERIFICAR E CRIAR ALERTAS DE REPASSES PENDENTES
-- ============================================================================
CREATE OR REPLACE FUNCTION check_pending_repayments()
RETURNS JSONB AS $$
DECLARE
  v_alerts_created INT := 0;
  v_alert_details JSONB := '[]'::JSONB;
  v_clinic_id UUID;
BEGIN
  -- Itera sobre todas as clínicas com repasses pendentes
  FOR v_clinic_id IN 
    SELECT DISTINCT clinic_id FROM professional_repayments WHERE status = 'pending'
  LOOP
    -- Alerta para repasses pendentes >14 dias (ALTA PRIORIDADE)
    INSERT INTO alerts (clinic_id, alert_type, reference_id, reference_type, message, severity)
    SELECT 
      v_clinic_id,
      'pending_repayment_14',
      id,
      'professional_repayment',
      'Repasse pendente há mais de 14 dias: Profissional ID ' || professional_id::TEXT || ' - R$ ' || COALESCE(repayment_amount, 0)::TEXT,
      'high'
    FROM professional_repayments
    WHERE clinic_id = v_clinic_id
      AND status = 'pending'
      AND created_at < CURRENT_TIMESTAMP - INTERVAL '14 days'
      AND NOT EXISTS (
        SELECT 1 FROM alerts 
        WHERE reference_id = professional_repayments.id 
        AND alert_type = 'pending_repayment_14' 
        AND resolved = FALSE
      );

    GET DIAGNOSTICS v_alerts_created = ROW_COUNT;
    v_alert_details := v_alert_details || jsonb_build_array(jsonb_build_object('type', 'pending_repayment_14', 'count', v_alerts_created));

    -- Alerta para repasses pendentes >7 dias
    INSERT INTO alerts (clinic_id, alert_type, reference_id, reference_type, message, severity)
    SELECT 
      v_clinic_id,
      'pending_repayment_7',
      id,
      'professional_repayment',
      'Repasse pendente há mais de 7 dias: Profissional ID ' || professional_id::TEXT || ' - R$ ' || COALESCE(repayment_amount, 0)::TEXT,
      'medium'
    FROM professional_repayments
    WHERE clinic_id = v_clinic_id
      AND status = 'pending'
      AND created_at BETWEEN CURRENT_TIMESTAMP - INTERVAL '7 days' AND CURRENT_TIMESTAMP - INTERVAL '8 days'
      AND NOT EXISTS (
        SELECT 1 FROM alerts 
        WHERE reference_id = professional_repayments.id 
        AND alert_type = 'pending_repayment_7' 
        AND resolved = FALSE
      );

    GET DIAGNOSTICS v_alerts_created = ROW_COUNT;
    v_alert_details := v_alert_details || jsonb_build_array(jsonb_build_object('type', 'pending_repayment_7', 'count', v_alerts_created));
  END LOOP;

  RETURN v_alert_details;
END;
$$ LANGUAGE plpgsql;

-- 4. FUNÇÃO: RESOLVER ALERTAS (quando conta é paga ou repasse é processado)
-- ============================================================================
CREATE OR REPLACE FUNCTION resolve_invoice_alerts(p_invoice_id UUID)
RETURNS TABLE(resolved_count INT, alert_types TEXT[]) AS $$
BEGIN
  RETURN QUERY
  UPDATE alerts
  SET resolved = TRUE, resolved_at = CURRENT_TIMESTAMP
  WHERE reference_id = p_invoice_id 
    AND reference_type = 'ar_invoice'
    AND resolved = FALSE
  RETURNING COUNT(*)::INT, ARRAY_AGG(alert_type)::TEXT[];
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION resolve_repayment_alerts(p_repayment_id UUID)
RETURNS TABLE(resolved_count INT, alert_types TEXT[]) AS $$
BEGIN
  RETURN QUERY
  UPDATE alerts
  SET resolved = TRUE, resolved_at = CURRENT_TIMESTAMP
  WHERE reference_id = p_repayment_id 
    AND reference_type = 'professional_repayment'
    AND resolved = FALSE
  RETURNING COUNT(*)::INT, ARRAY_AGG(alert_type)::TEXT[];
END;
$$ LANGUAGE plpgsql;

-- 5. FUNÇÃO: EXECUTAR TODAS AS VERIFICAÇÕES DE ALERTAS
-- ============================================================================
CREATE OR REPLACE FUNCTION run_all_alert_checks()
RETURNS JSONB AS $$
DECLARE
  v_overdue_result JSONB;
  v_repayment_result JSONB;
  v_total_result JSONB;
BEGIN
  -- Verifica contas vencidas
  v_overdue_result := check_overdue_invoices();
  
  -- Verifica repasses pendentes
  v_repayment_result := check_pending_repayments();
  
  -- Retorna resultado agregado
  v_total_result := jsonb_build_object(
    'overdue_check', v_overdue_result,
    'repayment_check', v_repayment_result,
    'executed_at', CURRENT_TIMESTAMP::TEXT,
    'status', 'completed'
  );
  
  RETURN v_total_result;
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGER: RESOLVER ALERTAS AO PAGAR CONTA
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_resolve_alerts_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o status mudou para 'paid', resolve todos os alertas dessa conta
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    PERFORM resolve_invoice_alerts(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ar_invoice_resolve_alerts
AFTER UPDATE ON ar_invoices
FOR EACH ROW
EXECUTE FUNCTION trg_resolve_alerts_on_payment();

-- 7. TRIGGER: RESOLVER ALERTAS DE REPASSE AO PAGAR
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_resolve_repayment_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o status mudou para 'paid', resolve todos os alertas desse repasse
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    PERFORM resolve_repayment_alerts(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_professional_repayment_resolve_alerts
AFTER UPDATE ON professional_repayments
FOR EACH ROW
EXECUTE FUNCTION trg_resolve_repayment_alerts();

-- 8. VIEWS PARA DASHBOARD
-- ============================================================================

-- View: Alertas Pendentes
CREATE OR REPLACE VIEW v_pending_alerts AS
SELECT 
  id,
  clinic_id,
  alert_type,
  reference_id,
  reference_type,
  message,
  severity,
  CASE 
    WHEN severity = 'high' THEN 1
    WHEN severity = 'medium' THEN 2
    ELSE 3
  END as severity_order,
  created_at,
  updated_at
FROM alerts
WHERE resolved = FALSE
ORDER BY severity_order, created_at DESC;

-- View: Resumo de Alertas por Clínica
CREATE OR REPLACE VIEW v_alerts_summary_by_clinic AS
SELECT 
  clinic_id,
  COUNT(*) as total_alerts,
  SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_priority,
  SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium_priority,
  SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low_priority,
  SUM(CASE WHEN alert_type LIKE 'overdue%' THEN 1 ELSE 0 END) as overdue_count,
  SUM(CASE WHEN alert_type LIKE 'pending_repayment%' THEN 1 ELSE 0 END) as pending_repayment_count
FROM alerts
WHERE resolved = FALSE
GROUP BY clinic_id;

-- View: Alertas por Tipo
CREATE OR REPLACE VIEW v_alerts_by_type AS
SELECT 
  clinic_id,
  alert_type,
  COUNT(*) as count,
  CASE 
    WHEN alert_type = 'overdue_30' THEN 'Vencidas 30+ dias'
    WHEN alert_type = 'overdue_60' THEN 'Vencidas 60+ dias'
    WHEN alert_type = 'overdue_90' THEN 'Vencidas 90+ dias'
    WHEN alert_type = 'pending_repayment_7' THEN 'Repasses Pendentes 7+ dias'
    WHEN alert_type = 'pending_repayment_14' THEN 'Repasses Pendentes 14+ dias'
    ELSE alert_type
  END as description,
  MAX(created_at) as latest_alert
FROM alerts
WHERE resolved = FALSE
GROUP BY clinic_id, alert_type;

-- 9. FUNÇÃO: OBTER ALERTAS PARA DASHBOARD
-- ============================================================================
CREATE OR REPLACE FUNCTION get_dashboard_alerts(p_clinic_id UUID)
RETURNS TABLE(
  alert_count INT,
  high_priority INT,
  medium_priority INT,
  low_priority INT,
  overdue_count INT,
  pending_repayment_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INT,
    SUM(CASE WHEN a.severity = 'high' THEN 1 ELSE 0 END)::INT,
    SUM(CASE WHEN a.severity = 'medium' THEN 1 ELSE 0 END)::INT,
    SUM(CASE WHEN a.severity = 'low' THEN 1 ELSE 0 END)::INT,
    SUM(CASE WHEN a.alert_type LIKE 'overdue%' THEN 1 ELSE 0 END)::INT,
    SUM(CASE WHEN a.alert_type LIKE 'pending_repayment%' THEN 1 ELSE 0 END)::INT
  FROM alerts a
  WHERE a.clinic_id = p_clinic_id AND a.resolved = FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIM ETAPA 5
-- ============================================================================
-- Resumo:
-- ✅ Tabela: alerts - Armazena todos os alertas
-- ✅ Function: check_overdue_invoices() - Detecta contas vencidas
-- ✅ Function: check_pending_repayments() - Detecta repasses pendentes
-- ✅ Function: resolve_invoice_alerts() - Resolve alertas de contas
-- ✅ Function: resolve_repayment_alerts() - Resolve alertas de repasses
-- ✅ Function: run_all_alert_checks() - Executa todas as verificações
-- ✅ Trigger: trg_ar_invoice_resolve_alerts - Automático ao pagar conta
-- ✅ Trigger: trg_professional_repayment_resolve_alerts - Automático ao pagar repasse
-- ✅ 3 Views para Dashboard: v_pending_alerts, v_alerts_summary_by_clinic, v_alerts_by_type
-- ✅ Function: get_dashboard_alerts() - Retorna resumo para dashboard
-- 
-- Uso Recomendado:
-- 1. Executar run_all_alert_checks() diariamente (job agendado)
-- 2. Triggers resolvem automaticamente quando contas/repasses são pagos
-- 3. Dashboard consulta v_pending_alerts e v_alerts_summary_by_clinic
-- ============================================================================
