# 📧 SETUP: RESEND API PARA EMAIL

**Objetivo:** Configurar Resend como provedor de email  
**Tempo:** 5-10 minutos  
**Resultado:** Emails funcionando end-to-end

---

## Passo 1: Criar Conta Resend (GRATUITO)

### 1.1 Ir para Resend
- URL: https://resend.com
- Clique em "Sign Up"
- Use email profissional (ex: seu-email@seudominio.com)

### 1.2 Criar Projeto
- Dashboard → Projects → Create New Project
- Nome: "Gesclinic Alerts"
- Clique em "Create"

### 1.3 Obter API Key
- Na página do projeto, clique em "API Keys"
- Copiar a **API Key** (começa com `re_`)
- Guardar em local seguro

---

## Passo 2: Adicionar ao .env

Editar `.env` na raiz do projeto:

```env
# Email Configuration (Resend)
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXX

# Email from address
EMAIL_FROM=alerts@gesclinic.com
```

⚠️ **NÃO commitar** `.env` com chaves reais!

---

## Passo 3: Setup em Supabase

### 3.1 Adicionar Secrets ao Supabase

Via Supabase Dashboard:

1. Project Settings → Edge Functions → Secrets
2. Clique em "New Secret"
3. Adicionar:

```
Name: RESEND_API_KEY
Value: re_XXXXXXXXXXXXXXXXXXXXXXXX
```

4. Clique "Save"

### 3.2 Verificar

```bash
supabase secrets list
```

Deve retornar:
```
RESEND_API_KEY = (masked)
```

---

## Passo 4: Testar API Key

```bash
# Via curl
curl -X POST https://api.resend.com/emails \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer re_XXXXXXXXXXXXXXXXXXXXXXXX' \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "seu-email@exemplo.com",
    "subject": "Hello World",
    "html": "<strong>It works!</strong>"
  }'
```

✅ Se retornar `"created": true` → API Key válida!

---

## ALTERNATIVA: SendGrid (OPCIONAL)

Se preferir SendGrid:

### Setup SendGrid

1. Criar conta: https://sendgrid.com
2. Dashboard → API Keys → Create API Key
3. Copiar chave (começa com `SG.`)

### Adicionar ao .env

```env
SENDGRID_API_KEY=SG.XXXXXXXXXXXXXXXXXXXXX
```

### Edge Function adaptada

Veja seção "Adaptar para SendGrid" abaixo.

---

## 🚀 PRÓXIMO: Deploy da Edge Function

Após setup das chaves, execute:

```bash
# Deploy da função
supabase functions deploy send-alert-email

# Verificar
supabase functions list
```

---

## ✅ Checklist

- [ ] Conta Resend criada
- [ ] API Key gerada
- [ ] `.env` atualizado localmente
- [ ] Secret adicionado em Supabase
- [ ] API Key testada com curl
- [ ] Edge Function pronta para deploy

---

*Guia atualizado: 28/05/2026*
