# ✅ CHECKLIST — IMPLEMENTAR NOVAS PÁGINAS

Use este checklist para adicionar novas páginas/rotas ao menu da Gesclinic.

---

## 📋 ROTINA PADRÃO

### 1️⃣ Adicionar Item ao Menu
- [ ] Abrir `src/constants/menu.js`
- [ ] Localizar módulo correto (ex: "Agenda", "Financeiro")
- [ ] Adicionar novo objeto com:
  ```javascript
  {
    id: "modulo.novo_item",           // ✅ ID único
    label: "Nome Amigável",           // ✅ O que aparece na UI
    icon: "IconName",                 // ✅ De lucide-react
    path: "/clinica/modulo/novo",     // ✅ Rota única
    roles: ["admin", "gestor"],       // ✅ Quem vê
    featurePath: "modulo.novo_item",  // ✅ Para controle
  }
  ```
- [ ] Verificar se o ícone existe em lucide-react (https://lucide.dev/)
- [ ] Se for um grupo com filhos, remover `path` e adicionar `children: [...]`

### 2️⃣ Criar Arquivo da Página
- [ ] Criar pasta: `src/pages/clinica/<modulo>/<Pagina>.jsx`
- [ ] Exemplo: `src/pages/clinica/agenda/Notificacoes.jsx`
- [ ] Código básico:
  ```jsx
  export default function NovaFuncionalidade() {
    return (
      <div>
        <h1>Nova Funcionalidade</h1>
        {/* Conteúdo aqui */}
      </div>
    );
  }
  ```

### 3️⃣ Registrar Rota
- [ ] Abrir `src/AppRoutes.jsx`
- [ ] Importar componente:
  ```jsx
  import NovaFuncionalidade from "@/pages/clinica/modulo/NovaFuncionalidade.jsx";
  ```
- [ ] Adicionar rota no grupo correto:
  ```jsx
  <Route path="/clinica/modulo/novo" element={<NovaFuncionalidade />} />
  ```
- [ ] Testar no navegador

### 4️⃣ Testar Visibilidade
- [ ] Fazer login com role `admin` → deve aparecer
- [ ] Fazer login com role correto → deve aparecer (se configurado)
- [ ] Fazer login com role diferente → não deve aparecer
- [ ] Clicar no item no menu → deve navegar para a rota

---

## 🎯 EXEMPLOS PRÁTICOS

### Exemplo 1: Adicionar "Logs da Agenda"

**1. Adicionar ao Menu** (`src/constants/menu.js`)
```javascript
{
  id: "agenda.logs",
  label: "Logs",
  icon: "ScrollText",
  path: "/clinica/agenda/logs",
  roles: ["admin", "gestor"],
  featurePath: "agenda.logs",
  // ✅ Dentro de children de "agenda.comunicacao"
}
```

**2. Criar Página** (`src/pages/clinica/agenda/Logs.jsx`)
```jsx
import { useEffect, useState } from "react";

export default function LogsAgenda() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Buscar logs da API
    fetchAgendaLogs();
  }, []);

  return (
    <div className="space-y-4">
      <h1>Logs de Notificações</h1>
      {/* Listar logs */}
    </div>
  );
}
```

**3. Registrar Rota** (`src/AppRoutes.jsx`)
```jsx
import LogsAgenda from "@/pages/clinica/agenda/Logs";

// Dentro de <Route path="/clinica/agenda/*">
<Route path="/logs" element={<LogsAgenda />} />
```

---

### Exemplo 2: Adicionar "Conciliação Bancária"

**1. Adicionar ao Menu** (`src/constants/menu.js`)
```javascript
{
  id: "financeiro.conciliacao",
  label: "Conciliação Bancária",
  icon: "Banknote",
  path: "/clinica/financeiro/conciliacao",
  roles: ["admin", "gestor", "financeiro"],
  featurePath: "financeiro.conciliacao",
  // ✅ Direto no módulo "Financeiro" (sem sub-grupo)
}
```

**2. Criar Página** (`src/pages/clinica/financeiro/Conciliacao.jsx`)
```jsx
import { useState } from "react";
import { financeApi } from "@/lib/financeApi";

export default function ConciliacaoBancaria() {
  const [selected, setSelected] = useState([]);

  const reconcile = async () => {
    // Reconciliar transações
    await financeApi.reconciliate(selected);
  };

  return (
    <div>
      <h1>Conciliação Bancária</h1>
      {/* Interface de conciliação */}
    </div>
  );
}
```

**3. Registrar Rota** (`src/AppRoutes.jsx`)
```jsx
import ConciliacaoBancaria from "@/pages/clinica/financeiro/Conciliacao";

// Dentro de <Route path="/clinica/financeiro/*">
<Route path="/conciliacao" element={<ConciliacaoBancaria />} />
```

---

### Exemplo 3: Adicionar Sub-grupo "Estrutura Financeira"

**1. Adicionar ao Menu** (`src/constants/menu.js`)
```javascript
{
  id: "financeiro.estrutura",
  label: "Estrutura Financeira",
  icon: "Settings2",
  roles: ["admin", "gestor"],
  // ⚠️ SEM 'path' - é um grupo
  children: [
    {
      id: "financeiro.plano_contas",
      label: "Plano de Contas",
      icon: "ListTree",
      path: "/clinica/financeiro/plano-contas",
      roles: ["admin", "gestor"],
    },
    {
      id: "financeiro.centro_custos",
      label: "Centro de Custos",
      icon: "Target",
      path: "/clinica/financeiro/centro-custos",
      roles: ["admin", "gestor"],
    },
    {
      id: "financeiro.automacoes",
      label: "Automações",
      icon: "Zap",
      path: "/clinica/financeiro/automacoes",
      roles: ["admin", "gestor"],
    },
  ],
}
```

**2-3. Criar Páginas e Registrar Rotas** (conforme exemplos anteriores)

---

## 🚨 ERROS COMUNS

### ❌ Erro: Item não aparece no menu
```javascript
// ❌ ERRADO - Falta ID
{
  label: "Meu Item",
  path: "/clinica/novo",
}

// ✅ CERTO
{
  id: "modulo.novo",
  label: "Meu Item",
  path: "/clinica/novo",
}
```

### ❌ Erro: Menu não abre sub-grupos
```javascript
// ❌ ERRADO - Tem path E children
{
  id: "modulo.grupo",
  label: "Meu Grupo",
  path: "/clinica/grupo",        // ❌ REMOVE ISSO
  children: [...]
}

// ✅ CERTO
{
  id: "modulo.grupo",
  label: "Meu Grupo",
  // Sem path quando tem children
  children: [...]
}
```

### ❌ Erro: Ícone não renderiza
```javascript
// ❌ ERRADO - Ícone não existe
{
  id: "modulo.novo",
  label: "Novo",
  icon: "IconQueNaoExiste",  // ❌
}

// ✅ CERTO - Usar ícone válido
{
  id: "modulo.novo",
  label: "Novo",
  icon: "BarChart3",  // ✅
}
```

### ❌ Erro: Usuário não vê item
```javascript
// ❌ ERRADO - roles vazio
{
  id: "modulo.novo",
  label: "Novo",
  roles: [],  // ❌ Só admin vê (deixa vazio mesmo)
}

// ✅ CERTO - Especificar roles
{
  id: "modulo.novo",
  label: "Novo",
  roles: ["admin", "gestor"],  // ✅ Gestor também vê
}
```

---

## 📁 ESTRUTURA DE PASTAS

Ao adicionar nova funcionalidade, respeite:
```
src/pages/
  └─ clinica/
    ├─ agenda/
    │  ├─ Agenda.jsx
    │  ├─ Confirmacoes.jsx
    │  ├─ ListaEspera.jsx
    │  ├─ Notificacoes.jsx
    │  └─ Logs.jsx
    ├─ pacientes/
    ├─ cadastros/
    │  ├─ Profissionais.jsx
    │  ├─ Servicos.jsx
    │  └─ ...
    ├─ financeiro/
    │  ├─ Dashboard.jsx
    │  ├─ ContasReceber.jsx
    │  ├─ ContasPagar.jsx
    │  ├─ Conciliacao.jsx
    │  └─ ...
    ├─ estoque/
    ├─ faturamento/
    ├─ configuracoes/
    └─ admin/
      ├─ Usuarios.jsx
      └─ Clinicas.jsx
```

---

## 🔄 FLUXO DE IMPLEMENTAÇÃO

```
1. Menu → novo item adicionado
           ↓
2. Componente → página criada
                ↓
3. Rota → registrada em AppRoutes.jsx
          ↓
4. Test → click no menu
          ↓
5. Deploy → live
```

---

## 🧪 TESTANDO

### Teste 1: Navegação
```bash
1. Clicar no item no sidebar
2. URL muda para o path correto
3. Página renderiza sem erro
```

### Teste 2: Permissões
```bash
1. Login como admin → vê item
2. Login como gestor → vê item (se role incluído)
3. Login como outro role → não vê item
```

### Teste 3: Integração
```bash
1. Página busca dados da API
2. Dados renderizam corretamente
3. Operações (criar, editar, deletar) funcionam
```

---

## 📱 RESPONSIVIDADE

Lembre-se:
- [ ] Testar em mobile (width < 640px)
- [ ] Sidebar fica colapsado em mobile
- [ ] Conteúdo é responsivo (Tailwind)
- [ ] Usar componentes de `src/components/ui/`

---

## 📚 REFERÊNCIAS RÁPIDAS

| Tarefa | Arquivo |
|--------|---------|
| Adicionar ao menu | `src/constants/menu.js` |
| Criar página | `src/pages/clinica/.../Componente.jsx` |
| Registrar rota | `src/AppRoutes.jsx` |
| Usar ícone | `lucide-react` |
| Usar componente | `src/components/ui/` |
| API | `src/lib/*Api.js` |

---

**Última atualização**: Jan 13, 2026  
**Versão**: 2.0 (Novo Menu)
