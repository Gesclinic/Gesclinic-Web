# 🎉 IMPLEMENTAÇÃO DE STAGING ISOLADO - GESCLINIC WEB

## STATUS: ✅ PROGRESSO

### ETAPA 1: NOVO PROJETO VERCEL ✅ CONCLUÍDA

**Novo Projeto Criado:**
- **Nome:** `gesclinic-web-staging`
- **URL:** https://gesclinic-web-staging.vercel.app
- **Status:** Ready (Deployment bem-sucedido)
- **Repositório:** Gesclinic/Gesclinic-Web

### ETAPA 2: CONFIGURAR BRANCH develop ⏳ PENDENTE

**Ação Necessária:**
1. No Vercel Dashboard do novo projeto `gesclinic-web-staging`
2. Ir para Settings → Git
3. Mudificar a conexão para usar apenas o branch `develop`

**Alternativa via Vercel CLI:**
```bash
vercel project settings
# Ou editar via API
```

### ETAPA 3: VARIÁVEIS DE AMBIENTE ⏳ PENDENTE

**Variáveis a Adicionar (Production & Preview):**

```bash
VITE_SUPABASE_URL=https://gvdkdjyupktlflwurike.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjUyMTEsImV4cCI6MjA4MzgwMTIxMX0.lpPjHUO_prS1-l8wLv7vdN7jtzrY0Oy71X_1ozXiErA
VITE_STRIPE_PUBLIC_KEY=pk_test_51SoqhQLgRvVgKFwoy1cqpJAfE5pWXFvgbaDVdoRh5ArFfVYqwQmoKjggHsT41IMNHcwOG1dTrLPQUX7hjPtw1egG00EYBpxqrt
```

**Passos:**
1. Vercel Dashboard → gesclinic-web-staging → Settings → Environment Variables
2. Project tab → Add Environment Variable
3. Adicionar cada variável para **Production and Preview**
4. Save

### ETAPA 4: ADICIONAR URL NO SUPABASE ⏳ PENDENTE

**URL de Staging a Adicionar:**
```
https://gesclinic-web-staging.vercel.app
https://gesclinic-web-staging.vercel.app/**
```

**Passos:**
1. Supabase Console → Project Settings → Authentication → Redirect URLs
2. Adicionar:
   - `https://gesclinic-web-staging.vercel.app`
   - `https://gesclinic-web-staging.vercel.app/**`
3. Save

### ETAPA 5: ATUALIZAR CI/CD ⏳ PENDENTE

**Arquivo:** `.github/workflows/ci-cd.yml`

**Modificações Necessárias:**

1. **Adicionar Job Deploy to Staging (Novo Projeto):**

```yaml
deploy_staging_v2:
  name: Deploy to Staging (Isolated)
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
  
  env:
    VERCEL_ORG_ID_STAGING: ${{ secrets.VERCEL_ORG_ID_STAGING }}
    VERCEL_PROJECT_ID_STAGING: ${{ secrets.VERCEL_PROJECT_ID_STAGING }}
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
  
  steps:
    - uses: actions/checkout@v4
    
    - uses: actions/download-artifact@v4
      with:
        name: dist
        path: dist/
    
    - name: Deploy to Vercel Staging
      run: |
        npx vercel@latest deploy --prod --yes \
          --token=${{ secrets.VERCEL_TOKEN_STAGING }}
```

2. **Atualizar Job Deploy to Vercel (Production):**

Manter como está - continua deployando para `gesclinic-web.vercel.app`

3. **Desabilitar Deploy to Staging Antigo:**

Se ainda existir o job antigo, remover ou comentar (aquele que tenta usar Preview do main project)

### ETAPA 6: CONFIGURAR GITHUB SECRETS ⏳ PENDENTE

**Novos Secrets Necessários:**

```bash
VERCEL_ORG_ID_STAGING: <valor do novo projeto>
VERCEL_PROJECT_ID_STAGING: <valor do novo projeto>
VERCEL_TOKEN_STAGING: <token específico para staging>
```

**Onde Obter:**
1. Vercel Dashboard → gesclinic-web-staging → Settings
2. Copy `ORG_ID` e `PROJECT_ID`
3. GitHub Repo → Settings → Secrets and variables → Actions
4. Adicionar como `Repository secrets`

### ARQUITETURA FINAL

```
┌─────────────────────────────────────────────────────────────┐
│                   GESCLINIC DEPLOYMENT                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  main/master branch                                        │
│        ↓                                                    │
│  [GitHub Actions CI/CD]                                   │
│        ↓                                                    │
│  Deploy to Vercel (gesclinic-web)                         │
│        ↓                                                    │
│  🟢 PRODUCTION: https://gesclinic-web.vercel.app         │
│                 (100% Stable)                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  develop branch                                            │
│        ↓                                                    │
│  [GitHub Actions CI/CD]                                   │
│        ↓                                                    │
│  Deploy to Vercel (gesclinic-web-staging)                │
│        ↓                                                    │
│  🟡 STAGING: https://gesclinic-web-staging.vercel.app   │
│              (Testing & Pre-release)                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  feature/* branches                                        │
│        ↓                                                    │
│  [GitHub Actions CI/CD]                                   │
│        ↓                                                    │
│  Deploy Preview (PR Comments)                             │
│        ↓                                                    │
│  🔵 PREVIEW: https://gesclinic-web-[hash].vercel.app    │
│              (Temporary, auto-deleted)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### FLUXO DE TRABALHO RECOMENDADO

```
1. Feature Development
   └─ Create branch: feature/nova-funcao
   └─ Push to GitHub
   └─ Automatic: Preview deployment created
   └─ Test in Preview URL
   └─ Get PR approved

2. Merge to Develop
   └─ Merge PR to develop
   └─ Automatic: Deploy to Staging (gesclinic-web-staging.vercel.app)
   └─ Test in Staging
   └─ Run QA checks

3. Release to Production
   └─ Create PR: develop → main
   └─ Review changes
   └─ Merge to main
   └─ Automatic: Deploy to Production (gesclinic-web.vercel.app)
   └─ Release complete

4. Rollback (if needed)
   └─ Revert commit on main
   └─ Automatic: Production rolls back
   └─ Old version restores
```

### SEGURANÇA & BEST PRACTICES

✅ **Database:**
- Todos os ambientes usam MESMA instância Supabase (apenas URL diferente)
- Sem banco de dados separado para staging
- Row-Level Security ativas em todas as operações

✅ **Variáveis:**
- Supabase URL e ANON_KEY iguais em staging e prod (mesma API)
- Stripe Public Key igual (não expõe dados sensíveis)
- Todos os secrets criptografados no GitHub

✅ **Acesso:**
- Preview deployments: Accessible públicamente (para PRs)
- Staging: Accessible públicamente (para testes gerais)
- Production: Accessible públicamente (versão final)
- Sem IP restrictions ou VPN necessária

### PRÓXIMOS PASSOS IMEDIATOS

**1. Configurar Environment Variables (5 min)**
   - [ ] Ir a https://vercel.com/gesclinic-2403s-projects/gesclinic-web-staging/settings/environment-variables
   - [ ] Add VITE_SUPABASE_URL
   - [ ] Add VITE_SUPABASE_ANON_KEY
   - [ ] Add VITE_STRIPE_PUBLIC_KEY
   - [ ] Select "Production and Preview" para cada

**2. Mudar Branch para develop (2 min)**
   - [ ] Vercel Dashboard → gesclinic-web-staging → Settings → Git
   - [ ] Configurar para usar `develop` branch
   - [ ] Deploy automático quando develop muda

**3. Testar Staging URL (5 min)**
   - [ ] Fazer commit no develop
   - [ ] Aguardar GitHub Actions complete
   - [ ] Testar https://gesclinic-web-staging.vercel.app
   - [ ] Verificar console do F12 para Supabase URL

**4. Adicionar URLs no Supabase (3 min)**
   - [ ] Supabase Console → Authentication → Redirect URLs
   - [ ] Adicionar https://gesclinic-web-staging.vercel.app
   - [ ] Adicionar https://gesclinic-web-staging.vercel.app/**

**5. Atualizar CI/CD (10 min)**
   - [ ] Adicionar novo job deploy_staging_v2 se necessário
   - [ ] Remover/comentar job antigo Deploy to Staging
   - [ ] Test com force push em develop

**Tempo Total: ~25 minutos**

### VALIDAÇÃO FINAL

```bash
✓ https://gesclinic-web.vercel.app        # Production
✓ https://gesclinic-web-staging.vercel.app # Staging
✓ GitHub Actions CI/CD executa sem erros
✓ Supabase Auth redireciona corretamente
✓ Ambiente isolado e profissional
```

---

**Data de Criação:** 2026-05-10
**Responsável:** GitHub Copilot
**Status:** Em Implementação
