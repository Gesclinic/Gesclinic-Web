# 📋 AGENDA ÚNICA - GESCLINIC WEB

## 🎯 Resumo da Refatoração

A Agenda foi completamente refatorada para um modelo de **Agenda Única** com múltiplos modos de visualização, sem múltiplas rotas, seguindo padrão ERP médico profissional.

### ✨ Principais Características

- ✅ **Uma única rota:** `/clinica/agenda` (sem sub-rotas)
- ✅ **Três modos de visualização:** Geral, Por Profissional, Por Sala (controlados por estado)
- ✅ **Estado centralizado:** `useAgendaStore` para gerenciar toda lógica
- ✅ **Filtros combinativos:** Profissional, Sala, Status, Convênio, Serviço
- ✅ **KPIs em tempo real:** Taxa de ocupação, total de agendamentos, faltas, encaixes
- ✅ **Modal responsivo:** Com abas (Agendamento, Paciente, Financeiro, Histórico)
- ✅ **RBAC completo:** Controle de permissões por role (recepcao, profissional, gestor, admin)
- ✅ **Design profissional:** Tailwind CSS, cores por status, hover com sombra

## 📁 Arquitetura de Arquivos

```
src/pages/clinica/agenda/
├── AgendaPage.jsx                    # 🎯 Componente principal
├── hooks/
│   └── useAgendaStore.js            # 🧠 Estado centralizado
├── components/
│   ├── AgendaHeader.jsx             # 📅 Navegação de data
│   ├── AgendaIndicators.jsx         # 📊 Cards de KPIs
│   ├── AgendaTabs.jsx               # 👁️ Modos de visualização
│   ├── AgendaFilters.jsx            # 🔍 Filtros combinativos
│   ├── AgendaTimeline.jsx           # ⏰ Grid de horários (3 modos)
│   └── AppointmentModal.jsx         # 🗂️ Modal com abas
├── AGENDA_ARQUITETURA.js            # 📖 Documentação técnica
└── GUIA_INTEGRACAO_API.js           # 🔧 Guia de implementação API

# Arquivos criados/atualizados
src/lib/
├── roomsApi.js                      # ✨ API de salas (novo)
└── appointmentsApi.js               # Necessita completar CRUD

src/AppRoutes.jsx                     # ✅ Rota atualizada
```

## 🚀 Como Usar

### 1. Acessar a Agenda
```
Navegue até: http://localhost:3000/clinica/agenda
```

### 2. Importar useAgendaStore em Outros Componentes
```javascript
import { useAgendaStore } from '@/pages/clinica/agenda/hooks/useAgendaStore';

const MyComponent = () => {
  const agenda = useAgendaStore();
  
  // Mudar modo de visualização
  agenda.setViewMode('profissional');
  
  // Aplicar filtro
  agenda.updateFilter('professional', '123');
  
  // Navegar datas
  agenda.nextDay();
  agenda.goToday();
};
```

### 3. Estados Disponíveis
```javascript
const agenda = useAgendaStore();

// 📅 Data
agenda.date                          // String ISO (YYYY-MM-DD)
agenda.setDate(date)                 // Definir data
agenda.previousDay()                 // Dia anterior
agenda.nextDay()                     // Próximo dia
agenda.goToday()                     // Voltar ao hoje

// 👁️ Modo de Visualização
agenda.viewMode                      // 'geral' | 'profissional' | 'sala'
agenda.setViewMode(mode)             // Mudar modo

// 🔍 Filtros
agenda.filters                       // { professional, room, status, payer, service, searchText }
agenda.updateFilter(key, value)      // Atualizar um filtro
agenda.clearFilters()                // Limpar todos
agenda.setMultipleFilters(obj)       // Definir vários de uma vez

// 📊 Agendamentos
agenda.appointments                  // Array de todos os agendamentos
agenda.filteredAppointments          // Array filtrado
agenda.setAppointments(arr)          // Definir lista

// 🎯 Slot Selecionado
agenda.selectedSlot                  // Agendamento selecionado
agenda.selectSlot(slot)              // Selecionar
agenda.deselectSlot()                // Deselecionar

// 📈 KPIs
agenda.indicators                    // { total, confirmed, noShow, fitting, occupationRate }

// 🧮 Metadata
agenda.metadata                      // { professionals, rooms, services, payers, patients }
agenda.setMetadata(obj)              // Definir
```

## 🔐 Permissões por Role

| Ação | recepcao | profissional | gestor | admin |
|------|----------|--------------|--------|-------|
| Ver agendamentos | ✅ | ✅ (seus) | ✅ | ✅ |
| Criar novo | ✅ | ❌ | ✅ | ✅ |
| Editar | ✅ | ❌ | ✅ | ✅ |
| Editar valor | ❌ | ❌ | ✅ | ✅ |
| Cancelar | ❌ | ❌ | ✅ | ✅ |
| Confirmar | ✅ | ✅ | ✅ | ✅ |
| Ver indicadores | ❌ | ❌ | ✅ | ✅ |

## 🎨 Cores por Status

```javascript
Disponível:     bg-gray-100    (vazio)
Confirmado:     bg-green-100   ✓
A confirmar:    bg-yellow-100  ⚠
Faltou:         bg-red-100     ✗
Encaixe:        bg-blue-100    ⚡
```

## 📊 Fluxo de Agendamento

### Criar Novo
1. Clicar em slot vazio
2. Modal abre com abas: Agendamento, Paciente, Financeiro
3. Preencher dados
4. Clicar "Salvar" → Cria novo agendamento
5. Ou clicar "Encaixe" → Cria com status 'encaixe'

### Editar Existente
1. Clicar em agendamento existente
2. Modal abre com todas as abas, incluindo Histórico
3. Permissões por role são aplicadas
4. Clicar "Confirmar" → status = 'confirmado'
5. Clicar "Cancelar" → status = 'cancelado'
6. Clicar "Salvar" → Atualiza agendamento

## 🔧 Implementação de APIs (TODO)

O código contém comentários `// TODO:` indicando onde adicionar integração Supabase.

### Etapas Necessárias:

1. **Completar `appointmentsApi.js`** com funções:
   - `createAppointment(data)`
   - `updateAppointment(id, updates)`
   - `deleteAppointment(id)`

2. **Verificar outras APIs:**
   - `professionalsApi.list()`
   - `servicesApi.list()`
   - `payersApi.list()`
   - `patientsApi.list()`
   - ✅ `roomsApi.list()` (já criada)

3. **Implementar handlers em `AgendaPage.jsx`:**
   - `handleSaveAppointment()`
   - `handleCancelAppointment()`
   - `handleConfirmAppointment()`
   - `handleFittingAppointment()`

Veja `GUIA_INTEGRACAO_API.js` para instruções detalhadas.

## 🧪 Testes Recomendados

- [ ] Página carrega sem erros
- [ ] Agendamentos carregam da API
- [ ] Navegação de data funciona
- [ ] Abas (geral/profissional/sala) funcionam
- [ ] Filtros funcionam e indicadores reagem
- [ ] Modal abre/fecha corretamente
- [ ] Permissões por role são respeitadas
- [ ] Responsividade em mobile/tablet/desktop

## 📚 Documentação Técnica

Para mais detalhes, consulte:
- `AGENDA_ARQUITETURA.js` - Arquitetura completa
- `GUIA_INTEGRACAO_API.js` - Guia de implementação API

## 🤝 Suporte

Em caso de dúvidas, verifique:
1. Console do navegador (F12) para erros
2. Comentários no código
3. Estrutura de dados em `AGENDA_ARQUITETURA.js`

---

**Status:** ✅ Pronto para ser usado (com APIs de salvamento a implementar)  
**Última atualização:** Janeiro 2026
