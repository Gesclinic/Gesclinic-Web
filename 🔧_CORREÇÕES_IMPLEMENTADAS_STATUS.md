# 🔧 CORREÇÕES IMPLEMENTADAS - PERSISTÊNCIA AGENDA

**Data:** 2026-05-06 10:30
**Status:** 🟡 EM ANDAMENTO

---

## ✅ FASE 1: LOGS DIAGNÓSTICOS (COMPLETO)

### Implementado em `appointmentsApi.js`:

#### 1. `mapToDatabase()` - Logs Melhorados
```javascript
✅ Log de entrada com campos críticos (payerId, payer_id, roomId, room_id)
✅ Log de output com verificação final
✅ Verifica se valores estão sendo mapeados corretamente
```

#### 2. `updateAppointment()` - Logs Detalhados
```javascript
✅ Log do payload antes da mapagem
✅ Log após mapToDatabase()
✅ Log se UPDATE foi bem-sucedido
✅ Log da response do Supabase
✅ Log do fallback (se RLS bloqueou SELECT)
✅ Diagnóstico: Distingue entre sucesso com dados vs sucesso sem dados (RLS)
```

#### 3. `validateAppointmentSaved()` - Nova Função
```javascript
✅ Função para verificar pós-UPDATE se dados foram realmente salvos
✅ Compara expected vs actual no banco
✅ Detecta RLS vs erro real
✅ Pronta para debug manual
```

---

## 🟡 PRÓXIMOS PASSOS

### FASE 2: Corrigir `filteredPayers` em modo EDIT

**Problema:** Quando editando um agendamento, se o `payer_id` do agendamento não está vinculado ao profissional selecionado, o payer desaparece do Select.

**Solução:** Ao carregar um agendamento (EDIT mode), adicionar o payer_id atual a filteredPayers mesmo se não estiver vinculado.

**Localização:** AppointmentUnitedModal.jsx linha 449-475

```javascript
// ANTES:
useEffect(() => {
  // Filtra payers dos serviços do profissional
  // ❌ PROBLEMA: Se payer atual não está vinculado, desaparece
}, [agendamentoData.professionalId, ...])

// DEPOIS:
useEffect(() => {
  // Filtra payers dos serviços do profissional
  // ✅ NOVO: Se em EDIT mode e há um payer_id, incluir na lista
}, [agendamentoData.professionalId, mode, agendamentoData.payerId, ...])
```

### FASE 3: Validar antes de enviar UPDATE

**Problema:** Não há validação se convênio/sala estão realmente preenchidos antes de salvar.

**Solução:** Adicionar validação em `handleSaveChanges()` para garantir que campos obrigatórios não são vazios.

### FASE 4: Verificar RLS após UPDATE

**Problema:** Se RLS está bloqueando SELECT após UPDATE, os dados não retornam e usam fallback.

**Solução:** Se fallback é usado, fazer uma query de verificação para confirmar dados foram salvos.

---

## 📊 COMO TESTAR

### Teste 1: Criar Agendamento (CREATE)
```
1. Abrir modal em modo NEW
2. Selecionar profissional
3. Selecionar convênio ← verificar se aparece
4. Selecionar sala ← verificar se aparece
5. Selecionar horário
6. Clicar SALVAR
7. Abrir Console (F12)
8. Procurar por "room_id" e "payer_id" nos logs
✅ Esperado: Aparecem nos logs e no banco
```

### Teste 2: Editar Agendamento (UPDATE)
```
1. Clicar em agendamento existente → Editar
2. Verificar se convênio está preenchido ← CRÍTICO
3. Verificar se sala está preenchida ← CRÍTICO
4. Mudar convênio
5. Mudar sala
6. Mudar horário
7. Clicar SALVAR
8. Abrir Console (F12)
9. Procurar logs de "updateAppointment" e "SUCESSO COM SELECT"
✅ Esperado: Convênio e sala mudam no banco
```

### Teste 3: Validar com Query SQL
```sql
SELECT id, payer_id, room_id, scheduled_time 
FROM appointments 
WHERE id = 'ÚLTIMO_ID_CRIADO'
ORDER BY created_at DESC LIMIT 1;

-- ✅ ESPERADO: payer_id e room_id preenchidos (não NULL)
-- ❌ PROBLEMA: Se vêm NULL, não foram salvos
```

### Teste 4: Debug com validateAppointmentSaved()
```javascript
// No console do navegador:
import { validateAppointmentSaved } from '@/lib/appointmentsApi';

await validateAppointmentSaved('APPOINTMENT_ID', {
  payer_id: 'expected-id',
  room_id: 'expected-id',
  scheduled_time: '14:00:00'
});

// ✅ Retorna comparação: expected vs actual no banco
```

---

## 🎯 PRÓXIMAS MUDANÇAS A FAZER

### 1. AppointmentUnitedModal.jsx - Linha ~449
Melhorar useEffect de filteredPayers para incluir payer atual em modo EDIT:
```javascript
const [filteredPayers, setFilteredPayers] = useState([]); 

// 🏥 Effect: Incluir payer atual em modo EDIT
useEffect(() => {
  // Se em EDIT mode e há um payerId, garantir que está na lista
  if (mode === 'edit' && agendamentoData.payerId) {
    const currentPayer = payers.find(p => p.id === agendamentoData.payerId);
    if (currentPayer && !filteredPayers.find(p => p.id === agendamentoData.payerId)) {
      setFilteredPayers(prev => [currentPayer, ...prev]);
    }
  }
}, [mode, agendamentoData.payerId, payers]);
```

### 2. AppointmentUnitedModal.jsx - Linha ~2400
Adicionar validação antes de enviar:
```javascript
if (mode === 'edit') {
  // ✅ NOVA VALIDAÇÃO
  if (!agendamentoData.payerId) {
    alert('❌ Convênio é obrigatório');
    return;
  }
  if (!agendamentoData.professionalId) {
    alert('❌ Profissional é obrigatório');
    return;
  }
  // ...continuar save
}
```

### 3. appointmentsApi.js - Linha ~780
Adicionar validação pós-UPDATE:
```javascript
const result = await updateAppointment(appointmentId, updateData);

// ✅ NOVA VALIDAÇÃO
const validation = await validateAppointmentSaved(appointmentId, {
  payer_id: updateData.payer_id,
  room_id: updateData.room_id,
});

if (!validation.matches.payer_id || !validation.matches.room_id) {
  console.error('❌ [ALERTA] Campos críticos não foram salvos!');
  // Pode disparar um erro ou retentar
}
```

---

## 📋 RESUMO DE MUDANÇAS

| Arquivo | Linha | Tipo | Status |
|---------|-------|------|--------|
| appointmentsApi.js | 128+ | Logs | ✅ Implementado |
| appointmentsApi.js | 760+ | Logs | ✅ Implementado |
| appointmentsApi.js | 900+ | Nova Função | ✅ Implementado |
| AppointmentUnitedModal.jsx | 449 | Validação | 🟡 TODO |
| AppointmentUnitedModal.jsx | 2400 | Validação | 🟡 TODO |

---

## 🚀 PRÓXIMO PASSO

Testar os logs implementados:
1. Abrir navegador
2. F12 → Console
3. Criar novo agendamento
4. Observar logs (procurar "payer_id" e "room_id")
5. Se logs estão corretos, problema está em outro lugar
6. Se logs mostram valores vazios, problema está no modal/estado
