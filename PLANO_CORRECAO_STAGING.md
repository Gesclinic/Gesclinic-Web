# 🔧 PLANO DE CORREÇÃO: Habilitar Staging com Supabase

**Objetivo:** Fazer `https://develop.gesclinic.vercel.app` funcionar como staging.

**Status:** Diagnóstico Completo ✅ | Pronto para Implementação

---

## 📊 Análise da Causa Raiz

### O Problema
```
Staging (develop.gesclinic.vercel.app)
  ↓
Variáveis de Ambiente: undefined
  ↓
customSupabaseClient.js: import.meta.env.VITE_SUPABASE_URL = undefined
  ↓
createBrowserClient(undefined, undefined)
  ↓
Supabase: ERR_CONNECTION_CLOSED
  ↓
App: Não consegue autenticar ou carregar dados
```

### Por que Production funciona?
```
Production (gesclinic-web.vercel.app)
  ↓
GitHub Actions: vercel deploy --prod
  ↓
Vercel: Injeta variáveis do Production Environment
  ↓
import.meta.env.VITE_SUPABASE_URL = https://gvdkdjyupktlflwurike.supabase.co
  ↓
createBrowserClient(url, key) ✅
  ↓
Supabase: Conexão estabelecida
```

### Por que Staging não funciona?
```
Staging (develop.gesclinic.vercel.app)
  ↓
GitHub Actions: npx vercel (SEM --prod)
  ↓
Vercel: Tenta usar Preview Environment
  ↓
Preview Environment: SEM variáveis configuradas
  ↓
import.meta.env.VITE_SUPABASE_URL = undefined ❌
```

---

## 🎯 Solução: Duas Frentes

### FRENTE 1: Configurar Vercel Dashboard (1 minuto)
**Objetivo:** Adicionar variáveis ao Preview Environment do Vercel

**Passos:**
1. Abrir https://vercel.com → Gesclinic-Web project
2. Project Settings → Environment Variables
3. Para cada variável:
   - **VITE_SUPABASE_URL**
     - Value: `https://gvdkdjyupktlflwurike.supabase.co`
     - Environments: `Preview` (APENAS Preview)
   - **VITE_SUPABASE_ANON_KEY**
     - Value: `[sua chave anon do Supabase]`
     - Environments: `Preview` (APENAS Preview)
4. Save

**Resultado:** Quando Vercel injeta variáveis para Preview (staging), terá os valores corretos.

---

### FRENTE 2: Atualizar GitHub Actions (3 minutos)
**Objetivo:** Garantir que GitHub Actions também injeta as variáveis

**Arquivo a alterar:** `.github/workflows/ci-cd.yml`

**Mudança:**
```yaml
# ANTES (linhas 127-135):
deploy_staging:
  name: Deploy to Staging
  runs-on: ubuntu-latest
  needs: build
  if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
  environment:
    name: staging
    url: https://develop.gesclinic.vercel.app
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm install --legacy-peer-deps --no-audit --no-fund
    
    - name: Download build artifacts
      uses: actions/download-artifact@v4
      with:
        name: dist
        path: dist/
    
    - name: Deploy to Vercel (Staging)
      run: npx vercel --yes --token=${{ secrets.VERCEL_TOKEN }}
      env:
        VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
        VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        VERCEL_CLI_TELEMETRY_DISABLED: 1

# DEPOIS:
# Adicionar as variáveis de Supabase no env: section
```

**Detalhes da alteração:**
```yaml
    - name: Deploy to Vercel (Staging)
      run: npx vercel --yes --token=${{ secrets.VERCEL_TOKEN }}
      env:
        VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
        VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        VERCEL_CLI_TELEMETRY_DISABLED: 1
        # ✅ ADICIONAR ESSAS LINHAS:
        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
        VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

---

## 📝 Arquivos Afetados

### 1. `.github/workflows/ci-cd.yml`
- **Ação:** Modificar job `deploy_staging` (linhas 127-135)
- **Mudança:** Adicionar 2 linhas (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) no `env:`
- **Risco:** BAIXO (apenas adicionar linhas)

### 2. Vercel Dashboard (UI)
- **Ação:** Adicionar 2 variáveis no Preview Environment
- **Mudança:** GUI no Vercel
- **Risco:** BAIXO (adicionar, não deletar)

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Antes da Mudança
- [ ] Confirmar Production ainda funciona (teste manual)
- [ ] Confirmar Staging falha com ERR_CONNECTION_CLOSED
- [ ] Confirmar Local Dev funciona

### Passo 1: Vercel Dashboard
- [ ] Abrir Vercel project settings
- [ ] Adicionar VITE_SUPABASE_URL ao Preview environment
- [ ] Adicionar VITE_SUPABASE_ANON_KEY ao Preview environment
- [ ] Verificar que Production environment NÃO mudou
- [ ] Salvar

### Passo 2: GitHub Actions
- [ ] Editar `.github/workflows/ci-cd.yml`
- [ ] Adicionar linhas no deploy_staging job
- [ ] Verificar indentação YAML correta
- [ ] Commit e push para develop branch
- [ ] Aguardar GitHub Actions executar

### Passo 3: Validação
- [ ] Aguardar Deploy to Staging job completar (5-10 minutos)
- [ ] Abrir https://develop.gesclinic.vercel.app
- [ ] Verificar se carrega Dashboard
- [ ] Verificar console.log no browser:
  ```javascript
  [DEBUG Supabase] URL: https://gvdkdjyupktlflwurike.supabase.co  // ✅ NÃO deve ser undefined
  [DEBUG Supabase] ANON KEY: eyJhbGc...                          // ✅ NÃO deve ser undefined
  ✅ Supabase Client criado com sucesso!                         // ✅ Deve haver essa mensagem
  ✅ Teste de conexão passou                                     // ✅ Deve haver essa mensagem
  ```
- [ ] Tentar fazer login com credencial de teste
- [ ] Acessar um módulo (Dashboard, Agenda, etc.)
- [ ] Comparar com Production (deve ser idêntico)

### Pós-Implementação
- [ ] Confirmar Produção ainda 100% funcional
- [ ] Confirmar Local Dev ainda funciona
- [ ] Confirmar Staging agora funciona
- [ ] Commitar relatório de sucesso

---

## 📊 Impacto Esperado

### Antes
```
✅ Production (main): https://gesclinic-web.vercel.app
   - URL: ✅
   - Auth: ✅
   - Supabase: ✅
   - Dashboard: ✅

❌ Staging (develop): https://develop.gesclinic.vercel.app
   - URL: ✅ (Vercel deployed)
   - Auth: ✅ (Redirect URLs ok)
   - Supabase: ❌ (ERR_CONNECTION_CLOSED)
   - Dashboard: ❌ (Can't load)

✅ Development (localhost): http://localhost:3000
   - URL: ✅
   - Auth: ✅
   - Supabase: ✅
   - Dashboard: ✅
```

### Depois (esperado)
```
✅ Production (main): https://gesclinic-web.vercel.app
   - URL: ✅
   - Auth: ✅
   - Supabase: ✅
   - Dashboard: ✅

✅ Staging (develop): https://develop.gesclinic.vercel.app
   - URL: ✅
   - Auth: ✅
   - Supabase: ✅
   - Dashboard: ✅

✅ Development (localhost): http://localhost:3000
   - URL: ✅
   - Auth: ✅
   - Supabase: ✅
   - Dashboard: ✅
```

---

## 🚀 Próximos Passos

### 1. Implementação Imediata (5-10 minutos)
- [ ] Fazer alteração do Vercel Dashboard (1 min)
- [ ] Fazer alteração do GitHub Actions (2 min)
- [ ] Commit e push (1 min)
- [ ] Aguardar CI/CD executar (5 min)

### 2. Validação (5 minutos)
- [ ] Testar Staging
- [ ] Confirmar Dashboard carrega
- [ ] Confirmar autenticação funciona
- [ ] Confirmar dados carregam do Supabase

### 3. Documentação
- [ ] Atualizar README com instruções de staging
- [ ] Commit changes
- [ ] Celebrar! 🎉

---

## 🔒 Considerações de Segurança

### ✅ Seguro
- Variáveis são GitHub Secrets (não versionadas)
- Preview Environment usa MESMAS credenciais que Production (intentional - mesmo banco de dados para teste)
- Redirect URLs apenas para domínios verificados
- RLS policies protegem os dados

### ⚠️ Notação
- Preview é ambiente PRIVADO (não público)
- Senhas de teste devem ser diferentes de produção
- Se precisar dados separados, criar novo projeto Supabase

---

## 📞 Suporte

### Se der erro após implementação:
1. Verificar console.log do browser (F12 > Console)
2. Procurar por `[DEBUG Supabase]` mensagens
3. Se ainda `undefined`, verificar:
   - Vercel Dashboard tem variáveis? (Preview env)
   - GitHub Actions mostra variáveis no output?
   - Supabase URL está correta?
4. Fazer redeploy: `git commit --allow-empty && git push origin develop`

### Se ainda não funcionar:
1. Verificar Supabase project está online
2. Verificar credenciais no Supabase dashboard
3. Verificar RLS policies permitem anon access
4. Abrir issue com print de console

---

**Estimativa:** 10 minutos de implementação + 5 minutos de validação = 15 minutos total
**Dificuldade:** ⭐ Muito Fácil
**Risco:** 🟢 BAIXO (apenas adicionar variáveis)
