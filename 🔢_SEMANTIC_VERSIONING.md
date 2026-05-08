# 🔢 Semantic Versioning (SemVer)

## O Padrão SemVer

O Gesclinic Web segue **Semantic Versioning 2.0.0** para todas as releases.

### Formato: `MAJOR.MINOR.PATCH-prerelease+build`

```
v1.0.0
└─ MAJOR = 1  (mudanças incompatíveis)
│  MINOR = 0  (novas features, compatível)
│  PATCH = 0  (bugfixes, compatível)

v1.2.3-rc.1
│        └─ Release Candidate 1

v1.2.3+build.123
         └─ Build metadata
```

---

## 📊 Quando Incrementar?

### 🔴 MAJOR (X.0.0)
**Mudanças incompatíveis com versão anterior**

```
v1.0.0 → v2.0.0

Razões:
• Mudança na estrutura de banco de dados (incompatível)
• RLS policy completamente refatorada
• API REST breaking change
• Schema Supabase refatorado
• Mudança na estrutura de autenticação

Exemplo do Gesclinic:
v1.0.0 → v2.0.0
└─ Refatoração completa do módulo Financeiro
   └─ Estrutura de tabelas muda
   └─ Endpoints API mudam
   └─ Clientes precisam atualizar integração
```

### 🟢 MINOR (X.1.0)
**Nova funcionalidade, compatível com versão anterior**

```
v1.0.0 → v1.1.0

Razões:
• Nova feature (Relatório, Módulo, Integração)
• Novo endpoint API (compatível)
• Novas colunas em tabelas (com default)
• Melhorias em UI/UX
• Novas configurações (opcionais)

Exemplos do Gesclinic:
v1.0.0 → v1.1.0: Nova integração Stripe
v1.1.0 → v1.2.0: Módulo de Auditoria
v1.2.0 → v1.3.0: Feature Flags Sistema
v1.3.0 → v1.4.0: Dashboard KPIs
v1.4.0 → v1.5.0: Relatórios Personalizados
```

### 🔵 PATCH (X.0.1)
**Bugfix, segurança ou hotfix**

```
v1.0.0 → v1.0.1

Razões:
• Correção de bug crítico
• Segurança (RLS fix, SQL injection)
• Performance (otimização de query)
• Erro visual/UI
• Falha em caso específico

Exemplos do Gesclinic:
v1.0.0 → v1.0.1: Fix RLS timezone
v1.0.1 → v1.0.2: Erro pagamento Stripe
v1.0.2 → v1.0.3: Query performance
v1.0.3 → v1.0.4: Fix validação agenda
```

---

## 📈 Evolução de Versão - Roadmap

```
┌─────────────────────────────────────────────────────────────┐
│                    ROADMAP GESCLINIC WEB                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ v0.1.0 ───────────────────────────────────────────── ALFA   │
│ Beta interno, features básicas, sem suporte                 │
│                                                             │
│ v0.5.0 ───────────────────────────────────────── BETA       │
│ Beta para alguns clientes, features principais              │
│                                                             │
│ v0.9.0 ────────────────────────────── PRÉ-LANÇAMENTO       │
│ Release candidate, testes finais, stabilização              │
│                                                             │
│ v1.0.0 ────────────────────────── 🚀 PRODUÇÃO              │
│ Lançamento oficial! SLA, suporte, RLS completa              │
│  ├─ v1.0.1 (hotfix segurança)                              │
│  ├─ v1.0.2 (bugfix performance)                            │
│  └─ v1.0.3 (patches menores)                               │
│                                                             │
│ v1.1.0 ─────────────────────── NOVA FEATURE                │
│ Integração com Stripe, checkout, planos                     │
│  ├─ v1.1.1 (bugfix integração)                             │
│  └─ v1.1.2 (ajustes)                                       │
│                                                             │
│ v1.2.0 ─────────────────────── NOVA FEATURE                │
│ Módulo de Auditoria, rastreamento                          │
│                                                             │
│ v1.3.0 ─────────────────────── NOVA FEATURE                │
│ Feature Flags, menu dinâmico, controle granular             │
│                                                             │
│ v2.0.0 ────────────────────── MAJOR REFACTOR               │
│ Mudança no schema, nova arquitetura, RLS v2                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 CHANGELOG.md - Formato Padrão

Cada versão deve ter entry no CHANGELOG.md seguindo Keep a Changelog:

```markdown
# Changelog

## [1.5.0] - 2026-05-15

### Added
- ✨ Dashboard com gráficos KPI em tempo real
- ✨ Exportação de relatórios em PDF
- 🔐 Suporte a autenticação OAuth2

### Changed
- 🔄 Refatoração do módulo de Estoque
- 🔄 Melhorada performance de queries (50% mais rápido)
- 🔄 UI da Agenda com novo layout

### Fixed
- 🐛 Correção do bug de timezone em agendamentos
- 🐛 Fix RLS para múltiplas clínicas
- 🐛 Erro ao fazer logout em Firefox

### Security
- 🔒 Validação de permissões mais rigorosa
- 🔒 Proteção contra SQL injection

### Deprecated
- ⚠️ Endpoint /api/v1/appointments (usar /api/v2)

## [1.4.0] - 2026-05-01
...

## [1.0.0] - 2026-01-10
...
```

---

## 🏷️ Tags Git

### Criar Tag

```bash
# Anotar tag de versão
git tag -a v1.0.0 -m "Release v1.0.0"

# Ver tags
git tag -l

# Ver tag específica
git show v1.0.0

# Push tag
git push origin v1.0.0

# Push todas as tags
git push origin --tags
```

### Listar Tags

```bash
# Listar todas
git tag -l

# Listar com padrão
git tag -l "v1.*"

# Ver tags remotas
git ls-remote --tags origin
```

### Deletar Tag

```bash
# Local
git tag -d v1.0.0

# Remoto
git push origin --delete v1.0.0
```

---

## 📦 Atualizar Versão em package.json

### Método 1: npm version (Automático)

```bash
# Major (v1.0.0 → v2.0.0)
npm version major

# Minor (v1.0.0 → v1.1.0)
npm version minor

# Patch (v1.0.0 → v1.0.1)
npm version patch

# Pré-release (v1.0.0 → v1.0.1-rc.0)
npm version prerelease

# Versão específica
npm version 1.5.0
```

### Método 2: Manual

```bash
# Editar package.json
{
  "version": "1.0.0"
}

# Depois:
git add package.json package-lock.json
git commit -m "chore: bump version to 1.0.0"
```

---

## 🔗 Versionamento em Vercel

### URL da Versão

```
Production (main)
https://gesclinic.vercel.app (v1.0.0)
https://gesclinic.vercel.app (v1.0.1)  # Atualiza ao fazer deploy
https://gesclinic.vercel.app (v1.1.0)  # Atualiza ao fazer deploy

Staging (develop)
https://develop.gesclinic.vercel.app (v1.1.0-rc.0)

Preview (feature)
https://gesclinic-feature-abc123.vercel.app (v1.0.0 + mudanças)
```

### Revert de Versão em Vercel

Se v1.0.1 tiver problema:

```bash
# Ver histórico de deployments
vercel list

# Revert para v1.0.0
vercel rollback v1.0.0

# Ou no GitHub, revert commit de merge e push
```

---

## 🎯 Exemplos de Versioning Real

### Cenário 1: Feature Nova
```
v1.0.0 (atual)
  └─ PR: feature/stripe-pagamentos
     └─ Merge em develop
        └─ release/v1.1.0 criado
           └─ package.json: "1.1.0"
              └─ CHANGELOG.md atualizado
                 └─ git tag -a v1.1.0
                    └─ Merge em main
                       └─ Deploy Production
                          └─ Agora é v1.1.0
```

### Cenário 2: Hotfix Urgente
```
v1.0.0 (em produção)
  └─ 🚨 BUG CRÍTICO descoberto!
     └─ hotfix/v1.0.1-seguranca criado de main
        └─ Corrigir problema
           └─ npm version patch → v1.0.1
              └─ git tag -a v1.0.1
                 └─ Merge em main + develop
                    └─ Deploy imediato Production
                       └─ Agora é v1.0.1
```

### Cenário 3: Múltiplos Hotfixes
```
v1.0.0
  ├─ v1.0.1 (segurança)
  ├─ v1.0.2 (performance)
  ├─ v1.0.3 (outro bug)
  └─ Depois, features acumuladas
     └─ v1.1.0 (lançamento)
```

---

## ⚡ Quick Reference

| Comando | Uso |
|---------|-----|
| `npm version major` | v1.0.0 → v2.0.0 |
| `npm version minor` | v1.0.0 → v1.1.0 |
| `npm version patch` | v1.0.0 → v1.0.1 |
| `git tag -a v1.0.0 -m "..."` | Criar tag |
| `git push origin --tags` | Push tags |
| `git tag -l` | Listar tags |
| `git show v1.0.0` | Ver tag |

---

## 🔗 Próximos Passos

- 📌 [GIT_FLOW.md](🔄_GIT_FLOW_ESTRATEGIA.md) - Branches
- 🛠️ [DESENVOLVIMENTO_LOCAL.md](🛠️_DESENVOLVIMENTO_LOCAL.md) - Setup
- 🚀 [RELEASE_PRODUCTION.md](🚀_RELEASE_PRODUCAO.md) - Deploy
- ✅ [CHECKLIST_PRODUCAO.md](✅_CHECKLIST_PRODUCAO.md) - Validação
- 🔧 [COMANDOS_GIT_PRONTOS.md](🔧_COMANDOS_GIT_PRONTOS.md) - Copy/Paste
