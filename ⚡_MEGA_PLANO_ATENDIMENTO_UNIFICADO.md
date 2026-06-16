# 🎯 MEGA-PLANO: AGENDA → ATENDIMENTO UNIFICADO COM INTEGRAÇÃO FINANCEIRA

## 📌 OBJETIVO FINAL

Transformar a Agenda em uma **TELA ÚNICA DE ATENDIMENTO** que:
- ✅ Consolidada + unificada (sem split entre criar/editar)
- ✅ Validações obrigatórias (paciente, serviço, convênio, profissional)
- ✅ Múltiplos serviços no MESMO agendamento
- ✅ Integração financeira automática (Fases 3-6)
- ✅ Sem perder o que já existe
- ✅ Melhorando tudo

---

## 🏗️ ARQUITETURA NOVA

```
AtendimentoUnificado (NEW - Tela Principal)
├─ Header
│  ├─ Data/Hora
│  ├─ Status (Agendado, Em atendimento, Concluído)
│  └─ Quick Actions (Finalizar, Cancelar, etc)
│
├─ Seção: Dados Obrigatórios (com validação)
│  ├─ Paciente (required, com busca)
│  ├─ Convênio/Pagador (required)
│  ├─ Profissional (required, filtered por serviço)
│  └─ Sala (optional, sugerida)
│
├─ Seção: Serviços (NOVO - múltiplos)
│  ├─ Tabela de serviços adicionados
│  ├─ Botão: + Adicionar Serviço
│  ├─ Cada linha com:
│  │  ├─ Nome serviço
│  │  ├─ Duração
│  │  ├─ Valor bruto
│  │  ├─ Impostos (calculado v2.0)
│  │  ├─ Valor líquido
│  │  └─ Ações (editar, remover)
│  └─ TOTAL (Bruto, Impostos, Líquido)
│
├─ Seção: Convênio Details
│  ├─ Desconto %
│  ├─ Autorização (se necessário)
│  ├─ Guia (se necessário)
│  └─ Observações
│
├─ Seção: Financeiro (NOVO - integrado)
│  ├─ Status recebível (não criado, pendente, criado)
│  ├─ Se criado:
│  │  ├─ Valor líquido para fluxo
│  │  ├─ Data vencimento
│  │  └─ Link para detalhes
│  └─ Botão: "Criar Recebível Manualmente"
│
├─ Seção: Auditoria (NOVO)
│  ├─ Timeline de eventos
│  ├─ Quem fez o quê
│  ├─ Quando
│  └─ Observações
│
├─ Seção: Check-in (se aplicável)
│  ├─ Presença (Confirmado, Faltou, etc)
│  ├─ Hora chegada/saída
│  └─ Observações do check-in
│
└─ Actions
   ├─ Salvar
   ├─ Finalizar Atendimento (+ criar recebível)
   ├─ Cancelar
   └─ Imprimir/Exportar
```

---

## 📋 FASES DE IMPLEMENTAÇÃO (5-6 horas)

### FASE 3: React Hooks Expandidos (1 hora)
**Arquivo:** `src/modules/financeiro/hooks/useAppointmentFinancialIntegration.ts`

**Adicionar:**
```typescript
// Mutations
export function useFinalizeAppointmentMutation()
export function useCancelMappingMutation()
export function useReprocessMutation()

// Real-time
export function useAppointmentFinancialRealtime(appointmentId)
export function useFinancialAuditLogListener(appointmentId)

// Multiple services support
export function useAppointmentMultipleServices()
  → addService()
  → removeService()
  → updateService()
  → calculateTotal()
  → validateServices()

// Cache
export function useInvalidateFinancialCache()
```

### FASE 4: UI Components (1.5 horas)
**Criar componentes novos:**
- `AppointmentFinancialStatus.jsx` - Status badge
- `AppointmentFinancialDetails.jsx` - Expandible details
- `FinancialAuditLog.jsx` - Timeline
- `MultipleServicesManager.jsx` - Gerenciar múltiplos serviços (NEW)
- `FinancialCalculationBreakdown.jsx` - Mostrar cálculos (NEW)

### FASE 5: AtendimentoUnificado (2 horas)
**Criar:** `src/pages/clinica/agenda/components/AtendimentoUnificado.jsx`

**Funcionalidades:**
- Integrar TODOS os dados do agendamento
- Múltiplos serviços
- Validações obrigatórias
- Financeiro embutido
- Auditoria em timeline
- Check-in integrado

### FASE 6: Integração & Testes (1-1.5 horas)
- Conectar AtendimentoUnificado em AgendaPage
- Substituir modais antigos
- Testes completos
- Validação de fluxos

---

## ✅ VALIDAÇÕES OBRIGATÓRIAS

```javascript
ANTES DE SALVAR:
✓ Paciente preenchido
✓ Convênio preenchido (PARTICULAR ou específico)
✓ Profissional preenchido
✓ Pelo menos 1 serviço adicionado
✓ Data/Hora válida
✓ Não conflita com outros agendamentos
✓ Profissional tem disponibilidade
✓ Serviço está ativo
✓ Paciente não tem bloqueios

ANTES DE FINALIZAR ATENDIMENTO:
✓ Presença confirmada
✓ Todos os serviços foram finalizados
✓ Sem observações críticas não resolvidas
✓ Recebível será criado automaticamente

VALIDAÇÕES EM TEMPO REAL:
✓ Sugestão de profissional quando seleciona serviço
✓ Cálculo automático de impostos
✓ Conflito de horário em vermelho
✓ Validação de convênio precisa
```

---

## 📊 FLUXO DO MEGA-ATENDIMENTO

```
┌─────────────────────────────────────────┐
│ 1. LISTAR AGENDAMENTOS (AgendaPage)     │
│    ├─ Click em agendamento              │
│    └─ Abre AtendimentoUnificado ➜       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 2. ATENDIMENTO UNIFICADO (Nova Tela)    │
│                                         │
│    ┌─ Dados Obrigatórios ◄────┐        │
│    ├─ Paciente (validado) ✓   │        │
│    ├─ Convênio (validado) ✓   │        │
│    ├─ Profissional (validado)✓│        │
│    └─ Sala (sugerida)         │        │
│                               │        │
│    ┌─ Serviços (MÚLTIPLOS) ◄──┤        │
│    ├─ Serviço 1 + valores     │        │
│    ├─ Serviço 2 + valores     │        │
│    ├─ + Adicionar Serviço     │        │
│    └─ TOTAL                   │        │
│                               │        │
│    ┌─ Convênio Details        │        │
│    ├─ Desconto %              │        │
│    ├─ Autorização             │        │
│    └─ Observações             │        │
│                               │        │
│    ┌─ Financeiro (INTEGRADO) ◄┤        │
│    ├─ Recebível? (sim/não)    │        │
│    └─ Valores calculados      │        │
│                               │        │
│    ┌─ Auditoria               │        │
│    ├─ Timeline de eventos     │        │
│    └─ Quem fez o quê          │        │
│                               │        │
│    └─ Check-in (se aplicável) │        │
│       ├─ Presença             │        │
│       └─ Horários             │        │
└────────────┬────────────────────────────┘
             │
       ┌─────┴─────────────┐
       │                   │
       ▼                   ▼
   ┌──────────────┐   ┌──────────────┐
   │ SALVAR       │   │ FINALIZAR    │
   │ (atualiza)   │   │ (completa +  │
   │              │   │  recebível)  │
   └──────────────┘   └──────────────┘
       │                   │
       └─────────┬─────────┘
                 │
                 ▼
       ┌─────────────────────┐
       │ AUDITORIA LOGADA    │
       ├─────────────────────┤
       │ ✓ Quem mudou        │
       │ ✓ O quê mudou       │
       │ ✓ Quando mudou      │
       │ ✓ De → Para         │
       └─────────────────────┘
                 │
                 ▼
       ┌─────────────────────┐
       │ CACHE INVALIDADO    │
       ├─────────────────────┤
       │ • Agenda            │
       │ • Financeiro        │
       │ • Indicadores       │
       └─────────────────────┘
```

---

## 🗄️ BANCO DE DADOS NECESSÁRIO

```sql
-- Verificar se existem:
✓ appointments (principal)
✓ appointment_services (tabela junction) ← NOVO se não existir
✓ ar_invoices (recebíveis)
✓ appointment_to_receivable_mapping (tracking)
✓ financial_audit_logs (auditoria) ← Criado em Fase 2
✓ service_prices (preços por convênio)
✓ appointment_financial_rules (regras)

-- Adicionar campo se não existir:
appointments.status → 'completed' (para trigger)
appointments.financial_status → 'not_processed' | 'pending' | 'completed'
```

---

## 📂 ARQUIVOS A CRIAR/MODIFICAR

### NOVOS:
```
✨ src/modules/financeiro/hooks/useAppointmentMultipleServices.ts
✨ src/components/financeiro/MultipleServicesManager.jsx
✨ src/components/financeiro/FinancialCalculationBreakdown.jsx
✨ src/pages/clinica/agenda/components/AtendimentoUnificado.jsx
✨ src/pages/clinica/agenda/components/AtendimentoUnificado.css
```

### EXPANDIR:
```
📝 src/modules/financeiro/hooks/useAppointmentFinancialIntegration.ts (+200 linhas)
📝 src/lib/appointmentFinancialIntegrationApi.ts (+100 linhas - helpers)
```

### MODIFICAR:
```
📝 src/pages/clinica/agenda/AgendaPage.jsx (integrar novo componente)
📝 src/lib/appointmentsApi.js (adicionar syncMultipleServices)
```

---

## 🎯 TIMELINE

| Item | Tempo | Crítico? |
|------|-------|----------|
| Hooks React (Fase 3) | 1h | ALTA |
| UI Components (Fase 4) | 1.5h | ALTA |
| AtendimentoUnificado (Fase 5) | 2h | ALTA |
| Integração & Testes (Fase 6) | 1-1.5h | ALTA |
| **TOTAL** | **5-6h** | - |

---

## ✨ FEATURES PRINCIPAIS

### 1. Validações Obrigatórias ✓
- Em tempo real feedback visual
- Cores: vermelho (erro), amarelo (aviso), verde (ok)
- Botão SALVAR desabilitado até validar

### 2. Múltiplos Serviços ✓
- Tabela dinâmica
- Adicionar/remover em runtime
- Cálculos automáticos por serviço
- Total agregado

### 3. Financeiro Integrado ✓
- Mostrar status (não criado → pendente → criado)
- Valores calculados em v2.0 (5 tipos de impostos)
- Link para detalhes se recebível criado
- Botão para criar manual se necessário

### 4. Auditoria Completa ✓
- Timeline visual
- Quem fez o quê quando
- De → Para (mudanças)
- Expandível por evento

### 5. Check-in ✓
- Se agendamento atual/completo
- Mostrar presença
- Horários

---

## 🚀 PRÓXIMA AÇÃO

**Vamos começar AGORA:**

1. ✅ **Expandir React Hooks** (Fase 3) - 1h
2. ✅ **Criar UI Components** (Fase 4) - 1.5h
3. ✅ **AtendimentoUnificado** (Fase 5) - 2h
4. ✅ **Testes & Validação** (Fase 6) - 1h

**TOTAL: 5-6 horas de desenvolvimento intenso**

---

**COMEÇAMOS?** 🚀
