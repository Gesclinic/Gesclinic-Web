# 📋 MAPEAMENTO COMPLETO DO DOMÍNIO "AGENDA"

**Data:** 2026-04-22  
**Status:** Preparação para migração (nenhum arquivo movido ainda)  
**Total de Arquivos:** ~150+ arquivos identificados

---

## 📊 RESUMO EXECUTIVO

| Categoria | Qty | Complexidade | Risco |
|-----------|-----|--------------|-------|
| **Components** | 48 | Alto | Alto |
| **Views** | 23 | Muito Alto | Muito Alto |
| **Services** | 5 | Médio | Médio |
| **Hooks** | 10 | Médio | Médio-Alto |
| **Context** | 3 | Médio | Médio |
| **Utils** | ~15 | Baixo | Baixo |
| **Config/Mappers** | ~20 | Baixo | Baixo |
| **Config/Layout** | 3 | Alto | Alto |
| **Total** | **150+** | **Misto** | **Requer cuidado** |

---

## 🗂️ ESTRUTURA ATUAL

```
src/
├── pages/clinica/agenda/
│   ├── components/              (48 arquivos)
│   ├── views/                   (23 arquivos)
│   ├── services/                (5 arquivos)
│   ├── hooks/                   (7 arquivos)
│   ├── context/                 (3 arquivos)
│   ├── utils/                   (~15 arquivos)
│   ├── config/
│   ├── configuracoes/
│   ├── layout/
│   ├── mappers/
│   ├── routes/
│   └── Agenda*.jsx (5 entry files)
│
├── hooks/                        (8 arquivos useAgenda*)
├── components/
│   ├── clinica/
│   │   ├── AppointmentDialog.jsx
│   │   ├── AppointmentDialogClean.jsx
│   │   ├── agenda/DrawerAtendimento.jsx
│   │   └── ... outros
│   └── ...
└── ...
```

---

## 📁 CLASSIFICAÇÃO DETALHADA

### 🎨 COMPONENTS (48 arquivos)

**Componentes de UI Puros (Baixo Risco):**
```
✓ AgendaFilters.jsx / AgendaFiltersNew.jsx / AgendaFiltersOptimized.jsx
✓ AgendaHeader.jsx / AgendaHeaderNew.jsx
✓ AgendaIndicators.jsx
✓ AgendaStats.jsx
✓ AgendaTable.jsx
✓ AgendaTabs.jsx
✓ AgendaTimeline.jsx
✓ AgendaTimeSlotRow.jsx
✓ AgendaToolbar.jsx / AgendaToolbarNew.jsx / AgendaToolbarOptimized.jsx
✓ AgendaViewModeTabs.jsx
✓ CalendarHeader.jsx
✓ DatePickerPopover.jsx
✓ EmptyState.jsx
✓ LoadingOverlay.jsx
✓ StatusBadge.jsx
✓ StatusChip.jsx
✓ skeletons/ (vários)
```

**Componentes de Negócio (Médio Risco):**
```
⚠️ AgendaCalendar.jsx            - Agrupa lógica de calendário
⚠️ AgendaGrid*.jsx               - Múltiplas variações otimizadas
⚠️ AgendasProfessionalView.jsx   - Filtro por profissional
⚠️ AgendaSidePanel.jsx           - Painel lateral (dados)
⚠️ AgendaSuggestions.jsx
⚠️ EncaixeSuggestions.jsx
⚠️ FinancialPrioritySuggestions.jsx
⚠️ CombinedAgendaSuggestions.jsx
⚠️ AgendaProfessionalFilters.jsx
```

**Componentes Críticos (Alto Risco - Acoplados):**
```
🔴 AppointmentModal.jsx           - CRÍTICO: Usa agendaService, timeline, múltiplos contextos
🔴 AppointmentDrawer.jsx          - Painel detalhe de agendamento
🔴 AppointmentAuditTimeline.jsx   - Timeline de auditoria
🔴 AppointmentUnitedModal.jsx     - Modal unificado
🔴 AtendimentoModal.jsx           - Modal de atendimento
🔴 CheckinDrawer.jsx              - Drawer de check-in
🔴 ModalCriarAgendamento.jsx      - Modal criar (vários arquivos duplicados)
🔴 PatientSearchOrCreate.jsx      - Busca/cria paciente
🔴 PaymentMethodFields.jsx        - Campos financeiros
🔴 AgendaFinanceDashboard.jsx     - Dashboard financeiro
🔴 AgendaHeatmap.jsx              - Heatmap visual
```

**Componentes Especializados:**
```
• AgendamentoDetalhesModal.jsx
• AgendamentoEditarModal.jsx
• AppointmentFinancialAuditTimeline.jsx
• CheckinItemModal.jsx
• NobleHoursSettings.jsx
• ProfessionalColumnHeader.jsx
• ProfessionalLegend.jsx
• SuggestionsDrawer.jsx
• AgendaSlot.jsx
• index.jsx / index-optimized.jsx (barrel exports)
```

---

### 📄 VIEWS (23 arquivos)

**Vistas Principais (Alto Risco - Ligadas a Rotas):**
```
🔴 Agenda.jsx                    - Entry point principal
🔴 AgendaPage.jsx                - Página wrapper
🔴 AgendaLayout.jsx              - Layout container (gerencia estado global)

📅 AgendaWeekView.jsx            - Visualização semanal
📅 AgendaDayView.jsx             - Visualização diária
📅 AgendaMonthView.jsx           - Visualização mensal
📅 AgendaCalendarView.jsx        - Visualização calendário
📅 AgendaUnificada.jsx           - Dashboard unificado
📅 AgendaUnificadaTimeline.jsx   - Timeline unificada
📅 AgendaUnificadaSimples.jsx    - Versão simplificada
📅 AgendaPorProfissional.jsx     - Filtro por profissional
📅 AgendaSala.jsx                - Filtro por sala
```

**Vistas de Recepção/Profissional:**
```
🏥 CheckinRecepacao.jsx          - Check-in recepção (CRÍTICO)
🏥 AtendimentoProfissionalView.jsx - Tela profissional
🏥 AgendaRecepcaoView.jsx        - View recepção
🏥 AgendaProfessionalView.jsx    - View profissional
```

**Vistas de Gestão/Relatórios:**
```
📊 DashboardAgenda.jsx           - Dashboard
📊 AgendaKpis.jsx / Kpis.jsx     - KPIs
📊 AgendaRelatorios.jsx / Relatorios.jsx - Relatórios
📊 AgendaGestorView.jsx          - View gestor
📊 AgendaFluxoCompleto.jsx       - Fluxo completo visual
```

**Vistas Auxiliares:**
```
• AgendaConfirmacao.jsx / Confirmacao.jsx - Confirmações
• AgendaEspera.jsx / ListaEspera.jsx      - Lista de espera
• AgendaNotificacoes.jsx / Notificacoes.jsx - Notificações
• LogNotificacoes.jsx                      - Log de notificações
• AgendaIndicadores.jsx / AgendaIndicadores.jsx
• NovoAgendamento.jsx                      - Novo agendamento
• AgendaSalaPlaceholder.jsx
```

---

### 🪝 HOOKS (10 arquivos)

**Em `src/hooks/` (Alto Risco - Importados Globalmente):**
```
🎣 useAgenda.js                  - Hook principal
🎣 useAgendaConfig.js            - Configurações
🎣 useAgendaAI.js                - IA (sugestões)
🎣 useAgendaDragDrop.js          - Drag & Drop
🎣 useAgendaLive.js              - Real-time (Supabase)
🎣 useAgendaResize.js            - Responsividade
🎣 useAgendaIndisponibilidade.js - Indisponibilidade
🎣 useAgendaDashboard.js         - Dashboard
🎣 useDragAppointment.js         - Drag appointment
```

**Em `src/pages/clinica/agenda/hooks/` (Específicos):**
```
📌 useAgendaFilters.js           - Filtros (32 linhas, simples)
📌 useAgendaStore.js             - Estado centralizado (250 linhas, complexo)
📌 useAgendaSuggestions.js       - Sugestões (70 linhas)
📌 useAgendaFinanceMetrics.js    - Métricas financeiras
📌 useAppointmentFinancialAudit.js
📌 useAppointmentPermissions.js
📌 useFinancialPrioritySuggestions.js
```

---

### 🔄 CONTEXT (3 arquivos)

```
🎯 AgendaContext.jsx             - Context provider (CRÍTICO - estado global)
🎯 useAgendaView.jsx             - Hook do context (view state)
🎯 useAgendaFilters.jsx          - Hook do context (filter state)
```

**Dependências Críticas:**
- `AgendaContext` exporta `useAgendaContext()` - usado em 20+ componentes
- Gerencia: appointments, filters, selectedSlot, viewMode, etc.

---

### 🛠️ SERVICES (5 arquivos)

```
📡 agendaService.js              - Serviço principal (CRÍTICO)
   └─ listAppointments()
   └─ createAppointment()
   └─ updateAppointment()
   └─ deleteAppointment()
   └─ listarConveniosPorProfissional()
   └─ ... 30+ funções

📡 agendamentoService.js         - Alternativo/Legacy
📡 agendaMapper.js               - Mapeia dados (27 linhas)
📡 agendaPorProfissionalMapper.js
📡 agendaPorSalaMapper.js
```

---

### 📚 UTILS (15+ arquivos)

```
✏️ suggestEncaixe.js             - Sugestões de encaixe
✏️ agendaValidation.js
✏️ agendaFormatting.js
✏️ appointmentHelpers.js
✏️ dateHelpers.js
... (vários outros)
```

---

### ⚙️ CONFIG/MAPPERS/LAYOUT

```
🔧 config/                       - Configurações
🗺️ mappers/                       - Mapeadores
📐 layout/                        - Layouts
🚏 routes/                        - Rotas internas
```

---

## 🔗 ANÁLISE DE DEPENDÊNCIAS

### Arquivo Crítico: `AppointmentModal.jsx`

**Imports:**
```javascript
import { formatPhone } from '@/utils/formatters/formatPhone';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { listarConveniosPorProfissional } from '@/pages/clinica/agenda/services/agendaService';
import { supabase } from '@/lib/customSupabaseClient';
import { suggestEncaixes } from '../utils/suggestEncaixe';
import { generateTimeSlots } from '@/utils/helpers/generateTimeSlots';
```

**Risco:** ALTO - Depende de 6+ módulos distintos

---

### Arquivo Crítico: `AgendaLayout.jsx`

**Imports:**
```javascript
import AgendaToolbar from "../../agenda/components/AgendaToolbar";
import AgendaCalendar from "../../agenda/components/AgendaCalendar";
import AgendaTable from "../../agenda/components/AgendaTable";
import AgendaSidePanel from "../../agenda/components/AgendaSidePanel";
import ModalCriarAgendamento from "../../agenda/components/ModalCriarAgendamento";
import { listAppointments } from "@/lib/appointmentsApi";
import { useClinicContext } from "@/contexts/ClinicContext";
import { useAuth } from "@/contexts/SupabaseAuthContext";
```

**Risco:** MUITO ALTO - Componente orquestrador central

---

### Arquivo Crítico: `AgendaContext.jsx`

**Risco:** CRÍTICO - Todos os componentes dependem disso

---

## 📊 DEPENDÊNCIAS EXTERNAS AO DOMÍNIO

| Módulo | Utilização | Risco |
|--------|-----------|-------|
| `@/lib/appointmentsApi` | listAppointments() | Crítico |
| `@/lib/agendaUtils` | getClinicTimeSlots() | Crítico |
| `@/lib/holidaysApi` | Feriados | Médio |
| `@/lib/customSupabaseClient` | Supabase | Crítico |
| `@/contexts/SupabaseAuthContext` | useAuth() | Crítico |
| `@/contexts/ClinicContext` | useClinicContext() | Crítico |
| `@/utils/formatters/*` | Formatação | Baixo |
| `@/utils/helpers/*` | Helpers | Baixo |
| date-fns | Datas | Crítico |
| Radix UI | Componentes | Médio |
| Lucide Icons | Ícones | Baixo |

---

## 🚀 ORDEM DE MIGRAÇÃO RECOMENDADA

### **FASE 1: Utilitários Puros (SAFEST - Começar aqui)**

⏱️ **Tempo Estimado:** 15 min  
⚠️ **Risco:** BAIXO  
✅ **Dependências:** Zero (funções puras)

```
1. Movefor: suggestEncaixe.js
2. Movefor: appointmentHelpers.js
3. Movefor: agendaValidation.js
4. Movefor: dateHelpers.js
5. Movefor: agendaFormatting.js
... (outros utils)
```

**Motivo:** Sem dependências cruzadas, funções puras

---

### **FASE 2: Serviços (MEDIUM RISK - Depois dos utils)**

⏱️ **Tempo Estimado:** 30 min  
⚠️ **Risco:** MÉDIO  
✅ **Dependências:** Supabase, @/lib (externo)

```
1. Movefor: agendaMapper.js
2. Movefor: agendaPorProfissionalMapper.js
3. Movefor: agendaPorSalaMapper.js
4. Movefor: agendamentoService.js
5. Movefor: agendaService.js (ÚLTIMO - mais completo)
```

**Motivo:** Dependem de utils (já movidos), mas exportam para components

---

### **FASE 3: Hooks Específicos (MEDIUM-HIGH RISK)**

⏱️ **Tempo Estimado:** 45 min  
⚠️ **Risco:** MÉDIO-ALTO  
✅ **Dependências:** Services, context

```
1. Movefor: useAgendaFilters.js (simples, 32 linhas)
2. Movefor: useAgendaSuggestions.js (70 linhas)
3. Movefor: useAgendaFinanceMetrics.js
4. Movefor: useAppointmentPermissions.js
5. Movefor: useAppointmentFinancialAudit.js
6. Movefor: useFinancialPrioritySuggestions.js
7. Movefor: useAgendaStore.js (ÚLTIMO - 250 linhas, complexo)
```

**Motivo:** Específicos do domínio, menos risco que componentes

---

### **FASE 4: Componentes Puros (HIGH RISK - Antes dos containers)**

⏱️ **Tempo Estimado:** 60 min  
⚠️ **Risco:** ALTO  
✅ **Dependências:** Utils, helpers

```
Lote 1 (Componentes de UI simples):
  • AgendaStats.jsx
  • StatusBadge.jsx
  • StatusChip.jsx
  • EmptyState.jsx
  • CalendarHeader.jsx
  • LoadingOverlay.jsx
  • Skeleton components

Lote 2 (Componentes de filtragem):
  • AgendaFilters.jsx
  • AgendaFiltersNew.jsx
  • AgendaProfessionalFilters.jsx
  • DatePickerPopover.jsx

Lote 3 (Componentes de visualização):
  • AgendaTabs.jsx
  • AgendaTable.jsx
  • AgendaTimeline.jsx
  • AgendaToolbar.jsx
  • AgendaHeader.jsx
  • AgendaViewModeTabs.jsx

Lote 4 (Componentes complexos):
  • AgendaIndicators.jsx
  • AgendaSidePanel.jsx
  • AgendaFinanceDashboard.jsx
  • AgendaSuggestions.jsx
  • EncaixeSuggestions.jsx
  • FinancialPrioritySuggestions.jsx
```

**Motivo:** Menos acoplados, usam dados já movidos

---

### **FASE 5: Context (VERY HIGH RISK - Antes das views)**

⏱️ **Tempo Estimado:** 30 min  
⚠️ **Risco:** MUITO ALTO  
✅ **Dependências:** Hooks, services

```
1. Movefor: useAgendaFilters.jsx (context hook)
2. Movefor: useAgendaView.jsx (context hook)
3. Movefor: AgendaContext.jsx (provider - ÚLTIMO)
```

**Motivo:** Todos os componentes dependem - necessário mover junto

---

### **FASE 6: Componentes Container (VERY HIGH RISK)**

⏱️ **Tempo Estimado:** 90 min  
⚠️ **Risco:** MUITO ALTO  
✅ **Dependências:** Tudo anterior + contexto

```
Lote 1 (Componentes de renderização):
  • AgendaCalendar.jsx
  • AgendaGrid*.jsx (otimizados)
  • AgendaProfessionalView.jsx
  • AgendaHeatmap.jsx

Lote 2 (Componentes de dados):
  • ModalCriarAgendamento.jsx
  • PatientSearchOrCreate.jsx
  • PaymentMethodFields.jsx

Lote 3 (Componentes críticos - ÚLTIMO):
  • AppointmentAuditTimeline.jsx
  • AppointmentDrawer.jsx
  • AtendimentoModal.jsx
  • CheckinDrawer.jsx
  • AppointmentModal.jsx (ÚLTIMO - mais acoplado)
```

**Motivo:** Altamente acoplados, precisam do contexto

---

### **FASE 7: Views (CRITICAL RISK - Por último)**

⏱️ **Tempo Estimado:** 120 min  
⚠️ **Risco:** CRÍTICO  
✅ **Dependências:** Tudo (componentes + contexto + rotas)

```
Lote 1 (Views simples):
  • AgendaConfirmacao.jsx
  • AgendaEspera.jsx / ListaEspera.jsx
  • AgendaNotificacoes.jsx

Lote 2 (Views de dashboard):
  • DashboardAgenda.jsx
  • AgendaKpis.jsx
  • AgendaRelatorios.jsx

Lote 3 (Views de visualização):
  • AgendaUnificada.jsx
  • AgendaWeekView.jsx
  • AgendaDayView.jsx
  • AgendaMonthView.jsx
  • AgendaPorProfissional.jsx

Lote 4 (Views críticas - ÚLTIMO):
  • CheckinRecepacao.jsx
  • AtendimentoProfissionalView.jsx
  • AgendaLayout.jsx (ÚLTIMO - orquestrador)
  • Agenda.jsx (ÚLTIMO - entry point)
```

**Motivo:** Ligadas a rotas, mais risco de quebra

---

## ⚡ RISCO POR ARQUIVO

### 🟢 BAIXO RISCO (Mover primeiro)
```
suggestEncaixe.js
appointmentHelpers.js
agendaValidation.js
agendaFormatting.js
dateHelpers.js
Mapper files
useAgendaFilters.js (32 linhas)
UI Components (StatusBadge, EmptyState, etc.)
```

### 🟡 MÉDIO RISCO
```
useAgendaSuggestions.js
useAgendaFinanceMetrics.js
agendaService.js
AgendaFilters.jsx
AgendaTable.jsx
AgendaTabs.jsx
AgendaIndicators.jsx
```

### 🔴 ALTO RISCO (Mover por último)
```
AppointmentModal.jsx (acoplamento alto)
AgendaLayout.jsx (orquestrador central)
CheckinRecepacao.jsx (lógica de negócio)
Agenda.jsx (entry point)
AgendaContext.jsx (provider crítico)
```

### 🔴🔴 CRÍTICO (Validar após cada)
```
AgendaLayout.jsx - Orquestrador
Agenda.jsx - Entry point
AgendaContext.jsx - Provider global
```

---

## 📋 ARQUIVO "RESPONSABILIDADE DUPLA" (Atenção)

Alguns arquivos têm múltiplas responsabilidades:

```
⚠️ AgendaLayout.jsx
   - Layout container
   - Gerenciador de estado
   - Orquestrador de componentes
   - RECOMENDAÇÃO: Pode ser refatorado após migração

⚠️ AppointmentModal.jsx
   - UI Component
   - Lógica de negócio
   - Integração com API
   - RECOMENDAÇÃO: Considerar split após migração
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Após cada fase, validar:

```
☐ npm run build passa
☐ Dev server inicia (npm run dev)
☐ Rotas funcionam (/clinica/agenda/*)
☐ Login funciona
☐ Componentes renderizam
☐ Sem erros de import
☐ Contexto carrega dados
☐ Sem memory leaks console
```

---

## 🎯 RECOMENDAÇÕES FINAIS

### ✅ O QUE FAZER

1. **Fase 1 primeiro:** Utilitários puros (zero risco)
2. **Incrementos pequenos:** 2-3 arquivos por commit
3. **Validar sempre:** Build + dev após cada lote
4. **Documentar:** Path migration no código
5. **Testar rotas:** Antes de próxima fase

### ❌ O QUE NÃO FAZER

1. **Não mover tudo de uma vez** - Alto risco de quebra
2. **Não mexer em rotas** - Deixar para final
3. **Não refatorar imports** - Apenas mover (por enquanto)
4. **Não remover barrel exports** - Manter compatibilidade
5. **Não ignorar erros de build** - Parar e ajustar

---

## 📞 PRÓXIMOS PASSOS

**Quando autorizado:**
1. Começar com Fase 1 (Utilitários - 15 min)
2. Validar build
3. Confirmar sucesso
4. Avançar Fase 2 (Serviços - 30 min)
5. ... até conclusão

**Saída esperada ao fim:**
- Todos os arquivos em `/src/modules/agenda/`
- Estrutura modular completa
- Imports atualizados
- Build validado
- Zero breaking changes

