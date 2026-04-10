📋 EXECUTAR MIGRAÇÃO NO SUPABASE
================================

Para corrigir o erro "column `agenda_rules.created_at` does not exist", execute o SQL abaixo:

## PASSO 1: Acesse o Supabase SQL Editor
1. Acesse https://supabase.com
2. Faça login na sua conta
3. Selecione o projeto "Gesclinic"
4. Clique em "SQL Editor" no painel lateral esquerdo

## PASSO 2: Copie e execute o SQL

Copie TODO o SQL abaixo e Cole no SQL Editor do Supabase:

---

BEGIN;

-- Verificar se as colunas já existem e adicioná-las se não existirem
DO $$
BEGIN
  -- Adicionar created_at se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agenda_rules' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE agenda_rules
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;

  -- Adicionar updated_at se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agenda_rules' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE agenda_rules
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_agenda_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS agenda_rules_update_timestamp ON agenda_rules;
CREATE TRIGGER agenda_rules_update_timestamp
  BEFORE UPDATE ON agenda_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_agenda_rules_updated_at();

COMMIT;

---

## PASSO 3: Execute
Clique em "Run" ou pressione Ctrl+Enter

Você verá uma mensagem de sucesso quando as colunas forem adicionadas.

## PASSO 4: Recarregue a aplicação
Atualize a página no navegador (F5) e tente salvar um agendamento novamente.

O erro deverá desaparecer!
