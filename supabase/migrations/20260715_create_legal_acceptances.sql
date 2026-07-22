-- Stores legal acceptance evidence captured during signup/contracting.
CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.clinic_subscriptions(id) ON DELETE SET NULL,
  accepted_by_name text NOT NULL,
  accepted_by_email text NOT NULL,
  document_type text NOT NULL,
  document_version text NOT NULL,
  document_url text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_clinic_id
  ON public.legal_acceptances(clinic_id);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user_id
  ON public.legal_acceptances(user_id);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_subscription_id
  ON public.legal_acceptances(subscription_id);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_document
  ON public.legal_acceptances(document_type, document_version);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_accepted_at
  ON public.legal_acceptances(accepted_at DESC);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_admins_can_view_legal_acceptances" ON public.legal_acceptances;
CREATE POLICY "clinic_admins_can_view_legal_acceptances"
  ON public.legal_acceptances
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT users.clinic_id
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );