-- ============================================
-- INDICADORES DA AGENDA
-- Views e Funções para cálculo de KPIs
-- ============================================

-- ============================================
-- 1. VIEW: Indicadores Operacionais por Dia
-- ============================================
CREATE OR REPLACE VIEW v_agenda_indicators_daily AS
WITH date_range AS (
  -- Pega o dia de hoje para a clínica
  SELECT 
    CURRENT_DATE as indicator_date,
    DATE_TRUNC('day', CURRENT_TIMESTAMP)::date as date_start,
    (DATE_TRUNC('day', CURRENT_TIMESTAMP) + INTERVAL '1 day')::date as date_end
),
appointments_data AS (
  SELECT 
    a.clinic_id,
    a.scheduled_date::date as appt_date,
    a.id,
    a.status,
    a.professional_id,
    a.room_id,
    a.value,
    s.price as service_price,
    dr.indicator_date
  FROM appointments a
  LEFT JOIN services s ON a.service_id = s.id
  CROSS JOIN date_range dr
  WHERE a.clinic_id IS NOT NULL
    AND a.scheduled_date::date >= dr.date_start
    AND a.scheduled_date::date < dr.date_end
),
slot_data AS (
  SELECT 
    a.clinic_id,
    a.appt_date,
    COUNT(*) as total_slots,
    COUNT(CASE WHEN a.status IN ('confirmado', 'liberado_para_atendimento', 'em_atendimento', 'finalizado') THEN 1 END) as slots_ocupados,
    COUNT(CASE WHEN a.status IN ('a_confirmar', 'aguardando') THEN 1 END) as slots_pendentes,
    COUNT(CASE WHEN a.status IS NULL OR a.status NOT IN ('confirmado', 'liberado_para_atendimento', 'em_atendimento', 'finalizado', 'a_confirmar', 'aguardando', 'cancelado', 'falta') THEN 1 END) as slots_livres
  FROM appointments_data a
  GROUP BY a.clinic_id, a.appt_date
),
appointment_stats AS (
  SELECT 
    a.clinic_id,
    a.appt_date,
    COUNT(*) as total_agendamentos,
    COUNT(CASE WHEN a.status = 'confirmado' THEN 1 END) as confirmados,
    COUNT(CASE WHEN a.status = 'falta' THEN 1 END) as faltas,
    COUNT(CASE WHEN a.status = 'encaixe' OR a.status LIKE '%encaixe%' THEN 1 END) as encaixes,
    COUNT(DISTINCT a.professional_id) as profissionais_ativos,
    COALESCE(SUM(COALESCE(a.value, a.service_price)), 0) as receita_estimada
  FROM appointments_data a
  GROUP BY a.clinic_id, a.appt_date
),
combined AS (
  SELECT 
    s.clinic_id,
    s.appt_date as indicator_date,
    s.total_slots,
    s.slots_ocupados,
    s.slots_pendentes,
    s.slots_livres,
    ROUND(
      CASE 
        WHEN s.total_slots > 0 THEN (s.slots_ocupados::numeric / s.total_slots::numeric * 100)
        ELSE 0
      END, 2
    ) as taxa_ocupacao_percent,
    a.total_agendamentos,
    a.confirmados,
    a.faltas,
    a.encaixes,
    a.profissionais_ativos,
    a.receita_estimada
  FROM slot_data s
  LEFT JOIN appointment_stats a ON s.clinic_id = a.clinic_id AND s.appt_date = a.appt_date
)
SELECT 
  clinic_id,
  indicator_date,
  total_slots,
  slots_ocupados,
  slots_pendentes,
  slots_livres,
  taxa_ocupacao_percent,
  COALESCE(total_agendamentos, 0) as total_agendamentos,
  COALESCE(confirmados, 0) as confirmados,
  COALESCE(faltas, 0) as faltas,
  COALESCE(encaixes, 0) as encaixes,
  COALESCE(profissionais_ativos, 0) as profissionais_ativos,
  COALESCE(receita_estimada, 0) as receita_estimada,
  NOW() as calculated_at
FROM combined
WHERE clinic_id IS NOT NULL;

-- ============================================
-- 2. VIEW: Indicadores de Tempo (baseado em auditoria)
-- ============================================
CREATE OR REPLACE VIEW v_agenda_time_indicators AS
WITH audit_data AS (
  SELECT 
    aal.appointment_id,
    a.clinic_id,
    a.professional_id,
    a.scheduled_date::date as appt_date,
    -- Tempo de agendamento até check-in
    (
      SELECT EXTRACT(EPOCH FROM (MAX(CASE WHEN action_type = 'CHECKIN_STARTED' THEN performed_at END) - 
                                          MIN(CASE WHEN action_type = 'APPOINTMENT_CREATED' THEN performed_at END)))
      FROM appointment_audit_logs
      WHERE appointment_id = aal.appointment_id
    ) as time_agendamento_checkin_seconds,
    -- Tempo de check-in até atendimento
    (
      SELECT EXTRACT(EPOCH FROM (MAX(CASE WHEN action_type = 'ATTENDANCE_STARTED' THEN performed_at END) - 
                                          MAX(CASE WHEN action_type = 'CHECKIN_STARTED' THEN performed_at END)))
      FROM appointment_audit_logs
      WHERE appointment_id = aal.appointment_id
    ) as time_checkin_atendimento_seconds
  FROM appointment_audit_logs aal
  LEFT JOIN appointments a ON aal.appointment_id = a.id
  WHERE a.scheduled_date::date = CURRENT_DATE
  GROUP BY aal.appointment_id, a.clinic_id, a.professional_id, a.scheduled_date
)
SELECT 
  clinic_id,
  professional_id,
  appt_date as indicator_date,
  ROUND(AVG(time_agendamento_checkin_seconds)::numeric / 60, 1) as tempo_medio_agendamento_checkin_minutos,
  ROUND(AVG(time_checkin_atendimento_seconds)::numeric / 60, 1) as tempo_medio_checkin_atendimento_minutos,
  NOW() as calculated_at
FROM audit_data
WHERE clinic_id IS NOT NULL
GROUP BY clinic_id, professional_id, appt_date;

-- ============================================
-- 3. VIEW: Indicadores Financeiros
-- ============================================
CREATE OR REPLACE VIEW v_agenda_financial_indicators AS
WITH financial_data AS (
  SELECT 
    a.clinic_id,
    a.scheduled_date::date as appt_date,
    a.scheduled_date::time as appt_time,
    EXTRACT(HOUR FROM a.scheduled_date::timestamp) as hour_of_day,
    COALESCE(a.value, s.price, 0) as appointment_value
  FROM appointments a
  LEFT JOIN services s ON a.service_id = s.id
  WHERE a.scheduled_date::date >= CURRENT_DATE
    AND a.scheduled_date::date <= (CURRENT_DATE + INTERVAL '30 days')
    AND a.status IN ('confirmado', 'liberado_para_atendimento', 'em_atendimento', 'finalizado')
)
SELECT 
  clinic_id,
  appt_date as indicator_date,
  ROUND(SUM(appointment_value)::numeric, 2) as receita_estimada_dia,
  ROUND(
    CASE 
      WHEN COUNT(*) > 0 THEN SUM(appointment_value)::numeric / (
        SELECT COUNT(DISTINCT hour_of_day) 
        FROM financial_data 
        WHERE clinic_id = fd.clinic_id 
          AND appt_date = fd.appt_date
      )
      ELSE 0
    END, 2
  ) as receita_estimada_por_hora,
  -- Meta padrão (pode vir de configuração da clínica depois)
  COALESCE(
    (SELECT CAST(settings->>'daily_revenue_target' AS NUMERIC) FROM clinics WHERE id = clinic_id),
    5000.00
  ) as meta_dia,
  NOW() as calculated_at
FROM financial_data fd
GROUP BY clinic_id, appt_date;

-- ============================================
-- 4. FUNÇÃO RPC: Indicadores Consolidados por Data
-- ============================================
CREATE OR REPLACE FUNCTION get_agenda_indicators(
  p_clinic_id UUID,
  p_date DATE DEFAULT CURRENT_DATE,
  p_professional_id UUID DEFAULT NULL
)
RETURNS TABLE (
  indicator_date DATE,
  total_slots BIGINT,
  slots_ocupados BIGINT,
  slots_pendentes BIGINT,
  slots_livres BIGINT,
  taxa_ocupacao_percent NUMERIC,
  total_agendamentos BIGINT,
  confirmados BIGINT,
  faltas BIGINT,
  encaixes BIGINT,
  profissionais_ativos BIGINT,
  receita_estimada NUMERIC,
  receita_por_hora NUMERIC,
  meta_dia NUMERIC,
  percentual_meta_atingida NUMERIC,
  tempo_medio_checkin_minutos NUMERIC,
  status TEXT
) AS $$
WITH operational AS (
  SELECT 
    vaid.clinic_id,
    vaid.indicator_date,
    vaid.total_slots,
    vaid.slots_ocupados,
    vaid.slots_pendentes,
    vaid.slots_livres,
    vaid.taxa_ocupacao_percent,
    vaid.total_agendamentos,
    vaid.confirmados,
    vaid.faltas,
    vaid.encaixes,
    vaid.profissionais_ativos,
    vaid.receita_estimada
  FROM v_agenda_indicators_daily vaid
  WHERE vaid.clinic_id = p_clinic_id
    AND vaid.indicator_date = p_date
),
financial AS (
  SELECT 
    vafi.clinic_id,
    vafi.indicator_date,
    vafi.receita_estimada_por_hora,
    vafi.meta_dia
  FROM v_agenda_financial_indicators vafi
  WHERE vafi.clinic_id = p_clinic_id
    AND vafi.indicator_date = p_date
),
timing AS (
  SELECT 
    vati.clinic_id,
    vati.indicator_date,
    COALESCE(AVG(vati.tempo_medio_checkin_atendimento_minutos), 0) as avg_checkin_time
  FROM v_agenda_time_indicators vati
  WHERE vati.clinic_id = p_clinic_id
    AND vati.indicator_date = p_date
    AND (p_professional_id IS NULL OR vati.professional_id = p_professional_id)
  GROUP BY vati.clinic_id, vati.indicator_date
)
SELECT 
  o.indicator_date,
  o.total_slots,
  o.slots_ocupados,
  o.slots_pendentes,
  o.slots_livres,
  o.taxa_ocupacao_percent,
  o.total_agendamentos,
  o.confirmados,
  o.faltas,
  o.encaixes,
  o.profissionais_ativos,
  o.receita_estimada,
  COALESCE(f.receita_estimada_por_hora, 0),
  f.meta_dia,
  ROUND(
    CASE 
      WHEN f.meta_dia > 0 THEN (o.receita_estimada / f.meta_dia * 100)
      ELSE 0
    END, 2
  ),
  COALESCE(t.avg_checkin_time, 0),
  CASE 
    WHEN o.taxa_ocupacao_percent >= 80 THEN 'saudável'
    WHEN o.taxa_ocupacao_percent >= 40 THEN 'normal'
    ELSE 'crítico'
  END as status
FROM operational o
LEFT JOIN financial f ON o.clinic_id = f.clinic_id AND o.indicator_date = f.indicator_date
LEFT JOIN timing t ON o.clinic_id = t.clinic_id AND o.indicator_date = t.indicator_date;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- 5. FUNÇÃO RPC: Indicadores por Profissional
-- ============================================
CREATE OR REPLACE FUNCTION get_professional_indicators(
  p_clinic_id UUID,
  p_professional_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  professional_id UUID,
  professional_name TEXT,
  agendamentos_dia BIGINT,
  confirmados BIGINT,
  finalizado BIGINT,
  faltas BIGINT,
  tempo_medio_atendimento_minutos NUMERIC,
  receita_estimada NUMERIC,
  status TEXT
) AS $$
WITH prof_data AS (
  SELECT 
    a.professional_id,
    p.name as professional_name,
    COUNT(*) as total_appts,
    COUNT(CASE WHEN a.status = 'confirmado' THEN 1 END) as confirmados,
    COUNT(CASE WHEN a.status = 'finalizado' THEN 1 END) as finalizado,
    COUNT(CASE WHEN a.status = 'falta' THEN 1 END) as faltas,
    COALESCE(AVG(EXTRACT(EPOCH FROM (a.end_time - a.start_time)) / 60), 0) as avg_duration,
    COALESCE(SUM(COALESCE(a.value, s.price)), 0) as revenue
  FROM appointments a
  LEFT JOIN professionals p ON a.professional_id = p.id
  LEFT JOIN services s ON a.service_id = s.id
  WHERE a.clinic_id = p_clinic_id
    AND a.professional_id = p_professional_id
    AND a.scheduled_date::date = p_date
  GROUP BY a.professional_id, p.name
)
SELECT 
  pd.professional_id,
  pd.professional_name,
  pd.total_appts,
  pd.confirmados,
  pd.finalizado,
  pd.faltas,
  ROUND(pd.avg_duration::numeric, 1),
  pd.revenue,
  CASE 
    WHEN pd.total_appts >= 8 THEN 'produtivo'
    WHEN pd.total_appts >= 4 THEN 'normal'
    ELSE 'baixa_ocupacao'
  END
FROM prof_data pd;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- 6. Índices para Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date 
  ON appointments(clinic_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_appointments_status 
  ON appointments(status) 
  WHERE status IN ('confirmado', 'liberado_para_atendimento', 'finalizado', 'falta');

CREATE INDEX IF NOT EXISTS idx_appointment_audit_logs_action_date 
  ON appointment_audit_logs(action_type, performed_at DESC);

-- ============================================
-- 7. Comentários para Documentação
-- ============================================
COMMENT ON VIEW v_agenda_indicators_daily IS 'Indicadores operacionais da agenda por dia e clínica';
COMMENT ON VIEW v_agenda_time_indicators IS 'Indicadores de tempo de atendimento baseado em auditoria';
COMMENT ON VIEW v_agenda_financial_indicators IS 'Indicadores financeiros e de receita estimada';
COMMENT ON FUNCTION get_agenda_indicators IS 'Retorna indicadores consolidados da agenda para um dia específico';
COMMENT ON FUNCTION get_professional_indicators IS 'Retorna indicadores específicos de um profissional em um dia';
