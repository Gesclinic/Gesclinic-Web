📋 RESUMO: Implementação de Campos Independentes Unidade/Filial e Sala

═══════════════════════════════════════════════════════════════

## 🎯 Objetivo
Separar os campos "Unidade/Filial" e "Sala" como campos INDEPENDENTES no formulário de horários de profissionais, em vez de combinados.

## ✅ Alterações Realizadas

### 1️⃣ Banco de Dados - Migração SQL
**Arquivo:** `supabase/migrations/2026-02-14_add_unit_name_to_professional_schedules.sql`
- Adicionada coluna `unit_name VARCHAR(100)` à tabela `professional_schedules`
- Criado índice para performance: `idx_professional_schedules_unit_clinic`
- Campo aceita NULL para compatibilidade retroativa

### 2️⃣ API Layer - professionalScheduleApi.js
**Atualizações em 3 funções:**

#### a) createProfessionalSchedule()
- Antes: Não incluía unit_name nem room_id
- Depois: Inclui ambos os campos no INSERT
```javascript
unit_name: data.unit_name || null,
room_id: data.room_id || null,
```

#### b) upsertSchedule() - PRINCIPAIS MUDANÇAS
- Antes: Combinava sala + unidade em um único campo
- Depois: Trata como campos independentes
- Aplicável em both CREATE e UPDATE operations
```javascript
unit_name: data.unit_name || null,      // Novo
room_id: data.room_id || null,          // Mantém
```

#### c) updateProfessionalSchedule()
- Antes: Não incluía unit_name nem room_id
- Depois: Inclui ambos os campos no UPDATE
```javascript
unit_name: data.unit_name || null,
room_id: data.room_id || null,
```

### 3️⃣ UI Component - ProfessionalScheduleTab.jsx
**Estado:** Já estava atualizado
- ✅ newSchedule.unit_name definido no estado inicial
- ✅ Validação incluindo unit_name
- ✅ Duplicata prevention: verifica unit_name + room_id + day + times
- ✅ Formulário com dois campos distintos:
  - Input text: "Unidade/Filial" (120px min)
  - Dropdown: "Sala" (130px min)
- ✅ Tabela com duas colunas separadas:
  - Coluna 1: Unidade (texto roxo)
  - Coluna 2: Sala (texto azul)

## 🔄 Fluxo de Dados

```
Usuário Preenche Formulário
    ↓
    ├─ Unidade/Filial (text input) → newSchedule.unit_name
    └─ Sala (dropdown) → newSchedule.room_id
    ↓
Validação (requer ambos SE necessário)
    ↓
API Call: upsertSchedule(clinicId, professionalId, data)
    ↓
Banco de Dados
    ├─ unit_name VARCHAR(100)
    └─ room_id UUID (FK → rooms.id)
    ↓
Resultado Salvo e Exibido na Tabela
```

## 📊 Estrutura de Dados

### Tabela: professional_schedules
```sql
├─ id (UUID) - Primary Key
├─ clinic_id (UUID) - Foreign Key
├─ professional_id (UUID) - Foreign Key
├─ unit_name (VARCHAR(100)) ← NOVO: Unidade/Filial
├─ room_id (UUID) ← FK → rooms.id
├─ day_of_week (INT)
├─ start_time (TIME)
├─ end_time (TIME)
├─ break_start (TIME)
├─ break_end (TIME)
└─ active (BOOLEAN)
```

## ✔️ Validações Implementadas

1. **Obrigatoriedade:** Ambos os campos são necessários
2. **Duplicata Prevention:**
   ```javascript
   Check: unit_name + room_id + day_of_week + start_time + end_time
   ```
3. **Tipos de Dados:**
   - unit_name: string (até 100 caracteres)
   - room_id: UUID (deve existir em rooms)
   - Ambos: podem ser NULL se campo não obrigatório

## 🚀 Próximos Passos

1. **Aplicar Migração:**
   ```powershell
   # Executar via Supabase CLI ou Dashboard
   psql -U postgres -d seu_db -f supabase/migrations/2026-02-14_add_unit_name_to_professional_schedules.sql
   ```

2. **Testar Fluxo Completo:**
   - [ ] Adicionar novo horário com Unidade e Sala
   - [ ] Validar salvamento correto em base
   - [ ] Testar update de horário existente
   - [ ] Testar validação de duplicatas
   - [ ] Testar delete de horário

3. **Verificar Dados Existentes:**
   - [ ] Horários antigos terão unit_name como NULL
   - [ ] Migrar dados se necessário

## 📝 Notas Importantes

- **Retrocompatibilidade:** Campos são NULL por padrão
- **Flexibilidade:** Text input permite qualquer unidade, sem necessidade de cadastro prévio
- **Escalabilidade:** Se unidades forem a table de referência, mudança simples de dropdown
- **Performance:** Índice criado para filtros frequentes

═══════════════════════════════════════════════════════════════
Status: ✅ IMPLEMENTAÇÃO COMPLETA
Data: 2026-02-14
