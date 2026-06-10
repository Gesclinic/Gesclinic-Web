# 💰 Módulo: Fluxo de Caixa (Cash Flow)

## 📋 Visão Geral

O módulo **Fluxo de Caixa** do Gesclinic fornece uma visão completa e integrada do fluxo de dinheiro da clínica, combinando:

- **Realizado**: Transações já processadas/pagas
- **Previsto**: Transações agendadas/pendentes
- **Projetado**: Previsão futura baseada em histórico

## 🏗️ Arquitetura

```
src/modules/financeiro/fluxo-caixa/
├── components/              # Componentes React
│   ├── CashFlowDashboard    # Dashboard principal
│   ├── CashFlowChart        # Gráficos (linha, barra, pizza)
│   ├── CashFlowFilters      # Painel de filtros
│   ├── LiquidityIndicator   # Indicador de saúde
│   └── index.ts             # Exports
├── hooks/                   # Hooks customizados
│   └── useCashFlow.ts       # State management + cálculos
├── services/                # API layer
│   └── cashFlowApi.ts       # Integração com Supabase
├── types/                   # TypeScript types
│   └── index.ts             # 28+ interfaces
├── utils/                   # Funções auxiliares
│   └── calculations.ts      # Formatação, cálculos
├── pages/                   # Páginas
│   └── index.tsx            # Página principal
└── README.md                # Este arquivo
```

## 📊 Componentes Principais

### CashFlowDashboard
Dashboard central que mostra:
- Saldo atual com tendência
- Entradas e saídas de hoje
- Projeção para 30 dias
- Alertas automáticos
- Gráficos de projeção
- Indicador de liquidez
- Tabela de detalhes por conta

**Props:**
```typescript
{
  className?: string;
}
```

### CashFlowChart
Gráficos reutilizáveis com Recharts

**Tipos suportados:**
- `'line'` - Linha temporal (saldo realizado vs projetado)
- `'bar'` - Barras de entradas/saídas
- `'pie'` - Distribuição por categoria

**Props:**
```typescript
{
  data: any[];
  type: 'line' | 'bar' | 'pie';
  title?: string;
  dataKey?: string;
  className?: string;
}
```

### CashFlowFilters
Painel de filtros com:
- Seleção de período (dia, semana, mês, ano)
- Datas customizáveis
- Botão limpar

**Props:**
```typescript
{
  filters: CashFlowFilters;
  onFiltersChange: (filters: CashFlowFilters) => void;
}
```

### LiquidityIndicator
Indicador visual de saúde do caixa

**Estados:**
- 🟢 **Saudável** (Healthy): Saldo > receita esperada
- 🟡 **Atenção** (Warning): Baixa liquidez
- 🔴 **Crítico** (Critical): Risco de saldo negativo

## 🎣 Hooks

### useCashFlow()
Gerencia estado global de fluxo de caixa

**Retorna:**
```typescript
{
  snapshots: CashFlowSnapshot[];
  predictions: CashFlowPrediction[];
  alerts: CashFlowAlert[];
  metrics: DashboardMetrics;
  loading: boolean;
  error?: string;
  filters: CashFlowFilters;
  selectedPeriod: 'daily' | 'weekly' | 'monthly' | 'yearly';
  lastRefresh: string;
  loadCashFlowData: (filters?: CashFlowFilters) => Promise<void>;
  updateFilters: (filters: CashFlowFilters) => void;
  setPeriod: (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => void;
  selectAccount: (accountId?: string) => void;
}
```

**Auto-refresh:** A cada 5 minutos

### useCashFlowMetrics(metrics, snapshots)
Calcula métricas memoizadas

**Retorna:**
```typescript
{
  cashHealth: 'healthy' | 'warning' | 'critical';
  isHealthy: boolean;
  isWarning: boolean;
  isCritical: boolean;
  currentBalance: number;
  balanceChange: number;
  todayIncome: number;
  todayExpense: number;
  todayNet: number;
  projectedBalance7d: number;
  projectedBalance30d: number;
  dailyRate: number;
  runwayDays?: number;
}
```

### useCashFlowProjection(metrics, days?)
Gera array de projeção futura

**Retorna:**
```typescript
Array<{
  date: string;     // YYYY-MM-DD
  balance: number;
  isNegative: boolean;
}>
```

### useCashFlowAlerts(metrics)
Auto-gera alertas baseado em regras

**Tipos de alerta:**
1. `negative_balance` - Saldo negativo projetado
2. `low_liquidity` - Liquidez insuficiente
3. `excess_expenses` - Despesas muito altas
4. `accounts_payable` - Contas pagar vencidas
5. `reconciliation_variance` - Divergência de conciliação
6. `projection_deviation` - Projeção desviando

## 🔌 Integração com Supabase

### Tabelas

**cash_flow_snapshots** (Snapshots diários realizados)
```sql
- id (UUID)
- clinic_id (UUID, FK)
- snapshot_date (DATE)
- financial_account_id (UUID, FK)
- opening_balance (DECIMAL)
- total_income (DECIMAL)
- total_expense (DECIMAL)
- closing_balance (DECIMAL)
- projected_income (DECIMAL)
- projected_expense (DECIMAL)
- projected_balance (DECIMAL)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**cash_flow_predictions** (Projeções futuras)
```sql
- id (UUID)
- clinic_id (UUID, FK)
- financial_account_id (UUID, FK)
- prediction_date (DATE)
- prediction_type ('income' | 'expense')
- amount (DECIMAL)
- status ('scheduled' | 'confirmed' | 'completed' | 'canceled')
- created_by (UUID, FK auth.users)
- created_at (TIMESTAMP)
```

### Vistas (Views)

**v_cash_flow_daily_analysis** - Análise diária com variâncias
**v_cash_flow_period_summary** - Resumo por período consolidado

### Funções RPC

**calculate_cash_flow_snapshot(clinic_id, snapshot_date, account_id?)**
- Calcula snapshot realizado a partir de transações financeiras
- Filtra por status: 'processed', 'paid', 'partial' para realizado
- Filtra por status: 'pending', 'scheduled' para previsto

**refresh_cash_flow_period(clinic_id, start_date, end_date)**
- Atualiza snapshots para período completo
- Executado diariamente via pg_cron

## 📡 API Service (cashFlowApi.ts)

### Funções principais

```typescript
// Obter snapshots
getCashFlowSnapshots(clinicId, startDate, endDate, accountId?)

// Obter previsões
getPredictions(clinicId, startDate, endDate, filters?)

// Obter métricas consolidadas
getDashboardMetrics(clinicId)

// Obter consolidação bancária
getBankConsolidation(clinicId, consolidationDate)

// Calcular snapshot específico
calculateCashFlowSnapshot(clinicId, date, accountId?)

// Criar predição
createPrediction(prediction: CashFlowPrediction)

// Atualizar predição
updatePrediction(id, updates)

// Deletar predição
deletePrediction(id)
```

## 🎯 Fluxo de Dados

```
┌─────────────────┐
│  Filtros        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  useCashFlow Hook                   │
│ (State Management + Auto-refresh)   │
└────────┬────────────────────────────┘
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
┌──────────────────┐              ┌──────────────────────┐
│  Snapshots       │              │  Predictions        │
│  (Realized)      │              │  (Future)           │
└────────┬─────────┘              └──────────┬───────────┘
         │                                   │
         └──────────────┬────────────────────┘
                        │
                        ▼
         ┌──────────────────────────┐
         │  Metrics Calculation     │
         │  - Health               │
         │  - Runway               │
         │  - Alerts               │
         └──────────────┬───────────┘
                        │
         ┌──────────────┴───────────┐
         │                          │
         ▼                          ▼
   ┌──────────────┐        ┌───────────────┐
   │  Dashboard   │        │  Charts       │
   │  Components  │        │  Indicators   │
   └──────────────┘        └───────────────┘
```

## 🔒 Segurança

**RLS (Row Level Security)**
- Todas as tabelas possuem RLS ativo
- Usuários só veem dados da clínica a qual estão atribuídos
- Validação via `user_roles.clinic_id`

**Políticas:**
```sql
-- Apenas visualizar dados da própria clínica
SELECT: user_id IN (SELECT user_id FROM user_roles WHERE clinic_id = clinic_id)

-- Apenas criar previsões para própria clínica
INSERT: user_id IN (SELECT user_id FROM user_roles WHERE clinic_id = clinic_id)

-- Atualização com constraints adicionais
UPDATE: clinic_id matching + additional validations

-- Deletar apenas previsões próprias
DELETE: created_by = auth.uid()
```

## 📈 Exemplos de Uso

### Exemplo 1: Integrar Dashboard em Página

```typescript
import { CashFlowDashboard } from '@/modules/financeiro/fluxo-caixa/components';

export default function FinancePage() {
  return (
    <div>
      <h1>Financeiro</h1>
      <CashFlowDashboard />
    </div>
  );
}
```

### Exemplo 2: Usar Hook Customizado

```typescript
import { useCashFlow } from '@/modules/financeiro/fluxo-caixa/hooks/useCashFlow';

export default function MyComponent() {
  const {
    metrics,
    snapshots,
    loading,
    updateFilters,
  } = useCashFlow();

  return (
    <div>
      {loading ? <p>Carregando...</p> : (
        <p>Saldo: R$ {metrics?.current_balance}</p>
      )}
    </div>
  );
}
```

### Exemplo 3: Chamar API Diretamente

```typescript
import { getDashboardMetrics } from '@/modules/financeiro/fluxo-caixa/services/cashFlowApi';

const metrics = await getDashboardMetrics(clinicId);
console.log(`Saldo atual: R$ ${metrics.current_balance}`);
```

## 🧮 Cálculos Principais

### Health Status
```
if (projected_30d < 0) → CRITICAL
else if (current < income * 0.8) → WARNING
else → HEALTHY
```

### Runway Days
```
runway = current_balance / daily_change
```

### Daily Change
```
daily_change = (income - expense) / number_of_days
```

## 🚀 Roadmap Futuro

### Fase 2 (Próximo)
- [ ] Integração com Contas Pagar
- [ ] Integração com Contas Receber
- [ ] Visualização OFX
- [ ] Sincronização PIX
- [ ] Alertas por Email/SMS

### Fase 3
- [ ] Simulador de Cenários
- [ ] Análise de Sazonalidade
- [ ] Budget vs Realizado
- [ ] Integração com Repasses

### Fase 4
- [ ] Machine Learning para Projeção
- [ ] Previsão de Fluxo Automática
- [ ] Recomendações de Ações
- [ ] Dashboard Compartilhado

## 📝 Performance

- ✅ Queries otimizadas com índices
- ✅ Parallel loading (Promise.all)
- ✅ Memoização de componentes (React.memo)
- ✅ Cálculos memoizados (useMemo)
- ✅ Auto-refresh a cada 5 minutos
- ✅ Suporta 1000+ snapshots sem lag

## 🐛 Troubleshooting

**Problema: Dados não carregando**
- Verificar RLS ativa no Supabase
- Confirmar `user_roles` tem registro correto
- Testar query direto no SQL Editor

**Problema: Valores incorretos**
- Verificar se `financial_transactions` tem `status` correto
- Confirmar `balance_after` está calculado pela trigger
- Validar datas no filtro

**Problema: Performance lenta**
- Verificar índices em `cash_flow_snapshots`
- Limitar range de datas nos filtros
- Aumentar intervalo de auto-refresh

## 📚 Referências

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [React Hooks Guide](https://react.dev/reference/react)
- [Recharts Documentation](https://recharts.org)
- [TailwindCSS Reference](https://tailwindcss.com)

---

**Última atualização:** Janeiro 2025
**Status:** ✅ Pronto para Produção
**Manutentor:** Equipe Gesclinic
