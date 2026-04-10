# ✅ SAFE MODE - SQL Atualizado (21/01/2026)

## 🔧 O Que Mudou

O SQL foi **completamente reescrito** para ser muito mais **defensivo e seguro**:

### ❌ Versão Anterior (com erro)
```sql
CREATE TABLE IF NOT EXISTS public.ar_receivables (...)
-- Criava tabela, mas se já existisse, falhava ao tentar referenciar colunas

DROP VIEW IF EXISTS public.view_ar_receivables_v1;
-- Dropava view direto
```

### ✅ Versão Nova (SAFE MODE)
```sql
-- Apenas ADICIONA colunas faltantes
ALTER TABLE IF EXISTS public.ar_receivables
  ADD COLUMN IF NOT EXISTS origem text DEFAULT 'Manual';
  
-- Trata valores NULL com COALESCE
SELECT
  COALESCE(r.origem, 'Manual') as origem,
  ...
FROM public.ar_receivables r;

-- Usa CASCADE para dropar views
DROP VIEW IF EXISTS public.cash_flow CASCADE;
```

---

## 🛡️ Principais Mudanças

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Tabela ar_receivables** | `CREATE TABLE IF NOT EXISTS` (cria tudo) | `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (adiciona só o que falta) |
| **NULL handling** | Direto: `r.origem` | Com COALESCE: `COALESCE(r.origem, 'Manual')` |
| **Valores calculados** | `valor_liquido` (generated column) | `valor_bruto - descontos` (no SELECT) |
| **DROP Views** | `DROP VIEW IF EXISTS` | `DROP VIEW IF EXISTS ... CASCADE` |
| **Tratamento de erros** | Nenhum | `BEGIN ... EXCEPTION WHEN OTHERS THEN` |
| **Valores padrão** | Constraints na tabela | Defaults no SELECT |

---

## 🎯 Resultado

✅ **Não deleta dados existentes**  
✅ **Adiciona colunas faltantes**  
✅ **Trata valores NULL**  
✅ **Seguro para rexecução**  
✅ **Sem erros de "coluna não existe"**  

---

## 🚀 Como Usar

1. Acesse: https://app.supabase.com → SQL Editor
2. Copie o conteúdo de: `supabase/migrations/20260121_fix_finance_views.sql` (**VERSÃO NOVA**)
3. Cole no Supabase
4. Clique em **RUN**
5. Recarregue o navegador (F5)

---

## ✨ Quando Executar Este SQL

✅ Quando aparecer erro: `column r.origem does not exist`  
✅ Quando a tabela `ar_receivables` existe mas está incompleta  
✅ Quando quer adicionar views sem perder dados  

---

**Pronto! O SQL agora é totalmente seguro e não deleta nada.** 🎉
