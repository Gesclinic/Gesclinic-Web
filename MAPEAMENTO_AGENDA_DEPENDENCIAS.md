# 🔗 ÁRVORE DE DEPENDÊNCIAS - DOMÍNIO AGENDA

## Estrutura de Dependências (De baixo para cima)

```
LAYER 1: EXTERNOS (Não movemos)
├── @/lib/customSupabaseClient
├── @/lib/appointmentsApi
├── @/lib/agendaUtils
├── @/lib/holidaysApi
├── @/contexts/SupabaseAuthContext (useAuth)
└── @/contexts/ClinicContext (useClinicContext)
        ↑
        │
LAYER 2: UTILITÁRIOS PUROS (FASE 1)
├── suggestEncaixe.js
├── appointmentHelpers.js
├── agendaValidation.js
├── agendaFormatting.js
├── dateHelpers.js
└── [utils puros]
        ↑
        │
LAYER 3: MAPPERS & FORMATADORES (FASE 2A)
├── agendaMapper.js
├── agendaPorProfissionalMapper.js
└── agendaPorSalaMapper.js
        ↑
        │
LAYER 4: SERVIÇOS (FASE 2B)
├── agendamentoService.js
└── agendaService.js ⭐ CENTRAL
        ↑
        │
LAYER 5: HOOKS SIMPLES (FASE 3A)
├── useAgendaFilters.js
├── useAgendaSuggestions.js
└── useAppointmentPermissions.js
        ↑
        │
LAYER 6: HOOKS COMPLEXOS (FASE 3B)
├── useAgendaStore.js ⭐
├── useAgendaFinanceMetrics.js
└── useAppointmentFinancialAudit.js
        ↑
        │
LAYER 7: CONTEXT PROVIDERS (FASE 5)
├── useAgendaView.jsx
├── useAgendaFilters.jsx
└── AgendaContext.jsx ⭐⭐ CRÍTICO
        ↑
        │
LAYER 8: COMPONENTES UI PUROS (FASE 4A)
├── StatusBadge.jsx
├── StatusChip.jsx
├── EmptyState.jsx
├── CalendarHeader.jsx
└── [UI puros, sem estado]
        ↑
        │
LAYER 9: COMPONENTES COM ESTADO (FASE 4B/4C)
├── AgendaFilters.jsx
├── AgendaTable.jsx
├── AgendaIndicators.jsx
├── AppointmentDrawer.jsx
└── [componentes que usam contexto]
        ↑
        │
LAYER 10: COMPONENTES CONTAINER (FASE 6)
├── AppointmentModal.jsx ⭐ ALTAMENTE ACOPLADO
├── ModalCriarAgendamento.jsx
├── AtendimentoModal.jsx
└── [componentes com lógica de negócio]
        ↑
        │
LAYER 11: VIEWS (FASE 7)
├── AgendaWeekView.jsx
├── AgendaDayView.jsx
├── CheckinRecepacao.jsx
├── AgendaLayout.jsx ⭐⭐ ORQUESTRADOR
└── Agenda.jsx ⭐⭐ ENTRY POINT
```

---

## Dependências Críticas: Fluxo Completo

### AppointmentModal.jsx (Exemplo de Alto Acoplamento)

```
AppointmentModal.jsx
  ├─ @/utils/formatters/formatPhone           [EXTERNO]
  ├─ @/utils/helpers/generateTimeSlots        [EXTERNO]
  ├─ @/utils/helpers/getStatusStyle           [EXTERNO - mas vamos mover]
  ├─ @/lib/customSupabaseClient               [EXTERNO]
  ├─ @/contexts/SupabaseAuthContext           [EXTERNO]
  ├─ ../utils/suggestEncaixe.js               [FASE 1]
  ├─ ../services/agendaService.js             [FASE 2]
  │   ├─ @/lib/appointmentsApi                [EXTERNO]
  │   ├─ @/lib/agendaUtils                    [EXTERNO]
  │   └─ @/lib/customSupabaseClient           [EXTERNO]
  ├─ ./AppointmentAuditTimeline.jsx           [FASE 4C]
  │   ├─ useAppointmentFinancialAudit.js      [FASE 3B]
  │   └─ @/components/...                     [OUTRO]
  └─ [Usar useAgendaContext()] ⚠️             [FASE 5]
      └─ AgendaContext.jsx                    [FASE 5]
```

---

## Arcos de Dependência (O que mover JUNTOS)

### Arc 1: Utilitários Base
```
MOVER JUNTOS (mesma PR):
  suggestEncaixe.js
  appointmentHelpers.js
  agendaValidation.js
  agendaFormatting.js
  dateHelpers.js
  
ARQUIVOS AFETADOS: ~5-10 (pesquisa necessária)
RISCO: BAIXO
```

### Arc 2: Serviços
```
MOVER JUNTOS (mesma PR):
  agendaMapper.js
  agendaPorProfissionalMapper.js
  agendaPorSalaMapper.js
  agendamentoService.js
  agendaService.js (último)
  
DEPENDEM: AppointmentModal, views
ARQUIVOS AFETADOS: ~20-30
RISCO: MÉDIO
```

### Arc 3: Hooks Gerais
```
MOVER JUNTOS (mesma PR):
  useAgendaFilters.js
  useAgendaSuggestions.js
  useAgendaFinanceMetrics.js
  useAppointmentPermissions.js
  
DEPENDEM: ~15 componentes
ARQUIVOS AFETADOS: ~15-25
RISCO: MÉDIO-ALTO
```

### Arc 4: Hooks Core
```
MOVER SEPARADO (pode quebrar muito):
  useAgendaStore.js (CRÍTICO - só depois outros hooks)
  
BLOQUEADOR PARA: Views, componentes container
RISCO: ALTO
```

### Arc 5: Context (Bloqueador de tudo)
```
MOVER JUNTOS (mesma PR):
  useAgendaView.jsx
  useAgendaFilters.jsx
  AgendaContext.jsx
  
BLOQUEADOR PARA: Toda renderização
ARQUIVOS AFETADOS: ~50+ (quase todos components)
RISCO: CRÍTICO
```

### Arc 6: Views (Fim da linha)
```
MOVER SEPARADO OU JUNTOS:
  Views podem ser migradas em lotes
  MAS: AgendaLayout.jsx é orquestrador - último
  MAS: Agenda.jsx é entry - último
  
RISCO: CRÍTICO
```

---

## ⚠️ "PONTOS DE PARADA" OBRIGATÓRIOS

```
ANTES DE PROSSEGUIR:

PARADA 1 (após FASE 1): ✋
  ✓ Build passa
  ✓ Imports de utils atualizados
  ✓ Dev server funciona
  
PARADA 2 (após FASE 2): ✋
  ✓ Services funcionam
  ✓ AppointmentModal carrega
  
PARADA 3 (após FASE 3): ✋
  ✓ Hooks exportam corretamente
  ✓ useAgendaStore() funciona
  
PARADA 4 (após FASE 5): ✋⚠️ CRÍTICO
  ✓ AgendaContext.jsx funciona
  ✓ TODOS componentes renderizam
  ✓ Contexto carrega dados
  
PARADA 5 (após FASE 7): ✋⚠️ CRÍTICO
  ✓ Rotas funcionam
  ✓ Entry point (Agenda.jsx) funciona
  ✓ Layout renderiza
```

---

## 🔍 Como Detectar Problemas

### Erro: "Cannot find module '@/pages/clinica/agenda/...'"
```
Solução: Import não foi atualizado
Ação: grep para encontrar todas as referências
```

### Erro: "Hook called outside provider"
```
Solução: AgendaContext não foi movido antes de componente
Ação: Voltar para FASE 5 antes de FASE 6
```

### Erro: "Cannot read property of undefined"
```
Solução: Service não foi movido antes de componente
Ação: Verificar ordem de migração
```

### Build Success mas componente não renderiza
```
Solução: Context ainda não foi completamente movido
Ação: Validar AgendaContext.jsx está em módulo
```

---

## ✅ Validação de Dependências

```bash
# Após cada FASE, validar:

# 1. Imports corretos
grep -r "@/pages/clinica/agenda" src/pages/clinica/agenda/
# Deve retornar ZERO matches (tudo deve ser relativo)

# 2. Exports existem
grep -r "export.*from '@/modules/agenda" src/
# Deve retornar matches para cada arquivo movido

# 3. No build errors
npm run build
# Deve terminar com SUCCESS

# 4. No runtime errors
npm run dev
# Abrir navegador, teste rotas
```

---

## 📋 Checklist de Migração

```
ANTES DE COMEÇAR:
☐ Ler MAPEAMENTO_DOMINIO_AGENDA.md completamente
☐ Criar branch: `feat/modularize-agenda-phase-1`
☐ Ter build passando no current main

DURANTE CADA FASE:
☐ Mover arquivos para @/modules/agenda/
☐ Atualizar imports em arquivos afetados
☐ Rodar `npm run build`
☐ Se passar: commit + merge
☐ Se falhar: reverter + investigar

APÓS CADA FASE:
☐ Testar manualmente na UI
☐ Verificar console (no errors)
☐ Testar rotas principais
☐ Validar contexto funciona
☐ Documentar problemas encontrados
```

---

**Este arquivo ajuda a entender a complexidade de acoplamento antes de migração!**

