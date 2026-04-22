# 📑 ÍNDICE COMPLETO DE ARQUIVOS - DOMÍNIO AGENDA

**Total: 150+ arquivos identificados**

---

## 🎨 COMPONENTS (48 arquivos)

### UI Puros (Fase 4A - Baixo Risco)
```
□ CalendarHeader.jsx
□ DatePickerPopover.jsx
□ EmptyState.jsx
□ LoadingOverlay.jsx
□ StatusBadge.jsx
□ StatusChip.jsx
□ ProfessionalColumnHeader.jsx
□ ProfessionalLegend.jsx
□ skeletons/         (diversos)
```

### Componentes com Filtros (Fase 4B - Médio Risco)
```
□ AgendaFilters.jsx
□ AgendaFiltersNew.jsx
□ AgendaFiltersOptimized.jsx
□ AgendaProfessionalFilters.jsx
□ AgendaViewModeTabs.jsx
```

### Componentes de Visualização (Fase 4B - Médio Risco)
```
□ AgendaCalendar.jsx
□ AgendaGrid.jsx
□ AgendaGridNew.jsx
□ AgendaGridOptimized.jsx
□ AgendaHeader.jsx
□ AgendaHeaderNew.jsx
□ AgendaIndicators.jsx
□ AgendaProfessionalView.jsx
□ AgendaSidePanel.jsx
□ AgendaSlot.jsx
□ AgendaStats.jsx
□ AgendaTable.jsx
□ AgendaTabs.jsx
□ AgendaTimeline.jsx
□ AgendaTimeSlotRow.jsx
□ AgendaToolbar.jsx
□ AgendaToolbarNew.jsx
□ AgendaToolbarOptimized.jsx
□ AgendaViewModeTabs.jsx
```

### Sugestões & IA (Fase 4B - Médio Risco)
```
□ AgendaSuggestions.jsx
□ CombinedAgendaSuggestions.jsx
□ EncaixeSuggestions.jsx
□ FinancialPrioritySuggestions.jsx
□ SuggestionsDrawer.jsx
```

### Componentes Complexos (Fase 4C - Alto Risco)
```
□ AgendaFinanceDashboard.jsx
□ AgendaHeatmap.jsx
□ AgendamentoDetalhesModal.jsx
□ AgendamentoEditarModal.jsx
□ AppointmentAuditTimeline.jsx
□ AppointmentDrawer.jsx
□ AppointmentFinancialAuditTimeline.jsx
□ AppointmentModal.jsx ⭐⭐⭐ MUITO CRÍTICO
□ AppointmentUnitedModal.jsx
□ AtendimentoModal.jsx
□ CheckinDrawer.jsx
□ CheckinItemModal.jsx
□ ModalCriarAgendamento.jsx
□ NobleHoursSettings.jsx
□ PatientSearchOrCreate.jsx
□ PaymentMethodFields.jsx
```

### Exports & Índices
```
□ index.jsx
□ index-optimized.jsx
□ index.jsx.backup
```

---

## 📄 VIEWS (23 arquivos)

### Views de Calendário (Fase 7A - Alto Risco)
```
□ AgendaCalendarView.jsx
□ AgendaDayView.jsx
□ AgendaMonthView.jsx
□ AgendaWeekView.jsx
□ AgendaUnificada.jsx
□ AgendaUnificadaSimples.jsx
□ AgendaUnificadaTimeline.jsx
□ AgendaUnificada_BACKUP.jsx
```

### Views de Profissional & Sala (Fase 7A - Alto Risco)
```
□ AgendaPorProfissional.jsx
□ AgendaProfessionalView.jsx
□ AgendaSala.jsx
□ AgendaSalaPlaceholder.jsx
```

### Views de Recepção & Profissional (Fase 7B - Muito Alto Risco)
```
□ CheckinRecepacao.jsx
□ AgendaRecepcaoView.jsx
□ AtendimentoProfissionalView.jsx
□ AgendaFluxoCompleto.jsx
```

### Views de Gestão & Relatórios (Fase 7A - Alto Risco)
```
□ DashboardAgenda.jsx
□ AgendaGestorView.jsx
□ AgendaKpis.jsx
□ AgendaRelatorios.jsx
□ Kpis.jsx
□ Relatorios.jsx
```

### Views Auxiliares (Fase 7A - Alto Risco)
```
□ AgendaConfirmacao.jsx
□ Confirmacao.jsx
□ AgendaEspera.jsx
□ ListaEspera.jsx
□ AgendaLogNotificacoes.jsx
□ LogNotificacoes.jsx
□ AgendaNotificacoes.jsx
□ Notificacoes.jsx
□ AgendaIndicadores.jsx
□ NovoAgendamento.jsx
```

### Views de Entrada (Fase 7B - Crítico)
```
□ AgendaLayout.jsx ⭐⭐⭐ ORQUESTRADOR
□ Agenda.jsx ⭐⭐⭐ ENTRY POINT
□ AgendaPage.jsx
□ AgendaConfirmacoes.jsx
□ AgendaEspera.jsx
□ AgendaIndicadores.jsx
```

---

## 🪝 HOOKS (10 arquivos)

### Hooks em `src/hooks/` (Fase 3C - Usar com cuidado)
```
□ useAgenda.js
□ useAgendaAI.js
□ useAgendaConfig.js
□ useAgendaDashboard.js
□ useAgendaDragDrop.js
□ useAgendaIndisponibilidade.js
□ useAgendaLive.js
□ useAgendaResize.js
□ useDragAppointment.js
```

### Hooks em `src/pages/clinica/agenda/hooks/` (Fase 3 - Específicos)
```
□ useAgendaFilters.js           (32 linhas, SIMPLES) - Fase 3A
□ useAgendaSuggestions.js       (70 linhas) - Fase 3A
□ useAgendaFinanceMetrics.js                - Fase 3A
□ useAppointmentPermissions.js              - Fase 3A
□ useAppointmentFinancialAudit.js           - Fase 3A
□ useFinancialPrioritySuggestions.js        - Fase 3A
□ useAgendaStore.js             (250 linhas, COMPLEXO) - Fase 3B
```

---

## 🔄 CONTEXT (3 arquivos)

### Context Providers (Fase 5 - Crítico)
```
□ AgendaContext.jsx             ⭐⭐⭐ BLOQUEADOR
□ useAgendaView.jsx             (context hook)
□ useAgendaFilters.jsx          (context hook)
```

---

## 📡 SERVICES (5 arquivos)

### API Layer (Fase 2)
```
□ agendaService.js              ⭐ CENTRAL (30+ funções)
□ agendamentoService.js         (alternativo/legacy)
```

### Mappers (Fase 2)
```
□ agendaMapper.js               (27 linhas)
□ agendaPorProfissionalMapper.js
□ agendaPorSalaMapper.js
```

---

## 🛠️ UTILS (15+ arquivos)

### Helpers de Encaixe & Sugestões (Fase 1)
```
□ suggestEncaixe.js
```

### Helpers de Validação (Fase 1)
```
□ agendaValidation.js
```

### Helpers de Formatação (Fase 1)
```
□ agendaFormatting.js
```

### Helpers de Data (Fase 1)
```
□ dateHelpers.js
```

### Helpers de Componentes (Fase 1)
```
□ appointmentHelpers.js
```

### Outros Utils (Fase 1)
```
□ [investigar estrutura para encontrar todos]
```

---

## ⚙️ CONFIG & OUTROS

### Configurações
```
src/pages/clinica/agenda/config/
□ [arquivos de configuração]
```

### Mappers Alternativos
```
src/pages/clinica/agenda/mappers/
□ [vários mappers]
```

### Layouts
```
src/pages/clinica/agenda/layout/
□ [layouts específicos]
```

### Rotas Internas
```
src/pages/clinica/agenda/routes/
□ [rotas internas da agenda]
```

### Exemplos & Docs
```
src/pages/clinica/agenda/examples/
□ AppointmentDetailWithAuditExample.jsx

src/pages/clinica/agenda/
□ AGENDA_ARQUITETURA.js
□ CHECKIN_*.md (vários)
□ README.md
□ QUICK_START.js
```

---

## 🔗 COMPONENTES EXTERNOS AO DOMÍNIO

### Em `src/components/clinica/`
```
□ AppointmentDialog.jsx
□ AppointmentDialogClean.jsx
□ agenda/DrawerAtendimento.jsx
└─ [investigar mais]
```

### Em `src/components/` (root)
```
□ [investigar para encontrar componentes agenda]
```

---

## 📋 ARQUIVOS EXTERNOS NÃO MÓVEIS

### Em `src/lib/`
```
✗ customSupabaseClient.js       (CRÍTICO - não mover)
✗ appointmentsApi.js             (API layer - não mover ainda)
✗ agendaUtils.js                 (Utilities - não mover ainda)
✗ holidaysApi.js                 (Holidays - não mover ainda)
```

### Em `src/contexts/`
```
✗ SupabaseAuthContext            (Auth - não mover)
✗ ClinicContext                  (Clinic - não mover)
```

---

## 🎯 ORDEM DE MAPEAMENTO (Checklist)

```
FASE 1: Utilitários Puros
  □ suggestEncaixe.js
  □ appointmentHelpers.js
  □ agendaValidation.js
  □ agendaFormatting.js
  □ dateHelpers.js
  □ [outros utils]

FASE 2: Serviços & Mappers
  □ agendaMapper.js
  □ agendaPorProfissionalMapper.js
  □ agendaPorSalaMapper.js
  □ agendamentoService.js
  □ agendaService.js

FASE 3: Hooks
  □ useAgendaFilters.js
  □ useAgendaSuggestions.js
  □ useAgendaFinanceMetrics.js
  □ useAppointmentPermissions.js
  □ useAppointmentFinancialAudit.js
  □ useFinancialPrioritySuggestions.js
  □ useAgendaStore.js

FASE 4: Componentes
  □ [48 componentes em 3 sub-fases]

FASE 5: Context
  □ useAgendaView.jsx
  □ useAgendaFilters.jsx
  □ AgendaContext.jsx

FASE 6: Views
  □ [23 views]
```

---

## 📊 Por Fase

| Fase | Arquivos | Tempo | Risco |
|------|----------|-------|-------|
| 1    | ~6       | 15m   | 🟢    |
| 2    | 5        | 30m   | 🟡    |
| 3    | 7        | 45m   | 🟡    |
| 4    | 48       | 60m   | 🟠    |
| 5    | 3        | 30m   | 🔴    |
| 6    | 23       | 120m  | 🔴    |
| Total| 150+     | 300m  | Misto |

---

## ✅ Depois de Verificar Tudo

Marcar aqui:
```
☐ Entendi a ordem de migração
☐ Entendi as dependências críticas
☐ Entendi o que mover primeiro
☐ Pronto para começar com FASE 1
```

