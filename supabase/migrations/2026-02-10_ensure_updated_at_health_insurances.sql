-- ============================================================
-- Garantir coluna updated_at em health_insurances com trigger
-- ============================================================

-- 1. Adicionar coluna updated_at se não existir
ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_health_insurances_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger se não existir
DROP TRIGGER IF EXISTS update_health_insurances_timestamp_trigger ON health_insurances;

CREATE TRIGGER update_health_insurances_timestamp_trigger
BEFORE UPDATE ON health_insurances
FOR EACH ROW
EXECUTE FUNCTION update_health_insurances_timestamp();

-- 4. Atualizar todos os registros existentes para ter um updated_at válido
UPDATE health_insurances
SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;
