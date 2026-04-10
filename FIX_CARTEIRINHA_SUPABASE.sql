-- =====================================================
-- SCRIPT COMPLETO PARA CORRIGIR CARTEIRINHA NÃO SALVA
-- =====================================================

-- 1️⃣ GARANTIR QUE A COLUNA card_number EXISTE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'card_number'
  ) THEN
    ALTER TABLE appointments ADD COLUMN card_number VARCHAR(100);
    CREATE INDEX idx_appointments_card_number ON appointments(card_number);
    RAISE NOTICE '✅ Coluna card_number criada';
  ELSE
    RAISE NOTICE '⏭️ Coluna card_number já existe';
  END IF;
END $$;

-- 2️⃣ HABILITAR RLS SE NÃO ESTIVER HABILITADO
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 3️⃣ REMOVER POLÍTICAS ANTIGAS CONFLITANTES (se existirem)
DROP POLICY IF EXISTS "Users can update appointments from their clinic" ON appointments;
DROP POLICY IF EXISTS "Users can view appointments from their clinic" ON appointments;
DROP POLICY IF EXISTS "Users can insert appointments in their clinic" ON appointments;

-- 4️⃣ CRIAR POLÍTICAS RLS CORRETAS PARA UPDATE
CREATE POLICY "Users can update appointments in their clinic"
ON appointments FOR UPDATE
USING (
  clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  )
)
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  )
);

-- 5️⃣ CRIAR POLÍTICA PARA SELECT (se não existir)
CREATE POLICY "Users can view appointments in their clinic"
ON appointments FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  )
);

-- 6️⃣ CRIAR POLÍTICA PARA INSERT
CREATE POLICY "Users can insert appointments in their clinic"
ON appointments FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  )
);

-- 7️⃣ VERIFICAR RESULTADO
SELECT '✅ Coluna card_number:' as status, COUNT(*) as total
FROM information_schema.columns 
WHERE table_name = 'appointments' AND column_name = 'card_number';

-- 8️⃣ TESTAR UPDATE (descomente para testar com um ID real)
-- UPDATE appointments 
-- SET card_number = '123456789012345'
-- WHERE id = 'SEU_APPOINTMENT_ID_AQUI'
-- RETURNING id, card_number, updated_at;

-- 9️⃣ VERIFICAR ÚLTIMAS LINHAS
SELECT id, card_number, authorization_number, updated_at 
FROM appointments 
WHERE card_number IS NOT NULL
ORDER BY updated_at DESC 
LIMIT 5;
