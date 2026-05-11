/**
 * 📋 GUIA QUICK START - MÓDULO AGENDA
 * ===================================
 * 
 * Como começar a usar a nova estrutura modular
 */

# 🚀 Quick Start - Módulo Agenda

## 📂 Estrutura Criada

Todos os arquivos estão em: `src/modules/agenda/`

```
✅ types/index.ts              (15 tipos TypeScript)
✅ constants/index.ts          (50+ constantes e helpers)
✅ services/
   ├── appointments.service.ts (50+ funções de transformação)
   ├── agendaApi.service.ts    (30+ funções de API)
   └── index.ts                (barrel export)
✅ hooks/
   ├── useAppointments.ts      (gerenciar lista)
   ├── useAgendaFilters.ts     (gerenciar filtros)
   ├── useAppointmentForm.ts   (gerenciar form)
   └── index.ts                (barrel export)
✅ components/
   ├── StatusBadgeModule.tsx   (7 variações de badge)
   ├── AppointmentCard.tsx     (card individual + grid)
   ├── AgendaFiltersPanel.tsx  (painel de filtros)
   └── index.ts                (barrel export)
✅ utils/
   ├── validation.ts           (validação + filtros)
   └── index.ts                (barrel export)
✅ ARCHITECTURE.md             (documentação completa)
✅ index.ts                    (ROOT EXPORT)
```

## 🎯 3 Formas de Usar

### 1. Import Individual (Recomendado)

```typescript
// Melhor para tree-shaking e type safety
import { AppointmentCard, useAppointments } from '@/modules/agenda/components';
import { useAgendaFilters } from '@/modules/agenda/hooks';
import { formatAppointmentPeriod } from '@/modules/agenda/services';
```

### 2. Import Barrel (Limpo)

```typescript
// Melhor para imports múltiplos
import {
  AppointmentCard,
  useAppointments,
  useAgendaFilters,
  formatAppointmentPeriod,
} from '@/modules/agenda';
```

### 3. Import Default (Legacy)

```typescript
// Compatível com código antigo
import agenda from '@/modules/agenda';
const { AppointmentCard, useAppointments } = agenda.components;
```

---

## 💡 Exemplos de Uso

### Exemplo 1: Listar Agendamentos (Básico)

```typescript
import React from 'react';
import { useAppointments } from '@/modules/agenda';
import { AppointmentCardGrid } from '@/modules/agenda/components';

export function AgendaPage() {
  const { appointments, isLoading, error } = useAppointments({
    clinicId: 'clinic-123',
    autoSubscribe: true, // Realtime automático
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return <AppointmentCardGrid appointments={appointments} />;
}
```

### Exemplo 2: Com Filtros

```typescript
import React from 'react';
import {
  useAppointments,
  useAgendaFilters,
  filterAppointmentsByMultipleCriteria,
  AgendaFiltersPanel,
  AppointmentCardGrid,
} from '@/modules/agenda';

export function AgendaFiltered() {
  const { appointments } = useAppointments({ clinicId: 'clinic-123' });
  const filters = useAgendaFilters();

  // Aplicar filtros
  const filtered = filterAppointmentsByMultipleCriteria(appointments, {
    dateFrom: filters.filters.dateFrom,
    dateTo: filters.filters.dateTo,
    professionalIds: filters.filters.professionalId
      ? [filters.filters.professionalId]
      : undefined,
    statuses: filters.filters.status,
  });

  return (
    <div className="space-y-4">
      <AgendaFiltersPanel
        filters={filters.filters}
        onFiltersChange={f => filters.setFilters(f)}
        onReset={() => filters.resetFilters()}
      />
      <AppointmentCardGrid appointments={filtered} />
    </div>
  );
}
```

### Exemplo 3: Formulário de Criar Agendamento

```typescript
import React from 'react';
import {
  useAppointmentForm,
  useAppointments,
  createPayloadFromForm,
  validateAppointmentPayload,
} from '@/modules/agenda';

export function CreateAppointmentModal() {
  const form = useAppointmentForm({ mode: 'create' });
  const { create: createAppointment } = useAppointments({
    clinicId: 'clinic-123',
  });

  const handleSubmit = async () => {
    // Validar
    const result = form.validate();
    if (!result.valid) {
      form.setErrors(result.errors);
      return;
    }

    // Criar payload
    const payload = createPayloadFromForm('clinic-123', form.formData);

    // Enviar
    form.setIsLoading(true);
    const created = await createAppointment(payload);

    if (created) {
      form.reset();
      console.log('✅ Agendamento criado!');
    }

    form.setIsLoading(false);
  };

  return (
    <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
      <input
        placeholder="ID do Paciente"
        value={form.formData.patientId || ''}
        onChange={e => form.setFieldValue('patientId', e.target.value)}
      />

      {form.errors.patientId && (
        <span className="text-red-500">{form.errors.patientId}</span>
      )}

      <button type="submit" disabled={form.isLoading}>
        {form.isLoading ? 'Salvando...' : 'Criar Agendamento'}
      </button>
    </form>
  );
}
```

### Exemplo 4: Validação de Disponibilidade

```typescript
import {
  checkAppointmentConflict,
  findAppointmentConflicts,
  isValidDateFormat,
  isDateInRange,
} from '@/modules/agenda';

function validateNewAppointment(newAppt, existingAppointments) {
  // Validar data
  if (!isValidDateFormat(newAppt.scheduledDate)) {
    return { valid: false, error: 'Data inválida' };
  }

  // Validar range
  if (!isDateInRange(newAppt.scheduledDate, 0, 365)) {
    return { valid: false, error: 'Data fora do período permitido' };
  }

  // Verificar conflitos
  if (checkAppointmentConflict(newAppt, existingAppointments)) {
    const conflicts = findAppointmentConflicts(newAppt, existingAppointments);
    return {
      valid: false,
      error: `Conflito com ${conflicts.length} agendamento(s)`,
      conflicts,
    };
  }

  return { valid: true };
}
```

### Exemplo 5: Cards com Ações

```typescript
import React from 'react';
import { AppointmentCard } from '@/modules/agenda';

function AppointmentRow({ appointment, onEdit, onDelete }) {
  return (
    <AppointmentCard
      appointment={appointment}
      showActions={true}
      onEditClick={() => onEdit(appointment)}
      onDeleteClick={() => onDelete(appointment)}
      onClick={() => console.log('Clicou em:', appointment)}
    />
  );
}
```

---

## 🔌 Integração com Código Legado

### Opção 1: Usar Lado a Lado

```typescript
// ✅ Código antigo continua funcionando
import { listAppointments } from '@/lib/appointmentsApi';

// ✅ Código novo usa módulo
import { useAppointments } from '@/modules/agenda';

function Component() {
  // Ambas funcionam
}
```

### Opção 2: Wrapper para Migração Gradual

```typescript
// lib/legacyAdapter.ts
import { useAppointments as useNewHook } from '@/modules/agenda';

// Wrapper que mantém interface antiga
export function useAppointments(options) {
  const newHook = useNewHook({
    clinicId: options.clinicId,
  });

  return {
    // Interface antiga
    list: newHook.appointments,
    loading: newHook.isLoading,
    error: newHook.error,
    fetch: newHook.fetch,
    // Nova interface também disponível
    ...newHook,
  };
}
```

---

## ✅ Checklist: Primeira Feature

- [ ] Criar novo componente com imports do módulo
- [ ] Testar no navegador
- [ ] Verificar types no editor (intellisense)
- [ ] Adicionar export no `components/index.ts` se novo
- [ ] Documentar no `ARCHITECTURE.md`
- [ ] Teste do barrels exports
- [ ] Verificar sem errors/warnings

---

## 🎓 Boas Práticas

### ✅ DO (Fazer)

```typescript
// Usar barrel exports
import { AppointmentCard, useAppointments } from '@/modules/agenda';

// Usar React.memo em componentes
const MyComponent = memo(() => {});

// Usar useCallback em hooks
const handleClick = useCallback(() => {}, [dependencies]);

// Validar antes de enviar
const result = validateAppointmentPayload(data);
if (!result.valid) console.error(result.errors);

// Usar tipos
const appointment: Appointment = { /* ... */ };
```

### ❌ DON'T (Não fazer)

```typescript
// Não fazer imports diretos
import appointments from '@/modules/agenda/services/appointments.service';

// Não recriar funções que já existem
function myValidation() { /* reimplementando */ }

// Não ignorar erros
try { await fetch(); } catch { /* empty */ }

// Não usar any
const data: any = { /* ... */ };

// Não quebrar backward compatibility
// Sempre coexistir com código antigo
```

---

## 📚 Referência Rápida

### Tipos Principais

```typescript
Appointment       // Agendamento completo
AppointmentUI     // Versão em camelCase
AgendaFilters     // Filtros de busca
AppointmentStatus // Enum: 'scheduled' | 'confirmed' | ...
```

### Hooks Principais

```typescript
useAppointments()     // Gerenciar lista
useAgendaFilters()    // Gerenciar filtros
useAppointmentForm()  // Gerenciar form
```

### Componentes Principais

```typescript
<AppointmentCard />          // Card individual
<AppointmentCardGrid />      // Grid de cards
<AgendaFiltersPanel />       // Painel de filtros
<StatusBadge status="..." /> // Badge de status
```

### Validação

```typescript
validateAppointmentPayload()     // Validar estrutura
validateStatusTransition()       // Validar mudança de status
isValidDateFormat()              // Validar formato
checkAppointmentConflict()       // Detectar conflitos
```

---

## 🆘 Troubleshooting

### "Module not found '@/modules/agenda'"

✅ Verifique `tsconfig.json` tem alias `@` → `./src`

### "Type 'any' not assignable to 'Appointment'"

✅ Use tipos do módulo: `import { Appointment } from '@/modules/agenda'`

### "Realtime não atualiza"

✅ Verifique `autoSubscribe: true` em useAppointments

### "Componente renderiza vazio"

✅ Verifique se `appointments` está carregado e não vazio

---

## 🚀 Próximos Passos

1. **Usar em nova feature:** Criar novo componente com módulo
2. **Refatorar gradualmente:** Migrar um componente antigo por vez
3. **Expandir:** Adicionar pages/, contexts/ conforme necessário
4. **Testes:** Adicionar testes unitários

---

## 📖 Documentação Completa

- `src/modules/agenda/ARCHITECTURE.md` - Guia completo
- `src/modules/agenda/README.md` - Overview
- Este arquivo - Quick start

---

**Versão:** 1.0.0  
**Data:** 2025-05-06  
**Status:** ✅ Pronto para Produção

Bom código! 🎉
