# ETAPA 9: MELHORIAS NO SISTEMA DE ALERTAS

**Status:** 🚀 Em Planejamento  
**Data:** 27/05/2026  
**Prioridade:** Alta (8 melhorias estruturadas)  
**Tempo Estimado:** 4-5 horas

---

## 📋 VISÃO GERAL DAS MELHORIAS

| # | Melhoria | Prioridade | Complexidade | Status | ETA |
|---|----------|-----------|--------------|--------|-----|
| 1 | Email Integration | 🔴 Alta | Média | ⏳ Planejado | 30 min |
| 2 | SMS Integration (Twilio) | 🟠 Média | Alta | ⏳ Planejado | 45 min |
| 3 | Push Notifications | 🔴 Alta | Média | ⏳ Planejado | 40 min |
| 4 | Automations (Cobranças/Escalação) | 🟠 Média | Alta | ⏳ Planejado | 60 min |
| 5 | Webhook Actions | 🟡 Baixa | Média | ⏳ Planejado | 30 min |
| 6 | Analytics Dashboard | 🟠 Média | Média | ⏳ Planejado | 45 min |
| 7 | Alert Rules Engine | 🟠 Média | Alta | ⏳ Planejado | 60 min |
| 8 | Scheduled Jobs (Queue) | 🟠 Média | Alta | ⏳ Planejado | 45 min |

---

## 🎯 MELHORIA 1: EMAIL INTEGRATION

### Objetivo
Enviar alertas via email usando Supabase Email templates com suporte a:
- HTML templates personalizados
- Variáveis dinâmicas (clinic_name, alert_type, message)
- Retry automático
- Tracking de entrega

### Arquitetura

```
alert_notifications (INSERT)
    ↓
notify_channel = 'email'
    ↓
on_alert_notification_insert() TRIGGER
    ↓
supabase.functions.send_alert_email()
    ↓
Supabase Email Service
    ↓
SMTP (mailgun, sendgrid, aws-ses)
    ↓
user@clinic.com ✅
```

### Arquivos a Criar/Modificar

1. **supabase/migrations/2026-05-28_email_integration.sql**
   - Tabela: `email_logs` (tracking de envios)
   - Function: `send_alert_email_batch()`
   - Trigger: atualizar `notification_logs` com status

2. **supabase/functions/send-alert-email/index.ts**
   - Edge Function para disparar emails
   - Template rendering
   - Error handling

3. **src/lib/emailService.js**
   - Helper functions para email templates
   - Retry logic
   - Supabase client integration

### Tarefas
- [ ] 1.1 Criar migration para email_logs
- [ ] 1.2 Implementar Supabase Edge Function
- [ ] 1.3 Criar email templates (HTML)
- [ ] 1.4 Testar envio end-to-end

---

## 🎯 MELHORIA 2: SMS INTEGRATION

### Objetivo
Enviar alertas críticos via SMS usando Twilio:
- Throttling de SMS (máximo 1 por minuto por clinic)
- Suporte a multiple phone numbers
- Tracking de delivery status
- Fallback para email se SMS falhar

### Arquitetura

```
alert_notifications (INSERT)
    ↓
notify_channel = 'sms' AND severity = 'CRITICAL'
    ↓
check_sms_throttle() → hourly max 10 sms/clinic
    ↓
twilio_client.send_message()
    ↓
Twilio API
    ↓
+55 XX 99999-8888 ✅
```

### Arquivos a Criar

1. **supabase/migrations/2026-05-28_sms_integration.sql**
   - Tabela: `sms_logs` (com twilio SID)
   - Tabela: `clinic_phone_numbers`
   - View: `v_sms_throttle_check`

2. **supabase/functions/send-alert-sms/index.ts**
   - Twilio client initialization
   - Message template
   - Webhook for delivery status

3. **src/lib/smsService.js**
   - Phone number formatting
   - Twilio error handling
   - Retry with exponential backoff

### Tarefas
- [ ] 2.1 Setup Twilio account + API keys
- [ ] 2.2 Criar migration para SMS
- [ ] 2.3 Implementar SMS Edge Function
- [ ] 2.4 Adicionar phone numbers em AlertSettings
- [ ] 2.5 Testar SMS delivery

---

## 🎯 MELHORIA 3: PUSH NOTIFICATIONS

### Objetivo
Notificações push desktop/mobile via:
- Service Workers (Web push)
- Firebase Cloud Messaging (FCM)
- Browser Notification API

### Arquitetura

```
alert_notifications (INSERT)
    ↓
notify_channel = 'push'
    ↓
browser_push_subscriptions (lookup clinic users)
    ↓
web_push.sendNotification()
    ↓
Service Worker
    ↓
Browser Notification ✅
```

### Arquivos a Criar

1. **public/service-worker.js**
   - Event listener: push
   - Event listener: notification click
   - Local notification display

2. **src/services/pushNotificationService.js**
   - Subscribe to notifications
   - Send push payload
   - Handle permissions

3. **supabase/migrations/2026-05-28_push_integration.sql**
   - Tabela: `push_subscriptions`
   - Tabela: `push_logs`

### Tarefas
- [ ] 3.1 Criar Service Worker
- [ ] 3.2 Implementar push notification registration
- [ ] 3.3 Armazenar subscriptions em BD
- [ ] 3.4 Testar push no navegador

---

## 🎯 MELHORIA 4: AUTOMATIONS

### Objetivo
Disparar ações automáticas baseadas em alertas:
- **Cobrança Automática:** Criar ticket de cobrança quando inadimplência > 30 dias
- **Escalonamento:** Enviar para gestor → financeiro → diretor conforme severidade
- **Auto-resolução:** Resolvê após 24h sem ação

### Arquitetura

```
alert_notifications (INSERT)
    ↓
CHECK alert_config.automations.enabled
    ↓
MATCH alert_type + severity
    ├─→ DELINQUENCY + HIGH → create_collection_ticket()
    ├─→ REPAYMENT_LATE + CRITICAL → escalate_to_manager()
    └─→ LOW_CASHFLOW + MEDIUM → notify_finance_team()
    ↓
automation_logs (audit trail)
```

### Arquivos a Criar

1. **supabase/migrations/2026-05-28_automations.sql**
   - Tabela: `automation_actions`
   - Tabela: `automation_logs`
   - Function: `trigger_automations_on_alert()`

2. **src/lib/automationsEngine.js**
   - Rule definitions
   - Action executors
   - Error recovery

3. **src/components/alerts/AutomationRules.jsx**
   - UI para configurar automations
   - Enable/disable actions
   - Test automation

### Tarefas
- [ ] 4.1 Definir tipos de automation actions
- [ ] 4.2 Criar migration + functions
- [ ] 4.3 Implementar automation engine
- [ ] 4.4 Criar UI de configuração
- [ ] 4.5 Testar automations end-to-end

---

## 🎯 MELHORIA 5: WEBHOOK ACTIONS

### Objetivo
Executar webhooks personalizados quando alertas disparam:
- Chamar APIs externas
- Integrar com sistemas terceiros
- Retry com exponential backoff
- Logging detalhado

### Arquitetura

```
alert_notifications (INSERT)
    ↓
alert_config.webhook_url (if exists)
    ↓
queue_webhook_call()
    ↓
webhook_queue.process()
    ↓
http.post(webhook_url, payload)
    ↓
External System ✅
```

### Arquivos a Criar

1. **supabase/migrations/2026-05-28_webhooks.sql**
   - Tabela: `webhook_calls`
   - Tabela: `webhook_queue`
   - Function: `queue_webhook()`

2. **supabase/functions/process-webhooks/index.ts**
   - Dequeue messages
   - Retry logic
   - Error handling

3. **src/lib/webhookService.js**
   - Payload builder
   - Signature generation
   - Event types

### Tarefas
- [ ] 5.1 Criar webhook queue schema
- [ ] 5.2 Implementar Edge Function
- [ ] 5.3 Adicionar webhook URL em AlertSettings
- [ ] 5.4 Testar webhook delivery

---

## 🎯 MELHORIA 6: ANALYTICS DASHBOARD

### Objetivo
Dashboard com métricas e tendências de alertas:
- Total alertas por dia/semana/mês
- Distribuição por tipo/severidade
- Taxa de resolução
- Tempo médio de resolução
- Alertas por profissional/departamento

### Componentes

1. **src/pages/financeiro/AlertAnalytics.jsx**
   - Stats cards (total, resolved, avg time)
   - Line chart: alertas ao longo do tempo
   - Pie chart: distribuição por tipo
   - Table: alertas não resolvidos

2. **src/lib/analyticsApi.js**
   - getAlertMetrics()
   - getAlertTrends()
   - getResolutionStats()

3. **supabase/migrations/2026-05-28_analytics_views.sql**
   - View: `v_alert_metrics`
   - View: `v_alert_trends`
   - Materialized view para performance

### Tarefas
- [ ] 6.1 Criar views no Supabase
- [ ] 6.2 Implementar analyticsApi
- [ ] 6.3 Criar componente Analytics
- [ ] 6.4 Adicionar rota /clinica/financeiro/analytics
- [ ] 6.5 Adicionar menu item

---

## 🎯 MELHORIA 7: ALERT RULES ENGINE

### Objetivo
Engine mais complexa para regras de alerta:
- Condições compostas (AND, OR, NOT)
- Múltiplas condições por regra
- Precedência de regras
- Validação de regras

### Exemplos de Regras Avançadas

```
IF (DELINQUENCY > 30 days) AND (amount > 5000) THEN alert CRITICAL
IF (REPAYMENT_LATE) OR (LOW_CASHFLOW) THEN escalate to manager
IF (day_of_week = Friday) AND (time > 17:00) THEN defer_notification
```

### Arquivos a Criar

1. **supabase/migrations/2026-05-28_advanced_rules.sql**
   - Redesign tabela `alert_rules`
   - Suporte a nested conditions (JSONB)
   - Function: `evaluate_rule()`

2. **src/lib/rulesEngine.js**
   - RuleBuilder class
   - Condition evaluator
   - Rule validator

3. **src/components/alerts/RulesBuilder.jsx**
   - Visual rule builder
   - Condition editor
   - Preview de regras

### Tarefas
- [ ] 7.1 Definir schema de rules (JSONB)
- [ ] 7.2 Implementar rules engine
- [ ] 7.3 Criar RulesBuilder component
- [ ] 7.4 Testar evaluation logic
- [ ] 7.5 Adicionar menu em Configurações

---

## 🎯 MELHORIA 8: SCHEDULED JOBS

### Objetivo
Job queue para verificações periódicas:
- Verificar alertas a cada 15/30/60 minutos
- Processador de fila com retry
- Health check de jobs
- Dashboard de jobs

### Arquitetura

```
Scheduled Job (Cron)
    ↓
pg_cron executes
    ↓
check_and_trigger_alerts() → disparado
    ↓
alert_notifications criados
    ↓
Notifications enviadas
```

### Arquivos a Criar

1. **supabase/migrations/2026-05-28_scheduled_jobs.sql**
   - Enable pg_cron extension
   - Tabela: `scheduled_jobs`
   - Job: select check_and_trigger_alerts()

2. **supabase/functions/job-processor/index.ts**
   - Dequeue jobs
   - Execute actions
   - Update status

3. **src/pages/admin/JobMonitor.jsx**
   - Dashboard de jobs
   - Last run timestamp
   - Success/failure stats

### Tarefas
- [ ] 8.1 Setup pg_cron em Supabase
- [ ] 8.2 Criar scheduled job triggers
- [ ] 8.3 Implementar job processor
- [ ] 8.4 Criar JobMonitor dashboard
- [ ] 8.5 Testar job scheduling

---

## 📅 CRONOGRAMA IMPLEMENTAÇÃO

### Fase 1: Foundation (Semana 1)
- ✅ Email Integration
- ✅ Push Notifications
- ✅ Automations (básico)

### Fase 2: Expansion (Semana 2)
- ✅ SMS Integration
- ✅ Webhook Actions
- ✅ Alert Rules Engine

### Fase 3: Intelligence (Semana 3)
- ✅ Analytics Dashboard
- ✅ Scheduled Jobs
- ✅ Job Monitor

---

## 🔧 CONFIGURAÇÃO PRÉ-REQUISITOS

### APIs Necessárias

```env
# Email
VITE_SUPABASE_EMAIL_ENABLED=true

# SMS
VITE_TWILIO_ACCOUNT_SID=AC...
VITE_TWILIO_AUTH_TOKEN=secret
VITE_TWILIO_PHONE_NUMBER=+55XX

# Push
VITE_VAPID_PUBLIC_KEY=...
VITE_VAPID_PRIVATE_KEY=...

# External Webhooks
WEBHOOK_RETRY_MAX_ATTEMPTS=5
WEBHOOK_RETRY_DELAY_MS=5000
```

---

## ✅ CHECKLIST GERAL

- [ ] Implementar 8 melhorias conforme plano
- [ ] Testes end-to-end para cada melhoria
- [ ] Documentação de API
- [ ] User guide para configuração
- [ ] Performance testing (load test)
- [ ] Security audit
- [ ] Deployment checklist
- [ ] Rollback plan

---

## 📞 SUPORTE

Para dúvidas ou ajustes no plano, consultar este documento regularmente.

**Próximo Passo:** Iniciar Melhoria 1 (Email Integration) ✉️
