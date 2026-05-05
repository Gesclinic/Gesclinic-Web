# 🔧 DEBUG - "Cannot coerce the result to a single JSON object"

## 🎯 Problema

Ao editar agendamento, retorna erro:
```
Erro ao salvar: Cannot coerce the result to a single JSON object
```

**Causa raiz:** `.single()` retorna 0 linhas (RLS bloqueando ou clinic_id mismatch)

---

## 🔍 DIAGNÓSTICO - Passo a Passo

### PASSO 1: Abrir Console (F12)

1. Pressione: **F12**
2. Aba: **Console**
3. Procure por logs com: **✏️ [ATUALIZAR]**

**Exemplo esperado:**
```javascript
✏️ [ATUALIZAR] Payload: {
  agendamentoId: "uuid-1234...",
  clinicId: "uuid-5678...",
  formDataClinicId: "uuid-5678...",  // Deve ser igual
  finalClinicId: "uuid-5678..."       // Deve ser igual
}
```

### PASSO 2: Verificar clinic_id

**Se vir:**
```
clinicId: undefined
```

❌ **PROBLEMA:** clinic_id não está no contexto!

**Se vir:**
```
clinicId: "uuid..."
formDataClinicId: "uuid-DIFERENTE..."
```

❌ **PROBLEMA:** formData está com clinic_id errado (de outro agendamento)

**Se vir:**
```
clinicId: "uuid..."
formDataClinicId: "uuid..."
finalClinicId: "uuid..."
```

✅ **OK:** clinic_id está correto

---

### PASSO 3: Ver erro técnico

Se clinic_id está OK mas ainda erra, procure por:

```javascript
❌ [UPDATE] Erro: Cannot coerce...
```

**Com contexto:**
```javascript
{
  tags: {
    action: "update_appointment_error",
    clinic_id: "uuid-...",
    appointment_id: "uuid-..."
  }
}
```

### PASSO 4: Verificar em Supabase

1. Abra: **Supabase Dashboard**
2. **SQL Editor**
3. Cole:

```sql
SELECT id, clinic_id, status, updated_at
FROM appointments
WHERE id = 'SEU-APPOINTMENT-ID'  -- Cole o ID do erro
LIMIT 1;
```

**Resultado esperado:** 1 linha

**Se retorna 0 linhas:** ❌ Agendamento não existe OU not belong to your clinic (RLS)

---

## 🚨 Soluções Rápidas

### Solução 1: Fazer logout/login

Às vezes clinicId do contexto fica stale:

```
1. Menu → Logout
2. Faça login novamente
3. Tente editar novamente
```

### Solução 2: Refresh página

```
F5 ou Ctrl+R
```

### Solução 3: Limpar cache

```
Ctrl+Shift+Delete (abre Clear Browsing Data)
Limpe: Cookies, Cache, Stored Data
```

---

## 🐛 Coleta de Informação para Debug

Se o problema persiste, coleta essa info:

### 1. Screenshot do Console
Pressione F12, vá em **Console**, copie os logs com:
- `✏️ [ATUALIZAR]`
- `❌ [UPDATE]`

### 2. ID do Agendamento
Copie o `agendamentoId` do erro

### 3. Query Supabase
Cole no SQL Editor:
```sql
SELECT 
  id, 
  clinic_id, 
  scheduled_date, 
  scheduled_time,
  updated_at
FROM appointments
WHERE id = 'APPOINTMENT-ID-AQUI'
LIMIT 1;
```

Copie o resultado inteiro

### 4. Seu clinic_id
No Console:
```javascript
// Cole isso e execute:
console.log("Seu clinic_id:", localStorage.getItem("clinic_id"))
```

---

## ✨ Melhorias Aplicadas (Versão Atual)

Adicionamos **validações defensivas** em 3 pontos:

1. **Hook (useAgendamentoMutation.js)**
   - ✅ Log de clinicId do contexto vs formData
   - ✅ SEMPRE sobrescreve com contexto (não confia no form)

2. **API (agenda.api.mutations.js)**
   - ✅ Valida se clinic_id existe ANTES de fazer query
   - ✅ Duplo-check APÓS mapear

3. **Mapper (mappers.js)**
   - ✅ Lança erro se clinic_id undefined
   - ✅ Impede passar para query silenciosamente

---

## 🎯 Se Ainda Houver Erro

**O log agora dirá EXATAMENTE onde o problema está:**

❌ **Se a mensagem for:**
```
🔴 [MAPPER] clinic_id undefined após mapeamento
```
→ Problema no hook (clinicId não está sendo passado)

❌ **Se a mensagem for:**
```
❌ [UPDATE] ERRO CRÍTICO: clinic_id perdido durante mapeamento
```
→ Problema no mapeamento

❌ **Se a mensagem for:**
```
❌ [UPDATE] ERRO CRÍTICO: clinic_id ausente no payload
```
→ Payload vindo do hook sem clinic_id

---

## 🔧 Script de Teste Rápido

Cole no Console do Browser:

```javascript
// 1. Ver seu clinic_id
console.log("Clinic ID no localStorage:", localStorage.getItem("clinic_id"));

// 2. Ver seus agendamentos
fetch('http://localhost:3000/api/appointments')
  .then(r => r.json())
  .then(data => console.log("Appointments:", data))
  .catch(e => console.error("Erro:", e.message));

// 3. Ver se auth funciona
console.log("Auth context:", window.__AUTH_CONTEXT__ || "não disponível");
```

---

## 📞 Resumo

| Sintoma | Causa | Solução |
|---|---|---|
| clinic_id undefined | Contexto vazio | Logout/Login |
| clinic_id errado | Form stale | Refresh página |
| clinic_id OK mas erro "Cannot coerce" | RLS ou agendamento não existe | Verificar em Supabase |

Se problema persiste após essas verificações, os logs agora têm info suficiente para debug deeper.
