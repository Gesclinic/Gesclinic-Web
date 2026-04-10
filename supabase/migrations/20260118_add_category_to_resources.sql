-- Migration: Add category column to resources table
-- Date: 2026-01-18
-- Description: Adiciona coluna 'category' à tabela 'resources' para categorizar equipamentos, materiais, etc.

-- Adicionar coluna category se não existir
ALTER TABLE public.resources
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT NULL;

-- Adicionar comentário na coluna
COMMENT ON COLUMN public.resources.category IS 'Categoria do recurso (Equipamento, Material, Instrumento, etc.)';

-- Criar índice na coluna category para melhor performance nas buscas
CREATE INDEX IF NOT EXISTS idx_resources_category 
ON public.resources(clinic_id, category) 
WHERE active = true;
