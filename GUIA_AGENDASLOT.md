# 📖 GUIA DE USO - AgendaSlot.jsx

## 🎯 O Que É?

`AgendaSlot` é um componente reutilizável que renderiza um slot de horário individual na Agenda Única. Ele encapsula toda a lógica de estados, cores, ações e tooltips.

**Localização:** `src/pages/clinica/agenda/components/AgendaSlot.jsx`

---

## 📥 Import

```javascript
import AgendaSlot from './AgendaSlot';
```

---

## 🔧 Props

### Obrigatórias

| Prop | Tipo | Descrição |
|------|------|-----------|
| `time` | string (HH:MM) | Horário do slot (ex: "08:30") |
| `date` | string (YYYY-MM-DD) | Data no formato ISO (ex: "2026-01-14") |
| `appointment` | object \| null | Agendamento ou null se disponível |
| `onSlotClick` | function | Callback ao clicar no slot |

### Opcionais

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `groupId` | string | undefined | ID do profissional/sala (necessário em modos específicos) |
| `columnType` | string | null | 'professional' \| 'room' \| null (contexto visual) |
| `size` | string | 'standard' | 'compact' \| 'standard' (altura do slot) |

---

## 💡 Exemplos de Uso

### 1. Slot Disponível (Modo Padrão)

```jsx
<AgendaSlot
  time="08:30"
  date="2026-01-14"
  appointment={null}
  onSlotClick={(slot) => handleSlotClick(slot)}
  size="standard"
/>
```

**Output:** Slot verde com ações (➕ Agendar, ⏱️ Encaixar, 🔒 Bloquear)

### 2. Slot Ocupado (Modo Edição)

```jsx
<AgendaSlot
  time="09:00"
  date="2026-01-14"
  appointment={{
    id: "apt_123",
    patient_name: "Maria Silva",
    professional_name: "Dr. João Silva",
    service_name: "Consulta Clínica",
    room_name: "Sala 3",
    status: "confirmado"
  }}
  onSlotClick={(slot) => handleSlotClick(slot)}
  size="standard"
/>
```

**Output:** Slot verde (confirmado) com ações (✎ Editar, ✕ Cancelar)

### 3. Modo Compacto (Visualização por Coluna)

```jsx
<AgendaSlot
  time="10:30"
  date="2026-01-14"
  appointment={{
    id: "apt_456",
    patient_name: "João Santos",
    status: "a_confirmar"
  }}
  onSlotClick={(slot) => handleSlotClick(slot)}
  groupId="prof_789"
  columnType="professional"
  size="compact"
/>
```

**Output:** Slot menor (amarelo - a confirmar) com menos padding

---

## 📊 Dados do Appointment

Quando um agendamento é passado, o componente espera:

```javascript
{
  id: string,                    // ID único do agendamento
  patient_name: string,          // Nome do paciente
  professional_name?: string,    // Nome do profissional
  professional_id?: string,      // ID do profissional
  service_name?: string,         // Nome do serviço
  service_id?: string,           // ID do serviço
  room_name?: string,            // Nome da sala
  room_id?: string,              // ID da sala
  status: string,                // 'confirmado' | 'a_confirmar' | 'faltou' | 'encaixe' | 'bloqueado'
  start_time?: string,           // Horário de início (ISO ou HH:MM)
  // ... outros campos permitidos
}
```

---

## 🎨 Estados e Cores

O componente detecta automaticamente o status e aplica as cores:

| Status | Cor | Gradiente |
|--------|-----|-----------|
| `available` (null) | Verde | `from-gray-50 to-gray-100` → `from-green-50 to-green-100` |
| `confirmado` | Verde | `from-green-50 to-green-100` |
| `a_confirmar` | Amarelo | `from-yellow-50 to-yellow-100` |
| `faltou` | Vermelho | `from-red-50 to-red-100` |
| `encaixe` | Azul | `from-blue-50 to-blue-100` |
| `bloqueado` | Cinza | `from-gray-100 to-gray-200` |

---

## 🖱️ Ações e Callbacks

### Callback onSlotClick

Chamado quando o usuário interage com o slot. Objeto passado:

#### Slot Disponível - AGENDAR
```javascript
{
  date: "2026-01-14",
  time: "08:30",
  groupId: "prof_123",      // opcional
  type: "new"
}
```

#### Slot Disponível - ENCAIXAR
```javascript
{
  date: "2026-01-14",
  time: "08:30",
  groupId: "prof_123",      // opcional
  type: "encaixe"
}
```

#### Slot Disponível - BLOQUEAR
```javascript
{
  date: "2026-01-14",
  time: "08:30",
  groupId: "prof_123",      // opcional
  type: "bloquear"
}
```

#### Slot Ocupado - EDITAR
```javascript
{
  id: "apt_123",
  patient_name: "Maria Silva",
  // ... todos os dados do appointment
  type: "edit"
}
```

#### Slot Ocupado - CANCELAR
```javascript
{
  id: "apt_123",
  patient_name: "Maria Silva",
  // ... todos os dados do appointment
  type: "delete"
}
```

---

## 🔌 Integração com AppointmentModal

```jsx
const [selectedSlot, setSelectedSlot] = useState(null);

const handleSlotClick = (slot) => {
  setSelectedSlot(slot);
  // O modal lê o type e executa a ação apropriada
};

return (
  <>
    <AgendaSlot
      time={time}
      date={date}
      appointment={appointment}
      onSlotClick={handleSlotClick}
    />
    
    <AppointmentModal
      slot={selectedSlot}
      onClose={() => setSelectedSlot(null)}
    />
  </>
);
```

---

## 🎯 Em TimelineColumnas

O AgendaSlot é usado para renderizar cada célula:

```jsx
function TimelineColumnas({ timeSlots, groups, onSlotClick, date, columnType }) {
  return (
    // ... header e estrutura
    {timeSlots.map((time) => (
      <div key={time}>
        {columns.map(([groupId, group]) => {
          const slotAppointment = group.appointments.find(
            apt => apt.start_time?.substring(0, 5) === time
          );

          return (
            <div key={`${groupId}-${time}`}>
              <AgendaSlot
                time={time}
                date={date}
                appointment={slotAppointment || null}
                onSlotClick={onSlotClick}
                groupId={groupId}
                columnType={columnType}
                size="compact"
              />
            </div>
          );
        })}
      </div>
    ))}
  );
}
```

---

## 🎯 Customização

### Mudar Cores de Status

Edite o objeto `statusColors` no arquivo:

```javascript
const statusColors = {
  available: {
    bg: 'bg-gradient-to-br from-gray-50 to-gray-100',  // ← Editar aqui
    border: 'border-gray-200',
    hover: 'hover:from-green-50 hover:to-green-100',
    text: 'text-gray-600',
    badge: 'bg-green-50 text-green-700'
  },
  // ... outros status
};
```

### Mudar Ícones de Ação

Procure por `handleAgendar`, `handleEncaixar`, etc:

```javascript
const handleAgendar = (e) => {
  e.stopPropagation();
  onSlotClick({ date, time, groupId, type: 'new' });
};
```

E edite o botão correspondente:

```jsx
<button
  onClick={handleAgendar}
  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors duration-150 font-medium shadow-lg transform hover:scale-105"
  title="Agendar novo paciente"
>
  ➕  {/* ← Mudar ícone aqui */}
</button>
```

### Mudar Tamanho de Slot

Altere as dimensões em `slotClasses`:

```javascript
const slotClasses = size === 'compact' 
  ? 'min-h-16 p-1.5'    // ← Compact (reduzir)
  : 'min-h-20 p-2';     // ← Standard (aumentar)
```

---

## 🐛 Troubleshooting

### Problema: Tooltip não aparece
**Solução:** Verifique se `onMouseEnter` e `onMouseLeave` estão funcionando. Pode haver z-index conflitante.

```javascript
// Aumentar z-index do tooltip
<div className="... z-50 ...">
```

### Problema: Ações aparecem mas não funcionam
**Solução:** Verifique se `onSlotClick` é válido e se `e.stopPropagation()` está sendo chamado.

```javascript
const handleAgendar = (e) => {
  e.stopPropagation();  // ← Necessário!
  onSlotClick({ ... });
};
```

### Problema: Cores não aparecem
**Solução:** Verifique se Tailwind CSS está scaneando este arquivo na configuração:

```javascript
// tailwind.config.js
content: [
  "./index.html",
  "./src/**/*.{js,jsx,ts,tsx}",  // ← Deve incluir AgendaSlot.jsx
]
```

### Problema: Hover effect não funciona em mobile
**Solução:** Adicione classe `hover:` com `:hover` pseudo-class (nativo do Tailwind). Para mobile, considere usar `active:` ou adicionar touch handlers:

```javascript
const handleTouchStart = () => setShowTooltip(true);
const handleTouchEnd = () => setShowTooltip(false);

// E no elemento:
onTouchStart={handleTouchStart}
onTouchEnd={handleTouchEnd}
```

---

## 📚 Referências

- [React Hooks](https://react.dev/reference/react)
- [Tailwind CSS](https://tailwindcss.com)
- [Gradient Classes](https://tailwindcss.com/docs/gradient-color-stops)
- [Transition & Animation](https://tailwindcss.com/docs/transition-property)

---

**Versão:** 1.0  
**Compatibilidade:** React 18+ | Tailwind 3.4+  
**Última atualização:** 14 de Janeiro de 2026
