# ✅ PLANO IMPLEMENTAÇÃO: Timezone - Agenda Enterprise

**Status:** ✅ Arquitetura + Helpers + Testes Completos  
**Próximo:** Aplicar em Componentes  
**Estimativa:** 6-8h de desenvolvimento

---

## 📋 FASE 1: SETUP ✅ COMPLETO

- ✅ Criada arquitetura de timezone
- ✅ Criados helpers centralizados (20+ funções)
- ✅ Criados testes de validação (12 testes)
- ✅ Criada documentação de uso
- ✅ Sem impacto em código existente (tudo novo)

**Próximo passo:** Integração nos componentes

---

## 🔧 FASE 2: INTEGRAÇÃO NOS COMPONENTES

### COMPONENTE 1: AppointmentUnitedModal
**Importância:** 🔴 CRÍTICO (core do agendamento)  
**Estimativa:** 2-3h  
**Status:** ▶️ TODO

#### O que mudar:

```javascript
// ❌ Remover estas funções (substituir por helpers):
- parseLocalDate()
- formatDateToIso()
- normalizeTimeValue()
- timeToMinutes() → usar TimezoneHelpers.calculateDurationMinutes()
- minutesToTime()

// ✅ Adicionar imports:
import {
  toLocalTime,
  fromLocalTimeToDateAndTime,
  formatLocalDate,
  formatLocalTime,
  isValidLocalDate,
  isValidLocalTime,
  calculateDurationMinutes,
  addMinutesToTime,
} from '@/utils/timezoneHelpers';
```

#### Atualizações específicas:

**1. Ao carregar appointment para edit:**
```javascript
// ANTES:
setAgendamentoData((prev) => ({
  ...prev,
  date: finalAppointment.scheduled_date || '',
  time: finalAppointment.scheduled_time || '',
}));

// DEPOIS:
const local = toLocalTime(finalAppointment.created_at);
setAgendamentoData((prev) => ({
  ...prev,
  date: local.date,
  time: local.time,
}));
```

**2. Ao validar entrada do usuário:**
```javascript
// ANTES:
if (!agendamentoData.date || !agendamentoData.time) {
  return; // sem validação
}

// DEPOIS:
if (!isValidLocalDate(agendamentoData.date) || 
    !isValidLocalTime(agendamentoData.time)) {
  showError('Data ou hora inválida');
  return;
}
```

**3. Ao salvar agendamento:**
```javascript
// ANTES:
const payload = {
  scheduled_date: agendamentoData.date,
  scheduled_time: agendamentoData.time,
  // ... resto dos dados
};

// DEPOIS (idêntico - já está correto!):
const payload = {
  ...fromLocalTimeToDateAndTime(
    agendamentoData.date, 
    agendamentoData.time
  ),
  // ... resto dos dados
};
```

**4. Ao calcular duração:**
```javascript
// ANTES:
const startMinutes = timeToMinutes(agendamentoData.time);
const endMinutes = timeToMinutes(agendamentoData.endTime);
const duration = endMinutes - startMinutes;

// DEPOIS:
const duration = calculateDurationMinutes(
  agendamentoData.time,
  agendamentoData.endTime
);
```

**5. Ao adicionar minutos ao horário:**
```javascript
// ANTES:
const endTimeFormatted = minutesToTime(startMinutes + durationMinutes);

// DEPOIS:
const endTimeFormatted = addMinutesToTime(
  agendamentoData.time,
  durationMinutes
);
```

#### Testes após mudança:
- [ ] Abrir modal create
- [ ] Preencher dados e salvar
- [ ] Verificar no DB: `scheduled_date` e `scheduled_time` corretos
- [ ] Reload página e verificar horário igual
- [ ] Editar agendamento
- [ ] Salvar
- [ ] Reload e verificar horário não mudou

**Arquivo:** `src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx` (linhas 100-222)

---

### COMPONENTE 2: AgendaTimelineView
**Importância:** 🟡 ALTO (visualização principal)  
**Estimativa:** 1-1.5h  
**Status:** ▶️ TODO

#### O que mudar:

```javascript
// ✅ Adicionar imports:
import {
  formatLocalTime,
  fromLocalTime,
  fromLocalTimeToDateAndTime,
} from '@/utils/timezoneHelpers';
```

#### Atualizações específicas:

**1. Ao renderizar horários da timeline:**
```javascript
// ANTES:
const formatTime = (dateTime) => {
  const zoned = utcToZonedTime(dateTime, 'America/Sao_Paulo');
  return formatTz(zoned, 'HH:mm', { timeZone: 'America/Sao_Paulo' });
};

// DEPOIS:
const formatTime = (dateTime) => {
  const local = toLocalTime(dateTime);
  return formatLocalTime(local.time);
};
```

**2. Ao processar click em slot:**
```javascript
// ANTES:
const appointmentData = {
  start_time: startDateTime.toISOString(),
  professional_id: professionalId === 'default' ? null : professionalId,
  is_free: true,
};

// DEPOIS:
const { date, time } = toLocalTime(startDateTime.toISOString());
const appointmentData = {
  scheduled_date: date,
  scheduled_time: time,
  professional_id: professionalId === 'default' ? null : professionalId,
  is_free: true,
};
```

#### Testes após mudança:
- [ ] Renderizar timeline para um dia
- [ ] Verificar horários corretos (14:00, 14:30, 15:00, etc)
- [ ] Click em um horário
- [ ] Verificar modal abre com horário correto
- [ ] Reload página → timeline igual

**Arquivo:** `src/components/clinica/agenda/AgendaTimelineView.jsx` (linhas 135-145)

---

### COMPONENTE 3: AgendaWeekView
**Importância:** 🟡 ALTO (visualização semanal)  
**Estimativa:** 1h  
**Status:** ▶️ TODO

#### O que mudar:

```javascript
// ✅ Adicionar imports:
import {
  toLocalTime,
  formatLocalDate,
  isSameLocalDay,
} from '@/utils/timezoneHelpers';

// ❌ Remover:
import { utcToZonedTime } from 'date-fns-tz';
```

#### Atualizações específicas:

**1. Ao renderizar header com datas:**
```javascript
// ANTES:
{daysOfWeek.map((day) => (
  <div key={day.toISOString()}>
    {format(day, 'EEE', { locale: ptBR })}
    {format(day, 'dd/MM')}
  </div>
))}

// DEPOIS:
{daysOfWeek.map((day) => {
  const dayStr = day.toISOString().split('T')[0];
  return (
    <div key={dayStr}>
      {formatLocalDayOfWeek(dayStr)}
      {formatLocalDate(dayStr)}
    </div>
  );
})}
```

**2. Ao agrupar agendamentos por dia:**
```javascript
// ANTES:
const zoned = utcToZonedTime(apt.start_time, 'America/Sao_Paulo');
const dateKey = format(zoned, 'yyyy-MM-dd');

// DEPOIS:
const local = toLocalTime(apt.start_time);
const dateKey = local.date; // já está em 'yyyy-MM-dd'
```

#### Testes após mudança:
- [ ] Abrir semana view
- [ ] Verificar datas no header
- [ ] Verificar agendamentos agrupados corretamente por dia
- [ ] Mudar semana (prev/next)
- [ ] Reload página → semana igual

**Arquivo:** `src/components/clinica/agenda/AgendaWeekView.jsx` (linhas 85-160)

---

### COMPONENTE 4: AgendaMonthView
**Importância:** 🟡 ALTO (visualização mensal)  
**Estimativa:** 0.5-1h  
**Status:** ▶️ TODO

#### O que mudar:

```javascript
// ✅ Adicionar imports:
import {
  toLocalTime,
  formatLocalTime,
  formatLocalDate,
} from '@/utils/timezoneHelpers';

// ❌ Remover:
import { utcToZonedTime, format as formatTz } from 'date-fns-tz';
```

#### Atualizações específicas:

**1. Ao renderizar hora dos agendamentos no calendário:**
```javascript
// ANTES:
{list.slice(0, 3).map((apt) => {
  const zoned = utcToZonedTime(apt.start_time, 'America/Sao_Paulo');
  const startTime = formatTz(zoned, 'HH:mm', {
    timeZone: 'America/Sao_Paulo',
  });

// DEPOIS:
{list.slice(0, 3).map((apt) => {
  const local = toLocalTime(apt.start_time);
  const startTime = formatLocalTime(local.time);
```

#### Testes após mudança:
- [ ] Abrir mês view
- [ ] Verificar datas dos dias 1-31
- [ ] Verificar horários dos agendamentos
- [ ] Mudar mês (prev/next)
- [ ] Reload página → mês igual

**Arquivo:** `src/components/clinica/agenda/AgendaMonthView.jsx` (linhas 137-145)

---

### COMPONENTE 5: Drag & Drop
**Importância:** 🔴 CRÍTICO (pode deslocar hora)  
**Estimativa:** 1.5h  
**Status:** ▶️ TODO

#### Objetivo: Nunca deslocar a hora ao arrastar

#### O que mudar:

```javascript
// ✅ Adicionar imports:
import {
  toLocalTime,
  fromLocalTime,
} from '@/utils/timezoneHelpers';
```

#### Estratégia:

```javascript
// ❌ ERRADO (desploca):
function handleDragEnd(appointment, newDateTime) {
  appointment.start_time = newDateTime.toISOString();
  api.update(appointment);
}

// ✅ CORRETO:
function handleDragEnd(appointment, newDate, newTime) {
  // Converter para ISO UTC corretamente
  const isoUtc = fromLocalTime(newDate, newTime);
  api.update({
    ...appointment,
    created_at: isoUtc,
    scheduled_date: newDate,
    scheduled_time: newTime,
  });
}
```

#### Testes após mudança:
- [ ] Criar agendamento 14:30
- [ ] Arrastar para 15:00
- [ ] Verificar no DB: scheduled_time = '15:00:00'
- [ ] Reload página
- [ ] Verificar continua em 15:00
- [ ] Arrastar para outro dia
- [ ] Reload
- [ ] Verificar dia e hora correct

**Arquivo:** Procurar por `handleDragEnd` ou `onDragEnd` em componentes

---

### COMPONENTE 6: NotificationsPanel (Realtime)
**Importância:** 🟡 ALTO (sincronização)  
**Estimativa:** 0.5h  
**Status:** ▶️ TODO (já atualizado com RealtimeManager)

#### Apenas verificar:
- [ ] Usa RealtimeManager ✅
- [ ] Processa eventos com timezone correto
- [ ] Atualiza UI com hora correta

**Arquivo:** `src/components/common/NotificationsPanel.jsx`

---

## 🧪 FASE 3: VALIDAÇÃO (2-3h)

### Testes Manuais

```
[ ] TESTE 1: Create Agendamento
   1. Abrir Agenda
   2. Create novo agendamento (14:30)
   3. Verificar no DB: scheduled_time = '14:30:00'
   4. UI mostra 14:30?
   5. Reload página
   6. Continua 14:30? ✅

[ ] TESTE 2: Edit Agendamento
   1. Editar agendamento 14:30 → 15:00
   2. Salvar
   3. DB: scheduled_time = '15:00:00'
   4. Reload
   5. Continua 15:00? ✅

[ ] TESTE 3: Day View
   1. Abrir timeline view
   2. Verificar horários corretos
   3. Todos os agendamentos com hora certa?
   4. Reload
   5. Continua igual? ✅

[ ] TESTE 4: Week View
   1. Abrir week view
   2. Verificar datas e horas corretas
   3. Navegar semanas
   4. Reload
   5. Continua igual? ✅

[ ] TESTE 5: Month View
   1. Abrir month view
   2. Verificar datas corretas
   3. Verificar horas dos agendamentos
   4. Navegar meses
   5. Reload
   6. Continua igual? ✅

[ ] TESTE 6: Drag & Drop
   1. Arrastar agendamento 14:30 → 15:00
   2. Reload
   3. Continua em 15:00? ✅

[ ] TESTE 7: Múltiplos Fusos (com VPN)
   1. Conectar VPN (outro país)
   2. Abrir Agenda
   3. Horários devem estar iguais
   4. Desconectar VPN
   5. Continua igual? ✅

[ ] TESTE 8: Realtime
   1. Abrir Agenda em 2 abas
   2. Create agendamento em aba A (14:30)
   3. Aba B atualiza com 14:30?
   4. Reload aba B
   5. Continua 14:30? ✅

[ ] TESTE 9: Dados Históricos
   1. Verificar agendamentos antigos
   2. Todos com horários corretos?
   3. Nada mudou de quando foram criados?
   4. Compatibilidade backward ✅

[ ] TESTE 10: Edge Cases
   1. Agendamento midnight (00:00)
   2. Agendamento 23:00 (last do dia)
   3. Agendamento em DST transition date
   4. Todos corretos? ✅
```

### Testes Automatizados

```bash
# Rodar suite de testes no console:
window.__timezoneTests.runAllTimezoneTests();

# Ou testes individuais:
window.__timezoneTests.test1();
window.__timezoneTests.test5();
window.__timezoneTests.test9();
```

---

## 📊 CHECKLIST FINAL

### Antes de Deploy

- [ ] Todos os helpers funcionam (testes passam)
- [ ] AppointmentUnitedModal atualizado
- [ ] AgendaTimelineView atualizado
- [ ] AgendaWeekView atualizado
- [ ] AgendaMonthView atualizado
- [ ] Drag & drop atualizado
- [ ] 10 testes manuais passaram
- [ ] Dados históricos OK
- [ ] Sem quebra de compatibilidade
- [ ] Code review completo

### Deploy

```bash
# 1. Verificar imports (buscar problemas):
grep -rn "toLocaleString" src/pages/clinica/agenda
grep -rn "new Date(" src/pages/clinica/agenda | grep -v timezoneHelpers

# 2. Build:
npm run build

# 3. Validar build OK:
npm run preview

# 4. Deploy staging:
git push origin timezone-standardization

# 5. QA em staging:
- Criar agendamento
- Edit agendamento
- Reload múltiplas vezes
- Verificar dados históricos

# 6. Deploy produção:
git merge main
npm run deploy:prod

# 7. Monitor primeira hora:
- Watch para erros de timezone
- Verificar agendamentos sendo criados
- Cross-tab sync funcionando?
```

---

## 🎯 MÉTRICAS DE SUCESSO

### Antes
- ❌ Reloads podem mudar hora
- ❌ Edit/drag pode deslocar
- ❌ Múltiplas views mostram hora diferente
- ❌ Sem validação centralizada

### Depois
- ✅ Reload = mesma hora
- ✅ Edit/drag = hora não muda
- ✅ Todas as views sincronizadas
- ✅ Validação centralizada
- ✅ Código limpo e reutilizável
- ✅ Sem quebra de compatibilidade

---

## 📝 ORDEM DE EXECUÇÃO RECOMENDADA

1. **AppointmentUnitedModal** (2-3h) - Core do sistema
2. **AgendaTimelineView** (1.5h) - Visualização principal
3. **AgendaWeekView** (1h) - Secundária
4. **AgendaMonthView** (0.5h) - Terciária
5. **Drag & Drop** (1.5h) - Crítico mas isolado
6. **Validação Total** (2-3h) - Comprehensive testing

**Total: ~9-10h de desenvolvimento**

---

## 💡 DICAS

- ✅ Começar por AppointmentUnitedModal (core)
- ✅ Testar com console depois de cada mudança
- ✅ Usar `window.__timezoneTests` para validar
- ✅ Não tenha pressa - qualidade > velocidade
- ✅ Peça code review depois de cada componente
- ✅ Documente mudanças no PR

---

**Status:** 🚀 Pronto para Implementação  
**Próximo:** Começar com AppointmentUnitedModal

