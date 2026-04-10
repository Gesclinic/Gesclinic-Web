-- =====================================================
-- Adicionar colunas faltantes na tabela stock_requests
-- =====================================================

-- Adicionar coluna request_date se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_requests' AND column_name = 'request_date'
  ) THEN
    ALTER TABLE stock_requests ADD COLUMN request_date DATE DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Adicionar coluna location_id se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_requests' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE stock_requests ADD COLUMN location_id UUID REFERENCES stock_locations(id);
  END IF;
END $$;

-- Adicionar coluna notes se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_requests' AND column_name = 'notes'
  ) THEN
    ALTER TABLE stock_requests ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Adicionar coluna requested_by se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_requests' AND column_name = 'requested_by'
  ) THEN
    ALTER TABLE stock_requests ADD COLUMN requested_by TEXT;
  END IF;
END $$;

-- Adicionar coluna approval_comment se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_requests' AND column_name = 'approval_comment'
  ) THEN
    ALTER TABLE stock_requests ADD COLUMN approval_comment TEXT;
  END IF;
END $$;

-- =====================================================
-- Adicionar colunas faltantes na tabela stock_request_items
-- =====================================================

-- Renomear ou adicionar colunas se necessário para compatibilidade
-- Adicionar coluna qty se não existir (similar a quantity_requested)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_request_items' AND column_name = 'qty'
  ) THEN
    ALTER TABLE stock_request_items ADD COLUMN qty DECIMAL(12, 2);
  END IF;
END $$;

-- Adicionar coluna delivered_qty se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_request_items' AND column_name = 'delivered_qty'
  ) THEN
    ALTER TABLE stock_request_items ADD COLUMN delivered_qty DECIMAL(12, 2) DEFAULT 0;
  END IF;
END $$;

-- Adicionar coluna item_id se não existir (alias para stock_item_id)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_request_items' AND column_name = 'item_id'
  ) THEN
    ALTER TABLE stock_request_items ADD COLUMN item_id UUID REFERENCES stock_items(id);
  END IF;
END $$;

-- Adicionar coluna request_id se não existir (alias para stock_request_id)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_request_items' AND column_name = 'request_id'
  ) THEN
    ALTER TABLE stock_request_items ADD COLUMN request_id UUID REFERENCES stock_requests(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Adicionar coluna item_note se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_request_items' AND column_name = 'item_note'
  ) THEN
    ALTER TABLE stock_request_items ADD COLUMN item_note TEXT;
  END IF;
END $$;
