# 🕐 GUIA: Implementação de Timezone - Agenda Enterprise

**Versão:** 1.0  
**Status:** ✅ Pronto para Deploy  
**Fuso:** America/Sao_Paulo (UTC-3 / UTC-2)

---

## 🚀 COMEÇAR AGORA

### 1️⃣ Importar Helpers

```javascript
import {
  toLocalTime,
  fromLocalTime,
  formatLocalDate,
  formatLocalTime,
  formatLocal,
  isValidLocalDate,
  isValidLocalTime,
  isSameLocalDay,
  calculateDurationMinutes,
  addMinutesToTime,
} from '@/utils/timezoneHelpers';
```

### 2️⃣ Padrões de Uso

#### 📥 **Receber dados do banco**
```javascript
// Banco retorna:
{
  scheduled_date: '2026-05-10',      // DATE string
  scheduled_time: '14:30:00',        // TIME string
  created_at: '2026-05-10T17:30:00Z' // TIMESTAMPTZ ISO UTC
}

// Converter para usar no frontend:
const localTime = toLocalTime(apt.created_at);
// → { date: '2026-05-10', time: '14:30:00', hour: 14, minute: 30 }
```

#### 📤 **Enviar dados para o banco**
```javascript
// Frontend tem:
const date = '2026-05-10';   // YYYY-MM-DD
const time = '14:30:00';     // HH:mm:ss

// Preparar para API:
const payload = fromLocalTimeToDateAndTime(date, time);
// → { scheduled_date: '2026-05-10', scheduled_time: '14:30:00' }

api.updateAppointment(payload);
```

#### 🎨 **Renderizar no UI**
```javascript
// Para mostrar data + hora:
const formatted = formatLocal(apt.scheduled_date, apt.scheduled_time);
// → '10/05/2026 14:30'

// Apenas data:
const dateStr = formatLocalDate(apt.scheduled_date);
// → '10/05/2026'

// Apenas hora:
const timeStr = formatLocalTime(apt.scheduled_time);
// → '14:30'
```

#### 🔄 **Validar entrada do usuário**
```javascript
const date = userInput.date; // '2026-05-10'
const time = userInput.time; // '14:30'

if (!isValidLocalDate(date) || !isValidLocalTime(time)) {
  showError('Data ou hora inválida');
  return;
}

// Validar range:
if (!isTimeInRange(time, '08:00', '18:00')) {
  showError('Hora fora do horário comercial');
  return;
}
```

#### ⏱️ **Comparar datas**
```javascript
// Mesmo dia?
if (isSameLocalDay(date1, date2)) {
  // ...
}

// Mesma hora (com tolerância)?
if (isSameLocalTime(apt1, apt2, 1000)) { // 1s tolerância
  // ...
}
```

---

## 📋 CHECKLIST POR COMPONENTE

### AppointmentUnitedModal
- [ ] Importar `fromLocalTimeToDateAndTime` 
- [ ] Usar ao salvar (criar/editar)
- [ ] Importar `toLocalTime` ao carregar edit
- [ ] Validar com `isValidLocalDateTime`
- [ ] Testar: reload → hora igual?

### AgendaTimelineView
- [ ] Importar `formatLocalTime`
- [ ] Usar ao renderizar horários
- [ ] Importar `fromLocalTime` ao criar
- [ ] Testar: click em slot → cria com hora correta?

### AgendaWeekView
- [ ] Importar `formatLocalDate`
- [ ] Usar no header com dias da semana
- [ ] Testar: scroll semana → datas corretas?

### AgendaMonthView
- [ ] Importar `formatLocalDate`
- [ ] Usar ao renderizar datas dos dias
- [ ] Testar: mês diferente → tudo certo?

### Drag & Drop
- [ ] Importar `toLocalTime` / `fromLocalTime`
- [ ] Ao arrastar: não usar start_time direto
- [ ] Converter: `toLocalTime()` → `fromLocalTime()` nova hora
- [ ] Testar: drag → hora não desploca?

---

## ⚠️ ERROS COMUNS & SOLUÇÕES

### ❌ ERRO: Hora desploca 3 horas ao salvar
```javascript
// ERRADO:
const isoUtc = new Date(userDate + ' ' + userTime).toISOString();
api.update({ start_time: isoUtc }); // Desploca!

// CORRETO:
const isoUtc = fromLocalTime(userDate, userTime);
api.update({ scheduled_date: userDate, scheduled_time: userTime });
```

### ❌ ERRO: Reload página = hora diferente
```javascript
// ERRADO:
render() {
  const date = new Date(apt.created_at).toLocaleDateString();
  // Pode variar conforme SO/navegador
}

// CORRETO:
render() {
  const localTime = toLocalTime(apt.created_at);
  const date = formatLocalDate(localTime.date);
  // Sempre consistente
}
```

### ❌ ERRO: Drag & drop desploca hora
```javascript
// ERRADO:
function handleDragEnd(apt, newTime) {
  apt.start_time = newTime.toISOString(); // Desploca
  api.update(apt);
}

// CORRETO:
function handleDragEnd(apt, newHour, newMinute) {
  const oldLocal = toLocalTime(apt.created_at);
  const newLocal = { ...oldLocal, hour: newHour, minute: newMinute };
  const newIso = fromLocalTime(newLocal);
  api.update({ ...apt, created_at: newIso });
}
```

### ❌ ERRO: Edit carrega hora errada
```javascript
// ERRADO:
function loadEdit(apt) {
  formState.time = apt.scheduled_time; // Pode estar em UTC
}

// CORRETO:
function loadEdit(apt) {
  const local = toLocalTime(apt.created_at || apt.scheduled_date);
  formState.date = local.date;
  formState.time = local.time;
}
```

---

## 🧪 TESTES RÁPIDOS

### Teste 1: Renderização
```javascript
// Copiar no console durante visualização Agenda:
const apt = document.querySelector('[data-appointment]')?.__data;
if (apt) {
  const local = toLocalTime(apt.created_at);
  console.log('Local:', local);
  console.log('Formatted:', formatLocal(local.date, local.time));
}
```

### Teste 2: Create
```javascript
// Criar agendamento em 14:30
// Verificar no console:
// ✅ DB: scheduled_time = '14:30:00'
// ✅ UI: renderiza '14:30'
// ✅ Reload: continua '14:30'
```

### Teste 3: Edit
```javascript
// Editar agendamento 14:30 → 15:00
// Reload página
// Verificar: continua em 15:00
```

### Teste 4: Drag
```javascript
// Arrastar agendamento 14:30 → 15:30
// Verificar: UI atualiza
// Reload: continua em 15:30
```

---

## 📊 ROADMAP IMPLEMENTAÇÃO

| Componente | Prioridade | Tempo | Status |
|-----------|-----------|-------|--------|
| Helpers | 🔴 CRÍTICO | 1h | ✅ DONE |
| AppointmentUnitedModal | 🔴 CRÍTICO | 2h | ▶️ TODO |
| AgendaTimelineView | 🟡 ALTO | 1.5h | ▶️ TODO |
| AgendaWeekView | 🟡 ALTO | 1h | ▶️ TODO |
| AgendaMonthView | 🟡 ALTO | 0.5h | ▶️ TODO |
| Testes | 🟢 MÉDIO | 2h | ▶️ TODO |
| Documentação | 🟢 MÉDIO | 1h | ✅ DOING |

**Total: ~9h**

---

## 📞 DEBUG & TROUBLESHOOTING

### Ativar Logs de Debug

```javascript
// No console:
import { debugTimezone } from '@/utils/timezoneHelpers';

debugTimezone('2026-05-10', '14:30:00');
// Saída:
// Local: {date: '2026-05-10', time: '14:30:00'}
// ISO UTC: '2026-05-10T17:30:00Z'
// Back to Local: {date: '2026-05-10', time: '14:30:00'}
// Timezone Offset: -3
```

### Verificar Offset DST
```javascript
import { getTimezoneOffset } from '@/utils/timezoneHelpers';

// Fora de DST (inverno):
getTimezoneOffset('2026-05-10'); // -3

// Dentro de DST (verão):
getTimezoneOffset('2026-12-10'); // -2
```

### Testar Múltiplos Fusos
```javascript
// (Só para teste/debug - NÃO em produção!)
// Simular fuso diferente:
const mockOffset = -5; // EST
const adjusted = addMinutesToTime(time, mockOffset * 60);
```

---

## 🎯 VERIFICAÇÃO PRÉ-DEPLOY

- [ ] Todos os helpers importam corretamente
- [ ] AppointmentUnitedModal testa OK (create/edit)
- [ ] AgendaTimelineView renderiza OK
- [ ] AgendaWeekView renderiza OK
- [ ] AgendaMonthView renderiza OK
- [ ] Reload página = mesmos horários
- [ ] Drag & drop não desploca hora
- [ ] Realtime sincroniza hora correta
- [ ] Sem alteração de dados históricos
- [ ] Testes automatizados passam

---

## 📖 REFERÊNCIAS

- [`date-fns` docs](https://date-fns.org/)
- [`date-fns-tz` docs](https://github.com/marnusw/date-fns-tz)
- [IANA Timezones](https://www.iana.org/time-zones)
- [RFC 3339 - Timestamps](https://tools.ietf.org/html/rfc3339)

---

## 💡 DICAS

✅ **Sempre use helpers** - Não faça manualmente  
✅ **Validate entrada** - `isValidLocalDate()` e `isValidLocalTime()`  
✅ **Render com formatters** - `formatLocal*()` functions  
✅ **Salve como DATE/TIME** - Não como ISO UTC  
✅ **Debug com `debugTimezone()`** - Antes de commitar  

---

## 🚀 DEPLOY

```bash
# 1. Verificar imports:
grep -r "toLocaleString" src/pages/clinica/agenda
grep -r "new Date(" src/pages/clinica/agenda

# 2. Rodar testes:
npm test -- timezoneHelpers.test.js

# 3. Deploy staging:
npm run build
npm run deploy:staging

# 4. Validar em staging:
- Agenda: cria com hora correta? ✅
- Reload: mantém hora? ✅
- Múltiplos fusos: alguém testa? ✅
```

---

## ❓ DÚVIDAS FREQUENTES

**P: Posso usar `new Date()` diretamente?**  
R: Não! Use `toLocalTime()` ou `fromLocalTime()`.

**P: Por que DATE + TIME separados?**  
R: Evita deslocamento automático de timezone.

**P: E se o usuário estiver em outro fuso?**  
R: Helpers usam `America/Sao_Paulo` fixo (clinica).

**P: Posso quebrar dados históricos?**  
R: Não, helpers garantem compatibilidade backward.

**P: Como testar em outro fuso?**  
R: VPN ou mudar timezone do SO (requer cuidado).

---

**Status:** ✅ Pronto para desenvolvimento  
**Última atualização:** 2026-05-10

