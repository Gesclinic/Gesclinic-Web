-- ================================================
-- 📁 SETUP SUPABASE STORAGE - DOCUMENTOS PROFISSIONAIS
-- ================================================
-- Execute este script no SQL Editor do Supabase
-- Dashboard → SQL Editor → Cole este conteúdo

-- 1️⃣ Criar Bucket para Documentos de Profissionais
INSERT INTO storage.buckets (id, name, public)
VALUES ('professional-documents', 'professional-documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2️⃣ RLS Policies para o Bucket
-- Permitir upload
DROP POLICY IF EXISTS "Allow authenticated to upload professional documents" ON storage.objects;
CREATE POLICY "Allow authenticated to upload professional documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'professional-documents');

-- Permitir leitura pública
DROP POLICY IF EXISTS "Allow public read professional documents" ON storage.objects;
CREATE POLICY "Allow public read professional documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'professional-documents');

-- Permitir atualizar
DROP POLICY IF EXISTS "Allow authenticated to update professional documents" ON storage.objects;
CREATE POLICY "Allow authenticated to update professional documents"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'professional-documents');

-- Permitir deletar
DROP POLICY IF EXISTS "Allow authenticated to delete professional documents" ON storage.objects;
CREATE POLICY "Allow authenticated to delete professional documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'professional-documents');

-- ================================================
-- ✅ PRONTO! Storage configurado para profissionais
-- ================================================
