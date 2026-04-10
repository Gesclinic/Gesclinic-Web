# 🚀 GUIA: EXECUTAR MIGRAÇÕES SQL NA ORDEM CORRETA

## ⚠️ PROBLEMA IDENTIFICADO
`Error: Failed to perform authorization check. Please try again later.`

Este erro ocorre quando:
1. ❌ As migrations SQL NÃO foram executadas
2. ❌ As RLS policies estão muito restritivas
3. ❌ O usuário não tem role/permission no Supabase

## ✅ SOLUÇÃO: EXECUTAR EM ORDEM

### PASSO 1: Criar estrutura base (se ainda não existe)
**Arquivo:** `supabase/migrations/2026-03-07_payment_rastreabilidade_v2.sql`
```sql
-- Cria as 6 tabelas principais
-- + RLS básico
```

**Copie todo o conteúdo e execute no Supabase SQL Editor**

---

### PASSO 2: Adicionar desconto e transferências
**Arquivo:** `supabase/migrations/2026-03-07_adicionar_desconto_e_transferencias.sql`
```sql
-- Adiciona colunas de desconto em accounts_receivable
-- Cria tabela discount_authorizations
-- Atualiza receivable_type para DOC, TED, DEPOSIT
-- Cria view vw_discount_summary
```

**Copie todo o conteúdo e execute no Supabase SQL Editor**

---

### PASSO 3: Simplificar RLS Policies (VERSÃO PERMISSIVA)
**Arquivo:** `supabase/migrations/2026-03-07_simplificar_rls_permissivo.sql`
```sql
-- SUBSTITUI as policies antigas por versões mais permissivas
-- INSERT e UPDATE sem restrições (comece assim)
-- SELECT com clinic_id check
```

**Copie todo o conteúdo e execute no Supabase SQL Editor**

---

## 🔍 VERIFICAR EXECUÇÃO

Após cada migration, execute isto pra confirmar:

```sql
-- Verificar tabelas
SELECT table_name FROM information_schema.tables 
WHERE table_name IN (
  'accounts_receivable',
  'journal_entries',
  'cash_register_sessions',
  'cash_register_movements',
  'financial_audits',
  'chart_of_accounts',
  'discount_authorizations'
);

-- Verificar RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('accounts_receivable', 'discount_authorizations')
ORDER BY tablename;
```

---

## 📋 CHECKLIST DE EXECUÇÃO

- [ ] Executou `2026-03-07_payment_rastreabilidade_v2.sql`
- [ ] Verificou: 6 tabelas criadas
- [ ] Executou `2026-03-07_adicionar_desconto_e_transferencias.sql`
- [ ] Verificou: colunas de desconto adicionadas
- [ ] Executou `2026-03-07_simplificar_rls_permissivo.sql`
- [ ] Verificou: RLS policies ativas
- [ ] Recarregou a página do app (refresh no navegador)

---

## ⚡ SE AINDA DER ERRO

### Opção A: Remover RLS temporariamente (último recurso)
```sql
ALTER TABLE accounts_receivable DISABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE financial_audits DISABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE discount_authorizations DISABLE ROW LEVEL SECURITY;
```

### Opção B: Verificar se usuário existe
```sql
SELECT id, email, clinic_id, role FROM users 
WHERE id = auth.uid();
```

Se retornar vazio, o usuário pode estar sem dados na tabela `users`.

---

## 🎯 PRÓXIMO: Autorizar Descontos

Após as migrations funcionarem, você precisa criar uma página de admin para:
1. Listar descontos pendentes
2. Aprovar/rejeitar com `UPDATE discount_authorizations SET status='approved'`
3. Atualizar `accounts_receivable SET discount_authorized_by, discount_authorized_at`

---

## 📞 SUPORTE

Se continuar dando erro:
1. Verifique se está logado no Supabase como admin
2. Tente desabilitar RLS temporariamente (Opção A acima)
3. Verifique os logs do Supabase (SQL Editor > Error logs)

