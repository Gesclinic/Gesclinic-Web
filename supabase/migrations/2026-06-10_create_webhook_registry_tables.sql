CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  webhook_name VARCHAR(255) NOT NULL,
  webhook_url TEXT NOT NULL,
  event_types TEXT[] NOT NULL DEFAULT '{}',
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  retry_policy JSONB NOT NULL DEFAULT '{"max_retries":3,"timeout":30000}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL,
  status_code INTEGER,
  response_body JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_clinic_enabled ON public.webhooks(clinic_id, enabled);
CREATE INDEX IF NOT EXISTS idx_webhooks_event_types ON public.webhooks USING GIN(event_types);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_created ON public.webhook_logs(webhook_id, created_at DESC);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhooks_clinic_isolation ON public.webhooks;
CREATE POLICY webhooks_clinic_isolation ON public.webhooks
  FOR ALL
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS webhook_logs_clinic_isolation ON public.webhook_logs;
CREATE POLICY webhook_logs_clinic_isolation ON public.webhook_logs
  FOR ALL
  TO authenticated
  USING (
    webhook_id IN (
      SELECT w.id
      FROM public.webhooks w
      WHERE w.clinic_id IN (
        SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    webhook_id IN (
      SELECT w.id
      FROM public.webhooks w
      WHERE w.clinic_id IN (
        SELECT clinic_id FROM public.user_clinic_roles WHERE user_id = auth.uid()
      )
    )
  );

CREATE OR REPLACE FUNCTION public.set_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_webhooks_updated_at ON public.webhooks;
CREATE TRIGGER trg_set_webhooks_updated_at
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_webhooks_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhooks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_logs TO authenticated;
