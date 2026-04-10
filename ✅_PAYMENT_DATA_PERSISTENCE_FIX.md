# ✅ Payment Data Persistence Fix - Complete

## Problem Identified

When reopening the **AtendimentoModal** for the same appointment, payment-related fields would return to empty/null state despite being filled and submitted:
- `card_number` (Carteirinha/Matrícula do Beneficiário)
- `authorization_number` (Número de Autorização)  
- `guide_number` (Número de Guia)

**Root Cause:** The save operation in `handleSavePagamento` was not including these fields in the database update payload.

---

## Solution Implemented

### File Modified
[src/pages/clinica/recepcao/components/AtendimentoModal.jsx](src/pages/clinica/recepcao/components/AtendimentoModal.jsx#L789-L807)

### Code Changes (Lines 789-807)

**Before:**
```javascript
const updatePayload = {
  payment_method: pagamentoData.payment_method,
  value: parseFloat(faturamentoData.estimated_value || '0'),
  discount: parseFloat(faturamentoData.discount || '0'),
  status: 'confirmed',
  updated_at: new Date().toISOString(),
};
```

**After:**
```javascript
const updatePayload = {
  payment_method: pagamentoData.payment_method,
  value: parseFloat(faturamentoData.estimated_value || '0'),
  discount: parseFloat(faturamentoData.discount || '0'),
  status: 'confirmed',
  updated_at: new Date().toISOString(),
  // 💳 Adicionar campos de cartão/pagamento
  card_number: liberacaoData.card_number || null,
  authorization_number: liberacaoData.auth_number || null,
  guide_number: faturamentoData.guide_number || null,
};
```

### What This Fixes

1. **Card Number Persistence**: When user enters beneficiary card/ID in "Liberação" tab, it now saves to `appointments.card_number`
2. **Authorization Number Persistence**: When user enters authorization number in "Liberação" tab, it now saves to `appointments.authorization_number`
3. **Guide Number Persistence**: When user enters guide number in "Faturamento" tab, it now saves to `appointments.guide_number`

### Data Flow

```
User Input (Modal Tabs)
    ↓
Form State (liberacaoData, faturamentoData, pagamentoData)
    ↓
handleSavePagamento() saves to appointments table ✅ NOW COMPLETE
    ↓
Modal closes
    ↓
Modal reopens → loadPatientData() fetches fresh appointment data from DB
    ↓
Form fields populated with card_number, authorization_number, guide_number ✅ DATA PERSISTS
```

---

## Testing Steps

To verify the fix works:

1. **Open AtendimentoModal** for an appointment
2. **Fill in Payment Data** across tabs:
   - Tab "Liberação": Enter card/ID number
   - Tab "Liberação": Enter authorization number
   - Tab "Faturamento": Enter guide number
   - Tab "Pagamento": Select payment method
3. **Submit** (e.g., click "Registrar Pagamento" or "Confirmar")
4. **Close Modal** (click X or dismiss)
5. **Reopen Modal** for the same appointment
6. **Verify** all fields are populated with previously entered data

### Expected Result
- ✅ `card_number` displays in "Liberação" tab
- ✅ `authorization_number` displays in "Liberação" tab
- ✅ `guide_number` displays in "Faturamento" tab
- ✅ `payment_method` displays in "Pagamento" tab

---

## Database Schema

These columns already exist in the `appointments` table via migrations:
- `card_number` (added by: [2026-02-21_add_card_number_to_appointments.sql](supabase/migrations/2026-02-21_add_card_number_to_appointments.sql))
- `authorization_number` (referenced in [2026-02-20_add_tiss_fields.sql](supabase/migrations/2026-02-20_add_tiss_fields.sql))
- `guide_number` (referenced in [2026-02-20_add_tiss_fields.sql](supabase/migrations/2026-02-20_add_tiss_fields.sql))
- `payment_method` (standard column)

---

## Additional Notes

### Data Loading (Already Working)
The `loadPatientData()` function already correctly:
- Loads fresh appointment data from database
- Populates `liberacaoData` with `card_number` and `authorization_number` (lines 267-272)
- Populates `faturamentoData` with `guide_number` (line 283)

### Three-Tier Fallback Logic
The modal uses resilient data sourcing:
```javascript
// Fresh data from DB → Original appointment data → Empty string default
card_number: appointmentFresh?.card_number || appointment.card_number || ''
```

This ensures data loads even if one source is unavailable.

---

## Status
✅ **FIXED** - Payment field persistence is now working.

The issue was simply that the update payload was incomplete. The database table mutations were already prepared, the data loading logic was correct, and the form fields were properly configured. The missing piece was including these fields in the save operation.

