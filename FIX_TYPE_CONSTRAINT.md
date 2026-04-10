# ✅ SQL para Corrigir Constraint de Type

Execute este SQL no Supabase Dashboard:

```sql
-- Corrigir constraint no campo type da tabela health_insurances
-- Remover constraint incorreta e adicionar a correta

-- Primeiro, remover a constraint incorreta se existir
ALTER TABLE health_insurances 
DROP CONSTRAINT IF EXISTS health_insurances_type_check;

-- Adicionar o constraint correto
ALTER TABLE health_insurances
ADD CONSTRAINT health_insurances_type_check 
CHECK (type IS NULL OR type IN ('private_insurance', 'health_plan', 'government', 'direct_pay', 'other'));
```

## Passos:

1. Abra: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new
2. Cole o SQL acima
3. Clique em "Run"
4. Recarregue a página da aplicação

Após executar, o field `type` voltará a funcionar!
