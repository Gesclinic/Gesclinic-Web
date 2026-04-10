-- 2026-03-16: Adiciona campo crms (JSONB) para múltiplos CRMs/UFs no cadastro de profissionais
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS crms JSONB DEFAULT '[]';

-- Opcional: migrar dados do campo antigo (license_number) para o novo formato, se desejar
UPDATE professionals
SET crms = jsonb_build_array(jsonb_build_object('crm', license_number, 'uf', NULL))
WHERE license_number IS NOT NULL AND (crms IS NULL OR crms = '[]');

-- (Opcional) Remover campo antigo após migração manual:
-- ALTER TABLE professionals DROP COLUMN license_number;
