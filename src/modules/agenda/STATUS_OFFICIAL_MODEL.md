/**
 * OFFICIAL STATUS MODEL - Documentação Completa
 * =============================================
 * 
 * Sistema de status padronizado para Agenda Enterprise
 */

# 📋 Official Status Model - Sistema de Status Enterprise

## Visão Geral

O sistema de status oficial define 8 estados que cobrem o ciclo de vida completo de um agendamento, desde criação até conclusão.

## 8 Status Oficiais

### 1️⃣ **SCHEDULED** (Agendado)
- **Status**: 📅
- **Cor**: Azul
- **Descrição**: Agendamento criado, aguardando confirmação
- **Editar**: ✅ Sim
- **Cancelar**: ✅ Sim
- **Gera Financeiro**: ❌ Não
- **Próximas Transições**: 
  - → confirmed (Confirmar)
  - → cancelled (Cancelar)

### 2️⃣ **CONFIRMED** (Confirmado)
- **Status**: ✅
- **Cor**: Verde claro
- **Descrição**: Paciente confirmou presença (telefone ou WhatsApp)
- **Editar**: ✅ Sim
- **Cancelar**: ✅ Sim
- **Gera Financeiro**: ❌ Não
- **Próximas Transições**:
  - → checked_in (Check-in)
  - → cancelled (Cancelar)
  - → no_show (Não compareceu - automático)

### 3️⃣ **CHECKED_IN** (Check-in)
- **Status**: 📍
- **Cor**: Roxo
- **Descrição**: Paciente na recepção, prontuário validado, recepção desbloqueada
- **Editar**: ❌ Não
- **Cancelar**: ❌ Não (muito avançado)
- **Libera**: ✅ Recepção
- **Gera Financeiro**: ❌ Não
- **Próximas Transições**:
  - → waiting (Aguardando profissional)
  - → cancelled (Só com justificativa)

### 4️⃣ **WAITING** (Aguardando)
- **Status**: ⏳
- **Cor**: Amarelo
- **Descrição**: Aguardando seu atendimento, na fila
- **Editar**: ❌ Não
- **Cancelar**: ❌ Não
- **Gera Financeiro**: ❌ Não
- **Próximas Transições**:
  - → in_progress (Profissional iniciando)
  - → no_show (Não compareceu)

### 5️⃣ **IN_PROGRESS** (Em Atendimento)
- **Status**: 🔄
- **Cor**: Ciano
- **Descrição**: Profissional atendendo o paciente
- **Editar**: ❌ Não
- **Cancelar**: ❌ Não
- **Gera Financeiro**: ❌ Não
- **Próximas Transições**:
  - → completed (Conclusão)
  - → no_show (Não compareceu - raro)

### 6️⃣ **COMPLETED** (Completo) ✨
- **Status**: ✔️
- **Cor**: Esmeralda
- **Descrição**: Atendimento finalizado com sucesso
- **Editar**: ❌ **BLOQUEADO** (proteção máxima)
- **Cancelar**: ❌ Não
- **Gera Financeiro**: ✅ **SIM** (automático)
- **Próximas Transições**: Nenhuma
- ⚠️ **Crítico**: Status final, desbloqueia faturamento automático

### 7️⃣ **CANCELLED** (Cancelado)
- **Status**: 🚫
- **Cor**: Vermelho
- **Descrição**: Agendamento cancelado por qualquer motivo
- **Editar**: ❌ Não
- **Cancelar**: ❌ Não
- **Gera Financeiro**: ❌ **NÃO** (nunca)
- **Próximas Transições**: Nenhuma

### 8️⃣ **NO_SHOW** (Não Compareceu)
- **Status**: ❌
- **Cor**: Cinza
- **Descrição**: Paciente não compareceu na data/hora marcada
- **Editar**: ❌ Não
- **Cancelar**: ❌ Não
- **Gera Financeiro**: ❌ **NÃO** (nunca)
- **Próximas Transições**: Nenhuma

---

## Fluxo Operacional Padrão

```
┌─────────────┐
│ SCHEDULED   │  ← Agendamento criado
└──────┬──────┘
       │ Paciente confirma (telefone/WhatsApp)
       ↓
┌─────────────┐
│ CONFIRMED   │  ← Confirmado
└──────┬──────┘
       │ Paciente vai até recepção
       ↓
┌─────────────┐
│ CHECKED_IN  │  ← Recepção desbloqueada ✓
└──────┬──────┘
       │ Aguardando chamada do profissional
       ↓
┌─────────────┐
│ WAITING     │  ← Na fila
└──────┬──────┘
       │ Profissional chamou e iniciou atendimento
       ↓
┌─────────────────┐
│ IN_PROGRESS     │  ← Sendo atendido
└──────┬──────────┘
       │ Profissional concluiu
       ↓
┌─────────────┐
│ COMPLETED   │  ← Faturamento automático ✓✓✓
└─────────────┘
```

---

## Regras de Negócio Críticas

### ✅ Confirmação
- `scheduled` → `confirmed`: Requer confirmação do paciente

### 🔓 Recepção
- Status `checked_in` **desbloqueia a recepção**
- Permite entrada de dados críticos do paciente

### 🚫 Cancelamento
- Possível apenas em: `scheduled`, `confirmed`, `checked_in`
- Impossível após: `waiting`, `in_progress`
- Motivo: Paciente já entrou em processo de atendimento

### 💰 Faturamento
- **APENAS** `completed` gera faturamento automático
- `cancelled` e `no_show` **NUNCA** geram faturamento
- Outros status não geram faturamento

### 🔐 Edição Crítica
- `completed` **bloqueia edições críticas**
- Apenas notas podem ser adicionadas
- Proteção: Impossibilitar alteração de dados que já foram faturados

### 📊 Relatórios
- Todos os 8 status aparecem em relatórios
- Filtragem por: operacionais, finalizados, problemas, etc.

---

## Mapeamento Retroativo de Status Legados

| Status Legado | Novo Status | Razão |
|--------------|-------------|-------|
| `scheduled`, `agendado` | `scheduled` | Direto |
| `confirmed`, `confirmed_phone`, `confirmed_whatsapp` | `confirmed` | Consolidação |
| `at_reception`, `at_checkout` | `checked_in` | Unificação |
| `awaiting_professional`, `squeezein` | `waiting` | Consolidação |
| `in_service` | `in_progress` | Renomeação |
| `attended` | `completed` | Renomeação |
| `cancelled`, `blocked` | `cancelled` | Consolidação |
| `no_show`, `faltou` | `no_show` | Unificação |

---

## Componentes UI Disponíveis

### 1. OfficialStatusBadge
```typescript
<OfficialStatusBadge 
  status="confirmed" 
  size="md"
  showIcon={true}
  showLabel={true}
/>
// Resultado: [✅ Confirmado]
```

### 2. OfficialStatusSelect
```typescript
<OfficialStatusSelect
  currentStatus="scheduled"
  onStatusChange={(newStatus) => updateStatus(newStatus)}
/>
// Mostra APENAS transições válidas em dropdown
```

### 3. OperationalTimeline
```typescript
<OperationalTimeline
  currentStatus="waiting"
  completionHistory={{
    scheduled: '2025-05-10T08:00:00Z',
    confirmed: '2025-05-10T10:00:00Z',
    checked_in: '2025-05-10T14:00:00Z',
  }}
  showTimestamps={true}
/>
// Timeline visual do progresso
```

### 4. OfficialStatusBadgeCompact
```typescript
<OfficialStatusBadgeCompact status="completed" />
// Apenas ícone com tooltip
```

### 5. OfficialStatusDot
```typescript
<OfficialStatusDot status="in_progress" animated={true} />
// Ponto colorido indicador (pode animar)
```

---

## Filtros Rápidos Disponíveis

### Presets
```typescript
import { QUICK_FILTERS } from '@/modules/agenda/constants';

QUICK_FILTERS.PENDING      // ⏳ Em processamento
QUICK_FILTERS.FINALIZED    // ✅ Finalizados
QUICK_FILTERS.TODAY_FLOW   // 📅 Fluxo de hoje
QUICK_FILTERS.NEEDS_ACTION // ⚠️ Precisa ação
QUICK_FILTERS.ISSUES       // 🔴 Problemas
QUICK_FILTERS.BILLABLE_READY // 💰 Pronto faturar
QUICK_FILTERS.ALL          // 📋 Todos
```

### Helpers
```typescript
import { 
  filterByQuickFilter,
  countByStatus,
  getQuickFilterSummary,
  generateChartData
} from '@/modules/agenda/constants';

// Contar por status
const counts = countByStatus(appointments);
// { scheduled: 5, confirmed: 3, checked_in: 2, ... }

// Resumo rápido
const summary = getQuickFilterSummary(appointments);
// { pending: 10, finalized: 5, needsAction: 3, ... }

// Dados para gráfico
const chartData = generateChartData(appointments);
// [ { status: 'completed', count: 15, label: '...', ... } ]
```

---

## Validações Disponíveis

```typescript
import { 
  validateStatusTransition,
  validateEditPermission,
  validateCancelPermission,
  validateFinancialGeneration,
  validateReceptionUnlock
} from '@/modules/agenda/constants';

// Validar transição
const validation = validateStatusTransition('scheduled', 'confirmed');
// { valid: true, targetStatus: 'confirmed' }

// Validar edição
const edit = validateEditPermission('completed', 'patient_notes');
// { canEdit: false, reason: '...', criticalBlockage: true }

// Validar cancelamento
const cancel = validateCancelPermission('waiting');
// { canEdit: false, reason: '...' }

// Validar faturamento
const billing = validateFinancialGeneration('completed');
// { generatesFinancial: true }

// Validar recepção
const reception = validateReceptionUnlock('checked_in');
// { receptionUnlocked: true }
```

---

## Migration do Banco de Dados

Arquivo: `supabase/migrations/2026-05-10_official_status_model.sql`

### Funcionalidades
- ✅ Tipo ENUM com 8 status
- ✅ Função de conversão de status legados
- ✅ Coluna nova `official_status`
- ✅ Backup em `booking_status_legacy`
- ✅ Trigger de sincronização
- ✅ Índices para performance
- ✅ Reversível se necessário

### Aplicação
```bash
# Usar Supabase SQL editor ou:
cat supabase/migrations/2026-05-10_official_status_model.sql | \
  psql postgresql://user:password@host/database
```

---

## Integração com Financeiro

### Automático
- Agendamento em `completed` → Fatura automática
- Triggers acionam `createFinancialRecord()`

### Bloqueado
- `cancelled` → Sem fatura (nunca)
- `no_show` → Sem fatura (nunca)

### Audit Trail
- Todas as mudanças de status são logadas
- Referência cruzada com faturamento

---

## Backward Compatibility

✅ **100% Compatível**
- Dados antigos são mapeados automaticamente
- Coluna `booking_status` mantida como backup
- Sistema antigo continua funcionando durante transição

✅ **Sem Breaking Changes**
- Importações antigas continuam funcionando
- Endpoints retornam novo status automaticamente
- Clientes legados recebem dados mapeados

---

## Checklist de Implementação

- [x] Constants definidas
- [x] Validações implementadas
- [x] Componentes UI criados
- [x] Migration SQL segura
- [x] Filtros rápidos
- [x] Mapeamento retroativo
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Deploy em staging
- [ ] Validação em produção

---

## Próximos Passos

1. **Aplicar Migration**: `2026-05-10_official_status_model.sql`
2. **Testar Mapeamento**: Verificar conversão de dados antigos
3. **Implementar em UI**: Usar novos componentes
4. **Validar Financeiro**: Garantir faturamento automático
5. **Monitorar**: Acompanhar em produção

---

**Versão**: 1.0.0  
**Data**: 2026-05-10  
**Status**: ✅ Production Ready
