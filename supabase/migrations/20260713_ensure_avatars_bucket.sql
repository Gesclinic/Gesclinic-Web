-- Ensure user avatar uploads have a dedicated storage bucket and policies.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'avatars_select'
  ) THEN
    CREATE POLICY avatars_select
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'avatars_insert'
  ) THEN
    CREATE POLICY avatars_insert
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'avatars_update'
  ) THEN
    CREATE POLICY avatars_update
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'avatars')
      WITH CHECK (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'avatars_delete'
  ) THEN
    CREATE POLICY avatars_delete
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'avatars');
  END IF;
END $$;

-- This app has custom-session flows, so avatar writes must also work when
-- Supabase Auth is not the active browser session.
ALTER POLICY avatars_insert
  ON storage.objects
  TO public
  WITH CHECK (bucket_id = 'avatars');

ALTER POLICY avatars_update
  ON storage.objects
  TO public
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

ALTER POLICY avatars_delete
  ON storage.objects
  TO public
  USING (bucket_id = 'avatars');