-- ============================================================
-- Adicionar colunas faltantes na tabela users
-- ============================================================

-- Adicionar coluna 'username' se não existir
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;

-- Adicionar coluna 'birthdate' se não existir
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birthdate DATE;

-- Adicionar coluna 'password_hash' se não existir
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Adicionar coluna 'phone' se não existir
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON public.users(clinic_id);

COMMIT;
