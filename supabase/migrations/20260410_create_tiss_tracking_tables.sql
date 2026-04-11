-- ============================================================
-- Migration: Criar Tabelas TISS (Submissões e Auditoria)
-- Data: Abril 10, 2026
-- ============================================================

-- 1. TISS_SUBMISSIONS - Rastreamento de submissões de guias
CREATE TABLE IF NOT EXISTS tiss_submissions (
  id VARCHAR(100) PRIMARY KEY,
  -- Links
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES billing_guides(id) ON DELETE CASCADE,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', 
    -- pending: aguardando envio
    -- sent: enviado para operadora
    -- processing: operadora processando
    -- accepted: aceito pela operadora
    -- rejected: rejeitado pela operadora
    -- error: erro técnico
  
  -- Conteúdo
  xml_content TEXT NOT NULL, -- XML TISS gerado
  response_data JSONB, -- Resposta da operadora (se recebida)
  
  -- Retry Logic
  attempt_count INT DEFAULT 1,
  max_attempts INT DEFAULT 3,
  last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_tiss_submissions_clinic_guide 
  ON tiss_submissions(clinic_id, guide_id);
CREATE INDEX idx_tiss_submissions_status 
  ON tiss_submissions(clinic_id, status);
CREATE INDEX idx_tiss_submissions_retry 
  ON tiss_submissions(clinic_id, next_retry_at) 
  WHERE next_retry_at IS NOT NULL;

-- RLS para tiss_submissions
ALTER TABLE tiss_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tiss_submissions_clinic_policy ON tiss_submissions;
CREATE POLICY tiss_submissions_clinic_policy ON tiss_submissions
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ============================================================

-- 2. TISS_AUDIT_LOGS - Histórico de eventos TISS
CREATE TABLE IF NOT EXISTS tiss_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES billing_guides(id) ON DELETE CASCADE,
  
  -- Evento
  event VARCHAR(50) NOT NULL,
    -- SUBMITTED: guia enviada
    -- PROCESSING: operadora processando
    -- ACCEPTED: aceita
    -- REJECTED: rejeitada
    -- ERROR: erro
    -- RETRY_SUBMITTED: reenviada
  message TEXT NOT NULL,
  details TEXT, -- Detalhes do evento (XML snippet, erro, etc)
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_tiss_audit_logs_guide 
  ON tiss_audit_logs(clinic_id, guide_id, created_at DESC);
CREATE INDEX idx_tiss_audit_logs_event 
  ON tiss_audit_logs(clinic_id, event, created_at DESC);

-- RLS para tiss_audit_logs
ALTER TABLE tiss_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tiss_audit_logs_clinic_policy ON tiss_audit_logs;
CREATE POLICY tiss_audit_logs_clinic_policy ON tiss_audit_logs
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ============================================================

-- 3. Adicionar campos de status TISS em billing_guides (se não existirem)
ALTER TABLE IF EXISTS billing_guides
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS last_submission_at TIMESTAMP WITH TIME ZONE;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
