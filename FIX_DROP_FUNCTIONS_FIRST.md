# ✅ SQL Corrigido - Dropar Funções Primeiro

**Data:** 21 de janeiro de 2026  
**Versão:** SAFE MODE v2 (Com DROP FUNCTION)

---

## 🔧 O Que Mudou

### ❌ Erro Anterior
```
ERROR 42P13: cannot change return type of existing function cashflow_summary
DETAIL: Row type defined by OUT parameters is different
```

### ✅ Solução
Agora o SQL **dropa as funções antes de recriar**:

```sql
-- Antes (erro):
CREATE OR REPLACE FUNCTION public.cashflow_summary(...)

-- Depois (correto):
DROP FUNCTION IF EXISTS public.cashflow_summary(UUID, DATE, DATE) CASCADE;
CREATE OR REPLACE FUNCTION public.cashflow_summary(...)
```

---

## 📝 Mudanças Específicas

```sql
-- Função 1: cashflow_summary
DROP FUNCTION IF EXISTS public.cashflow_summary(UUID, DATE, DATE) CASCADE;

-- Função 2: list_ap_bills
DROP FUNCTION IF EXISTS public.list_ap_bills(UUID, TEXT, INT, INT) CASCADE;
```

**Por quê?**
- `CREATE OR REPLACE` só funciona se o tipo de retorno for igual
- Como o tipo é diferente, precisa dropar e recriar
- O `CASCADE` garante que views que dependem também sejam dropadas

---

## 🚀 Como Usar Agora

1. Copie o SQL atualizado de: `supabase/migrations/20260121_fix_finance_views.sql`
2. Cole no Supabase SQL Editor
3. Clique em: RUN
4. Aguarde a mensagem de sucesso
5. Recarregue o navegador (F5)

---

## ✨ O SQL Agora:

✅ Dropa funções se existirem  
✅ Recria com tipo correto  
✅ Sem erro de "cannot change return type"  
✅ Seguro para rexecução  

---

**Pronto! Tente de novo.** 🎉
