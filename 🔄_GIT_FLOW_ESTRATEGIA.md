# 🔄 Git Flow - Estratégia de Branching Profissional

## Visão Geral

O Gesclinic Web adota **Git Flow**, um modelo profissional de branching que garante:
- ✅ Desenvolvimento isolado e seguro
- ✅ Homologação estável
- ✅ Produção sem quebras
- ✅ Releases versionadas
- ✅ Hotfixes rápidos

---

## 📊 Estrutura de Branches

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  PRODUÇÃO                  HOMOLOGAÇÃO         DESENVOLVIMENTO
│  ───────                    ───────             ───────────
│                                                             │
│  ┌─ main                 ┌─ develop          ┌─ feature/*  │
│  │  (production)         │  (staging)         │ (features)  │
│  │  • Tags v1.0.0        │  • Sempre estável  │ • Isoladas  │
│  │  • Vercel PROD        │  • Vercel STAGING  │ • Temporárias
│  │  • RLS ativas         │  • RLS ativas      │            │
│  │                       │                    │            │
│  └─ hotfix/*             │                    └─ bugfix/*   │
│     (correções)          │                      (bugs)      │
│                          └─ release/*                       │
│                             (pré-release)                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌿 Branches Principais

### 1. **main** (Produção)
- **Propósito**: Código em produção
- **Proteção**: Somente PRs, sem push direto
- **Trigger**: Merge de release ou hotfix
- **Deploy**: Vercel Production
- **RLS**: Ativa e testada
- **Regra**: Sempre tem tag de versão (v1.0.0, v1.0.1)

```bash
# Workflow main
develop → release/v1.0.0 → main (com tag)
```

### 2. **develop** (Homologação)
- **Propósito**: Base para novas features
- **Proteção**: Somente PRs, sem push direto
- **Trigger**: Merge de features/bugfixes
- **Deploy**: Vercel Preview/Staging
- **RLS**: Ativa e testada
- **Regra**: Sempre estável e pronta para release

```bash
# Workflow develop
feature/nova-funcionalidade → PR → develop
```

### 3. **feature/*** (Desenvolvimento)
- **Padrão**: `feature/NOME-DESCRITIVO`
- **Origem**: `develop`
- **Destino**: PR para `develop`
- **Ciclo**: 1-5 dias
- **Exemplos**:
  - `feature/relatorio-financeiro-mensal`
  - `feature/integracao-stripe-pagamentos`
  - `feature/dashboard-kpis`
  - `feature/audit-trail-sistema`

### 4. **bugfix/*** (Correção de Bug)
- **Padrão**: `bugfix/ISSUE-DESCRICAO`
- **Origem**: `develop`
- **Destino**: PR para `develop`
- **Ciclo**: 1-2 dias
- **Exemplos**:
  - `bugfix/issue-123-erro-agenda`
  - `bugfix/timezone-appointments`

### 5. **release/v*.*.*** (Pré-Release)
- **Padrão**: `release/v1.0.0`
- **Origem**: `develop`
- **Destino**: `main` + `develop`
- **Ciclo**: 1-3 dias
- **Atividades**:
  - Bump version em `package.json`
  - Atualizar `CHANGELOG.md`
  - Testes finais
  - Correções críticas

### 6. **hotfix/v*.*.*** (Correção Urgente)
- **Padrão**: `hotfix/v1.0.1-descricao`
- **Origem**: `main`
- **Destino**: `main` + `develop`
- **Ciclo**: Imediato
- **Prioridade**: 🔴 Máxima
- **Exemplos**:
  - `hotfix/v1.0.1-seguranca-rls`
  - `hotfix/v1.0.1-erro-critico-pagamento`

---

## 📋 Fluxo Completo

### 📌 Novo Desenvolvimento (Feature)

```
1. Criar branch
   git checkout develop
   git pull origin develop
   git checkout -b feature/nova-funcionalidade

2. Desenvolver localmente
   # Fazer commits regulares
   git add .
   git commit -m "feat: descrição da mudança"
   git push origin feature/nova-funcionalidade

3. Criar Pull Request (PR)
   GitHub → New Pull Request
   base: develop ← compare: feature/nova-funcionalidade
   
4. Code Review
   • Revisor(a) aprova
   • Testes passam
   • Conflitos resolvidos

5. Merge no develop
   GitHub → Squash and merge (recomendado)
   
6. Deletar branch local
   git checkout develop
   git pull origin develop
   git branch -d feature/nova-funcionalidade
```

### 🚀 Release para Produção (Release)

```
1. Criar branch de release
   git checkout develop
   git pull origin develop
   git checkout -b release/v1.0.0

2. Atualizar versionamento
   npm version minor  # para v1.0.0
   # Editar package.json manualmente se necessário

3. Atualizar CHANGELOG.md
   # Documentar mudanças, features, bugfixes

4. Commit de release
   git add package.json package-lock.json CHANGELOG.md
   git commit -m "chore: release v1.0.0"

5. Code Review (Release Candidate)
   # Mesmo processo de PR para develop

6. Merge em main (com tag)
   git checkout main
   git pull origin main
   git merge --no-ff release/v1.0.0
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin main --tags

7. Merge de volta em develop
   git checkout develop
   git pull origin develop
   git merge --no-ff release/v1.0.0
   git push origin develop

8. Deletar branch release
   git branch -d release/v1.0.0
   git push origin --delete release/v1.0.0
```

### 🔴 Hotfix Urgente (Hotfix)

```
1. Criar hotfix do main
   git checkout main
   git pull origin main
   git checkout -b hotfix/v1.0.1-descricao

2. Corrigir o problema
   git add .
   git commit -m "fix: descrição do hotfix"

3. Atualizar versão patch
   npm version patch  # v1.0.0 → v1.0.1

4. Merge em main (com tag)
   git checkout main
   git merge --no-ff hotfix/v1.0.1-descricao
   git tag -a v1.0.1 -m "Hotfix v1.0.1"
   git push origin main --tags

5. Merge em develop
   git checkout develop
   git pull origin develop
   git merge --no-ff hotfix/v1.0.1-descricao
   git push origin develop

6. Deletar hotfix
   git branch -d hotfix/v1.0.1-descricao
   git push origin --delete hotfix/v1.0.1-descricao
```

---

## 🛡️ Proteção de Branches

### Regras para `main`
- ✅ Requer PR com 1+ revisão
- ✅ Requer testes verdes (CI/CD)
- ✅ Requer merge squash ou rebase
- ✅ Não permite push direto
- ✅ Vercel deploy automático

### Regras para `develop`
- ✅ Requer PR com 1+ revisão
- ✅ Requer testes verdes (CI/CD)
- ✅ Permite merge ou squash
- ✅ Não permite push direto
- ✅ Vercel preview automático

### Regras para `feature/*`
- ⚠️ Sem proteção especial
- ⚠️ Permite push direto
- ⚠️ Deletado após merge

---

## 🚫 O Que NÃO Fazer

| ❌ Errado | ✅ Certo |
|----------|---------|
| Push direto em `main` | PR + Review → Merge |
| Nomear feature como `v1.0.0` | Usar `feature/descricao` |
| Misturar features em 1 branch | 1 feature = 1 branch |
| Ignorar conflitos | Resolver + Testar |
| Deletar `main` ou `develop` | Apenas features/ |
| Commit com 100+ arquivos | Commits focados |
| PR sem descrição | PR descritiva |

---

## 📦 Integração Vercel

```yaml
# Automático na plataforma:

main branch
   ↓ push
   ↓ GitHub Actions
   ↓ npm run build
   ↓ Vercel Deploy Production
   ↓ https://gesclinic.vercel.app
   ↓ RLS ativa

develop branch
   ↓ push
   ↓ GitHub Actions
   ↓ npm run build
   ↓ Vercel Deploy Staging/Preview
   ↓ https://develop.gesclinic.vercel.app
   ↓ RLS ativa

feature/* branch
   ↓ push
   ↓ GitHub Actions
   ↓ npm run build
   ↓ Vercel Preview (automático em PR)
   ↓ https://gesclinic-feature-abc123.vercel.app
   ↓ RLS ativa
```

---

## 📊 Estado Ideal de Branches

```bash
# Listar branches
git branch -a

# Esperado:
  main
  develop
* feature/nova-funcionalidade
  remotes/origin/main
  remotes/origin/develop
  remotes/origin/feature/nova-funcionalidade
  remotes/origin/feature/outra-feature
```

---

## 🔗 Próximos Documentos

- 📌 [SEMANTIC_VERSIONING.md](🔄_SEMANTIC_VERSIONING.md) - Como numerar versões
- 🛠️ [DESENVOLVIMENTO_LOCAL.md](🛠️_DESENVOLVIMENTO_LOCAL.md) - Setup local
- 🚀 [RELEASE_PRODUCTION.md](🚀_RELEASE_PRODUCAO.md) - Como fazer release
- ✅ [CHECKLIST_PRODUCAO.md](✅_CHECKLIST_PRODUCAO.md) - Antes de deployar
- 🔧 [COMANDOS_GIT_PRONTOS.md](🔧_COMANDOS_GIT_PRONTOS.md) - Copy/paste
- ↩️ [ROLLBACK_GUIDE.md](↩️_ROLLBACK_GUIDE.md) - Recuperação de erros
