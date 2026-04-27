-- =====================================================
-- 🔐 TRIGGERS DE AUDITORIA COM auth.uid()
-- =====================================================
-- Estes triggers automaticamente preenchem performed_by
-- com o ID do usuário autenticado via auth.uid()
-- =====================================================

-- PASSO 1: Criar tabela de log de auditoria (se não existir)
CREATE TABLE IF NOT EXISTS appointment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('CREATED', 'UPDATED', 'DELETED')),
  performed_by UUID NOT NULL,
  performed_by_role TEXT,
  context JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_appointment_id FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_appointment_audit_logs_appointment_id ON appointment_audit_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_audit_logs_performed_by ON appointment_audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_appointment_audit_logs_created_at ON appointment_audit_logs(created_at DESC);

-- =====================================================
-- PASSO 2: TRIGGER para INSERT (Criar agendamento)
-- =====================================================
DROP TRIGGER IF EXISTS appointment_audit_insert_trigger ON appointments;

CREATE OR REPLACE FUNCTION audit_appointment_insert()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  user_role TEXT;
  jwt_claims JSONB;
BEGIN
  -- 1️⃣ Obter ID do usuário autenticado
  current_user_id := auth.uid();
  
  -- 2️⃣ Se for NULL, tentar extrair do JWT
  IF current_user_id IS NULL THEN
    RAISE WARNING '[INSERT] auth.uid() é NULL - Verifique se o usuário está logado (não anon)';
    jwt_claims := current_setting('request.jwt.claims', true)::jsonb;
    RAISE NOTICE '[INSERT] JWT claims: %', jwt_claims;
  END IF;
  
  -- 3️⃣ Obter role do usuário
  user_role := COALESCE(
    (SELECT role FROM users WHERE id = current_user_id LIMIT 1),
    'authenticated'
  );
  
  -- 4️⃣ Log de debug detalhado
  RAISE NOTICE '[INSERT] user_id = %, role = %, appointment_id = %', current_user_id, user_role, NEW.id;
  
  -- 5️⃣ Registrar auditoria (mesmo com user_id NULL, para rastrear anomalias)
  INSERT INTO appointment_audit_logs (
    appointment_id,
    action_type,
    performed_by,
    performed_by_role,
    context
  ) VALUES (
    NEW.id,
    'CREATED',
    COALESCE(current_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
    user_role,
    to_jsonb(NEW)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER appointment_audit_insert_trigger
AFTER INSERT ON appointments
FOR EACH ROW
EXECUTE FUNCTION audit_appointment_insert();

-- =====================================================
-- PASSO 3: TRIGGER para UPDATE (Editar agendamento)
-- =====================================================
DROP TRIGGER IF EXISTS appointment_audit_update_trigger ON appointments;

CREATE OR REPLACE FUNCTION audit_appointment_update()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  user_role TEXT;
  changes JSONB;
  jwt_claims JSONB;
BEGIN
  -- 1️⃣ Obter ID do usuário autenticado
  current_user_id := auth.uid();
  
  -- 2️⃣ Se for NULL, tentar extrair do JWT
  IF current_user_id IS NULL THEN
    RAISE WARNING '[UPDATE] auth.uid() é NULL - Verifique se o usuário está logado';
    jwt_claims := current_setting('request.jwt.claims', true)::jsonb;
    RAISE NOTICE '[UPDATE] JWT claims: %', jwt_claims;
  END IF;
  
  -- 3️⃣ Obter role do usuário
  user_role := COALESCE(
    (SELECT role FROM users WHERE id = current_user_id LIMIT 1),
    'authenticated'
  );
  
  -- 4️⃣ Calcular diferenças
  changes := jsonb_build_object(
    'old', to_jsonb(OLD),
    'new', to_jsonb(NEW)
  );
  
  -- 5️⃣ Log de debug detalhado
  RAISE NOTICE '[UPDATE] user_id = %, role = %, appointment_id = %', current_user_id, user_role, OLD.id;
  
  -- 6️⃣ Registrar auditoria
  INSERT INTO appointment_audit_logs (
    appointment_id,
    action_type,
    performed_by,
    performed_by_role,
    context
  ) VALUES (
    OLD.id,
    'UPDATED',
    COALESCE(current_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
    user_role,
    changes
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER appointment_audit_update_trigger
AFTER UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION audit_appointment_update();

-- =====================================================
-- PASSO 4: TRIGGER para DELETE (Deletar agendamento)
-- =====================================================
DROP TRIGGER IF EXISTS appointment_audit_delete_trigger ON appointments;

CREATE OR REPLACE FUNCTION audit_appointment_delete()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  user_role TEXT;
  jwt_claims JSONB;
BEGIN
  -- 1️⃣ Obter ID do usuário autenticado
  current_user_id := auth.uid();
  
  -- 2️⃣ Se for NULL, tentar extrair do JWT
  IF current_user_id IS NULL THEN
    RAISE WARNING '[DELETE] auth.uid() é NULL - Verifique se o usuário está logado';
    jwt_claims := current_setting('request.jwt.claims', true)::jsonb;
    RAISE NOTICE '[DELETE] JWT claims: %', jwt_claims;
  END IF;
  
  -- 3️⃣ Obter role do usuário
  user_role := COALESCE(
    (SELECT role FROM users WHERE id = current_user_id LIMIT 1),
    'authenticated'
  );
  
  -- 4️⃣ Log de debug detalhado
  RAISE NOTICE '[DELETE] user_id = %, role = %, appointment_id = %', current_user_id, user_role, OLD.id;
  
  -- 5️⃣ Registrar auditoria
  INSERT INTO appointment_audit_logs (
    appointment_id,
    action_type,
    performed_by,
    performed_by_role,
    context
  ) VALUES (
    OLD.id,
    'DELETED',
    COALESCE(current_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
    user_role,
    to_jsonb(OLD)
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER appointment_audit_delete_trigger
BEFORE DELETE ON appointments
FOR EACH ROW
EXECUTE FUNCTION audit_appointment_delete();

-- =====================================================
-- PASSO 5: Habilitar RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS na tabela appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários autenticados podem ver agendamentos da sua clínica
DROP POLICY IF EXISTS "Authenticated users can select appointments" ON appointments;
CREATE POLICY "Authenticated users can select appointments"
  ON appointments FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Policy: Usuários autenticados podem criar agendamentos
DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON appointments;
CREATE POLICY "Authenticated users can insert appointments"
  ON appointments FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Policy: Usuários autenticados podem atualizar agendamentos
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON appointments;
CREATE POLICY "Authenticated users can update appointments"
  ON appointments FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()))
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Policy: Usuários autenticados podem deletar agendamentos
DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON appointments;
CREATE POLICY "Authenticated users can delete appointments"
  ON appointments FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- =====================================================
-- PASSO 6: RLS na tabela de auditoria
-- =====================================================

ALTER TABLE appointment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver logs de sua clínica
DROP POLICY IF EXISTS "Users can view audit logs for their clinic" ON appointment_audit_logs;
CREATE POLICY "Users can view audit logs for their clinic"
  ON appointment_audit_logs FOR SELECT
  USING (
    appointment_id IN (
      SELECT id FROM appointments 
      WHERE clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid())
    )
  );

-- =====================================================
-- PASSO 7: Verificação (execute para testar)
-- =====================================================

-- Ver todos os triggers na tabela appointments
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'appointments'
ORDER BY trigger_name;

-- Ver RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename IN ('appointments', 'appointment_audit_logs')
ORDER BY tablename, policyname;

-- Ver audit logs recentes
SELECT 
  id,
  appointment_id,
  action_type,
  performed_by,
  performed_by_role,
  created_at
FROM appointment_audit_logs
ORDER BY created_at DESC
LIMIT 10;

-- Verificar se auth.uid() funciona
SELECT auth.uid() as current_user_id, NOW() as current_time;

