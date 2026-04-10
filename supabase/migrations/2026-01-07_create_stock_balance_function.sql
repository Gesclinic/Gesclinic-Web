-- =====================================================
-- Adicionar colunas faltantes na tabela stock_items
-- =====================================================

-- Adicionar coluna unit_symbol se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_items' AND column_name = 'unit_symbol'
  ) THEN
    ALTER TABLE stock_items ADD COLUMN unit_symbol VARCHAR(10) DEFAULT 'un';
  END IF;
END $$;

-- Adicionar coluna is_active se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_items' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE stock_items ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Adicionar coluna description se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_items' AND column_name = 'description'
  ) THEN
    ALTER TABLE stock_items ADD COLUMN description TEXT;
  END IF;
END $$;

-- Adicionar coluna min_stock se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_items' AND column_name = 'min_stock'
  ) THEN
    ALTER TABLE stock_items ADD COLUMN min_stock NUMERIC(10,2) DEFAULT 0;
  END IF;
END $$;

-- Adicionar coluna max_stock se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_items' AND column_name = 'max_stock'
  ) THEN
    ALTER TABLE stock_items ADD COLUMN max_stock NUMERIC(10,2);
  END IF;
END $$;

-- Adicionar coluna unit_id se não existir (para unidades de medida)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_items' AND column_name = 'unit_id'
  ) THEN
    ALTER TABLE stock_items ADD COLUMN unit_id UUID;
  END IF;
END $$;

-- =====================================================
-- Adicionar coluna location_id na tabela stock_movements
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_movements' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE stock_movements ADD COLUMN location_id UUID REFERENCES stock_locations(id);
  END IF;
END $$;

-- =====================================================
-- Função para listar itens de estoque com saldo calculado
-- =====================================================

-- Remover função existente se houver conflito de assinatura
DROP FUNCTION IF EXISTS list_stock_items_with_balance(UUID);

-- Criar função com assinatura correta
CREATE OR REPLACE FUNCTION list_stock_items_with_balance(p_clinic_id UUID)
RETURNS TABLE (
  id UUID,
  clinic_id UUID,
  name TEXT,
  sku TEXT,
  category_id UUID,
  category_name TEXT,
  unit_symbol TEXT,
  unit_id UUID,
  description TEXT,
  min_stock NUMERIC,
  max_stock NUMERIC,
  is_active BOOLEAN,
  total_balance NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    si.id,
    si.clinic_id,
    si.name,
    si.sku::TEXT,
    si.category_id,
    sc.name as category_name,
    COALESCE(si.unit_symbol, 'un')::TEXT as unit_symbol,
    si.unit_id,
    si.description,
    si.min_stock,
    si.max_stock,
    COALESCE(si.is_active, true) as is_active,
    COALESCE(
      (
        SELECT SUM(
          CASE 
            WHEN sm.movement_type = 'entry' THEN sm.quantity
            WHEN sm.movement_type = 'exit' THEN -sm.quantity
            WHEN sm.movement_type = 'adjustment' THEN sm.quantity
            ELSE 0
          END
        )
        FROM stock_movements sm
        WHERE sm.stock_item_id = si.id
          AND sm.clinic_id = p_clinic_id
      ), 
      0
    ) as total_balance
  FROM stock_items si
  LEFT JOIN stock_categories sc ON sc.id = si.category_id
  WHERE si.clinic_id = p_clinic_id
  ORDER BY si.name;
END;
$$;

-- =====================================================
-- Função para calcular saldo por item e localização
-- =====================================================

-- Remover função existente se houver
DROP FUNCTION IF EXISTS get_item_balance_by_location(UUID, UUID, UUID);

-- Criar função para calcular saldo disponível por local
CREATE OR REPLACE FUNCTION get_item_balance_by_location(
  p_clinic_id UUID,
  p_item_id UUID,
  p_location_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN sm.movement_type = 'entry' THEN sm.quantity
        WHEN sm.movement_type = 'exit' THEN -sm.quantity
        WHEN sm.movement_type = 'adjustment' THEN sm.quantity
        ELSE 0
      END
    ),
    0
  )
  INTO v_balance
  FROM stock_movements sm
  WHERE sm.clinic_id = p_clinic_id
    AND sm.stock_item_id = p_item_id
    AND sm.location_id = p_location_id;
    
  RETURN v_balance;
END;
$$;

-- =====================================================
-- View para facilitar consultas de saldo
-- =====================================================

-- Remover view existente se houver
DROP VIEW IF EXISTS v_stock_balances;

-- Criar view de saldos por localização
CREATE OR REPLACE VIEW v_stock_balances AS
SELECT 
  sm.clinic_id,
  sm.stock_item_id,
  sm.location_id,
  si.name as item_name,
  si.sku,
  COALESCE(si.unit_symbol, 'un') as unit_symbol,
  COALESCE(sl.name, 'Sem localização') as location_name,
  SUM(
    CASE 
      WHEN sm.movement_type = 'entry' THEN sm.quantity
      WHEN sm.movement_type = 'exit' THEN -sm.quantity
      WHEN sm.movement_type = 'adjustment' THEN sm.quantity
      ELSE 0
    END
  ) as balance
FROM stock_movements sm
LEFT JOIN stock_items si ON si.id = sm.stock_item_id
LEFT JOIN stock_locations sl ON sl.id = sm.location_id
GROUP BY sm.clinic_id, sm.stock_item_id, sm.location_id, si.name, si.sku, si.unit_symbol, sl.name
ORDER BY si.name, sl.name;

-- Grant permissions
GRANT EXECUTE ON FUNCTION list_stock_items_with_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_item_balance_by_location(UUID, UUID, UUID) TO authenticated;
GRANT SELECT ON v_stock_balances TO authenticated;
