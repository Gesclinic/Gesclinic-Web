# 📖 GUIA PRÁTICO — NOVO SISTEMA DE MENUS

## 1️⃣ ENTENDER A ESTRUTURA

### A Hierarquia
```
Nível 0: Dashboard (único, entry point)
Nível 1: 8 módulos principais (Agenda, Pacientes, Financeiro, etc)
Nível 2: Subitems do módulo (Visão Geral, Por Profissional, etc)
Nível 3: Subgrupos aninhados (Comunicação > Notificações > Logs)
```

### Regra de Ouro
- **Dashboard**: Item isolado, sem filhos
- **Módulos**: Sempre têm children
- **Subitems**: Podem ter ou não children
- **Máximo 3 níveis no total**

---

## 2️⃣ ADICIONAR NOVO MENU ITEM

### Caso A: Item sem filhos (Link direto)
```javascript
{
  id: "agenda.relatorios",
  label: "Relatórios",
  icon: "BarChart3",
  path: "/clinica/agenda/relatorios",
  roles: ["admin", "gestor"],
  featurePath: "agenda.relatorios",
  // ❌ SEM children
}
```

### Caso B: Item com 1 nível de filhos
```javascript
{
  id: "agenda.comunicacao",
  label: "Comunicação",
  icon: "Bell",
  roles: ["admin", "gestor"],
  featurePath: "agenda.comunicacao",
  // ⚠️ Sem 'path' quando tem children no nível 1
  children: [
    {
      id: "agenda.notificacoes",
      label: "Notificações",
      icon: "MessageSquare",
      path: "/clinica/agenda/notificacoes",
      roles: ["admin", "gestor"],
      featurePath: "agenda.notificacoes",
    },
    {
      id: "agenda.logs",
      label: "Logs",
      icon: "ScrollText",
      path: "/clinica/agenda/logs",
      roles: ["admin"],
      featurePath: "agenda.logs",
    },
  ],
}
```

### Caso C: Subgrupo com 2 níveis de filhos
```javascript
{
  id: "financeiro.estrutura",
  label: "Estrutura Financeira",
  icon: "Settings2",
  roles: ["admin", "gestor"],
  // ⚠️ Sem 'path' quando é um grupo
  children: [
    {
      id: "financeiro.plano_contas",
      label: "Plano de Contas",
      icon: "ListTree",
      path: "/clinica/financeiro/plano-contas",
      roles: ["admin", "gestor"],
      // Nível 2 - pode ser link direto
    },
    {
      id: "financeiro.centro_custos",
      label: "Centro de Custos",
      icon: "Target",
      path: "/clinica/financeiro/centro-custos",
      roles: ["admin", "gestor"],
    },
  ],
}
```

---

## 3️⃣ PERMISSÕES POR ROLE

### Papéis Disponíveis
```javascript
const ROLES = {
  "admin":      // Super admin - acesso total
  "gestor":     // Dono/Gestor - visão executiva
  "financeiro": // Financeiro - apenas finanças
  "medico":     // Profissional - atendimento + prontuário
  "recepcao":   // Recepcionista - agenda + pacientes
}
```

### Como Definir
```javascript
// Cada item pode ter array de roles
roles: ["admin", "gestor"]  // ✅ Visível só para admin e gestor

// Se NÃO definir 'roles', só admin vê
// Se definir vazio [], só admin vê
roles: []  // ❌ Não usar - deixar undefined é melhor
```

### Exemplo Real
```javascript
// Repasse Médico - visível apenas para gestor e médico
{
  id: "financeiro.repasse",
  label: "Repasse Médico",
  icon: "UserCog",
  roles: ["admin", "gestor", "medico"],  // ✅ Estes veem
  // Recepcionista e Financeiro NÃO veem
}

// Usuários (Admin only)
{
  id: "administracao.usuarios",
  label: "Usuários",
  icon: "UsersCog",
  path: "/clinica/admin/usuarios",
  roles: ["admin"],  // ✅ Apenas admin vê
}
```

---

## 4️⃣ ÍCONES DISPONÍVEIS

Todos do `lucide-react`:

### Mais Usados
```
LayoutDashboard  Wallet           Settings
Calendar         Database         Shield
Users            Package          Building2
FileText         Boxes            UsersCog
```

### Módulos
```
Agenda → Calendar
Pacientes → Users
Base → Database
Financeiro → Wallet
Estoque → Boxes
Faturamento → FileInvoice
Configurações → Settings
Administração → Shield
```

### Ações
```
Adicionar → Plus
Editar → Edit
Deletar → Trash2
Ver → Eye
Fechar → X
Expandir → ChevronDown
Recolher → ChevronUp
```

### Estados
```
✓ CheckCircle
✗ XCircle
→ ArrowRight
↓ ArrowDown
↑ ArrowUp
Carregando → Loader (com animate-spin)
Sucesso → CheckCircle (com cor green)
Erro → AlertCircle (com cor red)
```

**Lista completa**: https://lucide.dev/

---

## 5️⃣ FLUXOS COMUNS

### ❌ ERRO: Criar menu com mais de 3 níveis
```javascript
// ❌ ERRADO - 4 níveis!
{
  label: "Nível 1",
  children: [
    {
      label: "Nível 2",
      children: [
        {
          label: "Nível 3",
          children: [
            {
              label: "Nível 4 ❌ NÃO RENDERIZA",
            }
          ]
        }
      ]
    }
  ]
}
```

### ❌ ERRO: Colocar 'path' em um grupo
```javascript
// ❌ ERRADO
{
  label: "Comunicação",
  path: "/clinica/agenda/comunicacao",  // ❌ Grupo não precisa path
  children: [...]
}

// ✅ CERTO
{
  label: "Comunicação",
  // Sem path quando tem children
  children: [...]
}
```

### ❌ ERRO: Item sem 'id' único
```javascript
// ❌ ERRADO
{
  label: "Dashboard",
  // Falta ID!
}

// ✅ CERTO
{
  id: "dashboard",  // Sempre incluir ID único
  label: "Dashboard",
}
```

### ✅ CORRETO: Menu bem estruturado
```javascript
{
  id: "financeiro",
  label: "Financeiro",
  icon: "Wallet",
  roles: ["admin", "gestor", "financeiro"],
  children: [
    {
      id: "financeiro.visao_geral",
      label: "Visão Geral",
      icon: "LayoutDashboard",
      path: "/clinica/financeiro",  // Link direto
      roles: ["admin", "gestor", "financeiro"],
    },
    {
      id: "financeiro.estrutura",
      label: "Estrutura Financeira",
      icon: "Settings2",
      roles: ["admin", "gestor"],
      // SEM path - é um grupo
      children: [
        {
          id: "financeiro.plano_contas",
          label: "Plano de Contas",
          icon: "ListTree",
          path: "/clinica/financeiro/plano-contas",
          roles: ["admin", "gestor"],
        },
      ],
    },
  ],
}
```

---

## 6️⃣ TESTANDO SEU MENU

### 1. Verificar no Sidebar
```
1. Fazer login com role "admin" → deve ver tudo
2. Fazer login com role "financeiro" → deve ver só Financeiro
3. Fazer login com role "recepcao" → deve ver Agenda + Pacientes
```

### 2. Verificar Console
```javascript
// Debug: imprimir menu no console
import { getMenuItems } from "@/constants/menu.js";
const menu = getMenuItems("gestor");
console.log(menu);
// Deve listar apenas itens com roles incluindo "gestor"
```

### 3. Verificar Rota
```
1. Clicar no item no sidebar
2. URL deve mudar para o path definido
3. Layout deve renderizar corretamente
4. Se página não existe → criar em src/pages/...
```

---

## 7️⃣ PADRÃO DE ROTAS

Para cada item com `path`, a página deve existir:

```
path: "/clinica/agenda/confirmacoes"
→ Arquivo: src/pages/clinica/agenda/Confirmacoes.jsx

path: "/clinica/financeiro/plano-contas"
→ Arquivo: src/pages/clinica/financeiro/PlanodeContas.jsx

path: "/clinica/admin/usuarios"
→ Arquivo: src/pages/admin/Usuarios.jsx
```

---

## 8️⃣ MANUTENÇÃO

### Adicionar novo módulo
1. Criar entrada em menu.js (Nível 1)
2. Adicionar ícone em ICONS{}
3. Criar pasta em src/pages/clinica/novo_modulo/
4. Registrar rotas em src/AppRoutes.jsx

### Remover menu item
1. Deletar entrada de menu.js
2. Não precisa deletar página (fica como rota oculta)

### Alterar permissões
1. Editar array `roles` do item
2. Menu filtra automaticamente ao fazer login

### Renomear item
1. Alterar `label`
2. Atualizar `featurePath` se necessário
3. Deixar `id` igual (identifica a rota no código)

---

## 9️⃣ REFERÊNCIA RÁPIDA

| Campo | Tipo | Obrigatório | Exemplo |
|-------|------|-------------|---------|
| `id` | string | ✅ | `"agenda.geral"` |
| `label` | string | ✅ | `"Agenda Geral"` |
| `icon` | string | ✅ | `"CalendarDays"` |
| `path` | string | ❌ | `"/clinica/agenda"` |
| `roles` | array | ❌ | `["admin", "gestor"]` |
| `featurePath` | string | ❌ | `"agenda.geral"` |
| `children` | array | ❌ | `[{...}, {...}]` |

**Regras**:
- Se tem `children` → NÃO precisa `path`
- Se é link direto → precisa `path`
- `roles` vazio = só admin vê
- `id` deve ser único em todo o menu

---

## 🔟 TROUBLESHOOTING

### Item não aparece no menu
```
❌ roles não inclui o role atual do usuário
   → Adicionar role em array 'roles'

❌ children vazio e sem path
   → Adicionar path ou children com itens
```

### Submenu não abre ao clicar
```
❌ Falta 'id' único no item
   → Adicionar id: "modulo.item"

❌ children vazio
   → Adicionar itens em children
```

### Ícone não renderiza
```
❌ Ícone não existe em lucide-react
   → Trocar por outro ícone ou importar

❌ Nome do ícone errado
   → Verificar em https://lucide.dev/
```

### Role não filtra menu
```
❌ useAuth() retorna role indefinido
   → Verificar SupabaseAuthContext

❌ roles array vazio
   → Adicionar roles ao item ou remover array
```

---

**Última atualização**: Jan 13, 2026  
**Versão do menu**: 2.0 (Nova estrutura)
