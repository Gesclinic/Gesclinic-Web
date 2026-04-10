# 📋 CHECKLIST DE IMPLEMENTAÇÃO — RBAC COMPLETO

**Data:** 13 de Janeiro de 2026  
**Status:** 100% Documentado  
**Tempo Estimado:** 30-45 minutos (completo)

---

## FASE 1: SETUP INICIAL (5-10 min)

### 📍 1.1 — Verificar Supabase Conectado
```bash
# Verificar se Supabase está funcionando
npx supabase projects list

# Resultado esperado:
# ✓ Project ID: ...
# ✓ Database URL: ...
```
- [ ] Supabase respondendo corretamente
- [ ] Projeto selecionado é o correto

### 📍 1.2 — Backup Atual (Opcional mas Recomendado)
```bash
# Copiar banco atual (extra segurança)
npx supabase db download

# Ou via Supabase Dashboard → Settings → Back Ups
```
- [ ] Backup realizado (se aplicável)

### 📍 1.3 — Verificar Tabelas Pré-requisitos
```sql
-- No Supabase SQL Editor, verificar:
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('clinics', 'users');
```
- [ ] Tabela `clinics` existe
- [ ] Tabela `users` (auth.users) existe
- [ ] Outras tabelas críticas intactas

---

## FASE 2: EXECUTAR MIGRATION (5-10 min)

### 📍 2.1 — Copiar SQL da Migration
**Arquivo:** `supabase/migrations/2026-01-13_create_rbac_tables.sql`

```bash
# Via CLI (Automático)
npx supabase db push

# OU
# Via Dashboard (Manual)
# 1. Supabase Dashboard → SQL Editor → New Query
# 2. Cole todo o conteúdo do arquivo
# 3. Clique "Run"
```
- [ ] Migration executada sem erros
- [ ] Sem mensagens de "permission denied"

### 📍 2.2 — Verificar Tabelas Criadas
```sql
-- Executar no Supabase SQL Editor
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('roles', 'permissions', 'role_permissions', 'user_roles');

-- Esperado retorno: 4 tabelas
```
- [ ] Tabela `roles` criada ✅
- [ ] Tabela `permissions` criada ✅
- [ ] Tabela `role_permissions` criada ✅
- [ ] Tabela `user_roles` criada ✅

### 📍 2.3 — Verificar Dados Inseridos
```sql
-- Contar registros
SELECT 'roles' as tabela, COUNT(*) as total FROM roles
UNION ALL
SELECT 'permissions', COUNT(*) FROM permissions
UNION ALL
SELECT 'role_permissions', COUNT(*) FROM role_permissions;

-- Esperado:
-- roles: 5
-- permissions: 40+
-- role_permissions: 150+
```
- [ ] 5 roles inseridos (admin, gestor, financeiro, profissional, recepcao)
- [ ] 40+ permissions inseridas
- [ ] 150+ role_permissions inseridas

### 📍 2.4 — Testar Funções SQL
```sql
-- Testar função get_user_permissions
SELECT * FROM get_user_permissions('<user-id-teste>', '<clinic-id-teste>');

-- Testar função has_permission
SELECT has_permission('<user-id-teste>', '<clinic-id-teste>', 'dashboard.view');

-- Esperado: Nenhum erro, retorno vazio se usuário não existe
```
- [ ] Função `get_user_permissions()` funciona
- [ ] Função `has_permission()` funciona
- [ ] Sem erros de sintaxe SQL

---

## FASE 3: VERIFICAR ARQUIVOS CRIADOS (2-3 min)

### 📍 3.1 — Verificar Estrutura de Pastas
```bash
# Listar arquivos criados
ls -la src/hooks/useMenu.js
ls -la src/config/design-tokens.js
ls -la src/config/kpi-config.js
```
- [ ] `src/hooks/useMenu.js` existe
- [ ] `src/config/design-tokens.js` existe
- [ ] `src/config/kpi-config.js` existe
- [ ] `supabase/migrations/2026-01-13_*.sql` existe

### 📍 3.2 — Verificar Tamanho dos Arquivos
```bash
# Arquivo deve ter ~180 linhas
wc -l src/hooks/useMenu.js

# Arquivo deve ter ~400 linhas
wc -l src/config/design-tokens.js

# Arquivo deve ter ~400 linhas
wc -l src/config/kpi-config.js
```
- [ ] useMenu.js: ~180 linhas
- [ ] design-tokens.js: ~400 linhas
- [ ] kpi-config.js: ~400 linhas

### 📍 3.3 — Verificar Importações
```bash
# Todos os imports devem estar corretos (sem erros)
grep -n "^import\|^export" src/hooks/useMenu.js | head -20

# Esperado: imports do React, contexts, constants
```
- [ ] useMenu.js tem imports corretos
- [ ] design-tokens.js tem exports nomeados
- [ ] kpi-config.js tem funções de export

---

## FASE 4: INTEGRAR NO SIDEBAR (5-10 min)

### 📍 4.1 — Backup do Sidebar Atual
```bash
# Fazer backup para segurança
copy src/components/layout/Sidebar.jsx src/components/layout/Sidebar.jsx.backup
```
- [ ] Backup realizado

### 📍 4.2 — Adicionar Import do Hook
**Arquivo:** `src/components/layout/Sidebar.jsx`

**Linha:** Topo do arquivo (com os outros imports)
```jsx
import { useMenu } from "@/hooks/useMenu";
```
- [ ] Import adicionado
- [ ] Sem erros de sintaxe

### 📍 4.3 — Substituir Chamada de Menu
**Antes:**
```jsx
const { currentRole } = useAuth();
const filteredMenu = getMenuItems(currentRole);
```

**Depois:**
```jsx
const { menu: filteredMenu, currentRole } = useMenu();
```
- [ ] Substituição realizada
- [ ] Variável `filteredMenu` mantida
- [ ] `currentRole` vindo do hook

### 📍 4.4 — Testar Carregamento
```bash
# Abrir navegador
# http://localhost:3002

# Console (F12) → Console tab
console.log('Sidebar carregado')
```
- [ ] Página carrega sem erros
- [ ] Menu aparece visível
- [ ] Console limpo (sem red errors)

---

## FASE 5: TESTAR FUNCIONALIDADE (10-15 min)

### 📍 5.1 — Teste: Menu Filtrado por Role
**No console do navegador (F12):**
```javascript
import { useMenu } from "@/hooks/useMenu";

// Dentro de um componente React:
const { menu, currentRole, filteredCount } = useMenu();
console.log('Role:', currentRole);
console.log('Items:', filteredCount);
console.log('Menu:', menu);
```

**Esperado:**
```
Role: admin (ou outro)
Items: 48 (admin) ou 35 (gestor) ou 18 (financeiro) etc
Menu: Array com objetos { id, label, icon, path, roles, children }
```
- [ ] Hook retorna menu corretamente
- [ ] currentRole está correto
- [ ] filteredCount é número positivo
- [ ] Menu não vazio

### 📍 5.2 — Teste: Verificar Permissão
**No console do navegador:**
```javascript
import { useMenuPermission } from "@/hooks/useMenu";

const canView = useMenuPermission("financeiro.pagar");
console.log('Pode ver Financeiro?', canView);
```

**Esperado:**
```
Pode ver Financeiro? true (se admin/gestor/financeiro)
                     false (se profissional/recepcao)
```
- [ ] Hook retorna boolean
- [ ] Permissão é consistente com role
- [ ] Múltiplas permissões podem ser testadas

### 📍 5.3 — Teste: Breadcrumb
**No console do navegador:**
```javascript
import { useMenuBreadcrumb } from "@/hooks/useMenu";

const bread = useMenuBreadcrumb("financeiro.pagar");
console.log('Breadcrumb:', bread);
```

**Esperado:**
```
Breadcrumb: [
  { label: "Financeiro", path: "/clinica/financeiro" },
  { label: "Contas a Pagar", path: "/clinica/financeiro/pagar" }
]
```
- [ ] Hook retorna array
- [ ] Path correto em cada item
- [ ] Labels em português

### 📍 5.4 — Teste: Listar Todas as Permissões
**No console do navegador:**
```javascript
import { useUserMenuPermissions } from "@/hooks/useMenu";

const perms = useUserMenuPermissions();
console.log('Permissões do usuário:', perms);
```

**Esperado:**
```
Permissões do usuário: [
  "dashboard",
  "agenda.geral",
  "agenda.profissional",
  ... (total = 48 para admin)
]
```
- [ ] Hook retorna array de strings
- [ ] Cada string é um featurePath válido
- [ ] Total coerente com role

---

## FASE 6: TESTAR COM DIFERENTES ROLES (5-10 min)

### 📍 6.1 — Atribuir Diferentes Roles
**No Supabase SQL Editor:**
```sql
-- Encontrar seu user_id (autenticado)
SELECT * FROM auth.users LIMIT 1;

-- Atualizar role (trocar 'admin' pelo role desejado)
UPDATE user_roles
SET role_id = (SELECT id FROM roles WHERE name = 'recepcao')
WHERE user_id = '<seu-user-id>';

-- Verificar atualização
SELECT ur.*, r.name FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = '<seu-user-id>';
```
- [ ] Role alterado no banco de dados
- [ ] user_roles contém novo role_id
- [ ] role name correto

### 📍 6.2 — Recarregar e Verificar Menu
**No navegador:**
1. Recarregue a página (`F5` ou `Ctrl+R`)
2. Observe o menu lateral
3. Deve ter menos itens do que admin

**Teste com cada role:**
- [ ] **Admin**: 48 items (todos)
- [ ] **Gestor**: 35 items
- [ ] **Financeiro**: 18 items
- [ ] **Profissional**: 12 items
- [ ] **Recepção**: 10 items

### 📍 6.3 — Verificar Itens Específicos
**Para role 'recepcao' (menos permissivo):**
- [ ] Dashboard visível
- [ ] Agenda visível
- [ ] Pacientes visível
- [ ] Financeiro **NÃO** visível
- [ ] Estoque **NÃO** visível
- [ ] Administração **NÃO** visível

---

## FASE 7: INTEGRAR DESIGN TOKENS (5-10 min)

### 📍 7.1 — Adicionar CSS Variables
**Arquivo:** `src/index.css` (topo do arquivo)

```css
:root {
  --primary: 216 100% 40%;
  --primary-foreground: 0 0% 100%;
  --secondary: 215 20% 95%;
  --success: 142 71% 45%;
  --warning: 38 92% 50%;
  --danger: 0 84% 60%;
}
```
- [ ] CSS Variables adicionadas
- [ ] Antes de @tailwind directives

### 📍 7.2 — Usar em um Componente
**Exemplo no MenuItem do Sidebar:**

```jsx
import { COLORS, SPACING, TYPOGRAPHY, COMPONENTS } from "@/config/design-tokens";

// Na função MenuItem:
className={`
  ${COMPONENTS.menuItem.base}
  ${COMPONENTS.menuItem.padding}
  ${isActive ? COMPONENTS.menuItem.active : COMPONENTS.menuItem.inactive}
  ${STATES.transition}
`}
```
- [ ] Design tokens importados
- [ ] Classes aplicadas sem erro
- [ ] Styling visual correto

### 📍 7.3 — Testar Cores
**No navegador:**
```javascript
import { COLORS, COMPONENTS } from "@/config/design-tokens";

console.log('Primary:', COLORS.primary[500]);
console.log('Card:', COMPONENTS.card.base);
```
- [ ] Tokens retornam valores
- [ ] Strings CSS válidas
- [ ] Sem undefined

---

## FASE 8: INTEGRAR KPIs (5-10 min)

### 📍 8.1 — Adicionar KPI ao Dashboard
**Arquivo:** Sua página de Dashboard (ex: `src/pages/DashboardPage.jsx`)

```jsx
import { getKPIsByModule } from "@/config/kpi-config";

function DashboardPage() {
  const kpisGeral = getKPIsByModule("dashboard");

  return (
    <div>
      <h1>Dashboard</h1>
      {kpisGeral.indicadores.map(kpi => (
        <KPICard key={kpi.id} {...kpi} />
      ))}
    </div>
  );
}
```
- [ ] Import adicionado
- [ ] getKPIsByModule chamado
- [ ] KPIs mapeados

### 📍 8.2 — Criar Componente KPICard
**Arquivo:** `src/components/KPICard.jsx`

```jsx
import { KPI, TYPOGRAPHY } from "@/config/design-tokens";

export function KPICard({ label, valor, metrica, tendencia }) {
  return (
    <div className={KPI.container}>
      <p className={KPI.label}>{label}</p>
      <p className={KPI.value}>{valor}</p>
      {tendencia && (
        <p className={KPI.change}>
          {tendencia.percentual}% vs anterior
        </p>
      )}
    </div>
  );
}
```
- [ ] Componente criado
- [ ] Tokens aplicados
- [ ] Renderiza sem erro

### 📍 8.3 — Testar KPIs
```bash
# Navegador
# http://localhost:3002/clinica/dashboard

# Deve exibir 6 cards de KPI
# Cada um com label, valor, tendência
```
- [ ] 6 KPIs exibindo
- [ ] Valores visíveis
- [ ] Layout responsivo

---

## FASE 9: PROTEGER ROTAS COM PERMISSÕES (5-10 min)

### 📍 9.1 — Criar Componente ProtectedPage
**Arquivo:** `src/components/ProtectedPage.jsx`

```jsx
import { useMenuPermission } from "@/hooks/useMenu";

export function ProtectedPage({ featurePath, children }) {
  const canAccess = useMenuPermission(featurePath);

  if (!canAccess) {
    return (
      <div>
        <h1>❌ Acesso Negado</h1>
        <p>Você não tem permissão para acessar este módulo.</p>
      </div>
    );
  }

  return children;
}
```
- [ ] Componente criado
- [ ] Lógica de permissão implementada
- [ ] Sem erros de sintaxe

### 📍 9.2 — Usar em Página Protegida
**Exemplo: Contas a Pagar**

```jsx
import { ProtectedPage } from "@/components/ProtectedPage";

function ContasAPagarPage() {
  return (
    <ProtectedPage featurePath="financeiro.pagar">
      <div>
        {/* Conteúdo da página */}
      </div>
    </ProtectedPage>
  );
}
```
- [ ] Componente envolvido
- [ ] featurePath correto
- [ ] Testado com roles diferentes

### 📍 9.3 — Testar Acesso Negado
**Como usuário 'recepcao':**
1. Tente acessar `/clinica/financeiro/pagar`
2. Deve mostrar "Acesso Negado"

**Como usuário 'financeiro':**
1. Acesse `/clinica/financeiro/pagar`
2. Deve mostrar o conteúdo
- [ ] Acesso negado funciona
- [ ] Acesso permitido funciona

---

## FASE 10: TESTES FINAIS E DOCUMENTAÇÃO (5-10 min)

### 📍 10.1 — Executar Todos os Testes Rápidos
```bash
# Verificar console limpo
F12 → Console → Deve estar verde (sem red errors)

# Verificar performance
F12 → Performance → Registrar e recarregar página
# Deve ser rápido (<2s para carga completa)
```
- [ ] Console limpo
- [ ] Performance boa (<2s)
- [ ] Sem warnings

### 📍 10.2 — Testar Todos os Roles
**Tabela de testes:**

| Role | Agenda | Financeiro | Estoque | Resultado |
|------|:------:|:----------:|:-------:|-----------|
| admin | ✅ | ✅ | ✅ | OK |
| gestor | ✅ | ✅ | 👁️ | OK |
| financeiro | ❌ | ✅ | 👁️ | OK |
| profissional | ✅ | ❌ | ❌ | OK |
| recepcao | ✅ | ❌ | ❌ | OK |

- [ ] Admin: todos visíveis
- [ ] Gestor: operacional + financeiro
- [ ] Financeiro: apenas financeiro
- [ ] Profissional: agenda + pacientes
- [ ] Recepção: agenda + pacientes básico

### 📍 10.3 — Criar Documentação de Deploy
**Arquivo:** `DEPLOY_NOTES.md`

```markdown
# Deploy RBAC para Produção

## Pré-requisitos
- Backup do banco de dados ✅
- Migração testada em staging ✅

## Passos
1. Executar migration no Supabase produção
2. Verificar tabelas criadas
3. Deploy da aplicação
4. Teste com diferentes roles
```
- [ ] Documentação criada
- [ ] Checklist pré-deploy
- [ ] Plano de rollback

### 📍 10.4 — Revisar Todos os Arquivos
**Verificar integridade:**
```bash
# Testar sintaxe JavaScript
npx eslint src/hooks/useMenu.js src/config/*.js

# Ou verificar manualmente:
# - Sem imports faltando
# - Sem export undefined
# - Sem syntax errors
```
- [ ] useMenu.js válido
- [ ] design-tokens.js válido
- [ ] kpi-config.js válido

---

## ✅ CHECKLIST FINAL

### Supabase
- [ ] Migration executada
- [ ] Tabelas criadas (roles, permissions, role_permissions, user_roles)
- [ ] Dados inseridos corretamente
- [ ] Funções SQL funcionando

### React/Código
- [ ] Arquivos criados (3 novos arquivos)
- [ ] Hooks importados no Sidebar
- [ ] Design tokens aplicados
- [ ] KPIs integrados
- [ ] Rotas protegidas

### Testes
- [ ] Menu filtra corretamente
- [ ] Permissões funcionam
- [ ] Todos os roles testados
- [ ] Console limpo
- [ ] Performance OK

### Documentação
- [ ] RBAC_IMPLEMENTACAO_COMPLETA.md ✅
- [ ] RBAC_RESUMO_EXECUTIVO.md ✅
- [ ] RBAC_QUICK_START.md ✅
- [ ] Este arquivo: CHECKLIST.md ✅

---

## 🎉 PRONTO PARA PRODUÇÃO!

Se todas as checkboxes acima estão marcadas, você pode:
1. ✅ Fazer merge para main branch
2. ✅ Deploy para produção
3. ✅ Comunicar aos usuários

---

**Data:** 13 de Janeiro de 2026  
**Status:** Checklist Completo  
**Versão:** 1.0.0  
**Próximo:** Testes UAT com usuários reais
