# 📊 Gesclinic Database Schema - Complete Analysis

**Date:** May 21, 2026  
**Status:** Production Schema  
**Analysis Scope:** Conventions/Payers, Customers/Patients, Invoices & Tax/Retention Configuration

---

## 1. PRIMARY TABLES OVERVIEW

### 1.1 CONVENTIONS/PAYERS EQUIVALENCE

The system uses **two equivalent table structures** for health plan/convention data:

| Aspect | Table | Purpose |
|--------|-------|---------|
| **Primary Convention Data** | `health_insurances` | Main health plan/convention registry (Operadoras) |
| **Backward Compatible** | `payers` | Legacy payers table (minimal fields) |
| **Related Links** | `professional_payers` | Professional-to-payer associations |
| **Service Pricing** | `service_prices` | Price tiers per convention/payer |

---

## 2. DETAILED TABLE SCHEMAS

### 2.1 TABLE: `health_insurances` (Convenios/Convênios)

**Primary table for health plan/convention data.**

```sql
CREATE TABLE health_insurances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  
  -- Identifiers
  code VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,
  
  -- Convention Type
  type VARCHAR(50),  -- 'private_insurance', 'health_plan', 'government', 'direct_pay', 'other'
  
  -- Documentation
  cnpj TEXT,
  registration_number TEXT,
  
  -- Contact Information
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  -- Configuration
  requires_authorization BOOLEAN DEFAULT FALSE,
  authorization_lead_time_days INT DEFAULT 0,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(code, clinic_id),
  UNIQUE(cnpj, clinic_id) WHERE cnpj IS NOT NULL
);

-- Extended Fields (from API & Migrations)
-- Additional columns added by API & migrations:
- fantasy_name TEXT
- legal_name TEXT
- contact_mobile VARCHAR(20)
- discount_percentage NUMERIC(5,2)
- minimum_margin_percentage NUMERIC(5,2)
- special_rules JSONB
- registration_ans TEXT                    -- ANS Registration (Agência Nacional de Saúde)
- tiss_pattern VARCHAR                     -- TISS pattern identifier
- guide_format VARCHAR                     -- Guide format type
- tiss_version VARCHAR                     -- TISS version
- address_street TEXT
- address_number VARCHAR(20)
- address_neighborhood TEXT
- address_city TEXT
- address_state VARCHAR(2)
- address_zip_code VARCHAR(10)
- municipal_registration TEXT
- state_registration TEXT
- country VARCHAR(100)
- payment_due_days INT
- accepted_payment_methods TEXT[]
- billing_cycle_start INT
- billing_cycle_end INT
- administration_fee_percentage NUMERIC(5,2)
- early_payment_discount_percentage NUMERIC(5,2)
- volume_discount_percentage NUMERIC(5,2)
- reajustment_index TEXT
- annual_reajustment_date DATE
- next_reajustment_date DATE
- monthly_billing_ceiling NUMERIC(12,2)
- consultation_limit INT
- copayment_value NUMERIC(10,2)
- contract_start_date DATE
- contract_end_date DATE
- auto_renewal BOOLEAN
- prior_notice_days INT
- days_to_suspension INT
- late_payment_fine_percentage NUMERIC(5,2)
- daily_interest_rate_percentage NUMERIC(5,2)
- financial_contact_name TEXT
- financial_contact_email TEXT
- financial_contact_phone TEXT
- bank_name TEXT
- bank_branch TEXT
- bank_account TEXT
- tiss_enabled BOOLEAN                     -- TISS integration enabled
- submission_method VARCHAR                -- TISS submission method
- tiss_endpoint VARCHAR                    -- TISS API endpoint
- tiss_username TEXT                       -- TISS credentials
- tiss_password TEXT
- tiss_response_email TEXT
- tiss_last_sync TIMESTAMP

-- Tax/Retention Fields
- icms_applicable BOOLEAN
- icms_rate NUMERIC(5,2)
- pis_applicable BOOLEAN
- pis_rate NUMERIC(5,2)
- cofins_applicable BOOLEAN
- cofins_rate NUMERIC(5,2)
- iss_applicable BOOLEAN
```

**Indexes:**
```sql
idx_health_insurances_clinic (clinic_id, active)
idx_health_insurances_code (code, clinic_id)
```

---

### 2.2 TABLE: `payers` (Legacy/Minimal)

**Legacy convention/payer table. Minimal fields for backward compatibility.**

```sql
CREATE TABLE payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  
  -- Identifiers
  code VARCHAR(50),
  name TEXT NOT NULL,
  
  -- Documentation
  cnpj TEXT,
  
  -- Contact
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
idx_payers_clinic (clinic_id)
idx_payers_name (name)
```

**Note:** The `payers` table is used for:
- Service pricing lookups
- Professional payer associations
- Legacy appointment references

---

### 2.3 TABLE: `patients` (Customers/Clients)

**Represents patients/customers who receive healthcare services.**

```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  
  -- Personal Information
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cell_phone VARCHAR(20),
  birthdate DATE,
  document_id TEXT,
  gender VARCHAR(10),
  
  -- Address
  street TEXT,
  number VARCHAR(20),
  neighborhood TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  
  -- Emergency Contact
  emergency_contact TEXT,
  emergency_phone TEXT,
  
  -- Medical Information
  allergies TEXT,
  medical_notes TEXT,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  
  -- Healthcare Payer Link
  payer_id UUID,  -- Foreign key to payers table
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
idx_patients_clinic (clinic_id)
idx_patients_name (name)
idx_patients_email (email)
idx_patients_document (document_id)
```

**Note:** Patients link to payers via `payer_id` field OR per-appointment payer selection.

---

### 2.4 TABLE: `ar_invoices` (Accounts Receivable - Main Invoice Table)

**Primary invoice/receivable table linking appointments to financial records.**

```sql
CREATE TABLE ar_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  
  -- Appointment Link
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Payer/Customer Info
  patient_id UUID,
  patient_name VARCHAR(255),
  payer_type VARCHAR CHECK (payer_type IN ('CONVENIO', 'PARTICULAR')),
  payer_id UUID,
  payer_rule_id BIGINT REFERENCES appointment_payer_rules(id),
  
  -- Service Description
  service_description TEXT,
  description TEXT,
  
  -- Financial Values - BASE
  service_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  discount_value NUMERIC(12,2) DEFAULT 0.00,
  discount_percent NUMERIC(5,2) DEFAULT 0.00,
  
  -- Tax Regime
  tax_regime VARCHAR(50) DEFAULT 'simples_nacional',
  tax_configuration_id BIGINT REFERENCES tax_configurations(id),
  
  -- Individual Tax Components
  pis_percent NUMERIC(5,2),
  pis_value NUMERIC(12,2) DEFAULT 0.00,
  
  cofins_percent NUMERIC(5,2),
  cofins_value NUMERIC(12,2) DEFAULT 0.00,
  
  csll_percent NUMERIC(5,2),
  csll_value NUMERIC(12,2) DEFAULT 0.00,
  
  ir_percent NUMERIC(5,2),
  ir_value NUMERIC(12,2) DEFAULT 0.00,
  
  issqn_percent NUMERIC(5,2),
  issqn_value NUMERIC(12,2) DEFAULT 0.00,
  
  total_taxes NUMERIC(12,2) DEFAULT 0.00,
  net_value NUMERIC(12,2) DEFAULT 0.00,
  
  -- Status & Dates
  status VARCHAR(50) DEFAULT 'open',  -- open, paid, canceled, partial, scheduled
  invoice_date DATE,
  due_date DATE,
  received_date DATE,
  
  -- Payment Information
  payment_method VARCHAR(100),
  received_value NUMERIC(12,2),
  received_payment_method VARCHAR(50),
  
  -- Legacy/Optional Fields
  received_at TIMESTAMP WITH TIME ZONE,
  chart_account_id UUID REFERENCES chart_of_accounts(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT check_service_value_positive CHECK (service_value >= 0),
  CONSTRAINT check_taxes_positive CHECK (total_taxes >= 0)
);

-- Indexes
idx_ar_invoices_clinic (clinic_id)
idx_ar_invoices_status (status)
idx_ar_invoices_appointment_id (appointment_id)
idx_ar_invoices_patient_name (patient_name)
idx_ar_invoices_clinic_appointment (clinic_id, appointment_id)
idx_ar_invoices_status_clinic (status, clinic_id)
idx_ar_invoices_payer_rule_id (payer_rule_id)
idx_ar_invoices_tax_configuration_id (tax_configuration_id)
```

---

### 2.5 TABLE: `invoices` (Generic Invoices - Minimal)

**Simple generic invoice table (rarely used, basic structure only).**

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  
  -- Invoice Identification
  invoice_number TEXT,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  
  -- Dates
  issued_date DATE,
  due_date DATE,
  paid_date DATE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'open',  -- open, paid, canceled
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
idx_invoices_clinic (clinic_id)
idx_invoices_status (status)
```

---

### 2.6 TABLE: `tax_configurations` (Global Tax Settings)

**Stores clinic-wide tax configuration and defaults.**

```sql
CREATE TABLE tax_configurations (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Tax Regime
  tax_regime VARCHAR NOT NULL DEFAULT 'simples_nacional'
    CHECK (tax_regime IN ('lucro_real', 'lucro_presumido', 'simples_nacional')),
  
  -- Default Tax Percentages
  default_pis_percent NUMERIC(5,2) NOT NULL DEFAULT 1.65,
  default_cofins_percent NUMERIC(5,2) NOT NULL DEFAULT 7.60,
  default_csll_percent NUMERIC(5,2) NOT NULL DEFAULT 9.00,
  default_ir_percent NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  
  -- ISSQN (Municipal Service Tax)
  issqn_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  issqn_municipality_code VARCHAR(7),    -- IBGE code
  issqn_municipality_name VARCHAR(255),
  
  -- Lucro Presumido Margin
  presumed_profit_margin NUMERIC(5,2) DEFAULT 32.00,
  
  -- ⚠️ RETENTION/WITHHOLDING CONFIGURATION
  retains_ist_on_particulars BOOLEAN DEFAULT FALSE,      -- ISS retido na fonte
  retains_ir_on_health_plans BOOLEAN DEFAULT TRUE,       -- IR retido on health plan invoices
  retains_pis_on_particulars BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(clinic_id)
);

-- Indexes
idx_tax_configurations_clinic_id (clinic_id)
```

---

### 2.7 TABLE: `appointment_payer_rules` (Convention/Payer-Specific Rules)

**Stores payer-specific rules including tax retention configurations.**

```sql
CREATE TABLE appointment_payer_rules (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Payer Type
  payer_type VARCHAR NOT NULL CHECK (payer_type IN ('CONVENIO', 'PARTICULAR')),
  
  -- Payer References (mutually exclusive)
  health_plan_id UUID REFERENCES health_plans(id) ON DELETE CASCADE,
  client_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  
  -- Basic Info
  name VARCHAR NOT NULL,          -- Ex: "Unimed SP", "Particular - Desc 20%"
  description TEXT,
  
  -- Discount Configuration
  discount_percent NUMERIC(5,2) DEFAULT 0.00,
  discount_type VARCHAR DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage', 'fixed_amount', 'table_based')),
  discount_fixed_amount NUMERIC(10,2),
  discount_applies_to VARCHAR DEFAULT 'gross_value'
    CHECK (discount_applies_to IN ('gross_value', 'net_value')),
  discount_reason VARCHAR,
  
  -- ⚠️ TAX CONFIGURATION (per payer - overrides global defaults)
  pis_percent NUMERIC(5,2),           -- NULL = use default
  cofins_percent NUMERIC(5,2),
  csll_percent NUMERIC(5,2),
  ir_percent NUMERIC(5,2),
  issqn_percent NUMERIC(5,2),
  
  -- ⚠️ RETENTION/WITHHOLDING CONFIGURATION (per payer)
  retains_ist BOOLEAN,                -- ISS retido na fonte (source withholding)
  retains_ir BOOLEAN,                 -- IR retido (income tax withholding)
  retains_pis BOOLEAN,                -- PIS retido
  retains_cofins BOOLEAN,             -- COFINS retido
  
  -- Payment Configuration
  payment_method VARCHAR DEFAULT 'pix'
    CHECK (payment_method IN ('pix', 'boleto', 'ted', 'doc', 'dinheiro', 'cartao')),
  days_to_pay INT DEFAULT 0,          -- 0 = à vista (immediate)
  
  -- Special Requirements
  requires_pre_authorization BOOLEAN DEFAULT FALSE,
  requires_guide_number BOOLEAN DEFAULT FALSE,
  
  -- Value Limits
  minimum_value NUMERIC(10,2),
  maximum_value NUMERIC(10,2),
  
  -- Suspension
  suspended_at TIMESTAMP WITH TIME ZONE,
  suspension_reason VARCHAR,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT valid_health_plan CHECK (
    (payer_type = 'CONVENIO' AND health_plan_id IS NOT NULL) OR
    (payer_type = 'PARTICULAR' AND health_plan_id IS NULL)
  ),
  UNIQUE(clinic_id, payer_type, health_plan_id, client_id)
);

-- Indexes
idx_appointment_payer_rules_clinic_id (clinic_id)
idx_appointment_payer_rules_health_plan_id (health_plan_id)
```

---

### 2.8 TABLE: `professional_payers` (Professional-to-Payer Association)

**Links professionals to accepted payers/conventions.**

```sql
CREATE TABLE professional_payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES payers(id),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
idx_professional_payers_professional (professional_id)
```

---

### 2.9 TABLE: `service_prices` (Service Pricing by Convention)

**Stores service prices per convention/payer.**

```sql
CREATE TABLE service_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES payers(id),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  
  -- Pricing
  price DECIMAL(12,2),
  base_price DECIMAL(12,2),
  co_pay DECIMAL(12,2),
  
  -- Optional
  health_insurance_id UUID REFERENCES health_insurances(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
idx_service_prices_service (service_id)
idx_service_prices_payer (payer_id)
idx_service_prices_health_insurance (health_insurance_id)
idx_service_prices_service_health_insurance (service_id, health_insurance_id)
```

---

## 3. TABLE RELATIONSHIPS

### 3.1 Relationship Diagram

```
┌─────────────────┐
│    clinics      │
└────────┬────────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
    ┌────▼──────────────┐         ┌───────────▼────────┐
    │ health_insurances │         │    tax_config      │
    │ (Convenios)       │         │   (per clinic)     │
    └────┬──────────────┘         └────────────────────┘
         │                              
         │ (1:many relationship)        
         │                              
    ┌────▼──────────────────────┐
    │appointment_payer_rules    │
    │(Tax retention config)     │
    └────┬──────────────────────┘
         │
         │ (1:many)
    ┌────▼──────────────┐
    │   ar_invoices     │
    │ (Main financials) │
    └──────────────────┘
         ▲
         │ (FK: appointment_id)
    ┌────┴──────────────┐
    │  appointments     │
    └────┬──────────────┘
         │ (FK: patient_id)
         │
    ┌────▼──────────────┐
    │    patients       │
    │  (Customers)      │
    └──────────────────┘
```

---

## 4. TAX & RETENTION CONFIGURATION

### 4.1 Where Tax/Retention Information is Stored

| Field | Table | Purpose |
|-------|-------|---------|
| `tax_regime` | `tax_configurations` | Global regime (lucro_real, lucro_presumido, simples_nacional) |
| `pis_percent` / `pis_value` | `ar_invoices` | Per-invoice PIS tax |
| `cofins_percent` / `cofins_value` | `ar_invoices` | Per-invoice COFINS tax |
| `csll_percent` / `csll_value` | `ar_invoices` | Per-invoice CSLL tax |
| `ir_percent` / `ir_value` | `ar_invoices` | Per-invoice IR tax |
| `issqn_percent` / `issqn_value` | `ar_invoices` | Per-invoice ISS tax |
| `total_taxes` | `ar_invoices` | Sum of all taxes |
| **`retains_ir_on_health_plans`** | `tax_configurations` | ⚠️ **Global IR retention flag for conventions** |
| **`retains_ist_on_particulars`** | `tax_configurations` | ⚠️ **Global ISS retention flag for particulars** |
| **`retains_pis_on_particulars`** | `tax_configurations` | ⚠️ **Global PIS retention flag** |
| **`retains_ist`** | `appointment_payer_rules` | ⚠️ **Per-payer ISS retention override** |
| **`retains_ir`** | `appointment_payer_rules` | ⚠️ **Per-payer IR retention override** |
| **`retains_pis`** | `appointment_payer_rules` | ⚠️ **Per-payer PIS retention override** |
| **`retains_cofins`** | `appointment_payer_rules` | ⚠️ **Per-payer COFINS retention override** |

### 4.2 Retention Types (TI vs TIRF Concept)

- **TI (Imposto Retido na Fonte / ISS Source-Retained):** ISSQN tax withheld by the convention/payer
- **TIRF (IR/IR Retido na Fonte):** Income tax withheld by health plan
- **Configuration Level:** Both can be controlled globally (tax_configurations) OR per-payer (appointment_payer_rules)

---

## 5. INVOICES LINKAGE TO CONVENTIONS

### How Invoices Link to Conventions

**Direct Link Path:**

```
ar_invoices (appointment) 
    ↓ appointment_id
appointments (payer_id) 
    ↓ payer_id
payers OR health_insurances
```

**OR via payer_rule:**

```
ar_invoices 
    ↓ payer_rule_id
appointment_payer_rules 
    ↓ health_plan_id
health_insurances
```

### Query Example

```sql
-- Get invoice with convention details
SELECT 
  ai.id,
  ai.patient_name,
  ai.service_value,
  ai.total_taxes,
  ai.payer_type,
  apr.name as payer_rule_name,
  hi.name as health_insurance_name,
  apr.retains_ir,
  apr.retains_ist
FROM ar_invoices ai
LEFT JOIN appointment_payer_rules apr ON ai.payer_rule_id = apr.id
LEFT JOIN health_insurances hi ON apr.health_plan_id = hi.id
WHERE ai.clinic_id = $1;
```

---

## 6. MISSING CUSTOMER/CLIENT TABLE

**Status:** ❌ **No dedicated "customers" or "clients" table**

- **Instead, PATIENTS table serves dual role:**
  - Stores patient health records
  - Acts as customer for billing
  - Links to payer via `payer_id`

- **For businesses/organizations paying for services:**
  - Data would be stored in `patients` table with `organization_name`
  - Or extended with additional columns (not currently in schema)

---

## 7. API USAGE PATTERNS

### 7.1 List Health Insurances (Conventions)

```javascript
// From healthInsurancesApi.js
export async function listHealthInsurances(clinicId, options = {}) {
  return supabase
    .from('health_insurances')
    .select(`id, code, name, type, cnpj, active, ...`)
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .order('name', { ascending: true });
}
```

### 7.2 Query Invoices with Retention Info

```javascript
// From financeApi.js
export async function listAPQuery({ clinicId, ...filters }) {
  return supabase
    .from('ar_invoices')  // Main invoices table
    .select(`
      id, appointment_id, patient_name,
      payer_type, payer_id, payer_rule_id,
      service_value, total_taxes,
      pis_value, ir_value, issqn_value,
      retains_ir, retains_ist
    `)
    .eq('clinic_id', clinicId)
    .range(offset, offset + limit - 1);
}
```

---

## 8. SUMMARY TABLE

| Aspect | Table | Key Columns |
|--------|-------|------------|
| **Conventions** | `health_insurances` | id, code, name, type, cnpj, active |
| **Tax Config** | `tax_configurations` | tax_regime, default_*_percent, retains_* |
| **Payer Rules** | `appointment_payer_rules` | payer_type, health_plan_id, discount_*, retains_* |
| **Customers** | `patients` | id, name, email, phone, payer_id |
| **Invoices** | `ar_invoices` | id, appointment_id, payer_id, pis_value, ir_value, issqn_value, total_taxes |
| **Service Pricing** | `service_prices` | service_id, payer_id, price, active |

---

## 9. EXISTING RETENTION/TAX CONFIGURATION FIELDS ✅

### Already in Database:

✅ **Individual Tax Components:**
- `pis_percent`, `pis_value`
- `cofins_percent`, `cofins_value`
- `csll_percent`, `csll_value`
- `ir_percent`, `ir_value`
- `issqn_percent`, `issqn_value`

✅ **Retention Flags:**
- `retains_ist_on_particulars` (ISS source retention for individuals)
- `retains_ir_on_health_plans` (IR source retention for health plans)
- `retains_pis_on_particulars`
- `retains_ist` (per-payer ISS retention)
- `retains_ir` (per-payer IR retention)
- `retains_pis` (per-payer PIS retention)
- `retains_cofins` (per-payer COFINS retention)

✅ **Tax Regime:**
- `tax_regime` (enum: lucro_real, lucro_presumido, simples_nacional)

---

## 10. NEXT STEPS

To fully implement tax retention/TIRF management:

1. **Populate** `tax_configurations` with clinic defaults
2. **Create** `appointment_payer_rules` for each convention with retention settings
3. **Use** `payer_rule_id` in `ar_invoices` for per-invoice retention logic
4. **Calculate** taxes based on `retains_*` flags when generating invoices
5. **Report** retained amounts separately in financial dashboards

---

**Document Generated:** May 21, 2026  
**Database Version:** v2.0 (ETAPA 1-12 Complete)  
**Status:** ✅ Production Ready
