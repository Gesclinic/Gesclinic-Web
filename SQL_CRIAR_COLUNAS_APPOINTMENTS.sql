-- ============================================
-- SCRIPT POSTGRESQL PARA SUPABASE
-- Execute isto no Supabase SQL Editor
-- ============================================

-- 1. VERIFICAR COLUNAS EXISTENTES
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'appointments' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. ADICIONAR COLUNAS FALTANTES (PostgreSQL/Supabase)

-- Coluna para data do agendamento
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Coluna para horário do agendamento
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS scheduled_time TIME;

-- Coluna para horário final
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Coluna para status do agendamento
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled';

-- Coluna para observações
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Coluna para valor/preço
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2);

-- Coluna para duração em minutos
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 30;

-- Coluna para nome do lead/prospect
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS lead_name VARCHAR(255);

-- Coluna para telefone do lead
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS lead_phone VARCHAR(20);

-- Coluna para celular do lead
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS lead_mobile VARCHAR(20);

-- 3. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date 
ON appointments(clinic_id, scheduled_date DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_professional_date 
ON appointments(professional_id, scheduled_date DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_date 
ON appointments(patient_id, scheduled_date DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_status 
ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_appointments_room 
ON appointments(room_id) WHERE room_id IS NOT NULL;

-- 4. VERIFICAR SE EXISTEM RELACIONAMENTOS (ForeignKeys)
SELECT 
  constraint_name,
  table_name,
  column_name,
  referenced_table_name,
  referenced_column_name
FROM information_schema.constraint_column_usage
WHERE referenced_table_name IN ('patients', 'professionals', 'services', 'rooms', 'payers', 'plans')
  AND table_name = 'appointments';

-- 5. CRIAR CONSTRAINTS SE NECESSÁRIO (exemplo)
-- ALTER TABLE appointments 
-- ADD CONSTRAINT fk_appointments_clinic 
-- FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

-- 6. RESULTADO FINAL - VERIFICAR TODOS OS DADOS
SELECT 
  id,
  clinic_id,
  patient_id,
  professional_id,
  service_id,
  room_id,
  scheduled_date,
  scheduled_time,
  end_time,
  status,
  notes,
  value,
  duration,
  lead_name,
  lead_phone,
  lead_mobile,
  created_at,
  updated_at
FROM appointments
LIMIT 1;
