-- ============================================================
-- 🔥 TRIGGER MELHORADO: Force clinic_id NO INSERT DE APPOINTMENTS
-- ============================================================
-- Versão corrigida com melhor logging e tratamento
-- Data: 2026-04-27
-- ============================================================

-- ============================================================
-- 1️⃣ REMOVER TRIGGER ANTERIOR
-- ============================================================

DROP TRIGGER IF EXISTS set_clinic_id_on_insert ON public.appointments;
DROP TRIGGER IF EXISTS prevent_clinic_id_change ON public.appointments;
DROP FUNCTION IF EXISTS public.set_appointments_clinic_id();

-- ============================================================
-- 2️⃣ CRIAR FUNÇÃO MELHORADA COM LOGGING
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_appointments_clinic_id()
RETURNS trigger AS $$
DECLARE
  v_clinic_id UUID;
  v_auth_uid UUID;
BEGIN
  -- Obter auth.uid() atual
  v_auth_uid := auth.uid();
  
  -- 🔍 Log 1: Debug auth.uid()
  RAISE NOTICE 'set_appointments_clinic_id - auth.uid(): %', v_auth_uid;
  
  -- Se não houver sessão autenticada, rejeitar
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Sem usuário autenticado. Sessão inválida.';
  END IF;
  
  -- 🔍 Log 2: Buscar clinic_id
  BEGIN
    SELECT clinic_id INTO v_clinic_id
    FROM public.users
    WHERE id = v_auth_uid
    LIMIT 1;
    
    RAISE NOTICE 'set_appointments_clinic_id - clinic_id encontrado: %', v_clinic_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'set_appointments_clinic_id - erro ao buscar clinic_id: %', SQLERRM;
    RAISE EXCEPTION 'Erro ao buscar clínica do usuário: %', SQLERRM;
  END;
  
  -- Se clinic_id for NULL, gerar erro detalhado
  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'Usuário % não tem clínica associada. Contate o administrador.', v_auth_uid;
  END IF;
  
  -- 🔥 FORÇAR clinic_id
  NEW.clinic_id := v_clinic_id;
  NEW.updated_at := CURRENT_TIMESTAMP;
  
  -- 🔍 Log 3: Confirmação
  RAISE NOTICE 'set_appointments_clinic_id - clinic_id FORÇADO: %', NEW.clinic_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3️⃣ CRIAR TRIGGER AUTOMÁTICO
-- ============================================================

CREATE TRIGGER set_clinic_id_on_insert
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.set_appointments_clinic_id();

-- ============================================================
-- 4️⃣ CRIAR TRIGGER PARA UPDATE (proteção adicional)
-- ============================================================

CREATE TRIGGER prevent_clinic_id_change
BEFORE UPDATE ON public.appointments
FOR EACH ROW
WHEN (OLD.clinic_id IS DISTINCT FROM NEW.clinic_id)
EXECUTE FUNCTION public.set_appointments_clinic_id();

-- ============================================================
-- 5️⃣ CRIAR ÍNDICE PARA PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id 
ON public.appointments(clinic_id);

CREATE INDEX IF NOT EXISTS idx_users_id
ON public.users(id);

-- ============================================================
-- 🎯 RESULTADO:
-- ============================================================
-- ✅ Trigger agora tem logging detalhado
-- ✅ Erros são mais específicos
-- ✅ Performance melhorada com índices
-- ✅ Tratamento de exceção robusto
-- ✅ Se falhar, saberemos exatamente por quê
