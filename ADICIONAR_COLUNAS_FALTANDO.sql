-- ============================================================
-- ADICIONAR COLUNAS FALTANDO
-- ============================================================
-- Execute este script no Supabase SQL Editor para corrigir os erros

-- 1. Adicionar coluna 'active' à tabela professional_services
ALTER TABLE professional_services
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 2. Verificar se há outras colunas necessárias
ALTER TABLE services
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_professional_services_active ON professional_services(active);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(active);
CREATE INDEX IF NOT EXISTS idx_professionals_active ON professionals(active);

-- ✅ Colunas adicionadas com sucesso!
SELECT '✅ Todas as colunas necessárias foram adicionadas!' as status;
