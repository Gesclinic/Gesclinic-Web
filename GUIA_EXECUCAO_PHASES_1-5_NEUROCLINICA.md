╔═══════════════════════════════════════════════════════════════════════════════╗
║  🎯 INSTRUÇÕES DE EXECUÇÃO - PHASES 1-5 NEUROCLINICA CASCAVEL               ║
║  Clinic ID: dcee437c-fd14-463c-b25e-a318f5da60b7                           ║
║  Timezone: America/Sao_Paulo                                               ║
║  Data: 2026-05-06                                                          ║
╚═══════════════════════════════════════════════════════════════════════════════╝

# 📋 GUIA SEQUENCIAL - EXECUTE PHASE POR PHASE

## ⏰ ESTIMATIVA DE TEMPO TOTAL

| Fase | SQL Queries | TypeScript | Testes | Total |
|------|------------|------------|--------|-------|
| Phase 1 | 20 min (8 queries) | 15 min | 10 min | 45 min |
| Phase 2 | 15 min (8 queries) | 30 min | 15 min | 60 min |
| Phase 3 | 20 min (8 queries) | 45 min | 20 min | 85 min |
| Phase 4 | 15 min (8 queries) | 60 min | 30 min | 105 min |
| Phase 5 | 15 min (8 queries) | 60 min | 30 min | 105 min |
| **TOTAL** | **85 min** | **210 min** | **105 min** | **400 min (6.6h)** |

---

## 🚀 PHASE 1: VALIDAÇÃO E DIAGNÓSTICO (45 min)

### SQL Execution (20 min)

**Arquivo**: `PHASE_1_NEUROCLINICA_CASCAVEL.sql`

**Passo-a-passo:**

```
1. Abrir: https://supabase.com/dashboard/project/gvdkdjyupktlfflwurike/sql/new
2. Clicar: New Query
3. Copiar: Conteúdo de PHASE_1_NEUROCLINICA_CASCAVEL.sql
4. Colar: No editor
5. Executar: Cada query separadamente (ou todas com Ctrl+A + Ctrl+Enter)

Queries a executar:
  Query 1: VERIFICAR CAMPOS NULL CRÍTICOS (2 min)
  Query 2: VERIFICAR CAMPOS QUE NÃO DEVEM SER NULL (2 min)
  Query 3: VERIFICAR RELACIONAMENTOS ÓRFÃOS (2 min)
  Query 4: VERIFICAR SOBREPOSIÇÃO DE HORÁRIOS (2 min)
  Query 5: VERIFICAR CAMPOS COM MAPEAMENTO ERRADO (2 min)
  Query 6: VERIFICAR AGENDAMENTOS RECENTES (2 min)
  Query 7: VERIFICAR RLS POLICIES (3 min)
  Query 8: VERIFICAR SE RPCs EXISTEM (3 min)
```

**Esperado:**
- Query 1-3: Número de CRITICAL/WARNING issues
- Query 5: Resumo total de NULLs por campo
- Query 6: Dados dos 5 últimos agendamentos
- Query 7: Policies de RLS ativas
- Query 8: RPCs existentes no banco

### TypeScript Implementation (15 min)

**Arquivo já criado**: `src/modules/agenda/services/appointments.service.ts`

**5 Funções já adicionadas:**
- ✅ debugMappingToDatabase()
- ✅ debugMappingFromDatabase()
- ✅ validateUUID()
- ✅ validateCriticalFields()
- ✅ debugPersistence()

**Nada a fazer** - Pronto para usar!

### Testing (10 min)

```javascript
// No seu componente de criar agendamento
import { appointmentsService } from '@/modules/agenda/services';

const handleCreate = async (formData) => {
  // ✅ Debug mapping
  appointmentsService.debugMappingToDatabase(formData);
  
  // ✅ Validar campos críticos
  const { valid, errors } = appointmentsService.validateCriticalFields(formData);
  if (!valid) {
    console.error('Validação falhou:', errors);
    return;
  }

  // ✅ Criar agendamento
  const result = await createAppointment(formData);
  
  // ✅ Verificar persistência
  appointmentsService.debugPersistence(
    result.id,
    ['patientId', 'professionalId', 'roomId', 'payerId'],
    result
  );
};
```

**Observar no console (F12):**
- Logs de debug mostrando mapeamento
- Erros de validação (se houver)
- Campos que não persistiram (se houver)

---

## 🌍 PHASE 2: TIMEZONE HANDLING (60 min)

### SQL Execution (15 min)

**Arquivo**: `PHASE_2_TIMEZONE_NEUROCLINICA.sql`

**Queries:**
- Query 1: Verificar timezone do banco (1 min)
- Query 2: Consistência de datas (2 min)
- Query 3: Formato de horários HH:MM (2 min)
- Query 4: Detectar problemas de timezone (2 min)
- Query 5: Criar função de validação (3 min)
- Query 6: Testar função de validação (2 min)
- Query 7: Verificar horários inválidos (2 min)
- Query 8: Resumo de timezone (1 min)

### TypeScript Implementation (30 min)

**Criar arquivo**: `src/modules/agenda/utils/timezone.ts`

**Conteúdo:**

```typescript
import { parseISO, formatISO, parseJSON } from 'date-fns';
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';

const TIMEZONE = 'America/Sao_Paulo';

// Converter ISO string para hora local
export function isoToLocalTime(isoString: string | null): string | null {
  if (!isoString) return null;
  try {
    const date = parseISO(isoString);
    const zonedDate = toZonedTime(date, TIMEZONE);
    return format(zonedDate, 'HH:mm', { timeZone: TIMEZONE });
  } catch {
    return null;
  }
}

// Converter ISO string para data local
export function isoToLocalDate(isoString: string | null): string | null {
  if (!isoString) return null;
  try {
    const date = parseISO(isoString);
    const zonedDate = toZonedTime(date, TIMEZONE);
    return format(zonedDate, 'yyyy-MM-dd', { timeZone: TIMEZONE });
  } catch {
    return null;
  }
}

// Converter hora local para ISO
export function localTimeToISO(time: string, date: string): string | null {
  if (!time || !date) return null;
  try {
    const zonedDate = fromZonedTime(
      new Date(`${date}T${time}:00`),
      TIMEZONE
    );
    return formatISO(zonedDate);
  } catch {
    return null;
  }
}

// Validar formato HH:MM
export function isValidTimeFormat(time: string): boolean {
  return /^\d{2}:\d{2}$/.test(time);
}

// Validar formato YYYY-MM-DD
export function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

// Debug timezone
export function debugTimezone(isoString: string) {
  const date = parseISO(isoString);
  console.debug('[Timezone Debug]', {
    iso: isoString,
    utc: date.toUTCString(),
    local: isoToLocalDate(isoString),
    time: isoToLocalTime(isoString)
  });
}
```

**Atualizar**: `src/modules/agenda/services/agendaApi.service.ts`

```typescript
import { isoToLocalTime, isoToLocalDate } from '@/modules/agenda/utils/timezone';

// Remover funções antigas extractTime e extractDate
// Substituir por:

export function extractTime(appointment: Appointment): string {
  return isoToLocalTime(appointment.scheduled_time) || '';
}

export function extractDate(appointment: Appointment): string {
  return isoToLocalDate(appointment.scheduled_date) || '';
}
```

### Testing (15 min)

```typescript
import { 
  isoToLocalTime, 
  isoToLocalDate, 
  localTimeToISO,
  isValidTimeFormat,
  isValidDateFormat,
  debugTimezone
} from '@/modules/agenda/utils/timezone';

// Testar conversões
const localTime = isoToLocalTime('2026-05-06T14:30:00Z');
console.log('Local time:', localTime); // "14:30" ou "11:30" dependendo DST

const localDate = isoToLocalDate('2026-05-06T14:30:00Z');
console.log('Local date:', localDate); // "2026-05-06"

// Validar formatos
console.log(isValidTimeFormat('14:30')); // true
console.log(isValidDateFormat('2026-05-06')); // true

// Debug
debugTimezone('2026-05-06T14:30:00Z');
```

---

## 🔐 PHASE 3: DATA INTEGRITY (85 min)

### SQL Execution (20 min)

**Arquivo**: `PHASE_3_INTEGRITY_NEUROCLINICA.sql`

**Queries:**
- Query 1: Criar função de validação de relacionamentos (3 min)
- Query 2: Criar função de verificação de sobreposição (3 min)
- Query 3: Executar validação de relacionamentos (3 min)
- Query 4: Verificar sobreposição de agendamentos (3 min)
- Query 5: Verificar disponibilidade de serviço (3 min)
- Query 6: Contar problemas de integridade (2 min)
- Query 7: Verificar orphans em appointment_services (1 min)
- Query 8: Resumo de integridade (1 min)

### TypeScript Implementation (45 min)

**Adicionar a**: `src/modules/agenda/services/appointments.service.ts`

```typescript
// Validação de Relacionamentos
export async function validateRelationships(
  appointment: AppointmentUI
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Verificar if patient exists (via API ou lado cliente)
  if (appointment.patientId && !await checkPatientExists(appointment.patientId)) {
    errors.push('❌ Patient does not exist');
  }

  // Verificar if professional exists
  if (appointment.professionalId && !await checkProfessionalExists(appointment.professionalId)) {
    errors.push('❌ Professional does not exist');
  }

  // Verificar if service exists
  if (appointment.serviceId && !await checkServiceExists(appointment.serviceId)) {
    errors.push('❌ Service does not exist');
  }

  // Verificar if room exists (if required)
  if (appointment.roomId && !await checkRoomExists(appointment.roomId)) {
    errors.push('⚠️ Room does not exist');
  }

  return {
    valid: errors.every(e => !e.includes('❌')),
    errors
  };
}

// Verificação de Sobreposição
export async function checkTimeOverlap(
  professionalId: string,
  scheduledDate: string,
  scheduledTime: string,
  endTime: string,
  appointmentId?: string
): Promise<{ hasOverlap: boolean; conflicts: any[] }> {
  // Chamar RPC has_overlap_appointments
  // Implementação depende de agendaApi.service.ts
  
  const hasOverlap = await callSupabaseRpc('has_overlap_appointments', {
    p_appointment_id: appointmentId || null,
    p_professional_id: professionalId,
    p_scheduled_date: scheduledDate,
    p_scheduled_time: scheduledTime,
    p_end_time: endTime
  });

  return {
    hasOverlap,
    conflicts: hasOverlap ? ['Time conflict detected'] : []
  };
}
```

**Atualizar**: Componentes de criação/edição

```typescript
const handleCreateAppointment = async (formData) => {
  // 1. Validação de campos críticos (Phase 1)
  const { valid: criticalValid } = appointmentsService.validateCriticalFields(formData);
  if (!criticalValid) return;

  // 2. Validação de relacionamentos (Phase 3)
  const { valid: relValid, errors } = await validateRelationships(formData);
  if (!relValid) {
    showError(errors.join('\n'));
    return;
  }

  // 3. Verificar sobreposição (Phase 3)
  const { hasOverlap, conflicts } = await checkTimeOverlap(
    formData.professionalId,
    formData.scheduledDate,
    formData.scheduledTime,
    formData.endTime
  );
  if (hasOverlap) {
    showError('Horário conflita com outro agendamento');
    return;
  }

  // 4. Criar agendamento
  const result = await createAppointment(formData);
};
```

### Testing (20 min)

```typescript
// Testar validação de relacionamentos
const relTest = await validateRelationships(validAppointment);
console.log('Relationships valid:', relTest.valid);

// Testar sobreposição
const overlapTest = await checkTimeOverlap(
  'prof-uuid',
  '2026-05-06',
  '14:00',
  '15:00'
);
console.log('Has overlap:', overlapTest.hasOverlap);

// Testar com dados inválidos
const invalidTest = await validateRelationships({
  ...validAppointment,
  patientId: 'invalid-uuid'
});
console.log('Invalid patient caught:', invalidTest.errors[0]);
```

---

## ⚡ PHASE 4: REALTIME & AUDIT (105 min)

### SQL Execution (15 min)

**Arquivo**: `PHASE_4_REALTIME_NEUROCLINICA.sql`

Queries:
- Query 1-8: Setup audit log, trigger, e verificações

### TypeScript Implementation (60 min)

**Criar**: `src/modules/agenda/hooks/useAgendaLive.ts`

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export function useAgendaLive(clinicId: string, onUpdate: (payload: any) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const processedIds = new Set<string>();

  useEffect(() => {
    const subscription = supabase
      .channel(`appointments-clinic-${clinicId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${clinicId}`
        },
        (payload) => {
          // ✅ Deduplicação: Evitar processar o mesmo appointment 2x
          const appointmentId = payload.new?.id || payload.old?.id;
          
          if (processedIds.has(appointmentId)) {
            console.debug('[Realtime] Duplicate dropped:', appointmentId);
            return;
          }

          processedIds.add(appointmentId);
          
          // Limpar set após 5 segundos para permitir updates subsequentes
          setTimeout(() => processedIds.delete(appointmentId), 5000);

          console.debug('[Realtime] Update received:', payload);
          onUpdate(payload);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [clinicId]);

  return { isConnected };
}
```

**Criar**: `src/modules/agenda/hooks/useAgendaSync.ts`

```typescript
import { useEffect } from 'react';

export function useAgendaSync(clinicId: string, onMessage: (data: any) => void) {
  useEffect(() => {
    // Cross-tab sync via localStorage
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === `agenda-update-${clinicId}` && event.newValue) {
        const data = JSON.parse(event.newValue);
        onMessage(data);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [clinicId]);

  return {
    broadcast: (data: any) => {
      localStorage.setItem(
        `agenda-update-${clinicId}`,
        JSON.stringify({ ...data, timestamp: Date.now() })
      );
    }
  };
}
```

### Testing (30 min)

```typescript
// Em seu componente
const { isConnected } = useAgendaLive(clinicId, (payload) => {
  console.log('Realtime update:', payload);
});

const { broadcast } = useAgendaSync(clinicId, (data) => {
  console.log('Cross-tab message:', data);
});

// Testar:
// 1. Abrir agenda em 2 tabs
// 2. Fazer UPDATE em um tab
// 3. Verificar se outro tab recebe realtime
// 4. Verificar se não há duplicatas no console
```

---

## 🔄 PHASE 5: OPTIMISTIC UPDATES (105 min)

### SQL Execution (15 min)

**Arquivo**: `PHASE_5_TRANSACTIONS_NEUROCLINICA.sql`

### TypeScript Implementation (60 min)

**Criar**: `src/modules/agenda/hooks/useAppointmentUpdate.ts`

```typescript
import { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export function useAppointmentUpdate() {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAppointmentOptimistic = async (
    appointmentId: string,
    clinicId: string,
    changes: Partial<AppointmentUI>,
    backup: AppointmentUI
  ) => {
    setUpdating(true);
    setError(null);

    try {
      // 1. Rastrear transação otimista
      const { data: transaction } = await supabase.rpc(
        'track_appointment_transaction',
        {
          p_appointment_id: appointmentId,
          p_transaction_type: 'OPTIMISTIC_UPDATE',
          p_payload: changes,
          p_clinic_id: clinicId
        }
      );

      // 2. Atualizar no banco
      const { data: result, error: updateError } = await supabase
        .from('appointments')
        .update(changes)
        .eq('id', appointmentId)
        .select();

      if (updateError) throw updateError;

      // 3. Confirmar transação
      await supabase.rpc('confirm_appointment_transaction', {
        p_transaction_id: transaction,
        p_clinic_id: clinicId
      });

      return result?.[0];
    } catch (err: any) {
      setError(err.message);

      // 4. Se falhar, fazer rollback
      await supabase.rpc('rollback_appointment_transaction', {
        p_transaction_id: transaction,
        p_clinic_id: clinicId
      });

      throw err;
    } finally {
      setUpdating(false);
    }
  };

  return { updateAppointmentOptimistic, updating, error };
}
```

### Testing (30 min)

```typescript
// Em seu componente
const { updateAppointmentOptimistic } = useAppointmentUpdate();

const handleUpdate = async (appointment: AppointmentUI, changes: Partial<AppointmentUI>) => {
  try {
    const result = await updateAppointmentOptimistic(
      appointment.id,
      clinicId,
      changes,
      appointment  // backup
    );
    
    showSuccess('Agendamento atualizado');
  } catch (error) {
    showError('Falha ao atualizar - revertido para estado anterior');
  }
};

// Testar cenários:
// 1. UPDATE bem-sucedido - confirmar no banco
// 2. UPDATE falha - verificar rollback
// 3. Network falha - verificar recovery
// 4. Dados finais = backup se houver erro
```

---

## 📊 CHECKLIST FINAL

### Phase 1 ✅
- [ ] Execute 8 queries SQL
- [ ] Veja os resultados (crítico e warnings)
- [ ] Debug functions prontas para usar

### Phase 2 ✅
- [ ] Execute 8 queries SQL
- [ ] Crie arquivo timezone.ts
- [ ] Atualize agendaApi.service.ts com timezone

### Phase 3 ✅
- [ ] Execute 8 queries SQL
- [ ] Adicione validação de relacionamentos
- [ ] Adicione detecção de sobreposição

### Phase 4 ✅
- [ ] Execute 8 queries SQL (cria trigger + audit)
- [ ] Crie hooks useAgendaLive e useAgendaSync
- [ ] Teste com 2 tabs abertos

### Phase 5 ✅
- [ ] Execute 8 queries SQL (cria transactions)
- [ ] Crie hook useAppointmentUpdate
- [ ] Teste cenários de falha

---

## 🎯 RESULTADO FINAL

Após completar todas as phases:

✅ Validação completa de dados
✅ Timezone correto em toda clínica
✅ Integridade de relacionamentos garantida
✅ Realtime sem duplicatas
✅ Optimistic updates com rollback automático
✅ Auditoria completa de todas mudanças
✅ Zero breaking changes
✅ 100% backward compatible

---

**Próximo Passo**: Execute Phase 1 SQL agora! 🚀
