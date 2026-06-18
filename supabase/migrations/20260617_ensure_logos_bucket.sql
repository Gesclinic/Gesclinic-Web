-- Ensure clinic logo uploads have a dedicated storage bucket and policies.
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'logos_select'
  ) THEN
    CREATE POLICY logos_select
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'logos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'logos_insert'
  ) THEN
    CREATE POLICY logos_insert
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'logos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'logos_update'
  ) THEN
    CREATE POLICY logos_update
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'logos')
      WITH CHECK (bucket_id = 'logos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'logos_delete'
  ) THEN
    CREATE POLICY logos_delete
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'logos');
  END IF;
END $$;

-- This project can run with anonymous sessions in some flows.
ALTER POLICY logos_insert
  ON storage.objects
  TO public
  WITH CHECK (bucket_id = 'logos');

ALTER POLICY logos_update
  ON storage.objects
  TO public
  USING (bucket_id = 'logos')
  WITH CHECK (bucket_id = 'logos');

ALTER POLICY logos_delete
  ON storage.objects
  TO public
  USING (bucket_id = 'logos');
