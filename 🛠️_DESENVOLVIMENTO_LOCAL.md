# 🛠️ Desenvolvimento Local - Setup & Workflow

## ⚡ Quick Start (5 min)

```bash
# 1. Clonar repositório
git clone https://github.com/seu-org/gesclinic-web.git
cd gesclinic-web

# 2. Instalar dependências
npm install

# 3. Setup environment
# Copiar .env.example para .env
# Editar com suas credenciais Supabase/Stripe

# 4. Iniciar servidor dev
npm run dev

# 5. Abrir no navegador
# http://localhost:3000
```

---

## 📋 Pré-requisitos

### Software
- ✅ **Node.js**: v18+ (testar com `node --version`)
- ✅ **npm**: v9+ (testar com `npm --version`)
- ✅ **Git**: v2.30+ (testar com `git --version`)
- ✅ **Docker** (opcional): v20+ para Supabase local

### Contas Online
- ✅ **GitHub**: Acesso ao repositório gesclinic-web
- ✅ **Supabase**: Conta com projeto criado
- ✅ **Stripe**: Account para testes (com Publishable Key)
- ✅ **Vercel**: Conectado ao GitHub

---

## 🚀 Setup Completo (Primeira Vez)

### 1. Clone o Repositório

```bash
# HTTPS
git clone https://github.com/seu-org/gesclinic-web.git

# Ou SSH (mais seguro)
git clone git@github.com:seu-org/gesclinic-web.git

# Entrar na pasta
cd gesclinic-web
```

### 2. Crie a Branch Local

```bash
# Trazer branches remotas
git fetch origin

# Checkout develop (base para novas features)
git checkout -b develop origin/develop

# Ou checkout main se for apenas revisar
git checkout -b main origin/main

# Verificar branches locais
git branch -a
```

### 3. Configure Environment

```bash
# Copiar template de env
cp .env.example .env

# Editar .env com suas credenciais
# .env deve ter:
#   VITE_SUPABASE_URL=https://xxxx.supabase.co
#   VITE_SUPABASE_ANON_KEY=eyJxx...
#   VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

### 4. Instale Dependências

```bash
# Instalar packages
npm install

# Verificar instalação
npm list

# Se erro, limpar cache e reinstalar
npm run clean:win  # Windows
npm run clean      # Linux/Mac
npm install
```

### 5. Inicie o Servidor Dev

```bash
# Iniciar Vite dev server
npm run dev

# Esperado:
# Local: http://localhost:3000
# ready in 500ms

# Abrir no navegador → http://localhost:3000
```

### 6. Verificar RLS & Autenticação

```
1. Acessar http://localhost:3000
2. Ir para /login
3. Fazer login com conta teste
4. Deve redirecionar para /clinica
5. Se erro de RLS → Ver DIAGNOSTICO_RLS_E_SOLUCAO_SQL.sql
```

---

## 🔧 Fluxo Diário de Desenvolvimento

### Manhã: Sincronizar com develop

```bash
# Garantir que está em develop
git checkout develop

# Atualizar com mudanças remotas
git pull origin develop

# Verificar se há updates de dependências
npm install

# Iniciar servidor dev
npm run dev
```

### Durante o Dia: Trabalhar em Feature

```bash
# 1. Criar feature branch
git checkout -b feature/minha-funcionalidade

# 2. Fazer alterações e commits regulares
# Editar arquivos...
git add src/components/MeuComponente.jsx
git commit -m "feat: adicionar novo componente"

# 3. Push local para remoto
git push origin feature/minha-funcionalidade

# 4. Trabalhar mais
# Editar mais arquivos...
git add src/lib/meuServiço.js
git commit -m "feat: integrar novo serviço"
git push origin feature/minha-funcionalidade
```

### Final do Dia: Resolver Conflitos

```bash
# Verificar se develop tem mudanças novas
git fetch origin

# Trazer mudanças do develop
git merge origin/develop

# Se tiver conflitos:
# 1. VS Code marca conflitos
# 2. Resolver manualmente
# 3. git add . (marcar como resolvido)
# 4. git commit -m "merge: resolver conflitos com develop"
# 5. git push origin feature/minha-funcionalidade
```

### Pronto: Abrir Pull Request

```bash
# Ver mudanças
git log develop..feature/minha-funcionalidade

# Push final
git push origin feature/minha-funcionalidade

# Ir em GitHub → Compare & Pull Request
# 1. Base: develop
# 2. Compare: feature/minha-funcionalidade
# 3. Preencher descrição
# 4. Criar PR
```

---

## 📊 Estrutura de Pastas

```
gesclinic-web/
├── .github/
│   ├── workflows/        # ← CI/CD workflows
│   └── copilot-instructions.md
├── src/
│   ├── components/       # ← Componentes React
│   ├── pages/            # ← Páginas/telas
│   ├── lib/              # ← API calls, utils
│   ├── hooks/            # ← Custom hooks
│   ├── context/          # ← Context Providers
│   ├── constants/        # ← Constantes, menu
│   ├── App.jsx
│   ├── AppRoutes.jsx     # ← Rotas principais
│   └── main.jsx
├── public/               # ← Assets estáticos
├── supabase/
│   └── migrations/       # ← SQL migrations
├── vite.config.js        # ← Config Vite
├── tailwind.config.js    # ← Config Tailwind
├── package.json
├── .env.example
└── README.md
```

---

## 🔍 Desenvolvimento - Dicas Úteis

### Vite Hot Module Replacement (HMR)

```
Vite monitora arquivos e atualiza browser automaticamente
✅ Salvar arquivo → Vive reload browser (preserva estado)
✅ Mudar .jsx → Atualiza component sem perder forma
✅ Mudar .css → Atualiza estilos instantaneamente
✅ Mudar .js → Reload completo do módulo

Se não atualizar:
1. Verificar console (F12)
2. Hard refresh (Ctrl+Shift+R)
3. Restart npm run dev
```

### Debug no VS Code

```json
// .vscode/launch.json (adicionar)
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Gesclinic Dev",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/src",
      "sourceMapPathOverride": {
        "webpack:///./src/*": "${webRoot}/*"
      }
    }
  ]
}
```

### Verificar RLS Policies

```bash
# Acessar Supabase Studio
https://supabase.com/dashboard/project/seu-projeto/auth/policies

# Ou via CLI (se tiver supabase CLI)
supabase db list

# Testar query direto em SQL Editor (Supabase Studio)
# SELECT * FROM appointments WHERE clinic_id = 'seu-clinic-uuid';
```

---

## 🐛 Troubleshooting - Problemas Comuns

### Erro: "VITE_SUPABASE_URL not found"
```bash
✅ Solução: Editar .env com credenciais corretas
✅ Verificar: npm run dev mostra erro específico
✅ Reiniciar: Parar npm e fazer npm run dev novamente
```

### Erro: "RLS policy violation"
```bash
✅ Verificar: Estar logado com conta que pertence à clínica
✅ Verificar: RLS policies estão corretas (ver DIAGNOSTICO_RLS_E_SOLUCAO_SQL.sql)
✅ Verificar: user_id no auth.users = uid na public.users
```

### Erro: "module not found"
```bash
✅ Solução: npm install (instalar dependências faltantes)
✅ Verificar: Node modules não está em .gitignore
✅ Limpar: npm run clean:win && npm install
```

### Dev server lento
```bash
✅ Verificar: npm run dev usa Vite (muito mais rápido que webpack)
✅ Limpar: Parar e fazer npm run dev novamente
✅ HMR: Se módulo não atualiza, fazer hard refresh (Ctrl+Shift+R)
✅ Verificar console (F12) por erros
```

### Conflito de branch
```bash
# Se receber erro ao fazer git pull
git fetch origin
git merge origin/develop

# Ver conflitos
git status

# Resolver em VS Code (marca com ><)
# Salvar arquivo
git add .
git commit -m "merge: resolver conflitos"
git push origin sua-feature
```

---

## 📦 Scripts Disponíveis

```bash
npm run dev              # ← Iniciar servidor dev
npm run build            # Fazer build para produção
npm run preview          # Visualizar build
npm run clean:win        # Windows: limpar cache
npm run clean            # Linux/Mac: limpar cache
npm run fresh            # Limpeza completa + novo dev
npm run test             # Rodar testes (Vitest)
npm run test:watch       # Testes em modo watch
npm run test:e2e         # Testes end-to-end
npm run lint             # Verificar linting
npm run lint:fix         # Corrigir linting automático
npm run format           # Formatar código
npm run format:check     # Verificar formatação
```

---

## 🔗 Variáveis de Ambiente

```bash
# .env (copiar de .env.example e preencher)

# SUPABASE
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# STRIPE (teste)
VITE_STRIPE_PUBLIC_KEY=pk_test_abc123...

# OPCIONAL
VITE_API_URL=http://localhost:3001
VITE_APP_ENV=development
VITE_DEBUG=true
```

---

## ✅ Checklist: Setup Completo

- [ ] Node.js v18+ instalado (`node --version`)
- [ ] Git configurado (`git config user.name`)
- [ ] Repositório clonado (`git clone ...`)
- [ ] Branch develop em local (`git branch -a`)
- [ ] `.env` configurado com credenciais
- [ ] Dependências instaladas (`npm install`)
- [ ] Servidor dev rodando (`npm run dev`)
- [ ] Navegador abre em `http://localhost:3000`
- [ ] Consegue fazer login com conta teste
- [ ] Redirecionado para `/clinica` após login
- [ ] Sem erros no console (F12)
- [ ] RLS funcionando (dados filtrados por clínica)

---

## 🔗 Próximos Documentos

- 📌 [GIT_FLOW.md](🔄_GIT_FLOW_ESTRATEGIA.md) - Estratégia branches
- 🔢 [SEMANTIC_VERSIONING.md](🔢_SEMANTIC_VERSIONING.md) - Versionamento
- 🚀 [RELEASE_PRODUCTION.md](🚀_RELEASE_PRODUCAO.md) - Deploy produção
- ✅ [CHECKLIST_PRODUCAO.md](✅_CHECKLIST_PRODUCAO.md) - Antes de deployar
- 🔧 [COMANDOS_GIT_PRONTOS.md](🔧_COMANDOS_GIT_PRONTOS.md) - Copy/Paste
- ↩️ [ROLLBACK_GUIDE.md](↩️_ROLLBACK_GUIDE.md) - Recuperação
