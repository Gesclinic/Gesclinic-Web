-- Adicionar coluna 'code' à tabela 'plans' para vincular planos à agenda
-- Migration: 2026-02-19_add_code_to_plans

-- Adicionar coluna code
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS code VARCHAR(255);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_plans_code ON plans(code);

-- Adicionar comentário descritivo
COMMENT ON COLUMN plans.code IS 'Código do plano para identificação e vinculação à agenda';
