# 📝 GUIA: Aplicar Migrations - Adicionar Colunas Faltantes

## 🚀 O que fazer?

Você precisa executar este SQL no Supabase para adicionar as colunas que faltam:

```sql
-- 1. Adicionar coluna plan_id em service_prices
ALTER TABLE public.service_prices
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL;

-- 2. Adicionar coluna price em professional_services
ALTER TABLE public.professional_services
ADD COLUMN IF NOT EXISTS price DECIMAL(12, 2);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_service_prices_plan_id 
ON public.service_prices(plan_id);

CREATE INDEX IF NOT EXISTS idx_professional_services_price 
ON public.professional_services(price);
```

---

## ✅ PASSO A PASSO

### Passo 1: Acessar o Supabase
1. Abra https://app.supabase.com
2. Faça login com sua conta
3. Selecione o projeto **Gesclinic**

### Passo 2: Ir ao SQL Editor
1. No menu lateral esquerdo, clique em **"SQL Editor"**
2. Clique em **"New Query"** (botão azul no topo)

### Passo 3: Colar e Executar o SQL
1. Copie o SQL acima (todos os 4 comandos)
2. Cole na editor que abriu
3. Clique em **"Run"** (botão play) ou pressione `Ctrl+Enter`

### Passo 4: Verificar Execução
- ✅ Se aparecer "Sucess" em verde: **Funcionou!**
- ❌ Se aparecer erro em vermelho: Verifique o schema das tabelas

### Passo 5: Recarregar a Aplicação
1. Volte à aplicação (localhost:3001)
2. Refresque a página (F5 ou Ctrl+R)
3. Teste a funcionalidade de Valores

---

## 🔍 Se algo der errado?

### Erro: "column already exists"
- **Normal!** Significa que a coluna já foi adicionada anteriormente
- A migração usa `IF NOT EXISTS` então é segura

### Erro: "table does not exist"
- Verifique que o nome da tabela está correto
- Pode ser que as tabelas tenham outros nomes em seu banco

### Erro: "Invalid foreign key reference"
- A tabela `plans` pode não existir
- Nesse caso, remova a linha `REFERENCES public.plans(id)` do SQL

---

## 📋 Arquivo de Migração

O arquivo SQL está salvo em:
```
supabase/migrations/2026-02-13_add_missing_columns.sql
```

---

## ✨ Próximos Passos

Após aplicar a migração:
1. ✅ A aplicação funcionará corretamente
2. ✅ Você conseguirá salvar valores

---

## 💡 Dúvidas?

Se o SQL não funcionar exatamente, tente adaptá-lo para seu schema:

1. Verifique os nomes das tabelas no Supabase
2. Verifique quais colunas já existem
3. Ajuste o SQL conforme necessário

**Qualquer erro, me avise!** 🚀

