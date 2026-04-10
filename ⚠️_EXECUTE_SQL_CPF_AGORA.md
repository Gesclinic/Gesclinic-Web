# ⚠️ AÇÃO URGENTE: Adicionar coluna CPF à tabela professionals

## Problema Identificado
A tabela `professionals` no Supabase **NÃO possui a coluna `cpf`**, mas o código está tentando salvar CPF nela.

Colunas existentes em `professionals`:
- id (UUID)
- clinic_id (UUID)
- name (TEXT)
- email (TEXT)
- phone (TEXT)
- specialization (TEXT)
- license_number (TEXT)
- active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

## Solução

Execute este SQL no Supabase SQL Editor (https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new):

```sql
-- Adicionar coluna CPF à tabela professionals
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS cpf VARCHAR(11);

-- Criar índice para CPF (melhora performance de buscas)
CREATE INDEX IF NOT EXISTS idx_professionals_cpf ON professionals(cpf);
```

## Passos

1. Copie o SQL acima
2. Acesse: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new
3. Cole o SQL
4. Clique em "Run" ou pressione Ctrl+Enter
5. Quando terminar, a página será recarregada automaticamente

## Após Executar

Depois que a migração estiver aplicada:
- Acesse a aplicação em http://localhost:5173/clinica/base-sistema/profissionais
- Crie um novo profissional com CPF "012.283.270-17"
- O CPF deve aparecer na lista e ao editar

## Resultado Esperado

✅ Coluna `cpf` adicionada à tabela `professionals`
✅ Índice criado para performance
✅ CPF salvo e recuperado corretamente
✅ Dados aparecem na tela de cadastro e edição
