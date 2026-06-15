-- Compatibility objects for the send-alert-email Edge Function.
-- This is intentionally non-destructive: it only adds missing nullable/defaulted
-- columns to the existing email_logs table and creates the pending-email view.

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS notification_id UUID REFERENCES public.alert_notifications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS template_name VARCHAR(100) DEFAULT 'alert_default',
  ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

UPDATE public.email_logs
SET recipient_email = COALESCE(recipient_email, to_email),
    delivery_status = COALESCE(delivery_status, status, 'pending'),
    template_name = COALESCE(template_name, 'alert_default'),
    retry_count = COALESCE(retry_count, 0),
    max_retries = COALESCE(max_retries, 3),
    created_at = COALESCE(created_at, sent_at, NOW()),
    updated_at = COALESCE(updated_at, sent_at, NOW())
WHERE recipient_email IS NULL
   OR delivery_status IS NULL
   OR template_name IS NULL
   OR retry_count IS NULL
   OR max_retries IS NULL
     OR created_at IS NULL
   OR updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_logs_delivery_status_retry
  ON public.email_logs (delivery_status, next_retry_at, retry_count);

CREATE OR REPLACE VIEW public.v_pending_emails AS
SELECT
  el.id,
  el.clinic_id,
  el.notification_id,
  el.recipient_email,
  el.subject,
  el.template_name,
  COALESCE(an.title, el.subject) AS alert_title,
  COALESCE(an.message, el.error_message, el.subject) AS alert_message,
  COALESCE(an.severity, 'MEDIUM') AS severity,
  COALESCE(c.fantasy_name, c.name, 'Gesclinic') AS brand_name,
  COALESCE(el.retry_count, 0) AS retry_count,
  COALESCE(el.max_retries, 3) AS max_retries,
  el.next_retry_at,
  el.created_at,
  el.updated_at
FROM public.email_logs el
LEFT JOIN public.alert_notifications an ON an.id = el.notification_id
LEFT JOIN public.clinics c ON c.id = el.clinic_id
WHERE el.delivery_status = 'pending'
  AND (el.next_retry_at IS NULL OR el.next_retry_at <= now())
  AND COALESCE(el.retry_count, 0) < COALESCE(el.max_retries, 3);

GRANT SELECT ON public.v_pending_emails TO authenticated;
GRANT SELECT ON public.v_pending_emails TO service_role;
