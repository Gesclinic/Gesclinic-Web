ALTER TABLE drawer_movements
  ADD COLUMN IF NOT EXISTS counterparty_name TEXT,
  ADD COLUMN IF NOT EXISTS expense_supplier_name TEXT,
  ADD COLUMN IF NOT EXISTS expense_provider_name TEXT,
  ADD COLUMN IF NOT EXISTS expense_service_description TEXT,
  ADD COLUMN IF NOT EXISTS financial_category TEXT;

CREATE INDEX IF NOT EXISTS idx_drawer_movements_counterparty_name
  ON drawer_movements(counterparty_name);

CREATE INDEX IF NOT EXISTS idx_drawer_movements_financial_category
  ON drawer_movements(financial_category);
