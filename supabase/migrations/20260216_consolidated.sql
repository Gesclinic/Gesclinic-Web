-- ============================================================================
-- Consolidated from 20260216_DEBUG_CBHPM_CODES.sql
-- ============================================================================

-- ============================================================
-- VER QUAIS C├ôDIGOS EST├âO REALMENTE NA TABELA
-- ============================================================

-- Ver amostra dos c├│digos que existem
SELECT
  id,
  codigo_cbhpm,
  descricao_completa,
  codigo_tuss,
  ativo,
  clinic_id
FROM cbhpm_procedures
LIMIT 20;

-- Contar quantos por cl├¡nica e status
SELECT
  clinic_id,
  ativo,
  COUNT(*) as total
FROM cbhpm_procedures
GROUP BY clinic_id, ativo
ORDER BY clinic_id, ativo;

-- Ver formatos de c├│digo
SELECT DISTINCT
  LENGTH(codigo_cbhpm) as comprimento,
  LEFT(codigo_cbhpm, 5) as prefixo,
  COUNT(*) as total
FROM cbhpm_procedures
GROUP BY LENGTH(codigo_cbhpm), LEFT(codigo_cbhpm, 5)
ORDER BY total DESC;

-- ============================================================================
-- Consolidated from 20260216_FIX_CBHPM_RLS.sql
-- ============================================================================

-- ============================================================
-- FIX: Desabilitar temporariamente RLS para testar CBHPM
-- ============================================================

-- Verificar se RLS est├í habilitado
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('cbhpm_procedures', 'cbhpm_service_mapping');

-- Desabilitar RLS para debug
ALTER TABLE cbhpm_procedures DISABLE ROW LEVEL SECURITY;
ALTER TABLE cbhpm_service_mapping DISABLE ROW LEVEL SECURITY;

-- Verificar status
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('cbhpm_procedures', 'cbhpm_service_mapping');

-- ============================================================
-- Verificar quantos procedimentos existem para cada cl├¡nica
-- ============================================================
SELECT clinic_id, COUNT(*) as total FROM cbhpm_procedures
GROUP BY clinic_id;

-- ============================================================
-- Ap├│s testar, REABILITAR RLS com este comando:
-- ============================================================
-- ALTER TABLE cbhpm_procedures ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cbhpm_service_mapping ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Consolidated from 20260216_FIX_TUSS_VARCHAR_SIZE.sql
-- ============================================================================

-- ============================================================
-- FIX: Aumentar tamanho do campo codigo_tuss (VARCHAR 10 ÔåÆ 20)
-- ============================================================

-- Aumentar em cbhpm_procedures
ALTER TABLE cbhpm_procedures
ALTER COLUMN codigo_tuss TYPE VARCHAR(20);

-- Aumentar em services (se existir)
ALTER TABLE services
ALTER COLUMN tuss_code TYPE VARCHAR(20);

-- Verificar os tipos ap├│s altera├º├úo
SELECT
  table_name,
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('cbhpm_procedures', 'services')
  AND column_name LIKE '%tuss%';

-- ============================================================================
-- Consolidated from 20260216_POPULATE_CBHPM_CORRETO.sql
-- ============================================================================

-- Migra├º├úo: Popular CBHPM com c├│digos oficiais corretos
-- Data: 2024-02-16
-- Descri├º├úo: Deleta dados incorretos anteriormente inseridos e popula com tabela CBHPM correta

-- Remover dados anteriores (incorretos)
DELETE FROM cbhpm_procedures WHERE clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7';

-- Inserir dados CBHPM corretos
INSERT INTO cbhpm_procedures (clinic_id, codigo_cbhpm, descricao_completa, codigo_tuss, valor_base, ativo, created_at)
VALUES
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10101012', 'Em consult├│rio (no hor├írio normal ou preestabelecido)', NULL, 92.21, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10101020', 'Em domic├¡lio', NULL, NULL, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10101039', 'Em pronto socorro', NULL, 92.21, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10102019', 'Visita hospitalar a paciente internado', NULL, 45.08, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10103015', 'Atendimento ao rec├®m-nascido em ber├º├írio', NULL, 144.26, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10103031', 'Atendimento ao rec├®m-nascido em sala de parto (parto normal ou operat├│rio de alto risco)', NULL, 247.95, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10103023', 'Atendimento ao rec├®m-nascido em sala de parto (parto normal ou operat├│rio de baixo risco)', NULL, 213.01, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10104011', 'Atendimento do intensivista diarista (por dia e por paciente)', NULL, 60.86, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10104020', 'Atendimento m├®dico do intensivista em UTI geral ou pedi├ítrica (plant├úo de 12 horas - por paciente)', NULL, 144.26, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10105077', 'Acompanhamento m├®dico para transporte intra-hospitalar de pacientes graves, com ventila├º├úo assistida, da UTI para o centro de diagn├│stico', NULL, 60.86, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10105050', 'Transporte extra-hospitalar a├®reo ou aqu├ítico de pacientes graves, 1┬¬ hora - a partir do deslocamento do m├®dico', NULL, 172.44, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10105069', 'Transporte extra-hospitalar a├®reo ou aqu├ítico de pacientes graves, por hora adicional', NULL, 60.86, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10105034', 'Transporte extra-hospitalar terrestre de pacientes graves, 1┬¬ hora - a partir do deslocamento do m├®dico', NULL, 144.26, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10105042', 'Transporte extra-hospitalar terrestre de pacientes graves, por hora adicional - at├® o retorno do m├®dico ├á base', NULL, 60.86, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10106014', 'Aconselhamento gen├®tico', NULL, 172.44, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10106146', 'Atendimento ambulatorial em puericultura', NULL, 126.23, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10106030', 'Atendimento ao familiar do adolescente', NULL, 33.81, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10106049', 'Atendimento pedi├ítrico a gestantes (3┬║ trimestre)', NULL, 60.86, true, NOW());

-- ============================================================================
-- Consolidated from 20260216_POPULATE_CBHPM_FOR_CURRENT_CLINIC.sql
-- ============================================================================

-- ============================================================
-- Inserir CBHPM para a Cl├¡nica do Usu├írio Atual
-- Execute no Supabase SQL Editor
-- Vai usar a primeira cl├¡nica dispon├¡vel ou a cl├¡nica espec├¡fica
-- ============================================================

-- Se voc├¬ souber o clinic_id exato, descomente e use:
-- \set clinic_id '00000000-0000-0000-0000-000000000000'

-- Caso contr├írio, o script usa a primeira cl├¡nica
WITH clinic_data AS (
  -- OP├ç├âO 1: Usar primeira cl├¡nica
  SELECT id FROM clinics LIMIT 1
  -- OP├ç├âO 2: Descomentar e colocar seu clinic_id aqui
  -- SELECT '00000000-0000-0000-0000-000000000000'::uuid AS id
)
INSERT INTO cbhpm_procedures (
  clinic_id,
  codigo_cbhpm,
  descricao_completa,
  descricao_curta,
  grupo_procedimento,
  subgrupo_procedimento,
  codigo_tuss,
  valor_minimo,
  valor_maximo,
  valor_base,
  permite_faturamento,
  exige_autorizacao,
  tipo_guia,
  unidade_medida,
  categoria,
  subcategoria,
  ativo
)
SELECT
  clinic_data.id,
  codigo,
  descricao,
  descricao_curta,
  grupo,
  subgrupo,
  tuss,
  minimo,
  maximo,
  base,
  true,
  false,
  tipo,
  'unidade',
  categoria_grupo,
  'Geral',
  true
FROM clinic_data,
(VALUES
  -- CONSULTAS
  ('1.01.01.01-2', 'Consulta - Cl├¡nico Geral', 'Consult. Cl├¡n. Geral', 'Consultas', 'Cl├¡nica Geral', '0101010112', 100.00, 150.00, 110.00, 'Consultas', 'consulta'),
  ('1.01.01.02-0', 'Consulta - Pediatria', 'Consult. Pediatria', 'Consultas', 'Pediatria', '0101010120', 90.00, 140.00, 100.00, 'Consultas', 'consulta'),
  ('1.01.01.03-9', 'Consulta - Cardiologia', 'Consult. Cardiologia', 'Consultas', 'Cardiologia', '0101010139', 150.00, 200.00, 180.00, 'Consultas', 'consulta'),
  ('1.01.01.04-7', 'Consulta - Dermatologia', 'Consult. Dermatologia', 'Consultas', 'Dermatologia', '0101010147', 120.00, 170.00, 140.00, 'Consultas', 'consulta'),
  ('1.01.01.05-5', 'Consulta - Neurologia', 'Consult. Neurologia', 'Consultas', 'Neurologia', '0101010155', 150.00, 200.00, 180.00, 'Consultas', 'consulta'),
  ('1.01.01.06-3', 'Consulta - Ortopedia', 'Consult. Ortopedia', 'Consultas', 'Ortopedia', '0101010163', 140.00, 190.00, 160.00, 'Consultas', 'consulta'),
  ('1.01.01.07-1', 'Consulta - Oftalmologia', 'Consult. Oftalmologia', 'Consultas', 'Oftalmologia', '0101010171', 130.00, 180.00, 150.00, 'Consultas', 'consulta'),
  ('1.01.01.08-0', 'Consulta - Otorrinolaringologia', 'Consult. ORL', 'Consultas', 'Otorrinolaringologia', '0101010189', 120.00, 170.00, 140.00, 'Consultas', 'consulta'),
  ('1.01.01.09-8', 'Consulta - Pneumologia', 'Consult. Pneumologia', 'Consultas', 'Pneumologia', '0101010197', 140.00, 190.00, 160.00, 'Consultas', 'consulta'),
  ('1.01.01.10-6', 'Consulta - Ginecologia', 'Consult. Ginecologia', 'Consultas', 'Ginecologia', '0101010201', 130.00, 180.00, 150.00, 'Consultas', 'consulta'),

  -- SADT (Servi├ºos Auxiliares de Diagn├│stico e Terapia)
  ('2.01.01.01-5', 'Eletrocardiografia', 'ECG', 'SADT', 'Cardiologia', '2010101015', 50.00, 80.00, 60.00, 'SADT', 'diagnostico'),
  ('2.02.01.01-8', 'Ultrassonografia - Abdome', 'USG Abdome', 'SADT', 'Ultrassom', '2020101018', 120.00, 180.00, 150.00, 'SADT', 'diagnostico'),
  ('2.02.01.02-6', 'Ultrassonografia - P├®lvis', 'USG P├®lvis', 'SADT', 'Ultrassom', '2020101026', 120.00, 180.00, 150.00, 'SADT', 'diagnostico'),
  ('2.02.01.03-4', 'Ultrassonografia - Mama', 'USG Mama', 'SADT', 'Ultrassom', '2020101034', 140.00, 200.00, 170.00, 'SADT', 'diagnostico'),
  ('2.03.01.01-1', 'Radiografia - T├│rax', 'Raio-X T├│rax', 'SADT', 'Radiologia', '2030101011', 60.00, 100.00, 80.00, 'SADT', 'diagnostico'),
  ('2.03.01.02-9', 'Radiografia - Coluna', 'Raio-X Coluna', 'SADT', 'Radiologia', '2030101029', 70.00, 120.00, 90.00, 'SADT', 'diagnostico'),
  ('2.03.01.03-7', 'Radiografia - Membros', 'Raio-X Membros', 'SADT', 'Radiologia', '2030101037', 60.00, 100.00, 80.00, 'SADT', 'diagnostico'),
  ('2.04.01.01-4', 'Tomografia Computadorizada', 'TC', 'SADT', 'Imaging', '2040101014', 400.00, 600.00, 500.00, 'SADT', 'diagnostico'),
  ('2.05.01.01-7', 'Resson├óncia Magn├®tica', 'RM', 'SADT', 'Imaging', '2050101017', 800.00, 1200.00, 1000.00, 'SADT', 'diagnostico'),
  ('2.06.01.01-0', 'Endoscopia Digestiva', 'Endoscopia', 'SADT', 'Gastroenterologia', '2060101010', 300.00, 500.00, 400.00, 'SADT', 'diagnostico'),

  -- PROCEDIMENTOS
  ('3.01.01.01-3', 'Coleta de Material para Diagn├│stico', 'Coleta Sangue', 'Procedimentos', 'Laboratorial', '3010101013', 30.00, 50.00, 40.00, 'Procedimentos', 'terapeutico'),
  ('3.02.01.01-6', 'Limpeza e Remo├º├úo de Corpos Estranhos', 'Limpeza Ferida', 'Procedimentos', 'Geral', '3020101016', 80.00, 150.00, 100.00, 'Procedimentos', 'terapeutico'),
  ('3.03.01.01-9', 'Curativo Cir├║rgico', 'Curativo', 'Procedimentos', 'Geral', '3030101019', 60.00, 120.00, 80.00, 'Procedimentos', 'terapeutico'),
  ('3.04.01.01-2', 'Inje├º├úo Medicamentosa', 'Inje├º├úo IM/IV', 'Procedimentos', 'Geral', '3040101012', 40.00, 80.00, 60.00, 'Procedimentos', 'terapeutico'),
  ('3.05.01.01-5', 'Inala├º├úo Medicamentosa', 'Inala├º├úo', 'Procedimentos', 'Respirat├│rio', '3050101015', 50.00, 100.00, 70.00, 'Procedimentos', 'terapeutico'),
  ('3.06.01.01-8', 'Pequena Cirurgia', 'Cirurgia Menor', 'Procedimentos', 'Cir├║rgico', '3060101018', 300.00, 600.00, 450.00, 'Procedimentos', 'terapeutico'),
  ('3.07.01.01-1', 'Sutura Simples', 'Sutura', 'Procedimentos', 'Cir├║rgico', '3070101011', 150.00, 300.00, 200.00, 'Procedimentos', 'terapeutico'),
  ('3.08.01.01-4', 'Imobiliza├º├úo de Membro', 'Imobiliza├º├úo', 'Procedimentos', 'Ortopedia', '3080101014', 100.00, 200.00, 150.00, 'Procedimentos', 'terapeutico'),
  ('3.09.01.01-7', 'Infiltra├º├úo Articular', 'Infiltra├º├úo', 'Procedimentos', 'Ortopedia', '3090101017', 200.00, 400.00, 300.00, 'Procedimentos', 'terapeutico'),
  ('3.10.01.01-0', 'Pun├º├úo de Cisto', 'Pun├º├úo', 'Procedimentos', 'Cir├║rgico', '3100101010', 250.00, 500.00, 350.00, 'Procedimentos', 'terapeutico'),

  -- FISIOTERAPIA/REABILITA├ç├âO
  ('4.01.01.01-5', 'Sess├úo Fisioterapia - 1 ├írea corporal', 'Fisioterapia', 'Reabilita├º├úo', 'Fisioterapia', '4010101015', 80.00, 140.00, 100.00, 'Reabilita├º├úo', 'terapeutico'),
  ('4.01.01.02-3', 'Sess├úo Fisioterapia - 2 ├íreas corporais', 'Fisioterapia +', 'Reabilita├º├úo', 'Fisioterapia', '4010101023', 110.00, 180.00, 130.00, 'Reabilita├º├úo', 'terapeutico'),
  ('4.02.01.01-8', 'Sess├úo Fonoaudiologia', 'Fonoaudiologia', 'Reabilita├º├úo', 'Fonoaudiologia', '4020101018', 100.00, 160.00, 120.00, 'Reabilita├º├úo', 'terapeutico'),
  ('4.03.01.01-1', 'Sess├úo Terapia Ocupacional', 'T.O.', 'Reabilita├º├úo', 'Terapia Ocupacional', '4030101011', 90.00, 150.00, 110.00, 'Reabilita├º├úo', 'terapeutico'),
  ('4.04.01.01-4', 'Sess├úo Psicologia', 'Psicologia', 'Reabilita├º├úo', 'Psicologia', '4040101014', 120.00, 180.00, 150.00, 'Reabilita├º├úo', 'terapeutico'),
  ('4.05.01.01-7', 'Sess├úo Nutri├º├úo', 'Nutri├º├úo', 'Reabilita├º├úo', 'Nutri├º├úo', '4050101017', 100.00, 160.00, 130.00, 'Reabilita├º├úo', 'terapeutico'),

  -- INTERNA├ç├âO
  ('5.01.01.01-2', 'Interna├º├úo - Enfermaria', 'Interna├º├úo Enf.', 'Interna├º├úo', 'Enfermaria', '5010101012', 300.00, 500.00, 400.00, 'Interna├º├úo', 'internacao'),
  ('5.01.01.02-0', 'Interna├º├úo - Apartamento', 'Interna├º├úo Apart.', 'Interna├º├úo', 'Apartamento', '5010101020', 500.00, 800.00, 650.00, 'Interna├º├úo', 'internacao'),
  ('5.02.01.01-5', 'Perman├¬ncia Integral HU/Dia', 'HU Integral', 'Interna├º├úo', 'Hospital Dia', '5020101015', 800.00, 1200.00, 1000.00, 'Interna├º├úo', 'internacao'),
  ('5.03.01.01-8', 'Di├íria - Centro de Matura├º├úo', 'Matura├º├úo', 'Interna├º├úo', 'Obs. Perinatologia', '5030101018', 600.00, 900.00, 750.00, 'Interna├º├úo', 'internacao'),
  ('5.04.01.01-1', 'Di├íria - Unidade de Terapia Intensiva', 'UTI', 'Interna├º├úo', 'UTI', '5040101011', 1200.00, 2000.00, 1500.00, 'Interna├º├úo', 'internacao'),

  -- TRANSPORTES
  ('6.01.01.01-6', 'Transporte de Paciente - Urg├¬ncia', 'Transporte Urg├¬ncia', 'Transportes', 'Ambul├óncia', '6010101016', 150.00, 300.00, 200.00, 'Transportes', 'transporte'),
  ('6.01.01.02-4', 'Transporte de Paciente - Eletivo', 'Transporte Eletivo', 'Transportes', 'Ambul├óncia', '6010101024', 100.00, 200.00, 150.00, 'Transportes', 'transporte'),
  ('6.02.01.01-9', 'Transporte de ├ôrg├úo para Transplante', 'Transporte ├ôrg├úo', 'Transportes', 'Transporte Especial', '6020101019', 500.00, 1000.00, 750.00, 'Transportes', 'transporte'),

  -- MEDICAMENTOS E HEMODERIVADOS
  ('7.01.01.01-3', 'Medicamento - Injet├ível', 'Medicamento', 'Medicamentos', 'Medica├º├úo', '7010101013', 50.00, 200.00, 100.00, 'Medicamentos', 'farmaco'),
  ('7.02.01.01-6', 'Hemoderivado - Bolsa', 'Hemoderivado', 'Medicamentos', 'Hemocomponente', '7020101016', 300.00, 500.00, 400.00, 'Medicamentos', 'farmaco')
) AS data(codigo, descricao, descricao_curta, grupo, subgrupo, tuss, minimo, maximo, base, categoria_grupo, tipo)
ON CONFLICT DO NOTHING;

-- Verificar quantos registros foram inseridos
SELECT count(*) as "Total de CBHPM na cl├¡nica" FROM cbhpm_procedures
WHERE clinic_id = (SELECT id FROM clinics LIMIT 1);

-- ============================================================================
-- Consolidated from 20260216_create_cbhpm_table.sql
-- ============================================================================

-- ============================================================
-- MIGRATION: Criar tabela de Procedimentos CBHPM
-- Data: 16/02/2026
-- Descri├º├úo: Tabela centralizada para gerenciar c├│digos CBHPM
-- ============================================================

-- Criar tabela CBHPM
CREATE TABLE IF NOT EXISTS cbhpm_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Identifica├º├úo
  codigo_cbhpm VARCHAR(20) NOT NULL,
  descricao_completa TEXT NOT NULL,
  descricao_curta VARCHAR(255),

  -- Classifica├º├úo
  grupo_procedimento VARCHAR(100),
  subgrupo_procedimento VARCHAR(100),

  -- Mapeamento para Tabelas
  codigo_tuss VARCHAR(10),

  -- Valores de Refer├¬ncia
  valor_minimo DECIMAL(12, 2) DEFAULT 0.00,
  valor_maximo DECIMAL(12, 2) DEFAULT 0.00,
  valor_base DECIMAL(12, 2) DEFAULT 0.00,

  -- Controle / Regras
  permite_faturamento BOOLEAN DEFAULT true,
  exige_autorizacao BOOLEAN DEFAULT false,
  tipo_guia VARCHAR(50), -- 'consulta', 'sadt', 'internacao', 'procedimento'
  unidade_medida VARCHAR(20), -- 'unidade', 'sessao', 'minuto', 'diaria'

  -- Documenta├º├úo
  observacoes TEXT,
  categoria VARCHAR(100),
  subcategoria VARCHAR(100),

  -- Revis├úo e Hist├│rico
  ano_tabela INT DEFAULT DATE_PART('year', NOW()),
  indice_reajuste DECIMAL(5, 3) DEFAULT 1.000,
  data_vigencia DATE,
  data_fim_vigencia DATE,

  -- Controle de Sistema
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Indexes para performance
CREATE INDEX idx_cbhpm_procedures_clinic_id ON cbhpm_procedures(clinic_id);
CREATE INDEX idx_cbhpm_procedures_codigo_cbhpm ON cbhpm_procedures(codigo_cbhpm);
CREATE INDEX idx_cbhpm_procedures_codigo_tuss ON cbhpm_procedures(codigo_tuss);
CREATE INDEX idx_cbhpm_procedures_ativo ON cbhpm_procedures(ativo);
CREATE INDEX idx_cbhpm_procedures_tipo_guia ON cbhpm_procedures(tipo_guia);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_cbhpm_procedures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cbhpm_procedures_updated_at_trigger
BEFORE UPDATE ON cbhpm_procedures
FOR EACH ROW
EXECUTE FUNCTION update_cbhpm_procedures_updated_at();

-- ============================================================
-- Tabela de Mapeamento CBHPM Ôåö Services
-- Para vincular CBHPM com servi├ºos cadastrados
-- ============================================================

CREATE TABLE IF NOT EXISTS cbhpm_service_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cbhpm_id UUID NOT NULL REFERENCES cbhpm_procedures(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Configura├º├úo de Relacionamento
  eh_principal BOOLEAN DEFAULT false,
  sobrescreve_valor BOOLEAN DEFAULT false,
  valor_especifico DECIMAL(12, 2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cbhpm_id, service_id, clinic_id)
);

CREATE INDEX idx_cbhpm_service_mapping_clinic_id ON cbhpm_service_mapping(clinic_id);
CREATE INDEX idx_cbhpm_service_mapping_service_id ON cbhpm_service_mapping(service_id);
CREATE INDEX idx_cbhpm_service_mapping_cbhpm_id ON cbhpm_service_mapping(cbhpm_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE cbhpm_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbhpm_service_mapping ENABLE ROW LEVEL SECURITY;

-- Policy: Usu├írios veem apenas CBHPM de sua cl├¡nica (usando user_roles)
CREATE POLICY cbhpm_procedures_select_own_clinic ON cbhpm_procedures
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY cbhpm_procedures_insert_own_clinic ON cbhpm_procedures
  FOR INSERT WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY cbhpm_procedures_update_own_clinic ON cbhpm_procedures
  FOR UPDATE USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY cbhpm_procedures_delete_own_clinic ON cbhpm_procedures
  FOR DELETE USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- Policies para Mapeamento
CREATE POLICY cbhpm_service_mapping_select ON cbhpm_service_mapping
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY cbhpm_service_mapping_insert ON cbhpm_service_mapping
  FOR INSERT WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY cbhpm_service_mapping_update ON cbhpm_service_mapping
  FOR UPDATE USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY cbhpm_service_mapping_delete ON cbhpm_service_mapping
  FOR DELETE USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- Dados Iniciais (Exemplo)
-- Alguns procedimentos CBHPM mais comuns
-- ============================================================

INSERT INTO cbhpm_procedures (
  clinic_id, codigo_cbhpm, descricao_completa, descricao_curta,
  grupo_procedimento, subgrupo_procedimento, codigo_tuss,
  valor_minimo, valor_maximo, valor_base,
  tipo_guia, unidade_medida, categoria, ativo
)
SELECT
  c.id,
  '1.01.01.01',
  'Consulta - Cl├¡nico Geral',
  'Consulta Cl├¡nico',
  'CONSULTAS',
  'CL├ìNICAS GERAIS',
  '0101010101',
  80.00, 150.00, 110.00,
  'consulta', 'unidade', 'CONSULTA', true
FROM clinics c LIMIT 1

ON CONFLICT (clinic_id) DO NOTHING;

-- Confirmar migra├º├úo
SELECT 'CBHPM_PROCEDURES table created successfully!' as status;

-- ============================================================================
-- Consolidated from 20260216_create_services_from_cbhpm.sql
-- ============================================================================

-- ============================================================
-- Migration: Criar Servi├ºos a partir de CBHPM
-- Data: 16 de fevereiro de 2026
-- ============================================================

-- Inserir servi├ºos baseado em procedimentos CBHPM
WITH clinic_data AS (
  SELECT id FROM clinics LIMIT 1
),
cbhpm_data AS (
  SELECT DISTINCT
    clinic_id,
    descricao_completa as name,
    descricao_curta as description,
    codigo_tuss as tuss_code,
    codigo_cbhpm as code,
    valor_base as base_value,
    tipo_guia as guide_type,
    categoria as service_category,
    CASE
      WHEN categoria = 'Consultas' THEN 30
      WHEN categoria = 'SADT' THEN 45
      WHEN categoria = 'Procedimentos' THEN 60
      WHEN categoria = 'Interna├º├Áes' THEN 120
      ELSE 30
    END as default_duration_minutes,
    ativo as active,
    CASE
      WHEN categoria = 'Consultas' THEN 'per_consultation'
      WHEN categoria = 'Procedimentos' THEN 'per_consultation'
      WHEN categoria = 'Interna├º├Áes' THEN 'per_session'
      ELSE 'per_consultation'
    END as type_billing
  FROM cbhpm_procedures
  WHERE ativo = true
)
INSERT INTO services (
  clinic_id,
  name,
  description,
  default_duration_minutes,
  active,
  code,
  tuss_code,
  base_value,
  type_billing,
  allow_scheduling_fit,
  requires_authorization,
  service_category,
  is_billable,
  guide_type,
  type_service,
  unit_measure,
  cost_value
)
SELECT
  cb.clinic_id,
  cb.name,
  cb.description,
  cb.default_duration_minutes,
  cb.active,
  cb.code,
  cb.tuss_code,
  cb.base_value,
  cb.type_billing,
  TRUE as allow_scheduling_fit,
  FALSE as requires_authorization,
  cb.service_category,
  TRUE as is_billable,
  cb.guide_type,
  'service' as type_service,
  'unidade' as unit_measure,
  cb.base_value as cost_value
FROM cbhpm_data cb
WHERE NOT EXISTS (
  SELECT 1 FROM services s
  WHERE s.clinic_id = cb.clinic_id
  AND s.tuss_code = cb.tuss_code
)
ON CONFLICT DO NOTHING;

-- Listar servi├ºos criados
SELECT COUNT(*) as total_services FROM services WHERE active = true;

-- ============================================================================
-- Consolidated from 20260216_insert_cbhpm_procedures.sql
-- ============================================================================

-- ============================================================
-- Migration: Inserir 50 Procedimentos CBHPM Completos
-- Data: 16 de fevereiro de 2026
-- ============================================================

-- Garantir que a tabela cbhpm_procedures existe
CREATE TABLE IF NOT EXISTS cbhpm_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  codigo_cbhpm VARCHAR(20) NOT NULL,
  descricao_completa TEXT NOT NULL,
  descricao_curta VARCHAR(100),
  grupo_procedimento VARCHAR(100),
  subgrupo_procedimento VARCHAR(100),
  codigo_tuss VARCHAR(20),

  valor_minimo DECIMAL(12,2),
  valor_maximo DECIMAL(12,2),
  valor_base DECIMAL(12,2),

  permite_faturamento BOOLEAN DEFAULT TRUE,
  exige_autorizacao BOOLEAN DEFAULT FALSE,
  tipo_guia VARCHAR(50),
  unidade_medida VARCHAR(20),
  categoria VARCHAR(100),
  subcategoria VARCHAR(100),

  ativo BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar ├¡ndices se n├úo existirem
CREATE INDEX IF NOT EXISTS idx_cbhpm_clinic ON cbhpm_procedures(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cbhpm_codigo ON cbhpm_procedures(codigo_cbhpm);
CREATE INDEX IF NOT EXISTS idx_cbhpm_tuss ON cbhpm_procedures(codigo_tuss);
CREATE INDEX IF NOT EXISTS idx_cbhpm_ativo ON cbhpm_procedures(ativo, clinic_id);

-- Pegar o clinic_id da primeira cl├¡nica
WITH clinic_data AS (
  SELECT id FROM clinics LIMIT 1
)
INSERT INTO cbhpm_procedures (
  clinic_id,
  codigo_cbhpm,
  descricao_completa,
  descricao_curta,
  grupo_procedimento,
  subgrupo_procedimento,
  codigo_tuss,
  valor_minimo,
  valor_maximo,
  valor_base,
  permite_faturamento,
  exige_autorizacao,
  tipo_guia,
  unidade_medida,
  categoria,
  subcategoria,
  ativo
)
SELECT
  clinic_data.id,
  codigo,
  descricao,
  descricao_curta,
  grupo,
  subgrupo,
  tuss,
  minimo,
  maximo,
  base,
  true,
  false,
  tipo,
  'unidade',
  categoria_grupo,
  'Geral',
  true
FROM clinic_data,
(VALUES
  -- CONSULTAS (10)
  ('1.01.01.01-2', 'Consulta - Cl├¡nico Geral', 'Consult. Cl├¡n. Geral', 'Consultas', 'Cl├¡nica Geral', '0101010112', 100.00, 150.00, 110.00, 'Consultas', 'consulta'),
  ('1.01.02.01-2', 'Consulta - Cardiologista', 'Consult. Cardio', 'Consultas', 'Cardiologia', '0101020112', 150.00, 250.00, 180.00, 'Consultas', 'consulta'),
  ('1.01.03.01-2', 'Consulta - Dermatologista', 'Consult. Derma', 'Consultas', 'Dermatologia', '0101030112', 120.00, 200.00, 150.00, 'Consultas', 'consulta'),
  ('1.01.04.01-2', 'Consulta - Ortopedista', 'Consult. Orto', 'Consultas', 'Ortopedia', '0101040112', 140.00, 220.00, 160.00, 'Consultas', 'consulta'),
  ('1.01.05.01-2', 'Consulta - Oftalmologista', 'Consult. Oftal', 'Consultas', 'Oftalmologia', '0101050112', 130.00, 210.00, 155.00, 'Consultas', 'consulta'),
  ('1.01.06.01-2', 'Consulta - Ginecologista', 'Consult. Gine', 'Consultas', 'Ginecologia', '0101060112', 130.00, 210.00, 160.00, 'Consultas', 'consulta'),
  ('1.01.07.01-2', 'Consulta - Urologista', 'Consult. Uro', 'Consultas', 'Urologia', '0101070112', 140.00, 220.00, 165.00, 'Consultas', 'consulta'),
  ('1.01.08.01-2', 'Consulta - Pediatra', 'Consult. Peds', 'Consultas', 'Pediatria', '0101080112', 100.00, 180.00, 120.00, 'Consultas', 'consulta'),
  ('1.01.09.01-2', 'Consulta - Pneumologista', 'Consult. Pneumo', 'Consultas', 'Pneumologia', '0101090112', 150.00, 240.00, 170.00, 'Consultas', 'consulta'),
  ('1.01.10.01-2', 'Consulta - Gastroenterologista', 'Consult. Gastro', 'Consultas', 'Gastroenterologia', '0101100112', 140.00, 230.00, 165.00, 'Consultas', 'consulta'),

  -- SADT (14)
  ('2.01.01.01-2', 'Eletrocardiograma', 'ECG', 'SADT', 'Cardiologia', '03.01.02.01.00', 50.00, 100.00, 70.00, 'SADT', 'sadt'),
  ('2.01.02.01-2', 'Teste Ergom├®trico', 'Teste Ergo', 'SADT', 'Cardiologia', '03.01.02.02.00', 150.00, 300.00, 200.00, 'SADT', 'sadt'),
  ('2.01.03.01-2', 'Ecocardiograma', 'Ecocardia', 'SADT', 'Cardiologia', '03.01.02.03.00', 200.00, 400.00, 280.00, 'SADT', 'sadt'),
  ('2.02.01.01-2', 'Ultrassonografia Abdomen Total', 'USG Abd', 'SADT', 'Imagem', '03.02.02.02.00', 80.00, 150.00, 120.00, 'SADT', 'sadt'),
  ('2.02.02.01-2', 'Ultrassonografia P├®lvica', 'USG Pelv', 'SADT', 'Imagem', '03.02.02.02.10', 70.00, 140.00, 100.00, 'SADT', 'sadt'),
  ('2.02.03.01-2', 'Ultrassonografia Mam├íria', 'USG Mama', 'SADT', 'Imagem', '03.02.02.02.20', 90.00, 160.00, 130.00, 'SADT', 'sadt'),
  ('2.02.04.01-2', 'Ultrassonografia Tireoide', 'USG Tire├│ide', 'SADT', 'Imagem', '03.02.02.02.30', 60.00, 120.00, 90.00, 'SADT', 'sadt'),
  ('2.03.01.01-2', 'Radiografia de T├│rax', 'RX T├│rax', 'SADT', 'Imagem', '03.02.01.01.00', 60.00, 120.00, 90.00, 'SADT', 'sadt'),
  ('2.03.02.01-2', 'Radiografia de Coluna', 'RX Coluna', 'SADT', 'Imagem', '03.02.01.01.10', 70.00, 130.00, 100.00, 'SADT', 'sadt'),
  ('2.03.03.01-2', 'Radiografia de Pelvis', 'RX Pelv', 'SADT', 'Imagem', '03.02.01.01.20', 70.00, 130.00, 100.00, 'SADT', 'sadt'),
  ('2.04.01.01-2', 'Tomografia de Cr├ónio', 'TC Cr├ónio', 'SADT', 'Imagem', '03.02.03.01.00', 300.00, 600.00, 450.00, 'SADT', 'sadt'),
  ('2.04.02.01-2', 'Tomografia do Abdomen', 'TC Abd', 'SADT', 'Imagem', '03.02.03.01.10', 350.00, 700.00, 500.00, 'SADT', 'sadt'),
  ('2.05.01.01-2', 'Eletroencefalograma', 'EEG', 'SADT', 'Neurologia', '03.03.01.01.00', 100.00, 200.00, 150.00, 'SADT', 'sadt'),
  ('2.06.01.01-2', 'Teste de Fun├º├úo Pulmonar', 'Espirom', 'SADT', 'Pneumologia', '03.04.01.01.00', 80.00, 150.00, 120.00, 'SADT', 'sadt'),

  -- PROCEDIMENTOS (10)
  ('3.01.01.01-2', 'Sutura Simples', 'Sutura', 'Procedimento', 'Cirurgia', '04.03.02.01.00', 100.00, 250.00, 150.00, 'Procedimentos', 'procedimento'),
  ('3.01.02.01-2', 'Retirada de Pontos', 'Ret. Pontos', 'Procedimento', 'Cirurgia', '04.03.02.02.00', 50.00, 150.00, 80.00, 'Procedimentos', 'procedimento'),
  ('3.02.01.01-2', 'Curativo com Troca de Atadura', 'Curativo', 'Procedimento', 'Cirurgia', '04.03.03.01.00', 30.00, 80.00, 50.00, 'Procedimentos', 'procedimento'),
  ('3.03.01.01-2', 'Drenagem de Abscesso', 'Dren. Abs', 'Procedimento', 'Cirurgia', '04.03.04.01.00', 200.00, 500.00, 350.00, 'Procedimentos', 'procedimento'),
  ('3.04.01.01-2', 'Cauteriza├º├úo de Verruga', 'Cauteriza├º├úo', 'Procedimento', 'Dermatologia', '04.02.01.01.00', 100.00, 250.00, 150.00, 'Procedimentos', 'procedimento'),
  ('3.05.01.01-2', 'Infiltra├º├úo - 1┬¬ Articula├º├úo', 'Infiltra├º├úo 1', 'Procedimento', 'Ortopedia', '04.04.01.01.00', 150.00, 300.00, 200.00, 'Procedimentos', 'procedimento'),
  ('3.05.02.01-2', 'Infiltra├º├úo - Articula├º├Áes Adicionais', 'Infiltra├º├úo Adic', 'Procedimento', 'Ortopedia', '04.04.01.01.10', 80.00, 200.00, 120.00, 'Procedimentos', 'procedimento'),
  ('3.06.01.01-2', 'Aplica├º├úo de Inje├º├úo Intramuscular', 'Inj IM', 'Procedimento', 'Enfermagem', '04.05.01.01.00', 20.00, 50.00, 30.00, 'Procedimentos', 'procedimento'),
  ('3.07.01.01-2', 'Aplica├º├úo de Inje├º├úo Intravenosa', 'Inj IV', 'Procedimento', 'Enfermagem', '04.05.02.01.00', 30.00, 80.00, 50.00, 'Procedimentos', 'procedimento'),
  ('3.08.01.01-2', 'Pequeno Procedimento Cir├║rgico', 'Pequeno Proc', 'Procedimento', 'Cirurgia', '04.03.01.01.00', 200.00, 500.00, 350.00, 'Procedimentos', 'procedimento'),

  -- INTERNA├ç├òES (5)
  ('4.01.01.01-2', 'Di├íria de Interna├º├úo - Enfermaria', 'Di├íria Enf', 'Interna├º├úo', 'Interna├º├úo', '05.01.01.01.00', 300.00, 600.00, 450.00, 'Interna├º├Áes', 'internacao'),
  ('4.01.02.01-2', 'Di├íria de Interna├º├úo - Apartamento', 'Di├íria Apto', 'Interna├º├úo', 'Interna├º├úo', '05.01.01.02.00', 500.00, 1000.00, 750.00, 'Interna├º├Áes', 'internacao'),
  ('4.02.01.01-2', 'Taxa Operat├│ria - Pequena Cirurgia', 'Taxa Op Peq', 'Interna├º├úo', 'Cirurgia', '05.02.01.01.00', 500.00, 1200.00, 800.00, 'Interna├º├Áes', 'internacao'),
  ('4.02.02.01-2', 'Taxa Operat├│ria - M├®dia Cirurgia', 'Taxa Op Med', 'Interna├º├úo', 'Cirurgia', '05.02.01.02.00', 800.00, 2000.00, 1200.00, 'Interna├º├Áes', 'internacao'),
  ('4.02.03.01-2', 'Taxa Operat├│ria - Grande Cirurgia', 'Taxa Op Gde', 'Interna├º├úo', 'Cirurgia', '05.02.01.03.00', 1200.00, 3000.00, 1800.00, 'Interna├º├Áes', 'internacao'),

  -- OUTROS PROCEDIMENTOS (11)
  ('5.01.01.01-2', 'Coleta de Material p/ Exame', 'Coleta Material', 'Outros', 'Laborat├│rio', '03.05.01.01.00', 20.00, 50.00, 30.00, 'Outros', 'outro'),
  ('5.02.01.01-2', 'Teste de Gravidez', 'Teste Grav', 'Outros', 'Laborat├│rio', '03.05.02.01.00', 30.00, 60.00, 40.00, 'Outros', 'outro'),
  ('5.03.01.01-2', 'Teste R├ípido COVID', 'Teste COVID', 'Outros', 'Laborat├│rio', '03.05.03.01.00', 50.00, 100.00, 70.00, 'Outros', 'outro'),
  ('5.04.01.01-2', 'Imuniza├º├úo - Vacina', 'Vacina', 'Outros', 'Imuniza├º├úo', '06.01.01.01.00', 40.00, 150.00, 80.00, 'Outros', 'outro'),
  ('5.05.01.01-2', 'Eletroforese de Prote├¡nas', 'Eletrof Prot', 'Outros', 'Laborat├│rio', '03.05.04.01.00', 60.00, 120.00, 90.00, 'Outros', 'outro'),
  ('5.06.01.01-2', 'Histerossalpingografia', 'HSG', 'Outros', 'Ginecologia', '03.02.03.02.00', 200.00, 400.00, 300.00, 'Outros', 'outro'),
  ('5.07.01.01-2', 'Mielografia', 'Mielograma', 'Outros', 'Neurologia', '03.02.04.01.00', 250.00, 500.00, 350.00, 'Outros', 'outro'),
  ('5.08.01.01-2', 'Artrocentese', 'Artrocentese', 'Outros', 'Ortopedia', '04.04.02.01.00', 150.00, 300.00, 200.00, 'Outros', 'outro'),
  ('5.09.01.01-2', 'Paracentese', 'Paracentese', 'Outros', 'Cirurgia', '04.06.01.01.00', 200.00, 400.00, 300.00, 'Outros', 'outro'),
  ('5.10.01.01-2', 'Toracocentese', 'Toracocentese', 'Outros', 'Pneumologia', '04.06.02.01.00', 200.00, 400.00, 300.00, 'Outros', 'outro')
) AS proc(codigo, descricao, descricao_curta, grupo, subgrupo, tuss, minimo, maximo, base, categoria_grupo, tipo)
ON CONFLICT DO NOTHING;

-- Verificar quantos foram inseridos
SELECT COUNT(*) as total_procedimentos FROM cbhpm_procedures WHERE ativo = true;
