-- RBAC granular por usuario/clinica
-- Compatível com telas de Novo Usuario / Editar Usuario

CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  clinic_id UUID NOT NULL,
  permission_key TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'view' CHECK (access_level IN ('blocked','view','edit')),
  data_scope TEXT NOT NULL DEFAULT 'own' CHECK (data_scope IN ('own','team','clinic')),
  source TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('default','custom')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, clinic_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_clinic
  ON user_permissions (user_id, clinic_id);

CREATE INDEX IF NOT EXISTS idx_user_permissions_key
  ON user_permissions (permission_key);

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION set_user_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_permissions_updated_at ON user_permissions;
CREATE TRIGGER trg_user_permissions_updated_at
  BEFORE UPDATE ON user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION set_user_permissions_updated_at();

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Leitura: proprio usuario ou admin/gestor da mesma clinica
DROP POLICY IF EXISTS user_permissions_select_policy ON user_permissions;
CREATE POLICY user_permissions_select_policy
ON user_permissions FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.clinic_id = user_permissions.clinic_id
      AND u.role IN ('admin', 'gestor')
  )
);

-- Escrita: admin/gestor da mesma clinica
DROP POLICY IF EXISTS user_permissions_write_policy ON user_permissions;
CREATE POLICY user_permissions_write_policy
ON user_permissions FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.clinic_id = user_permissions.clinic_id
      AND u.role IN ('admin', 'gestor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.clinic_id = user_permissions.clinic_id
      AND u.role IN ('admin', 'gestor')
  )
);
