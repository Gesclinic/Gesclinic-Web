# Validação do Schema SQL

## Status das Correções

✅ **Tabelas com coluna `code` adicionada:**
- `services` (line 146) - code VARCHAR(50) + idx_services_code
- `service_groups` (line 167) - code VARCHAR(50) + idx_service_groups_code
- `payers` (line 225) - code VARCHAR(50) + idx_payers_code
- `plans` (line 246) - code VARCHAR(50)
- `chart_of_accounts` (line 305) - code VARCHAR(50) + idx_chart_of_accounts_code
- `account_plans` (line 324) - code VARCHAR(50)
- `stock_categories` (line 625) - code VARCHAR(50) + idx_stock_categories_code ✓ **ADICIONADO**
- `stock_units` (line 708) - code VARCHAR(50) + idx_stock_units_code

## Próximos Passos

1. **Copie todo o conteúdo do arquivo** `supabase/migrations/20260113_COMPREHENSIVE_INIT.sql`
2. **Cole no Supabase SQL Editor** em https://app.supabase.com/project/[seu-projeto]/sql/new
3. **Execute o script completo**

## O que Fazer se o Erro Persistir

Se continuar recebendo erro `column "code" does not exist`:

1. Procure pela linha específica do erro no console do Supabase
2. Verifique se há conflito com outras migrações já aplicadas
3. Considere executar uma limpeza primeiro:
   - Abra o Supabase SQL Editor
   - Execute: `SELECT tablename FROM pg_tables WHERE schemaname = 'public';`
   - Verifique quais tabelas já existem
   - Se necessário, faça DROP das tabelas conflitantes antes de executar o novo script

## Alternativa: Aplicar Mudanças Incrementais

Se preferir ser mais seguro, você pode:

1. Executar apenas a seção de `CREATE TABLE` sem os INDEXs primeiro
2. Depois executar os INDEXs e FORKs/CONSTRAINTs

Isso pode ajudar a identificar qual exatamente está causando o erro.

## Verificação Final

Após executar o script com sucesso, execute esta query para confirmar todas as 73 tabelas foram criadas:

```sql
SELECT COUNT(*) as total_tables 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
```

Esperado: **73 tabelas**
