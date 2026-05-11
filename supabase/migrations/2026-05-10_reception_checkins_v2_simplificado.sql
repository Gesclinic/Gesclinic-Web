-- ============================================================================
-- MIGRATION: Reception Checkins (SEM DEPENDÊNCIA DE user_clinic_roles)
-- ============================================================================
-- 
-- Versão simplificada que NÃO depende de user_clinic_roles
-- Funciona com a estrutura padrão do Supabase
--

-- ============================================================================
-- 1. TABELA: reception_checkins
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_reception_checkins_clinic_date 
ON reception_checkins(clinic_id, checked_in_at DESC);

-- ============================================================================
-- 3. VIEW: waiting_queue_view
-- ============================================================================

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
-- 4. ROW LEVEL SECURITY (RLS) - VERSÃO SIMPLIFICADA
-- ============================================================================
--
-- Se você tiver uma tabela de relacionamento usuário<->clínica,
-- substitua as políticas abaixo com a estrutura correta.
--
-- Por agora, usamos uma política básica que permite acesso.
-- VOCÊ DEVE AJUSTAR CONFORME SUA ESTRUTURA!

ALTER TABLE reception_checkins ENABLE ROW LEVEL SECURITY;

-- Política temporária: Qualquer usuário autenticado pode ver
-- SUBSTITUA COM POLÍTICA CORRETA APÓS DESCOBRIR ESTRUTURA
CREATE POLICY "reception_checkins_select" ON reception_checkins
  FOR SELECT USING (true);

-- Política: Criar check-in (usuário autenticado)
CREATE POLICY "reception_checkins_insert" ON reception_checkins
  FOR INSERT WITH CHECK (checked_in_by = auth.uid());

-- Política: Atualizar (qualquer um, por enquanto)
CREATE POLICY "reception_checkins_update" ON reception_checkins
  FOR UPDATE USING (true);

-- ============================================================================
-- 5. FUNÇÃO: Realizar Check-in
-- ============================================================================

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
  v_status TEXT;
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

ALTER PUBLICATION supabase_realtime ADD TABLE reception_checkins;

-- ============================================================================
-- ✅ MIGRATION CONCLUÍDA
-- ============================================================================
--
-- IMPORTANTE: As políticas RLS foram simplificadas
-- 
-- Se você tiver uma tabela de relacionamento usuário<->clínica, 
-- execute o script ⚡_SCRIPT_DESCOBRIR_ESTRUTURA_RLS.sql para descobrir
-- o nome correto e depois atualize as políticas.
--
-- ============================================================================
