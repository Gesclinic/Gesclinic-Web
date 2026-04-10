# ⚡ QUICK FIX - ESTOQUE (STOCK) ERRORS

## ✅ What Was Fixed

Your Stock module had 4 database schema mismatches. **3 are completely fixed**. **1 requires you to apply a database migration** (2 minutes).

### Fixed in Code ✅
1. ✅ **Supplier columns** - Changed `tax_id` → `cnpj`, `contact_name` → `contact_person`, etc.
2. ✅ **Location columns** - Removed non-existent `is_default` column
3. ✅ **Movement relationships** - Removed non-existent `stock_locations` join

### Fixed in Database ⏳ (You need to do this)
4. ⏳ **RPC Function** - Create `list_stock_items_with_balance()` function

---

## 🚀 How to Apply the Database Fix (2 minutes)

### Step 1: Open Supabase Dashboard
```
https://gvdkdjyupktlflwurike.supabase.co
```

### Step 2: Go to SQL Editor
- Click "SQL Editor" in left sidebar
- Click "+ New Query"

### Step 3: Get the SQL
Run this in your terminal:
```bash
node scripts/apply-db-migration.js
```

### Step 4: Copy & Paste
- Copy all the SQL displayed
- Paste into Supabase SQL editor
- Click "Run" (or Ctrl+Enter)

### Step 5: Done!
- Refresh your browser
- Go to Products page
- Should work without errors ✅

---

## 📂 Files Modified

- `src/lib/stockApi.js` - Fixed all API column/relationship mismatches

---

## 📖 Full Details

See: `ESTOQUE_FIXES_SUMMARY.md` in project root

---

**Status**: ✅ 75% Complete (3 of 4 fixes done)  
**Next**: Apply database migration in Supabase (2 min)
