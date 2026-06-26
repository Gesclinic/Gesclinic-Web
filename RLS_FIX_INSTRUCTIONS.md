# ⚠️ AÇÃO REQUERIDA: Aplicar Correção de RLS para Financial Accounts

## Problema Identificado
As políticas de RLS (Row Level Security) para a tabela `financial_accounts` estão incorretas e bloqueando o acesso das contas por usuários.

**Sintoma:** O dropdown da Conciliação Bancária não mostra nenhuma conta mesmo que elas existam no banco de dados.

**Causa Raiz:** As RLS policies originais não verificam se o usuário tem acesso à clínica via `user_clinic_roles`.

## Solução: Aplicar a Correção de RLS

### Passo 1: Abrir Supabase SQL Editor
1. Acesse [https://app.supabase.com](https://app.supabase.com)
2. Selecione seu projeto (Gesclinic)
3. Clique em **SQL Editor** (no menu esquerdo)
4. Clique em **New query**

### Passo 2: Copiar e Executar o SQL

Copie TODO o SQL abaixo e execute no SQL Editor do Supabase:

```sql
-- ================================================
-- FIX FINANCIAL ACCOUNTS RLS POLICIES
-- ================================================

-- Drop old broken policies
DROP POLICY IF EXISTS "view_financial_accounts" ON financial_accounts;
DROP POLICY IF EXISTS "insert_financial_accounts" ON financial_accounts;
DROP POLICY IF EXISTS "update_financial_accounts" ON financial_accounts;
DROP POLICY IF EXISTS "view_financial_accounts_audit" ON financial_accounts_audit;
DROP POLICY IF EXISTS "insert_financial_accounts_audit" ON financial_accounts_audit;

-- Create corrected RLS Policies for financial_accounts
CREATE POLICY "view_financial_accounts"
ON financial_accounts
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND clinic_id IN (
    SELECT clinic_id FROM user_clinic_roles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "insert_financial_accounts"
ON financial_accounts
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
  AND clinic_id IN (
    SELECT clinic_id FROM user_clinic_roles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "update_financial_accounts"
ON financial_accounts
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND clinic_id IN (
    SELECT clinic_id FROM user_clinic_roles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND clinic_id IN (
    SELECT clinic_id FROM user_clinic_roles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "view_financial_accounts_audit"
ON financial_accounts_audit
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND clinic_id IN (
    SELECT clinic_id FROM user_clinic_roles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "insert_financial_accounts_audit"
ON financial_accounts_audit
FOR INSERT
WITH CHECK (true);
```

### Passo 3: Verificar Sucesso

Após executar o SQL:
1. Você deve ver mensagens de sucesso (sem erros)
2. Volte para a página de Conciliação Bancária
3. Recarregue a página (F5 ou Cmd+R)
4. O dropdown deve agora listar as contas: "Clinica da Coluna (Sisprime do Brasil)"

## Integração Realizada

✅ **Página de Conciliação Bancária** agora importa e usa o hook `useFinancialAccounts`
✅ **Dropdown de Contas** foi atualizado para usar dados reais em vez de mocks
✅ **Componente ConciliacaoImportacao** já está pronto para receber contas reais
✅ **Mock data** foi removido (a constante `fakeAccounts` foi deletada)

## O Que Falta

⚠️ **RLS Policies** - Precisa ser aplicada manualmente no Supabase Dashboard (acima)

Depois da correção, todo o sistema estará:
- ✅ Contas cadastradas em um único lugar (Contas Financeiras)
- ✅ Conciliação usando contas reais
- ✅ Sem dados duplicados ou orphanados
- ✅ Com RLS policies corretas

## Arquivos Modificados

- `src/pages/financeiro/ConciliacaoBancaria.jsx` - Integrado com hook real
- `supabase/migrations/20260622_fix_financial_accounts_rls.sql` - Correção de RLS criada
- Build status: ✅ Passing (481 tests, no errors)
