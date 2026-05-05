# 🔧 TROUBLESHOOTING — auth.uid() = NULL

## 🎯 PROBLEMA

Logs estão gravando:
```
performed_by = 00000000-0000-0000-0000-000000000000 (UUID nulo)
performed_by_role = 'authenticated' (genérico)
```

## 🧠 CAUSA RAIZ

`auth.uid()` retorna NULL quando **uma** dessas condições é verdadeira:

| Condição | Sintoma | Solução |
|----------|---------|---------|
| Usuário não logado | anon_key | Fazer login real |
| Token não enviado | NULL token | Verificar persistência |
| Token expirado | Aceita anon | Refresh token |
| RLS policy bloqueando | Erro 403 | Ajustar policy |

---

## ✅ PASSO 1 — VERIFICAR NO SUPABASE (SQL)

Execute no SQL Editor:

```sql
-- Teste 1: auth.uid() direto
SELECT auth.uid() as current_user_id, NOW() as current_time;
-- Resultado esperado: uuid-do-usuario (não NULL)

-- Teste 2: Usuário autenticado?
SELECT id, email FROM auth.users WHERE id = auth.uid();
-- Resultado esperado: Linha com seu email

-- Teste 3: Logs recentes
SELECT 
  id,
  appointment_id,
  performed_by,
  performed_by_role,
  action_type,
  created_at
FROM appointment_audit_logs
ORDER BY created_at DESC
LIMIT 5;
-- Verificar: performed_by é 00000000-0000-0000-0000-000000000000?
```

---

## ✅ PASSO 2 — VERIFICAR NO FRONTEND (Console)

Abra DevTools (F12) e execute:

```javascript
// Teste 1: Verificar se usuário está logado
const { data: { user } } = await supabase.auth.getUser();
console.log("Usuário logado:", user);
// Resultado esperado: { id: 'uuid-...', email: '...' }

// Teste 2: Verificar sessão
const { data: { session } } = await supabase.auth.getSession();
console.log("Sessão:", session);
// Resultado esperado: { access_token: 'eyJ...', user: {...} }

// Teste 3: Verificar localStorage
const token = localStorage.getItem('gesclinic-auth-token');
console.log("Token em localStorage:", !!token);
// Resultado esperado: true

// Teste 4: Verificar token JWT
if (session?.access_token) {
  const decoded = JSON.parse(atob(session.access_token.split('.')[1]));
  console.log("JWT decoded:", decoded);
  // Procurar por: "sub": "uuid-do-usuario"
}
```

---

## ✅ PASSO 3 — CHECKLIST DE AUTENTICAÇÃO

### ❌ CENÁRIO 1: Usuário NÃO está logado

```
✗ user = null
✗ session = null
✗ localStorage vazio
```

**Solução:**
1. Fazer logout: `await supabase.auth.signOut()`
2. Fazer login de novo: `await supabase.auth.signInWithPassword({ email, password })`
3. Verificar que aparece no console: `👤 [AUTH] Usuário logado: {...}`

---

### ❌ CENÁRIO 2: Sessão existe mas token não é enviado

```
✓ user ≠ null
✓ session ≠ null
✗ Headers: Authorization ausente
```

**Solução:**
Verificar no `customSupabaseClient.js`:

```javascript
// ✅ CORRETO
const supabase = createBrowserClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,      // ✅ CRÍTICO
      autoRefreshToken: true,    // ✅ CRÍTICO
      detectSessionInUrl: true,
      storageKey: "gesclinic-auth-token",
      flowType: "pkce"
    }
  }
);

// ❌ ERRADO (descontinuado)
// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

Se estiver errado, corrigir agora!

---

### ❌ CENÁRIO 3: Token está sendo enviado mas auth.uid() ainda NULL

```
✓ Authorization header presente
✓ JWT válido
✗ Supabase ainda retorna NULL
```

**Possível Causa:** Você estaria usando a **anon key** com **permissões limitadas**

**Solução:**
1. Supabase Dashboard → Settings → API Keys
2. Verificar que está usando **anon key** (não service role key)
3. RLS policies precisam permitir o usuário:

```sql
-- Verificar: Qual role tem?
SELECT role FROM users WHERE id = auth.uid();

-- Garantir policy permite:
CREATE POLICY "authenticated_users"
  ON appointments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
```

---

## ✅ PASSO 4 — VERIFICAR CONFIGURAÇÃO COMPLETA

### Frontend: `src/lib/customSupabaseClient.js`

```javascript
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,           // ✅ Salvar sessão
      autoRefreshToken: true,         // ✅ Renovar token automático
      detectSessionInUrl: true,       // ✅ Recuperar de URL
      storageKey: "gesclinic-auth-token",
      flowType: "pkce"                // ✅ Security best practice
    }
  }
);

export const supabase = supabase;
```

**Status:** ✅ PRONTO

---

### Frontend: Hook `useAgendamentoMutation.js`

```javascript
const { user } = useAuth(); // ✅ Obter usuário logado

const createMutation = useMutation({
  mutationFn: async (form) => {
    // ✅ VERIFICAR: Usuário está autenticado
    if (!user?.id) {
      console.error("❌ Usuário não autenticado!");
      throw new Error("Usuário não autenticado");
    }
    
    console.log("📝 [CREATE] Como usuário:", user.id);
    return criarAgendamento(form);
  }
});
```

**Status:** ✅ PRONTO

---

### Backend: `appointment_audit_logs` Triggers

```sql
-- Trigger INSERT com debug
RAISE NOTICE '[INSERT] auth.uid() = %, role = %', current_user_id, user_role;

-- Trigger UPDATE com debug
RAISE NOTICE '[UPDATE] auth.uid() = %, role = %', current_user_id, user_role;

-- Trigger DELETE com debug
RAISE NOTICE '[DELETE] auth.uid() = %, role = %', current_user_id, user_role;
```

**Status:** ✅ IMPLEMENTADO

---

## ✅ PASSO 5 — TESTE END-TO-END

### 1️⃣ Prepare

```bash
# Terminal 1: Limpar e reconstruir
npm run build
# Esperado: 0 erros, 4,944 módulos
```

### 2️⃣ Login

```javascript
// Console (F12)
const { error } = await supabase.auth.signInWithPassword({
  email: "seu-email@clinic.com",
  password: "sua-senha"
});

if (!error) {
  console.log("✅ Login OK");
  const { data: { user } } = await supabase.auth.getUser();
  console.log("Usuário:", user.id);
}
```

### 3️⃣ Criar Agendamento

```
Frontend: Ir para Agenda → Novo Agendamento
Preencher: Paciente, Data, Hora, etc
Salvar

Verificar console:
✅ "📝 [CREATE] Como usuário: uuid-1234"
```

### 4️⃣ Verificar Logs

```sql
-- SQL Editor (Supabase)
SELECT 
  performed_by,
  performed_by_role,
  action_type,
  created_at
FROM appointment_audit_logs
ORDER BY created_at DESC
LIMIT 1;

-- Esperado:
-- performed_by: uuid-1234 (NÃO 00000000...)
-- performed_by_role: admin (NÃO 'authenticated')
```

---

## ✅ PASSO 6 — VALIDAR RESULTADO

### ✅ SUCESSO

```
performed_by      = uuid-do-usuario (ex: a1b2c3d4-...)
performed_by_role = seu-role (ex: admin)
action_type       = CREATED/UPDATED/DELETED
context           = { full appointment data }
```

### ❌ FALHA: performed_by ainda é 00000000...

Verificar em ordem:

1. **Usuário está logado?**
   ```javascript
   const { data: { user } } = await supabase.auth.getUser();
   console.log(user); // Deve ter ID
   ```

2. **Token em localStorage?**
   ```javascript
   console.log(localStorage.getItem('gesclinic-auth-token')); // Deve ter valor
   ```

3. **customSupabaseClient.js usa createBrowserClient?**
   ```javascript
   // Procurar por: createBrowserClient (não createClient)
   ```

4. **useAuth hook exporta user?.id?**
   ```javascript
   const { user } = useAuth();
   console.log(user?.id); // Deve ter ID
   ```

5. **Mutation valida usuário?**
   ```javascript
   if (!user?.id) throw new Error("Não autenticado");
   ```

---

## 🎯 DIAGNÓSTICO RÁPIDO

Copie e cole no Console (F12):

```javascript
async function checkAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: { session } } = await supabase.auth.getSession();
  const token = localStorage.getItem('gesclinic-auth-token');
  
  console.log("=== AUTH DIAGNOSIS ===");
  console.log("User logado:", !!user, user?.id);
  console.log("Session ativa:", !!session, session?.access_token ? "✓" : "✗");
  console.log("Token em localStorage:", !!token);
  
  if (session?.access_token) {
    try {
      const decoded = JSON.parse(atob(session.access_token.split('.')[1]));
      console.log("JWT sub (user_id):", decoded.sub);
      console.log("JWT role:", decoded.role);
    } catch (e) {
      console.log("Erro ao decodificar JWT:", e.message);
    }
  }
}

checkAuth();
```

---

## 📊 FLUXO CORRETO

```
Frontend: signInWithPassword()
  ↓
Supabase retorna: { user, access_token, refresh_token }
  ↓
localStorage salva: access_token
  ↓
Próxima request: Headers incluem Authorization
  ↓
Backend extrai: auth.uid() = user_id
  ↓
Trigger preenche: performed_by = user_id ✅
```

---

## 🚀 PRÓXIMAS AÇÕES

1. **Executar SQL:** [⚡_TRIGGERS_AUDITORIA_AUTH_UID.sql](⚡_TRIGGERS_AUDITORIA_AUTH_UID.sql) (versão corrigida)
2. **Seguir:** Passo 1-6 deste guia
3. **Reportar:** Qual passo falha?

---

## 📞 DÚVIDAS COMUNS

**P: Por que aparece 00000000-0000-0000-0000-000000000000?**
R: É um UUID nulo que coloquei como fallback para não quebrar a auditoria. Significa que `auth.uid()` retornou NULL.

**P: Como diferenciar de um usuário real deletado?**
R: UUIDs reais do Supabase começam com hex válido (a-f, 0-9), não 00000000.

**P: E se o usuário estiver logado mas ainda aparecer NULL?**
R: Pode ser RLS policy bloqueando. Verificar: `SELECT * FROM pg_policies;`

---

## ✅ STATUS

- ✅ Frontend configurado
- ✅ Triggers implementados com debug
- ⏳ Você: Executar SQL + testar
- ⏳ Você: Verificar console (F12) durante teste

Qualquer dúvida, rodar os testes acima! 🔧

