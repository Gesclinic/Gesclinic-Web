# 🔧 CORREÇÃO: Saída de Estoque Não Baixa Produto

## Problema Identificado
As saídas de estoque estão sendo registradas na tabela `stock_movements`, mas o saldo do produto não está sendo atualizado na listagem de produtos.

## Causa Raiz
A função RPC `list_stock_items_with_balance` que calcula o saldo total dos produtos:
- ❌ Não existe no banco de dados Supabase
- ❌ Ou existe mas não está calculando corretamente (somando entradas e subtraindo saídas)

## Solução Implementada

### 1. Função para Calcular Saldo Total
Criada função `list_stock_items_with_balance` que:
- ✅ Soma todas as ENTRADAS (`type = 'entry'`)
- ✅ Subtrai todas as SAÍDAS (`type = 'exit'`)
- ✅ Considera AJUSTES (`type = 'adjustment'`)
- ✅ Retorna saldo consolidado por produto

### 2. Função para Saldo por Localização
Criada função `get_item_balance_by_location` que:
- ✅ Calcula saldo específico por local de armazenamento
- ✅ Utilizada para validar disponibilidade antes de saídas

### 3. View de Saldos
Criada view `v_stock_balances` que:
- ✅ Mostra saldo consolidado por produto + localização
- ✅ Facilita consultas e relatórios

## 📋 Como Aplicar

### Opção 1: Via Supabase Dashboard (RECOMENDADO)

1. Acesse seu projeto no Supabase: https://app.supabase.com
2. Vá em **SQL Editor** (menu lateral esquerdo)
3. Clique em **+ New Query**
4. Copie todo o conteúdo do arquivo:
   ```
   supabase/migrations/2026-01-07_create_stock_balance_function.sql
   ```
5. Cole no editor SQL
6. Clique em **RUN** (ou pressione Ctrl+Enter)
7. Aguarde a mensagem de sucesso ✅

### Opção 2: Via CLI do Supabase (se tiver instalado)

```bash
supabase db push
```

### Opção 3: Via Cliente PostgreSQL (pgAdmin, DBeaver, etc)

1. Conecte-se ao banco Supabase
2. Execute o arquivo `2026-01-07_create_stock_balance_function.sql`

## ✅ Como Verificar se Funcionou

1. **Recarregue a página de Produtos** (F5)
2. Verifique o saldo da "Caneta":
   - ❌ Antes: 300 unidades (errado)
   - ✅ Depois: 200 unidades (300 - 100 = 200)

## 🧪 Teste Completo

1. Acesse **Estoque → Produtos**
   - Saldo da Caneta deve estar: **200 unidades**

2. Registre uma nova saída:
   - Acesse **Estoque → Saídas → Nova Saída**
   - Produto: Caneta
   - Quantidade: 50
   - Salve

3. Volte em **Estoque → Produtos**
   - Saldo da Caneta deve estar: **150 unidades** (200 - 50)

## 📊 Estrutura da Solução

```sql
-- Cálculo do saldo:
SUM(
  CASE 
    WHEN type = 'entry' THEN qty      -- Soma entradas
    WHEN type = 'exit' THEN -qty      -- Subtrai saídas
    WHEN type = 'adjustment' THEN qty -- Soma ajustes
    ELSE 0
  END
)
```

## 🚨 Importante

- Esta correção **NÃO apaga dados** existentes
- Apenas **cria/atualiza funções** de cálculo
- As movimentações antigas serão **recalculadas automaticamente**
- Não há necessidade de re-inserir saídas já registradas

## 📝 Arquivos Criados

- `supabase/migrations/2026-01-07_create_stock_balance_function.sql` - Migration principal
- `scripts/apply_stock_balance_migration.ps1` - Helper para aplicação

---

**Status:** ✅ Correção implementada - Aguardando aplicação no banco Supabase
