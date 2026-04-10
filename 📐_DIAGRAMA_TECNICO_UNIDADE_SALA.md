📐 DIAGRAMA TÉCNICO: Fluxo Unidade/Sala Independentes

═══════════════════════════════════════════════════════════════

## 🎨 Visão Geral da Estrutura

```
┌─────────────────────────────────────────────────────────────┐
│                    ProfionalScheduleTab                     │
│  (React Component)                                          │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├─ State: newSchedule
               │   ├─ unit_name: "" (text input)
               │   ├─ room_id: "" (dropdown)
               │   ├─ day_of_week, start_time, end_time
               │   └─ ... outras props
               │
               ├─ Form Fields
               │   ├─ <input type="text"> Unidade
               │   └─ <select> Sala (carregado de roomsApi)
               │
               └─ Tabela de Resultados
                   ├─ Col 1: Unidade (unit_name) - Roxo
                   └─ Col 2: Sala (room.name) - Azul

         ↓↓↓ API Calls ↓↓↓

┌─────────────────────────────────────────────────────────────┐
│          professionalScheduleApi.js                         │
│  (Business Logic Layer)                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ▶ getProfessionalSchedules(professionalId)                 │
│   └─ SELECT * FROM professional_schedules                  │
│      Returns: schedules with unit_name + room_id           │
│                                                             │
│ ▶ upsertSchedule(clinicId, professionalId, data)          │
│   ├─ INSERT: includes unit_name, room_id                   │
│   └─ UPDATE: includes unit_name, room_id                   │
│                                                             │
│ ▶ createProfessionalSchedule(clinicId, data)              │
│   └─ INSERT: includes unit_name, room_id                   │
│                                                             │
│ ▶ updateProfessionalSchedule(id, data)                    │
│   └─ UPDATE: includes unit_name, room_id                   │
│                                                             │
│ ▶ deleteProfessionalSchedule(id)                          │
│   └─ DELETE                                                │
│                                                             │
└────────────────┬────────────────────────────────────────────┘
                 │
          ↓↓↓ Supabase Client ↓↓↓
                 │
┌────────────────────────────────────────────────────────────┐
│              Banco de Dados PostgreSQL                     │
│                                                            │
│ Tabela: professional_schedules                            │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ id (UUID Primary Key)                                │ │
│ │ clinic_id (UUID FK)                                  │ │
│ │ professional_id (UUID FK)                            │ │
│ │ unit_name (VARCHAR(100)) ← NOVO CAMPO               │ │
│ │ room_id (UUID FK → rooms.id)                         │ │
│ │ day_of_week (INT)                                    │ │
│ │ start_time (TIME)                                    │ │
│ │ end_time (TIME)                                      │ │
│ │ break_start (TIME)                                   │ │
│ │ break_end (TIME)                                     │ │
│ │ active (BOOLEAN)                                     │ │
│ │ created_at, updated_at (TIMESTAMP)                   │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                            │
│ Índices:                                                   │
│ - idx_professional_schedules_professional                 │
│ - idx_professional_schedules_clinic                       │
│ - idx_professional_schedules_unit_clinic (NOVO)          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## 🔄 Fluxo de Dados Completo

```
╔════════════════════════════════════════════════════════════╗
║                ADICIONAR NOVO HORÁRIO                      ║
╚════════════════════════════════════════════════════════════╝

1. Layout Formulário
   ┌─────────────────────────────┐
   │ Unidade/Filial:    [Matriz] │
   │ Sala:              [Sala 01]│ (carregado de roomsApi)
   │ Dia da Semana:     [Seg..] │
   │ Hora Início:       [08:00] │
   │ Hora Fim:          [17:00] │
   │ Intervalo Início:  [12:00] │
   │ Intervalo Fim:     [13:00] │
   │ Ativo:             [✓]     │
   │                           │
   │ [Salvar] [Cancelar]         │
   └─────────────────────────────┘

2. Validação (no komponente)
   ├─ unit_name: não vazio? ✓
   ├─ room_id: selecionado? ✓
   ├─ day_of_week: válido? ✓
   ├─ start_time: válido? ✓
   ├─ end_time: > start_time? ✓
   └─ Duplicata?
      └─ Existe (unit_name=Matriz + room_id=ID + day=1 + times=iguais)?
         ├─ SIM: Mostrar erro "Já existe horário igual"
         └─ NÃO: Prosseguir

3. API Call
   upsertSchedule(
     clinicId: "abc-123",
     professionalId: "prof-456",
     data: {
       unit_name: "Matriz",
       room_id: "room-789",
       day_of_week: 1,
       start_time: "08:00",
       end_time: "17:00",
       break_start: "12:00",
       break_end: "13:00",
       active: true
     }
   )

4. Supabase INSERT
   INSERT INTO professional_schedules (
     clinic_id, professional_id, unit_name, room_id,
     day_of_week, start_time, end_time, break_start,
     break_end, active, created_at
   ) VALUES (
     'abc-123', 'prof-456', 'Matriz', 'room-789',
     1, '08:00', '17:00', '12:00', '13:00',
     true, CURRENT_TIMESTAMP
   )
   RETURNING *

5. Carrega em Tabela
   ┌─────────────────────────────────────────────────┐
   │ Unidade │ Sala     │ Dia │ Início  │ Fim  │ ... │
   ├─────────────────────────────────────────────────┤
   │ Matriz  │ Sala 01  │ Seg │ 08:00   │ 17:00│ ... │
   │ (roxo)  │ (azul)   │     │         │      │     │
   └─────────────────────────────────────────────────┘

6. Atualizar UI
   └─ Tabela reatualiza
   └─ Formulário limpa
   └─ Toast: "Horário salvo com sucesso"
```

## 🔀 Comparação: Antes vs Depois

### ANTES (Combinado)
```jsx
const newSchedule = {
  salaUnidade: "",  // Campo único
  day_of_week: "",
  ...
}

// No formulário
<select name="salaUnidade">
  <option>Matriz - Sala 01</option>
  <option>Matriz - Sala 02</option>
  <option>SP - Sala 01</option>
  <option>RJ - Sala 01</option>
</select>

// Na BD
room_id: "Matriz - Sala 01" (string!)
```

### DEPOIS (Independente)
```jsx
const newSchedule = {
  unit_name: "Matriz",     // Unidade
  room_id: "abc-uuid",     // Sala
  day_of_week: "",
  ...
}

// No formulário
<input type="text" value="Matriz" />      // Unidade
<select>
  <option value="abc-uuid">Sala 01</option>
  <option value="def-uuid">Sala 02</option>
</select>

// Na BD
unit_name VARCHAR(100) = "Matriz"
room_id UUID = "abc-uuid" (FK)
```

## 📊 Dados de Exemplo

```
Banco de Dados (PostgreSQL):

id                                  | clinic_id | prof_id | unit_name | room_id | day | start  | end   | active
────────────────────────────────────┼───────────┼─────────┼───────────┼─────────┼─────┼────────┼───────┼────────
550e8400-e29b-41d4-a716-446655440000│ 111...    │ prof-1  │ Matriz    │ room-1  │ 1   │ 08:00  │ 17:00 │ true
660e8400-e29b-41d4-a716-446655440000│ 111...    │ prof-1  │ Matriz    │ room-2  │ 1   │ 08:00  │ 12:00 │ true
770e8400-e29b-41d4-a716-446655440000│ 111...    │ prof-1  │ SP        │ room-1  │ 2   │ 13:00  │ 17:00 │ true
880e8400-e29b-41d4-a716-446655440000│ 111...    │ prof-2  │ RJ        │ room-5  │ 3   │ 09:00  │ 18:00 │ true
```

## ✅ Checklist de Componentes

```
✅ ProfessionalScheduleTab.jsx
   ├─ [x] State com unit_name e room_id separados
   ├─ [x] Carrega rooms via roomsApi
   ├─ [x] Dois campos no formulário
   ├─ [x] Validação dual-field
   ├─ [x] Tabela com 2 colunas
   └─ [x] Edit/Delete funcionam

✅ professionalScheduleApi.js
   ├─ [x] upsertSchedule() aceita unit_name
   ├─ [x] createProfessionalSchedule() aceita unit_name
   ├─ [x] updateProfessionalSchedule() aceita unit_name
   ├─ [x] getProfessionalSchedules() retorna unit_name
   └─ [x] deleteProfessionalSchedule() funciona

✅ Migração SQL
   ├─ [x] Adiciona coluna unit_name
   ├─ [x] Cria índice para performance
   └─ [x] Compatível com dados existentes

✅ Validações
   ├─ [x] Verifica obrigatoriedade
   ├─ [x] Previne duplicatas (unit + room + day + time)
   ├─ [x] Mensagens de erro claras
   └─ [x] Feedback visual no form
```

═══════════════════════════════════════════════════════════════
Documentação Técnica Completa
Data: 2026-02-14
