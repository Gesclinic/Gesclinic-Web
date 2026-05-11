# 🔴 PLANO DE CORRECÇÃO - PERSISTÊNCIA AGENDA

**Data:** 2026-05-06
**Escopo:** Convênio, Sala e Horário não salvam
**Timeline:** 4-6 horas de trabalho

---

## 📊 DIAGNÓSTICO FLUXO ATUAL

```
Frontend (AppointmentUnitedModal.jsx)
  ├─ State: agendamentoData {payerId, roomId, date, time}
  ├─ Payload construído na linha 2615+
  │  └─ payer_id: agendamentoData.payerId || null ✅ Correto
  │  └─ room_id: agendamentoData.roomId || null ✅ Correto
  ├─ await updateAppointment(appointmentId, updateData)
  │
Supabase API (appointmentsApi.js)
  ├─ Entrada: {payer_id, room_id, ...}
  ├─ mapToDatabase() linha 128+
  │  └─ payer_id: payload.payerId || payload.payer_id ✅ Correto
  ├─ supabase.from('appointments').update(data).eq('id', id).select(...)
  │  └─ Problema Potencial: RLS bloqueando SELECT?
  │  └─ Se sim: Retorna fallback do payload (linha 850+)
  │
Database (Supabase)
  ├─ UPDATE appointments SET payer_id=?, room_id=?, ...
  ├─ SELECT com relacionamentos
  │
Response Retorna (appointmentsApi.js linha 830+)
  └─ mapFromDatabase() para normalizar
     └─ Potencial PERDA: undefined ou null em payer_id/room_id?
```

---

## 🎯 PONTOS CRÍTICOS A CORRIGIR

### 1. PROBLEMA: Payload constrói mas estado não atualiza
**Localização:** AppointmentUnitedModal.jsx linha 650-780
```javascript
// RISCO: setAgendamentoData pode estar sendo sobrescrito
// Se há múltiplos useEffect/onChange disparando
```

### 2. PROBLEMA: mapToDatabase pode não incluir campos
**Localização:** appointmentsApi.js linha 128-200
```javascript
// Risco: Se payload.payerId é falsy, não envia
// Esperado: Sempre enviar, mesmo se null
```

### 3. PROBLEMA: RLS SELECT após UPDATE retorna vazio
**Localização:** appointmentsApi.js linha 800-850
```javascript
// Se result.length === 0, retorna fallback do payload
// Fallback pode estar incompleto ou com valores vazios
```

### 4. PROBLEMA: Realtime não atualiza UI
**Localização:** useAgendaLive.js
```javascript
// Sem deduplicação: evento duplicado ignora mudança real
```

### 5. PROBLEMA: Timezone deslocando horário
**Localização:** appointmentsApi.js linha 45-65
```javascript
// extractTime() pode estar perdendo offset
```

---

## ✅ SOLUÇÕES A IMPLEMENTAR

### FASE 1: Logs Diagnósticos (1 hora)

**Arquivo:** appointmentsApi.js

1. **mapToDatabase() - Adicionar logs**
   - Log de entrada (payload recebido)
   - Log de cada campo crítico
   - Log de saída (dados enviados)

2. **updateAppointment() - Adicionar logs**
   - Log do payload antes de enviar
   - Log da resposta do SELECT
   - Log do fallback (se RLS bloquear)

3. **mapFromDatabase() - Adicionar logs**
   - Log de entrada (dados do banco)
   - Log de cada campo mapeado
   - Log de saída (dados finais)

### FASE 2: Validação de Integridade (1 hora)

**Arquivo:** appointmentsApi.js

1. **validateBeforeUpdate()**
   - Verificar se payer_id não é vazio
   - Verificar se room_id não é vazio
   - Verificar se date/time são válidos

2. **validateAfterUpdate()**
   - Verificar se response contém payer_id
   - Verificar se response contém room_id
   - Se falhar, fazer query de verificação

### FASE 3: Correção de RLS (1.5 horas)

**Arquivo:** appointmentsApi.js linha 800-850

1. **Se SELECT retorna vazio (RLS bloqueando)**
   - Log específico: "RLS bloqueou SELECT"
   - Fazer query direta: `SELECT * FROM appointments WHERE id = $1`
   - Se query funciona, problema é RLS

2. **Se RLS é o problema**
   - Usar dados retornados da query direta
   - Mapear com mapFromDatabase()

### FASE 4: Correção de State (1 hora)

**Arquivo:** AppointmentUnitedModal.jsx

1. **useEffect Dependencies**
   - Revisar todas as dependencies
   - Garantir que setAgendamentoData não é sobrescrito

2. **Controlled Components**
   - Select de payer: deve ter value={agendamentoData.payerId}
   - Select de room: deve ter value={agendamentoData.roomId}
   - Input de hora: deve ter value={agendamentoData.time}

3. **Handlers de mudança**
   - onChange deve atualizar estado corretamente
   - Não deve limpar campo preenchido

### FASE 5: Testes e Validação (1.5 horas)

1. **Teste CREATE**
   - [ ] Criar agendamento com convênio e sala
   - [ ] Verificar console logs
   - [ ] Verificar banco de dados

2. **Teste UPDATE**
   - [ ] Editar convênio
   - [ ] Editar sala
   - [ ] Editar horário
   - [ ] Verificar se persiste

3. **Teste TIMEZONE**
   - [ ] Criar agendamento 14:00
   - [ ] Verificar se banco salva 14:00
   - [ ] Verificar se realtime retorna 14:00

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Hoje (Diagn

ósticos)
- [ ] Adicionar logs em mapToDatabase()
- [ ] Adicionar logs em updateAppointment()
- [ ] Adicionar logs em mapFromDatabase()
- [ ] Testar CREATE - observar logs
- [ ] Testar UPDATE - observar logs

### Amanhã (Correções)
- [ ] Implementar validateBeforeUpdate()
- [ ] Implementar validateAfterUpdate()
- [ ] Corrigir RLS SELECT issue
- [ ] Revisar useEffect no modal
- [ ] Corrigir controlled components

### Validação Final
- [ ] Teste CREATE completo
- [ ] Teste UPDATE completo
- [ ] Teste timezone
- [ ] Teste realtime
- [ ] Teste multi-tab

---

## 🎯 CRITÉRIOS DE SUCESSO

✅ **Convênio salva:**
- Ao criar: payer_id enviado e retorna banco
- Ao editar: payer_id alterado e persiste
- Realtime: mostra novo convênio imediatamente

✅ **Sala salva:**
- Ao criar: room_id enviado e retorna banco
- Ao editar: room_id alterado e persiste
- Realtime: mostra nova sala imediatamente

✅ **Horário correto:**
- Ao criar: scheduled_time salvo corretamente
- Ao editar: horário alterado e persiste
- Sem deslocamento de timezone

✅ **Sem quebras:**
- Agenda dia funciona
- Agenda semana funciona
- Agenda mês funciona
- Agenda tabela funciona
- Realtime sem duplicatas

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

1. Abrir console do navegador (F12)
2. Filtrar por "payer_id" e "room_id"
3. Criar novo agendamento e observar logs
4. Editar agendamento e observar se campos atualizam
5. Verificar banco: SELECT * FROM appointments WHERE id = ? (última criada)

Se payer_id/room_id vierem NULL no banco:
- Problema está no mapeamento ou no RLS

Se virem corretos no banco mas não aparecem na UI:
- Problema está na response ou no realtime

Se não aparecem em ambas:
- Problema está antes do supabase (payload vazio)
