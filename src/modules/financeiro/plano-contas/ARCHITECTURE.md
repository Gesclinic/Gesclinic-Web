# 🏗️ ARQUITETURA - Módulo Plano de Contas

## 📐 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERFACE USUÁRIO                        │
│              ChartOfAccountsPage Component                  │
│  (Tree View / Table View / Form View)                       │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  COMPONENTES REACT                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ChartOfAccountsTree     ChartOfAccountsTable        │   │
│  │ ChartOfAccountsForm     ChartOfAccountsFilters      │   │
│  │ AccountTypeBadge                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   CUSTOM HOOKS                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ useChartOfAccounts    useChartOfAccountAudit        │   │
│  │ State Management      Audit Logs                     │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   API SERVICES                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ chartOfAccountsApi.ts - 11 Funções                 │   │
│  │ • CRUD Operations                                   │   │
│  │ • Filters & Search                                  │   │
│  │ • Hierarchy Management                              │   │
│  │ • Audit Logging                                     │   │
│  │ • Validation                                        │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                 SUPABASE CLIENT                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ customSupabaseClient                                │   │
│  │ • .from().select()  - Query data                    │   │
│  │ • .rpc()            - Call RPC functions            │   │
│  │ • Automatic RLS     - Security                      │   │
│  │ • User context      - Auth                          │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│           SUPABASE POSTGRESQL DATABASE                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ TABLES:                                             │   │
│  │ • financial_chart_of_accounts                       │   │
│  │ • financial_chart_of_accounts_audit                 │   │
│  │                                                      │   │
│  │ SECURITY:                                           │   │
│  │ • 7 RLS Policies                                    │   │
│  │ • clinic_id Isolation                               │   │
│  │ • Role-based Access                                 │   │
│  │                                                      │   │
│  │ FUNCTIONS:                                          │   │
│  │ • get_chart_of_accounts_tree()                      │   │
│  │ • can_delete_chart_account()                        │   │
│  │ • financial_chart_of_accounts_audit_trigger()       │   │
│  │                                                      │   │
│  │ INDEXES:                                            │   │
│  │ • 7 Strategic Indexes                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUXO DE DADOS

### Criar uma Nova Conta

```
User Interaction
      ↓
ChartOfAccountsPage → handleCreate()
      ↓
ChartOfAccountsForm → form.onSubmit()
      ↓
useChartOfAccounts → createAccount()
      ↓
chartOfAccountsApi.ts → createChartOfAccount()
      ↓
Supabase → INSERT financial_chart_of_accounts
      ↓
Trigger → INSERT financial_chart_of_accounts_audit
      ↓
RLS Policy → VERIFY clinic_id & role
      ↓
Success → State Update → UI Re-render
      ↓
fetchTree() → Update Component State
      ↓
UI Reflects Changes (New account in tree/table)
```

### Listar Contas com Filtros

```
User Interaction (Apply Filters)
      ↓
ChartOfAccountsPage → setFilters()
      ↓
useChartOfAccounts → fetchAccounts(filters)
      ↓
chartOfAccountsApi.ts → listChartOfAccounts()
      ↓
Supabase Query:
  FROM financial_chart_of_accounts
  WHERE clinic_id = authenticated_clinic
  AND (type = filter OR name ILIKE filter...)
  ORDER BY code
  LIMIT/OFFSET pagination
      ↓
RLS Policy → VERIFY clinic_id access
      ↓
Indexes Used:
  - idx_financial_chart_of_accounts_clinic_active
  - idx_financial_chart_of_accounts_code
      ↓
Results → State Update
      ↓
ChartOfAccountsTable Re-renders
```

### Recuperar Árvore Hierárquica

```
Component Mount
      ↓
useChartOfAccounts → fetchTree()
      ↓
chartOfAccountsApi.ts → getChartOfAccountsTree()
      ↓
Supabase RPC → get_chart_of_accounts_tree(clinic_id)
      ↓
RPC Function:
  SELECT * FROM financial_chart_of_accounts
  WHERE clinic_id = p_clinic_id
  ORDER BY parent_id NULLS FIRST, code
      ↓
RLS Policy → VERIFY clinic_id access
      ↓
Results + Build Tree Structure
      ↓
Parent-Child Relationships Established
      ↓
State Update: tree = [root1, root2, ...]
      ↓
ChartOfAccountsTree Renders Hierarchy
```

---

## 🛡️ SEGURANÇA - CAMADAS

### Layer 1: Authentication
```
┌─────────────────────────┐
│  Supabase Auth (JWT)    │
│  - Login/Register       │
│  - Session Management   │
│  - Token Validation     │
└─────────────────────────┘
        ↓
auth.uid() available in all queries
```

### Layer 2: Authorization
```
┌────────────────────────────────┐
│  Role-Based Access Control     │
│  - admin (full access)         │
│  - financeiro (read+write)     │
│  - Verified via user_clinic_roles
└────────────────────────────────┘
        ↓
RLS policies check role before operation
```

### Layer 3: RLS Policies
```
┌──────────────────────────────────┐
│  Row Level Security Policies     │
│  - SELECT: clinic_id match       │
│  - INSERT: role + clinic check   │
│  - UPDATE: role + clinic check   │
│  - DELETE: admin only            │
│  - 7 total policies              │
└──────────────────────────────────┘
        ↓
Database enforces access at row level
```

### Layer 4: Validation
```
┌───────────────────────────┐
│  Business Logic Validation │
│  - Frontend validation    │
│  - Backend constraints    │
│  - No delete with children│
│  - No delete with entries │
│  - Unique codes per clinic│
└───────────────────────────┘
        ↓
Prevents invalid states
```

### Layer 5: Audit Trail
```
┌──────────────────────────┐
│  Automatic Audit Logging │
│  - Trigger on INSERT     │
│  - Trigger on UPDATE     │
│  - Trigger on DELETE     │
│  - old_values, new_values│
│  - User tracking         │
│  - Timestamp             │
└──────────────────────────┘
        ↓
All changes recorded immutably
```

---

## 📊 DATA MODEL

### Table: financial_chart_of_accounts

```sql
financial_chart_of_accounts
├── id (UUID)                    [PK]
├── clinic_id (UUID)             [FK → clinics, Required]
├── parent_id (UUID)             [FK → self, Nullable]
├── code (VARCHAR 30)            [Unique per clinic]
├── name (VARCHAR 255)
├── description (TEXT)
├── type (VARCHAR 50)            [RECEITA|DESPESA|ATIVO|PASSIVO|PATRIMONIO]
├── nature (VARCHAR 20)          [CREDORA|DEVEDORA]
├── level (INTEGER)              [1-N, calculated from hierarchy]
├── is_active (BOOLEAN)          [Default: true]
├── accepts_entries (BOOLEAN)    [Default: false]
├── created_by (UUID)            [FK → auth.users]
├── created_at (TIMESTAMPTZ)     [Now()]
└── updated_at (TIMESTAMPTZ)     [Now()]

Constraints:
  - UNIQUE(clinic_id, code)
  - CHECK type IN (...)
  - CHECK nature IN (...)
  - parent_id must be same clinic_id
  - Indexes: 7 strategic indexes
```

### Table: financial_chart_of_accounts_audit

```sql
financial_chart_of_accounts_audit
├── id (UUID)                    [PK]
├── account_id (UUID)            [FK → financial_chart_of_accounts]
├── clinic_id (UUID)             [FK → clinics]
├── action (VARCHAR 20)          [INSERT|UPDATE|DELETE]
├── changed_by (UUID)            [FK → auth.users]
├── old_values (JSONB)           [Null for INSERT]
├── new_values (JSONB)           [Full row data]
└── changed_at (TIMESTAMPTZ)     [Now()]

Purpose:
  - Track all changes
  - Compliance/Audit
  - Debugging
  - Recovery

Retention:
  - Kept indefinitely
  - Can be archived periodically
```

---

## 🔑 TIPOS DE CONTA

### Hierarquia Contábil

```
RECEITA (Crédito)
├─ 1 RECEITAS
│  ├─ 1.1 CONSULTAS
│  │  ├─ 1.1.01 PARTICULAR
│  │  ├─ 1.1.02 CONVÊNIO
│  │  └─ 1.1.03 INTERNAÇÃO
│  ├─ 1.2 SESSIONS
│  └─ 1.3 OUTROS SERVIÇOS
├─ 2 RECEITAS FINANCEIRAS
└─ 3 RECEITAS EXTRAORDINÁRIAS

DESPESA (Débito)
├─ 4 DESPESAS
│  ├─ 4.1 PESSOAL
│  │  ├─ 4.1.1 SALÁRIOS
│  │  ├─ 4.1.2 ENCARGOS
│  │  └─ 4.1.3 BENEFÍCIOS
│  ├─ 4.2 OPERACIONAL
│  ├─ 4.3 ADMINISTRATIVO
│  └─ 4.4 FINANCEIRA

ATIVO (Débito)
├─ 5 ATIVO CIRCULANTE
│  ├─ 5.1 CAIXA
│  ├─ 5.2 BANCOS
│  └─ 5.3 CLIENTES
└─ 6 ATIVO NÃO-CIRCULANTE

PASSIVO (Crédito)
├─ 7 PASSIVO CIRCULANTE
│  ├─ 7.1 FORNECEDORES
│  └─ 7.2 IMPOSTOS
└─ 8 PASSIVO NÃO-CIRCULANTE

PATRIMONIO (Crédito)
└─ 9 PATRIMÔNIO LÍQUIDO
   ├─ 9.1 CAPITAL SOCIAL
   └─ 9.2 LUCROS ACUMULADOS
```

---

## ⚡ PERFORMANCE OPTIMIZATION

### Índices Estratégicos

```sql
1. idx_financial_chart_of_accounts_clinic_id
   └─ SELECT ... WHERE clinic_id = X
   └─ Used by: Most queries (RLS policy)

2. idx_financial_chart_of_accounts_parent_id
   └─ SELECT ... WHERE parent_id = X
   └─ Used by: Tree building, child lookups

3. idx_financial_chart_of_accounts_code
   └─ SELECT ... WHERE code LIKE '%search%'
   └─ Used by: Code search/lookup

4. idx_financial_chart_of_accounts_type
   └─ SELECT ... WHERE type = 'RECEITA'
   └─ Used by: Type filtering

5. idx_financial_chart_of_accounts_is_active
   └─ SELECT ... WHERE is_active = true
   └─ Used by: Status filtering

6. idx_financial_chart_of_accounts_clinic_parent
   └─ Composite: (clinic_id, parent_id)
   └─ Used by: Tree queries with clinic filter

7. idx_financial_chart_of_accounts_clinic_active
   └─ Composite: (clinic_id, is_active)
   └─ Used by: Active accounts per clinic
```

### Query Optimization

```typescript
// ✅ Good - Uses indexes
SELECT * FROM financial_chart_of_accounts
WHERE clinic_id = 'abc123'
  AND is_active = true
  AND type = 'RECEITA'
ORDER BY code;

// ❌ Avoid - Full table scan
SELECT * FROM financial_chart_of_accounts
WHERE name LIKE '%consulta%';  // No index

// ✅ Better
SELECT * FROM financial_chart_of_accounts
WHERE clinic_id = 'abc123'
  AND code ILIKE '%1.1%';  // Uses code index
```

### RPC Function Optimization

```sql
-- Instead of multiple queries from client
SELECT ... FROM financial_chart_of_accounts;
-- BUILD TREE IN APP CODE (n+1 problem)

-- Use optimized RPC
SELECT get_chart_of_accounts_tree('clinic_id')
-- BUILDS TREE IN DATABASE (1 query)
-- Returns pre-structured data
```

---

## 🎯 STATE MANAGEMENT

### useChartOfAccounts Hook State

```typescript
{
  // Data
  accounts: ChartOfAccount[],          // Paginado
  tree: ChartOfAccountTreeNode[],      // Hierárquico
  
  // UI State
  loading: boolean,                     // Query em andamento
  error: string | null,                 // Error message
  
  // Filter State
  filters: ChartOfAccountFilter,        // Filtros aplicados
  pagination: {
    page: number,                       // Página atual
    limit: number,                      // Itens por página
  },
}
```

### Component State Flow

```
User Input
    ↓
setFilters(newFilters) → Hook updates filters
    ↓
fetchAccounts(filters) → Hook fetches data
    ↓
loading = true → UI shows spinner
    ↓
Data arrives → loading = false
    ↓
accounts updated → Component re-renders
    ↓
Table displays new data
```

---

## 🧪 TESTING STRATEGY

### Unit Tests (Recomendado)

```typescript
// Test createChartOfAccount function
describe('chartOfAccountsApi', () => {
  it('should create account with valid input', async () => {
    const result = await createChartOfAccount({
      clinic_id: 'clinic123',
      code: '1.1.01',
      name: 'Test',
      type: 'RECEITA',
      nature: 'CREDORA',
    }, 'user123');
    
    expect(result.id).toBeDefined();
    expect(result.code).toBe('1.1.01');
  });
  
  it('should reject duplicate codes', async () => {
    await expect(
      createChartOfAccount({ ...data, code: existingCode }, 'user123')
    ).rejects.toThrow();
  });
});
```

### Integration Tests (Recomendado)

```typescript
// Test full CRUD flow
describe('ChartOfAccounts Integration', () => {
  it('should create, read, update, delete', async () => {
    // Create
    const account = await createChartOfAccount(...);
    
    // Read
    const fetched = await getChartOfAccountById(account.id);
    expect(fetched.id).toBe(account.id);
    
    // Update
    await updateChartOfAccount(account.id, { name: 'Updated' });
    
    // Delete
    await deleteChartOfAccount(account.id);
  });
});
```

### E2E Tests (Recomendado)

```typescript
// Test full user flow via UI
describe('ChartOfAccounts E2E', () => {
  it('should allow user to create account via UI', () => {
    cy.visit('/clinica/financeiro/plano-contas');
    cy.contains('Nova Conta').click();
    cy.get('[name="code"]').type('1.1.01');
    cy.get('[name="name"]').type('Consultas');
    cy.get('button:contains("Criar")').click();
    cy.contains('1.1.01').should('be.visible');
  });
});
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] All tests passing
- [ ] Database migration ready
- [ ] RLS policies reviewed
- [ ] Documentation complete
- [ ] No breaking changes

### Deployment

- [ ] Apply SQL migration to production
- [ ] Verify RLS policies active
- [ ] Deploy code changes
- [ ] Run smoke tests
- [ ] Monitor logs

### Post-Deployment

- [ ] Verify RLS working
- [ ] Test CRUD operations
- [ ] Check performance
- [ ] Verify audit logs
- [ ] User training completed

---

## 🔄 LIFECYCLE

### Component Lifecycle

```
useEffect(() => {
  if (clinicId) {
    fetchTree();  // Fetch on mount
  }
}, [clinicId]);  // Refetch if clinicId changes

// In ChartOfAccountsTree
const [expandedNodes, setExpandedNodes] = useState(/* ... */);
// Local state for UI interaction
```

### Data Lifecycle

```
Fetch Data (Supabase)
    ↓
Transform to Frontend Format
    ↓
Update Hook State
    ↓
Component Re-renders
    ↓
User Interacts
    ↓
Update Operation
    ↓
Refetch Data
    ↓
Cycle Repeats
```

---

## 📚 BEST PRACTICES

### Do's ✅

- ✅ Use `useChartOfAccounts` hook for state management
- ✅ Apply filters for better performance
- ✅ Use pagination for large lists
- ✅ Check `loading` state before rendering
- ✅ Handle errors gracefully
- ✅ Validate input before submit
- ✅ Use TypeScript types
- ✅ Memoize expensive computations
- ✅ Cache data appropriately

### Don'ts ❌

- ❌ Don't call API directly, use hook
- ❌ Don't modify state directly
- ❌ Don't forget error handling
- ❌ Don't fetch unnecessarily
- ❌ Don't bypass RLS
- ❌ Don't skip validation
- ❌ Don't hardcode clinic_id
- ❌ Don't mix tree and table logic
- ❌ Don't ignore loading states

---

## 🔍 DEBUGGING TIPS

### Check RLS Access

```sql
-- Impersonate user
SELECT auth.jwt() AS jwt;

-- Check if can access data
SELECT * FROM financial_chart_of_accounts;
-- If empty → RLS blocking access

-- Check user roles
SELECT * FROM user_clinic_roles 
WHERE user_id = auth.uid();
```

### Monitor Queries

```typescript
// Enable Supabase logging
const supabase = createClient(url, key, {
  headers: {
    'x-debug': 'true',  // Enable debugging
  },
});
```

### Check Audit Trail

```typescript
const logs = await getChartOfAccountAuditLogs(clinicId);
logs.forEach(log => {
  console.log(`${log.action} at ${log.changed_at}`);
  console.log('Before:', log.old_values);
  console.log('After:', log.new_values);
});
```

---

## 🎓 LEARNING PATH

```
Beginner
  ├─ Read: README.md
  ├─ Read: QUICKSTART.md
  ├─ Try: Create account via UI
  └─ Study: ChartOfAccountsPage.tsx

Intermediate
  ├─ Study: useChartOfAccounts hook
  ├─ Study: chartOfAccountsApi services
  ├─ Try: Build custom component using hook
  └─ Read: Types documentation

Advanced
  ├─ Study: RLS policies
  ├─ Study: Database schema
  ├─ Extend: Add custom filters
  ├─ Extend: Add custom reports
  └─ Integrate: With other modules
```

---

## 📞 ARCHITECTURE DECISION RECORDS (ADR)

### ADR-1: Self-Referencing Foreign Key for Hierarchy
- **Decision:** Use parent_id foreign key (self-referencing)
- **Rationale:** Simple, flexible, SQL-friendly, no additional tables needed
- **Alternative:** Separate hierarchy table (rejected - over-engineered)

### ADR-2: RPC Function for Tree Building
- **Decision:** Use PostgreSQL RPC function to build tree
- **Rationale:** Single query to database, better performance than n+1
- **Alternative:** Build tree in app code (rejected - n+1 problem)

### ADR-3: JSONB for Audit Values
- **Decision:** Store old/new values as JSONB in audit table
- **Rationale:** Flexible, searchable, no schema lock-in
- **Alternative:** Separate columns (rejected - loses flexibility)

### ADR-4: Composite Indexes
- **Decision:** Create composite indexes on frequently filtered fields
- **Rationale:** Better query performance for common filter combinations
- **Alternative:** Single-column indexes (rejected - less efficient)

---

**Última atualização:** 2026-05-12  
**Versão da Arquitetura:** 1.0.0  
**Status:** ✅ Production Ready
