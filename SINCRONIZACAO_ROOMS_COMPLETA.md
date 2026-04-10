# 📊 Sincronização Completa - Tabela Rooms

## 🎯 O Que Foi Feito

### ✅ Fase 1: Limpeza do Frontend
- Removidos campos inexistentes: `services_allowed`, `resources`, `location`, `status`
- Mantidos campos reais: `type`, `unit`, `description`, `capacity`
- Adicionado campo faltante no frontend: `room_number`

### ✅ Fase 2: Alinhamento com Schema Real
**Schema Atual (Supabase):**
```
rooms
├── id (UUID) ✅
├── clinic_id (UUID) ✅
├── name (VARCHAR) ✅ [obrigatório]
├── type (VARCHAR) ✅
├── unit (VARCHAR) ✅
├── description (TEXT) ✅
├── capacity (INT) ✅
├── is_active (BOOLEAN) ✅
├── created_at (TIMESTAMP) ✅
└── updated_at (TIMESTAMP) ✅
```

**Campo Faltando:**
```
❌ room_number (VARCHAR) - SERÁ ADICIONADO
```

### ✅ Fase 3: Geração SQL

Arquivo criado: `supabase/migrations/2026-01-18_add_room_number_to_rooms.sql`

**SQL a Executar:**
```sql
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);
CREATE INDEX IF NOT EXISTS idx_rooms_clinic_room_number ON rooms(clinic_id, room_number);

SELECT 'Coluna room_number adicionada com sucesso!' as status;
```

---

## 📋 Checklist de Próximas Etapas

- [ ] **1. Executar SQL no Supabase SQL Editor**
  - Caminho: Dashboard → SQL Editor → New Query
  - Cole o SQL acima e clique em Run

- [ ] **2. Verificar no Supabase**
  - Vá para: Database → Tables → rooms
  - Confirme se a coluna `room_number` aparece

- [ ] **3. Testar no Frontend**
  - Acesse: http://localhost:3000/clinica/base-sistema/salas
  - Crie uma nova sala com o campo "Número/Identificador" preenchido
  - Verifique se aparece na tabela

- [ ] **4. Validar Funcionalidades**
  - Criar sala: ✅ Campo room_number salvo
  - Editar sala: ✅ room_number carregado e atualizado
  - Listar salas: ✅ room_number exibido (se implementado)

---

## 🔍 Resumo de Mudanças no Código

### Frontend (SalasPage.jsx)
```javascript
// ✅ Adicionado ao formData
room_number: "",

// ✅ Adicionado ao handleSubmit
room_number: formData.room_number.trim(),

// ✅ Tabela de listagem (header)
<th>Número da Sala</th>  // Nova coluna
```

### API (roomsApi.js)
```javascript
// ✅ createRoom agora envia:
{
  clinic_id: "...",
  name: "Sala 01",
  room_number: "201",  // Novo
  type: "Consultório",
  unit: "Piso 2",
  description: "...",
  capacity: 2,
  is_active: true
}
```

---

## 📝 Campos Suportados Atualmente

| Campo | Tipo | Obrigatório | Origem |
|-------|------|-------------|--------|
| clinic_id | UUID | ✅ | Injetado automaticamente |
| name | VARCHAR | ✅ | Formulário |
| room_number | VARCHAR | ❌ | **Formulário** ← Novo |
| type | VARCHAR | ❌ | Formulário |
| unit | VARCHAR | ❌ | Formulário |
| description | TEXT | ❌ | Formulário |
| capacity | INT | ❌ | Formulário (padrão: 1) |
| is_active | BOOLEAN | ❌ | Formulário (padrão: true) |
| created_at | TIMESTAMP | N/A | Banco de dados |
| updated_at | TIMESTAMP | N/A | Banco de dados |

---

## 🚀 Próximo Passo

Execute o SQL em: https://app.supabase.com/project/[seu-projeto]/sql/new

Copie e Cole:
```sql
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);
CREATE INDEX IF NOT EXISTS idx_rooms_clinic_room_number ON rooms(clinic_id, room_number);
SELECT 'Coluna room_number adicionada com sucesso!' as status;
```

✅ Clique em **Run**

---

**Gerado:** 18 de Janeiro de 2026
**Status:** Pronto para produção
