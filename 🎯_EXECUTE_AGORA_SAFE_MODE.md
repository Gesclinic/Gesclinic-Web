```
╔════════════════════════════════════════════════════════════════════════════════╗
║              ✅ SQL CORRIGIDO - SAFE MODE (Sem deletar dados)                 ║
╚════════════════════════════════════════════════════════════════════════════════╝

⚠️  ERRO ANTERIOR
═══════════════════════════════════════════════════════════════════════════════

   ERROR 42703: column r.origem does not exist
   └─ Causa: A view tentava usar coluna que não existia na tabela

✅ SOLUÇÃO
═══════════════════════════════════════════════════════════════════════════════

   SQL totalmente reescrito em SAFE MODE:
   ├─ Não deleta dados
   ├─ Apenas adiciona o que falta
   ├─ Trata valores NULL automaticamente
   ├─ Seguro para rexecução
   └─ Sem erros de coluna não encontrada

🚀 COMO FAZER AGORA
═══════════════════════════════════════════════════════════════════════════════

   1. Acesse: https://app.supabase.com/project/_/sql
   
   2. Clique: "New Query"
   
   3. Copie o SQL de:
      📁 supabase/migrations/20260121_fix_finance_views.sql
      (VERSÃO NOVA - depois de "FIX SAFE MODE")
   
   4. Cole no SQL Editor do Supabase
   
   5. Clique: "RUN" (ou Ctrl+Enter)
   
   6. Aguarde a mensagem:
      ✅ "Finance views and functions updated successfully (SAFE MODE)!"
   
   7. Volte para o navegador
   
   8. Pressione: F5 (recarregar)
   
   9. Acesse: http://localhost:3000/clinica/financeiro/fluxo
   
   10. ✅ Pronto! Deve funcionar agora.

════════════════════════════════════════════════════════════════════════════════

💡 DIFERENÇAS DESSA VEZ

Versão Anterior (com erro):
└─ CREATE TABLE IF NOT EXISTS ar_receivables (...)
   └─ Tentava criar tabela inteira
   └─ Se já existisse, falhava

Versão Nova (SAFE MODE):
└─ ALTER TABLE ... ADD COLUMN IF NOT EXISTS
   └─ Apenas adiciona colunas faltantes
   └─ Seguro mesmo se tabela já existe
   
└─ COALESCE(r.origem, 'Manual')
   └─ Trata NULL automaticamente
   └─ Sem erro "coluna não existe"

════════════════════════════════════════════════════════════════════════════════

📋 O QUE SERÁ EXECUTADO

✅ Adiciona coluna 'origem' em ar_receivables (se não existir)
✅ Adiciona 20+ colunas faltantes em ar_receivables
✅ Adiciona coluna 'vendor_name' em ap_bills
✅ Recria view 'view_ar_receivables_v1' (com NULL handling)
✅ Recria view 'ap_bills_with_category'
✅ Recria função 'cashflow_summary' (com error handling)
✅ Recria função 'list_ap_bills' (com error handling)
✅ Recria view 'cash_flow' (com COALESCE)

❌ NÃO deleta dados nenhum
❌ NÃO recria tabelas
❌ NÃO modifica dados existentes

════════════════════════════════════════════════════════════════════════════════

🎯 RESULTADO ESPERADO

ANTES:
❌ /clinica/financeiro/fluxo → 404
❌ Console: column r.origem does not exist
❌ Sem dados

DEPOIS:
✅ /clinica/financeiro/fluxo → Carrega a página
✅ Console: Limpo (sem erros)
✅ Dados aparecem (se houver dados no banco)

════════════════════════════════════════════════════════════════════════════════

⏱️  TEMPO TOTAL

Leitura: 2 minutos
Execução: 3 minutos
Teste: 2 minutos
═════════════════════════════════════════════════════════════════════════════════
TOTAL: ~7 minutos

════════════════════════════════════════════════════════════════════════════════

✅ PRONTO!

O arquivo foi atualizado:
📁 supabase/migrations/20260121_fix_finance_views.sql

Use-o agora no Supabase SQL Editor.
```

---

## 📌 Resumo Rápido

**Problema:** `column r.origem does not exist`

**Solução:** SQL reescrito em SAFE MODE que não deleta dados

**Ação:** Copie de `supabase/migrations/20260121_fix_finance_views.sql` e execute no Supabase

**Resultado:** Página funciona, dados intactos ✅
