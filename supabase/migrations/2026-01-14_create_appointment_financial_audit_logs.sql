/**
 * 🧾 AUDITORIA FINANCEIRA DO ATENDIMENTO
 * 
 * Tabela append-only para rastreamento completo da jornada financeira
 * de cada atendimento: faturamento → pagamento → glosa → repasse
 * 
 * Criada: 2026-01-14
 * Responsável por: Rastreabilidade total de eventos financeiros
 */

-- Criar tabela appointment_financial_audit_logs (append-only)
CREATE TABLE IF NOT EXISTS appointment_financial_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamento com atendimento (OBRIGATÓRIO)
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Tipo de evento financeiro
  financial_event_type TEXT NOT NULL,
    -- RECEIVABLE_CREATED: Conta a receber criada
    -- BILLING_GUIDE_CREATED: Guia de convênio gerada
    -- BILLING_SENT: Guia enviada para operadora
    -- PAYMENT_RECEIVED: Pagamento recebido
    -- GLOSA_REGISTERED: Glosa registrada
    -- GLOSA_REVERSED: Glosa revertida
    -- REPASSE_CALCULATED: Repasse médico calculado
    -- REPASSE_PAID: Repasse pago
  
  -- Entidade financeira relacionada
  related_entity TEXT,
    -- accounts_receivable: Para RECEIVABLE_CREATED, PAYMENT_RECEIVED
    -- billing_guide: Para BILLING_GUIDE_CREATED, BILLING_SENT
    -- glosa: Para GLOSA_REGISTERED, GLOSA_REVERSED
    -- repasse_medico: Para REPASSE_CALCULATED, REPASSE_PAID
  
  related_entity_id UUID,
    -- ID da entidade relacionada (conta a receber, guia, glosa, repasse)
  
  -- Valores
  amount NUMERIC(12,2),
    -- Valor do evento financeiro
  
  previous_amount NUMERIC(12,2),
    -- Valor anterior (para rastreamento de mudanças)
  
  -- Status
  status TEXT,
    -- open, paid, canceled, partial, scheduled, etc.
  
  -- Quem executou
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_role TEXT,
    -- GESTOR, FINANCEIRO, PROFISSIONAL, RECEPÇÃO, ADMIN
  
  -- Rastreamento
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contexto adicional (JSON)
  context JSONB,
    -- {
    --   "description": "Descrição do evento",
    --   "previous_status": "...",
    --   "new_status": "...",
    --   "clinic_id": "...",
    --   "professional_id": "...",
    --   "payer_id": "...",
    --   "reason": "Motivo da glosa/reversão",
    --   "notes": "Observações",
    --   ...
    -- }
  
  -- Soft tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_event_type CHECK (
    financial_event_type IN (
      'RECEIVABLE_CREATED',
      'BILLING_GUIDE_CREATED',
      'BILLING_SENT',
      'PAYMENT_RECEIVED',
      'GLOSA_REGISTERED',
      'GLOSA_REVERSED',
      'REPASSE_CALCULATED',
      'REPASSE_PAID'
    )
  ),
  
  CONSTRAINT valid_related_entity CHECK (
    related_entity IS NULL OR 
    related_entity IN (
      'accounts_receivable',
      'billing_guide',
      'glosa',
      'repasse_medico'
    )
  ),
  
  -- Garantir que não é editado/deletado depois (append-only)
  CONSTRAINT immutable_log CHECK (created_at = created_at)
);

-- Índices para performance
CREATE INDEX idx_appointment_financial_audit_logs_appointment_id 
ON appointment_financial_audit_logs(appointment_id);

CREATE INDEX idx_appointment_financial_audit_logs_event_type 
ON appointment_financial_audit_logs(financial_event_type);

CREATE INDEX idx_appointment_financial_audit_logs_performed_at 
ON appointment_financial_audit_logs(performed_at DESC);

CREATE INDEX idx_appointment_financial_audit_logs_related_entity 
ON appointment_financial_audit_logs(related_entity, related_entity_id);

CREATE INDEX idx_appointment_financial_audit_logs_performed_by 
ON appointment_financial_audit_logs(performed_by);

-- Índice composto para consultas comuns
CREATE INDEX idx_appointment_financial_audit_logs_appointment_event 
ON appointment_financial_audit_logs(appointment_id, financial_event_type, performed_at DESC);

-- RLS Policies para appointment_financial_audit_logs
ALTER TABLE appointment_financial_audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Inserir logs de auditoria
CREATE POLICY "appointment_financial_audit_logs_insert_own" 
ON appointment_financial_audit_logs 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Política: Leitura para gestores, financeiros e admins
CREATE POLICY "appointment_financial_audit_logs_select_authorized" 
ON appointment_financial_audit_logs 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Check se usuário tem role de acesso
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'gestor', 'financeiro')
    OR
    -- Ou se tem acesso à clínica do atendimento
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.clinic_id = (
        SELECT clinic_id FROM appointments 
        WHERE id = appointment_financial_audit_logs.appointment_id
      )
    )
  )
);

-- Bloquear updates e deletes completamente
CREATE POLICY "appointment_financial_audit_logs_no_update" 
ON appointment_financial_audit_logs 
FOR UPDATE 
USING (FALSE);

CREATE POLICY "appointment_financial_audit_logs_no_delete" 
ON appointment_financial_audit_logs 
FOR DELETE 
USING (FALSE);

-- Função para garantir append-only (trigger preventivo)
CREATE OR REPLACE FUNCTION appointment_financial_audit_logs_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'appointment_financial_audit_logs é append-only: não permitido UPDATE';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'appointment_financial_audit_logs é append-only: não permitido DELETE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointment_financial_audit_logs_immutable_trigger
BEFORE UPDATE OR DELETE ON appointment_financial_audit_logs
FOR EACH ROW
EXECUTE FUNCTION appointment_financial_audit_logs_immutable();

-- Grants
GRANT SELECT ON appointment_financial_audit_logs TO authenticated;
GRANT INSERT ON appointment_financial_audit_logs TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
