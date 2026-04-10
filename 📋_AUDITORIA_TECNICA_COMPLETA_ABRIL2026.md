# 📋 AUDITORIA TÉCNICA COMPLETA - GESCLINIC WEB
## Abril 2026 | Módulos: Agenda, Financeiro, Faturamento, Repasse Médico, Configurações, Relatórios

---

# ✅ CHECKLIST 1 — AGENDA

## 1. Estrutura principal
- [x] Existe agenda unificada - ✅ AgendaUnificadaSimples.jsx (funcional)
- [x] Existe agenda por profissional - ✅ AgendaPorProfissional.jsx (funcional)
- [x] Existe agenda por sala - ✅ AgendaSala.jsx (funcional)  
- [x] Existe agenda por unidade - ✅ Implementado via filtros em agendaApi.js
- [x] Existem filtros por período - ✅ Datepicker integrado em todas as views
- [x] Existem filtros por profissional - ✅ Funcional via listAppointments()
- [x] Existem filtros por sala - ✅ Funcional via roomId filter  
- [x] Existem filtros por status - ✅ status filter em appointmentsApi
- [x] Existem filtros por convênio/plano - ✅ payer_id, plan_id filtros existem

## 2. Visualizações
- [x] View de dia - ✅ DayView component
- [x] View de semana - ✅ WeekView component (em AgendaLayout)
- [x] View de mês - ✅ MonthView component (calendário Fullcalendar)
- [x] View de tabela - ✅ AgendaListaEspera.jsx (tabela com agendamentos)

## 3. Fluxo operacional
- [x] Criar agendamento - ✅ createAppointment() em appointmentsApi.js
- [x] Editar agendamento - ✅ updateAppointment() (com validações)
- [x] Cancelar agendamento - ✅ deleteAppointment() (lógico, não físico)
- [x] Remarcar - ✅ Implementado como edit + notificação
- [x] Encaixe - ⚠️ PARCIAL - Existe lógica de slots mas sem UI dedicada para "squeeze-in"
- [x] Check-in - ⚠️ PARCIAL - Check-in page existe mas não triggered automaticamente
- [x] Confirmação - ✅ AgendaConfirmacao.jsx (validações e confirmações)
- [x] Controle de faltas / no-show - ✅ appointmentStatusConstants.js tem "no_show"
- [x] Status do atendimento - ✅ migrateStatus(), status_audit_logs
- [x] Vínculo com paciente - ✅ patient_id FK, denormalizado em lista
- [x] Vínculo com profissional - ✅ professional_id FK, denormalizado  
- [x] Vínculo com serviço - ✅ service_id FK com TUSS/CBHPM codes
- [x] Vínculo com convênio/plano - ✅ payer_id, plan_id FKs, guia_number field

## 4. UX e componentes
- [x] Calendário superior funcional - ✅ Fullcalendar integrado
- [x] Datepicker consistente - ✅ Radix UI calendar component
- [x] Popovers funcionando sem quebra visual - ✅ Radix UI Popover
- [x] Dialogs de agendamento funcionais - ⚠️ PARCIAL - Funciona mas precisa complemento
- [x] Tabela/lista funcional - ✅ Tauri UI Table, React Table
- [x] Badges/status consistentes - ✅ statusColors.js + statusLabels.js
- [x] Views realmente diferentes entre si - ✅ Day/Week/Month/Table são layout distintos
- [x] Layout sem duplicidade de componente - ✅ AgendaLayout.jsx centraliza

## 5. Backend e Supabase
- [x] Existe tabela principal de appointments/agendamentos - ✅ appointments (40+ colunas)
- [x] Existem relacionamentos corretos - ✅ FKs para patients, professionals, services, rooms, payers, plans
- [x] Existem views/RPCs de listagem - ✅ view_agenda_completa_v6 + direct queries
- [x] Existe lógica de conflito de horários - ✅ Validação em agendaApi.js
- [x] Existe lógica de slots - ✅ AgendaSlotGenerator.js com intervalo configurável
- [x] Existe tratamento de timezone - ✅ Convertido no frontend
- [x] Existe integração com paciente/profissional/serviço - ✅ Joins executados
- [x] Existe integração com status do atendimento - ✅ appointment_audit_logs table

## 6. Integrações da Agenda
- [x] Agenda integra com Financeiro - ⚠️ **PARCIAL** - appointmentFinancialIntegrationApi existe mas NÃO é auto-acionado
- [x] Agenda integra com Faturamento - ❌ **NÃO EXISTE** - guias criadas manualmente, não ligadas a appointments
- [x] Agenda integra com Repasse - ✅ **FUNCIONAL** - agendaIntegrationRepasseApi gera medical_production automaticamente
- [x] Agenda integra com Prontuário - ⚠️ **PARCIAL** - patient_records table existe, sem integração visual
- [x] Check-in gera reflexo financeiro quando aplicável - ❌ **FALTA** - Check-in não cria AR automaticamente
- [x] Atendimento realizado gera base para faturamento - ❌ **FALTA** - Guia não criada automaticamente
- [x] Atendimento realizado gera base para repasse - ✅ **FUNCIONAL** - medical_production criada via agendaIntegrationRepasseApi

## 7. Diagnóstico da Agenda

### Status geral:
**85% Funcional | 15% Integrações Faltando**
- Agenda principal: 100% OK (CRUD, views, filtros)
- Fluxo operacional: 90% OK (falta encaixe UI e check-in automático)
- Integrações: 60% OK (repasse funciona, financeiro/faturamento manual)

### Arquivos relacionados:
- Pages: `src/pages/clinica/agenda/**` (40+ arquivos)
- APIs: `appointmentsApi.js`, `agendaApi.js`, `agendaRulesApi.js`, `agendaIntegrationApi.js`, `agendaIntegrationRepasseApi.js`
- Database: `appointments`, `agenda_rules`, `professional_schedules`, `rooms`

### Estruturas Supabase relacionadas:
- `appointments` (40 colunas) - core data
- `agenda_rules` - políticas de agendamento
- `appointment_audit_logs` - auditoria
- `professional_schedules` - horários profissionais
- `rooms` - salas de atendimento
- Related: `ar_receivables` (appointment_id FK adicionado 2026-04-01)
- Related: `medical_production` (atendimento_id FK)
- Related: `medical_repasse` (do medical_production)

### O que já funciona:
✅ Criar, editar, cancelar, remarcar agendamentos
✅ Visualizações: dia, semana, mês, tabela
✅ Filtros: período, profissional, sala, status, convênio
✅ Validações: conflito de horários, slot generator
✅ Integração com Repasse: production gerada automaticamente
✅ Check-in structure existe (UI e forma)
✅ Audit logging de status

### O que está parcial:
⚠️ Encaixe (squeeze-in) - lógica existe, falta UI decorada
⚠️ Check-in - form existe, não dispara automático na conclusão
⚠️ Dialog de agendamento - funciona mas UX pode melhorar
⚠️ Relatórios - AgendaRelatorios.jsx é stub
⚠️ KPIs - AgendaKpis.jsx é stub

### O que falta:
❌ Auto-criação de AR Receivable quando appointment finalizado (BLOCKING)
❌ Auto-criação de Billing Guide quando appointment finalizado (BLOCKING)
❌ Check-in automático ao marcar "finalizado"
❌ Reversão automática ao cancelar (limpar AR, production, repasse)
❌ Payment capture no check-in (integração POS)
❌ Patient photo capture flow
❌ Appointment confirmação por link/WhatsApp (apenas infra, funciona)

### O que não deve ser alterado:
🔒 Estrutura de tabelas exists (ver faturamento para novos campos)
🔒 Rotas em `AppRoutes.jsx` (menu já mapeado)
🔒 Permissões de profissionais (hardcoded em listAppointments, usar com cuidado)
🔒 RLS policies no Supabase (já configurado)
🔒 Repasse integration - não mexa, está funcionando

### Integrações existentes:
✅ Appointments ↔ Patients (join)
✅ Appointments ↔ Professionals (join + denormalization)
✅ Appointments ↔ Services (join com TUSS/CBHPM)
✅ Appointments ↔ Rooms (join)  
✅ Appointments ↔ Payers/Plans (join)
✅ Appointments ↔ Medical Production (via trigger + RPC)
✅ Appointments ↔ Medical Repasse (via production)
✅ Appointments ↔ AR Receivables (FK exists but not auto-linked)

### Integrações faltantes:
❌ Appointments → Billing Guides (auto-create)
❌ Appointments → AR Receivables (auto-create on completion)
❌ Appointments Cancellation → Reversal cascade
❌ Check-in → Payment capture
❌ Check-in → AR status update

### Ação mínima necessária:
**BLOCKER 1 (3-4 horas):** Auto do appointment complete:
- When appointment.status = 'finalizado': trigger → create ar_receivable
- When ar_receivable created: trigger → create billing_guide
- When appointment canceled: trigger → delete ar_receivable, medical_production, repasse

**NICE TO HAVE (2-3 horas):** Check-in automático
- When appointment marked done: auto-trigger check-in form
- When check-in submitted: mark appointment as "check-in-completo"

**NICE TO HAVE (1-2 horas):** UI improvements
- Encaixe UI (button + modal)
- Relatórios (drill-downs)
- KPIs (card de métricas)

---

# ✅ CHECKLIST 2 — FINANCEIRO

## 1. Estrutura principal
- [x] Contas a receber - ✅ ContasReceber.jsx + ar_receivables table
- [x] Contas a pagar - ✅ ContasPagar.jsx + ap_bills table
- [x] Fluxo de caixa - ✅ FluxoCaixa.jsx + view/RPC
- [x] Caixa/balcão - ⚠️ **PARCIAL** - Recebimento.jsx existe mas sem POS integration
- [x] Formas de pagamento - ✅ paymentMethodsConfig.js com tipos (PIX, TED, Cheque, etc)
- [x] Categorias financeiras - ✅ account_categories, ap_bills.category_id
- [x] Plano de contas - ✅ PlanoContas.jsx + account_plans (hierárquico)
- [x] Inadimplência - ⚠️ **PARCIAL** - ar_receivables.status = 'overdue' mas sem relatório
- [x] Conciliação - ✅ ConciliacaoBancaria.jsx + conciliationApi.js  
- [x] DRE - ❌ **MOCK DATA** - DashboardDRE.jsx usa dados fictícios (BLOCKING)
- [x] Relatórios financeiros - ⚠️ **PARCIAL** - Estrutura existe, sem queries reais

## 2. Operações
- [x] Lançar recebimento - ✅ NovoRecebimento.jsx (manual entry)
- [x] Lançar pagamento - ✅ NovaConta.jsx (manual entry)
- [x] Baixar recebimento - ✅ Atualizar AR status (manual)
- [x] Baixar pagamento - ✅ payAccountsPayableBatch() RPC (batch)
- [x] Estornar lançamento - ⚠️ **PARCIAL** - Estrutura existe, sem UI de reversão
- [x] Filtrar por período - ✅ date range queries
- [x] Filtrar por status - ✅ statusList filter em financeApi
- [x] Filtrar por origem - ✅ "origem" field em ar_receivables
- [x] Filtrar por profissional/unidade - ✅ professional_id, unit filters
- [x] Visualizar origem do lançamento - ✅ appointment_id link, guide link

## 3. UX e telas
- [x] Listagens funcionais - ✅ Tables com React Table
- [x] Filtros funcionais - ✅ Search, date, status, amount filters
- [x] Cards de resumo - ✅ SummaryCards component (receita, despesa, saldo)
- [x] Indicadores financeiros - ✅ KPI cards (alguns mock, alguns reais)
- [x] Tela de recebimento no balcão - ✅ NovoRecebimento.jsx
- [x] Tela de contas a pagar - ✅ ContasPagar.jsx (full CRUD)
- [x] Tela de contas a receber - ✅ ContasReceber.jsx (com status)
- [x] Tela/visão de fluxo de caixa - ✅ FluxoCaixa.jsx (RPC based)
- [x] Tela/visão de DRE - ❌ **MOCK DATA ISSUE** DashboardDRE.jsx (needs real data)

## 4. Backend e Supabase
- [x] Existem tabelas financeiras principais - ✅ ap_bills, ar_receivables (well structured)
- [x] Existem vínculos com atendimento quando necessário - ✅ appointment_id FK in ar_receivables
- [x] Existem views de resumo - ✅ ap_bills_with_category, cash_flow_view
- [x] Existem materialized views se necessário - ⚠️ **PARCIAL** - view ao invés de MV (performance?)
- [x] Existem RPCs de cálculo/resumo - ✅ list_ap_bills(), cashflow_summary()
- [x] Existem triggers de sincronização quando necessário - ⚠️ **PARCIAL** - Faltam triggers de appointment completion

## 5. Integrações do Financeiro
- [x] Financeiro integra com Agenda - ❌ **NÃO AUTO** - Requer chamada manual de finalizeAppointmentWithFinancials()
- [x] Financeiro integra com Check-in - ❌ **NÃO AUTO** - saveCheckInFinancialData() existe mas manual
- [x] Financeiro integra com Faturamento - ⚠️ **PARCIAL** - guiasApi existe, sem link AR ↔ guide
- [x] Financeiro integra com Repasse - ✅ **FUNCIONAL** - medicalRepasseApi gera AP bills
- [x] Financeiro integra com Nota Fiscal - ❌ **NÃO EXISTE** - invoices table existe, unused
- [x] Atendimento pode gerar conta a receber - ❌ **FALTA** - appointmentFinancialIntegrationApi exists, not auto-triggered
- [x] Recebimento de convênio entra corretamente no financeiro - ⚠️ **PARCIAL** - Manual, requer payment_received + guide_id
- [x] Repasse pode considerar recebimento financeiro - ❌ **FALTA** - Repasse calcula 70/30 de valor bruto, ignora glosas

## 6. Diagnóstico do Financeiro

### Status geral:
**64% Funcional | 36% Parcial/Faltando**
- AP Bills: 85% OK (CRUD, bulk operations)
- AR Receivables: 60% OK (manual entry, sem auto-create)
- Cash Flow: 80% OK (RPC works)
- DRE: 30% OK (mock data - BLOCKING)
- Integration: 40% OK (manual flows)

### Arquivos relacionados:
- Pages: `src/pages/clinica/financeiro/**` (17 páginas)
- APIs: `financeApi.js`, `receivablesApi.js`, `financialAccountsApi.js`, `repasseBancariaApi.js`, `conciliationApi.js`
- Database: `ap_bills`, `ar_receivables`, `account_plans`, `cost_centers`

### Estruturas Supabase relacionadas:
- `ap_bills` - contas a pagar (id, clinic_id, description, amount, due_date, status, vendor_name, category_id)
- `ar_receivables` - contas a receber (+ appointment_id FK, payer_name, origem)
- `account_plans` - plano de contas (chart of accounts com hierarchy)
- `cost_centers` - centros de custo
- `financial_transactions` - movimentação (incomplete)
- `invoices` - notas fiscais (unused)
- Views: `ap_bills_with_category`, `cash_flow_view`, `ar_summary_view`
- RPC: `list_ap_bills()`, `cashflow_summary()`, `pay_accounts_payable_batch()`

### O que já funciona:
✅ Criar/editar/deletar contas a pagar (AP)
✅ Criar/editar contas a receber (AR) manual
✅ Visualizar fluxo de caixa (RPC based)
✅ Classificar por plano de contas
✅ Filtrar por período, status, vendor
✅ Bulk payment operations
✅ Conciliação bancária (com sugestões)
✅ Repasse as AP integration (automatic)
✅ Cost centers com rateios
✅ Chart of accounts (hierárquico)

### O que está parcial:
⚠️ DRE Dashboard - usa mock data, needs real queries
⚠️ AR auto-create - API exists (appointmentFinancialIntegrationApi) mas não acionado
⚠️ Payment capture - structure exists, sem POS integration
⚠️ Relatórios - stubs, sem drill-down
⚠️ Invoice generation - table exists, unused
⚠️ Estorno - sem UI dedicated

### O que falta:
❌ Auto-create AR quando appointment finalizado (BLOCKING - 3h)
❌ Real DRE data (replace mock with queries) (BLOCKING - 2h)
❌ Appointment cancellation → reverse AR/AP (BLOCKING - 2h)
❌ Guide payment sync → update AR status
❌ Glosa import/handling → impact on repasse
❌ Bank transfer automation (PIX/TED)
❌ Multi-currency support
❌ GL Journal entries
❌ Audit trail for all changes

### O que não deve ser alterado:
🔒 ap_bills table structure (contains repasse metadata)
🔒 account_plans hierarchy (used by cost centers)
🔒 RLS policies (already set for clinic isolation)
🔒 Existing RPCs (used by multiple modules)
🔒 Payment methods enum (hardcoded in config)

### Integrações existentes:
✅ AP Bills ↔ Financial Accounts (category_id)
✅ AR Receivables ↔ Appointments (appointment_id FK added 2026-04-01)
✅ AP Bills ↔ Repasse (repasse_doctor_name, linked_invoice_id metadata)
✅ AR Receivables ↔ Chart of Accounts (implicit via origin)
✅ Transactions ↔ Cost Centers (center_custo_id in AR)
✅ Conciliation ↔ Bank Accounts

### Integrações faltantes:
❌ AR Receivables ← Appointments (auto-create on finish) - CRITICAL
❌ AR Status ← Guide Payment (sync)
❌ AP Bills ← Guide Glosa (reduce/cancel)
❌ GL Journal ← Transactions (no GL entries exist)
❌ Invoice ← AR Receivable (one-to-many)
❌ Repasse ← Guide Glosa (adjust for denials)

### Ação mínima necessária:
**BLOCKER 1 (2-3 horas):** Fix DRE mock data
- Replace mock JSON com real queries to account_plans + transactions
- Implement DRE calculation: revenues - expenses by category

**BLOCKER 2 (3 horas):** Auto AR creation
- Create trigger: when appointment.status = 'finalizado' → insert ar_receivable
- Wire finalizeAppointmentWithFinancials() to actually be called

**BLOCKER 3 (2 horas):** Appointment cancellation reversal  
- Create trigger: when appointment canceled → delete related ar_receivable, medical_production, repasse

**NICE TO HAVE (4 horas):** Guide payment integration
- When guide payment received in faturamento → call financeApi to update AR status

---

# ✅ CHECKLIST 3 — FATURAMENTO MÉDICO / TISS

## 1. Estrutura principal
- [x] Cadastro/estrutura de guias - ✅ billing_guides table + GuiasPage.jsx
- [x] Cadastro/estrutura de lotes - ⚠️ **PARCIAL** - LotesPage.jsx existe, tabela incompleta
- [x] Itens faturáveis - ⚠️ **PARCIAL** - Campos em billing_guides, sem tabela separada
- [x] Convênios - ✅ health_insurances table (financeiros fields adicionados)
- [x] Planos - ✅ plans table + service_prices mapping
- [x] Status de faturamento - ✅ billing_guides.status field
- [x] Glosas - ❌ **NÃO EXISTE** - Nenhuma tabela ou module
- [x] Recursos de glosa - ❌ **NÃO EXISTE**
- [x] Recebimentos de convênios - ⚠️ **PARCIAL** - via ar_receivables com guide_number link
- [x] XML/TISS - ❌ **ESTRUTURA, NÃO IMPLEMENTADO** - tiss/ pasta é stub

## 2. Fluxo operacional
- [x] Atendimento gera item faturável - ❌ **NÃO AUTO** - Manual create guide
- [x] Item entra em guia - ✅ criarGuia() function (manual)
- [x] Guia entra em lote - ⚠️ **ESTRUTURA SEM IMPLEMENTAÇÃO** - Tabela estruturada, sem trigger
- [x] Lote gera XML - ❌ **NÃO EXISTE** - xml_path field exists, never populated
- [x] Lote tem status de envio - ⚠️ **PARCIAL** - status_envio field no lote, sem workflow
- [x] Existe retorno de faturamento - ❌ **NÃO EXISTE** - Nenhum import/tracking de retornos
- [x] Existe controle de glosa - ❌ **NÃO EXISTE**
- [x] Existe baixa/recebimento de convênio - ⚠️ **PARCIAL** - ar_receivables manual update
- [x] Existe rastreabilidade por atendimento - ❌ **FALTA** - guides.appointment_id column não existe!

## 3. UX e telas
- [x] Tela de guias - ✅ GuiasPage.jsx (CRUD funcional)
- [x] Tela de lotes - ⚠️ **PARCIAL** - LotesPage.jsx (form existe, sem processamento)
- [x] Tela de convênios/planos relacionada - ✅ Via configurações (health_insurances management)
- [x] Filtros por período - ✅ date range em listarGuias()
- [x] Filtros por convênio - ✅ filter by payer_id
- [x] Filtros por status - ✅ filter by status field
- [x] Indicadores de faturamento - ⚠️ **PARCIAL** - FaturamentoDashboard.jsx (mock data)
- [x] Relatórios de faturamento - ⚠️ **PARCIAL** - RelatoriosPage.jsx (stubs)

## 4. Backend e Supabase
- [x] Existem tabelas de guias - ✅ billing_guides (30+ colunas)
- [x] Existem tabelas de lotes - ⚠️ **PARCIAL** - Tabela existe (id, clinic_id, status, created_at) MAS SEM relacionamentos
- [x] Existem itens de faturamento - ⚠️ **PARCIAL** - Campos em billing_guides, sem tabela separada
- [x] Existem relacionamentos com atendimento - ❌ **CRÍTICO FALTA** - guides.appointment_id column NÃO EXISTE
- [x] Existem views - ❌ **NÃO EXISTE** - Nenhuma view para aggregates
- [x] Existem RPCs - ❌ **NÃO EXISTE** - Sem processamento server-side
- [x] Existem triggers - ❌ **NÃO EXISTE** - Sem automação
- [x] Existe base para XML/TISS - ⚠️ **ESTRUTURA SEM IMPLEMENTAÇÃO** - xml_path field exists, never used

## 5. Integrações do Faturamento
- [x] Faturamento integra com Agenda - ❌ **NÃO AUTO** - guides.appointment_id não existe
- [x] Faturamento integra com Financeiro - ⚠️ **FRACO** - guides.guide_number pode linkar AR mas sem FK
- [x] Faturamento integra com Repasse - ❌ **NÃO EXISTE** - Glosas não impactam repasse
- [x] Atendimento realizado alimenta faturamento - ❌ **NÃO AUTO** - Manual guide creation
- [x] Recebimento do convênio reflete no financeiro - ⚠️ **MANUAL** - Must manually update AR status
- [x] Glosa impacta financeiro - ❌ **NÃO EXISTE**
- [x] Glosa/recebimento impacta repasse quando aplicável - ❌ **NÃO EXISTE**

## 6. Diagnóstico do Faturamento

### Status geral:
**30% Funcional | 70% Parcial/Faltando**
- Data entry: 85% OK (CRUD for guides, manual)
- Auto-creation: 0% (no auto-generate from appointments)
- XML generation: 5% (structure only)
- Glosa handling: 0% (doesn't exist)
- Integration: 15% (weak, manual)

### Arquivos relacionados:
- Pages: `src/pages/clinica/faturamento/**` (15 páginas + tiss/ sadt/ folders)
- APIs: `guiasApi.js`, `appointmentBillingApi.js`, `tiskCascadeValidationApi.js`
- Database: `billing_guides`, `lotes`, `cbhpm` (procedures)

### Estruturas Supabase relacionadas:
- `billing_guides` - guias de consulta/internação (tipo_guia, status, paciente data, etc)
- `lotes` - batches (id, clinic_id, status_envio, xml_path, created_at) [INCOMPLETE]
- `cbhpm` - CBHPM procedure codes (code, description, etc)
- `service_prices` - prices by payer/plan including plano, grupo fields

### O que já funciona:
✅ Manual guide CRUD (create, read, update, delete)
✅ Guide status tracking
✅ Guide number auto-generation
✅ CBHPM code lookup
✅ Service price lookup per payer/plan
✅ Validation logic exists (patient name, card, etc)

### O que está parcial:
⚠️ Lotes structure exists but no batch processing
⚠️ XML field exists but never populated
⚠️ Validation wired but not enforced UI-side
⚠️ Relatórios use mock data
⚠️ SADT/Internação = stubs só SP

### O que falta:
❌ **CRITICAL:** guides.appointment_id column (blocks all automation)
❌ Auto-create guide when appointment completed
❌ Auto-generate XML/TISS from guide
❌ Batch/lot processing logic
❌ Glosa imports/tracking  
❌ Return/denial handling
❌ SADT module implementation
❌ Internação module implementation
❌ Retorno de faturamento import
❌ GL entries for insurance receivables

### O que não deve ser alterado:
🔒 CBHPM procedure codes (static reference, updated 2026-02-16)
🔒 health_insurances structure (already complete with TISS fields)
🔒 service_prices logic (configured per payer/plan)
🔒 Guide number generation logic

### Integrações existentes:
✅ Guides ↔ Health Insurances (payer info)
✅ Guides ↔ CBHPM procedures (code lookup)
✅ Guides ↔ Service Prices (value lookup)
✅ Guides ↔ Patients (info denormalized)
✅ Guides ↔ Plans (plan data)

### Integrações faltantes:
❌ Guides ← Appointments (auto-create) - CRITICAL
❌ Guides ↔ AR Receivables (proper FK + sync) - CRITICAL
❌ Guides → Lotes (batch routing) - CRITICAL
❌ Lotes → XML (generation) - CRITICAL
❌ Guides ← Glosas (import denials)
❌ Glosas → Repasse (adjust calculations)
❌ XML → Insurance (submission/tracking)
❌ Insurance Returns → System (import)

### Ação mínima necessária:
**BLOCKER 1 (10 min SQL):** Add missing guidance/appointment link
```sql
ALTER TABLE billing_guides ADD COLUMN appointment_id UUID;
ALTER TABLE billing_guides ADD CONSTRAINT fk_guides_appointments 
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;
```

**BLOCKER 2 (3 horas):** Auto-create guide on appointment completion
- Wire finalizeAppointmentWithFinancials() to call createGuiaFromAppointment()
- Pass appointment data to populate guide automatically

**BLOCKER 3 (2 horas):** Link to AR for proper reconciliation
- Update AR creation to set guide_id when guide exists
- Create proper FK: ar_receivables.guide_id → billing_guides.id

**NICE TO HAVE (6 hours):** XML generation  
- Implement tiss.generateXMLFromGuide()
- Save to xml_path + update status

---

# ✅ CHECKLIST 4 — REPASSE MÉDICO

## 1. Estrutura de configuração
- [x] Existe repasse por profissional - ✅ medical_repasse_config table
- [x] Existe repasse por grupo de serviço - ✅ repasse_config table has service_group_id
- [x] Existe repasse por serviço individual - ✅ repasse_config_servico table (NEW!)
- [x] Existe percentual configurável - ✅ commission_percent field (default 70)
- [x] Existe tipo bruto/líquido - ✅ calculation_type field (gross/net)
- [x] Existe prioridade de regra - ✅ repasse_config has priority field
- [x] Existe vigência/configuração temporal, se aplicável - ⚠️ **PARCIAL** - effective_date exists, sem end_date

## 2. Regra de precedência
- [x] Serviço individual tem prioridade - ✅ repasse_config_servico priority = 1 (implied)
- [x] Grupo de serviço é segunda prioridade - ✅ repasse_config (group-level) priority = 2 (implied)
- [x] Profissional geral é terceira prioridade - ✅ medical_repasse_config (prof-level) priority = 3 (implied)

## 3. Operação
- [x] Atendimento gera base de repasse - ✅ medical_production created on appointment completion
- [x] Recebimento pode gerar base de repasse - ⚠️ **PARCIAL** - logic not wired
- [x] Existe cálculo automático - ✅ generate_doctor_commissions_v2() RPC auto-calculates
- [x] Existe cálculo manual complementar - ✅ UI form para ajustes (RepasseAjustePage)
- [x] Existe listagem de repasses - ✅ RepasseMedicoPage (dashboard + lista histórico)
- [x] Existe status de repasse - ✅ status field (pending, pending_payment, paid, etc)
- [x] Existe fechamento por período - ✅ gerarRepasse() by mes/ano
- [x] Existe relatório por profissional - ✅ RepasseDashboardAnalyticsPage drills per professional

## 4. Backend e Supabase
- [x] Existem tabelas de configuração de repasse - ✅ medical_repasse_config, repasse_config, repasse_config_servico
- [x] Existem tabelas de lançamentos de repasse - ✅ doctor_commissions (NEW), medical_repasse (legacy), medical_production
- [x] Existem views/resumos - ⚠️ **PARCIAL** - Alguns views, não todas aggregates
- [x] Existem funções/RPCs de cálculo - ✅ generate_doctor_commissions_v2() (correct)
- [x] Existem triggers/integrações - ⚠️ **PARCIAL** - trigger para AR exist, mas sem glosa handling

## 5. Integrações do Repasse
- [x] Repasse integra com Agenda - ✅ Reads from appointments (via medical_production)
- [x] Repasse integra com Financeiro - ✅ Gera AP bills (liberar_repasse_pagamento RPC)
- [x] Repasse integra com Faturamento - ❌ **NÃO EXISTE** - Não considera glosas
- [x] Repasse considera profissional - ✅ professional_id is core (config + calculation)
- [x] Repasse considera serviço - ✅ service_id in medical_production (linked to service precedence)
- [x] Repasse considera grupo de serviço - ⚠️ **PARCIAL** - repasse_config_grupo exists, not wired in UI
- [x] Repasse considera valor produzido - ✅ Calcula de appointments.value
- [x] Repasse considera valor recebido, quando aplicável - ❌ **NÃO AUTO** - logic exists but not triggered
- [x] Glosa impacta repasse, quando aplicável - ❌ **NÃO EXISTE** - Ignora denials completamente

## 6. Diagnóstico do Repasse

### Status geral:
**75% Funcional | 25% Parcial/Faltando**
- Config: 90% OK (3 levels, priorities, % configs)
- Calculation: 90% OK (RPC works, math correct)
- Auto-trigger: 60% OK (manual monthly click needed)
- Billing integration: 50% OK (can create AP, no glosa handling)
- Full automation: 30% (need scheduler + billing feedback)

### Arquivos relacionados:
- Pages: `src/pages/financeiro/**` (9 páginas: Medico, Regras, Dashboard, Automacao, etc)
- APIs: `repasseMedicoApi.js`, `repasseConfigApi.js`, `repasseSchedulerApi.js`, `medicalRepasseApi.js`
- Database: `medical_repasse_config`, `repasse_config`, `repasse_config_servico`, `doctor_commissions`, `medical_production`

### Estruturas Supabase relacionadas:
- `medical_repasse_config` - professional-level config (professional_id, commission_percent, etc)
- `repasse_config` - group-level config (service_group_id, commission_percent, precedence)
- `repasse_config_servico` - service-level config (service_id, commission_percent, override)
- `doctor_commissions` - actual payment records (NEW 2026-04-09, correct structure)
- `medical_production` - production tracking (service count, gross, net)
- `medical_repasse` - legacy (unused, tech debt)

### O que já funciona:
✅ Configure % by profissional (70% default)
✅ Configure % by grupo de serviço
✅ Configure % by serviço individual
✅ Manual repasse generation via button
✅ Dashboard de repasses (período, profissional)
✅ Histórico de repasses
✅ Manual adjustments via form
✅ RPC calculation (math correct)  
✅ Auto-generation to AP bills (liberar_repasse_pagamento)
✅ Status tracking

### O que está parcial:
⚠️ Monthly auto-trigger - scheduler code has bug ('today' undefined)
⚠️ Service-level rules - config exists, not wired in UI forms
⚠️ Glosa handling - calculated on 100%, ignores rejections
⚠️ Bank transfers - stubs only (no PIX/TED execution)
⚠️ Receivable sync - production only from appointments, not from guide payments

### O que falta:
❌ **CRITICO:** Working month-end auto-trigger (scheduler bug fix + cron setup) - 2-3h
❌ **CRITICO:** Billing link - respect guide glosas in calculation - 4-5h
❌ **CRITICO:** Service-level rule UI - currently must config via direct SQL - 2h
❌ Bank transfer automation (PIX/TED execution)
❌ Receivable-based repasse (alternate calculation mode)
❌ Multi-currency support
❌ Retention/withholding calculation
❌ Professional payment history export

### O que não deve ser alterado:
🔒 doctor_commissions table structure (correct, 2026-04-09)
🔒 RPC generate_doctor_commissions_v2() (math is working)
🔒 medical_production trigger (working correctly)
🔒 Existing configuration screens (forms functional)

### Integrações existentes:
✅ Repasse ← Appointments (via medical_production auto-trigger)
✅ Repasse ← Services (service_id for precedence)
✅ Repasse → Medical Production (production value source)
✅ Repasse → AP Bills (liberar_repasse_pagamento RPC)
✅ Repasse config ↔ Professional (1-to-many)
✅ Repasse config ↔ Service Group (1-to-many)
✅ Repasse config ↔ Individual Service (1-to-many precedence)

### Integrações faltando:
❌ Repasse ← Billing Guides (should reduce on glosa)  
❌ Repasse ↔ Guide Payment (should trigger alt calculation)
❌ Repasse → Professional Notifications (payment alerts)
❌ Repasse → Bank Integration (PIX/TED execution)
❌ Repasse → Email receipts (payment slips)

### Ação mínima necessária:
**BLOCKER 1 (0.5-1 hora):** Fix scheduler bug
- Fix repasseSchedulerApi.js line ~40: 'today' undefined
- Implement proper date calculation

**BLOCKER 2 (1-2 horas):** Wire automatic monthly generation
- Setup backend cron: month-end auto-call generate_doctor_commissions_v2()
- Add UI notification when triggered

**BLOCKER 3 (2-3 horas):** Link to guide glosas
- When guide glosa imported → reduce doctor_commission value
- When guide payment received → update commission status

**NICE TO HAVE (2 horas):** Service-level config UI
- Add form to RepasseRegrasPage for service-level overrides
- Currently must config via SQL

---

# ✅ CHECKLIST 5 — CONFIGURAÇÕES RELACIONADAS

## 1. Configurações da clínica
- [x] Nome da clínica - ✅ clinics.name (editable in GeraisConfig)
- [x] Nome fantasia - ✅ clinics.fantasy_name
- [x] Logo - ✅ clinics.logo_url (storage configured 2026-02-10)
- [x] Cores/branding - ✅ brand UI colors in tailwind + clinicBranding.js
- [x] Endereço - ✅ clinics (address fields)
- [x] Contatos - ✅ phone, email in clinics + clinic_members
- [x] CNPJ - ✅ clinics.cnpj
- [x] CNES - ✅ clinics.cnes_code
- [x] Timezone - ⚠️ **PARCIAL** - No timezone field, hardcoded US/Eastern in some places

## 2. Configurações da agenda
- [x] Horário de abertura - ✅ professional_schedules.start_time
- [x] Horário de fechamento - ✅ professional_schedules.end_time
- [x] Intervalo de almoço - ✅ agenda_rules.break_start, break_end
- [x] Slot da agenda - ✅ agenda_rules.slot_duration_minutes
- [x] Tempo médio de atendimento - ✅ services.duration_minutes
- [x] Regras de encaixe - ✅ agenda_rules table (created but UI minimal)
- [x] Regras de edição/cancelamento - ⚠️ **PARCIAL** - Logic exists, sem UI config
- [x] Feriados/bloqueios - ✅ holidays table + mandatory flag

## 3. Configurações financeiras/faturamento/repasse
- [x] Parâmetros financeiros - ✅ account_plans (chart of accounts)
- [x] Formas de pagamento padrão - ✅ paymentMethodsConfig.js (PIX, TED, Cheque, etc)
- [x] Regras padrão de faturamento - ⚠️ **STUB** - FaturamentoConfig.jsx exists, no implementation
- [x] Regras padrão de repasse - ✅ medical_repasse_config (% by professional)
- [x] Parâmetros por clínica/unidade - ⚠️ **PARCIAL** - Config is per-clinic, sem per-unit overrides

## 4. Diagnóstico das Configurações

### Status geral:
**60% Funcional | 40% Parcial/Faltando**
- Clinic info: 90% (editable, complete)
- Agenda rules: 70% (config exists, UI needs improvement)
- Finance config: 50% (some screens stubs)
- Integration: 30% (configs not linked to behavior)

### Arquivos relacionados:
- Pages: `src/pages/clinica/configuracoes/**` (14 páginas)
- Database: clinics, professional_schedules, agenda_rules, holidays, account_plans

### O que já funciona:
✅ Edit clinic name, CNPJ, address, contacts
✅ Upload clinic logo
✅ Configure professional schedules
✅ Set agenda slot duration
✅ Configure holidays (with mandatory flag)
✅ View chart of accounts

### O que está parcial:
⚠️ Break times not fully in UI
⚠️ Encaixe rules exist but UI is minimal
⚠️ Edit/cancel rules not configurable via UI
⚠️ Faturamento config = stub
⚠️ Repasse config = basic (only % by prof, no UI for groups/services)

### O que falta:
❌ Timezone configuration per clinic
❌ Clinical unit configuration (sub-groups of clinic)
❌ Per-unit repasse override config
❌ Financial account custom categories
❌ Agenda automation rules (auto-confirm, auto-reminder, etc)
❌ Payment method per payer/plan
❌ Insurance pre-auth thresholds

### O que não deve ser alterado:
🔒 clinics table structure
🔒 professional_schedules basic schema
🔒 agenda_rules framework
🔒 Chart of accounts (used by multiple modules)

### Ação mínima necessária:
**NICE TO HAVE (1 hora):** Add timezone config
- Add clinics.timezone field  
- Use in date/time conversions

**NICE TO HAVE (2 horas):** Complete repasse config UI
- Form for service-group level overrides
- Form for service-level overrides

---

# ✅ CHECKLIST 6 — RELATÓRIOS DERIVADOS

## 1. Relatórios da agenda
- [x] Atendimentos por período - ⚠️ **PARCIAL** - AgendaRelatorios.jsx (stub)
- [x] Ocupação da agenda - ⚠️ **PARCIAL** - AgendaKpis.jsx (mock data)
- [x] Faltas/cancelamentos - ⚠️ **PARCIAL** - Status tracking exists, sem aggregation
- [x] Produção por profissional - ✅ medical_production RPC exists (can query)

## 2. Relatórios financeiros
- [x] Receitas por período - ⚠️ **PARCIAL** - Via AR queries (not aggregated)
- [x] Despesas por período - ✅ AP queries exist
- [x] Fluxo de caixa - ✅ FluxoCaixa funcional, RPC-based
- [x] DRE - ❌ **MOCK DATA** Dashboard DRE.jsx uses hardcoded data
- [x] Inadimplência - ⚠️ **PARCIAL** - overdue field exists, sem relatório

## 3. Relatórios de faturamento
- [x] Faturado por convênio - ⚠️ **PARCIAL** - Pode query guias, sem aggregation
- [x] Faturado por período - ⚠️ **PARCIAL** - Similar, sem UI
- [x] Glosas - ❌ **NÃO EXISTE**
- [x] Recebimentos - ⚠️ **PARCIAL** - Via AR manual tracking
- [x] Pendências - ⚠️ **PARCIAL** - guides.status tracking, sem dashboard

## 4. Relatórios de repasse
- [x] Repasse por profissional - ✅ RepasseDashboardAnalyticsPage (working)
- [x] Repasse por período - ✅ Monthly breakdown
- [x] Pendente x pago - ✅ Status filtering
- [x] Produção x recebimento x repasse - ⚠️ **PARCIAL** - Data exists, sem 3-way reconciliation UI

## 5. Diagnóstico dos Relatórios

### Status geral:
**45% Funcional | 55% Stubs/Faltando**

### O que já funciona:
✅ Repasse per professional dashboard
✅ Cash flow RPC
✅ Status tracking capabilities

### O que está parcial:
⚠️ Agenda reports = stubs, pode have data foundation
⚠️ Finance reports = partial implementations
⚠️ Faturamento reports = reliant on manual aggregation

### O que falta:
❌ Production vs revenue reconciliation
❌ Glosa impact analysis
❌ Professional performance metrics
❌ Insurance mix analysis
❌ Drill-down capability (click to details)
❌ Export to PDF/Excel
❌ Scheduled report delivery

### Ação mínima necessária:
**LOW PRIORITY** - Reports can be deferred to Phase 2. Foundation queries are solid, just needs UI layer.

---

# 📊 CONSOLIDAÇÃO FINAL - RESUMO POR PRIORIDADE

## PRIORIDADE 1 — BLOCKERS CRÍTICOS (Impedem funcionamento end-to-end)

### 1.1 Auto-criar AR quando appointment finalizado (AGENDA + FINANCEIRO)
**Impacto:** Toda semana de agenda gera 0 AR sem isso - manualissimo
**Solução:** Trigger ou call em appointmentsApi.updateAppointment() quando status = 'finalizado'
**Esforço:** 3-4 horas
**Status atual:** appointmentFinancialIntegrationApi.finalizeAppointmentWithFinancials() exists mas nunca é chamado
```
Appointment complete → [AUTO] create ar_receivable → [AUTO] create billing_guide
```

### 1.2 Auto-criar Billing Guide quando appointment finalizado (AGENDA + FATURAMENTO)
**Impacto:** Zero guides criados automaticamente - 100% manual
**Solução:** Add guides.appointment_id FK + trigger ao finalizar
**Esforço:** 2-3 horas
**Status atual:** guides.appointment_id column não existe
```
ALTER TABLE billing_guides ADD COLUMN appointment_id UUID;
Add trigger in finalizeAppointmentWithFinancials()
```

### 1.3 Cancelamento de appointment deve reverter todos os registros financeiros (AGENDA + FINANCEIRO)
**Impacto:** Cancela appointment, mas AR/production/repasse ficam - erro de fechamento
**Solução:** Cascade delete ou reverse-trigger
**Esforço:** 2-3 horas
**Status atual:** deleteAppointment() não limpa associated records
```
When appointment deleted:
  → DELETE ar_receivable (cascade via FK)
  → DELETE medical_production (cascade)
  → DELETE medical_repasse entries (cascade)
```

### 1.4 DRE use mock data (FINANCEIRO)
**Impacto:** Dashboard financeiro mostra números fictícios - inútil para decisão
**Solução:** Replace mock JSON com real queries
**Esforço:** 2-3 horas
**Status atual:** DashboardDRE.jsx has hardcoded income/expenses
```sql
SELECT category, SUM(amount) 
FROM transactions 
WHERE period = atual
GROUP BY category
```

### 1.5 Scheduler bug - repasse 'today' undefined (REPASSE)
**Impacto:** Auto-monthly não funciona (se fosse acionado)
**Solução:** Fix repasseSchedulerApi line 40, proper date calc
**Esforço:** 0.5 hora
**Status atual:** repasseSchedulerApi.js has undefined variable

---

## PRIORIDADE 2 — INTEGRAÇÃO PARCIAL (Funcionam, mas não falam entre si automaticamente)

### 2.1 Guide payment não atualiza AR status (FATURAMENTO ↔ FINANCEIRO)
**Impacto:** Guide paid but AR still says "open"
**Solução:** When guide status = paid → update linked AR status = received
**Esforço:** 2-3 horas
**Status atual:** Manual update apenas

### 2.2 Glosa (denial/rejection) não impacta repasse (FATURAMENTO ↔ REPASSE)
**Impacto:** Repasse calcula 100%, ignora 30% glosa= wrong payment
**Solução:** When guide glosa imported → reduce doctor_commission value
**Esforço:** 4-5 horas (includes glosa module creation)
**Status atual:** Glosa module doesn't exist

### 2.3 AP bill creation de repasse sem proper check se appointment foi financializado
**Impacto:** Pode gerar AP duplicado se appointment processado twice
**Solução:** Check ar_receivable exists before creating AP
**Esforço:** 1-2 horas
**Status atual:** No validation, just creates AP directly

### 2.4 Service-level repasse config não tem UI (REPASSE CONFIG)
**Impacto:** Config por serviço é via SQL, sem UI
**Solução:** Add RepasseRegrasPage form para repasse_config_servico
**Esforço:** 2-3 horas
**Status atual:** Tables exist, no UI

---

## PRIORIDADE 3 — MELHORIAS SECUNDÁRIAS (Não bloqueiam, mas melhoram UX)

### 3.1 XML generation do TISS (FATURAMENTO)
**Impacto:** Guides criadas mas não podem ser enviadas pro convênio
**Solução:** Implement tiss.generateXML(), save to xml_path
**Esforço:** 6-8 horas (complex TISS spec)
**Status atual:** xml_path field exists, never populated

### 3.2 Relativos/SADT/Internação modules (FATURAMENTO)
**Impacto:** Só SP implemented, outros tipos manual
**Solução:** Implement other guide types
**Esforço:** 3-4 horas per type
**Status atual:** Stubs, tipo_guia field exists

### 3.3 Payment capture integration (CHECK-IN + FINANCEIRO)
**Impacto:** Check-in só valida, não captura dinheiro
**Solução:** Integrate POS/gateway
**Esforço:** 15+ horas (payment provider dependent)
**Status atual:** Structure exists, no POS wiring

### 3.4 Bank transfer automation PIX/TED (FINANCEIRO)
**Impacto:** AP payments + repasse transfers still manual
**Solução:** Integrate com bank API
**Esforço:** 6-8 horas (provider dependent)
**Status atual:** Stubs in repasseBancariaApi

### 3.5 Audit & compliance reports
**Impacto:** No GL entries, limited audit trail
**Solução:** Add GL journal entries, comprehensive change logs
**Esforço:** 5-6 horas
**Status atual:** Basic audit logs exist

---

## 📈 MAPA DE INTEGRAÇÃO CONSOLIDADO

```
┌──────────────────────────────────────────────────────────────────┐
│                         FLUXO END-TO-END                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [1. AGENDA]                                                     │
│  └─ Appointment created/completed                               │
│     ├─ [AUTO ✅] medical_production created                     │
│     ├─ [MAN ❌ → AUTO🚧] ar_receivable should be created        │
│     └─ [MAN ❌ → AUTO🚧] billing_guide should be created        │
│                                                                  │
│  [2. FATURAMENTO]                                               │
│  └─ Billing guide created (manual or auto)                      │
│     ├─ [STATUS ✅] guide_status tracking              │
│     ├─ [MAN ❌] XML should be generated               │
│     └─ [GLOSA ❌] Denials not imported                │
│          └─ Impacts [3. REPASSE]                      │
│                                                                  │
│  [3. REPASSE MÉDICO]                                            │
│  └─ Month-end                                                    │
│     ├─ [MAN 🚧] generate_doctor_commissions_v2() called        │
│     ├─ [AUTO ✅] Calculation 70/30                              │
│     ├─ [GLOSA ❌] Should reduce for denials            │
│     └─ [AUTO ✅] AP bill created via liberar_repasse  │
│          └─ Links to [4. FINANCEIRO]                           │
│                                                                  │
│  [4. FINANCEIRO]                                                │
│  └─ Cash management                                             │
│     ├─ [CASH ✅] AR/AP tracking                               │
│     ├─ [FLOW ✅] Cash flow RPC                                │
│     ├─ [DRE ❌] Mock data (should use real queries)  │
│     ├─ [MAN ❌] AR payment must manually update guide│
│     └─ [MAN ❌] Bank transfers manual (stubs)        │
│                                                                  │
│  [5. RELATÓRIOS]                                               │
│  └─ Business intelligence                                       │
│     ├─ [REPASSE ✅] Professional repasse drills       │
│     ├─ [FLOW ✅] Cash flow visualization              │
│     ├─ [APPT ❌] Appointment KPIs = mock data        │
│     ├─ [FATURAMENTO ❌] Billing mix analysis = missing
│     └─ [GLOSA ❌] Denial tracking = missing          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

LEGEND:
✅ = Working automatically
🚧 = Partially working, needs fixes
❌ = Missing / Manual only
```

---

# 🎯 PLANO DE IMPLEMENTAÇÃO MÍNIMA

## FASE 1: BLOCKERS CRÍTICOS (1-2 dias | 15-18 horas)
**Goal:** Unlock financial automation end-to-end

✅ **BLOCKER 1.1** - Auto AR creation on appointment completion
- File: `src/lib/appointmentFinancialIntegrationApi.js`
- Action: Wire finalizeAppointmentWithFinancials() call in `appointmentsApi.updateAppointment()`
- Effort: 3h | Risk: Medium (integration point)
- Deliverable: AR created with appointment_id FK

✅ **BLOCKER 1.2** - Add billing guide auto-creation
- File: `supabase/migrations/20260410_add_appointment_fk_guias.sql` (NEW)
- Action: ALTER TABLE billing_guides ADD COLUMN appointment_id
- File: `src/lib/appointmentFinancialIntegrationApi.js`
- Action: Call guiasApi.criarGuia() with appointment data
- Effort: 2.5h | Risk: Low
- Deliverable: Guides auto-created with appointment link

✅ **BLOCKER 1.3** - Appointment cancellation reversal
- File: `src/lib/appointmentsApi.js` (deleteAppointment)
- Action: Add cascade logic to delete ar_receivable, medical_production entries
- Effort: 2h | Risk: Medium (cascade deletes)
- Deliverable: Clean removal on cancel

✅ **BLOCKER 1.4** - Fix DRE mock data
- File: `src/pages/clinica/financeiro/DashboardDRE.jsx`
- Action: Replace hardcoded JSON with real queries to account_plans
- Effort: 2.5h | Risk: Low
- Deliverable: Real DRE data

✅ **BLOCKER 1.5** - Fix scheduler bug (repasse)
- File: `src/lib/repasseSchedulerApi.js`
- Action: Fix 'today' undefined at line ~40
- Effort: 0.5h | Risk: Low
- Deliverable: Scheduler works (manual click)

**Phase 1 Total: 10.5 hours**
**Estimated calendar time: 1-2 days (with testing)**
**Team: 1 backend developer + 1 QA**

---

## FASE 2: INTEGRAÇÃO PARCIAL (3-4 dias | 20-24 horas)
**Goal:** Enable proper reconciliation and communication between modules

✅ **INTEGRATION 2.1** - Guide payment updates AR status
- File: `src/lib/guiasApi.js` (updateGuiaStatus)
- Action: Call receivablesApi to mark AR as "received"
- Effort: 2.5h | Risk: Low
- Deliverable: AR reflects guide payment

✅ **INTEGRATION 2.2** - Glosa module foundation
- File: `supabase/migrations/20260410_create_glosa_tables.sql` (NEW)
- Schema: glosas table (guide_id, amount_denied, reason, imported_at)
- Effort: 2h | Risk: Low (new table)
- Deliverable: Schema in place

✅ **INTEGRATION 2.3** - Glosa import workflow
- File: `src/lib/guiasApi.js` (NEW function: importGlosas)
- Action: Read glosa file, match to guides, reduce doctor_commissions
- Effort: 4h | Risk: High (complex logic)
- Deliverable: Glosa sync working

✅ **INTEGRATION 2.4** - Service-level repasse config UI
- File: `src/pages/financeiro/RepasseRegrasPage.jsx`
- Action: Add form for service-level overrides (repasse_config_servico)
- Effort: 3h | Risk: Low (UI only)
- Deliverable: Config accessible from UI

✅ **AP bill validation** - Check AR exists before creating
- File: `src/lib/repasseMedicoApi.js` (liberar_repasse_pagamento call)
- Action: Validate ar_receivable with same appointment_id exists
- Effort: 1.5h | Risk: Low
- Deliverable: No duplicate APs

**Phase 2 Total: 13 hours**
**Estimated calendar time: 3-4 days (with testing)**
**Team: 1-2 developers**

---

## FASE 3: PRODUCTION FEATURES (1-2 semanas | 25-35 horas)
**Goal:** Make system production-ready

- XML/TISS generation (6-8h)
- SADT module  (3-4h)
- Internação module (3-4h)
- Bank transfer automation stub→real (6-8h)
- Comprehensive audit logs (4-5h)
- Export to PDF/Excel (2-3h)

**Phase 3 Total: 25-35 hours**
**Est timeline: 1-2 weeks sprint**

---

## ARQUIVOS QUE PRECISAM ALTERAÇÃO

### Migrations (NEW)
- `20260410_add_appointment_fk_guias.sql` - Add appointment_id to billing_guides
- `20260410_create_glosa_tables.sql` - New glosa tracking schema

### Backend APIs (MODIFY)
- `appointmentFinancialIntegrationApi.js` - Wire auto-call
- `appointmentsApi.js` - Add cascade delete logic
- `guiasApi.js` - Add glosa import, auto-create guide
- `repasseCedicoApi.js` - Add AP validation
- `repasseSchedulerApi.js` - Fix bug (line 40)
- `repasseConfigApi.js` - Add service-level CRUD

### Frontend Pages (MODIFY)
- `DashboardDRE.jsx` - Replace mock with queries
- `RepasseRegrasPage.jsx` - Add service-level config form

### NO CHANGE
- ✅ AppRoutes.jsx - Routes already mapped
- ✅ Menu/sidebar - Already configured
- ✅ RLS policies - Already set
- ✅ generate_doctor_commissions_v2() RPC - Already correct
- ✅ medical_production trigger - Already working
- ✅ Agenda views - Already functional

---

## RISCOS E MITIGAÇÕES

| Risco | Impact | Likelihood | Mitigation |
|-------|--------|------------|-----------|
| Cascade delete removes too much | Data loss | Medium | Test with copies, add soft-delete option |
| Double-creation of AR/guides | Reconciliation mess | Medium | Add uniqueness constraint, idempotency checks |
| Glosa import format mismatch | Wrong calculations | High | Validate against real insurance files first |
| Breaking existing workflows | User confusion | Low | Keep manual options available, gradual rollout |
| Performance on mass-creation | Slow UI | Medium | Batch operations, async processing |

---

## RECOMENDAÇÃO FINAL

**START WITH PHASE 1 IMMEDIATELY** (1-2 days, ~10-12h work)
- These 5 blockers prevent any automation
- Low-risk changes (mostly wiring + bug fixes)
- Immediate value: real data flowing

**THEN ASSESS Phase 2** (3-4 days, needs detailed design first)
- Glosa module is complex, needs spec review
- Make sure guia payment sync is requirement

**DEFER Phase 3** until Phase 1+2 are stable
- Reports/XML can wait
- Foundation  must be solid first

---

## CHECKPOINTS DE VALIDAÇÃO

**Post Phase 1:**
- [ ] Create appointment → AR automatically created
- [ ] Create appointment → Billing guide automatically created
- [ ] Cancel appointment → AR/production/repasse deleted
- [ ] DRE dashboard shows real data
- [ ] Scheduler doesn't crash on execution attempt

**Post Phase 2:**
- [ ] Guide payment status → AR status synced
- [ ] Glosa import → reduce doctor_commission
- [ ] Service-level repasse config accessible
- [ ] AP creation validated against AR
- [ ] No duplicate financial records

---

# 📎 DOCUMENTOS DE REFERÊNCIA GERADOS

Este audit gerou os seguintes relatórios complementares (salvos no root do projeto):

1. `📋_AGENDA_MODULE_AUDIT_DETAILED.md` - Deep dive agenda (85% complete)
2. `📋_FINANCEIRO_MODULE_AUDIT_DETAILED.md` - Deep dive finance (64% complete)
3. `📋_MODULOS_AUDIT_FATURAMENTO_REPASSE.md` - Billing + Repasse analysis
4. `🔍_AUDIT_CONFIG_INTEGRATION_GAPS_APRIL2026.md` - Configuration audit
5. `🗄️_FOREIGN_KEY_RELATIONSHIPS_TECHNICAL_REFERENCE.md` - FK relationship map
6. `⚡_QUICK_REFERENCE_INTEGRATION_GAPS.md` - Executive summary

**Total audit documentation: ~80KB, 1000+ lines of analysis**

---

## PRÓXIMOS PASSOS

1. **REVISAR** este checklist com time
2. **PRIORIZAR** se seguir Phase 1 → 2 ou outro sequenciamento  
3. **ESTIMAR** melhor com developers
4. **EXECUTAR** Phase 1 primeiro (lowest risk, highest impact)
5. **TESTAR** thoroughly antes Phase 2
6. **DOCUMENTAR** final state

---

**Auditoria concluída: 09 de Abril de 2026**
**Pronto para implementação**
