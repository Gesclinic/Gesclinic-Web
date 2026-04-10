# 🔥 DEPLOY RECOMENDADO: Vercel

## ⚡ A forma mais fácil (2 minutos)

Você tem 3 opções:

---

### 🏆 OPÇÃO RECOMENDADA: Vercel + Git

**Por que Vercel?**
- Deploy automático a cada push
- Preview URLs para staging
- Rollback em 1 clique
- Free tier generoso
- Integração perfeita com Vite

**Passo a passo:**

1. **Criar repo GitHub**
   ```bash
   cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"
   git init
   git add .
   git commit -m "Phase 1: Auto AR + Guide + Fix Cascade Delete + DRE + Scheduler"
   ```

2. **Conectar GitHub**
   - Ir a github.com
   - Criar novo repo "gesclinic-web"
   - Seguir instruções para push

3. **Deploy no Vercel**
   - Ir a vercel.com
   - Clicar "New Project"
   - Selecionar repo GitHub
   - Vercel detecta automaticamente Vite
   - Clicar "Deploy"
   - **Pronto!** Seu site está online em 30 segundos

---

### 💨 OPÇÃO B: Direct Upload (sem Git)

Se não quer usar Git agora:

```bash
# 1. Build localmente
npm run build

# 2. Instalar Vercel CLI
npm install -g vercel

# 3. Deploy do folder dist/
vercel deploy dist --prod

# 3. Seguir instruções e... pronto!
```

---

### 🌐 OPÇÃO C: Netlify (mais fácil que Vercel)

Se quer ainda mais simples:

```bash
# 1. Build
npm run build

# 2. Instalar Netlify CLI
npm install -g netlify-cli

# 3. Deploy (vai abrir browser automaticamente)
netlify deploy --prod --dir=dist
```

---

## ❓ Qual escolher?

| Critério | Vercel | Netlify | Manual |
|----------|--------|---------|--------|
| Facilidade | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |
| Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Depende |
| Suporte | Excelente | Bom | Nenhum |
| Custo | Free | Free | Seu servidor |
| Auto-deploy | Sim | Sim | Não |

**Minha recomendação: Vercel com GitHub** 👍

---

## 🚀 QUICK START: Vercel em 5 minutos

```bash
# Step 1: Init Git (se não tiver)
cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"
git init
git add .
git commit -m "Phase 1 deployment"

# Step 2: Push para GitHub (criar repo primeiro)
git remote add origin https://github.com/SEU_USER/gesclinic-web.git
git branch -M main
git push -u origin main

# Step 3: Em vercel.com
# - Novo projeto
# - Selecionar repo
# - DEPLOY!

# Resultado: seu site está online!
```

---

## 📍 Variáveis de Ambiente no Vercel

Após deploy, configurar no Vercel Dashboard:

```
Env Variables:
  VITE_SUPABASE_URL = https://seu-projeto.supabase.co
  VITE_SUPABASE_ANON_KEY = eyJhbGc...
```

---

## ✅ Próximas ações:

1. **Escolher método** (recomendo Vercel)
2. **Executar deploy** (execute comandos acima)
3. **Rodar 5 testes** no arquivo `🚀_DEPLOYMENT_CHECKLIST_FASE1.md`
4. **Me avisar resultado** ✓

---

**Qual opção você quer?** Avisa aí que eu ajudo com os comandos específicos! 🎯
