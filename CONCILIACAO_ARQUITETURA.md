# 🏗️ Arquitetura da Conciliação Bancária - Visão Geral

## 📐 Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────────┐
│              CONCILIAÇÃO BANCÁRIA - FLUXO COMPLETO              │
└─────────────────────────────────────────────────────────────────┘

1. IMPORTAÇÃO
   ┌─────────────────────────────────┐
   │  Usuário escolhe Conta Bancária │
   │  & envia arquivo (CSV/OFX)      │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  useBankStatementParser()       │
   │  ├─ parseCSV() / parseOFX()     │
   │  └─ Retorna: [{date, desc,     │
   │      amount, type}, ...]         │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  importBankStatements()         │
   │  (API)                          │
   │  INSERT em:                     │
   │  - conciliation_bank_statements │
   │  - conciliation_import_batches  │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  UI: ConciliacaoLista           │
   │  Status: 🟡 PENDING x N         │
   │  Indicadores atualizados        │
   └─────────────────────────────────┘


2. BUSCA DE SUGESTÕES
   ┌─────────────────────────────────┐
   │  Usuário clica em lançamento    │
   │  🟡 PENDING                     │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  findSuggestions()              │
   │  (API)                          │
   │  Procura em:                    │
   │  - ap_bills (status != paid)    │
   │  - ar_invoices (status != paid) │
   │  Critérios:                     │
   │  - Valor ±5%                    │
   │  - Data ±2 dias                 │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  calculateMatchScore()          │
   │  Score: 0.0 a 1.0              │
   │  Ordena por melhor match        │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  UI: ConciliacaoPainel          │
   │  Aba: "Sugestões"               │
   │  Mostra: 1. Melhor match (95%)  │
   │          2. 2º melhor (87%)     │
   │          3. ...                 │
   └─────────────────────────────────┘


3. CONCILIAÇÃO
   ┌─────────────────────────────────┐
   │  Usuário clica em sugestão      │
   │  "✓ Conciliar"                  │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  conciliateStatement()          │
   │  (API)                          │
   │  UPDATE:                        │
   │  - status = 'conciliated' 🟢   │
   │  - linked_financial_id = X     │
   │  - linked_type = 'payable'/'receivable' │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  addLinkHistory()               │
   │  INSERT em:                     │
   │  - conciliation_link_history    │
   │  action: 'conciliate'           │
   │  Auditoria completa             │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  UI Atualiza:                   │
   │  - Status muda para 🟢          │
   │  - Indicadores recalculam       │
   │  - Lançamento some da lista     │
   │  - Painel fecha                 │
   └─────────────────────────────────┘


4. CRIAR LANÇAMENTO (sem match)
   ┌─────────────────────────────────┐
   │  Nenhuma sugestão encontrada    │
   │  Usuário vai para aba:          │
   │  "➕ Criar Lançamento"          │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  Preenche formulário:           │
   │  - Tipo (Pagar/Receber)        │
   │  - Descrição                    │
   │  - Data de Vencimento           │
   │  - Categoria (Plano de Contas)  │
   │  - Centro de Custo (opcional)   │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  createAndLinkFinancial()       │
   │  (API)                          │
   │  1. INSERT em ap_bills ou       │
   │     ar_invoices                 │
   │  2. UPDATE conciliation_bank_   │
   │     statements:                 │
   │     - status = 'adjusted' 🔵   │
   │     - linked_financial_id = X   │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  addLinkHistory()               │
   │  action: 'adjust'               │
   │  Rastreio de criação            │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  UI: Status 🔵 ADJUSTED         │
   │  Novo lançamento em AP/AR       │
   │  Pronto para pagamento          │
   └─────────────────────────────────┘


5. MARCAR DIVERGÊNCIA
   ┌─────────────────────────────────┐
   │  Valor não bate ou data está    │
   │  muito diferente                │
   │  Usuário vai para "⚙️ Ações"     │
   │  Seção "Marcar Divergente"      │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  Informa motivo:                │
   │  "Valor diferente em R$ 100"    │
   │  Clica "🔴 Marcar Divergente"  │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  markAsDivergent()              │
   │  (API)                          │
   │  UPDATE:                        │
   │  - status = 'divergent' 🔴     │
   │  - divergence_reason = motivo   │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  UI: Status 🔴 DIVERGENT        │
   │  Aparece com cor vermelha       │
   │  Análise manual necessária      │
   └─────────────────────────────────┘


6. BULK CONCILIATION
   ┌─────────────────────────────────┐
   │  Usuário marca 5 lançamentos    │
   │  com checkbox ☑️☑️☑️☑️☑️        │
   │  Clica "Conciliar Selecionados" │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  Para cada selecionado:         │
   │  1. findSuggestions() para cada │
   │  2. Pega melhor match (score)   │
   │  3. Filtra aqueles com match    │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  Usuário confirma:              │
   │  "Conciliar 4 lançamento(s)?"   │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  Loop: Para cada um:            │
   │  conciliateStatement() x 4      │
   │  addLinkHistory() x 4           │
   └────────────────┬────────────────┘
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  Sucesso: "4 conciliado(s)"     │
   │  Checkboxes limpam              │
   │  Status muda para 🟢            │
   └─────────────────────────────────┘
```

---

## 🗄️ Estrutura de Dados

```
USUÁRIO CLÍNICA
    │
    ├─► CLINIC_ID (FK para clinics)
    │
    ├──► clinic_bank_accounts
    │    ├─ id, clinic_id, account_name, bank_balance, system_balance
    │    └─ last_reconciliation_date
    │
    └──► conciliation_bank_statements (PRINCIPAL)
         ├─ id, clinic_id, bank_account_id
         ├─ statement_date, description, amount, transaction_type
         ├─ status (pending/conciliated/adjusted/divergent/ignored)
         ├─ linked_financial_id (FK para ap_bills OU ar_invoices)
         ├─ linked_type (payable/receivable)
         │
         └──► conciliation_link_history (AUDITORIA)
              ├─ bank_statement_id (FK)
              ├─ financial_id (FK)
              ├─ action (conciliate/adjust/divergent/ignore/unlink)
              ├─ action_notes
              └─ created_at, user_id


INTEGRAÇÃO COM FINANCEIRO:

conciliation_bank_statements ──┐
                               │
                        linked_financial_id
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
               ap_bills            ar_invoices
          (Contas a Pagar)    (Contas a Receber)
            │                      │
            ├─ amount           ├─ amount
            ├─ category_id ────────► plano_contas
            ├─ cost_center_id ─┐
            │                  │
            └─► centro_custos ◄┘


HISTÓRICO E AUDITORIA:

conciliation_link_history
    ├─ 2026-01-10 08:30 | USER_1 | conciliate | statement-123 | financial-456
    ├─ 2026-01-10 08:35 | USER_1 | divergent  | statement-124 | Valor diferente
    ├─ 2026-01-10 08:40 | USER_2 | adjust     | statement-125 | Criou AP-001
    └─ 2026-01-10 09:00 | USER_2 | unlink     | statement-123 | Removeu vínculo
```

---

## 🎯 Componentes e Responsabilidades

```
ConciliacaoBancaria (Página)
    │
    ├─► Orquestra todo fluxo
    ├─► Usa useConciliation() hook
    ├─► Grid: 2/3 (lista) + 1/3 (painel)
    │
    ├──► ConciliaoIndicadores
    │    └─ Mostra 6 cards com métricas (pending, conciliated, etc)
    │
    ├──► ConciliacaoImportacao
    │    ├─ Seleção de conta
    │    ├─ Upload de arquivo
    │    ├─ Preview dos dados
    │    └─ Chama importExtract()
    │
    ├──► ConciliacaoLista (lg:col-span-2)
    │    ├─ Tabela principal
    │    ├─ Filtros (status, tipo, período)
    │    ├─ Checkbox para bulk
    │    ├─ Botão "Conciliar Selecionados"
    │    └─ Emite: onSelectStatement(stmt)
    │
    └──► ConciliacaoPainel (lg:col-span-1)
         ├─ Aba 1: Sugestões
         │  └─ findSuggestionsForStatement()
         │     → Mostra scores de match
         │
         ├─ Aba 2: Criar Lançamento
         │  └─ handleCreateAndLink()
         │     → Cria em AP/AR
         │
         └─ Aba 3: Ações
            ├─ handleMarkDivergent()
            │  → Marca com motivo
            │
            └─ handleIgnore()
               → Ignora com motivo
```

---

## 🔄 Hook: useConciliation(clinicId)

```javascript
// Estado
const [statements] = useState([])
const [loading] = useState(false)
const [error] = useState(null)
const [indicators] = useState({pending, conciliated, adjusted, divergent, ...})
const [bankAccounts] = useState([])
const [suggestions] = useState({}) // [statementId] = [...]
const [selectedStatement] = useState(null)
const [filters] = useState({status, startDate, endDate, accountId, search})

// Efeitos
useEffect(() => {
  if (clinicId && filters) {
    loadStatements()
    loadIndicators()
    loadBankAccounts()
  }
}, [clinicId, filters])

// Funções async
const importExtract = async (items, accountId) => {
  await importBankStatements({clinicId, statements: items, accountId})
  await loadStatements()
  await loadIndicators()
}

const findSuggestionsForStatement = async (statement) => {
  const sugg = await findSuggestions({
    clinicId, amount, description, transactionType, statementDate
  })
  setSuggestions(prev => ({...prev, [statement.id]: sugg}))
}

const handleConciliate = async (statementId, financialId, financialType) => {
  await conciliateStatement(statementId, financialId, financialType)
  await loadStatements()
  await loadIndicators()
  setSelectedStatement(null)
}

const handleCreateAndLink = async (statementId, financialData) => {
  await createAndLinkFinancial({statementId, ...financialData, clinicId})
  await loadStatements()
  await loadIndicators()
  setSelectedStatement(null)
}

const handleMarkDivergent = async (statementId, reason) => {
  await markAsDivergent(statementId, reason)
  await loadStatements()
  await loadIndicators()
}

const handleIgnore = async (statementId, reason) => {
  await ignoreStatement(statementId, reason)
  await loadStatements()
  await loadIndicators()
}
```

---

## 📊 Estados Possíveis de um Lançamento

```
🟡 PENDING (Pendente)
   ├─ Importado
   ├─ Sem vínculo
   ├─ Aguardando ação do usuário
   │
   ├─► Ações: Conciliar | Criar Lançamento | Divergente | Ignorar

🟢 CONCILIATED (Conciliado)
   ├─ Vinculado com lançamento existente
   ├─ linked_financial_id preenchido
   ├─ linked_type preenchido
   ├─ Status final positivo
   │
   └─► Entrada em conciliation_link_history: action='conciliate'

🔵 ADJUSTED (Ajustado)
   ├─ Novo lançamento foi criado em AP/AR
   ├─ linked_financial_id = ID do novo lançamento
   ├─ Lançamento pronto para processamento
   │
   └─► Entrada em conciliation_link_history: action='adjust'

🔴 DIVERGENT (Divergente)
   ├─ Identificada uma divergência
   ├─ divergence_reason preenchida (motivo)
   ├─ Requer análise manual posterior
   │
   └─► Entrada em conciliation_link_history: action='divergent'

⚠️ IGNORED (Ignorado)
   ├─ Não é financeiro (ex: saldo inicial)
   ├─ divergence_reason preenchida (motivo)
   ├─ Não afeta cálculos de saldo
   │
   └─► Entrada em conciliation_link_history: action='ignore'
```

---

## 🎓 Exemplo Prático: Conciliação Passo a Passo

```
CENÁRIO:
Extrato do banco traz uma entrada de PIX de R$ 1.200,00 em 10/01/2026
Sistema tem uma Conta a Receber de R$ 1.200,00 com vencimento em 09/01/2026

ETAPAS:

1️⃣ IMPORTAÇÃO
   - Usuário vai para /clinica/financeiro/conciliacao-bancaria
   - Seleciona conta bancária "Banco Brasil"
   - Escolhe arquivo CSV
   - Sistema exibe 8 transações para importar
   - Clica "Importar"
   - ✅ Sistema cria 8 registros em conciliation_bank_statements
   - ✅ Status de todos = 'pending' 🟡
   - ✅ Indicadores mostram:
       - Pendentes: R$ XXXX
       - Conciliados: R$ 0
       - etc.

2️⃣ VISUALIZAÇÃO
   - ConciliacaoLista mostra tabela com:
     | ☐ | 10/01 | PIX João | +1.200 | Crédito | 🟡 Pendente | →
   - Usuário clica no botão "→" para selecionar

3️⃣ BUSCA DE SUGESTÕES
   - ConciliacaoPainel carrega
   - Aba "Sugestões" é ativada
   - Sistema executa findSuggestions({
       clinicId: 'clinic-123',
       amount: 1200,
       description: 'PIX João',
       transactionType: 'credit',
       statementDate: '2026-01-10'
     })
   - Busca em ar_invoices:
     SELECT * WHERE amount BETWEEN 1140 AND 1260 (±5%)
                 AND status != 'paid'
                 AND status != 'canceled'
                 AND clinic_id = 'clinic-123'
   - Encontra: AR-0512 | Consulta João | 1.200 | 09/01/2026 | open
   - Calcula score:
     * Valor: 1200 == 1200 → 0% diff → score -0%
     * Data: 10/01 vs 09/01 → 1 dia → score -0.075% (dentro de 2 dias)
     * Score final: ~95%
   - ✅ Mostra:
     | Score: 95% | Consulta João | 1.200 | 09/01 | Status: open | ✓ Conciliar

4️⃣ CONCILIAÇÃO
   - Usuário clica "✓ Conciliar"
   - Sistema executa conciliateStatement({
       statementId: 'stmt-123',
       financialId: 'ar-512',
       financialType: 'receivable'
     })
   - UPDATE conciliation_bank_statements:
     SET status = 'conciliated',
         linked_financial_id = 'ar-512',
         linked_type = 'receivable'
     WHERE id = 'stmt-123'
   - INSERT conciliation_link_history:
     bank_statement_id = 'stmt-123'
     financial_id = 'ar-512'
     financial_type = 'receivable'
     action = 'conciliate'
     timestamp = 2026-01-12 10:30
   - ✅ UI Atualiza:
     * Lançamento some da lista (status != pending)
     * Status na tabela (se aparecer em outro filtro): 🟢 Conciliado
     * Indicadores: Pendentes -1.200, Conciliados +1.200
     * Painel fecha
   - ✅ Auditoria completa em conciliation_link_history

5️⃣ IMPACTOS NO SISTEMA
   - Fluxo de Caixa: Recebe o valor conciliado
   - DRE: Mostra entrada de 1.200
   - Saldo do Sistema: Aumenta em 1.200
   - Comparação: Saldo Banco = Saldo Sistema ✅
```

---

## 🚨 Validações e Regras

1. **Valor±5%**: Score diminui conforme afasta-se de 5%
2. **Data±2 dias**: Score diminui conforme afasta-se de 2 dias
3. **Sem duplicação**: Não permite conciliar 2x o mesmo lançamento
4. **Status obrigatório**: Sempre deve ter um status válido
5. **Auditoria**: Toda ação registrada em link_history
6. **Vínculo imutável**: Após conciliado, vínculo é rastreável
7. **Divergência obrigatória**: Requer motivo para divergent/ignored

---

## 🔐 Segurança

- ✅ RLS (Row Level Security): clinic_id filtra dados por clínica
- ✅ Auditoria completa: conciliation_link_history rastreia usuário e timestamp
- ✅ Sem edição: Valores não podem ser editados após criação
- ✅ Histórico imutável: Link history é append-only
- ✅ Validação frontend + backend

---

## 📈 Escalabilidade

- ✅ Índices em clinic_id, status, statement_date
- ✅ Paginação: limit/offset em listBankStatements
- ✅ Cache de sugestões: conciliation_suggestions (opcional)
- ✅ Queries otimizadas com SELECT específicos
- ✅ RPCs para cálculos pesados

---

## 🎯 KPIs Rastreáveis

```
Via indicators:
├─ % Conciliado = conciliated / total
├─ % Divergente = divergent / total
├─ % Ignorado = ignored / total
├─ Tempo médio conciliação = (timestamp - import_date)
├─ Saldo Banco vs Saldo Sistema = difference
└─ Valor pendente = pending amount
```

---

Este é um sistema robusto, escalável e completamente auditável para conciliação bancária em clínicas! 🏥💰
