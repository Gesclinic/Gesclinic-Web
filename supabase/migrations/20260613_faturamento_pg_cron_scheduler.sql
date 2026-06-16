-- Faturamento Enterprise: disparo automatico via pg_cron.
-- Idempotente: recria os agendamentos para evitar duplicidade ou cron antigo.

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  v_jobid BIGINT;
BEGIN
  FOR v_jobid IN
    SELECT jobid
    FROM cron.job
    WHERE jobname IN (
      'gesclinic_faturamento_validar_guias_01h',
      'gesclinic_faturamento_gerar_lotes_02h',
      'gesclinic_faturamento_enviar_xml_03h',
      'gesclinic_faturamento_consultar_retornos_04h',
      'gesclinic_faturamento_atualizar_recebiveis_05h'
    )
  LOOP
    PERFORM cron.unschedule(v_jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'gesclinic_faturamento_validar_guias_01h',
  '0 1 * * *',
  $$SELECT public.execute_faturamento_scheduled_job('faturamento_validar_guias_01h');$$
);

SELECT cron.schedule(
  'gesclinic_faturamento_gerar_lotes_02h',
  '0 2 * * *',
  $$SELECT public.execute_faturamento_scheduled_job('faturamento_gerar_lotes_02h');$$
);

SELECT cron.schedule(
  'gesclinic_faturamento_enviar_xml_03h',
  '0 3 * * *',
  $$SELECT public.execute_faturamento_scheduled_job('faturamento_enviar_xml_03h');$$
);

SELECT cron.schedule(
  'gesclinic_faturamento_consultar_retornos_04h',
  '0 4 * * *',
  $$SELECT public.execute_faturamento_scheduled_job('faturamento_consultar_retornos_04h');$$
);

SELECT cron.schedule(
  'gesclinic_faturamento_atualizar_recebiveis_05h',
  '0 5 * * *',
  $$SELECT public.execute_faturamento_scheduled_job('faturamento_atualizar_recebiveis_05h');$$
);