-- Add missing columns to appointments table
-- room_id: para rastrear a sala do atendimento
-- value: para armazenar o valor/preço do atendimento

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id),
ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2);

-- Create index for room_id for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_room ON appointments(room_id);
