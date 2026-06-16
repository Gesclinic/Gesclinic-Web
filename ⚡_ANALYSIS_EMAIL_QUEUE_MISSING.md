# 📋 ANÁLISE - Validação End-to-End Email

## 🔴 Problema Encontrado

### Issue 1: RPC execute_scheduled_job não dispara Edge Function
**Status:** BLOQUEADOR

#### Código Atual (Incompleto):
```sql
WHEN 'email_process' THEN
  -- Chamar Edge Function para processar emails
  v_result := jsonb_build_object('status', 'success', 'emails_processed', TRUE);
```

**Problema:** Apenas simula sucesso, não executa nada!

#### O que Deveria Fazer:
1. ✅ Executado: Insere registro em `job_runs` ✅
2. ✅ Executado: Atualiza `scheduled_jobs` stats ✅
3. ❌ NÃO EXECUTADO: Deveria chamar Edge Function
4. ❌ NÃO EXECUTADO: Deveria popular `email_queue` ou similar

---

### Issue 2: Tabela email_queue não existe
**Status:** CRÍTICA

- Executado: `SELECT * FROM information_schema.tables WHERE table_name LIKE '%email%'`
- Resultado: **0 rows** - Nenhuma tabela email encontrada
- Implicação: Não há lugar para armazenar fila de emails

---

## ✅ Soluções Necessárias

### Solução 1: Criar Email Queue Table
```sql
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  html_body TEXT,
  status TEXT DEFAULT 'pending',  -- pending, processing, sent, failed
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  scheduled_job_id UUID REFERENCES scheduled_jobs(id)
);

-- Create index for performance
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_created ON email_queue(created_at);

-- Enable RLS
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
```

### Solução 2: Atualizar RPC para usar email_queue
```sql
WHEN 'email_process' THEN
  -- Buscar emails pendentes e processar
  INSERT INTO email_queue (to_email, subject, body, status)
  SELECT 
    u.email,
    'Alert: ' || a.alert_name,
    a.description,
    'pending'
  FROM alerts a
  JOIN users u ON a.user_id = u.id
  WHERE a.status = 'active' AND NOT EXISTS (
    SELECT 1 FROM email_queue WHERE ... (prevent duplicates)
  );
  
  v_result := jsonb_build_object(
    'status', 'success',
    'emails_queued', (SELECT COUNT(*) FROM email_queue WHERE status = 'pending')
  );
```

### Solução 3: Usar Edge Function via http_request
```sql
-- Alternative: Call Edge Function directly
DECLARE
  v_response JSONB;
BEGIN
  -- Use http request to call Edge Function
  SELECT http(
    'POST',
    'https://gvdkdjyupktlflwurike.functions.supabase.co/send-alert-email',
    jsonb_build_object(
      'to_email', 'alert@example.com',
      'subject', 'Alert',
      'body', 'Test alert'
    )
  ) INTO v_response;
  
  v_result := jsonb_build_object(
    'status', 'success',
    'edge_function_called', TRUE
  );
EXCEPTION WHEN OTHERS THEN
  v_result := jsonb_build_object(
    'status', 'error',
    'error', SQLERRM
  );
END;
```

---

## 📊 Current Status Summary

| Component | Status | Evidence |
|-----------|--------|----------|
| Job Execution | ✅ Works | RPC returns success |
| job_runs Table | ✅ Records created | 5 executions found |
| scheduled_jobs Updates | ✅ Working | Stats updated correctly |
| email_queue Table | ❌ Missing | Query returned 0 rows |
| Edge Function Call | ❌ Not called | RPC code shows no invocation |
| Email Delivery | ❌ Not tested | Can't test without queue |

---

## 🔧 Recommended Fix Priority

1. **Priority 1 - CRITICAL:** Create `email_queue` table
   - Time: 5 min
   - Impact: Enables email queueing infrastructure

2. **Priority 2 - HIGH:** Update `execute_scheduled_job` RPC
   - Time: 10 min
   - Impact: Makes email_process job functional

3. **Priority 3 - MEDIUM:** Test full workflow
   - Time: 10 min
   - Impact: Validates end-to-end system

4. **Priority 4 - OPTIONAL:** Add monitoring/logging
   - Time: 15 min
   - Impact: Better observability

---

## 📝 Next Steps

1. ✅ Create email_queue table with proper schema
2. ✅ Update execute_scheduled_job RPC to use email_queue
3. ✅ Create Edge Function trigger for email_queue processing
4. ✅ Test complete workflow again
5. ✅ Implement RLS policies for security

---

**Date:** 27/05/2026
**Session:** 7 → 8 (Continuation)
**Status:** BLOCKERS IDENTIFIED, READY FOR FIXES
