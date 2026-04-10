-- ============================================================
-- MIGRAÇÃO: Adicionar coluna CPF à tabela professionals
-- ============================================================
-- Data: 24 de janeiro de 2026
-- Propósito: Suportar armazenamento de CPF dos profissionais
-- ============================================================
-- Contexto:
-- - O frontend estava tentando salvar CPF mas a coluna não existia
-- - Implementação de máscara CPF em ProfessionalsPage.jsx
-- - Necessário para funcionalidade de cadastro de profissionais
-- ============================================================

-- Adicionar coluna CPF à tabela professionals
-- Tipo: VARCHAR(11) para armazenar CPF sem formatação (11 dígitos)
-- Exemplo: "01228327017" (sem pontos e traço)
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS cpf VARCHAR(11);

-- Criar índice para melhorar performance de busca por CPF
-- Útil para validações e buscas futuras
CREATE INDEX IF NOT EXISTS idx_professionals_cpf ON professionals(cpf);

-- ============================================================
-- Nota: Após executar esta migração:
-- 1. A coluna cpf estará disponível na tabela professionals
-- 2. O frontend pode enviar dados com CPF
-- 3. Os dados de CPF serão salvos e recuperados corretamente
-- ============================================================
