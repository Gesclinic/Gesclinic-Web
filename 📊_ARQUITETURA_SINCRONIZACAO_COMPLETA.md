# 📊 ARQUITETURA DE SINCRONIZAÇÃO - MÓDULO FINANCEIRO

**Status:** 🔴 PLANEJAMENTO  
**Data:** 21 de Maio de 2026  

---

## 🔄 FLUXO DE SINCRONIZAÇÃO COMPLETO

```
┌─────────────────────────────────────────────────────────────────────┐
│                    1️⃣ ORIGEM: AGENDAMENTOS                         │
└────────────────────────┬──────────────────────────────────────────────┘
                         │
                         ↓ appointment.status = 'completed'
                         │
┌────────────────────────────────────────────────────────────────────┐
│        🎯 TRIGGER: on_appointment_completed                        │
│  ├─ Executa: create_receivable_from_appointment()                 │
│  ├─ Insere em: ar_invoices (com impostos calculados)             │
│  └─ Evento: receivable_created                                    │
└────────────────────────┬───────────────────────────────────────────┘
                         │
      ┌──────────────────┼──────────────────┐
      │                  │                  │
      ↓                  ↓                  ↓
      
┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────┐
│   📥 FLUXO DE CAIXA      │  │   📄 FATURAMENTO        │  │   📋 DRE         │
│   (Inflows)              │  │  (Guias/NFs)            │  │  (Consolidação)  │
│                          │  │                         │  │                  │
│  ar_invoices:           │  │  invoices.status        │  │  Calcula:        │
│  ├─ status='pending'    │  │  ├─ draft              │  │  ├─ Receitas    │
│  ├─ status='received'   │  │  ├─ sent               │  │  ├─ Custos      │
│  └─ status='partial'    │  │  ├─ received           │  │  ├─ Despesas    │
│                         │  │  └─ paid               │  │  ├─ Impostos    │
└──────────────────────────┘  └──────────────────────────┘  ├─ Lucro         │
                                                           └─ Margens       │
      ┌──────────────────┬──────────────────┐             │                 │
      │                  │                  │             └─────────────────┘
      ↓                  ↓                  ↓
┌──────────────────────────┐  ┌──────────────────────────┐
│   📤 FLUXO DE CAIXA      │  │   💰 CONTAS A PAGAR    │
│   (Outflows)             │  │                         │
│                          │  │  ap_bills.status:      │
│  ap_bills:              │  │  ├─ open                │
│  ├─ status='open'       │  │  ├─ partial             │
│  ├─ status='partial'    │  │  ├─ paid                │
│  └─ status='paid'       │  │  └─ canceled            │
│                         │  │                         │
└──────────────────────────┘  └──────────────────────────┘
      │                  │
      └──────────────────┘
                 │
                 ↓
      ┌──────────────────────────┐
      │  📊 SALDO DISPONÍVEL    │
      │  = Inflows - Outflows    │
      └──────────────────────────┘
```

---

## 📍 CAMADAS DE DADOS

```
LAYER 1: TABELAS DE ORIGEM
├─ ar_invoices           (Recebíveis - criados automaticamente)
├─ ap_bills              (Contas a Pagar - criadas manualmente)
├─ invoices              (Faturas - módulo Faturamento)
└─ finance_transactions  (Transações manuais)

LAYER 2: CONSOLIDAÇÃO (Fluxo de Caixa)
├─ Inflows = SUM(ar_invoices) onde status IN ('paid', 'received')
├─ Outflows = SUM(ap_bills) onde status IN ('paid')
└─ Saldo = Inflows - Outflows

LAYER 3: RESUMO (DRE)
├─ Receitas Totais = Inflows
├─ Custos Operacionais = SUM(ap_bills) por categoria 'cost'
├─ Despesas Administrativas = SUM(ap_bills) por categoria 'expense'
├─ Impostos = ar_invoices.total_impostos (Simples Nacional)
└─ Lucro Líquido = Receitas - Custos - Despesas - Impostos
```

---

## 🔗 DEPENDÊNCIAS DE SINCRONIZAÇÃO

### 1. CONTAS A RECEBER → FLUXO DE CAIXA
```javascript
// Fluxo de Caixa consome:
const receivables = await receivablesApi.listReceivables({
  clinicId,
  status: ['received', 'paid'],  // Apenas recebidas geram inflow
  dateRange: [startDate, endDate]
});

const inflows = receivables.reduce((sum, r) => sum + r.amount, 0);
```

### 2. CONTAS A PAGAR → FLUXO DE CAIXA
```javascript
// Fluxo de Caixa consome:
const payables = await financeApi.listAPQuery({
  clinicId,
  statusList: ['paid'],  // Apenas pagas geram outflow
  start: startDate,
  end: endDate
});

const outflows = payables.reduce((sum, p) => sum + p.amount, 0);
```

### 3. FATURAMENTO ↔ CONTAS A RECEBER
```javascript
// Quando guia/NF é enviada/recebida:
// → Atualiza ar_invoices.status via trigger ou webhook
// → Trigger: on_invoice_status_changed

// Quando pagamento é registrado em faturamento:
// → Atualiza ar_invoices.status = 'received'
// → Atualiza ar_invoices.received_date
// → Atualiza ar_invoices.received_value
```

### 4. FLUXO DE CAIXA → DRE
```javascript
// DRE consome dados consolid ados de Fluxo:
const cashflow = await cashflowApi.getCashFlowSummary({
  clinicId,
  startDate,
  endDate
});

const dre = {
  receitas: cashflow.total_inflows,
  custos: SUM(ap_bills) categoria='cost',
  despesas: SUM(ap_bills) categoria='expense',
  impostos: SUM(ar_invoices.total_impostos),
  lucro: receitas - custos - despesas - impostos
};
```

---

## 🎯 TABELAS CRÍTICAS PARA SINCRONIZAÇÃO

| Tabela | Propósito | Inflows | Outflows | DRE |
|--------|-----------|---------|----------|-----|
| **ar_invoices** | Recebíveis automáticos | ✅ SUM(amount) | - | ✅ Receitas |
| **ap_bills** | Contas a pagar | - | ✅ SUM(amount) | ✅ Custos/Despesas |
| **invoices** | Faturas (Faturamento) | ✅ (alt source) | - | ✅ Receitas |
| **finance_transactions** | Transações manuais | ✅/❌ Depende tipo | ✅/❌ Depende tipo | ✅ (if categorized) |
| **account_plans** | Categorização | - | - | ✅ Agrupamento |

---

## 📋 CAMPOS CRÍTICOS PARA SINCRONIZAÇÃO

### ar_invoices (Recebíveis)
```javascript
{
  id: UUID,
  clinic_id: UUID,
  appointment_id: UUID,  // ← Link com agendamento
  amount: DECIMAL,       // ← Valor bruto (R$ 700)
  status: ENUM,          // ← pending, open, received, paid, partial, canceled
  total_impostos: DECIMAL,  // ← R$ 267.75
  net_value: DECIMAL,       // ← R$ 432.25
  pis_value, cofins_value, csll_value, ir_value, issqn_value,  // ← Impostos detalhados
  due_date: DATE,
  received_date: DATE,
  received_value: DECIMAL,
  created_at: TIMESTAMP,
  
  // Para sincronização com Faturamento:
  invoice_id: UUID,  // ← Link com invoices table (opcional)
  guide_id: UUID,    // ← Link com guia TISS (opcional)
}
```

### ap_bills (Contas a Pagar)
```javascript
{
  id: UUID,
  clinic_id: UUID,
  category_id: UUID,  // ← Vínculo com plano de contas
  vendor_name: STRING,
  description: STRING,
  amount: DECIMAL,
  status: ENUM,  // ← open, paid, partial, canceled
  due_date: DATE,
  paid_date: DATE,
  paid_amount: DECIMAL,
  payment_method: STRING,
  
  // Para DRE:
  account_plan: {
    id: UUID,
    code: STRING,  // ← 1.1.1 (Custos) ou 2.1.1 (Despesas)
    name: STRING,
    parent_id: UUID,  // ← Identifica se é agrupável
  }
}
```

### invoices (Faturamento)
```javascript
{
  id: UUID,
  clinic_id: UUID,
  patient_id: UUID,
  total: DECIMAL,
  status: ENUM,  // ← draft, sent, received, paid
  due_date: DATE,
  paid_date: DATE,
  
  // Link para sincronização:
  ar_invoice_id: UUID,  // ← Opcional, se cada fatura gera recebível automático
}
```

---

## 🚀 ORDEM DE IMPLEMENTAÇÃO

### ETAPA 3: FLUXO DE CAIXA (3-4 horas)
**Arquivo:** `src/lib/cashflowApi.js`

```javascript
// 1. Funções de leitura
export function getCashFlowSummary(clinicId, startDate, endDate)
  → RPC cashflow_summary() ou query manual

export function getDailyCashFlow(clinicId, startDate, endDate)
  → Query por dia

export function getCashFlowProjection(clinicId, days = 30)
  → Usa média histórica

export function getCashFlowAlerts(clinicId)
  → Identifica riscos de liquidez

// 2. Funções de categoria
export function getCashFlowByCategory(clinicId, category, startDate, endDate)
  → Agrupa por tipo (operacional, administrativo, etc)

// 3. Sincronização
export function syncCashFlowData(clinicId)
  → Atualiza cache/materialized view (se houver)
```

**Dados de Inflow:**
- `listReceivables()` com status = ['received', 'paid']
- Período: `date >= startDate AND date <= endDate`

**Dados de Outflow:**
- `financeApi.listAPQuery()` com status = ['paid']
- Período: `date >= startDate AND date <= endDate`

**Cálculos:**
```javascript
const summary = {
  total_inflows: SUM(ar_invoices.amount),
  total_outflows: SUM(ap_bills.amount),
  net_balance: total_inflows - total_outflows,
  
  daily: [{date, inflow, outflow, balance}, ...],
  projection: [{day, projected_balance}, ...],
  
  liquidity_ratio: total_inflows / total_outflows,  // >1.5 ✅, 1-1.5 ⚠️, <1 ❌
  coverage_days: net_balance / (total_outflows / days),
};
```

---

### ETAPA 4: DRE (3-4 horas)
**Arquivo:** `src/lib/dreApi.js`

```javascript
// 1. Consolidação
export function getDREData(clinicId, startDate, endDate)
  → Retorna DRE completa

// 2. Por serviço
export function getRevenueByService(clinicId, startDate, endDate)
  → Agrupa receitas por tipo de serviço

// 3. Por categoria
export function getExpenseByCategory(clinicId, startDate, endDate)
  → Agrupa despesas por conta

// 4. Análise
export function getMarginAnalysis(clinicId, startDate, endDate)
  → Calcula margens

export function comparePeriods(clinicId, period1, period2)
  → Compara período anterior
```

**Dados:**
```javascript
const dre = {
  // RECEITAS
  receitas_totais: SUM(ar_invoices.amount),
  
  // Detalhamento
  receitas_por_servico: [{
    servico: STRING,
    qtd: COUNT,
    valor_medio: AVG,
    total: SUM,
    percentual: (SUM/receitas_totais)*100
  }, ...],
  
  // CUSTOS OPERACIONAIS (ap_bills com category.type='cost')
  custos_operacionais: SUM(ap_bills),
  
  // DESPESAS ADMINISTRATIVAS (ap_bills com category.type='expense')
  despesas_administrativas: SUM(ap_bills),
  
  // IMPOSTOS (Simples Nacional)
  impostos_calculados: SUM(ar_invoices.total_impostos),
  
  // Impostos detalhados
  impostos_detalhes: {
    pis: SUM(ar_invoices.pis_value),
    cofins: SUM(ar_invoices.cofins_value),
    csll: SUM(ar_invoices.csll_value),
    ir: SUM(ar_invoices.ir_value),
    issqn: SUM(ar_invoices.issqn_value),
  },
  
  // LUCROS
  ebitda: receitas_totais - custos_operacionais,
  lucro_operacional: ebitda - despesas_administrativas,
  lucro_liquido: lucro_operacional - impostos_calculados,
  
  // MARGENS
  margem_bruta: (ebitda / receitas_totais) * 100,
  margem_operacional: (lucro_operacional / receitas_totais) * 100,
  margem_liquida: (lucro_liquido / receitas_totais) * 100,
  
  // COMPARAÇÃO
  vs_periodo_anterior: {
    receitas_diff: (receitas_totais_novo - receitas_totais_anterior),
    lucro_diff: (lucro_liquido_novo - lucro_liquido_anterior),
    margem_diff: (margem_liquida_novo - margem_liquida_anterior),
  }
};
```

---

## ✅ SINCRONIZAÇÃO BIDIRECIONAL

### Quando Contas a Receber muda:
```
ar_invoices.update(status='paid') 
  → Trigger: atualiza finance_transactions (se houver)
  → Fluxo de Caixa: próxima query pega novo estado
  → DRE: próxima query reflete mudança de receita
```

### Quando Contas a Pagar muda:
```
ap_bills.update(status='paid')
  → Trigger: atualiza finance_transactions
  → Fluxo de Caixa: próxima query pega novo estado
  → DRE: próxima query reflete mudança de despesa
```

### Quando Faturamento atualiza:
```
invoices.update(status='paid')
  → Webhook/Trigger: atualiza ar_invoices (se vinculado)
  → Recebíveis Dashboard: mostra novo status
  → Fluxo de Caixa: próxima query pega inflow atualizado
  → DRE: próxima query reflete receita recebida
```

---

## 🎨 COMPONENTES UI A CRIAR

### ETAPA 3: Fluxo de Caixa (`src/pages/clinica/financeiro/FluxoCaixa.jsx`)
```jsx
<FluxoCaixaPage>
  <CashFlowSummary />          // 4 cards: Saldo, Entradas, Saídas, Liquidez
  <CashFlowChart />            // Gráfico de linha com projeção 30 dias
  <CashFlowDetails />          // Tabela: data, entradas, saídas, saldo
  <LiquidityIndicator />       // Semáforo 🟢/🟡/🔴
  <CashFlowAlerts />           // Alertas de risco
</FluxoCaixaPage>
```

### ETAPA 4: DRE (`src/pages/clinica/financeiro/DRE.jsx`)
```jsx
<DREPage>
  <DRESelector />              // Período: mês, trimestre, ano, custom
  <DRETable />                 // Tabela estruturada: Receita → Custos → Lucro
  <DREChart />                 // Pie: distribuição de receitas
  <MarginAnalysis />           // Margens: Bruta, Operacional, Líquida
  <Trend />                    // Comparação período anterior
</DREPage>
```

---

## 📊 EXEMPLO PRÁTICO

```javascript
// 21/05/2026 - Clínica Neuroclinica Cascavel

// DADOS BRUTOS
ar_invoices (recebidos): 4 × R$ 700 = R$ 2.800
ap_bills (pagos): 0

// FLUXO DE CAIXA
{
  inflows: R$ 2.800 (de recebíveis)
  outflows: R$ 0
  balance: R$ 2.800
  liquidity: 2.800 / 0 = ∞ (🟢 Excelente)
}

// DRE
{
  receitas: R$ 2.800
  custos: R$ 0
  despesas: R$ 0
  impostos: R$ 267.75 × 4 = R$ 1.071
  lucro: R$ 2.800 - R$ 1.071 = R$ 1.729
  margem: (R$ 1.729 / R$ 2.800) × 100 = 61,75%
}
```

---

## 🔐 SINCRONIZAÇÃO COM FATURAMENTO

**Ponte entre módulos:**
```
Faturamento (guias/NFs) → Contas a Receber → Fluxo de Caixa → DRE
           ↓                        ↓               ↓           ↓
       invoices            ar_invoices       cashflow_view   dre_view
```

**Webhook/Trigger necessário:**
```sql
-- Quando invoices.status muda:
CREATE TRIGGER on_invoice_status_changed
AFTER UPDATE ON invoices
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION sync_invoice_to_receivable();
```

---

**Documento:** 📊_ARQUITETURA_SINCRONIZACAO_COMPLETA.md  
**Status:** 🔴 Aguardando implementação  
**Próximo:** Criar cashflowApi.js + componentes UI
