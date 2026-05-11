-- ============================================================================
-- MIGRATION: Reception Checkins Table + Views
-- ============================================================================
-- 
-- Criação da infraestrutura de recepção para rastreamento de check-in
-- e fila de espera com suporte a realtime.
--
-- Tabelas:
--   - reception_checkins: Registro de cada check-in
--
-- Views:
--   - waiting_queue_view: Fila de espera em tempo real
--
-- ============================================================================

-- ============================================================================
-- 1. TABELA: reception_checkins
-- ============================================================================
-- 
-- Armazena cada check-in de paciente na recepção
-- Um registro por agendamento (unique constraint)

CREATE TABLE IF NOT EXISTS reception_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  checked_in_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Um check-in por agendamento
  UNIQUE(appointment_id)
);

-- ============================================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_reception_checkins_clinic_id 
ON reception_checkins(clinic_id);

CREATE INDEX IF NOT EXISTS idx_reception_checkins_appointment_id 
ON reception_checkins(appointment_id);

-- Índice principal para fila: clinic + data (DESC para mais recentes)
CREATE INDEX IF NOT EXISTS idx_reception_checkins_clinic_date 
ON reception_checkins(clinic_id, checked_in_at DESC);

-- ============================================================================
-- 3. VIEW: waiting_queue_view
-- ============================================================================
--
-- Mostra fila de espera em tempo real
-- Inclui cálculo de tempo de espera

CREATE OR REPLACE VIEW waiting_queue_view AS
SELECT 
  a.id as appointment_id,
  a.clinic_id,
  a.patient_id,
  a.professional_id,
  a.room_id,
  a.scheduled_date,
  a.official_status,
  rc.id as checkin_id,
  rc.checked_in_at,
  rc.checked_in_by,
  EXTRACT(EPOCH FROM (NOW() - rc.checked_in_at))::INTEGER as tempo_espera_segundos,
  FLOOR(EXTRACT(EPOCH FROM (NOW() - rc.checked_in_at)) / 60)::INTEGER as tempo_espera_minutos,
  CASE 
    WHEN FLOOR(EXTRACT(EPOCH FROM (NOW() - rc.checked_in_at)) / 60)::INTEGER > 30 THEN 'critical'
    WHEN FLOOR(EXTRACT(EPOCH FROM (NOW() - rc.checked_in_at)) / 60)::INTEGER > 15 THEN 'warning'
    ELSE 'normal'
  END as wait_priority
FROM appointments a
INNER JOIN reception_checkins rc ON a.id = rc.appointment_id
WHERE a.official_status IN ('checked_in', 'waiting')
ORDER BY rc.checked_in_at ASC;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE reception_checkins ENABLE ROW LEVEL SECURITY;

-- Política: Visualizar check-ins da sua clínica
CREATE POLICY "users_view_reception_checkins_own_clinic" ON reception_checkins
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Criar check-in na sua clínica
CREATE POLICY "users_create_reception_checkins" ON reception_checkins
  FOR INSERT WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid()
    )
    AND checked_in_by = auth.uid()
  );

-- Política: Atualizar próprio check-in
CREATE POLICY "users_update_own_reception_checkins" ON reception_checkins
  FOR UPDATE USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. FUNÇÃO: Realizar Check-in
-- ============================================================================
--
-- Função segura para fazer check-in
-- Valida que agendamento está em status 'confirmed'
-- Impede duplicatas

CREATE OR REPLACE FUNCTION perform_checkin(
  p_appointment_id UUID,
  p_clinic_id UUID,
  p_checked_in_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  checkin_id UUID,
  message TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_status appointment_official_status;
  v_existing_checkin UUID;
BEGIN
  -- Validar que agendamento existe e está em status correto
  SELECT official_status INTO v_status
  FROM appointments
  WHERE id = p_appointment_id AND clinic_id = p_clinic_id;
  
  IF v_status IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Agendamento não encontrado'::TEXT;
    RETURN;
  END IF;
  
  IF v_status != 'confirmed' THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 
      'Agendamento deve estar em status "Confirmado" para fazer check-in'::TEXT;
    RETURN;
  END IF;
  
  -- Validar que não existe check-in anterior
  SELECT id INTO v_existing_checkin
  FROM reception_checkins
  WHERE appointment_id = p_appointment_id;
  
  IF v_existing_checkin IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 
      'Agendamento já tem check-in registrado'::TEXT;
    RETURN;
  END IF;
  
  -- Criar check-in
  INSERT INTO reception_checkins (
    appointment_id,
    clinic_id,
    checked_in_by,
    notes
  ) VALUES (
    p_appointment_id,
    p_clinic_id,
    p_checked_in_by,
    p_notes
  )
  RETURNING id INTO v_existing_checkin;
  
  -- Atualizar status do agendamento para 'checked_in'
  UPDATE appointments
  SET official_status = 'checked_in'
  WHERE id = p_appointment_id;
  
  -- Retornar sucesso
  RETURN QUERY SELECT TRUE, v_existing_checkin, 
    'Check-in realizado com sucesso'::TEXT;
END;
$$;

-- ============================================================================
-- 6. TRIGGERS: Atualizar updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_reception_checkins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reception_checkins_updated_at ON reception_checkins;
CREATE TRIGGER trigger_reception_checkins_updated_at
BEFORE UPDATE ON reception_checkins
FOR EACH ROW
EXECUTE FUNCTION update_reception_checkins_updated_at();

-- ============================================================================
-- 7. REALTIME: Habilitar publicação
-- ============================================================================

-- Habilitar realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE reception_checkins;

-- ============================================================================
-- ✅ MIGRATION CONCLUÍDA
-- ============================================================================
--
-- O que foi criado:
-- 1. ✅ Tabela reception_checkins com validações
-- 2. ✅ 3 índices para performance
-- 3. ✅ View waiting_queue_view com cálculos em tempo real
-- 4. ✅ RLS policies para segurança
-- 5. ✅ Função perform_checkin com lógica de negócio
-- 6. ✅ Trigger para updated_at
-- 7. ✅ Realtime habilitado
--
-- Próximos passos:
-- 1. Execute esta migration no Supabase
-- 2. Valide com: SELECT * FROM waiting_queue_view;
-- 3. Implemente os componentes React (TypeScript types)
-- 4. Teste o fluxo completo
--
-- ============================================================================
-- ROLLBACK (se necessário):
-- ============================================================================
--
-- ALTER PUBLICATION supabase_realtime DROP TABLE reception_checkins;
-- DROP TRIGGER IF EXISTS trigger_reception_checkins_updated_at ON reception_checkins;
-- DROP FUNCTION IF EXISTS update_reception_checkins_updated_at();
-- DROP FUNCTION IF EXISTS perform_checkin(UUID, UUID, UUID, TEXT);
-- DROP VIEW IF EXISTS waiting_queue_view;
-- DROP TABLE IF EXISTS reception_checkins;
--
-- ============================================================================
