-- ============================================================================
-- ADD is_mandatory FIELD TO HOLIDAYS
-- Diferencia feriados obrigatórios (bloqueiam) de facultativos (apenas aviso)
-- ============================================================================

-- Adicionar coluna is_mandatory à tabela holidays
ALTER TABLE public.holidays
ADD COLUMN is_mandatory boolean DEFAULT true;

-- Atualizar feriados facultativos conhecidos
UPDATE public.holidays
SET is_mandatory = false
WHERE name ILIKE '%carnaval%'
   OR name ILIKE '%corpus%'
   OR name ILIKE '%segunda-feira de páscoa%'
   OR name ILIKE '%sexta-feira santa%'
   OR name ILIKE '%ponto facultativo%';

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_holidays_mandatory 
  ON public.holidays (is_mandatory, is_blocked);

-- ============================================================================
-- ATUALIZAR RPC: is_holiday_blocked
-- Agora respeita is_mandatory
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_holiday_blocked(
  p_date date,
  p_clinic_id uuid,
  p_state char(2) default null,
  p_city text default null
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_blocked boolean;
  v_is_mandatory boolean;
BEGIN
  -- Verifica se existe feriado OBRIGATÓRIO e BLOQUEADO para o dia
  SELECT 
    COALESCE(h.is_blocked, false),
    COALESCE(h.is_mandatory, true)
  INTO v_is_blocked, v_is_mandatory
  FROM holidays h
  WHERE h.date = p_date
    AND h.is_mandatory = true  -- ← Apenas feriados obrigatórios podem bloquear
    AND h.is_blocked = true
    AND (
      h.clinic_id = p_clinic_id
      OR h.scope = 'NACIONAL'
      OR (h.scope = 'ESTADUAL' AND h.state = p_state)
      OR (h.scope = 'MUNICIPAL' AND h.city = p_city)
    )
  LIMIT 1;
  
  -- Se não tem feriado obrigatório bloqueado, retorna false
  IF NOT v_is_blocked THEN
    RETURN false;
  END IF;
  
  -- Se tem e não há override manual, retorna true (bloqueado)
  RETURN NOT EXISTS (
    SELECT 1 FROM agenda_day_override
    WHERE date = p_date
      AND clinic_id = p_clinic_id
      AND allow_manual = true
  );
END;
$$;

-- ============================================================================
-- ATUALIZAR RPC: get_holiday_details
-- Adiciona campo is_mandatory à resposta
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_holiday_details(
  p_date date,
  p_clinic_id uuid,
  p_state char(2) DEFAULT null,
  p_city text DEFAULT null
) RETURNS TABLE (
  id uuid,
  name text,
  scope text,
  is_blocked boolean,
  is_mandatory boolean,
  has_override boolean
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.name,
    h.scope,
    h.is_blocked,
    COALESCE(h.is_mandatory, true),
    COALESCE(
      (SELECT true FROM agenda_day_override ado 
       WHERE ado.date = p_date 
       AND ado.clinic_id = p_clinic_id
       AND ado.allow_manual = true
       LIMIT 1),
      false
    )
  FROM holidays h
  WHERE h.date = p_date
    AND (
      h.clinic_id = p_clinic_id
      OR h.scope = 'NACIONAL'
      OR (h.scope = 'ESTADUAL' AND h.state = p_state)
      OR (h.scope = 'MUNICIPAL' AND h.city = p_city)
    )
  ORDER BY 
    CASE 
      WHEN h.clinic_id = p_clinic_id THEN 1
      WHEN h.scope = 'MUNICIPAL' THEN 2
      WHEN h.scope = 'ESTADUAL' THEN 3
      WHEN h.scope = 'NACIONAL' THEN 4
    END,
    h.created_at DESC;
END;
$$;
