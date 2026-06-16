# ⚡ QUICK START: ETAPA 6 - Conciliação Inteligente

**Tempo estimado**: 2 dias  
**Complexidade**: 🔴 Alta  
**Começar**: Agora

---

## 📋 Checklist de Implementação

### FASE 1: Tabelas e Funções SQL (2h)
- [ ] Executar migration `20260524_ETAPA6_CONCILIACAO.sql` no Supabase
- [ ] Validar estrutura (3 tabelas: bank_statements, bank_transactions, reconciliation_history)
- [ ] Testar funções PL/pgSQL

**Arquivo a criar**: `supabase/migrations/20260524_ETAPA6_CONCILIACAO.sql`

### FASE 2: API Module (2h)
- [ ] Criar `src/lib/reconciliationApi.js`
- [ ] Implementar: uploadStatement, matchTransactions, getReconciliationReport
- [ ] Testar com dados mock

**Arquivo a criar**: `src/lib/reconciliationApi.js`

### FASE 3: React Component (3h)
- [ ] Criar `src/pages/clinica/financeiro/Conciliador.jsx`
- [ ] Tabs: Upload, Matching, Validação, Resumo
- [ ] Upload drag-drop + preview

**Arquivo a criar**: `src/pages/clinica/financeiro/Conciliador.jsx`

### FASE 4: Integração de Rota (30min)
- [ ] Registrar em `AppRoutes.jsx`
- [ ] Adicionar ao menu `menu.js`

### FASE 5: Testes (1h)
- [ ] Upload de arquivo .CSV
- [ ] Matching automático
- [ ] Validação de matches

---

## 🚀 Começar AGORA?

Comando para iniciar ETAPA 6:
```bash
# Terminal
cd c:\dev\gesclinic-web

# 1. Ler roadmap
cat ⚡_ETAPAS_6_7_8_ROADMAP.md

# 2. Você pedirá para eu começar criando:
# - Migration SQL
# - API Module
# - Component React
# - Testes
```

---

## 📚 Referências Rápidas

**Estrutura do Matching Automático**:
```javascript
{
  "banco": "Itaú",
  "data": "2026-05-23",
  "valor": 1500.00,
  "descricao": "Paciente João Silva",
  "match": {
    "invoice_id": "uuid-123",
    "paciente": "João Silva",
    "tipo": "auto_exact",  // 'auto_exact', 'auto_fuzzy', 'manual'
    "confianca": 0.99,     // 0.00 - 1.00
    "status": "matched"
  }
}
```

**API Endpoints Necessários**:
```javascript
POST   /api/reconciliation/upload          → Upload extrato
POST   /api/reconciliation/match           → Executar matching
GET    /api/reconciliation/status/:id      → Status do matching
GET    /api/reconciliation/report          → Gerar relatório
DELETE /api/reconciliation/match/:id       → Rejeitar match
```

---

## ✅ Próximo Passo

**Você quer que eu comece AGORA com ETAPA 6?**

Se sim, direi:
1. "Sim, faça ETAPA 6"
2. Ou específico: "Comece com a migration SQL"
3. Ou ordenado: "Migration → API → Component"

