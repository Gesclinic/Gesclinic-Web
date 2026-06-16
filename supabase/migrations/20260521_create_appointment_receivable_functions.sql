-- 20260521_create_appointment_receivable_functions.sql
-- Migration: Create automatic receivable generation functions and trigger

CREATE OR REPLACE FUNCTION create_receivable_from_appointment(
  p_appointment_id UUID,
  p_clinic_id UUID,
  p_rule_id BIGINT DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_appointment RECORD;
  v_receivable_id BIGINT;
  v_payer_name TEXT;
BEGIN
  SELECT * FROM appointments WHERE id = p_appointment_id INTO v_appointment;
  IF v_appointment IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Appointment not found');
  END IF;
  
  SELECT name FROM patients WHERE id = v_appointment.patient_id INTO v_payer_name;
  
  INSERT INTO ar_invoices (
    clinic_id, appointment_id, payer_id, payer_name, 
    valor_bruto, descontos, impostos, repasse_medico, valor_liquido,
    status, data_emissao, data_vencimento, origem, descricao,
    metodo_pagamento_default, created_at, updated_at
  )
  VALUES (
    p_clinic_id, p_appointment_id, v_appointment.patient_id, v_payer_name,
    v_appointment.value, 0, 0, 0, v_appointment.value,
    'pending', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 
    'Agenda', 'Faturamento automático', 'pix',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
  RETURNING id INTO v_receivable_id;
  
  RETURN jsonb_build_object('success', true, 'receivable_id', v_receivable_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
