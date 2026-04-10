/**
 * Migration: Add Missing Billing Columns
 * Data: 2026-04-01
 * 
 * Adiciona colunas ausentes necessárias para sincronização de faturamento
 * entre appointments, ap_bills e invoices
 */

-- ✅ Adicionar colunas em appointments (se não existirem)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS payer_name TEXT,
ADD COLUMN IF NOT EXISTS plan_name TEXT;

-- ✅ Adicionar colunas em ap_bills (se não existirem)
ALTER TABLE ap_bills
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS payer_id UUID REFERENCES payers(id),
ADD COLUMN IF NOT EXISTS payer_type TEXT, -- 'paciente' ou 'convenio'
ADD COLUMN IF NOT EXISTS payment_method TEXT, -- 'dinheiro', 'cartao', 'pix', etc
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ✅ Adicionar colunas em invoices (se não existirem)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS health_plan TEXT,
ADD COLUMN IF NOT EXISTS authorization_number TEXT,
ADD COLUMN IF NOT EXISTS authorization_expiry DATE,
ADD COLUMN IF NOT EXISTS guide_number TEXT,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS copayment NUMERIC(10,2);

-- ✅ Adicionar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_ap_bills_appointment_id ON ap_bills(appointment_id);
CREATE INDEX IF NOT EXISTS idx_ap_bills_clinic_id ON ap_bills(clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_appointment_id ON invoices(appointment_id);
