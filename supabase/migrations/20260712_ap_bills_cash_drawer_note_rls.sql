ALTER TABLE ap_bills ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ap_bills'
      AND policyname = 'ap_bills_cash_drawer_note_insert'
  ) THEN
    CREATE POLICY "ap_bills_cash_drawer_note_insert"
      ON ap_bills
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
      AND tablename = 'ap_bills'
      AND policyname = 'ap_bills_cash_drawer_note_select'
  ) THEN
    CREATE POLICY "ap_bills_cash_drawer_note_select"
      ON ap_bills
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
      AND tablename = 'ap_bills'
      AND policyname = 'ap_bills_cash_drawer_note_delete'
  ) THEN
    CREATE POLICY "ap_bills_cash_drawer_note_delete"
      ON ap_bills
      FOR DELETE
      USING (
        notes ILIKE '%Movimento do caixa:%'
      );
  END IF;
END $$;
