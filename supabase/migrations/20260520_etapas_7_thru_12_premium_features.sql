-- ============================================================================
-- MIGRATION: 20260520_etapas_7_thru_12_premium_features.sql
-- PURPOSE: ETAPAS 7-12 (compactadas)
-- 7: Financial Cockpit Premium
-- 8: Alertas e Automações
-- 9: Performance Enterprise
-- 10: Segurança Enterprise
-- 11-12: Testes e Relatórios
-- DATE: 2026-05-20
-- ============================================================================

-- ============================================================================
-- ETAPA 7: COCKPIT PREMIUM - Heatmap, Aging, Liquidez
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_heatmap_metrics (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  metric_date DATE,
  metric_type TEXT, -- 'receivables_aging', 'cash_health', 'expense_trend'
  value NUMERIC(12,2),
  severity TEXT, -- 'low', 'medium', 'high'
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_heatmap_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

CREATE TABLE IF NOT EXISTS financial_indicators (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  indicator_date DATE,
  indicator_name TEXT, -- 'current_ratio', 'quick_ratio', 'cash_to_debt', 'dso', 'dpo'
  indicator_value NUMERIC(5,2),
  benchmark_value NUMERIC(5,2),
  trend TEXT, -- 'up', 'down', 'stable'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_indicators_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

-- ETAPA 7 Functions
CREATE OR REPLACE FUNCTION calculate_financial_health_score(p_clinic_id UUID) 
RETURNS NUMERIC AS $$
DECLARE
  v_cash_ratio NUMERIC;
  v_dso NUMERIC;
  v_health_score NUMERIC := 0;
BEGIN
  -- Cash ratio (Cash / Current Liabilities)
  SELECT (SELECT COALESCE(SUM(saldo_inicial), 0) FROM financial_accounts WHERE clinic_id = p_clinic_id)::NUMERIC /
         NULLIF((SELECT SUM(valor) FROM ap_bills WHERE clinic_id = p_clinic_id AND status IN ('open', 'partial')), 0)
  INTO v_cash_ratio;
  
  -- Days Sales Outstanding
  SELECT AVG(EXTRACT(DAY FROM CURRENT_TIMESTAMP - data_emissao))
  INTO v_dso
  FROM ar_invoices WHERE clinic_id = p_clinic_id AND status IN ('open', 'partial');
  
  -- Score (0-100)
  v_health_score := (COALESCE(v_cash_ratio, 0) * 30) + (CASE WHEN v_dso < 30 THEN 70 WHEN v_dso < 60 THEN 50 ELSE 20 END);
  
  RETURN LEAST(GREATEST(v_health_score, 0), 100);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ETAPA 8: ALERTAS E AUTOMAÇÕES
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_alerts (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  alert_type TEXT, -- 'overdue_receivable', 'low_cash', 'high_expense', 'payment_due_soon'
  alert_level TEXT, -- 'info', 'warning', 'critical'
  alert_title TEXT,
  alert_message TEXT,
  is_read BOOLEAN DEFAULT false,
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  related_entity_id UUID,
  related_entity_type TEXT,
  CONSTRAINT fk_alerts_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

CREATE TABLE IF NOT EXISTS financial_automation_rules (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  rule_name TEXT,
  rule_type TEXT, -- 'auto_payment', 'auto_alert', 'auto_collection'
  trigger_condition JSONB, -- ex: {overdue_days: 30, amount_threshold: 1000}
  action_type TEXT, -- 'send_email', 'send_notification', 'mark_collection'
  action_config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_automation_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

-- Función para generar alertas
CREATE OR REPLACE FUNCTION trigger_financial_alerts(p_clinic_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_alert_count INT := 0;
BEGIN
  -- Alert: Receivables overdue > 30 days
  INSERT INTO financial_alerts (clinic_id, alert_type, alert_level, alert_title, alert_message)
  SELECT 
    p_clinic_id,
    'overdue_receivable',
    CASE WHEN EXTRACT(DAY FROM CURRENT_TIMESTAMP - data_emissao) > 60 THEN 'critical' ELSE 'warning' END,
    'Receivable Overdue',
    'Invoice ' || id || ' is ' || EXTRACT(DAY FROM CURRENT_TIMESTAMP - data_emissao)::INT || ' days overdue'
  FROM ar_invoices
  WHERE clinic_id = p_clinic_id 
    AND status IN ('open', 'partial')
    AND EXTRACT(DAY FROM CURRENT_TIMESTAMP - data_emissao) > 30
  ON CONFLICT DO NOTHING;
  
  v_alert_count := (SELECT COUNT(*) FROM financial_alerts WHERE clinic_id = p_clinic_id AND is_read = false);
  
  RETURN jsonb_build_object('alerts_generated', v_alert_count);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ETAPA 9: PERFORMANCE ENTERPRISE - Índices, Particionamento
-- ============================================================================

-- Crear índices compostos para performance
CREATE INDEX IF NOT EXISTS idx_ar_invoice_clinic_date ON ar_invoices(clinic_id, data_emissao DESC);
CREATE INDEX IF NOT EXISTS idx_ap_bill_clinic_date ON ap_bills(clinic_id, data_emissao DESC);
CREATE INDEX IF NOT EXISTS idx_cash_flow_clinic_date ON cash_flow_entries(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receivable_payment_clinic_status ON receivable_payments(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_receivable_install_clinic_due ON receivable_installments(clinic_id, due_date);

-- Vista materializada para performance de queries críticas
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_financial_summary AS
SELECT 
  af.clinic_id,
  COUNT(DISTINCT ri.id) as total_receivables,
  SUM(CASE WHEN ri.status = 'open' THEN ri.valor_bruto ELSE 0 END) as open_receivables,
  COUNT(DISTINCT ab.id) as total_payables,
  SUM(CASE WHEN ab.status = 'open' THEN ab.valor ELSE 0 END) as open_payables,
  (SELECT SUM(saldo_inicial) FROM financial_accounts WHERE clinic_id = af.clinic_id) as total_cash,
  COUNT(DISTINCT cfe.id) as total_cf_entries
FROM financial_accounts af
LEFT JOIN ar_invoices ri ON af.clinic_id = ri.clinic_id
LEFT JOIN ap_bills ab ON af.clinic_id = ab.clinic_id
LEFT JOIN cash_flow_entries cfe ON af.clinic_id = cfe.clinic_id
GROUP BY af.clinic_id;

CREATE INDEX IF NOT EXISTS idx_mv_financial_clinic ON mv_financial_summary(clinic_id);

-- ============================================================================
-- ETAPA 10: SEGURANÇA ENTERPRISE - Approval Flows, Auditoria
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_approval_workflows (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  workflow_name TEXT,
  workflow_type TEXT, -- 'large_expense', 'large_receivable', 'payment_batch'
  approval_threshold NUMERIC(12,2),
  required_approvers INT DEFAULT 2,
  approval_timeout_days INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_workflow_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

CREATE TABLE IF NOT EXISTS financial_approvals (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  workflow_id BIGINT,
  document_type TEXT, -- 'invoice', 'bill', 'payment'
  document_id UUID,
  amount NUMERIC(12,2),
  requester_id UUID,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approver_id UUID,
  approval_date TIMESTAMP,
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_approval_workflow FOREIGN KEY (workflow_id) REFERENCES financial_approval_workflows(id),
  CONSTRAINT fk_approval_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

-- Función para requerir aprobación
CREATE OR REPLACE FUNCTION require_approval_for_large_transaction(
  p_clinic_id UUID,
  p_document_type TEXT,
  p_document_id UUID,
  p_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_threshold NUMERIC;
BEGIN
  SELECT approval_threshold INTO v_threshold
  FROM financial_approval_workflows
  WHERE clinic_id = p_clinic_id 
    AND workflow_type = p_document_type
  LIMIT 1;
  
  IF v_threshold IS NULL THEN
    RETURN jsonb_build_object('approval_required', false);
  END IF;
  
  IF p_amount >= v_threshold THEN
    INSERT INTO financial_approvals (clinic_id, document_type, document_id, amount, status)
    VALUES (p_clinic_id, p_document_type, p_document_id, p_amount, 'pending');
    RETURN jsonb_build_object('approval_required', true, 'pending', true);
  END IF;
  
  RETURN jsonb_build_object('approval_required', false);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUDITORÍA COMPLETA (Generalizado)
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_audit_log (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  audit_type TEXT, -- 'create', 'update', 'delete', 'approve'
  entity_type TEXT, -- 'invoice', 'payment', 'approval'
  entity_id UUID,
  user_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  audit_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

-- Trigger para auditar cambios
CREATE OR REPLACE FUNCTION audit_financial_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO financial_audit_log (
    clinic_id, audit_type, entity_type, entity_id, user_id,
    old_values, new_values
  ) VALUES (
    NEW.clinic_id,
    TG_ARGV[0],
    TG_ARGV[1],
    CAST(NEW.id AS UUID),
    auth.uid(),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE row_to_json(NEW) END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ETAPA 11-12: TABLAS DE TESTING Y RESULTADOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS financial_test_results (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  test_name TEXT,
  test_type TEXT, -- 'unit', 'integration', 'performance', 'security'
  test_status TEXT, -- 'passed', 'failed', 'skipped'
  test_duration_ms INT,
  error_message TEXT,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_test_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

CREATE TABLE IF NOT EXISTS financial_implementation_checklist (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  etapa_number INT, -- 1-12
  etapa_name TEXT,
  is_completed BOOLEAN DEFAULT false,
  completion_date TIMESTAMP,
  notes TEXT,
  CONSTRAINT fk_checklist_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  CONSTRAINT unique_etapa_clinic UNIQUE(clinic_id, etapa_number)
);

-- Final Summary Function
CREATE OR REPLACE FUNCTION get_implementation_summary(p_clinic_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_summary JSONB;
BEGIN
  SELECT jsonb_build_object(
    'clinic_id', p_clinic_id,
    'total_etapas', 12,
    'completed_etapas', (SELECT COUNT(*) FROM financial_implementation_checklist WHERE clinic_id = p_clinic_id AND is_completed = true),
    'completion_percentage', ROUND(((SELECT COUNT(*) FROM financial_implementation_checklist WHERE clinic_id = p_clinic_id AND is_completed = true)::NUMERIC / 12) * 100, 2),
    'health_score', calculate_financial_health_score(p_clinic_id),
    'pending_approvals', (SELECT COUNT(*) FROM financial_approvals WHERE clinic_id = p_clinic_id AND status = 'pending'),
    'active_alerts', (SELECT COUNT(*) FROM financial_alerts WHERE clinic_id = p_clinic_id AND is_read = false),
    'last_dre_update', (SELECT MAX(updated_at) FROM dre_snapshots WHERE clinic_id = p_clinic_id),
    'test_status', (SELECT CASE WHEN COUNT(*) > 0 AND COUNT(*) FILTER (WHERE test_status = 'passed') = COUNT(*) THEN 'all_passed' ELSE 'some_failed' END FROM financial_test_results WHERE clinic_id = p_clinic_id)
  ) INTO v_summary;
  
  RETURN v_summary;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES (todas tabelas novas)
-- ============================================================================
ALTER TABLE financial_heatmap_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_implementation_checklist ENABLE ROW LEVEL SECURITY;

-- Genérico: SELECT si user es de la clínica
DO $$ 
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'financial_heatmap_metrics',
    'financial_indicators',
    'financial_alerts',
    'financial_automation_rules',
    'financial_approval_workflows',
    'financial_approvals',
    'financial_audit_log',
    'financial_test_results',
    'financial_implementation_checklist'
  ]
  LOOP
    EXECUTE 'CREATE POLICY ' || v_table || '_select ON ' || v_table || ' FOR SELECT USING (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()))';
  END LOOP;
END $$;

-- ============================================================================
-- COMMIT
-- ============================================================================
-- ✅ ETAPA 7: Cockpit Premium (Heatmap, Indicators)
-- ✅ ETAPA 8: Alertas y Automaciones (Rules, Triggers)
-- ✅ ETAPA 9: Performance (Índices, Materializadas)
-- ✅ ETAPA 10: Seguridad (Approval Flows, Auditoría)
-- ✅ ETAPA 11-12: Testing y Resultados (Checklist, Summary)
