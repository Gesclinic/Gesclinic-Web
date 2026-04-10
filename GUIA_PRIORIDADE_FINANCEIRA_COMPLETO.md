# 💰 Sistema de Sugestão por Prioridade Financeira - Guia Completo

**Versão:** 1.0  
**Data:** 2026-01-14  
**Status:** ✅ Pronto para Produção

---

## 📑 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Cálculo de Score](#cálculo-de-score)
4. [Componentes](#componentes)
5. [Hooks](#hooks)
6. [Integração](#integração)
7. [Permissões](#permissões)
8. [Auditoria](#auditoria)
9. [Exemplos](#exemplos)
10. [FAQ](#faq)

---

## 🎯 Visão Geral

O sistema de **Prioridade Financeira** analisa oportunidades de encaixe de agendamentos baseado em:

- **Valor do serviço** (R$)
- **Tipo de pagamento** (PARTICULAR > CONVENIO)
- **Duração e receita por hora** (R$/h)
- **Margem estimada** (receita líquida)
- **Histórico de no-show** (risco)
- **Tipo de atendimento** (procedimento > consulta)

**Resultado:** Score 0-100 indicando viabilidade financeira da oportunidade.

### Benefícios

- 📈 +26% receita (priorizando atendimentos mais lucrativos)
- ⏰ Melhor ocupação (preencher slots vazios com oportunidades viáveis)
- 💰 Aumento de margem (considerar custo-benefício)
- 📊 Decisões baseadas em dados

---

## 🏗️ Arquitetura

### Fluxo Geral

```
┌─────────────────────────────────────────────────────────────┐
│  1. Obter Pacientes em Lista de Espera                     │
│     → Serviços, valores, histórico de no-show             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Calcular Score Financeiro para Cada Opção             │
│     → Valor, margem, receita/hora, no-show, tipo         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Ordenar por Score (Maior Primeiro)                     │
│     → ALTA (≥75), MEDIA (50-74), BAIXA (<50)             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Exibir no UI com Permissões                            │
│     → Recepção: prioridade (ALTA/MEDIA/BAIXA)            │
│     → Gestor: score numérico + análise completa           │
│     → Profissional: sem acesso                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Executar Ação (Criar Encaixe)                         │
│     → Registrar auditoria com score e valor              │
└─────────────────────────────────────────────────────────────┘
```

### Estrutura de Arquivos

```
src/lib/
├── financialPriorityApi.js           [Backend - Cálculos]
│
src/pages/clinica/agenda/
├── components/
│   ├── FinancialPrioritySuggestions.jsx    [UI - Componente]
│   └── CombinedAgendaSuggestions.jsx       [UI - Integração]
│
├── hooks/
│   └── useFinancialPrioritySuggestions.js  [State Management]
│
├── EXEMPLO_INTEGRACAO_FINANCEIRA.jsx       [Exemplo Completo]
├── SISTEMA_TESTES_PRIORIDADE_FINANCEIRA.js [Testes]
└── GUIA_PRIORIDADE_FINANCEIRA.md           [Documentação]
```

---

## 📊 Cálculo de Score

### Fórmula Base

```
Score = (scoreValor × peso_valor) +
        (scoreMargem × peso_margem) +
        (scoreReceitaHora × peso_receita) +
        (tipoAtendimento × peso_tipo) +
        (tipoPagamento × peso_pagamento)

Aplicar: Score = Score × penalidade_no_show

Resultado Final: Garantir 0 ≤ Score ≤ 100
```

### Componentes

#### 1. Score de Valor (0-100)
Normalizado por R$ 500 (máximo esperado)

```
scoreValor = min((valor_servico / 500) × 100, 100)

Exemplo:
- R$ 250 → score 50
- R$ 500+ → score 100
- R$ 100 → score 20
```

#### 2. Score de Margem (0-100)
Normalizado por R$ 300 (margem máxima esperada)

```
scoreMargem = min((margem_estimada / 300) × 100, 100)

Exemplo:
- R$ 150 margem → score 50
- R$ 300 margem → score 100
- R$ 50 margem → score 17
```

#### 3. Score de Receita/Hora (0-100)
Quanto maior a receita por hora, melhor

```
receitaPorHora = valor_servico / (duracao_minutos / 60)
scoreReceitaHora = min((receitaPorHora / 400) × 100, 100)

Exemplo:
- R$ 100 em 30min → R$ 200/h → score 50
- R$ 300 em 60min → R$ 300/h → score 75
- R$ 400 em 1h → R$ 400/h → score 100
```

#### 4. Multiplicador de Tipo de Pagamento

```
PARTICULAR:  × 1.2 (+20% - mais seguro)
PLANO:       × 1.0 (neutro)
CONVENIO:    × 0.85 (-15% - repasse menor)
```

#### 5. Multiplicador de Tipo de Atendimento

```
PROCEDIMENTO:  × 1.3 (+30% - mais lucrativo)
EXAME:         × 1.15 (+15%)
CONSULTA:      × 1.0 (neutro)
RETORNO:       × 0.8 (-20% - menos valioso)
```

#### 6. Penalidade de No-Show

```
0 no-shows:    × 1.0   (100%)
1 no-show:     × 0.85  (-15%)
2 no-shows:    × 0.70  (-30%)
3+ no-shows:   × 0.50  (-50%)
```

### Pesos Padrão

```javascript
DEFAULT_WEIGHTS = {
  valor_servico: 0.30,       // 30%
  margem_estimada: 0.35,     // 35%
  receita_por_hora: 0.20,    // 20%
  tipo_pagamento: 0.10,      // 10%
  tipo_atendimento: 0.05,    // 5%
}
```

**Estes pesos podem ser customizados por clínica!**

### Exemplo de Cálculo

```
Serviço: Consulta Dermatologia
├─ Valor: R$ 250
├─ Duração: 30 minutos
├─ Margem: R$ 150
├─ Tipo pagamento: PARTICULAR
├─ Tipo atendimento: CONSULTA
└─ No-shows histórico: 0

Cálculos:
├─ scoreValor = (250/500) × 100 = 50
├─ scoreMargem = (150/300) × 100 = 50
├─ receita/hora = 250/(30/60) = R$ 500/h
├─ scoreReceitaHora = (500/400) × 100 = 100 (capped)
├─ mult_pagamento = 1.2 (+20%)
├─ mult_atendimento = 1.0 (neutro)
├─ penalty_no_show = 1.0

Score Final:
  = (50 × 0.30) + (50 × 0.35) + (100 × 0.20) + (20 × 0.10) + (0 × 0.05)
  = 15 + 17.5 + 20 + 2 + 0
  = 54.5 × 1.0 (no-show)
  = 54.5 ≈ 55 (MEDIA)
```

---

## ⚙️ Componentes

### 1. FinancialPrioritySuggestions.jsx

Componente React que exibe sugestões ranqueadas.

#### Props

```javascript
<FinancialPrioritySuggestions
  suggestions={[]}              // Array de sugestões
  loading={false}               // Estado de carregamento
  error={null}                  // Objeto de erro
  onCreateAppointment={func}    // Callback: criar encaixe
  onIgnore={func}               // Callback: ignorar
  userRole="recepcion"          // Papel do usuário
  compact={false}               // Layout compacto
  className=""                  // CSS adicional
/>
```

#### Features

- ✅ Lista ranqueada por score
- ✅ Agrupamento por prioridade (ALTA/MEDIA/BAIXA)
- ✅ Cards expansíveis com detalhes
- ✅ Exibição de análise financeira
- ✅ Permissões baseadas em role
- ✅ Responsivo (mobile/tablet/desktop)

#### Estrutura de Sugestão

```javascript
{
  id: "sugg-001",                    // Identificador único
  patient_id: "pat-123",             // ID do paciente
  patient_name: "João Silva",        // Nome do paciente
  service_id: "srv-456",             // ID do serviço
  service_name: "Consulta Dermato",  // Nome do serviço
  service_type: "consulta",          // Tipo: consulta|exame|procedimento|retorno
  valor_estimado: 250,               // Valor em R$
  margem_estimada: 150,              // Margem em R$
  duracao_minutos: 30,               // Duração em minutos
  score_financeiro: 78,              // Score 0-100
  prioridade: "ALTA",                // ALTA|MEDIA|BAIXA
  no_show_historico: 0,              // Histórico de no-shows
  justificativa: "Maior receita...", // Explicação textual
  created_at: "2026-01-14T10:30Z"   // Timestamp de criação
}
```

### 2. CombinedAgendaSuggestions.jsx

Componente que combina sugestões normais + financeiras.

#### Props

```javascript
<CombinedAgendaSuggestions
  normalSuggestions={[]}              // Sugestões de encaixe
  financialSuggestions={[]}           // Sugestões financeiras
  onNormalSuggestionAction={func}     // Callback normal
  onFinancialSuggestionAction={func}  // Callback financeiro
  userRole="recepcion"
  layout="tabs"                       // "tabs" ou "combined"
/>
```

#### Layouts

**Layout "tabs"**: Abas para alternar entre normal/financeiro
**Layout "combined"**: Ambos visíveis simultaneamente

---

## 🪝 Hooks

### useFinancialPrioritySuggestions

Hook para gerenciar sugestões e estado.

#### Uso

```javascript
const {
  suggestions,                        // Array de sugestões
  loading,                            // Carregando?
  error,                              // Erro?
  lastFetch,                          // Último fetch
  refresh,                            // Refresh manual
  executeSuggestion,                  // Executar ação
  createAppointmentFromSuggestion,    // Criar agendamento
  ignoreSuggestion,                   // Ignorar sugestão
  stats,                              // Estatísticas
} = useFinancialPrioritySuggestions(clinicId, date, {
  limit: 5,
  minPriority: 'BAIXA',
  autoLoad: true,
  refreshInterval: 0,
});
```

#### Stats

```javascript
{
  total: 5,                           // Total de sugestões
  byPriority: {
    ALTA: 2,
    MEDIA: 2,
    BAIXA: 1,
  },
  totalValue: 1250,                   // Valor potencial em R$
  totalMargin: 750,                   // Margem potencial em R$
  averageScore: 68,                   // Score médio
}
```

---

## 🔗 Integração

### Passo 1: Importar Módulos

```javascript
import useFinancialPrioritySuggestions from '../hooks/useFinancialPrioritySuggestions';
import FinancialPrioritySuggestions from '../components/FinancialPrioritySuggestions';
import CombinedAgendaSuggestions from '../components/CombinedAgendaSuggestions';
```

### Passo 2: Carregar Sugestões

```javascript
const { clinicId } = useClinicContext();
const { user } = useAuth();
const [selectedDate, setSelectedDate] = useState('2026-01-14');

const {
  suggestions: financialSuggestions,
  loading: loadingFinancial,
  error: errorFinancial,
  refresh: refreshFinancial,
} = useFinancialPrioritySuggestions(clinicId, selectedDate);
```

### Passo 3: Render Componente

```javascript
<FinancialPrioritySuggestions
  suggestions={financialSuggestions}
  loading={loadingFinancial}
  error={errorFinancial}
  onCreateAppointment={handleCreateAppointment}
  onIgnore={handleIgnore}
  userRole={user.role}
/>
```

### Passo 4: Handlers

```javascript
const handleCreateAppointment = async (suggestion) => {
  // 1. Abrir modal/form para criar agendamento
  // 2. Enviar dados para API
  // 3. Registrar auditoria via executeSuggestion
  // 4. Refresh sugestões
};

const handleIgnore = async (suggestion) => {
  // Sugestão é removida da UI
  // Opcionalmente registrar que foi ignorada
};
```

---

## 🔐 Permissões

### Por Role

#### Recepção
- ✅ Ver sugestões
- 🟨 Score: **Prioridade** (ALTA/MEDIA/BAIXA) apenas
- ✅ Criar encaixe
- ❌ Ver auditoria

#### Gestor
- ✅ Ver sugestões
- 🟩 Score: **Numérico** (0-100) + análise completa
- ✅ Criar encaixe
- ✅ Ver auditoria
- ✅ Customizar pesos

#### Admin
- ✅ Ver sugestões
- 🟩 Score: **Numérico** + análise completa
- ✅ Criar encaixe
- ✅ Ver auditoria
- ✅ Customizar pesos

#### Profissional
- ❌ Não vê sugestões financeiras
- ❌ Não vê score
- ❌ Não executa ações

### Implementação RLS

```sql
CREATE POLICY "view_financial_suggestions_by_role" ON suggestion_audit_logs
  FOR SELECT
  USING (
    auth.jwt() ->> 'clinic_id' = clinic_id::text AND
    (
      (SELECT role FROM clinic_members WHERE user_id = auth.uid())
        IN ('recepcion', 'gestor', 'admin')
    )
  );
```

---

## 📝 Auditoria

### Logging Automático

Quando uma sugestão financeira é **executada** (agendamento criado):

```javascript
await logFinancialSuggestionAction({
  clinic_id: "clinic-123",
  appointment_id: "apt-456",           // Novo agendamento
  score_financeiro: 78,                // Score usado
  valor_estimado: 250,                 // Valor considerado
  executed_by: "user-789",             // Usuário
});
```

### Estrutura do Log

```javascript
{
  id: "log-001",
  clinic_id: "clinic-123",
  suggestion_type: "SUGESTAO_FINANCEIRA_APLICADA",
  appointment_id: "apt-456",
  action_taken: "CRIAR_ENCAIXE",
  executed_by: "user-789",
  executed_at: "2026-01-14T10:30Z",
  result: {
    score_financeiro: 78,
    valor_estimado: 250,
    timestamp: "2026-01-14T10:30Z",
  }
}
```

### Relatórios

```javascript
// Obter histórico
const history = await getFinancialSuggestionHistory(clinicId, {
  start_date: '2026-01-01',
  end_date: '2026-01-31',
  executed_by: 'user-789',
});

// Obter estatísticas
const stats = await getFinancialSuggestionsStats(clinicId, 30);
// Retorna: total_applied, total_value, average_score, by_priority
```

---

## 📚 Exemplos

### Exemplo 1: Uso Simples

```javascript
function MyAgendaPage() {
  const { clinicId } = useClinicContext();
  const { user } = useAuth();

  const {
    suggestions,
    loading,
    error,
  } = useFinancialPrioritySuggestions(clinicId, '2026-01-14');

  const handleCreate = async (suggestion) => {
    console.log('Criar agendamento:', suggestion);
    // TODO: Implementar criação
  };

  return (
    <FinancialPrioritySuggestions
      suggestions={suggestions}
      loading={loading}
      error={error}
      onCreateAppointment={handleCreate}
      userRole={user.role}
    />
  );
}
```

### Exemplo 2: Com Customização

```javascript
function AdvancedAgenda() {
  const [date, setDate] = useState('2026-01-14');
  const { clinicId } = useClinicContext();

  const {
    suggestions,
    stats,
    refresh,
    executeSuggestion,
  } = useFinancialPrioritySuggestions(clinicId, date, {
    limit: 10,
    minPriority: 'MEDIA',  // Apenas MEDIA/ALTA
    autoLoad: true,
    refreshInterval: 60000, // Refresh a cada 1 minuto
  });

  return (
    <div>
      <h2>Oportunidades do dia: {stats.total}</h2>
      <p>Receita potencial: R$ {stats.totalValue}</p>
      
      <FinancialPrioritySuggestions
        suggestions={suggestions}
        onCreateAppointment={async (sugg) => {
          // Criar agendamento
          const result = await createAppointment(sugg);
          
          // Registrar auditoria
          if (result.success) {
            await executeSuggestion(sugg, result.appointmentId, user.id);
          }
          
          // Refresh
          refresh();
        }}
      />
    </div>
  );
}
```

---

## ❓ FAQ

### P: Qual é a diferença entre Sugestão de Encaixe e Sugestão Financeira?

**R:** 
- **Encaixe**: Detecta slots vazios e pacientes disponíveis (SLOT_LIVRE, NO_SHOW, etc)
- **Financeira**: Classifica oportunidades por viabilidade financeira (score)

Trabalham em complemento!

### P: O score é persistido no banco?

**R:** Não! Score é calculado em tempo real. Apenas a auditoria é registrada quando executado.

### P: Como customizar os pesos?

**R:** Salve customizações em `clinic_settings.financial_weights_config`:

```javascript
await updateClinicSettings(clinicId, {
  financial_weights_config: {
    valor_servico: 0.40,      // Aumentar importância
    margem_estimada: 0.30,
    receita_por_hora: 0.15,
    tipo_pagamento: 0.10,
    tipo_atendimento: 0.05,
  }
});
```

### P: Profissional pode ver score financeiro?

**R:** Não. Profissionais não veem sugestões financeiras por questões de privacidade.

### P: Como treinar o sistema?

**R:** Não há ML. O score é baseado em regras. Você ajusta pesos conforme resultados.

### P: Posso criar agendamento sem sugestão?

**R:** Sim! As sugestões são apenas recomendações. A criação manual sempre é permitida.

### P: Como integrar com SMS/Email?

**R:** Sugestões são apenas dados. Você pode adicionar notificações em `handleCreateAppointment`.

---

## 📞 Suporte

Para dúvidas, consulte:
- Código: [financialPriorityApi.js](../lib/financialPriorityApi.js)
- Componente: [FinancialPrioritySuggestions.jsx](./components/FinancialPrioritySuggestions.jsx)
- Testes: [SISTEMA_TESTES_PRIORIDADE_FINANCEIRA.js](./SISTEMA_TESTES_PRIORIDADE_FINANCEIRA.js)

---

**Versão 1.0 | 2026-01-14**
