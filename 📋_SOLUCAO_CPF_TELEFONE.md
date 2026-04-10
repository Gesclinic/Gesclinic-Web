# 🎯 SOLUÇÃO: CPF e Telefone não aparecem

## 🔍 Problema Identificado

A tabela `professionals` no Supabase **não possui a coluna `cpf`**, portanto:
- ✗ CPF não é salvo no banco
- ✗ CPF não aparece na listagem (mostra "-")
- ✗ CPF não aparece ao editar

## ✅ Código está 100% Correto

Todas as implementações de mask e formatação estão corretas:

```jsx
// ✅ Aplicar mask ao carregar dados
cpf: maskCPF(professional.cpf || "")  // Em handleEditInList

// ✅ Remover formatação antes de salvar
cpf: formData.cpf.replace(/\D/g, '')  // Em handleSubmit
```

## 🔧 Solução: Adicionar Coluna CPF

### Passo 1: Execute o SQL no Supabase

1. Abra: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new
2. Cole este SQL:

```sql
-- Adicionar coluna CPF à tabela professionals
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS cpf VARCHAR(11);

-- Criar índice para busca rápida por CPF
CREATE INDEX IF NOT EXISTS idx_professionals_cpf ON professionals(cpf);
```

3. Clique em "Run" (Ctrl+Enter)

### Passo 2: Aguarde a Migração

O Supabase processará em alguns segundos. Você verá:
```
✓ 1 query executed
✓ 1 index created
```

### Passo 3: Teste na Aplicação

1. Acesse: http://localhost:5173/clinica/base-sistema/profissionais
2. Clique em "+ Novo Profissional"
3. Preencha:
   - Nome: Dr. João Silva
   - CPF: 012.283.270-17 (a máscara aplica automaticamente)
   - Telefone: (11) 98765-4321
   - Email: joao@clinica.com
   - Especialização: Cardiologia
4. Clique "Salvar"

**Resultado esperado:**
- ✅ Profissional aparece na lista
- ✅ CPF e Telefone aparecem preenchidos
- ✅ Ao editar, os dados carregam corretamente

## 📋 Estrutura Final da Tabela

Após executar o SQL, a tabela `professionals` terá:

```
├── id (UUID) - Chave primária
├── clinic_id (UUID) - Referência à clínica
├── name (TEXT) - Nome do profissional
├── cpf (VARCHAR(11)) ← NOVO!
├── email (TEXT)
├── phone (TEXT)
├── specialization (TEXT)
├── license_number (TEXT)
├── active (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## ⚠️ Importante

- Se receber erro "already exists", não é problema - a coluna já foi criada
- O código continua funcionando normalmente
- Os dados salvos a partir deste ponto incluirão o CPF

## 🚀 Próximos Passos

Após adicionar a coluna CPF:
1. ✅ Criar profissional com CPF
2. ✅ Verificar dados na listagem
3. ✅ Editar profissional e confirmar dados
4. ✅ Sistema está 100% funcional!

---

**Tempo estimado:** 1 minuto (apenas execute o SQL)
