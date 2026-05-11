## 🚀 QUICK START - INTEGRAÇÃO FINANCEIRA PHASE 3

### ⚡ 30 SEGUNDOS CHEAT SHEET

```typescript
// ============ IMPORTS ============
import {
  useAppointmentFinancial,           // 👈 RECOMENDADO
  AppointmentWithFinancial,
  FinancialStatus,
} from '@/modules/agenda';

// ============ USO NO COMPONENTE ============
function BillingCheck({ appointment }) {
  const {
    validation,                       // Resultado da validação
    billingData,                      // Dados preparados (não enviados)
    isReadyForBilling,                // boolean
    validationError,                  // string | null
  } = useAppointmentFinancial(appointment, {
    autoValidate: true,               // Validar automaticamente
    autoPrepareBilling: true,         // Preparar dados automaticamente
    listenToEvents: true,             // Escutar eventos
  });

  // ============ RENDERIZAR UI ============
  return (
    <div>
      {/* Status */}
      {validation?.is_billable ? (
        <p>✅ Pronto para faturar</p>
      ) : (
        <p>❌ Não faturável</p>
      )}

      {/* Erros bloqueantes */}
      {validation?.blocking_errors.map(err => (
        <p key={err}>🚫 {err}</p>
      ))}

      {/* Avisos */}
      {validation?.warnings.map(warn => (
        <p key={warn}>⚠️ {warn}</p>
      ))}

      {/* Dados preparados */}
      {billingData && (
        <pre>{JSON.stringify(billingData, null, 2)}</pre>
      )}

      {/* Botão de ação */}
      <button disabled={!isReadyForBilling}>
        Faturar Agora
      </button>
    </div>
  );
}
```

---

## 📋 VALIDAÇÃO

### Validar um appointment

```typescript
import { 
  validateAppointmentForFinancial,
  FinancialValidationResult 
} from '@/modules/agenda';

const result: FinancialValidationResult = 
  await validateAppointmentForFinancial(appointment);

// result.is_valid: boolean
// result.is_billable: boolean
// result.blocking_errors: string[]
// result.warnings: string[]
// result.missing_fields: string[]
```

### Campos obrigatórios validados

```typescript
// 7 CAMPOS:
✅ estimated_value      // number > 0
✅ payer_type           // 'insurance' | 'particular' | 'company' | 'government'
✅ payer_id             // string (UUID)
✅ authorization_code   // string
✅ guide_number         // string (13 dígitos TISS)
✅ attendance_type      // 'consultation' | 'procedure' | 'surgery' | ...
✅ financial_status     // 'pending' | 'provisional' | 'confirmed' | ...
```

---

## 📦 PREPARAR DADOS

### Preparar para envio (não envia)

```typescript
import { prepareAppointmentForBilling } from '@/modules/agenda';

const billingData = await prepareAppointmentForBilling(appointment);

// billingData:
// {
//   appointment_id: string
//   value: number
//   payer_type: PayerType
//   professional_id: string
//   patient_id: string
//   ... 10 campos mais
// }

// ⚠️ IMPORTANTE: Não envia nada no BD ainda!
```

---

## 📋 TISS

### Construir guia TISS (não salva)

```typescript
import { buildTISSData, validateForTISS } from '@/modules/agenda';

// Validar primeiro
const validation = validateForTISS(appointment);
if (!validation.valid) {
  console.log('Erros:', validation.errors);
  return;
}

// Construir
const tissData = await buildTISSData(appointment, clinicData, professionalData);

// tissData:
// {
//   guide_id: string
//   guide_number: string          // 13 dígitos
//   guide_type: 'PS' | 'SP' | 'AH'
//   beneficiary_name: string
//   provider_name: string
//   professional_name: string
//   procedure_code: string        // CBHPM
//   procedure_value: number
//   ... mais campos
// }

// ⚠️ IMPORTANTE: Não salva nada no BD ainda!
```

---

## 📡 EVENTOS

### Escutar eventos de agendamento

```typescript
import { useAppointmentEvents } from '@/modules/agenda';

function EventMonitor() {
  const { events, isListening, eventCount } = useAppointmentEvents(
    [
      'appointment.completed',
      'appointment.cancelled',
      'appointment.checked_in',
    ],
    { enabled: true }  // Ativar escuta
  );

  return (
    <div>
      <p>{isListening ? '🔴 Active' : '⭕ Inactive'}</p>
      <p>Events: {eventCount}</p>
      
      {events.map(evt => (
        <div key={evt.id}>
          <p>{evt.type}</p>
          <p>{evt.timestamp}</p>
          <p>{evt.appointment.id}</p>
        </div>
      ))}
    </div>
  );
}
```

### Disparar evento manualmente

```typescript
import { 
  fireAppointmentStatusEvent,
  createAppointmentEvent,
  appointmentEventBus 
} from '@/modules/agenda';

// Opção 1: Via status change
await fireAppointmentStatusEvent(
  'scheduled',  // Status anterior
  'completed',  // Novo status
  appointment,
  { triggeredBy: 'user' }
);

// Opção 2: Manual
const event = createAppointmentEvent('appointment.completed', appointment);
await appointmentEventBus.fireEvent(event);
```

---

## 🎣 HOOKS (DETALHADOS)

### useAppointmentFinancialValidation

```typescript
const {
  validation,          // FinancialValidationResult | null
  isValidating,        // boolean
  error,              // string | null
  refresh,            // () => Promise<void>
} = useAppointmentFinancialValidation(appointment);
```

### useAppointmentBillingPreparation

```typescript
const {
  billingData,        // AppointmentFinancialEventData | null
  isPreparing,        // boolean
  error,             // string | null
  refresh,           // () => Promise<void>
} = useAppointmentBillingPreparation(appointment);
```

### useAppointmentEvents

```typescript
const {
  events,             // AppointmentEvent[]
  isListening,        // boolean
  eventCount,         // number
  clearEvents,        // () => void
} = useAppointmentEvents(eventTypes, { 
  onEvent: (e) => { },  // Callback
  enabled: true        // Ativar escuta
});
```

### useAppointmentFinancialStatus

```typescript
const {
  status,             // string | null
  isUpdating,         // boolean
  updateStatus,       // (newStatus: string) => Promise<void>
} = useAppointmentFinancialStatus(appointment);
```

### useAppointmentFinancialFields

```typescript
const {
  fields,             // { estimated_value, payer_type, ... }
  updateField,        // (field: string, value: any) => void
  hasChanges,         // boolean
} = useAppointmentFinancialFields(appointment);
```

### useAppointmentFinancial (RECOMENDADO)

```typescript
const {
  // Validação
  validation,         // FinancialValidationResult | null
  isValidating,       // boolean
  validationError,    // string | null
  revalidate,         // () => Promise<void>

  // Billing
  billingData,        // AppointmentFinancialEventData | null
  isPreparing,        // boolean
  billingError,       // string | null
  rePrepare,          // () => Promise<void>

  // Status
  status,             // string | null
  isUpdating,         // boolean
  updateStatus,       // (newStatus: string) => Promise<void>

  // Campos
  fields,             // { estimated_value, payer_type, ... }
  updateField,        // (field: string, value: any) => void
  hasChanges,         // boolean

  // Eventos
  events,             // AppointmentEvent[]

  // Helpers
  isReadyForBilling,  // boolean
  hasErrors,          // boolean
} = useAppointmentFinancial(appointment, {
  autoValidate: true,
  autoPrepareBilling: true,
  listenToEvents: true,
});
```

---

## ⚙️ CONFIGURAÇÃO

### Ver status do sistema

```typescript
import { appointmentEventBus } from '@/modules/agenda';

const status = appointmentEventBus.getStatus();
// {
//   listeners: 1,
//   eventHistory: 42,
//   activeListeners: [{ id, events, priority }]
// }
```

### Gerenciar listeners

```typescript
// Inscrever
const listenerId = appointmentEventBus.subscribe(
  ['appointment.completed', 'appointment.cancelled'],
  async (event) => {
    console.log('Event:', event.type);
  },
  { priority: 10 }
);

// Desinscrever
appointmentEventBus.unsubscribe(listenerId);

// Ativar/Desativar
appointmentEventBus.setEnabled(listenerId, false);
```

---

## 🔄 INICIALIZAÇÃO (main.jsx)

```typescript
import { initializeAppointmentEventSystem } from '@/modules/agenda';

// Na inicialização da app
initializeAppointmentEventSystem();

// ✅ Audit listener ativado
// ❌ Financial/TISS listeners desativados até Phase 4
```

---

## 🎯 ATIVAR INTEGRAÇÃO (PHASE 4)

### Quando Financeiro estiver pronto:

```typescript
import { enableFinancialIntegration } from '@/modules/agenda';
import { createReceivable } from '@/modules/financeiro';

enableFinancialIntegration(async (event) => {
  if (event.type !== 'appointment.completed') return;
  
  const data = await prepareAppointmentForBilling(event.appointment);
  if (data?.is_billable) {
    await createReceivable(data);
  }
});

// ✅ Agora automático!
```

---

## 📚 TIPOS

### AppointmentWithFinancial

```typescript
interface AppointmentWithFinancial extends Appointment {
  // Valores
  estimated_value?: number;
  authorized_value?: number;
  
  // Informações
  payer_type?: PayerType;
  attendance_type?: AttendanceType;
  financial_status?: FinancialStatus;
  
  // Autorização
  authorization_code?: string;
  authorization_status?: AuthorizationStatus;
  authorization_expires_at?: string;
  
  // Guia
  guide_number?: string;
  guide_type?: string;
  
  // Procedimento
  procedure_code?: string;
  procedure_name?: string;
  
  // Metadata
  financial_notes?: string;
  financial_updated_at?: string;
  ar_receivable_id?: string;
}
```

### FinancialStatus

```typescript
type FinancialStatus = 
  | 'pending'       // Aguardando
  | 'provisional'   // Provisório (editável)
  | 'confirmed'     // Confirmado (não editável)
  | 'billed'        // Faturado
  | 'cancelled'     // Cancelado
  | 'rejected';     // Rejeitado
```

### AttendanceType

```typescript
type AttendanceType = 
  | 'consultation'    // Consulta
  | 'procedure'       // Procedimento
  | 'surgery'         // Cirurgia
  | 'therapy'         // Terapia
  | 'exam'            // Exame
  | 'follow_up'       // Retorno
  | 'administration'; // Administrativa
```

### PayerType

```typescript
type PayerType = 
  | 'insurance'   // Convênio
  | 'particular'  // Particular
  | 'company'     // Empresa
  | 'government'; // Público/SUS
```

---

## 📊 CONSTANTES

### Status config

```typescript
import { FINANCIAL_STATUS_CONFIG } from '@/modules/agenda';

const config = FINANCIAL_STATUS_CONFIG['provisional'];
// {
//   label: 'Provisório',
//   description: 'Pode ser editado',
//   icon: '✏️',
//   color: 'blue',
//   canTransitionTo: ['confirmed', 'cancelled'],
//   blockEdit: false,
// }
```

### Payer config

```typescript
import { PAYER_TYPE_CONFIG } from '@/modules/agenda';

const config = PAYER_TYPE_CONFIG['insurance'];
// {
//   label: 'Convênio / Seguro',
//   code: '01',
//   requiresGuide: true,
//   requiresAuthorization: true,
//   requiresCopay: false,
//   taxApplied: 5,
// }
```

### Helper functions

```typescript
import { 
  requiresAuthorizationFor,
  requiresGuideFor,
  canTransitionFinancialStatus 
} from '@/modules/agenda';

requiresAuthorizationFor('insurance');    // true
requiresGuideFor('insurance');            // true
canTransitionFinancialStatus('provisional', 'confirmed');  // true
```

---

## 🐛 DEBUG

### Logs no console

```
📋 [AUDIT] appointment.completed on uuid-123
🔍 [DRY-RUN] Validating appointment uuid-123 for financial
📊 Validation result: ✅ VALID | Billable: ✅ YES
📦 [DRY-RUN] Preparing appointment uuid-123 for billing
✅ Data prepared (NOT SENT): { ... }
⏸️  Financial integration not yet enabled - skipping
```

### Ver histórico

```typescript
const history = appointmentEventBus.getEventHistory(10);
console.table(history.map(e => ({
  type: e.type,
  timestamp: e.timestamp,
  appointmentId: e.appointment.id,
})));
```

---

## 🚨 TROUBLESHOOTING

### Validação retorna false

```typescript
const result = await validateAppointmentForFinancial(appointment);

if (!result.is_valid) {
  console.log('Bloqueios:', result.blocking_errors);
  console.log('Avisos:', result.warnings);
  console.log('Campos faltando:', result.missing_fields);
}
```

### Eventos não estão sendo disparados

```typescript
// Verificar se bus está ativo
const status = appointmentEventBus.getStatus();
console.log('Listeners:', status.listeners);
console.log('Active:', status.activeListeners);

// Verificar se listener está ativo
appointmentEventBus.setEnabled(listenerId, true);
```

### Hook não atualiza

```typescript
const { revalidate, rePrepare } = useAppointmentFinancial(appointment);

// Forçar atualização
await revalidate();
await rePrepare();
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Importar hooks
- [ ] Usar useAppointmentFinancial em componente
- [ ] Exibir validation.errors na UI
- [ ] Exibir billingData preview
- [ ] Monitorar eventos
- [ ] Testes em desenvolvimento
- [ ] Documentação da equipe
- [ ] Code review
- [ ] Deploy staging
- [ ] Teste UAT
- [ ] Deploy production

---

**Última atualização:** Janeiro 2025  
**Status:** ✅ PRONTO PARA USAR  
**Phase:** 3 / 4
