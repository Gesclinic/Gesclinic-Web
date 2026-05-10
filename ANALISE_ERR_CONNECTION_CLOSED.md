# 🚨 ANÁLISE DEFINITIVA: Por Que Staging Falha com ERR_CONNECTION_CLOSED

**Data:** 10 de Maio de 2026 - Análise pós-implementação  
**Erro Observado:** ERR_CONNECTION_CLOSED ao nível TCP (não erro de aplicação)

---

## 🔴 O NOVO DESCOBRIMENTO

### O Erro Real
```
❌ ERR_CONNECTION_CLOSED
└─ Nível: TCP/Network (não aplicação)
└─ Significado: Conexão recusada pelo servidor
└─ Impacto: JavaScript nem executa, página não carrega
```

### O Que Isso Significa
```
ANTES (nossa hipótese):
  → Problema = Variáveis de ambiente undefined
  → Solução = Injetar variáveis
  → Status = Implementado ✅

AGORA (realidade):
  → Problema = Servidor não aceita conexão TCP
  → Causa = ???
  → Solução = Diferente do que esperávamos
```

---

## 🎯 CAUSAS POSSÍVEIS (Nível TCP)

### 1. Vercel Preview Project Não Está Criado
**Descrição:** Quando você faz `npx vercel` (sem --prod), Vercel talvez crie um projeto "Preview" separado.

**Evidência:**
- Url `develop.gesclinic.vercel.app` pode estar apontando para um projeto que não existe
- Ou para um projeto que não está respondendo

**Como verificar:**
```
1. Vercel Dashboard > Projects
2. Procurar por "gesclinic-web" vs "gesclinic-web-staging" ou similares
3. Verificar se há dois projetos
4. Verificar status de cada um
```

---

### 2. Vercel Project Misconfiguration
**Descrição:** O projeto pode estar com configuração quebrada para preview domain.

**Evidência:**
- Build sucede (vimos no GitHub Actions)
- Deploy sucede (vimos no GitHub Actions)
- Mas preview não responde

**Como verificar:**
```
1. Vercel > Project Settings
2. Domains
3. Verificar se develop.gesclinic.vercel.app está listado
4. Verificar status (active, failed, pending)
```

---

### 3. Supabase RLS Bloqueando Conexão
**Descrição:** Supabase pode estar bloqueando todas as conexões da URL preview.

**Evidência:**
- Production funciona (mesmo Supabase, diferentes credenciais? Não, mesmas)
- Staging não funciona
- Erro é no nível de conexão TCP

**Improvável porquê:**
- RLS é aplicação level, não network level
- ERR_CONNECTION_CLOSED é network level

---

### 4. DNS Pointing Para Endereço Inválido
**Descrição:** `develop.gesclinic.vercel.app` pode estar apontando para IP inválido.

**Evidência:**
- Possível se configuração do Vercel está errada

**Como verificar:**
```bash
# No terminal:
nslookup develop.gesclinic.vercel.app
# Deve retornar IP válido
```

---

### 5. Vercel Account/Project Limits
**Descrição:** Limite de preview deployments ou requisições pode estar atingido.

**Evidência:**
- Possível se plano gratuito tem limite

---

## 🔍 INVESTIGAÇÃO NECESSÁRIA

### Investigação 1: Verificar Vercel Projects
```
1. Abrir: https://vercel.com/dashboard/projects
2. Procurar por todos os projetos nomeados "gesclinic*"
3. Verificar se há mais de um
4. Verificar se "staging" project existe e está online
5. Verificar status de domínios
```

**Tempo:** 5 min

---

### Investigação 2: Verificar DNS
```bash
# No seu computador/terminal:
nslookup develop.gesclinic.vercel.app

# Resultado esperado:
# Non-authoritative answer:
# Name:   develop.gesclinic.vercel.app
# Address: 76.76.19.x (IP da Vercel)

# Resultado ruim:
# server can't find develop.gesclinic.vercel.app
```

**Tempo:** 2 min

---

### Investigação 3: Verificar Vercel.json
```
Arquivo: vercel.json
Procurar por:
  - Routes que pode estar bloqueando staging
  - Headers que pode estar recusando conexões
  - Redirects que pode estar causando loop
```

**Tempo:** 5 min

---

## 🚨 HIPÓTESE MAIS PROVÁVEL

Baseado em:
- Build sucede ✅
- Deploy sucede ✅
- Mas conexão é recusada ❌

**Hipótese:** Vercel não criou ou não está respondendo para o domínio `develop.gesclinic.vercel.app` corretamente.

**Solução:** 
1. Verificar se projeto/domínio existe no Vercel
2. Reconectar o projeto Git ao Vercel
3. Ou recriar o projeto from scratch

---

## 🔧 PLANO DE AÇÃO RECOMENDADO

### PASSO 1: Verificação Rápida (5 min)
```
1. Abrir: https://vercel.com/gesclinic-2403s-projects/gesclinic-web/domains
2. Verificar se "develop.gesclinic.vercel.app" está listado
3. Verificar status (active, pending, failed)
4. Se não está listado: criar manualmente
5. Se está failed: redeploy
```

---

### PASSO 2: Verificação DNS (2 min)
```bash
# Abrir terminal/PowerShell e executar:
nslookup develop.gesclinic.vercel.app

# Interpretação:
# ✅ Se retornar IP 76.76.19.x = DNS está OK
# ❌ Se retornar "can't find" = DNS problema
# ⚠️ Se retornar IP estranho = Possível alias errado
```

---

### PASSO 3: Força Reconexão Vercel (10 min)
```
Se DNS e domínios estão OK mas ainda não funciona:

1. GitHub > Disconnect Vercel integration
2. Vercel > Remove GitHub project
3. Vercel > Create new project from GitHub
4. Selecionar branch "develop"
5. Configurar build settings
6. Deploy

Benefício: Força recriação completa da conexão
```

---

## 💡 INSIGHT

```
O erro ERR_CONNECTION_CLOSED em nível TCP significa:
- Não é um erro de aplicação (variáveis, código, etc)
- É um erro de INFRAESTRUTURA (Vercel, DNS, firewall)
- A solução pode ser mais simples que esperávamos:
  ✓ Recriar domínio
  ✓ Reconectar projeto
  ✓ Forçar redeploy
```

---

## 📊 Próximos Passos

| Passo | Ação | Tempo | Resultado |
|-------|------|-------|-----------|
| 1 | Verificar Vercel domains | 5 min | Saber se domínio está listado |
| 2 | Verificar DNS | 2 min | Saber se DNS resolveu |
| 3 | Força redeploy | 3 min | Tentar reconectar |
| 4 | Se ainda falhar: Reconectar projeto | 15 min | Reset completo |

---

## 🎯 RECOMENDAÇÃO FINAL

**Próxima ação:** Execute PASSO 1 (Verificação Rápida no Vercel Dashboard)

Isso vai esclarecer se é um problema simples de configuração ou algo mais profundo.

---

**Status:** 🔴 **Escalação Necessária** - Problema não é variáveis de ambiente, é infraestrutura Vercel
