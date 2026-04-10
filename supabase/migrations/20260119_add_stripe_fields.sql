-- ============================================================
-- ADD STRIPE FIELDS TO SUBSCRIPTION TABLES
-- ============================================================
-- Add Stripe integration fields for payment processing

-- 1. Add Stripe fields to clinic_subscriptions if not exists
ALTER TABLE clinic_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_method JSONB;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_stripe_customer 
ON clinic_subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_stripe_subscription 
ON clinic_subscriptions(stripe_subscription_id);

-- 2. Create payment_history table for tracking payments
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES clinic_subscriptions(id) ON DELETE CASCADE,
  
  -- Stripe data
  stripe_payment_intent_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  
  -- Payment info
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  
  -- Plan info
  period_start DATE,
  period_end DATE,
  
  -- Dates
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_history_clinic 
ON payment_history(clinic_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription 
ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status 
ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_payment_intent 
ON payment_history(stripe_payment_intent_id);

-- 3. Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES clinic_subscriptions(id) ON DELETE CASCADE,
  
  -- Stripe data
  stripe_invoice_id VARCHAR(255) UNIQUE,
  
  -- Invoice info
  invoice_number VARCHAR(50) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  
  -- Dates
  issued_at TIMESTAMP WITH TIME ZONE,
  due_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- PDF
  invoice_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_clinic 
ON invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription 
ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id 
ON invoices(stripe_invoice_id);

-- Confirmation
SELECT 'Campos Stripe adicionados com sucesso!' as status;
