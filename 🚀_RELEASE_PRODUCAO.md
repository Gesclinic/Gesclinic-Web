# 🚀 Release para Produção - Guia Completo

## 📊 Visão Geral do Processo

```
develop branch (várias features)
   ↓
   ├─ Criar release/v1.0.0
   ├─ Testar em Staging
   ├─ Atualizar versionamento
   ├─ Documentar mudanças
   ↓
   ├─ Code Review
   ├─ Testes finais
   ↓
   └─ Merge em main + tag
   
main branch (produção)
   ↓
   ├─ Deploy Vercel automaticamente
   ├─ RLS ativa e testada
   ├─ Monitorar erros
   ↓
✅ Pronto em produção!
```

---

## ✅ Checklist Pré-Release

Antes de iniciar o release, verificar:

```
TESTES & QUALIDADE
─────────────────────────────────────
□ Todos os testes passam localmente (npm run test)
□ Build produção funciona (npm run build)
□ Sem warnings em console (F12)
□ Sem erros de RLS
□ Sem erros de autenticação
□ Sem console.log deixados no código

FUNCIONALIDADES & FEATURES
─────────────────────────────────────
□ Agenda: criar, editar, deletar agendamentos
□ Pacientes: listar, filtrar, detalhes
□ Financeiro: AP bills, invoices, fluxo caixa
□ Estoque: movimentações, saldo
□ Autenticação: login, logout, role-based access
□ Performance: carregamento < 3s

RLS & SEGURANÇA
─────────────────────────────────────
□ RLS testada: usuário só vê dados da sua clínica
□ RLS testada: profissional só vê seus agendamentos
□ Permissões: role-based access funcionando
□ SQL Injection: nenhum risco

DOCUMENTAÇÃO
─────────────────────────────────────
□ README.md atualizado
□ CHANGELOG.md preenchido
□ API docs atualizadas
□ Migração SQL documentada (se houver)

SUPABASE
─────────────────────────────────────
□ Migrations aplicadas em produção
□ RLS policies ativas
□ Triggers funcionando
□ Backups recentes
```

---

## 🔄 Passo 1: Criar Branch de Release

```bash
# Garantir que develop está atualizado
git checkout develop
git pull origin develop

# Verificar últimas mudanças
git log --oneline -10

# Criar branch release
git checkout -b release/v1.0.0

# Empurrar para servidor (opcional neste ponto)
git push origin release/v1.0.0
```

---

## 🔢 Passo 2: Atualizar Versionamento

### Opção 1: Automático com npm

```bash
# Estar em release/v1.0.0
git checkout release/v1.0.0

# Atualizar versão (escolher um)
npm version major   # v0.9.0 → v1.0.0
npm version minor   # v1.0.0 → v1.1.0
npm version patch   # v1.0.0 → v1.0.1

# Verificar mudanças
git log --oneline -2
git diff HEAD~1
```

### Opção 2: Manual

```bash
# Editar package.json
# "version": "1.0.0"

# Editar package-lock.json também
npm install  # Atualiza package-lock.json

# Commit
git add package.json package-lock.json
git commit -m "chore: bump version to 1.0.0"
```

---

## 📝 Passo 3: Atualizar CHANGELOG.md

```bash
# Criar/editar CHANGELOG.md (se não existir, criar)
# Formato Keep a Changelog:

cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-05-15

### Added
- ✨ Integração com Stripe para pagamentos
- ✨ Feature Flags sistema (planos: Básico, Profissional, Enterprise)
- ✨ Menu dinâmico baseado em permissões
- ✨ Auditoria e tracking de ações
- ✨ Dashboard com KPIs

### Changed
- 🔄 Refatoração completa do módulo Financeiro
- 🔄 Performance: queries otimizadas (50% mais rápido)
- 🔄 UI/UX melhorada em toda aplicação
- 🔄 RLS policies mais granulares

### Fixed
- 🐛 Correção do bug de timezone em agendamentos
- 🐛 Fix RLS para múltiplas clínicas
- 🐛 Erro ao fazer logout em alguns navegadores
- 🐛 Performance de queries de grande volume

### Security
- 🔒 Validação de permissões mais rigorosa
- 🔒 Proteção contra SQL injection reforçada
- 🔒 Autenticação com uid ao invés de user_id

### Deprecated
- ⚠️ Endpoint /api/v1/appointments (usar /api/v2 em v1.1.0)

## [0.9.0] - 2026-01-10

### Added
- Initial beta release
- Agenda module
- Pacientes module
- Financeiro module

EOF
```

### Commit CHANGELOG

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for v1.0.0"
git push origin release/v1.0.0
```

---

## 🧪 Passo 4: Testes Finais

### Build de Produção

```bash
# Fazer build limpo
npm run clean:win   # ou npm run clean
npm install
npm run build

# Verificar resultado
ls -la dist/

# Preview localmente
npm run preview
# Acessar http://localhost:4173
```

### Testes Manuais em Preview

```
1. Abrir http://localhost:4173
2. Fazer login
3. Testar funcionalidades principais:
   ✅ Agenda: criar agendamento
   ✅ Financeiro: visualizar AP bills
   ✅ Estoque: ver movimentação
   ✅ Autenticação: logout, login
   ✅ RLS: dados filtrados por clínica
4. Verificar console (F12) por erros
5. Testar em produção Supabase:
   - Dados refletem corretamente
   - RLS sem erros
6. Testar Stripe (se aplicável):
   - Checkout funciona
   - Transações registram
```

### Testes Automatizados

```bash
# Rodar testes
npm run test

# Rodar e2e (se houver)
npm run test:e2e
```

---

## 📋 Passo 5: Code Review

### Criar Pull Request

```bash
# Push final da release branch (se ainda não foi)
git push origin release/v1.0.0

# GitHub: Compare & Pull Request
# Base: main
# Compare: release/v1.0.0
# Título: "Release v1.0.0"
# Descrição:
"""
## Release v1.0.0

### Overview
Primeira release de produção do Gesclinic Web.

### Features Principais
- Integração Stripe
- Feature Flags
- Auditoria

### Breaking Changes
Nenhum (primeira release)

### Testing
- ✅ Build local: OK
- ✅ Testes: OK
- ✅ RLS: OK
- ✅ Performance: OK

### Checklist
- [x] CHANGELOG.md atualizado
- [x] package.json versão v1.0.0
- [x] Testes passam
- [x] Build OK
- [x] Sem console.log
- [x] RLS testada
"""
```

### Processo de Review

```
1. Revisor(a) recebe notificação
2. Revisor(a) faz code review:
   - Verifica package.json
   - Verifica CHANGELOG.md
   - Verifica commits
   - Aprova ou pede mudanças
3. Todos resolvem comentários
4. Revisor(a) aprova ("Approve")
5. Merge botão disponível
```

---

## 🎯 Passo 6: Merge em Main

### Via GitHub (Recomendado)

```
1. GitHub: "Squash and merge" (melhor para history limpo)
   Ou: "Create a merge commit" (mantém history detalhada)

2. Confirmar merge
   ✅ Merge completo
   ✅ Branch release deletada (opção)
   ✅ Deploy Vercel inicia automaticamente
```

### Via CLI (Se preferir)

```bash
# Verificar que está em release/v1.0.0
git branch

# Atualizar main
git checkout main
git pull origin main

# Merge com --no-ff (melhor para history)
git merge --no-ff release/v1.0.0

# Ver resultado
git log --oneline -3

# Push para servidor
git push origin main
```

---

## 🏷️ Passo 7: Criar Tag de Versão

### Adicionar Tag Anotada

```bash
# Estar em main
git checkout main
git pull origin main

# Criar tag
git tag -a v1.0.0 -m "Release v1.0.0 - First production release"

# Verificar tag
git tag -l
git show v1.0.0

# Push tag para servidor
git push origin v1.0.0

# Ou push todas as tags
git push origin --tags
```

---

## 🔄 Passo 8: Merge de Volta em Develop

```bash
# Isso garante que develop tenha as mudanças de versão

# Checkout develop
git checkout develop
git pull origin develop

# Merge release em develop
git merge --no-ff release/v1.0.0

# Push
git push origin develop

# Verificar
git log --oneline -5
```

---

## 🗑️ Passo 9: Deletar Branch Release

```bash
# Local
git branch -d release/v1.0.0

# Remoto
git push origin --delete release/v1.0.0

# Verificar
git branch -a
# release/v1.0.0 não deve aparecer
```

---

## 🚀 Passo 10: Deploy Vercel (Automático)

### O que Acontece Automaticamente

```
GitHub: Push em main
   ↓
   Vercel webhook ativado
   ↓
   Clone repositório
   ↓
   npm install
   ↓
   npm run build
   ↓
   Upload para CDN
   ↓
   DNS aponta para nova versão
   ↓
   ✅ https://gesclinic.vercel.app (v1.0.0)

Tempo: ~2-5 minutos
```

### Verificar Deploy

```
1. Ir em https://vercel.com/seu-projeto
2. Verificar que há novo deployment
3. Status: "Ready" (verde)
4. Acessar https://gesclinic.vercel.app
5. Verificar que é a nova versão
```

---

## 📊 Passo 11: Validação em Produção

### Testes Pós-Deploy

```bash
# Acessar produção
https://gesclinic.vercel.app

# Testes críticos:
✅ Login funciona
✅ Agendamentos carregam
✅ Financeiro carrega
✅ Sem erros no console
✅ RLS funcionando (dados filtrados)
✅ Performance: < 3s carregamento

# Monitorar por 15-30 min por:
❌ Erros de RLS
❌ Erros de autenticação
❌ Erros de carregar dados
❌ Erros de Stripe (se aplicável)
```

### Verificar Logs (Vercel)

```
1. https://vercel.com/seu-projeto/deployments
2. Clicar no deployment mais recente
3. Ver "Logs"
4. Procurar por erros
5. Se houver problema → ROLLBACK imediato
```

---

## 🎉 Passo 12: Comunicação

### Anunciar Release

```
👥 Equipe:
"✅ v1.0.0 em produção!"
- Link: https://gesclinic.vercel.app
- Changelog: [link]

👨‍💼 Stakeholders:
"Release v1.0.0 live"
- Novas features: [lista]
- Breaking changes: [se houver]
- Performance: [melhoria %]
```

---

## 📈 Monitoramento Pós-Release

```bash
# Primeira hora (crítica)
✅ Atualizar página: OK
✅ Teste de login: OK
✅ Teste de agenda: OK
✅ Verificar Supabase: logs sem erro

# 24 horas
✅ Clientes reportando problemas?
✅ Taxa de erros normal?
✅ Performance OK?
✅ RLS funcionando para todos?

# 1 semana
✅ Estável?
✅ Nenhum hotfix necessário?
✅ Feliz com v1.0.0?
```

---

## 🔗 Fluxo Rápido (Copy & Paste)

```bash
# 1. Criar release
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0

# 2. Atualizar versão
npm version minor  # Ou major/patch

# 3. Build & test
npm run clean:win
npm install
npm run build
npm run preview
# Testar em http://localhost:4173

# 4. Commit e push
git push origin release/v1.0.0

# 5. GitHub: Criar PR (main ← release/v1.0.0)
# 6. GitHub: Approve & Merge (Squash)
# 7. GitHub: Deletar branch

# 8. Tag em main (local)
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# 9. Merge em develop
git checkout develop
git merge --no-ff release/v1.0.0
git push origin develop

# 10. Deletar local
git branch -d release/v1.0.0

# 11. Esperar 5 min Vercel deploy
# 12. Testar em https://gesclinic.vercel.app
```

---

## 🔗 Próximos Documentos

- 📌 [GIT_FLOW.md](🔄_GIT_FLOW_ESTRATEGIA.md) - Branches
- 🔢 [SEMANTIC_VERSIONING.md](🔢_SEMANTIC_VERSIONING.md) - Versionamento
- 🛠️ [DESENVOLVIMENTO_LOCAL.md](🛠️_DESENVOLVIMENTO_LOCAL.md) - Setup local
- ✅ [CHECKLIST_PRODUCAO.md](✅_CHECKLIST_PRODUCAO.md) - Validação final
- 🔧 [COMANDOS_GIT_PRONTOS.md](🔧_COMANDOS_GIT_PRONTOS.md) - Copy/Paste
- ↩️ [ROLLBACK_GUIDE.md](↩️_ROLLBACK_GUIDE.md) - Recuperação
