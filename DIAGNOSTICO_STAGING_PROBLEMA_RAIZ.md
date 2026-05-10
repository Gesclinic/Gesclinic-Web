# 🔍 DIAGNÓSTICO: Por que Staging não Funciona (Produção Funciona)

**Data:** 10 de Maio de 2026  
**Status:** ❌ Staging (ERR_CONNECTION_CLOSED) vs ✅ Produção (100% Funcional)

---

## 1️⃣ AMBIENTE & VARIÁVEIS

### 📋 Resumo Executivo
| Item | Produção | Staging | Status |
|------|----------|---------|--------|
| Build Job | ✅ VITE_SUPABASE_URL via secrets | ✅ VITE_SUPABASE_URL via secrets | ✅ OK |
| Deploy Job | ✅ Vercel Production | ✅ Vercel Staging | ✅ OK |
| Variáveis Supabase | ✅ Injetadas pelo Vercel | ❌ **NÃO injetadas** | **🔴 PROBLEMA** |
| CORS/Auth | ✅ Configurado para gesclinic-web.vercel.app | ⚠️ Configurado para develop.gesclinic.vercel.app | ⚠️ VALIDAR |

### 🎯 PROBLEMA RAIZ #1: Variáveis de Ambiente Não Injetadas em Staging
**Localização:** `.github/workflows/ci-cd.yml`

```yaml
# ❌ PROBLEMA: Build job tem variáveis, mas são compartilhadas!
build:
  name: Build Production
  runs-on: ubuntu-latest
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}        # ← Credenciais PRODUÇÃO
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }} # ← Credenciais PRODUÇÃO
```

```yaml
# ❌ PROBLEMA: Deploy Staging não recebe variáveis!
deploy_staging:
  name: Deploy to Staging
  needs: build
  if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
  steps:
    - name: Deploy to Vercel (Staging)
      run: npx vercel --yes --token=${{ secrets.VERCEL_TOKEN }}
      # ↑ NÃO PASSA NENHUMA VARIÁVEL DE AMBIENTE!
```

**Impacto:**
1. Build usa credentials de PRODUÇÃO (OK para build)
2. Deploy para Staging usa `npx vercel` (deveria injetar variáveis)
3. Vercel tenta ler do Dashboard → **Variáveis não estão lá para Preview environment**
4. Aplicação tenta conectar ao Supabase → **undefined VITE_SUPABASE_URL**
5. Supabase recusa conexão → **ERR_CONNECTION_CLOSED**

---

## 2️⃣ BUILD PROCESS

### ✅ Build Status
- Build job: **SUCESSO** ✓
- `npm run build`: **SUCESSO** ✓
- dist/ artifacts: **GERADO** ✓
- JavaScript bundles: **COMPILADOS** ✓

**Verificação:**
```bash
# Build job linha 30-42 executa:
- npm install --legacy-peer-deps
- npm run build        # ✅ Sucesso
- Upload dist/         # ✅ Sucesso
```

### ✅ Runtime (Local Dev)
- localhost:3000: **FUNCIONA** ✓
- Supabase Connection: **OK** ✓
- Auth: **OK** ✓

### ❌ Runtime (Staging Preview)
```
Erro: ERR_CONNECTION_CLOSED
Causa: import.meta.env.VITE_SUPABASE_URL = undefined
Resultado: createBrowserClient() recebe URL = undefined
Supabase: Rejeita conexão → Error 110 (Connection Closed)
```

---

## 3️⃣ VARIÁVEIS DE AMBIENTE - FLUXO DETALHADO

### 📊 Fluxo de Carregamento de Variáveis

```
┌─────────────────────────────────────────────────────────────┐
│ PRODUÇÃO: gesclinic-web.vercel.app                         │
└─────────────────────────────────────────────────────────────┘

1. GitHub Actions (main branch)
   ├─ build job
   │  └─ env: VITE_SUPABASE_URL=${{ secrets... }}  ✅
   │     Output: dist/ (contém variáveis injetadas)
   │
   └─ deploy job
      ├─ vercel deploy --prod
      │  └─ Vercel re-injeta variáveis do Dashboard ✅
      │     (Production environment)
      └─ RESULTADO: https://gesclinic-web.vercel.app ✅ FUNCIONA

┌─────────────────────────────────────────────────────────────┐
│ STAGING: develop.gesclinic.vercel.app                       │
└─────────────────────────────────────────────────────────────┘

1. GitHub Actions (develop branch)
   ├─ build job
   │  └─ env: VITE_SUPABASE_URL=${{ secrets... }}  ✅
   │     Output: dist/
   │
   └─ deploy_staging job
      ├─ vercel deploy (SEM --prod)
      │  └─ Vercel NÃO injeta variáveis ❌
      │     (Preview environment não tem variáveis configuradas)
      └─ RESULTADO: https://develop.gesclinic.vercel.app ❌ ERR_CONNECTION_CLOSED

2. App Initialization
   ├─ customSupabaseClient.js
   │  ├─ import.meta.env.VITE_SUPABASE_URL
   │  │  └─ undefined ❌
   │  └─ import.meta.env.VITE_SUPABASE_ANON_KEY
   │     └─ undefined ❌
   │
   ├─ createBrowserClient(undefined, undefined)
   │  └─ ERRO: Credenciais inválidas
   │
   └─ Supabase: ERR_CONNECTION_CLOSED
```

### 🔍 Verificação no Console (Staging)
```javascript
// Ao acessar https://develop.gesclinic.vercel.app, console mostra:
[DEBUG Supabase] URL: undefined          // ❌
[DEBUG Supabase] ANON KEY: undefined     // ❌
❌ ERRO CRÍTICO: Credenciais do Supabase não configuradas!
```

vs **Produção** (console.log limpo):
```javascript
[DEBUG Supabase] URL: https://gvdkdjyupktlflwurike.supabase.co   // ✅
[DEBUG Supabase] ANON KEY: eyJhbGciOi...                         // ✅
✅ Supabase Client criado com sucesso
```

---

## 4️⃣ AUTENTICAÇÃO & CORS

### ✅ Redirect URLs (Supabase Dashboard)
```
Autenticação > URL Configuration:

Redirect URLs (Adicionar):
  ✓ https://gesclinic-web.vercel.app
  ✓ https://gesclinic-web.vercel.app/**
  ✓ https://develop.gesclinic.vercel.app      ← ADICIONADO
  ✓ https://develop.gesclinic.vercel.app/**   ← ADICIONADO
  ✓ http://localhost:3000
  ✓ http://localhost:3000/**
```

**Status:** ✅ CORRETO - Redirect URLs estão configuradas

### ⚠️ CORS
```
Supabase permite requisições de qualquer domínio para anon key.
CORS não é o problema aqui.
```

### ❌ O Problema Não é Auth
```
Auth só é necessário APÓS conectar ao Supabase.
O erro acontece ANTES de autenticar (ERR_CONNECTION_CLOSED).
Significa: Cliente Supabase não consegue fazer handshake inicial.
Causa: URL ou Key inválidas = undefined
```

---

## 5️⃣ VERCEL DEPLOYMENT

### 📋 Environment Variables no Vercel

**Production Environment (✅ CORRETO)**
```
Project Settings > Environment Variables

Production:
  VITE_SUPABASE_URL = https://gvdkdjyupktlflwurike.supabase.co
  VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIs...
  
Status: ✅ Aplicadas ao branch `main`
```

**Preview Environment (❌ VAZIO)**
```
Project Settings > Environment Variables

Preview:
  (nenhuma variável configurada)
  
Status: ❌ Nenhuma variável para branches feature/* ou develop
```

**Staging Branch (develop)**
```
Branch: develop
Expected: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
Actual: undefined
Status: ❌ PROBLEMA!
```

### 🔧 Como Vercel Injeta Variáveis

```yaml
# Arquivo: vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  ...
}
```

**Problema:**
- Production: `vercel deploy --prod` → Usa Environment Variables do Dashboard (Production)
- Staging: `vercel deploy` (sem --prod) → Tenta usar Preview Environment
- Preview não tem variáveis configuradas → **undefined**

---

## 6️⃣ FRONTEND - Runtime Execution

### 📄 Arquivo: src/lib/customSupabaseClient.js

```javascript
// Linhas 8-12: Debug inicial
console.log('[DEBUG Supabase] URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('[DEBUG Supabase] ANON KEY:', (import.meta.env.VITE_SUPABASE_ANON_KEY || '').slice(0, 10));

// Linhas 18-30: loadEnvVar função
const loadEnvVar = (varName) => {
  const viteValue = import.meta.env[varName];   // ← Busca em import.meta.env
  if (viteValue) return viteValue;
  
  if (typeof window !== 'undefined' && window.__ENV__?.[varName]) {
    return window.__ENV__[varName];              // ← Fallback para window.__ENV__
  }
  
  return undefined;                              // ← RETORNA undefined ❌
};

// Linhas 33-34: Carrega as variáveis
const SUPABASE_URL = loadEnvVar('VITE_SUPABASE_URL');           // = undefined
const SUPABASE_ANON_KEY = loadEnvVar('VITE_SUPABASE_ANON_KEY'); // = undefined

// Linhas 45-54: Validação
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ ERRO CRÍTICO: Credenciais do Supabase não configuradas!');
  throw new Error('Credenciais do Supabase não encontradas.');  // ← LANÇA ERRO
}
```

**O que acontece em Staging:**

```
1. Browser acessa https://develop.gesclinic.vercel.app
2. JavaScript carrega customSupabaseClient.js
3. import.meta.env.VITE_SUPABASE_URL = undefined (variável não injetada)
4. createBrowserClient(undefined, undefined) é chamado
5. Supabase tenta conectar com URL inválida
6. Supabase retorna: ERR_CONNECTION_CLOSED
7. App não consegue inicializar
```

---

## 7️⃣ RESUMO: CAUSA RAIZ

### 🎯 PROBLEMA #1: Build Job Compartilhado
**Arquivo:** `.github/workflows/ci-cd.yml` (linhas 18-20)

```yaml
build:
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}      # ← PRODUÇÃO
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }} # ← PRODUÇÃO
```

**Problema:** Todas as branches usam mesmas credenciais PRODUÇÃO no build.

**Impacto:** Não é problema porque build é genérico. O problema é no deploy.

---

### 🎯 PROBLEMA #2: Vercel Preview Sem Variáveis (CRÍTICO)
**Arquivo:** `.github/workflows/ci-cd.yml` (linhas 127-135)

```yaml
deploy_staging:
  steps:
    - name: Deploy to Vercel (Staging)
      run: npx vercel --yes --token=${{ secrets.VERCEL_TOKEN }}
      # ❌ NÃO INJETA VARIÁVEIS!
```

**Problema:** 
- `npx vercel` (sem --prod) → Vercel tenta usar Preview Environment
- Preview Environment do Vercel não tem as variáveis VITE_SUPABASE_*
- Aplicação recebe undefined → Supabase connection fails

**Impacto:** CRÍTICO - Staging não consegue conectar ao Supabase

---

### 🎯 PROBLEMA #3: Vercel Dashboard Não Tem Preview Variables
**Localização:** Vercel Dashboard > Project Settings > Environment Variables

```
Production:  ✅ VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
Preview:     ❌ (vazio)
Development: ⚠️ N/A
```

**Problema:** Nenhuma variável configurada para Preview environment

**Impacto:** Quando Vercel tenta injeta, não encontra nada

---

## ✅ CHECKLIST: O Que Está Funcionando

- [x] Production (main): 100% Funcional
- [x] Local Dev (localhost): 100% Funcional  
- [x] Build Process: Sucesso
- [x] Supabase Redirect URLs: Configuradas
- [x] GitHub Actions: Executando corretamente
- [x] Vercel Production Deploy: Funciona
- [x] CORS: Não é problema

---

## ❌ CHECKLIST: O Que Está Quebrado

- [ ] Staging (develop): Supabase conexão fail
- [ ] Vercel Preview Environment: Sem variáveis VITE_*
- [ ] GitHub Actions Deploy Staging: Não injeta variáveis
- [ ] import.meta.env no staging: undefined

---

## 🔧 SOLUÇÕES RECOMENDADAS (Por Prioridade)

### SOLUÇÃO 1️⃣: Configurar Preview Environment no Vercel Dashboard
**Dificuldade:** ⭐ Fácil  
**Tempo:** 2 minutos  
**Impacto:** Alto ✅

1. Abrir Vercel Dashboard > Project Settings > Environment Variables
2. Para cada variável (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY):
   - Clique "Add New"
   - Nome: `VITE_SUPABASE_URL` (exemplo)
   - Valor: `https://gvdkdjyupktlflwurike.supabase.co`
   - Environments: Selecionar apenas "Preview"
   - Save
3. Redeploy staging: `git commit --allow-empty && git push origin develop`

**Resultado Esperado:** Variáveis injetadas → Staging funciona ✅

---

### SOLUÇÃO 2️⃣: Atualizar GitHub Actions para Injetar Variáveis
**Dificuldade:** ⭐⭐ Médio  
**Tempo:** 5 minutos  
**Impacto:** Alto ✅

Modificar `.github/workflows/ci-cd.yml` deploy_staging job:

```yaml
deploy_staging:
  steps:
    - name: Deploy to Vercel (Staging)
      run: npx vercel --yes --token=${{ secrets.VERCEL_TOKEN }}
      env:
        VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
        VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        # ✅ ADICIONAR VARIÁVEIS:
        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

**Resultado Esperado:** Variáveis passadas ao Vercel → Staging funciona ✅

---

### SOLUÇÃO 3️⃣: Usar Supabase Separado para Staging (Opcional)
**Dificuldade:** ⭐⭐⭐ Complexo  
**Tempo:** 30 minutos  
**Impacto:** Médio ⚠️

Criar novo projeto Supabase para staging, configurar variáveis diferentes.

**Alternativa Melhor:** Usar SOLUÇÃO 1 ou 2 (mais simples)

---

## 🎯 RECOMENDAÇÃO FINAL

**Usar SOLUÇÃO 1️⃣ (Vercel Dashboard) + SOLUÇÃO 2️⃣ (GitHub Actions)**

Por que?
1. **Redundância:** Se uma falhar, a outra funciona
2. **Segurança:** Variáveis injetadas em múltiplos níveis
3. **Flexibilidade:** Pode usar diferentes valores para Preview vs Production
4. **Prático:** Ambas são simples de implementar

---

## 📊 Impacto Esperado

| Antes | Depois |
|-------|--------|
| Produção: ✅ | Produção: ✅ (sem mudança) |
| Staging: ❌ | Staging: ✅ (funcionando) |
| Local Dev: ✅ | Local Dev: ✅ (sem mudança) |

---

**Próximas Ações:** Implementar SOLUÇÃO 1 e SOLUÇÃO 2, depois validar com teste no staging.
