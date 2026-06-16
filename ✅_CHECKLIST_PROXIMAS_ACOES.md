# ✅ CHECKLIST - PRÓXIMAS AÇÕES

## 🎯 Objetivo: Executar SQL ETAPAS 1-6 em Produção

---

## FASE 1: PREPARAÇÃO (2 minutos)

- [ ] Abrir VS Code
- [ ] Terminal → `cd c:\dev\gesclinic-web`
- [ ] Verificar arquivo SQL existe:
  ```bash
  ls -la ⚡_TODAS_MIGRAÇÕES_ETAPAS_1-6_COMPILADO.sql
  ```
  ✅ Esperado: 1830 linhas

- [ ] Copiar SQL para clipboard:
  ```bash
  Get-Content '⚡_TODAS_MIGRAÇÕES_ETAPAS_1-6_COMPILADO.sql' -Raw | clip
  ```
  ✅ Esperado: "✅ SQL copiada"

---

## FASE 2: EXECUÇÃO NO SUPABASE (5 minutos)

- [ ] Abrir navegador
- [ ] Ir para: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike

- [ ] Navegação:
  - [ ] Menu esquerdo → **SQL Editor**
  - [ ] Botão superior → **New Query**
  
- [ ] No editor:
  - [ ] Clicar na área de edição (texto branco)
  - [ ] `Ctrl + V` (colar)
  - [ ] Aguardar 2-3 segundos para editor processar
  - [ ] Clique no botão **RUN** (verde, canto superior direito)

- [ ] Durante execução:
  - [ ] Botões ficarão disabled
  - [ ] Aguardar 30-60 segundos

---

## FASE 3: VALIDAÇÃO (3 minutos)

- [ ] Verificar resultado na tela:
  - [ ] ✅ **Sem mensagens de erro** (mensagens vermelhas = problema)
  - [ ] ✅ Output mostra "success" ou similar

- [ ] Se deu erro:
  - [ ] Anote a mensagem de erro exata
  - [ ] Copie o número da linha (ex: LINE 1693)
  - [ ] Mensagem deve dizer o que está errado

---

## FASE 4: VALIDAÇÃO DE TABELAS (3 minutos)

### 4A: Contar Tabelas no Supabase Dashboard

No mesmo SQL Editor, cole:

```sql
SELECT COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public';
```

- [ ] Clique RUN
- [ ] ✅ Esperado: **15**

### 4B: Verificar Tabelas Específicas

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

- [ ] Clique RUN
- [ ] ✅ Deve mostrar estas 15 tabelas:
  - [ ] ar_payment_splits
  - [ ] ar_payments
  - [ ] ar_receivable_installments
  - [ ] bank_import_transactions
  - [ ] bank_reconciliations
  - [ ] commission_fixed_percent
  - [ ] commission_rate_tables
  - [ ] dre_metrics
  - [ ] financial_automation_queue
  - [ ] financial_indicators
  - [ ] medical_commission_ledger
  - [ ] medical_commission_models
  - [ ] payment_reversals
  - [ ] payment_settlements
  - [ ] reconciliation_audit_log

### 4C: Verificar Funções

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND (routine_name LIKE 'fn_%' OR routine_name LIKE 'sp_%')
ORDER BY routine_name;
```

- [ ] Clique RUN
- [ ] ✅ Esperado: 20+ funções (lista deve ser grande)

### 4D: Verificar Triggers

No **Table Editor** (menu esquerdo):
- [ ] Selecione qualquer tabela (ex: `ar_payments`)
- [ ] Clique na aba **Triggers**
- [ ] ✅ Deve mostrar triggers com nomes como:
  - [ ] trg_auto_create_ap_bill_for_appointment
  - [ ] trg_create_ar_with_automations
  - [ ] trg_update_installment_status
  - [ ] Etc.

---

## FASE 5: VALIDAÇÃO COM SCRIPT (2 minutos)

No terminal VS Code:

```bash
node scripts/validateSQLExecution.cjs
```

### Resultado esperado:
```
✅ Tabelas encontradas: 15/15

🎉 SUCESSO! Todas as migrações foram executadas!

Próximos passos:
  1. npm run dev
  2. Abrir http://localhost:3000
  3. Testar as APIs financeiras
```

---

## FASE 6: PÓS-EXECUÇÃO (Próxima sessão)

- [ ] Iniciar servidor:
  ```bash
  npm run dev
  ```
  ✅ Esperado: "Local: http://localhost:3000"

- [ ] Abrir navegador:
  ```
  http://localhost:3000
  ```

- [ ] Validar que app carrega sem erros

- [ ] (Opcional) Rodar testes:
  ```bash
  npm test
  ```

---

## 🔴 SE DER ERRO...

### Erro: "Syntax error at or near..."

**Solução:**
1. Verifique qual linha tem erro (ex: LINE 1693)
2. Arquivo SQL pode estar corrompido
3. Tente executar migrações ETAPA por ETAPA:
   ```
   supabase/migrations/20260525_ETAPA1_ENHANCED_AUTOMATIONS.sql
   supabase/migrations/20260525_ETAPA2_RECEIVABLE_MOTOR.sql
   Etc...
   ```

### Erro: "Permission denied"

**Solução:**
1. Verifique credenciais Supabase no `.env`
2. Confirme que está com a conta certa logada
3. Tente fazer logout e relogin no Supabase Dashboard

### Erro: "Table already exists"

**OK!** Significa que:
- Tabelas já foram criadas (de uma tentativa anterior)
- Você pode ignorar este erro
- Próxima execução usará tabelas existentes

### Monaco Editor não responde

**Solução:**
1. Feche a aba do navegador
2. Reabra: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike
3. Tente de novo

---

## 📋 ARQUIVOS ESSENCIAIS

| Arquivo | Uso |
|---------|-----|
| `⚡_TODAS_MIGRAÇÕES_ETAPAS_1-6_COMPILADO.sql` | Colar no Supabase |
| `🔥_3_PASSOS_EXECUTAR_SQL.md` | Guia rápido (referência) |
| `scripts/validateSQLExecution.cjs` | Validação automática |
| `scripts/runSqlMigrations.cjs` | Instruções interativas |

---

## ⏱️ CRONOMETRO

```
Fase 1 (Prep): 2 min  ██
Fase 2 (SQL):  5 min  █████
Fase 3 (Val):  3 min  ███
Fase 4 (Tabelas): 3 min ███
Fase 5 (Script): 2 min  ██
─────────────────────────
TOTAL:        15 min total (se tudo OK)
```

---

## ✨ MARCADORES DE SUCESSO

Se você vir TODOS estes, está 100% OK:

1. ✅ 15 tabelas criadas (SELECT COUNT query)
2. ✅ 20+ funções criadas (routine_name query)
3. ✅ 7+ triggers visíveis (Table Editor → Triggers)
4. ✅ `npm run dev` funciona sem erros SQL
5. ✅ http://localhost:3000 carrega normalmente

---

## 🎯 PRÓXIMO PASSO APÓS SUCESSO

**ETAPA 5 - DRE Dinâmica**
- Duração: 12 horas
- Começa quando: SQL executar com sucesso
- Objetivo: Dashboard financeiro dinâmico com plano_contas

---

## 📞 REFERENCIAS RÁPIDAS

**Supabase URL:**
```
https://supabase.com/dashboard/project/gvdkdjyupktlflwurike
```

**SQL Editor:**
```
Menu esquerdo → SQL Editor → New Query
```

**Terminal Validação:**
```bash
node scripts/validateSQLExecution.cjs
```

**Servidor Desenvolvimento:**
```bash
npm run dev
```

---

**Última atualização**: 25 Maio 2026  
**Status**: ✅ Pronto para Execução  
**Tempo estimado**: ~15 minutos
