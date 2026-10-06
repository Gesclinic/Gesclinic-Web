-- CANDIDATE: execute in isolated staging after the preflight queries below.
-- Stop if the duplicate query returns rows. Resolve them manually without discarding financial data.
SELECT stripe_invoice_id, count(*) AS copies
FROM public.payment_history
WHERE stripe_invoice_id IS NOT NULL
GROUP BY stripe_invoice_id HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS payment_history_stripe_invoice_unique
  ON public.payment_history (stripe_invoice_id);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_webhook_events FROM anon, authenticated;
