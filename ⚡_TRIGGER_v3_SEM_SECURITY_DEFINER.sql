-- ============================================================
-- 🔥 TRIGGER FINAL: Sem SECURITY DEFINER (corrige auth.uid())
-- ============================================================
-- Data: 2026-04-27
-- ============================================================

-- PASSO 1: Remover tudo anterior
DROP TRIGGER IF EXISTS set_clinic_id_on_insert ON public.appointments;
DROP TRIGGER IF EXISTS prevent_clinic_id_change ON public.appointments;
DROP FUNCTION IF EXISTS public.set_appointments_clinic_id() CASCADE;

-- PASSO 2: Criar função SEM SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.set_appointments_clinic_id()
RETURNS trigger AS $$
DECLARE
  v_clinic_id UUID;
  v_auth_uid UUID;
BEGIN
  -- Obter auth.uid() atual
  v_auth_uid := auth.uid();
  
  -- Log
  RAISE NOTICE '[TRIGGER] auth.uid(): %', v_auth_uid;
  
  -- Se não houver sessão autenticada, rejeitar
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Sem usuário autenticado. Sessão inválida.';
  END IF;
  
  -- Buscar clinic_id do usuário
  SELECT clinic_id INTO v_clinic_id
  FROM public.users
  WHERE id = v_auth_uid
  LIMIT 1;
  
  RAISE NOTICE '[TRIGGER] clinic_id encontrado: %', v_clinic_id;
  
  -- Se clinic_id for NULL, gerar erro
  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'Usuário % não tem clínica associada.', v_auth_uid;
  END IF;
  
  -- FORÇAR clinic_id
  NEW.clinic_id := v_clinic_id;
  NEW.updated_at := CURRENT_TIMESTAMP;
  
  RAISE NOTICE '[TRIGGER] clinic_id FORÇADO: %', NEW.clinic_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- ⚠️ Removido SECURITY DEFINER - agora roda com permissões do user

-- PASSO 3: Criar trigger
CREATE TRIGGER set_clinic_id_on_insert
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.set_appointments_clinic_id();

-- PASSO 4: Índices
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id 
ON public.appointments(clinic_id);

CREATE INDEX IF NOT EXISTS idx_users_id
ON public.users(id);

-- FIM ✅
