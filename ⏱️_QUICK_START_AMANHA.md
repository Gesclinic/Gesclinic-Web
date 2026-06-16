# ⏱️ QUICK START - CONTINUAR AMANHÃ

## 🚀 COMMANDS BÁSICOS

### Start Dev Server
```bash
npm run dev
```
✅ Abre em `http://localhost:3000`

### Ver Dashboard
```
1. Abra: http://localhost:3000/clinica/financeiro/fluxo-caixa
2. Login com suas credenciais
3. Você verá o dashboard
```

### Parar Dev Server
```bash
Ctrl + C
```

---

## 🧪 PARA TASK 5 (Testing)

### Rodar Tests Existentes
```bash
npm test
```

### Coverage Report
```bash
npm test -- --coverage
```

### Watch Mode (desenvolvimento)
```bash
npm test -- --watch
```

---

## 📁 ARQUIVOS PRINCIPAIS

```
src/AppRoutes.jsx                                      ← Rotas
src/modules/financeiro/fluxo-caixa/pages/index.tsx    ← Página Principal
src/modules/financeiro/fluxo-caixa/hooks/useCashFlow.ts
src/modules/financeiro/fluxo-caixa/components/
  ├── CashFlowDashboard.tsx
  ├── MetricCards.tsx
  ├── PeriodSelector.tsx
  └── FilterPanel.tsx
```

---

## 📊 MÓDULO LOCALIZAÇÃO

```
http://localhost:3000/clinica/financeiro/fluxo-caixa
                      └─────────┬─────────┘
                          Rota protegida
```

---

## ✅ CHECKLIST DIÁRIO

- [ ] Dev server rodando (`npm run dev`)
- [ ] URL acessível (http://localhost:3000)
- [ ] Dashboard visível em `/clinica/financeiro/fluxo-caixa`
- [ ] Sem console errors
- [ ] Tests passando (quando chegar Task 5)

---

## 📚 REFERÊNCIA RÁPIDA

| Arquivo | Função |
|---------|--------|
| AppRoutes.jsx | Define todas as rotas |
| pages/index.tsx | Componente página (entrada) |
| useCashFlow.ts | Logic dos dados |
| CashFlowDashboard.tsx | Layout principal |
| MetricCards.tsx | Cards das métricas |
| PeriodSelector.tsx | Seletor período |
| FilterPanel.tsx | Filtros avançados |

---

## 🎯 TASK 5 PREVIEW

Quando chegar Task 5, você criará:

```
__tests__/
  ├── cashFlowApi.test.ts       ← API tests
  ├── useCashFlow.test.ts        ← Hook tests
  ├── components/
  │   ├── CashFlowDashboard.test.tsx
  │   ├── MetricCards.test.tsx
  │   ├── PeriodSelector.test.tsx
  │   └── FilterPanel.test.tsx
  └── calculations.test.ts       ← Utils tests
```

---

## 🔧 DEBUG COMUM

### Erro: "Port 3000 already in use"
```bash
# Windows
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force

# Depois
npm run dev
```

### Erro: "Module not found"
- Verifique import paths usam `@/contexts/` (plural!)
- Não use `@/context/` (singular)

### Dashboard não aparece
1. Verifique se está logado
2. Verifique URL: `/clinica/financeiro/fluxo-caixa`
3. F12 → Console → veja erros

---

## 💾 BACKUP

Todos os documentos de referência estão em:
```
c:\dev\gesclinic-web\
├── 📊_DASHBOARD_OPERACIONAL.md
├── 📋_CHECKLIST_SESSION_COMPLETA.md
├── ⚡_ONE_PAGER_TASK4.md
├── ✅_TASK4_CONCLUIDA.md
├── 🎊_50_PORCENTO_CONCLUIDO.md
├── ⚡_TASK4_RAPIDO_RESUMO.md
└── ⏭️_PROXIMA_SESSAO_TASK5.md
```

---

## 📞 SUPORTE RÁPIDO

**Se o dashboard não renderizar:**
1. Check console (F12)
2. Verify auth is active
3. Verify clinic context loaded
4. Reload page (F5)

**Se tiver erros de import:**
1. Use `@/contexts/` (plural) ✅
2. Use `@/modules/` para imports
3. Use `@/lib/` para APIs

**Performance ruim:**
1. Check network tab (F12)
2. Verify Supabase connection
3. Check Lighthouse score

---

🟢 **READY TO CONTINUE** | Next: Task 5 (Testing)

Veja: `⏭️_PROXIMA_SESSAO_TASK5.md`
