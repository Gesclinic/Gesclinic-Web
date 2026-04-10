# 💻 EXEMPLOS PRÁTICOS - AgendaSlot

## 🎬 Cenários de Uso Real

### Cenário 1: Visualização por Profissional

Usuário clica em "Por Profissional" e vê as colunas de cada profissional.

```jsx
// Em AgendaTimeline.jsx → TimelineColumnas()

function TimelineColumnas({ timeSlots, groups, onSlotClick, date, columnType }) {
  // groups = {
  //   'prof_001': {
  //     name: 'Dr. João Silva',
  //     appointments: [
  //       { id: 'apt_1', start_time: '08:30', patient_name: 'Maria', status: 'confirmado' },
  //       { id: 'apt_2', start_time: '09:00', patient_name: 'Pedro', status: 'a_confirmar' },
  //     ]
  //   },
  //   'prof_002': { name: 'Dra. Ana Costa', appointments: [...] }
  // }

  return (
    <div className="grid">
      {/* Header com nomes dos profissionais */}
      <div className="flex">
        {columns.map(([profId, prof]) => (
          <div key={profId} className="flex-1">
            <h3>👨‍⚕️ {prof.name}</h3>
            <span className="text-xs">{prof.appointments.length} agendamentos</span>
          </div>
        ))}
      </div>

      {/* Grid de slots */}
      {timeSlots.map((time) => (
        <div key={time} className="flex">
          {columns.map(([profId, prof]) => {
            const apt = prof.appointments.find(a => a.start_time?.substring(0, 5) === time);

            return (
              <AgendaSlot
                key={`${profId}-${time}`}
                time={time}
                date={date}
                appointment={apt || null}
                onSlotClick={onSlotClick}
                groupId={profId}
                columnType="professional"
                size="compact"
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

**Fluxo de Usuário:**
1. Vê coluna "Dr. João Silva" com 3 agendamentos
2. Vê slot 08:30 ocupado (verde) → Hover → [✎ Editar] [✕ Cancelar]
3. Vê slot 09:00 vazio → Hover → [➕] [⏱️] [🔒]
4. Clica [➕] → Modal abre para novo agendamento em 09:00
5. Seleciona paciente, serviço, etc e confirma

---

### Cenário 2: Visualização por Sala

Usuário clica em "Por Sala" e vê as colunas de cada sala.

```jsx
// Em AgendaTimeline.jsx → TimelineColumnas()

// groups = {
//   'room_001': {
//     name: 'Sala 1',
//     appointments: [
//       { id: 'apt_3', start_time: '08:00', patient_name: 'Carlos', status: 'faltou' },
//     ]
//   },
//   'room_002': { name: 'Sala 2', appointments: [...] }
// }

// ⚠️ O resto é idêntico ao cenário anterior
// O componente AgendaSlot se adapta automaticamente via `columnType`
```

**Diferença Visual:**
- Header mostra 🏥 (sala) em vez de 👨‍⚕️ (profissional)
- Comportamento é exatamente o mesmo

---

### Cenário 3: Visualização Geral (Tabela)

Usuário vê todos os agendamentos em formato tabela (TimelineGeral).

```jsx
// Em AgendaTimeline.jsx → TimelineGeral()

function TimelineGeral({ timeSlots, appointments, onSlotClick, date }) {
  const appointmentsByTime = {};
  appointments.forEach(apt => {
    const time = apt.start_time?.substring(0, 5);
    if (!appointmentsByTime[time]) appointmentsByTime[time] = [];
    appointmentsByTime[time].push(apt);
  });

  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Horário</th>
          <th>Paciente</th>
          <th>Profissional</th>
          <th>Serviço</th>
          <th>Sala</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {timeSlots.map((time) => {
          const appts = appointmentsByTime[time] || [];

          if (appts.length === 0) {
            return (
              <tr key={`empty-${time}`} className="hover:bg-green-50">
                <td>{time}</td>
                <td colSpan="5">✓ Disponível</td>
                <td>
                  <button onClick={() => onSlotClick({ date, time, type: 'new' })}>
                    ➕ Agendar
                  </button>
                </td>
              </tr>
            );
          }

          return appts.map((apt) => (
            <tr key={apt.id} className="hover:shadow-md">
              <td>{time}</td>
              <td>{apt.patient_name}</td>
              <td>{apt.professional_name}</td>
              <td>{apt.service_name}</td>
              <td>{apt.room_name}</td>
              <td className="bg-green-50">✓ Confirmado</td>
              <td>
                <button onClick={() => onSlotClick({ ...apt, type: 'edit' })}>
                  ✎ Editar
                </button>
              </td>
            </tr>
          ));
        })}
      </tbody>
    </table>
  );
}

// ⚠️ TimelineGeral NÃO usa AgendaSlot (é tabela simples)
// AgendaSlot é usado apenas em TimelineColumnas (modo grid)
```

---

## 🔄 Fluxos de Ação

### Fluxo 1: NOVO AGENDAMENTO

```
[Slot Disponível] 
  ↓ (hover)
[➕ Agendar] [⏱️ Encaixar] [🔒 Bloquear]
  ↓ (click ➕)
onSlotClick({ date, time, groupId, type: 'new' })
  ↓
AppointmentModal abre com formulário vazio
  ↓ (preenche dados)
Clica "Salvar"
  ↓
createAppointment(data) → Supabase
  ↓
Slot muda para ocupado com cor correspondente
```

**Código no Modal:**
```javascript
if (slot.type === 'new') {
  // Formulário vazio
  setFormData({
    date: slot.date,
    time: slot.time,
    professional_id: slot.groupId, // Se em modo profissional
    room_id: slot.groupId,          // Se em modo sala
  });
}
```

---

### Fluxo 2: EDITAR AGENDAMENTO

```
[Slot Ocupado - Maria Silva]
  ↓ (hover)
[✎ Editar] [✕ Cancelar]
  ↓ (click ✎)
onSlotClick({ id: 'apt_123', patient_name: 'Maria', ..., type: 'edit' })
  ↓
AppointmentModal abre com dados preenchidos
  ↓ (altera status/horário/etc)
Clica "Salvar"
  ↓
updateAppointment(id, data) → Supabase
  ↓
Slot atualiza com nova cor (se status mudou)
```

**Código no Modal:**
```javascript
if (slot.type === 'edit') {
  // Busca dados do agendamento
  const appointment = await buscarAgendamentoPorId(slot.id);
  // Preenche formulário
  setFormData({
    id: appointment.id,
    patient_name: appointment.patient_name,
    status: appointment.status,
    // ... outros campos
  });
}
```

---

### Fluxo 3: ENCAIXE

```
[Slot Disponível]
  ↓ (hover)
[➕] [⏱️ Encaixar] [🔒]
  ↓ (click ⏱️)
onSlotClick({ date, time, groupId, type: 'encaixe' })
  ↓
AppointmentModal abre em modo ENCAIXE
  ↓ (preenche dados)
Status é automaticamente setado para 'encaixe'
  ↓
Slot fica azul com "⚡ Encaixe"
```

**Diferença:** Status é marcado como encaixe (geralmente sem agendamento prévio)

---

### Fluxo 4: BLOQUEAR HORÁRIO

```
[Slot Disponível]
  ↓ (hover)
[➕] [⏱️] [🔒 Bloquear]
  ↓ (click 🔒)
onSlotClick({ date, time, groupId, type: 'bloquear' })
  ↓
Cria agendamento especial com status 'bloqueado'
  ↓
Slot fica cinza com "🔒 Bloqueado"
  ↓
Ninguém pode agendar neste slot
```

---

## 🎨 Mudanças Visuais em Tempo Real

### Estado 1: Vazio
```jsx
<AgendaSlot
  time="08:30"
  date="2026-01-14"
  appointment={null}  // ← null = vazio
  onSlotClick={...}
/>
```

**Visual:**
```
┌─────────────────┐
│      ✓          │
│  Disponível     │
└─────────────────┘
Cor: from-gray-50 to-gray-100
Hover: from-green-50 to-green-100
```

---

### Estado 2: Confirmado
```jsx
<AgendaSlot
  time="08:30"
  date="2026-01-14"
  appointment={{
    id: 'apt_1',
    patient_name: 'Maria Silva',
    professional_name: 'Dr. João',
    service_name: 'Consulta',
    status: 'confirmado'  // ← status muda cor
  }}
  onSlotClick={...}
/>
```

**Visual:**
```
┌─────────────────┐
│ Maria Silva     │
│ 📋 Consulta     │
│ [✓ Confirmado]  │
└─────────────────┘
Cor: from-green-50 to-green-100
Border-left: green-200
```

---

### Estado 3: A Confirmar
```jsx
appointment={{ ..., status: 'a_confirmar' }}
```

**Visual:**
```
┌─────────────────┐
│ João Santos     │
│ 📋 Consulta     │
│ [⚠ A Confirmar] │
└─────────────────┘
Cor: from-yellow-50 to-yellow-100
Border-left: yellow-200
```

---

### Estado 4: Faltou
```jsx
appointment={{ ..., status: 'faltou' }}
```

**Visual:**
```
┌─────────────────┐
│ Carlos Costa    │
│ 📋 Consulta     │
│ [✕ Faltou]      │
└─────────────────┘
Cor: from-red-50 to-red-100
Border-left: red-200
```

---

## 🔌 Integração Completa

Exemplo de uso em `AgendaPage.jsx`:

```jsx
import AgendaTimeline from './components/AgendaTimeline';
import AppointmentModal from './components/AppointmentModal';
import { useAgendaStore } from './hooks/useAgendaStore';

export default function AgendaPage() {
  const agenda = useAgendaStore();

  const handleSlotClick = (slot) => {
    // Armazena o slot selecionado
    agenda.selectSlot(slot);
    // Modal será renderizado em outro lugar
  };

  const handleSaveAppointment = async (formData) => {
    if (formData.id) {
      // Editar
      await updateAppointment(formData.id, formData);
    } else {
      // Novo
      await createAppointment(formData);
    }
    // Recarrega agenda
    await loadAgendaData();
    agenda.deselectSlot();
  };

  return (
    <>
      {/* Timeline com AgendaSlot */}
      <AgendaTimeline
        viewMode={agenda.viewMode}
        date={agenda.date}
        appointments={agenda.filteredAppointments}
        onSlotClick={handleSlotClick}
        metadata={agenda.metadata}
      />

      {/* Modal compartilhado */}
      {agenda.selectedSlot && (
        <AppointmentModal
          slot={agenda.selectedSlot}
          onSave={handleSaveAppointment}
          onClose={() => agenda.deselectSlot()}
        />
      )}
    </>
  );
}
```

---

## 📱 Responsividade

### Desktop (> 1024px)
```
┌──────────────────────────────────────────────────┐
│ 👨‍⚕️ Dr. João Silva    │ 🏥 Sala 1              │
│   3 agendamentos        │   2 agendamentos       │
├────────────┬────────────┼───────────┬────────────┤
│ 08:30      │ 08:30      │           │ 08:30      │
│ Maria ✓    │ Disponível │ João ⚠    │ Carlos ✕   │
├────────────┼────────────┼───────────┼────────────┤
│ 09:00      │ 09:00      │           │ 09:00      │
│ Disponível │ Pedro ✓    │ Disponível│ Disponível │
```

- Colunas visíveis: 2-4
- Slot height: 80px (min-h-20)
- Header sticky

### Tablet (768-1024px)
```
┌──────────────────────────────────┐
│ 👨‍⚕️ Dr. João │ 🏥 Sala 1      │
│   3 aptos   │   2 aptos      │
├──────────────┼────────────────┤
│ 08:30        │ 08:30          │
│ Maria ✓      │ Disponível     │
├──────────────┼────────────────┤
```

- Colunas visíveis: 1-2 (scroll horizontal)
- Slot height: 64px (min-h-16, compact)
- Ainda com header sticky

### Mobile (< 768px)
Usa TimelineGeral (tabela) em vez de TimelineColumnas (grid)

```
┌──────────────────────────┐
│ Horário │ Paciente       │
├─────────┼────────────────┤
│ 08:30   │ Maria ✓        │
│         │ Dr. João       │
├─────────┼────────────────┤
│ 09:00   │ Disponível     │
├─────────┼────────────────┤
```

---

**Versão:** 1.0  
**Exemplos:** 4 cenários principais  
**Última atualização:** 14 de Janeiro de 2026
