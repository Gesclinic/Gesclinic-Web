# 🎯 PHASE 1 — VISUAL SUMMARY (Print this!)

```
╔═══════════════════════════════════════════════════════════════╗
║          PHASE 1: SQL TRIGGERS & RPCs FOR AUTO-AR            ║
║                      QUICK START                              ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 📋 THE 5-MINUTE PLAN

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: PRE-CHECK (2 min)                                  │
├─────────────────────────────────────────────────────────────┤
│  ☐ Backup database (Supabase → Settings → Backups)          │
│  ☐ Access Supabase SQL Editor                               │
│  ☐ File ready: 2026-04-11_phase1_*appointment*.sql          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  STEP 2: EXECUTE (3 min)                                    │
├─────────────────────────────────────────────────────────────┤
│  1. Copy SQL file (Ctrl+A, Ctrl+C)                          │
│  2. Paste in Supabase (Ctrl+V)                              │
│  3. Click RUN button                                         │
│  4. Wait for completion (~10 sec)                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  STEP 3: VALIDATE (5 min)                                   │
├─────────────────────────────────────────────────────────────┤
│  Query 1: SELECT proname FROM pg_proc WHERE...             │
│           → Expected: 4 rows ✅                             │
│                                                              │
│  Query 2: SELECT trigger_name FROM information_schema...   │
│           → Expected: 3 rows ✅                             │
│                                                              │
│  Query 3: SELECT indexname FROM pg_indexes...              │
│           → Expected: ≥6 rows ✅                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  DONE! ✅                                                    │
│  PHASE 1 is complete. Ready for PHASE 2.                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 WHAT HAPPENS NOW

```
BEFORE (Old Flow):
  Appointment marked "attended"
           ↓
  ❌ Nothing happens automatically
     AR not created
     Guide not created
     Repasse not calculated

AFTER (PHASE 1 Flow):
  Appointment marked "attended"
           ↓
        Trigger!
           ↓
  ✅ AR created (appointmentId linked)
  ✅ Guide TISS created (if convênio)
  ✅ Repasse calculated (precedência rule)
  ✅ Financeiro dashboard updated
  ✅ Faturamento dashboard updated
  ✅ Repasse dashboard updated
```

---

## 📍 FILES YOU NEED TODAY

```
SQL FILE TO EXECUTE:
  📄 supabase/migrations/2026-04-11_phase1_appointment_financial_integration.sql
     └─ 200 lines, 4 functions, 3 triggers, 6 indexes

DOCS TO READ (Choose ONE):
  ⭐ PHASE_1_QUICK_REFERENCE.md (5 min) ← START HERE
  📄 PHASE_1_GUIA_PASSO_A_PASSO.md (detailed, 15 min)
  📄 PHASE_1_SUMARIO_EXECUTIVO.md (concepts, 10 min)
  📄 PHASE_1_PROGRESS_TRACKER.md (checklist)
  📄 PHASE_1_INDEX.md (navigation)
```

---

## ✅ VALIDATION QUERIES (Copy & Paste)

**Query 1 — Functions:**
```sql
SELECT proname FROM pg_proc WHERE proname IN (
  'create_ar_receivable_from_appointment',
  'create_tiss_guide_from_appointment',
  'cancel_ar_receivable_from_appointment',
  'calculate_repasse_per_appointment') ORDER BY proname;
```
Expected: **4 rows** ✅

---

**Query 2 — Triggers:**
```sql
SELECT trigger_name FROM information_schema.triggers WHERE trigger_name IN (
  'trg_create_ar_on_appointment_attended',
  'trg_create_tiss_guide_on_appointment_attended',
  'trg_cancel_ar_on_appointment_canceled') ORDER BY trigger_name;
```
Expected: **3 rows** ✅

---

**Query 3 — Indexes:**
```sql
SELECT indexname FROM pg_indexes WHERE 
  indexname LIKE 'idx%appointment%' OR indexname LIKE 'idx%repasse%' OR
  indexname LIKE 'idx%ar_receivables%' OR indexname LIKE 'idx%billing%'
ORDER BY indexname;
```
Expected: **≥6 rows** ✅

---

## 🚨 IF SOMETHING FAILS

| Problem | Fix |
|---------|-----|
| Permission denied | Use SUPERUSER role |
| Function not created | Check for syntax errors in SQL |
| Trigger not firing | Verify RLS policies not blocking |
| Index not created | Normal if already exists |

**Rollback everything:**
```sql
DROP TRIGGER IF EXISTS trg_create_ar_on_appointment_attended ON appointments;
DROP TRIGGER IF EXISTS trg_create_tiss_guide_on_appointment_attended ON appointments;
DROP TRIGGER IF EXISTS trg_cancel_ar_on_appointment_canceled ON appointments;
DROP FUNCTION IF EXISTS create_ar_receivable_from_appointment();
DROP FUNCTION IF EXISTS create_tiss_guide_from_appointment();
DROP FUNCTION IF EXISTS cancel_ar_receivable_from_appointment();
DROP FUNCTION IF EXISTS calculate_repasse_per_appointment(UUID, UUID, UUID);
```

---

## ⏱️ TIMELINE

```
0:00 — You are here 👈
0:05 — Read docs (choose quick ref or full guide)
0:10 — Backup database
0:15 — Copy & execute SQL
0:18 — Run validation queries
0:25 — All validations pass ✅
0:30 — PHASE 1 COMPLETE 🎉
```

---

## 🎯 SUCCESS = ALL 3 QUERIES RETURN DATA

```
If ALL 3 queries return expected rows:
  ✅ PHASE 1 = SUCCESS

Otherwise:
  ❌ Check troubleshooting section
  ❌ Verify backup is recent and available
  ❌ Try rollback if needed
```

---

## 📚 MORE HELP

**I need step-by-step guide:**  
→ Read: PHASE_1_GUIA_PASSO_A_PASSO.md

**I want to understand the concepts:**  
→ Read: PHASE_1_SUMARIO_EXECUTIVO.md  

**I need a navigation map:**  
→ Read: PHASE_1_INDEX.md

**I want quick reference only:**  
→ Read: PHASE_1_QUICK_REFERENCE.md 👈 **Best for execution**

---

## 🚀 YOU'RE READY!

```
✅ SQL file created
✅ Docs written
✅ Validation queries ready
✅ Backup procedure known
✅ Troubleshooting guide available

NEXT ACTION: Go to https://app.supabase.com and execute SQL!
```

---

**Print this page and keep it visible while executing PHASE 1 ✨**
