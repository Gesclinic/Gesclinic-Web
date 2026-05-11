# 🕐 ARQUITETURA: Padronização de Timezone - Agenda Enterprise

**Status:** 🔄 Em Implementação  
**Data:** 2026-05-10  
**Fuso Horário:** America/Sao_Paulo (UTC-3 / UTC-2 DST)

---

## 📋 PROBLEMA ATUAL

```
❌ Inconsistências de horário:
- scheduled_date (DATE) + scheduled_time (TIME) → sem timezone
- start_time em alguns places (ISO UTC)
- Mistura de toLocaleString() com utcToZonedTime()
- Diferentes componentes tratam timezone diferente
- Sem helpers centralizados
- Edição/drag-drop podem deslocar horas
- Realtime pode processar em UTC incorreto
```

---

## ✅ SOLUÇÃO: Arquitetura Padronizada

### 1. BANCO DE DADOS

```sql
-- Padrão UTC:
scheduled_date → DATE (armazenar em UTC local, ex: '2026-05-10')
scheduled_time → TIME (armazenar em UTC local, ex: '14:30:00')
created_at/updated_at → TIMESTAMPTZ (UTC absoluto)

-- Quando consultar (backend):
SELECT 
  scheduled_date::date as date_only,
  scheduled_time::time as time_only,
  (scheduled_date::date || ' ' || scheduled_time::time)::timestamptz 
    AT TIME ZONE 'America/Sao_Paulo' as local_timestamp
FROM appointments;
```

**Benefício:** Data/hora são "naive" no banco, aplicam-se com timezone apenas quando precisam

### 2. API (Backend)

```javascript
// Normalizar ao retornar:
{
  id: '...',
  scheduled_date: '2026-05-10',          // DATE only
  scheduled_time: '14:30:00',             // TIME only
  created_at: '2026-05-10T14:30:00Z',    // ISO UTC
  // NOVO: computed field para frontend
  scheduled_local: '2026-05-10T14:30:00-03:00', // ISO with timezone
}

// Esperar do frontend:
{
  scheduled_date: '2026-05-10',     // YYYY-MM-DD em timezone local
  scheduled_time: '14:30:00',       // HH:mm:ss em timezone local
  // OU
  start_time: '2026-05-10T14:30:00' // ISO local SEM Z
}
```

### 3. FRONTEND - HELPERS CENTRALIZADOS

```javascript
// src/utils/timezoneHelpers.js

// ✅ PADRÃO: America/Sao_Paulo
const TZ = 'America/Sao_Paulo';

// Converter: ISO UTC → Hora Local
toLocalTime(isoUtc)
→ { date: '2026-05-10', time: '14:30', hour: 14, minute: 30 }

// Converter: Data Local + Hora → ISO UTC
fromLocalTime(date, time)
→ '2026-05-10T17:30:00Z' (com ajuste correto)

// Formatar: Para render no UI
formatLocalDate(date)   → '10/05/2026'
formatLocalTime(time)   → '14:30'
formatLocal(dateTime)   → '10/05/2026 14:30'

// Validar: Cruzar timezone
isValidLocalTime(date, time) → boolean
getNoonOffset(date)     → -3 ou -2 (DST)

// Comparar: Duas datas/horas
isSameLocalDay(d1, d2)  → boolean
isSameLocalTime(d1, d2) → boolean (com tolerância de segundos)
```

### 4. COMPONENTES PRINCIPAIS

#### AgendaTimelineView
```
Renderizar horas → formatLocalTime() ✅
Click para criar → fromLocalTime() + sanitizar ✅
Mostrar agendamentos → toLocalTime() ✅
```

#### AgendaWeekView
```
Header data → formatLocalDate() ✅
Grid de horários → formatLocalTime() ✅
Agendamentos → toLocalTime() ✅
```

#### AgendaMonthView
```
Datas do mês → formatLocalDate() ✅
Agendamentos mini → toLocalTime() ✅
```

#### AppointmentUnitedModal
```
Input date → fromLocalTime() ao salvar ✅
Input time → fromLocalTime() ao salvar ✅
Edit appointment → toLocalTime() ao carregar ✅
Validações → isValidLocalTime() ✅
```

### 5. DRAG & DROP

```javascript
// Antes:
draggedItem.start_time = newDateTime  // ❌ Pode deslocar

// Depois:
const { date, time } = toLocalTime(draggedItem.start_time);
const newLocalTime = { date, time: newTime };
draggedItem.start_time = fromLocalTime(newLocalTime) // ✅ Correto
```

### 6. REALTIME

```javascript
// Supabase envia evento com:
{
  scheduled_date: '2026-05-10',
  scheduled_time: '14:30:00'
}

// Ao processar no frontend:
const { date, time } = toLocalTime(payload.scheduled_date, payload.scheduled_time);
invalidateAppointments({ clinic_id, date }); // ✅ Seletivo + correto
```

---

## 🛠️ IMPLEMENTAÇÃO: Fases

### FASE 1: Helpers (Hoje)
- [ ] Criar `src/utils/timezoneHelpers.js` (250+ linhas)
- [ ] Testes unitários dos helpers

### FASE 2: AppointmentUnitedModal
- [ ] Atualizar parseLocalDate() → usar helper novo
- [ ] Atualizar formatDateToIso() → usar helper novo
- [ ] Atualizar normalizeTimeValue() → usar helper novo
- [ ] Fix: Sincronização ao editar

### FASE 3: Views (Timeline, Week, Month)
- [ ] AgendaTimelineView - formatTime()
- [ ] AgendaWeekView - renderização
- [ ] AgendaMonthView - renderização

### FASE 4: Validação
- [ ] Teste: Reload página (mantém hora?)
- [ ] Teste: Múltiplos fusos (testar com VPN)
- [ ] Teste: Create/Update/Delete
- [ ] Teste: Drag & Drop
- [ ] Teste: Realtime

### FASE 5: Documentação
- [ ] Guia de uso para develop
- [ ] Troubleshooting comum
- [ ] Testes automatizados

---

## 📊 MAPEAMENTO CURRENT → NOVO

| Componente | Campo | Atual | Novo |
|-----------|-------|-------|------|
| Modal | Input data | parseLocalDate() | toLocalTime() |
| Modal | Input hora | normalizeTimeValue() | formatLocalTime() |
| Modal | Salvar | formatDateToIso() | fromLocalTime() |
| Timeline | Renderizar | toLocaleString() | formatLocalTime() |
| Week | Header | format() | formatLocalDate() |
| Month | Datas | format() | formatLocalDate() |
| All | Comparar | String compare | isSameLocalDay() |

---

## 🎯 CRITÉRIOS DE SUCESSO

✅ **Consistência**
- Todos os agendamentos renderizam correto em todo timezone
- Reload página = mesmo horário

✅ **Edição**
- Criar agendamento: hora correta
- Editar agendamento: hora não muda
- Drag & drop: hora não desploca

✅ **Múltiplas Visualizações**
- Dia: todas as horas corretas
- Semana: horas corretas, grid alinhado
- Mês: datas corretas, compacto

✅ **Realtime**
- Evento atualiza hora correta
- Cross-tab sincroniza hora correta
- Sem duplicação de horário

✅ **Compatibilidade**
- Sem alterar horários existentes
- Backward compatible
- Zero impacto em outras módulos

---

## 📝 CÓDIGO DE EXEMPLO

```javascript
// ANTES (problemático):
function renderAppointment(apt) {
  return new Date(apt.start_time).toLocaleString('pt-BR'); // ❌ Pode deslocar
}

// DEPOIS (correto):
function renderAppointment(apt) {
  const { date, time } = toLocalTime(apt.scheduled_date, apt.scheduled_time);
  return formatLocal(date, time); // ✅ Sempre correto
}

// ANTES (edit):
function handleEditSave(form) {
  api.updateAppointment({
    start_time: form.dateInput.toISOString() // ❌ Pode deslocar
  });
}

// DEPOIS (correto):
function handleEditSave(form) {
  api.updateAppointment({
    scheduled_date: form.dateInput, // YYYY-MM-DD local
    scheduled_time: form.timeInput   // HH:mm:ss local
  });
}
```

---

## 🔬 TESTES

### Teste 1: Consistência Dia
```
1. Carregar Agenda para 2026-05-10
2. Verificar horários em Timeline
3. Reload página
4. Verificar horários = IGUAL
```

### Teste 2: Edição
```
1. Editar agendamento de 14:30
2. Salvar
3. Recarregar
4. Verificar continua 14:30
```

### Teste 3: Drag & Drop
```
1. Arrastar agendamento de 14:30 → 15:00
2. Verificar DB e UI
3. Reload
4. Continua em 15:00?
```

### Teste 4: Múltiplos Fusos
```
1. Mudar timezone do SO (VPN)
2. Abrir Agenda
3. Horários devem estar corretos no fuso local
```

### Teste 5: Realtime
```
1. Abrir Agenda em 2 abas
2. Criar agendamento em aba A
3. Aba B atualiza com horário correto
```

---

## 🚀 ROADMAP

| Fase | Tarefa | Estimativa | Status |
|------|--------|-----------|--------|
| 1 | Helpers | 2h | ▶️ Hoje |
| 2 | AppointmentUnitedModal | 3h | ▶️ Amanhã |
| 3 | Views (Timeline/Week/Month) | 4h | ▶️ Amanhã |
| 4 | Validações | 2h | ▶️ Amanhã |
| 5 | Testes & Docs | 3h | ▶️ Próximos dias |

**Total: ~14h trabalho**

---

## ⚠️ IMPORTANTE

✅ **Não quebra nada** - Backward compatible  
✅ **Sem alteração de dados históricos** - Horários existentes mantêm  
✅ **Gradual** - Fases podem ser feitas incrementalmente  
✅ **Testável** - Cada fase tem testes específicos

---

## 📞 REFERÊNCIAS

- [date-fns-tz](https://github.com/marnusw/date-fns-tz)
- [IANA Timezones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
- [RFC 3339 - Timestamps](https://tools.ietf.org/html/rfc3339)

