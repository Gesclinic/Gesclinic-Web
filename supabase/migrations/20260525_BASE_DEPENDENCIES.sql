-- =============================================================================
-- SETUP BASE TABLES - DEPENDENCIES FOR ETAPAS 1-6
-- =============================================================================

-- TABLE: user_clinic_roles (Necessária para RLS)
CREATE TABLE IF NOT EXISTS user_clinic_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  clinic_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'admin', 'director', 'accountant', 'professional'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_user_clinic UNIQUE(user_id, clinic_id)
);

ALTER TABLE user_clinic_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_own_roles"
  ON user_clinic_roles FOR SELECT
  USING (user_id = auth.uid());

-- TABLE: ar_payer_type (Necessária para ar_receivables)
CREATE TABLE IF NOT EXISTS ar_payer_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT unique_payer_type UNIQUE(clinic_id, name)
);

ALTER TABLE ar_payer_type ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_users_can_view_payer_types"
  ON ar_payer_type FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()));

-- TABLE: ar_receivables (Necessária para ar_payments)
CREATE TABLE IF NOT EXISTS ar_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  payer_name VARCHAR(255) NOT NULL,
  payer_email VARCHAR(255),
  payer_phone VARCHAR(20),
  payer_type_id UUID,
  appointment_id UUID,
  total_amount DECIMAL(14, 2) NOT NULL,
  amount_received DECIMAL(14, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'partial', 'received', 'overdue'
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_payer_type FOREIGN KEY (payer_type_id) REFERENCES ar_payer_type(id) ON DELETE SET NULL
);

ALTER TABLE ar_receivables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_users_can_view_receivables"
  ON ar_receivables FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()));

CREATE INDEX idx_ar_receivables_clinic ON ar_receivables(clinic_id);
CREATE INDEX idx_ar_receivables_status ON ar_receivables(clinic_id, status);

-- TABLE: ar_payments (Necessária para ETAPA 3)
CREATE TABLE IF NOT EXISTS ar_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  receivable_id UUID NOT NULL,
  payment_amount DECIMAL(14, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50), -- 'pix', 'ted', 'credit_card', 'check', 'cash'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'settled', 'failed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_receivable FOREIGN KEY (receivable_id) REFERENCES ar_receivables(id) ON DELETE CASCADE
);

ALTER TABLE ar_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_users_can_view_payments"
  ON ar_payments FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM user_clinic_roles WHERE user_id = auth.uid()));

CREATE INDEX idx_ar_payments_clinic ON ar_payments(clinic_id);
CREATE INDEX idx_ar_payments_receivable ON ar_payments(receivable_id);
CREATE INDEX idx_ar_payments_date ON ar_payments(payment_date);

COMMIT;
