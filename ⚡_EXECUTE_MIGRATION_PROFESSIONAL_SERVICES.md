⚡ EXECUTE ESTA MIGRAÇÃO AGORA! ⚡

## Problema Encontrado
Erro ao tentar atualizar professional_services:
```
PGRST204: Could not find the 'updated_at' column of 'professional_services' in the schema cache
```

## Solução
A coluna `updated_at` não está sendo reconhecida pelo PostgREST.

---

## ✅ Passo 1: Aplicar a Migração no Supabase

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá para **SQL Editor**
4. Clique em **New Query**
5. **COPIE O CÓDIGO ABAIXO** e execute:

```sql
-- Migration para garantir que updated_at existe e funciona em professional_services
-- Fix para erro PGRST204

-- 1. Garantir que a coluna existe
ALTER TABLE public.professional_services
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Criar função para atualizar. updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_professional_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_update_professional_services_updated_at ON public.professional_services;

-- 4. Criar novo trigger
CREATE TRIGGER trigger_update_professional_services_updated_at
BEFORE UPDATE ON public.professional_services
FOR EACH ROW
EXECUTE FUNCTION public.update_professional_services_updated_at();

-- 5. Dar permissões necessárias
GRANT EXECUTE ON FUNCTION public.update_professional_services_updated_at() TO authenticated;
```

---

## ✅ Passo 2: Verificar se Funcionou

1. Retorne para a aplicação
2. Tente editar um serviço profissional novamente
3. O erro deve desaparecer ✓

---

## 📝 O que foi alterado:

- ✅ Garantiu que `updated_at` coluna existe na tabela
- ✅ Criou trigger automático para atualizar o timestamp
- ✅ API atualizada para não enviar manualmente o updated_at
- ✅ Trigger cuida de manter o campo atualizado

---

## 🚀 Próximas Ações:
- [ ] Aplicar a migração SQL no Supabase
- [ ] Testar edição de professional_services
- [ ] Confirmar que erro PGRST204 desapareceu
