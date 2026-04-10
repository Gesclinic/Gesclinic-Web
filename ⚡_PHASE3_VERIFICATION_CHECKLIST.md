# ✅ 3-POINT VERIFICATION CHECKLIST — Before PHASE 4

**Status:** Ready for QA Verification  
**Date:** April 11, 2026  
**Objective:** Validate PHASE 1-3 before proceeding to PHASE 4 (D ashboard Reports + E2E Testing)

---

## 🎯 Point 1: Database Triggers & Functions Verification

**Objective:** Verify PHASE 1 SQL executed successfully and all database objects exist

**Verification Steps:**

### Step 1.1: Check Functions Created
```sql
-- Run this query in Supabase SQL Editor:
SELECT 
  routine_name,
  routine_type,
  created
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_name LIKE 'create_%' 
       OR routine_name LIKE 'cancel_%'
       OR routine_name LIKE 'calculate_%')
ORDER BY created DESC;
```

**Expected Results:**
- ✅ `create_ar_receivable_from_appointment` (FUNCTION)
- ✅ `create_tiss_guide_from_appointment` (FUNCTION)
- ✅ `cancel_ar_receivable_from_appointment` (FUNCTION)

### Step 1.2: Check Triggers Created
```sql
-- Run this query:
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'appointments'
ORDER BY trigger_name;
```

**Expected Results:**
- ✅ `trg_create_ar_on_appointment_attended`
- ✅ `trg_create_tiss_guide_on_appointment_attended`
- ✅ `trg_cancel_ar_on_appointment_canceled`

### Step 1.3: Check Indexes Created
```sql
-- Run this query:
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND (indexname LIKE 'idx_%appointment%'
       OR indexname LIKE 'idx_%repasse%'
       OR indexname LIKE 'idx_%billing%')
ORDER BY indexname;
```

**Expected Results:**
- ✅ `idx_ar_receivables_appointment_clinic`
- ✅ `idx_billing_guides_appointment_clinic`
- ✅ `idx_appointments_status_clinic`
- ✅ `idx_repasse_config_servico_active`

### Step 1.4: Verify Repasse Config Tables
```sql
-- Check repasse_config_servico table
SELECT COUNT(*) as count
FROM repasse_config_servico;

-- Should return at least 1 (from migration)
```

**Expected Results:**
- ✅ Table exists with 0+ rows
- ✅ Columns: clinic_id, professional_id, service_id, percentual, ativo, ...

---

## 🎯 Point 2: API Integration Testing

**Objective:** Verify PHASE 2 API functions work correctly with database

**Verification Steps:**

### Step 2.1: Test finalizeAppointmentWithFinancials()

**File:** [src/lib/appointmentFinancialIntegrationApi.js](src/lib/appointmentFinancialIntegrationApi.js)

**Code to Run in Browser Console** (when on Agenda page with appointment):
```javascript
import { finalizeAppointmentWithFinancials } from '@/lib/appointmentFinancialIntegrationApi';

// Replace with real appointment ID and clinic ID
const result = await finalizeAppointmentWithFinancials(
  '550e8400-e29b-41d4-a716-446655440000',  // appointment_id
  '550e8400-e29b-41d4-a716-446655440111'   // clinic_id
);

console.log('Result:', result);
```

**Expected Success Result:**
```javascript
{
  success: true,
  appointment: {...},
  ar: {
    id: '...',
    status: 'open',
    valor: 100.00,
    ...
  },
  guide: {
    id: '...',
    guide_number: 'GUIA-...-...',
    status: 'draft',
    ...
  } || null  // null if particular (no payer_id)
}
```

### Step 2.2: Test getARFromAppointment()

**Code:**
```javascript
const ar = await getARFromAppointment(appointmentId, clinicId);
console.log('AR:', ar);
// Should return AR object or null
```

**Expected Result:**
```javascript
{
  id: '...',
  clinic_id: '...',
  appointment_id: '...',
  payer_name: 'PARTICULAR' | 'Insurance Name',
  valor: 100.00,
  status: 'open' | 'canceled' | 'received',
  origem: 'agenda',
  created_at: '2026-04-11T...'
}
```

### Step 2.3: Test validateFinancialIntegration()

**Code:**
```javascript
const status = await validateFinancialIntegration(appointmentId, clinicId);
console.log('Status:', status);
```

**Expected Result:**
```javascript
{
  appointment: {...},
  ar: {...} || null,
  guide: {...} || null,
  status: 'complete_with_guide' | 'complete_particular' | 'attended_no_financial' | 'pending'
}
```

---

## 🎯 Point 3: UI Integration Testing

**Objective:** Verify PHASE 3 UI components work end-to-end

### Step 3.1: StatusSelector Integration (Agenda)

**Location:** [src/components/clinica/agenda/StatusSelector.jsx](src/components/clinica/agenda/StatusSelector.jsx)

**Manual Test:**
1. Open Agenda module
2. Find any appointment (or create test one)
3. Click status dropdown → Select **"Atendido"**
4. ✅ **Expected:** 
   - Green badge appears: **"✅ AR + Guia"** (convênio) or **"✅ AR"** (particular)
   - No error message in console
   - Financial processing happens in 1-2 seconds

**Verification:**
- Check browser console: Should see log "✅ Financial integration completed"
- Go to Financeiro > Contas a Receber and search for new AR
- Verify AR has: appointment_id matching, status='open', valor > 0

### Step 3.2: ContasReceber Dashboard (FinancialIntegrationStatus)

**Location:** [src/pages/clinica/financeiro/ContasReceber.jsx](src/pages/clinica/financeiro/ContasReceber.jsx)

**Manual Test:**
1. Mark 3+ appointments as "Atendido" in Agenda
2. Open Financeiro > Contas a Receber
3. ✅ **Expected:**
   - New "Status de Integração Financeira" panel appears at top
   - Shows: "3 Atendimentos", "3 ✓ AR Criada", completion % updates
   - List shows all 3 appointments with badges
   - Completion percentage = 100% (if all have AR)

**Verification:**
- Count of appointments matches
- All have ✅ badge (AR created)
- Guide badges appear for convênio appointments only
- No errors in console

### Step 3.3: Financial Status Validation

**Test Scenario A: Particular Appointment**
- Create appointment with payer_id = NULL
- Mark as "Atendido"
- Check Financeiro > Contas a Receber
- ✅ Should see: "✅ AR" (no guide badge)

**Test Scenario B: Convênio Appointment**
- Create appointment with payer_id = [Insurance ID]
- Mark as "Atendido"
- Check Financeiro > Contas a Receber
- ✅ Should see: "✅ AR + Guia"
- Verify guide created in Faturamento > Guias

**Test Scenario C: Canceled Appointment**
- Create and finalize appointment as "Atendido"
- Mark same appointment as "Cancelado"
- Verify in database: AR status = 'canceled'
- ✅ Dashboard should show "Cancelado" status

---

## 📋 Test Data Requirements

**To pass verification, you need:**

1. **At least 2 appointments today:**
   - 1 Particular (no payer_id): Should create AR only
   - 1 Convênio (with payer_id): Should create AR + Guide

2. **Clinic configuration:**
   - At least 1 active professional
   - At least 1 health insurance in health_insurances table
   - Clinic ID must match all records

3. **Database state:**
   - ar_receivables table must be empty or have old records
   - billing_guides table must be empty or have old records

---

## ✅ Verification Checklist

Print this and check off as you complete:

```
POINT 1: Database Objects
  □ create_ar_receivable_from_appointment function EXISTS
  □ create_tiss_guide_from_appointment function EXISTS
  □ cancel_ar_receivable_from_appointment function EXISTS
  □ trg_create_ar_on_appointment_attended trigger EXISTS
  □ trg_create_tiss_guide_on_appointment_attended trigger EXISTS
  □ trg_cancel_ar_on_appointment_canceled trigger EXISTS
  □ 5 indexes created (ar_receivables, billing_guides, appointments, repasse_config_servico)

POINT 2: API Functions
  □ finalizeAppointmentWithFinancials() returns success: true
  □ AR object created with correct fields
  □ Guide object created (for convênio) or null (for particular)
  □ getARFromAppointment() retrieves AR successfully
  □ validateFinancialIntegration() returns correct status enum

POINT 3: UI Integration
  □ StatusSelector shows green badge on mark "Atendido"
  □ FinancialIntegrationStatus component visible in ContasReceber
  □ Dashboard shows correct appointment count
  □ Completion percentage updates correctly
  □ AR/Guide badges match actual database records
  □ Canceled appointments show proper status
  □ No console errors during workflow
```

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Functions don't exist | Re-run PHASE 1 SQL in Supabase |
| Triggers don't fire | Check appointment.status column = 'attended' (exact match) |
| AR not created | Check ar_receivables RLS policies, verify clinic_id matches |
| Guide not created | Check payer_id is NOT NULL, verify billing_guides table exists |
| UI badge shows error | Check browser console, verify API returns error-free response |
| Dashboard shows 0 appointments | Check appointments are TODAY (not past/future date) |

---

## 📊 Expected Test Results Summary

**After completing all 3 verification points, you should have:**

✅ Database: 3 functions, 3 triggers, 5 indexes all working  
✅ API: All 8 wrapper functions callable and returning correct shapes  
✅ UI: Visual feedback working, dashboard showing live status, no errors  

**If ALL checks pass → PROCEED TO PHASE 4**  
**If ANY check fails → Debug that section (refer back to PHASE 1-3 docs)**

---

## 📞 Next Steps After Verification

Once verified, proceed to:

### PHASE 4A: Dashboard Reports
- Create "Financial Integration Report" page
- Show: AR creation%, Guide creation%, Daily reconciliation
- Add filtering, export PDF/CSV

### PHASE 4B: E2E Testing
- Batch operations: Finalize 10+ appointments
- Performance tests: Verify no slowdown with 100+ ARs
- Real-world scenario testing

### PHASE 4C: Deployment
- Tag changes in git
- Document for production deployment
- Create user training documentation

---

**Verification Checklist Created:** April 11, 2026  
**Status:** Ready for QA  
**Estimated Verification Time:** 20-30 minutes
