-- Add photo_url column to professionals table
-- Migration: Add photo_url, photo_path columns

ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS photo_path TEXT;

-- Add comments
COMMENT ON COLUMN professionals.photo_url IS 'URL pública da foto do profissional';
COMMENT ON COLUMN professionals.photo_path IS 'Caminho de armazenamento da foto no Storage';
