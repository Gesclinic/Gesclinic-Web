# 📊 VISUALIZAÇÃO: Fluxo de Deployment Production vs Staging

## 🟢 PRODUCTION FLOW (FUNCIONA ✅)

```
┌─────────────────────────────────────────────────────────────────────┐
│  PASSO 1: Developer push to main                                     │
│  $ git push origin main                                              │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│  PASSO 2: GitHub Actions Triggered                                  │
│  - Event: push to main branch                                        │
│  - Trigger: jobs.build runs                                          │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│  PASSO 3: Build Job                                                 │
│  ✅ env:                                                             │
│    VITE_SUPABASE_URL = "https://gvdkdjyupktlflwurike.supabase.co"  │
│    VITE_SUPABASE_ANON_KEY = "eyJhbGc..."                            │
│                                                                      │
│  ✅ npm run build                                                    │
│    → dist/assets/main-xxxxx.js (com variáveis injetadas)            │
│                                                                      │
│  ✅ Upload artifacts                                                │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│  PASSO 4: Deploy Job (Production)                                   │
│  - Condition: github.ref == 'refs/heads/main' ✅                    │
│  - npx vercel deploy --prod --yes                                   │
│    └─ Flag: --prod → USE PRODUCTION environment vars               │
│                                                                      │
│  ✅ Vercel Dashboard > Environment Variables > Production           │
│    VITE_SUPABASE_URL = "https://gvdkdjyupktlflwurike.supabase.co"  │
│    VITE_SUPABASE_ANON_KEY = "eyJhbGc..."                            │
│                                                                      │
│  ✅ Vercel re-injects variables → dist/ é servido com vars        │
│                                                                      │
│  ✅ Deploy to: https://gesclinic-web.vercel.app                    │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│  PASSO 5: Browser Request                                           │
│  GET https://gesclinic-web.vercel.app/                             │
│                                                                      │
│  📄 main-xxxxx.js loads                                             │
│    import.meta.env.VITE_SUPABASE_URL = "https://gvdkdjyupkt..." ✅  │
│    import.meta.env.VITE_SUPABASE_ANON_KEY = "eyJhbGc..." ✅         │
│                                                                      │
│  → createBrowserClient("https://...", "eyJhbGc...")                │
│    ✅ SUCESSO                                                       │
│                                                                      │
│  → Supabase conexão estabelecida                                    │
│  → Auth funciona                                                    │
│  → Dashboard carrega                                                │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
                    ✅ PRODUCTION LIVE
```

---

## 🔴 STAGING FLOW (FALHA ❌)

```
┌─────────────────────────────────────────────────────────────────────┐
│  PASSO 1: Developer push to develop                                  │
│  $ git push origin develop                                           │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│  PASSO 2: GitHub Actions Triggered                                  │
│  - Event: push to develop branch                                     │
│  - Trigger: jobs.build runs                                          │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│  PASSO 3: Build Job (SHARED)                                        │
│  ✅ env:                                                             │
│    VITE_SUPABASE_URL = "https://gvdkdjyupktlflwurike.supabase.co"  │
│    VITE_SUPABASE_ANON_KEY = "eyJhbGc..." (PRODUÇÃO)                │
│                                                                      │
│  ✅ npm run build                                                    │
│    → dist/assets/main-xxxxx.js (contém variáveis de PRODUÇÃO)      │
│                                                                      │
│  ✅ Upload artifacts                                                │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│  PASSO 4: Deploy Job (Staging)                                      │
│  - Condition: github.ref == 'refs/heads/develop' ✅                 │
│  - npx vercel --yes --token=${{ VERCEL_TOKEN }}                     │
│    ❌ SEM --prod flag!                                              │
│                                                                      │
│  ❌ Vercel: "Qual environment usar?"                                │
│    → Se for um preview/develop, usar Preview environment            │
│                                                                      │
│  ❌ Vercel Dashboard > Environment Variables > Preview              │
│    (vazio - nenhuma variável configurada!)                          │
│                                                                      │
│  ❌ Vercel: Não consegue injetar variáveis                         │
│                                                                      │
│  ✅ Deploy to: https://develop.gesclinic.vercel.app                │
│    (mas SEM as variáveis de ambiente!)                              │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│  PASSO 5: Browser Request (❌ FALHA)                                │
│  GET https://develop.gesclinic.vercel.app/                         │
│                                                                      │
│  📄 main-xxxxx.js loads                                             │
│    import.meta.env.VITE_SUPABASE_URL = undefined ❌                 │
│    import.meta.env.VITE_SUPABASE_ANON_KEY = undefined ❌            │
│                                                                      │
│  → customSupabaseClient.js executa:                                 │
│    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {                       │
│      throw new Error(...)  ← ERRO!                                 │
│                                                                      │
│  → createBrowserClient(undefined, undefined)                        │
│    ❌ FALHA                                                         │
│                                                                      │
│  → Console: ERR_CONNECTION_CLOSED                                   │
│  → App não consegue autenticar                                      │
│  → Dashboard não carrega                                            │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
                    ❌ STAGING OFFLINE
```

---

## 🔧 A SOLUÇÃO (ANTES vs DEPOIS)

### ANTES (❌ Não funciona)

```yaml
# .github/workflows/ci-cd.yml - Deploy Staging Job

deploy_staging:
  steps:
    - name: Deploy to Vercel (Staging)
      run: npx vercel --yes --token=${{ secrets.VERCEL_TOKEN }}
      env:
        VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
        VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        VERCEL_CLI_TELEMETRY_DISABLED: 1
        # ❌ Faltam as variáveis!

# Vercel Dashboard - Preview Environment
# ❌ Vazio (sem variáveis configuradas)
```

### DEPOIS (✅ Funciona)

```yaml
# .github/workflows/ci-cd.yml - Deploy Staging Job

deploy_staging:
  steps:
    - name: Deploy to Vercel (Staging)
      run: npx vercel --yes --token=${{ secrets.VERCEL_TOKEN }}
      env:
        VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
        VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        VERCEL_CLI_TELEMETRY_DISABLED: 1
        # ✅ ADICIONAR ESSAS LINHAS:
        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

# Vercel Dashboard - Preview Environment
# ✅ Adicionar essas variáveis:
# VITE_SUPABASE_URL = "https://gvdkdjyupktlflwurike.supabase.co"
# VITE_SUPABASE_ANON_KEY = "eyJhbGc..."
```

---

## 📊 COMPARAÇÃO: 3 AMBIENTES

```
                    Production          Staging             Development
                    ──────────────────────────────────────────────────
Domínio             .vercel.app         .vercel.app         localhost:3000
Branch              main                develop             (local)
Build Vars          ✅ Yes              ✅ Yes              ✅ .env.local
Vercel Deploy       --prod              (nenhum)            (N/A)
Vercel Env Vars     Production ✅       Preview ⚠️           (N/A)
GitHub Env Vars     Deploy job ✅       Deploy job ❌       (N/A)
                                        (antes da fix)

Status              ✅ Funciona         ❌ Quebrado         ✅ Funciona
                                        (depois da fix: ✅)

Supabase URL        ✅ Carregado        ❌ undefined        ✅ Carregado
Supabase Key        ✅ Carregado        ❌ undefined        ✅ Carregado
                                        (depois da fix: ✅)

Auth                ✅ Ok               ❌ Falha            ✅ Ok
Dashboard           ✅ Carrega          ❌ Erro             ✅ Carrega
Data Load           ✅ Ok               ❌ Erro             ✅ Ok
```

---

## 🎯 KEY INSIGHT

```
┌─────────────────────────────────────────────────────────┐
│  PRODUCTION funciona porque:                             │
│                                                          │
│  vercel deploy --prod                                   │
│    ↓                                                    │
│  Usa "Production" environment do Vercel                 │
│    ↓                                                    │
│  Vercel Dashboard tem variáveis VITE_* lá               │
│    ↓                                                    │
│  import.meta.env.VITE_SUPABASE_URL ≠ undefined ✅       │
│    ↓                                                    │
│  Supabase conecta ✅                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  STAGING não funciona porque:                           │
│                                                          │
│  npx vercel (sem --prod)                                │
│    ↓                                                    │
│  Usa "Preview" environment do Vercel                    │
│    ↓                                                    │
│  Vercel Dashboard Preview está VAZIO                    │
│    ↓                                                    │
│  import.meta.env.VITE_SUPABASE_URL = undefined ❌       │
│    ↓                                                    │
│  Supabase erro ❌                                        │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ PRÓXIMOS PASSOS (Solução)

```
1. Vercel Dashboard
   Project Settings > Environment Variables
   
   Preview section:
   ├─ Add: VITE_SUPABASE_URL
   ├─ Add: VITE_SUPABASE_ANON_KEY
   └─ Save ✅

2. .github/workflows/ci-cd.yml
   deploy_staging job > env section
   
   ├─ Add: VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
   ├─ Add: VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
   └─ Commit ✅

3. Push to develop
   $ git push origin develop
   
   GitHub Actions inicia:
   ├─ build ✅
   ├─ deploy_staging (com variáveis agora!) ✅
   └─ Staging fica ONLINE ✅

4. Validar
   https://develop.gesclinic.vercel.app
   
   Console F12:
   [DEBUG Supabase] URL: https://... ✅
   [DEBUG Supabase] ANON KEY: eyJ... ✅
   ✅ Supabase Client criado ✅
```

---

## 🎉 RESULTADO FINAL

```
Antes da Mudança:
  Production: ✅ https://gesclinic-web.vercel.app
  Staging:    ❌ https://develop.gesclinic.vercel.app
  Dev:        ✅ http://localhost:3000

Depois da Mudança:
  Production: ✅ https://gesclinic-web.vercel.app
  Staging:    ✅ https://develop.gesclinic.vercel.app  (AGORA FUNCIONA!)
  Dev:        ✅ http://localhost:3000
```
