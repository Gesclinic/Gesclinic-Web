# Gesclinic Financeiro Module - Comprehensive Audit Report

**Report Generated:** April 9, 2026  
**Scope:** Financial (Financeiro) module - Accounts Payable, Receivable, Cash Flow, Chart of Accounts, DRE, Cost Centers, Conciliation, Automation  
**Status:** Production Build with Integration Gaps  

---

## 📋 EXECUTIVE SUMMARY

The Financial module is **70% implemented and functionally active** with core operations (AP, AR, cash flow) working. However, **critical automation gaps exist** in integration between appointments, medical repasse, and financial recording. Manual workflows are required for receivables creation and automated financial data capture.

| Category | Status | Notes |
|----------|--------|-------|
| **AP (Contas a Pagar)** | ✅ Fully Working | Complete CRUD, recurring support, split payments |
| **AR (Contas a Receber)** | ⚠️ Partial | Manual entry only, no auto-sync from appointments |
| **Cash Flow** | ✅ Fully Working | Summary RPC, manual entries, account transfers |
| **Chart of Accounts** | ✅ Working | Hierarchical structure, type categorization |
| **DRE Dashboard** | ⚠️ Partial | Mock data, needs real transaction data |
| **Cost Centers** | ✅ Working | CRUD implemented, types: assistencial/administrativo/comercial |
| **Bank Conciliation** | ✅ Core Ready | Import, matching, suggestions (hook-based) |
| **Automation Engine** | ⚠️ Stub | NFe emission and payment gateway stubs only |

---

## 1. PAGES & VIEWS INVENTORY

### 1.1 Main Financial Pages (17 total)

#### **Accounts Payable (Contas a Pagar)**
- **Path:** `/clinica/financeiro/pagar`
- **File:** `ContasPagar.jsx`
- **Features:**
  - List AP bills with status, vendor, category, amount, due date
  - Expandable rows for vendor details
  - Bulk selection and batch operations
  - Filters: status, vendor, category, date range, amount
  - Quick actions: Edit, Delete, Mark as paid
  - Summary cards: Total, Overdue, Paid Amount
- **Status:** ✅ Production Ready

#### **New Account Payable (Nova Conta)**
- **Path:** `/clinica/financeiro/pagar/nova`
- **File:** `NovaConta.jsx`
- **Features:**
  - Vendor selection with new vendor creation
  - Due date with payment term templates (15/30/45/60/90 days)
  - Installment support with auto-date calculation
  - Recurring AP setup (frequency: monthly/quarterly/yearly)
  - Line items (stock products) with NF tax calculation
  - Tax fields: IR, CSLL, PIS/COFINS, ISS, ICMS
  - Document upload capability
  - Linked invoice support (for repasse vitamin)
- **Supported Fields:**
  - Basic: vendor_name, description, due_date, amount, notes, payment_method
  - Optional: installments, document_number, document_url
  - Tax: ir_pct, csll_pct, pis_cofins_pct, iss_pct, icms_pct, taxes_retained
  - Links: repasse_doctor_name, linked_invoice_id, linked_service, linked_revenue
- **Status:** ✅ Production Ready

#### **Edit Account Payable (Editar Conta)**
- **Path:** `/clinica/financeiro/pagar/:id/editar`
- **File:** `EditarConta.jsx`
- **Features:** Same as Nova Conta but with pre-filled form data
- **Status:** ✅ Production Ready

#### **Accounts Receivable (Contas a Receber)**
- **Path:** `/clinica/financeiro/receber`
- **File:** `ContasReceber.jsx`
- **Features:**
  - List AR records with status, payer, origin, invoice date, due date, amount
  - Comprehensive filtering: payer, payer_type, status, origin, professional, cost center, date ranges
  - Manual payment recording (single/partial payment)
  - Multi-status support: open, planned, received, partial, overdue, canceled, glossed
  - Summary: Total, Received, Pending, Overdue amounts
- **Status:** ⚠️ Functional but **no auto-sync from appointments**

#### **New Receivable (Novo Recebimento)**
- **Path:** `/clinica/financeiro/receber/novo`
- **File:** `NovoRecebimento.jsx`
- **Features:**
  - Manual AR creation (NOT from appointment finalization)
  - Payer selection: paciente, convenio, empresa
  - Origin options: Manual, Billing, Appointment, etc.
  - Installment support with date/amount calculation
  - Professional and cost center assignment
  - Status: open, planned, received
- **Status:** ⚠️ Manual entry only; **needs appointment auto-sync**

#### **Edit Receivable (Editar Recebimento)**
- **Path:** `/clinica/financeiro/receber/:id/editar`
- **File:** `EditarRecebimento.jsx`
- **Status:** ✅ Production Ready

#### **Cash Flow (Fluxo de Caixa)**
- **Path:** `/clinica/financeiro/fluxo-caixa`
- **File:** `FluxoCaixa.jsx`
- **Features:**
  - Summary: Inflows, outflows, net result, final balance
  - Filters: Date range, category, cost center, account, transaction type
  - Manual entry dialog for cash transactions (type: entrada/saída)
  - Account-to-account transfer dialog
  - Initial balance management (localStorage-based)
  - Cache-based loading (15-min TTL for metadata)
  - RPC: `cashflow_summary(clinic_id, start, end)` for aggregates
- **Status:** ✅ Production Ready (manual + RPC aggregate)

#### **Chart of Accounts (Plano de Contas)**
- **Path:** `/clinica/financeiro/plano-contas`
- **File:** `PlanoContas.jsx`
- **Features:**
  - Hierarchical account tree (parent-child relationships)
  - Types: receita, despesa, deducao, custo, investimento, ajuste
  - CRUD operations (Create, Edit, Delete accounts)
  - Preset templates (seed data via `applyDefaultAccountPlan()`)
  - Color-coded by type
  - Parent account filtering for leaf-only entries
- **Status:** ✅ Production Ready

#### **DRE Dashboard (Dashboard DRE)**
- **Path:** `/clinica/financeiro/dre`
- **File:** `DashboardDRE.jsx`
- **Features:**
  - Period selection: Current month / Previous month
  - DRE calculation: Revenue → Net revenue → Costs → Margin → Expenses → EBITDA → Net profit
  - Charts: Bar (revenue/expenses), Line (trend), Pie (composition)
  - Metrics: Gross margin %, EBITDA %, Net profit %
  - Icons: Trending indicators
- **Current State:** Uses **mock data** (getMockDRE())
- **Missing:** Real transaction data aggregation
- **Status:** ⚠️ UI Ready but **no real data connection**

#### **Financial Dashboard (Dashboard Financeiro)**
- **Path:** `/clinica/financeiro`
- **File:** `DashboardFinanceiro.jsx`
- **Features:**
  - Tab-based dashboard: Financeiro, Atendimentos, Faturamento, Estoque, Repasses, Orçamentos
  - KPI cards: Entries, exits, net result, final balance
  - Period selector with date navigation
  - Sub-dashboards: DashboardAtendimentos, DashboardFaturamento, etc.
  - Cache-based KPI loading (5-min TTL)
  - RPC: `cashflow_summary()` for aggregates
- **Status:** ✅ Functional

---

### 1.2 Medical Repasse Pages (4 total)

These are technically part of Financial module but link to Appointments.

#### **Medical Repasse (Repasse Médico)**
- **Path:** `/clinica/financeiro/repasse-medico`
- **File:** `RepasseMedico.jsx`
- **Features:**
  - Month/Year selector
  - Mode selection: "atendido" (charged) vs. other modes
  - Commission list: Professional name, gross amount, deductions, net repasse
  - Excel export capability
  - Bulk actions: approve, block, pay
- **Integration:** Reads from `doctor_commissions` table (monthly aggregates)
- **Status:** ✅ Functional

#### **Repasse Dashboard (Repasse Dashboard)**
- **Path:** `/clinica/financeiro/repasse-dashboard`
- **File:** `RepasseDashboard.jsx`
- **Features:** Summary KPIs for medical repasse by professional
- **Status:** ✅ Functional

#### **Repasse Config (Repasse Config)**
- **Path:** `/clinica/financeiro/repasse-config`
- **File:** `RepasseConfig.jsx`
- **Features:** Professional repasse rules configuration (percentage, fixed value, minimum/maximum)
- **Status:** ✅ Functional

#### **Repasse History (Repasse Histórico)**
- **Path:** `/clinica/financeiro/repasse-historico`
- **File:** `RepasseHistorico.jsx`
- **Features:** Historical log of repasse generations and payments
- **Status:** ✅ Functional

---

### 1.3 Cost Center Pages (7 total, in `custos/` folder)

#### **Cost Center Layout (CentroCustosLayout.jsx)**
- Wrapper layout for cost center sub-routes
- Status:** ✅ Functional

#### **Cadastro (Cadastro.jsx)** - Create/Edit
- **Features:** Cost center CRUD (name, type, category, parent, notes)
- **Types:** Assistencial, Administrativo, Comercial
- **Category:** Receita, Custo, Despesa
- **Status:** ✅ Functional

#### **Vinculações (Vinculacoes.jsx)** - Link to Financial Accounts
- Link cost centers to chart of accounts
- **Status:** ✅ Functional

#### **Rateio (Rateio.jsx)** - Allocation/Distribution
- Distribute costs across cost centers
- **Status:** ✅ Functional

#### **Hierarquia (Hierarquia.jsx)** - Parent-Child Structure
- Manage cost center hierarchy
- **Status:** ✅ Functional

#### **Overview (Overview.jsx)** - Dashboard
- Cost center summary with totals
- **Status:** ✅ Functional

#### **Análises (Analises.jsx)** - Analysis & Reports
- Cost center analytics and trends
- **Status:** ✅ Functional

#### **Config (Config.jsx)** - Settings
- Global cost center configuration
- **Status:** ✅ Functional

---

### 1.4 Conciliation & Automation Pages

#### **Bank Conciliation (Conciliação Bancária)**
- **Path:** `/clinica/financeiro/conciliacao`
- **File:** `ConciliacaoBancaria.jsx`
- **Features:**
  - Import bank statements (OFX/CSV)
  - Automatic matching with AP/AR entries
  - Suggestions engine (scoring-based)
  - Manual reconciliation and divergence marking
  - Bulk conciliation actions
  - Indicators: Total, Reconciled, Unreconciled, Divergent
- **Status:** ✅ Core ready, suggestions functional via `useConciliation()` hook

#### **Financial Automation (Automação Financeira)**
- **Path:** `/clinica/financeiro/automacao`
- **File:** `AutomacaoFinanceira.jsx`
- **Features:**
  - NFe emission button (calls `nfe-emit` edge function)
  - Payment gateway button (calls `payment-gateway` edge function)
  - Test mode - static test UUIDs
- **Current State:** **Stubs only**, no real implementation
- **Missing:** Full NFe issuance, payment processing, webhooks
- **Status:** ⚠️ **NOT production ready**

---

## 2. API FUNCTIONS INVENTORY

### 2.1 financeApi.js - 28 Exported Functions

#### **Accounts Payable (AP) - 9 functions**
```
✅ listAP({ clinicId, statusText, limit, offset })
   → RPC call to list_ap_bills with status normalization

✅ listAPQuery({ clinicId, statusText/statusList, vendor, paymentMethod, 
              start, end, search, amountMin/Max, categoryId, orderBy, limit, offset })
   → Direct query with comprehensive filters; uses ap_bills_with_category view if ordering by category

✅ createAP(clinicId, payload)
   → Insert AP with fallback for optional columns (installments, payment_method, document_url)
   → Includes ap_items insert for line items if provided
   → Validates category_id is leaf node (has parent_id)

✅ updateAP(id, patch)
   → Update with status normalization and optional column fallback
   → Handles missing columns gracefully, retry without optional fields

✅ deleteAP(id)
   → Soft or hard delete (implementation: hard delete)

✅ updateAPBulk(ids, patch)
   → Batch update multiple AP bills

✅ deleteAPBulk(ids)
   → Batch delete multiple AP bills

✅ payAccountsPayableBatch(ids, paymentDateISO, paymentMethod)
   → RPC: pay_accounts_payable_batch() - marks bills as paid in batch

✅ getAPById(id)
   → Fetch single AP record by ID
```

**Status Normalization:** 'open'|'em aberto'|'pendente'|'aberto' → 'open', etc.

#### **Accounts Receivable (AR) - 1 function (legacy)**
```
✅ listAR({ clinicId, start, end, status })
   → Legacy: queries invoices table (not ar_receivables)
   → Maps: patient name, due date, amount, status
```

#### **AP Items - 3 functions**
```
✅ listAPItems(apBillId)
   → Get line items for an AP bill

✅ replaceAPItems(apBillId, clinicId, items)
   → Replace all items for an AP (delete old, insert new)

✅ createRecurringAP(clinicId, payload)
   → Create recurring AP rule (monthly/quarterly/yearly)
   → Stores in recurring_accounts_payable table
   → Gracefully fails if table doesn't exist (no-op)
```

#### **Reference Data - 4 functions**
```
✅ listAccountPlans(clinicId)
   → Chart of accounts hierarchy

✅ listCostCenters(clinicId)
   → Cost centers for clinic

✅ listFinanceAccounts(clinicId)
   → Bank/finance accounts (tries finance_accounts, fallback to bank_accounts)

✅ listPaymentMethods(clinicId)
✅ listVendorNames(clinicId)
   → Distinct values from ap_bills table (deduped seen set)

✅ listInvoicesBasic(clinicId, { limit })
   → Basic invoice list for linking (formatted as {id, label, total, due_date})

✅ createFinanceAccount(clinicId, payload)
✅ updateFinanceAccount(accountId, payload)
✅ deleteFinanceAccount(accountId)
   → CRUD for finance_accounts table
```

#### **Cash Flow & Summary - 2 functions in financeApi (others via RPC)**
```
❓ listCashFlow() - NOT FOUND in financeApi.js
   → May be RPC-only: cashflow_summary()

❓ createCashFlowManual() - NOT FOUND in financeApi.js
   → FluxoCaixa.jsx calls this but it's undefined - likely bug

❓ transferCashFlow() - NOT FOUND in financeApi.js
```

---

### 2.2 receivablesApi.js - 6 Exported Functions

```
✅ listReceivables({ clinicId, payer, payerType, professionalId, status, statusList,
                   origin, ccId, planId, emissionStart/End, dueStart/End, 
                   receivedStart/End, search, limit, offset })
   → Queries ar_receivables table with comprehensive filters
   → Debug logging: prints all records first, then filtered results
   → Status normalization: open, planned, received, partial, overdue, canceled, glossed
   → Payer type filters: paciente (paciente_id IS NOT NULL), convenio, empresa
   → Origin filter on origem column

✅ createReceivable(clinicId, payload)
   → Insert single or multiple parcelado (installment) records
   → Auto-generates grupo_parcelamento_id for installments
   → Monthly date increment for installments
   → Calls logReceivableCreated() for audit trail
   → Returns first parcel on parcelado=true

✅ updateReceivable(id, patch)
   → Update with status normalization
   → Calls logPaymentReceived() if status changes to received/partial
   → Logs audit trail with previous/new status

✅ deleteReceivable(id)
   → Hard delete AR record

✅ getReceivableById(id)
   → Fetch single AR record

✅ arStatusOptions (constant export)
   → Status options for UI dropdown with labels
```

**Database:** `ar_receivables` table  
**Audit Integration:** Logs to `auditFinancialIntegration.js`

---

### 2.3 repasseBancariaApi.js - 8 Exported Functions

```
✅ salvarDadosBancarios(professionalId, clinicId, dadosBancarios)
   → Upsert professional bank account (PIX, bank account, etc.)
   → Table: professional_bank_accounts

✅ obterDadosBancarios(professionalId, clinicId)
   → Fetch professional bank account data

✅ criarRequisicaoTransferencia(repasse, metodo = 'pix')
   → Create transfer request entry in repasse_transferencias
   → Status: pendente, processando, concluido, erro
   → Stores method: pix, ted, paypal, stripe

✅ transferirPIX(transferencia)
   → Execute PIX transfer (stub or real implementation)

✅ transferirIntegracaoAPI(transferencia, provedor = 'api-99pay')
   → Execute transfer via external API provider

✅ processarTransferenciasLote(repassos, metodo = 'pix')
   → Batch process multiple transfers

✅ obterHistoricoTransferencias(clinicId, professionalId = null)
   → Fetch transfer history

✅ gerarRelatorioBancario(clinicId, dataInicio, dataFim)
   → Generate banking report for date range
```

**Database:** `professional_bank_accounts`, `repasse_transferencias`  
**Status:** ⚠️ Mostly stubs; needs real PIX/API integration

---

### 2.4 financialAccountsApi.js - 12 Exports (Mixed: Constants + Functions)

#### **Constants (Color/Label Mapping)**
```
✅ accountTypeColors - Text colors by type (receita=green, despesa=blue, etc.)
✅ accountTypeBgColors - Background colors by type
✅ accountTypeLabels - Display labels with emojis
```

#### **Functions**
```
✅ calculateDRE(transactions = [])
   → Calculate DRE from transaction array
   → Returns: receita, deducao, receitaLiquida, custos, margem, despesas, lucro, investimentos, ajustes

✅ formatBRL(value)
   → Format number as BRL currency (pt-BR locale)

✅ getAccountTypeIcon(type)
   → Return emoji icon for account type

Financial Accounts API Object (financialAccountsApi):
✅ .listAccounts(clinicId, parentId)
✅ .getAccountTree(clinicId)
✅ .createAccount(clinicId, accountData)
✅ .updateAccount(accountId, updates)
✅ .deleteAccount(accountId)
   → CRUD for financial_accounts table

✅ .listTransactions(clinicId, filters)
   → Query financial_transactions with status/date/account filters

✅ .createTransaction(clinicId, transactionData)
✅ .updateTransaction(transactionId, updates)

✅ .calculateDREForPeriod(clinicId, startDate, endDate)
   → Calculate DRE for date range (aggregates financial_transactions)
   → Returns comprehensive DRE object with percentages and sub-categories
```

**Database:** `financial_accounts`, `financial_transactions` (partial implementation)  
**Status:** ⚠️ Mostly stubs; calculateDREForPeriod incomplete

---

### 2.5 conciliationApi.js - 15+ Exported Functions

```
✅ listBankStatements({ clinicId, status, startDate, endDate, accountId, search, limit, offset })
   → Query conciliation_bank_statements with filters

✅ getBankStatement(id)
   → Fetch single statement

✅ importBankStatements({ clinicId, statements, batchId, accountId })
   → Batch insert bank transaction records

✅ createBankTransaction(clinicId, transaction)
✅ updateBankTransaction(id, updates)
✅ deleteBankTransaction(id)
   → CRUD for transactions

✅ findSuggestions(statementId, options)
   → Match statement against AP/AR/transactions
   → Scoring algorithm for best matches

✅ handleConciliate(statementId, linkedId, linkedType)
   → Mark statement as reconciled (link to AP/AR/transaction)

✅ handleCreateAndLink(statement, description)
   → Create new AP/AR entry from unmatched statement

✅ handleMarkDivergent(statementId, notes)
   → Mark statement as divergent (reviewed but unreconciled)

✅ handleIgnore(statementId)
   → Ignore statement (will not match)

✅ handleBulkConciliate(statementIds, suggestions)
   → Reconcile multiple statements in batch

✅ listBankAccounts(clinicId)

✅ getBankConciliationIndicators(clinicId)
   → Summary: total, reconciled, unreconciled, divergent, ignored
```

**Database:** `conciliation_bank_statements`, `conciliation_transactions`, bank linking tables  
**Status:** ✅ Core functions ready, matches via suggestions hook

---

### 2.6 appointmentFinancialIntegrationApi.js - 5 Exported Functions

```
⚠️ finalizeAppointmentWithFinancials(appointmentId, financialData = {})
   → Process appointment completion:
     • Fetch appointment + patient data
     • Determine appointment value (priority: financialData → appointment.value → service.price)
     • [INCOMPLETE] Should create medical_production record
     • [INCOMPLETE] Should calculate repasse (70/30 split)
     • [INCOMPLETE] Should create ar_receivables entry
     • [INCOMPLETE] Should create financial transactions
     • [INCOMPLETE] Should generate billing guide (if health insurance)
   → Status: PARTIAL - only fetches data, doesn't create records

✅ calculateMonthlyRepasse(clinicId, professionalId, month)
   → Calculate total repasse for professional for month
   → Aggregates doctor_commissions or appointment-based repasse

✅ processAppointmentProduction(appointmentId, appointmentValue = 0)
   → [INCOMPLETE] Create medical_production record
   → Should track productivity for professionals

✅ reprocessAppointmentFinancials(appointmentId, financialData = {})
   → [INCOMPLETE] Recalculate financials for appointment
   → Useful for corrections/adjustments

✅ getProductionAndRepasseSummary(clinicId, month)
   → Fetch production and repasse aggregates for period
```

**Status:** ⚠️ **CRITICAL GAP** - Most functions are incomplete stubs  
**Missing Implementation:**
- AR record auto-creation on appointment completion
- Financial transaction logging
- Medical production tracking
- Medical repasse calculation integration
- Billing guide auto-generation

---

### 2.7 financeIntegrationApi.js - 9 Exported Functions

```
✅ calculateAutomaticRepasse(params: { clinicId, professionalId, serviceId, baseAmount, appointmentStatus, healthInsuranceId })
   → Calculate repasse based on revenue rules
   → Returns: repasse amount, rule, breakdown, warnings, valid flag
   → Fetches service price if needed
   → Validates against min/max limits

✅ simulateRepasse(baseAmount, options)
   → Preview repasse calculation (no save)
   → Returns breakdown with deductions

✅ getProfessionalRepasseRules(clinicId, professionalId)
   → Fetch all revenue rules for professional
   → Returns: id, type, value, minimumAmount, maximumAmount, description, active

✅ getServicePricesByInsurance(clinicId, serviceId)
   → Fetch service prices by health insurance

✅ getActiveHealthInsurances(clinicId)
   → Fetch active health insurances (for repasse rules)

✅ validateProfessionalRepasseEligibility(clinicId, professionalId)
   → Check if professional has valid repasse rules

✅ generateRepasseReport(clinicId, professionalId, params)
   → Generate detailed repasse report for professional
   → Date range, status filters

✅ formatRuleDescription(rule)
   → Human-readable rule text (e.g., "30% commission")

✅ formatCurrency(value, currency = "BRL")
   → Format value as currency string
```

**Status:** ✅ Mostly functional, integrates with revenueRulesApi

---

### 2.8 repasseMedicoApi.js - 6 Exported Functions

```
✅ gerarRepasse({ clinicId, mes, ano, tipoGeracao })
   → Generate monthly repasse for all professionals
   → Aggregates earnings and applies rules

✅ listarRepasses({ clinicId, mes, ano, profissionalId, status })
   → List generated repassos (repasse records)

✅ detalheRepasse(repasseId)
   → Fetch detailed repasse record

✅ ajustarRepasse({ repasseId, valorAjuste, motivo, usuarioId })
   → Adjust repasse amount with audit trail

✅ dashboardRepasse({ clinicId, mes, ano })
   → Summary KPIs for repasse period

✅ liberarRepasseParaPagamento(repasseId)
   → Mark repasse as ready for payment
```

**Status:** ✅ Functional, reads from doctor_commissions table

---

## 3. DATABASE SCHEMA

### 3.1 Core Financial Tables

#### **ap_bills**
```sql
Columns:
- id (uuid, PK)
- clinic_id (uuid, FK → clinics)
- category_id (uuid, FK → account_plans) [nullable, leaf-node only]
- method_id (uuid, FK → payment_methods) [optional]
- vendor_name (text)
- description (text) [nullable]
- due_date (date)
- issue_date (date) [nullable]
- amount (numeric)
- paid_amount (numeric) [nullable]
- notes (text) [nullable]
- status (enum: 'open', 'paid', 'canceled', 'partial', 'scheduled')
- document_url (text) [optional, may not exist in all schemas]
- payment_method (text) [optional]
- document_number (text) [optional]
- installments (int) [optional, default: 1]
- created_at (timestamp)
- updated_at (timestamp)

Optional Tax Columns (may not exist):
- ir_pct (numeric) [IR withholding %]
- csll_pct (numeric) [CSLL withholding %]
- pis_cofins_pct (numeric) [PIS/COFINS %]
- iss_pct (numeric) [ISS %]
- icms_pct (numeric) [ICMS %]
- taxes_retained (boolean)

Optional Repasse Link Columns (may not exist):
- repasse_doctor_name (text)
- linked_invoice_id (uuid)
- linked_service (text)
- linked_revenue (numeric)

Views:
- ap_bills_with_category: Joins with account_plans for category display

Indexes:
- clinic_id, status, due_date (for filtering)
- vendor_name (for search)
```

**Current Issues:**
- Optional columns cause deployment variability
- No enforced data validation on amount
- Repasse link fields are ad-hoc, should be formal foreign keys

---

#### **ap_items**
```sql
Columns:
- id (uuid, PK)
- ap_bill_id (uuid, FK → ap_bills)
- clinic_id (uuid, FK → clinics)
- stock_item_id (uuid, FK → stock_items) [nullable]
- name (text)
- qty (numeric)
- unit_value (numeric)
- total_value (numeric)
- created_at (timestamp)

Purpose: Line items for AP bills (products in NF)
Relationship: 1 AP bill → many items
```

---

#### **ar_receivables**
```sql
Columns:
- id (uuid, PK)
- clinic_id (uuid, FK → clinics)
- payer_name (text)
- pagador (text) [seems duplicate of payer_name?]
- paciente_id (uuid, FK → patients) [nullable]
- convenio_id (uuid, FK → health_insurances) [nullable]
- empresa_id (uuid, FK → companies) [nullable]
- origem (text) [origin: 'Manual', 'Billing', 'Appointment', etc.]
- descricao (text)
- servico_id (uuid, FK → services) [nullable]
- profissional_id (uuid, FK → professionals) [nullable]
- centro_custo_id (uuid, FK → cost_centers) [nullable]
- plano_contas_id (uuid, FK → account_plans) [nullable]
- valor_bruto (numeric)
- descontos (numeric) [default: 0]
- forma_prevista (text) [expected payment method] [nullable]
- data_emissao (date)
- data_vencimento (date)
- data_recebimento (date) [nullable, filled when received]
- status (enum: 'open', 'planned', 'received', 'partial', 'overdue', 'canceled', 'glossed')
- parcelado (boolean)
- parcela_atual (int) [nullable, current installment # if parcelado]
- total_parcelas (int) [nullable, total # if parcelado]
- grupo_parcelamento_id (uuid) [links installments together] [nullable]
- atendimento_id (uuid, FK → appointments) [nullable] [for audit trail link]
- created_at (timestamp)
- updated_at (timestamp)

Potential Columns (not confirmed in code):
- categoria_ar (text) [could be a category type]
```

**Current Issues:**
- `payer_name` and `pagador` seem redundant
- No auto-creation from appointments (manual entry only)
- No automation on appointment completion
- Missing appointment_id link (has atendimento_id but not consistently used)

---

#### **cost_centers (custos)**
```sql
Columns:
- id (uuid, PK)
- clinic_id (uuid, FK → clinics)
- name (text)
- type (enum: 'assistencial', 'administrativo', 'comercial')
- category (enum: 'receita', 'custo', 'despesa')
- parent_id (uuid, FK → cost_centers) [nullable, for hierarchy]
- order_index (int) [nullable, for sorting]
- active (boolean)
- notes (text) [nullable]
- created_at (timestamp)
- updated_at (timestamp)

Relationships:
- Self-referential (parent-child hierarchy)
- Links to ar_receivables, ap_bills for cost allocation
- Links to financial_transactions for tracking
```

---

#### **account_plans (Plano de Contas)**
```sql
Columns:
- id (uuid, PK)
- clinic_id (uuid, FK → clinics)
- name (text) [account name]
- type (enum: 'receita', 'despesa', 'deducao', 'custo', 'investimento', 'ajuste')
- parent_id (uuid, FK → account_plans) [nullable, for hierarchy]
- code (text) [nullable, accounting code like "1.1.1"]
- level (int) [0 for root, 1 for main, 2+ for sub]
- active (boolean)
- created_at (timestamp)
- updated_at (timestamp)

Relationships:
- Hierarchical (parent-child)
- FK: ap_bills.category_id, ar_receivables.plano_contas_id
- FK: cost_centers (potential linking)
- Seed data: applyDefaultAccountPlan() in accountPlanSeed.js
```

**Validation Rule (in createAP):**
- Only leaf nodes (with parent_id) can have ap_bills entries
- Parent accounts aggregate only

---

#### **finance_accounts / bank_accounts**
```sql
Columns:
- id (uuid, PK)
- clinic_id (uuid, FK → clinics)
- name (text) [e.g., "Banco do Brasil Corrente"]
- description (text) [nullable]
- account_type (enum: 'bank', 'cash', 'money_market', etc.) [default: 'bank']
- balance (numeric) [nullable, current balance]
- active (boolean)
- created_at (timestamp)
- updated_at (timestamp)

Note:** API tries finance_accounts first, falls back to bank_accounts if not found
```

---

#### **professional_bank_accounts**
```sql
Columns:
- id (uuid, PK)
- professional_id (uuid, FK → professionals)
- clinic_id (uuid, FK → clinics)
- banco (text) [bank name]
- agencia (text) [branch code]
- conta (text) [account number]
- tipo_conta (enum: 'corrente', 'poupança')
- cpf_cnpj (text)
- tipo_chave (enum: 'cpf', 'email', 'telefone', 'aleatoria') [PIX key type]
- chave_pix (text) [PIX key value]
- titular (text) [account holder name]
- ativo (boolean)
- created_at (timestamp)

Purpose: Store professional bank data for automatic repasse transfers
```

---

#### **repasse_transferencias**
```sql
Columns:
- id (uuid, PK)
- repasse_id (uuid, FK → doctor_commissions or repassos)
- professional_id (uuid, FK → professionals)
- clinic_id (uuid, FK → clinics)
- valor (numeric) [transfer amount]
- metodo (enum: 'pix', 'ted', 'paypal', 'stripe')
- dados_bancarios_id (uuid, FK → professional_bank_accounts)
- status (enum: 'pendente', 'processando', 'concluido', 'erro')
- descricao (text)
- data_transacao (timestamp) [when transfer happened] [nullable]
- id_transacao_externa (text) [external API transaction ID] [nullable]
- created_at (timestamp)
- updated_at (timestamp)

Purpose: Track automatic bank transfers for medical repasse payments
```

---

#### **doctor_commissions** (reads from RepasseMedico page)
```sql
Columns (inferred from RepasseMedico.jsx):
- id (uuid)
- clinic_id (uuid)
- professional_id (uuid)
- reference_month (int)
- reference_year (int)
- calc_mode (text) [mode: "atendido"]
- gross_amount (numeric) [gross commission]
- deductions (numeric)
- net_repasse (numeric) [net after deductions]
- status (text) [approval status]
- created_at (timestamp)

Purpose: Monthly commission aggregates for each professional
```

---

#### **recurring_accounts_payable** (optional, graceful fail)
```sql
Columns (inferred from createRecurringAP):
- id (uuid, PK)
- clinic_id (uuid)
- supplier_id (uuid) [nullable]
- description (text) [nullable]
- value (numeric) [nullable]
- frequency (enum: 'monthly', 'quarterly', 'yearly')
- start_date (date)
- end_date (date) [nullable]
- chart_account_id (uuid) [nullable]
- cost_center (text) [nullable]
- payment_method (text) [nullable]
- active (boolean)
- created_at (timestamp)

Status: Implementation gracefully handles missing table (no error if doesn't exist)
```

---

#### **financial_transactions** (for DRE calculations)
```sql
Columns (inferred from financialAccountsApi):
- id (uuid, PK)
- clinic_id (uuid)
- account_id (uuid, FK → financial_accounts)
- professional_id (uuid) [nullable]
- type (enum: 'income', 'expense', 'transfer', 'adjustment')
- amount (numeric)
- description (text) [nullable]
- status (enum: 'pending', 'processed', 'paid', 'canceled')
- created_at (timestamp)
- updated_at (timestamp)

Note: Table may not be fully implemented; DashboardDRE uses mock data
```

---

#### **conciliation_bank_statements**
```sql
Columns (inferred from conciliationApi):
- id (uuid, PK)
- clinic_id (uuid)
- bank_account_id (uuid, FK → finance_accounts)
- statement_date (date)
- status (enum: 'unreconciled', 'reconciled', 'divergent', 'ignored')
- description (text) [nullable]
- amount (numeric)
- reference_number (text) [bank ref] [nullable]
- created_at (timestamp)

Purpose: Import and match bank transactions to AP/AR
```

---

### 3.2 Related Tables

#### **appointments**
- Links to AR via `atendimento_id` (inconsistent field naming)
- Carries `value`, `service_id`, `health_plan_id`, `professional_id`
- **Missing:** Automatic AR creation on completion
- **Missing:** Automatic medical_production record creation
- **Missing:** Automatic repasse calculation trigger

#### **professionals**
- Links to `repasseMedicoApi` for commission calculations
- Stores professional data for repasse rules
- May have professional_bank_accounts linked

#### **patients**
- Links to AR as payer (paciente_id)
- Used in auto-generated AR descriptions

#### **health_insurances (convenios)**
- Links to AR as payer (convenio_id)
- Links to service prices via servicePricesApi
- Used in repasse rule calculations

---

### 3.3 RPC Functions (Supabase)

#### **list_ap_bills(p_clinic_id, p_status_text, p_limit, p_offset)**
- Fetches paginated AP bills with optional status filter
- Used by `listAP()` function

#### **pay_accounts_payable_batch(p_ids, p_payment_date, p_payment_method)**
- Bulk mark multiple AP bills as paid
- Updates status and payment date
- Used by `payAccountsPayableBatch()` function

#### **cashflow_summary(p_clinic_id, p_start, p_end)**
- Calculates cash flow aggregates: entradas, saidas, resultado_liquido, saldo_final
- Used by FluxoCaixa and DashboardFinanceiro
- **Returns:** Single row with summary metrics

#### **[Potential Missing RPCs]**
- `list_ar_receivables()` - No RPC found, uses direct query instead
- `create_ar_from_appointment()` - NOT IMPLEMENTED
- `calculate_medical_repasse()` - RPC or direct calc?
- `generate_conciliation_suggestions()` - Via hook, may have RPC backend

---

## 4. INTEGRATION POINTS & CURRENT STATUS

### 4.1 Appointment → Financial Integration

#### **Current State: ⚠️ MANUAL ONLY**

**Flow:**
1. Appointment completed in Agenda module
2. [MISSING] Should trigger automatic AR creation (ar_receivables entry)
3. [MISSING] Should trigger automatic medical_production record
4. [MISSING] Should calculate 70/30 repasse split
5. [MISSING] Should create financial transactions
6. [MISSING] Should generate billing guide (if health insurance)

**What's Missing:**
- No event listener on appointment status change
- No automatic AR record creation
- No production tracking
- No automatic guia geração

**Stub Functions:**
- `appointmentFinancialIntegrationApi.finalizeAppointmentWithFinancials()` - 90% complete, only fetches data
- `appointmentFinancialIntegrationApi.processAppointmentProduction()` - Not implemented
- `appointmentFinancialIntegrationApi.reprocessAppointmentFinancials()` - Not implemented

**Workaround:**
- Manual AR entry via `ContasReceber → NovoRecebimento`
- Manual or scheduled repasse generation via `RepasseMedico`

---

### 4.2 Accounts Payable → Repasse Integration

#### **Current State: ⚠️ PARTIALLY MANUAL**

**Link Fields in ap_bills (if they exist):**
```
Optional fields in ap_bills table:
- repasse_doctor_name: Doctor name (text link, not FK)
- linked_invoice_id: Link to invoices (UUID)
- linked_service: Service description (text)
- linked_revenue: Portion of repasse to allocate from this AP
```

**Issue:**
- These are ad-hoc text fields, not proper foreign keys
- No automatic linking when AP created
- Manual entry required

**Better Approach (not currently implemented):**
- Formal FK: ap_bills.repasse_id → doctor_commissions
- Trigger on commission generation to link referenced AP bills
- Audit trail: which APs contributed to repasse calculation

---

### 4.3 Medical Repasse Flow

#### **Current State: ✅ MOSTLY WORKING (but manual triggers)**

**Flow:**
1. User navigates to RepasseMedico page
2. Selects month/year and mode ("atendido")
3. System queries `doctor_commissions` table for that period
4. Shows list of professionals with gross → net amounts
5. [MISSING] No automatic commission generation from appointments
6. User can export to Excel

**What's Missing:**
- No event-driven monthly repasse generation
- No automatic update when appointment completed
- `doctor_commissions` must be pre-populated (by what? a batch job?)
- No integration with `appointmentFinancialIntegrationApi`

**Trigger Points:**
- Should happen when: appointment status = "completed"
- Should recalculate when: appointment value changed
- Should reverse when: appointment canceled
- Currently: Manual monthly generation only

**Functions Available:**
- `repasseMedicoApi.gerarRepasse()` - Generate all professionals for month
- `financeIntegrationApi.calculateAutomaticRepasse()` - Per-professional calculation
- `revenueRulesApi.calculateRepasse()` - Applies rules (percentage, fixed, commission)

---

### 4.4 Conciliation → AP/AR Integration

#### **Current State: ✅ FUNCTIONAL (via suggestions + manual link)**

**Flow:**
1. User imports bank statement (OFX, CSV) via ConciliacaoBancaria
2. System scans `conciliation_bank_statements` table
3. For each unreconciled statement, finds "suggestions" via hook
4. Suggestions algorithm:
   - Matches amount to AP bills (exact/range)
   - Matches date close to due_date
   - Matches vendor/payer name via text search
   - Scores and sorts results
5. User can:
   - ✅ Link to existing AP/AR via "Reconcile" button
   - ✅ Create new AP/AR from statement via "Create & Link"
   - ✅ Mark as divergent/ignore statement

**What's Missing:**
- Not automatic reconciliation (all manual clicks)
- Rules-based automation (e.g., "if exact match + vendor, auto-link")

**Current Implementation:**
- Uses `useConciliation()` hook with suggestion engine
- `handleConciliate()` links statement to AP/AR
- `handleCreateAndLink()` creates new entry if no match

---

### 4.5 AR → Payment / Check-in Integration

#### **Current State: ⚠️ PARTIAL**

**Link:**
- Check-in process (in Agenda module) should validate AR balance
- Payment at check-in could update AR record
- [MISSING] No check-in payment capture for AR

**Current:**
- Manual AR payment entry via `ContasReceber` page
- User marks as "received" or "partial" manually
- No check-in integration

**Gap:**
- Check-in is reception module, not financial
- No bridge between check-in payment and AR status update

---

### 4.6 AP → Accounting Journal Integration

#### **Current State: ⚠️ MISSING**

**What Should Happen:**
1. AP bill created with category (account_plan)
2. Should auto-generate accounting entry (debit/credit)
3. Should post to chart of accounts
4. Should reflect in DRE calculation

**Current:**
- AP has `category_id` (FK to account_plans)
- DRE dashboard uses mock data (not real AP entries)
- No automatic journal entry generation

---

## 5. AUTOMATION & WORKFLOW GAPS

### 5.1 Critical Gaps (P0 - Must Fix)

| Gap | Impact | Effort | Note |
|-----|--------|--------|------|
| **No AR auto-creation from appointments** | AR manual entry only; no receivables tracking by source | 5h | Should trigger on `appointment.status = 'completed'` |
| **No medical_production tracking** | Can't track professional productivity | 3h | Need new table + insert on appointment completion |
| **Missing automatic repasse calculation** | Repasse manual only, not real-time | 8h | Should calculate on appointment complete, not manually |
| **No appointment cancellation reversal** | Financial records not reversed when appointment canceled | 4h | Should delete AR + adjust repasse if appointment canceled |
| **No billing guide auto-generation** | Insurance billing manual workflow | 6h | Should auto-generate guia when health_insurance present |
| **DRE uses mock data only** | Dashboard worthless for real financial analysis | 3h | Should query real ar_receivables + ap_bills |

**Total Critical Effort:** ~29 hours

---

### 5.2 Moderate Gaps (P1 - Should Fix)

| Gap | Impact | Effort | Note |
|-----|--------|--------|------|
| **No appointment photo capture** | No patient ID verification | 2h | Check-in module, not financial |
| **No insurance pre-auth validation** | Can't verify authorization before appointment | 4h | Cross-module with Agenda |
| **Cash flow entry validation** | Can enter negative/invalid amounts | 1h | Simple frontend validation |
| **Cost center rateio workflow** | Cost allocation manual only | 5h | Need UI for distribution matrix |
| **Recurring AP auto-generation** | Must manually trigger recurring bills | 2h | Need scheduler job |
| **No bulk appointment completion with financials** | Can't do monthly closing in bulk | 3h | Add bulk-action API |

**Total Moderate Effort:** ~17 hours

---

### 5.3 Minor Gaps (P2 - Nice to Have)

| Gap | Impact | Effort | Note |
|-----|--------|--------|------|
| **Audit trail logging** | Limited financial history | 2h | Integrate with auditFinancialIntegration.js for all ops |
| **AR payment suggestions** | Manual payment matching | 2h | Similar to reconciliation but for AR |
| **Repasse split visualization** | Can't see 70/30 breakdown | 1h | Add pie/breakdown chart to RepasseMedico |
| **Bank transfer automation (PIX/TED)** | Manual transfer requests only | 6h | Real integration with payment gateways |

**Total Minor Effort:** ~11 hours

---

## 6. WHAT IS WORKING AUTOMATICALLY

### 6.1 Fully Automatic (No Manual Intervention)

✅ **Medical Repasse Calculation** (when triggered manually)
   - Once `gerarRepasse()` is called for a month, calculates all professionals automatically
   - Applies revenue rules (percentage, fixed, commission)
   - Respects min/max limits
   - Breaks down by service and payer type

✅ **Accounts Payable Bulk Payment**
   - Select multiple AP bills → click "Mark as Paid"
   - `payAccountsPayableBatch()` updates all in single RPC call
   - Single operation, but requires user click

✅ **Cash Flow Summary RPC**
   - `cashflow_summary()` aggregates live data
   - Returns: entries, exits, net, final balance
   - Powers dashboard KPIs without manual calculation

✅ **Account Plan Hierarchies**
   - Tree structure maintained automatically
   - Parent non-leafable, children inherit category
   - Validation on write ensures data integrity

✅ **Cost Center Hierarchy**
   - Parent-child relationships auto-maintained
   - Supports any depth hierarchy
   - Queries use parent_id filter for sub-trees

✅ **Status Normalization**
   - All APIs normalize status strings (pt-BR → enum)
   - 'pago' → 'paid', 'em aberto' → 'open', etc.
   - Handles user input variations gracefully

✅ **Service Price Lookup**
   - `financeIntegrationApi.calculateAutomaticRepasse()` auto-loads service price if amount not provided
   - Multi-insurance support

---

### 6.2 Partially Automatic (Some Steps Manual)

⚠️ **Installment AR Creation**
   - User provides # of installments
   - System auto-distributes amount across months
   - Auto-generates grupo_parcelamento_id
   - But: User must manually create (no appointment trigger)

⚠️ **AP Recurring Generation**
   - Can set up recurring rule
   - [INCOMPLETE] Should auto-generate bills on schedule
   - Currently: Stored but no trigger

⚠️ **Conciliation Suggestions**
   - System auto-scores matches (amount, name, date)
   - But: User must click to confirm/link
   - No auto-reconciliation

---

### 6.3 Manual Only (Requires User Click)

❌ **AR Creation from Appointments**
   - User must navigate to ContasReceber → NovoRecebimento
   - Manually fill form (amount, payer, date, etc.)
   - Click Create
   - Should be: Automatic on appointment completion

❌ **Billing Guide Generation**
   - User must manually request billing guide
   - Future: Should auto-generate on appointment complete + insurance present

❌ **Medical Repasse Generation**
   - User must navigate to RepasseMedico → select month → click "Gerar"
   - System calculates all professionals
   - Should be: Automatic monthly on scheduled date

❌ **Payment Recording**
   - User clicks on AR record → "Mark as Received"
   - Enters payment date/method
   - Should be: Auto-update on check-in payment

❌ **Cost Center Allocation**
   - User must manually distribute costs across cost centers
   - Should be: Auto-allocation rules or monthly distribution

❌ **Bank Transfer Execution**
   - User must click "Execute Transfer" for each repasse
   - Should be: Automatic on payment date

---

## 7. FEATURE COMPLETENESS MATRIX

| Module | CRUD | List | Filter | Export | Bulk Ops | Real-Time | Automation | Dashboard | Status |
|--------|------|------|--------|--------|----------|-----------|-----------|-----------|--------|
| **AP** | ✅ 100% | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ❌ | ✅ | 85% |
| **AR** | ✅ 100% | ✅ | ✅ | ⚠️ | ❌ | ⚠️ | ❌ | ✅ | 60% |
| **Cash Flow** | ✅ 100% | ✅ | ✅ | ⚠️ | ❌ | ✅ | ⚠️ | ✅ | 80% |
| **Chart of Acc** | ✅ 100% | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ⚠️ | 75% |
| **DRE** | ❌ | ⚠️ | ⚠️ | ⚠️ | ❌ | ✅ | ❌ | ⚠️ Mock | 30% |
| **Cost Centers** | ✅ 100% | ✅ | ✅ | ❌ | ❌ | ✅ | ⚠️ | ✅ | 80% |
| **Conciliation** | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ⚠️ Partial | ✅ | 70% |
| **Repasse Médico** | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ | ⚠️ Manual | ✅ | 75% |
| **Automation** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ Stubs | ❌ | 5% |
| **Avg** | **82%** | **89%** | **78%** | **50%** | **33%** | **67%** | **11%** | **71%** | **64%** |

---

## 8. IMPLEMENTATION PRIORITY & ROADMAP

### Phase 1: CRITICAL AUTOMATIC INTEGRATIONS (Week 1-2)
**Estimated Effort:** 29 hours | **Impact:** High | **Frequency:** User-facing

1. **Auto AR Creation on Appointment Completion** (5h)
   - Trigger: appointment.status → 'completed'
   - Create ar_receivables entry with values
   - Link: atendimento_id ↔ appointment.id
   - Action: Call `createReceivable()` in finalizeAppointmentWithFinancials

2. **Auto Medical Production Tracking** (3h)
   - Create medical_production record on appointment complete
   - Track: professional_id, service_id, appointment_date, amount, repasse_eligible

3. **Auto Medical Repasse Calculation** (8h)
   - Calculate 70/30 split on appointment complete (not monthly batch)
   - Create doctor_commissions entry immediately
   - Track: Earnings from each appointment, not aggregated
   - Integration: Call `calculateAutomaticRepasse()` on finalize

4. **Appointment Cancellation Reversal** (4h)
   - Trigger: appointment.status → 'canceled'
   - Delete associated ar_receivables
   - Adjust doctor_commissions (negative entry or delete)
   - Reverse any financial transactions

5. **Real DRE Dashboard** (3h)
   - Replace mock data
   - Query ar_receivables + ap_bills for real values
   - Aggregate by type (receita, deducao, custo, etc.)
   - Real-time calculation on DashboardDRE

6. **Appointment Photo & Patient Validation** (2h)
   - Cross-module: Check-in captures patient photo
   - Financial link: Validate patient on AR creation
   - Store: patient_photo_id in ar_receivables

**Deliverable:** Financial module auto-updates on appointment entry/exit; real financial dashboards

---

### Phase 2: WORKFLOW AUTOMATION (Week 3-4)
**Estimated Effort:** 17 hours | **Impact:** Medium-High | **Frequency:** Weekly/Monthly

1. **Billing Guide Auto-Generation** (6h)
   - Trigger: appointment complete + health_insurance present
   - Auto-generate guia with appointment details
   - Link: ar_receivables ↔ guia_id
   - Export: Auto-submit to health insurance API (if configured)

2. **Recurring AP Auto-Generation** (2h)
   - Scheduler job: Check recurring_accounts_payable weekly
   - Create ap_bills for due recurring entries
   - Track: last_generated_date to avoid duplicates

3. **Cost Center Rateio (Distribution)** (5h)
   - UI: Matrix to assign percentages to cost centers
   - Auto-split expenses across centers
   - Report: Cost center P&L

4. **Bulk Appointment Financial Processing** (3h)
   - Batch endpoint: Process 100+ appointments at once
   - Useful for: Closing periods, historical data import
   - Validation: Prevent double-processing with status flags

5. **AR Payment Suggestions** (1h)
   - Similar to reconciliation, match payments to AR
   - Auto-suggest when bank transfer matches AR amount

**Deliverable:** Financial workflows no longer require monthly manual intervention

---

### Phase 3: ADVANCED INTEGRATION (Week 5+)
**Estimated Effort:** 21 hours | **Impact:** Medium | **Frequency:** Occasional/Continuous

1. **Bank Transfer Automation (PIX/TED)** (6h)
   - Real PIX API integration (e.g., 99Pay, Dock)
   - Auto-execute transfers on repasse ready date
   - Webhook: Update transfer status when bank confirms

2. **Insurance Pre-Auth Validation** (4h)
   - Pre-appointment: Validate insurance auth
   - Block appointment if not authorized
   - Cross-module: Agenda + Financial

3. **Full Journal Entry System** (5h)
   - Auto-generate GL entries for all transactions
   - Debit/Credit balance validation
   - Audit trail: Who, when, what posted

4. **Automated Repasse Report Generation** (2h)
   - Monthly PDF reports per professional
   - Email distribution
   - Ledger: Earnings history by appointment

5. **Financial Reconciliation Bot** (4h)
   - ML-based: Auto-match bank statements
   - Rules: Auto-reconciliation for low-risk matches
   - Escalation: Flagged divergent items for review

**Deliverable:** Hands-off financial operations; full GL integration

---

## 9. DATA CONSISTENCY & INTEGRITY ISSUES

### 9.1 Known Issues

#### **1. Optional Column Variability** ⚠️ BLOCKER
- `ap_bills` has optional columns: `installments`, `payment_method`, `document_url`, `document_number`, `ir_pct`, `csll_pct`, etc.
- Different Supabase environments may have different schemas
- Code has fallback logic but causes confusion

**Solution:**
- Run Supabase migration to ensure all optional columns exist
- Add migration script to repo: `scripts/ensure_ap_columns.sql`

---

#### **2. Status Normalization Inconsistency** ⚠️ MINOR
- User enters: 'pago', 'Pago', 'PAGO', 'paid', 'Paid', etc.
- API normalizes to enum: 'paid'
- But: If status already is enum, no issue
- Problem: Mix of normalized/raw statuses in database

**Solution:**
- Migration: Normalize all existing statuses
- Enforce enum at database level (PostgreSQL ENUM type)

---

#### **3. Duplicate Payer Fields** ⚠️ MINOR
- `ar_receivables` has both `payer_name` and `pagador`
- Unclear which is canonical
- `listReceivables()` filters on `pagador` not `payer_name`

**Solution:**
- Clarify: `payer_name` = display name, `pagador` = payer identifier?
- Or: Remove one, migrate data to single field

---

#### **4. Attachment ID Missing** ⚠️ BLOCKER
- NovaConta.jsx allows file upload (`setAttachmentFile`)
- But: No code to save to storage or create document record
- File is read but never uploaded

**Solution:**
- Implement file upload to Supabase Storage
- Store document_url in ap_bills
- Verify all uploads succeed before creating AP

---

#### **5. Cost Center Hierarchy Undefined** ⚠️ MINOR
- Cost centers can have parent_id (hierarchy)
- But: No depth limit, rules for nesting
- Reports may fail if loops exist

**Solution:**
- Validate: No cycles in parent_id chain before saving
- Add depth field to prevent infinite loops

---

### 9.2 Audit Trail Gaps

| Event | Logged? | Location |
|-------|---------|----------|
| AP Created | ⚠️ created_at only | No user audit |
| AP Updated | ⚠️ updated_at only | No change log |
| AP Paid | ❌ No | Should log payment_date + method + user |
| AR Created | ✅ logReceivableCreated() | auditFinancialIntegration.js |
| AR Paid | ✅ logPaymentReceived() | auditFinancialIntegration.js |
| AR Deleted | ❌ No | Should log deletion reason |
| Repasse Generated | ❌ No | Should log calc method + user |
| Bank Transfer | ❌ No | Should log execution details |

**Gap:** No comprehensive audit log for AP; AR has partial logging

---

## 10. RECOMMENDATIONS

### 10.1 Immediate Actions (This Week)

1. **Fix Attachment Upload** (1h)
   - Implement Supabase Storage integration for NovaConta
   - Create document_url on file upload
   - Test multi-file uploads

2. **Document Optional Columns** (2h)
   - Create schema documentation
   - Run SQL migration to ensure all optional columns exist
   - Add comments to code about deployment variability

3. **Normalize Existing Statuses** (2h)
   - SQL migration: Convert all status values to enums
   - Drop string values
   - Enforce ENUM type at DB level

**Focus:** Stability & data consistency

---

### 10.2 This Sprint (1-2 weeks)

1. **Implement Auto AR Creation** (5h)
   - Update `appointmentFinancialIntegrationApi.finalizeAppointmentWithFinancials()`
   - Add trigger on appointment completion
   - Test: Complete appointment → AR appears automatically

2. **Implement Cancellation Reversal** (4h)
   - Add trigger on appointment cancellation
   - Delete AR, reverse repasse
   - Test: Cancel appointment → AR deleted, repasse adjusted

3. **Fix DRE Mock Data** (3h)
   - Replace `getMockDRE()` with real calculation
   - Query ar_receivables + ap_bills
   - Round-trip test with sample data

4. **Add Comprehensive Audit Logging** (3h)
   - Audit trail for all AP operations
   - Integration with auditFinancialIntegration.js
   - Track: user, timestamp, operation, before/after values

**Focus:** Critical automation gaps

---

### 10.3 Next Sprint (3-4 weeks)

1. **Medical Repasse Real-Time Calculation** (8h)
   - Move from monthly batch to per-appointment calculation
   - Trigger on appointment complete + cancellation
   - Update DashboardRepasse live

2. **Billing Guide Auto-Generation** (6h)
   - Auto-create guia_faturamento on appointment complete + health_insurance
   - Auto-export to health insurance if configured
   - Link: appointment ↔ guia ↔ ar_receivables

3. **Recurring AP Auto-Generation** (2h)
   - Implement scheduler job in edge functions
   - Weekly check for recurring bills due
   - Create ap_bills automatically

**Focus:** Workflow completeness

---

### 10.4 Future Enhancements (1-2 months)

1. **Real PIX/TED Integration** (6h)
   - Integrate with payment gateway (99Pay, Dock, etc.)
   - Auto-execute transfers on repasse ready date
   - Webhook handlers for confirmation

2. **GL Journal Automation** (5h)
   - Auto-create journal entries for all transactions
   - Real accounting compliance
   - Ledger balance verification

3. **Insurance Pre-Auth Validation** (4h)
   - Cross-module: Validate auth before appointment
   - Block if not authorized + no cash payment

**Focus:** Enterprise readiness

---

## 11. TESTING CHECKLIST

### Unit Tests Needed

- [ ] `listAP()` with various status filters
- [ ] `createAP()` with/without optional columns
- [ ] `updateAP()` fallback on FK error
- [ ] `listReceivables()` all filter combinations
- [ ] `createReceivable()` installment date calculation
- [ ] `calculateDRE()` with sample transaction data
- [ ] `calculateAutomaticRepasse()` with different rules
- [ ] `conciliation suggestions()` matching algorithm
- [ ] Status normalization all PT-BR variants

### Integration Tests Needed

- [ ] Appointment completion → AR creation
- [ ] Appointment cancellation → AR deletion + repasse reversal
- [ ] Bank statement import → suggestion generation
- [ ] Multi-installment AR creation with auto-dating
- [ ] Cost center hierarchy depth validation
- [ ] Recurring AP generation on schedule
- [ ] Medical repasse calculation vs manual entry equivalence

### E2E Tests Needed

- [ ] Create AP → Mark paid → History shows payment
- [ ] Create appointment → Auto AR appears → Mark payment
- [ ] Import bank statement → Reconcile → Disappears from unreconciled
- [ ] Generate repasse → Professional receives payment
- [ ] Cancel appointment → AR deleted + dashboard updates

---

## 12. DEPLOYMENT CHECKLIST

Before production release:

- [ ] All optional columns exist in all Supabase environments
- [ ] Migration scripts run successfully
- [ ] Status normalization handles all existing values
- [ ] Audit logging enabled for all operations
- [ ] Attachment upload tested with multiple files
- [ ] RPC functions tested: list_ap_bills, pay_accounts_payable_batch, cashflow_summary
- [ ] Backup automated daily for: ap_bills, ar_receivables (2 most critical)
- [ ] Documentation updated: API schemas, field meanings, integration points
- [ ] Error messages user-friendly (not raw SQL)
- [ ] Performance: Queries optimized for 100K+ records
- [ ] Charts/dashboards load in <2 seconds
- [ ] Mobile responsive: All pages tested on phone

---

## 13. CONCLUSION

The **Financial module is 64% complete** and **functional for basic operations.** AP and AR work well for manual entry, Cash Flow aggregation is solid, and Repasse calculation is accurate when triggered.

However, **critical automation gaps prevent it from being truly production-ready:**
- AR is manual entry only (should be automatic from appointments)
- DRE uses mock data (should be real)
- Repasse is manual monthly generation (should be real-time)
- No cancellation handling (reversal missing)
- Bank transfers are stubs (not integrated)

**Priority:** Implement Phase 1 (auto-AR + cancellation reversal + real DRE) within 2 weeks to unlock appointment-driven financials. Then Phase 2 (auto-guides + recurring AP) to eliminate monthly manual work.

**Effort Estimate:** 29 hours critical + 17 hours moderate = 46 hours total to reach 85% completion and production readiness.

---

## Appendix: File Reference Guide

### Pages Directory
```
src/pages/clinica/financeiro/
├── ContasPagar.jsx ...................... AP listing & management
├── NovaConta.jsx ....................... AP creation (complex form)
├── EditarConta.jsx ..................... AP editing
├── ContasReceber.jsx ................... AR listing & management
├── NovoRecebimento.jsx ................. AR creation (manual)
├── EditarRecebimento.jsx ............... AR editing
├── FluxoCaixa.jsx ...................... Cash flow + manual entry
├── PlanoContas.jsx ..................... Chart of accounts tree
├── DashboardDRE.jsx .................... DRE dashboard (mock data)
├── DashboardFinanceiro.jsx ............. Main financial dashboard
├── AutomacaoFinanceira.jsx ............. Automation stubs (NFe, payment)
├── ConciliacaoBancaria.jsx ............. Bank conciliation
├── RepasseMedico.jsx ................... Medical repasse summary
├── RepasseDashboard.jsx ................ Repasse KPIs
├── RepasseConfig.jsx ................... Repasse rules config
├── RepasseHistorico.jsx ................ Repasse history log
└── custos/
    ├── CentroCustosLayout.jsx ......... Cost center layout wrapper
    ├── Cadastro.jsx ................... Cost center CRUD
    ├── Vinculacoes.jsx ................ Link to chart of accounts
    ├── Rateio.jsx ..................... Cost distribution
    ├── Hierarquia.jsx ................. Hierarchy management
    ├── Overview.jsx ................... Cost center summary
    ├── Analises.jsx ................... Cost analytics
    └── Config.jsx ..................... Settings
```

### API Module Reference
```
src/lib/
├── financeApi.js ....................... 28 functions (AP, AR, CashFlow, ref data)
├── receivablesApi.js ................... 6 functions (AR-specific)
├── repasseBancariaApi.js ............... 8 functions (bank transfers)
├── financialAccountsApi.js ............. 12 functions (DRE calc, utilities)
├── conciliationApi.js .................. 15+ functions (bank reconciliation)
├── appointmentFinancialIntegrationApi.js ... 5 functions (INCOMPLETE)
├── financeIntegrationApi.js ............ 9 functions (repasse rules, simulation)
├── repasseMedicoApi.js ................. 6 functions (repasse generation)
└── auditFinancialIntegration.js ........ Audit logging (partial use)
```

---

**End of Report**  
*Detailed Audit | Gesclinic Financial Module | April 2026*
