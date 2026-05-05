# ✅ VERIFICAÇÃO RÁPIDA — auth.uid()

## 🎯 OBJETIVO

Garantir que `auth.uid()` funciona corretamente na auditoria.

---

## 🚀 PROCEDURE (5 MINUTOS)

### PASSO 1: SQL — Verificar auth.uid()

```sql
-- No Supabase SQL Editor
SELECT 
  auth.uid() as user_id,
  NOW() as timestamp;
```

**Resultado Esperado:**
```
user_id                               timestamp
a1b2c3d4-e5f6-7890-abcd-ef1234567890  2026-04-23 14:32:15.123456
```

**Se retornar NULL:**
❌ Você está executando como anon (não autenticado no banco)
→ Ir para Passo 2

---

### PASSO 2: Frontend — Verificar Sessão

Console (F12):

```javascript
// Teste rápido
const { data: { user } } = await supabase.auth.getUser();
console.log("Usuário ID:", user?.id);
console.log("Email:", user?.email);
```

**Resultado Esperado:**
```
Usuário ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Email: seu-email@clinic.com
```

**Se retornar null:**
❌ Usuário não está logado
→ Fazer logout/login novamente

```javascript
await supabase.auth.signOut();
// Depois fazer login
```

---

### PASSO 3: Criar Agendamento

1. Frontend: Agenda → Novo Agendamento
2. Preencher dados
3. Clicar "Salvar"
4. Verificar console: `📝 [CREATE] Como usuário: ...`

---

### PASSO 4: Verificar Auditoria

```sql
-- SQL Editor
SELECT 
  performed_by,
  performed_by_role,
  action_type,
  created_at
FROM appointment_audit_logs
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado Esperado:**
```
performed_by                          performed_by_role  action_type  created_at
a1b2c3d4-e5f6-7890-abcd-ef1234567890  admin              CREATED      2026-04-23
```

**Status:**
- ✅ `performed_by` é UUID válido (não 00000000...) → **SUCESSO**
- ❌ `performed_by` é 00000000-0000-0000-0000-000000000000 → **Voltar ao Passo 2**

---

## 🎯 CENÁRIOS DE RESPOSTA

### Cenário ✅ SUCESSO

```
✓ Passo 1 (SQL auth.uid()): retorna UUID
✓ Passo 2 (Frontend user): tem ID
✓ Passo 3 (Create): logs aparecem
✓ Passo 4 (Auditoria): performed_by é UUID
```

**Ação:** ✅ COMPLETO! Sistema está funcionando.

---

### Cenário ❌ FALHA NO PASSO 1

```
✗ SQL auth.uid(): NULL
```

**Causa:** Você está executando SQL como anon key (sem autenticação real)

**Solução:** 
- Supabase Dashboard é apenas para admin
- auth.uid() só funciona quando solicitação tem JWT válido
- Isso é esperado! Ignore este teste.

**Próximo:** Ir para Passo 2

---

### Cenário ❌ FALHA NO PASSO 2

```
✗ user?.id: null
```

**Causa:** Usuário não está logado no frontend

**Solução:**

```javascript
// 1. Logout
await supabase.auth.signOut();

// 2. Login
const { error } = await supabase.auth.signInWithPassword({
  email: "seu-email@clinic.com",
  password: "sua-senha"
});

if (!error) {
  console.log("✅ Login OK");
  // 3. Verificar novamente
  const { data: { user } } = await supabase.auth.getUser();
  console.log("Usuário:", user?.id);
}
```

**Próximo:** Voltar ao Passo 2

---

### Cenário ❌ FALHA NO PASSO 4

```
✓ Passo 2: User ID existe
✗ Passo 4: performed_by = 00000000-0000-0000-0000-000000000000
```

**Causa:** Token não está sendo enviado na request

**Verificar:** [🔧_TROUBLESHOOTING_AUTH_UID_NULL.md](🔧_TROUBLESHOOTING_AUTH_UID_NULL.md) Passo 5-6

**Quick Check:**

```javascript
// Verificar localStorage
const token = localStorage.getItem('gesclinic-auth-token');
console.log("Token existe?", !!token);

// Se não existir, fazer logout/login novamente
```

---

## 📋 CHECKLIST FINAL

- [ ] ✅ SQL auth.uid() funciona (esperado: NULL no dashboard é OK)
- [ ] ✅ Frontend user?.id tem valor
- [ ] ✅ Agendamento criado com sucesso
- [ ] ✅ Console mostra `📝 [CREATE] Como usuário:`
- [ ] ✅ Auditoria: performed_by é UUID válido
- [ ] ✅ Auditoria: action_type é CREATED/UPDATED/DELETED

---

## 🎯 RESULTADO ESPERADO

```
ANTES ❌                              DEPOIS ✅
performed_by = NULL                   performed_by = uuid-usuario
performed_by_role = 'anon'            performed_by_role = seu-role
action_type = NULL                    action_type = CREATED
context = NULL                        context = { dados completos }
```

---

## 🚀 SE TUDO OK

✅ Sistema está **100% pronto para produção**

Próximos passos:
1. Testar com dados reais
2. Deploy para produção
3. Documentar fluxo de auditoria

---

## 📞 PROBLEMA PERSISTENTE?

Se após todas as verificações ainda não funciona:

1. Verificar arquivo: `src/lib/customSupabaseClient.js`
   - Deve usar `createBrowserClient` (não `createClient`)
   
2. Verificar arquivo: `src/contexts/SupabaseAuthContext.jsx`
   - Deve exportar `user` e `userId`
   
3. Rever: [🔧_TROUBLESHOOTING_AUTH_UID_NULL.md](🔧_TROUBLESHOOTING_AUTH_UID_NULL.md)

4. Executar SQL: [⚡_TRIGGERS_AUDITORIA_AUTH_UID.sql](⚡_TRIGGERS_AUDITORIA_AUTH_UID.sql) (versão atualizada)

---

## ⏱️ TEMPO TOTAL

- Verificação: 5 minutos
- Se problema: Seguir troubleshooting (~15 min)

**Estimativa:** 20 minutos para resolver

