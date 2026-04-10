✅ VERIFICAÇÃO VISUAL: Unidade/Sala Implementado

═══════════════════════════════════════════════════════════════

## 👁️ O Que Você Deve Ver Agora

### ✓ Código atualizado (SEM erros)

```
✅ src/lib/professionalScheduleApi.js
   ├─ upsertSchedule() → inclui unit_name
   ├─ createProfessionalSchedule() → inclui unit_name
   ├─ updateProfessionalSchedule() → inclui unit_name
   └─ getProfessionalSchedules() → retorna unit_name

✅ src/components/base-sistema/ProfessionalScheduleTab.jsx
   ├─ State: unit_name e room_id separados
   ├─ Formulário: 2 inputs distintos
   ├─ Validação: Checa ambos + duplicata
   └─ Tabela: 2 colunas (Unidade | Sala)

✅ supabase/migrations/2026-02-14_add_unit_name_to_professional_schedules.sql
   ├─ ADD COLUMN unit_name VARCHAR(100)
   ├─ CREATE INDEX idx_professional_schedules_unit_clinic
   └─ Totalmente retrocompatível
```

## 🎬 Como Será o Comportamento (Após Migração)

### Tela 1: Modal de Profissional
```
┌──────────────────────────────────────────┐
│  Editar Profissional - Dr. João Silva    │
├──────────────────────────────────────────┤
│ [Dados] [Serviços] [Disponibilidades]   │
│                                          │
│ ABA: DISPONIBILIDADES                    │
│                                          │
│ Formulário:                              │
│ Unidade/Filial: [Matriz    ]             │
│ Sala:           [Sala 01  ▼]             │
│ Dia da Semana:  [Segunda-Feira ▼]       │
│ Hora Início:    [08:00]                  │
│ Hora Fim:       [17:00]                  │
│ Int. Início:    [12:00]                  │
│ Int. Fim:       [13:00]                  │
│ Ativo:          [✓]                      │
│                                          │
│ [Salvar] [Cancelar]                      │
│                                          │
├─────────────────────────────────────────┤
│ Tabela de Horários                       │
├─────────────────────────────────────────┤
│ Unidade │ Sala    │ Dia  │ Início│ Fim  │
├─────────────────────────────────────────┤
│ Matriz  │ Sala 01 │ Seg  │ 08:00│ 17:00│
│ Matriz  │ Sala 02 │ Seg  │ 13:00│ 18:00│
│ SP      │ Sala 01 │ Ter  │ 08:00│ 13:00│
│ RJ      │ Sala 05 │ Qua  │ 14:00│ 19:00│
│                          [Edit] [Delete]│
└──────────────────────────────────────────┘
```

### Tela 2: Detalhes dos Campos

**Campo: Unidade/Filial**
```
┌─ Tipo: TEXT INPUT
├─ Tamanho: min-w-[120px], flex-1
├─ Valores Válidos: "Matriz", "SP", "RJ", "Filial Nova", etc
├─ Obrigátório: SIM
└─ Cor na Tabela: Roxo (#9333ea)
  
Exemplo entrada do usuário:
  ┌────────────────────┐
  │ Matriz      ║      │
  └────────────────────┘
```

**Campo: Sala**
```
┌─ Tipo: DROPDOWN / SELECT
├─ Tamanho: min-w-[130px], flex-1
├─ Fonte de Dados: roomsApi (lista salas cadastradas)
├─ Obrigátório: SIM
└─ Cor na Tabela: Azul (#3b82f6)

Exemplo dropdown:
  ┌────────────────────┐
  │ Sala 01        ▼   │
  │ ├─ Sala 01       │
  │ ├─ Sala 02       │
  │ ├─ Consultório 1 │
  │ └─ Suite 3       │
  └────────────────────┘
```

## 📋 Texto em Português (Field Labels)

```
Português (PT-BR):
├─ Label: "Unidade/Filial"
├─ Label: "Sala"
├─ Placeholder: "Ex: Matriz, Filial SP"
├─ Error: "Unidade e Sala são obrigatórias"
├─ Error: "Já existe horário igual para esta sala nesta data"
└─ Success: "Horário salvo com sucesso!"

Estrutura da Tabela:
├─ Header Col 1: "Unidade"
├─ Header Col 2: "Sala"
├─ Header Col 3: "Dia"
├─ Header Col 4: "Início"
├─ Header Col 5: "Fim"
├─ Header Col 6: "Intervalo"
├─ Header Col 7: "Status"
└─ Header Col 8: "Ações"
```

## 🔍 Validações que Você Vai Ver

### Validação 1: Campos Obrigatórios
```
Se usuário clicar [Salvar] sem preencher:

❌ "Unidade/Filial: Este campo é obrigatório"
❌ "Sala: Selecione uma sala"
❌ (Outros campos também obrigatórios)
```

### Validação 2: Duplicata Prevention
```
Se usuário tentar adicionar horário EXATAMENTE igual:
(mesma Unidade + mesma Sala + mesmo Dia + mesma Hora)

❌ Erro: "Já existe uma disponibilidade de horário para
   Unidade: Matriz | Sala: Sala 01 | Dia: Segunda
   nas mesmas horas. Não é permitido adicionar duplicadas."
```

### Validação 3: Hora Fim > Hora Início
```
Se fim_hora <= inicio_hora:

❌ Erro: "A hora de término deve ser posterior 
   à hora de início"
```

## 📊 Estrutura Salva no Banco

Quando salva com sucesso, os dados no banco ficarão assim:

```sql
SELECT 
  unit_name,
  room_id,
  day_of_week,
  start_time,
  end_time,
  active
FROM professional_schedules
WHERE professional_id = 'prof-123'
ORDER BY day_of_week, start_time;

Resultado:
─────────────────────────────────────────────
unit_name │ room_id      │ day │ start │ end
─────────────────────────────────────────────
Matriz    │ uuid-room-1  │ 1   │ 08:00 │ 17:00
Matriz    │ uuid-room-2  │ 1   │ 13:00 │ 18:00
SP        │ uuid-room-1  │ 2   │ 08:00 │ 13:00
RJ        │ uuid-room-5  │ 3   │ 14:00 │ 19:00
─────────────────────────────────────────────
```

## 🎯 Casos de Uso Agora Possíveis

✅ **Caso 1:** Mesmo profissional, horário A na Sala 01 (Matriz)
```
Unidade: Matriz | Sala: Sala 01 | Seg 08-17
```

✅ **Caso 2:** Mesmo profissional, horário B na Sala 02 (Matriz)
```
Unidade: Matriz | Sala: Sala 02 | Seg 13-18
```

✅ **Caso 3:** Profissional em outra filial
```
Unidade: SP | Sala: Sala 01 | Ter 08-13
```

✅ **Caso 4:** Profissional em terceira filial
```
Unidade: RJ | Sala: Sala 05 | Qua 14-19
```

❌ **Não permitido (validação):** Duplicata
```
Unidade: Matriz | Sala: Sala 01 | Seg 08-17 (DUPLICA!)
```

## 🚨 Erros Comuns e Solução

### Erro 1: "Cannot read property 'unit_name'"
```
Causa: Migração não aplicada no Supabase
Solução: Execute SQL em supabase/migrations/ via Dashboard
```

### Erro 2: "Dropdown de Sala vazio"
```
Causa: Nenhuma sala cadastrada para a clínica
Solução: 
  1. Abra /clinica/base-sistema/salas
  2. Cadastre pelo menos uma sala
  3. Tente novamente
```

### Erro 3: "Tabela não mostra Unidade"
```
Causa: Cache do navegador ou dados antigos
Solução: 
  1. F12 → Application → Storage → Clear All
  2. Feche e abra novamente
  3. npm run dev (se desenvolvedora)
```

## 💡 Resumo do Que Mudou

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Campos** | 1 combinado | 2 independentes |
| **Unidade** | Part of single field | `unit_name` (VARCHAR) |
| **Sala** | Part of single field | `room_id` (UUID FK) |
| **Validação** | Simples | Unit+Room+Day+Time |
| **Tabela** | 1 coluna combinada | 2 colunas separadas |
| **BD Storage** | String concatenada | Tipos normalizados |
| **Filtros** | Difícil por unidade | Fácil com índice |

═══════════════════════════════════════════════════════════════
Status: ✅ IMPLEMENTAÇÃO VISUAL COMPLETA
Próximo: Aplicar migração SQL e testar
