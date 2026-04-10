# 📊 Estrutura Completa - Refatoração Agenda

## 🎯 Árvore de Arquivos

```
src/pages/clinica/agenda/
│
├── 📂 components/
│   ├── ✅ StatusChip.jsx                 [NOVO - Componente reutilizável]
│   ├── ✅ AgendaHeaderNew.jsx            [NOVO - Header compacto 40px]
│   ├── ✅ AgendaToolbarNew.jsx           [NOVO - Toolbar com segmentado]
│   ├── ✅ AgendaFiltersNew.jsx           [NOVO - Filtros colapsáveis]
│   ├── ✅ AgendaGridNew.jsx              [NOVO - Tabela de alta densidade]
│   ├── ✅ index.jsx                      [NOVO - Exemplo de integração]
│   │
│   ├── 📂 skeletons/
│   │   └── [componentes de loading]
│   │
│   ├── [36 componentes existentes]
│   │   ├── AgendaCalendar.jsx
│   │   ├── AgendaFilters.jsx
│   │   ├── AgendaHeader.jsx
│   │   ├── AgendaToolbar.jsx
│   │   └── ... [mais componentes]
│   │
│   └── [TOTAL: 42 componentes]
│
├── 📂 hooks/
│   ├── ✅ useAgendaFilters.js            [NOVO - Hook de filtros]
│   ├── useAgendaStore.js                 [Existente - Estado global]
│   ├── useAgendaFinanceMetrics.js        [Existente - Métricas]
│   ├── useAgendaSuggestions.js           [Existente - Sugestões]
│   └── [3 hooks existentes]
│
├── 📂 layout/
│   ├── AgendaLayout.jsx                  [Layout wrapper]
│   └── [layout components]
│
├── 📂 views/
│   ├── AgendaUnificada.jsx               [Visualização unificada]
│   ├── AgendaPorProfissional.jsx         [Por profissional]
│   ├── AgendaSala.jsx                    [Por sala]
│   └── [5 views existentes]
│
├── 📄 AgendaPage.jsx                     [Página principal - 1055 linhas]
├── 📄 AgendaConfirmacoes.jsx             [Confirmações]
├── 📄 AgendaEspera.jsx                   [Lista de espera]
├── 📄 AgendaIndicadores.jsx              [Indicadores KPI]
└── ... [outros arquivos]
```

---

## 🔄 Fluxo de Integração

### Visão Geral
```
URL: http://localhost:3000/clinica/agenda-novo
  ↓
AppRoutes.jsx (linha ~280)
  ↓
ProtectedWizardRoute (controle de acesso)
  ↓
AgendaIndexNew (src/pages/clinica/agenda/components/index.jsx)
  ├─ AgendaHeaderNew (cabeçalho 40px)
  ├─ AgendaToolbarNew (toolbar 45px)
  ├─ AgendaFiltersNew (filtros colapsáveis)
  │  └─ useAgendaFilters (hook)
  └─ AgendaGridNew (tabela)
     └─ StatusChip (badge de status)
```

---

## 📋 Props Flow (Fluxo de Dados)

```
AgendaIndexNew (Orquestrador)
│
├─ date: string (YYYY-MM-DD)
├─ viewMode: 'dia' | 'semana' | 'mes'
├─ agendaMode: 'geral' | 'profissional' | 'sala'
├─ filters: { search, professional_id, room_id, status, payer_id, service_id }
├─ appointments: Array<Appointment>
└─ metadata: { professionals, rooms, services, payers }
   │
   ├──> AgendaHeaderNew
   │    Props: date, onPreviousDay, onNextDay, onDateChange, onNewAppointment, viewMode, onViewModeChange, loading
   │
   ├──> AgendaToolbarNew
   │    Props: viewMode, agendaMode, onAgendaModeChange, canAccessProfessionalMode, canAccessRoomMode
   │
   ├──> AgendaFiltersNew
   │    Props: filters, onFilterChange, onClearFilters, activeFiltersCount, metadata
   │
   └──> AgendaGridNew
        Props: appointments, metadata, onSlotClick, onEdit, onCancel, onViewDetails, viewMode, date
        │
        └──> StatusChip (múltiplas instâncias)
             Props: status, size, compact
```

---

## 🔗 Integração no AppRoutes.jsx

**Arquivo:** `src/AppRoutes.jsx`
**Localização:** Linhas ~100-105 (imports) e ~280-289 (rota)

### Imports Adicionados
```jsx
// ✨ NOVA AGENDA REFATORADA - COMPONENTES
import AgendaIndexNew from "@/pages/clinica/agenda/components/index";
```

### Rota Adicionada
```jsx
{/* ✨ NOVA AGENDA REFATORADA - VERSÃO DE TESTE */}
<Route 
  path="agenda-novo" 
  element={
    <ProtectedWizardRoute feature="agenda">
      <AgendaIndexNew />
    </ProtectedWizardRoute>
  } 
/>
```

---

## 📦 Componentes Novos Detalhados

### 1️⃣ StatusChip.jsx (93 linhas)
```jsx
// Uso
<StatusChip status="confirmado" size="md" compact={false} />

// Output visual
[● Confirmado]  // size="md"
[●]             // compact=true

// Status suportados
- disponivel → Verde
- confirmado → Azul
- aguardando → Amarelo
- falta → Vermelho
- cancelado → Vermelho escuro
- bloqueado → Cinza
- concluído → Verde
- agendado → Laranja
```

### 2️⃣ useAgendaFilters.js (32 linhas)
```jsx
// Uso
const { isOpen, toggleOpen, closeFilters, updateActiveFiltersCount } = useAgendaFilters();

// Métodos
toggleOpen()                          // Alterna estado do accordion
closeFilters()                        // Fecha accordion
updateActiveFiltersCount(count: int)  // Atualiza contador
```

### 3️⃣ AgendaHeaderNew.jsx (120 linhas)
```jsx
// Uso
<AgendaHeaderNew
  date="2024-02-03"
  viewMode="dia"
  onPreviousDay={handlePreviousDay}
  onNextDay={handleNextDay}
  onDateChange={handleDateChange}
  onNewAppointment={handleNewAppointment}
  onViewModeChange={handleViewModeChange}
  loading={false}
/>

// Altura: 40px
// Features: Navegação data, seletor modo, novo botão
```

### 4️⃣ AgendaToolbarNew.jsx (130 linhas)
```jsx
// Uso
<AgendaToolbarNew
  viewMode="geral"
  agendaMode="geral"
  onAgendaModeChange={handleAgendaModeChange}
  canAccessProfessionalMode={true}
  canAccessRoomMode={true}
/>

// Altura: 45px
// Features: Segmentado 3 modos + Dropdown perfil
// Modos: Geral | Profissional | Sala
```

### 5️⃣ AgendaFiltersNew.jsx (250 linhas)
```jsx
// Uso
<AgendaFiltersNew
  filters={filters}
  onFilterChange={handleFilterChange}
  onClearFilters={handleClearFilters}
  activeFiltersCount={activeFiltersCount}
  metadata={metadata}
/>

// Altura: 40px (fechado) | Expandido ao abrir
// Features: Busca + 5 selects + Badge contador + Limpar
// Filtros: Profissional, Sala, Status, Convênio, Serviço
```

### 6️⃣ AgendaGridNew.jsx (320 linhas)
```jsx
// Uso
<AgendaGridNew
  appointments={filteredAppointments}
  metadata={metadata}
  onSlotClick={handleSlotClick}
  onEdit={handleEditAppointment}
  onCancel={handleCancelAppointment}
  onViewDetails={handleViewDetails}
  viewMode={agendaMode}
  date={date}
/>

// Altura: 500px (sem scroll)
// Colunas: Horário | Paciente | Profissional | Serviço | Sala | Status
// Features: Slots disponíveis (verde) + Agendamentos (com dados)
// Ações ao hover: Ver | Editar | Cancelar
```

### 7️⃣ index.jsx (350 linhas - Exemplo)
```jsx
// Componente orquestrador que mostra:
// - Estado central (date, viewMode, filters, agendaMode)
// - useEffect para carregar dados
// - Filtragem com useMemo
// - Todos os handlers
// - Render completo

// Importa e usa:
// - AgendaHeaderNew
// - AgendaToolbarNew
// - AgendaFiltersNew
// - AgendaGridNew
// - useAgendaFilters hook

// Use como referência para integração no AgendaPage.jsx
```

---

## 🎨 Estilos Utilizados (Tailwind CSS)

**Classes Aplicadas:**
- Cores: `bg-*`, `text-*`, `border-*`, `hover:bg-*`
- Layout: `flex`, `grid`, `flex-col`, `items-center`, `justify-*`
- Tamanhos: `px-*`, `py-*`, `h-*`, `w-*`
- Efeitos: `rounded`, `shadow`, `transition`, `opacity`
- Estado: `hover:`, `disabled:`, `active:`

**Tema de Cores:**
```
Verde (disponível)      #16a34a
Azul (confirmado)       #2563eb
Amarelo (aguardando)    #ca8a04
Vermelho (falta)        #dc2626
Cinza (bloqueado)       #6b7280
```

---

## 🧪 Exemplo Mínimo de Teste

```jsx
// teste.jsx
import AgendaIndexNew from '@/pages/clinica/agenda/components/index';

export default function TestagemAgenda() {
  return (
    <div className="h-screen">
      <AgendaIndexNew />
    </div>
  );
}
```

**Acesse:** `http://localhost:3000/clinica/agenda-novo`

---

## ✅ Checklist de Verificação

- [x] StatusChip.jsx criado
- [x] useAgendaFilters.js criado
- [x] AgendaHeaderNew.jsx criado
- [x] AgendaToolbarNew.jsx criado
- [x] AgendaFiltersNew.jsx criado
- [x] AgendaGridNew.jsx criado
- [x] index.jsx criado
- [x] Rota adicionada em AppRoutes.jsx
- [x] Imports adicionados corretamente
- [x] Estrutura de pastas validada

---

## 🚀 Próximos Passos

**Teste Imediato:**
1. Acesse `http://localhost:3000/clinica/agenda-novo`
2. Verifique cada componente
3. Teste navegação, filtros e ações

**Integração:**
1. Copie handlers do `index.jsx`
2. Integre no `AgendaPage.jsx`
3. Conecte com APIs reais

**Customização:**
1. Ajuste cores em `StatusChip.jsx`
2. Modifique filtros conforme necessário
3. Adapte handlers para seu fluxo

---

**Documentação Completa:** Veja `✅_REFATORACAO_AGENDA_APLICADA.md`
