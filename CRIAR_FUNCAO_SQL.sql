-- ============================================
-- 🔧 FUNÇÃO PARA ATUALIZAR CLINIC_ID (Ignora RLS)
-- ============================================
-- Execute este script NO SUPABASE como ADMIN

CREATE OR REPLACE FUNCTION public.set_user_clinic(
  p_user_id UUID,
  p_clinic_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Atualizar usuário (ignora RLS)
  UPDATE users
  SET clinic_id = p_clinic_id
  WHERE id = p_user_id;

  -- Verificar resultado
  SELECT ROW_TO_JSON(row)
  INTO v_result
  FROM (
    SELECT id, email, clinic_id
    FROM users
    WHERE id = p_user_id
  ) row;

  RETURN v_result;
END;
$$;

-- USO:
-- SELECT public.set_user_clinic(
--   'seu_user_id_aqui'::uuid,
--   (SELECT id FROM clinics LIMIT 1)
-- );
