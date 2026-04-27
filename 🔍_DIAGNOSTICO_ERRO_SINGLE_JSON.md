# 🔍 DIAGNÓSTICO — Erro "Cannot coerce the result to a single JSON object"

## 🎯 PROBLEMA

Ao editar agendamento, aparece:
```
"Erro ao salvar: Cannot coerce the result to a single JSON object"
```

## 🧠 CAUSA RAIZ

`.single()` espera **exatamente 1 linha**, mas recebe:
- ❌ 0 linhas → UPDATE não encontrou agendamento
- ❌ Múltiplas linhas → Problema em WHERE clause
- ❌ RLS policy bloqueando

---

## ✅ DIAGNÓSTICO RÁPIDO (Console F12)

### Teste 1: Verificar qual agendamento está tentando editar

```javascript
// Abra DevTools (F12)
// Vá para a aba "Network"
// Faça a edição
// Procure pelo request "appointments" com método PATCH
// Verifique o body (payload)
```

**Procure por:**
```json
{
  "id": "uuid-1234-...",
  "clinic_id": "uuid-clinic-...",
  "patient_id": "uuid-patient-...",
  ...
}
```

---

### Teste 2: Verificar RLS policies

```sql
-- SQL Editor (Supabase)
-- Executar:

SELECT * FROM pg_policies WHERE tablename = 'appointments';
```

**Deve retornar:**
```
- Authenticated users can select appointments
- Authenticated users can insert appointments
- Authenticated users can update appointments
- Authenticated users can delete appointments
```

---

### Teste 3: Query manual no Supabase

```sql
-- Teste UPDATE direto
UPDATE appointments
SET scheduled_date = '2026-04-23'
WHERE id = 'uuid-do-agendamento'
  AND clinic_id = 'uuid-sua-clinic'
RETURNING *;
```

**Resultado esperado:**
- ✅ 1 linha (sucesso)
- ❌ 0 linhas (agendamento não existe para sua clínica)
- ❌ Erro RLS (você não tem permissão)

---

## ✅ FIX RÁPIDO

### PASSO 1: Verificar se clinic_id está sendo enviado

[src/modules/agenda/services/agenda.api.mutations.js](src/modules/agenda/services/agenda.api.mutations.js) linha 6:

```javascript
// ✅ DEVE TER clinic_id
const {
  clinicId,  // ← CRÍTICO
  date, startTime, endTime, patientId,
  ...
} = payload;
```

Se não tiver, **adicionar agora**!

---

### PASSO 2: Verificar se hook envia clinic_id

[src/modules/agenda/hooks/useAgendamentoMutation.js](src/modules/agenda/hooks/useAgendamentoMutation.js) linha 10:

```javascript
function normalizePayload(form, clinic) {
  return {
    clinicId: clinic?.id || form?.clinicId,  // ✅ DEVE TER
    ...
  };
}
```

---

### PASSO 3: Verificar RLS policy

No Supabase Dashboard → Policies → Appointments

```sql
-- ✅ CORRETO
CREATE POLICY "Authenticated users can update appointments"
  ON appointments FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()))
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));
```

---

## 🔥 SOLUÇÃO COMPLETA

Se ainda não funcionar, siga isto:

### 1. Verificar usuário logado

```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log("User ID:", user?.id);
```

### 2. Verificar clinic_id do usuário

```sql
SELECT id, clinic_id, role FROM users WHERE id = 'seu-user-id';
```

### 3. Verificar se agendamento existe

```sql
SELECT id, clinic_id FROM appointments WHERE id = 'agendamento-id';
```

### 4. Testar UPDATE manual

```sql
UPDATE appointments
SET scheduled_date = NOW()::DATE
WHERE id = 'agendamento-id'
  AND clinic_id = 'sua-clinic-id'
RETURNING id, clinic_id;
```

Se retornar 0 linhas → Agendamento não existe para sua clínica
Se retornar 1 linha → RLS está OK, problema é no .single()

---

## 📊 CHECKLIST

- [ ] ✅ clinic_id está em normalizePayload()
- [ ] ✅ clinic_id está em atualizarAgendamento()
- [ ] ✅ RLS policy existe (4 policies em appointments)
- [ ] ✅ Usuário está autenticado (user?.id tem valor)
- [ ] ✅ Agendamento pertence à sua clínica
- [ ] ✅ UPDATE manual retorna 1 linha

---

## 🎯 SE AINDA NÃO FUNCIONAR

Execute isto no Supabase SQL Editor:

```sql
-- 1. Listar suas clinic_ids
SELECT DISTINCT clinic_id FROM users WHERE id = auth.uid();

-- 2. Listar agendamentos dessa clínica
SELECT id, clinic_id, scheduled_date FROM appointments 
WHERE clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
LIMIT 5;

-- 3. Tentar atualizar um
UPDATE appointments
SET scheduled_date = NOW()::DATE
WHERE id = 'uuid-aqui'
  AND clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
RETURNING *;
```

---

## 📝 PRÓXIMOS PASSOS

1. Execute os testes acima
2. Identifique qual falha
3. Reporte qual teste falhou (1, 2 ou 3)
4. Teremos diagnóstico completo

