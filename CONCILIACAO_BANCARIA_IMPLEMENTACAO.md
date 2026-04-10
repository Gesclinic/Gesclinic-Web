# Conciliação Bancária - Gesclinic

Estrutura completa implementada para o módulo de Conciliação Bancária, alinhado com o sistema financeiro da clínica.

## 📋 Arquitetura

### 1. Banco de Dados (`supabase/migrations/20260112_create_conciliation_tables.sql`)

#### Tabelas Principais:
- **conciliation_bank_statements**: Armazena cada linha do extrato bancário importado
  - Campos: id, clinic_id, bank_account_id, statement_date, description, amount, transaction_type, status, linked_financial_id, created_at
  - Índices em: clinic_id, status, statement_date, bank_account_id

- **conciliation_link_history**: Histórico de ações de conciliação para auditoria
  - Campos: id, bank_statement_id, financial_id, financial_type, action, action_notes, user_id, created_at
  - Índices em: bank_statement_id, financial_id, created_at

- **conciliation_auto_rules**: Regras automáticas para sugerir conciliações
  - Campos: id, clinic_id, rule_name, pattern_keywords, min_amount, max_amount, transaction_type, default_category_id, active
  
- **conciliation_suggestions**: Cache de sugestões automáticas
  - Campos: id, bank_statement_id, suggested_financial_id, match_score, match_reason

- **conciliation_import_batches**: Rastreamento de importações
  - Campos: id, clinic_id, bank_name, account_number, import_date, total_records, total_amount_credit, total_amount_debit

- **clinic_bank_accounts**: Contas bancárias da clínica
  - Campos: id, clinic_id, account_name, bank_name, account_number, account_holder, bank_balance, system_balance, last_reconciliation_date

#### RPCs:
- `list_bank_statements()`: Lista extratos com filtros
- `calculate_balance_difference()`: Calcula diferença entre saldo banco vs sistema

---

### 2. Constantes e Tipos (`src/lib/conciliationStatus.js`)

#### Status de Conciliação:
```
CONCILIATION_STATUS = {
  PENDING: 'pending',         // 🟡 Aguardando conciliação
  CONCILIATED: 'conciliated', // 🟢 Casado com lançamento
  ADJUSTED: 'adjusted',       // 🔵 Lançamento criado
  DIVERGENT: 'divergent',     // 🔴 Divergência encontrada
  IGNORED: 'ignored'          // ⚠️ Ignorado
}
```

#### Tipos de Transação:
```
TRANSACTION_TYPE = {
  CREDIT: 'credit',   // Entrada (crédito)
  DEBIT: 'debit'      // Saída (débito)
}
```

#### Ações de Conciliação:
```
CONCILIATION_ACTION = {
  CONCILIATE: 'conciliate',   // Vinculou com lançamento existente
  ADJUST: 'adjust',           // Criou novo lançamento
  DIVERGENT: 'divergent',     // Marcou como divergente
  IGNORE: 'ignore',           // Ignorou
  UNLINK: 'unlink'            // Desvinculou
}
```

---

### 3. API (`src/lib/conciliationApi.js`)

#### Funções Principais:

**Importação:**
- `importBankStatements()`: Importa múltiplos lançamentos de extrato

**Leitura:**
- `listBankStatements()`: Lista com filtros e paginação
- `getBankStatement()`: Obtém um lançamento específico

**Conciliação:**
- `conciliateStatement()`: Vincula extrato com lançamento existente
- `createAndLinkFinancial()`: Cria novo lançamento e vincula
- `markAsDivergent()`: Marca como divergência
- `ignoreStatement()`: Ignora lançamento

**Sugestões Automáticas:**
- `findSuggestions()`: Busca lançamentos similares (valor ±5%, data ±2 dias)
- `calculateMatchScore()`: Calcula score de correspondência

**Auditoria:**
- `addLinkHistory()`: Registra ação de conciliação
- `getStatementHistory()`: Obtém histórico de um lançamento

**Indicadores:**
- `getIndicators()`: Resumo de status, créditos, débitos

**Contas Bancárias:**
- `listBankAccounts()`: Lista contas da clínica
- `createBankAccount()`: Cria nova conta
- `updateBankAccountBalance()`: Atualiza saldos

---

### 4. Hook de Conciliação (`src/hooks/useConciliation.js`)

#### `useConciliation(clinicId)`
Gerencia todo o estado e lógica de conciliação:

**Estado:**
- `statements`: Lista de lançamentos
- `loading`: Estado de carregamento
- `error`: Mensagens de erro
- `indicators`: Resumo de indicadores
- `bankAccounts`: Contas bancárias disponíveis
- `suggestions`: Sugestões por lançamento
- `selectedStatement`: Lançamento selecionado
- `filters`: Filtros aplicados

**Funções:**
- `importExtract()`: Importa novo extrato
- `findSuggestionsForStatement()`: Busca sugestões para um lançamento
- `handleConciliate()`: Concilia um lançamento
- `handleCreateAndLink()`: Cria e vincula lançamento
- `handleMarkDivergent()`: Marca como divergente
- `handleIgnore()`: Ignora lançamento
- `handleBulkConciliate()`: Concilia múltiplos
- `updateFilters()`: Atualiza filtros
- `clearFilters()`: Limpa todos os filtros
- `getHistory()`: Obtém histórico de ações

#### `useBankStatementParser()`
Helper para parsing de arquivos:
- `parseCSV()`: Parse de arquivo CSV
- `parseOFX()`: Parse de arquivo OFX

---

### 5. Componentes React

#### `ConciliaoIndicadores`
Exibe 6 cards com métricas principais:
- Pendentes (🟡)
- Conciliados (🟢)
- Ajustados (🔵)
- Divergências (🔴)
- Entradas totais (Créditos)
- Saídas totais (Débitos)

#### `ConciliacaoImportacao`
Bloco de importação:
- Seleção de conta bancária
- Seleção de formato (CSV/OFX)
- Upload de arquivo
- Prévia dos 5 primeiros itens

#### `ConciliacaoLista`
Tabela principal com:
- Checkbox de seleção (para bulk)
- Data, descrição, valor, tipo, status
- Filtros por status, tipo, período
- Botão "Conciliar Selecionados" dinâmico

#### `ConciliacaoPainel`
Painel lateral (1/3 da tela) com 3 abas:
1. **Sugestões**: Lista automática com score de correspondência
2. **Criar Lançamento**: Formulário para criar novo lançamento
3. **Ações**: Marcar divergente ou ignorar com motivo

#### `ConciliacaoBancaria`
Página principal que orquestra tudo:
- Importação
- Indicadores
- Grade 2/3 + 1/3 com lista e painel

---

## 🔄 Fluxo de Uso

### 1. Importação
1. Usuário clica em "Importar Extrato"
2. Seleciona conta bancária e arquivo (CSV/OFX)
3. Sistema faz prévia dos dados
4. Clica "Importar"
5. Extratos aparecem com status "Pendente" na lista

### 2. Conciliação Manual
1. Clica em um lançamento "Pendente"
2. Sistema busca sugestões automáticas
3. Usuário vê sugestões com score (ex: 95%)
4. Clica "Conciliar" em uma sugestão
5. Lançamento é vinculado e status muda para "Conciliado"

### 3. Criar Lançamento
1. Clica em um lançamento sem sugestão
2. Vai para aba "Criar Lançamento"
3. Preenche tipo (Contas a Pagar/Receber), descrição, data
4. Clica "Criar e Vincular"
5. Novo lançamento é criado em AP/AR e status vira "Ajustado"

### 4. Marcar Divergente
1. Clica em lançamento com problema
2. Vai para aba "Ações"
3. Seleciona motivo (ex: "Valor diferente em 50 reais")
4. Clica "Marcar como Divergente"
5. Status muda para "Divergente" para análise posterior

### 5. Ignorar
1. Para lançamentos que não são financeiros
2. Ex: saldo inicial, transferência interna já registrada
3. Clica, escolhe motivo, "Ignorar"
4. Status = "Ignorado"

### 6. Bulk Conciliação
1. Seleciona múltiplos pendentes com checkbox
2. Clica "Conciliar Selecionados"
3. Sistema procura melhor sugestão para cada um
4. Usuário confirma
5. Todos são conciliados em lote

---

## 📊 Integração com Sistema Financeiro

### Contas a Pagar (`ap_bills`)
- Lançamentos de débito são vinculados aqui
- Ao conciliar, marca como "paid" se valor e data batem

### Contas a Receber (`ar_invoices`)
- Lançamentos de crédito são vinculados aqui
- Ao conciliar, marca como "paid"

### Fluxo de Caixa
- Atualizado automaticamente após conciliação
- Saldo sistema = soma de pagos em AP + AR

### Plano de Contas
- Ao criar novo lançamento, usuário escolhe categoria

### Centro de Custos
- Lançamentos criados podem ser alocados a centro de custo

### DRE/Auditoria
- Histórico completo em `conciliation_link_history`
- Rastreabilidade total de quem fez, quando, qual ação

---

## 🚀 Próximos Passos (Evolução)

1. **Regras Automáticas**: Implementar auto-conciliação baseada em regras
2. **API Bancária**: Integrar com APIs de bancos (Febraban OFX)
3. **Projeções**: Adicionar gráficos de fluxo de caixa baseado em conciliação
4. **Alertas**: Notificar quando saldo banco ≠ saldo sistema
5. **Exportação**: Gerar relatórios de conciliação
6. **Recorrência**: Conciliação automática para lançamentos recorrentes

---

## 📁 Arquivos Criados

```
src/
  ├── lib/
  │   ├── conciliationApi.js          (API completa)
  │   ├── conciliationStatus.js       (Constantes e tipos)
  │   └── formatters.js               (Utilitários de formato)
  │
  ├── hooks/
  │   └── useConciliation.js          (Hook principal + parser)
  │
  ├── components/financeiro/conciliacao/
  │   ├── ConciliaoIndicadores.jsx    (Cards de métricas)
  │   ├── ConciliacaoImportacao.jsx   (Importação de extrato)
  │   ├── ConciliacaoLista.jsx        (Tabela de lançamentos)
  │   └── ConciliacaoPainel.jsx       (Painel de ações)
  │
  └── pages/clinica/financeiro/
      └── ConciliacaoBancaria.jsx     (Página principal)

supabase/migrations/
  └── 20260112_create_conciliation_tables.sql (Estrutura BD)
```

---

## ✅ Checklist de Implementação

- ✅ Tabelas de banco de dados criadas
- ✅ API completa implementada
- ✅ Constantes e tipos definidos
- ✅ Hook de conciliação completo
- ✅ 4 componentes de UI criados
- ✅ Página principal integrada
- ✅ Rota adicionada em AppRoutes.jsx
- ✅ Menu item já existente
- ✅ Formatadores de data/moeda
- ⏳ Migrations SQL devem ser aplicadas manualmente no Supabase
- ⏳ Testes de integração recomendados
