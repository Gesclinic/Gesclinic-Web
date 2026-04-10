# 🚀 QUICK START - AGENDA POR PROFISSIONAL

## ⚡ Em 2 Minutos

### Ver em Ação
1. Acesse: `http://localhost:3000/clinica/agenda`
2. Clique em **"Por Profissional"** (tab no topo)
3. Observe as colunas paralelas com profissionais

### O Que Você Vê
```
HEADER (Sticky)
├─ Nome do profissional
├─ Especialidade
├─ Taxa de ocupação (com barra)
├─ Total de agendamentos
└─ Vagas disponíveis

SLOTS (Grid)
├─ Coluna de horários (fixa à esquerda)
├─ Slot disponível → Verde + ações rápidas
└─ Slot ocupado → Cor do status + editar
```

---

## 🎨 Componentes

### Novo: ProfessionalColumnHeader
**Local:** `src/pages/clinica/agenda/components/ProfessionalColumnHeader.jsx`

**Responsabilidades:**
- Exibir nome + especialidade
- Calcular e exibir taxa de ocupação
- Mostrar vagas disponíveis
- Avisar quando agenda está lotada

**Props:**
```javascript
{
  groupId: string,           // ID do profissional/sala
  group: object,            // { name, specialty, appointments }
  columnType: string,       // 'professional' | 'room'
  totalSlots: number        // Total de horários do dia
}
```

### Refatorado: AgendaTimeline
**Local:** `src/pages/clinica/agenda/components/AgendaTimeline.jsx`

**Mudanças:**
- Agora importa `ProfessionalColumnHeader`
- Renderiza headers com métricas
- Mantém AgendaSlot para slots individuais
- Scroll sincronizado (sticky headers + coluna)

---

## 📊 Métricas Calculadas

### Taxa de Ocupação
```
0-49%   → Verde  (✓ Muitas vagas)
50-74%  → Amarelo (⚠ Poucas vagas)
75-100% → Vermelho (🔴 Lotado)
```

### Vagas Disponíveis
```
> 5 vagas  → Verde [✓ 6 vagas livres]
1-5 vagas  → Amarelo [⚠ 2 vagas livres]
0 vagas    → Vermelho [🔴 Dia completo]
```

---

## 🔄 Como Funciona

### 1. Detecta Modo
```javascript
if (viewMode === 'profissional') {
  // Agrupa agendamentos por profissional
  // Renderiza TimelineColumnas
}
```

### 2. Agrupa Dados
```javascript
{
  'prof_001': {
    name: 'Dr. João',
    specialty: 'Cardiologia',
    appointments: [...]
  },
  'prof_002': {
    name: 'Dra. Maria',
    specialty: 'Dermatologia',
    appointments: [...]
  }
}
```

### 3. Renderiza Colunas
```
Para cada profissional:
├─ Header (ProfessionalColumnHeader)
│  ├─ Nome + Especialidade
│  ├─ Taxa de ocupação
│  └─ Vagas disponíveis
└─ Slots (AgendaSlot)
   ├─ Para cada horário
   ├─ Disponível = verde
   └─ Ocupado = cor do status
```

---

## 🎯 Usando o Componente

### Em AgendaPage.jsx
```jsx
<AgendaTimeline
  viewMode={agenda.viewMode}          // 'profissional'
  date={agenda.date}
  appointments={agenda.filteredAppointments}
  onSlotClick={handleSlotClick}
  metadata={agenda.metadata}
/>
```

### Em TimelineColumnas
```jsx
<ProfessionalColumnHeader
  groupId={groupId}
  group={group}
  columnType="professional"
  totalSlots={timeSlots.length}
/>
```

---

## 🎨 Customizações Rápidas

### Mudar cores de ocupação
**Arquivo:** `ProfessionalColumnHeader.jsx`

Procure por:
```javascript
const isHighOccupancy = metrics.occupationRate >= 75;  // ← Editar limite
```

### Mudar tamanho de coluna
**Arquivo:** `AgendaTimeline.jsx`

Procure por:
```javascript
className="flex-1 min-w-64"  // ← Mudar min-w-64 para min-w-80, etc
```

### Mudar cores da barra
**Arquivo:** `ProfessionalColumnHeader.jsx`

Procure por:
```javascript
const occupancyColor = isHighOccupancy
  ? 'bg-red-500'      // ← Mudar cor vermelha
  : 'bg-yellow-500'   // ← Mudar cor amarela
  : 'bg-green-500';   // ← Mudar cor verde
```

---

## 🐛 Troubleshooting

### Header não aparece
**Solução:** Verifique se `viewMode === 'profissional'` está sendo setado.

### Colunas muito estreitas
**Solução:** Aumente `min-w-64` para `min-w-80` ou maior em TimelineColumnas.

### Métricas não atualizam
**Solução:** Verifique se `totalSlots` está sendo passado corretamente.

### Scroll não funciona
**Solução:** Verifique `overflow-x-auto` e `sticky` classes no container.

---

## 📱 Responsividade

### Desktop (> 1024px)
✅ Múltiplas colunas visíveis  
✅ Header completo  
✅ Scroll horizontal quando necessário

### Tablet (768-1024px)
✅ 1-2 colunas visíveis  
✅ Header compacto  
✅ Scroll horizontal

### Mobile (< 768px)
✅ Usa TimelineGeral (tabela)  
✅ Melhor para toque

---

## 🎓 Referência Rápida

| O Que | Onde | Como |
|------|------|------|
| Ver em ação | URL | http://localhost:3000/clinica/agenda |
| Mudar cores | ProfessionalColumnHeader.jsx | Editar `statusColors` |
| Mudar tamanho | AgendaTimeline.jsx | Editar `min-w-64` |
| Adicionar métrica | ProfessionalColumnHeader.jsx | Editar `metrics` |
| Adicionar ícone | ProfessionalColumnHeader.jsx | Editar ícone emoji |

---

## ✅ Checklist

- [x] Componente ProfessionalColumnHeader criado
- [x] AgendaTimeline refatorado
- [x] Métricas calculadas corretamente
- [x] Cores dinâmicas aplicadas
- [x] Scroll sincronizado funcionando
- [x] Integração com AgendaSlot OK
- [x] Responsividade implementada
- [x] Sem erros de compilação

---

## 📞 Próximas Funcionalidades

1. **Avatar do profissional** - Mostrar foto
2. **Drag & Drop** - Mover agendamentos
3. **Filtro de especialidade** - Mostrar apenas certas especialidades
4. **Comparação** - Ver 2-3 profissionais lado-a-lado
5. **Relatório** - Exportar por profissional

---

**Pronto para usar!** 🚀
