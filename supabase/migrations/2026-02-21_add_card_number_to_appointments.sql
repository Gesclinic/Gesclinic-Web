-- Adicionar coluna card_number à tabela appointments se não existir
-- Coluna para armazenar matrícula/carteirinha do beneficiário (Padrão TISS)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'card_number'
  ) THEN
    ALTER TABLE appointments ADD COLUMN card_number VARCHAR(100);
    CREATE INDEX idx_appointments_card_number ON appointments(card_number);
    RAISE NOTICE '✅ Coluna card_number adicionada com sucesso';
  ELSE
    RAISE NOTICE '⏭️ Coluna card_number já existe';
  END IF;
END $$;
