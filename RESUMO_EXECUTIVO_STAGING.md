# 🚨 RESUMO EXECUTIVO: Causa & Correção

## 🎯 O PROBLEMA (EM 10 SEGUNDOS)

```
Staging não funciona porque:
  Variáveis de Ambiente = undefined
    ↓
  Supabase recebe URL=undefined
    ↓
  Erro: ERR_CONNECTION_CLOSED
```

**Por que Production funciona?**  
Production injeta as variáveis. Staging não.

---

## 🔴 CAUSA RAIZ

### Problema 1: Vercel Dashboard Preview Sem Variáveis
```
Vercel > Project Settings > Environment Variables

Production:
  VITE_SUPABASE_URL = https://gvdkdjyupktlflwurike.supabase.co ✅
  VITE_SUPABASE_ANON_KEY = eyJhbGc... ✅

Preview (Staging):
  (vazio) ❌
```

### Problema 2: GitHub Actions Não Injeta Variáveis
```yaml
# .github/workflows/ci-cd.yml linha 131-135

deploy_staging:
  - name: Deploy to Vercel (Staging)
    run: npx vercel --yes --token=${{ secrets.VERCEL_TOKEN }}
    env:
      VERCEL_ORG_ID: ... ✅
      VERCEL_PROJECT_ID: ... ✅
      # Faltam as variáveis Supabase! ❌
```

---

## ✅ A SOLUÇÃO (2 PASSOS)

### PASSO 1: Vercel Dashboard (1 minuto)
```
1. Abrir https://vercel.com → Gesclinic-Web
2. Settings > Environment Variables
3. Adicionar ao "Preview" environment:
   - VITE_SUPABASE_URL = https://gvdkdjyupktlflwurike.supabase.co
   - VITE_SUPABASE_ANON_KEY = [sua chave]
4. Save
```

### PASSO 2: GitHub Actions (3 minutos)
```
1. Editar .github/workflows/ci-cd.yml
2. Na section "deploy_staging" (linha ~131)
3. Adicionar no env:
   VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
   VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
4. Commit & Push
```

---

## 📊 Antes vs Depois

| | Antes | Depois |
|---|---|---|
| **Production** | ✅ Funciona | ✅ Funciona (sem mudança) |
| **Staging** | ❌ ERR_CONNECTION_CLOSED | ✅ Funciona |
| **Local Dev** | ✅ Funciona | ✅ Funciona (sem mudança) |

---

## 🗂️ ARQUIVOS AFETADOS

**Será modificado:**
- `.github/workflows/ci-cd.yml` (2 linhas adicionadas)

**Será configurado:**
- Vercel Dashboard (UI, sem arquivo)

**Não será modificado:**
- `src/lib/customSupabaseClient.js`
- `vercel.json`
- `.env.local`
- Nenhum código da aplicação

---

## 🚀 IMPACTO

| Aspecto | Impacto |
|--------|--------|
| Funcionalidade | 🟢 ALTO (Staging passa a funcionar) |
| Segurança | 🟢 NENHUM (usa secrets existentes) |
| Código | 🟢 NENHUM (apenas config) |
| Production | 🟢 NENHUM (workflow separate) |
| Rollback | 🟢 TRIVIAL (revert 2 linhas) |

---

## 📋 CHECKLIST RÁPIDO

- [ ] Confirmar que Production está funcionando
- [ ] Confirmar que Staging está com ERR_CONNECTION_CLOSED
- [ ] Abrir Vercel Dashboard
- [ ] Adicionar VITE_SUPABASE_URL ao Preview
- [ ] Adicionar VITE_SUPABASE_ANON_KEY ao Preview
- [ ] Editar `.github/workflows/ci-cd.yml`
- [ ] Adicionar 2 linhas de variáveis no deploy_staging
- [ ] Commit e push para develop
- [ ] Aguardar 5-10 minutos
- [ ] Testar: https://develop.gesclinic.vercel.app
- [ ] Verificar console (F12): deve show URLs e keys, não undefined
- [ ] Confirmação: Staging agora funciona ✅

---

## 🆘 TROUBLESHOOTING

Se ainda não funcionar após implementação:

1. **Verificar Vercel variaveis injetadas:**
   ```
   Vercel Deploy log > see Supabase vars?
   ```

2. **Verificar GitHub Actions output:**
   ```
   GitHub > Actions > Deploy to Staging job > Log output
   ```

3. **Verificar Browser Console:**
   ```
   F12 > Console > Procurar por "[DEBUG Supabase]"
   Deve mostrar URL e KEY, não undefined
   ```

4. **Força Redeploy:**
   ```bash
   git commit --allow-empty -m "redeploy staging"
   git push origin develop
   ```

---

**Tempo total:** 15 minutos  
**Dificuldade:** ⭐ Muito Fácil  
**Risco:** 🟢 MÍNIMO  
**Chance de sucesso:** 95%+
