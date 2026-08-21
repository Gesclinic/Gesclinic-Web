-- ============================================================================
-- Consolidated from 20260117_add_missing_revenue_rules_columns.sql
-- ============================================================================

-- Add missing columns to revenue_rules table
-- Columns: min_value, max_value (for conditional rule application)

ALTER TABLE public.revenue_rules
ADD COLUMN IF NOT EXISTS min_value DECIMAL(19, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_value DECIMAL(19, 2) DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_revenue_rules_value_range
ON public.revenue_rules(clinic_id, professional_id, service_id, min_value, max_value);

-- ============================================================================
-- Consolidated from 20260117_complete_revenue_rules_schema.sql
-- ============================================================================

-- Add all missing columns to revenue_rules table
-- These columns define how revenue/fees are distributed to professionals

ALTER TABLE public.revenue_rules
ADD COLUMN IF NOT EXISTS clinic_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
ADD COLUMN IF NOT EXISTS repasse_type VARCHAR(50) DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS percentage DECIMAL(5, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fixed_amount DECIMAL(19, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS repasse_to VARCHAR(100) DEFAULT 'professional',
ADD COLUMN IF NOT EXISTS applies_to_status VARCHAR(50) DEFAULT 'all',
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Update clinic_id for existing rows if they reference a specific clinic
-- This ensures the clinic_id filter in the API works correctly
UPDATE public.revenue_rules
SET clinic_id = (SELECT id FROM public.clinics LIMIT 1)
WHERE clinic_id = '00000000-0000-0000-0000-000000000000';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_revenue_rules_clinic_id
ON public.revenue_rules(clinic_id);

CREATE INDEX IF NOT EXISTS idx_revenue_rules_professional_service
ON public.revenue_rules(professional_id, service_id, clinic_id);

-- ============================================================================
-- Consolidated from 20260117_subscription_plans.sql
-- ============================================================================

-- ============================================================
-- SUBSCRIPTION PLANS AND CLINIC SUBSCRIPTIONS
-- ============================================================
-- Tables for managing SaaS subscription plans and clinic subscriptions

-- 1. Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,

  -- Pricing
  price_monthly DECIMAL(10, 2),
  price_annual DECIMAL(10, 2),

  -- Limits
  max_users INT DEFAULT 5,
  max_patients INT DEFAULT 1000,
  max_appointments_per_month INT,

  -- Features (JSON for flexibility)
  features JSONB DEFAULT '{
    "agenda": false,
    "financeiro": false,
    "estoque": false,
    "pacientes": false,
    "profissionais": false,
    "relatorios": false,
    "api_access": false,
    "custom_branding": false
  }'::jsonb,

  -- Status
  active BOOLEAN DEFAULT TRUE,
  trial_days INT DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(active);

-- 2. Clinic Subscriptions Table
CREATE TABLE IF NOT EXISTS clinic_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),

  -- Subscription dates
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,

  -- Billing
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual')) DEFAULT 'monthly',
  next_billing_date DATE,
  auto_renew BOOLEAN DEFAULT TRUE,

  -- Payment
  stripe_subscription_id VARCHAR(255),
  payment_status TEXT CHECK (payment_status IN ('pending', 'active', 'past_due', 'canceled')) DEFAULT 'pending',

  -- Status
  status TEXT CHECK (status IN ('active', 'trial', 'suspended', 'canceled', 'expired')) DEFAULT 'trial',

  -- Trial
  is_trial BOOLEAN DEFAULT TRUE,
  trial_ended_at TIMESTAMP WITH TIME ZONE,

  -- Cancellation
  canceled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_clinic ON clinic_subscriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_plan ON clinic_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_status ON clinic_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_end_date ON clinic_subscriptions(end_date);

-- 3. Usage Tracking Table (para controlar limites)
CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  clinic_subscription_id UUID NOT NULL REFERENCES clinic_subscriptions(id) ON DELETE CASCADE,

  -- Usage counters
  users_count INT DEFAULT 0,
  patients_count INT DEFAULT 0,
  appointments_count INT DEFAULT 0,

  -- Period
  usage_month DATE NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(clinic_subscription_id, usage_month)
);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_clinic_subscription ON subscription_usage(clinic_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_month ON subscription_usage(usage_month);

-- ============================================================
-- DEFAULT PLANS (Basic, Professional, Enterprise)
-- ============================================================

INSERT INTO subscription_plans (name, slug, description, price_monthly, price_annual, max_users, max_patients, features, active, trial_days)
VALUES
(
  'Plano B├ísico',
  'basic',
  'Agenda Essencial ÔÇö Para cl├¡nicas que est├úo come├ºando',
  99.00,
  990.00,
  2,
  500,
  '{
    "agenda": true,
    "financeiro": false,
    "estoque": false,
    "pacientes": true,
    "profissionais": true,
    "relatorios": false,
    "api_access": false,
    "custom_branding": false,
    "medical_specialty": false,
    "advanced_reporting": false,
    "stock_control": false
  }'::jsonb,
  TRUE,
  30
),
(
  'Plano Profissional',
  'professional',
  'Gest├úo Completa ÔÇö Para cl├¡nicas que querem controle e lucro',
  249.00,
  2490.00,
  10,
  5000,
  '{
    "agenda": true,
    "financeiro": true,
    "estoque": true,
    "pacientes": true,
    "profissionais": true,
    "relatorios": true,
    "api_access": false,
    "custom_branding": true,
    "medical_specialty": true,
    "advanced_reporting": true,
    "stock_control": true
  }'::jsonb,
  TRUE,
  30
),
(
  'Plano Enterprise',
  'enterprise',
  'Escala & Performance ÔÇö Para redes, grupos e opera├º├Áes complexas',
  NULL,
  NULL,
  999,
  999999,
  '{
    "agenda": true,
    "financeiro": true,
    "estoque": true,
    "pacientes": true,
    "profissionais": true,
    "relatorios": true,
    "api_access": true,
    "custom_branding": true,
    "medical_specialty": true,
    "advanced_reporting": true,
    "stock_control": true,
    "multi_units": true,
    "dre_per_unit": true,
    "medical_repasse": true,
    "dedicated_support": true
  }'::jsonb,
  TRUE,
  60
)
ON CONFLICT (slug) DO NOTHING;

-- Confirmation
SELECT 'Tabelas de subscription criadas com sucesso!' as status;
