# ↩️ Rollback Guide - Recuperação Rápida

## 🚨 Situação: Erramos em Produção!

Não entre em pânico. Este guia permite reverter para versão anterior **em menos de 5 minutos**.

---

## 📊 Cenários Comuns

### Cenário 1: Deploy foi para main, mas há bug

```
Status: v1.0.0 está em produção (main)
Problema: Agendamentos não carregam
Solução: Fazer rollback para v0.9.0
```

### Cenário 2: Feature em develop quebrou agendamentos

```
Status: develop em staging, tests não passaram
Problema: Agenda não carrega
Solução: Reverter commit específico em develop
```

### Cenário 3: Merge em main foi por engano

```
Status: main recebeu merge errado
Problema: Deploy foi feito, mas não era para ir
Solução: Fazer revert rápido
```

---

## 🔴 Opção 1: Rollback Vercel (Mais Rápido - 2 min)

### Se o erro foi descoberto logo após deploy:

```
1. Acessar https://vercel.com/seu-projeto
2. Ir para "Deployments"
3. Ver deploy mais recente (com erro)
4. Clicar nos 3 pontos "..." ao lado
5. Selecionar "Rollback"
6. Confirmar rollback para versão anterior
7. Esperar 1-2 min
8. ✅ Voltou à versão anterior!
```

**Tempo: 2 minutos**
**Risco: Baixo**

---

## 🔴 Opção 2: Revert Commit em GitHub (Rápido - 3 min)

### Se quer desfazer última mudança em main:

```bash
# Local: Ver último commit
git log --oneline -5

# Exemplo de saída:
# abc1234 (HEAD -> main) feat: nova feature com bug
# def5678 (origin/main) release: v1.0.0
# ghi9012 fix: hotfix anterior

# Criar revert commit
git revert HEAD

# Abre editor, confirmar mensagem de revert
# Salvar e fechar

# Push para servidor
git push origin main

# Vercel automaticamente faz deploy novo
```

**Tempo: 3 minutos**
**Risco: Baixo (cria novo commit)**

---

## 🔴 Opção 3: Reset em Git (Muito Rápido - 1 min)

### ⚠️ CUIDADO: Apenas se commit foi muito recente (< 5 min)

```bash
# Ver últimos commits
git log --oneline -5

# Se último commit é o problema:
git reset --soft HEAD~1
# OU força se quiser descartar mudanças
git reset --hard HEAD~1

# Push forçado (CUIDADO! Perigoso)
git push --force-with-lease origin main
```

**Tempo: 1 minuto**
**Risco: Alto (modifica history)**
**Quando usar: Apenas em emergência extrema**

---

## 🔵 Opção 4: Voltar para Tag Anterior (Seguro - 5 min)

### Se quer reverter para versão estável conhecida:

```bash
# Local: Ver tags disponíveis
git tag -l

# Exemplo:
# v0.9.0
# v1.0.0 (atual, com problema)
# v1.0.1

# Checkout de tag
git checkout v0.9.0

# Criar branch a partir da tag
git checkout -b hotfix/rollback-v0.9.0

# Push branch
git push origin hotfix/rollback-v0.9.0

# GitHub: Criar PR (main ← hotfix/rollback-v0.9.0)
# Merge em main

# Vercel faz deploy automaticamente
# ✅ Voltou para v0.9.0 em produção
```

**Tempo: 5 minutos**
**Risco: Muito baixo (branch separado)**

---

## 🟢 Opção 5: Revert em Supabase (Database - 10 min)

### Se o problema é em mudança de dados:

```bash
# Verificar último backup
Supabase Dashboard → Backups
└─ Ver backup anterior ao problema

# Restaurar backup
# ⚠️ Isso vai descartar dados após o backup!
1. Clicar no backup desejado
2. Confirmar restauração
3. Esperar 10-15 min
4. Database volta ao estado anterior

# Verificar que tudo está OK
Supabase Studio → SQL Editor
SELECT * FROM appointments LIMIT 1;
```

**Tempo: 15 minutos**
**Risco: Perda de dados entre backup e erro**

---

## 📋 Fluxo Rápido por Situação

### 1️⃣ Bug em Produção (main) → Vercel Rollback

```
1. https://vercel.com → Deployments
2. 3 dots → Rollback
3. Confirmar
4. ✅ 2 min
```

### 2️⃣ Erro em Staging (develop) → Revert Commit

```bash
git log --oneline -3
git revert HEAD
git push origin develop
# ✅ 3 min
```

### 3️⃣ Commit errado em main → Reset (Emergência)

```bash
git reset --hard HEAD~1
git push --force-with-lease origin main
# ⚠️ CUIDADO! ✅ 1 min
```

### 4️⃣ Voltar para versão estável → Tag + Branch

```bash
git checkout v0.9.0
git checkout -b hotfix/rollback-v0.9.0
git push origin hotfix/rollback-v0.9.0
# GitHub → PR → Merge
# ✅ 5 min
```

### 5️⃣ Backup de Database → Supabase

```
Supabase → Backups
Restaurar backup anterior
✅ 15 min
```

---

## 🔍 Investigar Problema ANTES de Rollback

### 1. Verificar Logs

```
Vercel Dashboard → seu-projeto → Logs
Procurar por:
❌ Error 500
❌ RLS violation
❌ Query timeout
❌ Stripe error
```

### 2. Verificar Supabase

```
Supabase Studio → Logs
Procurar por:
❌ Query failures
❌ RLS violations
❌ Authentication errors
```

### 3. Verificar Navegador

```
DevTools (F12) → Console
Procurar por:
❌ Network errors
❌ JS errors
❌ CORS issues
```

### 4. Contatar Slack

```
#emergencias ou #tech:
"🚨 v1.0.0 em produção com bug X"
"Iniciando rollback para v0.9.0"
"ETA: 2 min até voltar ao normal"
```

---

## ✅ Checklist Rollback

```
□ Verifica que há realmente um bug (não é cache)
□ Hard refresh (Ctrl+Shift+R)
□ Verifica console do navegador
□ Verifica logs do Vercel
□ Verifica logs do Supabase
□ Notifica time de que há problema
□ Decide qual opção de rollback usar
□ Executa rollback
□ Aguarda 2-5 min pelo novo deploy
□ Verifica que voltou ao normal
□ Notifica time que resolvido
□ Agendar post-mortem
```

---

## 📝 Post-Mortem (Depois do Rollback)

```
1. Documentar o bug
   Qual era o problema?
   Como aconteceu?
   Como foi descoberto?

2. Investigar causa raiz
   Por que o código passou nos testes?
   Por que não foi pego em staging?
   Como prevenir no futuro?

3. Ações preventivas
   Adicionar teste
   Melhorar checklist
   Refatorar código
   Treinar time

4. Compartilhar aprendizado
   Reunião com team
   Documentar em Wiki
   Atualizar processos
```

---

## 🚫 O QUE NÃO FAZER

```
❌ Pressionar (sempre há solução)
❌ Fazer rollback sem investigar
❌ Usar git reset --hard sem confirmar
❌ Deletar dados/branches
❌ Pedir rollback sem justificar
❌ Ignorar o problema (volta!)
❌ Fazer rollback múltiplas vezes
```

---

## 📞 Contato de Emergência

```
Se problema > 1 hora:
1. Chamar tech lead
2. Escalar para CTO
3. Considerar comunicar cliente

Contatos:
Tech Lead: [número]
CTO: [número]
DevOps: [Slack]
```

---

## 🎯 Exemplo Real: Rollback Completo

### Cenário: v1.0.0 quebrou agendamentos

```
10:00 - Deploy v1.0.0 em produção
10:05 - Cliente reporta: "Agenda não carrega"
10:06 - Técnico verifica console: "RLS error 403"
10:07 - Verifica logs Supabase: "RLS policy blocking"
10:08 - Decide: Fazer rollback para v0.9.0
10:09 - Vercel: 3 dots → Rollback → v0.9.0
10:12 - Deploy completo
10:13 - Testa: Agenda carrega OK
10:14 - Notifica cliente: "Resolvido, voltamos para versão anterior"
10:15 - Agendar investigação

Post-Mortem:
- RLS policy foi alterada incorretamente
- Teste faltou validar permissões
- Adicionar teste de RLS antes de deploy
- Atualizar checklist
```

---

## 🔗 Próximos Documentos

- 📌 [GIT_FLOW.md](🔄_GIT_FLOW_ESTRATEGIA.md) - Branches
- 🔢 [SEMANTIC_VERSIONING.md](🔢_SEMANTIC_VERSIONING.md) - Versionamento
- 🛠️ [DESENVOLVIMENTO_LOCAL.md](🛠️_DESENVOLVIMENTO_LOCAL.md) - Setup local
- 🚀 [RELEASE_PRODUCAO.md](🚀_RELEASE_PRODUCAO.md) - Deploy produção
- ✅ [CHECKLIST_PRODUCAO.md](✅_CHECKLIST_PRODUCAO.md) - Antes de deployar
- 🔧 [COMANDOS_GIT_PRONTOS.md](🔧_COMANDOS_GIT_PRONTOS.md) - Copy/Paste
- 📖 [WORKFLOW_OPERACIONAL.md](📖_WORKFLOW_OPERACIONAL.md) - Guia completo
