```
╔════════════════════════════════════════════════════════════════════════════════╗
║               ✅ SQL CORRIGIDO - DROP FUNCTIONS FIRST                         ║
╚════════════════════════════════════════════════════════════════════════════════╝

⚠️  ERRO ANTERIOR
═══════════════════════════════════════════════════════════════════════════════

   ERROR 42P13: cannot change return type of existing function
   DETAIL: Row type defined by OUT parameters is different
   └─ Causa: Função já existia com tipo de retorno diferente

✅ SOLUÇÃO (v2)
═══════════════════════════════════════════════════════════════════════════════

   SQL atualizado para dropar funções ANTES de recriar:
   
   DROP FUNCTION IF EXISTS public.cashflow_summary(...) CASCADE;
   CREATE OR REPLACE FUNCTION public.cashflow_summary(...)
   
   DROP FUNCTION IF EXISTS public.list_ap_bills(...) CASCADE;
   CREATE OR REPLACE FUNCTION public.list_ap_bills(...)

🚀 PRÓXIMA AÇÃO
═══════════════════════════════════════════════════════════════════════════════

   1. Abra: https://app.supabase.com/project/_/sql
   
   2. Clique: "New Query" (ou limpe a query anterior)
   
   3. Copie o SQL de:
      📁 supabase/migrations/20260121_fix_finance_views.sql
      (VERSÃO MAIS NOVA - com DROP FUNCTION)
   
   4. Cole no SQL Editor
   
   5. Clique: RUN
   
   6. Aguarde a mensagem:
      ✅ "Finance views and functions updated successfully (SAFE MODE)!"
   
   7. Se der erro diferente, copie a mensagem

════════════════════════════════════════════════════════════════════════════════

💡 POR QUE ISSO ACONTECEU

PostgreSQL não permite mudar o tipo de retorno de uma função
existente com CREATE OR REPLACE se for diferente.

Solução: Dropar a função antiga e criar a nova com o tipo correto.

════════════════════════════════════════════════════════════════════════════════

📋 O QUE SERÁ FEITO DESTA VEZ

✅ Drop função 'cashflow_summary' se existir
✅ Drop função 'list_ap_bills' se existir
✅ Adicionar colunas faltantes em ar_receivables
✅ Adicionar coluna vendor_name em ap_bills
✅ Recriar view 'view_ar_receivables_v1'
✅ Recriar view 'ap_bills_with_category'
✅ Recriar função 'cashflow_summary' com tipo correto
✅ Recriar função 'list_ap_bills' com tipo correto
✅ Recriar view 'cash_flow'

❌ NÃO deleta dados

════════════════════════════════════════════════════════════════════════════════

✨ DIFERENÇA DESTA VEZ

Versão 1 (erro "cannot change return type"):
  └─ CREATE OR REPLACE FUNCTION ... (não pode alterar tipo)

Versão 2 (CORRIGIDO):
  └─ DROP FUNCTION IF EXISTS ... CASCADE;
  └─ CREATE OR REPLACE FUNCTION ... (recria com tipo novo)

════════════════════════════════════════════════════════════════════════════════

🎯 RESULTADO ESPERADO

ANTES:
❌ Erro 42P13: cannot change return type

DEPOIS:
✅ Função recriada com sucesso
✅ Página /clinica/financeiro/fluxo carrega
✅ Console sem erros

════════════════════════════════════════════════════════════════════════════════

⏱️  TEMPO

Leitura: 2 minutos
Execução: 3 minutos
Teste: 2 minutos
═════════════════════════════════════════════════════════════════════════════════
TOTAL: ~7 minutos

════════════════════════════════════════════════════════════════════════════════

✅ PRONTO!

Copie o SQL e execute no Supabase.
```

---

## 📌 Resumo

**Problema:** Função já existia com tipo de retorno diferente

**Solução:** Dropar antes de recriar

**Ação:** Copie `supabase/migrations/20260121_fix_finance_views.sql` (versão nova) e execute
