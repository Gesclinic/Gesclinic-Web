-- Create card_processors table
CREATE TABLE card_processors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  settlement_day INT NOT NULL CHECK (settlement_day >= 1 AND settlement_day <= 31),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, name)
);

-- Enable RLS
ALTER TABLE card_processors ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see processors for their clinic
CREATE POLICY card_processors_clinic_isolation ON card_processors
  FOR SELECT
  USING (clinic_id = auth.jwt() ->> 'clinic_id' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY card_processors_insert ON card_processors
  FOR INSERT
  WITH CHECK (clinic_id = auth.jwt() ->> 'clinic_id' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY card_processors_update ON card_processors
  FOR UPDATE
  USING (clinic_id = auth.jwt() ->> 'clinic_id' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY card_processors_delete ON card_processors
  FOR DELETE
  USING (clinic_id = auth.jwt() ->> 'clinic_id' OR auth.jwt() ->> 'role' = 'admin');

-- Add comment
COMMENT ON TABLE card_processors IS 'Card processing companies (Stone, PagBank, etc) with settlement days';
COMMENT ON COLUMN card_processors.settlement_day IS 'Day of month when processor credits clinic (1-31)';
