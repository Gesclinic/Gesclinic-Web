-- ============================================================
-- 🔥 PROTEÇÃO RLS: Force clinic_id NO INSERT DE APPOINTMENTS
-- ============================================================

-- OBJETIVO:
-- Garantir que clinic_id SEMPRE seja o clinic_id do usuário autenticado
-- Mesmo que frontend envie clinic_id errado, o banco força o correto
-- Proteção de 2º nível contra RLS violations

-- ============================================================
-- 1️⃣ CRIAR FUNÇÃO QUE FORÇA clinic_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_appointments_clinic_id()
RETURNS trigger AS $$
BEGIN
  -- 🔥 FORÇAR clinic_id baseado no usuário autenticado
  NEW.clinic_id := (
    SELECT clinic_id 
    FROM public.users 
    WHERE id = auth.uid()
    LIMIT 1
  );

  -- Se não encontrar clinic_id do usuário, gerar erro
  IF NEW.clinic_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não tem clínica associada';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2️⃣ CRIAR TRIGGER AUTOMÁTICO
-- ============================================================

-- Drop trigger anterior se existir (idempotente)
DROP TRIGGER IF EXISTS set_clinic_id_on_insert ON public.appointments;

-- Criar trigger que executa ANTES de cada INSERT
CREATE TRIGGER set_clinic_id_on_insert
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.set_appointments_clinic_id();

-- ============================================================
-- 3️⃣ CRIAR TRIGGER PARA UPDATE (proteção adicional)
-- ============================================================

DROP TRIGGER IF EXISTS prevent_clinic_id_change ON public.appointments;

CREATE TRIGGER prevent_clinic_id_change
BEFORE UPDATE ON public.appointments
FOR EACH ROW
WHEN (OLD.clinic_id IS DISTINCT FROM NEW.clinic_id)
EXECUTE FUNCTION public.set_appointments_clinic_id();

-- ============================================================
-- 4️⃣ CRIAR ÍNDICE PARA PERFORMANCE
-- ============================================================

-- Garantir que clinic_id está indexado para queries rápidas
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id 
ON public.appointments(clinic_id);

-- ============================================================
-- RESULTADO ESPERADO:
-- ============================================================
-- ✅ Qualquer INSERT em appointments automaticamente:
--    1. Lê clinic_id do usuário autenticado (auth.uid())
--    2. Força NEW.clinic_id para esse valor
--    3. Ignora qualquer clinic_id enviado pelo frontend
--
-- ✅ Proteção contra:
--    1. Frontend enviando clinic_id errado
--    2. RLS violations por clinic_id incorreto
--    3. Usuário tentando criar agendamento em clínica errada
--
-- ✅ Segurança:
--    1. SECURITY DEFINER: função roda com privilégios de schema owner
--    2. BEFORE INSERT: força valor ANTES de RLS policies
--    3. Erro explícito se usuário sem clínica

-- ============================================================
-- TESTE (para verificar que funciona):
-- ============================================================
-- SELECT * FROM public.appointments 
-- WHERE created_at > NOW() - INTERVAL '1 minute'
-- LIMIT 1;
-- 
-- Verificar que clinic_id do registro == clinic_id do usuário autenticado
