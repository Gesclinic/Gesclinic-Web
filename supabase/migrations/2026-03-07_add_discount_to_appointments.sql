-- ============================================
-- 🔧 MIGRAÇÃO: Adicionar colunas faltantes à tabela appointments
-- Data: 7 de março de 2026
-- ============================================

-- Adicionar TODAS as colunas necessárias à tabela appointments
ALTER TABLE appointments
-- Campos de Desconto
ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_reason VARCHAR(50),
ADD COLUMN IF NOT EXISTS discount_authorized_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS discount_authorized_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS discount_observation TEXT,

-- Campos de Lead (para agendamentos sem paciente)
ADD COLUMN IF NOT EXISTS patient_type VARCHAR(20) DEFAULT 'PATIENT',
ADD COLUMN IF NOT EXISTS lead_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS lead_phone VARCHAR(20),

-- Campos de Horário
ADD COLUMN IF NOT EXISTS end_time TIME,

-- Campos de Dados Cadastrais do Paciente
ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS patient_cpf VARCHAR(20),
ADD COLUMN IF NOT EXISTS patient_phone VARCHAR(20),

-- Campos de Carteirinha/Seguro
ADD COLUMN IF NOT EXISTS card_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS insurance_card_verified BOOLEAN DEFAULT FALSE,

-- Campos de Autorização
ADD COLUMN IF NOT EXISTS authorization_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS authorization_date DATE,
ADD COLUMN IF NOT EXISTS authorization_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS authorization_expiry DATE,

-- Campos de Guia
ADD COLUMN IF NOT EXISTS guide_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS guide_generated BOOLEAN DEFAULT FALSE,

-- Campos de Pagamento
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS payer_name VARCHAR(255);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_appointments_discount 
  ON appointments(discount) 
  WHERE discount > 0;

CREATE INDEX IF NOT EXISTS idx_appointments_discount_reason 
  ON appointments(discount_reason) 
  WHERE discount > 0;

CREATE INDEX IF NOT EXISTS idx_appointments_patient_type 
  ON appointments(patient_type);

CREATE INDEX IF NOT EXISTS idx_appointments_lead_name 
  ON appointments(lead_name);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_name 
  ON appointments(patient_name);

CREATE INDEX IF NOT EXISTS idx_appointments_payment_method 
  ON appointments(payment_method);

CREATE INDEX IF NOT EXISTS idx_appointments_authorization_number 
  ON appointments(authorization_number);

CREATE INDEX IF NOT EXISTS idx_appointments_guide_number 
  ON appointments(guide_number);

-- ✅ Migração concluída
