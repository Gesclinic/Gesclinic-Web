# 🔧 Execução de Migração para Convênios

## SQL para Executar

Copie e execute este SQL no Supabase Dashboard:

```sql
-- Adicionar campos de configuração aos convênios
ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS minimum_margin_percentage DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS special_rules TEXT;
```

## Passos para Executar

1. Abra o Supabase Dashboard: https://supabase.com/dashboard
2. Selecione o projeto: **gvdkdjyupktlflwurike**
3. Vá para **SQL Editor**
4. Clique em **+ New Query**
5. Cole o SQL acima
6. Clique em **Run**

## O que isso faz

- Adiciona o campo `discount_percentage` para armazenar desconto em porcentagem
- Adiciona o campo `minimum_margin_percentage` para margem mínima
- Adiciona o campo `special_rules` para regras especiais do convênio

## Após Executar

Recarregue a página do navegador e tente criar um novo convênio novamente.

---

**Status**: Aguardando execução da migração
