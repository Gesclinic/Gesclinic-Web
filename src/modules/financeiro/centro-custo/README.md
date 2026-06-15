# 📊 Centro de Custos — Módulo Enterprise

Estrutura hierárquica e modular para gestão de centros de custo operacionais no Gesclinic.

## 🎯 Objetivo

Permitir que cada clínica organize sua estrutura operacional em centros de custo, habilitando:

- ✅ Rastreamento de receitas e despesas por centro
- ✅ Hierarquias de até N níveis (pai → filho → neto...)
- ✅ Isolamento por clínica (multi-tenant)
- ✅ Integração futura com faturamento, contas a pagar/receber, fluxo de caixa
- ✅ Controle de ativação/inativação
- ✅ Atribuição de responsáveis
- ✅ Auditoria completa

## 📁 Estrutura de Arquivos

```
src/modules/financeiro/centro-custo/
├── pages/
│   └── CostCenterPage.tsx                 # Página principal
├── components/
│   ├── CostCenterTree.tsx                 # Visualização em árvore
│   ├── CostCenterTable.tsx                # Visualização em tabela
│   ├── CostCenterForm.tsx                 # Formulário create/edit
│   ├── CostCenterFilters.tsx              # Filtros e busca
│   └── CostCenterBadge.tsx                # Badge de status
├── hooks/
│   └── useCostCenters.ts                  # Custom hook
├── services/
│   └── costCentersApi.ts                  # API layer com Supabase
├── types/
│   └── index.ts                           # Tipos TypeScript
└── README.md                              # Este arquivo
```

## 🗄️ Database Schema

### Tabela Principal: `financial_cost_centers`

```sql
id                UUID PRIMARY KEY
clinic_id         UUID NOT NULL (isolamento por clínica)
parent_id         UUID NULL (hierarquia)
code              VARCHAR(30) UNIQUE (ex: 1, 1.1, 1.1.1)
name              VARCHAR(255)
description       TEXT
manager_id        UUID NULL (responsável)
is_active         BOOLEAN DEFAULT true
created_by        UUID NOT NULL
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

### Tabela de Auditoria: `financial_cost_centers_audit`

- Registra INSERT, UPDATE, DELETE
- Armazena valores antigos e novos
- Tracking de quem e quando alterou

### Índices Estratégicos

- `idx_cost_centers_clinic_id` - Isolamento multi-tenant
- `idx_cost_centers_parent_id` - Busca de hierarquia
- `idx_cost_centers_code` - Busca por código
- `idx_cost_centers_is_active` - Filtros por status

## 🔐 Segurança - RLS Policies

### SELECT
- Usuários veem apenas centros de sua clínica

### INSERT / UPDATE
- Requer role `admin` ou `financeiro`
- Validação de clinic_id

### DELETE
- Apenas `admin`
- Não permite deletar se houver sub-centros

### RPC Functions
1. `get_cost_centers_tree(clinic_id)` - Retorna árvore hierárquica
2. `can_delete_cost_center(cost_center_id)` - Valida deleção

## 📚 API Service (`costCentersApi.ts`)

### Funções Principais

```typescript
// Lista com filtros
listCostCenters(clinicId, filters?: CostCenterFilters): Promise<CostCenter[]>

// Árvore hierárquica
getCostCentersTree(clinicId): Promise<CostCenterNode[]>

// CRUD
createCostCenter(clinicId, payload): Promise<CostCenter>
updateCostCenter(id, payload): Promise<CostCenter>
deleteCostCenter(id): Promise<void>

// Utilitários
toggleCostCenterStatus(id, isActive): Promise<CostCenter>
checkCanDeleteCostCenter(id): Promise<boolean>
getCostCenterAuditLogs(clinicId, costCenterId?): Promise<CostCenterAudit[]>
validateCostCenterCode(code): boolean
getNextCostCenterCode(clinicId, parentId?): Promise<string>
exportToCsv(centers): string
```

## 🎨 Componentes UI

### CostCenterTree
- Visualização hierárquica com expand/collapse
- Botões de ação (editar, deletar, toggle status)
- Indicador de centros com filhos

### CostCenterTable
- Visualização tabular com paginação
- Colunas: código, nome, descrição, status, ações
- Hover actions

### CostCenterForm
- Dialog para criar/editar
- Validação de código (formato: digits.digits.digits)
- Seleção de centro pai
- Ativação/inativação

### CostCenterFilters
- Busca por código, nome, descrição
- Filtro por status (ativo/inativo)
- Limpar filtros

### CostCenterBadge
- Badge colorido de status (ativo/inativo)

## 🔑 Custom Hook: `useCostCenters`

```typescript
const {
  centers,              // CostCenter[]
  tree,                 // CostCenterNode[]
  loading,              // boolean
  error,                // string | null
  filters,              // CostCenterFilters
  
  // Actions
  fetchCenters,         // () => Promise<void>
  fetchTree,            // () => Promise<void>
  createCenter,         // (payload) => Promise<CostCenter>
  updateCenter,         // (id, payload) => Promise<CostCenter>
  deleteCenter,         // (id) => Promise<void>
  toggleStatus,         // (id, isActive) => Promise<CostCenter>
  checkCanDelete,       // (id) => Promise<boolean>
  setFilters,           // (filters) => void
  clearError,           // () => void
  setSelectedId,        // (id) => void
} = useCostCenters(clinicId);
```

## 🛣️ Rotas

```
/clinica/financeiro/centro-custos          # Página principal
```

## 📋 Menu Lateral

Localizado em: **Financeiro → Estrutura Financeira → Centro de Custos**

```javascript
{
  id: 'financeiro.centro_custos',
  label: 'Centro de Custos',
  icon: 'Target',
  path: '/clinica/financeiro/centro-custos',
  roles: ['admin', 'gestor'],
}
```

## ✨ Funcionalidades

### Visualizações
- ✅ **Árvore Hierárquica** - Expand/collapse com indicadores
- ✅ **Tabela** - Vista plana com ordenação
- ✅ **Filtros** - Busca por texto, status
- ✅ **Exportação** - CSV

### Operações CRUD
- ✅ **Criar** - Novo centro com código único
- ✅ **Editar** - Atualizar dados existentes
- ✅ **Deletar** - Com validações (sem filhos, sem movimentações)
- ✅ **Toggle** - Ativar/inativar

### Validações
- ✅ Código no formato X.X.X (números e pontos)
- ✅ Nome obrigatório
- ✅ Unicidade de código por clínica
- ✅ Impedimento de deletar com filhos
- ✅ RLS multi-tenant

### Auditoria
- ✅ Registro de INSERT, UPDATE, DELETE
- ✅ Valores antigos e novos
- ✅ Quem e quando alterou

## 🔗 Integrações Futuras

### Não Implementado Ainda:
1. **Contas a Receber** - Vincular receitas a centros
2. **Contas a Pagar** - Vincular despesas a centros
3. **Fluxo de Caixa** - Agregação por centro
4. **Faturamento** - Rateio de procedimentos
5. **Agenda** - Alocação de atendimentos a centros
6. **Repasse Médico** - Cálculo por centro
7. **Relatórios** - Demonstrações financeiras por centro

### Estrutura Preparada Para:
- ✅ Campos de manager_id (responsável)
- ✅ is_active para controle de movimentações futuras
- ✅ Auditoria completa para rastreabilidade
- ✅ Hierarquia ilimitada para flexibilidade

## 📊 Exemplo de Hierarquia

```
ATENDIMENTOS (1)
├── CONSULTAS (1.1)
├── EEG (1.2)
└── EMG (1.3)

ADMINISTRATIVO (2)
├── RECEPÇÃO (2.1)
├── FINANCEIRO (2.2)
└── RH (2.3)

INFRAESTRUTURA (3)
├── LIMPEZA (3.1)
└── MANUTENÇÃO (3.2)
```

## 🚀 Próximos Passos

1. ✅ Executar migration SQL no Supabase
2. ✅ Verificar se frontend compila sem erros
3. ⏳ Testar CRUD operações
4. ⏳ Integrar com módulos de faturamento
5. ⏳ Criar relatórios financeiros por centro
6. ⏳ Implementar rateio automático

## 📝 Notas

- **Multi-tenant**: Isolado automaticamente por `clinic_id`
- **Performático**: Índices estratégicos para buscas rápidas
- **Seguro**: RLS enforcement, auditoria completa
- **Escalável**: Suporta hierarquias ilimitadas
- **Modular**: Pronto para integração com outros módulos

## ⚙️ Configuração

Nenhuma configuração adicional necessária. O módulo está pronto para uso após:

1. ✅ Executar migration SQL
2. ✅ Confirmar compilação do frontend
3. ✅ Acessar via `/clinica/financeiro/centro-custos`
