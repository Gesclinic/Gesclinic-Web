# ⚡ QUICK START: 30 MIN HOJE

**Objetivo:** Deploy send-alert-email + Teste email + JobMonitor integrado  
**Tempo:** 30 minutos  
**Resultado:** Email funcionando end-to-end

---

## ⏱️ TIMELINE

```
0:00 - 0:05    Resend Setup
0:05 - 0:10    Deploy Edge Function
0:10 - 0:15    Teste Email
0:15 - 0:25    Integrar JobMonitor
0:25 - 0:30    Validação Final
```

---

## 🚀 STEP 1: Resend Setup (5 min)

### 1.1 Criar Conta Resend
```
1. Abra: https://resend.com
2. Clique: Sign Up
3. Complete: email + password
4. Verify: email
```

### 1.2 Gerar API Key
```
1. Dashboard → Projects
2. Click: "Create New Project"
3. Nome: "Gesclinic Alerts"
4. Click: Create
5. Click: API Keys (menu esquerdo)
6. COPY: re_xxxxxxxxxxxxxxx
```

### 1.3 Adicionar ao .env
```bash
# Terminal - abra .env
RESEND_API_KEY=re_xxxxxxxxxxxxxxx
```

**✅ Pronto!**

---

## 🚀 STEP 2: Deploy Edge Function (5 min)

### 2.1 Deploy
```bash
# Terminal
supabase functions deploy send-alert-email

# Esperado:
# ✓ Finished supabase functions deploy
# Deployed function send-alert-email
```

### 2.2 Adicionar Secret em Supabase
```bash
# Terminal
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxx

# Esperado:
# ✓ Secret saved
```

### 2.3 Verificar
```bash
# Terminal
supabase functions list

# Esperado:
# send-alert-email          active
```

**✅ Function deployada!**

---

## 🚀 STEP 3: Teste Email (5 min)

### 3.1 Rodar Script de Teste
```bash
# Terminal
node scripts/test-email-system.js

# Irá:
# ✓ Validar variáveis
# ✓ Testar Resend API
# ✓ Testar Supabase
# ✓ Listar emails pendentes
```

### 3.2 Enviar Email de Teste
```
Quando perguntado:
Deseja enviar um email de teste? (s/n): s
Email para teste: seu-email@exemplo.com

Esperado:
✓ Email enviado! ID: xxxxx
```

### 3.3 Verificar Inbox
```
1. Abra seu email
2. Procure por: "Email de Teste - Gesclinic Alerts"
3. Se recebeu → ✅ Sucesso!
```

**✅ Email funcionando!**

---

## 🚀 STEP 4: Integrar JobMonitor (10 min)

### 4.1 Editar AppRoutes.jsx
```bash
# Terminal - abra arquivo
code src/AppRoutes.jsx

# Procure por: const ROUTES = [
# Dentro de clinica routes, adicione:

{
  path: 'jobs',
  element: <JobMonitor />
}

# Adicione import no topo:
import JobMonitor from '@/pages/financeiro/JobMonitor'
```

### 4.2 Adicionar Link no Menu
```bash
# Abra: src/components/layout/AppLayout.jsx (ou similar)

# Procure por: <NavLink ... financeiro
# Adicione depois:

<NavLink to="/clinica/financeiro/jobs" className="flex items-center gap-2">
  <Clock className="w-4 h-4" />
  Jobs
</NavLink>

# Adicione import:
import { Clock } from 'lucide-react'
```

### 4.3 Testar no Browser
```bash
# Terminal
npm run dev

# Browser
1. Navegue: http://localhost:3000/clinica/financeiro/jobs
2. Deve mostrar: 5 jobs
3. Clique em: "Executar Agora" em um job
4. Deve mudar para: "✅ Saudável"
```

**✅ JobMonitor integrado!**

---

## 🚀 STEP 5: Validação Final (5 min)

### 5.1 Testar Alert → Email Flow
```sql
-- Supabase SQL Editor

-- 1. Criar alerta
INSERT INTO alert_notifications (
  clinic_id,
  alert_type,
  severity,
  title,
  message,
  status
) VALUES (
  'seu-clinic-id', -- MUDE ISSO!
  'LOW_CASHFLOW',
  'HIGH',
  'Teste: Fluxo Baixo',
  'Teste completo do sistema',
  'active'
);

-- 2. Verificar email queued
SELECT * FROM v_pending_emails;

-- Deve retornar 1 email
```

### 5.2 Processar Email Manualmente
```bash
# Terminal
curl -X POST https://seu-project.supabase.co/functions/v1/send-alert-email \
  -H "Authorization: Bearer seu-anon-key"

# Esperado:
# {"success":true,"message":"Emails processed"}
```

### 5.3 Verificar Entrega
```sql
-- Supabase SQL Editor
SELECT delivery_status FROM email_logs 
ORDER BY created_at DESC LIMIT 1;

-- Esperado: "sent"
```

### 5.4 Conferir JobMonitor
```
1. Browser: http://localhost:3000/clinica/financeiro/jobs
2. Ver job: "process_emails_every_5min"
3. Deve mostrar: "✅ Saudável"
4. Ver execução: 1 run, 1 success
```

**✅ TUDO FUNCIONANDO!**

---

## ✅ CHECKLIST FINAL

- [ ] Resend API key gerada
- [ ] `.env` atualizado com RESEND_API_KEY
- [ ] Edge Function deployada
- [ ] Secret adicionado em Supabase
- [ ] Script de teste passando
- [ ] Email de teste recebido
- [ ] JobMonitor integrado
- [ ] Menu com link para Jobs
- [ ] JobMonitor mostrando 5 jobs
- [ ] Alerta → Email flow funcionando
- [ ] Status "sent" em email_logs

---

## 🎯 PRÓXIMOS PASSOS

Após completar os 30 min:

1. **Integrar EmailLogs** - Mostrar logs em UI
2. **Setup pg_cron** - Jobs rodarem automaticamente
3. **SMS Integration** - Twilio setup
4. **Push Notifications** - VAPID keys

---

## 🆘 PROBLEMAS?

### "RESEND_API_KEY not found"
```bash
supabase secrets list
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase functions deploy send-alert-email
```

### "Function not found"
```bash
supabase functions list  # Verificar se está lá
supabase functions deploy send-alert-email --no-verify-jwt
```

### "Email não enviado"
```sql
SELECT * FROM v_pending_emails;
SELECT error_message FROM email_logs WHERE delivery_status = 'failed';
```

### "JobMonitor não carrega"
- Verificar se foi importado em AppRoutes.jsx
- Verificar console do browser (F12)
- Restart: `npm run dev`

---

## 📝 NOTAS

- Clinic ID deve ser substituído no SQL
- RESEND_API_KEY começa sempre com `re_`
- Function URL: `https://seu-project.supabase.co/functions/v1/send-alert-email`
- Auto-key: Supabase anon key (não service role)

---

**⏱️ Você consegue fazer em 30 minutos!**

**Status:** Pronto para começar NOW! 🚀
