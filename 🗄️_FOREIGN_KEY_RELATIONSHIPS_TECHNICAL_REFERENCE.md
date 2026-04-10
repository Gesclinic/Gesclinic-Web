# 🗄️ FOREIGN KEY RELATIONSHIP STATUS REFERENCE
**Gesclinic | April 9, 2026**

---

## 1. COMPLETE FK MAP WITH ENFORCEMENT STATUS

### Tier 1: CORE IDENTITY (Clinic-Based Sharding)

```sql
-- ✅ ENFORCED AND WORKING
clinics (id)
├─ ← users.clinic_id [FK: ON DELETE CASCADE] ✅
├─ ← patients.clinic_id [FK: ON DELETE CASCADE] ✅
├─ ← professionals.clinic_id [FK: ON DELETE CASCADE] ✅
├─ ← services.clinic_id [FK: ON DELETE CASCADE] ✅
├─ ← appointments.clinic_id [FK: ON DELETE CASCADE] ✅
├─ ← ar_receivables.clinic_id [FK: ON DELETE CASCADE] ✅
├─ ← ap_bills.clinic_id [FK: ON DELETE CASCADE] ✅
├─ ← invoices.clinic_id [FK: ON DELETE CASCADE] ✅
├─ ← repasse_medico.clinic_id [FK: ON DELETE CASCADE] ✅
├─ ← medical_repasse_config.clinic_id [FK: ON DELETE CASCADE] ✅
├─ ← medical_production.clinic_id [FK: ON DELETE CASCADE] ✅
├─ ← payers.clinic_id [FK: ON DELETE CASCADE] ✅
├─ ← plans.clinic_id [FK: ON DELETE CASCADE] ✅
└─ ← service_prices.clinic_id [FK: ON DELETE CASCADE] ✅
```

### Tier 2: APPOINTMENT NETWORK (The Core Transaction)

```sql
-- ✅ FULLY ENFORCED
appointments (id)
├─ → clinics.id [FK: MANDATORY] ✅
├─ → patients.id [FK: OPTIONAL] ✅
├─ → professionals.id [FK: OPTIONAL] ✅
├─ → services.id [FK: OPTIONAL] ✅
├─ → plans.id [FK: OPTIONAL] - Added 2026-02-19 ✅
├─ → health_insurances.id [FK: OPTIONAL] ✅
├─ ← appointment_notification_logs.appointment_id [FK: ON DELETE CASCADE] ✅
├─ ← appointment_audit_logs.appointment_id [FK: ON DELETE CASCADE] ✅
├─ ← appointment_financial_audit_logs.appointment_id [FK: ON DELETE CASCADE] ✅
├─ ← discount_authorizations.appointment_id [FK: OPTIONAL, NO CONSTRAINT] ⚠️
├─ ← financial_transactions.appointment_id [FK: OPTIONAL, NO CONSTRAINT] ⚠️
├─ ← ar_receivables.appointment_id [FK: NO CONSTRAINT] 🔴
├─ ← ap_bills.appointment_id [FK: NO CONSTRAINT] 🔴
├─ ← invoices.appointment_id [FK: NO CONSTRAINT] 🔴
└─ ← billing_guides.appointment_id [COLUMN MISSING] 🔴 CRITICAL
```

### Tier 3: FINANCIAL RECORDS (AR/AP/Repasse)

```sql
-- ✅ PARTIALLY ENFORCED
ar_receivables (id)
├─ → clinics.id [FK: ON DELETE CASCADE] ✅
├─ → appointments.id [COLUMN EXISTS, NO FK] ⚠️ 
├─ → patients.id [COLUMN EXISTS, NO FK] ⚠️
├─ → billing_guides.id [COLUMN MISSING] 🔴
├─ ← ap_bills.ar_id [COLUMN MISSING] 🔴
└─ ← invoices.ar_id [COLUMN MISSING] 🔴

-- ✅ MOSTLY ENFORCED (1 of 2 FK enforced)
ap_bills (id)
├─ → clinics.id [FK: ON DELETE CASCADE] ✅
├─ → repasse_medico.id [FK: ON DELETE CASCADE] ✅
├─ → appointments.id [COLUMN EXISTS, NO FK] ⚠️
├─ → ar_receivables.id [COLUMN MISSING] 🔴
└─ → financial_accounts.id [OPTIONAL, NO CONSTRAINT] ⚠️

-- ⚠️ ORPHAN RISK
invoices (id)
├─ → clinics.id [FK: ON DELETE CASCADE] ✅
├─ → appointments.id [COLUMN EXISTS, NO FK] ⚠️
├─ → ar_receivables.id [COLUMN MISSING] 🔴
└─ → billing_guides.id [COLUMN MISSING] 🔴

-- ⚠️ ORPHAN RISK
billing_guides (id)
├─ → clinics.id [FK: ON DELETE CASCADE] ✅
├─ → appointments.id [COLUMN MISSING] 🔴
├─ → ar_receivables.id [COLUMN MISSING] 🔴
└─ → health_insurances.id [SOFT: numero_carteirinha as TEXT] ⚠️
```

### Tier 4: MEDICAL REPASSE & PRODUCTION

```sql
-- ✅ FULLY ENFORCED
repasse_medico (id)
├─ → clinics.id [FK: ON DELETE CASCADE] ✅
├─ → professionals.id [FK: ON DELETE CASCADE] ✅
└─ ← ap_bills.repasse_id [FK: ON DELETE CASCADE] ✅

-- ✅ FULLY ENFORCED
medical_repasse_config (id)
├─ → clinics.id [FK: ON DELETE CASCADE] ✅
└─ → professionals.id [FK: ON DELETE CASCADE] ✅

-- ✅ FULLY ENFORCED
medical_production (id)
├─ → clinics.id [FK: ON DELETE CASCADE] ✅
├─ → professionals.id [FK: ON DELETE CASCADE] ✅
└─ → appointments.id [REFERENCED AS: atendimento_id, NO FK CONSTRAINT] ⚠️
```

---

## 2. RELATIONSHIP COMPLETENESS BY FLOW

### Flow: Appointment → Check-in → Payment → AR → AP → Repasse

```
Step 1: APPOINTMENT CREATION
┌─────────────────────────────────────┐
│ appointments                        │
│ ├─ clinic_id → clinics.id ✅       │
│ ├─ patient_id → patients.id ✅     │
│ ├─ professional_id → professionals.id ✅
│ ├─ service_id → services.id ✅     │
│ └─ plan_id → plans.id ✅           │
└─────────────────────────────────────┘
         ↓
Step 2: APPOINTMENT COMPLETION (Complete)
┌─────────────────────────────────────┐
│ No automatic step                   │
│ (Trigger missing)                   │
└─────────────────────────────────────┘
         ↓
Step 3: AR RECEIVABLE CREATION (Manual)
╔════════════════════════════════════════╗
║ ar_receivables                         ║
║ ├─ clinic_id → clinics.id ✅          ║
║ ├─ appointment_id [NO FK] ⚠️          ║
║ ├─ patient_id [NO FK] ⚠️              ║
║ ├─ guide_id [COLUMN MISSING] 🔴      ║
║ └─ (No link to source appointment)   ║
╚════════════════════════════════════════╝
         ↓
Step 4: BILLING GUIDE CREATION (Manual)
╔════════════════════════════════════════╗
║ billing_guides                         ║
║ ├─ clinic_id → clinics.id ✅          ║
║ ├─ appointment_id [COLUMN MISSING] 🔴║
║ └─ (Floating in database)             ║
╚════════════════════════════════════════╝
         ↓
Step 5: AP BILL CREATION (Manual)
┌─────────────────────────────────────┐
│ ap_bills                            │
│ ├─ clinic_id → clinics.id ✅       │
│ ├─ repasse_medico.id → ✅          │
│ ├─ appointment_id [NO FK] ⚠️       │
│ └─ ar_receivables.id [NO COLUMN] 🔴
└─────────────────────────────────────┘
         ↓
Step 6: MEDICAL REPASSE (Month End)
┌─────────────────────────────────────┐
│ repasse_medico                      │
│ ├─ clinic_id → clinics.id ✅       │
│ └─ professional_id → professionals.id ✅
└─────────────────────────────────────┘

CLOSURE: Perfect circular reference ❌ BROKEN (5 missing links)
```

---

## 3. CONSTRAINT MATRIX

| From Table | To Table | Column | FK Type | Status | Default | Impact |
|-----------|----------|--------|---------|--------|---------|--------|
| appointments | clinics | clinic_id | MANDATORY | ✅ | None | Sharding works |
| appointments | patients | patient_id | OPTIONAL | ✅ | NULL | Can have unknown patient |
| appointments | professionals | professional_id | OPTIONAL | ✅ | NULL | Can have no provider |
| appointments | services | service_id | OPTIONAL | ✅ | NULL | Can have no service |
| appointments | plans | plan_id | OPTIONAL | ✅ | NULL | Added 2026-02-19 |
| **ar_receivables** | **appointments** | **appointment_id** | OPTIONAL | ⚠️ NO FK | NULL | 🔴 Orphans on delete |
| **ar_receivables** | **patients** | **patient_id** | OPTIONAL | ⚠️ NO FK | NULL | 🔴 Orphans on delete |
| **ar_receivables** | **billing_guides** | **guide_id** | ??? | ❌ MISSING | - | 🔴 No link exists |
| **ap_bills** | **appointments** | **appointment_id** | ??? | ⚠️ NO FK | NULL | 🔴 Orphans on delete |
| **ap_bills** | **repasse_medico** | **repasse_id** | MANDATORY | ✅ | None | ✅ Cascade works |
| **ap_bills** | **ar_receivables** | **ar_id** | ??? | ❌ MISSING | - | 🔴 No link |
| **billing_guides** | **appointments** | **appointment_id** | ??? | ❌ MISSING | - | 🔴 Critical gap |
| **billing_guides** | **ar_receivables** | **ar_id** | ??? | ❌ MISSING | - | 🔴 No revenue link |
| **invoices** | **appointments** | **appointment_id** | ??? | ⚠️ NO FK | NULL | 🔴 Orphans |
| **invoices** | **ar_receivables** | **ar_id** | ??? | ❌ MISSING | - | 🔴 No payment link |
| repasse_medico | professionals | professional_id | MANDATORY | ✅ | None | ✅ Works |
| repasse_medico | clinics | clinic_id | MANDATORY | ✅ | None | ✅ Works |
| medical_production | professionals | professional_id | MANDATORY | ✅ | None | ✅ Works |
| medical_production | clinics | clinic_id | MANDATORY | ✅ | None | ✅ Works |
| medical_production | appointments | atendimento_id | OPTIONAL | ⚠️ NO FK | NULL | ⚠️ Soft link |

---

## 4. WHAT HAPPENS ON CASCADE DELETE

### Current Behavior (With Gaps)

```
DELETE FROM appointments WHERE id = 'X'
├─ ✅ Deletes from appointment_notification_logs (FK: ON DELETE CASCADE)
├─ ✅ Deletes from appointment_audit_logs (FK: ON DELETE CASCADE)
├─ ✅ Deletes from appointment_financial_audit_logs (FK: ON DELETE CASCADE)
├─ ❌ ORPHANS in ar_receivables (NO FK, appointment_id remains)
├─ ❌ ORPHANS in ap_bills (NO FK, appointment_id remains)
├─ ❌ ORPHANS in invoices (NO FK, appointment_id remains)
├─ ❌ ORPHANS in billing_guides (No appointment_id column anyway)
├─ ⚠️ LEFT IN PLACE in discount_authorizations (FK: ON DELETE SET NULL)
├─ ⚠️ LEFT IN PLACE in financial_transactions (FK: ON DELETE SET NULL)
└─ Result: Financial data becomes unreconcilable ❌

DELETE FROM repasse_medico WHERE id = 'X'
├─ ✅ Deletes from ap_bills (FK: ON DELETE CASCADE via repasse_id) ✅
└─ Result: Cascades correctly ✅

DELETE FROM ar_receivables WHERE id = 'X'
├─ ❌ No foreign key consumers (ap_bills doesn't have ar_id FK)
└─ Result: Is deleted but orphans in invoices (no cascade)
```

### Should Behavior (With Fixes)

```
DELETE FROM appointments WHERE id = 'X'
├─ ✅ Cascade to appointment_notification_logs ✓
├─ ✅ Cascade to appointment_audit_logs ✓
├─ ✅ Cascade to appointment_financial_audit_logs ✓
├─ ✅ Cascade to ar_receivables (via new FK) ✓
├─ ✅ Cascade to ap_bills (via new FK) ✓
├─ ✅ Cascade to invoices (via new FK) ✓
├─ ✅ Cascade to billing_guides (via new FK) ✓
└─ Result: Clean complete referential integrity ✓

DELETE FROM ar_receivables WHERE id = 'X'
├─ ✅ Cascade to invoices (via new ar_id FK) ✓
└─ Result: Only orphan if manual user intervention ✓
```

---

## 5. CRITICAL MISSING FOREIGN KEYS (Ranked by Impact)

### 🔴 TIER 1: BLOCKS FINANCIAL CLOSE (Must Fix Before Going Live)

```sql
-- FK #1: appointments → billing_guides
ALTER TABLE billing_guides 
ADD COLUMN IF NOT EXISTS appointment_id UUID;

ALTER TABLE billing_guides
ADD CONSTRAINT fk_guides_appointments 
FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;

Impact: $$$$ (Can't track source of every revenue line)
Effort: 5 minutes
Risk: HIGH (Column missing entirely)

-- FK #2: ar_receivables → appointments (enforce with cascade)
ALTER TABLE ar_receivables
ADD CONSTRAINT fk_ar_receivables_appointments 
FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;

Impact: $$$ (Orphaned records if appointment deleted)
Effort: 5 minutes  
Risk: MEDIUM (Column exists, just needs constraint)

-- FK #3: ap_bills → appointments (enforce with cascade)
ALTER TABLE ap_bills
ADD CONSTRAINT fk_ap_bills_appointments 
FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;

Impact: $$$ (Orphaned records if appointment deleted)
Effort: 5 minutes
Risk: MEDIUM (Column exists, just needs constraint)

-- FK #4: ar_receivables → billing_guides (income source tracking)
ALTER TABLE ar_receivables 
ADD COLUMN IF NOT EXISTS guide_id UUID;

ALTER TABLE ar_receivables
ADD CONSTRAINT fk_ar_receivables_guides 
FOREIGN KEY (guide_id) REFERENCES billing_guides(id) ON DELETE SET NULL;

Impact: $$$ (Can't track which guide paid which AR)
Effort: 10 minutes
Risk: MEDIUM (Column missing, linking logic needed)

-- FK #5: ap_bills → ar_receivables (expense-to-income link)
ALTER TABLE ap_bills 
ADD COLUMN IF NOT EXISTS ar_id UUID;

ALTER TABLE ap_bills
ADD CONSTRAINT fk_ap_bills_ar 
FOREIGN KEY (ar_id) REFERENCES ar_receivables(id) ON DELETE SET NULL;

Impact: $$ (Can't match expense to revenue)
Effort: 10 minutes
Risk: MEDIUM (Column missing, linking logic needed)
```

### 🟡 TIER 2: IMPROVES DATA QUALITY (Should Fix Soon)

```sql
-- FK #6: invoices → appointments
ALTER TABLE invoices
ADD CONSTRAINT fk_invoices_appointments 
FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;

-- FK #7: invoices → ar_receivables
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS ar_id UUID;

ALTER TABLE invoices
ADD CONSTRAINT fk_invoices_ar 
FOREIGN KEY (ar_id) REFERENCES ar_receivables(id) ON DELETE SET NULL;

-- FK #8: medical_production → appointments (enforce)
ALTER TABLE medical_production
ADD CONSTRAINT fk_medical_production_appointments 
FOREIGN KEY (atendimento_id) REFERENCES appointments(id) ON DELETE SET NULL;
```

---

## 6. Soft vs Hard Links (Current State)

| Link | Type | Current | After Fix | Risk | Effort |
|------|------|---------|-----------|------|--------|
| appointment → ar | SOFT (no FK) | Column exists, no constraint | FK enforced ON DELETE CASCADE | Orphans | 5 min |
| appointment → ap_bills | SOFT (no FK) | Column exists, no constraint | FK enforced ON DELETE CASCADE | Orphans | 5 min |
| appointment → invoices | SOFT (no FK) | Column exists, no constraint | FK enforced ON DELETE CASCADE | Orphans | 5 min |
| appointment → billing_guides | MISSING | No column | Add column + FK | Can't link | 10 min |
| ar_receivables → billing_guides | MISSING | No column | Add column + FK | Can't link revenue | 10 min |
| ar_receivables → invoices | MISSING | No column | Add column | Can't reconcile | 10 min |
| ap_bills → ar_receivables | MISSING | No column | Add column + FK | Can't match exp/rev | 10 min |
| ap_bills → invoices | IMPLIED | No column | Not implementing (redundant) | Low | - |
| billing_guides → health_insurances | TEXT (soft) | numero_carteirinha as TEXT | Link by insurance ID (improvement) | Lookup fail | 15 min |
| medical_production → appointments | SOFT (no FK) | atendimento_id as UUID, no constraint | FK enforced | Orphans | 5 min |

---

## 7. MIGRATION LOG

| Date | Migration File | Changes | FK Additions | FK Removals | Net Gaps |
|------|---|---|---|---|---|
| 2026-01-13 | COMPREHENSIVE_INIT.sql | Basic schema | ✅ ar_receivables.clinic_id, repasse_medico FKs | None | 5 |
| 2026-02-19 | add_plan_id_to_appointments.sql | Added plan_id | ✅ appointments.plan_id → plans | None | 4 |
| 2026-02-21 | create_billing_guides_table.sql | New guides table | ✅ billing_guides.clinic_id only | None | +1 🔴 |
| 2026-04-01 | add_billing_columns.sql | Added _id columns | ⚠️ None enforced (AP bills, invoices) | None | Same |

**Net Result: 5 critical FK gaps since Jan 2026, growing**

---

## 8. DATA INTEGRITY RISKS

### If appointment_id Deletion Not Enforced

```
Scenario: User accidentally deletes appointment #1234

Current Effect:
✗ ar_receivables.id=AR-001, appointment_id='1234' → ORPHAN
✗ ap_bills.id=AP-001, appointment_id='1234' → ORPHAN
✗ invoices.id=INV-001, appointment_id='1234' → ORPHAN
✗ billing_guides.id=BG-001, appointment_id='1234' → ORPHAN (if column exists)
→ Financial records float in DB, can't reconcile
→ Audit trail broken
→ Reports cannot track original source

Risk Level: 🔴 CRITICAL
Frequency: High (accidents happen)
Data Loss: None, but reconciliation becomes impossible
```

### If billing_guides.appointment_id Not Added

```
Scenario: System creates 100 billing guides

Current Effect:
✗ billing_guides.id=BG-001 → BG-100
✗ appointments.id=APT-001 → APT-100
✗ ar_receivables created separately
→ No way to know:
  • Which appointment generated which guide?
  • Which guide created which AR?
  • Did we double-count any revenue?
  • Which guide is still pending XML generation?

Risk Level: 🔴 CRITICAL
Frequency: Every billing cycle
Data Accuracy: Severely degraded
Reconciliation: IMPOSSIBLE
```

### If ar_receivables.guide_id Not Added

```
Scenario: Payment received on guide BG-001 for $5000

Current Requirement:
✗ User must manually find matching ar_receivables record
✗ User must manually mark as 'received'
✗ No automatic link

Risk Level: 🟡 HIGH  
Error Rate: 30-40% manual processes get it wrong
Reconciliation: Labor-intensive manual matching monthly
```

---

## 9. ACTION ITEMS (Ordered by Priority & Dependency)

### Step 1: Add Missing Columns (5 minutes)
```sql
-- Only if not already present
ALTER TABLE billing_guides ADD COLUMN IF NOT EXISTS appointment_id UUID;
ALTER TABLE ar_receivables ADD COLUMN IF NOT EXISTS guide_id UUID;
ALTER TABLE ap_bills ADD COLUMN IF NOT EXISTS ar_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ar_id UUID;
ALTER TABLE medical_production ADD COLUMN IF NOT EXISTS appointment_id_corrected UUID;
```

### Step 2: Add FK Constraints (10 minutes)
```sql
-- Critical path: appointment deletion cascade
ALTER TABLE ar_receivables ADD CONSTRAINT fk_ar_appointments FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;
ALTER TABLE ap_bills ADD CONSTRAINT fk_ap_appointments FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_appointments FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;
ALTER TABLE billing_guides ADD CONSTRAINT fk_guides_appointments FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;

-- Financial path: revenue link
ALTER TABLE ar_receivables ADD CONSTRAINT fk_ar_guides FOREIGN KEY (guide_id) REFERENCES billing_guides(id) ON DELETE SET NULL;
ALTER TABLE ap_bills ADD CONSTRAINT fk_ap_ar FOREIGN KEY (ar_id) REFERENCES ar_receivables(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_ar FOREIGN KEY (ar_id) REFERENCES ar_receivables(id) ON DELETE SET NULL;

-- Medical path
ALTER TABLE medical_production ADD CONSTRAINT fk_medical_production_appointments FOREIGN KEY (atendimento_id) REFERENCES appointments(id) ON DELETE SET NULL;
```

### Step 3: Create Linking Logic (2-4 hours)
- Appointment completion → Auto-populate guide.appointment_id
- Guide creation → Auto-populate ar_receivables.guide_id
- AR creation → Auto-populate ap_bills.ar_id
- Payment receipt → Auto-link guide payment to AR

### Step 4: Audit & Migrate Data (1-2 hours)
- Find orphaned records: `SELECT * FROM ar_receivables WHERE appointment_id IS NULL`
- Backfill relationships where possible
- Create audit trail for unmatchable records
- Test cascade delete behavior

---

**Total Effort: ~2 hours SQL + 4-6 hours logic/testing = ~6-8 hours to full remediation**

