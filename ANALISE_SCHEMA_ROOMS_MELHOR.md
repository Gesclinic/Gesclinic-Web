# 🔍 Análise: O Schema Atual é o Melhor?

## 📊 Schema Atual

```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  unit VARCHAR(100),
  
  description TEXT,
  capacity INT,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## ✅ O Que Está Bom

| Aspecto | Status | Por Quê |
|--------|--------|--------|
| **Chave Primária** | ✅ | UUID é standard moderno, melhor que INT sequencial |
| **Foreign Key** | ✅ | Referência correta a clinics com ON DELETE CASCADE |
| **Timestamps** | ✅ | created_at e updated_at são padrão (auditoria) |
| **is_active** | ✅ | Soft delete é melhor que deletar físicamente |
| **Normalização** | ✅ | Dados atomizados corretamente |

---

## ⚠️ O Que Poderia Melhorar

### 1️⃣ FALTA `room_number` (Identificador)

**Problema:**
```
Você tem:
- id: "550e8400-e29b-41d4-a716-446655440000" (UUID técnico)
- name: "Consultório A"

Mas usuario quer:
- Número: "201" ou "A1" (humanamente legível)
```

**Recomendação:** ✅ ADICIONAR
```sql
room_number VARCHAR(50) UNIQUE NOT NULL
```

---

### 2️⃣ FALTAM CONSTRAINTS

**Problema:** Campos opcionais que talvez devessem ser obrigatórios

**Atual:**
```sql
type VARCHAR(50),          -- opcional
unit VARCHAR(100),         -- opcional
capacity INT,              -- pode ser NULL
```

**Recomendação:**
```sql
type VARCHAR(50) NOT NULL CHECK (type IN ('consultation', 'surgery', 'therapy', 'other')),
unit VARCHAR(100),         -- manter opcional (pode não ter)
capacity INT NOT NULL DEFAULT 1 CHECK (capacity > 0),
```

---

### 3️⃣ FALTAM ÍNDICES ADEQUADOS

**Atual:** Só tem índices básicos

**Recomendação adicionar:**
```sql
-- Busca por número de sala
CREATE INDEX idx_rooms_room_number ON rooms(room_number);

-- Busca por clínica (muito comum)
CREATE INDEX idx_rooms_clinic ON rooms(clinic_id);

-- Filtro combinado frequente
CREATE INDEX idx_rooms_clinic_active ON rooms(clinic_id, is_active);

-- Busca por tipo
CREATE INDEX idx_rooms_clinic_type ON rooms(clinic_id, type);
```

---

### 4️⃣ FALTAM CAMPOS OPCIONAIS MAS ÚTEIS

**Recomendação adicionar:**

```sql
-- Código/sigla personalizada pela clínica
code VARCHAR(20),
UNIQUE(clinic_id, code)

-- Localização física detalhada
floor INT,                  -- Andar
wing VARCHAR(50),          -- Ala
section VARCHAR(50),       -- Seção

-- Características
has_bathroom BOOLEAN DEFAULT false,
has_ac BOOLEAN DEFAULT false,

-- Observações/Notas
notes TEXT,

-- Quando foi criada vs atualizada
active_since TIMESTAMP,    -- Quando sala ativou
archived_at TIMESTAMP,     -- Quando foi desativada
```

---

## 📋 Schema Melhorado (Recomendado)

```sql
CREATE TABLE rooms (
  -- Identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  room_number VARCHAR(50) NOT NULL,           -- ← NOVO
  code VARCHAR(20),                            -- ← NOVO (opcional)
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'consultation'
    CHECK (type IN ('consultation', 'surgery', 'therapy', 'other')),
  
  -- Location Info
  unit VARCHAR(100),
  floor INT,                                   -- ← NOVO
  wing VARCHAR(50),                            -- ← NOVO
  section VARCHAR(50),                         -- ← NOVO
  
  -- Capacity & Features
  capacity INT NOT NULL DEFAULT 1 CHECK (capacity > 0),
  has_bathroom BOOLEAN DEFAULT false,          -- ← NOVO
  has_ac BOOLEAN DEFAULT false,                -- ← NOVO
  
  -- Status & Audit
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,                                  -- ← NOVO
  active_since TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,  -- ← NOVO
  archived_at TIMESTAMP WITH TIME ZONE,       -- ← NOVO
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique Constraints
  UNIQUE(clinic_id, room_number),
  UNIQUE(clinic_id, code)
);

-- Indexes for Performance
CREATE INDEX idx_rooms_clinic ON rooms(clinic_id);
CREATE INDEX idx_rooms_room_number ON rooms(room_number);
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_clinic_active ON rooms(clinic_id, is_active);
CREATE INDEX idx_rooms_clinic_type ON rooms(clinic_id, type);
CREATE INDEX idx_rooms_floor ON rooms(clinic_id, floor);
```

---

## 🤔 Qual Escolher?

### ✅ Simples é Melhor (Atual)

**Use SE:**
- Projeto é pequeno/MVP
- Recursos limitados
- Sala = apenas espaço + capacidade

**Vantagens:**
- Rápido implementar
- Menos queries
- Menos problemas

**Desvantagens:**
- Falta `room_number` (essencial!)
- Sem constraints de validação
- Sem dados extras úteis

---

### ✅ Completo é Melhor (Recomendado)

**Use SE:**
- Projeto vai crecer
- Clínica real com múltiplas salas
- Precisa de relatórios/filtros avançados
- Quer rastrear histórico

**Vantagens:**
- Flexível para futuro
- Validação integrada
- Dados ricos para relatórios
- Auditoria completa

**Desvantagens:**
- Mais campos = mais manutenção
- Mais índices = mais storage
- Migrations mais complexas

---

## 🎯 Recomendação Final

### MÍNIMO OBRIGATÓRIO

```sql
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_number VARCHAR(50) NOT NULL;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS code VARCHAR(20);

-- Constraints
ALTER TABLE rooms 
  ADD CONSTRAINT rooms_room_number_unique 
  UNIQUE(clinic_id, room_number);

-- Índices
CREATE INDEX idx_rooms_room_number ON rooms(room_number);
CREATE INDEX idx_rooms_clinic_active ON rooms(clinic_id, is_active);
```

### RECOMENDADO (Se for crescer)

Adicione:
- `floor`, `wing`, `section` - localização precisa
- `has_bathroom`, `has_ac` - filtros úteis
- `notes` - observações
- `active_since`, `archived_at` - histórico

---

## 📊 Comparação Lado a Lado

| Feature | Atual | Recomendado |
|---------|-------|------------|
| Identifica sala humanamente? | ❌ | ✅ |
| Validação de tipo? | ❌ | ✅ |
| Filtrar por localização? | ⚠️ Parcial | ✅ |
| Histórico de ativação? | ❌ | ✅ |
| Relatórios avançados? | ⚠️ Limitado | ✅ |
| Simplicidade? | ✅ | ⚠️ |
| Performance? | ✅ | ✅ (com índices) |

---

## 🚀 Migração Gradual

**Opção 1: Rápido (Recomendado)**
```
1. Adicione APENAS room_number (essencial)
2. Use o sistema normalmente
3. Adicione mais campos quando precisar
```

**Opção 2: Completo**
```
1. Crie schema novo com todas as colunas
2. Migre dados com migration script
3. Teste tudo
4. Swap tables
```

---

## 💡 Recomendação Para Você

**Adicione NO MÍNIMO:**

```sql
-- 1. room_number (essencial!)
ALTER TABLE rooms ADD COLUMN room_number VARCHAR(50);

-- 2. Constraints úteis
ALTER TABLE rooms ALTER COLUMN capacity SET DEFAULT 1;
ALTER TABLE rooms ALTER COLUMN capacity SET NOT NULL;

-- 3. Índice para performance
CREATE INDEX idx_rooms_room_number ON rooms(room_number);
CREATE INDEX idx_rooms_clinic_active ON rooms(clinic_id, is_active);

-- 4. Opcional: Campos futuros
-- ALTER TABLE rooms ADD COLUMN floor INT;
-- ALTER TABLE rooms ADD COLUMN wing VARCHAR(50);
-- ALTER TABLE rooms ADD COLUMN notes TEXT;
```

---

## 📝 Conclusão

**Atual:** ⚠️ Funcionável mas incompleto
**Com room_number:** ✅ Adequado
**Schema completo:** ✅ Pronto para crescer

**Recomendação:** Adicione `room_number` agora + outros campos conforme necessário.

---

Criado: 18 de Janeiro de 2026
