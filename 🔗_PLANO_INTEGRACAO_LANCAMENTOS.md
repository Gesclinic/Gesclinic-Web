# 🔗 PLANO DE INTEGRAÇÃO - AGENDA ↔ LANÇAMENTOS ↔ DRE

## 📋 Resumo Executivo

Após reorganizar o menu de Financeiro, agora precisamos implementar as integrações que faltam para ter um fluxo completo:

```
┌──────────────┐
│    AGENDA    │──→ Liberar atendimento
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────┐
│ CRIAR AUTOMATICAMENTE:           │
│  1. Conta a Receber (AR)        │
│  2. Lançamento Contábil         │
│  3. Registrar no Fluxo de Caixa │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│ QUANDO RECEBER VALOR:           │
│  1. Baixar AR                    │
│  2. Lançar recebimento em FC    │
│  3. Impactar DRE               │
└──────────────────────────────────┘
```

---

## 🎯 INTEGRAÇÃO 1: AGENDA → LANÇAMENTOS (Quando libera atendimento)

### Localização Atual:
**Arquivo:** `src/pages/clinica/agenda/components/AtendimentoModal.jsx`  
**Função:** `handleLiberar()` (cria AR)

### O que tem hoje:
```javascript
// Cria Conta a Receber ao liberar atendimento
const receivable = await createAccountsReceivable({
  clinicId,
  appointmentId: appointment.id,
  patientId: appointment.patient_id,
  // ... outros dados
});
```

### O que falta:
❌ Criar Lançamento Contábil automaticamente  
❌ Registrar no Fluxo de Caixa (previsão)  
❌ Usar plano de contas correto (conta de receita)

### Implementação Necessária:
```javascript
// 1. Após criar AR, criar lançamento contábil
const transaction = await createFinancialTransaction({
  clinic_id: clinicId,
  date: new Date().toISOString(),
  description: `Receita de atendimento - ${patientName}`,
  account_id: RECEITA_ACCOUNT_ID, // Obter do plano de contas
  cost_center_id: SERVICE_COST_CENTER_ID,
  amount: appointmentValue,
  type: 'entry', // entrada
  status: 'pending', // pendente de recebimento
  origin: 'agenda', // rastrear origem
  related_entity_id: receivable.id,
  related_entity_type: 'accounts_receivable',
  // ... mais dados
});
```

---

## 🎯 INTEGRAÇÃO 2: CONTAS A RECEBER → LANÇAMENTOS (Quando recebe valor)

### Localização Atual:
**Arquivo:** `src/pages/clinica/financeiro/ContasReceber.jsx`  
**Função:** `handleMarcarComoRecebida()`

### O que falta:
❌ Quando marca como recebida, não registra recebimento  
❌ Não cria lançamento de entrada no FC  
❌ Não atualiza DRE

### Implementação Necessária:
```javascript
async function handleMarcarComoRecebida(receivableId, paymentMethod, amount) {
  // 1. Atualizar AR como recebida
  await updateReceivable(receivableId, { status: 'paid', payment_date: today });

  // 2. Criar lançamento de recebimento
  const transaction = await createFinancialTransaction({
    date: today,
    description: `Recebimento de ${receivableId}`,
    account_id: getAccountFromPaymentMethod(paymentMethod), // banco/dinheiro/pix
    cost_center_id: null,
    amount: amount,
    type: 'entry',
    status: 'confirmed',
    origin: 'receivable',
    related_entity_id: receivableId,
    related_entity_type: 'accounts_receivable',
  });

  // 3. Atualizar fluxo de caixa (consolidado em Lançamentos)
  // 4. DRE se atualiza automaticamente (lê lançamentos)
}
```

---

## 🎯 INTEGRAÇÃO 3: CONTAS A PAGAR → LANÇAMENTOS (Quando paga)

### Localização Atual:
**Arquivo:** `src/modules/financeiro/contas-pagar/pages/index.tsx`

### O que falta:
❌ Quando marca como paga, não registra saída  
❌ Não cria lançamento de débito no FC  
❌ Não rastreia origem da despesa

### Implementação Necessária:
```javascript
async function handleMarcarComoPaga(payableId, paymentMethod, amount) {
  // 1. Atualizar AP como paga
  await updatePayable(payableId, { status: 'paid', payment_date: today });

  // 2. Criar lançamento de pagamento
  const transaction = await createFinancialTransaction({
    date: today,
    description: `Pagamento de ${payableId}`,
    account_id: getAccountFromPaymentMethod(paymentMethod), // banco/dinheiro/pix
    cost_center_id: payable.cost_center_id,
    amount: -amount, // negativo para saída
    type: 'exit',
    status: 'confirmed',
    origin: 'payable',
    related_entity_id: payableId,
    related_entity_type: 'accounts_payable',
  });
}
```

---

## 🎯 INTEGRAÇÃO 4: LANÇAMENTOS → FLUXO DE CAIXA (Consolidação)

### Conceito:
O "Fluxo de Caixa" é apenas uma **visualização consolidada** dos Lançamentos, não uma tabela separada!

### Implementação:
```javascript
// Fluxo de Caixa = SELECT de Lançamentos onde status='confirmed'
// Filtrando por conta, período, etc

async function getCashFlow(clinicId, accountId, startDate, endDate) {
  const transactions = await getFinancialTransactions({
    clinic_id: clinicId,
    account_id: accountId,
    date_from: startDate,
    date_to: endDate,
    status: 'confirmed', // apenas realizadas
  });

  // Calcular resumo
  const entradas = transactions
    .filter(t => t.type === 'entry')
    .reduce((sum, t) => sum + t.amount, 0);

  const saidas = transactions
    .filter(t => t.type === 'exit')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    entradas,
    saidas,
    resultado_liquido: entradas - saidas,
    saldo_final: saldoInicial + (entradas - saidas),
  };
}
```

---

## 🎯 INTEGRAÇÃO 5: LANÇAMENTOS → DRE (Resultado Automático)

### Conceito:
DRE é uma **visualização dos Lançamentos** agrupados por conta contábil (plano de contas)

### Estrutura:
```
DRE (Demonstração de Resultado)
├── RECEITAS (contas tipo 'R')
│   ├── Receita de Serviços       [soma lançamentos conta 4.1.1.01]
│   ├── Receita de Convênios      [soma lançamentos conta 4.1.2.01]
│   └── Outras Receitas           [soma lançamentos conta 4.1.9.99]
├── (-) DEDUÇÕES                   [contas tipo 'D']
│   ├── Glosas                     [4.2.1.01]
│   └── Descontos                  [4.2.2.01]
├── DESPESAS OPERACIONAIS (tipo 'P')
│   ├── Pessoal                    [5.1.1.01 - 5.1.1.99]
│   ├── Aluguel                    [5.2.1.01]
│   ├── Utilidades                 [5.3.1.01 - 5.3.9.99]
│   └── Outras                     [5.9.1.01 - 5.9.9.99]
├── EBITDA                         [Receita Líquida - Despesas Op]
├── DEPRECIAÇÃO / AMORTIZAÇÃO
├── RESULTADO OPERACIONAL
└── RESULTADO LÍQUIDO
```

### Implementação:
```javascript
async function calculateDRE(clinicId, startDate, endDate) {
  // 1. Buscar todas as contas do plano de contas
  const accounts = await getChartOfAccounts(clinicId);

  // 2. Para cada conta, somar lançamentos confirmados
  const accountTotals = {};
  for (const account of accounts) {
    const total = await getTotalTransactions({
      clinic_id: clinicId,
      account_id: account.id,
      date_from: startDate,
      date_to: endDate,
      status: 'confirmed',
    });
    accountTotals[account.id] = total;
  }

  // 3. Agrupar por tipo e calcular linha por linha
  const dre = {
    totalReceitas: sum(accountTotals, type === 'R'),
    totalDeducoes: sum(accountTotals, type === 'D'),
    receitaLiquida: totalReceitas - totalDeducoes,
    totalDespesas: sum(accountTotals, type === 'P'),
    ebitda: receitaLiquida - totalDespesas,
    resultadoLiquido: ebitda - depreciacoes,
  };

  return dre;
}
```

---

## 📊 TABELAS NECESSÁRIAS / ATUALIZAÇÕES

### 1. `financial_transactions` (Lançamentos)
**Status:** ✅ Existe, mas precisa adicionar campos

**Campos faltantes:**
```sql
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS (
  origin VARCHAR(50), -- 'agenda', 'receivable', 'payable', 'manual'
  related_entity_type VARCHAR(50), -- 'accounts_receivable', 'accounts_payable'
  related_entity_id UUID, -- ID da AR/AP relacionada
  appointment_id UUID, -- Rastreamento de origem
  reconciliation_id UUID, -- Para conciliação bancária
  notes TEXT -- Observações
);
```

### 2. `chart_of_accounts` (Plano de Contas)
**Status:** ✅ Existe

**Validar campos necessários:**
- id, clinic_id, code, name, type (A/P/R/D/C)
- parent_id (hierarquia)
- is_active, created_at, updated_at

---

## 🔄 FLUXO DE DADOS FINAL

```
┌─────────────────────────────────────────────────────────────┐
│                        AGENDA                               │
│  Libera atendimento → Cria AR + Lançamento Contábil        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓ (automatic)
┌─────────────────────────────────────────────────────────────┐
│              FINANCIAL_TRANSACTIONS                         │
│  Motor financeiro central                                   │
│  - Todas as entradas/saídas passam aqui                    │
│  - Status: pending → confirmed                             │
│  - Rastreia origem (agenda, receivable, payable, manual)   │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ↓                 ↓
┌─────────────────┐ ┌──────────────┐
│ FLUXO DE CAIXA  │ │     DRE      │
│ (Visualização) │ │ (Visualização)│
│ Por Conta       │ │ Por Tipo de  │
│ Por Período     │ │ Conta        │
└─────────────────┘ └──────────────┘
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Agenda → Lançamentos (CRITICAL)
- [ ] Adicionar campos `origin`, `related_entity_*` em financial_transactions
- [ ] Modificar `handleLiberar()` em AtendimentoModal.jsx para criar lançamento
- [ ] Criar função helper `createLancamentoFromAgenda()`
- [ ] Testar: liberar atendimento deve criar AR + Lançamento + impacto FC

### Fase 2: AR → Lançamentos (HIGH)
- [ ] Modificar `handleMarcarComoRecebida()` em ContasReceber.jsx
- [ ] Criar função `createLancamentoRecebimento()`
- [ ] Testar: marcar AR como paga deve registrar entrada no FC

### Fase 3: AP → Lançamentos (HIGH)
- [ ] Modificar módulo contas-pagar para criar lançamento ao pagar
- [ ] Criar função `createLancamentoPagamento()`
- [ ] Testar: marcar AP como paga deve registrar saída no FC

### Fase 4: DRE Automática (MEDIUM)
- [ ] Refatorar DRE para ler Lançamentos em tempo real
- [ ] Implementar cálculo automático por tipo de conta
- [ ] Adicionar drill-down (clicar em linha da DRE → ver lançamentos)

### Fase 5: Validações & Segurança (MEDIUM)
- [ ] RLS para financial_transactions
- [ ] Auditoria de criação automática vs manual
- [ ] Restrições de edição (não pode editar lançamento criado automaticamente)

---

## 📝 NOTAS IMPORTANTES

1. **Lançamentos é o "coração":** Toda movimentação financeira passa aqui
2. **Fluxo de Caixa é uma view:** Não é tabela separada, é consulta consolidada
3. **DRE é automática:** Não precisa de entrada manual, calcula dos lançamentos
4. **Rastreabilidade:** Cada lançamento deve saber sua origem (agenda, manual, integração)
5. **Status importante:** 
   - `pending` = previsto (quando cria AR)
   - `confirmed` = realizado (quando recebe/paga)

---

## 🚀 PRÓXIMA AÇÃO
Implementar Fase 1 (Agenda → Lançamentos) como prioridade crítica

