# 🔧 FIX: Restaurar função list_stock_items_with_balance

## Problema
A função RPC `list_stock_items_with_balance` não foi encontrada no Supabase, causando erro ao listar produtos.

## ✅ Solução

### Passo 1: Arquivo de Migration Ativado
✅ O arquivo de migration foi ativado em:
```
supabase/migrations/2026-01-07_create_stock_balance_function.sql
```

### Passo 2: Aplicar no Supabase

**OPÇÃO A: Via Supabase Dashboard (Recomendado)**

1. Abra: https://app.supabase.com
2. Selecione seu projeto
3. Clique em **SQL Editor** (lado esquerdo)
4. Clique em **+ New Query**
5. Copie TODO o conteúdo de:
   `supabase/migrations/2026-01-07_create_stock_balance_function.sql`
6. Cole no editor
7. Clique em **Run** (botão azul no canto direito)
8. Aguarde a execução (deve levar segundos)

---

## Conteúdo do SQL (resumo)

O arquivo contém:

1. **Criação de colunas faltantes** em `stock_items`:
   - `unit_symbol` (unidade de medida)
   - `is_active` (ativo/inativo)
   - `description` (descrição)
   - `min_stock` (estoque mínimo)
   - `max_stock` (estoque máximo)
   - `unit_id` (ID da unidade)

2. **Função RPC** `list_stock_items_with_balance()`:
   - Calcula saldo de estoque automaticamente
   - Retorna nome da categoria
   - Retorna todas as colunas necessárias
   - Filtra por clínica

3. **Função auxiliar** `get_item_balance_by_location()`:
   - Calcula saldo por localização

4. **View** `v_stock_balances`:
   - Facilita consultas de saldo

5. **Permissões**: Usuários autenticados podem usar as funções

---

## ✨ Resultado Esperado

Após executar:

1. A página de **Produtos** carregará sem erros
2. Os produtos serão listados com saldos calculados
3. Não há exclusão de dados - apenas criação de estrutura

---

## 🆘 Se houver erro

Se receber erro tipo `Already exists` ou similar, é porque:
- A estrutura já existe parcialmente
- O `DROP FUNCTION IF EXISTS` cuidará disso

Se mesmo assim tiver problema, execute em ordem:

```sql
DROP FUNCTION IF EXISTS list_stock_items_with_balance(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_item_balance_by_location(UUID, UUID, UUID) CASCADE;
DROP VIEW IF EXISTS v_stock_balances;
```

Depois execute o arquivo novamente.

---

## ✅ Verificação

Após aplicar, abra a página de **Produtos** (Estoque > Produtos) e:
- Não deve haver erros no console
- Deve listar produtos se existirem
- O saldo deve aparecer corretamente

---

**Data**: 17 de Janeiro de 2026
**Status**: ✅ Pronto para aplicação
