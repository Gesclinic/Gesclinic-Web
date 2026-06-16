# ⚡ CHECKLIST PRÁTICO - PRÓXIMAS AÇÕES

**Status:** Implementação SQL concluída, pronto para testes  
**Próximo:** Deploy em staging + Testes de integração  
**Estimado:** 2-3 dias até go-live

---

## 📋 CHECKLIST IMEDIATO (HOJE)

### Fase 1: Deploy Migrations em Staging

- [ ] **Conectar ao Supabase Dashboard (staging)**
  - URL: https://app.supabase.com
  - Projeto: gesclinic-staging
  - Ir para: SQL Editor

- [ ] **Executar migrações em ordem:**
  ```sql
  -- 1. Email Integration
  -- Copiar conteúdo de: supabase/migrations/2026-05-28_email_integration.sql
  -- Executar em Supabase SQL Editor
  
  -- 2. SMS Integration
  -- Copiar conteúdo de: supabase/migrations/2026-05-28_sms_integration.sql
  
  -- 3. Push Notifications (migration não precisa ser executada agora)
  
  -- 4. Automations
  -- Copiar conteúdo de: supabase/migrations/2026-05-28_automations.sql
  
  -- 5. Webhooks
  -- Copiar conteúdo de: supabase/migrations/2026-05-28_webhooks.sql
  
  -- 6. Advanced Rules
  -- Copiar conteúdo de: supabase/migrations/2026-05-28_advanced_rules.sql
  
  -- 7. Scheduled Jobs (IMPORTANTE: requer pg_cron habilitado)
  -- Nota: Contatar Supabase support se pg_cron não está habilitado
  -- Copiar conteúdo de: supabase/migrations/2026-05-28_scheduled_jobs.sql
  ```

- [ ] **Verificar se migrações executaram com sucesso**
  ```sql
  -- Executar estas queries para validar:
  SELECT tablename FROM pg_tables 
  WHERE tablename IN ('email_logs', 'sms_logs', 'automation_actions', 
                      'webhook_calls', 'advanced_alert_rules', 'scheduled_jobs');
  
  -- Deve retornar: 6 tabelas encontradas
  ```

- [ ] **Conferir RLS Policies**
  ```sql
  SELECT * FROM pg_policies 
  WHERE tablename IN ('email_logs', 'sms_logs', 'automation_actions', 'webhook_calls');
  
  -- Deve retornar: 4 policies ativas
  ```

---

### Fase 2: Setup de Variáveis de Ambiente

- [ ] **Adicionar ao `.env` do projeto:**
  ```env
  # EMAIL INTEGRATION
  VITE_SUPABASE_EMAIL_ENABLED=true
  VITE_SENDGRID_API_KEY=SG.XXXXXX  # Optional, for future use
  
  # SMS INTEGRATION (Twilio)
  VITE_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  VITE_TWILIO_AUTH_TOKEN=your_auth_token_here
  VITE_TWILIO_PHONE_NUMBER=+5511999999999
  
  # PUSH NOTIFICATIONS (Firebase ou Web Push)
  VITE_VAPID_PUBLIC_KEY=BFxxxxxx...xxxxx
  VITE_VAPID_PRIVATE_KEY=xxxxxxxx...xxxxx
  VITE_FIREBASE_PROJECT_ID=your-project-id
  
  # WEBHOOKS
  WEBHOOK_RETRY_MAX_ATTEMPTS=5
  WEBHOOK_RETRY_DELAY_MS=5000
  ```

- [ ] **Obter chaves necessárias:**
  - [ ] **Twilio:** https://console.twilio.com
    - Account SID: (vai em Account Settings)
    - Auth Token: (vai em Account Settings)
    - Phone Number: (vai em Phone Numbers > Manage)
  
  - [ ] **Firebase/Web Push:** https://console.firebase.google.com
    - Gerar VAPID keys usando: `npx web-push generate-vapid-keys`
  
  - [ ] **Sendgrid (optional):** https://app.sendgrid.com/settings/api_keys

- [ ] **Criar arquivo `.env.local` para development (NÃO commitar)**
  - Copiar valores de staging
  - Manter seguro e privado

---

### Fase 3: Testes de Componentes Individuais

- [ ] **Testar Email Service**
  ```bash
  # No terminal do projeto
  npm run dev
  
  # Abrir console do browser (F12)
  # Executar:
  import emailService from '@/lib/emailService'
  const logs = await emailService.getClinicEmailLogs('clinic-uuid')
  console.log(logs)
  
  # Deve retornar array de email logs (pode estar vazio)
  ```

- [ ] **Testar SMS Service**
  ```bash
  # No Supabase SQL Editor:
  SELECT * FROM v_pending_sms;
  
  # Deve retornar view vazia (nenhum SMS pendente)
  ```

- [ ] **Testar Push Notifications**
  ```bash
  # No console do browser:
  import pushService from '@/services/pushNotificationService'
  
  // Verificar suporte
  console.log(pushService.isSupported)
  
  // Registrar Service Worker
  await pushService.registerServiceWorker()
  
  // Solicitar permissão
  await pushService.requestPermission()
  
  // Inscrever para push
  await pushService.subscribe(clinicId, userId)
  
  // Enviar notificação de teste
  await pushService.sendTestNotification()
  ```

- [ ] **Testar Automations**
  ```sql
  -- Ver automações criadas
  SELECT * FROM automation_actions WHERE clinic_id = 'seu-clinic-id';
  
  -- Ver logs de execução
  SELECT * FROM automation_logs WHERE clinic_id = 'seu-clinic-id';
  ```

- [ ] **Testar Rules Engine**
  ```sql
  -- Criar regra de teste
  INSERT INTO advanced_alert_rules (
    clinic_id,
    rule_name,
    conditions,
    actions,
    is_active
  ) VALUES (
    'seu-clinic-id',
    'Teste - Alerta Alto Valor',
    '{"operator":"AND","conditions":[{"field":"severity","operator":"=","value":"HIGH"}]}',
    '[{"type":"email","params":{}}]',
    true
  );
  
  -- Criar alerta HIGH para testar
  SELECT create_alert_if_delinquency('seu-clinic-id', 'HIGH', 'Teste');
  ```

---

## 🚀 CHECKLIST SEMANA 1 (DEVELOPMENT)

- [ ] **Implementar Edge Functions**
  - [ ] Criar `/supabase/functions/send-alert-email/` com código Deno
  - [ ] Criar `/supabase/functions/process-webhooks/` com retry logic
  - [ ] Deploy via `supabase functions deploy`
  - [ ] Testar endpoints com Postman/cURL

- [ ] **Implementar UI Components**
  - [ ] EmailLogs.jsx - ✅ Já criado
  - [ ] AlertAnalytics.jsx - ✅ Já criado
  - [ ] RulesBuilder.jsx - Novo componente para criar regras
  - [ ] JobMonitor.jsx - Dashboard de jobs
  - [ ] WebhookConfig.jsx - Configuração de webhooks

- [ ] **Integrar com AlertCenter**
  - [ ] Adicionar tabs para Email/SMS/Push/Webhooks
  - [ ] Adicionar botões para test notifications
  - [ ] Integrar AlertAnalytics como sub-page
  - [ ] Real-time updates via Supabase channels

- [ ] **Testar Full Workflow**
  - [ ] Criar alerta → Email queued → Email sent → Delivered
  - [ ] Criar alerta HIGH → SMS queued → SMS sent
  - [ ] Push subscription → Test notification → Displayed
  - [ ] Webhook configured → Webhook called → Response logged
  - [ ] Automation triggered → Ticket created
  - [ ] Rule evaluated → Actions executed

- [ ] **Performance Testing**
  - [ ] Crear 100 alertas → Verificar queues
  - [ ] Disparar 100 emails simultâneos → Check throughput
  - [ ] Verificar índices de database
  - [ ] Query analysis de v_pending_emails, v_pending_sms

---

## 🔧 CHECKLIST SEMANA 2 (POLISH & OPTIMIZATION)

- [ ] **Bug Fixes & Edge Cases**
  - [ ] Tratamento de caracteres especiais em SMS
  - [ ] Timeout handling para Twilio API
  - [ ] Retry logic para emails bounced
  - [ ] Webhook signature validation
  - [ ] Circular dependency prevention em rules

- [ ] **Error Handling & Logging**
  - [ ] Implementar Sentry para tracking de erros
  - [ ] Adicionar logs estruturados em Edge Functions
  - [ ] Health check endpoints para jobs
  - [ ] Alert pada long-running jobs

- [ ] **Documentation**
  - [ ] Atualizar README com instruções de setup
  - [ ] Criar API docs para webhooks
  - [ ] Escrever guia de configuration de rules
  - [ ] Criar tutorial de SMS setup

- [ ] **Security Review**
  - [ ] Validar VAPID keys generation
  - [ ] Verificar RLS policies em todas tabelas
  - [ ] Audit de permissions em automations
  - [ ] Rate limiting em Edge Functions

---

## 🌐 CHECKLIST SEMANA 3 (PRODUCTION PREP)

- [ ] **Production Environment Setup**
  - [ ] Criar projeto Supabase production
  - [ ] Configurar backup policies
  - [ ] Setup log aggregation
  - [ ] Configure monitoring alerts

- [ ] **Migration Strategy**
  - [ ] Backup production database
  - [ ] Test migrations em staging production clone
  - [ ] Plan rollback strategy
  - [ ] Schedule maintenance window

- [ ] **Load Testing**
  - [ ] 1000 alertas simultâneos
  - [ ] 500 emails/minuto
  - [ ] 100 webhooks/minuto
  - [ ] Verificar database connections pool

- [ ] **Final Validation**
  - [ ] End-to-end test de cada funcionalidade
  - [ ] User acceptance testing (UAT)
  - [ ] Browser compatibility check
  - [ ] Mobile responsiveness check

- [ ] **Deployment**
  - [ ] Run production migrations
  - [ ] Deploy Edge Functions
  - [ ] Enable monitoring
  - [ ] Rotate secrets
  - [ ] Go-live!

---

## 🔍 DEBUGGING TIPS

### Email não está sendo enviado?
```sql
-- Check pending emails
SELECT * FROM v_pending_emails LIMIT 5;

-- Check email logs
SELECT * FROM email_logs 
ORDER BY created_at DESC LIMIT 10;

-- Check if trigger is executing
SELECT * FROM notification_logs 
WHERE channel = 'email'
ORDER BY created_at DESC LIMIT 5;
```

### SMS não está sendo queued?
```sql
-- Check SMS throttle
SELECT * FROM sms_throttle WHERE clinic_id = 'seu-clinic-id';

-- Check SMS logs
SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT 10;

-- Verify SMS is CRITICAL or HIGH
SELECT severity FROM alert_notifications 
WHERE clinic_id = 'seu-clinic-id'
ORDER BY created_at DESC LIMIT 5;
```

### Push não está sendo recebido?
```js
// No browser console:
// 1. Check Service Worker registration
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs);
  regs.forEach(reg => console.log('SW active:', reg.active));
});

// 2. Check push subscription
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push subscription:', sub);
  });
});

// 3. Check push notification permission
console.log('Notification.permission:', Notification.permission);
```

### Webhook não está sendo chamado?
```sql
-- Check webhook calls
SELECT * FROM webhook_calls 
WHERE clinic_id = 'seu-clinic-id'
ORDER BY created_at DESC LIMIT 10;

-- Check pending webhooks
SELECT * FROM v_pending_webhooks LIMIT 5;

-- Check alert config for webhook URL
SELECT webhook_url FROM alert_configs 
WHERE clinic_id = 'seu-clinic-id';
```

### Rules não estão sendo aplicadas?
```sql
-- Check advanced rules
SELECT * FROM advanced_alert_rules 
WHERE clinic_id = 'seu-clinic-id'
AND is_active = TRUE;

-- Check rule evaluation in logs
SELECT * FROM automation_logs 
WHERE clinic_id = 'seu-clinic-id'
ORDER BY executed_at DESC LIMIT 10;

-- Test rule evaluation
SELECT evaluate_condition(
  '{"operator":"AND","conditions":[{"field":"severity","operator":"=","value":"HIGH"}]}'::jsonb,
  '{"severity":"HIGH","alert_type":"DELINQUENCY"}'::jsonb
);
-- Deve retornar: true
```

### Jobs não estão executando?
```sql
-- Check scheduled jobs status
SELECT * FROM v_job_status;

-- Check job runs
SELECT * FROM job_runs 
ORDER BY started_at DESC LIMIT 20;

-- Check if pg_cron is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT * FROM cron.job;
```

---

## 📞 TROUBLESHOOTING CONTACTS

- **Supabase Issues:** https://github.com/supabase/supabase/issues
- **Twilio Issues:** https://www.twilio.com/docs/
- **Firebase Issues:** https://stackoverflow.com/questions/tagged/firebase
- **React Issues:** https://react.dev/

---

## 💾 BACKUP STRATEGY

**Antes de cada deploy:**
```bash
# 1. Backup database
supabase db pull > backup_$(date +%Y%m%d).sql

# 2. Backup migrations
cp -r supabase/migrations backup_migrations_$(date +%Y%m%d)/

# 3. Commit to git
git add -A
git commit -m "Backup before production deploy"
git push origin main
```

---

## ✨ SUCCESS CRITERIA

Após completar este checklist, você deve ter:

- ✅ Todas as 8 melhorias implementadas e testadas
- ✅ Email, SMS, Push notificações funcionando
- ✅ Automations disparando corretamente
- ✅ Webhooks sendo processados
- ✅ Analytics dashboard exibindo dados
- ✅ Rules engine avaliando condições
- ✅ Scheduled jobs executando a cada X minutos
- ✅ Real-time updates no AlertCenter
- ✅ Production-ready e deployado

---

**Checklist Versão:** 1.0  
**Data:** 28/05/2026  
**Status:** Pronto para implementação  

**Próximo Responsável:** DevOps/QA Team
