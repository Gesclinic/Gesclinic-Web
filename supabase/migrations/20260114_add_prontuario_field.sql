-- ============================================================
-- ADD PRONTUÁRIO FIELD TO PATIENTS
-- ============================================================
-- Adiciona campo de número de prontuário com geração automática

-- 1. Adicionar coluna de prontuário
ALTER TABLE patients ADD COLUMN IF NOT EXISTS prontuario_numero VARCHAR(50) UNIQUE;

-- 2. Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_patients_prontuario ON patients(prontuario_numero);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_prontuario ON patients(clinic_id, prontuario_numero);

-- 3. Criar função para gerar número de prontuário automático
CREATE OR REPLACE FUNCTION generate_prontuario_numero(p_clinic_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_clinic_code VARCHAR(50);
  v_next_number INT;
  v_prontuario VARCHAR(50);
BEGIN
  -- Obter código da clínica
  SELECT code INTO v_clinic_code FROM clinics WHERE id = p_clinic_id LIMIT 1;
  
  IF v_clinic_code IS NULL THEN
    v_clinic_code := 'CLI';
  END IF;
  
  -- Gerar próximo número sequencial por clínica
  SELECT COALESCE(MAX(CAST(SPLIT_PART(prontuario_numero, '-', 2) AS INT)), 999) + 1
  INTO v_next_number
  FROM patients 
  WHERE clinic_id = p_clinic_id;
  
  -- Formatar: CODCLINICA-0001
  v_prontuario := v_clinic_code || '-' || LPAD(v_next_number::TEXT, 4, '0');
  
  RETURN v_prontuario;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger para auto-gerar prontuário ao criar paciente
CREATE OR REPLACE FUNCTION auto_generate_prontuario()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.prontuario_numero IS NULL THEN
    NEW.prontuario_numero := generate_prontuario_numero(NEW.clinic_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Deletar trigger anterior se existir
DROP TRIGGER IF EXISTS trigger_auto_generate_prontuario ON patients;

-- Criar novo trigger
CREATE TRIGGER trigger_auto_generate_prontuario
BEFORE INSERT ON patients
FOR EACH ROW
EXECUTE FUNCTION auto_generate_prontuario();

-- 5. Comentário
COMMENT ON COLUMN patients.prontuario_numero IS 'Número de prontuário único por clínica, gerado automaticamente no formato CODCLINICA-NNNN';

-- 6. GERAR PRONTUÁRIOS PARA PACIENTES EXISTENTES
-- Atualizar todos os pacientes que ainda não têm prontuário
UPDATE patients
SET prontuario_numero = (
  SELECT generate_prontuario_numero(patients.clinic_id)
)
WHERE prontuario_numero IS NULL;
