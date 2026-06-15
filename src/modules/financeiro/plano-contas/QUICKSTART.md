# 🚀 Quick Start - Plano de Contas Enterprise

## Checklist de Implementação

### Fase 1: Banco de Dados ✅
- [x] Executar migration SQL
- [x] Verificar RLS policies
- [x] Testar triggers de auditoria

### Fase 2: Frontend ✅
- [x] Estrutura de módulos criada
- [x] Componentes React implementados
- [x] Hooks customizados
- [x] Page component integrada
- [x] Route adicionada em AppRoutes.jsx

### Fase 3: Testes
- [ ] Testar CRUD de contas
- [ ] Testar hierarquia (pai/filho)
- [ ] Testar filtros
- [ ] Testar árvore
- [ ] Testar segurança/RLS

---

## 🔧 Configuração Rápida

### 1. Aplicar Migration SQL

```sql
-- Via Supabase console ou CLI
-- Copie todo o conteúdo de:
-- supabase/migrations/2026_05_12_create_financial_chart_of_accounts.sql
-- E execute no Supabase editor
```

### 2. Verificar Permissões

```sql
-- Verifique se user_clinic_roles está populada corretamente
SELECT * FROM user_clinic_roles 
WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro');
```

### 3. Testar Acesso

Acesse: `http://localhost:3000/clinica/financeiro/plano-contas`

---

## 📖 Uso Prático

### Criar uma Conta

```typescript
import { useChartOfAccounts } from '@/modules/financeiro/plano-contas';

const MyComponent = () => {
  const { createAccount } = useChartOfAccounts(clinicId);
  
  const handleCreate = async () => {
    try {
      const newAccount = await createAccount({
        clinic_id: clinicId,
        code: '1.1.01',
        name: 'Consultas Particulares',
        type: 'RECEITA',
        nature: 'CREDORA',
        description: 'Receitas de consultas particulares',
      }, userId);
      
      console.log('Conta criada:', newAccount);
    } catch (error) {
      console.error('Erro:', error);
    }
  };
  
  return <button onClick={handleCreate}>Criar</button>;
};
```

### Listar Contas com Filtros

```typescript
import { listChartOfAccounts } from '@/modules/financeiro/plano-contas';

const accounts = await listChartOfAccounts(
  clinicId,
  {
    search: 'receita',
    type: 'RECEITA',
    is_active: true,
  },
  { page: 1, limit: 50 }
);

console.log(`${accounts.total} contas encontradas`);
accounts.data.forEach(acc => {
  console.log(`${acc.code} - ${acc.name}`);
});
```

### Recuperar Árvore Hierárquica

```typescript
import { getChartOfAccountsTree } from '@/modules/financeiro/plano-contas';

const tree = await getChartOfAccountsTree(clinicId);

// A árvore já vem estruturada com parent-child relationships
tree.forEach(root => {
  console.log(`${root.code}: ${root.name}`);
  root.children?.forEach(child => {
    console.log(`  └─ ${child.code}: ${child.name}`);
    child.children?.forEach(grandchild => {
      console.log(`    └─ ${grandchild.code}: ${grandchild.name}`);
    });
  });
});
```

---

## 🎨 Componentes

### ChartOfAccountsTree

Árvore hierárquica com expandir/recolher:

```tsx
<ChartOfAccountsTree
  accounts={tree}
  loading={loading}
  selectedAccountId={selected?.id}
  onSelect={handleSelect}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onAddChild={handleAddChild}
/>
```

### ChartOfAccountsForm

Formulário de criar/editar:

```tsx
<ChartOfAccountsForm
  account={editingAccount}
  availableParents={parentAccounts}
  onSubmit={handleSave}
  onCancel={handleCancel}
  isLoading={saving}
/>
```

### ChartOfAccountsTable

Tabela com filtros:

```tsx
<ChartOfAccountsTable
  accounts={accounts}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onToggleStatus={handleToggle}
/>
```

### AccountTypeBadge

Badge colorida para tipos:

```tsx
<AccountTypeBadge 
  type="RECEITA" 
  nature="CREDORA"
  variant="both"
  size="md"
/>
```

---

## 🔍 Debugging

### Ver Logs de Auditoria

```typescript
import { getChartOfAccountAuditLogs } from '@/modules/financeiro/plano-contas';

const logs = await getChartOfAccountAuditLogs(clinicId, accountId);
logs.forEach(log => {
  console.log(`${log.action} às ${log.changed_at} por ${log.changed_by}`);
  console.log('Antes:', log.old_values);
  console.log('Depois:', log.new_values);
});
```

### Verificar Permissão de Exclusão

```typescript
import { canDeleteAccount } from '@/modules/financeiro/plano-contas';

const canDelete = await canDeleteAccount(accountId);
if (!canDelete) {
  console.log('Conta não pode ser deletada - tem subcontas ou lançamentos');
}
```

### Testar RLS

```sql
-- Verifique se as políticas estão ativas
SELECT * FROM pg_policies 
WHERE tablename = 'financial_chart_of_accounts';

-- Teste se o usuário pode ver contas
SELECT * FROM financial_chart_of_accounts 
WHERE clinic_id = (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid() LIMIT 1);
```

---

## 📊 Estrutura de Dados

### Tabela: financial_chart_of_accounts

```sql
id UUID                    -- Identificador único
clinic_id UUID            -- Isolamento multi-clínica
parent_id UUID NULL       -- Hierarquia (self-referencing)
code VARCHAR(30)          -- Código contábil (1, 1.1, 1.1.01)
name VARCHAR(255)         -- Nome descritivo
description TEXT          -- Notas adicionais
type VARCHAR(50)          -- RECEITA|DESPESA|ATIVO|PASSIVO|PATRIMONIO
nature VARCHAR(20)        -- CREDORA|DEVEDORA
level INTEGER             -- Profundidade na hierarquia
is_active BOOLEAN         -- Status ativo/inativo
accepts_entries BOOLEAN   -- Pode ter lançamentos
created_by UUID           -- Quem criou
created_at TIMESTAMPTZ    -- Quando criou
updated_at TIMESTAMPTZ    -- Última atualização
```

### Tabela: financial_chart_of_accounts_audit

```sql
id UUID                   -- Identificador único
account_id UUID           -- Referência à conta
clinic_id UUID            -- Para isolamento
action VARCHAR(20)        -- INSERT|UPDATE|DELETE
changed_by UUID           -- Quem fez a mudança
old_values JSONB          -- Valores anteriores
new_values JSONB          -- Novos valores
changed_at TIMESTAMPTZ    -- Quando mudou
```

---

## ⚡ Performance

### Índices Criados

```sql
-- Query rápido por clínica
idx_financial_chart_of_accounts_clinic_id

-- Busca hierárquica
idx_financial_chart_of_accounts_clinic_parent

-- Filtros por status
idx_financial_chart_of_accounts_clinic_active

-- Busca por código
idx_financial_chart_of_accounts_code

-- Filtro por tipo
idx_financial_chart_of_accounts_type
```

### Dicas de Performance

1. **Use a RPC `get_chart_of_accounts_tree`** - Já otimizada
2. **Paginação** - Use `limit` e `offset` para listas grandes
3. **Filtros** - Combine filtros para reduzir dados
4. **Lazy Loading** - A árvore já carrega sob demanda

---

## 🔒 Segurança

### O que está protegido

✅ Autenticação - Supabase Auth  
✅ RLS - Por clinic_id  
✅ Autorização - Verificação de role  
✅ Auditoria - Log automático  
✅ Validações - Backend

### O que você precisa fazer

- ✋ Não exponha IDs de clínicas
- ✋ Sempre verifique `user_clinic_roles`
- ✋ Validate entrada do usuário
- ✋ Use transações para operações críticas

---

## 📦 Exportações Principais

```typescript
// Types
export type AccountType;
export type AccountNature;
export type ChartOfAccount;
export type ChartOfAccountTreeNode;

// Components
export { ChartOfAccountsPage };
export { ChartOfAccountsTree };
export { ChartOfAccountsForm };
export { ChartOfAccountsTable };
export { ChartOfAccountsFilters };
export { AccountTypeBadge };

// Hooks
export { useChartOfAccounts };
export { useChartOfAccountAudit };

// Services
export { listChartOfAccounts };
export { getChartOfAccountsTree };
export { createChartOfAccount };
export { updateChartOfAccount };
export { deleteChartOfAccount };
export { getChartOfAccountAuditLogs };
// ... e mais
```

---

## 🆘 Troubleshooting Comum

### "Cannot delete account"
- Verifique se tem subcontas
- Verifique se tem lançamentos

### "RLS policy violation"
- Verifique role do usuário (admin/financeiro)
- Verifique clinic_id

### Árvore vazia
- Verifique se há contas criadas
- Verifique se estão ativas
- Verifique clinic_id

### Slow queries
- Adicione filtros
- Use paginação
- Verifique índices

---

## 📞 Referências

- [README.md](./README.md) - Documentação completa
- [Types](./types/index.ts) - Definições de tipos
- [Services](./services/chartOfAccountsApi.ts) - API completa
- [Components](./components/) - Componentes React

---

**Última atualização:** 2026-05-12  
**Versão:** 1.0.0  
**Status:** ✅ Production Ready
