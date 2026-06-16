# 🎯 INTEGRAÇÃO AGENDA → FINANCEIRO - PLANO EXECUTIVO

## 📊 ESTADO ATUAL

### ✅ Arquivos Existentes
- `src/lib/appointmentFinancialIntegrationApi.ts` - Service layer (v2.0 com impostos)
- `src/modules/financeiro/hooks/useAppointmentFinancialIntegration.ts` - React hook
- `src/lib/taxCalculationEngine.ts` - Cálculo de impostos
- `src/lib/appointmentFinancialAutomations.js` - Automações

### ⚠️ O QUE PRECISA SER FEITO

## FASE 1: CONSOLIDAÇÃO E MELHORIA (2-3 horas)

### 1️⃣ Revisar e Completar Service Layer
**Arquivo:** `src/lib/appointmentFinancialIntegrationApi.ts`
- [ ] Adicionar método para listar mapeamentos com filtros
- [ ] Adicionar método para atualizar status de recebível
- [ ] Adicionar método para cancelar mapeamento
- [ ] Adicionar método para reprocessar (retry)
- [ ] Adicionar método para gerar auditoria
- [ ] Adicionar paginação e busca
- [ ] Adicionar validações melhoradas

### 2️⃣ Expandir Hook React
**Arquivo:** `src/modules/financeiro/hooks/useAppointmentFinancialIntegration.ts`
- [ ] Completar CRUD mutations
- [ ] Adicionar refetch/invalidation
- [ ] Adicionar error handling robusto
- [ ] Adicionar loading states
- [ ] Adicionar cache invalidation automático
- [ ] Adicionar retry logic

### 3️⃣ Criar Services Complementares
**Novos Arquivos:**
- [ ] `src/lib/appointmentFinancialLogsApi.js` - Auditoria e logs
- [ ] `src/lib/appointmentFinancialCacheApi.js` - Cache invalidation
- [ ] `src/lib/appointmentFinancialRealtimeApi.js` - Realtime listeners

### 4️⃣ Criar Hooks Adicionais
**Novos Arquivos:**
- [ ] `src/modules/financeiro/hooks/useAppointmentAudit.ts` - Logs de auditoria
- [ ] `src/modules/financeiro/hooks/useAppointmentFinancialCache.ts` - Cache
- [ ] `src/modules/financeiro/hooks/useAppointmentFinancialRealtime.ts` - Realtime

## FASE 2: TRIGGERS E AUTOMAÇÕES (1-2 horas)

### 5️⃣ Supabase Triggers/Functions
**Novos Arquivos SQL:**
- [ ] `supabase/functions/on_appointment_completed.sql`
  - Disparado quando appointment.status = 'completed'
  - Valida dados
  - Cria recebível automaticamente
  - Gera logs
  
- [ ] `supabase/functions/on_receivable_created.sql`
  - Atualiza fluxo de caixa
  - Atualiza DRE
  - Notifica
  
- [ ] `supabase/functions/audit_financial_event.sql`
  - Log automático de eventos

### 6️⃣ Edge Functions
**Novos Arquivos:**
- [ ] `supabase/functions/validate-appointment-receivable/index.ts`
- [ ] `supabase/functions/create-receivable-batch/index.ts`

## FASE 3: UI/UX E INTEGRAÇÃO (1-2 horas)

### 7️⃣ Componentes de UI
**Novos Arquivos:**
- [ ] `src/components/financeiro/AppointmentFinancialStatus.jsx`
- [ ] `src/components/financeiro/AppointmentFinancialDetails.jsx`
- [ ] `src/components/financeiro/FinancialAuditLog.jsx`

### 8️⃣ Páginas/Tabs
**Modificações:**
- [ ] `AgendaPage.jsx` - Adicionar status financeiro em cada appointment
- [ ] Criar aba "Financeiro" na visualização de agendamento
- [ ] Mostrar recebível criado

### 9️⃣ Notificações
**Implementar:**
- [ ] Email quando recebível criado
- [ ] Dashboard alert
- [ ] Push notification
- [ ] Auditoria trail

## FASE 4: TESTES E VALIDAÇÃO (1 hora)

### 🔟 Testes Unitários
- [ ] `src/lib/__tests__/appointmentFinancialIntegration.test.ts`
  - 40+ test cases
  - Coverage: 90%+

### 1️⃣1️⃣ Testes E2E
- [ ] Fluxo completo: appointment → completed → receivable criado
- [ ] Cálculos de impostos
- [ ] Auditoria trail

### 1️⃣2️⃣ Validação Manual
- [ ] Testar no browser
- [ ] Verificar recebíveis criados
- [ ] Validar cálculos

---

## 📋 TABELAS SUPABASE NECESSÁRIAS

```sql
-- Verificar/Criar:
- appointments (existente, adicionar: completed_at, financial_status)
- ar_invoices (existente, necessário com impostos)
- appointment_to_receivable_mapping (existente)
- appointment_financial_rules (existente)
- financial_audit_logs (NOVO - para auditoria)
- appointment_financial_cache (NOVO - para cache)
```

---

## 🔌 FLUXO AUTOMÁTICO ESPERADO

```
[Agenda: Atendimento Finalizado]
           ↓
[Trigger: on_appointment_status_change]
           ↓
[Validar: Dados completos + Regra financeira]
           ↓
[Calcular: Impostos (PIS/COFINS/CSLL/IR/ISSQN)]
           ↓
[Criar: Recebível (AR Invoice)]
           ↓
[Atualizar: Fluxo de Caixa + DRE + Indicadores]
           ↓
[Gerar: Auditoria (log completo)]
           ↓
[Notificar: Sistema + Usuário]
           ↓
[Cache: Invalidar caches relevantes]
```

---

## 🎯 PRIORIDADES

1. **HIGH** - Revisar/completar appointmentFinancialIntegrationApi.ts
2. **HIGH** - Criar triggers Supabase para automação
3. **HIGH** - Expandir hooks React
4. **MEDIUM** - Criar services complementares (logs, cache, realtime)
5. **MEDIUM** - Criar componentes UI
6. **MEDIUM** - Integrar em AgendaPage
7. **LOW** - Testes
8. **LOW** - Notificações

---

## ⏱️ ESTIMATIVA TOTAL

- Fase 1: 2-3 horas
- Fase 2: 1-2 horas  
- Fase 3: 1-2 horas
- Fase 4: 1 hora
- **TOTAL: 5-8 horas de desenvolvimento**

---

## 🚀 PRÓXIMOS PASSOS

1. Começar com revisão/consolidação do appointmentFinancialIntegrationApi.ts
2. Criar os triggers Supabase
3. Expandir hooks
4. Testar fluxo completo
5. Integrar na UI
