-- ============================================================================
-- MIGRATION: 20260611_receivable_glosa_workflow.sql
-- PURPOSE: Workflow enterprise de glosas/contestacao para Contas a Receber
-- ============================================================================

ALTER TABLE receivable_glosas
ADD COLUMN IF NOT EXISTS contested_amount NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS recovered_amount NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS final_loss_amount NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS contestation_deadline DATE,
ADD COLUMN IF NOT EXISTS contested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recovered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS evidence_url TEXT,
ADD COLUMN IF NOT EXISTS evidence_path TEXT,
ADD COLUMN IF NOT EXISTS evidence_name TEXT,
ADD COLUMN IF NOT EXISTS workflow_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_receivable_glosas_deadline
  ON receivable_glosas(clinic_id, contestation_deadline)
  WHERE contestation_deadline IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_receivable_glosas_workflow_status
  ON receivable_glosas(clinic_id, contestation_status, updated_at DESC);
