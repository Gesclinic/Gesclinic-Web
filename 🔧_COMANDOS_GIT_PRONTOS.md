# 🔧 Comandos Git Prontos - Copy & Paste

## 🚀 Iniciar Desenvolvimento

### Primeira Vez (Setup Completo)

```bash
# 1. Clonar repositório
git clone https://github.com/seu-org/gesclinic-web.git
cd gesclinic-web

# 2. Adicionar remoto upstream (opcional, para forks)
git remote add upstream https://github.com/projeto-original/gesclinic-web.git

# 3. Listar remotes
git remote -v

# 4. Trazer branches remotas
git fetch origin

# 5. Instalar dependências
npm install

# 6. Criar arquivo .env
cp .env.example .env
# Editar .env com suas credenciais

# 7. Iniciar servidor
npm run dev
```

---

## 📌 Trabalhar com Branches

### Listar Branches

```bash
# Branches locais
git branch

# Todos os branches (local + remoto)
git branch -a

# Branches locais com último commit
git branch -v

# Deletar branch local
git branch -d nome-da-branch
```

### Criar Feature Branch

```bash
# Garantir que develop está atualizado
git checkout develop
git pull origin develop

# Criar e entrar em feature branch
git checkout -b feature/minha-funcionalidade

# OU criar sem mudar (depois checkout)
git branch feature/minha-funcionalidade
git checkout feature/minha-funcionalidade

# Empurrar novo branch para servidor
git push -u origin feature/minha-funcionalidade
# Depois: git push (sem -u) é suficiente
```

### Sincronizar com Develop

```bash
# Fetch mais recentes mudanças
git fetch origin

# Trazer mudanças de develop para sua branch
git merge origin/develop

# OU rebase (se preferir history linear)
git rebase origin/develop
```

### Deletar Branch

```bash
# Local (seguro, só delete se merged)
git branch -d feature/minha-funcionalidade

# Local (força, mesmo que não merged)
git branch -D feature/minha-funcionalidade

# Remoto (GitHub)
git push origin --delete feature/minha-funcionalidade

# Ambos (local + remoto)
git branch -d feature/minha-funcionalidade
git push origin --delete feature/minha-funcionalidade
```

---

## 💾 Commits & Push

### Preparar Commit

```bash
# Ver status
git status

# Adicionar arquivo específico
git add src/components/MeuComponente.jsx

# Adicionar todos os arquivos modificados
git add .

# Adicionar com confirmação interativa (melhor)
git add -p
# Depois press 'y' para cada mudança

# Ver mudanças antes de adicionar
git diff src/components/MeuComponente.jsx

# Ver mudanças já adicionadas
git diff --cached
```

### Fazer Commit

```bash
# Commit simples
git commit -m "feat: adicionar novo componente"

# Commit com descrição detalhada
git commit -m "feat: adicionar novo componente

- Novo componente MeuComponente.jsx
- Integrado com Tailwind CSS
- Suporta dark mode
- Testes unitários adicionados

Closes #123"

# Corrigir último commit (antes de push)
git commit --amend -m "feat: novo título"
# OU
git commit --amend  # Abre editor

# Adicionar arquivo esquecido ao último commit
git add arquivo-esquecido.js
git commit --amend --no-edit
```

### Convenção de Commits

```bash
# Tipos recomendados:

git commit -m "feat: adicionar nova feature"
git commit -m "fix: corrigir bug de autenticação"
git commit -m "docs: atualizar README"
git commit -m "style: formatar código com prettier"
git commit -m "refactor: refatorar componente de agenda"
git commit -m "perf: otimizar query de agendamentos"
git commit -m "test: adicionar testes unitários"
git commit -m "chore: atualizar dependências"
git commit -m "ci: configurar GitHub Actions"
```

### Push para Servidor

```bash
# Push simples (se branch já rastreado)
git push

# Push novo branch
git push -u origin feature/minha-funcionalidade

# Push forçado (use com cuidado! Apenas em branches pessoais)
git push --force-with-lease origin feature/minha-funcionalidade

# Push com tags
git push origin --tags
```

---

## 🔄 Sincronizar com Remoto

### Fetch vs Pull

```bash
# Fetch: Baixar mudanças sem mesclar
git fetch origin

# Pull: Fetch + Merge automático (pode causar problemas)
git pull origin develop

# Melhor: Fetch + Merge manual
git fetch origin
git merge origin/develop

# Rebase (history linear, melhor para features)
git fetch origin
git rebase origin/develop
```

### Resolução de Conflitos

```bash
# Verificar status de conflitos
git status

# Ver conflito no arquivo
cat src/components/MeuComponente.jsx
# Procurar por:
# <<<<<<< HEAD
# ======= 
# >>>>>>>

# Opção 1: Resolver manualmente (editar arquivo)
# Abrir arquivo, remover marcadores, manter versão correta
# Depois:
git add src/components/MeuComponente.jsx

# Opção 2: Usar ferramenta visual
git mergetool

# Opção 3: Aceitar versão remota (desenvolvedora B tem razão)
git checkout --theirs src/components/MeuComponente.jsx

# Opção 4: Aceitar versão local (você tem razão)
git checkout --ours src/components/MeuComponente.jsx

# Completar merge
git add .
git commit -m "merge: resolver conflitos com develop"
```

---

## 📊 Visualizar Histórico

### Ver Commits

```bash
# Últimos 10 commits
git log --oneline -10

# Gráfico visual de branches
git log --oneline --graph --all --decorate

# Commits de uma pessoa
git log --author="João"

# Commits de um arquivo
git log -- src/components/MeuComponente.jsx

# Commits em intervalo de datas
git log --since="2026-05-01" --until="2026-05-15"

# Commit específico detalhado
git show abc1234

# Diferença entre commits
git diff abc1234 def5678
```

### Ver Mudanças

```bash
# Mudanças não commitadas
git diff

# Mudanças já staged
git diff --cached

# Comparar branches
git diff develop..feature/minha-funcionalidade

# Resumo de mudanças
git diff --stat develop..feature/minha-funcionalidade

# Mudanças de um arquivo
git log -p -- src/components/MeuComponente.jsx
```

---

## 🏷️ Tags

### Criar Tag

```bash
# Tag leve (apenas marcador)
git tag v1.0.0

# Tag anotada (melhor para releases)
git tag -a v1.0.0 -m "Release v1.0.0"

# Tag em commit específico
git tag -a v1.0.0 abc1234 -m "Release v1.0.0"
```

### Push Tag

```bash
# Push uma tag
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

# Ver tag específica
git show v1.0.0

# Ver tags remotas
git ls-remote --tags origin
```

### Deletar Tag

```bash
# Local
git tag -d v1.0.0

# Remoto
git push origin --delete v1.0.0

# Ambos
git tag -d v1.0.0
git push origin --delete v1.0.0
```

---

## 🔀 Rebase & Squash

### Rebase Interativo

```bash
# Rebase últimos 5 commits
git rebase -i HEAD~5

# Opções no editor:
# pick - usar commit
# reword - editar mensagem
# squash - combinar com anterior
# fixup - combinar sem mensagem
# drop - remover

# Depois salvar e fechar editor

# Se precisar continuar após conflito
git add .
git rebase --continue

# Se quer abortar
git rebase --abort
```

### Squash Commits

```bash
# Combinar últimos 3 commits em 1
git reset --soft HEAD~3
git commit -m "feat: nova feature completa"
git push -f origin feature/minha-funcionalidade

# OU usar rebase interativo
git rebase -i HEAD~3
# Marcar primeiro como 'pick', resto como 'squash'
```

---

## 🔙 Desfazer Mudanças

### Desfazer Local

```bash
# Ver mudanças não commitadas
git status
git diff

# Descartar mudanças em arquivo
git checkout -- src/components/MeuComponente.jsx

# Descartar TODAS mudanças não commitadas (cuidado!)
git checkout .

# Remover arquivo adicionado
git rm --cached arquivo-novo.js

# Mover arquivo
git mv arquivo-velho.js arquivo-novo.js
```

### Desfazer Commits

```bash
# Desfazer último commit (mantém mudanças)
git reset --soft HEAD~1

# Desfazer último commit (descarta mudanças)
git reset --hard HEAD~1

# Revert de commit específico (cria novo commit inverso)
git revert abc1234

# Revert de vários commits
git revert -n abc1234^..def5678
git commit -m "revert: desfazer commits abc1234 até def5678"
```

### Stash (Salvar Trabalho Temporário)

```bash
# Guardar mudanças temporárias
git stash

# Guardar com mensagem
git stash save "Work in progress on feature X"

# Listar stashes
git stash list

# Aplicar stash mais recente
git stash pop

# Aplicar stash específico
git stash apply stash@{0}

# Deletar stash
git stash drop stash@{0}

# Deletar todos os stashes
git stash clear
```

---

## 🚀 Release & Production

### Criar Release

```bash
# Criar branch release
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0

# Atualizar versão
npm version minor  # v1.0.0 → v1.1.0
# OU npm version patch, major

# Commit
git add package.json package-lock.json
git commit -m "chore: bump version to v1.0.0"

# Push
git push origin release/v1.0.0
```

### Merge Release em Main

```bash
# Checkout main
git checkout main
git pull origin main

# Merge release
git merge --no-ff release/v1.0.0

# Criar tag
git tag -a v1.0.0 -m "Release v1.0.0"

# Push
git push origin main
git push origin v1.0.0

# Voltar para develop
git checkout develop
git merge --no-ff release/v1.0.0
git push origin develop

# Deletar release
git branch -d release/v1.0.0
git push origin --delete release/v1.0.0
```

### Hotfix Urgente

```bash
# Criar hotfix de main
git checkout main
git pull origin main
git checkout -b hotfix/v1.0.1-descricao

# Corrigir e testar
git add .
git commit -m "fix: correção urgente"

# Atualizar versão patch
npm version patch

# Merge em main
git checkout main
git merge --no-ff hotfix/v1.0.1-descricao
git tag -a v1.0.1 -m "Hotfix v1.0.1"
git push origin main --tags

# Merge em develop
git checkout develop
git merge --no-ff hotfix/v1.0.1-descricao
git push origin develop

# Deletar hotfix
git branch -d hotfix/v1.0.1-descricao
git push origin --delete hotfix/v1.0.1-descricao
```

---

## 🔗 GitHub (CLI opcional)

```bash
# Listar PRs abertos (requer gh CLI)
gh pr list

# Criar PR
gh pr create --base develop --head feature/minha-funcionalidade --title "Minha Feature" --body "Descrição"

# Ver PR específico
gh pr view 123

# Aprovar PR
gh pr review 123 --approve

# Comentar em PR
gh pr comment 123 --body "Looks good!"
```

---

## 🎯 Fluxo Completo Rápido

### Desenvolvimento

```bash
# Dia 1
git checkout develop
git pull origin develop
git checkout -b feature/nova-funcionalidade

# Trabalhar...
git add .
git commit -m "feat: descrição"

# Dia 2
git fetch origin
git merge origin/develop  # Sincronizar

# Dia 3
git push origin feature/nova-funcionalidade
# Ir GitHub → PR → Merge

# Depois:
git checkout develop
git pull origin develop
git branch -d feature/nova-funcionalidade
```

### Release

```bash
# Criar release
git checkout -b release/v1.0.0

# Versionar
npm version minor

# Push
git push origin release/v1.0.0

# GitHub PR → Merge em main
# Depois localmente:

git checkout main
git pull origin main
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

git checkout develop
git merge --no-ff release/v1.0.0
git push origin develop

git branch -d release/v1.0.0
git push origin --delete release/v1.0.0
```

---

## 📋 Configurações Úteis

```bash
# Configurar usuário (primeira vez)
git config user.name "João Silva"
git config user.email "joao@example.com"

# Globalmente
git config --global user.name "João Silva"
git config --global user.email "joao@example.com"

# Ver configurações
git config --list

# Alias úteis
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual 'log --graph --oneline --all --decorate'

# Depois: git co, git br, git ci, etc.
```

---

## 🆘 Emergência

```bash
# Desfazer tudo e voltar para remoto
git fetch origin
git reset --hard origin/develop

# Ver o que vai acontecer sem fazer
git reset --hard origin/develop --dry-run

# Reflog: ver histórico de referências
git reflog

# Recuperar branch deletada
git reflog
git checkout -b branch-recuperada abc1234

# Limpar branches deletadas remotamente
git fetch origin --prune
```

---

## 📚 Mais Info

```bash
# Help de qualquer comando
git help checkout
git checkout --help

# Ver versão
git --version

# Status
git status
```

---

## 🔗 Referência Rápida

| Comando | Uso |
|---------|-----|
| `git status` | Ver estado |
| `git add .` | Adicionar tudo |
| `git commit -m "msg"` | Commitá |
| `git push` | Empurrar |
| `git pull` | Trazer |
| `git branch -a` | Ver branches |
| `git checkout -b novo` | Nova branch |
| `git merge origem` | Mesclar |
| `git tag -a v1.0.0` | Tag |
| `git log --oneline` | Histórico |
