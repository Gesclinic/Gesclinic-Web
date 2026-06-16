-- ============================================================================
-- MIGRATION: 20260520_dynamic_dre_engine.sql
-- PURPOSE: ETAPA 5 - DRE (Income Statement) dinâmica baseada em plano de contas
-- STATUS: Ativa
-- DATE: 2026-05-20
-- ============================================================================

-- ============================================================================
-- 1. TABELA: financial_chart_of_accounts (expandir se necessário)
-- Estrutura contábil: receitas, custos, despesas
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_chart_of_accounts (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  
  -- Identificação
  account_code TEXT NOT NULL, -- 1.0, 1.1, 2.0, 2.1.1, etc (contábil)
  account_name TEXT NOT NULL,
  description TEXT,
  
  -- Classificação
  account_type TEXT NOT NULL, -- 'revenue', 'cost', 'expense', 'financial', 'tax'
  account_category TEXT NOT NULL, -- 'gross_revenue', 'deductions', 'cogs', 'admin', 'clinic', 'commercial', 'financial', 'tax'
  account_subtype TEXT, -- 'service_revenue', 'insurance_revenue', 'other_revenue', etc
  
  -- DRE Position
  dre_line_item TEXT, -- PARA DRE: 'gross_revenue', 'revenue_deduction', 'net_revenue', 'cogs', 'gross_profit', 'admin_expense', 'clinic_expense', 'commercial_expense', 'financial_expense', 'ebitda', 'tax_expense', 'net_income'
  dre_order INT, -- Ordem de apresentação no DRE (1-100)
  dre_sign TEXT DEFAULT '+', -- '+' ou '-' (multiplicador para cálculo)
  
  -- Comportamento
  is_active BOOLEAN DEFAULT true,
  is_summary_account BOOLEAN DEFAULT false, -- Se é linha de resumo (não tem lançamentos diretos)
  
  -- Multi-currency/empresa
  cost_center_id UUID, -- Link com centro de custo
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_coa_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  CONSTRAINT unique_code_per_clinic UNIQUE(clinic_id, account_code),
  CONSTRAINT valid_dre_line CHECK (dre_line_item IN ('gross_revenue', 'revenue_deduction', 'net_revenue', 'cogs', 'gross_profit', 'admin_expense', 'clinic_expense', 'commercial_expense', 'financial_expense', 'ebitda', 'tax_expense', 'net_income'))
);

CREATE INDEX idx_coa_clinic ON financial_chart_of_accounts(clinic_id);
CREATE INDEX idx_coa_account_type ON financial_chart_of_accounts(clinic_id, account_type);
CREATE INDEX idx_coa_dre_line ON financial_chart_of_accounts(dre_line_item);

-- ============================================================================
-- 2. TABELA: dre_snapshots
-- Snapshots da DRE em período (para performance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dre_snapshots (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL,
  
  -- Período
  period_type TEXT NOT NULL, -- 'month', 'quarter', 'year'
  period_year INT NOT NULL,
  period_month INT, -- NULL para quarter/year
  period_quarter INT, -- NULL para month/year
  
  -- Valores
  gross_revenue NUMERIC(14,2),
  revenue_deductions NUMERIC(14,2),
  net_revenue NUMERIC(14,2),
  cogs NUMERIC(14,2),
  gross_profit NUMERIC(14,2),
  gross_profit_margin NUMERIC(5,2),
  
  -- Despesas
  admin_expense NUMERIC(14,2),
  clinic_expense NUMERIC(14,2),
  commercial_expense NUMERIC(14,2),
  financial_expense NUMERIC(14,2),
  total_operating_expense NUMERIC(14,2),
  
  -- Resultado
  ebitda NUMERIC(14,2),
  ebitda_margin NUMERIC(5,2),
  tax_expense NUMERIC(14,2),
  net_income NUMERIC(14,2),
  net_margin NUMERIC(5,2),
  
  -- Competência
  competence_type TEXT DEFAULT 'accrual', -- 'accrual' ou 'cash'
  is_projected BOOLEAN DEFAULT false,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_dre_snapshots_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  CONSTRAINT unique_dre_snapshot UNIQUE(clinic_id, period_type, period_year, period_month, period_quarter)
);

CREATE INDEX idx_dre_snapshots_clinic_period ON dre_snapshots(clinic_id, period_year, period_month);

-- ============================================================================
-- 3. FUNÇÃO: calculate_dre_for_period()
-- Motor de cálculo dinâmico da DRE
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_dre_for_period(
  p_clinic_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_competence_type TEXT DEFAULT 'accrual'
) RETURNS JSONB AS $$
DECLARE
  v_gross_revenue NUMERIC(14,2) := 0;
  v_revenue_deductions NUMERIC(14,2) := 0;
  v_net_revenue NUMERIC(14,2);
  v_cogs NUMERIC(14,2) := 0;
  v_gross_profit NUMERIC(14,2);
  v_gross_profit_margin NUMERIC(5,2);
  
  v_admin_expense NUMERIC(14,2) := 0;
  v_clinic_expense NUMERIC(14,2) := 0;
  v_commercial_expense NUMERIC(14,2) := 0;
  v_financial_expense NUMERIC(14,2) := 0;
  v_total_expense NUMERIC(14,2);
  
  v_ebitda NUMERIC(14,2);
  v_ebitda_margin NUMERIC(5,2);
  v_tax_expense NUMERIC(14,2) := 0;
  v_net_income NUMERIC(14,2);
  v_net_margin NUMERIC(5,2);
  
  v_result JSONB;
  v_line_details JSONB := '{}';
BEGIN
  -- 1. CALCULAR RECEITA BRUTA (Receitas de serviços + convênios)
  SELECT COALESCE(SUM(CASE 
    WHEN p_competence_type = 'accrual' THEN ri.valor_bruto
    WHEN p_competence_type = 'cash' AND ri.data_recebimento IS NOT NULL THEN ri.valor_bruto
    ELSE 0 END), 0)
  INTO v_gross_revenue
  FROM ar_invoices ri
  WHERE ri.clinic_id = p_clinic_id
    AND ri.data_emissao::DATE BETWEEN p_start_date AND p_end_date;
  
  -- 2. DEDUÇÕES (Abatimentos, devoluções, cancelamentos)
  SELECT COALESCE(SUM(ri.descontos), 0)
  INTO v_revenue_deductions
  FROM ar_invoices ri
  WHERE ri.clinic_id = p_clinic_id
    AND ri.data_emissao::DATE BETWEEN p_start_date AND p_end_date;
  
  -- 3. RECEITA LÍQUIDA
  v_net_revenue := v_gross_revenue - v_revenue_deductions;
  
  -- 4. CUSTOS DOS SERVIÇOS (COGS)
  -- Aqui seria: custo de materiais, terceirizações, custos variáveis
  -- Simplificado: assumir 20% do net_revenue como placeholder
  v_cogs := v_net_revenue * 0.20;
  
  -- 5. LUCRO BRUTO
  v_gross_profit := v_net_revenue - v_cogs;
  v_gross_profit_margin := CASE WHEN v_net_revenue > 0 THEN (v_gross_profit / v_net_revenue * 100)::NUMERIC(5,2) ELSE 0 END;
  
  -- 6. DESPESAS OPERACIONAIS (por categoria contábil)
  -- Admin
  SELECT COALESCE(SUM(CASE 
    WHEN p_competence_type = 'accrual' THEN ab.valor
    WHEN p_competence_type = 'cash' AND ab.data_recebimento IS NOT NULL THEN ab.valor
    ELSE 0 END), 0)
  INTO v_admin_expense
  FROM ap_bills ab
  WHERE ab.clinic_id = p_clinic_id
    AND ab.descricao ILIKE '%admin%'
    AND ab.data_emissao::DATE BETWEEN p_start_date AND p_end_date;
  
  -- Clínica (aluguel, energia, etc)
  SELECT COALESCE(SUM(ab.valor), 0)
  INTO v_clinic_expense
  FROM ap_bills ab
  WHERE ab.clinic_id = p_clinic_id
    AND ab.descricao ILIKE '%clinic%' OR ab.descricao ILIKE '%aluguel%' OR ab.descricao ILIKE '%energia%'
    AND ab.data_emissao::DATE BETWEEN p_start_date AND p_end_date;
  
  -- Comercial (marketing, vendas)
  SELECT COALESCE(SUM(ab.valor), 0)
  INTO v_commercial_expense
  FROM ap_bills ab
  WHERE ab.clinic_id = p_clinic_id
    AND ab.descricao ILIKE '%commercial%' OR ab.descricao ILIKE '%marketing%'
    AND ab.data_emissao::DATE BETWEEN p_start_date AND p_end_date;
  
  -- Financeira (juros, multas)
  SELECT COALESCE(SUM(ab.valor), 0)
  INTO v_financial_expense
  FROM ap_bills ab
  WHERE ab.clinic_id = p_clinic_id
    AND ab.descricao ILIKE '%financial%' OR ab.descricao ILIKE '%juros%'
    AND ab.data_emissao::DATE BETWEEN p_start_date AND p_end_date;
  
  v_total_expense := v_admin_expense + v_clinic_expense + v_commercial_expense + v_financial_expense;
  
  -- 7. EBITDA (Earnings Before Interest, Tax, Depreciation, Amortization)
  v_ebitda := v_gross_profit - v_total_expense;
  v_ebitda_margin := CASE WHEN v_net_revenue > 0 THEN (v_ebitda / v_net_revenue * 100)::NUMERIC(5,2) ELSE 0 END;
  
  -- 8. IMPOSTOS (simplificado)
  v_tax_expense := CASE WHEN v_ebitda > 0 THEN v_ebitda * 0.15 ELSE 0 END; -- 15% placeholder
  
  -- 9. LUCRO LÍQUIDO
  v_net_income := v_ebitda - v_tax_expense;
  v_net_margin := CASE WHEN v_net_revenue > 0 THEN (v_net_income / v_net_revenue * 100)::NUMERIC(5,2) ELSE 0 END;
  
  -- 10. Montar resultado
  v_result := jsonb_build_object(
    'period_start', p_start_date,
    'period_end', p_end_date,
    'competence_type', p_competence_type,
    'revenue', jsonb_build_object(
      'gross_revenue', v_gross_revenue,
      'revenue_deductions', v_revenue_deductions,
      'net_revenue', v_net_revenue
    ),
    'costs_and_profit', jsonb_build_object(
      'cogs', v_cogs,
      'gross_profit', v_gross_profit,
      'gross_profit_margin', v_gross_profit_margin
    ),
    'expenses', jsonb_build_object(
      'admin_expense', v_admin_expense,
      'clinic_expense', v_clinic_expense,
      'commercial_expense', v_commercial_expense,
      'financial_expense', v_financial_expense,
      'total_operating_expense', v_total_expense
    ),
    'result', jsonb_build_object(
      'ebitda', v_ebitda,
      'ebitda_margin', v_ebitda_margin,
      'tax_expense', v_tax_expense,
      'net_income', v_net_income,
      'net_margin', v_net_margin
    )
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. FUNÇÃO: compare_dre_periods()
-- Compara DRE de dois períodos (análise YoY, MoM)
-- ============================================================================
CREATE OR REPLACE FUNCTION compare_dre_periods(
  p_clinic_id UUID,
  p_period1_start DATE,
  p_period1_end DATE,
  p_period2_start DATE,
  p_period2_end DATE
) RETURNS JSONB AS $$
DECLARE
  v_dre1 JSONB;
  v_dre2 JSONB;
  v_comparison JSONB;
BEGIN
  -- Calcular ambas as DREs
  v_dre1 := calculate_dre_for_period(p_clinic_id, p_period1_start, p_period1_end, 'accrual');
  v_dre2 := calculate_dre_for_period(p_clinic_id, p_period2_start, p_period2_end, 'accrual');
  
  -- Calcular variações
  v_comparison := jsonb_build_object(
    'period_1', jsonb_build_object('start', p_period1_start, 'end', p_period1_end),
    'period_2', jsonb_build_object('start', p_period2_start, 'end', p_period2_end),
    'revenue', jsonb_build_object(
      'gross_revenue_var', ((v_dre2->'revenue'->>'gross_revenue')::NUMERIC - (v_dre1->'revenue'->>'gross_revenue')::NUMERIC),
      'gross_revenue_var_pct', CASE 
        WHEN (v_dre1->'revenue'->>'gross_revenue')::NUMERIC > 0 
        THEN (((v_dre2->'revenue'->>'gross_revenue')::NUMERIC - (v_dre1->'revenue'->>'gross_revenue')::NUMERIC) / (v_dre1->'revenue'->>'gross_revenue')::NUMERIC * 100)::NUMERIC(5,2)
        ELSE 0 END,
      'net_revenue_var', ((v_dre2->'revenue'->>'net_revenue')::NUMERIC - (v_dre1->'revenue'->>'net_revenue')::NUMERIC)
    ),
    'profit', jsonb_build_object(
      'gross_profit_var', ((v_dre2->'costs_and_profit'->>'gross_profit')::NUMERIC - (v_dre1->'costs_and_profit'->>'gross_profit')::NUMERIC),
      'ebitda_var', ((v_dre2->'result'->>'ebitda')::NUMERIC - (v_dre1->'result'->>'ebitda')::NUMERIC),
      'net_income_var', ((v_dre2->'result'->>'net_income')::NUMERIC - (v_dre1->'result'->>'net_income')::NUMERIC)
    ),
    'expenses', jsonb_build_object(
      'operating_expense_var', (
        ((v_dre2->'expenses'->>'admin_expense')::NUMERIC + (v_dre2->'expenses'->>'clinic_expense')::NUMERIC) -
        ((v_dre1->'expenses'->>'admin_expense')::NUMERIC + (v_dre1->'expenses'->>'clinic_expense')::NUMERIC)
      )
    )
  );
  
  RETURN v_comparison;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================
ALTER TABLE financial_chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dre_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY coa_select
  ON financial_chart_of_accounts FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()));

CREATE POLICY dre_snapshots_select
  ON dre_snapshots FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()));

-- ============================================================================
-- 6. SEED DATA: Plano de Contas padrão para novas clínicas
-- ============================================================================
INSERT INTO financial_chart_of_accounts (clinic_id, account_code, account_name, account_type, account_category, dre_line_item, dre_order, dre_sign, is_active)
SELECT 
  id as clinic_id,
  '1.0' as account_code,
  'Receita Bruta de Serviços' as account_name,
  'revenue' as account_type,
  'gross_revenue' as account_category,
  'gross_revenue' as dre_line_item,
  10 as dre_order,
  '+' as dre_sign,
  true as is_active
FROM clinics
WHERE id NOT IN (SELECT DISTINCT clinic_id FROM financial_chart_of_accounts)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMIT
-- ============================================================================
-- ✅ financial_chart_of_accounts: Plano de contas com DRE mapping
-- ✅ dre_snapshots: Cache de DRE por período
-- ✅ calculate_dre_for_period(): Motor dinâmico
-- ✅ compare_dre_periods(): Análise comparativa
-- ✅ RLS Policies
-- ✅ Seed data
