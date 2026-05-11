# 🔧 INSTRUÇÕES TÉCNICAS - STAGING DEPLOYMENT

**Data:** 11/05/2026 (Preparação para 12/05)  
**Versão:** v0.3.0  
**Ambiente:** Staging  
**Status:** ✅ Pronto para execução  

---

## 📋 PRÉ-REQUISITOS VERIFICADOS

### ✅ Local Development
```
✅ npm run dev     → Rodando em http://localhost:3000
✅ Git status      → Clean (b30e64a4)
✅ Dependencies    → Instaladas (npm install OK)
✅ Tests           → 77/77 passando (100%)
✅ Build           → Pronto (npm run build disponível)
```

### ✅ Git & Versioning
```
✅ Branch           → develop (HEAD)
✅ Tag              → v0.3.0 (anotada)
✅ Remote           → https://github.com/Gesclinic/Gesclinic-Web.git
✅ Last commit      → b30e64a4 (merge completo)
✅ History          → Limpo (sem conflitos)
```

### ✅ Migrations
```
✅ Arquivo          → 20260114_add_slug_to_plans.sql
✅ Ordem            → Após COMPREHENSIVE_INIT ✓
✅ Status           → Pronto para aplicação
✅ Dependências     → Tabela 'plans' garantida existir
```

---

## 🚀 PASSO 1: BUILD PARA PRODUÇÃO

### Local: Criar artefato de build

```bash
cd "C:\Users\ferna\Desktop\Projeto Gesclinic Web"

# 1. Limpar build anterior (se houver)
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

# 2. Instalar dependências (se não fizer desde o último npm install)
npm install --legacy-peer-deps

# 3. Build otimizado para produção
npm run build

# 4. Verificar artefatos criados
Get-ChildItem dist/ -Recurse | Measure-Object -Line

# Esperado: dist/ com ~800-1200 arquivos, ~2-3 MB
```

### Docker (Opcional)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps
RUN npm run build
# Servir com nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🚀 PASSO 2: CONFIGURAR AMBIENTE STAGING

### Environment Variables (Staging Server)

```bash
# .env.staging ou Variáveis do Sistema

# Supabase
VITE_SUPABASE_URL=https://xfzvkvvyzzblmfxdmbty.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Node
NODE_ENV=staging
NODE_OPTIONS=--max-old-space-size=512

# Server
PORT=3000
HOST=0.0.0.0

# Logging
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:pass@staging-db:5432/gesclinic_staging
```

### Validação
```bash
# Verificar variáveis carregadas
echo $env:VITE_SUPABASE_URL
echo $env:NODE_ENV

# Ping Supabase
curl -I https://xfzvkvvyzzblmfxdmbty.supabase.co
# Esperado: 200 OK
```

---

## 🚀 PASSO 3: APLICAR MIGRAÇÕES

### Via Supabase Dashboard (Recomendado)

```sql
-- 1. Backup database
-- ✅ Supabase faz automaticamente (retention: 30 dias)

-- 2. Execute migration script
-- Arquivo: supabase/migrations/20260114_add_slug_to_plans.sql

ALTER TABLE plans 
ADD COLUMN slug TEXT UNIQUE;

CREATE INDEX idx_plans_slug ON plans(slug);

-- 3. Verificar sucesso
SELECT COUNT(*) FROM plans;
SELECT column_name FROM information_schema.columns 
WHERE table_name='plans' AND column_name='slug';

-- Esperado: slug column existe, 0 errors
```

### Via Supabase CLI

```bash
# Se usando Supabase CLI
supabase migration up

# Verificar status
supabase migration list

# Esperado: 20260114_add_slug_to_plans.sql [APPLIED]
```

---

## 🚀 PASSO 4: DEPLOY APLICAÇÃO

### Opção A: Manual (Staging Server)

```bash
# No servidor staging

# 1. Clone ou pull latest
cd /var/www/gesclinic-staging
git fetch origin develop
git checkout develop
git pull origin develop

# 2. Instalar dependências
npm install --legacy-peer-deps

# 3. Build
npm run build

# 4. Servir com PM2 ou Nginx
# Se usando PM2:
pm2 start "npm run preview" --name gesclinic-staging
pm2 save
pm2 startup

# Se usando Nginx (reverse proxy para :3000):
# Configuração nginx disponível em docs/nginx.conf.example
```

### Opção B: Docker

```bash
# No servidor staging

# 1. Build image
docker build -t gesclinic:v0.3.0-staging .

# 2. Run container
docker run -d \
  --name gesclinic-staging \
  -p 3000:3000 \
  -e VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  -e VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  -e NODE_ENV=staging \
  gesclinic:v0.3.0-staging

# 3. Verificar logs
docker logs -f gesclinic-staging
```

### Opção C: CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging
on:
  push:
    branches: [develop]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm install --legacy-peer-deps
      - run: npm run build
      - name: Deploy to Staging
        run: |
          scp -r dist/* staging-server:/var/www/gesclinic-staging/
          ssh staging-server 'systemctl restart gesclinic-staging'
```

---

## ✅ PASSO 5: VALIDAÇÃO PÓS-DEPLOY

### Health Checks

```bash
# 1. Aplicação respondendo
curl http://staging.gesclinic.local:3000
# Esperado: 200 OK, HTML content

# 2. API respondendo
curl http://staging.gesclinic.local:3000/api/health
# Esperado: { status: "ok" }

# 3. Supabase conectado
curl -H "Authorization: Bearer $TOKEN" \
  http://staging.gesclinic.local:3000/api/clinics
# Esperado: 200 OK com JSON

# 4. Database respondendo
# Via SQL admin, verificar:
SELECT 1 FROM appointments LIMIT 1;
# Esperado: 1 row
```

### Logs Verificação

```bash
# Aplicação logs
tail -f /var/log/gesclinic/staging.log
# Esperado: No ERRORs, INFO messages normal

# Nginx logs (se usando reverse proxy)
tail -f /var/log/nginx/gesclinic-staging.access.log
tail -f /var/log/nginx/gesclinic-staging.error.log
# Esperado: 200 status codes

# Sistema logs
journalctl -u gesclinic-staging -f
# Esperado: Active (running) status
```

### Métricas Iniciais

```
CPU Usage:        < 30%
Memory Usage:     < 50%
Disk Usage:       < 70%
Response Time:    < 500ms
Error Rate:       < 0.1%
Uptime:           > 5 minutes
```

---

## 🧪 PASSO 6: SMOKE TESTS

### Teste Básico via Browser

```javascript
// Abrir DevTools (F12) e executar:

// 1. Verificar Supabase conectado
window.__SUPABASE__ ? 'Connected' : 'Not connected'
// Esperado: Connected

// 2. Verificar app rodando
document.title
// Esperado: "Gesclinic - Agenda Enterprise"

// 3. Verificar sem console errors
// Verificar aba Console - sem ERRORs vermelhos

// 4. Fazer login e testar CRUD
// Ver: 🎯_ETAPA2_STAGING_PLANO.md → Smoke Test Checklist
```

### Teste via API (cURL/Postman)

```bash
# 1. Listar clínicas
curl -H "Authorization: Bearer $SUPABASE_TOKEN" \
  "http://staging.gesclinic.local/api/clinics"

# 2. Criar agendamento (test)
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-05-12","time":"14:30","professional":"Dr. Test"}' \
  "http://staging.gesclinic.local/api/appointments"

# 3. Listar agendamentos
curl "http://staging.gesclinic.local/api/appointments?date=2026-05-12"

# Esperado: Todos 200 OK com JSON válido
```

---

## 🔍 PASSO 7: VALIDAÇÃO ESPECÍFICA v0.3.0

### Timezone Verification

```javascript
// No console do browser (staging)

// 1. Verificar offset correto (São Paulo = -3)
new Date().getTimezoneOffset() / 60
// Esperado: 3 (UTC-3) ou 2 (UTC-2 DST)

// 2. Criar agendamento às 14:30 e verificar salvamento
// Via API:
{
  "scheduled_date": "2026-05-12",
  "scheduled_time": "14:30:00",
  "timezone": "America/Sao_Paulo"
}
// Esperado: Salvo corretamente no banco

// 3. Recuperar e verificar exibição
// Esperado: Mostra "14:30" (não "17:30" ou offset)

// 4. Teste realtime: abrir 2 abas
// Tab 1: Criar agendamento
// Tab 2: Deve aparecer em <500ms
// Esperado: Sincronizado em ambas
```

### Migration Verification

```sql
-- No Supabase SQL Editor

-- 1. Verificar coluna slug existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name='plans' AND column_name='slug';
-- Esperado: 1 row, slug TEXT

-- 2. Verificar índice criado
SELECT indexname FROM pg_indexes 
WHERE tablename='plans' AND indexname LIKE '%slug%';
-- Esperado: 1 row (idx_plans_slug ou similar)

-- 3. Verificar dados intactos
SELECT COUNT(*) FROM plans;
-- Esperado: Mesmo número de antes
```

---

## 📊 PASSO 8: PERFORMANCE BASELINE

### Métricas a Coletar

```bash
# 1. Page Load Time
# DevTools → Performance → Record page load
# Esperado: < 3 segundos

# 2. API Response Time
# DevTools → Network → Filtrar XHR
# Esperado: < 500ms

# 3. Timezone Operation Time
# Console: time/timeEnd para operações
# Esperado: < 5ms

# 4. Database Query Time
# Logs: Check query duration
# Esperado: < 100ms

# 5. Realtime Sync Latency
# Criar item em tab 1
# Medir tempo até aparecer em tab 2
# Esperado: < 500ms
```

### Coletar com Monitoring

```bash
# Se usando Sentry, DataDog, ou similar:
# Configurar SDK:
Sentry.init({
  dsn: "https://key@staging.sentry.io/project",
  environment: "staging",
  tracesSampleRate: 0.1,
});

# Métricas automáticas coletadas:
# - Performance traces
# - Error tracking
# - Session replays
# - Release tracking
```

---

## 🚨 TROUBLESHOOTING

### Problema: "Port 3000 is already in use"
```bash
# Solução:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
# Ou usar porta diferente:
npm run build
npm run preview -- --port 3001
```

### Problema: "VITE_SUPABASE_URL não definida"
```bash
# Solução: Verificar environment variables
echo $env:VITE_SUPABASE_URL
# Se vazio:
$env:VITE_SUPABASE_URL="https://..."
npm run dev
```

### Problema: "Migration failed - table plans doesn't exist"
```sql
-- Solução: Verificar ordem de migrations
SELECT id, name FROM migrations 
ORDER BY created_at;

-- Garantir COMPREHENSIVE_INIT rodou antes de add_slug
-- Renomear se necessário:
-- DE: 20260112_add_slug_to_plans.sql
-- PARA: 20260114_add_slug_to_plans.sql (já feito!)
```

### Problema: "Timezone offset incorreto (mostrando +3 em vez de -3)"
```javascript
// Solução: Verificar helpers timezone
import { toLocalTime, getTimezoneOffset } from '@/utils/timezoneHelpers';

// Debugar:
console.log(getTimezoneOffset());
// Esperado: -3 (negativo para oeste)

// Se incorreto, verificar:
// 1. TIMEZONE = 'America/Sao_Paulo' em timezoneHelpers.js
// 2. date-fns-tz instalado
// 3. Cache navegador limpo
```

---

## 📋 CHECKLIST PRÉ-STAGING

```
Before deploying to staging:

Código
- [ ] npm run build succeeds
- [ ] No build warnings
- [ ] dist/ folder created (2-3 MB)

Environment
- [ ] VITE_SUPABASE_URL set
- [ ] VITE_SUPABASE_ANON_KEY set
- [ ] NODE_ENV=staging
- [ ] Port 3000 free (or configured)

Database
- [ ] Staging database exists
- [ ] Migrations ready
- [ ] Backup created
- [ ] Connection string valid

Git
- [ ] HEAD on develop (b30e64a4)
- [ ] Tag v0.3.0 created
- [ ] origin/develop updated
- [ ] No uncommitted changes

Tests
- [ ] All 77 tests pass locally
- [ ] npm run dev works
- [ ] No console errors
- [ ] Timezone tests pass

Documentation
- [ ] Release notes ready
- [ ] Deployment guide ready
- [ ] Smoke test checklist ready
- [ ] Rollback plan ready
```

---

## 📞 SUPPORT

**During Staging:**
- Slack: #deployment-v0.3.0
- On-Call: [On-call contact]
- Escalation: Tech Lead

**Issues Found:**
- Create ticket: https://github.com/Gesclinic/Gesclinic-Web/issues
- Label: `staging`, `v0.3.0`, `urgent` if needed
- Assign: To corresponding team

---

## ✅ PRÓXIMO PASSO

**After successful staging validation (12/05):**
→ Production deployment script (13/05)

**Files:**
- 📋 STAGING_SMOKE_TEST_REPORT_[DATE].md
- 📋 PRODUCTION_DEPLOYMENT_CHECKLIST.md

---

**Status:** ✅ PRONTO PARA STAGING DEPLOYMENT  
**Data:** 11/05/2026  
**Versão:** v0.3.0  
**Próximo:** 12/05/2026 - Staging

🚀 **Siga estes passos para deploy bem-sucedido em staging!**
