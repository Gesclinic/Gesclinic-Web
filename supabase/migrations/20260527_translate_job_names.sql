-- Atualizar nomes das tarefas agendadas para português
UPDATE scheduled_jobs SET job_name = 'verificar_alertas_a_cada_15min' WHERE job_name = 'check_alerts_every_15min';
UPDATE scheduled_jobs SET job_name = 'processar_emails_a_cada_5min' WHERE job_name = 'process_emails_every_5min';
UPDATE scheduled_jobs SET job_name = 'processar_webhooks_a_cada_10min' WHERE job_name = 'process_webhooks_every_10min';
UPDATE scheduled_jobs SET job_name = 'processar_sms_a_cada_5min' WHERE job_name = 'process_sms_every_5min';
UPDATE scheduled_jobs SET job_name = 'resolver_alertas_automaticamente_diariamente' WHERE job_name = 'auto_resolve_alerts_daily';

-- Verificar atualização
SELECT id, job_name, job_type, cron_expression FROM scheduled_jobs ORDER BY job_name;
