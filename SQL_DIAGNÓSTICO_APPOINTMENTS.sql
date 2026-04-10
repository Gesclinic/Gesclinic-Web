-- ============================================
-- DIAGNÓSTICO E CRIAÇÃO DE COLUNAS NECESSÁRIAS
-- ============================================

-- 1. VERIFICAR ESTRUTURA ATUAL
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'appointments' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. CRIAR COLUNAS QUE PODEM ESTAR FALTANDO

-- Se a coluna 'scheduled_date' não existir
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Se a coluna 'scheduled_time' não existir  
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS scheduled_time TIME;

-- Se a coluna 'end_time' não existir
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Se a coluna 'status' não existir
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- Se a coluna 'notes' não existir
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Se a coluna 'value' não existir
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2);

-- Se a coluna 'duration' não existir
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS duration INTEGER;

-- Se a coluna 'lead_name' não existir
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS lead_name VARCHAR(255);

-- Se a coluna 'lead_phone' não existir
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS lead_phone VARCHAR(20);

-- Se a coluna 'lead_mobile' não existir
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS lead_mobile VARCHAR(20);

-- Se a coluna 'patient_id' não existir (mas provavelmente existe)
-- ALTER TABLE appointments 
-- ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id);

-- 3. VERIFICAR RELACIONAMENTOS
SELECT 
  constraint_name, 
  column_name,
  referenced_table_name,
  referenced_column_name
FROM information_schema.key_column_usage
WHERE table_name = 'appointments' AND constraint_type = 'FOREIGN KEY';

-- 4. CRIAR ÍNDICES ÚTEIS
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date 
ON appointments(clinic_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_appointments_professional 
ON appointments(professional_id);

CREATE INDEX IF NOT EXISTS idx_appointments_patient 
ON appointments(patient_id);

CREATE INDEX IF NOT EXISTS idx_appointments_status 
ON appointments(status);
