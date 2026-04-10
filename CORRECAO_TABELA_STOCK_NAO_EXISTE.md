# 🔧 Correção: Tabela "stock" não existe

## Problema
```
Error: Failed to run sql query: ERROR: 42P01: relation "stock" does not exist
```

## Causa
Os arquivos de migração SQL continham referências a uma tabela `stock` que **nunca foi criada**:

1. **DISABLE_RLS_FOR_TESTING.sql** - Tentava fazer `ALTER TABLE stock DISABLE ROW LEVEL SECURITY`
2. **20260118_rls_policies.sql** - Políticas RLS referenciavam um `stock.id` inexistente nas tabelas stock_items

## Análise da Estrutura de Estoque
A estrutura de estoque real usa várias tabelas especializadas:

✅ **Tabelas Criadas:**
- `stock_items` - Produtos do estoque
- `stock_categories` - Categorias de produtos
- `stock_movements` - Movimentações (entrada/saída/ajustes)
- `stock_suppliers` - Fornecedores
- `stock_units` - Unidades de medida (un, kg, L, etc)
- `stock_locations` - Locais de armazenamento
- `stock_requests` - Requisições de estoque
- `stock_request_items` - Itens das requisições

❌ **Não Existe (e não precisa):**
- `stock` - Tabela genérica obsoleta

## Arquivos Corrigidos

### 1. DISABLE_RLS_FOR_TESTING.sql
**Antes:**
```sql
ALTER TABLE stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items DISABLE ROW LEVEL SECURITY;
```

**Depois:**
```sql
ALTER TABLE stock_items DISABLE ROW LEVEL SECURITY;
```

### 2. supabase/migrations/20260118_rls_policies.sql
**Antes** (Stock Items Policies):
```sql
CREATE POLICY "stock_items_select"
  ON stock_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stock 
      WHERE stock.id = stock_items.stock_id    -- ❌ Campo não existe!
      AND stock.clinic_id IN (...)
    )
  );
```

**Depois**:
```sql
CREATE POLICY "stock_items_select"
  ON stock_items FOR SELECT
  USING (
    clinic_id IN (                              -- ✅ Usa clinic_id direto
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );
```

## Impacto
- Remover referências à tabela `stock` que nunca foi criada
- RLS policies agora verificam `clinic_id` diretamente em `stock_items`
- Compatível com a estrutura real de estoque no banco

## Próximas Etapas
1. Executar as migrações corrigidas no Supabase
2. Verificar se há outras referências à tabela `stock` no código
3. Todos os módulos de estoque devem usar `stock_items` e suas tabelas relacionadas

