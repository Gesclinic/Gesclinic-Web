-- Adicionar coluna room_number à tabela rooms
-- Esta coluna armazena o identificador/número da sala (ex: 201, A1, Sala 1, etc)

ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);

-- Criar índice para busca rápida por número de sala
CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);

-- Criar índice composto para clinic_id + room_number (útil para buscas por clínica)
CREATE INDEX IF NOT EXISTS idx_rooms_clinic_room_number ON rooms(clinic_id, room_number);

-- Confirmação
SELECT 'Coluna room_number adicionada com sucesso à tabela rooms!' as status;
