# 🚀 EXECUÇÃO MANUAL DA MIGRATION - PASSO A PASSO

## Problema
O Supabase CLI está com conflitos na tabela `schema_migrations`. Solução: executar a SQL diretamente no Supabase Dashboard.

## Passos

### 1️⃣ Acesse o Supabase Dashboard
- URL: https://app.supabase.com
- Projeto: gvdkdjyupktlflwurike
- Vá para: **SQL Editor** (menu esquerdo)

### 2️⃣ Criar Nova Query
- Clique em "New Query"
- Cole o SQL abaixo

### 3️⃣ Executar SQL

```sql
-- Add street and number columns to stock_suppliers
-- Separates address into street and number fields for better data organization

BEGIN;

ALTER TABLE public.stock_suppliers
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS number TEXT;

-- Add comments for documentation  
COMMENT ON COLUMN public.stock_suppliers.street IS 'Rua/Logradouro do fornecedor (extraído do endereço ou XML)';
COMMENT ON COLUMN public.stock_suppliers.number IS 'Número do logradouro';
COMMENT ON COLUMN public.stock_suppliers.address IS 'Endereço completo - Mantido para compatibilidade legada';

COMMIT;
```

### 4️⃣ Clicar em "RUN"
- Resultado esperado: Command OK

### 5️⃣ Verificar
Execute query de validação:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stock_suppliers' 
  AND column_name IN ('street', 'number', 'address')
ORDER BY column_name;
```

Resultado esperado: 3 linhas (address, number, street)

---

## ✅ Depois de Executar

O código JavaScript já está pronto! Basta fazer refresh no navegador e testar:

1. Ir para **Contas a Pagar** → **Fornecedores**
2. Criar novo fornecedor via XML
3. Verificar se o campo **"Rua"** agora aparece preenchido
4. Salvar e verificar no banco de dados

## 📋 Verificação Final

Após salvar um fornecedor, execute no SQL Editor:

```sql
SELECT id, name, street, number, address 
FROM stock_suppliers 
WHERE clinic_id = '[seu-clinic-id]'
LIMIT 1;
```

Você deve ver:
- **street**: "Rua das Flores"  (exemplo)
- **number**: "123"
- **address**: "Rua das Flores, 123 - Bairro - Cidade" (completo)
