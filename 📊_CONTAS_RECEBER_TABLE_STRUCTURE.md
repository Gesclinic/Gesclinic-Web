# Contas a Receber (Receivables) - Table Structure Reference

## Quick Answer

**"Contas a Receber" (Receivables) uses MULTIPLE tables depending on context:**

1. **`ar_receivables`** ← PRIMARY TABLE for new receivables (full-featured)
2. **`ar_invoices`** ← LEGACY/BACKUP table (basic structure)
3. **`invoices`** ← Separate table for "Guias de Faturamento" (billing guides for insurance/convenio)
4. **`ap_bills`** ← PAYABLES (NOT receivables) - opposite direction

---

## Table Comparison

### Table 1: `ar_receivables` (PRIMARY - RECOMMENDED)

**Status:** Active, currently used by `receivablesApi.js`

**Full Column Structure:**
```sql
CREATE TABLE ar_receivables (
  id                    UUID PRIMARY KEY
  clinic_id             UUID NOT NULL (FK: clinics)
  
  -- PAYER INFO
  payer_name            TEXT
  paciente_id           UUID (FK: patients)
  convenio_id           UUID (FK: payers/health_insurances)
  empresa_id            UUID (FK: companies)
  
  -- CONTEXT
  origem                TEXT (CHECK: 'Agenda', 'Faturamento', 'Contrato', 'Manual')
  descricao             TEXT
  servico_id            UUID
  profissional_id       UUID
  centro_custo_id       UUID
  plano_contas_id       UUID
  
  -- AMOUNTS
  valor_bruto           DECIMAL(12,2)
  descontos             DECIMAL(12,2)
  valor_liquido         DECIMAL(12,2) [GENERATED: valor_bruto - descontos]
  forma_prevista        TEXT
  
  -- DATES
  data_emissao          DATE (default: today)
  data_vencimento       DATE
  data_recebimento      DATE
  
  -- STATUS (CRITICAL)
  status                VARCHAR(50) 
    CHECK: 'open', 'planned', 'received', 'partial', 'overdue', 'canceled', 'glossed'
    DEFAULT: 'open'
  
  -- INSTALLMENTS
  parcelado             BOOLEAN (default: false)
  parcela_atual         INT
  total_parcelas        INT
  grupo_parcelamento_id UUID
  
  -- ORIGIN DETAILS
  appointment_id        UUID
  lote_faturamento_id   UUID
  numero_guia           TEXT
  previsao_pagamento    DATE
  contrato_id           UUID
  competencia           TEXT
  
  -- REPASSE/COMMISSION
  repasse_gerado        BOOLEAN (default: false)
  
  created_at            TIMESTAMPTZ (default: now())
);

-- Indexes
idx_ar_receivables_clinic
idx_ar_receivables_status
idx_ar_receivables_venc (on data_vencimento)
idx_ar_receivables_receb (on data_recebimento)
```

**Status Values & Normalization:**
| UI Input | Valid DB Values | Notes |
|----------|-----------------|-------|
| "Aberto" / "Em Aberto" / "Pendente" | `open` | Initial state |
| "Planejado" / "Previsto" / "Estimado" | `planned` | Forecast only |
| "Recebido" / "Pago" / "Quitado" | `received` | **Triggers repasse_gerado=true** |
| "Parcial" / "Recebido Parcial" | `partial` | Partial payment received |
| "Atrasado" / "Em Atraso" | `overdue` | Past due date |
| "Cancelado" / "Cancelada" | `canceled` | Voided |
| "Glosado" / "Glosa" | `glossed` | Insurance denial/rejection |

---

### Table 2: `ar_invoices` (LEGACY - Basic)

**Status:** Created but rarely used now; simpler structure

```sql
CREATE TABLE ar_invoices (
  id              UUID PRIMARY KEY
  clinic_id       UUID NOT NULL
  
  patient_id      UUID
  patient_name    TEXT
  
  description     TEXT
  amount          DECIMAL(12,2) NOT NULL
  received_value  DECIMAL(12,2) DEFAULT 0
  
  due_date        DATE
  received_at     TIMESTAMPTZ
  status          VARCHAR(50) DEFAULT 'open'
  
  payment_method  VARCHAR(100)
  chart_account_id UUID (FK: chart_of_accounts)
  
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ
);

-- Indexes
idx_ar_invoices_clinic
idx_ar_invoices_status
idx_ar_invoices_due_date
```

**Difference from `ar_receivables`:**
- No support for multiple payer types (paciente, convenio, empresa) - only `patient_id`
- No partitioning/installment support
- No commission/repasse tracking
- No appointment linkage
- Simpler, for basic receivables only

---

### Table 3: `invoices` (BILLING GUIDES - Different Purpose)

**Status:** Active for insurance billing guides ("Guias de Faturamento - TISS")

```sql
CREATE TABLE invoices (
  id              UUID PRIMARY KEY
  clinic_id       UUID NOT NULL
  
  invoice_number  TEXT
  description     TEXT
  amount          DECIMAL(12,2) NOT NULL
  
  issued_date     DATE
  due_date        DATE
  paid_date       DATE
  
  status          VARCHAR(50) DEFAULT 'open'
  
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ
);

-- Indexes
idx_invoices_clinic
idx_invoices_status
```

**Purpose:** For insurance/convenio billing guides submitted to health plans, NOT patient receivables.

---

### Table 4: `ap_bills` (PAYABLES - Opposite)

**Status:** For "Contas a PAGAR" (bills to pay, not receivables)

```sql
CREATE TABLE ap_bills (
  id                UUID PRIMARY KEY
  clinic_id         UUID NOT NULL
  
  supplier_id       UUID
  supplier_name     TEXT
  
  description       TEXT NOT NULL
  amount            DECIMAL(12,2) NOT NULL
  paid_value        DECIMAL(12,2) DEFAULT 0
  
  due_date          DATE
  paid_at           TIMESTAMPTZ
  status            VARCHAR(50) DEFAULT 'open'
  
  payment_method    VARCHAR(100)
  chart_account_id  UUID
  cost_center_id    UUID
  category_id       UUID
  recurring_config_id UUID
  
  created_at        TIMESTAMPTZ
  updated_at        TIMESTAMPTZ
);
```

**Status Values:**
- `open`, `paid`, `canceled`, `partial`, `scheduled`

---

## Database View: `view_ar_receivables_v1`

Used by `receivablesApi.listReceivables()` for reading (filters & joins):

```sql
SELECT
  r.id,
  r.clinic_id,
  COALESCE(r.origem, 'Manual') as origem,
  r.descricao,
  r.payer_name AS pagador,
  r.paciente_id,
  r.convenio_id,
  r.empresa_id,
  r.profissional_id,
  r.centro_custo_id,
  r.plano_contas_id,
  COALESCE(r.valor_bruto, 0) as valor_bruto,
  COALESCE(r.descontos, 0) as descontos,
  COALESCE(r.valor_bruto - r.descontos, 0) as valor_liquido,
  r.forma_prevista,
  r.data_emissao,
  r.data_vencimento,
  r.data_recebimento,
  COALESCE(r.status, 'open') as status,
  COALESCE(r.parcelado, false) as parcelado,
  r.parcela_atual,
  r.total_parcelas,
  r.grupo_parcelamento_id,
  r.created_at
FROM public.ar_receivables r;
```

---

## API Modules

### 1. `receivablesApi.js` (PRIMARY - Recommended)

**Location:** `src/lib/receivablesApi.js`

**Main Functions:**
- `listReceivables({clinicId, payer, status, ...})` - queries `view_ar_receivables_v1`
- `createReceivable(clinicId, payload)` - inserts into `ar_receivables`
- `updateReceivable(id, patch)` - updates `ar_receivables`, normalizes status
- Supports installments (parcelado)
- Auto-generates repasses when status changes to 'received'

**Status Normalization:**
```javascript
function normalizeArStatus(s) {
  if (['open','em aberto','aberto','pendente'].includes(v)) return 'open';
  if (['planned','previsto','previsao','estimado'].includes(v)) return 'planned';
  if (['received','recebido','pago','quitado'].includes(v)) return 'received';
  if (['partial','parcial','recebido parcial'].includes(v)) return 'partial';
  if (['overdue','em atraso','atrasado'].includes(v)) return 'overdue';
  if (['canceled','cancelado','cancelada'].includes(v)) return 'canceled';
  if (['glossed','glosado','glosa'].includes(v)) return 'glossed';
  return null;
}
```

---

### 2. `financeApi.js` (PAYABLES - Different Direction)

**Location:** `src/lib/financeApi.js`

**Note:** This works with `ap_bills` (payables), NOT receivables!

**Main Functions:**
- `listAP({clinicId, statusText, ...})` - queries `ap_bills` via RPC `list_ap_bills`
- `listAPQuery({clinicId, statusList, vendor, ...})` - direct query on `ap_bills`

**AP (Payables) Status:**
```javascript
function normalizeApStatus(s) {
  if (['open', 'em aberto', 'pendente', 'aberto'].includes(v)) return 'open';
  if (['paid', 'pago', 'quitado'].includes(v)) return 'paid';
  if (['canceled', 'cancelado', 'cancelada'].includes(v)) return 'canceled';
  if (['partial', 'parcial', 'parcialmente pago'].includes(v)) return 'partial';
  if (['scheduled', 'agendada', 'agendado', 'programada'].includes(v)) return 'scheduled';
  return null;
}
```

---

### 3. `appointmentBillingApi.js` (SYNC on Completion)

**Location:** `src/lib/appointmentBillingApi.js`

**Main Function:**
- `syncAppointmentBilling(appointmentId)` - creates billing entries when appointment finishes

**Process:**
1. Loads appointment with patient, service, payer info
2. Creates entry in `ap_bills` (Contas a Receber)
   - Uses fields: `clinic_id`, `appointment_id`, `patient_id`, `description`, `amount`, `due_date`, `status`, `payment_method`, `payer_id`, `payer_type`, `notes`
3. If convenio (insurance), also creates in `invoices` table (billing guide)

**Note:** Despite the table name `ap_bills` in this context, it's labeled as "Contas a Receber" (receivables). This is a **NAMING OVERLAP** in the codebase - `ap_bills` is actually used for both:
- Payables in `financeApi.js` context
- Receivables in `appointmentBillingApi.js` context

---

### 4. `conciliationApi.js` (RECONCILIATION)

**Location:** `src/lib/conciliationApi.js`

**Tables Used:**
- `ar_invoices` (for reconciling received payments)

**Note:** Uses legacy `ar_invoices` table structure.

---

## Summary: Which Table to Use?

| Use Case | Table | API Module | Status |
|----------|-------|-----------|--------|
| **New receivables from appointments** | `ar_receivables` | `receivablesApi.js` | ✅ RECOMMENDED |
| **List/filter receivables UI** | `view_ar_receivables_v1` | `receivablesApi.js` | ✅ RECOMMENDED |
| **Create manual receivable** | `ar_receivables` | `receivablesApi.js` | ✅ RECOMMENDED |
| **Basic receivable (legacy)** | `ar_invoices` | `conciliationApi.js` | ⚠️ Legacy |
| **Insurance billing guides** | `invoices` | `financeApi.js` (limited) | ✅ For TISS |
| **Accounts payable (to pay)** | `ap_bills` | `financeApi.js` | ✅ Payables only |

---

## Key Triggers & Automations

**When `ar_receivables.status = 'received'`:**
1. `data_recebimento` is set to TODAY (if not already set)
2. `repasse_gerado` → TRUE
3. Triggers function `generate_doctor_commissions_v2()` to auto-generate medical repasses for that month/year

---

## Confusion Warnings ⚠️

1. **Table naming:** `ap_bills` exists in both `financeApi.js` (payables) and implicitly as "Contas a Receber" in `appointmentBillingApi.js`. This is misleading!
   - "AP" = Accounts Payable (bills to PAY)
   - But it's used for both contexts
   - New code should prefer `ar_receivables` for clarity

2. **Multiple receivable tables:** Three different AR/receivable tables exist:
   - `ar_receivables` (current, full-featured)
   - `ar_invoices` (legacy, basic)
   - `invoices` (insurance guides, TISS)
   - All coexist but `ar_receivables` is the primary one

3. **Status values differ:**
   - AR: `open, planned, received, partial, overdue, canceled, glossed`
   - AP: `open, paid, canceled, partial, scheduled`

---

## Migration Files Reference

- **Primary schema:** `supabase/migrations/20260113_COMPREHENSIVE_INIT.sql` (lines 450+)
- **Full ar_receivables schema:** `supabase/migrations/20260112_create_ar_receivables.sql.disabled`
- **View definitions:** `supabase/migrations/20260121_fix_finance_views.sql`

