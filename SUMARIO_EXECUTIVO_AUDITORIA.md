# 🎯 SUMÁRIO EXECUTIVO — Auditoria Gesclinic Web
**Data:** Abril 2026  
**Enfoque:** Lacunas críticas nas integrações Agenda ↔ Financeiro ↔ Faturamento ↔ Repasse  

---

## 📊 STATUS POR MÓDULO

| Módulo | Funcionalidade | Status | Gap | Prioridade |
|--------|---|---|---|---|
| **AGENDA** | Core (CRUD, views, check-in, confirmação) | 🟢 90% OK | Auto-AR, auto-guia TISS, auto-repasse | 🔴 CRÍTICA |
| **FINANCEIRO** | Core (AP, AR, cash flow, repasse mensal) | 🟡 70% OK | Auto-AR, DRE real, reversão cancellation | 🔴 CRÍTICA |
| **FATURAMENTO** | Core (guias, XML) + integrações | 🔴 40% OK | Auto-guide, lote workflow, glosa system | 🔴 CRÍTICA |
| **REPASSE** | Config + cálculo mensal + AP generation | 🟡 65% OK | Real-time calc, test precedência, bruto/líquido | 🟠 IMPORTANTE |

---

## 🔴 LACUNAS CRÍTICAS (Bloqueiam workflows end-to-end)

### 1. **Appointment completion NÃO dispara Financeiro**
**Problema:** Quando agendamento é marcado como "attended", nada acontece no Financeiro  
**Impacto:** Sem AR (receivable), sem guia TISS, sem base para repasse  
**Solução mínima:**
```sql
-- Trigger: appointment.status='attended' → INSERT ar_receivables
-- Trigger: appointment.status='attended' → INSERT billing_guides (se convênio)
-- + API function: appointmentFinancialIntegrationApi.finalizeAppointmentWithFinancials()
```
**Estimativa:** 4-6 horas  

---

### 2. **Cancelamento de agendamento NÃO reverte Financeiro**
**Problema:** Se attendance cancelado, AR e guias ficam sem ajuste  
**Impacto:** Contas duplicadas, glosa manual necessária  
**Solução mínima:**
```sql
-- Trigger: appointment.status='canceled' → UPDATE ar_receivables (status='canceled')
```
**Estimativa:** 2-3 horas  

---

### 3. **DRE exibe APENAS dados fictícios**
**Problema:** Dashboard com KPIs totalmente inútil (mock data hardcoded)  
**Impacto:** Gestão financeira cega (sem DRE real)  
**Solução mínima:**
```sql
-- Queries reais: SELECT SUM(valor) FROM ar_receivables WHERE status='received'
-- Query output: month-by-month income statement
```
**Estimativa:** 3-4 horas  

---

### 4. **Repasse APENAS mensal, não real-time**
**Problema:** Cálculo de repasse requer RPC manual no final do mês  
**Impacto:** Sem accrual contábil, sem dashboard de produção em tempo real  
**Solução mínima:**
```sql
-- RPC: calculate_repasse_per_appointment(appointment_id) → numeric
-- Trigger: appointment.status='attended' → INSERT doctor_commissions (accrual)
-- Precedência: service > group > professional
```
**Estimativa:** 5-6 horas  

---

### 5. **Faturamento TISS incompleto (40% apenas)**
**Problema:** Guias existem mas sem auto-creation, lotes sem workflow claro, XML untested  
**Impacto:** Sem faturador 100% automático, processo manual  
**Solução mínima:**
```
1. Auto-create guia TISS from appointment when attended
2. Batch guides into lotes (RPC-based)
3. Generate XML with validation
4. Test generation end-to-end
```
**Estimativa:** 8-10 horas  

---

## 🟠 LACUNAS IMPORTANTES (Parciais, precisam ajuste)

| Item | Módulo | Situação | Fix |
|------|--------|---------|-----|
| **Precedência regra repasse (service > group > prof)** | Repasse | Código existe, untested | Unit tests, integration test |
| **Check-in integração com financeiro** | Agenda ↔ Financeiro | Valida mas não cria | Remove manual validation, rely on trigger |
| **Conciliação bancária** | Financeiro | Suggestions only | Não crítico (manual OK) |
| **Relatórios consolidados** | All | Mock/incomplete | Low priority (dashboards OK) |

---

## ✅ JÁ FUNCIONA BEM

| Módulo | Feature |
|--------|---------|
| **Agenda** | CRUD, 4 views (day/week/month/list), check-in UX, filtros, encaixe, confirmação WhatsApp |
| **Financeiro** | AP CRUD + batch, cash flow chart, chart of accounts, cost centers |
| **Repasse** | Config por profissional, cálculo mensal RPC, AP bills auto-generation |
| **Base Sistema** | Profissionais, serviços, salas, convenios, CBHPM |

---

## 🎯 PLANO IMPLEMENTAÇÃO MÍNIMA (13-15 horas total)

```
FASE 1 (2h): SQL TRIGGERS + RPCs
  ├─ Trigger: appointment='attended' → AR create
  ├─ Trigger: appointment='attended' → guide TISS create
  ├─ Trigger: appointment='canceled' → AR cancel
  └─ RPC: calculate_repasse_per_appointment()

FASE 2 (3h): API FUNCTIONS
  ├─ Complete appointmentFinancialIntegrationApi.js
  ├─ Call triggers from API
  └─ Test functions in isolation

FASE 3 (4h): FATURAMENTO CORE
  ├─ Auto-guide TISS creation
  ├─ Batch lotes RPC
  ├─ XML generation (test)
  └─ Retorno workflow (stub)

FASE 4 (4h): INTEGRATION TESTING + DRE QUERIES
  ├─ E2E: appointment → AR → guide → repasse
  ├─ Real DRE queries (não mock)
  ├─ Dashboard refresh (live update test)
  └─ Relative-time repasse test
```

---

## 📋 CHECKLIST VERIFICAÇÃO

Depois de implementação, validar:

- [ ] Create appointment → complete → AR appears in ContasReceber
- [ ] Create appointment (convênio) → complete → Guide appears in GuiasPage
- [ ] Cancel appointment → AR marked as canceled, guide marked as draft
- [ ] Repasse calculation: service rule > group rule > professional default
- [ ] Dashboard DRE shows real numbers (não mock)
- [ ] Repasse appears immediately after appointment complete (não wait for month-end)
- [ ] Appointment financial audit log has ALL events (created, sent, received, etc.)
- [ ] Relatório consolidado: production → billing → received → repasse (visual)

---

## 🚫 O QUE NÃO MUDAR

```
🔒 Rotas & menus (já prontos)
🔒 Status enums (12 estáveis)
🔒 Components UI (Radix-based, funcionando)
🔒 Database schema (apenas adicionar triggers, não alter)
🔒 Zustand stores principais
🔒 Permissões RBAC
```

---

## 📖 DOCUMENTAÇÃO SERÁ CRIADA

Após implementação:
```
📄 Fluxo visual: Agendamento → Check-in → Atendimento → Financeiro → Faturamento → Repasse
📄 Precedência regra Repasse (exemplificada)
📄 Guia API: appointmentFinancialIntegrationApi.js (5 funções)
📄 Teste suite: 20+ test cases (coverage Agenda ↔ Financeiro ↔ Faturamento ↔ Repasse)
```

---

**PRÓXIMO PASSO:** Começar FASE 1 (SQL Triggers) ou quer discutir lacunas específicas primeiro?
