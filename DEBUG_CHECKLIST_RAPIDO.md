# 🔧 CHECKLIST DE DEBUG - Verificação Rápida (5 min)

**Objetivo:** Confirmar se o problema é variáveis de ambiente ou algo mais profundo.

---

## 🎯 PASSO 1: Abrir Dev Tools (1 min)

```
1. Ir para: https://develop.gesclinic.vercel.app
2. Pressionar: F12 (ou Ctrl+Shift+I, ou cmd+Option+I)
3. Clicar em: "Console" (abas no topo do Dev Tools)
4. Você deve ver uma lista de mensagens
```

---

## 📊 PASSO 2: Procurar por Mensagens Supabase (1 min)

Procure na console por linhas que começam com:
- `[DEBUG Supabase]`
- `✅` ou `❌`
- `Supabase`
- `VITE_`

---

## ✅ CENÁRIO 1: Variáveis CARREGADAS (Significa: Env Vars OK)

```
Console mostra:
[DEBUG Supabase] URL: https://gvdkdjyupktlflwurike.supabase.co
[DEBUG Supabase] ANON KEY: eyJhbGc...
✅ Supabase Client criado com sucesso
✅ Teste de conexão passou

Status: ✅ Variáveis estão sendo injetadas corretamente!

Próximo passo:
  → Problema é no Supabase (RLS, CORS, domain validation)
  → Escalacionar para Supabase Support
  → Investigar se Staging domain é bloqueado por política
```

---

## ❌ CENÁRIO 2: Variáveis UNDEFINED (Significa: Env Vars Problema)

```
Console mostra:
[DEBUG Supabase] URL: undefined
[DEBUG Supabase] ANON KEY: undefined
❌ ERRO CRÍTICO: Credenciais do Supabase não configuradas!

Status: ❌ Variáveis NÃO estão sendo injetadas

Próximo passo:
  → Implementar OPÇÃO 2: Usar vercel.json
  → OU OPÇÃO 3: Supabase separado para staging
  → OU OPÇÃO 4: Investigar Vercel CLI behavior
```

---

## 📝 PASSO 3: Documentar (1 min)

Copie a mensagem exata do console que você vê e compartilhe:

```
[Aqui colar a mensagem do console do seu F12]

Exemplo esperado:
  [DEBUG Supabase] URL: https://gvdkdjyupktlflwurike.supabase.co
  [DEBUG Supabase] ANON KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  🔍 [Supabase Client] Variáveis de Ambiente Carregadas:
  VITE_SUPABASE_URL: ✓ Carregado
  VITE_SUPABASE_ANON_KEY: ✓ Carregado
  🚀 Criando nova instância do Supabase Client...
  ✅ Supabase Client criado com sucesso!
```

---

## 🎯 PASSO 4: Tirar Screenshot (opcional)

1. Pressionar: Ctrl+Shift+S (ou print screen)
2. Ou Print Screen > Ctrl+V em um editor
3. Salvar imagem

---

## ⏱️ Tempo Total: ~5 minutos

Depois desse debug, você saberá:
- ✅ Se é problema de variáveis (então implementar vercel.json)
- ❌ Se é problema do Supabase (então contatar support)

---

## 🚀 EXECUTE AGORA

```bash
# 1. Abra este link no navegador:
https://develop.gesclinic.vercel.app

# 2. Pressione F12

# 3. Procure no Console por [DEBUG Supabase]

# 4. Compartilhe o resultado comigo
```

---

## 📞 Pré-requisitos para Debug

- ✅ Internet conectada
- ✅ Browser (Chrome, Firefox, Safari)
- ✅ Dev Tools suportadas (todos os browsers modernos têm)
- ⏰ 5 minutos

---

**Vamos descobrir o que está acontecendo! 🔍**
