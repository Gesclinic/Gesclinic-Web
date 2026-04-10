# 🚀 START HERE — PHASE 1 QUICK LAUNCH

**You have 30 minutes to complete PHASE 1. Here's how:**

---

## 📍 YOU ARE ABOUT TO DO THIS

```
Execute one SQL file in Supabase
         ↓
Create 4 PostgreSQL functions
Create 3 PostgreSQL triggers
Create 6 performance indexes
         ↓
Result: Automatic AR/guide creation when appointment marked as "attended"
```

---

## ⏱️ 5-STEP EXECUTION (20 minutes total)

### STEP 1️⃣ (Backup - 2 min)
- Go to https://app.supabase.com
- Find your project (Gesclinic)
- Settings → Backups → Create new backup
- ✅ Wait for backup to complete

### STEP 2️⃣ (Access SQL - 1 min)
- Stay in Supabase dashboard
- Click "SQL Editor" (left menu)
- Click "+ New Query"

### STEP 3️⃣ (Copy SQL - 2 min)
- Open file: `supabase/migrations/2026-04-11_phase1_appointment_financial_integration.sql`
- Select all (Ctrl+A)
- Copy (Ctrl+C)

### STEP 4️⃣ (Execute - 2 min)
- Paste SQL in Supabase (Ctrl+V)
- Click "RUN" button (blue, bottom right)
- ✅ Wait ~10 seconds for execution
- ✅ Verify: No error messages

### STEP 5️⃣ (Validate - 5 min)
- Copy-paste **Query 1** below
- Look for **4 rows** ✅
- Copy-paste **Query 2** below
- Look for **3 rows** ✅
- Copy-paste **Query 3** below
- Look for **≥6 rows** ✅

---

## ✅ VALIDATION QUERIES (Copy-paste in order)

### QUERY 1
```sql
SELECT proname FROM pg_proc WHERE proname IN (
  'create_ar_receivable_from_appointment',
  'create_tiss_guide_from_appointment',
  'cancel_ar_receivable_from_appointment',
  'calculate_repasse_per_appointment'
) ORDER BY proname;
```
**Expected:** 4 rows

---

### QUERY 2
```sql
SELECT trigger_name FROM information_schema.triggers WHERE trigger_name IN (
  'trg_create_ar_on_appointment_attended',
  'trg_create_tiss_guide_on_appointment_attended',
  'trg_cancel_ar_on_appointment_canceled'
) ORDER BY trigger_name;
```
**Expected:** 3 rows

---

### QUERY 3
```sql
SELECT indexname FROM pg_indexes WHERE 
  indexname LIKE 'idx%appointment%' OR indexname LIKE 'idx%repasse%' OR
  indexname LIKE 'idx%ar_receivables%' OR indexname LIKE 'idx%billing%'
ORDER BY indexname;
```
**Expected:** ≥6 rows

---

## ✨ DONE! ✨

If all 3 queries return expected rows:
- ✅ PHASE 1 is COMPLETE
- ✅ You're ready for PHASE 2
- ✅ The system now auto-creates AR when appointments are attended

---

## 🤔 NEED MORE HELP?

| Question | Answer |
|----------|--------|
| What files did I get? | See `PHASE_1_DELIVERABLES.md` |
| How do I execute step-by-step? | See `PHASE_1_GUIA_PASSO_A_PASSO.md` |
| What was built and why? | See `PHASE_1_SUMARIO_EXECUTIVO.md` |
| I want a checklist to track | See `PHASE_1_PROGRESS_TRACKER.md` |
| I want a reference during execution | See `PHASE_1_QUICK_REFERENCE.md` |
| I want to print a cheatsheet | See `PHASE_1_PRINTABLE_CHEATSHEET.md` |
| I want to navigate all docs | See `PHASE_1_INDEX.md` |
| Something went wrong | See "Troubleshooting" in `PHASE_1_GUIA_PASSO_A_PASSO.md` |

---

## 🎯 NEXT (After validation ✅)

Once all 3 validation queries pass:

1. ✅ Mark this as complete
2. → Start **PHASE 2: API Functions** (2-3 hours)
   - File: `src/lib/appointmentFinancialIntegrationApi.js`
   - Task: Write 5 functions that call the triggers

---

**Ready? Go to https://app.supabase.com and execute STEP 1! 🚀**

(This whole process takes 30 minutes max.)
