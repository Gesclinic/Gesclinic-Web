# 💰 Módulo de Contas Financeiras - Gesclinic

## 📋 Visão Geral

Módulo enterprise para gerenciamento completo de contas financeiras da clínica. Permite controlar bancos, caixas, carteiras digitais, aplicações e saldos consolidados.

## 🎯 Funcionalidades Implementadas

### ✅ CRUD Completo
- ✅ Criar nova conta financeira
- ✅ Editar conta existente
- ✅ Ativar/Inativar conta (soft delete)
- ✅ Definir conta como padrão
- ✅ Listagem com paginação e filtros

### ✅ Tipos de Conta Suportados
1. **Conta Corrente** (CHECKING)
2. **Conta Poupança** (SAVINGS)
3. **Caixa** (CASH)
4. **Carteira Digital** (DIGITAL_WALLET)
5. **Aplicação/Investimento** (INVESTMENT)
6. **Cartão de Crédito** (CREDIT_CARD)

### ✅ Dashboard de Saldos
- Saldo total consolidado
- Saldo por tipo de conta
- Saldo por banco
- Conta padrão destacada
- Contagem de contas ativas

### ✅ Filtros e Busca
- Busca por banco, nome ou número da conta
- Filtro por tipo de conta
- Filtro por banco
- Filtro por status (ativa/inativa)
- Ordenação customizável (nome, saldo, tipo, data)

### ✅ Segurança
- **RLS (Row Level Security)** ativado
- Isolamento por clinic_id
- Controle de acesso por role (ADMIN, MANAGER, FINANCIAL)
- Auditoria completa de todas operações
- Soft delete (nunca excluir, apenas desativar)

### ✅ Auditoria
- Tabela `financial_accounts_audit` com histórico completo
- Rastreamento de usuário que fez alteração
- Registro de fields modificados
- Valores antigos e novos

### ✅ Regras de Negócio
- Apenas 1 conta padrão por clínica (enforçado por trigger)
- Saldo inicial configurável
- Suporte a múltiplas moedas (BRL, USD, EUR)
- Chave PIX configurável
- Agência e número da conta

## 📁 Estrutura de Arquivos

```
src/modules/financeiro/contas-financeiras/
├── types.ts                          # Tipos TypeScript, enums, interfaces
├── index.ts                          # Barrel export principal
├── components/
│   ├── FinancialAccountForm.tsx      # Dialog para criar/editar
│   ├── FinancialAccountsTable.tsx    # Tabela com listagem
│   ├── FinancialAccountCard.tsx      # Card individual de conta
│   ├── FinancialBalanceSummary.tsx   # Dashboard de saldos
│   ├── FinancialAccountFilters.tsx   # Filtros e busca
│   └── index.ts                      # Exports dos componentes
├── hooks/
│   ├── useFinancialAccounts.ts       # Hook principal de gerenciamento
│   └── index.ts                      # Exports dos hooks
├── services/
│   ├── financialAccountsApi.ts       # API service com todas operações
│   └── index.ts                      # Exports dos serviços
└── pages/
    ├── FinancialAccountsPage.tsx     # Página principal
    └── index.ts                      # Exports da página
```

## 🗄️ Database

### Tabela: `financial_accounts`

```sql
-- Campos principais
id UUID PRIMARY KEY
clinic_id UUID (references clinics.id)
bank_name VARCHAR(255) NOT NULL
account_name VARCHAR(255) NOT NULL - UNIQUE por clínica
account_type account_type_enum (CHECKING|SAVINGS|CASH|DIGITAL_WALLET|INVESTMENT|CREDIT_CARD)
agency VARCHAR(30)
account_number VARCHAR(50) NOT NULL
pix_key VARCHAR(255)
initial_balance NUMERIC(15,2)
current_balance NUMERIC(15,2)
currency VARCHAR(10) DEFAULT 'BRL'
is_default BOOLEAN DEFAULT false
is_active BOOLEAN DEFAULT true
created_by UUID (references auth.users.id)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### Tabela: `financial_accounts_audit`

Rastreia todas as mudanças:
- action (CREATE|UPDATE)
- changed_fields (quais campos foram alterados)
- old_values (valores anteriores)
- new_values (novos valores)
- changed_by (usuário que fez a mudança)
- changed_at (quando foi alterado)

### Índices de Performance
```sql
idx_financial_accounts_clinic_id
idx_financial_accounts_is_active
idx_financial_accounts_clinic_default
idx_financial_accounts_account_type
idx_financial_accounts_audit_clinic_id
idx_financial_accounts_audit_account_id
```

### Triggers
1. **ensure_single_default_account**: Garante apenas 1 conta padrão por clínica
2. **update_financial_accounts_timestamp**: Atualiza `updated_at` automaticamente
3. **audit_financial_accounts**: Registra todas operações na tabela de auditoria

## 🚀 Como Usar

### 1. Aplicar Migrations

Execute a migration SQL no Supabase:

```bash
# No Supabase Dashboard → SQL Editor → Cole o conteúdo
supabase/migrations/2026-05-12_create_financial_accounts.sql
```

### 2. Acessar a Página

```
http://localhost:3000/clinica/financeiro/contas-financeiras
```

### 3. Criar Nova Conta

1. Clique em "Nova Conta"
2. Preencha os dados:
   - Nome do Banco (obrigatório)
   - Nome da Conta (obrigatório)
   - Tipo de Conta (obrigatório)
   - Agência (opcional)
   - Número da Conta (obrigatório)
   - Chave PIX (opcional)
   - Saldo Inicial (obrigatório)
   - Moeda
3. Clique em "Criar Conta"

### 4. Editar Conta

1. Clique no ícone de lápis ✏️
2. Altere os dados necessários
3. Opcionalmente, defina como padrão ou desative
4. Clique em "Atualizar"

### 5. Definir Conta Padrão

Clique na estrela ⭐ para definir uma conta como padrão. Apenas 1 por clínica.

### 6. Desativar Conta

Clique na lixeira 🗑️ e confirme. A conta será marcada como inativa mas mantida para auditoria.

## 🔐 RLS Policies

### Permissões Implementadas

**SELECT (Visualizar)**
- Usuários podem ver contas de sua clínica

**INSERT (Criar)**
- Apenas ADMIN, MANAGER, FINANCIAL
- Isolamento por clinic_id automático

**UPDATE (Editar)**
- Apenas ADMIN, MANAGER, FINANCIAL
- Isolamento por clinic_id automático

**DELETE**
- Não permitido (soft delete apenas)
- Histórico sempre mantido para auditoria

## 📊 API Service Methods

```typescript
// Listar com filtros
listFinancialAccounts(clinicId, options?)

// Obter uma conta
getFinancialAccount(accountId)

// Criar
createFinancialAccount(clinicId, input)

// Atualizar
updateFinancialAccount(accountId, input)

// Desativar (soft delete)
deactivateFinancialAccount(accountId)

// Definir como padrão
setDefaultFinancialAccount(accountId)

// Resumo consolidado de saldos
getConsolidatedBalanceSummary(clinicId)

// Conta padrão
getDefaultFinancialAccount(clinicId)

// Histórico de auditoria
getFinancialAccountAuditHistory(accountId, limit?)

// Saldo por tipo
getBalanceByAccountType(clinicId, accountType)
```

## 🎨 Componentes

### FinancialAccountForm
Dialog para criar/editar contas. Valida:
- Campos obrigatórios
- Saldo não negativo
- Nomes únicos por clínica

### FinancialAccountsTable
Tabela com:
- Informações de conta
- Saldo formatado por moeda
- Status ativo/inativo
- Ações (editar, desativar, definir padrão)

### FinancialBalanceSummary
Dashboard com:
- Saldo total
- Saldo por tipo de conta
- Saldo por banco
- Ícones visuais

### FinancialAccountFilters
Filtros com:
- Busca textual
- Filtro por tipo
- Filtro por banco
- Filtro por status
- Ordenação customizável

### FinancialAccountCard
Card compacto mostrando:
- Nome e banco
- Tipo de conta com ícone
- Número e agência
- Saldo atual
- Status

## 🔗 Integração Futura

Este módulo foi projetado para integração com:

1. **Fluxo de Caixa** - Usar saldos para criar fluxograma
2. **Contas a Receber** - Registrar recebimentos
3. **Contas a Pagar** - Registrar pagamentos
4. **Conciliação Bancária** - Comparar com extratos
5. **Importação OFX** - Importar extratos bancários
6. **Extrato Financeiro** - Gerar relatórios por período
7. **Dashboard Financeiro** - Exibir saldos em tempo real

**NÃO foi implementado nesta fase:**
- Movimentações/transações
- Fluxo de caixa
- Integração com recebimentos
- Integração com pagamentos
- Conciliação automática

## ⚙️ Hook: useFinancialAccounts

```typescript
const {
  // Data
  accounts,
  balanceSummary,
  
  // Loading states
  loading,
  loadingBalance,
  error,
  
  // Pagination
  total,
  page,
  pageSize,
  
  // Operations
  refetch,
  refetchBalance,
  create,
  update,
  deactivate,
  setDefault,
  
  // Filters
  setFilters,
  filters,
} = useFinancialAccounts(initialFilters);
```

## 📝 Tipos TypeScript

```typescript
// Account type enum
enum AccountType {
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS',
  CASH = 'CASH',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  INVESTMENT = 'INVESTMENT',
  CREDIT_CARD = 'CREDIT_CARD',
}

// Main model
interface FinancialAccount {
  id: string;
  clinic_id: string;
  bank_name: string;
  account_name: string;
  account_type: AccountType;
  agency?: string;
  account_number: string;
  pix_key?: string;
  initial_balance: number;
  current_balance: number;
  currency: string;
  is_default: boolean;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Create input
interface FinancialAccountCreateInput {
  bank_name: string;
  account_name: string;
  account_type: AccountType;
  agency?: string;
  account_number: string;
  pix_key?: string;
  initial_balance: number;
  currency?: string;
  is_default?: boolean;
}

// Update input
interface FinancialAccountUpdateInput {
  bank_name?: string;
  account_name?: string;
  account_type?: AccountType;
  agency?: string;
  account_number?: string;
  pix_key?: string;
  initial_balance?: number;
  is_default?: boolean;
  is_active?: boolean;
}
```

## ✅ Checklist de Implementação

- [x] Database schema criado
- [x] Migrations SQL com RLS
- [x] Triggers para auditoria
- [x] Tipos TypeScript completos
- [x] API service com todas operações
- [x] Hook useFinancialAccounts
- [x] Componente FinancialAccountForm
- [x] Componente FinancialAccountsTable
- [x] Componente FinancialBalanceSummary
- [x] Componente FinancialAccountCard
- [x] Componente FinancialAccountFilters
- [x] Página principal FinancialAccountsPage
- [x] Rota integrada em AppRoutes.jsx
- [x] Validações implementadas
- [x] Isolamento multi-clínica
- [x] RLS policies
- [x] Barrel exports

## 🧪 Próximos Passos (Não implementado nesta fase)

1. **Testes Unitários** - Jest + React Testing Library
2. **Testes E2E** - Cypress
3. **Movimentações** - Registrar transações
4. **Fluxo de Caixa** - Integrar com contas
5. **Conciliação** - Comparar com extratos
6. **Relatórios** - Gerar por período
7. **Dashboard** - Exibir em tempo real
8. **Exportação** - Gerar PDF/Excel

## 📞 Suporte

Para dúvidas ou issues:
1. Verifique as políticas RLS no Supabase
2. Verifique se a migration foi aplicada
3. Verifique os logs do browser (F12)
4. Verifique os logs do Supabase

---

**Data de Implementação**: 12 de Maio de 2026  
**Versão**: 1.0.0  
**Status**: ✅ Completo - Pronto para produção
