-- =============================================================================
-- ETAPA 5: DRE DINÂMICA - SIMPLIFIED VERSION (Tables only)
-- =============================================================================

-- TABLE 1: DRE Periods
CREATE TABLE IF NOT EXISTS dre_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  period_type VARCHAR(20) NOT NULL,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  appointment_revenue DECIMAL(14, 2) DEFAULT 0,
  service_revenue DECIMAL(14, 2) DEFAULT 0,
  product_revenue DECIMAL(14, 2) DEFAULT 0,
  other_revenue DECIMAL(14, 2) DEFAULT 0,
  gross_revenue DECIMAL(14, 2) DEFAULT 0,
  discounts DECIMAL(14, 2) DEFAULT 0,
  cancellations DECIMAL(14, 2) DEFAULT 0,
  net_revenue DECIMAL(14, 2) DEFAULT 0,
  personnel_expenses DECIMAL(14, 2) DEFAULT 0,
  rent_expenses DECIMAL(14, 2) DEFAULT 0,
  utilities_expenses DECIMAL(14, 2) DEFAULT 0,
  supplies_expenses DECIMAL(14, 2) DEFAULT 0,
  maintenance_expenses DECIMAL(14, 2) DEFAULT 0,
  marketing_expenses DECIMAL(14, 2) DEFAULT 0,
  professional_fees DECIMAL(14, 2) DEFAULT 0,
  depreciation_expenses DECIMAL(14, 2) DEFAULT 0,
  other_operating_expenses DECIMAL(14, 2) DEFAULT 0,
  total_operating_expenses DECIMAL(14, 2) DEFAULT 0,
  medical_commissions DECIMAL(14, 2) DEFAULT 0,
  tax_withholdings DECIMAL(14, 2) DEFAULT 0,
  operating_income DECIMAL(14, 2) DEFAULT 0,
  other_income DECIMAL(14, 2) DEFAULT 0,
  other_expenses DECIMAL(14, 2) DEFAULT 0,
  pre_tax_income DECIMAL(14, 2) DEFAULT 0,
  income_tax DECIMAL(14, 2) DEFAULT 0,
  net_income DECIMAL(14, 2) DEFAULT 0,
  gross_margin_pct DECIMAL(5, 2) DEFAULT 0,
  operating_margin_pct DECIMAL(5, 2) DEFAULT 0,
  net_margin_pct DECIMAL(5, 2) DEFAULT 0,
  is_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMP,
  locked_by_user_id UUID,
  is_projected BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT unique_period UNIQUE(clinic_id, period_type, period_start_date)
);

ALTER TABLE dre_periods ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dre_periods_clinic ON dre_periods(clinic_id);
CREATE INDEX IF NOT EXISTS idx_dre_periods_period ON dre_periods(clinic_id, period_type, period_start_date);
CREATE INDEX IF NOT EXISTS idx_dre_periods_date_range ON dre_periods(clinic_id, period_end_date DESC);

-- TABLE 2: DRE Line Items
CREATE TABLE IF NOT EXISTS dre_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  dre_period_id UUID NOT NULL,
  account_code VARCHAR(20),
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50),
  line_amount DECIMAL(14, 2) NOT NULL,
  source_table VARCHAR(50),
  source_record_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_dre_period FOREIGN KEY (dre_period_id) REFERENCES dre_periods(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dre_line_items_period ON dre_line_items(dre_period_id);
CREATE INDEX IF NOT EXISTS idx_dre_line_items_account ON dre_line_items(account_code);

-- TABLE 3: DRE Projections
CREATE TABLE IF NOT EXISTS dre_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  projection_month DATE NOT NULL,
  scenario_name VARCHAR(100),
  projected_revenue DECIMAL(14, 2),
  projected_expenses DECIMAL(14, 2),
  projected_commissions DECIMAL(14, 2),
  projected_net_income DECIMAL(14, 2),
  assumptions TEXT,
  created_by_user_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

-- Validation
SELECT COUNT(*) as tables_created FROM (
  SELECT 'dre_periods' UNION ALL
  SELECT 'dre_line_items' UNION ALL
  SELECT 'dre_projections'
) as t;

COMMIT;
