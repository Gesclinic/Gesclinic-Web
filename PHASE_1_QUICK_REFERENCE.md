# ⚡ PHASE 1 — QUICK REFERENCE CARD

**Print this or keep open in browser for fast reference**

---

## 🎯 THE GOAL

When appointment marked as "attended":
```
✅ AR (receivable) created automatically
✅ TISS guide created automatically (if convênio)
✅ Repasse calculated automatically
When appointment marked as "canceled":
✅ AR soft-deleted automatically
```

---

## 📍 QUICK STEPS

| # | Step | Time | Ref |
|---|------|------|-----|
| 1 | Open migration SQL file | 1min | `supabase/migrations/2026-04-11_phase1_*` |
| 2 | Backup database | 2min | Supabase → Settings → Backups |
| 3 | Access SQL Editor | 1min | supabase.com → SQL Editor → New Query |
| 4 | Copy & paste SQL | 2min | File: Select all (Ctrl+A) → Copy (Ctrl+C) → Paste (Ctrl+V) |
| 5 | Execute (click RUN) | 10sec | Blue button, bottom right |
| 6 | Run validation queries | 5min | See "VALIDATIONS" below |
| **TOTAL** | | **20min** | |

---

## ✅ VALIDATIONS (3 queries to run)

### Query 1: Check Functions
```sql
SELECT proname FROM pg_proc 
WHERE proname IN (
  'create_ar_receivable_from_appointment',
  'create_tiss_guide_from_appointment',
  'cancel_ar_receivable_from_appointment',
  'calculate_repasse_per_appointment')
ORDER BY proname;
```
**Expected:** 4 rows  
**Status:** ✅ OK if 4 rows | ❌ FAIL if 0-3 rows

---

### Query 2: Check Triggers
```sql
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name IN (
  'trg_create_ar_on_appointment_attended',
  'trg_create_tiss_guide_on_appointment_attended',
  'trg_cancel_ar_on_appointment_canceled')
ORDER BY trigger_name;
```
**Expected:** 3 rows  
**Status:** ✅ OK if 3 rows | ❌ FAIL if 0-2 rows

---

### Query 3: Check Indexes
```sql
SELECT indexname FROM pg_indexes
WHERE indexname LIKE 'idx%appointment%'
   OR indexname LIKE 'idx%repasse%'
   OR indexname LIKE 'idx%ar_receivables%'
   OR indexname LIKE 'idx%billing%'
ORDER BY indexname;
```
**Expected:** ≥6 rows  
**Status:** ✅ OK if 6+ rows | ❌ FAIL if <6 rows

---

## 🔄 WHAT EACH COMPONENT DOES

| Component | Fires When | Does |
|-----------|-----------|------|
| `trg_create_ar_on_appointment_attended` | status='attended' | INSERT ar_receivables |
| `trg_create_tiss_guide_on_appointment_attended` | status='attended' + payer_id | INSERT billing_guides |
| `trg_cancel_ar_on_appointment_canceled` | status='canceled' | UPDATE ar_receivables status='canceled' |
| `calculate_repasse_per_appointment()` | manual call | RETURN numeric (repasse amount) |

---

## 🧪 QUICK TEST

```sql
-- 1. Create test appointment
INSERT INTO appointments (
  clinic_id, patient_id, professional_id, service_id,
  scheduled_datetime, status, total_value
) VALUES (
  'CLINIC_ID', 'PATIENT_ID', 'PROF_ID', 'SERVICE_ID',
  NOW(), 'scheduled', 150.00
) RETURNING id;
-- Copy the id returned ↑

-- 2. Mark as attended
UPDATE appointments SET status='attended' WHERE id='ID_FROM_ABOVE';

-- 3. Check AR created
SELECT * FROM ar_receivables WHERE appointment_id='ID_FROM_ABOVE';
-- Expected: 1 row with valor=150.00, status='open'

-- 4. Mark as canceled
UPDATE appointments SET status='canceled' WHERE id='ID_FROM_ABOVE';

-- 5. Check AR canceled
SELECT * FROM ar_receivables WHERE appointment_id='ID_FROM_ABOVE';
-- Expected: 1 row with status='canceled'
```

---

## 🚨 ERRORS & FIXES

| Error | Fix |
|-------|-----|
| `relation ar_receivables does not exist` | Run migrations before this one |
| `permission denied` | Use SUPERUSER role in Supabase |
| `function already exists` | Normal (using CREATE OR REPLACE) |
| Trigger not firing | Check RLS policies (may be blocking INSERT) |

---

## ↩️ QUICK ROLLBACK

If you need to undo everything:
```sql
DROP TRIGGER IF EXISTS trg_create_ar_on_appointment_attended ON appointments;
DROP TRIGGER IF EXISTS trg_create_tiss_guide_on_appointment_attended ON appointments;
DROP TRIGGER IF EXISTS trg_cancel_ar_on_appointment_canceled ON appointments;
DROP FUNCTION IF EXISTS create_ar_receivable_from_appointment();
DROP FUNCTION IF EXISTS create_tiss_guide_from_appointment();
DROP FUNCTION IF EXISTS cancel_ar_receivable_from_appointment();
DROP FUNCTION IF EXISTS calculate_repasse_per_appointment(UUID, UUID, UUID);
DROP INDEX IF EXISTS idx_ar_receivables_appointment_clinic;
DROP INDEX IF EXISTS idx_billing_guides_appointment_clinic;
DROP INDEX IF EXISTS idx_appointments_status_clinic;
DROP INDEX IF EXISTS idx_repasse_config_servico_active;
DROP INDEX IF EXISTS idx_repasse_config_grupo_active;
DROP INDEX IF EXISTS idx_repasse_config_profissional_active;
```

---

## 📑 FULL DOCS

Need more details?  
- **PHASE_1_GUIA_PASSO_A_PASSO.md** — Full 7-step guide  
- **PHASE_1_SUMARIO_EXECUTIVO.md** — Overview + concepts  
- **PHASE_1_PROGRESS_TRACKER.md** — Checklist to track progress

---

## ⏰ TIME ESTIMATE

| Task | Time |
|------|------|
| Pre-checks (backup, etc.) | 5min |
| Execute SQL | 2min |
| Validate (3 queries) | 5min |
| Optional: test functional | 5min |
| **Total** | **17min** ✅ |

---

## ✨ SUCCESS CRITERIA

✅ All 3 validations return expected row counts  
✅ No errors in Supabase logs  
✅ (Optional) Functional test: appointment attended → AR created  

---

**READY TO START? Go to https://app.supabase.com and follow QUICK STEPS above!** 🚀
