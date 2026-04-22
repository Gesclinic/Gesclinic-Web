-- ========================================
-- EXAM REQUEST SYSTEM
-- ========================================

-- 1. Exam Request Templates
CREATE TABLE IF NOT EXISTS exam_request_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  description TEXT,
  exams JSONB NOT NULL, -- Array of exam codes with categories
  instructions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, template_name)
);

-- 2. Exam Requests (Patient exam orders)
CREATE TABLE IF NOT EXISTS exam_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  template_id UUID REFERENCES exam_request_templates(id) ON DELETE SET NULL,
  request_number VARCHAR(50) UNIQUE,
  exams JSONB NOT NULL, -- Array of exam codes with instructions
  clinical_indication TEXT NOT NULL,
  priority VARCHAR(20) CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  status VARCHAR(20) CHECK (status IN ('draft', 'created', 'sent', 'completed', 'cancelled')) DEFAULT 'draft',
  sent_date TIMESTAMP,
  completed_date TIMESTAMP,
  sent_to_lab TEXT,
  lab_protocol VARCHAR(100),
  printed_count INTEGER DEFAULT 0,
  last_printed_at TIMESTAMP,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_exam_requests_clinic ON exam_requests(clinic_id);
CREATE INDEX idx_exam_requests_patient ON exam_requests(patient_id);
CREATE INDEX idx_exam_requests_appointment ON exam_requests(appointment_id);
CREATE INDEX idx_exam_requests_status ON exam_requests(status);
CREATE INDEX idx_exam_requests_date ON exam_requests(created_at);
CREATE INDEX idx_exam_templates_clinic ON exam_request_templates(clinic_id);

-- RLS Policies
ALTER TABLE exam_request_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_templates_clinic_access" ON exam_request_templates
  FOR ALL USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

CREATE POLICY "exam_requests_clinic_access" ON exam_requests
  FOR ALL USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Generate request number trigger
CREATE OR REPLACE FUNCTION generate_exam_request_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_number IS NULL THEN
    NEW.request_number := 'EX-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('exam_request_seq'), 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS exam_request_seq START 1;

CREATE TRIGGER set_exam_request_number
BEFORE INSERT ON exam_requests
FOR EACH ROW
EXECUTE FUNCTION generate_exam_request_number();
