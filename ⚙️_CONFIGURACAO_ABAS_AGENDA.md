# ⚙️ CONFIGURAÇÃO DE ABAS POR PERFIL - Guia Rápido

## 📋 Visão Geral

As abas **dia/semana/mês** da Agenda agora podem ser configuradas **por perfil de usuário**. Isso permite dar acesso granular a diferentes visualizações para diferentes usuários.

---

## 📂 Arquivo de Configuração

**Localização:** `src/config/agendaTabs.config.js`

Este arquivo contém a configuração de quais abas (dia/semana/mês) cada perfil pode acessar.

---

## 🎯 Como Mudar Permissões de Abas

### Exemplo 1: Dar acesso a um novo perfil

```javascript
// No arquivo: src/config/agendaTabs.config.js

export const AGENDA_TABS_CONFIG = {
  // ... outros perfis ...
  
  novo_perfil: {
    id: 'novo_perfil',
    label: 'Novo Perfil',
    tabs: {
      dia: true,      // ✅ Pode ver dia
      semana: true,   // ✅ Pode ver semana
      mes: true,      // ✅ Pode ver mês
    },
    description: 'Descrição do acesso'
  }
};
```

### Exemplo 2: Remover acesso a uma aba

Se quiser que um perfil **NÃO** possa acessar a visualização de "mês":

```javascript
financeiro: {
  id: 'financeiro',
  label: 'Financeiro',
  tabs: {
    dia: true,       // ✅ Pode ver
    semana: true,    // ✅ Pode ver
    mes: false,      // ❌ NÃO pode ver (bloqueado)
  },
  description: 'Financeiro: dia e semana'
}
```

### Exemplo 3: Bloquear todas as abas

Se quiser que um perfil não acesse a agenda (mostrar as 3 abas bloqueadas):

```javascript
estoque: {
  id: 'estoque',
  label: 'Estoque',
  tabs: {
    dia: false,      // ❌ Bloqueado
    semana: false,   // ❌ Bloqueado
    mes: false,      // ❌ Bloqueado
  },
  description: 'Estoque não tem acesso à agenda'
}
```

---

## 🔄 Fluxo de Funcionamento

1. **Usuário faz login** → Sistema lê o `currentRole` do usuário
2. **AgendaHeaderNew renderiza** → Chama `getAccessibleAgendaTabs(role)`
3. **Abas são filtradas** → Mostra apenas as abas que o perfil pode acessar
4. **Abas bloqueadas** → Aparecem com ícone de cadeado 🔒 (desabilitadas)

---

## 🎚️ Funções Disponíveis

No arquivo `agendaTabs.config.js` você tem essas funções úteis:

```javascript
// Obter configuração completa para um role
getAgendaTabsForRole(role);

// Verificar se tem acesso a uma aba específica
canAccessAgendaTab(role, 'dia');  // true/false

// Obter lista de abas acessíveis
getAccessibleAgendaTabs(role);    // ['dia', 'semana', 'mes']
```

---

## 📊 Configuração Padrão Atual

| Perfil | Dia | Semana | Mês | Padrão |
|--------|:---:|:------:|:---:|--------|
| **Admin** | ✅ | ✅ | ✅ | Mês |
| **Gestor** | ✅ | ✅ | ✅ | Semana |
| **Recepção** | ✅ | ✅ | ✅ | Dia |
| **Profissional** | ✅ | ✅ | ✅ | Dia |
| **Financeiro** | ✅ | ✅ | ✅ | Mês |
| **Estoque** | ❌ | ❌ | ❌ | N/A |
| **Faturamento** | ✅ | ✅ | ✅ | Mês |

---

## 🔒 Visualização de Abas Bloqueadas

Quando um perfil não tem acesso a uma aba, ela aparece assim:

```
[🔒 📅 Dia] [🗓 Semana] [📆 Mês]
```

Com tooltip explicando o acesso negado.

---

## 💡 Dicas

- **Todos os perfis têm acesso atualmente** (excelente padrão!)
- Para restringir, basta mudar `true` para `false`
- O componente `AgendaHeaderNew.jsx` usa automaticamente estas configurações
- Nenhuma alteração adicional é necessária

---

## 📞 Suporte

Se precisar adicionar um novo perfil ou personalizar as abas:

1. Edite `src/config/agendaTabs.config.js`
2. Adicione o novo perfil na seção `AGENDA_TABS_CONFIG`
3. Configure quais abas ele pode acessar (true/false)
4. Salve o arquivo - mudanças são imediatas!

Nenhuma alteração em componentes React é necessária! 🚀
