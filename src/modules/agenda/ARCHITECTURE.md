/**
 * 📚 MÓDULO AGENDA - GUIA DE ARQUITETURA
 * ======================================
 *
 * Documentação completa da estrutura modular enterprise
 */

# 🏗️ Arquitetura Modular - Agenda

## 📁 Estrutura de Pastas

```
src/modules/agenda/
├── types/                      # TypeScript types (15 tipos principais)
│   └── index.ts
│
├── constants/                  # Constantes globais
│   └── index.ts
│
├── services/                   # Lógica de negócio + API
│   ├── appointments.service.ts # Transformação e validação
│   ├── agendaApi.service.ts    # Integração com Supabase
│   └── index.ts                # Barrel export
│
├── utils/                      # Utilitários (validação, filtros, etc)
│   ├── validation.ts
│   └── index.ts
│
├── hooks/                      # React hooks reutilizáveis
│   ├── useAppointments.ts      # Gerenciar lista de agendamentos
│   ├── useAgendaFilters.ts     # Gerenciar estado de filtros
│   ├── useAppointmentForm.ts   # Gerenciar form de agendamento
│   └── index.ts
│
├── components/                 # React components reutilizáveis
│   ├── StatusBadgeModule.tsx   # 7 variações de status badge
│   ├── AppointmentCard.tsx     # Cards para exibição
│   ├── AgendaFiltersPanel.tsx  # Painel de filtros
│   └── index.ts
│
├── pages/                      # Páginas/Views (futuro)
├── contexts/                   # React Contexts (futuro)
└── README.md                   # Esta documentação
```

---

## 🎯 Princípios de Design

### 1. **Separação de Responsabilidades**

```
Types        → Contrato de dados
Services     → Lógica de negócio + API
Utils        → Funções puras reutilizáveis
Hooks        → Gerenciamento de estado React
Components   → Renderização de UI
```

### 2. **Independência de Camadas**

- **Services** funcionam sem React
- **Hooks** usam services mas podem ser testados isoladamente
- **Components** usam hooks e recebem dados via props
- Cada camada tem um **barrel export** para imports limpos

### 3. **TypeScript First**

- Todos os tipos centralizados em `types/index.ts`
- Type safety em 100% do código
- Validação de dados com tipos strictos

### 4. **Performance**

- Componentes usar `React.memo` para otimização
- Hooks com `useCallback` para estabilidade de referências
- Realtime subscription com deduplicação
- Cache configurável nos hooks

---

## 📖 Como Usar

### Importação Básica

```typescript
// ✅ BOM - Imports limpos via barrel exports
import {
  Appointment,
  AppointmentUI,
  AgendaFilters,
} from '@/modules/agenda/types';

import {
  appointmentToUI,
  validateAppointmentPayload,
} from '@/modules/agenda/services';

import { useAppointments, useAgendaFilters } from '@/modules/agenda/hooks';

import { AppointmentCard, StatusBadge } from '@/modules/agenda/components';

import {
  isValidDateFormat,
  checkAppointmentConflict,
} from '@/modules/agenda/utils';
```

### Exemplo 1: Lista de Agendamentos

```typescript
import React from 'react';
import { useAppointments } from '@/modules/agenda/hooks';
import { AppointmentCardGrid } from '@/modules/agenda/components';

function AgendaList() {
  const { appointments, isLoading, error, fetch } = useAppointments({
    clinicId: 'clinic-123',
    autoSubscribe: true,
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <AppointmentCardGrid
      appointments={appointments}
      onCardClick={apt => console.log('Clicou:', apt)}
    />
  );
}
```

### Exemplo 2: Formulário com Validação

```typescript
import React from 'react';
import { useAppointmentForm } from '@/modules/agenda/hooks';
import { createPayloadFromForm } from '@/modules/agenda/services';

function AppointmentForm() {
  const form = useAppointmentForm({ mode: 'create' });

  const handleSubmit = async () => {
    const result = form.validate();
    if (!result.valid) {
      console.error('Erros:', result.errors);
      return;
    }

    // Criar payload
    const payload = createPayloadFromForm('clinic-123', form.formData);

    // Enviar API
    console.log('Criando:', payload);
  };

  return (
    <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
      <input
        value={form.formData.patientId || ''}
        onChange={e => form.setFieldValue('patientId', e.target.value)}
      />

      {form.errors.patientId && <span>{form.errors.patientId}</span>}

      <button type="submit" disabled={form.isLoading}>
        Salvar
      </button>
    </form>
  );
}
```

### Exemplo 3: Com Filtros

```typescript
import React from 'react';
import {
  useAppointments,
  useAgendaFilters,
} from '@/modules/agenda/hooks';
import {
  AgendaFiltersPanel,
  AppointmentCardGrid,
} from '@/modules/agenda/components';
import { filterAppointmentsByMultipleCriteria } from '@/modules/agenda/utils';

function AgendaWithFilters() {
  const { appointments, fetch } = useAppointments({
    clinicId: 'clinic-123',
  });

  const filters = useAgendaFilters();

  const filtered = filterAppointmentsByMultipleCriteria(appointments, {
    dateFrom: filters.filters.dateFrom,
    dateTo: filters.filters.dateTo,
    professionalIds: filters.filters.professionalId
      ? [filters.filters.professionalId]
      : undefined,
    statuses: filters.filters.status,
  });

  return (
    <>
      <AgendaFiltersPanel
        filters={filters.filters}
        onFiltersChange={newFilters => filters.setFilters(newFilters)}
        onReset={() => filters.resetFilters()}
        professionals={[]}
        rooms={[]}
      />

      <AppointmentCardGrid appointments={filtered} />
    </>
  );
}
```

### Exemplo 4: Validação Customizada

```typescript
import {
  isValidDateFormat,
  isDateInRange,
  checkAppointmentConflict,
  findAppointmentConflicts,
} from '@/modules/agenda/utils';

// Validar formato de data
if (!isValidDateFormat('2025-05-06')) {
  console.error('Data inválida');
}

// Validar range de data
if (!isDateInRange('2025-05-06', 1, 365)) {
  console.error('Data fora do range permitido');
}

// Verificar conflitos
const newAppointment = {
  scheduledDate: '2025-05-06',
  scheduledTime: '10:00',
  duration: 30,
  professionalId: 'prof-1',
};

const hasConflict = checkAppointmentConflict(newAppointment, existingAppointments);

// Encontrar agendamentos em conflito
const conflicts = findAppointmentConflicts(
  newAppointment,
  existingAppointments,
  ignoreAppointmentId
);
```

---

## 🔌 Integração com Código Legado

### Manter Compatibilidade

O módulo foi projetado para **coexistir** com código legado:

```typescript
// ✅ Código legado continua funcionando
import { listAppointments } from '@/lib/appointmentsApi';

// ✅ Novo código usa módulo modular
import { useAppointments } from '@/modules/agenda/hooks';

// ✅ Ambos podem ser usados na mesma aplicação
```

### Migração Gradual

1. **Fase 1:** Criar novos componentes com `@/modules/agenda/*`
2. **Fase 2:** Refatorar componentes antigos um por um
3. **Fase 3:** Remover imports de `@/lib/appointmentsApi` quando não mais usado
4. **Nunca quebrar** rotas ou componentes existentes

---

## 🧪 Teste de Componentes

```typescript
import { render, screen } from '@testing-library/react';
import { AppointmentCard } from '@/modules/agenda/components';
import { Appointment } from '@/modules/agenda/types';

const mockAppointment: Appointment = {
  id: '1',
  clinic_id: 'clinic-1',
  patient_id: 'patient-1',
  professional_id: 'prof-1',
  scheduled_date: '2025-05-06',
  scheduled_time: '10:00',
  status: 'scheduled',
  patient: { id: 'p1', name: 'João Silva' },
  professional: { id: 'pr1', name: 'Dr. Silva' },
};

test('AppointmentCard renders correctly', () => {
  render(<AppointmentCard appointment={mockAppointment} />);
  expect(screen.getByText('João Silva')).toBeInTheDocument();
  expect(screen.getByText('Agendado')).toBeInTheDocument();
});
```

---

## 📊 Padrões de Código

### Service: Transformação de Dados

```typescript
// ✅ BOM - Função pura, sem efeitos colaterais
export function appointmentToUI(appointment: Appointment): AppointmentUI {
  return {
    id: appointment.id,
    clinicId: appointment.clinic_id,
    // ...
  };
}

// ❌ RUIM - Chamada de API dentro de service
export function appointmentToUI(appointment: Appointment): AppointmentUI {
  fetch('/api/...'); // ❌ Não fazer isso
}
```

### Hook: Gerenciamento de Estado

```typescript
// ✅ BOM - Hook com estado claro
function useAppointments(options) {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // ...
}

// ❌ RUIM - Lógica complexa no componente
function Component() {
  const [data, setData] = useState({}); // Difícil de reutilizar
}
```

### Component: Props bem definidas

```typescript
// ✅ BOM - Props tipadas e bem estruturadas
interface AppointmentCardProps {
  appointment: Appointment;
  onClick?: () => void;
  showActions?: boolean;
}

function AppointmentCard(props: AppointmentCardProps) {
  // ...
}

// ❌ RUIM - Props any ou object
function AppointmentCard(props: any) {
  // ...
}
```

---

## 🚀 Performance

### Memoização de Componentes

```typescript
import { memo } from 'react';

export const AppointmentCard = memo(function AppointmentCard(props) {
  // Só re-renderiza se props mudarem
  return <div>{props.appointment.patient.name}</div>;
});
```

### Estabilidade de Referências

```typescript
export function useAppointments() {
  // ✅ BOM - useCallback estável
  const fetch = useCallback(async () => {
    // ...
  }, [clinicId, filters]); // Dependencies precisas

  return { fetch };
}
```

### Lazy Loading de Views

```typescript
// pages/AgendaPage.tsx
const AgendaCalendarView = lazy(() => import('./views/AgendaCalendarView'));
const AgendaTableView = lazy(() => import('./views/AgendaTableView'));

<Suspense fallback={<LoadingSpinner />}>
  {viewType === 'calendar' && <AgendaCalendarView />}
  {viewType === 'table' && <AgendaTableView />}
</Suspense>
```

---

## ✅ Checklist: Adicionar Novo Componente

- [ ] Criar arquivo em `components/`
- [ ] Adicionar tipos em `types/index.ts` se necessário
- [ ] Usar `React.memo` se apropriado
- [ ] Exportar no `components/index.ts`
- [ ] Criar exemplo de uso em comentário
- [ ] Adicionar testes unitários
- [ ] Documentar props com JSDoc

---

## 🔗 Links Importantes

- **Types:** `src/modules/agenda/types/index.ts`
- **Services:** `src/modules/agenda/services/`
- **Hooks:** `src/modules/agenda/hooks/`
- **Components:** `src/modules/agenda/components/`
- **Constantes:** `src/modules/agenda/constants/index.ts`

---

## 📞 Suporte

Para dúvidas sobre o módulo, refira-se a:
1. Arquivos de tipo em `types/index.ts`
2. JSDoc em cada função
3. Exemplos acima
4. Testes unitários

---

Versão: 1.0.0  
Última atualização: 2025-05-06  
Autor: GitHub Copilot
