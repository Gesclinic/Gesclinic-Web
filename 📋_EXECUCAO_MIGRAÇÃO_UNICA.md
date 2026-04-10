# ⚡ EXECUÇÃO RÁPIDA - MIGRAÇÃO ÚNICA

## Passo 1: Copiar o SQL

Abra o arquivo:
```
supabase/migrations/2026-03-07_payment_system_complete.sql
```

Copie **TODO** o conteúdo.

## Passo 2: Executar no Supabase

1. Vá para [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Navegue para **SQL Editor**
4. Clique em **New Query**
5. **Cole todo o SQL** copiado
6. Clique em **▶️ Run**

## Passo 3: Verificar Resultado

Após executar, você deve ver no final:

```
table_name
-------
accounts_receivable
cash_register_movements
cash_register_sessions
chart_of_accounts
discount_authorizations
financial_audits
journal_entries
(7 rows)
```

Se vir **exatamente 7 linhas** = ✅ Sucesso!

## Se Encontrar Erro

Se receber erro, copie a mensagem de erro aqui. Você deve ver uma das opções:

✅ **"7 rows"** → Sistema completo criado
❌ **"relation already exists"** → Tabelas já existem (tudo Ok)
❌ **"Failed to perform authorization check"** → Ainda há problema de RLS
❌ **Outro erro** → Precisa investigar

Qual foi o resultado?
