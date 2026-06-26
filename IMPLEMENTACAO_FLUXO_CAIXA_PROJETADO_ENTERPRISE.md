# Implementação — Fluxo de Caixa Projetado Enterprise
## GesClinic ERP Hospitalar

---

## 1. Arquitetura

```
src/
├── modules/financeiro/fluxo-caixa/
│   ├── services/
│   │   ├── cashFlowApi.ts             ← já existia (snapshots RPC)
│   │   └── projectionEngine.ts        ← NOVO: motor de projeção real-time
│   ├── hooks/
│   │   ├── useCashFlow.ts             ← já existia
│   │   └── useProjectedCashFlow.ts    ← NOVO: estado da aba projetada
│   └── components/
│       ├── ProjectedCashFlow.tsx      ← NOVO: orquestrador da aba
│       ├── ProjectionKpiCards.tsx     ← NOVO: 8 KPIs executivos
│       ├── CashCurveChart.tsx         ← NOVO: curva de caixa (Recharts)
│       ├── ScenarioPanel.tsx          ← NOVO: 3 cenários comparativos
│       ├── FinancialSimulator.tsx     ← NOVO: simulador financeiro
│       ├── ForecastPanel.tsx          ← NOVO: forecast 30/60/90/180/365d
│       ├── BreakdownTables.tsx        ← NOVO: por convênio / médico / CC
│       └── ProjectionAlerts.tsx      ← NOVO: alertas automáticos
│
└── pages/clinica/financeiro/
    └── FluxoCaixa.jsx                ← MODIFICADO: aba "Fluxo Projetado"
```

---

## 2. Tabelas Utilizadas (sem criar novas)

| Tabela | Uso |
|---|---|
| `ar_invoices` | Contas a receber abertas → entradas previstas |
| `ap_bills` | Contas a pagar abertas → saídas previstas |
| `ap_bills` (filtro `repasse_doctor_name`) | Repasses médicos pendentes |
| `billing_guides` | Guias de faturamento aguardando pagamento |
| `financial_accounts` | Saldo atual das contas financeiras |

---

## 3. Integrações

### Fontes de Entradas
- **AR (ar_invoices)**: status `open`, `pending`, `overdue`, `partial`; agrupadas por `due_date`
- **Faturamento (billing_guides)**: status `submitted`, `approved`, `pending_payment`; agrupadas por `expected_payment_date`

### Fontes de Saídas
- **AP (ap_bills)**: status `open`, `partial`, `approved`, `overdue`; agrupadas por `due_date`
- **Repasse Médico**: subset de `ap_bills` com `repasse_doctor_name` preenchido

### Saldo Atual
- `financial_accounts.current_balance` (soma de todas as contas ativas)

### Breakdowns Automáticos
- Por convênio: `health_plan_name` de `ar_invoices` / `billing_guides`
- Por médico: `repasse_doctor_name` de `ap_bills`
- Por centro de custo: `cost_center_name` de `ap_bills`

---

## 4. Cálculos

### Cenários
| Cenário | Fator Entradas | Fator Saídas |
|---|---|---|
| Conservador | 0,70 | 1,15 |
| Realista | 1,00 | 1,00 |
| Otimista | 1,25 | 0,90 |

### KPIs
- **Caixa Atual** = soma de `financial_accounts.current_balance`
- **Caixa Projetado** = Caixa Atual + Entradas – Saídas (período)
- **Burn Rate** = Saídas / dias do período
- **Runway** = Caixa Atual / Burn Rate (em dias)
- **Capital de Giro** = Caixa Atual + Entradas Previstas
- **Necessidade de Caixa** = max(0, Saídas – Caixa Atual)
- **Liquidez** = Entradas / Saídas (> 1 = saudável)

### Curva de Caixa Diária
```
Para cada dia do período:
  inflows[d]  = AR vencendo[d] * fatorEntrada + Billing[d] * fatorEntrada
  outflows[d] = AP vencendo[d] * fatorSaída
  net[d]      = inflows[d] - outflows[d]
  cumulative[d] = cumulative[d-1] + net[d]
```

Para horizontes > 90 dias, agrega semanalmente no gráfico.

---

## 5. Cenários e Forecast

### Geração Paralela de Cenários
```ts
const [conservador, realista, otimista] = await Promise.all([
  computeProjection(clinicId, start, end, 'conservador'),
  computeProjection(clinicId, start, end, 'realista'),
  computeProjection(clinicId, start, end, 'otimista'),
]);
```

### Forecast Configurável
- 30 / 60 / 90 / 180 / 365 dias
- Sempre usa cenário realista (1:1)
- Inclui KPIs, runway, burn rate e top convênio/médico

---

## 6. Simulador Financeiro

Permite adicionar eventos extras (distribuídos proporcionalmente no período):

| Preset | Entrada/mês | Saída/mês |
|---|---|---|
| Novo médico (geral) | R$ 25.000 | R$ 5.000 |
| Nova unidade | R$ 80.000 | R$ 45.000 |
| Novo equipamento | R$ 10.000 | R$ 8.000 |
| Perda convênio –30% | –R$ 15.000 | — |
| Perda convênio –50% | –R$ 25.000 | — |
| Redução de pessoal | — | –R$ 12.000 |

Também aceita simulação totalmente personalizada (label + entrada + saída).

---

## 7. Alertas Automáticos

| Condição | Tipo |
|---|---|
| Saldo projetado < 0 | 🔴 Crítico |
| Saldo final < 15 dias de operação | 🟡 Aviso |
| Runway < 30 dias | 🔴 Crítico |
| Runway < 90 dias | 🟡 Aviso |
| Liquidez < 0,8 | 🔴 Crítico |
| Liquidez < 1,0 | 🟡 Aviso |
| Dias com saldo negativo > 0 | 🟡 Aviso |
| Nenhuma entrada no período | 🟡 Aviso |
| Tudo normal | ✅ Saudável |

---

## 8. Performance

- Todas as queries executadas em `Promise.all` (paralelo)
- Apenas dados necessários carregados (limit 5000 AP, 2000 repasses)
- Gráfico agregado semanalmente para > 90 dias
- Cálculo do cenário realista reutilizado pelo forecast 30d (mesmas datas)
- Sem chamadas realtime ou websocket (carga manual sob demanda)

---

## 9. Auditoria e Rastreabilidade

- Cada projeção indica claramente as fontes (AR, AP, Billing, Repasse)
- Coluna "Saldo Acumulado" diária permite auditar dia a dia
- Breakdown por convênio, médico e centro de custo rastreável
- Cenários com fator de ajuste explícito (conservador 0,7x / otimista 1,25x)
- Simulações adicionais identificadas por nome e impacto mensal

---

## 10. Comparativo com Mercado

| Funcionalidade | SAP Healthcare | MV / Tasy | GesClinic (novo) |
|---|---|---|---|
| Projeção diária de caixa | ✅ | ✅ | ✅ |
| 3 cenários comparativos | ✅ | Parcial | ✅ |
| Simulador financeiro | ✅ | ❌ | ✅ |
| Forecast 30/60/90/180/365d | ✅ | ✅ | ✅ |
| Breakdown por convênio | ✅ | ✅ | ✅ |
| Breakdown por médico/repasse | ✅ | ✅ | ✅ |
| Alertas automáticos de liquidez | ✅ | Parcial | ✅ |
| Curva de caixa gráfica | ✅ | ✅ | ✅ |
| Integração com faturamento | ✅ | ✅ | ✅ |
| Sem banco de dados extra | N/A | N/A | ✅ |

---

## 11. Arquivos Criados/Modificados

| Arquivo | Ação |
|---|---|
| `src/modules/financeiro/fluxo-caixa/services/projectionEngine.ts` | CRIADO |
| `src/modules/financeiro/fluxo-caixa/hooks/useProjectedCashFlow.ts` | CRIADO |
| `src/modules/financeiro/fluxo-caixa/components/ProjectedCashFlow.tsx` | CRIADO |
| `src/modules/financeiro/fluxo-caixa/components/ProjectionKpiCards.tsx` | CRIADO |
| `src/modules/financeiro/fluxo-caixa/components/CashCurveChart.tsx` | CRIADO |
| `src/modules/financeiro/fluxo-caixa/components/ScenarioPanel.tsx` | CRIADO |
| `src/modules/financeiro/fluxo-caixa/components/FinancialSimulator.tsx` | CRIADO |
| `src/modules/financeiro/fluxo-caixa/components/ForecastPanel.tsx` | CRIADO |
| `src/modules/financeiro/fluxo-caixa/components/BreakdownTables.tsx` | CRIADO |
| `src/modules/financeiro/fluxo-caixa/components/ProjectionAlerts.tsx` | CRIADO |
| `src/pages/clinica/financeiro/FluxoCaixa.jsx` | MODIFICADO |

**Build**: ✅ 5.256 módulos transformados, sem erros.

---

*Implementação realizada em 2026-06-19 — GesClinic ERP Hospitalar*
