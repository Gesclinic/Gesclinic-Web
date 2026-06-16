# 🚀 GUIA DE TESTE E DEPLOYMENT - ETAPA 9 MELHORIAS

**Status:** Todas as migrations executadas ✅  
**Próximo:** Testar funcionalidades + Deploy Edge Functions  
**Estimado:** 4-6 horas

---

## 📋 PHASE 1: TESTAR EXECUTE_SCHEDULED_JOB()

### Passo 1: Testar Manualmente no Supabase

Execute esta query no **Supabase SQL Editor**:

```sql
-- Executar um job manualmente (alert_check)
SELECT execute_scheduled_job('55707ac5-eb4f-49a8-a7b9-b258dab349c1');
```

**Resultado esperado:**
```json
{
  "status": "success",
  "job_id": "55707ac5-eb4f-49a8-a7b9-b258dab349c1",
  "run_id": "uuid...",
  "result": {
    "status": "success",
    "alerts_checked": true
  }
}
```

### Passo 2: Verificar job_runs

```sql
-- Ver execução que acabou de acontecer
SELECT * FROM job_runs 
ORDER BY started_at DESC 
LIMIT 1;

-- Resultado deve ter:
-- status = 'success'
-- duration_ms = tempo em ms
-- result JSONB com status
```

### Passo 3: Verificar v_job_status

```sql
-- Ver status do job que foi executado
SELECT * FROM v_job_status 
WHERE job_name = 'check_alerts_every_15min';

-- Resultado deve mostrar:
-- run_count = 1 (ao invés de 0)
-- success_count = 1
-- health_status = '✅ Saudável'
-- last_run_at = timestamp recente
-- last_status = 'success'
```

---

## 📋 PHASE 2: VERIFICAR PG_CRON

### Passo 1: Verificar se pg_cron está habilitado

Execute no Supabase SQL Editor:

```sql
-- Verificar se extensão existe
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Listar jobs registrados no pg_cron
SELECT * FROM cron.job;
```

**Se retornar erro:** Entre em contato com Supabase support para habilitar pg_cron

**Se retornar vazio:** Precisamos configurar os cron jobs

### Passo 2: Criar cron jobs (se pg_cron habilitado)

```sql
-- Job 1: Verificar alertas a cada 15 minutos
SELECT cron.schedule(
  'check_alerts_every_15min',
  '*/15 * * * *',
  'SELECT execute_scheduled_job(' || quote_literal('55707ac5-eb4f-49a8-a7b9-b258dab349c1'::text) || ')'
);

-- Job 2: Processar emails a cada 5 minutos
SELECT cron.schedule(
  'process_emails_every_5min',
  '*/5 * * * *',
  'SELECT execute_scheduled_job(' || quote_literal('77ec81af-3457-45df-bfc8-2d9b0aa7bca1'::text) || ')'
);

-- Job 3: Processar webhooks a cada 10 minutos
SELECT cron.schedule(
  'process_webhooks_every_10min',
  '*/10 * * * *',
  'SELECT execute_scheduled_job(' || quote_literal('a7a0dd6b-b5f7-47c8-9e40-dbb894a4f808'::text) || ')'
);

-- Job 4: Processar SMS a cada 5 minutos
SELECT cron.schedule(
  'process_sms_every_5min',
  '*/5 * * * *',
  'SELECT execute_scheduled_job(' || quote_literal('d12799d1-a5ee-455f-a3cb-4b09aaaa693a'::text) || ')'
);

-- Job 5: Auto-resolver alertas diariamente às 2 AM
SELECT cron.schedule(
  'auto_resolve_alerts_daily',
  '0 2 * * *',
  'SELECT execute_scheduled_job(' || quote_literal('f535adb6-f81a-491f-af48-9df7572f0163'::text) || ')'
);

-- Verificar jobs criados
SELECT * FROM cron.job ORDER BY jobname;
```

---

## 📋 PHASE 3: INTEGRAR COM ALERTCENTER NO REACT

### Passo 1: Adicionar rota JobMonitor

Editar `src/AppRoutes.jsx`:

```jsx
import JobMonitor from '@/pages/financeiro/JobMonitor'

// Adicionar dentro das rotas de financeiro:
{
  path: 'jobs',
  element: <JobMonitor />
}
```

### Passo 2: Adicionar link no menu

Editar `src/components/layout/AppLayout.jsx` ou menu:

```jsx
<NavLink to="/clinica/financeiro/jobs" className="flex items-center gap-2">
  <Clock className="w-4 h-4" />
  Job Monitor
</NavLink>
```

### Passo 3: Testar no browser

1. `npm run dev`
2. Navegue para `http://localhost:3000/clinica/financeiro/jobs`
3. Deve mostrar os 5 jobs com status `⏳ Novo`
4. Clique em "Executar Agora" para testar manualmente

---

## 📋 PHASE 4: DEPLOY EDGE FUNCTION - send-alert-email

### Passo 1: Configurar variáveis de ambiente

Adicionar ao `.env` do projeto:

```env
# Option 1: Resend (Recomendado)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Option 2: SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx

# Option 3: AWS SES (via Supabase SMTP)
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=seu-usuario
SMTP_PASSWORD=sua-senha

# Email from address
EMAIL_FROM=noreply@gesclinic.com
```

### Passo 2: Atualizar Edge Function

Editar `supabase/functions/send-alert-email/index.ts`:

```typescript
// Adicionar ao topo do arquivo:
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

// Na função sendEmail(), adicionar:
if (RESEND_API_KEY) {
  // Usar Resend
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'alerts@gesclinic.com',
      to: toEmail,
      subject: subject,
      html: htmlContent
    })
  })
  // ...
}
```

### Passo 3: Deploy da função

```bash
# Terminal no projeto
supabase functions deploy send-alert-email

# Verificar deploy
supabase functions list
```

### Passo 4: Testar a função

```bash
# Via curl
curl -X POST https://sua-project.supabase.co/functions/v1/send-alert-email \
  -H "Authorization: Bearer seu-anon-key" \
  -H "Content-Type: application/json" \
  -d '{}'

# Resultado esperado: {"status": "ok"}
```

---

## 📋 PHASE 5: TESTAR EMAIL END-TO-END

### Passo 1: Criar um alerta de teste

```sql
-- Criar alerta LOW_CASHFLOW
INSERT INTO alert_notifications (
  clinic_id,
  alert_type,
  severity,
  title,
  message,
  status,
  data
) VALUES (
  'seu-clinic-id',
  'LOW_CASHFLOW',
  'HIGH',
  'Fluxo de Caixa Baixo',
  'Fluxo de caixa abaixo do limite',
  'active',
  '{"amount": 5000}'
);

-- Trigger automático deve ter criado email_log
SELECT * FROM email_logs 
WHERE delivery_status = 'pending' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Passo 2: Disparar processamento de emails

```bash
# Via curl
curl -X POST https://sua-project.supabase.co/functions/v1/send-alert-email \
  -H "Authorization: Bearer seu-anon-key"

# Ou via SQL (se usar job manual)
SELECT execute_scheduled_job('77ec81af-3457-45df-bfc8-2d9b0aa7bca1');
```

### Passo 3: Verificar se email foi enviado

```sql
-- Verificar status
SELECT * FROM email_logs 
WHERE clinic_id = 'seu-clinic-id'
ORDER BY created_at DESC 
LIMIT 1;

-- Deve mostrar:
-- delivery_status = 'sent'
-- updated_at = tempo recente
```

---

## ✅ CHECKLIST FINAL

- [ ] execute_scheduled_job() testado manualmente
- [ ] pg_cron verificado (habilitado ou não)
- [ ] JobMonitor.jsx integrado e funcionando
- [ ] Rota `/clinica/financeiro/jobs` acessível
- [ ] send-alert-email Edge Function deployada
- [ ] Email de teste enviado e recebido
- [ ] v_job_status mostrando execuções
- [ ] Auto-refresh funcionando no JobMonitor

---

## 🐛 TROUBLESHOOTING

### Edge Function não inicia?
```bash
# Verificar logs
supabase functions delete send-alert-email
supabase functions deploy send-alert-email --no-verify-jwt

# Checar erros
supabase functions test send-alert-email
```

### Email não é enviado?
```sql
-- Verificar se email foi queued
SELECT * FROM v_pending_emails;

-- Verificar último erro
SELECT * FROM email_logs 
WHERE delivery_status IN ('failed', 'pending')
ORDER BY created_at DESC 
LIMIT 5;
```

### JobMonitor não carrega?
```js
// No console do browser
import customSupabaseClient from '@/lib/customSupabaseClient'
const { data } = await customSupabaseClient.from('v_job_status').select()
console.log(data)
```

---

**Documento criado:** 28/05/2026  
**Status:** Pronto para implementação  
**Responsável:** DevOps/Backend Team
