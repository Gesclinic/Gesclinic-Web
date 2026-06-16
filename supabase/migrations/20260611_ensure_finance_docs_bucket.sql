-- Ensure finance document uploads have a dedicated storage bucket.
INSERT INTO storage.buckets (id, name, public)
VALUES ('finance_docs', 'finance_docs', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'finance_docs_select'
  ) THEN
    CREATE POLICY finance_docs_select
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'finance_docs');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'finance_docs_insert'
  ) THEN
    CREATE POLICY finance_docs_insert
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'finance_docs');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'finance_docs_update'
  ) THEN
    CREATE POLICY finance_docs_update
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'finance_docs')
      WITH CHECK (bucket_id = 'finance_docs');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'finance_docs_delete'
  ) THEN
    CREATE POLICY finance_docs_delete
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'finance_docs');
  END IF;
END $$;

ALTER POLICY finance_docs_insert
  ON storage.objects
  TO public
  WITH CHECK (bucket_id = 'finance_docs');

ALTER POLICY finance_docs_update
  ON storage.objects
  TO public
  USING (bucket_id = 'finance_docs')
  WITH CHECK (bucket_id = 'finance_docs');

ALTER POLICY finance_docs_delete
  ON storage.objects
  TO public
  USING (bucket_id = 'finance_docs');