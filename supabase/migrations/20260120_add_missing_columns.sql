-- Adicionar coluna brand_color na tabela clinics
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS brand_color VARCHAR(7);

-- Adicionar colunas de data na tabela ar_receivables se ela existir
DO $$
BEGIN
  -- Verificar se a tabela ar_receivables existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ar_receivables') THEN
    ALTER TABLE ar_receivables ADD COLUMN IF NOT EXISTS data_vencimento DATE;
    ALTER TABLE ar_receivables ADD COLUMN IF NOT EXISTS data_recebimento TIMESTAMP WITH TIME ZONE;
    ALTER TABLE ar_receivables ADD COLUMN IF NOT EXISTS valor_liquido NUMERIC(10,2);
  END IF;
END
$$;
