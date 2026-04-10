# 💡 SISTEMA DE SUGESTÃO INTELIGENTE DE ENCAIXE

## 📋 Visão Geral

Sistema inteligente que analisa a agenda em tempo real e sugere oportunidades de agendamento para:
- Aumentar ocupação de profissionais
- Aproveitar slots em horários nobres
- Recuperar receita em dias críticos
- Contatar pacientes em lista de espera

---

## 🏗️ ARQUITETURA

### 1. Backend (`src/lib/agendaSuggestionsApi.js`)

#### `generateEncaixeSuggestions(clinicId, date, config)`
- **Entrada:** ID clínica, data (YYYY-MM-DD), configurações opcionais
- **Retorno:** Array de sugestões com prioridade

```javascript
[
  {
    type: "SLOT_LIVRE",           // Tipo da sugestão
    prioridade: "ALTA",            // ALTA | MEDIA | BAIXA
    horario: "07:30",              // Horário sugerido
    profissional_id: "uuid",       // ID do profissional (opcional)
    profissional_nome: "Dr. João", // Nome do profissional
    sala_id: "uuid",               // ID da sala (opcional)
    sala_nome: "Sala 1",           // Nome da sala
    mensagem: "Horário nobre...",  // Mensagem amigável
    acao: "VER_LISTA_ESPERA",      // Ação sugerida (CRIAR_ENCAIXE, etc)
    metadata: {
      waitlistSize: 5,
      estimatedRevenue: 250.00,
      occupancyRate: 0.35
    }
  }
]
```

### 2. Análises Realizadas

#### A. Slots Livres em Horários Nobres
- Detecta horários premium disponíveis (manhã cedo, meio-dia, final da tarde)
- Prioridade: **ALTA**
- Ação: VER_LISTA_ESPERA

```
Horários Nobres Padrão:
- 07:00 - 09:00 (manhã cedo)
- 12:00 - 13:00 (meio dia)
- 17:00 - 18:00 (final da tarde)

Configurável em: Menu > Configurações > Agenda > Horários Nobres
```

#### B. Faltas Confirmadas
- Quando há agendamento com status "falta"
- Slot fica vago e pode ser ofertado
- Prioridade: **ALTA**
- Ação: VER_LISTA_ESPERA

#### C. Profissionais Ociosos
- Profissional com menos de 2 atendimentos no dia
- Oportunidade de encaixe para aumentar ocupação
- Prioridade: **MEDIA**
- Ação: CRIAR_ENCAIXE

#### D. Agenda Crítica
- Taxa de ocupação < 40% OU
- Receita estimada < 70% da meta
- Prioridade: **MEDIA/ALTA**
- Ação: VER_LISTA_ESPERA ou OTIMIZAR_AGENDA

---

## 🎨 FRONTEND

### Componentes

#### 1. `AgendaSuggestions.jsx`
Componente principal que exibe sugestões como cards.

```jsx
import AgendaSuggestions from "@/pages/clinica/agenda/components/AgendaSuggestions";

<AgendaSuggestions
  clinicId={clinicId}
  date="2026-01-14"
  onSuggestionAction={(data) => console.log(data)}
  userRole="recepcion"  // recepcion | gestor | admin | profissional
  compact={false}        // Modo compacto para drawer
/>
```

**Recursos:**
- Cards com ícones por tipo
- Destaque visual por prioridade (cores)
- Botões de ação contextuais
- Detalhes expansíveis
- Suporte a mobile/desktop

#### 2. `SuggestionsDrawer.jsx`
Drawer lateral para exibir sugestões com mais espaço.

```jsx
import SuggestionsDrawer, { useSuggestionsDrawer } from "@/pages/clinica/agenda/components/SuggestionsDrawer";

const drawer = useSuggestionsDrawer();

<button onClick={drawer.toggle}>Abrir Sugestões</button>
<SuggestionsDrawer
  clinicId={clinicId}
  date={selectedDate}
  isOpen={drawer.isOpen}
  onClose={drawer.close}
  onSuggestionAction={handleAction}
  userRole={userRole}
/>
```

#### 3. `NobleHoursSettings.jsx`
Componente para configurar horários nobres.

```jsx
import NobleHoursSettings from "@/pages/clinica/agenda/components/NobleHoursSettings";

<NobleHoursSettings
  clinicId={clinicId}
  onSave={(hours) => console.log(hours)}
/>
```

---

## 🪝 HOOKS

### `useAgendaSuggestions(clinicId, date, refreshTrigger)`

Hook customizado para gerenciar sugestões.

```javascript
const { suggestions, loading, error, refresh, executeSuggestion } = 
  useAgendaSuggestions(clinicId, date, refreshTrigger);

// Recarregar ao atualizar data
useEffect(() => {
  refresh();
}, [date]);

// Executar ação
await executeSuggestion(suggestion, "VER_LISTA_ESPERA");
```

---

## 🔐 PERMISSÕES

| Perfil | Vê Sugestões | Executa Ações | Vê Métricas |
|--------|-------------|---------------|------------|
| **Recepção** | ✅ Sim | ✅ Sim | ❌ Não |
| **Gestor** | ✅ Sim | ✅ Sim | ✅ Sim |
| **Admin** | ✅ Sim | ✅ Sim | ✅ Sim |
| **Profissional** | ❌ Não | ❌ Não | ❌ Não |

---

## 📊 AUDITORIA

### Tabela: `suggestion_audit_logs`

Todas as sugestões executadas são registradas em:

```
suggestion_audit_logs
├── clinic_id
├── suggestion_type (SLOT_LIVRE, NO_SHOW, etc)
├── appointment_id
├── action_taken (VER_LISTA_ESPERA, CRIAR_ENCAIXE, etc)
├── executed_by (user_id)
├── executed_at
└── result (JSON com contexto)
```

Acessível via:
```javascript
import { getSuggestionHistory } from "@/lib/agendaSuggestionsApi";

const history = await getSuggestionHistory(clinicId, days = 30);
```

---

## 🚀 INTEGRAÇÃO PASSO A PASSO

### Passo 1: Aplicar Migration

```bash
# No Supabase, executar:
supabase/migrations/20260114_create_suggestion_audit_logs.sql
```

### Passo 2: Importar na Página de Agenda

```jsx
// src/pages/clinica/agenda/AgendaPage.jsx
import { useAgendaSuggestions } from "./hooks/useAgendaSuggestions";
import SuggestionsDrawer from "./components/SuggestionsDrawer";
import AgendaSuggestions from "./components/AgendaSuggestions";

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(...);
  const { suggestions, refresh } = useAgendaSuggestions(clinicId, selectedDate);
  const suggestionsDrawer = useSuggestionsDrawer();

  // Renderizar
  return (
    <div>
      <button onClick={suggestionsDrawer.open}>
        Sugestões ({suggestions.length})
      </button>
      <SuggestionsDrawer {...props} />
    </div>
  );
}
```

### Passo 3: Conectar Ações de Callback

```jsx
const handleSuggestionAction = async (data) => {
  const { suggestion, action } = data;
  
  switch (action) {
    case "VER_LISTA_ESPERA":
      openWaitlistModal();
      break;
    case "CRIAR_ENCAIXE":
      openNewAppointmentForm({
        professionalId: suggestion.profissional_id,
        suggestedTime: suggestion.horario,
      });
      break;
    // ... outros cases
  }

  // Atualizar sugestões após ação
  setTimeout(() => {
    setSugestionsRefresh(prev => prev + 1);
  }, 500);
};
```

### Passo 4: Atualizar Quando Eventos Ocorrem

```jsx
// Quando check-in é feito
const handleCheckIn = async (appointmentId) => {
  await createCheckIn(appointmentId);
  // Recarregar sugestões
  setSugestionsRefresh(prev => prev + 1);
};

// Quando falta é marcada
const handleMarkNoShow = async (appointmentId) => {
  await updateAppointmentStatus(appointmentId, "falta");
  // Recarregar sugestões - vai detectar nova oportunidade
  setSugestionsRefresh(prev => prev + 1);
};
```

---

## ⚙️ CONFIGURAÇÕES

### Horários Nobres

Configuráveis via UI em: **Menu > Configurações > Agenda > Horários Nobres**

Armazenado em: `clinic_settings.noble_hours_config`

```json
{
  "slots": [
    { "start": "07:00", "end": "09:00" },
    { "start": "12:00", "end": "13:00" },
    { "start": "17:00", "end": "18:00" }
  ]
}
```

### Limites de Ocupação

```javascript
// Em agendaSuggestionsApi.js

// Considerar profissional ocioso se < 2 atendimentos
if (profAppointments.length < 2) { ... }

// Agenda crítica se ocupação < 40%
if (indicators.occupancy_rate < 40) { ... }

// Agenda crítica se receita < 70% da meta
if (indicators.estimated_revenue < indicators.revenue_goal * 0.7) { ... }
```

---

## 📱 RESPONSIVIDADE

- **Desktop:** Drawer fixo no lado direito (550px)
- **Tablet:** Drawer responsivo (430px)
- **Mobile:** Modal full-screen com backdrop

---

## 🧪 TESTE RÁPIDO

```jsx
// No console do navegador
import { generateEncaixeSuggestions } from "@/lib/agendaSuggestionsApi";

const suggestions = await generateEncaixeSuggestions(
  "clinic-uuid",
  "2026-01-14"
);
console.log(suggestions);
```

---

## 📝 TIPOS DE SUGESTÃO

### SLOT_LIVRE
Horário nobre disponível com profissional ocioso.

```
Mensagem: "Horário nobre disponível às 07:30 com Dr. João. 5 pacientes na espera."
Prioridade: ALTA
Ação: VER_LISTA_ESPERA
```

### NO_SHOW
Falta confirmada deixa slot disponível.

```
Mensagem: "Falta confirmada às 14:00. Dra. Maria terá horário livre. Procurar paciente na lista de espera?"
Prioridade: ALTA
Ação: VER_LISTA_ESPERA
```

### PROFISSIONAL_OCIOSO
Profissional com poucos atendimentos.

```
Mensagem: "Dr. João está sem atendimentos neste período. Oportunidade para encaixe."
Prioridade: MEDIA
Ação: CRIAR_ENCAIXE
```

### AGENDA_CRITICA
Ocupação ou receita abaixo de meta.

```
Mensagem: "Taxa de ocupação abaixo de 40% (25%). Há 8 pacientes na lista de espera."
Prioridade: ALTA/MEDIA
Ação: VER_LISTA_ESPERA ou OTIMIZAR_AGENDA
```

---

## ⚡ PERFORMANCE

- Sugestões geradas em tempo real (não persistidas)
- Cálculos otimizados com indexação
- Cache de indicadores (5 min)
- Máximo 5 sugestões por tipo para não sobrecarregar UI

---

## 🔄 FLUXO COMPLETO

```
1. Usuário abre Agenda
   ↓
2. Sistema carrega sugestões (generateEncaixeSuggestions)
   ├─ Busca appointments do dia
   ├─ Busca indicadores da clínica
   ├─ Busca lista de espera
   ├─ Busca configuração de horários nobres
   └─ Analisa e gera sugestões
   ↓
3. Exibe em drawer/cards com ícones e cores
   ↓
4. Usuário clica em ação (ex: "Ver Lista de Espera")
   ↓
5. Sistema registra em suggestion_audit_logs
   ↓
6. Callback dispara ação (abrir modal, criar formulário, etc)
   ↓
7. Após ação, recarrega sugestões (refresh)
```

---

## 🐛 TROUBLESHOOTING

### "Nenhuma sugestão aparece"
- Verificar se `clinicId` está correto
- Verificar se há indicadores calculados (RPC `get_agenda_indicators`)
- Verificar console para erros

### "Sugestões não atualizam após ação"
- Verificar se `refreshTrigger` está sendo incrementado
- Verificar se hook está observando `refreshTrigger`

### "Permissões negadas"
- Verificar role do usuário (recepcion/gestor/admin)
- Verificar RLS na tabela `suggestion_audit_logs`

---

## 📚 ARQUIVOS CRIADOS

```
src/
├── lib/
│   └── agendaSuggestionsApi.js        ← API de sugestões
├── pages/clinica/agenda/
│   ├── components/
│   │   ├── AgendaSuggestions.jsx       ← Componente principal
│   │   ├── SuggestionsDrawer.jsx       ← Drawer lateral
│   │   └── NobleHoursSettings.jsx      ← Configuração de horários
│   ├── hooks/
│   │   └── useAgendaSuggestions.js     ← Hook customizado
│   └── EXEMPLO_INTEGRACAO_SUGESTOES.jsx ← Exemplo completo
supabase/migrations/
└── 20260114_create_suggestion_audit_logs.sql ← Migration
```

---

## 🎯 PRÓXIMAS ITERAÇÕES

- [ ] Dashboard de sugestões aceitas/ignoradas (analytics)
- [ ] Machine Learning para aprender padrões do usuário
- [ ] Notificações push quando sugestão alta prioridade
- [ ] Integração com SMS/WhatsApp para contatar pacientes
- [ ] Previsão de receita baseada em sugestões executadas
- [ ] Teste A/B para diferentes mensagens

---

**Versão:** 1.0  
**Data:** 2026-01-14  
**Status:** ✅ Pronto para Produção
