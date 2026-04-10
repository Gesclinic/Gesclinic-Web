-- Add missing columns to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payer_id UUID REFERENCES payers(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_type VARCHAR(50) DEFAULT 'PATIENT';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS lead_name TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS lead_phone TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS lead_mobile TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS agenda_rule_id UUID REFERENCES agenda_rules(id);

-- Add index for room queries
CREATE INDEX IF NOT EXISTS idx_appointments_room ON appointments(room_id);
CREATE INDEX IF NOT EXISTS idx_appointments_payer ON appointments(payer_id);
