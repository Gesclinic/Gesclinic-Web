-- Adicionar colunas faltantes para padrão TISS na tabela patients
-- Compatível com emissão de guias TISS em qualquer operadora

-- 1. Adicionar coluna GENDER (Sexo) - TISS obrigatório
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'gender') THEN
    ALTER TABLE patients ADD COLUMN gender VARCHAR(50);
    COMMENT ON COLUMN patients.gender IS 'Sexo do paciente (M/F/O) - TISS obrigatório';
  END IF;
END $$;

-- 2. Adicionar coluna STREET (Rua) - TISS obrigatório
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'street') THEN
    ALTER TABLE patients ADD COLUMN street VARCHAR(255);
    COMMENT ON COLUMN patients.street IS 'Rua/Via - TISS obrigatório';
  END IF;
END $$;

-- 3. Adicionar coluna NUMBER (Número) - TISS obrigatório
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'number') THEN
    ALTER TABLE patients ADD COLUMN number VARCHAR(20);
    COMMENT ON COLUMN patients.number IS 'Número do endereço - TISS obrigatório';
  END IF;
END $$;

-- 4. Adicionar coluna NEIGHBORHOOD (Bairro) - TISS obrigatório
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'neighborhood') THEN
    ALTER TABLE patients ADD COLUMN neighborhood VARCHAR(100);
    COMMENT ON COLUMN patients.neighborhood IS 'Bairro - TISS obrigatório';
  END IF;
END $$;

-- 5. Adicionar coluna CITY (Cidade) - TISS obrigatório
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'city') THEN
    ALTER TABLE patients ADD COLUMN city VARCHAR(100);
    COMMENT ON COLUMN patients.city IS 'Município/Cidade - TISS obrigatório';
  END IF;
END $$;

-- 6. Adicionar coluna STATE (Estado/UF) - TISS obrigatório
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'state') THEN
    ALTER TABLE patients ADD COLUMN state VARCHAR(2);
    COMMENT ON COLUMN patients.state IS 'Estado/UF (ex: SP, RJ, MG) - TISS obrigatório';
  END IF;
END $$;

-- 7. Adicionar coluna ZIP_CODE (CEP) - TISS obrigatório
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'zip_code') THEN
    ALTER TABLE patients ADD COLUMN zip_code VARCHAR(10);
    COMMENT ON COLUMN patients.zip_code IS 'CEP (ex: 00000-000) - TISS obrigatório';
  END IF;
END $$;

-- 8. Criar índice para busca por CPF (já deve existir, mas garantir)
CREATE INDEX IF NOT EXISTS idx_patients_document_id ON patients (document_id);

-- 9. Criar índice para busca por email
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients (email);

-- 10. Criar índice para busca por clínica
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON patients (clinic_id);

-- 11. Criar view para validação TISS (verifica pacientes com cadastro incompleto)
CREATE OR REPLACE VIEW view_patients_tiss_incomplete AS
SELECT 
  p.id,
  p.clinic_id,
  p.name,
  p.document_id AS cpf,
  CONCAT_WS(', ',
    CASE WHEN p.name IS NULL OR p.name = '' THEN 'Nome' END,
    CASE WHEN p.document_id IS NULL OR p.document_id = '' THEN 'CPF' END,
    CASE WHEN p.birthdate IS NULL THEN 'Data de Nascimento' END,
    CASE WHEN p.gender IS NULL OR p.gender = '' THEN 'Sexo' END,
    CASE WHEN p.email IS NULL OR p.email = '' THEN 'Email' END,
    CASE WHEN p.phone IS NULL OR p.phone = '' THEN 'Telefone' END,
    CASE WHEN p.street IS NULL OR p.street = '' THEN 'Rua' END,
    CASE WHEN p.number IS NULL OR p.number = '' THEN 'Número' END,
    CASE WHEN p.neighborhood IS NULL OR p.neighborhood = '' THEN 'Bairro' END,
    CASE WHEN p.city IS NULL OR p.city = '' THEN 'Cidade' END,
    CASE WHEN p.state IS NULL OR p.state = '' THEN 'Estado' END,
    CASE WHEN p.zip_code IS NULL OR p.zip_code = '' THEN 'CEP' END
  ) AS missing_fields,
  p.updated_at
FROM patients p
WHERE 
  p.name IS NULL OR p.name = '' OR
  p.document_id IS NULL OR p.document_id = '' OR
  p.birthdate IS NULL OR
  p.gender IS NULL OR p.gender = '' OR
  p.email IS NULL OR p.email = '' OR
  p.phone IS NULL OR p.phone = '' OR
  p.street IS NULL OR p.street = '' OR
  p.number IS NULL OR p.number = '' OR
  p.neighborhood IS NULL OR p.neighborhood = '' OR
  p.city IS NULL OR p.city = '' OR
  p.state IS NULL OR p.state = '' OR
  p.zip_code IS NULL OR p.zip_code = ''
ORDER BY p.updated_at DESC;

COMMENT ON VIEW view_patients_tiss_incomplete IS 'Pacientes com cadastro TISS incompleto - informações faltando para emissão de guias';
