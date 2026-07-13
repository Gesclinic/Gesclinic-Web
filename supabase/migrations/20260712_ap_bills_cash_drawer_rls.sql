ALTER TABLE ap_bills ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ap_bills'
      AND policyname = 'ap_bills_cash_drawer_insert'
  ) THEN
    CREATE POLICY "ap_bills_cash_drawer_insert"
      ON ap_bills
      FOR INSERT
      WITH CHECK (
        auth.uid() IS NOT NULL
        AND clinic_id IN (
          SELECT clinic_id
          FROM users
          WHERE id = auth.uid()
             OR email = auth.jwt() ->> 'email'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ap_bills'
      AND policyname = 'ap_bills_cash_drawer_select'
  ) THEN
    CREATE POLICY "ap_bills_cash_drawer_select"
      ON ap_bills
      FOR SELECT
      USING (
        auth.uid() IS NOT NULL
        AND clinic_id IN (
          SELECT clinic_id
          FROM users
          WHERE id = auth.uid()
             OR email = auth.jwt() ->> 'email'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ap_bills'
      AND policyname = 'ap_bills_cash_drawer_delete'
  ) THEN
    CREATE POLICY "ap_bills_cash_drawer_delete"
      ON ap_bills
      FOR DELETE
      USING (
        auth.uid() IS NOT NULL
        AND clinic_id IN (
          SELECT clinic_id
          FROM users
          WHERE id = auth.uid()
             OR email = auth.jwt() ->> 'email'
        )
      );
  END IF;
END $$;
