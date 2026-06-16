-- ============================================================================
-- INSERIR CONFIGURAÇÕES DE ALERTAS PARA CLÍNICAS EXISTENTES
-- ============================================================================

-- Verificar se a tabela existe
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'alert_configs'
  ) THEN
    -- Deletar configurações antigos para evitar duplicatas (se houver)
    DELETE FROM alert_configs 
    WHERE clinic_id IN (
      SELECT id FROM clinics WHERE name LIKE '%Neuroclinica%' OR name LIKE '%Gesclinic%'
    );

    -- Inserir configurações padrão para TODAS as clínicas
    INSERT INTO alert_configs (
      clinic_id, 
      alert_type, 
      is_enabled, 
      severity_level, 
      check_frequency, 
      notify_channels, 
      email_recipients, 
      threshold_value
    )
    SELECT 
      c.id,
      defaults.alert_type,
      TRUE,
      defaults.severity,
      'DAILY'::VARCHAR,
      '{"email": true, "sms": false, "push": true, "dashboard": true}'::jsonb,
      ARRAY['admin@clinica.com', COALESCE(c.email, 'noreply@clinica.com')],
      defaults.threshold_val
    FROM clinics c
    CROSS JOIN (
      VALUES
        ('DELINQUENCY'::VARCHAR, 'HIGH'::VARCHAR, 5::NUMERIC),
        ('REPAYMENT_LATE'::VARCHAR, 'CRITICAL'::VARCHAR, 48::NUMERIC),
        ('LOW_CASHFLOW'::VARCHAR, 'HIGH'::VARCHAR, 10::NUMERIC),
        ('COLLECTION_LOW'::VARCHAR, 'MEDIUM'::VARCHAR, 25::NUMERIC)
    ) AS defaults(alert_type, severity, threshold_val)
    ON CONFLICT (clinic_id, alert_type) DO NOTHING;

    RAISE NOTICE 'Configurações de alertas inseridas com sucesso!';
  ELSE
    RAISE EXCEPTION 'Tabela alert_configs não encontrada. Verifique se a migration ETAPA8 foi executada!';
  END IF;
END $$;
