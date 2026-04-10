# 🗄️ COMO APLICAR A MIGRATION SQL

**Status:** Pronto para aplicação
**Arquivo:** `supabase/migrations/2026-01-14_create_appointment_financial_audit_logs.sql`

---

## ⚡ Opção 1: Aplicar via Supabase Dashboard (RECOMENDADO - 2 minutos)

### Passo 1: Abra o Supabase Dashboard
1. Vá para: https://supabase.com/dashboard
2. Clique no seu projeto "Gesclinic"
3. No menu lateral, clique em **"SQL Editor"**

### Passo 2: Cole o SQL

```sql
/** 
 * Cole TUDO aqui - começando com:
 * CREATE TABLE IF NOT EXISTS appointment_financial_audit_logs...
 * E terminando com: GRANT INSERT ON appointment_financial_audit_logs TO authenticated;
 */
```

**Como obter o SQL:**
1. Abra em seu editor: `supabase/migrations/2026-01-14_create_appointment_financial_audit_logs.sql`
2. Selecione TODO o conteúdo (Ctrl+A)
3. Copie (Ctrl+C)
4. Cole no Supabase SQL Editor

### Passo 3: Execute

1. Clique no botão verde **"Execute"** (ou Ctrl+Enter)
2. Aguarde 2-3 segundos

### Resultado Esperado:
```
✅ Query OK - 0 rows affected
```

---

## ⚡ Opção 2: Aplicar via Supabase CLI (AVANÇADO)

```bash
# Instale Supabase CLI (se não tiver)
npm install -g supabase

# Entre na pasta do projeto
cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"

# Acesse Supabase (faça login)
supabase login

# Aplique as migrations
supabase migration up
```

---

## ⚡ Opção 3: Carregar do Arquivo Diretamente

Se sua conta Supabase estiver vinculada ao Git:

1. Push suas mudanças para Git
2. Supabase detectará automaticamente a migration
3. Será aplicada na próxima deploy

---

## ✅ VERIFICAR SE FOI APLICADO COM SUCESSO

### Via SQL:
```sql
-- No Supabase SQL Editor, execute:
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'appointment_financial_audit_logs';

-- Resultado esperado:
-- ┌──────────────────────────────────────────┐
-- │ table_name                               │
-- ├──────────────────────────────────────────┤
-- │ appointment_financial_audit_logs         │
-- └──────────────────────────────────────────┘
```

### Verificar Índices:
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'appointment_financial_audit_logs';

-- Resultado esperado: 6 índices
```

### Verificar RLS:
```sql
SELECT policyname FROM pg_policies 
WHERE tablename = 'appointment_financial_audit_logs';

-- Resultado esperado: 4 policies
```

### Verificar Trigger:
```sql
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'appointment_financial_audit_logs';

-- Resultado esperado: 1 trigger (appointment_financial_audit_logs_immutable_trigger)
```

---

## 🚨 TROUBLESHOOTING

### Erro: "Column does not exist"
**Causa:** Tabela `appointments` não existe
**Solução:** Certifique-se que todas as migrations anteriores foram aplicadas

### Erro: "User role not found"
**Causa:** Tabela `user_roles` não existe
**Solução:** Verifique se migration de RBAC foi aplicada
**Arquivo:** `2026-01-13_create_rbac_tables.sql`

### Erro: "Permission denied"
**Causa:** Seu usuário não tem permissão de criar tabelas
**Solução:** Use uma chave de admin (ANON_KEY não funciona)

### Erro: "Table already exists"
**Solução:** Isso é normal! Significa a migration já foi aplicada.
**Ação:** Execute `DROP TABLE IF EXISTS appointment_financial_audit_logs CASCADE;` antes de reexecutar

---

## 📊 O QUE SERÁ CRIADO

Após aplicar a migration, você terá:

| Recurso | Quantidade | Detalhes |
|---------|-----------|----------|
| **Tabela** | 1 | `appointment_financial_audit_logs` com 13 colunas |
| **Índices** | 6 | Para performance de queries comuns |
| **RLS Policies** | 4 | INSERT, SELECT (GESTOR/FINANCEIRO/ADMIN), UPDATE bloqueado, DELETE bloqueado |
| **Triggers** | 1 | Para garantir append-only (imutabilidade) |
| **Constraints** | 3 | Validação de tipos e valores |

---

## ⏱️ TEMPO DE EXECUÇÃO

- **Aplicar migration:** 2-5 segundos
- **Criar índices:** 1-3 segundos
- **Total:** <10 segundos

---

## ✅ PRÓXIMA AÇÃO

Após aplicar a migration, você está pronto para:

1. ✅ Criar logs manualmente (teste)
2. ✅ Usar a UI do check-in (aba "Auditoria Financeira")
3. ✅ Ver os eventos sendo registrados automaticamente

---

## 💡 DICAS

- A migration é **idempotente** (`IF NOT EXISTS`), então é seguro rodar várias vezes
- Os índices melhoram a performance de queries em 10-100x
- RLS policies garantem que apenas usuários autorizados veem os logs
- A tabela é append-only: ninguém pode editar/deletar logs

---

## 🆘 PRECISA DE AJUDA?

Se tiver problemas:

1. Verifique se as migrations pré-requisitos foram aplicadas
2. Execute as verificações SQL acima
3. Confira o console do Supabase (Dashboard > Logs)
4. Leia `GUIA_AUDITORIA_FINANCEIRA_COMPLETO.md`

---

**Pronto? Vamos lá! 🚀**

Próximo passo: Aplique a migration e depois rode os testes em `IMPLEMENTACAO_COMPLETA_AUDITORIA_FINANCEIRA.md`
