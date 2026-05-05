-- filepath: supabase/migrations/20260423_add_concurrent_update_function.sql
-- Implementar controle de concorrência (Optimistic Locking) para agendamentos
-- Evita que múltiplos usuários sobrescrevam dados uns dos outros

BEGIN;

-- ============================================================
-- 1. CRIAR FUNÇÃO RPC PARA ATUALIZAR COM VALIDAÇÃO
-- ============================================================

CREATE OR REPLACE FUNCTION update_appointment_safe(
  p_appointment_id UUID,
  p_updated_at TIMESTAMP WITH TIME ZONE,
  p_payload JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_current_updated_at TIMESTAMP WITH TIME ZONE;
  v_result JSONB;
BEGIN
  -- Buscar updated_at atual do registro
  SELECT updated_at INTO v_current_updated_at
  FROM appointments
  WHERE id = p_appointment_id
  FOR UPDATE; -- Lock para evitar race condition

  -- Validar: se updated_at no payload é diferente do BD, é conflito!
  IF v_current_updated_at IS NOT NULL AND v_current_updated_at != p_updated_at THEN
    -- Retornar erro de conflito
    RETURN jsonb_build_object(
      'success', false,
      'error', 'conflict_detected',
      'message', 'Este agendamento foi atualizado por outro usuário',
      'current_updated_at', v_current_updated_at,
      'expected_updated_at', p_updated_at
    );
  END IF;

  -- Se passou na validação, fazer update seguro
  UPDATE appointments
  SET 
    patient_id = COALESCE((p_payload->>'patient_id')::UUID, patient_id),
    professional_id = COALESCE((p_payload->>'professional_id')::UUID, professional_id),
    service_id = COALESCE((p_payload->>'service_id')::UUID, service_id),
    room_id = COALESCE((p_payload->>'room_id')::UUID, room_id),
    start_time = COALESCE((p_payload->>'start_time')::TIMESTAMP WITH TIME ZONE, start_time),
    end_time = COALESCE((p_payload->>'end_time')::TIMESTAMP WITH TIME ZONE, end_time),
    status = COALESCE((p_payload->>'status'), status),
    notes = COALESCE((p_payload->>'notes'), notes),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_appointment_id;

  -- Retornar sucesso com novo updated_at
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Agendamento atualizado com sucesso',
    'updated_at', CURRENT_TIMESTAMP
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'internal_error',
    'message', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. GRANT EXECUTE PARA USUÁRIOS AUTENTICADOS
-- ============================================================

GRANT EXECUTE ON FUNCTION update_appointment_safe(UUID, TIMESTAMP WITH TIME ZONE, JSONB) 
  TO authenticated;

-- ============================================================
-- 3. CRIAR ÍNDICE PARA PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_appointments_updated_at 
  ON appointments(updated_at DESC);

COMMIT;
