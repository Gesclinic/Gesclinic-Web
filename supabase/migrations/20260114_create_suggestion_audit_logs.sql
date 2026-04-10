-- Migration: Criar tabela para auditoria de sugestões
-- Data: 2026-01-14
-- Descrição: Registra todas as sugestões executadas para análise e auditoria

CREATE TABLE IF NOT EXISTS public.suggestion_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  suggestion_type VARCHAR(50) NOT NULL,
  -- SLOT_LIVRE, NO_SHOW, PROFISSIONAL_OCIOSO, AGENDA_CRITICA
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  action_taken VARCHAR(50) NOT NULL,
  -- VER_LISTA_ESPERA, CRIAR_ENCAIXE, CONTATAR_PACIENTE, OTIMIZAR_AGENDA, IGNORADA
  result JSONB,
  executed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Índices
  CONSTRAINT suggestion_audit_logs_clinic_idx UNIQUE (clinic_id, executed_at)
);

-- Índices para performance
CREATE INDEX idx_suggestion_audit_logs_clinic_id ON public.suggestion_audit_logs(clinic_id);
CREATE INDEX idx_suggestion_audit_logs_executed_at ON public.suggestion_audit_logs(executed_at);
CREATE INDEX idx_suggestion_audit_logs_suggestion_type ON public.suggestion_audit_logs(suggestion_type);
CREATE INDEX idx_suggestion_audit_logs_executed_by ON public.suggestion_audit_logs(executed_by);

-- RLS (Row Level Security)
ALTER TABLE public.suggestion_audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Gestor/Admin podem ver logs da sua clínica
CREATE POLICY "suggestion_audit_logs_view_by_role"
  ON public.suggestion_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinic_members
      WHERE clinic_members.clinic_id = suggestion_audit_logs.clinic_id
      AND clinic_members.user_id = auth.uid()
      AND clinic_members.role IN ('gestor', 'admin', 'recepcion')
    )
  );

-- Política: Sistema pode inserir logs
CREATE POLICY "suggestion_audit_logs_insert_by_system"
  ON public.suggestion_audit_logs
  FOR INSERT
  WITH CHECK (TRUE);

-- Comentários
COMMENT ON TABLE public.suggestion_audit_logs IS 'Auditoria imutável de sugestões de encaixe executadas';
COMMENT ON COLUMN public.suggestion_audit_logs.suggestion_type IS 'Tipo de sugestão: SLOT_LIVRE, NO_SHOW, PROFISSIONAL_OCIOSO, AGENDA_CRITICA';
COMMENT ON COLUMN public.suggestion_audit_logs.action_taken IS 'Ação executada pelo usuário';
COMMENT ON COLUMN public.suggestion_audit_logs.result IS 'Resultado/contexto da ação (JSON)';
