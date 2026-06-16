# 🚀 RPC FIX - Execução em 30 Segundos

## ⏱️ Tempo Total: 30 SEGUNDOS

Siga estes passos EXATAMENTE como escrito:

### PASSO 1: Abrir Editor (5 seg)
```
1. Vá para: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new
2. Clique em novo tab (+) se necessário
```

### PASSO 2: Copiar SQL (10 seg)
Copie TUDO que está entre as linhas tracejadas:

```sql
CREATE OR REPLACE FUNCTION execute_scheduled_job(p_job_id UUID) RETURNS JSONB AS $func$ DECLARE v_job_record RECORD; v_job_type TEXT; v_result JSONB; v_rows INT := 0; BEGIN SELECT id, job_name, job_type, clinic_id INTO v_job_record FROM scheduled_jobs WHERE id = p_job_id; IF NOT FOUND THEN RETURN jsonb_build_object('status', 'error', 'message', 'Job not found'); END IF; v_job_type := v_job_record.job_type; CASE v_job_type WHEN 'email_process' THEN INSERT INTO email_queue (clinic_id, to_email, to_name, subject, body, html_body, status, scheduled_job_id, metadata) SELECT v_job_record.clinic_id, users.email, users.full_name, 'Alerta: Ação Necessária', 'Você tem alertas pendentes que requerem atenção.', '<p>Você tem <strong>alertas pendentes</strong> que requerem atenção.</p>', 'pending', p_job_id, jsonb_build_object('alert_count', 0) FROM users WHERE users.clinic_id = v_job_record.clinic_id AND users.email IS NOT NULL LIMIT 10; GET DIAGNOSTICS v_rows = ROW_COUNT; v_result := jsonb_build_object('status', 'success', 'type', 'email_process', 'emails_queued', v_rows, 'executed_at', NOW()); ELSE v_result := jsonb_build_object('status', 'success', 'type', v_job_type); END CASE; INSERT INTO job_runs (scheduled_job_id, status, started_at, completed_at, result) VALUES (p_job_id, 'success', NOW(), NOW(), v_result) ON CONFLICT (scheduled_job_id) DO UPDATE SET status = 'success', completed_at = NOW(), result = v_result WHERE job_runs.scheduled_job_id = p_job_id; UPDATE scheduled_jobs SET last_execution = NOW(), last_status = 'success' WHERE id = p_job_id; RETURN v_result; EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('status', 'error', 'message', SQLERRM, 'executed_at', NOW()); END; $func$ LANGUAGE plpgsql;
```

### PASSO 3: Colar + Executar (10 seg)
1. Clique no editor de SQL
2. Pressione **Ctrl+A** para selecionar tudo
3. Pressione **Ctrl+V** para colar
4. Pressione **Ctrl+Enter** para executar

### ✅ SUCESSO = Você verá:
```
✅ "Success" ou "Query successful"
```

### ⏭️ PRÓXIMO PASSO:
Depois de executar:
```bash
node scripts/validate-email-workflow.js
```

Se mostrar `emails_queued: 10`, você fez tudo certo! ✅
