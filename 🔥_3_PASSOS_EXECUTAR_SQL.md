# 🚀 EXECUTAR SQL ETAPAS 1-6 EM 3 PASSOS

## Passo 1: Preparar o Arquivo SQL (30 segundos)

1. No VS Code, abra o arquivo:
   - `⚡_TODAS_MIGRAÇÕES_ETAPAS_1-6_COMPILADO.sql`

2. Selecione todo o conteúdo:
   - `Ctrl + A`

3. Copie:
   - `Ctrl + C`

## Passo 2: Colar no Supabase Dashboard (30 segundos)

1. Abra o Supabase Dashboard no navegador:
   - https://supabase.com/dashboard/project/gvdkdjyupktlflwurike

2. Vá para **SQL Editor** (menu esquerdo)

3. Clique em **"New Query"** (canto superior esquerdo)

4. Na área de edição SQL (caixa branca/cinza), clique para focar

5. Cole o SQL:
   - `Ctrl + V`

6. Aguarde ~2-3 segundos para o editor processar

## Passo 3: Executar e Confirmar (1 minuto)

1. Clique no botão **"RUN"** (verde, canto superior direito)

2. Aguarde 30-60 segundos para execução

3. Veja o resultado:
   - ✅ **Sucesso**: Nenhuma mensagem de erro vermelha
   - ❌ **Erro**: Mensagem vermelha com detalhe do erro

## ✅ Validação Final (Confirmar que funcionou)

Após clicar em RUN, verifique:

### 1️⃣ Verificar Tabelas Criadas

Na mesma janela SQL Editor, cole e execute:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Você deve ver as 15 tabelas:**
- ✅ financial_automation_queue
- ✅ dre_metrics
- ✅ financial_indicators
- ✅ ar_receivable_installments
- ✅ ar_payments
- ✅ ar_payment_splits
- ✅ payment_settlements
- ✅ payment_reversals
- ✅ medical_commission_models
- ✅ commission_fixed_percent
- ✅ commission_rate_tables
- ✅ medical_commission_ledger
- ✅ bank_import_transactions
- ✅ bank_reconciliations
- ✅ reconciliation_audit_log

### 2️⃣ Verificar Funções Criadas

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND (routine_name LIKE 'fn_%' OR routine_name LIKE 'sp_%')
ORDER BY routine_name;
```

**Você deve ver 20+ funções**

### 3️⃣ Verificar Triggers

Vá para **Table Editor** → **Selecione qualquer tabela** → **Triggers**

**Você deve ver 7+ triggers** com nomes como:
- trg_create_ar_with_automations
- trg_update_installment_status
- trg_update_receivable_after_payment
- ... etc

## 🎯 Se der erro:

Se receber um erro SQL, verifique:

1. ❌ **Erro de sintaxe**: Arquivo SQL pode estar corrompido
   - Solução: Copie um arquivo SQL individual (ex: ETAPA1, ETAPA2)

2. ❌ **"permission denied"**: Falta de permissão
   - Solução: Verifique se está logado na conta certa no Supabase

3. ❌ **"table already exists"**: Tabelas já foram criadas antes
   - Solução: Tudo certo! Você pode ignorar este erro

4. ❌ **Editor não responde**: Monaco editor travado
   - Solução: Feche e reabra a aba do navegador

## 📝 Próximos Passos

Após confirmar que as 15 tabelas foram criadas:

1. Volte ao VS Code
2. Execute: `npm run dev`
3. Abra: http://localhost:3000
4. Teste as APIs (veja arquivo: `✅_TESTE_APIS_RAPIDO.md`)

## ⏱️ Tempo Total: ~5 minutos

- Passo 1: 30 segundos
- Passo 2: 30 segundos  
- Passo 3: 1 minuto
- Validação: 3 minutos
- **Total: ~5 minutos**

---

**Dúvidas?** Verifique a documentação completa:
- `⚡_GUIA_EXECUTAR_SQL_SUPABASE.md` - Guia detalhado com screenshots
- `✅_CHECKLIST_EXECUCAO_SQL.md` - Checklist passo a passo
