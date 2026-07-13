ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'financial_transactions'
      AND policyname = 'financial_transactions_cash_drawer_note_insert'
  ) THEN
    CREATE POLICY "financial_transactions_cash_drawer_note_insert"
      ON financial_transactions
      FOR INSERT
      WITH CHECK (
        notes ILIKE '%Movimento do caixa:%'
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'financial_transactions'
      AND policyname = 'financial_transactions_cash_drawer_note_select'
  ) THEN
    CREATE POLICY "financial_transactions_cash_drawer_note_select"
      ON financial_transactions
      FOR SELECT
      USING (
        notes ILIKE '%Movimento do caixa:%'
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'financial_transactions'
      AND policyname = 'financial_transactions_cash_drawer_note_delete'
  ) THEN
    CREATE POLICY "financial_transactions_cash_drawer_note_delete"
      ON financial_transactions
      FOR DELETE
      USING (
        notes ILIKE '%Movimento do caixa:%'
      );
  END IF;
END $$;
