# 📌 QUICK REFERENCE - COMANDOS RÁPIDOS

**Coloque este arquivo na sua tela para referência rápida**

---

## 🎯 EXECUTAR EM ORDEM

### Passo 1: Integrar JobMonitor
```bash
# Edite arquivo:
code src/AppRoutes.jsx

# Adicione import (topo):
import JobMonitor from '@/pages/financeiro/JobMonitor'

# Adicione rota (dentro children de /clinica/financeiro):
{ path: 'jobs', element: <JobMonitor /> }

# Salve: Ctrl+S
# Teste: http://localhost:3000/clinica/financeiro/jobs
```

### Passo 2: Resend API
```bash
# 1. Abra: https://resend.com
# 2. Sign Up
# 3. Create Project
# 4. Copy API Key (re_xxxxx)
# 5. Edite .env
# 6. Adicione: RESEND_API_KEY=re_xxxxx
```

### Passo 3: Deploy Function
```bash
# Terminal - execute:
supabase functions deploy send-alert-email

# Adicionar secret:
supabase secrets set RESEND_API_KEY=re_xxxxx

# Verificar:
supabase functions list
```

### Passo 4: Teste Email
```bash
# Terminal - execute:
node scripts/test-email-system.js

# Quando pedir:
# → Selecione: s
# → Digite seu email
# → Pressione Enter
```

### Passo 5: Validar
```bash
# Browser: http://localhost:3000/clinica/financeiro/jobs
# Veja: 5 jobs aparecem
# Clique: "Executar Agora"
# Veja: Status muda ✅
```

---

## 🗄️ SQL - SE PRECISAR EXECUTAR

### Verificar Jobs
```sql
SELECT * FROM v_job_status;
```

### Executar Job Manual
```sql
SELECT execute_scheduled_job('55707ac5-eb4f-49a8-a7b9-b258dab349c1');
```

### Ver Resultado
```sql
SELECT * FROM job_runs 
ORDER BY started_at DESC 
LIMIT 1;
```

### Verificar Emails Pendentes
```sql
SELECT * FROM v_pending_emails;
```

### Ver Emails Processados
```sql
SELECT * FROM email_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🐛 PROBLEMAS COMUNS

### JobMonitor mostra 404
```bash
# Verificar se import foi adicionado
# Verificar se rota foi adicionada
# Restart: npm run dev
# Check: F12 Console
```

### Email não funciona
```bash
# Verificar secret:
supabase secrets list

# Ver logs:
supabase functions logs send-alert-email

# Testar novamente:
node scripts/test-email-system.js
```

### App não conecta Supabase
```bash
# Fazer login em:
http://localhost:3000/login

# Depois tentar novamente:
http://localhost:3000/clinica/financeiro/jobs
```

---

## ⏱️ TEMPOS

| Ação | Tempo |
|------|-------|
| Passo 1 (JobMonitor) | 5 min |
| Passo 2 (Resend) | 5 min |
| Passo 3 (Deploy) | 3 min |
| Passo 4 (Teste) | 5 min |
| Passo 5 (Validar) | 5 min |
| **TOTAL** | **23 min** |

---

## 📚 AJUDA

| Preciso... | Abra... |
|-----------|---------|
| Entender tudo | ⚡_ETAPA9_MELHORIAS_RESUMO_COMPLETO.md |
| Roadmap | ⚡_VISUAL_ROADMAP_48H.md |
| Troubleshoot | ⚡_EMAIL_DEPLOY_TESTE.md |
| Arquivo inicial | 🚀_COMECE_AQUI_README.md |
| Tudo | 📑_INDEX_MASTER_TODOS_ARQUIVOS_ETAPA9.md |

---

## 🎊 RESULTADO

Quando terminar os 5 passos:

```
✅ JobMonitor integrado
✅ Email enviado
✅ Email recebido
✅ Jobs monitoráveis
✅ Sistema funciona 100%
```

---

**Tempo agora:** 0  
**Tempo resultado:** 23 min  
**Dificuldade:** ⭐ Fácil

**VAMOS! 👇 Execute os 5 passos acima!**

---

*Quick Reference v1.0*  
*Imprima ou coloque na tela →*
