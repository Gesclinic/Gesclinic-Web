-- ================================================
-- 📸 SETUP SUPABASE STORAGE - FOTOS DE PACIENTES
-- ================================================
-- Execute este script no SQL Editor do Supabase
-- Dashboard → SQL Editor → Cole este conteúdo

-- 1️⃣ Criar Bucket para Fotos de Pacientes
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-photos', 'patient-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2️⃣ RLS Policies para o Bucket
-- Permitir upload
CREATE POLICY "Allow authenticated to upload patient photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'patient-photos');

-- Permitir leitura pública
CREATE POLICY "Allow public read patient photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'patient-photos');

-- Permitir atualizar
CREATE POLICY "Allow authenticated to update photos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'patient-photos');

-- Permitir deletar
CREATE POLICY "Allow authenticated to delete photos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'patient-photos');

-- ================================================
-- ✅ PRONTO! Storage configurado
-- ================================================
