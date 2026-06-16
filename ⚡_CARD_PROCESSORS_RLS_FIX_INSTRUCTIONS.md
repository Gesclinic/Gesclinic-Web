## ⚡ FIX: Card Processors RLS + Data Upload

### 🔴 Current Blocker
RLS policies are blocking INSERT operations because JWT does not contain `clinic_id` claim.

### ✅ Solution: Execute These 2 SQL Queries

#### PASSO 1: Disable RLS + Fix Policies (1 query)
```sql
-- Temporarily disable RLS
ALTER TABLE card_processors DISABLE ROW LEVEL SECURITY;

-- Insert 6 initial operators
INSERT INTO card_processors (clinic_id, name, settlement_day, is_active, created_at, updated_at)
SELECT 
  (SELECT id FROM clinics LIMIT 1) as clinic_id,
  operator_name as name,
  settlement_day,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM (
  VALUES 
    ('STONE', 1),
    ('PAGBANK', 1),
    ('PAGSEGURO', 15),
    ('MERCADO PAGO', 1),
    ('CIELO', 1),
    ('REDE', 1)
) AS operators(operator_name, settlement_day)
ON CONFLICT (clinic_id, name) DO NOTHING;

-- Re-enable RLS with CORRECTED policies
ALTER TABLE card_processors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS card_processors_select ON card_processors;
DROP POLICY IF EXISTS card_processors_insert ON card_processors;
DROP POLICY IF EXISTS card_processors_update ON card_processors;
DROP POLICY IF EXISTS card_processors_delete ON card_processors;

CREATE POLICY card_processors_select ON card_processors
  FOR SELECT USING (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY card_processors_insert ON card_processors
  FOR INSERT WITH CHECK (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY card_processors_update ON card_processors
  FOR UPDATE USING (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY card_processors_delete ON card_processors
  FOR DELETE USING (
    clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
  );
```

### 📍 HOW TO EXECUTE

1. Go to: [https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new](https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new)
2. Paste the entire SQL from PASSO 1 above
3. Click **Run** button (or Press **Ctrl+Enter**)
4. Wait for success message

### ✔️ VERIFICATION

After running, you should see:
- ✅ Policies dropped
- ✅ Operators inserted (6 rows)
- ✅ RLS re-enabled
- ✅ New policies created

### 📊 Test in Browser

1. Go to: http://localhost:3000/clinica/financeiro/cartoes-operadoras
2. Reload page (F5)
3. List should show: **📋 Operadoras Cadastradas 6**
4. Click on any operator to edit or delete

### 🔍 Troubleshooting

**Issue:** Still showing 0 operators  
**Fix:** Reload page, clear cache (Ctrl+Shift+Delete)

**Issue:** Error "Row-level security policy was violated"  
**Fix:** Policies may not have been created. Re-run PASSO 1.

**Issue:** Authorization error  
**Fix:** Make sure you're logged into Supabase dashboard with correct account

---

## 📝 What This Fixed

- ✅ RLS policies now use `auth.uid()` to look up clinic_id from users table
- ✅ No longer depends on JWT containing clinic_id claim
- ✅ 6 initial operators loaded (STONE, PAGBANK, PAGSEGURO, MERCADO PAGO, CIELO, REDE)
- ✅ CRUD operations (Create, Read, Update, Delete) now work for authenticated users

## 🎯 Next: Test Complete Feature

Once PASSO 1 is done, test all operations:
- ✅ Create: Form at top accepts new operators
- ✅ Read: List displays all 6+ operators
- ✅ Update: Click operator row to edit name or settlement_day
- ✅ Delete: Soft delete button removes from list
