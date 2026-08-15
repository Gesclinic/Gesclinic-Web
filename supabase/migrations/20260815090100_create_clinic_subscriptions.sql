ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS plan_id text REFERENCES public.plans(id);

CREATE TABLE IF NOT EXISTS public.clinic_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.plans(id),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_session_id text,
  billing_cycle text CHECK (billing_cycle IN ('monthly', 'annual')),
  status text CHECK (status IN ('active', 'past_due', 'canceled', 'paused')),
  current_period_start timestamp,
  current_period_end timestamp,
  last_payment_date timestamp,
  next_renewal_date timestamp,
  payment_method text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_clinic_id
  ON public.clinic_subscriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_plan_id
  ON public.clinic_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_status
  ON public.clinic_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_clinics_plan_id
  ON public.clinics(plan_id);

ALTER TABLE public.clinic_subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.clinic_subscriptions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_subscriptions TO service_role;