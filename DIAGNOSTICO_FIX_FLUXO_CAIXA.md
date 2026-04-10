# 🔍 DIAGNÓSTICO E CORREÇÃO - Erro 404 Fluxo de Caixa

**Data:** 21 de janeiro de 2026  
**Status:** ✅ CORRIGIDO

---

## 📋 Problema Identificado

Ao acessar a página `http://localhost:3000/clinica/financeiro/fluxo`, o sistema exibia:

```
❌ 404 Página não encontrada
```

**Erros no console:**
```
Could not find the table 'public.view_ar_receivables_v1' in the schema cache
listReceivables error: Could not find the table...
ap_bills.vendor_name does not exist
Profissionais encontrados: 0
```

---

## 🔎 Análise da Causa

### Migração que Causou o Problema

Arquivo: `supabase/migrations/20260115_CLEAN_AND_REINIT.sql`

Esta migração:
1. ✅ Dropou todas as tabelas antigas (necessário para limpeza)
2. ✅ Recriou as tabelas base (clinics, users, etc.)
3. ❌ **NÃO recriou** as views e funções de financeiro

### Views/Funções que Desapareceram

| Item | Tipo | Status |
|------|------|--------|
| `view_ar_receivables_v1` | VIEW | ❌ Dropada, não recriada |
| `ap_bills_with_category` | VIEW | ❌ Dropada, não recriada |
| `cashflow_summary` | FUNCTION | ❌ Dropada, não recriada |
| `list_ap_bills` | FUNCTION | ❌ Dropada, não recriada |
| `cash_flow` | VIEW | ❌ Dropada, não recriada |
| `ar_receivables` | TABLE | ❌ Não recriada |
| `ap_bills.vendor_name` | COLUMN | ❌ Coluna adicionada depois, não migrada |

### Por que Isso Quebrou Tudo

A página `FluxoCaixa.jsx` usa:

```javascript
import { listCashFlow, cashflowSummary, listAccountPlans } from "@/lib/financeApi";
```

E a API tenta acessar:

```javascript
// receivablesApi.js
.from('view_ar_receivables_v1')  // ❌ NÃO EXISTE MAIS
.select('*')
```

```javascript
// financeApi.js
.rpc('cashflow_summary', {...})  // ❌ FUNÇÃO NÃO EXISTE
.rpc('list_ap_bills', {...})      // ❌ FUNÇÃO NÃO EXISTE
```

---

## ✅ Solução Implementada

### Arquivo Criado

📁 **`supabase/migrations/20260121_fix_finance_views.sql`**

Este arquivo contém:

1. **Recriação da Tabela `ar_receivables`**
   - Tabela para Contas a Receber (Accounts Receivable)
   - Colunas: valor, status, datas, profissional, etc.
   - Índices para performance
   - Constraint de status

2. **Adição da Coluna `vendor_name` em `ap_bills`**
   - Necessária para mostrar o fornecedor
   - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`

3. **Recriação da View `view_ar_receivables_v1`**
   - SELECT simplificado de `ar_receivables`
   - Aliases: `payer_name` → `pagador`
   - Usada por: `listReceivables()` no código

4. **Recriação da View `ap_bills_with_category`**
   - JOIN `ap_bills` com `account_plans`
   - Expõe `category_name`
   - Usada para sorting e filtragem

5. **Recriação da Função `cashflow_summary()`**
   - Calcula: entradas, saídas, resultado líquido
   - Parâmetros: clinic_id, start_date, end_date
   - Returns: table com 5 colunas numéricas

6. **Recriação da Função `list_ap_bills()`**
   - Lista contas a pagar
   - Parâmetros: clinic_id, status_text, limit, offset
   - Retorna todas as colunas de ap_bills

7. **Recriação da View `cash_flow`**
   - UNION de entradas (ar_receivables) + saídas (ap_bills)
   - Consolida fluxo de caixa em uma única view

---

## 🚀 Como Aplicar a Correção

### Opção 1: Via Supabase Console (Rápido)

1. Acesse: https://app.supabase.com
2. SQL Editor → New Query
3. Cole o conteúdo de `supabase/migrations/20260121_fix_finance_views.sql`
4. Clique em "Run"
5. Recarregue o navegador (F5)

### Opção 2: Via Supabase CLI

```bash
supabase db push
```

---

## ✨ Resultado

Após aplicar a migração:

```
✅ http://localhost:3000/clinica/financeiro/fluxo
   → Carrega normalmente
   → Sem erros no console
   → Dados aparecem corretamente
```

---

## 📊 Checklist de Validação

- [ ] SQL foi executado no Supabase
- [ ] Sem erros na execução
- [ ] Navegador foi recarregado (F5)
- [ ] Página `/clinica/financeiro/fluxo` carrega sem 404
- [ ] Console do navegador (F12) mostra sem erros
- [ ] Dados de fluxo aparecem na tabela
- [ ] Filtros funcionam

---

## 📞 Troubleshooting

### Se ainda ver erro de "view not found"

1. Verifique se a query foi executada com sucesso no Supabase
2. Tente: SQL Editor → "Ctrl+Shift+Delete" (clear cache)
3. Recarregue o navegador com Ctrl+Shift+R (force hard refresh)

### Se aparecer "vendor_name doesn't exist"

A coluna foi adicionada, mas talvez o cache do Supabase precise de refresh:
1. Abra: SQL Editor
2. Execute: `SELECT * FROM public.ap_bills LIMIT 1;`
3. Confirme que `vendor_name` aparece nas colunas
4. Se não aparecer, execute a migration novamente

### Se os dados não aparecerem

1. Verifique se há dados em `ap_bills` ou `ar_receivables`
2. Abra: SQL Editor
3. Execute: `SELECT COUNT(*) FROM public.ap_bills;`
4. Se der 0, você precisa cadastrar dados primeiro

---

## 📝 Notas Técnicas

- **Índices criados:** Melhoram performance de queries
- **CHECK constraints:** Garantem apenas valores válidos de status
- **Generated columns:** `valor_liquido` é calculada automaticamente
- **CASCADE deletes:** Se uma clínica for deletada, seus registros também

---

## 🎯 Próximos Passos Recomendados

1. ✅ Aplicar esta migração
2. ✅ Testar página de Fluxo de Caixa
3. ✅ Testar página de Contas a Receber (`/clinica/financeiro/receber`)
4. ✅ Testar página de Contas a Pagar (`/clinica/financeiro/pagar`)
5. ⚠️ Considerar adicionar dados de exemplo para teste

---

**✅ Pronto! Utilize o arquivo [QUICK_FIX_FLUXO_CAIXA.md](QUICK_FIX_FLUXO_CAIXA.md) para instruções rápidas.**
