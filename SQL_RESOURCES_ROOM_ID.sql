-- Adicionar coluna room_id e foreign key na tabela resources

ALTER TABLE resources
ADD COLUMN IF NOT EXISTS room_id UUID;

-- Criar foreign key para rooms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_resources_room_id'
    AND table_name = 'resources'
  ) THEN
    ALTER TABLE resources
    ADD CONSTRAINT fk_resources_room_id 
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL;
  END IF;
END $$;
