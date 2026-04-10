# 🚀 QUICK START — NOVO MENU

**Versão**: 2.0 | **Data**: Jan 13, 2026 | **Status**: ✅ Pronto

---

## 📋 O QUE MUDOU

| Antes | Depois |
|-------|--------|
| 13 módulos | **8 módulos** + Dashboard |
| ~60 itens | **48 itens** |
| 5 níveis profundidade | **3 níveis máximo** |
| Sem permissões | **RBAC por role** |
| Icons inconsistentes | **43 ícones lucide-react** |

---

## 🎯 ESTRUTURA EM 30 SEGUNDOS

```javascript
// Um item de menu
{
  id: "modulo.item",              // ID único
  label: "Label Amigável",        // Título
  icon: "IconName",               // ícone lucide-react
  path: "/clinica/modulo/item",   // Rota (se link)
  roles: ["admin", "gestor"],     // Quem vê
  children: [...]                 // Opcional - filhos
}
```

---

## 👤 PERMISSÕES POR ROLE

```
👨‍💼 Admin        → Vê tudo (48 itens)
👔 Gestor       → Vê 37 itens (sem Admin)
💵 Financeiro   → Vê 16 itens (finanças)
👨‍⚕️ Médico      → Vê 17 itens (atendimento)
👩‍💼 Recepção    → Vê 13 itens (agenda)
```

---

## 📁 8 MÓDULOS PRINCIPAIS

```
1️⃣ AGENDA           (7+2 itens)  - Gerenciar compromissos
2️⃣ PACIENTES        (7+2 itens)  - Gestão clínica
3️⃣ BASE DO SISTEMA  (4 itens)    - Cadastros mestres
4️⃣ FINANCEIRO       (10+2 itens) - Controle econômico
5️⃣ ESTOQUE          (8+3 itens)  - Gestão de inventário
6️⃣ FATURAMENTO      (2 itens)    - Integração convênios
7️⃣ CONFIGURAÇÕES    (6 itens)    - Setup do sistema
8️⃣ ADMINISTRAÇÃO    (2 itens)    - Super admin only
```

---

## 🔧 ADICIONAR NOVO ITEM (3 PASSOS)

### 1. Adicionar ao menu.js
```javascript
{
  id: "agenda.novo_item",
  label: "Novo Item",
  icon: "BarChart3",
  path: "/clinica/agenda/novo",
  roles: ["admin", "gestor"],
}
```

### 2. Criar página
```jsx
// src/pages/clinica/agenda/NovoItem.jsx
export default function NovoItem() {
  return <h1>Novo Item</h1>;
}
```

### 3. Registrar rota
```jsx
// src/AppRoutes.jsx
<Route path="/novo" element={<NovoItem />} />
```

✅ **Pronto!** O item aparecerá no menu automaticamente.

---

## 🎨 HIERARQUIA VISUAL

```
Nível 0: Dashboard
  font-weight: 500
  ícone: grande (h-5 w-5)

Nível 1: Módulo / Subitem Principal
  font-weight: 400
  ícone: pequeno (h-4 w-4)
  indentação: 1x

Nível 2: Subitem Aninhado
  font-weight: 400
  ícone: muito pequeno (h-3 w-3)
  indentação: 2x
```

---

## 🚨 NÃO FAÇA

```javascript
❌ Mais de 3 níveis
{
  label: "N1",
  children: [{
    label: "N2",
    children: [{
      label: "N3",
      children: [{
        label: "N4 ❌ NÃO RENDERIZA"
      }]
    }]
  }]
}

❌ Item sem ID
{
  label: "Meu Item",
  // Falta 'id'
}

❌ Ter path E children
{
  id: "mod.grupo",
  label: "Grupo",
  path: "/clinica/grupo",  // ❌ REMOVE
  children: [...]
}

❌ Permissão vazia
{
  id: "mod.item",
  roles: [],  // ❌ Deixar sem 'roles' é melhor
}
```

---

## 📚 DOCUMENTAÇÃO RÁPIDA

| Precisa de... | Vá para... |
|---------------|-----------|
| Entender estrutura | `MENU_ESTRUTURA_FINAL.md` |
| Adicionar novo item | `MENU_GUIA_PRATICO.md` (Seção 2) |
| Criar nova página | `CHECKLIST_NOVAS_PAGINAS.md` |
| Ver por role | `MENU_POR_PERFIL.md` |
| Antes vs Depois | `MENU_ANTES_E_DEPOIS.md` |

---

## 🧪 TESTAR RÁPIDO

### Menu aparece?
```bash
1. Fazer login como admin
2. Abrir sidebar
3. Item deve aparecer
```

### Role funciona?
```bash
1. Fazer login como financeiro
2. Não deve ver Agenda (financeiro não tem roles para isso)
3. Deve ver Financeiro
```

### Navegação?
```bash
1. Clicar no item
2. URL muda
3. Página renderiza
```

---

## 🎭 EXEMPLOS REAIS

### Adicionar "Relatórios da Agenda"
```javascript
{
  id: "agenda.relatorios",
  label: "Relatórios",
  icon: "FileBarChart",
  path: "/clinica/agenda/relatorios",
  roles: ["admin", "gestor"],
}
// ✅ Aparece em Agenda para admin e gestor
```

### Adicionar "Conciliação Bancária"
```javascript
{
  id: "financeiro.conciliacao",
  label: "Conciliação Bancária",
  icon: "Banknote",
  path: "/clinica/financeiro/conciliacao",
  roles: ["admin", "gestor", "financeiro"],
}
// ✅ Aparece em Financeiro para esses 3 roles
```

### Adicionar subgrupo
```javascript
{
  id: "financeiro.estrutura",
  label: "Estrutura Financeira",
  icon: "Settings2",
  roles: ["admin", "gestor"],
  // ⚠️ SEM path - é um grupo
  children: [
    {
      id: "financeiro.plano_contas",
      label: "Plano de Contas",
      icon: "ListTree",
      path: "/clinica/financeiro/plano-contas",
      roles: ["admin", "gestor"],
    },
  ],
}
// ✅ Aparece como grupo expansível em Financeiro
```

---

## 🔗 ÍCONES DISPONÍVEIS

Todos do `lucide-react`: https://lucide.dev/

Exemplos comuns:
```
LayoutDashboard    Dashboard
Calendar           Agenda
Users              Pacientes
Wallet             Financeiro
Boxes              Estoque
Settings           Configurações
Shield             Administração
BarChart3          Relatórios
TrendingUp         Crescimento
TrendingDown       Queda
```

---

## ⚡ PERFORMANCE

- ✅ Sem re-renders desnecessários (useMemo)
- ✅ Lazy loading de icones
- ✅ Animações otimizadas (Framer Motion)
- ✅ Filtro de permissões eficiente

---

## 🆘 TROUBLESHOOTING

### Item não aparece
→ Verificar `roles` do item vs role do usuário

### Ícone não renderiza
→ Verificar nome em lucide.dev

### Submenu não abre
→ Verificar se tem `id` e `children`

### Rota não funciona
→ Verificar em AppRoutes.jsx

---

## 📊 RESUMO

```
✅ 8 módulos claros
✅ 3 níveis profundidade máx
✅ 5 roles suportadas
✅ 43 ícones integrados
✅ Documentação completa
✅ Pronto para produção
```

---

**Última atualização**: Jan 13, 2026  
**Manutenção**: Rápida e simples  
**Status**: Production Ready ✅
