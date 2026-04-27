# ✅ Verificação: Supabase auth.uid() + Auditoria + Sessão

## 🎯 Objetivo

Validar que:
- ✅ Usuário autenticado é enviado nas requisições
- ✅ `auth.uid()` funciona no banco de dados (triggers/RLS)
- ✅ `performed_by` é preenchido automaticamente
- ✅ Sessão persiste entre reloads

---

## 🔧 PASSOS DE VERIFICAÇÃO

### PASSO 1: Verificar Instalação
```bash
npm list @supabase/ssr
```
✅ Deve mostrar: `@supabase/ssr@*` instalado

---

### PASSO 2: Verificar Cliente Supabase

Abrir DevTools Console (F12) e executar:

```javascript
// Verificar se createBrowserClient está sendo usado
const { supabase } = await import('@/lib/customSupabaseClient');
console.log("🔍 Supabase client:", supabase);

// Verificar se sessão existe
const { data: { session } } = await supabase.auth.getSession();
console.log("📋 Sessão atual:", session);

// Verificar usuário
const { data: { user } } = await supabase.auth.getUser();
console.log("👤 Usuário atual:", user);
```

✅ **Esperado:**
- `supabase` object com métodos
- `session` com `user.id` e `access_token`
- `user` com `id` e `email`

---

### PASSO 3: Fazer Login Real

1. Fazer LOGOUT:
   - Clique em "Logout" ou
   - Execute: `await supabase.auth.signOut()`

2. Fazer LOGIN:
   - Acesse http://localhost:3000/login
   - Digite credenciais reais
   - Clique em "Entrar"

3. Verificar localStorage:
```javascript
console.log({
  "gesclinic-auth-token": localStorage.getItem("gesclinic-auth-token"),
  "sb-auth-token": localStorage.getItem("sb-gvdkdjyupktlflwurike-auth-token")
});
```

✅ **Esperado:** Ambos tokens presentes

---

### PASSO 4: Verificar Debug Logs

Abrir DevTools Console (F12) e procurar por:

```
👤 [AUTH] Usuário logado: {
  id: "uuid-do-usuario",
  email: "usuario@email.com",
  clinicId: "uuid-da-clinica",
  currentRole: "admin"
}
```

✅ Se aparecer, significa que o usuário está sendo detectado corretamente

---

### PASSO 5: Fazer Operação (Criar/Editar Agendamento)

1. Ir para: http://localhost:3000/clinica/agenda
2. Clicar em "Novo Agendamento" ou editar um existente
3. Preencher formulário
4. Clicar em "Salvar"

5. Verificar logs no console:
```
📝 [CRIAR] Criando agendamento como usuário: {
  userId: "uuid-do-usuario",
  userEmail: "usuario@email.com",
  clinicId: "uuid-da-clinica"
}
```

✅ Se aparecer, significa que o usuário é enviado corretamente

---

### PASSO 6: Verificar Auditoria no Banco

Abrir SQL Editor no Supabase Dashboard e executar:

```sql
-- Verificar se appointment_audit_logs foi preenchido
SELECT 
  id,
  appointment_id,
  performed_by,
  performed_by_role,
  action,
  changes,
  created_at
FROM appointment_audit_logs
ORDER BY created_at DESC
LIMIT 5;
```

✅ **Esperado:**
```json
{
  "id": "uuid",
  "appointment_id": "uuid",
  "performed_by": "uuid-do-usuario", // ✅ NÃO DEVE SER NULL
  "performed_by_role": "admin",
  "action": "create",
  "created_at": "2026-04-23T10:30:00Z"
}
```

---

### PASSO 7: Verificar RLS + auth.uid()

Executar no SQL Editor:

```sql
-- Verificar se auth.uid() retorna algo
SELECT auth.uid() as current_user_id;
```

✅ **Esperado:** Um UUID (não NULL, não vazio)

---

### PASSO 8: Verificar Trigger de Auditoria

Executar no SQL Editor:

```sql
-- Listar todos os triggers na tabela appointments
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
ORDER BY trigger_name;
```

✅ **Esperado:** 
- `appointment_audit_insert_trigger`
- `appointment_audit_update_trigger`
- `appointment_audit_delete_trigger`

---

## 🚀 Teste Completo (E2E)

### Antes do Teste:

```javascript
// Limpar localStorage
localStorage.clear();
// Deslogar
await supabase.auth.signOut();
// Reload page
window.location.reload();
```

### Durante o Teste:

1. Login real com credenciais
2. Navegar para Agenda
3. Criar novo agendamento
4. Salvar
5. Editar agendamento
6. Salvar alterações
7. Deletar agendamento

### Depois do Teste:

Executar no SQL Editor:

```sql
SELECT 
  COUNT(*) as total_operations,
  COUNT(CASE WHEN performed_by IS NOT NULL THEN 1 END) as com_usuario,
  COUNT(CASE WHEN performed_by IS NULL THEN 1 END) as sem_usuario
FROM appointment_audit_logs
WHERE created_at > NOW() - INTERVAL '10 minutes';
```

✅ **Esperado:** `com_usuario > 0` e `sem_usuario = 0`

---

## 🔴 Se Não Funcionar

### ❌ Problema: performed_by = NULL

**Possível Causa 1:** Usuário não autenticado
```javascript
// No console:
const { data: { user } } = await supabase.auth.getUser();
console.log("Usuário:", user);
// Se user = null, fazer login novamente
```

**Possível Causa 2:** Sessão expirada
```javascript
// Forçar refresh do token:
const { data, error } = await supabase.auth.refreshSession();
console.log("Sessão refreshed:", { data, error });
```

**Possível Causa 3:** RLS policy está bloqueando
```sql
-- Verificar RLS policies
SELECT * FROM pg_policies WHERE tablename = 'appointments';
```

---

### ❌ Problema: auth.uid() retorna NULL

**Solução:** Verificar se a sessão foi enviada:
```sql
-- Ver header de autenticação enviado
-- Não há SQL para isto, mas verificar:
-- 1. Token no localStorage existe?
-- 2. Token não está expirado?
-- 3. RLS está habilitado?
```

---

### ❌ Problema: Sessão não persiste após reload

**Possível Causa:** localStorage desabilitado ou bloqueado
```javascript
// Verificar:
console.log("localStorage disponível:", typeof localStorage !== "undefined");
console.log("localStorage habilitado:", (() => {
  try {
    localStorage.setItem("test", "1");
    localStorage.removeItem("test");
    return true;
  } catch {
    return false;
  }
})());
```

---

## ✅ Checklist Final

- [ ] Cliente Supabase usa `createBrowserClient`
- [ ] Sessão persiste em localStorage
- [ ] Login funciona
- [ ] Usuário aparece nos logs
- [ ] `auth.uid()` retorna valor no banco
- [ ] `performed_by` é preenchido na auditoria
- [ ] Triggers funcionam corretamente
- [ ] RLS policies permitem acesso

---

## 🎯 Resultado Esperado

```bash
✅ Supabase configurado corretamente
✅ auth.uid() funcionando
✅ Auditoria completa
✅ Usuário identificado em todas operações
✅ Pronto para produção
```

---

## 📞 Suporte

Se alguma etapa falhar, verificar:
1. Arquivo `.env` com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
2. Credentials estão corretas no Supabase Dashboard
3. RLS habilitado nas tabelas
4. Triggers criados no banco
5. Sessão não expirada

