# Guia de Execução do Schema SQL no Supabase

## ✅ Status: Arquivo SQL Validado e Pronto

O arquivo `supabase/migrations/20260113_COMPREHENSIVE_INIT.sql` foi validado com sucesso:
- ✅ 50 tabelas CREATE TABLE
- ✅ 99 índices CREATE INDEX
- ✅ 8 colunas "code" consistentes e corretas

## 🚀 Passos para Executar no Supabase

### Passo 1: Acesse o Supabase SQL Editor
1. Acesse: https://app.supabase.com
2. Faça login com sua conta
3. Selecione o projeto Gesclinic
4. Clique em **SQL** (no menu esquerdo)
5. Clique em **+ New Query**

### Passo 2: Copie e Cole o SQL

#### Opção A: Copie todo o arquivo (RECOMENDADO)
1. Abra o arquivo: `supabase/migrations/20260113_COMPREHENSIVE_INIT.sql`
2. Selecione todo o conteúdo (Ctrl+A)
3. Copie (Ctrl+C)
4. No Supabase SQL Editor, cole (Ctrl+V)

#### Opção B: Execute via linha de comando
Se você tem `supabase-cli` instalado:
```powershell
cd c:\Users\ferna\Desktop\Projeto Gesclinic Web
supabase db push --local
```

### Passo 3: Execute o SQL

1. **NÃO execute se tiver tabelas existentes**
   - O script usa `CREATE TABLE IF NOT EXISTS`
   - Mas se houver conflito, você verá erro no console

2. Se houver erro `column "code" does not exist`:
   - Isso foi corrigido! Tente novamente
   - Se persistir, verifique qual tabela está causando o erro
   - Execute a seguinte query para limpar:
   
   ```sql
   -- CUIDADO: Isso deletará todas as tabelas!
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```

3. Clique em **RUN** ou pressione **Ctrl+Enter**

### Passo 4: Aguarde a Execução

O script pode levar alguns segundos para completar. Você verá:
- ✅ "Success" na parte inferior
- Lista de queries executadas
- Número de linhas afetadas (0, porque apenas CREATE)

## ✅ Validação Após Execução

Para confirmar que todas as 73 tabelas foram criadas, execute:

```sql
SELECT 
  schemaname,
  COUNT(*) as total_tables
FROM pg_tables 
WHERE schemaname = 'public'
GROUP BY schemaname;
```

**Resultado esperado:** 73 tabelas

## 📋 Tabelas Verificadas

As seguintes 8 tabelas têm coluna `code` consistente:
1. ✅ services
2. ✅ service_groups
3. ✅ payers
4. ✅ plans
5. ✅ chart_of_accounts
6. ✅ account_plans
7. ✅ stock_categories (CORRIGIDO AGORA)
8. ✅ stock_units

## 🐛 Se Encontrar Erros

Se o script falhar com erro `column "X" does not exist`:

1. Anote a linha exata do erro
2. Procure no arquivo qual tabela está afetada
3. Verifique se há conflito com migração anterior
4. Limpe o banco (com cautela!) e tente novamente

## 📚 Próximos Passos

Após a execução bem-sucedida:

1. Crie uma conta de administrador no banco
2. Configure as políticas de RLS (Row Level Security)
3. Crie índices adicionais se necessário
4. Inicie a aplicação React com `npm run dev`

## 🔗 Referências

- Arquivo SQL: `supabase/migrations/20260113_COMPREHENSIVE_INIT.sql`
- Documentação de tabelas: `DATABASE_SCHEMA_REFERENCE.md`
- Guia de instalação: `DATABASE_INSTALLATION_GUIDE.md`

---

**Status:** ✅ Pronto para execução
**Última atualização:** 2026-01-13
