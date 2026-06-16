# INTEGRAÇÃO AGENDA → FINANCEIRO - CHECKLIST DE IMPLEMENTAÇÃO

## 📊 STATUS ATUAL (20% Concluído)
✅ Service layer base: appointmentFinancialIntegrationApi.ts
✅ React hook base: useAppointmentFinancialIntegration.ts
✅ Tax engine: taxCalculationEngine.ts
⏳ Automações: 80% - faltam triggers

## 🎯 FASE 1: CONSOLIDAÇÃO SERVICE LAYER (30 min)

### ✅ Já implementado:
- [x] finalizeAppointmentWithFinancials()
- [x] validateAppointmentForReceivable()
- [x] calculateAppointmentReceivableValues()
- [x] createReceivableFromAppointment()
- [x] getAppointmentFinancialRules()
- [x] getAppointmentReceivableMappings()
- [x] getTaxConfiguration()
- [x] listPayerRules()

### 📋 A COMPLETAR NO SERVICE LAYER:
1. **cancelMappingAndReceivable()** - Reverter mapeamento e recebível
2. **reprocessAppointmentFinancials()** - Retry logic
3. **listFinancialAuditLogs()** - Auditoria
4. **getAppointmentFinancialStatus()** - Status da integração
5. **bulkCreateReceivables()** - Criar múltiplos
6. **getFinancialStatsByDateRange()** - Relatórios
7. **updateReceivableFromAppointment()** - Atualizar se appointment mudou
8. **validateAppointmentDataIntegrity()** - Validar dados

## 🎯 FASE 2: SUPABASE TRIGGERS (1 hora)

### SQL Functions Necessárias:
1. **trigger_appointment_completed** 
   - Disparado em: `appointments.status = 'completed'`
   - Ação: Chamar RPC para criar recebível
   - Erro: Notificar, logar, não bloquear appointment

2. **trigger_receivable_created**
   - Disparado em: `ar_invoices.INSERT`
   - Ação: Atualizar fluxo de caixa, DRE, indicadores

3. **trigger_receivable_updated**
   - Disparado em: `ar_invoices.UPDATE`
   - Ação: Propagar mudanças (fluxo, DRE)

4. **log_financial_event**
   - RPC central para logging de eventos
   - Salva em: `financial_audit_logs`

## 🎯 FASE 3: HOOKS REACT (30 min)

### Adicionar ao useAppointmentFinancialIntegration.ts:

**Mutations:**
```typescript
- useFinalizeAppointmentMutation()
- useCancelMappingMutation()
- useReprocessMutation()
- useUpdateRuleMutation()
```

**Real-time:**
```typescript
- useAppointmentFinancialRealtime(appointmentId)
- useReceivableCreatedListener(appointmentId)
- useFinancialAuditLogListener(appointmentId)
```

## 🎯 FASE 4: UI COMPONENTS (1 hora)

### Novos Componentes:
1. **AppointmentFinancialStatus** - Badge/card com status
2. **AppointmentFinancialDetails** - Expandível com valores
3. **FinancialAuditLog** - Timeline de eventos
4. **AppointmentFinancialIcon** - Icon com tooltip

### Modificar:
1. **AgendaPage** - Adicionar status financeiro por appointment
2. **AgendaDetailView** - Tab "Financeiro" com detalhes

## 📝 IMPLEMENTAÇÃO DETALHADA

### ✅ PASSO 1: Completar Service Layer
Adicionar ao final de appointmentFinancialIntegrationApi.ts:
- cancelMappingAndReceivable()
- reprocessAppointmentFinancials()
- listFinancialAuditLogs()
- getAppointmentFinancialStatus()
- bulkCreateReceivables()

### ✅ PASSO 2: SQL Triggers
Criar arquivo: supabase/migrations/2024_04_appointment_financial_triggers.sql

### ✅ PASSO 3: Expandir Hook
Adicionar ao useAppointmentFinancialIntegration.ts:
- Novas mutations (cancel, reprocess)
- Real-time listeners
- Cache invalidation

### ✅ PASSO 4: UI Components
Criar arquivo: src/components/financeiro/AppointmentFinancialStatus.jsx

### ✅ PASSO 5: Integração AgendaPage
Modificar: src/pages/clinica/agenda/AgendaPage.jsx
- Mostrar status financeiro
- Link para detalhes

## 🔗 DEPENDÊNCIAS

```
appointmentFinancialIntegrationApi.ts
  ├─ taxCalculationEngine.ts ✅
  ├─ customSupabaseClient.js ✅
  └─ appointmentFinancialAutomations.js ✅

useAppointmentFinancialIntegration.ts
  ├─ appointmentFinancialIntegrationApi.ts
  ├─ useAuth() ✅
  ├─ useClinicContext() ✅
  └─ @tanstack/react-query ✅

Supabase Triggers
  ├─ appointments table ✅
  ├─ ar_invoices table ✅
  ├─ appointment_to_receivable_mapping table ✅
  └─ financial_audit_logs table (NOVO)

UI Components
  ├─ appointmentFinancialIntegrationApi.ts
  ├─ useAppointmentFinancialIntegration.ts
  ├─ Radix UI components ✅
  └─ Lucide React icons ✅
```

## ⏱️ CRONOGRAMA

| Fase | Tarefa | Estimado | Status |
|------|--------|----------|--------|
| 1 | Service layer | 30 min | 🔄 Em progresso |
| 2 | SQL triggers | 1 h | ⏳ Próximo |
| 3 | React hooks | 30 min | ⏳ Próximo |
| 4 | UI components | 1 h | ⏳ Próximo |
| 5 | Testes | 1 h | ⏳ Próximo |

**TOTAL ESTIMADO: 4-5 horas**

---

## 🚀 COMEÇAR AGORA?

Próximo passo: Completar Service Layer adicionar as funções faltantes.
