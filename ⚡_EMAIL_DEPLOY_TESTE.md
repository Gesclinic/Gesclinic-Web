# 🚀 DEPLOY & TESTE: send-alert-email Edge Function

**Tempo:** ~15 minutos  
**Status:** Pronto para produção

---

## 📋 Pré-requisitos

✅ Edge Function criada em `supabase/functions/send-alert-email/index.ts`  
✅ Resend API Key configurada em `.env`  
✅ Secret `RESEND_API_KEY` adicionado em Supabase  

---

## 🚀 PASSO 1: Deploy da Edge Function

### 1.1 Deploy via CLI

```bash
# Terminal - no diretório do projeto
supabase functions deploy send-alert-email

# Output esperado:
# ✓ Finished supabase functions deploy
# Deployed function send-alert-email
```

### 1.2 Verificar Deploy

```bash
# Listar functions
supabase functions list

# Ver detalhes
supabase functions describe send-alert-email

# Ver logs (se houver)
supabase functions logs send-alert-email
```

### 1.3 Testar Health Check

```bash
# Health check (GET)
curl https://seu-project.supabase.co/functions/v1/send-alert-email \
  -H "Authorization: Bearer seu-anon-key"

# Resultado esperado:
# {"status":"ok","message":"Email processor running"}
```

---

## 🧪 PASSO 2: Teste End-to-End

### 2.1 Executar Script de Teste

```bash
# Terminal
node scripts/test-email-system.js

# Irá:
# ✅ Validar variáveis de ambiente
# ✅ Testar Resend API Key
# ✅ Testar conexão Supabase
# ✅ Listar emails pendentes
# ✅ (Opcional) Enviar email de teste
```

### 2.2 Teste Manual no Supabase

```sql
-- 1. Criar um alerta de teste
INSERT INTO alert_notifications (
  clinic_id,
  alert_type,
  severity,
  title,
  message,
  status
) VALUES (
  '85c6e7d6-2a36-4e5e-9f2a-1b5c8d9e0f1a', -- seu clinic_id
  'LOW_CASHFLOW',
  'HIGH',
  'Teste - Fluxo de Caixa Baixo',
  'Este é um email de teste',
  'active'
);

-- 2. Verificar se email foi queued
SELECT * FROM email_logs 
WHERE clinic_id = '85c6e7d6-2a36-4e5e-9f2a-1b5c8d9e0f1a'
ORDER BY created_at DESC 
LIMIT 1;

-- Resultado esperado:
-- delivery_status = 'pending'
-- recipient_email = (email configurado)
-- retry_count = 0
```

### 2.3 Disparar Processamento

```bash
# Via curl - Trigger a função
curl -X POST https://seu-project.supabase.co/functions/v1/send-alert-email \
  -H "Authorization: Bearer seu-anon-key" \
  -H "Content-Type: application/json" \
  -d '{}'

# Resultado esperado:
# {"success":true,"message":"Emails processed"}
```

### 2.4 Verificar Entrega

```sql
-- Ver status do email
SELECT * FROM email_logs 
WHERE clinic_id = '85c6e7d6-2a36-4e5e-9f2a-1b5c8d9e0f1a'
ORDER BY created_at DESC 
LIMIT 1;

-- Resultado esperado após ~2 segundos:
-- delivery_status = 'sent'
-- updated_at = (timestamp recente)
```

---

## 📨 PASSO 3: Testar via Browser

### 3.1 Criar Alerta via AlertCenter

1. Abra http://localhost:3000/clinica/financeiro/alerts
2. Clique em "Verificar Alertas Agora"
3. Um alerta deve ser criado

### 3.2 Verificar Email Queued

```sql
-- Em Supabase SQL Editor
SELECT * FROM v_pending_emails LIMIT 5;

-- Deve retornar o email que acabou de ser criado
```

### 3.3 Visualizar EmailLogs

1. Abra http://localhost:3000/clinica/financeiro/emails (se página existir)
2. Deve mostrar o email pendente
3. Clique em "Processar Emails"
4. Status deve mudar para "Sent"

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Infrastructure
- [ ] Resend API Key testada e funcional
- [ ] Secret `RESEND_API_KEY` em Supabase
- [ ] Edge Function deployada sem erros
- [ ] Health check retorna 200 OK

### Database
- [ ] Trigger `on_alert_notification_send_email` ativo
- [ ] View `v_pending_emails` retornando dados
- [ ] Tabela `email_logs` populada

### Funcionalidade
- [ ] Email queued quando alerta criado
- [ ] Edge Function processa emails
- [ ] Delivery status muda para 'sent'
- [ ] Email recebido no inbox

### Resilience
- [ ] Retry logic funciona em caso de falha
- [ ] Max retries limita tentativas
- [ ] Error messages registradas

---

## 🔧 TROUBLESHOOTING

### Erro: "RESEND_API_KEY not found"

```bash
# Verificar se secret foi adicionado
supabase secrets list

# Se não mostrar RESEND_API_KEY, adicione:
supabase secrets set RESEND_API_KEY=re_xxxxx

# Deploy novamente
supabase functions deploy send-alert-email
```

### Erro: "Invalid Authorization header"

```bash
# Usar anon key para public function
curl -X POST https://seu-project.supabase.co/functions/v1/send-alert-email \
  -H "Authorization: Bearer seu-anon-key"
```

### Email não é enviado

```sql
-- Verificar logs
SELECT * FROM email_logs 
WHERE delivery_status IN ('failed', 'pending')
ORDER BY created_at DESC 
LIMIT 5;

-- Verificar trigger
SELECT * FROM notification_logs 
WHERE channel = 'email'
ORDER BY created_at DESC 
LIMIT 5;

-- Verificar função
SELECT execute_scheduled_job('77ec81af-3457-45df-bfc8-2d9b0aa7bca1');
```

### Edge Function timeout

```bash
# Aumentar timeout (default 600s)
supabase functions deploy send-alert-email --max-timeout 900

# Ver logs de erro
supabase functions logs send-alert-email --limit 100
```

---

## 📊 MONITORAMENTO

### Ver logs em tempo real

```bash
supabase functions logs send-alert-email --follow
```

### Dashboard Resend

Acompanhar entregas em: https://dashboard.resend.com/emails

---

## 🎯 PRÓXIMOS PASSOS

Após validar tudo:

1. ✅ Integrar com AlertCenter UI
2. ✅ Adicionar botão "Enviar Email de Teste"
3. ✅ Implementar retry automático via job agendado
4. ✅ Deploy em production

---

## 📝 NOTAS

- **Rate Limiting Resend:** 100 emails/minuto (free plan)
- **Retry Logic:** Automático, 3 tentativas, delay 5 minutos
- **Max Retries:** Configurável em `email_logs.max_retries`
- **Template Variables:** Substituição automática de {{variáveis}}

---

**Documento:** 28/05/2026  
**Status:** Pronto para Deploy
