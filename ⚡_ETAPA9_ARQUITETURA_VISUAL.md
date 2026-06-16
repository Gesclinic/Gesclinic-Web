# ETAPA 9: ARQUITETURA COMPLETA DE ALERTAS E MELHORIAS

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    GESCLINIC - SISTEMA DE ALERTAS v2.0                       ║
║                         (ETAPA 8 + ETAPA 9 MELHORIAS)                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAYER 1: USER INTERFACE                             │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │   AlertCenter    │  │ NotificationBell │  │  AlertAnalytics  │
  │  (3 tabs)        │  │   (Header)       │  │   (Dashboard)    │
  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
           │                     │                     │
           └──────────┬──────────┴─────────────────────┘
                      │
                  ┌───┴───────────────────────────────┐
                  │                                   │
         ┌────────▼──────────┐          ┌─────────────▼───────┐
         │  Alerts Tab       │          │  Analytics Tab      │
         │  ├─ Ativos (0)    │          │  ├─ Total: X        │
         │  ├─ Histórico (Y) │          │  ├─ Resolvidos: Y   │
         │  └─ Config (Z)    │          │  ├─ Taxa: Z%        │
         └────────┬──────────┘          │  └─ Gráficos        │
                  │                     └─────────────────────┘
                  │
         ┌────────▼──────────────────────────────┐
         │     Push/Email/SMS Notifications      │
         │  ┌─────────────────────────────────┐  │
         │  │ Service Worker (Push)           │  │
         │  │ Email Service                   │  │
         │  │ SMS Service (Twilio)            │  │
         │  └─────────────────────────────────┘  │
         └────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 2: CLIENT SERVICES & APIs                          │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────┐  ┌──────────────────┐  ┌─────────────────┐
  │  alertsApi.js        │  │ emailService.js  │  │ pushService.js  │
  │  ├─ getAlerts()      │  │ ├─ getLogs()     │  │ ├─ register()   │
  │  ├─ resolveAlert()   │  │ ├─ getStats()    │  │ ├─ subscribe()  │
  │  ├─ dismissAlert()   │  │ ├─ trigger()     │  │ ├─ test()       │
  │  └─ getStats()       │  │ └─ resend()      │  │ └─ send()       │
  └────────┬─────────────┘  └────────┬─────────┘  └────────┬────────┘
           │                         │                     │
           └───────────┬─────────────┴──────────┬──────────┘
                       │                        │
                   ┌───▼────────────────────────▼──┐
                   │   Supabase JavaScript Client  │
                   │  (Auth + Database + RealTime) │
                   └───────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 3: SUPABASE BACKEND (SQL)                          │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────┐
  │                        CORE ALERT SYSTEM                            │
  │                                                                      │
  │  ┌─────────────────────┐  ┌──────────────────────────┐             │
  │  │ alert_configs       │  │ alert_notifications     │             │
  │  │ ├─ alert_type       │  │ ├─ id                   │             │
  │  │ ├─ severity_level   │  │ ├─ alert_type           │             │
  │  │ ├─ check_frequency  │  │ ├─ severity             │             │
  │  │ ├─ notify_channels  │  │ ├─ status (active/...)  │             │
  │  │ └─ webhook_url      │  │ ├─ resolved_at          │             │
  │  └─────────┬───────────┘  │ └─ created_at           │             │
  │            │              └──────────────────────────┘             │
  │  ┌─────────▼─────────────────────────────────────────────┐         │
  │  │        NOTIFICATION CHANNELS (ETAPA 9)               │         │
  │  │                                                       │         │
  │  │  ┌─────────────────┐    ┌────────────────┐          │         │
  │  │  │  email_logs     │    │  sms_logs      │          │         │
  │  │  │  ├─ recipient   │    │  ├─ phone      │          │         │
  │  │  │  ├─ subject     │    │  ├─ message    │          │         │
  │  │  │  ├─ status      │    │  ├─ twilio_sid │          │         │
  │  │  │  └─ retry_count │    │  └─ status     │          │         │
  │  │  └─────────┬───────┘    └────────┬───────┘          │         │
  │  │            │                     │                  │         │
  │  │  ┌─────────▼──────┐   ┌──────────▼────────┐         │         │
  │  │  │ email_templates│   │push_subscriptions │         │         │
  │  │  │ ├─ subject     │   │├─ endpoint        │         │         │
  │  │  │ ├─ body_html   │   │├─ auth            │         │         │
  │  │  │ └─ variables   │   │└─ p256dh          │         │         │
  │  │  └────────────────┘   └───────────────────┘         │         │
  │  └───────────────────────────────────────────────────────┘         │
  │                                                                    │
  │  ┌──────────────────────────────────────────────────┐             │
  │  │     AUTOMATIONS & ACTIONS (ETAPA 9)              │             │
  │  │                                                  │             │
  │  │  ┌────────────────────────────────────────┐     │             │
  │  │  │  automation_actions                    │     │             │
  │  │  │  ├─ action_type (ticket, escalate...) │     │             │
  │  │  │  ├─ trigger_condition (JSONB)         │     │             │
  │  │  │  └─ action_params (JSONB)             │     │             │
  │  │  └────────────────────────────────────────┘     │             │
  │  │                                                  │             │
  │  │  ┌────────────────────────────────────────┐     │             │
  │  │  │  webhook_calls                         │     │             │
  │  │  │  ├─ webhook_url                        │     │             │
  │  │  │  ├─ request_payload (JSONB)            │     │             │
  │  │  │  └─ response_status                    │     │             │
  │  │  └────────────────────────────────────────┘     │             │
  │  │                                                  │             │
  │  │  ┌────────────────────────────────────────┐     │             │
  │  │  │  advanced_alert_rules (ETAPA 9)        │     │             │
  │  │  │  ├─ conditions (JSONB - AND/OR)        │     │             │
  │  │  │  ├─ actions (JSONB array)              │     │             │
  │  │  │  └─ priority                           │     │             │
  │  │  └────────────────────────────────────────┘     │             │
  │  └──────────────────────────────────────────────────┘             │
  │                                                                    │
  │  ┌──────────────────────────────────────────────────┐             │
  │  │     SCHEDULED JOBS & MONITORING (ETAPA 9)        │             │
  │  │                                                  │             │
  │  │  ┌────────────────────────────────────────┐     │             │
  │  │  │  scheduled_jobs                        │     │             │
  │  │  │  ├─ job_name                           │     │             │
  │  │  │  ├─ cron_expression                    │     │             │
  │  │  │  ├─ last_run_at                        │     │             │
  │  │  │  └─ success_count/failure_count        │     │             │
  │  │  └────────────────────────────────────────┘     │             │
  │  │                                                  │             │
  │  │  ┌────────────────────────────────────────┐     │             │
  │  │  │  job_runs                              │     │             │
  │  │  │  ├─ status (running/success/failed)    │     │             │
  │  │  │  ├─ duration_ms                        │     │             │
  │  │  │  └─ result (JSONB)                     │     │             │
  │  │  └────────────────────────────────────────┘     │             │
  │  └──────────────────────────────────────────────────┘             │
  │                                                                    │
  └──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 4: TRIGGERS & FUNCTIONS                            │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────┐
  │  ALERT NOTIFICATION INSERT EVENT                               │
  └──────────────────────────────┬──────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
    ┌────────────┐         ┌──────────┐         ┌──────────────┐
    │ Send Email │         │Send SMS  │         │Send Push     │
    │ Trigger    │         │Trigger   │         │Trigger       │
    └─────┬──────┘         └────┬─────┘         └──────┬───────┘
          │                     │                     │
          ▼                     ▼                     ▼
    ┌────────────┐         ┌──────────┐         ┌──────────────┐
    │Queue Email │         │Queue SMS │         │Register Push │
    │in Logs     │         │in Logs   │         │Subscription  │
    └────────────┘         └──────────┘         └──────────────┘
          │                     │                     │
          └─────────┬───────────┴─────────────────────┘
                    │
                    ▼
    ┌──────────────────────────────────┐
    │ Trigger Automations              │
    │ ├─ Check automation_actions      │
    │ ├─ Evaluate conditions           │
    │ └─ Execute actions (ticket, etc) │
    └──────────────────────────────────┘
                    │
                    ▼
    ┌──────────────────────────────────┐
    │ Queue Webhook Call               │
    │ └─ If webhook_url exists         │
    └──────────────────────────────────┘
                    │
                    ▼
    ┌──────────────────────────────────┐
    │ Apply Advanced Rules             │
    │ └─ Evaluate JSONB conditions     │
    └──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 5: EDGE FUNCTIONS                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  Periodic Job Executor (pg_cron - a cada 15 min)
         │
         ▼
  ┌─────────────────────────────────────────┐
  │ /functions/send-alert-email             │
  │ ├─ Fetch v_pending_emails               │
  │ ├─ Build HTML from template             │
  │ ├─ Send via SMTP                        │
  │ └─ Update delivery status               │
  └─────────────────────────────────────────┘
         │
  ┌──────┴────────────────────────────┐
  ▼                                   ▼
  Email Service                    Webhook Processor
  (Sendgrid/AWS SES)              (HTTP POST + retry)
         │                             │
         ▼                             ▼
    External SMTP                  External APIs
    user@clinic.com            webhook-receiver.com

┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL INTEGRATIONS                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────┐
  │   Email Providers│  │ Twilio SMS API  │  │ Firebase     │
  │                  │  │                 │  │ Push Service │
  │ - Sendgrid       │  │ - Account SID   │  │              │
  │ - AWS SES        │  │ - Auth Token    │  │ Device Token │
  │ - Mailgun        │  │ - From Number   │  │ Notification│
  │                  │  │                 │  │              │
  └──────────────────┘  └─────────────────┘  └──────────────┘
         │                     │                     │
         └─────────┬───────────┴─────────────────────┘
                   │
         ┌─────────▼──────────────┐
         │  User Devices/Services │
         │  ├─ Email inbox        │
         │  ├─ Phone SMS          │
         │  ├─ Browser Push       │
         │  ├─ Mobile App         │
         │  └─ External Webhooks  │
         └───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    DATA FLOW DIAGRAM                                        │
└─────────────────────────────────────────────────────────────────────────────┘

  [TRIGGER ALERT]
       │
       ▼
  [CREATE alert_notification]
       │
       ├─ Create email_log (if email enabled)
       ├─ Create sms_log (if sms enabled + CRITICAL/HIGH)
       ├─ Store push subscription data
       ├─ Execute automation_actions
       ├─ Queue webhook_call (if url configured)
       └─ Evaluate advanced_alert_rules
       │
       ▼
  [NOTIFY USER]
       │
       ├─► Email via SMTP
       ├─► SMS via Twilio
       ├─► Push via Service Worker
       └─► External System via Webhook
       │
       ▼
  [USER INTERACTION]
       │
       ├─ Resolve Alert
       ├─ Dismiss Alert
       └─ Click Notification
       │
       ▼
  [UPDATE STATUS]
       │
       ├─ Update alert_notifications.status
       ├─ Update email_logs.delivery_status
       ├─ Log action in automation_logs
       └─ Refresh UI (Real-time via Supabase)

┌─────────────────────────────────────────────────────────────────────────────┐
│                    REAL-TIME UPDATES (Supabase Channels)                    │
└─────────────────────────────────────────────────────────────────────────────┘

  AlertCenter UI
       │
       ├─► Subscribe to alert_notifications
       ├─► Subscribe to email_logs
       ├─► Subscribe to automation_logs
       └─► Listen for status updates
       │
       ▼
  [INSERT/UPDATE/DELETE Events]
       │
       ├─ New alert appears instantly
       ├─ Delivery status updates
       ├─ Automation execution logged
       └─ Dashboard refreshes
       │
       ▼
  [REAL-TIME UI]
       │
       ├─ Badge count updates
       ├─ Alert list refreshes
       ├─ Email logs update
       ├─ Analytics recalculate
       └─ NotificationBell dropdown refreshes

```

## 🔄 FLUXO DE PROCESSAMENTO (Exemplo Completo)

```
1. [09:15] Alerta de Inadimplência Detectado
   └─► create_alert_if_delinquency() function executa
   └─► INSERT alert_notifications com severity='HIGH'

2. [09:15:001] Triggers Automáticos Disparam
   ├─► on_alert_notification_send_email()
   │   └─► queue_alert_email() → email_logs (status=pending)
   │
   ├─► on_alert_notification_send_sms()
   │   └─► check_sms_throttle() ✅
   │   └─► queue_alert_sms() → sms_logs (status=pending)
   │
   ├─► on_alert_trigger_automations()
   │   └─► evaluate rule conditions
   │   └─► execute_automation_action() → automation_logs
   │   └─► CREATE ticket para cobrança
   │
   ├─► on_alert_queue_webhook()
   │   └─► queue_webhook_call() → webhook_calls (status=pending)
   │
   └─► on_alert_apply_advanced_rules()
       └─► Verificar advanced_alert_rules
       └─► execute_rule_actions()

3. [09:16] Scheduled Job Executa (a cada 5 min)
   └─► Edge Function /send-alert-email
   └─► GET v_pending_emails
   └─► Processa 10 emails por vez
   └─► UPDATE email_logs.delivery_status = 'sent'

4. [09:17] Scheduled Job Executa (a cada 5 min)
   └─► Edge Function /process-webhooks
   └─► GET v_pending_webhooks
   └─► POST para webhook_url
   └─► UPDATE webhook_calls.response_status

5. [09:18] Scheduled Job Executa (a cada 15 min)
   └─► check_and_trigger_alerts()
   └─► UPDATE scheduled_jobs.last_run_at
   └─► UPDATE scheduled_jobs.success_count

6. [09:20] User Abre AlertCenter
   └─► UI Subscribe to alert_notifications
   └─► Real-time Supabase channel
   └─► Recebe novo alerta em tempo real
   └─► Exibe na aba Alerts Ativos

7. [09:22] User Clica "Resolver"
   └─► UPDATE alert_notifications.status = 'resolved'
   └─► UPDATE alert_notifications.resolved_at = NOW()
   └─► Real-time atualiza UI
   └─► Move alerta para Histórico

8. [09:25] Notificações Entregues
   └─► Email delivered (provider callback)
   └─► SMS delivered (Twilio webhook)
   └─► Push displayed (Service Worker)
   └─► UPDATE status em logs correspondentes
```

---

## 📊 PERFORMANCE & SCALING

```
Limite de Alertas por Clínica:
  - Criação: até 1000/minuto
  - Notificações: até 500 simultâneas
  - Emails: até 100/minuto (throttled)
  - SMS: até 10/minuto (throttled)
  - Webhooks: até 50/minuto (retry logic)

Índices Otimizados:
  ✅ idx_clinic_alert (email_logs, sms_logs, etc)
  ✅ idx_status_date (queries por status + data)
  ✅ idx_scheduled_jobs_active (próximos jobs)
  ✅ idx_sms_logs_pending (SMS pendentes)
  ✅ idx_alert_logs_pending (Email pendentes)

Queries Críticas:
  ✅ v_pending_emails: <10ms
  ✅ v_pending_webhooks: <10ms
  ✅ v_pending_sms: <5ms
  ✅ getAlertStats(): <20ms
```

---

**Diagrama Atualizado: 28/05/2026**
**Versão: 2.0 (Etapa 8 + Etapa 9 Melhorias)**
