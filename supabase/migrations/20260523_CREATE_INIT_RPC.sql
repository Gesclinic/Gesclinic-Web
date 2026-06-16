-- ============================================================================
-- CRIAR FUNÇÃO RPC PARA INICIALIZAR ALERT CONFIGS
-- ============================================================================
-- Esta função pode ser chamada por usuários autenticados e insere os dados
-- com permissões de superusuário (SECURITY DEFINER)

CREATE OR REPLACE FUNCTION public.initialize_alert_configs(p_clinic_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, configs_count INT) AS $$
DECLARE
  v_configs_count INT := 0;
BEGIN
  -- Verificar se já existem configurações
  SELECT COUNT(*) INTO v_configs_count
  FROM alert_configs
  WHERE clinic_id = p_clinic_id;

  -- Se já existem, retornar
  IF v_configs_count > 0 THEN
    RETURN QUERY SELECT TRUE::BOOLEAN, 'Configurações já existem'::TEXT, v_configs_count::INT;
    RETURN;
  END IF;

  -- Inserir configurações padrão
  INSERT INTO alert_configs (
    clinic_id, 
    alert_type, 
    is_enabled, 
    severity_level, 
    check_frequency, 
    notify_channels, 
    email_recipients, 
    threshold_value
  ) VALUES
    (p_clinic_id, 'DELINQUENCY', TRUE, 'HIGH', 'DAILY', 
     '{"email": true, "sms": false, "push": true, "dashboard": true}'::jsonb, 
     ARRAY['admin@clinica.com'], 5),
    (p_clinic_id, 'REPAYMENT_LATE', TRUE, 'CRITICAL', 'DAILY', 
     '{"email": true, "sms": false, "push": true, "dashboard": true}'::jsonb, 
     ARRAY['admin@clinica.com'], 48),
    (p_clinic_id, 'LOW_CASHFLOW', TRUE, 'HIGH', 'DAILY', 
     '{"email": true, "sms": false, "push": true, "dashboard": true}'::jsonb, 
     ARRAY['admin@clinica.com'], 10),
    (p_clinic_id, 'COLLECTION_LOW', TRUE, 'MEDIUM', 'DAILY', 
     '{"email": true, "sms": false, "push": true, "dashboard": true}'::jsonb, 
     ARRAY['admin@clinica.com'], 25)
  ON CONFLICT (clinic_id, alert_type) DO NOTHING;

  -- Contar configurações inseridas
  SELECT COUNT(*) INTO v_configs_count
  FROM alert_configs
  WHERE clinic_id = p_clinic_id;

  RETURN QUERY SELECT TRUE::BOOLEAN, 'Configurações inicializadas com sucesso'::TEXT, v_configs_count::INT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.initialize_alert_configs(UUID) TO authenticated;
