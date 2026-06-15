# Módulo Enterprise - Plano de Contas

## 📋 Descrição

Módulo central de gestão de Plano de Contas (Chart of Accounts) para o sistema Gesclinic. Fornece a estrutura contábil base que serve como fundação para todos os módulos financeiros.

## 🎯 Funcionalidades Implementadas

### ✅ Database
- [x] Tabela `financial_chart_of_accounts` com todas as colunas obrigatórias
- [x] Políticas RLS (Row Level Security) para isolamento multi-clínica
- [x] Índices de performance
- [x] Tabela de auditoria (`financial_chart_of_accounts_audit`)
- [x] Triggers para log automático de mudanças
- [x] Funções RPC para operações eficientes

### ✅ Backend / API Services
- [x] Listar contas com filtros avançados
- [x] Recuperar árvore hierárquica
- [x] Criar conta
- [x] Editar conta
- [x] Deletar conta (com validações)
- [x] Ativar/Inativar conta
- [x] Verificação de permissão de exclusão
- [x] Logs de auditoria
- [x] Exportação para CSV
- [x] Criação de contas padrão por clínica

### ✅ Frontend - Componentes
- [x] `AccountTypeBadge` - Badge colorido para tipos de conta
- [x] `ChartOfAccountsForm` - Formulário de criação/edição
- [x] `ChartOfAccountsTable` - Visualização em tabela
- [x] `ChartOfAccountsFilters` - Filtros avançados
- [x] `ChartOfAccountsTree` - Visualização em árvore hierárquica

### ✅ Frontend - Hooks
- [x] `useChartOfAccounts` - Hook principal com todas as operações
- [x] `useChartOfAccountAudit` - Hook para auditoria

### ✅ Frontend - Páginas
- [x] `ChartOfAccountsPage` - Página principal com múltiplos modos de visualização

### ✅ Segurança
- [x] RLS policy por clinic_id
- [x] Isolamento multi-clínica
- [x] Validações de negócio
- [x] Auditoria completa de mudanças

## 🔧 Tecnologias

- **Frontend:** React 18 + TypeScript + TailwindCSS + Lucide Icons
- **Backend:** Supabase PostgreSQL + RLS + Triggers
- **State Management:** React Hooks
- **API Layer:** Custom Supabase Client

## 📁 Estrutura de Arquivos

```
src/modules/financeiro/plano-contas/
├── components/
│   ├── AccountTypeBadge.tsx
│   ├── ChartOfAccountsForm.tsx
│   ├── ChartOfAccountsFilters.tsx
│   ├── ChartOfAccountsTable.tsx
│   ├── ChartOfAccountsTree.tsx
│   └── index.ts
├── hooks/
│   ├── useChartOfAccounts.ts
│   └── index.ts
├── pages/
│   └── ChartOfAccountsPage.tsx
├── services/
│   ├── chartOfAccountsApi.ts
│   └── index.ts
├── types/
│   └── index.ts
├── index.ts
└── README.md
```

## 🚀 Como Usar

### Importar o módulo

```typescript
import {
  ChartOfAccountsPage,
  useChartOfAccounts,
  listChartOfAccounts,
  createChartOfAccount,
  updateChartOfAccount,
  deleteChartOfAccount,
} from '@/modules/financeiro/plano-contas';
```

### Usar a página principal

A página já está integrada no router:
```
/clinica/financeiro/plano-contas
```

### Usar o hook em componentes customizados

```typescript
import { useChartOfAccounts } from '@/modules/financeiro/plano-contas';

export function MyComponent() {
  const { accounts, tree, loading, createAccount } = useChartOfAccounts(clinicId);
  
  const handleCreate = async () => {
    await createAccount({
      clinic_id: clinicId,
      code: '1.1.01',
      name: 'Consultas Particulares',
      type: 'RECEITA',
      nature: 'CREDORA',
    }, userId);
  };
  
  return (
    <div>
      {loading ? <p>Carregando...</p> : <p>{accounts.length} contas</p>}
      <button onClick={handleCreate}>Criar Conta</button>
    </div>
  );
}
```

### Usar os serviços diretamente

```typescript
import {
  listChartOfAccounts,
  getChartOfAccountsTree,
  createChartOfAccount,
  deleteChartOfAccount,
} from '@/modules/financeiro/plano-contas';

// Listar com filtros
const { data, total } = await listChartOfAccounts(clinicId, {
  search: 'receita',
  type: 'RECEITA',
});

// Recuperar árvore
const tree = await getChartOfAccountsTree(clinicId);

// Criar nova conta
const account = await createChartOfAccount({
  clinic_id: clinicId,
  code: '1',
  name: 'RECEITAS',
  type: 'RECEITA',
  nature: 'CREDORA',
}, userId);

// Deletar
await deleteChartOfAccount(accountId);
```

## 📊 Tipos de Conta

| Tipo | Natureza | Descrição |
|------|----------|-----------|
| RECEITA | CREDORA | Receitas e ganhos |
| DESPESA | DEVEDORA | Custos e gastos |
| ATIVO | DEVEDORA | Bens e direitos |
| PASSIVO | CREDORA | Obrigações |
| PATRIMONIO | CREDORA | Patrimônio líquido |

## 🔐 Segurança

Todas as operações estão protegidas por:

1. **Autenticação:** Via Supabase Auth
2. **RLS Policies:** Isolamento por clinic_id
3. **Autorização:** Verificação de role (admin/financeiro)
4. **Auditoria:** Log automático de todas as mudanças
5. **Validações:** Regras de negócio no backend

## 📈 Performance

- **Índices:** Criados para todas as queries frequentes
- **Paginação:** Suportada no endpoint de listagem
- **Lazy Loading:** Árvore carrega sob demanda
- **Memoization:** Componentes otimizados com React.memo
- **RPC:** Função `get_chart_of_accounts_tree` para eficiência

## ⚙️ Configuração

### Migrations SQL

A migration está localizada em:
```
supabase/migrations/2026_05_12_create_financial_chart_of_accounts.sql
```

Para aplicar:
1. Copie o arquivo para sua pasta de migrations do Supabase
2. Execute via Supabase CLI ou console

### Variáveis de Ambiente

Nenhuma configuração adicional necessária além das variáveis padrão do Gesclinic.

## 🔄 Fluxo de Dados

```
Página → Hook useChartOfAccounts → Services API → Supabase
                                 ↓
                            RLS Policies
                            Triggers
                            Auditoria
```

## ✋ O Que NÃO foi Integrado

Como solicitado, as seguintes integrações NÃO foram implementadas:

- ❌ Integração com Agenda
- ❌ Integração com Contas a Pagar
- ❌ Integração com Contas a Receber
- ❌ Criação automática de contas
- ❌ Lançamentos automáticos
- ❌ Relatórios integrados

Essas integrações virão em fases subsequentes.

## 📝 Próximos Passos

1. Integração com Contas a Pagar (AP Bills)
2. Integração com Contas a Receber (Receivables)
3. Integração com Faturamento (Invoices)
4. Relatórios contábeis
5. Conciliação bancária baseada em contas

## 🐛 Troubleshooting

### Erro: "Cannot delete account: it has child accounts"
- A conta possui subcontas. Delete as subcontas primeiro ou mude-as de pai.

### Erro: RLS policy violation
- Verifique se o usuário tem role 'admin' ou 'financeiro'
- Verifique se clinicId corresponde à clínica do usuário

### Árvore não carrega
- Verifique se há contas ativas na clínica
- Abra o DevTools e veja a resposta da RPC `get_chart_of_accounts_tree`

## 📞 Suporte

Para dúvidas ou issues, consulte a documentação do Gesclinic ou abra uma issue no repositório.
