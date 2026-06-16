-- ============================================================================
-- ETAPA D.1: Tabela de auditoria para histórico de taxas
-- ============================================================================
-- Criada em: 2026-06-08
-- Propósito: Rastrear todas as alterações de taxa de processamento
-- Inclui: Quem alterou, quando, valores antes/depois, motivo da alteração
-- ============================================================================

CREATE TABLE IF NOT EXISTS fee_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências principais
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  fee_id UUID REFERENCES card_processor_fees(id) ON DELETE CASCADE,
  
  -- Informações de alteração
  action VARCHAR(20) NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP DEFAULT NOW(),
  
  -- Valores antes e depois
  old_values JSONB,
  new_values JSONB NOT NULL,
  
  -- Contexto
  change_reason VARCHAR(500),
  ip_address VARCHAR(50),
  
  -- Constraints
  CONSTRAINT valid_action CHECK (action IN ('create', 'update', 'delete'))
);

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX idx_fee_audit_log_clinic_id 
  ON fee_audit_log(clinic_id);

CREATE INDEX idx_fee_audit_log_fee_id 
  ON fee_audit_log(fee_id);

CREATE INDEX idx_fee_audit_log_changed_at 
  ON fee_audit_log(changed_at DESC);

CREATE INDEX idx_fee_audit_log_action 
  ON fee_audit_log(action);

CREATE INDEX idx_fee_audit_log_clinic_changed 
  ON fee_audit_log(clinic_id, changed_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE fee_audit_log ENABLE ROW LEVEL SECURITY;

-- Usuários veem apenas auditoria de sua clínica
CREATE POLICY "Usuários veem auditoria de sua clínica"
  ON fee_audit_log
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles
      WHERE user_id = auth.uid()
    )
  );

-- Sistema (e usuários autenticados) pode gravar auditoria
CREATE POLICY "Sistema grava auditoria"
  ON fee_audit_log
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE fee_audit_log IS 'Histórico de auditoria para alterações de taxa de processamento';

COMMENT ON COLUMN fee_audit_log.id IS 'ID único do registro de auditoria';

COMMENT ON COLUMN fee_audit_log.clinic_id IS 'ID da clínica (isolamento de dados)';

COMMENT ON COLUMN fee_audit_log.fee_id IS 'ID da taxa de processamento alterada';

COMMENT ON COLUMN fee_audit_log.action IS 'Tipo de ação: create, update ou delete';

COMMENT ON COLUMN fee_audit_log.changed_by IS 'ID do usuário que fez a alteração';

COMMENT ON COLUMN fee_audit_log.changed_at IS 'Data e hora da alteração (UTC)';

COMMENT ON COLUMN fee_audit_log.old_values IS 'Valores anteriores em JSON (NULL para create)';

COMMENT ON COLUMN fee_audit_log.new_values IS 'Valores novos em JSON';

COMMENT ON COLUMN fee_audit_log.change_reason IS 'Motivo da alteração (opcional, fornecido pelo usuário)';

COMMENT ON COLUMN fee_audit_log.ip_address IS 'Endereço IP da requisição (para auditoria de segurança)';

-- ============================================================================
-- FUNÇÃO AUXILIAR: Contar alterações por período
-- ============================================================================

CREATE OR REPLACE FUNCTION count_fee_changes_by_period(
  p_clinic_id UUID,
  p_days INTEGER DEFAULT 30
) RETURNS TABLE (
  action_type VARCHAR,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    action,
    COUNT(*) as count
  FROM fee_audit_log
  WHERE clinic_id = p_clinic_id
    AND changed_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY action
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- FUNÇÃO AUXILIAR: Obter últimas alterações por taxa
-- ============================================================================

CREATE OR REPLACE FUNCTION get_fee_change_history(
  p_fee_id UUID,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  log_id UUID,
  action VARCHAR,
  changed_by UUID,
  changed_at TIMESTAMP,
  old_values JSONB,
  new_values JSONB,
  change_reason VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    fee_audit_log.action,
    fee_audit_log.changed_by,
    fee_audit_log.changed_at,
    fee_audit_log.old_values,
    fee_audit_log.new_values,
    fee_audit_log.change_reason
  FROM fee_audit_log
  WHERE fee_id = p_fee_id
  ORDER BY changed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- Conclusão D.1
-- ============================================================================
-- ✅ Tabela criada com:
--   - 3 colunas de referência (id, clinic_id, fee_id)
--   - 5 colunas de metadata (action, changed_by, changed_at, change_reason, ip_address)
--   - 2 colunas JSONB (old_values, new_values)
--   - 5 índices para performance
--   - 2 políticas RLS para segurança
--   - 2 funções auxiliares para queries comuns
--
-- Próximo: D.2 - Integrar logging em recordFeeChange()
-- ============================================================================
