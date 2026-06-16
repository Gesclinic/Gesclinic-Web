# 🧪 GUIA DE TESTE — ETAPA 6 E 7

## 📋 Estrutura de Dados Para Teste

### 1. Dados Necessários para ETAPA 6 (Conciliador)

#### A. Contas a Receber (ar_invoices)
```sql
-- Exemplo de invoice para matching
SELECT * FROM ar_invoices 
WHERE clinic_id = 'seu-clinic-id' 
  AND status = 'open'
LIMIT 5;

-- Esperado:
-- id: UUID
-- clinic_id: UUID
-- total_amount: 1500.00
-- due_date: 2026-05-20
-- status: 'open' ou 'paid'
```

#### B. Extratos Bancários (banco_statements)
```sql
-- Será preenchido após upload
SELECT * FROM bank_statements 
WHERE clinic_id = 'seu-clinic-id'
ORDER BY created_at DESC;

-- Esperado após upload:
-- id: UUID
-- clinic_id: UUID
-- statement_date: 2026-05-23
-- transaction_count: 25
-- status: 'pending' → 'processing' → 'completed'
```

#### C. Transações do Extrato (bank_transactions)
```sql
-- Será preenchido após upload
SELECT * FROM bank_transactions 
WHERE statement_id = 'statement-uuid'
ORDER BY transaction_date DESC;

-- Esperado:
-- id: UUID
-- statement_id: UUID
-- transaction_date: 2026-05-21
-- amount: 1500.00
-- description: 'TRANSFERENCIA PACIENTE'
-- status: 'unmatched' → 'matched'
-- match_type: NULL → 'auto_exact'/'auto_fuzzy'/'auto_partial'
```

---

### 2. Dados Necessários para ETAPA 7 (Cockpit Premium)

#### A. Histórico de Faturamento (12 meses)
```sql
-- Para renderizar LineChart de evolução
SELECT 
  DATE_TRUNC('month', created_at)::DATE as mes,
  COUNT(*) as appointments,
  SUM(total_amount) as faturamento
FROM ar_invoices
WHERE clinic_id = 'seu-clinic-id'
  AND created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mes DESC;

-- Esperado: 12 linhas (uma por mês)
```

#### B. Profissionais com Agendamentos
```sql
-- Para Top 10 Professionais Chart
SELECT 
  p.id,
  p.name,
  COUNT(DISTINCT ap.id) as total_appointments,
  SUM(ap.value) as total_faturado
FROM professionals p
LEFT JOIN appointments ap ON p.id = ap.professional_id
WHERE p.clinic_id = 'seu-clinic-id'
GROUP BY p.id, p.name
HAVING COUNT(DISTINCT ap.id) > 0
ORDER BY total_faturado DESC
LIMIT 10;

-- Esperado: 10 linhas com profissionais
```

#### C. Contas Abertas (Inadimplência)
```sql
-- Para Aging Chart
SELECT 
  COUNT(*) as count,
  SUM(total_amount) as amount,
  CASE 
    WHEN due_date < CURRENT_DATE - INTERVAL '90 days' THEN '90+'
    WHEN due_date < CURRENT_DATE - INTERVAL '60 days' THEN '60-89'
    WHEN due_date < CURRENT_DATE - INTERVAL '30 days' THEN '30-59'
    ELSE '1-29'
  END as range
FROM ar_invoices
WHERE clinic_id = 'seu-clinic-id'
  AND status = 'open'
GROUP BY range;

-- Esperado: 4 linhas (90+, 60-89, 30-59, 1-29)
```

#### D. Convênios/Payers
```sql
-- Para Performance por Convênio
SELECT 
  p.name as convenio,
  COUNT(DISTINCT ai.id) as total_invoices,
  SUM(ai.total_amount) as total_amount
FROM payers p
LEFT JOIN ar_invoices ai ON p.id = ai.payer_id
WHERE p.clinic_id = 'seu-clinic-id'
GROUP BY p.id, p.name
HAVING COUNT(DISTINCT ai.id) > 0
ORDER BY total_amount DESC;

-- Esperado: 5-10 linhas
```

---

## 🧬 Cenários de Teste

### Cenário 1: Teste Básico de Conciliador

**Pré-requisitos**:
- ✅ Migrations executadas
- ✅ Ter 3-5 ar_invoices com status = 'open'
- ✅ Arquivo CSV/OFX para upload

**Passos**:
1. Acesse: `/clinica/financeiro/conciliacao-bancaria`
2. Clique em "Upload" tab
3. Envie arquivo CSV com 5-10 transações
4. Clique em "Executar Matching"
5. Validar que aparecem matches com % confiança

**Resultado esperado**:
- ✅ Arquivo marcado como "Concluído"
- ✅ Transações aparecem na aba "Matching"
- ✅ Alguns com "auto_exact" ou "auto_fuzzy"
- ✅ Resumo mostra taxa de matching > 0%

---

### Cenário 2: Teste Cockpit Premium

**Pré-requisitos**:
- ✅ Migrations executadas
- ✅ 12+ meses de ar_invoices
- ✅ 3+ profissionais com appointments
- ✅ 2+ convênios/payers

**Passos**:
1. Acesse: `/clinica/financeiro/cockpit-premium`
2. Observe os 12 KPI cards carregando
3. Clique em "Mensal/Trimestral/Anual"
4. Verifique que LineChart atualiza
5. Scroll down para ver más charts

**Resultado esperado**:
- ✅ 12 KPI cards com valores
- ✅ LineChart com evolução
- ✅ BarChart de inadimplência
- ✅ BarChart de profissionais
- ✅ AreaChart de previsão

---

### Cenário 3: Teste de Previsão de Receita

**Pré-requisitos**:
- ✅ 3+ meses de faturamento histórico
- ✅ Função `forecast_revenue()` criada

**Passos**:
1. Abra Cockpit Premium
2. Scroll até seção "Previsão de Receita (30 dias)"
3. Observe AreaChart com linha roxa

**Resultado esperado**:
- ✅ Linha de previsão aparece
- ✅ Valores decrescem em confiança (70% → 20%)
- ✅ Tooltip mostra data e valor previsto

---

## 🐛 Troubleshooting

### Problema: "No data" em KPIs

**Causa**: Sem dados históricos ou clinic_id incorreto

**Solução**:
```sql
-- Verificar dados
SELECT COUNT(*) FROM ar_invoices 
WHERE clinic_id = 'SEU_CLINIC_ID';

-- Criar dados de teste se necessário
INSERT INTO ar_invoices (...) VALUES (...)
```

---

### Problema: "Matching não encontra matches"

**Causa**: Valores/datas muito diferentes

**Solução**:
1. Verifique que ar_invoices têm status = 'open'
2. Verifique que amounts são similares (±5%)
3. Verifique que dates estão próximas (±3 dias)

```sql
-- Debug: Ver invoices que poderiam match
SELECT 
  amount, 
  due_date,
  ABS(amount - 1500.00) as diff,
  due_date - '2026-05-21'::DATE as days_diff
FROM ar_invoices
WHERE clinic_id = 'SEU_CLINIC_ID'
  AND status = 'open'
ORDER BY ABS(amount - 1500.00);
```

---

### Problema: "Menu item não aparece"

**Causa**: menu.js não atualizado

**Solução**:
1. Verifique linhas ~330 em menu.js
2. Procure por `financeiro.analise` → `children`
3. Verifique que `cockpit_premium` está na lista

```javascript
// Deve estar assim:
children: [
  {
    id: 'financeiro.resultado',
    label: 'DRE',
    ...
  },
  {
    id: 'financeiro.dre_dinamica',
    label: 'DRE Dinâmica',
    ...
  },
  {
    id: 'financeiro.conciliacao',
    label: 'Conciliação Bancária',
    ...
  },
  {
    id: 'financeiro.cockpit_premium', // ← Procure isso
    label: 'Cockpit Premium',
    ...
  },
]
```

---

### Problema: "Erro 404 em rotas"

**Causa**: AppRoutes.jsx não atualizado

**Solução**:
1. Abra `src/AppRoutes.jsx`
2. Procure por "Conciliador" (deve ter import)
3. Procure por "conciliacao-bancaria" (deve ter route)
4. Procure por "CockpitPremium" (deve ter import)
5. Procure por "cockpit-premium" (deve ter route)

```javascript
// Imports (linha ~75-80)
import Conciliador from '@/pages/financeiro/Conciliador';
import CockpitPremium from '@/pages/financeiro/CockpitPremium';

// Routes (linha ~425-430)
<Route path="financeiro/conciliacao-bancaria" element={<Conciliador />} />
<Route path="financeiro/cockpit-premium" element={<CockpitPremium />} />
```

---

## 📊 Dados de Teste Recomendados

### Arquivo CSV para Upload (Conciliador)

```csv
Data,Descrição,Valor
2026-05-21,TRANSFERENCIA PACIENTE SILVA,1500.00
2026-05-21,DEPOSITO PACIENTE SANTOS,800.00
2026-05-20,TRANSFERENCIA CONSULTA DR. JOAO,2500.00
2026-05-20,DEPOSITO PACIENTE OLIVEIRA,650.00
2026-05-19,PIX RECEBIDO,1200.00
```

---

## ✅ Checklist de Validação

```
[ ] Migrations executadas sem erro
[ ] Componentes acessíveis via URL
[ ] Menu items aparecem corretamente
[ ] KPIs carregam com dados
[ ] Charts renderizam sem erro
[ ] Upload de extrato funciona
[ ] Matching automático executa
[ ] Relatórios geram corretamente
[ ] Period selector muda dados
[ ] Previsão mostra valores
[ ] Performance aceitável (<2s loading)
[ ] Nenhum erro no console
```

---

**Status de Teste**: Pronto para validação manual ✅
