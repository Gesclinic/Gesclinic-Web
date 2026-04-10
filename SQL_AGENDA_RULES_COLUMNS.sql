-- Adicionar colunas faltantes na tabela agenda_rules

ALTER TABLE agenda_rules
ADD COLUMN IF NOT EXISTS default_duration_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS interval_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS max_days_in_future INTEGER DEFAULT 365,
ADD COLUMN IF NOT EXISTS min_days_in_advance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS allow_same_day_booking BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS requires_specific_professional BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_specific_room BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_per_day INTEGER,
ADD COLUMN IF NOT EXISTS requires_clinic_confirmation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_simultaneous_appointments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_scheduling_fit BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS lunch_start_time TIME,
ADD COLUMN IF NOT EXISTS lunch_end_time TIME,
ADD COLUMN IF NOT EXISTS min_advance_hours INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_advance_days INTEGER DEFAULT 365;
