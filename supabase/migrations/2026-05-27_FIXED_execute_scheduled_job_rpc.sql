-- 🔧 FIXED RPC - Execute this in Supabase SQL Editor
-- Instructions: Copy entire content, paste in SQL editor, click Run (or Ctrl+Enter)

CREATE OR REPLACE FUNCTION execute_scheduled_job(p_job_id UUID) RETURNS JSONB AS $func$
DECLARE 
  v_job_record RECORD; 
  v_job_type TEXT; 
  v_result JSONB; 
  v_rows INT := 0;
BEGIN
  -- Get job details
  SELECT id, job_name, job_type, clinic_id INTO v_job_record 
  FROM scheduled_jobs WHERE id = p_job_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Job not found');
  END IF;
  
  v_job_type := v_job_record.job_type;
  
  -- Execute based on job type
  CASE v_job_type
    WHEN 'email_process' THEN
      -- Insert pending emails into queue
      INSERT INTO email_queue (clinic_id, to_email, to_name, subject, body, html_body, status, scheduled_job_id, metadata)
      SELECT 
        v_job_record.clinic_id, 
        users.email, 
        users.full_name, 
        'Alerta: Ação Necessária', 
        'Você tem alertas pendentes que requerem atenção.',
        '<p>Você tem <strong>alertas pendentes</strong> que requerem atenção.</p>',
        'pending', 
        p_job_id, 
        jsonb_build_object('alert_count', 0)
      FROM users 
      WHERE users.clinic_id = v_job_record.clinic_id 
      AND users.email IS NOT NULL 
      LIMIT 10;
      
      -- Get count of inserted rows
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      
      -- Return result with queue count
      v_result := jsonb_build_object(
        'status', 'success', 
        'type', 'email_process', 
        'emails_queued', v_rows, 
        'executed_at', NOW()
      );
      
    ELSE
      -- Other job types
      v_result := jsonb_build_object('status', 'success', 'type', v_job_type);
  END CASE;
  
  -- Log the execution
  INSERT INTO job_runs (scheduled_job_id, status, started_at, completed_at, result)
  VALUES (p_job_id, 'success', NOW(), NOW(), v_result)
  ON CONFLICT (scheduled_job_id) DO UPDATE
  SET status = 'success', completed_at = NOW(), result = v_result
  WHERE job_runs.scheduled_job_id = p_job_id;
  
  -- Update job status
  UPDATE scheduled_jobs 
  SET last_execution = NOW(), last_status = 'success' 
  WHERE id = p_job_id;
  
  RETURN v_result;
  
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error', 
      'message', SQLERRM, 
      'executed_at', NOW()
    );
END;
$func$ LANGUAGE plpgsql;
