-- ============================================================
-- Inserir CBHPM para a Clínica do Usuário Atual
-- Execute no Supabase SQL Editor
-- Vai usar a primeira clínica disponível ou a clínica específica
-- ============================================================

-- Se você souber o clinic_id exato, descomente e use:
-- \set clinic_id '00000000-0000-0000-0000-000000000000'

-- Caso contrário, o script usa a primeira clínica
WITH clinic_data AS (
  -- OPÇÃO 1: Usar primeira clínica
  SELECT id FROM clinics LIMIT 1
  -- OPÇÃO 2: Descomentar e colocar seu clinic_id aqui
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
  ('1.01.01.01-2', 'Consulta - Clínico Geral', 'Consult. Clín. Geral', 'Consultas', 'Clínica Geral', '0101010112', 100.00, 150.00, 110.00, 'Consultas', 'consulta'),
  ('1.01.01.02-0', 'Consulta - Pediatria', 'Consult. Pediatria', 'Consultas', 'Pediatria', '0101010120', 90.00, 140.00, 100.00, 'Consultas', 'consulta'),
  ('1.01.01.03-9', 'Consulta - Cardiologia', 'Consult. Cardiologia', 'Consultas', 'Cardiologia', '0101010139', 150.00, 200.00, 180.00, 'Consultas', 'consulta'),
  ('1.01.01.04-7', 'Consulta - Dermatologia', 'Consult. Dermatologia', 'Consultas', 'Dermatologia', '0101010147', 120.00, 170.00, 140.00, 'Consultas', 'consulta'),
  ('1.01.01.05-5', 'Consulta - Neurologia', 'Consult. Neurologia', 'Consultas', 'Neurologia', '0101010155', 150.00, 200.00, 180.00, 'Consultas', 'consulta'),
  ('1.01.01.06-3', 'Consulta - Ortopedia', 'Consult. Ortopedia', 'Consultas', 'Ortopedia', '0101010163', 140.00, 190.00, 160.00, 'Consultas', 'consulta'),
  ('1.01.01.07-1', 'Consulta - Oftalmologia', 'Consult. Oftalmologia', 'Consultas', 'Oftalmologia', '0101010171', 130.00, 180.00, 150.00, 'Consultas', 'consulta'),
  ('1.01.01.08-0', 'Consulta - Otorrinolaringologia', 'Consult. ORL', 'Consultas', 'Otorrinolaringologia', '0101010189', 120.00, 170.00, 140.00, 'Consultas', 'consulta'),
  ('1.01.01.09-8', 'Consulta - Pneumologia', 'Consult. Pneumologia', 'Consultas', 'Pneumologia', '0101010197', 140.00, 190.00, 160.00, 'Consultas', 'consulta'),
  ('1.01.01.10-6', 'Consulta - Ginecologia', 'Consult. Ginecologia', 'Consultas', 'Ginecologia', '0101010201', 130.00, 180.00, 150.00, 'Consultas', 'consulta'),
  
  -- SADT (Serviços Auxiliares de Diagnóstico e Terapia)
  ('2.01.01.01-5', 'Eletrocardiografia', 'ECG', 'SADT', 'Cardiologia', '2010101015', 50.00, 80.00, 60.00, 'SADT', 'diagnostico'),
  ('2.02.01.01-8', 'Ultrassonografia - Abdome', 'USG Abdome', 'SADT', 'Ultrassom', '2020101018', 120.00, 180.00, 150.00, 'SADT', 'diagnostico'),
  ('2.02.01.02-6', 'Ultrassonografia - Pélvis', 'USG Pélvis', 'SADT', 'Ultrassom', '2020101026', 120.00, 180.00, 150.00, 'SADT', 'diagnostico'),
  ('2.02.01.03-4', 'Ultrassonografia - Mama', 'USG Mama', 'SADT', 'Ultrassom', '2020101034', 140.00, 200.00, 170.00, 'SADT', 'diagnostico'),
  ('2.03.01.01-1', 'Radiografia - Tórax', 'Raio-X Tórax', 'SADT', 'Radiologia', '2030101011', 60.00, 100.00, 80.00, 'SADT', 'diagnostico'),
  ('2.03.01.02-9', 'Radiografia - Coluna', 'Raio-X Coluna', 'SADT', 'Radiologia', '2030101029', 70.00, 120.00, 90.00, 'SADT', 'diagnostico'),
  ('2.03.01.03-7', 'Radiografia - Membros', 'Raio-X Membros', 'SADT', 'Radiologia', '2030101037', 60.00, 100.00, 80.00, 'SADT', 'diagnostico'),
  ('2.04.01.01-4', 'Tomografia Computadorizada', 'TC', 'SADT', 'Imaging', '2040101014', 400.00, 600.00, 500.00, 'SADT', 'diagnostico'),
  ('2.05.01.01-7', 'Ressonância Magnética', 'RM', 'SADT', 'Imaging', '2050101017', 800.00, 1200.00, 1000.00, 'SADT', 'diagnostico'),
  ('2.06.01.01-0', 'Endoscopia Digestiva', 'Endoscopia', 'SADT', 'Gastroenterologia', '2060101010', 300.00, 500.00, 400.00, 'SADT', 'diagnostico'),
  
  -- PROCEDIMENTOS
  ('3.01.01.01-3', 'Coleta de Material para Diagnóstico', 'Coleta Sangue', 'Procedimentos', 'Laboratorial', '3010101013', 30.00, 50.00, 40.00, 'Procedimentos', 'terapeutico'),
  ('3.02.01.01-6', 'Limpeza e Remoção de Corpos Estranhos', 'Limpeza Ferida', 'Procedimentos', 'Geral', '3020101016', 80.00, 150.00, 100.00, 'Procedimentos', 'terapeutico'),
  ('3.03.01.01-9', 'Curativo Cirúrgico', 'Curativo', 'Procedimentos', 'Geral', '3030101019', 60.00, 120.00, 80.00, 'Procedimentos', 'terapeutico'),
  ('3.04.01.01-2', 'Injeção Medicamentosa', 'Injeção IM/IV', 'Procedimentos', 'Geral', '3040101012', 40.00, 80.00, 60.00, 'Procedimentos', 'terapeutico'),
  ('3.05.01.01-5', 'Inalação Medicamentosa', 'Inalação', 'Procedimentos', 'Respiratório', '3050101015', 50.00, 100.00, 70.00, 'Procedimentos', 'terapeutico'),
  ('3.06.01.01-8', 'Pequena Cirurgia', 'Cirurgia Menor', 'Procedimentos', 'Cirúrgico', '3060101018', 300.00, 600.00, 450.00, 'Procedimentos', 'terapeutico'),
  ('3.07.01.01-1', 'Sutura Simples', 'Sutura', 'Procedimentos', 'Cirúrgico', '3070101011', 150.00, 300.00, 200.00, 'Procedimentos', 'terapeutico'),
  ('3.08.01.01-4', 'Imobilização de Membro', 'Imobilização', 'Procedimentos', 'Ortopedia', '3080101014', 100.00, 200.00, 150.00, 'Procedimentos', 'terapeutico'),
  ('3.09.01.01-7', 'Infiltração Articular', 'Infiltração', 'Procedimentos', 'Ortopedia', '3090101017', 200.00, 400.00, 300.00, 'Procedimentos', 'terapeutico'),
  ('3.10.01.01-0', 'Punção de Cisto', 'Punção', 'Procedimentos', 'Cirúrgico', '3100101010', 250.00, 500.00, 350.00, 'Procedimentos', 'terapeutico'),
  
  -- FISIOTERAPIA/REABILITAÇÃO
  ('4.01.01.01-5', 'Sessão Fisioterapia - 1 área corporal', 'Fisioterapia', 'Reabilitação', 'Fisioterapia', '4010101015', 80.00, 140.00, 100.00, 'Reabilitação', 'terapeutico'),
  ('4.01.01.02-3', 'Sessão Fisioterapia - 2 áreas corporais', 'Fisioterapia +', 'Reabilitação', 'Fisioterapia', '4010101023', 110.00, 180.00, 130.00, 'Reabilitação', 'terapeutico'),
  ('4.02.01.01-8', 'Sessão Fonoaudiologia', 'Fonoaudiologia', 'Reabilitação', 'Fonoaudiologia', '4020101018', 100.00, 160.00, 120.00, 'Reabilitação', 'terapeutico'),
  ('4.03.01.01-1', 'Sessão Terapia Ocupacional', 'T.O.', 'Reabilitação', 'Terapia Ocupacional', '4030101011', 90.00, 150.00, 110.00, 'Reabilitação', 'terapeutico'),
  ('4.04.01.01-4', 'Sessão Psicologia', 'Psicologia', 'Reabilitação', 'Psicologia', '4040101014', 120.00, 180.00, 150.00, 'Reabilitação', 'terapeutico'),
  ('4.05.01.01-7', 'Sessão Nutrição', 'Nutrição', 'Reabilitação', 'Nutrição', '4050101017', 100.00, 160.00, 130.00, 'Reabilitação', 'terapeutico'),
  
  -- INTERNAÇÃO
  ('5.01.01.01-2', 'Internação - Enfermaria', 'Internação Enf.', 'Internação', 'Enfermaria', '5010101012', 300.00, 500.00, 400.00, 'Internação', 'internacao'),
  ('5.01.01.02-0', 'Internação - Apartamento', 'Internação Apart.', 'Internação', 'Apartamento', '5010101020', 500.00, 800.00, 650.00, 'Internação', 'internacao'),
  ('5.02.01.01-5', 'Permanência Integral HU/Dia', 'HU Integral', 'Internação', 'Hospital Dia', '5020101015', 800.00, 1200.00, 1000.00, 'Internação', 'internacao'),
  ('5.03.01.01-8', 'Diária - Centro de Maturação', 'Maturação', 'Internação', 'Obs. Perinatologia', '5030101018', 600.00, 900.00, 750.00, 'Internação', 'internacao'),
  ('5.04.01.01-1', 'Diária - Unidade de Terapia Intensiva', 'UTI', 'Internação', 'UTI', '5040101011', 1200.00, 2000.00, 1500.00, 'Internação', 'internacao'),
  
  -- TRANSPORTES
  ('6.01.01.01-6', 'Transporte de Paciente - Urgência', 'Transporte Urgência', 'Transportes', 'Ambulância', '6010101016', 150.00, 300.00, 200.00, 'Transportes', 'transporte'),
  ('6.01.01.02-4', 'Transporte de Paciente - Eletivo', 'Transporte Eletivo', 'Transportes', 'Ambulância', '6010101024', 100.00, 200.00, 150.00, 'Transportes', 'transporte'),
  ('6.02.01.01-9', 'Transporte de Órgão para Transplante', 'Transporte Órgão', 'Transportes', 'Transporte Especial', '6020101019', 500.00, 1000.00, 750.00, 'Transportes', 'transporte'),
  
  -- MEDICAMENTOS E HEMODERIVADOS  
  ('7.01.01.01-3', 'Medicamento - Injetável', 'Medicamento', 'Medicamentos', 'Medicação', '7010101013', 50.00, 200.00, 100.00, 'Medicamentos', 'farmaco'),
  ('7.02.01.01-6', 'Hemoderivado - Bolsa', 'Hemoderivado', 'Medicamentos', 'Hemocomponente', '7020101016', 300.00, 500.00, 400.00, 'Medicamentos', 'farmaco')
) AS data(codigo, descricao, descricao_curta, grupo, subgrupo, tuss, minimo, maximo, base, categoria_grupo, tipo)
ON CONFLICT DO NOTHING;

-- Verificar quantos registros foram inseridos
SELECT count(*) as "Total de CBHPM na clínica" FROM cbhpm_procedures 
WHERE clinic_id = (SELECT id FROM clinics LIMIT 1);
