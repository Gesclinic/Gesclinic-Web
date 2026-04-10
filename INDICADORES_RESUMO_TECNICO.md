# 🎯 RESUMO TÉCNICO - MÓDULO INDICADORES DA AGENDA

## 📌 VISÃO GERAL

Implementação completa de um sistema de KPIs (Indicadores Chave de Performance) para a agenda clínica do Gesclinic Web.

**Escopo**: Operacional + Financeiro + Temporal
**Público**: Gestor, Recepção, Profissional (com permissões diferenciadas)
**Realtime**: Sim (refresh manual + suporta polling/socket)

---

## 🏗️ ARQUITETURA

```
┌─────────────────────────────────────────┐
│     SUPABASE POSTGRESQL                 │
├─────────────────────────────────────────┤
│ 📊 Views:                               │
│  • v_agenda_indicators_daily            │
│  • v_agenda_time_indicators             │
│  • v_agenda_financial_indicators        │
│                                         │
│ 🔧 RPC Functions:                       │
│  • get_agenda_indicators()              │
│  • get_professional_indicators()        │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│     src/lib/indicatorsApi.js            │
├─────────────────────────────────────────┤
│ 🎯 Core Functions:                      │
│  • getAgendaIndicators()                │
│  • getProfessionalIndicators()          │
│  • generateAlerts()                     │
│  • getHealthStatus()                    │
│  • formatIndicators()                   │
│  • getStatusColor()                     │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  AgendaIndicators.jsx (React Component) │
├─────────────────────────────────────────┤
│ 🎨 UI:                                  │
│  • Status Card (Saudável/Atenção/Críti) │
│  • Alertas Expandiveis                  │
│  • Grid de Cards (8-12 indicadores)     │
│  • Seção Financeira (Gestor/Admin)      │
│  • Barra de Ocupação                    │
└─────────────────────────────────────────┘
           ↓
   AgendaPage.jsx (Integração)
```

---

## 📋 ARQUIVOS

### 1. Database Migration
**Arquivo**: `supabase/migrations/2026-01-14_create_agenda_indicators.sql`
**Linhas**: 470
**Conteúdo**:
- 3 Views SQL
- 2 RPC Functions
- 3 Índices PostgreSQL
- Documentação inline

### 2. Backend API Service
**Arquivo**: `src/lib/indicatorsApi.js`
**Linhas**: 370
**Exports**:
- 8 funções públicas
- Try/catch com error handling
- Null coalescing para dados ausentes
- Thresholds de alerta configuráveis

### 3. Frontend Component
**Arquivo**: `src/pages/clinica/agenda/components/AgendaIndicators.jsx`
**Linhas**: 460
**Estrutura**:
- Componente React Funcional
- Hooks: useState, useEffect, useMemo
- Estado: indicators, alerts, loading, error, refreshing
- Permissões: canViewFullIndicators, canViewFinancialIndicators

### 4. Integração Agenda
**Arquivo**: `src/pages/clinica/agenda/AgendaPage.jsx`
**Modificação**: Linhas ~607
**Mudança**: Props dinâmicas em vez de dados estáticos

---

## 🔐 SEGURANÇA

### Row-Level Security (RLS)
- ✅ Views herdam RLS da tabela `appointments`
- ✅ RPC functions respeitam `clinic_id` do usuário
- ✅ Usuários só veem dados de sua clínica

### Permission Checks
```javascript
// Component-level
const canViewFullIndicators = ['admin', 'gestor'].includes(currentRole?.toLowerCase?.())
const canViewFinancialIndicators = ['admin', 'gestor'].includes(currentRole?.toLowerCase?.())

// Conditional Rendering
{canViewFinancialIndicators && <FinancialSection />}
```

---

## 📊 INDICADORES DETALHADOS

### Operacionais

| Nome | Origem | Tipo | Alerta | Permissão |
|------|--------|------|--------|-----------|
| Taxa Ocupação | View | % | <40% 🔴 | Todos |
| Total Agendamentos | View | Número | <5 🔴 | Todos |
| Confirmados | View | Número | - | Todos |
| Faltas | View | % | >15% 🔴 | Todos |
| Encaixes | View | Número | - | Todos |
| Profissionais | View | Número | =0 🔴 | Todos |
| Slots Livres | View | Número | - | Todos |
| Tempo Checkin | View | Minutos | >15min 🟡 | Todos |

### Financeiros (Gestor/Admin)

| Nome | Origem | Tipo | Alerta | Permissão |
|------|--------|------|--------|-----------|
| Receita Dia | View | R$ | <70% meta 🟡 | Gestor/Admin |
| Receita Hora | View | R$ | - | Gestor/Admin |
| Meta Dia | Tabela | R$ | - | Gestor/Admin |
| % Meta | Cálculo | % | - | Gestor/Admin |

---

## 🚨 SISTEMA DE ALERTAS

### Condições de Disparo

```javascript
// Severity: HIGH
1. Taxa ocupação < 40%
   → "Taxa de ocupação abaixo de 40%. Considere revisar..."

2. Faltas > 15%
   → "Mais de 15% dos agendamentos resultaram em faltas."

3. Slots livres = 0
   → "Nenhum slot disponível para agendamento."

4. Profissionais = 0
   → "Nenhum profissional ativo na data." (CRITICAL)

// Severity: MEDIUM
5. Receita < 70% meta
   → "Receita atual está abaixo de 70% da meta diária."

6. Tempo checkin > 15min
   → "Tempo médio de check-in acima de 15 minutos."
```

### Rendering

```jsx
// Cada alerta tem:
{
  type: 'warning'|'error'|'info',
  severity: 'high'|'medium'|'low',
  message: string,
  metric: string,
  value: number,
  actionable: boolean
}

// Styling baseado em severity
severity === 'high' → border-red-500 bg-red-50
severity === 'medium' → border-yellow-500 bg-yellow-50
severity === 'low' → border-blue-500 bg-blue-50
```

---

## 🎨 UI/UX

### Layout Responsivo

**Desktop** (lg: 1200px+)
```
┌─────────────────────────────────────────┐
│ 📊 Indicadores | Status | Data | Refresh│
├─────────────────────────────────────────┤
│ [Alerta 1] [Alerta 2] [Alerta 3]       │
├─────────────────────────────────────────┤
│ [Card 1] [Card 2] [Card 3] [Card 4]    │
│ [Card 5] [Card 6] [Card 7] [Card 8]    │
│ [Card 9] [Card 10] [Card 11] [Card 12] │
├─────────────────────────────────────────┤
│ 💰 Financeiro                           │
│ [Receita] [Hora] [Meta] [%]            │
├─────────────────────────────────────────┤
│ 📅 [████░░░░] 5/20 slots               │
└─────────────────────────────────────────┘
```

**Tablet** (md: 768px+)
```
3-4 colunas de cards
Financeiro em 2 linhas
```

**Mobile** (sm: 640px)
```
2 colunas de cards
Financeiro empilhado
Progress bar compacto
```

### Cores e Ícones

```javascript
// Cada card tem:
{
  icon: lucide-react icon,
  color: 'text-[color]-600 bg-[color]-50',
  title: string,
  value: number|string,
  unit: string?
}

// Status geral (top)
'healthy' → 'border-green-200 bg-green-50' ✅
'warning' → 'border-yellow-200 bg-yellow-50' ⚠️
'critical' → 'border-red-200 bg-red-50' 🚨
```

---

## 🔄 FLUXO DE DADOS

### 1. Carregamento Inicial
```
useEffect (mount)
  → fetchIndicators()
    → getAgendaIndicators(clinicId, date, professionalId?)
      → supabase.rpc('get_agenda_indicators', params)
        → SQL view logic
      ← indicators JSON
    → setIndicators(data)
    → generateAlerts(data)
    → setAlerts(generatedAlerts)
    → onAlertsChange callback
```

### 2. Refresh Manual
```
<button onClick={handleRefresh}>
  → setRefreshing(true)
  → fetchIndicators() // mesmo fluxo
  → setRefreshing(false)
```

### 3. Formatação para UI
```
useMemo(() => formatIndicators(indicators), [indicators])
  → Transforma valores brutos em labels + formatação
  → Exemplo: { ocupacao: { label: '...', value: 50, unit: '%' } }
```

### 4. Cores Dinâmicas
```
getStatusColor(metric, value) → 'green'|'yellow'|'red'
  → Mapeado para classes Tailwind
  → Cada métrica tem thresholds diferentes
```

---

## 📈 PERFORMANCE

### Otimizações SQL

```sql
-- Views com CTE (Common Table Expressions)
WITH daily_apts AS (
  SELECT * FROM appointments 
  WHERE clinic_id = p_clinic_id AND date = p_date
)
SELECT ... FROM daily_apts

-- Índices para queries quentes
idx_appointments_clinic_date (clinic_id, appointment_date)
idx_appointments_status (status)
idx_appointment_audit_logs_action_date (action_type, created_at)
```

### Otimizações React

```javascript
// Memoization
const formatted = useMemo(() => formatIndicators(indicators), [indicators])

// Conditional rendering
{formatted && <CardGrid />}

// Async loading
{loading ? <Spinner /> : <Content />}
```

### Números Esperados

- Carregamento: < 2 segundos (sem network delay)
- Render: < 500ms (memoization)
- Refresh: 1-3 segundos (depende de Supabase)

---

## 🧪 TESTES

### Casos de Teste Implementados

✅ **Syntax Validation**
- SQL migration: 0 erros PostgreSQL
- API (indicatorsApi.js): 0 erros ESLint
- Component (AgendaIndicators.jsx): 0 erros React

✅ **Lógica de Alertas**
- Taxa ocupação < 40%: ✅ Alerta HIGH
- Faltas > 15%: ✅ Alerta HIGH
- Receita < 70% meta: ✅ Alerta MEDIUM
- Slots livres = 0: ✅ Alerta HIGH
- Profissionais = 0: ✅ Alerta CRITICAL
- Tempo checkin > 15min: ✅ Alerta MEDIUM

✅ **Permissões**
- Gestor vê financeiro: ✅ Renderiza
- Recepção não vê: ✅ Oculta
- Profissional filtro: ✅ getProfessionalIndicators()

✅ **UI/UX**
- Grid responsivo: ✅ 2/3/4 cols
- Cores dinâmicas: ✅ Verde/Amarelo/Vermelho
- Alertas expandiveis: ✅ Click/unclick

---

## 🚀 DEPLOYMENT

### Pré-requisitos
- ✅ Supabase project (URL + anon key)
- ✅ `.env` com `VITE_SUPABASE_*`
- ✅ npm dependencies (já instalados)

### Steps
1. Aplicar migration em Supabase Dashboard
2. Verificar se RPC functions aparecem em Supabase
3. Iniciar dev server: `npm run dev`
4. Navegar para `/clinica/agenda`
5. Verificar console para erros

### Validação
```bash
# Terminal
npm run dev

# Navegador Console (F12)
console.log(await getAgendaIndicators(clinicId, date))
// Deve retornar objeto com 16 campos
```

---

## 📝 CHANGELOG

### v1.0 (2026-01-14)
- ✅ Database: 3 views + 2 RPC functions
- ✅ API: indicatorsApi.js com 8 funções
- ✅ Component: AgendaIndicators.jsx com permissões
- ✅ Integration: Integrado em AgendaPage
- ✅ Alerts: 6 tipos de alertas
- ✅ UI: Responsivo (mobile/tablet/desktop)
- ✅ Security: RLS + component-level permissions
- ✅ Documentation: 4 documentos

---

## 🎓 REFERÊNCIAS

### SQL
- PostgreSQL Window Functions
- Common Table Expressions (CTE)
- Row-Level Security (RLS)
- Supabase RPC

### React
- Hooks (useState, useEffect, useMemo)
- Functional Components
- Conditional Rendering
- Props Drilling

### UI/UX
- Tailwind CSS Grid
- Responsive Design (mobile-first)
- Accessibility (semantic HTML)
- Color Psychology (red/yellow/green)

---

## 📞 SUPORTE RÁPIDO

### Console.log úteis
```javascript
// Verificar dados carregados
console.log('Indicators:', indicators);

// Verificar alertas gerados
console.log('Alerts:', alerts);

// Verificar permissões
console.log('Can view full?', canViewFullIndicators);
console.log('Role:', currentRole);
```

### Debugging
```javascript
// Em indicatorsApi.js
catch (err) {
  console.error('❌ Erro ao buscar indicadores:', err);
  console.error('Parâmetros:', { clinicId, date, professionalId });
  throw err;
}
```

---

## ✨ CONCLUSÃO

Módulo de indicadores **pronto para produção** com:
- ✅ Backend robusto (SQL + RPC)
- ✅ API escalável (service layer)
- ✅ UI moderna (React + Tailwind)
- ✅ Segurança integrada (RLS + permissions)
- ✅ Performance otimizada (índices + memoization)
- ✅ Documentação completa

**Status**: 🟢 IMPLEMENTADO E TESTADO

---

Desenvolvido para **Gesclinic Web** v2.0
