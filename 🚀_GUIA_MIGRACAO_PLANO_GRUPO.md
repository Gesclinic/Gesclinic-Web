# ⚠️ MIGRAÇÃO NECESSÁRIA - Colunas plano e grupo

## O Problema
O sistema está tentando salvar os campos `plano` e `grupo` na tabela `service_prices`, mas essas colunas ainda não existem no Supabase.

**Erro**: `Could not find the 'plano' column of 'service_prices' in the schema cache`

## A Solução
Execute o SQL fornecido no Supabase SQL Editor para criar as colunas.

## Passos:

### 1️⃣ Acesse o Supabase SQL Editor
- Vá para: https://app.supabase.com/project/gvdkdjyupktlflwurike/sql/new
- Ou no dashboard → SQL Editor → New Query

### 2️⃣ Cole este SQL:
```sql
-- Adiciona as colunas plano e grupo à tabela service_prices
ALTER TABLE service_prices
ADD COLUMN IF NOT EXISTS plano VARCHAR(255),
ADD COLUMN IF NOT EXISTS grupo VARCHAR(255);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_service_prices_plano ON service_prices(plano);
CREATE INDEX IF NOT EXISTS idx_service_prices_grupo ON service_prices(grupo);
```

### 3️⃣ Execute (Ctrl + Enter ou clique em "Run")

### 4️⃣ Verifique se foi bem-sucedido
Procure pela mensagem de sucesso no Supabase ou execute:
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'service_prices' AND column_name IN ('plano', 'grupo');
```

Se aparecer duas linhas com `plano` e `grupo`, está tudo certo! ✅

## Depois de Executar
Volte à aplicação e tente salvar novamente. Agora deve funcionar! 🎉

---
**Arquivo**: `⚠️_EXECUTE_MIGRACAO_PLANO_GRUPO.sql`
