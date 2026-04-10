# 🎯 MENU REESTRUTURADO — GESCLINIC 2026

## ✅ O QUE FOI IMPLEMENTADO

### 1️⃣ **Nova Estrutura de Menu** (`src/constants/menu.js`)
- ✅ **Um único Dashboard** como entry point
- ✅ **8 módulos principais** organizados por domínio funcional
- ✅ **Máximo 3 níveis** de profundidade
- ✅ **Sistema de permissões por perfil** (role-based)

### 2️⃣ **Novo Sidebar** (`src/components/layout/Sidebar.jsx`)
- ✅ Suporta renderização até **3 níveis** de profundidade
- ✅ Visual diferenciado por nível (font-weight, tamanho, indentação)
- ✅ **43 novos ícones** do lucide-react integrados
- ✅ Navegação fluida com animações Framer Motion
- ✅ Detecção automática de rota ativa e abertura de menus pai

### 3️⃣ **Sistema de Permissões**
- ✅ Filtros automáticos por role: `admin`, `gestor`, `financeiro`, `medico`, `recepcao`
- ✅ Remover itens não autorizados dinamicamente
- ✅ Remover grupos vazios automaticamente

---

## 📊 ESTRUTURA DE MENU FINAL

### **DASHBOARD** (Entry Point Único)
```
Dashboard → /clinica/dashboard
```

---

### **1. AGENDA** (Gestão de Compromissos)
```
├─ Agenda Geral → /clinica/agenda
├─ Por Profissional → /clinica/agenda/profissional
├─ Por Sala → /clinica/agenda/sala
├─ Confirmações → /clinica/agenda/confirmacoes
├─ Lista de Espera → /clinica/agenda/espera
├─ Indicadores → /clinica/agenda/indicadores
└─ Comunicação
   ├─ Notificações → /clinica/agenda/notificacoes
   └─ Logs → /clinica/agenda/logs
```

---

### **2. PACIENTES** (Gestão Clínica)
```
├─ Lista de Pacientes → /clinica/pacientes
├─ Prontuário
│  ├─ Dados Cadastrais → /clinica/pacientes/dados
│  ├─ Histórico Clínico → /clinica/pacientes/historico
│  └─ Anamnese → /clinica/pacientes/anamnese
├─ Arquivos
│  ├─ Documentos → /clinica/pacientes/documentos
│  └─ Fotos / Vídeos → /clinica/pacientes/midia
├─ Convênios → /clinica/pacientes/convenios
└─ Dados Familiares → /clinica/pacientes/familia
```

---

### **3. BASE DO SISTEMA** (Cadastros Mestres)
```
├─ Profissionais → /clinica/cadastros/profissionais
├─ Serviços e Procedimentos → /clinica/cadastros/servicos
├─ Convênios → /clinica/cadastros/convenios
└─ Salas e Recursos → /clinica/cadastros/salas
```

---

### **4. FINANCEIRO** (Controle Econômico)
```
├─ Visão Geral → /clinica/financeiro
├─ Contas a Receber → /clinica/financeiro/receber
├─ Contas a Pagar → /clinica/financeiro/pagar
├─ Fluxo de Caixa → /clinica/financeiro/fluxo
├─ Conciliação Bancária → /clinica/financeiro/conciliacao
├─ Estrutura Financeira
│  ├─ Plano de Contas → /clinica/financeiro/plano-contas
│  ├─ Centro de Custos → /clinica/financeiro/centro-custos
│  └─ Automações → /clinica/financeiro/automacoes
└─ Repasse Médico
   ├─ Visão Geral → /clinica/repasse
   ├─ Configurações → /clinica/repasse/config
   └─ Histórico → /clinica/repasse/historico
```

---

### **5. ESTOQUE** (Gestão de Inventário)
```
├─ Visão Geral → /clinica/estoque
├─ Produtos → /clinica/estoque/produtos
├─ Categorias → /clinica/estoque/categorias
├─ Fornecedores → /clinica/estoque/fornecedores
├─ Movimentações
│  ├─ Entradas → /clinica/estoque/entradas
│  ├─ Saídas → /clinica/estoque/saidas
│  └─ Transferências → /clinica/estoque/transferencias
├─ Requisições → /clinica/estoque/requisicoes
├─ Inventário → /clinica/estoque/inventario
└─ Relatórios → /clinica/estoque/relatorios
```

---

### **6. FATURAMENTO** (Integração com Convênios)
```
├─ Guias TISS → /clinica/faturamento/guias
└─ Envio de XML → /clinica/faturamento/xml
```

---

### **7. CONFIGURAÇÕES** (Setup do Sistema)
```
├─ Perfis de Usuário → /clinica/configuracoes/perfis
├─ Permissões → /clinica/configuracoes/permissoes
├─ Agenda → /clinica/configuracoes/agenda
├─ Financeiro → /clinica/configuracoes/financeiro
├─ Estoque → /clinica/configuracoes/estoque
└─ Faturamento → /clinica/configuracoes/faturamento
```

---

### **8. ADMINISTRAÇÃO** (Super Admin Only)
```
├─ Usuários → /clinica/admin/usuarios
└─ Clínicas → /clinica/admin/clinicas
```

---

## 👤 PERMISSÕES POR PERFIL

### **Admin** ✅
Acesso total a todos os módulos.

### **Gestor/Dono** ✅
```
✓ Dashboard
✓ Agenda (completo)
✓ Pacientes (completo)
✓ Base do Sistema
✓ Financeiro (completo)
✓ Estoque (visão geral + relatórios)
✓ Faturamento
✓ Configurações (financeiro)
✓ Administração
```

### **Financeiro** ✅
```
✓ Dashboard
✓ Financeiro (completo)
✓ Estoque (visão geral + relatórios)
✓ Faturamento
```

### **Médico/Profissional** ✅
```
✓ Dashboard
✓ Agenda (geral, profissional, confirmações)
✓ Pacientes (prontuário completo)
✓ Repasse Médico (leitura)
```

### **Recepcionista** ✅
```
✓ Dashboard
✓ Agenda (completo)
✓ Pacientes (lista, dados, convênios)
```

---

## 🎨 HIERARQUIA VISUAL

### **Nível 0 (Dashboard/Módulo)**
- Ícone grande (h-5 w-5)
- Font-weight: 500 (medium)
- Destaque visual ao ativar

### **Nível 1 (Subitem Principal)**
- Ícone pequeno (h-4 w-4)
- Font-weight: 400 (normal)
- Indentação discreta

### **Nível 2 (Subitem Aninhado)**
- Ícone muito pequeno (h-3 w-3)
- Font-weight: 400 (normal)
- Indentação maior

### **Estados**
- **Ativo**: `bg-primary/10 + border-l-4 primary`
- **Hover**: `bg-primary/5`
- **Collapse**: Apenas ícones visíveis

---

## 🔧 COMO USAR

### **Para adicionar um novo item de menu:**

```javascript
// src/constants/menu.js
{
  id: "modulo.item_unico",
  label: "Meu Item",
  icon: "IconName",           // Ícone lucide-react
  path: "/clinica/modulo/item",
  roles: ["admin", "gestor"],  // Quem pode ver
  featurePath: "modulo.item",
  children: [                 // Opcional - até 1 nível de filhos
    { ... }
  ]
}
```

### **Para alterar permissões:**

```javascript
// Editar array 'roles' no item de menu
roles: ["admin", "gestor", "financeiro"] // Quem pode ver este item
```

---

## 📁 ARQUIVOS MODIFICADOS

| Arquivo | Alteração |
|---------|-----------|
| `src/constants/menu.js` | ✅ Completa reestruturação |
| `src/components/layout/Sidebar.jsx` | ✅ Novo algoritmo de renderização (3 níveis) |

---

## 🚀 PRÓXIMOS PASSOS (OPCIONAL)

1. **Criar páginas faltantes** para rotas sem implementação
2. **Adicionar badges** nos módulos críticos (ex: "Repasse Médico")
3. **Implementar analytics** de navegação (qual menu mais acessado)
4. **Adicionar search** para encontrar itens rapidamente (Cmd+K)
5. **Customizar cores** por módulo (agenda=azul, financeiro=verde, etc)

---

## 📞 SUPORTE

Se algo não funciona:
1. Verifique se o `role` do usuário está correto em `useAuth()`
2. Confirme que o `id` do item existe no mapa
3. Valide o `path` da rota no `AppRoutes.jsx`

---

**Versão**: 1.0 | **Data**: Jan 13, 2026 | **Status**: ✅ Produção
