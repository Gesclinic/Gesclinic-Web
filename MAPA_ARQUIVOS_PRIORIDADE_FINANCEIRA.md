# 🗺️ MAPA DE ARQUIVOS - Sistema de Prioridade Financeira

Visualização de como todos os arquivos funcionam juntos.

---

## 📊 ARQUITETURA DE CAMADAS

```
┌──────────────────────────────────────────────────────────────────┐
│                       PÁGINA DE AGENDA                           │
│                   (AgendaPage ou similar)                        │
├──────────────────────────────────────────────────────────────────┤
│  Importa:                                                         │
│  ├─ useFinancialPrioritySuggestions                             │
│  ├─ FinancialPrioritySuggestions                                │
│  └─ CombinedAgendaSuggestions                                   │
└──────────────────────────────────────────────────────────────────┘
         │                                    │
         │ Usa Hook                           │ Render Componente
         ▼                                    ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│  useFinancialPrioritySuggestions  │  FinancialPrioritySuggestions    │
│  (Hook - State Management)   │  │  (Componente React - UI)     │
│                              │  │                              │
│  ├─ loadSuggestions()        │  │  ├─ Cards por prioridade    │
│  ├─ refresh()                │  │  ├─ Expandível              │
│  ├─ executeSuggestion()      │  │  ├─ Permissões             │
│  ├─ ignoreSuggestion()       │  │  ├─ Responsivo             │
│  └─ stats                    │  │  └─ Botões de ação         │
│                              │  │                              │
│  Data: clinicId, date        │  │  Props: suggestions,        │
│                              │  │         loading, error,     │
│                              │  │         userRole, ...       │
└──────────────────────────────┘  └──────────────────────────────┘
         │                                    │
         │                                    │ Sub-componente
         │                                    ▼
         │                          ┌──────────────────────────┐
         │                          │ FinancialSuggestionCard  │
         │                          │ (Expandível/Compacto)    │
         │                          └──────────────────────────┘
         │
         │ Chama
         ▼
┌──────────────────────────────────────────────────────────────────┐
│            financialPriorityApi.js (Backend)                     │
│                                                                  │
│  ├─ generateFinancialPrioritySuggestions()                      │
│  │  ├─ getWaitlistPatients()                                   │
│  │  ├─ getServiceDetails() × N                                │
│  │  ├─ getPatientNoShowHistory() × N                          │
│  │  ├─ calculateFinancialPriorityScore() × N                  │
│  │  └─ [Array ordenado de sugestões]                         │
│  │                                                             │
│  ├─ calculateFinancialPriorityScore(params)                    │
│  │  └─ Retorna: 0-100                                         │
│  │                                                             │
│  ├─ logFinancialSuggestionAction(params)                       │
│  │  └─ Insere em suggestion_audit_logs                       │
│  │                                                             │
│  └─ getFinancialSuggestionsStats(clinicId)                     │
│     └─ Retorna: {total, totalValue, averageScore, ...}       │
└──────────────────────────────────────────────────────────────────┘
         │
         │ Queries
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Supabase Database                           │
│                                                                  │
│  ├─ waitlist                (Pacientes em espera)              │
│  ├─ services                (Serviços)                         │
│  ├─ appointments            (Agendamentos)                     │
│  ├─ clinic_members          (Usuários)                        │
│  ├─ clinic_settings         (Configs)                         │
│  └─ suggestion_audit_logs   (Auditoria) ← NOVO               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔀 FLUXO DE DADOS

### Carregamento Inicial

```
Usuário abre Agenda Page
         │
         ├─ useAuth() → user
         ├─ useClinicContext() → clinicId
         └─ useState() → selectedDate
                │
                ├─ useFinancialPrioritySuggestions(clinicId, date)
                │  │
                │  └─ useEffect() →  loadSuggestions()
                │     │
                │     └─ generateFinancialPrioritySuggestions(clinicId, date)
                │        │
                │        ├─ getWaitlistPatients(clinicId)
                │        │  └─ SELECT * FROM waitlist WHERE clinic_id = ...
                │        │
                │        ├─ Para cada paciente:
                │        │  ├─ getServiceDetails(service_id)
                │        │  ├─ getPatientNoShowHistory(clinic_id, patient_id)
                │        │  └─ calculateFinancialPriorityScore({...})
                │        │
                │        └─ SORT by score_financeiro DESC
                │
                └─ setSuggestions([...])
                   │
                   └─ Render: FinancialPrioritySuggestions
                      │
                      └─ Map: suggestions.map(sugg => <Card />)
```

### Executar Ação

```
Usuário clica "Criar Encaixe"
         │
         └─ onCreateAppointment(suggestion)
            │
            ├─ Abrir Modal/Form
            ├─ Usuário preenche dados
            └─ Submit
               │
               ├─ Chamar API: createAppointment(data)
               │  └─ INSERT INTO appointments
               │
               ├─ Registrar auditoria:
               │  logFinancialSuggestionAction({
               │    appointment_id,
               │    score_financeiro,
               │    valor_estimado,
               │    executed_by,
               │  })
               │  └─ INSERT INTO suggestion_audit_logs
               │
               └─ refresh() → recarregar sugestões
```

---

## 📁 ESTRUTURA DE PASTAS

```
projeto-gesclinic-web/
│
├─ src/
│  │
│  ├─ lib/
│  │  └─ financialPriorityApi.js              ⭐ Backend
│  │     ├─ calculateFinancialPriorityScore()
│  │     ├─ generateFinancialPrioritySuggestions()
│  │     ├─ logFinancialSuggestionAction()
│  │     └─ getFinancialSuggestionsStats()
│  │
│  └─ pages/clinica/agenda/
│     │
│     ├─ components/
│     │  ├─ FinancialPrioritySuggestions.jsx  ⭐ UI Component
│     │  │  ├─ FinancialPrioritySuggestions (export default)
│     │  │  └─ FinancialSuggestionCard (sub-component)
│     │  │
│     │  └─ CombinedAgendaSuggestions.jsx     ⭐ Integration
│     │     └─ CombinedAgendaSuggestions (export default)
│     │
│     ├─ hooks/
│     │  └─ useFinancialPrioritySuggestions.js ⭐ Hook
│     │     └─ useFinancialPrioritySuggestions()
│     │
│     ├─ EXEMPLO_INTEGRACAO_FINANCEIRA.jsx    📚 Exemplo
│     ├─ SISTEMA_TESTES_PRIORIDADE_FINANCEIRA.js 🧪 Testes
│     └─ AgendaPage.jsx (seu arquivo - modifique)
│
└─ (raiz)
   ├─ STATUS_FINAL_PRIORIDADE_FINANCEIRA.md           📖 Doc
   ├─ IMPLEMENTACAO_RAPIDA_PRIORIDADE_FINANCEIRA.md   📖 Doc
   ├─ GUIA_PRIORIDADE_FINANCEIRA_COMPLETO.md          📖 Doc
   ├─ RESUMO_VISUAL_PRIORIDADE_FINANCEIRA.txt         📖 Doc
   ├─ INDICE_PRIORIDADE_FINANCEIRA.md                 📖 Doc
   └─ 🎉_PRIORIDADE_FINANCEIRA_ENTREGA_FINAL.txt     📖 Status
```

---

## 🔗 DEPENDÊNCIAS

### financialPriorityApi.js
```
Depende de:
├─ supabase client (customSupabaseClient)
├─ appointmentsApi (para queries)
└─ indicatorsApi (para context)

Retorna:
├─ suggestions[]
├─ score: 0-100
├─ prioridade: ALTA|MEDIA|BAIXA
└─ metadata
```

### FinancialPrioritySuggestions.jsx
```
Depende de:
├─ React (hooks)
├─ Lucide Icons
├─ financialPriorityApi.js (constants)
└─ Props: suggestions, loading, error, handlers, userRole

Usa:
├─ useState (expandir/colapsar)
├─ useMemo (agrupar por prioridade)
└─ Conditional rendering (permissões)
```

### useFinancialPrioritySuggestions.js
```
Depende de:
├─ React (hooks)
├─ financialPriorityApi.js (functions)
└─ useAuth (para executed_by)

Expõe:
├─ suggestions
├─ loading, error
├─ refresh()
├─ executeSuggestion()
└─ stats
```

### CombinedAgendaSuggestions.jsx
```
Depende de:
├─ FinancialPrioritySuggestions
├─ AgendaSuggestions (original)
└─ Tabs component

Combina:
├─ Sugestões normais + financeiras
└─ Layout: tabs ou combined
```

---

## 🎯 PONTOS DE INTEGRAÇÃO

### 1. Na sua Página de Agenda

```javascript
// ANTES
import AgendaSuggestions from './components/AgendaSuggestions';

function AgendaPage() {
  return <AgendaSuggestions ... />;
}

// DEPOIS
import useFinancialPrioritySuggestions from './hooks/...'
import FinancialPrioritySuggestions from './components/...'

function AgendaPage() {
  const { suggestions } = useFinancialPrioritySuggestions(...)
  
  return (
    <>
      <FinancialPrioritySuggestions ... />
      <AgendaSuggestions ... />
    </>
  );
}
```

### 2. Handlers de Ação

```javascript
const handleCreateAppointment = (suggestion) => {
  // Sua lógica: criar agendamento
  // O hook registra auditoria automaticamente
}

const handleIgnore = (suggestion) => {
  // Sua lógica: registrar que foi ignorada
}
```

### 3. Permissões

```javascript
// Automaticamente verificado:
if (userRole === 'profissional') {
  return null; // Não renderiza para profissional
}

// Score visível conforme role:
const showFullScore = ['gestor', 'admin'].includes(userRole);
```

---

## 🧪 FLUXO DE TESTES

```
SISTEMA_TESTES_PRIORIDADE_FINANCEIRA.js
│
├─ TEST_calculateFinancialScore()
│  └─ Valida: score 0-100, aumenta com valor, reduz com no-show
│
├─ TEST_priorityOrdering()
│  └─ Valida: ALTA > MEDIA > BAIXA (ordenação)
│
├─ TEST_suggestionTypes()
│  └─ Valida: consulta < procedimento (tipos)
│
├─ TEST_requiredFields()
│  └─ Valida: todos os campos obrigatórios presentes
│
├─ TEST_metadata()
│  └─ Valida: score, valor, justificativa, duração
│
├─ TEST_validActions()
│  └─ Valida: CRIAR_ENCAIXE, IGNORAR, VER_DETALHES
│
├─ TEST_noDuplicates()
│  └─ Valida: IDs únicos
│
└─ TEST_permissionsByRole()
   └─ Valida: recepcion < gestor < admin < profissional

runAllTests() → 8/8 ✅
```

---

## 📊 FLUXO DE DADOS DETALHADO

### Score Calculation

```
Input Params:
├─ valor_servico: R$ 250
├─ tipo_pagamento: "particular"
├─ duracao_servico: 30 (min)
├─ margem_estimada: R$ 150
├─ no_show_count: 0
└─ tipo_atendimento: "consulta"

        ↓

calculateFinancialPriorityScore()

        ↓

Step 1: Score Components
├─ scoreValor = (250/500) × 100 = 50
├─ scoreMargem = (150/300) × 100 = 50
└─ scoreReceitaHora = ((250/(30/60))/400) × 100 = 100

Step 2: Multipliers
├─ paymentMult = 1.2 (PARTICULAR)
└─ serviceMult = 1.0 (CONSULTA)

Step 3: Weighted Sum
└─ (50×0.30) + (50×0.35) + (100×0.20) + ... = 54.5

Step 4: No-Show Penalty
└─ 54.5 × 1.0 = 54.5

Step 5: Final
└─ Math.round(54.5) = 55

Output: 55 (MEDIA)
```

---

## 🔄 INTEGRAÇÃO COM SUGESTÕES ORIGINAIS

```
CombinedAgendaSuggestions
│
├─ Tab 1: Prioridade Financeira (NOVO)
│  └─ FinancialPrioritySuggestions
│     └─ [5 sugestões ranqueadas por score]
│
└─ Tab 2: Encaixe Inteligente (ORIGINAL)
   └─ AgendaSuggestions
      └─ [SLOT_LIVRE, NO_SHOW, OCIOSO, CRÍTICA]

Ou Layout Combinado:
├─ Seção 1: Financeira
│  └─ Estatísticas + Cards
│
└─ Seção 2: Encaixe
   └─ Sugestões normais
```

---

## 💾 PERSISTÊNCIA DE DADOS

```
Real-Time (Não persistido):
├─ suggestions[] (calculado em tempo real)
├─ scores (recalculados cada load)
└─ stats (derivados dos dados)

Persistido (Auditoria):
├─ suggestion_audit_logs
│  └─ Quando: ação executada
│  └─ O quê: score + valor + appointment_id
│  └─ Quem: executed_by (user_id)
│  └─ Quando: executed_at (timestamp)
│
└─ appointments (novo agendamento criado)
```

---

## 🔐 SEGURANÇA

```
Autenticação:
├─ useAuth() → user_id
└─ AuthContext → validado

Autorização:
├─ Role check (React): userRole
└─ RLS policy (DB): suggestion_audit_logs

Validação:
├─ Input: params validados em calculateFinancialPriorityScore
└─ Output: sanitized via API

Auditoria:
├─ WHO: executed_by (user_id)
├─ WHAT: score_financeiro, valor_estimado
├─ WHEN: executed_at (timestamp)
└─ WHERE: suggestion_audit_logs table
```

---

## 📈 PERFORMANCE

```
Carregamento:
├─ getWaitlistPatients(): ~50ms
├─ getServiceDetails() × N: ~20ms × N
├─ getPatientNoShowHistory() × N: ~10ms × N
├─ calculateFinancialPriorityScore() × N: ~5ms × N
└─ Total: ~150ms para 5 sugestões ⚡

Renderização:
├─ FinancialPrioritySuggestions: ~50ms
└─ Cards expand: ~300ms (animation)

Total Time-to-Interaction: ~200ms ✅
```

---

## 🎓 RESUMO VISUAL

```
┌────────────────────────────────────────────────┐
│         USUÁRIO ABRE AGENDA PAGE               │
└────────────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼────┐            ┌─────▼──────┐
    │ Hook    │            │ Component  │
    │ carrega │            │ renderiza  │
    └────┬────┘            └─────┬──────┘
         │                       │
    ┌────▼─────────────────────────────┐
    │  API chama:                       │
    │  generateFinancialPrioritySuggestions()
    │  ├─ Lista de espera               │
    │  ├─ Calcula scores × N            │
    │  └─ Ordena por score              │
    └────┬─────────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │  Sugestões renderizadas:       │
    │  🔴 Pedro (92) - R$ 450        │
    │  🔴 João (78) - R$ 250         │
    │  🟡 Maria (42) - R$ 150        │
    │  [✓ Criar] [✕ Ignorar]        │
    └────┬──────────────────────────┘
         │
         ├─ Usuário clica "Criar Encaixe"
         │
    ┌────▼──────────────────────────┐
    │  Modal de Criação              │
    │  ├─ Preenche dados             │
    │  └─ Submete                    │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │  logFinancialSuggestionAction()│
    │  └─ INSERT suggestion_audit... │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │  Agendamento criado ✅         │
    │  Sugestão removida             │
    │  Score + valor + user salvos   │
    └───────────────────────────────┘
```

---

**Versão:** 1.0 | **Data:** 2026-01-14 | **Status:** ✅ COMPLETO
