# 🚀 APPLY DATABASE MIGRATION - STOCK BALANCE FUNCTION

## Problem
The frontend is trying to call the RPC function `list_stock_items_with_balance()` which does not exist in the database yet.

Error:
```
404 (Not Found)
Could not find the function public.list_stock_items_with_balance(p_clinic_id) in the schema cache
```

## Solution
You need to apply the database migration that creates this function.

### Quick Fix - Copy & Paste into Supabase SQL Editor

1. **Go to Supabase Dashboard:**
   - URL: https://gvdkdjyupktlflwurike.supabase.co
   - Click "SQL Editor" in the sidebar

2. **Create a new query:**
   - Click "New Query" button

3. **Copy the SQL below and paste into the editor:**

```sql
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
  unit_symbol VARCHAR(10),
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
    si.sku,
    si.category_id,
    sc.name as category_name,
    COALESCE(si.unit_symbol, 'un') as unit_symbol,
    si.unit_id,
    si.description,
    si.min_stock,
    si.max_stock,
    COALESCE(si.is_active, true) as is_active,
    COALESCE(
      (
        SELECT SUM(
          CASE 
            WHEN sm.type = 'entry' THEN sm.qty
            WHEN sm.type = 'exit' THEN -sm.qty
            WHEN sm.type = 'adjustment' THEN sm.qty
            ELSE 0
          END
        )
        FROM stock_movements sm
        WHERE sm.item_id = si.id
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
        WHEN type = 'entry' THEN qty
        WHEN type = 'exit' THEN -qty
        WHEN type = 'adjustment' THEN qty
        ELSE 0
      END
    ),
    0
  )
  INTO v_balance
  FROM stock_movements
  WHERE clinic_id = p_clinic_id
    AND item_id = p_item_id
    AND location_id = p_location_id;
    
  RETURN v_balance;
END;
$$;

-- =====================================================
-- View para facilitar consultas de saldo
-- =====================================================

-- Remover view existente se houver
DROP VIEW IF EXISTS v_stock_balances;

-- Criar view de saldos
CREATE OR REPLACE VIEW v_stock_balances AS
SELECT 
  sm.clinic_id,
  sm.item_id,
  sm.location_id,
  si.name as item_name,
  si.sku,
  sl.name as location_name,
  COALESCE(si.unit_symbol, 'un') as unit_symbol,
  SUM(
    CASE 
      WHEN sm.type = 'entry' THEN sm.qty
      WHEN sm.type = 'exit' THEN -sm.qty
      WHEN sm.type = 'adjustment' THEN sm.qty
      ELSE 0
    END
  ) as balance
FROM stock_movements sm
INNER JOIN stock_items si ON si.id = sm.item_id
INNER JOIN stock_locations sl ON sl.id = sm.location_id
GROUP BY sm.clinic_id, sm.item_id, sm.location_id, si.name, si.sku, sl.name, si.unit_symbol
HAVING SUM(
  CASE 
    WHEN sm.type = 'entry' THEN sm.qty
    WHEN sm.type = 'exit' THEN -sm.qty
    WHEN sm.type = 'adjustment' THEN sm.qty
    ELSE 0
  END
) <> 0;

-- Grant permissions
GRANT EXECUTE ON FUNCTION list_stock_items_with_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_item_balance_by_location(UUID, UUID, UUID) TO authenticated;
GRANT SELECT ON v_stock_balances TO authenticated;
```

4. **Click the "Run" button** (or press Ctrl+Enter)

5. **Check for success:**
   - You should see "Query executed successfully" message
   - No errors should appear

6. **Refresh your browser:**
   - Go back to the Produtos (Products) page
   - The errors should be gone and products should load with their balances

## What Was Fixed

### In Code (`src/lib/stockApi.js`):
- ✅ Removed non-existent `tax_id` column from supplier queries → using `cnpj` instead
- ✅ Removed non-existent `is_default` column from location queries
- ✅ Removed non-existent `stock_locations` join from movements queries (relationship doesn't exist)
- ✅ Fixed supplier field mappings: `contact_name` → `contact_person`, `email` → `contact_email`, etc.

### In Database (Migration):
- ✅ Creates `list_stock_items_with_balance()` RPC function to calculate stock balances
- ✅ Creates `get_item_balance_by_location()` function for location-specific balances
- ✅ Creates `v_stock_balances` view for easy balance queries
- ✅ Ensures all required columns exist on `stock_items` table
- ✅ Grants proper permissions to authenticated users

## Testing

After applying the migration, test these pages:
- [ ] **Produtos** (Products) - Should load items with balances
- [ ] **Entradas** (Stock Entries) - Should load entry movements
- [ ] **Saídas** (Stock Exits) - Should load exit movements
- [ ] **Transferências** (Transfers) - Should load transfer movements
- [ ] **Requisições** (Requests) - Should load stock requests

## Troubleshooting

If you still see errors after applying the migration:

1. **Check that the function was created:**
   ```sql
   SELECT * FROM information_schema.routines 
   WHERE routine_name = 'list_stock_items_with_balance';
   ```
   You should see one row.

2. **Check column names exist:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'stock_items';
   ```
   Should include: `unit_symbol`, `is_active`, `description`, `min_stock`, `max_stock`, `unit_id`

3. **Clear browser cache:**
   - Press Ctrl+Shift+Delete and clear site data
   - Refresh the page

4. **Restart dev server:**
   - Stop the dev server (Ctrl+C in terminal)
   - Run `npm run dev` again

---

**Status:** ✅ Ready to apply
**Last Updated:** 2026-01-17
