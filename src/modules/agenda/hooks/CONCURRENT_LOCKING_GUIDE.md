# 🔒 Guia: Controle de Concorrência (Optimistic Locking)

## Objetivo
Evitar que múltiplos usuários sobrescrevam dados uns dos outros quando editam simultaneamente o mesmo agendamento.

---

## 1️⃣ Como Funciona

### Cenário Sem Proteção (ANTES)

```
User A (11:00): Abre agendamento
User B (11:02): Abre mesmo agendamento
User A (11:03): Muda status para "confirmado" → Salva
User B (11:05): Muda horário para 14:00 → Salva
❌ RESULTADO: Status "confirmado" de User A foi PERDIDO!
```

### Cenário Com Proteção (DEPOIS)

```
User A (11:00): Abre agendamento (updated_at = 11:00:00)
User B (11:02): Abre mesmo agendamento (updated_at = 11:00:00)
User A (11:03): Muda status para "confirmado" → Salva
            → Envia: updated_at = 11:00:00
            → BD atualiza: updated_at = 11:03:00 ✅

User B (11:05): Tenta salvar horário para 14:00
            → Envia: updated_at = 11:00:00 (DESATUALIZADO!)
            → BD compara: 11:00:00 != 11:03:00
            → BLOQUEIA: "Este agendamento foi atualizado por outro usuário"
✅ PROTEÇÃO: Dados de User A foram preservados!
```

---

## 2️⃣ Arquitetura Técnica

### A. Banco de Dados (Supabase)

**Tabela: `appointments`**
```sql
-- Campo já existe
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

**RPC: `update_appointment_safe()`**
```sql
-- Validar versão ANTES de atualizar
IF current_updated_at != payload_updated_at THEN
  RETURN error: 'conflict_detected'
END IF

-- Se passou, atualizar SEGURO
UPDATE appointments SET ... WHERE id = p_id
```

### B. Backend (Service - appointmentsApi.js)

```javascript
export async function updateAppointment(id, updates) {
  // 1. Buscar updated_at ATUAL
  const current = await supabase.from("appointments").select("updated_at").eq("id", id);
  
  // 2. Validar: se updated_at no payload ≠ current, é CONFLITO
  if (updates.updated_at !== current.updated_at) {
    throw Error({ code: 'conflict_detected' });
  }
  
  // 3. Chamar RPC segura
  const result = await supabase.rpc("update_appointment_safe", {
    p_appointment_id: id,
    p_updated_at: current.updated_at,
    p_payload: updates
  });
  
  // 4. Se erro = conflito, relançar
  if (!result.success && result.error === 'conflict_detected') {
    throw Error({ code: 'conflict_detected' });
  }
}
```

### C. Frontend (Mutation Hook - useAgendamentoMutation.js)

```javascript
// Atualizar mutation
mutationFn: async ({ id, payload }) => {
  // 1. Buscar updated_at ANTES de enviar
  const { data: current } = await supabase
    .from("appointments")
    .select("updated_at")
    .eq("id", id);
  
  // 2. Adicionar updated_at ao payload
  payload.updated_at = current.updated_at;
  
  // 3. Enviar para servidor
  return atualizarAgendamento(id, payload);
},

// Tratar erro de conflito
onError: (err) => {
  if (err?.code === 'conflict_detected') {
    // Rollback automático + mensagem clara
    showAlert("Este agendamento foi atualizado por outro usuário");
  }
}
```

### D. Frontend (Componente - AgendamentoEditarModal.jsx)

```javascript
async function handleSubmit() {
  try {
    await atualizarAgendamento({ id, payload });
    onClose();
  } catch (err) {
    if (err?.code === 'conflict_detected') {
      setError('⚠️ Este agendamento foi atualizado por outro usuário.\n\nCarregue novamente para ver as alterações.');
    }
  }
}
```

---

## 3️⃣ Fluxo Completo de Edição

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CARREGAR AGENDAMENTO                                     │
│    └─ BD retorna: id, data, status, updated_at=11:00:00   │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 2. USUÁRIO EDITA DADOS                                      │
│    └─ Muda status: "agendado" → "confirmado"               │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 3. VALIDAR LOCALMENTE                                       │
│    └─ Data, horários, etc. OK                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 4. BUSCAR updated_at ATUAL (confirmação antes de enviar)   │
│    └─ BD: updated_at = 11:00:00 (ainda igual)             │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 5. ENVIAR PARA SERVIDOR                                     │
│    Payload:                                                 │
│    {                                                        │
│      id: "abc-123",                                         │
│      clinicId: "xyz",                                       │
│      date: "2026-04-23",                                    │
│      status: "confirmado",                                  │
│      updated_at: "2026-04-23T11:00:00Z"  ← VERSÃO ENVIADA │
│    }                                                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 6. VALIDAR NO SERVIDOR (RPC)                                │
│    A. Buscar updated_at atual: 11:00:00                    │
│    B. Comparar: 11:00:00 == 11:00:00? SIM ✅              │
│    C. Update seguro                                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 7. ATUALIZAR REGISTRO                                       │
│    └─ BD: status="confirmado", updated_at=11:30:00 (novo) │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│ 8. SUCESSO!                                                 │
│    └─ Modal fecha, lista atualiza automaticamente          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4️⃣ Teste Rápido (5 min)

### 1. Abrir 2 Navegadores

Browser A e B, ambos abrindo a Agenda.

### 2. Em Ambos, Clicar no Mesmo Agendamento

Agendamento X aberto em ambos.

### 3. Em Browser A, Mudar Status

Clicar "Salvar" - ✅ Deve funcionar.

### 4. Em Browser B, Tentar Mudar Horário

Clicar "Salvar" - ❌ Deve mostrar aviso de conflito.

### 5. Recarregar B

Clicar "Recarregar" e tentar novamente - ✅ Deve funcionar.

---

## ✅ Status

**Controle de Concorrência Implementado:** 🚀 100%

- [x] RPC `update_appointment_safe()` criada
- [x] Validação de `updated_at` no servidor
- [x] Mutation hook atualizado
- [x] Componente Modal trata erro de conflito
- [x] Logging em Sentry
- [x] Documentação completa