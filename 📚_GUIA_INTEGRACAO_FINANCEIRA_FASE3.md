## 📚 GUIA DE INTEGRAÇÃO FINANCEIRA - MÓDULO AGENDA (FASE 3)

### 🎯 Visão Geral

Esta é uma **preparação desacoplada** para integração com o módulo Financeiro. Toda a arquitetura está pronta, mas **nenhuma automação foi ativada yet**. O sistema está em modo "simulação" (dry-run), onde:

- ✅ Valida dados financeiros
- ✅ Prepara estruturas para envio
- ✅ Dispara eventos (observáveis por listeners)
- ✅ Oferece hooks React para UI
- ❌ NÃO cria registros no BD
- ❌ NÃO chama módulo Financeiro
- ❌ NÃO gera guias TISS
- ❌ NÃO cria A Receber

---

## 📋 ESTRUTURA CRIADA

### 1. Tipos de Integração Financeira
**Arquivo:** `src/modules/agenda/types/financial.ts` (350+ linhas)

```typescript
// 4 Enums principais
FinancialStatus        // pending | provisional | confirmed | billed | cancelled | rejected
AttendanceType         // consultation | procedure | surgery | therapy | exam | follow_up | administration
PayerType              // insurance | particular | company | government
AuthorizationStatus    // not_required | pending | authorized | denied | expired

// Interface estendida
AppointmentWithFinancial extends Appointment {
  estimated_value?: number
  authorized_value?: number
  payer_type?: PayerType
  attendance_type?: AttendanceType
  financial_status?: FinancialStatus
  authorization_code?: string
  guide_number?: string
  // ... 7 campos para validar
}

// Sistema de Eventos desacoplado
AppointmentEvent       // Evento disparado quando status muda
AppointmentEventListener   // Interface para listeners
AppointmentEventRegistry   // Registro global

// TISS
AppointmentTISSData    // Estrutura de guia TISS

// Validação
FinancialValidationResult  // Resultado da validação
FinancialIntegrationConfig // Feature flags
```

### 2. Sistema de Eventos
**Arquivo:** `src/modules/agenda/services/appointmentEvents.service.ts` (300+ linhas)

```typescript
// Singleton global
appointmentEventBus
  .subscribe(eventTypes, handler, options)      // Inscrever listener
  .unsubscribe(listenerId)                      // Desinscrever
  .fireEvent(event)                             // Disparar evento
  .setEnabled(listenerId, enabled)              // Ativar/desativar
  .getEventHistory(limit)                       // Histórico

// Eventos suportados
appointment.created
appointment.checked_in
appointment.completed
appointment.cancelled
+ 6 outros

// Ativar integração financeira (quando pronto)
enableFinancialIntegration(handler)
enableTISSIntegration(handler)
```

### 3. Validação Financeira
**Arquivo:** `src/modules/agenda/services/financialIntegration.service.ts` (300+ linhas)

Valida os 7 campos obrigatórios **SEM efeitos colaterais**:

```typescript
validateAppointmentForFinancial(appointment)
  ↓
  ✅ Valida: patient_id, professional_id, payer_id, 
             estimated_value, authorization_code, 
             guide_number, attendance_type
  ✅ Retorna: { is_valid, is_billable, errors, warnings }
  ❌ NÃO cria nada no BD

prepareAppointmentForBilling(appointment)
  ↓
  ✅ Prepara dados para envio ao Financeiro
  ✅ Retorna: AppointmentFinancialEventData
  ❌ NÃO envia nada
```

### 4. Serviço TISS
**Arquivo:** `src/modules/agenda/services/tiss.service.ts` (300+ linhas)

Prepara guias TISS **sem gerar nada**:

```typescript
validateForTISS(appointment)
  ↓ Valida campos TISS

buildTISSData(appointment, clinicData, professionalData)
  ↓ Monta estrutura de guia
  ↓ Formata número de guia
  ↓ Retorna AppointmentTISSData
  ❌ NÃO salva no BD

// Tabela de códigos CBHPM
lookupCBHPMCode('301401')  // Consulta - Clínica Geral
```

### 5. Constantes Financeiras
**Arquivo:** `src/modules/agenda/constants/financial.ts` (300+ linhas)

```typescript
FINANCIAL_STATUS_CONFIG         // Configuração de cada status
ATTENDANCE_TYPE_CONFIG          // Configurações de tipos
PAYER_TYPE_CONFIG               // Configurações de pagadores
AUTHORIZATION_STATUS_CONFIG     // Configurações de autorização
TISS_GUIDE_TYPES                // Tipos de guia (PS, SP, AH)
FINANCIAL_INTEGRATION_CONFIG    // Feature flags (todos desativados)
FINANCIAL_MESSAGES              // Mensagens em pt-BR
```

### 6. Hooks React
**Arquivo:** `src/modules/agenda/hooks/useFinancial.ts` (250+ linhas)

```typescript
// Hook individual para validação
useAppointmentFinancialValidation(appointment)
  ↓ { validation, isValidating, error, refresh }

// Hook individual para preparação
useAppointmentBillingPreparation(appointment)
  ↓ { billingData, isPreparing, error, refresh }

// Hook para inscrição em eventos
useAppointmentEvents(eventTypes, { onEvent, enabled })
  ↓ { events, isListening, eventCount, clearEvents }

// Hook para status financeiro
useAppointmentFinancialStatus(appointment)
  ↓ { status, isUpdating, updateStatus }

// Hook para campos financeiros
useAppointmentFinancialFields(appointment)
  ↓ { fields, updateField, hasChanges }

// Hook completo (recomendado para UI)
useAppointmentFinancial(appointment, options)
  ↓ Combina todos os hooks
  ↓ { validation, billingData, status, fields, events, isReadyForBilling }
```

---

## 🚀 COMO USAR

### Scenario 1: Validar agendamento para faturamento

```typescript
import { useAppointmentFinancial } from '@/modules/agenda';

function BillingCheckPage({ appointmentId }) {
  const appointment = useAppointments(...)[0];
  
  const { validation, isReadyForBilling, billingData } = 
    useAppointmentFinancial(appointment);

  return (
    <div>
      {validation?.is_valid ? (
        <p>✅ Pronto para faturamento</p>
      ) : (
        <ul>
          {validation?.blocking_errors.map(err => (
            <li key={err}>❌ {err}</li>
          ))}
        </ul>
      )}
      
      {validation?.warnings.map(warn => (
        <p key={warn}>⚠️ {warn}</p>
      ))}

      {isReadyForBilling && billingData && (
        <pre>{JSON.stringify(billingData, null, 2)}</pre>
      )}
    </div>
  );
}
```

### Scenario 2: Monitorar eventos de agendamento

```typescript
import { useAppointmentEvents } from '@/modules/agenda';

function EventMonitor() {
  const { events, isListening } = useAppointmentEvents(
    ['appointment.completed', 'appointment.cancelled'],
    { enabled: true }
  );

  return (
    <div>
      <p>{isListening ? '🔴 Listening' : '⭕ Not listening'}</p>
      {events.map(event => (
        <div key={event.id}>
          <p>📌 {event.type} - {event.appointment.id}</p>
          <p>⏰ {event.timestamp}</p>
        </div>
      ))}
    </div>
  );
}
```

### Scenario 3: Verificar estrutura TISS

```typescript
import { buildTISSData, validateForTISS } from '@/modules/agenda';

async function CheckTISSStructure() {
  const validation = validateForTISS(appointment);
  
  if (!validation.valid) {
    console.log('❌ Missing TISS fields:', validation.errors);
    return;
  }

  const tissData = await buildTISSData(appointment, clinicData, profData);
  console.log('📋 TISS structure ready (NOT SAVED):', tissData);
}
```

---

## ⚙️ CONFIGURAÇÃO

### Inicializar sistema de eventos (no main.jsx)

```typescript
import { initializeAppointmentEventSystem } from '@/modules/agenda';

// Startup
initializeAppointmentEventSystem();
// ✅ Audit listener ativado
// ❌ Financial/TISS listeners desativados
```

### Ativar integração financeira (quando Financeiro estiver pronto)

```typescript
import { 
  enableFinancialIntegration,
  handleAppointmentCompleted 
} from '@/modules/agenda';

// Quando integração financeira for implementada:
enableFinancialIntegration(async (event) => {
  // Aqui chamaremos financeApi.createReceivable(...)
  console.log('Would create receivable for:', event.appointment.id);
});
```

---

## 🔄 FLUXO DE INTEGRAÇÃO FUTURA

### Quando FASE 4 ativar:

1. **Editar `FinancialIntegrationConfig`:**
   ```typescript
   ENABLED: true,
   AUTO_CREATE_RECEIVABLE: true,
   AUTO_CREATE_TISS_GUIDE: true,
   ```

2. **Importar módulo Financeiro:**
   ```typescript
   import { createReceivable } from '@/modules/financeiro';
   ```

3. **Implementar handler real:**
   ```typescript
   enableFinancialIntegration(async (event) => {
     if (event.type !== 'appointment.completed') return;
     
     const data = await prepareAppointmentForBilling(event.appointment);
     if (data?.is_billable) {
       await createReceivable(data);
     }
   });
   ```

4. **Disparo automático** (via appointmentEvents.service):
   ```
   appointment completes → event fires → financial handler runs
   ```

---

## 📊 STATUS DE CAMPOS VALIDADOS

7 campos são validados quando integração ativada:

| Campo | Validação | Status |
|-------|-----------|--------|
| `estimated_value` | Número positivo | ✅ Ready |
| `payer_type` | insurance\|particular\|company\|government | ✅ Ready |
| `payer_id` | UUID válido | ✅ Ready |
| `authorization_code` | String | ✅ Ready |
| `guide_number` | 13 dígitos TISS | ✅ Ready |
| `attendance_type` | Enum AttendanceType | ✅ Ready |
| `financial_status` | Enum FinancialStatus | ✅ Ready |

---

## 🎯 EVENTOS PREPARADOS

4 eventos são disparados quando status muda:

| Evento | Disparado quando | Handler |
|--------|------------------|---------|
| `appointment.created` | Agendamento criado | Audit + Financial (quando ativo) |
| `appointment.checked_in` | Status → checked_in | Audit + Financial (quando ativo) |
| `appointment.completed` | Status → completed | Audit + Financial (quando ativo) |
| `appointment.cancelled` | Status → cancelled | Audit + Financial (quando ativo) |

---

## 🔒 SEGURANÇA

### O que NÃO está ativado:

- ❌ Criação de A Receber (ar_receivable)
- ❌ Geração de guias TISS
- ❌ Envio para operadora
- ❌ Integração com módulo Financeiro
- ❌ Modificação de status financeiro automática
- ❌ Cálculo de valores automático

### O que ESTÁ protegido:

- ✅ Validação em dry-run (não altera dados)
- ✅ Eventos apenas observáveis (read-only)
- ✅ Feature flags para ativar integração
- ✅ Listeners podem ser desativados
- ✅ Sem imports do Financeiro (desacoplado)

---

## 📝 LOGS E DEBUG

### Ver status do sistema

```typescript
import { appointmentEventBus } from '@/modules/agenda';

console.log(appointmentEventBus.getStatus());
// {
//   listeners: 1,
//   eventHistory: 42,
//   activeListeners: [{ id: 'audit-listener', events: [...] }]
// }
```

### Ver histórico de eventos

```typescript
const history = appointmentEventBus.getEventHistory(10);
console.log(history);
// Últimos 10 eventos disparados
```

### Logs no console

Todos os componentes loggam com prefixos:

```
📋 [AUDIT] appointment.completed on 123e4567-e89b-12d3-a456-426614174000
🔍 [DRY-RUN] Validating appointment 123e4567-e89b-12d3-a456-426614174000 for financial
📦 [DRY-RUN] Preparing appointment 123e4567-e89b-12d3-a456-426614174000 for billing
⏸️  Financial integration not yet enabled - skipping
```

---

## 📚 REFERÊNCIA RÁPIDA

```typescript
// ============ IMPORTS ============

import {
  // Types
  AppointmentWithFinancial,
  FinancialStatus,
  AttendanceType,
  AppointmentEvent,
  FinancialValidationResult,
  
  // Services
  validateAppointmentForFinancial,
  prepareAppointmentForBilling,
  buildTISSData,
  appointmentEventBus,
  
  // Hooks
  useAppointmentFinancial,
  useAppointmentEvents,
  
  // Constants
  FINANCIAL_STATUS_CONFIG,
  PAYER_TYPE_CONFIG,
  FINANCIAL_MESSAGES,
  
} from '@/modules/agenda';

// ============ VALIDAR ============
const validation = await validateAppointmentForFinancial(appointment);
console.log(validation.is_billable);  // true/false

// ============ PREPARAR ============
const billingData = await prepareAppointmentForBilling(appointment);
console.log(billingData);  // Estrutura pronta (não enviada)

// ============ CONSTRUIR TISS ============
const tissData = await buildTISSData(appointment, clinicData);
console.log(tissData);  // Estrutura TISS pronta (não salva)

// ============ DISPARAR EVENTO ============
const event = createAppointmentEvent('appointment.completed', appointment);
await appointmentEventBus.fireEvent(event);

// ============ INSCREVER LISTENER ============
const listenerId = appointmentEventBus.subscribe(
  ['appointment.completed'],
  async (event) => {
    console.log('Agendamento finalizado:', event.appointment.id);
  }
);

// ============ REACT HOOK ============
const { validation, billingData, isReadyForBilling } = 
  useAppointmentFinancial(appointment);
```

---

## ⚡ PRÓXIMOS PASSOS (FASE 4)

1. **Implementar handlers reais** para cada evento
2. **Conectar ao módulo Financeiro** (import + integração)
3. **Ativar criação de A Receber** (ar_receivable)
4. **Implementar geração de guias TISS**
5. **Ativar feature flags** na configuração
6. **Testar fluxo end-to-end**
7. **Deploy para produção**

---

**Documentação gerada:** 2025-01-XX  
**Fase:** 3 (Preparação Desacoplada)  
**Status:** ✅ Pronto para integração futura  
**Automações Ativadas:** ❌ Nenhuma (modo simulação)
