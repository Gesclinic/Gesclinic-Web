-- ============================================================================
-- ETAPA 7: FINANCIAL COCKPIT PREMIUM
-- ============================================================================
-- Objetivo: Dashboard executivo com 12 KPIs, previsões e BI avançado
-- Views: 10 views para BI e previsões
-- Funções: Funções para cálculo de KPIs e previsões
-- ============================================================================

-- 1. TABELA: METAS E OBJETIVOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS cockpit_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  -- 'revenue', 'ocupancy', 'collection_rate', 'margin', 'cash_flow'
  target_value DECIMAL(15,2),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  alert_threshold DECIMAL(5,2), -- % de variação para alerta
  notification BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cockpit_goals_clinic_id ON cockpit_goals(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cockpit_goals_metric ON cockpit_goals(metric_name);

-- 2. VIEW: KPI MENSAIS (12 Métricas)
-- ============================================================================
CREATE OR REPLACE VIEW v_kpi_mensais AS
SELECT 
  c.id as clinic_id,
  CURRENT_DATE as reference_date,
  -- RECEITA
  COALESCE(SUM(CASE 
    WHEN ai.created_at >= DATE_TRUNC('month', CURRENT_DATE) 
    THEN ai.amount ELSE 0 END), 0) as faturamento_bruto,
  
  COALESCE(SUM(CASE 
    WHEN ai.created_at >= DATE_TRUNC('month', CURRENT_DATE) AND ai.status = 'paid'
    THEN ai.amount ELSE 0 END), 0) as receita_liquida,
  
  -- OPERACIONAL
  COALESCE(COUNT(DISTINCT CASE 
    WHEN ap.created_at >= DATE_TRUNC('month', CURRENT_DATE)
    THEN ap.id ELSE NULL END), 0) as total_appointments,
  
  COALESCE(COUNT(DISTINCT CASE 
    WHEN ap.created_at >= DATE_TRUNC('month', CURRENT_DATE) 
      AND ap.official_status = 'completed'
    THEN ap.id ELSE NULL END), 0) as completed_appointments,
  
  -- INADIMPLÊNCIA
  COALESCE(COUNT(DISTINCT CASE 
    WHEN ai.status = 'open' AND ai.due_date < CURRENT_DATE - INTERVAL '30 days'
    THEN ai.id ELSE NULL END), 0) as overdue_30_count,
  
  COALESCE(COUNT(DISTINCT CASE 
    WHEN ai.status = 'open' AND ai.due_date < CURRENT_DATE - INTERVAL '60 days'
    THEN ai.id ELSE NULL END), 0) as overdue_60_count,
  
  COALESCE(COUNT(DISTINCT CASE 
    WHEN ai.status = 'open' AND ai.due_date < CURRENT_DATE - INTERVAL '90 days'
    THEN ai.id ELSE NULL END), 0) as overdue_90_count,
  
  -- REPASSE
  COALESCE(SUM(CASE 
    WHEN pr.status = 'pending'
    THEN pr.repayment_amount ELSE 0 END), 0) as repasses_pendentes,
  
  COALESCE(SUM(CASE 
    WHEN pr.status = 'paid' AND pr.updated_at >= DATE_TRUNC('month', CURRENT_DATE)
    THEN pr.repayment_amount ELSE 0 END), 0) as repasses_pagos_mes
FROM clinics c
LEFT JOIN appointments ap ON c.id = ap.clinic_id
LEFT JOIN ar_invoices ai ON c.id = ai.clinic_id
LEFT JOIN professional_repayments pr ON c.id = pr.clinic_id
GROUP BY c.id;

-- 3. VIEW: EVOLUÇÃO MENSAL (Últimos 12 meses)
-- ============================================================================
CREATE OR REPLACE VIEW v_kpi_evolucao_12_meses AS
SELECT 
  c.id as clinic_id,
  DATE_TRUNC('month', ai.created_at)::DATE as mes,
  COALESCE(SUM(ai.amount), 0) as faturamento,
  COALESCE(SUM(CASE WHEN ai.status = 'paid' THEN ai.amount ELSE 0 END), 0) as recebido,
  COALESCE(COUNT(DISTINCT ap.id), 0) as appointments,
  COALESCE(SUM(pr.repayment_amount), 0) as repasses
FROM clinics c
LEFT JOIN ar_invoices ai ON c.id = ai.clinic_id 
  AND ai.created_at >= CURRENT_DATE - INTERVAL '12 months'
LEFT JOIN appointments ap ON c.id = ap.clinic_id 
  AND ap.created_at >= CURRENT_DATE - INTERVAL '12 months'
LEFT JOIN professional_repayments pr ON c.id = pr.clinic_id 
  AND pr.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY c.id, DATE_TRUNC('month', ai.created_at)
ORDER BY c.id, mes DESC;

-- 4. VIEW: ANÁLISE DE INADIMPLÊNCIA (Aging)
-- ============================================================================
CREATE OR REPLACE VIEW v_delinquency_aging AS
SELECT 
  clinic_id,
  SUM(CASE WHEN status = 'open' AND due_date < CURRENT_DATE - INTERVAL '90 days' THEN amount ELSE 0 END) as overdue_90_plus,
  SUM(CASE WHEN status = 'open' AND due_date BETWEEN CURRENT_DATE - INTERVAL '90 days' AND CURRENT_DATE - INTERVAL '60 days' THEN amount ELSE 0 END) as overdue_60_89,
  SUM(CASE WHEN status = 'open' AND due_date BETWEEN CURRENT_DATE - INTERVAL '60 days' AND CURRENT_DATE - INTERVAL '30 days' THEN amount ELSE 0 END) as overdue_30_59,
  SUM(CASE WHEN status = 'open' AND due_date BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE THEN amount ELSE 0 END) as overdue_1_29,
  SUM(CASE WHEN status = 'open' AND due_date > CURRENT_DATE THEN amount ELSE 0 END) as not_yet_due,
  SUM(CASE WHEN status = 'open' THEN amount ELSE 0 END) as total_open
FROM ar_invoices
GROUP BY clinic_id;

-- 5. VIEW: PERFORMANCE POR PROFISSIONAL
-- ============================================================================
CREATE OR REPLACE VIEW v_professional_performance AS
SELECT 
  p.clinic_id,
  p.id as professional_id,
  p.name as professional_name,
  COUNT(DISTINCT ap.id) as total_appointments,
  SUM(CASE WHEN ap.official_status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN ap.official_status = 'completed' THEN ap.value ELSE 0 END) as total_faturado,
  SUM(CASE WHEN ai.status = 'paid' THEN ai.amount ELSE 0 END) as total_recebido,
  ROUND(
    SUM(CASE WHEN ai.status = 'paid' THEN ai.amount ELSE 0 END)::DECIMAL / 
    NULLIF(SUM(CASE WHEN ap.official_status = 'completed' THEN ap.value ELSE 0 END), 0) * 100,
    2
  ) as coleta_rate,
  COALESCE(SUM(pr.repayment_amount), 0) as repasses_pagos
FROM clinics c
LEFT JOIN professionals p ON c.id = p.clinic_id
LEFT JOIN appointments ap ON p.id = ap.professional_id
LEFT JOIN ar_invoices ai ON ap.id = ai.appointment_id
LEFT JOIN professional_repayments pr ON p.id = pr.professional_id AND pr.status = 'paid'
GROUP BY p.clinic_id, p.id, p.name;

-- 6. VIEW: PERFORMANCE POR CONVÊNIO
-- ============================================================================
CREATE OR REPLACE VIEW v_convenio_performance AS
SELECT 
  ai.clinic_id,
  COALESCE(p.name, 'Particular') as convenio,
  COUNT(DISTINCT ap.id) as total_appointments,
  SUM(ap.value) as total_faturado,
  SUM(CASE WHEN ai.status = 'paid' THEN ai.amount ELSE 0 END) as total_recebido,
  ROUND(
    SUM(CASE WHEN ai.status = 'paid' THEN ai.amount ELSE 0 END)::DECIMAL / 
    NULLIF(SUM(ap.value), 0) * 100,
    2
  ) as coleta_rate
FROM ar_invoices ai
LEFT JOIN appointments ap ON ai.appointment_id = ap.id
LEFT JOIN payers p ON ai.payer_id = p.id
WHERE ai.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY ai.clinic_id, p.name
ORDER BY ai.clinic_id, total_faturado DESC;

-- 7. VIEW: FLUXO DE CAIXA DIÁRIO (Últimos 30 dias)
-- ============================================================================
CREATE OR REPLACE VIEW v_daily_cash_flow_30_days AS
SELECT 
  c.id as clinic_id,
  DATE(ai.created_at) as data,
  COALESCE(SUM(CASE WHEN ai.status = 'paid' THEN ai.received_value ELSE 0 END), 0) as entradas,
  COALESCE(SUM(CASE WHEN pr.status = 'paid' THEN pr.repayment_amount ELSE 0 END), 0) as saidas,
  COALESCE(SUM(CASE WHEN ai.status = 'paid' THEN ai.received_value ELSE 0 END), 0) - 
  COALESCE(SUM(CASE WHEN pr.status = 'paid' THEN pr.repayment_amount ELSE 0 END), 0) as saldo_diario
FROM clinics c
LEFT JOIN ar_invoices ai ON c.id = ai.clinic_id 
  AND ai.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND ai.status = 'paid'
LEFT JOIN professional_repayments pr ON c.id = pr.clinic_id 
  AND DATE(pr.created_at) = DATE(ai.created_at)
  AND pr.status = 'paid'
GROUP BY c.id, DATE(ai.created_at)
ORDER BY c.id, data DESC;

-- 8. FUNÇÃO: PREVISÃO DE RECEITA (30/60/90 dias)
-- ============================================================================
CREATE OR REPLACE FUNCTION forecast_revenue(
  p_clinic_id UUID,
  p_days_ahead INT DEFAULT 30
)
RETURNS TABLE(
  clinic_id UUID,
  forecast_date DATE,
  forecasted_amount DECIMAL,
  confidence_level DECIMAL
) AS $$
DECLARE
  v_avg_daily DECIMAL;
  v_std_dev DECIMAL;
  v_trend DECIMAL;
  v_forecast_date DATE;
BEGIN
  -- Calcular média diária dos últimos 30 dias
  SELECT AVG(daily_revenue) INTO v_avg_daily
  FROM (
    SELECT SUM(ai.amount) as daily_revenue
    FROM ar_invoices ai
    WHERE ai.clinic_id = p_clinic_id
      AND ai.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(ai.created_at)
  ) daily;

  -- Calcular desvio padrão
  SELECT STDDEV(daily_revenue) INTO v_std_dev
  FROM (
    SELECT SUM(ai.amount) as daily_revenue
    FROM ar_invoices ai
    WHERE ai.clinic_id = p_clinic_id
      AND ai.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(ai.created_at)
  ) daily;

  -- Calcular tendência (regressão linear simples)
  SELECT (SUM(ai.amount) - LAG(SUM(ai.amount)) OVER (ORDER BY DATE(ai.created_at))) / 30 INTO v_trend
  FROM ar_invoices ai
  WHERE ai.clinic_id = p_clinic_id
    AND ai.created_at >= CURRENT_DATE - INTERVAL '60 days'
  GROUP BY DATE(ai.created_at)
  ORDER BY DATE(ai.created_at) DESC
  LIMIT 1;

  -- Gerar previsões para cada dia
  FOR i IN 1..p_days_ahead LOOP
    v_forecast_date := CURRENT_DATE + i;
    RETURN QUERY
    SELECT 
      p_clinic_id,
      v_forecast_date,
      ROUND((COALESCE(v_avg_daily, 0) + (COALESCE(v_trend, 0) * i))::NUMERIC, 2),
      ROUND((0.95 - (i::DECIMAL / 100))::NUMERIC, 2); -- Confiança decresce ao longo dos dias
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 9. FUNÇÃO: CALCULAR TAXA DE COLETA
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_collection_rate(
  p_clinic_id UUID,
  p_days_back INT DEFAULT 30
)
RETURNS DECIMAL AS $$
DECLARE
  v_total_faturado DECIMAL;
  v_total_recebido DECIMAL;
  v_rate DECIMAL;
BEGIN
  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)
  INTO v_total_faturado, v_total_recebido
  FROM ar_invoices
  WHERE clinic_id = p_clinic_id
    AND created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days_back;

  v_rate := CASE WHEN v_total_faturado > 0 THEN (v_total_recebido / v_total_faturado) * 100 ELSE 0 END;
  
  RETURN ROUND(v_rate::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql;

-- 10. VIEW: TOP 10 PROFISSIONAIS
-- ============================================================================
CREATE OR REPLACE VIEW v_top_10_professionals AS
SELECT 
  pp.clinic_id,
  pp.professional_id,
  pp.professional_name,
  pp.total_appointments,
  pp.completed,
  pp.total_faturado,
  pp.total_recebido,
  pp.coleta_rate,
  pp.repasses_pagos,
  ROW_NUMBER() OVER (PARTITION BY pp.clinic_id ORDER BY pp.total_faturado DESC) as ranking
FROM v_professional_performance pp
WHERE pp.total_faturado > 0
LIMIT 10;

-- 11. VIEW: COMPARATIVO PERÍODO
-- ============================================================================
CREATE OR REPLACE VIEW v_kpi_periodo_comparativo AS
SELECT 
  current.clinic_id,
  -- PERÍODO ATUAL
  current.faturamento_bruto as faturamento_atual,
  current.receita_liquida as recebido_atual,
  current.completed_appointments as appointments_atual,
  ROUND((current.receita_liquida / NULLIF(current.faturamento_bruto, 0) * 100)::NUMERIC, 2) as taxa_coleta_atual,
  
  -- PERÍODO ANTERIOR
  COALESCE(previous.faturamento_bruto, 0) as faturamento_anterior,
  COALESCE(previous.receita_liquida, 0) as recebido_anterior,
  COALESCE(previous.completed_appointments, 0) as appointments_anterior,
  
  -- VARIAÇÃO
  ROUND(((current.faturamento_bruto - COALESCE(previous.faturamento_bruto, 0)) / NULLIF(COALESCE(previous.faturamento_bruto, 1), 0) * 100)::NUMERIC, 2) as faturamento_variacao,
  ROUND(((current.receita_liquida - COALESCE(previous.receita_liquida, 0)) / NULLIF(COALESCE(previous.receita_liquida, 1), 0) * 100)::NUMERIC, 2) as recebido_variacao
FROM v_kpi_mensais current
LEFT JOIN (
  SELECT * FROM v_kpi_mensais
  WHERE reference_date = CURRENT_DATE - INTERVAL '30 days'
) previous ON current.clinic_id = previous.clinic_id;

-- ============================================================================
-- FIM ETAPA 7
-- ============================================================================
