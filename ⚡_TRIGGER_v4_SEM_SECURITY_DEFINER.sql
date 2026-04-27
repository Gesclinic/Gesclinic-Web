-- ============================================================
-- 🔥 TRIGGER v4: SEM SECURITY DEFINER (FIX para auth.uid())
-- ============================================================
-- Removido SECURITY DEFINER para que auth.uid() funcione
-- Data: 2026-04-27
-- ============================================================

-- ============================================================
-- PASSO 1️⃣: REMOVER TRIGGERS PRIMEIRO (antes da função)
-- ============================================================

DROP TRIGGER IF EXISTS set_clinic_id_on_insert ON public.appointments;
DROP TRIGGER IF EXISTS prevent_clinic_id_change ON public.appointments;

-- ============================================================
-- PASSO 2️⃣: REMOVER FUNÇÃO ANTIGA
-- ============================================================

DROP FUNCTION IF EXISTS public.set_appointments_clinic_id() CASCADE;

-- ============================================================
-- PASSO 3️⃣: CRIAR FUNÇÃO NOVA (SEM SECURITY DEFINER)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_appointments_clinic_id()
RETURNS trigger AS $$
DECLARE
  v_clinic_id UUID;
  v_auth_uid UUID;
BEGIN
  -- Obter auth.uid() atual (SEM SECURITY DEFINER, funciona agora!)
  v_auth_uid := auth.uid();
  
  -- Se não houver sessão autenticada, FORÇAR para NULL e deixar middleware/API validar
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Sem usuário autenticado. Sessão inválida.';
  END IF;
  
  -- Buscar clinic_id do usuário autenticado
  SELECT clinic_id INTO v_clinic_id
  FROM public.users
  WHERE id = v_auth_uid
  LIMIT 1;
  
  -- Se clinic_id for NULL, gerar erro
  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não tem clínica associada';
  END IF;
  
  -- 🔥 FORÇAR clinic_id do usuário autenticado
  NEW.clinic_id := v_clinic_id;
  NEW.updated_at := CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PASSO 4️⃣: CRIAR TRIGGER PARA INSERT
-- ============================================================

CREATE TRIGGER set_clinic_id_on_insert
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.set_appointments_clinic_id();

-- ============================================================
-- PASSO 5️⃣: CRIAR TRIGGER PARA UPDATE (proteção adicional)
-- ============================================================

CREATE TRIGGER prevent_clinic_id_change
BEFORE UPDATE ON public.appointments
FOR EACH ROW
WHEN (OLD.clinic_id IS DISTINCT FROM NEW.clinic_id)
EXECUTE FUNCTION public.set_appointments_clinic_id();

-- ============================================================
-- PASSO 6️⃣: CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id 
ON public.appointments(clinic_id);

CREATE INDEX IF NOT EXISTS idx_users_id
ON public.users(id);

-- ============================================================
-- ✅ CONCLUSÃO
-- ============================================================
-- ✅ Função recreada SEM SECURITY DEFINER
-- ✅ auth.uid() agora funciona corretamente
-- ✅ Triggers recriados
-- ✅ Índices criados
-- ✅ Pronto para executar no Supabase!
