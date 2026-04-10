# 🔍 AUDITORIA TÉCNICA COMPLETA — Gesclinic Web
**Data:** Abril 2026  
**Método:** Exploração sistemática de código, migrations, APIs e integrações  
**Objetivo:** Auditar 4 módulos críticos sem refatorar; apenas completar o que falta  

---

## 📋 CONTEXTO ESTRUTURAL

### Arquitetura Geral
- **Frontend:** React 18 + Vite 5 + TailwindCSS + Radix UI
- **Backend:** Supabase (PostgreSQL + RLS + RPCs)
- **Autenticação:** Auth context + role-based access (PublicRoute, ProtectedRoute)
- **Clinica Context:** Multi-clinic support via `useClinicContext()`

### Rotas Principais
```
/clinica/agenda              → Módulo Agenda (unificada)
/clinica/financeiro          → Módulo Financeiro (dashboards, CRUD)
/clinica/faturamento         → Módulo Faturamento/TISS
/financeiro/repasse-medico   → Módulo Repasse Médico
```

### APIs Principais
```
src/lib/
├── appointmentsApi.js         (agenda)
├── financeApi.js              (financeiro)
├── receivablesApi.js          (contas a receber)
├── repasseMedicoApi.js        (repasse médico)
├── guiasApi.js                (faturamento)
├── auditApi.js                (auditoria cruzada)
└── appointmentFinancialIntegrationApi.js (INCOMPLETO)
```

---

## ✅ CHECKLIST 1 — AGENDA

### 1. Estrutura Principal
- [🟢 OK] Existe agenda unificada → `src/pages/clinica/agenda/AgendaPage.jsx`
- [🟢 OK] Existe agenda por profissional → `AgendaProfessionalView.jsx`
- [🟢 OK] Existe agenda por sala → `AgendaSala.jsx`
- [🟢 OK] Existe agenda por unidade → Filtro em `AgendaFilters.jsx`
- [🟢 OK] Existem filtros por período → Range picker (data início/fim)
- [🟢 OK] Existem filtros por profissional → Dropdown dinâmico
- [🟢 OK] Existem filtros por sala → Dropdown dinâmico
- [🟢 OK] Existem filtros por status → Status enum completo
- [🟢 OK] Existem filtros por convênio/plano → Dropdown de payers

### 2. Visualizações
- [🟢 OK] View de dia → `AgendaDayView.jsx` (grid horário)
- [🟢 OK] View de semana → `AgendaWeekView.jsx` (FullCalendar)
- [🟢 OK] View de mês → `AgendaMonthView.jsx` (calendário)
- [🟢 OK] View de tabela → `AgendaUnificadaSimples.jsx` (lista filtrada)

### 3. Fluxo Operacional
- [🟢 OK] Criar agendamento → `NovoAgendamento.jsx` + `AppointmentModal.jsx`
- [🟢 OK] Editar agendamento → `AgendamentoEditarModal.jsx`
- [🟢 OK] Cancelar agendamento → Status = `canceled` via API
- [🟢 OK] Remarcar → Edição de data/hora via modal
- [🟢 OK] Encaixe → `squeezein` status, sugestões via `agendaSuggestionsApi.js`
- [🟢 OK] Check-in → `CheckinRecepacao.jsx` (fluxo completo)
- [🟢 OK] Confirmação → `AgendaConfirmacao.jsx` (WhatsApp/Telefone)
- [🟢 OK] Controle de faltas → `no_show` status + relatório
- [🟢 OK] Status do atendimento → 12+ status enums em `appointmentStatusConstants.js`
- [🟢 OK] Vínculo com paciente → `patient_id` FK em `appointments`
- [🟢 OK] Vínculo com profissional → `professional_id` FK
- [🟢 OK] Vínculo com serviço → `service_id` FK
- [🟢 OK] Vínculo com convênio/plano → `payer_id` FK + `plan_id`

### 4. UX e Componentes
- [🟢 OK] Calendário superior funcional → FullCalendar com modos day/week/month
- [🟢 OK] Datepicker consistente → TailwindCSS date input + calendar picker
- [🟠 PARCIAL] Popovers funcionando sem quebra visual → Popover funciona mas há relatórios de lag em views grandes
- [🟢 OK] Dialogs de agendamento funcionais → AppointmentModal + AppointmentUnitedModal
- [🟢 OK] Tabela/lista funcional → AgendaUnificadaSimples com paginação
- [🟢 OK] Badges/status consistentes → Color mapping via `statusColors.js`
- [🟢 OK] Views realmente diferentes → 4+ views distintas (day, week, month, list)
- [🟢 OK] Layout sem duplicidade → AgendaLayout wrapper + views específicas

### 5. Backend e Supabase
- [🟢 OK] Tabela principal → `appointments` (completa, todas colunas presentes)
- [🟢 OK] Relacionamentos corretos → FK para pacientes, profissionais, salas, serviços, planos
- [🟢 OK] Views/RPCs de listagem → `view_agenda_completa_v6` (carregamento principal)
- [🟢 OK] Lógica de conflito de horários → `validateAppointmentScheduling()` em `appointmentsApi.js`
- [🟢 OK] Lógica de slots → `AgendaSlotGenerator.js` (cálculo dinâmico)
- [🟢 OK] Tratamento de timezone → Handled em `appointmentsApi.js` (UTC conversion)
- [🟢 OK] Integração com paciente/profissional/serviço → Todas presentes
- [🟢 OK] Integração com status do atendimento → 12 status definidos e usados

### 6. Integrações da Agenda
- [🟢 OK] Agenda integra com Financeiro → `CheckinFinanceiro.jsx` valida pendências
- [🟠 PARCIAL] Agenda integra com Faturamento → Timeline de auditoria existe, mas criação de guia é manual
- [🟠 PARCIAL] Agenda integra com Repasse → Timeline mostra eventos, mas cálculo é mensal (não real-time)
- [🟡 NÃO EXISTE] Agenda integra com Prontuário → Não há link a registros/laudos (planned)
- [🟠 PARCIAL] Check-in gera reflexo financeiro → Valida mas NÃO cria AR automaticamente
- [🟠 PARCIAL] Atendimento realizado gera base para faturamento → Requer manual trigger (sem auto-guide creation)
- [🟠 PARCIAL] Atendimento realizado gera base para repasse → Requer cálculo mensal manual

### 7. Diagnóstico - Agenda

**Status geral:** 🟢 ~90% funcional, UX sólida, integrações parciais

**Arquivos relacionados principais:**
```
src/pages/clinica/agenda/
├── AgendaPage.jsx (main coordinator)
├── AgendaLayout.jsx (wrapper/context)
├── views/ (16+ views especializadas)
├── components/ (30+ componentes)
├── hooks/ (10+ hooks customizados)
└── services/ (business logic)

src/lib/
├── appointmentsApi.js (CRUD + validation)
├── appointmentStatusConstants.js (status enum)
├── agendaIntegrationApi.js
├── agendaSuggestionsApi.js
└── appointmentFinancialIntegrationApi.js (INCOMPLETO)
```

**Estruturas Supabase relacionadas:**
- `appointments` (completa)
- `view_agenda_completa_v6` (listagem principal)
- `appointment_audit_logs` (rastreabilidade)
- `appointment_financial_audit_logs` (integrações)
- `agenda_indicators` (KPIs)

**O que já funciona:**
✅ CRUD completo  
✅ Múltiplas visualizações (day/week/month/list)  
✅ Filtros avançados (data, profissional, sala, status, convênio)  
✅ Check-in com validação financeira  
✅ Confirmação WhatsApp/Telefone  
✅ Sugestões de encaixe  
✅ Relatórios e KPIs  
✅ Auditoria de mudanças  
✅ Timeline de eventos (agenda → financeiro → faturamento → repasse)  

**O que está parcial:**
⚠️ Auto-criação de AR quando atendimento completo (valida mas não cria)  
⚠️ Repasse real-time (requer mensalização manual via UI)  
⚠️ Criação automática de guia TISS (requer UI manual)  
⚠️ Link com Prontuário (estrutura não existe)  

**O que falta:**
❌ Prontuário eletrônico integrado  
❌ Prescrições digitais link direto  
❌ Auto-reversal de AR quando cancelado  

**O que não deve ser alterado:**
🔒 Status enums (12 status bem estabelecidos)  
🔒 Rota `/clinica/agenda` e subrotas  
🔒 FullCalendar integration  
🔒 View `view_agenda_completa_v6`  
🔒 Zustand store `useAgendaStore()`  

**Integrações existentes:**
✅ Financeiro: Check-in valida via `CheckinFinanceiro.jsx`  
✅ Faturamento: Timeline de auditoria (`AppointmentFinancialAuditTimeline.jsx`)  
✅ Repasse: Eventos em timeline, mensalização manual  

**Integrações faltantes:**
❌ Auto-criação de AR (appointment.status='attended' → gera AR)  
❌ Auto-criação de guia TISS (appointment.status='attended' → gera guia)  
❌ Repasse real-time (por atendimento, não mensal)  
❌ Prontuário link  

**Ação mínima necessária:**
1. **[CRÍTICA]** Implementar `appointment.status='attended'` trigger → cria AR em receivables automátically
2. **[CRÍTICA]** Implementar `appointment.status='attended'` trigger → cria guia TISS em guias automáticamente (apenas para convênio)
3. **[IMPORTANTE]** Implementar reversão de AR quando appointment.status='canceled'
4. **[IMPORTANTE]** Testar integração completa: agendamento → check-in → atendimento → financeiro
5. **Documentação:** Diagramar fluxo Agenda ↔ Financeiro ↔ Faturamento ↔ Repasse

---

## 💰 CHECKLIST 2 — FINANCEIRO

### 1. Estrutura Principal
- [🟢 OK] Contas a receber → `ContasReceber.jsx` (listagem) + `NovoRecebimento.jsx` (criar)
- [🟢 OK] Contas a pagar → `ContasPagar.jsx` + `NovaConta.jsx` (CRUD completo)
- [🟢 OK] Fluxo de caixa → `FluxoCaixa.jsx` (RPC-based, agregação por período)
- [🟢 OK] Caixa/balcão → Coberto por `NovoRecebimento.jsx` (manual entry)
- [🟢 OK] Formas de pagamento → `paymentMethodsConfig.js` (enum: cash, card, check, transfer, pix)
- [🟢 OK] Categorias financeiras → `PlanoContas.jsx` (Chart of Accounts hierárquico)
- [🟢 OK] Plano de contas → Implementado com tipos (receita, despesa, ativo, passivo, patrimônio)
- [🟠 PARCIAL] Inadimplência → Não há módulo específico, apenas status `overdue` em AR
- [🟠 PARCIAL] Conciliação → Implementado mas com sugestões apenas (não validação de match)
- [🔴 NÃO EXISTE] DRE → Existe página `DashboardDRE.jsx` MAS usa mock data (não é real)
- [🟢 OK] Relatórios financeiros → Via dashboards (KPIs + filtros)

### 2. Operações
- [🟢 OK] Lançar recebimento → `NovoRecebimento.jsx` + API calls
- [🟢 OK] Lançar pagamento → `NovaConta.jsx` + `ap_items` line items
- [🟢 OK] Baixar recebimento → Marcar como `received` status em AR
- [🟢 OK] Baixar pagamento → Marcar como `paid` status em AP
- [🟠 PARCIAL] Estornar lançamento → Possível via edição mas sem reversão automática de appointment
- [🟢 OK] Filtrar por período → Range filter em todas as views
- [🟢 OK] Filtrar por status → Status enum filter
- [🟠 PARCIAL] Filtrar por origem → AR tem campo `origem` (manual/agenda) mas sem visibilidade
- [🟢 OK] Filtrar por profissional/unidade → Campo em AP + AR (quando linkedado)
- [🟡 PARCIAL] Visualizar origem do lançamento → AR linkado a appointment mas sem UI de navegação

### 3. UX e Telas
- [🟢 OK] Listagens funcionais → Tables com paginação, search, sorting
- [🟢 OK] Filtros funcionais → Date range + status + categoria filters
- [🟢 OK] Cards de resumo → Dashboard com KPIs (entradas, saídas, saldo)
- [🟢 OK] Indicadores financeiros → Cash flow chart (mensal)
- [🟢 OK] Tela de recebimento no balcão → `NovoRecebimento.jsx` (com forma de pagamento)
- [🟢 OK] Tela de contas a pagar → `ContasPagar.jsx` com listagem
- [🟢 OK] Tela de contas a receber → `ContasReceber.jsx` com listagem
- [🟢 OK] Tela/visão de fluxo de caixa → `FluxoCaixa.jsx` (chart + números)
- [🔴 NÃO EXISTE] Tela/visão de DRE → `DashboardDRE.jsx` mas com mock data

### 4. Backend e Supabase
- [🟢 OK] Tabelas financeiras principais → `ap_bills`, `ap_items`, `ar_receivables`, `account_plans`, `cost_centers`
- [🟠 PARCIAL] Vínculos com atendimento → `ar_receivables.appointment_id` FK adicionado em 2026-04-01
- [🟢 OK] Views de resumo → Várias views (ap_bills_with_category, vw_discount_summary)
- [🟡 PARCIAL] Materialized views → Não há (performance pode ser impactada em grandes volumes)
- [🟢 OK] RPCs de cálculo/resumo → `cashflow_summary()`, `list_ap_bills()`, `pay_accounts_payable_batch()`
- [🟠 PARCIAL] Triggers de sincronização → `trg_repasse_financeiro` exists mas outros faltam (AR auto-create)

### 5. Integrações do Financeiro
- [🟠 PARCIAL] Financeiro integra com Agenda → Check-in valida mas não cria AR
- [🟠 PARCIAL] Financeiro integra com Check-in → Validação de pendência, sem auto-create
- [🟠 PARCIAL] Financeiro integra com Faturamento → Timeline de auditoria existe
- [🟢 OK] Financeiro integra com Repasse → `generate_doctor_commissions_v2()` RPC cria AP bills
- [🟡 PARCIAL] Financeiro integra com Nota Fiscal → Não implementado
- [🔴 NÃO EXISTE] Atendimento pode gerar conta a receber → Manual only
- [🟠 PARCIAL] Recebimento de convênio entra corretamente → Possível via `NovoRecebimento` manual
- [🟠 PARCIAL] Repasse pode considerar recebimento financeiro → Sim, mas requer cálculo mensal

### 6. Diagnóstico - Financeiro

**Status geral:** 🟡 ~70% funcional, várias integrações parciais ou faltando

**Arquivos relacionados principais:**
```
src/pages/clinica/financeiro/
├── DashboardFinanceiro.jsx
├── ContasPagar.jsx, ContasReceber.jsx
├── FluxoCaixa.jsx, PlanoContas.jsx
├── ConciliacaoBancaria.jsx
├── RepasseMedico.jsx (legacy - moved to /financeiro/repasse-medico)
└── custos/ (cost centers)

src/lib/
├── financeApi.js (28 functions, AP/AR queries)
├── receivablesApi.js (6 functions, AR comprehensive)
├── repasseMedicoApi.js
├── financialAccountsApi.js (DRE placeholders)
├── conciliationApi.js
└── appointmentFinancialIntegrationApi.js (INCOMPLETO!)
```

**Estruturas Supabase relacionadas:**
- `ap_bills` (contas a pagar) — some optional columns
- `ap_items` (linhas de AP)
- `ar_receivables` (contas a receber) — appointment_id FK added 2026-04-01
- `account_plans` (plano de contas)
- `cost_centers` (centros de custo)
- `doctor_commissions` (repasse médico mensal)
- `appointment_financial_audit_logs` (rastreabilidade)

**O que já funciona:**
✅ AP CRUD completo (criar, editar, deletar, pagar em lote)  
✅ AR manual entry  
✅ Cash flow dashboard (KPIs + chart)  
✅ Chart of Accounts hierárquico  
✅ Cost centers CRUD + allocation  
✅ Repasse médico mensal (via RPC)  
✅ Bank reconciliation (suggestions)  

**O que está parcial:**
⚠️ AR auto-creation quando appointment completo (field exists mas sem trigger)  
⚠️ DRE (mock data only, não queries reais)  
⚠️ Appointment cancellation reversal (sem automação)  
⚠️ Integration tests (AR ← Agenda, Repasse ← Financeiro)  
⚠️ Conciliação (suggestions only, sem full match)  

**O que falta:**
❌ Auto-create AR quando appointment.status = 'attended'  
❌ Auto-create guia TISS quando appointment completo (Agenda → Faturamento link)  
❌ Real DRE queries (substituir mock data)  
❌ Real-time repasse (hoje é mensal)  
❌ Appointment cancellation → AR reversal  
❌ Bank statement auto-import (ATM integração manual)  
❌ NFe integration  
❌ Payment gateway webhooks  

**O que não deve ser alterado:**
🔒 Status enums (open, paid, canceled, partial, scheduled)  
🔒 Rotas `/clinica/financeiro/*`  
🔒 Plano de contas seed templates  
🔒 Cost center types (assistencial/administrativo/comercial)  
🔒 RPC `cashflow_summary()` signature  

**Integrações existentes:**
✅ Repasse: RPC `generate_doctor_commissions_v2()` gerencia integração  
✅ Check-in: Validação de pendência existe  
✅ Auditoria: Timeline de funções (mas com dados limitados)  

**Integrações faltantes:**
❌ Agenda → AR auto-create (crítica!)  
❌ Agenda → Guia TISS auto-create (crítica!)  
❌ Appointment cancel → AR reversal (importante)  
❌ Real-time repasse (não mensal)  
❌ NFe geração automática  
❌ Webhook de pagamento  

**Ação mínima necessária:**
1. **[CRÍTICA]** Criar `appointmentFinancialIntegrationApi.js` function completa:
   - `finalizeAppointmentWithFinancials(appointmentId, clinicId)` → cria AR + guia TISS
2. **[CRÍTICA]** Criar trigger SQL: `appointment.status='attended'` → calls RPC above
3. **[IMPORTANTE]** Reversal trigger: `appointment.status='canceled'` → soft-delete AR
4. **[IMPORTANTE]** Real DRE: substituir mock por queries reais
5. **[IMPORTANTE]** Testar ciclo: appointment complete → AR created → appears in dashboard

---

## 📋 CHECKLIST 3 — FATURAMENTO MÉDICO / TISS

### 1. Estrutura Principal
- [🟠 PARCIAL] Cadastro/estrutura de guias → Existe table `guias` + `billing_guides` mas sem UI completa
- [🟠 PARCIAL] Cadastro/estrutura de lotes → Lotes podem ser criados mas sem visualização
- [🟡 PARCIAL] Itens faturáveis → Existe mas requer manual linkage a guias
- [🟢 OK] Convênios → `healthInsurancesPayers` table completa (TISS-ready fields)
- [🟢 OK] Planos → `plans` table com code field
- [🟠 PARCIAL] Status de faturamento → Enums existem mas sem UI clara
- [🔴 NÃO EXISTE] Glosas → Campo em `ar_receivables` mas sem módulo específico
- [🔴 NÃO EXISTE] Recursos de glosa → Não há sistema de contestação
- [🟠 PARCIAL] Recebimentos de convênios → Via `NovoRecebimento` financeiro manual
- [🟠 PARCIAL] XML/TISS → Estrutura parcial, geração incompleta

### 2. Fluxo Operacional
- [🟠 PARCIAL] Atendimento gera item faturável → Potencial mas não automático
- [🟠 PARCIAL] Item entra em guia → Requer manual entry ou RPC
- [🟠 PARCIAL] Guia entra em lote → UI incompleta
- [🟠 PARCIAL] Lote gera XML → Function exists mas não testada
- [🟠 PARCIAL] Lote tem status de envio → Field exists mas sem workflow
- [🔴 NÃO EXISTE] Existe retorno de faturamento → No return import workflow
- [🔴 NÃO EXISTE] Existe controle de glosa → No glosa module
- [🟠 PARCIAL] Existe baixa/recebimento de convênio → Manual via financeiro
- [🟠 PARCIAL] Existe rastreabilidade por atendimento → Via `appointment_financial_audit_logs`

### 3. UX e Telas
- [🟡 PARCIAL] Tela de guias → `GuiasPage.jsx` exists mas sem full CRUD visual
- [🟡 PARCIAL] Tela de lotes → `LotesPage.jsx` exists mas UI incomplete
- [🟡 PARCIAL] Tela de convênios/planos relacionada → Em `base-sistema/ConveniosPage.jsx`
- [🟢 OK] Filtros por período → Implemented in pages
- [🟢 OK] Filtros por convênio → Dropdown filter
- [🟠 PARCIAL] Filtros por status → Exists but unclear
- [🟠 PARCIAL] Indicadores de faturamento → Dashboard has KPIs but incomplete
- [🟠 PARCIAL] Relatórios de faturamento → Exists mas mock data

### 4. Backend e Supabase
- [🟠 PARCIAL] Tabelas de guias → `guias` + `billing_guides` tables existem
- [🟡 PARCIAL] Tabelas de lotes → Não há table clara `lotes` (structure unclear)
- [🟠 PARCIAL] Itens de faturamento → Em `ar_receivables` + appointment connection
- [🟠 PARCIAL] Relacionamentos com atendimento → `appointment_id` FK em `ar_receivables`
- [🟡 PARCIAL] Views → Não há view TISS consolidada
- [🟡 PARCIAL] RPCs → XML generation RPC exists but untested
- [🔴 NÃO EXISTE] Triggers → Sem auto-guide creation trigger
- [🟠 PARCIAL] Base para XML/TISS → Estrutura parcial, falta validação

### 5. Integrações do Faturamento
- [🟠 PARCIAL] Faturamento integra com Agenda → Via appointment_id but workflow manual
- [🟠 PARCIAL] Faturamento integra com Financeiro → Timeline log exists
- [🟠 PARCIAL] Faturamento integra com Repasse → Possível mas workflow unclear
- [🟡 PARCIAL] Atendimento realizado alimenta faturamento → Manual only
- [🟠 PARCIAL] Recebimento do convênio reflete no financeiro → Via manual entry
- [🔴 NÃO EXISTE] Glosa impacta financeiro → No glosa system
- [🔴 NÃO EXISTE] Glosa/recebimento impacta repasse → No glosa integration

### 6. Diagnóstico - Faturamento

**Status geral:** 🔴 ~40% funcional, muitas peças faltando ou incompletas

**Arquivos relacionados principais:**
```
src/pages/clinica/faturamento/
├── FaturamentoPage.jsx
├── GuiasPage.jsx (UI incomplete)
├── LotesPage.jsx (UI incomplete)
├── XMLPage.jsx (generation unclear)
├── RetornosPage.jsx (return workflow missing)
└── RelatoriosPage.jsx (mock data)

src/lib/
├── guiasApi.js (CRUD exists)
├── cbhpmApi.js (CBHPM codes)
└── (faltam APIs de integração!)
```

**Estruturas Supabase relacionadas:**
- `guias` table (TISS guides)
- `billing_guides` table (same? or different?)
- `plans` (convênios/planos)
- `health_insurances` (payers)
- `ar_receivables` (items to bill)
- `appointment_financial_audit_logs` (tracing)
- `cbhpm` table (procedure codes)

**O que já funciona:**
✅ Guia CRUD básico (criar, editar)  
✅ CBHPM code lookup  
✅ Convênio/plano cadastro  
✅ Auditoria de mudanças (timeline)  

**O que está parcial:**
⚠️ XML generation (function exists, untested)  
⚠️ Lote workflow (table/RPC unclear)  
⚠️ Indicadores (mock data)  
⚠️ Integração Agenda (manual only)  

**O que falta:**
❌ Auto-guide creation trigger  
❌ Auto-populate items from appointment  
❌ Batch (lote) creation/management workflow  
❌ Return/retorno workflow  
❌ Glosa system + contestation  
❌ XML validation + sending  
❌ TISS version management  
❌ Test files (nenhum teste de geração XML)  

**O que não deve ser alterado:**
🔒 Rotas `/clinica/faturamento/*`  
🔒 CBHPM table (already populated)  
🔒 Convênio/plano status enums  

**Integrações existentes:**
✅ Agenda: appointment_id linkage  
✅ Auditoria: timeline logging  
✅ CBHPM: procedure code lookup  

**Integrações faltando:**
❌ Agenda → Guia auto-create (crítica!)  
❌ Guia → Lote auto-batch (importante)  
❌ Lote → XML generation (importante)  
❌ XML → Retorno import (importante)  
❌ Glosa → AR adjustment (importante)  
❌ Recebimento convênio → AR received (importante)  

**Ação mínima necessária:**
1. **[CRÍTICA]** Criar function: `createBillingGuideFromAppointment(appointmentId, clinicId)`
2. **[CRÍTICA]** Criar trigger: `appointment.status='attended'` + convênio → calls above
3. **[IMPORTANTE]** Clarificar schema: `guias` vs `billing_guides` (consolidar?)
4. **[IMPORTANTE]** Criar RPC de batchamento: `batch_guides_into_lote(guide_ids[])`
5. **[IMPORTANTE]** Testar XML generation end-to-end

---

## 🏥 CHECKLIST 4 — REPASSE MÉDICO

### 1. Estrutura de Configuração
- [🟢 OK] Existe repasse por profissional → Implementado em `RepasseConfig.jsx`
- [🟠 PARCIAL] Existe repasse por grupo de serviço → Tabela existe mas UI desabilitada ("em breve")
- [🟠 PARCIAL] Existe repasse por serviço individual → Tabela existe mas UI desabilitada
- [🟢 OK] Existe percentual configurável → Campo `percentage` em `repasse_config_profissional`
- [🟠 PARCIAL] Existe tipo bruto/líquido → Mencionado em código mas não implementado
- [🟠 PARCIAL] Existe prioridade de regra → Schema sugere precedência mas sem validação
- [🔴 NÃO EXISTE] Existe vigência/configuração temporal → Sem suporte a datas de início/fim

### 2. Regra de Precedência
- [🟠 PARCIAL] Serviço individual tem prioridade → Lógica mencionada mas não testada
- [🟠 PARCIAL] Grupo de serviço é segunda prioridade → Mesmo como acima
- [🟠 PARCIAL] Profissional geral é terceira prioridade → Mesmo como acima

### 3. Operação
- [🟢 OK] Atendimento gera base de repasse → Requer appointment completion
- [🟠 PARCIAL] Recebimento pode gerar base de repasse → Manual workflow
- [🟢 OK] Existe cálculo automático → Via RPC `generate_doctor_commissions_v2()`
- [🔴 NÃO EXISTE] Existe cálculo manual complementar → Sem override UI
- [🟢 OK] Existe listagem de repasses → `RepasseMedicoPage.jsx`
- [🟠 PARCIAL] Existe status de repasse → Campo em `doctor_commissions` mas sem clear workflow
- [🟠 PARCIAL] Existe fechamento por período → Manual RPC call
- [🟢 OK] Existe relatório por profissional → `RepasseDashboard.jsx`

### 4. Backend e Supabase
- [🟢 OK] Tabelas de configuração → `repasse_config_profissional`, `repasse_config_servico`, `repasse_config_grupo`
- [🟢 OK] Tabelas de lançamentos → `doctor_commissions` (monthly aggregates)
- [🟠 PARCIAL] Views/resumos → Não há consolidated view para all repasse data
- [🟢 OK] Funções/RPCs de cálculo → `generate_doctor_commissions_v2()` detailed
- [🔴 NÃO EXISTE] Triggers/integrações → Sem auto-call on appointment completion

### 5. Integrações do Repasse
- [🟠 PARCIAL] Repasse integra com Agenda → Via appointment data (manual calc)
- [🟢 OK] Repasse integra com Financeiro → Gera AP bills automaticamente (trigger exists)
- [🟠 PARCIAL] Repasse integra com Faturamento → Possível mas workflow unclear
- [🟢 OK] Repasse considera profissional → Chave primária in config
- [🟠 PARCIAL] Repasse considera serviço → Tabela existe, precedência em código, untested
- [🟠 PARCIAL] Repasse considera grupo de serviço → Tabela existe, precedência em código, untested
- [🟠 PARCIAL] Repasse considera valor produzido → Sim (appointments value)
- [🟠 PARCIAL] Repasse considera valor recebido → Sim (AP bills) mas requer manual trigger
- [🔴 NÃO EXISTE] Glosa impacta repasse → No glosa system

### 6. Diagnóstico - Repasse Médico

**Status geral:** 🟡 ~65% funcional, core logic exists, integrações e UI parciais

**Arquivos relacionados principais:**
```
src/pages/financeiro/ (legacy location)
├── RepasseMedicoLayout.jsx
├── RepasseMedicoPage.jsx (dashboard)
├── RepasseRegrasPage.jsx (config)
├── RepasseDashboardAnalyticsPage.jsx
├── RepasseAutomacaoPage.jsx
├── RepasseAjustePage.jsx
└── RepasseConfigPage.jsx (detailed config UI)

src/lib/
├── repasseMedicoApi.js (main API)
├── repasseConfigApi.js (configuration)
├── financeIntegrationApi.js (calculation integration)
└── auditFinancialIntegration.js (audit)
```

**Estruturas Supabase relacionadas:**
- `repasse_config_profissional` (per professional %)
- `repasse_config_servico` (per service %)
- `repasse_config_grupo` (per group %)
- `doctor_commissions` (monthly aggregates)
- `professional_bank_accounts` (transfer info)
- `appointment_financial_audit_logs` (tracing)

**O que já funciona:**
✅ Configuração por profissional (%, ativo/inativo)  
✅ Cálculo mensal automático via RPC  
✅ Geração de AP bills automática (trigger)  
✅ Dashboard com KPIs (total, por profissional)  
✅ Auditoria de eventos  
✅ Suporte a múltiplos profissionais  

**O que está parcial:**
⚠️ Configuração por serviço (tables exist, UI disabled, precedência em código mas untested)  
⚠️ Configuração por grupo (tables exist, UI disabled, precedência em código mas untested)  
⚠️ Repasse real-time (today is monthly only)  
⚠️ Integration com recebimento financeiro (manual only)  
⚠️ Status workflow (field exists, sem clara transition)  

**O que falta:**
❌ Auto-trigger on appointment completion  
❌ Real-time per-appointment calculation  
❌ Manual override / adjustment UI (exists but incomplete)  
❌ Bruto vs Líquido toggle  
❌ Vigência temporal (date ranges)  
❌ Glosa system impact  
❌ Contestation/dispute workflow  
❌ Webhook para transferência bancária  
❌ Test cases para precedência regra  

**O que não deve ser alterado:**
🔒 Rotas `/financeiro/repasse-medico/*`  
🔒 RPC `generate_doctor_commissions_v2()` signature  
🔒 Trigger que cria AP bills  
🔒 Status enums em `doctor_commissions`  

**Integrações existentes:**
✅ Financeiro: RPC calls + AP bills creation  
✅ Auditoria: Events logging  
✅ Dashboard: KPI aggregation  

**Integrações faltando:**
❌ Agenda → Real-time calculation (não mensal)  
❌ Appointment cancel → Repasse reversal  
❌ Glosa → Repasse adjustment  
❌ Webhook de transferência bancária  
❌ Recebimento financeiro → influencia cálculo  

**Ação mínima necessária:**
1. **[IMPORTANTE]** Criar function: `calculateRepassePerAppointment(appointmentId, clinicId, profId)` (real-time)
2. **[IMPORTANTE]** Testar precedência: service individual → group → professional
3. **[IMPORTANTE]** Criar trigger: `appointment.status='attended'` → call RPC (acumula para monthly batch)
4. **[IMPORTANTE]** Testar integration: appointment → repasse accrual → final monthly calc
5. **Documentação:** Diagramar règu precedência e exemplificar impacto

---

## ⚙️ CHECKLIST 5 — CONFIGURAÇÕES RELACIONADAS

### 1. Configurações da Clínica
- [🟢 OK] Nome da clínica → `clinics.name` field
- [🟢 OK] Nome fantasia → `clinics.fantasy_name` field (adicionado em migration)
- [🟢 OK] Logo → Storage em `clinics_branding` (via `clinicBrandingStorage.js`)
- [🟢 OK] Cores/branding → CSS variables em `clinic_branding` (primary_color, etc.)
- [🟢 OK] Endereço → Múltiplos campos em `clinics` (street, number, city, state, country)
- [🟢 OK] Contatos → `phone`, `email` em `clinics`
- [🟢 OK] CNPJ → Field `cnpj` em `clinics`
- [🟠 PARCIAL] CNES → Field exists (migration 2026-02-10) mas sem validação/geração
- [🟢 OK] Timezone → Em `clinic_settings` (via `GeraisConfig.jsx`)

### 2. Configurações de Agenda
- [🟢 OK] Horário de abertura → `opening_hour` em `professional_schedules` (por profissional)
- [🟢 OK] Horário de fechamento → `closing_hour`
- [🟠 PARCIAL] Intervalo de almoço → Não há field único (workaround via bloqueios/indisponibilidade)
- [🟢 OK] Slot da agenda → `slot_duration_minutes` (hard-coded ou via settings?)
- [🟠 PARCIAL] Tempo médio de atendimento → Em `professional_services.duration` (por serviço)
- [🟠 PARCIAL] Regras de encaixe → Via `agendaSuggestionsApi.js` (lógica em código)
- [🟠 PARCIAL] Regras de edição/cancelamento → Validações em componentes (sem config UI)
- [🟢 OK] Feriados/bloqueios → `holidays` table + `professional_schedules` blocking

### 3. Configurações Financeiras/Faturamento/Repasse
- [🟠 PARCIAL] Parâmetros financeiros → Não há table central de config (spread across modules)
- [🟠 PARCIAL] Formas de pagamento padrão → `paymentMethodsConfig.js` hard-coded
- [🟠 PARCIAL] Regras padrão de faturamento → Não há; setup via CBHPM + convênio config
- [🟢 OK] Regras padrão de repasse → Via `repasse_config_profissional` (pode ser default)
- [🟠 PARCIAL] Parâmetros por clínica/unidade → Não há multi-unidade support clara

### 4. Diagnóstico - Configurações

**Status geral:** 🟡 ~70% funcional, spreads across modules, sem central config store

**Arquivos relacionados principais:**
```
src/pages/clinica/configuracoes/
├── GeraisConfig.jsx (clinic name, timezone, etc.)
├── AgendaConfig.jsx (slot duration, rules)
├── FaturamentoConfig.jsx (CBHPM version, etc.)
└── (outros...

src/lib/
├── clinicsApi.js (clinic CRUD)
├── clinicBranding.js (branding logic)
├── repasseConfigApi.js (repasse rules)
└── (spread across modules)
```

**O que já funciona:**
✅ Clinic básico (nome, endereço, CNPJ, timezone)  
✅ Branding (logo, colors)  
✅ Professional schedules (horários por profissional)  
✅ Feriados (setup global)  
✅ Repasse config por profissional  

**O que está parcial:**
⚠️ Intervalo de almoço (via bloqueios, não field dedicated)  
⚠️ Slot duration (em múltiplos lugares)  
⚠️ Formas de pagamento (hard-coded)  
⚠️ Regras de encaixe (em código, não UI)  
⚠️ Regras de edição/cancelamento (validações em componentes)  

**O que falta:**
❌ Central config store (clinic-wide)  
❌ Multi-unidade support template  
❌ Settings versioning (audit trail)  
❌ Settings fallback/inheritance  

**O que não deve ser alterado:**
🔒 Rotas `/clinica/configuracoes/*`  
🔒 Timezones (IANA standard)  
🔒 Professional schedule structure  

---

## 📊 CHECKLIST 6 — RELATÓRIOS DERIVADOS

### 1. Relatórios da Agenda
- [🟠 PARCIAL] Atendimentos por período → Dashboard tem KPI, relatório page incompleto
- [🟠 PARCIAL] Ocupação da agenda → Cálculo possível mas sem UI dedicada
- [🟢 OK] Faltas/cancelamentos → Status `no_show`, `canceled` em tabelas
- [🟠 PARCIAL] Produção por profissional → Dashboard existe, relatório detalhado falta

### 2. Relatórios Financeiros
- [🟢 OK] Receitas por período → Flash flow dashboard
- [🟢 OK] Despesas por período → Cash flow dashboard
- [🟡 PARCIAL] Fluxo de caixa → Dashboard OK, export falta
- [🔴 NÃO EXISTE] DRE → Mock data only
- [🟡 PARCIAL] Inadimplência → No dedicated report (status `overdue` exists)

### 3. Relatórios de Faturamento
- [🔴 NÃO EXISTE] Faturado por convênio → No report page
- [🔴 NÃO EXISTE] Faturado por período → No report page
- [🔴 NÃO EXISTE] Glosas → No glosa system
- [🟠 PARCIAL] Recebimentos → Via `ContasReceber` (não dedicated report)
- [🔴 NÃO EXISTE] Pendências → No pending faturamento report

### 4. Relatórios de Repasse
- [🟢 OK] Repasse por profissional → Dashboard existe
- [🟠 PARCIAL] Repasse por período → Dashboard tem filtering
- [🟠 PARCIAL] Pendente x pago → Status field exists, sem UI clear
- [🟡 PARCIAL] Produção x recebimento x repasse → Timeline de auditoria, sem relatório consolidado

### 5. Diagnóstico - Relatórios

**Status geral:** 🔴 ~40% funcional, muitos faltam ou são mock-only

**Arquivos relacionados principais:**
```
src/pages/clinica/
├── agenda/views/AgendaRelatorios.jsx
├── financeiro/DashboardFinanceiro.jsx, FluxoCaixa.jsx
└── faturamento/RelatoriosPage.jsx (mock)

src/components/
└── (diversos dashboards e KPI cards)
```

**O que já funciona:**
✅ KPI dashboards (agenda, financeiro)  
✅ Cash flow chart (mensal)  
✅ Repasse dashboard (por profissional)  

**O que está parcial:**
⚠️ Relatórios detalhados (existem pages mas sem data)  
⚠️ Produção por profissional (cálculo possível, sem UI)  
⚠️ Inadimplência (status exists, sem relatório)  
⚠️ Faturamento consolidado (sem report page)  

**O que falta:**
❌ DRE real (mock only)  
❌ Glosa report  
❌ Pending faturamento  
❌ Export to Excel/PDF  
❌ Scheduled reports (email delivery)  
❌ Consolidado: produção → faturamento → repasse (visual pipeline)  

---

## 📌 CONSOLIDAÇÃO — MATRIZ DE PRIORIDADES

### CRÍTICAS (Bloqueiam workflows)

| Item | Módulo | Status | Ação |
|------|--------|--------|------|
| **Auto-create AR quando attendance completo** | Agenda ↔ Financeiro | ❌ Not implemented | Write trigger + API function |
| **Auto-create guia TISS quando attendance completo** | Agenda ↔ Faturamento | ❌ Not implemented | Write trigger + API function |
| **Appointment cancellation → AR reversal** | Financeiro | ❌ Not implemented | Write trigger |
| **Repasse real-time (não monthly)** | Repasse | ⚠️ Monthly only | Rewrite RPC + trigger logic |
| **Completar appointmentFinancialIntegrationApi.js** | Integration | ❌ Stub file | Implement all functions |

### IMPORTANTES (Parciais, precisam teste/ajuste)

| Item | Módulo | Status | Ação |
|------|--------|--------|------|
| **Testar precedência regra repasse** | Repasse | ⚠️ Untested | Unit tests |
| **Real DRE queries (não mock)** | Financeiro | ❌ Mock only | Write SQL queries |
| **Guia TISS com XML generation** | Faturamento | ⚠️ Partial | Complete + test |
| **Check-in financeiro auto-trigger** | Agenda | ⚠️ Manual | Write trigger |
| **Relatórios consolidados** | All | ❌ Missing | Add report pages |

### SECUNDÁRIAS (Nice-to-have, não críticas)

| Item | Módulo | Status | Ação |
|------|--------|--------|------|
| **Repasse bruto/líquido** | Repasse | ❌ Not implemented | Config + calc |
| **Glosa system** | Faturamento | ❌ Missing | Design + implement |
| **Bank webhook integration** | Financeiro | ❌ Stub | Implement |
| **Multi-unidade supp** | Config | ❌ Missing | Design |
| **Vigência de config** | All | ❌ Missing | Add date ranges |

---

## 🎯 PLANO DE IMPLEMENTAÇÃO MÍNIMA

### Escopo: Tornar críticas as integrações Agenda ↔ Financeiro ↔ Faturamento ↔ Repasse funcionais

### Arquivos que devem ficar INTACTOS
```
🔒 src/pages/clinica/agenda/AgendaPage.jsx (coordinator)
🔒 src/pages/clinica/agenda/AgendaLayout.jsx
🔒 src/lib/appointmentStatusConstants.js
🔒 src/AppRoutes.jsx
🔒 supabase/migrations/ (versioned)
🔒 src/components/ui/ (radix-based)
🔒 Status enums (all color mappings, labels)
🔒 Zustand stores
```

### Arquivos que precisam COMPLEMENTO
```
📝 src/lib/appointmentFinancialIntegrationApi.js (COMPLETE - is stub)
📝 src/lib/financeApi.js (ADD auto-AR functions)
📝 src/lib/guiasApi.js (ADD auto-guide functions)
📝 src/pages/clinica/financeiro/DashboardDRE.jsx (SELECT from real tables)
📝 src/pages/clinica/faturamento/ (multiple pages need completion)
📝 src/pages/financeiro/RepasseConfig* (test precedência logic)
```

### Novos ARQUIVOS necessários
```
✨ src/lib/appointmentCompletionIntegrationApi.js (new RPC wrapper)
✨ supabase/migrations/2026-04-XX_trigger_appointment_completion.sql (new)
✨ supabase/migrations/2026-04-XX_trigger_appointment_cancellation.sql (new)
```

### SQL necessário (NEW ou UPDATES)
```sql
-- 1. Trigger: appointment.status='attended' → AR auto-create
CREATE TRIGGER trg_create_ar_on_appointment_attended
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (NEW.status = 'attended' AND OLD.status IS DISTINCT FROM 'attended')
  EXECUTE FUNCTION create_ar_receivable_from_appointment();

-- 2. Trigger: appointment.status='attended' → guia TISS auto-create (if convênio)
CREATE TRIGGER trg_create_tiss_guide_on_appointment_attended
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (NEW.status = 'attended' AND OLD.status IS DISTINCT FROM 'attended' AND NEW.payer_id IS NOT NULL)
  EXECUTE FUNCTION create_tiss_guide_from_appointment();

-- 3. Trigger: appointment.status='canceled' → AR soft-delete
CREATE TRIGGER trg_cancel_ar_on_appointment_canceled
  AFTER UPDATE ON appointments
  FOR EACH ROW
  WHEN (NEW.status = 'canceled' AND OLD.status IS DISTINCT FROM 'canceled')
  EXECUTE FUNCTION cancel_ar_receivable_from_appointment();

-- 4. Functions for above triggers

CREATE OR REPLACE FUNCTION create_ar_receivable_from_appointment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ar_receivables (
    clinic_id, appointment_id, payer_name, valor, status, origem, descricao, created_at
  ) VALUES (
    NEW.clinic_id,
    NEW.id,
    COALESCE((SELECT fantasy_name FROM health_insurances WHERE id = NEW.payer_id), 'PARTICULAR'),
    COALESCE(NEW.total_value, 0),
    'open',
    'agenda',
    'Auto-generated from appointment #' || NEW.id,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_tiss_guide_from_appointment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO billing_guides (
    clinic_id, appointment_id, payer_id, status, guide_number, created_at
  ) VALUES (
    NEW.clinic_id,
    NEW.id,
    NEW.payer_id,
    'draft',
    'GU-' || NEW.clinic_id || '-' || NEW.id,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cancel_ar_receivable_from_appointment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ar_receivables
    SET status = 'canceled', updated_at = NOW()
    WHERE appointment_id = NEW.id AND status != 'received';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### RPCs necessários (NEW)
```sql
-- Real-time repasse per appointment (não mensal)
CREATE OR REPLACE FUNCTION calculate_repasse_per_appointment(
  p_appointment_id UUID,
  p_clinic_id UUID,
  p_professional_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_service_id UUID;
  v_group_id UUID;
  v_value NUMERIC;
  v_percentage NUMERIC;
BEGIN
  -- Get appointment details
  SELECT service_id, total_value INTO v_service_id, v_value
    FROM appointments
    WHERE id = p_appointment_id;

  -- Try: service individual rule
  SELECT percentage INTO v_percentage
    FROM repasse_config_servico
    WHERE clinic_id = p_clinic_id AND service_id = v_service_id AND active = true
    LIMIT 1;

  IF v_percentage IS NOT NULL THEN
    RETURN (v_value * v_percentage) / 100;
  END IF;

  -- Try: group rule
  SELECT rc.percentage INTO v_percentage
    FROM repasse_config_grupo rcg
    JOIN service_groups rc ON rcg.group_id = rc.id
    JOIN professional_services ps ON ps.service_id = v_service_id
    WHERE rcg.clinic_id = p_clinic_id AND rcg.active = true
    LIMIT 1;

  IF v_percentage IS NOT NULL THEN
    RETURN (v_value * v_percentage) / 100;
  END IF;

  -- Default: professional rule
  SELECT percentage INTO v_percentage
    FROM repasse_config_profissional
    WHERE clinic_id = p_clinic_id AND professional_id = p_professional_id AND active = true;

  IF v_percentage IS NOT NULL THEN
    RETURN (v_value * v_percentage) / 100;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Ajustes mínimos em INTEGRAÇÕES
```
1. appointmentFinancialIntegrationApi.js:
   - Implement all 5 functions (currently stub)
   - Call CREATE AR trigger
   - Call CREATE TISS guide trigger
   - Call CANCEL AR trigger

2. CheckinFinanceiro.jsx:
   - No changes (already validates, trigger will auto-create)

3. RepasseCal

culo:
   - Add real-time per-appointment trigger
   - Keep monthly aggregate RPC

4. DashboardDRE.jsx:
   - Replace getMockDRE() with actual SQL queries
   - Query from account_plans + financial_transactions
```

### Riscos de IMPACTO
- ⚠️ Triggers on appointments table: test thoroughly (potential lock contention)
- ⚠️ Auto-create AR: may mess if appointment already processed elsewhere (idempotency check)
- ⚠️ Guia TISS auto-create: validation that payer is convênio mandatory
- ⚠️ Repasse real-time: may impact monthly calc if both triggered (deduplication)

---

## 🚀 RECOMENDAÇÕES FINAL

### Sequência Sugerida
1. **Fase 1 (2 dias):** Triggers + SQL functions (test isolated)
2. **Fase 2 (1 dia):** Implement appointmentFinancialIntegrationApi.js
3. **Fase 3 (1 dia):** Integration tests (appointment → AR → faturamento → repasse)
4. **Fase 4 (opcional, 1 dia):** Real DRE queries + relatórios consolidados

### Testes Essenciais
```
✅ Create appointment → complete → AR created automatically
✅ Create appointment (convênio) → complete → guia TISS created
✅ Cancel appointment → AR soft-deleted
✅ Repasse calculation with precedência regra (service > group > prof)
✅ Dashboard updates in real-time
✅ Relatórios consolidados (production → billing → repasse)
```

### Documentação Mínima
```
📄 Diagrama: Appointment → AR → Guide → Lote → XML → Retorno
📄 Diagrama: Precedência regra Repasse
📄 Trigger flowchart (appointment completion)
📄 API specification: appointmentFinancialIntegrationApi.js (todos 5 funcs)
📄 Schema updates (new tables? constraints?)
```

---

**PRÓXIMO PASSO: Validar este diagnóstico com você, depois começar Fase 1.**
