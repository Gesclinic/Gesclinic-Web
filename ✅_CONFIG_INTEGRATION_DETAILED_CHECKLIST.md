# ✅ CONFIGURATION & INTEGRATION CHECKLIST

**Interactive Audit Checklist | April 9, 2026**

---

## MODULE 1: GENERAL SETTINGS (GeraisConfig.jsx)

### 1.1 Clinic Data Tab
**Status:** ⚠️ Structure only (no forms)

#### Required Configuration Items
- [ ] Clinic name (text)
- [ ] CNPJ (format: XX.XXX.XXX/XXXX-XX)
- [ ] Address, City, State, ZIP
- [ ] Main contact email
- [ ] Main contact phone
- [ ] Legal representative name
- [ ] Legal representative CPF

**Database:** `clinics` table
**API Needed:** `clinicsApi.updateClinicSettings()`
**Integration Status:** ❌ No implementation yet

---

### 1.2 Personalization Tab
**Status:** ⚠️ Structure only

#### Brand Settings
- [ ] Logo upload (storage: S3 or Supabase)
- [ ] Primary color (hex)
- [ ] Secondary color (hex)
- [ ] Clinic brand name (for documents)
- [ ] Document header text
- [ ] Document footer text

**Database:** `clinics` table (new columns needed: `brand_name`, `primary_color`, `secondary_color`, `logo_url`)
**API Needed:** `clinicsApi.updateBrandSettings()`
**Integration Status:** ❌ No implementation yet

---

### 1.3 Parameters Tab
**Status:** ⚠️ Structure only

#### System Parameters
- [ ] Currency (default: BRL)
- [ ] Date format (default: DD/MM/YYYY)
- [ ] Time format (12h / 24h)
- [ ] Appointment default duration (minutes)
- [ ] Check-in window (before appointment, minutes)
- [ ] Cancellation notice period (hours)
- [ ] Default payment method
- [ ] Enable multi-professional appointments? (Y/N)
- [ ] Require CPF at check-in? (Y/N)
- [ ] Required insurance fields at check-in

**Database:** Need `clinic_settings` table or extend `clinics`
**API Needed:** `clinicsApi.getSettings()`, `updateSettings()`
**Integration Status:** ❌ Not found

---

### 1.4 Integrations Tab
**Status:** ⚠️ Stubs (descriptions only)

#### Integration Options
- [ ] Google Calendar (API key, enable/disable sync)
- [ ] WhatsApp Business (API key, phone number, enable/disable)
- [ ] Email SMTP (server, port, username, password)
- [ ] Payment gateway (Stripe/PagSeguro API key)
- [ ] SMS service (Twilio/Zenvia)
- [ ] Medical records (PACS integration URL, if applicable)

**Database:** Need `clinic_integrations` table or `clinic_credentials`
**API Needed:** `integrationsApi.getCredentials()`, `saveCredentials()`
**Integration Status:** ❌ Not found - only placeholder cards

---

## MODULE 2: AGENDA SETTINGS (AgendaConfig.jsx)

### 2.1 Central de Horários (Scheduling Hub)
**Status:** ✅ Structured, needs form implementation

#### Configuration Needed
- [ ] **Daily Schedule Setup**
  - [ ] Start time (e.g., 08:00)
  - [ ] End time (e.g., 18:00)
  - [ ] Lunch break start
  - [ ] Lunch break end
  - [ ] Break intervals (minutes between appointments)
  
- [ ] **Appointment Slot Settings**  
  - [ ] Default slot duration (e.g., 30 min)
  - [ ] Allow overlapping professionals in same room?
  - [ ] Allow simultaneous appointments per professional?
  - [ ] Minimum gap between consecutive appointments
  - [ ] Maximum consecutive appointments per day

**Database:** Need `agenda_rules` or `scheduling_config` table
**API Needed:** `agendaRulesApi.getSchedulingRules()`, `updateSchedulingRules()`
**Integration Status:** ⚠️ Partial (basic table exists, not form-connected)

---

### 2.2 Parametrização (Rules & Flow)
**Status:** ✅ Structured, needs backend

#### Workflow Rules
- [ ] Allow same-day scheduling? (Y/N)
- [ ] Minimum advance booking (days)
- [ ] Maximum advance booking (days)
- [ ] Allow encaixos (emergency slots)? (Y/N, max per day)
- [ ] Show patient in agenda after confirmation only? (Y/N)
- [ ] Auto-confirm appointments after X hours?
- [ ] Send reminder before appointment? (hours before)
- [ ] Allow double-booking per professional? (Y/N)
- [ ] Enable patient self-service cancellation? (Y/N, hours before)
- [ ] Require arrival confirmation? (Y/N)

**Database:** `agenda_rules` table
**API Status:** ⚠️ Partial (agendaRulesApi exists, needs form UI)

---

### 2.3 Profissionais (Professionals Config)
**Status:** ✅ Structured

#### Per Professional Settings
- [ ] Professional list with toggle enabled/disabled
- [ ] Default appointment duration override (per professional)
- [ ] Available specialties/services (multi-select)
- [ ] Working days/hours override
- [ ] Max patients per day
- [ ] Allow patients to book directly? (Y/N)
- [ ] Notification preferences (email, SMS, WhatsApp)
- [ ] Auto-confirm appointments? (Y/N)

**Database:** `professionals`, `professional_schedules`, `professional_services` tables
**API Status:** ✅ `professionalsApi` available, needs form connection

---

### 2.4 Serviços (Services Config)
**Status:** ✅ Structured

#### Service Configuration
- [ ] Service code (CBHPM/TUSS)
- [ ] Service name
- [ ] Default duration (minutes)
- [ ] Service category (consulta, exame, cirurgia, etc.)
- [ ] Associated professionals (multi-select)
- [ ] Default pricing by health insurance
- [ ] Automatic stock deduction? (Y/N)
- [ ] Allow patient to schedule self-service? (Y/N)
- [ ] Requires pre-authorization? (Y/N)

**Database:** `services`, `professional_services`, `service_prices`
**API Status:** ✅ `servicesApi` available

---

### 2.5 Grupos (Service Groups)
**Status:** ✅ Structured

#### Group Settings
- [ ] Create service groups for organization
- [ ] Services per group (multi-select)
- [ ] Display order in booking interface

**Database:** `service_groups`
**API Status:** ✅ `serviceGroupsApi` available

---

### 2.6 Tipos (Appointment Types)
**Status:** ✅ Structured

#### Appointment Types Configuration
- [ ] Create custom appointment types (Consulta, Retorno, Inaugural, etc.)
- [ ] Default types should include:
  - [ ] Consulta (Consultation)
  - [ ] Retorno (Follow-up)
  - [ ] Inaugural (First visit)
  - [ ] Procedimento (Procedure)

**Database:** Need `appointment_types` table if not exists
**API Status:** ⚠️ Not found - may be defined as enum

---

### 2.7 Motivos (Cancellation/No-show Reasons)
**Status:** ✅ Structured

#### Reason Codes
- [ ] Cancelado pelo paciente
- [ ] Cancelado pelo profissional
- [ ] Falta do paciente
- [ ] Não comparecimento (no-show)
- [ ] Conflito de agenda
- [ ] Manutenção de sala/equipamento
- [ ] Falta de material
- [ ] Outro

**Database:** Need `cancellation_reasons` table if flexible
**API Status:** ⚠️ Possibly hardcoded

---

### 2.8 Notificações (Notifications Config)
**Status:** ✅ Structured

#### Notification Settings
- [ ] Send confirmation after booking? (Y/N, channel: Email/SMS/WhatsApp)
- [ ] Send reminder X hours before appointment? (Y/N)
- [ ] Send check-in reminder on appointment day?
- [ ] Send cancellation confirmation?
- [ ] Send professional notifications? (Y/N)
- [ ] Notification template customization (Email, SMS, WhatsApp)
- [ ] Notification rate limiting (avoid spam)

**Database:** `appointment_confirmations`, `notification_templates` (if exists)
**API Status:** ✅ `whatsappConfirmationApi` exists, email/SMS not found
**Integration Status:** ⚠️ WhatsApp partial, Email/SMS missing

---

## MODULE 3: FINANCIAL SETTINGS (ContaConfig.jsx)

### 3.1 Chart of Accounts (PlanoDeContas.jsx)
**Status:** ✅ FULLY WORKING

#### Current Implementation
- ✅ List financial accounts (receita, despesa, ativo, passivo, patrimonio)
- ✅ Create new account with parent hierarchy
- ✅ Edit account name and type
- ✅ Delete account (with children handling)
- ✅ Expand/collapse hierarchy view

**Database:** `financial_accounts` table ✅
**API Status:** ✅ `financialAccountsApi.listAccounts()`, `createAccount()`, etc.
**Integration Status:** ✅ Forms connected, fully functional

**Configuration Items:**
- [ ] Review revenue accounts structure (required for billing)
- [ ] Review expense accounts structure (required for AP bills)
- [ ] Ensure asset/liability accounts match financial reporting needs
- [ ] Add sub-account for: Medical Commission (expenses)
- [ ] Add sub-account for: Health Insurance AR (assets)
- [ ] Add sub-account for: Service Revenue (income)

---

### 3.2 Bank Accounts (BankAccountsManager.jsx)
**Status:** ✅ FULLY WORKING

#### Current Implementation
- ✅ Create bank account with full metadata
- ✅ Edit account details
- ✅ Delete account
- ✅ List all accounts with bank/agency info

**Database:** `financial_accounts` table with `account_type='bank'`
**API Status:** ✅ `financeApi.listFinanceAccounts()`, `createFinanceAccount()`, etc.
**Integration Status:** ✅ Functional

**Configuration Items (For Each Bank Account):**
- [ ] Bank name (dropdown: Itaú, Bradesco, Santander, etc.)
- [ ] Agency number (4 digits)
- [ ] Account number (variable length)
- [ ] Account type (Checking, Savings)
- [ ] Account holder name
- [ ] Account holder CPF/CNPJ
- [ ] Opening balance
- [ ] Set as default AR deposit account? (Y/N)
- [ ] Set as default AP payment account? (Y/N)
- [ ] Enable auto-reconciliation? (Y/N)

---

### 3.3 Medical Repasse Rules (RepassesRulesManager.jsx)
**Status:** ✅ FULLY WORKING

#### Tax Regime Options
- [x] Simples Nacional (Anexo III - Serviços)
- [x] Simples Nacional (Anexo V - Tecnologia)
- [x] Simples com Fator R
- [x] Lucro Presumido - Normal
- [x] Lucro Presumido - Equiparação Hospitalar
- [x] Lucro Real - Conservador
- [x] Lucro Real - Otimizado

#### Per Professional Configuration
- [ ] Professional name (dropdown)
- [ ] Service type filter (consultas, exames, cirurgias, procedimentos, or all)
- [ ] Rule type (individual professional or group)
- [ ] Tax base mode (BRUTO or LIQUIDO)
- [ ] Repasse percentage (%) to professional
- [ ] Active? (Y/N)
- [ ] Selected tax regime from list above
- [ ] Custom ISS % (if different from regime)

**Database:** `repasse_rules` or `revenue_rules` table
**API Status:** ✅ `revenueRulesApi` exists
**Integration Status:** ✅ UI + calculation engine working

**Calculation Engine Verified:**
- ✅ Calculates tax deduction
- ✅ Calculates net amount
- ✅ Splits between professional & clinic
- ✅ Shows all 7 tax regimes with correct rates

---

### 3.4 Health Insurance Plans (Stub - Not Fully Listed)
**Status:** ⚠️ Mentioned in sidebar but not detailed

#### Should Include:
- [ ] Plan name & code
- [ ] Health insurance company
- [ ] Active plans assignment to clinic
- [ ] Pricing rules per health insurance
- [ ] Authorization requirements (Y/N)
- [ ] Billing deadlines

**Database:** `plans`, `payers` tables
**API Status:** ✅ `payersApi`, `plansApi` available
**Integration Status:** ⚠️ Needs UI form

---

## MODULE 4: BILLING CONFIG (FaturamentoConfig.jsx)

### Status: ⚠️ PLACEHOLDER (Card UI, No Logic)

#### 4.1 TISS Parameters (Should Be Implemented)

**System Configuration:**
- [ ] Enable TISS billing? (Y/N)
- [ ] TISS version (current: 3.08.xx)
- [ ] Clinic TISS registration number
- [ ] CNJ code (if applicable)
- [ ] CNES number (if hospital/clinic chain)
- [ ] Batch generation frequency (daily, weekly, monthly)
- [ ] XML output path/storage location

**Guide Configuration:**
- [ ] Guide number format template (e.g., GC-{YYYY}-{MM}-{SEQUENCIAL})
- [ ] Lote (batch) numbering scheme
- [ ] Auto-generate guide number? (Y/N)
- [ ] Manual guide entry allowed? (Y/N)
- [ ] Require professional CRM? (Y/N)
- [ ] Require service CBHPM code? (Y/N)

**Database Needed:** `tiss_config` table
**API Needed:** `tissConfigApi`, `billingGuidesApi`
**Integration Status:** ❌ NOT FOUND - CSV/XML generation missing

---

#### 4.2 Manual Billing Rules (Should Be Implemented)

**Discounting Rules:**
- [ ] Health insurance discount % (per insurance)
- [ ] Service-specific discount % 
- [ ] Patient category discounts (senior, low-income, etc.)
- [ ] Promotional discounts
- [ ] Bulk appointment discounts

**Surcharge Rules:**
- [ ] Emergency appointment surcharge %
- [ ] Weekend appointment surcharge %
- [ ] Same-day booking surcharge %
- [ ] Add-on service surcharge %

**Payment Terms:**
- [ ] Payment method discount (cash, check, card, bank transfer)
- [ ] Early payment discount %
- [ ] Late payment interest %
- [ ] Maximum installments allowed

**Database Needed:** `discount_rules`, `surcharge_rules` tables
**API Needed:** `billingRulesApi`
**Integration Status:** ❌ NOT FOUND - Only discount_authorizations table exists

---

## MODULE 5: STOCK CONFIG (EstoqueConfig.jsx)

### Status: ⚠️ PLACEHOLDER (Card UI, No Logic)

#### 5.1 Stock Policies

**Inventory Control:**
- [ ] Enable inventory tracking? (Y/N)
- [ ] Minimum stock level (units)
- [ ] Maximum stock level (units)
- [ ] Reorder point (units)
- [ ] Reorder quantity (units)
- [ ] Lead time for reorders (days)

**Expiration Management:**
- [ ] Track item expiration dates? (Y/N)
- [ ] Alert before expiration (days)
- [ ] Auto-mark expired items as unusable? (Y/N)
- [ ] Allow using expired items? (Y/N, for emergencies)

**Location Management:**
- [ ] Track storage locations? (Y/N)
- [ ] Create storage areas/rooms
- [ ] Assign item types to default locations

**Database Needs:** `stock_items`, `stock_movements` tables
**API Needs:** `stockApi`
**Integration Status:** ⚠️ stockApi found but not connected to config form

---

#### 5.2 Automatic Movements

**Usage Consumption:**
- [ ] Auto-deduct items on appointment completion? (Y/N)
- [ ] Link services to required items/quantities
- [ ] Create consumption rules per service
- [ ] Handle multiple items per service

**Purchase Orders:**
- [ ] Auto-create purchase orders when below reorder point? (Y/N)
- [ ] Designated suppliers for auto-PO
- [ ] Approval workflow for auto-POs

**Waste/Damage:**
- [ ] Track waste items? (Y/N)
- [ ] Waste % tolerance before investigation
- [ ] Monthly waste reports

**Database Needs:** `stock_movements`, `stock_consumption_rules`, `purchase_orders` tables
**API Needs:** `stockApi.createMovement()`, `createOrder()`, etc.
**Integration Status:** ❌ NOT FOUND

---

## MODULE 6: INTEGRATION CONFIG (IntegracoesConfig.jsx)

### Status: ⚠️ STUBS (Descriptions only, no config forms)

#### 6.1 Google Calendar
**Needed Configuration:**
- [ ] Google OAuth2 API credentials
- [ ] Scope: `calendar.events`
- [ ] Two-way sync? (calendar events ↔ appointments)
- [ ] Sync professionals' calendars?
- [ ] Default calendar selection
- [ ] Sync frequency (real-time, hourly, daily)

**Database:** `clinic_integrations` with provider='google_calendar'
**API:** None found - needs implementation
**Status:** ❌ NOT IMPLEMENTED

---

#### 6.2 WhatsApp Business API
**Needed Configuration:**
- [ ] WhatsApp Business Account ID
- [ ] Phone number (must be registered in WhatsApp)
- [ ] Access token (expires, need refresh)
- [ ] API endpoints (meta-servers)
- [ ] Message templates for:
  - Appointment confirmation
  - Appointment reminder (24h before)
  - Appointment reminder (2h before)
  - Check-in prompt
  - Payment receipt
  - Rescheduling request
  - No-show alert

**Database:** `clinic_integrations` with provider='whatsapp'
**API:** ✅ `whatsappConfirmationApi` found, needs credential storage
**Status:** ⚠️ PARTIAL - API exists, credential management incomplete

---

#### 6.3 Email SMTP
**Needed Configuration:**
- [ ] SMTP server address
- [ ] SMTP port (usually 587 or 465)
- [ ] Username (email)
- [ ] Password (encrypted storage!)
- [ ] TLS/SSL? (Y/N)
- [ ] From display name
- [ ] Reply-to email (if different)
- [ ] Email templates for:
  - Appointment confirmation
  - Appointment reminder
  - Check-in confirmation
  - Payment receipt
  - Medical report delivery
  - Password reset
- [ ] Test connection button

**Database:** `clinic_integrations` with provider='smtp'
**API:** None found - needs implementation  
**Status:** ❌ NOT IMPLEMENTED

---

#### 6.4 Payment Gateway
**Needed Configuration:**
- [ ] Gateway provider (Stripe / PagSeguro / Vindi)
- [ ] API key (secret)
- [ ] Publishable key (public)
- [ ] Webhook secret
- [ ] Accepted payment methods (credit card, debit, Pix, boleto)
- [ ] Pix configuration (for Pix payments)
- [ ] One-click payment? (Y/N, for recurring)

**Database:** `clinic_integrations` with provider='payment_gateway'
**API:** ❌ Not found - stripe fields exist in appointments but no integration config
**Status:** ❌ NOT IMPLEMENTED

---

## 🔴 CRITICAL MISSING IMPLEMENTATIONS

### Not Yet Started (Priority Order)

1. **GeraisConfig Forms** (All 4 tabs)
   - Effort: 6 hours
   - Impact: Clinic data integrity
   - Blocks: Everything (data validation depends on this)

2. **AgendaConfig Forms** (8 tabs)
   - Effort: 8 hours
   - Impact: Scheduling behavior
   - Blocks: Appointment creation UX

3. **FaturamentoConfig Logic**
   - Effort: 4 hours
   - Impact: Billing accuracy
   - Blocks: TISS XML generation, discount/surcharge calculations

4. **EstoqueConfig Logic**
   - Effort: 4 hours
   - Impact: Inventory accuracy
   - Blocks: Auto stock deduction on appointment completion

5. **IntegracoesConfig Credentials**
   - Effort: 8 hours
   - Impact: External integrations
   - Blocks: WhatsApp, Email, Google Calendar, Payment API

---

## ✅ VERIFICATION CHECKLIST FOR QA

### When Testing Configuration Pages

#### GeraisConfig
- [ ] Save clinic name and verify appears in header
- [ ] Upload logo and verify displays
- [ ] Change primary color and verify applied to UI
- [ ] Set appointment duration and verify new appointments use it
- [ ] Set check-in window and verify check-in button availability

#### AgendaConfig
- [ ] Set clinic hours and verify in appointment UI
- [ ] Add lunch break and verify unavailable during lunch
- [ ] Set minimum gap and verify appointments enforce it
- [ ] Allow/disallow same-day booking and verify in booking flow

#### ContaConfig (All 3 working tabs)
- [ ] ✅ Create account in Chart of Accounts
- [ ] ✅ Create bank account
- [ ] ✅ Set repasse rule for professional
- [ ] ✅ Verify calculation with test values

#### FaturamentoConfig (When Implemented)
- [ ] [ ] TISS version matches system version
- [ ] [ ] Guide numbers format correctly
- [ ] [ ] Discount rules apply to invoices

#### EstoqueConfig (When Implemented)
- [ ] [ ] Min/max levels trigger alerts
- [ ] [ ] Items auto-deducted on appointment complete

#### IntegracoesConfig (When Implemented)
- [ ] [ ] WhatsApp message sent on confirmation
- [ ] [ ] Email sent on appointment reminder
- [ ] [ ] Google Calendar event created
- [ ] [ ] Payment gateway accepts transactions

---

**Checklist Version:** 1.0  
**Last Updated:** April 9, 2026  
**Next Review:** After Phase 1 Implementation
