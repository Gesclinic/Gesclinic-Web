# 📊 MÓDULO FINANCEIRO COMPLETO - ROADMAP

**Status:** ETAPA 1 ✅ | ETAPAS 2-3 🔄 PLANEJAMENTO  
**Data:** 21 de Maio de 2026  

---

## 🎯 ESCOPO TOTAL DO MÓDULO FINANCEIRO

### ✅ ETAPA 1: CONTAS A RECEBER (COMPLETA)
**Status:** ✅ 100% Funcional  
**O que inclui:**
- Dashboard com Summary Cards (Total, Recebido, Pendente, Atrasado)
- Tabela de recebíveis com detalhes
- Cálculo automático de impostos (Simples Nacional)
- API layer completa (CRUD)

**Dados:**
- 4 recebíveis × R$ 700 = R$ 2.800,00 total
- Impostos: R$ 267.75 por recebível (38.25%)
- Líquido: R$ 432.25 por recebível (61.75%)

**Próximas features:**
- [ ] Exibir breakdown de impostos na edição
- [ ] Registrar pagamento (Receber button)
- [ ] Filtros avançados
- [ ] Bulk actions

---

### 🔴 ETAPA 2: FLUXO DE CAIXA (PENDENTE)

**Objetivo:** Dashboard que mostra saúde financeira em tempo real

**Componentes a Criar:**
1. **CashFlowDashboard.jsx** (página principal)
2. **CashFlowSummary** (cards: saldo, entradas, saídas)
3. **CashFlowProjection** (projeção 30 dias)
4. **CashFlowChart** (gráfico de fluxo)
5. **LiquidityIndicator** (semáforo de liquidez)

**Dados Necessários:**
```
Entradas (Inflows):
├─ Recebíveis com status "received" (ar_invoices)
├─ Faturas pagas (invoices.paid_at)
├─ Receitas adicionais (finance_transactions)
└─ Prévia: Recebíveis próximos (próximos 30 dias)

Saídas (Outflows):
├─ Contas a Pagar com status "open" (ap_bills)
├─ Custos/despesas (finance_transactions)
├─ Folha de pagamento (salary_estimates)
└─ Impostos agendados

Saldo:
├─ Saldo atual (soma entradas - saídas)
├─ Projeção (próximos 30 dias)
└─ Tendência (últimos 90 dias)
```

**RPCs Necessários:**
```sql
-- Já existe: cashflow_summary(clinic_id, start_date, end_date)
-- Retorna: total_inflow, total_outflow, balance, projections

-- Novos a criar:
- get_daily_cashflow() - dados dia a dia
- get_projected_cashflow() - projeção 30 dias
- get_liquidity_alerts() - avisos automáticos
```

**API Layer:**
```javascript
// src/lib/cashflowApi.js
export function getCashFlowSummary(clinicId, startDate, endDate)
export function getCashFlowProjection(clinicId, days = 30)
export function getDailyCashFlow(clinicId, startDate, endDate)
export function getCashFlowAlerts(clinicId)
export function updateCashFlowCategory(id, category) // Categorizar transações
```

**UI Components:**
```jsx
// src/pages/clinica/financeiro/FluxoCaixa.jsx
<CashFlowDashboard clinicId={clinicId} />

// Dentro do dashboard:
<CashFlowSummary /> // Cards: Saldo, Entradas, Saídas
<CashFlowChart />   // Gráfico de linha com projeção
<CashFlowTable />   // Tabela de transações
<LiquidityIndicator /> // Semáforo: 🟢 Saudável, 🟡 Atenção, 🔴 Crítico
```

**Cálculos:**
```javascript
// Saldo Disponível
const availableBalance = totalInflows - totalOutflows;

// Liquidez (Índice de Liquidez Corrente - simplificado)
const currentLiquidity = totalInflows / totalOutflows;
// > 1.5: Saudável (🟢)
// 1.0-1.5: Atenção (🟡)
// < 1.0: Crítico (🔴)

// Projeção diária
const dailyProjection = (currentBalance, inflows, outflows) => {
  return currentBalance + inflows - outflows;
};
```

**Status:** ⏳ Aguardando start

**Tempo estimado:** 3-4 horas  
**Bloqueadores:** Nenhum - dados já existem em ar_invoices/ap_bills

---

### 🔴 ETAPA 3: DEMONSTRAÇÃO DE RESULTADO (DRE)

**Objetivo:** Resumo de Receita, Despesas e Lucro em período (mês/trimestre/ano)

**Estrutura DRE Clínica (Simples Nacional):**
```
═══════════════════════════════════════════════════════════
                        DRE - JUNHO/2026
═══════════════════════════════════════════════════════════

RECEITAS                                              R$ 8.500,00
├─ Consultas                               R$ 5.600,00
├─ Procedimentos                           R$ 2.100,00
├─ Outros serviços                         R$ 800,00
└─ Descontos/Abatimentos                  (R$ 0,00)

CUSTOS OPERACIONAIS                                   R$ 2.100,00
├─ Aluguel                                 R$ 1.000,00
├─ Utilities (água, luz, internet)         R$ 400,00
├─ Material descartável                    R$ 500,00
├─ Equip. manutenção                       R$ 200,00
└─ Outros custos                           R$ 0,00

DESPESAS ADMINISTRATIVAS                             R$ 1.050,00
├─ Salários/Provisionado                   R$ 700,00
├─ Marketing/Publicidade                   R$ 200,00
├─ Licenças/Seguros                        R$ 100,00
└─ Diversos                                R$ 50,00

DESPESAS COM IMPOSTOS (Simples Nacional)              R$ 1.360,00
├─ IRPJ/PIS/COFINS/CSLL (9%)                R$ 765,00
├─ ISSQN (5%)                              R$ 425,00
└─ INSS/Contribuições                      R$ 170,00

═══════════════════════════════════════════════════════════
LUCRO OPERACIONAL (EBITDA)                          R$ 3.990,00
═══════════════════════════════════════════════════════════

LUCRO LÍQUIDO (após todos impostos)                  R$ 2.630,00
═══════════════════════════════════════════════════════════
Margem Líquida: 30,94%
```

**Componentes a Criar:**
1. **DREPage.jsx** (página principal)
2. **DRESelector** (período: mês, trimestre, ano, custom)
3. **DRETable** (tabela estruturada)
4. **DREChart** (pie/bar chart com comparação)
5. **MarginAnalysis** (análise de margens)
6. **Trend** (comparação período anterior)

**Dados Necessários:**
```
Receitas (ar_invoices):
├─ SUM(amount) onde status in ('paid', 'received')
├─ Agrupado por service_id (produto/serviço)
└─ Período especificado

Custos Operacionais (finance_transactions ou ap_bills):
├─ Transações categorizadas como "operational_cost"
├─ Aluguel, utilities, materiais, etc

Despesas Administrativas (finance_transactions):
├─ Transações categorizadas como "administrative_expense"
├─ Salários, marketing, licenças, etc

Impostos (calculados):
├─ De ar_invoices.total_impostos
├─ Taxa Simples Nacional: 9% receita (IRPJ/PIS/COFINS/CSLL)
└─ ISSQN: 5% receita (já em ar_invoices)
```

**RPCs Necessários:**
```sql
-- Novos a criar:
- get_dre_data(clinic_id, start_date, end_date)
  Retorna: { revenue, costs, expenses, taxes, profit }

- get_revenue_by_service(clinic_id, start_date, end_date)
  Retorna: [ { service, amount, count, average } ]

- get_expense_breakdown(clinic_id, start_date, end_date)
  Retorna: [ { category, amount, percentage } ]

- compare_periods(clinic_id, period1, period2)
  Retorna: comparação período anterior
```

**API Layer:**
```javascript
// src/lib/dreApi.js
export function getDREData(clinicId, startDate, endDate)
export function getRevenueByService(clinicId, startDate, endDate)
export function getExpenseBreakdown(clinicId, startDate, endDate)
export function getMarginAnalysis(clinicId, startDate, endDate)
export function getTrendComparison(clinicId, period1, period2)
```

**Cálculos:**
```javascript
const dreData = {
  // Receitas
  total_revenue: SUM(ar_invoices.amount) onde status='received',
  revenue_by_service: GROUP BY service_id,
  
  // Custos
  total_operational_costs: SUM(finance_transactions) where category='cost',
  
  // Despesas
  total_administrative_expenses: SUM(finance_transactions) where category='expense',
  
  // Impostos
  tax_irpj_pis_cofins_csll: total_revenue * 0.09,
  tax_issqn: total_revenue * 0.05,
  total_taxes: tax_irpj + tax_issqn,
  
  // Lucros
  ebitda: total_revenue - total_operational_costs,
  profit_before_tax: ebitda - total_administrative_expenses,
  net_profit: profit_before_tax - total_taxes,
  
  // Margens
  gross_margin: ebitda / total_revenue,
  operational_margin: profit_before_tax / total_revenue,
  net_margin: net_profit / total_revenue,
};
```

**Status:** ⏳ Aguardando start

**Tempo estimado:** 3-4 horas  
**Bloqueadores:** Necessário implementar categorização de despesas (finance_transactions.category)

---

### 🟡 ETAPA 4: CONTAS A PAGAR (PARCIALMENTE PRONTA)

**Status:** 50% - tabela `ap_bills` existe, mas UI pode precisar ajustes

**O que já existe:**
- ✅ Tabela `ap_bills` com estrutura completa
- ✅ Coluna `status` (open, paid, canceled)
- ✅ RPC `list_ap_bills` para queries
- ✅ API: `financeApi.listAPBills()`

**O que falta:**
- [ ] Dashboard/página principal para AP
- [ ] Exibir em Fluxo de Caixa (como saídas)
- [ ] Alertas de vencimento próximo
- [ ] Reconciliação automática

---

## 📋 PLANO DE IMPLEMENTAÇÃO RECOMENDADO

### Ordem Sugerida:
1. **AGORA (30 min):** Atualizar UI Contas a Receber (tax display + edit save)
2. **PRÓXIMO (3 horas):** Implementar FLUXO DE CAIXA
3. **DEPOIS (3 horas):** Implementar DRE
4. **BÔNUS:** Expandir Contas a Pagar se necessário

### Justificativa:
- Fluxo de Caixa usa dados de Recebíveis que já temos
- DRE depende de Fluxo de Caixa estar estruturado
- Progressão lógica: micro (recebível) → meso (fluxo) → macro (DRE)

---

## 🔧 DEPENDÊNCIAS TÉCNICAS

```
Contas a Receber (✅ PRONTO)
    ↓
    ├─→ Fluxo de Caixa (dados de inflows)
    │        ↓
    │        ├─→ DRE (resumo de entradas)
    │        └─→ Alertas de liquidez
    │
    └─→ DRE (detalhamento de receitas)

Contas a Pagar (50% pronto)
    ↓
    └─→ Fluxo de Caixa (dados de outflows)
         ↓
         └─→ DRE (detalhamento de despesas)
```

---

## 💰 EXEMPLO PRÁTICO INTEGRADO

```javascript
// Fluxo de Caixa resume dados de:
const inflows = await receivablesApi.listReceivables({
  clinicId,
  status: 'received',
  dateRange: [startDate, endDate]
});

const outflows = await ap_billsApi.listAPBills({
  clinicId,
  status: 'paid',
  dateRange: [startDate, endDate]
});

// DRE detalha este mesmo dado:
const dre = {
  total_revenue: sum(inflows.map(r => r.amount)),
  revenue_by_service: groupBy(inflows, 'service_name'),
  total_expenses: sum(outflows.map(b => b.amount)),
  expense_by_supplier: groupBy(outflows, 'supplier_name'),
  net_profit: total_revenue - total_expenses - taxes,
};

// Resultado visual:
// Fluxo de Caixa → linhas/barras (entrada vs saída ao longo do tempo)
// DRE → tabela + gráficos (estruturado por categoria)
```

---

## 🎯 MÉTRICAS DE SUCESSO

✅ **ETAPA 1 COMPLETA:**
- Dashboard Contas a Receber com R$ 2.800,00
- Impostos calculados: R$ 267.75
- Valor líquido: R$ 432.25

🔴 **ETAPA 2 TARGET:**
- Dashboard Fluxo de Caixa mostrando saldo
- Projeção 30 dias ativa
- Liquidez semáforo visual

🔴 **ETAPA 3 TARGET:**
- Página DRE com estrutura completa
- Lucro/prejuízo calculado corretamente
- Margens exibidas

---

## 📁 ESTRUTURA DE ARQUIVOS A CRIAR

```
src/
├─ lib/
│  ├─ receivablesApi.js ✅ (já existe)
│  ├─ cashflowApi.js 🔄 (criar)
│  ├─ dreApi.js 🔄 (criar)
│  └─ ap_billsApi.js (verificar/ajustar)
│
└─ pages/clinica/financeiro/
   ├─ ContasReceber.jsx ✅ (já existe)
   ├─ EditReceivable.jsx ✅ (já existe - expandir)
   ├─ FluxoCaixa.jsx 🔄 (criar)
   ├─ DRE.jsx 🔄 (criar)
   └─ ContasPagar.jsx (verificar)
```

---

## ⏰ RESUMO DE TEMPO

| Etapa | Descrição | Tempo | Status |
|-------|-----------|-------|--------|
| 1 | Contas a Receber (baseline) | 4h | ✅ |
| 1.5 | Melhorias UI (tax display) | 1h | 🔄 |
| 2 | Fluxo de Caixa | 3-4h | 🔴 |
| 3 | DRE | 3-4h | 🔴 |
| 4 | Contas a Pagar | 2h | 🟡 |

**Total estimado para módulo completo:** 13-15 horas

---

**Documento:** 📊_MODULO_FINANCEIRO_COMPLETO_ROADMAP.md  
**Criado:** 21 de Maio de 2026  
**Recomendação:** Confirmar com user qual etapa implementar primeiro
