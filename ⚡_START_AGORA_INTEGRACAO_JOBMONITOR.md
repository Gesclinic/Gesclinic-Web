# ⚡ START AGORA: Integrar JobMonitor (5 min)

**Status:** npm run dev ✅ rodando em http://localhost:3000/  
**Objetivo:** Adicionar JobMonitor ao app  
**Tempo:** 5 minutos

---

## 📋 PRÉ-REQUISITOS

- ✅ App rodando (`npm run dev`)
- ✅ Arquivo `src/pages/financeiro/JobMonitor.jsx` criado
- ✅ Supabase conectado

---

## 🎯 PASSO 1: Abrir AppRoutes.jsx (1 min)

```bash
# Terminal ou editor
code src/AppRoutes.jsx
```

---

## 🎯 PASSO 2: Adicionar Import (30 seg)

**Procure por:** Outros imports de components

```jsx
// Adicione esta linha no topo com outros imports:
import JobMonitor from '@/pages/financeiro/JobMonitor'
```

**Exemplo de onde colocar:**
```jsx
import Dashboard from '@/pages/financeiro/Dashboard'
import CashFlow from '@/pages/financeiro/CashFlow'
import JobMonitor from '@/pages/financeiro/JobMonitor'  // ← ADICIONAR AQUI
```

---

## 🎯 PASSO 3: Adicionar Rota (1 min)

**Procure por:** Seção de routes de financeiro

```jsx
// Localize rotas do Financeiro (buscar por /clinica/financeiro)
// Adicione esta rota após as outras:

{
  path: 'jobs',
  element: <JobMonitor />
}
```

**Exemplo de onde colocar:**
```jsx
{
  path: 'financeiro',
  element: <FinanceiroLayout />,
  children: [
    { path: 'dashboard', element: <Dashboard /> },
    { path: 'fluxo-caixa', element: <CashFlow /> },
    { path: 'jobs', element: <JobMonitor /> }  // ← ADICIONAR AQUI
  ]
}
```

---

## 🎯 PASSO 4: Salvar (30 seg)

```bash
# Ctrl+S no editor VSCode
# Vite faz hot reload automático
# Sem erros no terminal? ✅ Continue!
```

---

## 🎯 PASSO 5: Testar no Browser (2 min)

```
1. Abra: http://localhost:3000/clinica/financeiro/jobs
2. Faça login se pedido
3. Você deve ver:
   ✅ JobMonitor Dashboard
   ✅ 5 jobs listados
   ✅ Status "⏳ Novo"
   ✅ Botão "Executar Agora"
```

---

## ✅ SUCESSO SE

- ✅ Página carrega sem erro 404
- ✅ 5 jobs aparecem na tabela
- ✅ Status correto em cada job
- ✅ Gráfico de estatísticas visível
- ✅ Botão "Executar Agora" ativo

---

## 🆘 PROBLEMAS?

### Página mostra 404
- ✓ Verificar se import foi adicionado
- ✓ Verificar se rota foi adicionada
- ✓ F12 → Console → procurar por erros
- ✓ Restart: `npm run dev`

### Mostra "Loading..." eternamente
- ✓ Verificar conexão com Supabase
- ✓ F12 → Network → ver requisições
- ✓ Fazer login em `/login`

### Erro ao clicar "Executar Agora"
- ✓ Verificar console (F12)
- ✓ Verificar auth (user logado?)
- ✓ Ver Supabase logs

---

## 🚀 PRÓXIMO PASSO

Após JobMonitor funcionar:

### → Testar Email
```bash
node scripts/test-email-system.js
```

**Resultado:** Email entregue em 5 minutos! ✅

---

**Tempo total desta ação:** 5 minutos  
**Próxima ação:** Testar email  
**Status:** 🟢 PRONTO PARA COMEÇAR

---

*Documento criado: 28/05/2026 - v1.0 FINAL*
