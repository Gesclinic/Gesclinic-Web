-- ============================================================
-- COLAR ISTO NO SUPABASE STUDIO
-- ============================================================
-- 1. Acesse: https://app.supabase.com
-- 2. Selecione seu projeto
-- 3. Vá em: SQL Editor > New Query
-- 4. Cole TODO o código abaixo
-- 5. Clique em "Execute"
-- ============================================================

-- ============================================================
-- ADICIONAR CAMPOS FINANCEIROS À TABELA APPOINTMENTS
-- ============================================================

DO $$
BEGIN
  -- Payer Type (CONVENIO, PARTICULAR, CORTESIA)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'payer_type'
  ) THEN
    ALTER TABLE appointments ADD COLUMN payer_type VARCHAR(50) DEFAULT 'CONVENIO';
    CREATE INDEX idx_appointments_payer_type ON appointments(payer_type);
    RAISE NOTICE '✅ Campo payer_type adicionado';
  END IF;

  -- Health Plan Name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'health_plan'
  ) THEN
    ALTER TABLE appointments ADD COLUMN health_plan TEXT;
    CREATE INDEX idx_appointments_health_plan ON appointments(health_plan);
    RAISE NOTICE '✅ Campo health_plan adicionado';
  END IF;

  -- Card Number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'card_number'
  ) THEN
    ALTER TABLE appointments ADD COLUMN card_number VARCHAR(100);
    RAISE NOTICE '✅ Campo card_number adicionado';
  END IF;

  -- Card Verified
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'card_verified'
  ) THEN
    ALTER TABLE appointments ADD COLUMN card_verified BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Campo card_verified adicionado';
  END IF;

  -- Authorization Number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'authorization_number'
  ) THEN
    ALTER TABLE appointments ADD COLUMN authorization_number VARCHAR(100);
    RAISE NOTICE '✅ Campo authorization_number adicionado';
  END IF;

  -- Authorization Expiry Date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'authorization_expiry'
  ) THEN
    ALTER TABLE appointments ADD COLUMN authorization_expiry DATE;
    RAISE NOTICE '✅ Campo authorization_expiry adicionado';
  END IF;

  -- Guide Number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'guide_number'
  ) THEN
    ALTER TABLE appointments ADD COLUMN guide_number VARCHAR(100);
    RAISE NOTICE '✅ Campo guide_number adicionado';
  END IF;

  -- Payment Method
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE appointments ADD COLUMN payment_method VARCHAR(50);
    CREATE INDEX idx_appointments_payment_method ON appointments(payment_method);
    RAISE NOTICE '✅ Campo payment_method adicionado';
  END IF;

  -- Financial Value (Consulta)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'financial_value'
  ) THEN
    ALTER TABLE appointments ADD COLUMN financial_value NUMERIC(12, 2);
    RAISE NOTICE '✅ Campo financial_value adicionado';
  END IF;

  -- Copayment (Coparticipação)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'copayment'
  ) THEN
    ALTER TABLE appointments ADD COLUMN copayment NUMERIC(12, 2) DEFAULT 0;
    RAISE NOTICE '✅ Campo copayment adicionado';
  END IF;

  -- Discount (Desconto)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'discount'
  ) THEN
    ALTER TABLE appointments ADD COLUMN discount NUMERIC(12, 2) DEFAULT 0;
    RAISE NOTICE '✅ Campo discount adicionado';
  END IF;

  -- Financial Data Captured At (Timestamp)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'financial_data_captured_at'
  ) THEN
    ALTER TABLE appointments ADD COLUMN financial_data_captured_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Campo financial_data_captured_at adicionado';
  END IF;

END $$;

-- ============================================================
-- CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_appointments_financial_status 
ON appointments(clinic_id, payer_type, status) 
WHERE financial_data_captured_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_financial_data_captured 
ON appointments(clinic_id, financial_data_captured_at DESC) 
WHERE financial_data_captured_at IS NOT NULL;

RAISE NOTICE '✅ Índices criados com sucesso';

-- ============================================================
-- VALIDAÇÃO FINAL
-- ============================================================

SELECT 
  'Migration Concluída com Sucesso!' as status,
  COUNT(*) as total_campos
FROM information_schema.columns 
WHERE table_name = 'appointments';
