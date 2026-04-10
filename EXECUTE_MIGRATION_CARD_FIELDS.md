# ⚠️ EXECUTE ESTA MIGRATION NO SUPABASE

Copie o SQL abaixo e execute no Supabase SQL Editor (https://supabase.com > SQL Editor):

```sql
-- Adicionar colunas para armazenar dados de cartão de crédito/débito
-- Data: 24 de fevereiro de 2026

DO $$
BEGIN
  -- Adicionar card_brand (VISA, MASTERCARD, ELO, AMEX, etc)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'card_brand') THEN
    ALTER TABLE appointments ADD COLUMN card_brand VARCHAR(50);
    COMMENT ON COLUMN appointments.card_brand IS 'Bandeira do cartão: VISA, MASTERCARD, ELO, AMEX, etc';
  ELSE
    RAISE NOTICE '⏭️ Coluna card_brand já existe';
  END IF;
END $$;

DO $$
BEGIN
  -- Adicionar card_last_digits (últimos 4 dígitos do cartão)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'card_last_digits') THEN
    ALTER TABLE appointments ADD COLUMN card_last_digits VARCHAR(4);
    COMMENT ON COLUMN appointments.card_last_digits IS 'Últimos 4 dígitos do cartão';
  ELSE
    RAISE NOTICE '⏭️ Coluna card_last_digits já existe';
  END IF;
END $$;

DO $$
BEGIN
  -- Adicionar card_installments (número de parcelas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'card_installments') THEN
    ALTER TABLE appointments ADD COLUMN card_installments INT DEFAULT 1;
    COMMENT ON COLUMN appointments.card_installments IS 'Número de parcelas do cartão';
  ELSE
    RAISE NOTICE '⏭️ Coluna card_installments já existe';
  END IF;
END $$;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_appointments_card_brand ON appointments(card_brand) WHERE card_brand IS NOT NULL;
```

**Passos:**
1. Acesse https://supabase.com
2. Entre no seu projeto
3. Clique em "SQL Editor" no menu esquerdo
4. Clique em "New Query"
5. Cole o SQL acima
6. Clique em "Run" (▶ verde)
7. Aguarde a execução

Depois disso, o modal carregará os dados do cartão corretamente.
