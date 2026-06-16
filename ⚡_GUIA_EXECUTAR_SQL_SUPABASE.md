# 🚀 GUIA PRÁTICO: EXECUTAR SQL NO SUPABASE (5 MINUTOS)

## ✅ OPÇÃO 1: COPIAR ARQUIVO COMPILADO (RECOMENDADO)

### Passo 1: Abrir arquivo compilado
1. VS Code → File Explorer
2. Procure: `⚡_TODAS_MIGRAÇÕES_ETAPAS_1-6_COMPILADO.sql`
3. Clique para abrir
4. `Ctrl+A` para selecionar TODO o conteúdo
5. `Ctrl+C` para copiar

### Passo 2: Executar no Supabase Dashboard
1. Abrir navegador
2. Ir para: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike
3. **Fazer login** (se necessário)
4. Menu esquerdo → **SQL Editor**
5. Clicar **New Query**
6. `Ctrl+V` para colar TODO o SQL
7. Clicar **RUN** (botão verde)
8. ✅ Aguardar conclusão (deve levar 30-60 segundos)

### ✅ Resultado esperado
- Nenhum erro
- Mensagens de sucesso para cada CREATE TABLE/FUNCTION/TRIGGER/VIEW
- Status: `Done in 0.123s`

---

## ❌ OPÇÃO 2: EXECUTAR SEPARADAMENTE (Se houver erro no compilado)

Se o arquivo compilado retornar erro, execute cada ETAPA separadamente:

### ETAPA 1
1. Abrir: `supabase/migrations/20260525_ETAPA1_ENHANCED_AUTOMATIONS.sql`
2. Copiar TODO o conteúdo
3. Colar em Supabase SQL Editor
4. Clicar RUN
5. ✅ Aguardar sucesso

### ETAPA 2
1. Abrir: `supabase/migrations/20260525_ETAPA2_RECEIVABLE_MOTOR.sql`
2. Copiar TODO o conteúdo
3. Colar em Supabase SQL Editor (limpar query anterior)
4. Clicar RUN
5. ✅ Aguardar sucesso

### ETAPA 3
1. Abrir: `supabase/migrations/20260525_ETAPA3_PAYMENT_SETTLEMENT_MOTOR.sql`
2. Copiar TODO o conteúdo
3. Colar em Supabase SQL Editor (limpar query anterior)
4. Clicar RUN
5. ✅ Aguardar sucesso

### ETAPA 4
1. Abrir: `supabase/migrations/20260525_ETAPA4_MEDICAL_REPASSE_MOTOR.sql`
2. Copiar TODO o conteúdo
3. Colar em Supabase SQL Editor (limpar query anterior)
4. Clicar RUN
5. ✅ Aguardar sucesso

### ETAPA 6
1. Abrir: `supabase/migrations/20260525_ETAPA6_INTELLIGENT_RECONCILIATION.sql`
2. Copiar TODO o conteúdo
3. Colar em Supabase SQL Editor (limpar query anterior)
4. Clicar RUN
5. ✅ Aguardar sucesso

---

## ✅ VALIDAÇÃO PÓS-EXECUÇÃO

Após RUN bem-sucedido, verificar se tabelas foram criadas:

1. Supabase Dashboard
2. Menu esquerdo → **Table Editor**
3. Procurar por estas tabelas (deve existir 15 novas):
   - ✅ `financial_automation_queue`
   - ✅ `dre_metrics`
   - ✅ `financial_indicators`
   - ✅ `ar_receivable_installments`
   - ✅ `ar_payments`
   - ✅ `ar_payment_splits`
   - ✅ `payment_settlements`
   - ✅ `payment_reversals`
   - ✅ `medical_commission_models`
   - ✅ `commission_fixed_percent`
   - ✅ `commission_rate_tables`
   - ✅ `medical_commission_ledger`
   - ✅ `bank_import_transactions`
   - ✅ `bank_reconciliations`
   - ✅ `reconciliation_audit_log`

Se **todas** aparecerem → ✅ **SUCESSO!**

---

## 🔍 VERIFICAR FUNÇÕES

1. Supabase Dashboard
2. Menu esquerdo → **SQL Editor**
3. Nova query:
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'fn_%' OR routine_name LIKE 'sp_%'
ORDER BY routine_name;
```
4. Clicar RUN
5. Deve retornar 20+ functions

---

## ⚠️ TROUBLESHOOTING

### Erro: "Permission denied"
**Solução**: Fazer login como admin/owner da conta Supabase

### Erro: "Relation not found"
**Solução**: Tabelas dependentes não existem. Verificar se executou todas as 5 migrações em ordem

### Erro: "Function not found"
**Solução**: Executar SQL de novo, pode ter falhado silenciosamente

### Erro: "Trigger already exists"
**Solução**: Executar `DROP TRIGGER IF EXISTS ...` antes (já está no SQL)

---

## 🎯 PRÓXIMAS ETAPAS

Após execução bem-sucedida:

1. **Testar APIs** (npm run dev)
   - POST /api/receivables/create
   - POST /api/payments/register
   - POST /api/settlements/register

2. **Verificar Triggers** (deve auto-executar)
   - Mark appointment as "attended"
   - Verificar se AR foi criada automaticamente
   - Verificar se AP Bill foi criada (ETAPA 4)

3. **Próxima sessão**
   - ETAPA 5: DRE Dinâmica (12 horas)
   - ETAPA 7: Cockpit Premium (20 horas)

---

## 📞 PRECISA DE AJUDA?

Arquivos de referência disponíveis:
- `🎯_RESUMO_CONSOLIDADO_ETAPAS_1-6.md` - Visão geral
- `⚡_PLANO_EXECUCAO_ETAPAS_1-12_COMPLETO.md` - Roadmap completo
- Código-fonte em `src/lib/*Api.js`

---

**Tempo estimado**: 5 minutos ⏱️  
**Dificuldade**: 🟢 Muito fácil (apenas copiar e colar)  
**Status**: Pronto para começar! 🚀
