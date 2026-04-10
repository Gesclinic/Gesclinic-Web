# 🔍 CONFIGURATION PAGES & INTEGRATION AUDIT
**Gesclinic Web | April 9, 2026**  
**Scope:** Configuration pages, module integration flows, FK relationships  
**Finding:** 11 Critical/Medium gaps blocking complete ERP automation

---

## 📊 EXECUTIVE SUMMARY

| Category | Finding | Impact |
|----------|---------|--------|
| **Config Pages** | 4 working, 2 structured, 2 placeholders, 3 unknown | ⚠️ 50% completion |
| **Integration Flows** | 0 fully automated, 11 manual-only | 🔴 No end-to-end automations |
| **FK Relationships** | 12 enforced, 8 weak/missing | 🔴 Data integrity at risk |
| **Automation APIs** | 20+ functions exist, 0% auto-triggered | 🔴 All manual workflows |
| **Critical Gaps** | 5 high-priority, 4 medium-priority | 🔴 Blocks ERP closure |

---

---

# 1️⃣ CONFIGURATION PAGES AUDIT

## A. Full Inventory (14 Pages)

```
src/pages/clinica/configuracoes/
├── GeraisConfig.jsx          [✅ STRUCTURE] Clinic data, Personalization, Parameters, API (4 tabs)
├── AgendaConfig.jsx          [✅ STRUCTURE] 8-tab scheduling hub (empty forms)
├── FaturamentoConfig.jsx     [⚠️ PLACEHOLDER] TISS params, manual billing (card UI only)
├── EstoqueConfig.jsx         [⚠️ PLACEHOLDER] Min/Max, auto movements (card UI only)
├── ContaConfig.jsx           [✅ HUB] 4-tab financial (3 working, 1 stub)
│   ├─ PlanoDeContas.jsx      [✅ WORKING] Full CRUD chart of accounts
│   ├─ BankAccountsManager.jsx [✅ WORKING] Bank account management
│   └─ RepassesRulesManager.jsx [✅ WORKING] Professional repasse rules
├── IntegracoesConfig.jsx     [⚠️ STUBS] Google, WhatsApp, SMTP, Payment (descriptions only)
├── AdminConfig.jsx           [❌ UNKNOWN]
├── DocumentosConfig.jsx      [❌ UNKNOWN]
├── PerfisUsuarioConfig.jsx   [❌ UNKNOWN]
├── PermissoesConfig.jsx      [❌ UNKNOWN]
└── ConfiguracoesLayout.jsx   [🔀 ROUTER] Hub layout
```

## B. Implementation Status by Module

### ✅ FULLY WORKING (4 pages)
| Module | File | Functions | Status |
|--------|------|-----------|--------|
| Chart of Accounts | PlanoDeContas.jsx | listAccounts, createAccount, updateAccount, deleteAccount | ✅ Full CRUD |
| Bank Accounts | BankAccountsManager.jsx | listFinanceAccounts, createFinanceAccount, updateFinanceAccount, deleteFinanceAccount | ✅ Full CRUD |
| Repasse Rules | RepassesRulesManager.jsx | Complex calculation engine (SIMPLES, PRESUMIDO, LUCRO REAL) | ✅ Full UI + Logic |
| Account Config (Hub) | ContaConfig.jsx | Route-based tab switching, 3-in-1 module | ✅ Navigation |

### ✅ STRUCTURE DEFINED (2 pages - Need Form Implementation)
| Module | File | Tabs | Forms? | Status |
|--------|------|------|--------|--------|
| General Settings | GeraisConfig.jsx | 4 (Dados, Personalização, Parâmetros, Integrações) | ❌ Comments only: `{/* form aqui */}` | 🔴 Blocked |
| Agenda Settings | AgendaConfig.jsx | 8 (Central, Rules, Prof, Services, Groups, Types, Reasons, Notifications) | ❌ Text descriptions only | 🔴 Blocked |

### ⚠️ PLACEHOLDER UI (2 pages - Card Layout Only)
| Module | File | What Exists | What's Missing | Status |
|--------|------|-------------|-----------------|--------|
| Billing Config | FaturamentoConfig.jsx | 2 cards (TISS, Manual Rules) | Forms, APIs, Backend logic | 🟡 Design only |
| Stock Config | EstoqueConfig.jsx | 2 cards (Min/Max, Auto Moves) | Forms, APIs, Backend logic | 🟡 Design only |

### 🟠 INTEGRATION STUBS (1 page - Descriptions Only)
| Module | File | Integrations | Implementation | Status |
|--------|------|--------------|-----------------|--------|
| Integrations | IntegracoesConfig.jsx | Google Calendar, WhatsApp, Email, Payment APIs | 4 cards, no config logic | 🟠 UI placeholder |

### ❌ NOT REVIEWED (3 pages)
- AdminConfig.jsx
- DocumentosConfig.jsx  
- PerfisUsuarioConfig.jsx

---

# 2️⃣ INTEGRATION FLOWS - AUTO VS MANUAL MATRIX

## THE 10 CORE FLOWS

```
FLOW 1: Appointment Creation → Check-in → Payment Capture
┌─────────────────────────────────────────────────┐
│ Step 1: Schedule Appointment                    │ [✅ Manual] createAppointment()
├─────────────────────────────────────────────────┤
│ Step 2: Confirm Appointment                     │ [✅ Manual] updateAppointment(status=confirmed)
├─────────────────────────────────────────────────┤
│ Step 3: Check-in                                │ [✅ Manual] updateAppointment(status=checked_in)
├─────────────────────────────────────────────────┤
│ Step 4: Payment Capture                         │ [❌ MISSING] No auto-trigger, manual entry in financeApi
└─────────────────────────────────────────────────┘
📊 Status: 30% - Check-in UI exists, payment capture not automated


FLOW 2: Appointment Completed → AR Receivable Created
┌─────────────────────────────────────────────────┐
│ Trigger: Appointment.status = 'completed'       │ [❌ NO AUTO-TRIGGER]
├─────────────────────────────────────────────────┤
│ Action: Create AR (origin='Agenda')             │ [✅ Function exists] financeApi.createAR()
├─────────────────────────────────────────────────┤
│ Link: ar_receivables.appointment_id             │ [⚠️ Soft link, no FK]
└─────────────────────────────────────────────────┘
📊 Status: 40% - Function exists but NOT auto-triggered on completion


FLOW 3: Appointment Completed → Billing Guide Created
┌─────────────────────────────────────────────────┐
│ Trigger: Appointment.status = 'completed'       │ [❌ NO AUTO-TRIGGER]
├─────────────────────────────────────────────────┤
│ Action: Generate billing_guides record          │ [⚠️ Partial] Table exists, no create function found
├─────────────────────────────────────────────────┤
│ Link: appointments → billing_guides             │ [🔴 MISSING FK] No appointment_id column in guides!
└─────────────────────────────────────────────────┘
📊 Status: 20% - Table exists, no linkage, no API


FLOW 4: Billing Guide → TISS XML Generated
┌─────────────────────────────────────────────────┐
│ Trigger: billing_guides.status = 'ready'        │ [❌ NO AUTO-TRIGGER]
├─────────────────────────────────────────────────┤
│ Action: Generate XML file                       │ [🔴 NOT FOUND] No XML export in codebase
├─────────────────────────────────────────────────┤
│ Output: xml_path field in billing_guides        │ [⚠️ Column exists, empty]
└─────────────────────────────────────────────────┘
📊 Status: 10% - Column metadata only, no builder


FLOW 5: Monthly Period End → Medical Repasse Generated
┌─────────────────────────────────────────────────┐
│ Trigger: Month end (scheduled?)                 │ [❌ NO SCHEDULER]
├─────────────────────────────────────────────────┤
│ Action: Calculate repasse                       │ [✅ Function exists] calculateMonthlyRepasse()
├─────────────────────────────────────────────────┤
│ Create: repasse_medico records                  │ [✅ Insert logic exists] Medical repasse module
├─────────────────────────────────────────────────┤
│ Manual: Trigger via button/cron?                │ [⚠️ No cron job configured]
└─────────────────────────────────────────────────┘
📊 Status: 60% - Engine ready, no automated scheduler


FLOW 6: Medical Repasse → AP Bill Created
┌─────────────────────────────────────────────────┐
│ Trigger: repasse_medico.status = 'processed'    │ [❌ NO AUTO-TRIGGER]
├─────────────────────────────────────────────────┤
│ Action: Create AP bill                          │ [✅ Partial] financeApi.createAP()
├─────────────────────────────────────────────────┤
│ Link: ap_bills.repasse_id                       │ [✅ FK EXISTS] ON DELETE CASCADE
└─────────────────────────────────────────────────┘
📊 Status: 50% - FK exists, creation is manual


FLOW 7: AP Bill → Bank Transfer Executed
┌─────────────────────────────────────────────────┐
│ Trigger: ap_bills.status = 'approved'           │ [❌ NO AUTO-TRIGGER]
├─────────────────────────────────────────────────┤
│ Action: Execute transfer                        │ [⚠️ Batch only] financeApi.payAccountsPayableBatch()
├─────────────────────────────────────────────────┤
│ Integration: Bank transfer API                  │ [🔴 NOT FOUND] No integration layer
└─────────────────────────────────────────────────┘
📊 Status: 0% - Manual batch processing only


FLOW 8: Appointment Canceled → Reversal of Financial Records
┌─────────────────────────────────────────────────┐
│ Trigger: Appointment.status = 'canceled'        │ [❌ NO AUTO-TRIGGER]
├─────────────────────────────────────────────────┤
│ Action: Reverse AR                              │ [🔴 NO LOGIC FOUND] No cascade reversal
├─────────────────────────────────────────────────┤
│ Action: Reverse AP                              │ [🔴 NO LOGIC FOUND] No linked deletion
├─────────────────────────────────────────────────┤
│ Action: Reverse repasse_medico                  │ [🔴 NO LOGIC FOUND]
└─────────────────────────────────────────────────┘
📊 Status: 10% - Orphaned records risk


FLOW 9: Guide Payment Received → AR Status Updated
┌─────────────────────────────────────────────────┐
│ Trigger: billing_guides payment received        │ [❌ NO AUTO-TRIGGER]
├─────────────────────────────────────────────────┤
│ Link: guides ↔ ar_receivables                   │ [🔴 MISSING FK] No relationship!
├─────────────────────────────────────────────────┤
│ Action: Update AR.status = 'received'           │ [✅ Function] financeApi.updateAR()
├─────────────────────────────────────────────────┤
│ Manual: User finds matching records             │ [🔴 User error risk]
└─────────────────────────────────────────────────┘
📊 Status: 30% - Manual linking required


FLOW 10: Guide Glosa → Repasse Calculation Adjusted
┌─────────────────────────────────────────────────┐
│ Trigger: Glosa applied to guide                 │ [🔴 NO GLOSA TABLE]
├─────────────────────────────────────────────────┤
│ Table: glosa_records                            │ [❌ NOT FOUND] No glosa module
├─────────────────────────────────────────────────┤
│ Recalc: Repasse with glosa deduction            │ [🔴 NO LOGIC] No adjustment API
└─────────────────────────────────────────────────┘
📊 Status: 0% - Module doesn't exist
```

---

## Summary: Integration Automation Status

```
FULLY AUTOMATED (End-to-End):  0 flows ·········· [0%]
PARTIALLY AUTOMATED:           2 flows ·········· [20%] (Repasse calc, AP creation)
MANUAL-TRIGGERED:              8 flows ·········· [80%] (User must initiate each step)
COMPLETELY MISSING:            3 flows ·········· [30%] (XML, Glosa, Transfers)

Average Status: ~31% automated
ERP Readiness: 🔴 LOW - Requires 8/10 manual interventions to close financial cycle
```

---

# 3️⃣ DATABASE FOREIGN KEY RELATIONSHIPS

## A. The Complete FK Map

### ✅ STRONG RELATIONSHIPS (FK Constraints Enforced)

```
┌─────────────────────────────────────────────────────────────┐
│ appointments (id)                                           │
└─────────────────────────────────────────────────────────────┘
    ↓ FK enforced references:
    ├─ → clinics.id (FK enforced)
    ├─ → patients.id (FK enforced)
    ├─ → professionals.id (FK enforced)
    ├─ → services.id (FK enforced)
    ├─ → plans.id (FK enforced) [ADDED: 2026-02-19]
    └─ → health_insurances.id (plan relationship)

    ↑ Incoming FK enforced:
    ├─ ← appointment_notification_logs.appointment_id (ON DELETE CASCADE) ✅
    ├─ ← appointment_audit_logs.appointment_id (ON DELETE CASCADE) ✅
    ├─ ← appointment_financial_audit_logs.appointment_id (ON DELETE CASCADE) ✅
    └─ ← Many soft links (no FK constraints)

┌─────────────────────────────────────────────────────────────┐
│ repasse_medico (id)                                         │
└─────────────────────────────────────────────────────────────┘
    ↓ FK enforced references:
    ├─ → clinics.id (ON DELETE CASCADE) ✅
    └─ → professionals.id (ON DELETE CASCADE) ✅

    ↑ Incoming FK enforced:
    └─ ← ap_bills.repasse_id (ON DELETE CASCADE) ✅

┌─────────────────────────────────────────────────────────────┐
│ medical_repasse_config (id)                                 │
└─────────────────────────────────────────────────────────────┘
    ↓ FK enforced references:
    ├─ → clinics.id (ON DELETE CASCADE) ✅
    └─ → professionals.id (ON DELETE CASCADE) ✅

┌─────────────────────────────────────────────────────────────┐
│ medical_production (id)                                     │
└─────────────────────────────────────────────────────────────┘
    ↓ FK enforced references:
    ├─ → clinics.id (ON DELETE CASCADE) ✅
    └─ → professionals.id (ON DELETE CASCADE) ✅
```

### ⚠️ WEAK/SOFT RELATIONSHIPS (No FK Constraints)

```
┌─────────────────────────────────────────────────────────────┐
│ ar_receivables (id)                   [SOFT LINKS]          │
└─────────────────────────────────────────────────────────────┘
    ↓ References:
    ├─ → clinics.id (FK enforced) ✅
    ├─ → appointment_id (COLUMN EXISTS, NO FK) ⚠️ 
    ├─ → patient_id (COLUMN EXISTS, NO FK) ⚠️
    └─ → paciente_id (alternative column, text field) ⚠️

    ↑ Incoming:
    └─ [NO SOURCE CONFIRMED] (ap_bills doesn't have FK to ar)

    🔴 RISK: Orphaned appointment_id values, cascade deletes won't work

┌─────────────────────────────────────────────────────────────┐
│ billing_guides (id)              [MAJOR GAP]                │
└─────────────────────────────────────────────────────────────┘
    ↓ References:
    ├─ → clinics.id (FK enforced) ✅
    ├─ → numero_carteirinha (patient insurance, TEXT field, no FK) ⚠️
    ├─ → numero_guia (manual/unique, no FK) ⚠️
    └─ → appointment_id (🔴 COLUMN DOESN'T EXIST!) 🔴 CRITICAL GAP

    🔴 RISK: No way to link guide to appointment, can't track which
             services generated which revenue

┌─────────────────────────────────────────────────────────────┐
│ ap_bills (id)                    [WEAK LINK]                │
└─────────────────────────────────────────────────────────────┘
    ↓ References:
    ├─ → repasse_medico.id (FK enforced) ✅
    ├─ → clinic_id → clinics.id (FK enforced) ✅
    ├─ → appointment_id (COLUMN ADDED 2026-04-01, NO FK) ⚠️
    └─ → ar_receivables.id (🔴 NO COLUMN, NO FK) 🔴

    🔴 RISK: Cascade deletes on appointments won't trigger AP deletion

┌─────────────────────────────────────────────────────────────┐
│ invoices (id)                    [WEAK LINK]                │
└─────────────────────────────────────────────────────────────┘
    ↓ References:
    ├─ → clinics.id (FK enforced) ✅
    ├─ → appointment_id (COLUMN ADDED 2026-04-01, NO FK) ⚠️
    └─ → ar_receivables.id (🔴 NO COLUMN, NO FK) 🔴

    🔴 RISK: No relationship to AR or guides, orphaned records
```

### 🔴 MISSING CRITICAL RELATIONSHIPS

| From | To | Should Be | Current | Impact |
|------|----|-----------|---------| -------|
| **appointments** | billing_guides | FK (1-to-many) | ❌ None | Can't know which appointment generated which guide |
| **billing_guides** | ar_receivables | FK (1-to-1) | ❌ None | Can't track guide payment to AR |
| **ar_receivables** | appointments | FK enforced | ⚠️ Soft | Cascade delete broken if appointment canceled |
| **ap_bills** | appointments | FK enforced | ⚠️ Soft | Cascade delete broken if appointment canceled |
| **ap_bills** | ar_receivables | FK (1-to-1) | ❌ None | Can't link expense to income |
| **repasse_medico** | appointments | No direct link | ❌ None | Can't trace which services generated repasse |
| glosa table | (Any) | Should exist | ❌ None | No glosa module at all |

---

## B. FK Status by Migration

```
✅ 20260113_COMPREHENSIVE_INIT.sql
   ├─ appointments core FKs (clinics, patients, professionals, services)
   ├─ ar_receivables.clinic_id → clinics (FK enforced)
   ├─ ar_receivables.appointment_id column created (NO FK constraint)
   ├─ repasse_medico.professional_id → professionals (FK enforced)
   ├─ repasse_medico.clinic_id → clinics (FK enforced)
   └─ ap_bills.repasse_id → repasse_medico (FK enforced)

⚠️ 2026-02-19_add_plan_id_to_appointments.sql
   ├─ appointments.plan_id → plans.id (FK enforced)
   └─ Comment: "Foreign key to plans table"

⚠️ 2026-02-21_create_billing_guides_table.sql
   ├─ billing_guides.clinic_id → clinics (FK enforced)
   └─ 🔴 NO appointment_id field (critical gap)

⚠️ 2026-04-01_add_billing_columns.sql
   ├─ ar_receivables.appointment_id (column added, NO FK)
   ├─ ap_bills.appointment_id (column added, NO FK)
   └─ invoices.appointment_id (column added, NO FK)

✅ 20260318_create_medical_repasse_module.sql
   ├─ medical_repasse_config.professional_id → professionals (FK enforced)
   ├─ medical_repasse_config.clinic_id → clinics (FK enforced)
   ├─ medical_production FKs all enforced
   └─ medical_repasse FKs all enforced
```

---

# 4️⃣ CRITICAL INTEGRATION GAPS

## 🔴 HIGH PRIORITY (Blocks Core ERP Operations)

### Gap #1: No Appointment → Billing Guide Link
```diff
- SQL: ALTER TABLE billing_guides ADD COLUMN appointment_id UUID REFERENCES appointments(id);
- UI: No mechanism to create guide from appointment
- API: No guide creation endpoint

Impact: Billing guide floating in space, no way to know source service
Upstream: Can't validate guide against appointment data
Downstream: Can't track which revenue documents came from which procedures
```

### Gap #2: No Billing Guide → AR Receivable Link  
```diff
- SQL: ALTER TABLE ar_receivables ADD COLUMN guide_id UUID REFERENCES billing_guides(id);
- SQL: ALTER TABLE ar_receivables ADD COLUMN guide_status VARCHAR;
- UI: No linking UI when receiving guide payment
- API: No sync function between guide & AR

Impact: AR receivable created separately, not linked to source guide
Risk: Reconciliation impossible, payment tracking broken
Example: Payment received from guide #1, but AR record shows generic "Agenda" origin
```

### Gap #3: NO Auto-Trigger on Appointment Completion
```diff
- Missing: Supabase function on appointments.after_update trigger
- Missing: Logic to detect status='completed' AND process AR creation
- Missing: Cron job scheduler for daily batch triggers
- Current: User must manually call financeApi.createAR()

Impact: All AR receivables created manually = high error risk
Example: User forgets to create AR for 5 appointments = $15K unrecorded revenue
```

### Gap #4: AP Bills FK Enforcement Incomplete
```diff
- Column exists: ap_bills.appointment_id
- Missing: FOREIGN KEY constraint
- Result: Cascade delete won't work if appointment deleted

Current:
  DELETE FROM appointments WHERE id = 'X'
    → ar_receivables with appointment_id='X' stays orphaned ❌
    → ap_bills with appointment_id='X' stays orphaned ❌

Should be:
  DELETE FROM appointments WHERE id = 'X'
    → ap_bills cascade deleted via repasse_medico ✅
    → ar_receivables cascade deleted via appointment_id FK ✅
```

### Gap #5: No Glosa/Adjustment Module Exists
```
Missing tables:
- glosa_records
- glosa_items
- billing_denials
- adjustment_calculations

Missing logic:
- Identify denied services
- Calculate adjustment to repasse
- Create reversal AP entries
- Track adjustment approval workflow

Current: No way to handle partial billing denials
Example: Guide denied for 30% → No system way to adjust repasse calculation
```

---

## 🟡 MEDIUM PRIORITY (Degrades UX but Not Blocking)

### Gap #6: Check-in Payment Capture Not Automated
**Current Flow (Manual):**
1. User completes check-in
2. User clicks "Record Payment" button
3. User manually selects payment method
4. User enters amount
5. financeApi.recordPayment() called

**Should Be:**
- Appointment.status = 'checked_in' triggers automatic default payment setup
- Payment method pre-populated from default clinic settings
- User reviews and confirms vs. entering manually

### Gap #7: Medical Repasse Not Scheduled
```
Current: calculateMonthlyRepasse() exists but must be called manually
Missing: No cron job scheduler
Missing: No UI "Calculate Repasse" button in dashboard
Missing: No automatic trigger on month-end

Should have:
- Scheduled job: Daily at 2am on last day of month
- Alternative: Manual trigger button with confirmation dialog
- Send notification: "Repasse for March calculated: $X.XX for Y professionals"
```

### Gap #8: No Bank Transfer Automation
```
Current: payAccountsPayableBatch() handles DB state change only
Missing: Actual bank transfer execution
Missing: Integration with banking APIs (Stripe, Wise, etc.)
Missing: Transfer receipt logging

Current flow:
  ap_bills.status = 'paid' ← User clicks button manually
  → payAccountsPayableBatch() called
  → ap_bills.payment_date set
  → Money transfer: USER MUST INITIATE MANUALLY (!)

Ideal flow:
  ap_bills.status = 'approved'
  → Automatic account debit scheduling
  → Bank transfer executed
  → Receipt logged in ap_bills.payment_receipt
  → Notification sent to professional
```

### Gap #9: Appointment Cancellation Has No Reversal Logic
```
Current:
  User deletes appointment
  → appointment.status = 'canceled'
  → ar_receivables.appointment_id orphaned (no FK delete)
  → ap_bills.appointment_id orphaned (no FK delete)
  → Financial trail broken

Should trigger cascade:
  1. Delete ar_receivables linked to appointment
  2. Delete ap_bills linked via cascade
  3. Reverse any repasse_medico entries
  4. Create offsetting journal entries
  5. Audit log the reversal
```

---

## 🟠 LOW PRIORITY (Missing Features, Not Blocking)

### Gap #10: TISS XML Export Not Found
```
Missing in codebase:
- tiss-xml-generator.js
- guide-to-xml conversion logic
- XML schema validation
- TISS transmission API integration

Column exists: billing_guides.xml_path
But: Never populated, no export feature
```

### Gap #11: Integration Config Not Implemented
```
IntegracoesConfig.jsx shows 4 placeholders:
- Google Calendar sync
- WhatsApp API
- Email SMTP
- Payment API

Current: Dev stubs, no underlying configuration or API calls

Would require:
- Each integration as separate module
- Credential encryption & storage
- Test/verify buttons
- Sync scheduling/logs
```

---

# 5️⃣ REMEDIATION ROADMAP

## PHASE 1: IMMEDIATE (Block Orphaned Records) - Week 1

```sql
-- Add missing FKs
ALTER TABLE ar_receivables 
  ADD CONSTRAINT fk_ar_appointments FOREIGN KEY (appointment_id) 
  REFERENCES appointments(id) ON DELETE CASCADE;

ALTER TABLE ap_bills 
  ADD CONSTRAINT fk_ap_appointments FOREIGN KEY (appointment_id) 
  REFERENCES appointments(id) ON DELETE CASCADE;

ALTER TABLE ap_bills 
  ADD CONSTRAINT fk_ap_ar FOREIGN KEY (ar_id) 
  REFERENCES ar_receivables(id) ON DELETE SET NULL;

-- Add missing columns
ALTER TABLE billing_guides ADD COLUMN appointment_id UUID;
ALTER TABLE billing_guides ADD CONSTRAINT fk_guides_appointments 
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;

ALTER TABLE ar_receivables ADD COLUMN guide_id UUID;
ALTER TABLE ar_receivables ADD CONSTRAINT fk_ar_guides 
  FOREIGN KEY (guide_id) REFERENCES billing_guides(id) ON DELETE SET NULL;
```

## PHASE 2: AUTOMATION (Auto-Triggers) - Week 2

```javascript
// appointmentFinancialIntegrationApi.js
// Create Supabase trigger: on appointments UPDATE after status='completed'
  → Call financeApi.createAR()
  → Call billingGuideApi.createGuide()
  → Log to appointment_financial_audit_logs
```

## PHASE 3: CONFIGURATION (UI Implementation) - Week 3
- [ ] Complete GeraisConfig forms
- [ ] Complete AgendaConfig forms
- [ ] Implement FaturamentoConfig logic
- [ ] Implement EstoqueConfig logic
- [ ] Build Integrations module

## PHASE 4: ADVANCED (Automation & Closing) - Week 4-6
- [ ] Add glosa module
- [ ] Implement appointment cancellation reversal logic
- [ ] Schedule repasse calculation cron
- [ ] Add bank transfer automation
- [ ] Build TISS XML generator

---

# 📋 DETAILED FINDINGS TABLE

| # | Issue | Tables | Severity | Fix Time | Blocked By |
|---|-------|--------|----------|----------|-----------|
| 1 | No appointment → guide link | billing_guides | 🔴 High | 30min | Schema change |
| 2 | No guide → ar link | ar_receivables | 🔴 High | 30min | Schema change |
| 3 | No appointment completion trigger | (Function) | 🔴 High | 2hrs | Logic + testing |
| 4 | AP bills FK missing | ap_bills | 🔴 High | 15min | Schema change |
| 5 | No glosa module | (New) | 🔴 High | 8hrs | Full module build |
| 6 | Check-in payment not auto | (UI) | 🟡 Medium | 3hrs | API + UI |
| 7 | Repasse not scheduled | (Cron) | 🟡 Medium | 2hrs | Job scheduler setup |
| 8 | No bank transfer automation | (API) | 🟡 Medium | 4hrs | Bank API integration |
| 9 | No cancellation reversal | (Trigger) | 🟡 Medium | 3hrs | Logic + testing |
| 10 | TISS XML export missing | (New) | 🟠 Low | 6hrs | XML builder + schema |
| 11 | Integration config incomplete | (UI) | 🟠 Low | 8hrs | Each integration |

---

# 📊 AUTOMATION STATUS DASHBOARD

```
┌──────────────────────────────────────────────────────────┐
│ INTEGRATION FLOW AUTOMATION STATUS                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Flow 1  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 30% Manual  │
│  Flow 2  ████░░░░░░░░░░░░░░░░░░░░░░░░░░ 40% Manual    │
│  Flow 3  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 20% Manual   │
│  Flow 4  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 10% Manual   │
│  Flow 5  ██████░░░░░░░░░░░░░░░░░░░░░░░░ 60% Manual    │
│  Flow 6  █████░░░░░░░░░░░░░░░░░░░░░░░░░ 50% Manual    │
│  Flow 7  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0% Manual     │
│  Flow 8  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 10% Manual   │
│  Flow 9  ███░░░░░░░░░░░░░░░░░░░░░░░░░░░ 30% Manual    │
│  Flow 10 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0% Manual     │
│                                                          │
│  OVERALL: ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 31% Auto    │
│                                          69% MANUAL ⚠️  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

# 🎯 SUMMARY & RECOMMENDATIONS

## What's Working ✅
- Core appointment CRUD functionality
- Chart of accounts infrastructure
- Repasse calculation engine
- Basic AR/AP tables structure
- Financial audit logging

## What's Broken 🔴
- No automatic ERP closes (0 flows fully automated)
- Billing guides are orphaned (no appointment link)
- AR receivables not auto-created on completion
- No cascade deletes on appointment cancellation
- No glosa/denial handling
- TISS XML generation not started

## Immediate Actions (This Week)
1. **Add missing FKs** (30 minutes of SQL)
2. **Add appointment_id to billing_guides** (15 minutes)
3. **Create appointment completion trigger** (1-2 hours)
4. **Add all manual soft links to enforced FKs** (1 hour)

## Strategic Direction
- Target: **70% automation by end of Month 2**
- Focus: **Appointment → AR → AP → Repasse chain**
- Async: Implement integrations in parallel (Google Calendar, WhatsApp)

## Estimated Effort
| Task | Hours | Priority |
|------|-------|----------|
| Phase 1 (FKs) | 1.5 | 🔴 Now |
| Phase 2 (Auto-triggers) | 6 | 🔴 This week |
| Phase 3 (Config UI) | 12 | 🟡 Next week |
| Phase 4 (Advanced) | 20 | 🟡 Weeks 3-4 |
| **Total** | **39.5** | **5 weeks to 70%** |

---

**Audit Completed:** April 9, 2026 | **Next Review:** April 30, 2026
