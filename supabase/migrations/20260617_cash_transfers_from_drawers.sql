-- Permite transferir saldo conferido de caixas individuais para contas financeiras operacionais.

ALTER TABLE cash_transfers
  ADD COLUMN IF NOT EXISTS from_drawer_id UUID REFERENCES cash_drawers(id) ON DELETE RESTRICT;

ALTER TABLE cash_transfers
  ALTER COLUMN from_account_id DROP NOT NULL;

ALTER TABLE cash_transfers
  DROP CONSTRAINT IF EXISTS cash_transfers_source_check;

ALTER TABLE cash_transfers
  ADD CONSTRAINT cash_transfers_source_check
  CHECK (
    (from_drawer_id IS NOT NULL AND from_account_id IS NULL)
    OR
    (from_drawer_id IS NULL AND from_account_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_cash_transfers_from_drawer ON cash_transfers(from_drawer_id);
