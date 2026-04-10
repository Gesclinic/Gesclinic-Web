# ⚡ PHASE 2: API Integration Layer - Implementation Complete

**Status:** ✅ COMPLETE  
**Date:** April 11, 2026  
**Location:** `src/lib/appointmentFinancialIntegrationApi.js`

---

## 📋 What's Included

**8 Export Functions** (Ready to use):

1. **`finalizeAppointmentWithFinancials(appointmentId, clinicId)`** ⭐
   - Mark appointment as "attended"
   - Auto-triggers PHASE 1 functions (AR + TISS guide creation)
   - Returns: appointment, ar, guide objects + success status
   - **Use case:** Called when checking out appointment in Agenda module

2. **`getARFromAppointment(appointmentId, clinicId)`**
   - Fetch auto-created AR receivable record
   - Returns: AR object or null
   - **Use case:** Verify AR was created, display in Financeiro dashboard

3. **`getTISSGuideFromAppointment(appointmentId, clinicId)`**
   - Fetch auto-created TISS billing guide
   - Returns: Guide object or null
   - **Use case:** Display guide number in Faturamento module

4. **`cancelAppointmentFinancials(appointmentId, clinicId)`**
   - Cancel appointment → soft-deletes AR via PHASE 1 trigger
   - Returns: success status + AR final status
   - **Use case:** Called when appointment marked as "canceled"

5. **`validateFinancialIntegration(appointmentId, clinicId)`**
   - Check complete financial status of one appointment
   - Returns: appointment, ar, guide objects + aggregated status
   - **Status types:** pending, complete_with_guide, complete_particular, partial_no_ar_guide, canceled, error
   - **Use case:** Dashboard quick-check panel

6. **`listAppointmentsWithFinancialStatus(clinicId, startDate, endDate)`**
   - Get appointments within date range with enriched financial status
   - Returns: Array of appointments with financial_status field
   - **Use case:** Agenda/Dashboard table view

7. **`bulkValidateFinancialIntegration(clinicId, appointmentIds)`**
   - Validate multiple appointments at once
   - Returns: Array of {appointment_id, financial_status, has_ar, has_guide, ...}
   - **Use case:** Batch reports, daily reconciliation

8. **Helper: `deriveFinancialStatus(appointment)`** (internal)
   - Determines financial status from appointment + related records
   - Returns: string (complete_with_guide | complete_particular | partial_missing_guide | attended_no_financial | canceled | pending)

---

## 🔌 Integration Examples

### Example 1: Finalize Appointment (Agenda Module - Checkout)
```javascript
import { finalizeAppointmentWithFinancials } from '@/lib/appointmentFinancialIntegrationApi';

// In AgendaPage or appointment detail view:
const handleCompleteAppointment = async () => {
  const result = await finalizeAppointmentWithFinancials(appointmentId, clinicId);
  
  if (result.success) {
    console.log('✅ Appointment finalized');
    console.log('AR created:', result.ar?.id);
    console.log('Guide created:', result.guide?.guide_number);
    // Refresh appointment list or navigate to financeiro module
  } else {
    console.error('❌ Failed:', result.error);
  }
};
```

### Example 2: Validate Financial Status (Dashboard)
```javascript
import { validateFinancialIntegration } from '@/lib/appointmentFinancialIntegrationApi';

// In FinanceiroPage dashboard:
const checkStatus = async (appointmentId) => {
  const result = await validateFinancialIntegration(appointmentId, clinicId);
  
  if (result.status === 'complete_with_guide') {
    // Show AR + Guide as complete ✅
  } else if (result.status === 'complete_particular') {
    // Show AR only (particular patient) 
  } else if (result.status === 'attended_no_financial') {
    // Warn: AR not created
  }
};
```

### Example 3: List with Financial Status (Agenda Table)
```javascript
import { listAppointmentsWithFinancialStatus } from '@/lib/appointmentFinancialIntegrationApi';

// In AgendaPage:
const appointments = await listAppointmentsWithFinancialStatus(
  clinicId, 
  '2026-04-01', 
  '2026-04-30'
);

// Render table with financial_status column:
// appointment.financial_status = 'complete_with_guide' | 'complete_particular' | ...
```

### Example 4: Cancel Appointment (Agenda)
```javascript
import { cancelAppointmentFinancials } from '@/lib/appointmentFinancialIntegrationApi';

const handleCancelAppointment = async () => {
  const result = await cancelAppointmentFinancials(appointmentId, clinicId);
  
  if (result.success) {
    console.log('Appointment canceled');
    console.log('AR soft-deleted with status:', result.arStatus); // should be 'canceled'
  }
};
```

---

## 🔄 Data Flow (PHASE 1 → PHASE 2)

```
┌─────────────────────────────────────────────────────────┐
│  Agenda Module: Mark Appointment "Attended"             │
│  → Calls: finalizeAppointmentWithFinancials()           │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Database (PHASE 1 Triggers Fire):                      │
│  1. UPDATE appointments SET status='attended'           │
│  2. Trigger: create_ar_receivable_from_appointment()    │
│     → INSERT ar_receivables                             │
│  3. Trigger: create_tiss_guide_from_appointment()       │
│     → INSERT billing_guides (if convênio)               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 2 API: Fetch Created Records                     │
│  1. getARFromAppointment() → AR object                  │
│  2. getTISSGuideFromAppointment() → Guide object        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Frontend: Display Results                              │
│  - Show AR ID + status                                  │
│  - Show Guide number                                    │
│  - Update dashboard/financeiro views                    │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Quality Checklist

- ✅ All 8 functions use correct Supabase client (`customSupabaseClient`)
- ✅ Error handling on all API calls
- ✅ Idempotency: Safe to call multiple times
- ✅ Proper await/async patterns
- ✅ Null-safe queries with `.maybeSingle()` where needed
- ✅ Financial status derivation logic matches business rules
- ✅ Portuguese naming convention consistent with DB schema
- ✅ JSDoc comments on all exports

---

## 🔧 Next Steps (PHASE 3)

1. **Update Agenda UI** to call `finalizeAppointmentWithFinancials()` on checkout
2. **Update Financeiro Dashboard** to show financial status icons/badges
3. **Add financial status column** to appointment tables
4. **Create validation report page** in Financeiro showing integration status
5. **Add bulk operations** for batch finalization

---

## 🐛 Testing PHASE 2

**Manual Test Workflow:**

1. Create test appointment (particular)
2. Call `finalizeAppointmentWithFinancials(appId, clinicId)`
3. Verify AR created: `getARFromAppointment(appId, clinicId)` returns AR ✅
4. Create test appointment (convênio with payer_id)
5. Call `finalizeAppointmentWithFinancials(appId, clinicId)`
6. Verify both AR + Guide created ✅
7. Call `validateFinancialIntegration(appId, clinicId)` → should return "complete_with_guide"
8. Cancel appointment: `cancelAppointmentFinancials(appId, clinicId)`
9. Verify AR status = 'canceled' ✅

---

## 📝 Notes

- **Trigger Timing:** Triggers fire **immediately after** UPDATE, so AR/Guide should be readable within 100-200ms
- **Idempotency:** Functions check if AR/Guide already exist before inserting (ensures safe replay)
- **Error Graceful:** If AR creation fails silently (table permissions), function still returns appointment marked as "attended" with null AR/guide
- **Guide Number Format:** "GUIA-{clinic_id}-{YYYYMMDD}-{appointment_id}" (auto-generated by trigger)
- **Status Values:** AR uses 'open'/'canceled'/'received', Guide uses 'draft'

---

**✅ PHASE 2 READY FOR INTEGRATION**

Proceed to PHASE 3 when ready to integrate with UI modules (Agenda, Financeiro, Faturamento).
