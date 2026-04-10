-- Criar tabela de planos (plans)
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  max_users INT DEFAULT 1,
  max_doctors INT DEFAULT 1,
  has_financial BOOLEAN DEFAULT FALSE,
  has_stock BOOLEAN DEFAULT FALSE,
  has_reports BOOLEAN DEFAULT FALSE,
  has_multi_unit BOOLEAN DEFAULT FALSE,
  stripe_product_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Adicionar coluna plan_id na tabela clinics (se não existir)
ALTER TABLE clinics 
ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES plans(id);

-- Criar tabela de billing info (rastrear subscrições)
CREATE TABLE IF NOT EXISTS clinic_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_session_id TEXT,
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual')),
  status TEXT CHECK (status IN ('active', 'past_due', 'canceled', 'paused')),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  last_payment_date TIMESTAMP,
  next_renewal_date TIMESTAMP,
  payment_method TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_clinic_id ON clinic_subscriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_plan_id ON clinic_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_status ON clinic_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_clinics_plan_id ON clinics(plan_id);

-- RLS (Row Level Security) - Clínicas só veem seus próprios dados
ALTER TABLE clinic_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their clinic subscriptions"
  ON clinic_subscriptions FOR SELECT
  USING (
    clinic_id IN (
      SELECT id FROM clinics 
      WHERE clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their clinic subscriptions"
  ON clinic_subscriptions FOR UPDATE
  USING (
    clinic_id IN (
      SELECT id FROM clinics 
      WHERE clinic_id = (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
    )
  );
