-- ============================================================
-- MIGRATION: Adicionar todas as colunas melhoradas para rooms
-- Data: 18 de Janeiro de 2026
-- Descrição: Schema completo e otimizado para salas de clínica
-- ============================================================

-- 1️⃣ ADICIONAR COLUNAS ESSENCIAIS
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS room_number VARCHAR(50) NOT NULL UNIQUE;

-- 2️⃣ ADICIONAR COLUNAS DE LOCALIZAÇÃO
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS floor INT,
ADD COLUMN IF NOT EXISTS wing VARCHAR(100),
ADD COLUMN IF NOT EXISTS section VARCHAR(100);

-- 3️⃣ ADICIONAR COLUNAS DE CARACTERÍSTICAS
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS has_bathroom BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_ac BOOLEAN DEFAULT false;

-- 4️⃣ ADICIONAR COLUNA DE NOTAS/OBSERVAÇÕES
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5️⃣ ADICIONAR CAMPOS DE RASTREAMENTO DE ATIVAÇÃO/DESATIVAÇÃO
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS active_since TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- 6️⃣ ADICIONAR CONSTRAINTS DE VALIDAÇÃO
ALTER TABLE rooms
ADD CONSTRAINT check_capacity_positive CHECK (capacity > 0),
ADD CONSTRAINT check_floor_positive CHECK (floor IS NULL OR floor > 0),
ADD CONSTRAINT check_room_number_not_empty CHECK (room_number <> '');

-- 7️⃣ ADICIONAR CONSTRAINTS DE TIPO (se ainda não existir)
ALTER TABLE rooms
ADD CONSTRAINT check_type_valid 
CHECK (type IN ('consultation', 'surgery', 'therapy', 'waiting', 'admin', 'other'));

-- 8️⃣ CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_rooms_clinic ON rooms(clinic_id);
CREATE INDEX IF NOT EXISTS idx_rooms_clinic_active ON rooms(clinic_id, is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);
CREATE INDEX IF NOT EXISTS idx_rooms_clinic_room_number ON rooms(clinic_id, room_number);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(clinic_id, type);
CREATE INDEX IF NOT EXISTS idx_rooms_floor ON rooms(clinic_id, floor);
CREATE INDEX IF NOT EXISTS idx_rooms_wing ON rooms(clinic_id, wing);
CREATE INDEX IF NOT EXISTS idx_rooms_archived ON rooms(clinic_id, archived_at);

-- 9️⃣ CRIAR ÍNDICE PARA SALAS ATIVAS
CREATE INDEX IF NOT EXISTS idx_rooms_active_clinic ON rooms(clinic_id, is_active, room_number);

-- ============================================================
-- CONFIRMAÇÃO
-- ============================================================
SELECT 
  'Schema rooms melhorado com sucesso!' as status,
  COUNT(*) as total_salas,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as salas_ativas,
  MAX(created_at) as ultima_alteracao
FROM rooms;

-- ============================================================
-- NOTAS:
-- ============================================================
-- ✅ room_number: Identificador humanamente legível (201, A1, etc)
-- ✅ floor: Andar onde fica a sala (se aplicável)
-- ✅ wing: Ala/Bloco onde fica (Ala Norte, Bloco A, etc)
-- ✅ section: Seção dentro da ala (A, B, C, etc)
-- ✅ has_bathroom: Se tem banheiro
-- ✅ has_ac: Se tem ar condicionado
-- ✅ notes: Observações/Notas sobre a sala
-- ✅ active_since: Quando a sala foi ativada
-- ✅ archived_at: Quando a sala foi desativada (NULL = ativa)
-- ✅ Índices: Otimizados para queries mais frequentes
