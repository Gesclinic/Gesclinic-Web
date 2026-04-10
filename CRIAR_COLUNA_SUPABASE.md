# ⚠️ CRIAÇÃO DE COLUNA NO SUPABASE NECESSÁRIA

## Problema
A coluna `code` está sendo usada na aplicação, mas não existe na tabela `health_insurances` do banco de dados Supabase.

**Erro:** `Falha ao listar convênios: column health_insurances.code does not exist`

---

## Solução: Execute o SQL no Supabase

### Opção 1: Via Supabase Dashboard (Recomendado)

1. **Acesse o Supabase Dashboard**
   - Vá para: https://app.supabase.com
   - Faça login com suas credenciais
   - Selecione o projeto da sua clínica

2. **Abra o SQL Editor**
   - Menu lateral esquerdo > `SQL Editor`
   - Clique em `+ New query`

3. **Cole o SQL abaixo e execute:**

```sql
-- Add code column to health_insurances table
ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS code VARCHAR(50);

-- Create unique constraint for code per clinic
ALTER TABLE health_insurances
ADD CONSTRAINT unique_health_insurance_code_per_clinic UNIQUE(clinic_id, code);
```

4. **Clique em `Run` ou `Ctrl+Enter`**

5. **Sucesso!** ✅ A coluna `code` foi criada

---

### Opção 2: Via Supabase CLI

Se você tiver `supabase-cli` instalado:

```bash
# Navegar para a pasta do projeto
cd "C:\Users\ferna\Desktop\Projeto Gesclinic Web"

# Aplicar migrations
supabase migration up
```

---

### Opção 3: Verificar se a coluna existe

Para confirmar que a coluna foi criada com sucesso:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'health_insurances' 
AND column_name = 'code';
```

Se retornar uma linha, a coluna existe ✅

---

## Depois de Executar o SQL

✅ Recarregue a página do navegador  
✅ O erro desaparecerá  
✅ Você poderá usar convênios com código normalmente  

---

## Se Você Não Tem Acesso ao Supabase

Entre em contato com o administrador do banco de dados para executar o SQL acima na tabela `health_insurances`.
