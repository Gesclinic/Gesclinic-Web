# Enterprise Financial Module - Architecture Diagram

## Component Hierarchy

```
FinancialAccountsPage
├── Header (Page Title + View Toggle + New Account Button)
│
├── DashboardMetricsCards (6 Metric Cards)
│   ├── Saldo Total (Blue)
│   ├── Saldo Conciliado (Green)
│   ├── Entradas Hoje (Green)
│   ├── Saídas Hoje (Red)
│   ├── Previsão 7 dias (Orange)
│   └── Saldo Projetado (Cyan)
│
├── FinancialBalanceSummary (Existing Balance Panel)
│   ├── Total Balance
│   └── By Account Type Breakdown
│
├── FinancialAccountFilters (Search & Filter Controls)
│   ├── Search Box
│   ├── Account Type Filter
│   ├── Bank Filter
│   ├── Status Filter
│   └── Sort Controls
│
├── View Toggle: [Cards | Table]
│   │
│   ├─→ CARD VIEW
│   │   └── Grid of FinancialAccountCard (3 columns)
│   │       ├── Account Header (Name, Bank, Status)
│   │       ├── Balance Section (Current, Reconciled, Forecasted)
│   │       ├── Reconciliation Info
│   │       ├── Last Movement
│   │       └── Action Buttons (Edit, Movements, Set Default, Deactivate)
│   │
│   └─→ TABLE VIEW
│       └── FinancialAccountsTable (Existing)
│           └── Columns: Bank, Account, Type, Balance, Default, Status, Actions
│
├── RecentMovementsPanel (Optional - if movements exist)
│   ├── Header with Movement Count
│   └── List of AccountMovement Items
│       ├── Icon (Up/Down arrow)
│       ├── Description & Amount
│       ├── Date & Origin
│       └── Pagination (if >10 items)
│
├── ReconciliationPanel (Optional - when account selected)
│   ├── Reconciliation Form
│   │   ├── Statement Balance Input
│   │   ├── System Balance Display
│   │   ├── Difference Alert (Green/Yellow)
│   │   ├── Notes Field
│   │   └── Action Buttons (Reconcile / Clear)
│   │
│   └── Reconciliation History
│       ├── Status Badge (Conciliado/Pendente/Divergente)
│       ├── Date & Amounts Comparison
│       └── Previous Records (last 5)
│
└── FinancialAccountForm (Dialog - Create/Edit)
    ├── Basic Fields (existing)
    │   ├── Bank Name
    │   ├── Account Name
    │   ├── Account Type (select)
    │   ├── Agency
    │   ├── Account Number
    │   ├── PIX Key
    │   ├── Initial Balance
    │   └── Currency
    │
    └── Enterprise Fields (future phase)
        ├── Código Banco (text)
        ├── Conta Contábil (select)
        ├── Centro Custo (select)
        ├── Participa Fluxo Caixa (toggle)
        ├── Permite Conciliação (toggle)
        ├── Data Saldo Inicial (date)
        └── Limite Crédito (number)
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│         FinancialAccountsPage (Container)              │
├─────────────────────────────────────────────────────────┤
│ - State: formOpen, editingAccount, selectedAccount     │
│ - Hooks: useAuth(), useFinancialAccounts()              │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ├──────────────────────────┐
                  │                          │
                  ▼                          ▼
        ┌──────────────────┐      ┌──────────────────┐
        │ useFinancial     │      │ useAuth()        │
        │ Accounts Hook    │      │                  │
        ├──────────────────┤      │ - user.id        │
        │ State:           │      │ - isAuthenticated│
        │ - accounts[]     │      └──────────────────┘
        │ - movements[]    │
        │ - metrics        │
        │ - reconciliations│
        │                  │
        │ Methods:         │
        │ - refetch()      │
        │ - refetchMetrics │
        │ - addMovement()  │
        │ - createReconcile│
        └────────┬─────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │   API Service Layer        │
    ├────────────────────────────┤
    │ financialAccountsApi.ts:   │
    │ - listFinancialAccounts()  │
    │ - listAccountMovements()   │
    │ - getDashboardMetrics()    │
    │ - getAccountReconciliation │
    │ - createReconciliation()   │
    │ - createAccountMovement()  │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │   Supabase Client          │
    ├────────────────────────────┤
    │ customSupabaseClient.js    │
    │ (Singleton instance)       │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │   PostgreSQL Database      │
    ├────────────────────────────┤
    │ Tables:                    │
    │ - financial_accounts       │
    │ - account_movements        │
    │ - account_reconciliation   │
    │                            │
    │ RLS Policies:              │
    │ - Clinic isolation         │
    │ - Permissive access        │
    └────────────────────────────┘
```

## Component Memory (React.memo) Strategy

```
Memoized Components (Performance Optimization):
├── DashboardMetricsCards
│   └── Recalculates only when metrics prop changes
│
├── FinancialAccountCard (x3 in card view)
│   └── Recalculates only when account prop changes
│
├── RecentMovementsPanel
│   └── Recalculates only when movements array changes
│
└── ReconciliationPanel
    └── Recalculates only when reconciliations array changes

Non-Memoized (Re-renders with parent):
├── FinancialAccountsTable
├── FinancialAccountFilters
├── FinancialAccountForm (Dialog)
└── FinancialBalanceSummary
```

## State Management Flow

```
User Interaction (e.g., Create Movement)
    │
    ▼
FinancialAccountsPage: handleViewMovements()
    │
    ▼
useFinancialAccounts.addMovement(accountId, data)
    │
    ├─→ createAccountMovement(clinicId, accountId, data)
    │       │
    │       ▼
    │   Supabase Insert
    │
    ├─→ refetchMovements(accountId)
    │       │
    │       ▼
    │   listAccountMovements(clinicId, accountId)
    │       │
    │       ▼
    │   setMovements(data)
    │
    └─→ refetchMetrics()
            │
            ▼
        getDashboardMetrics(clinicId)
            │
            ▼
        setMetrics(data)
            │
            ▼
        Component Re-renders
```

## Data Model

```
FinancialAccount {
  id: UUID
  clinic_id: UUID (Multi-tenant key)
  bank_name: string
  account_name: string
  account_type: CHECKING|SAVINGS|CASH|DIGITAL_WALLET|INVESTMENT|CREDIT_CARD
  agency?: string
  account_number: string
  pix_key?: string
  initial_balance: number
  current_balance: number
  currency: string (default: BRL)
  is_default: boolean
  is_active: boolean
  created_by?: UUID
  created_at: timestamp
  updated_at: timestamp
  
  // NEW: Enterprise fields
  bank_code?: string (001, 237, 341, etc)
  account_chart_code?: string (Accounting code)
  default_cost_center?: UUID
  participates_cashflow: boolean (default: true)
  allows_reconciliation: boolean (default: true)
  balance_date?: DATE
  credit_limit?: number
  reconciliation_status: CONCILIADO|PENDENTE|DIVERGENTE
  last_reconciliation_at?: timestamp
  last_movement_at?: timestamp
  balance_reconciled: number
  balance_pending: number
}

AccountMovement {
  id: UUID
  clinic_id: UUID
  account_id: UUID
  movement_date: DATE
  description: string (max 255)
  amount: number (DECIMAL 15,2)
  movement_type: ENTRADA|SAIDA
  origin?: string (fluxo_caixa|contas_receber|etc)
  notes?: string
  created_by?: UUID
  created_at: timestamp
  updated_at: timestamp
}

AccountReconciliation {
  id: UUID
  clinic_id: UUID
  account_id: UUID
  reconciliation_date: DATE
  balance_statement: number (from bank)
  balance_system: number (from system, auto-calculated)
  difference: number (auto-calculated: statement - system)
  status: CONCILIADO|PENDENTE|DIVERGENTE
  notes?: string
  reconciled_by?: UUID
  reconciled_at?: timestamp
  created_at: timestamp
}

DashboardMetrics {
  total_balance: number (sum of all active accounts)
  reconciled_balance: number (sum of balance_reconciled)
  entries_today: number (sum of movements type=ENTRADA, date=TODAY)
  exits_today: number (sum of movements type=SAIDA, date=TODAY)
  forecast_7_days: number (future: scheduled transactions)
  projected_balance: number (total + entries - exits + forecast)
}
```

## Security Architecture

```
Multi-Layer Security:
│
├─ Layer 1: Database RLS
│   └── clinic_id isolation
│       └── Only clinic's own records visible
│
├─ Layer 2: API Validation
│   └── clinicId parameter validation
│   └── clinic_id enforcement in WHERE clauses
│
├─ Layer 3: Frontend Context
│   └── useClinicContext() provides clinicId
│   └── ProtectedRoute gates access
│
└─ Layer 4: Authentication
    └── useAuth() provides user info
    └── Role-based checks (via menu.js)
```

## Performance Optimizations

```
Current State:
├── React.memo() on metric/movement/reconciliation components
├── Single API calls for metrics (grouped calculation)
├── Pagination on movements (10 per page)
├── Memoized mapping in card view
└── Lazy evaluation of bank names in filters

Future Optimization Candidates:
├── Virtualization for large movement lists (if >100)
├── Caching layer (React Query / SWR)
├── GraphQL batching if RPC complexity increases
└── Offline support for read-only operations
```

---

**Total Components**: 9
**Memoized Components**: 4
**New Database Tables**: 2
**New API Functions**: 5
**Performance Impact**: Minimal (memoization in place)
**Security Level**: Enterprise-grade (multi-layer isolation)
