-- ============================================================
-- Inserir 50 Procedimentos CBHPM Completos
-- Execute no Supabase SQL Editor
-- ============================================================

-- Pegar o clinic_id da primeira clínica (ajuste se necessário)
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
  -- CONSULTAS
  ('1.01.01.01-2', 'Consulta - Clínico Geral', 'Consult. Clín. Geral', 'Consultas', 'Clínica Geral', '0101010112', 100.00, 150.00, 110.00, 'Consultas', 'consulta'),
  ('1.01.02.01-2', 'Consulta - Cardiologista', 'Consult. Cardio', 'Consultas', 'Cardiologia', '0101020112', 150.00, 250.00, 180.00, 'Consultas', 'consulta'),
  ('1.01.03.01-2', 'Consulta - Dermatologista', 'Consult. Derma', 'Consultas', 'Dermatologia', '0101030112', 120.00, 200.00, 150.00, 'Consultas', 'consulta'),
  ('1.01.04.01-2', 'Consulta - Ortopedista', 'Consult. Orto', 'Consultas', 'Ortopedia', '0101040112', 140.00, 220.00, 160.00, 'Consultas', 'consulta'),
  ('1.01.05.01-2', 'Consulta - Oftalmologista', 'Consult. Oftal', 'Consultas', 'Oftalmologia', '0101050112', 130.00, 210.00, 155.00, 'Consultas', 'consulta'),
  ('1.01.06.01-2', 'Consulta - Ginecologista', 'Consult. Gine', 'Consultas', 'Ginecologia', '0101060112', 130.00, 210.00, 160.00, 'Consultas', 'consulta'),
  ('1.01.07.01-2', 'Consulta - Urologista', 'Consult. Uro', 'Consultas', 'Urologia', '0101070112', 140.00, 220.00, 165.00, 'Consultas', 'consulta'),
  ('1.01.08.01-2', 'Consulta - Pediatra', 'Consult. Peds', 'Consultas', 'Pediatria', '0101080112', 100.00, 180.00, 120.00, 'Consultas', 'consulta'),
  ('1.01.09.01-2', 'Consulta - Pneumologista', 'Consult. Pneumo', 'Consultas', 'Pneumologia', '0101090112', 150.00, 240.00, 170.00, 'Consultas', 'consulta'),
  ('1.01.10.01-2', 'Consulta - Gastroenterologista', 'Consult. Gastro', 'Consultas', 'Gastroenterologia', '0101100112', 140.00, 230.00, 165.00, 'Consultas', 'consulta'),
  
  -- SADT
  ('2.01.01.01-2', 'Eletrocardiograma', 'ECG', 'SADT', 'Cardiologia', '03.01.02.01.00', 50.00, 100.00, 70.00, 'SADT', 'sadt'),
  ('2.01.02.01-2', 'Teste Ergométrico', 'Teste Ergo', 'SADT', 'Cardiologia', '03.01.02.02.00', 150.00, 300.00, 200.00, 'SADT', 'sadt'),
  ('2.01.03.01-2', 'Ecocardiograma', 'Ecocardia', 'SADT', 'Cardiologia', '03.01.02.03.00', 200.00, 400.00, 280.00, 'SADT', 'sadt'),
  ('2.02.01.01-2', 'Ultrassonografia Abdomen Total', 'USG Abd', 'SADT', 'Imagem', '03.02.02.02.00', 80.00, 150.00, 120.00, 'SADT', 'sadt'),
  ('2.02.02.01-2', 'Ultrassonografia Pélvica', 'USG Pelv', 'SADT', 'Imagem', '03.02.02.02.10', 70.00, 140.00, 100.00, 'SADT', 'sadt'),
  ('2.02.03.01-2', 'Ultrassonografia Mamária', 'USG Mama', 'SADT', 'Imagem', '03.02.02.02.20', 90.00, 160.00, 130.00, 'SADT', 'sadt'),
  ('2.02.04.01-2', 'Ultrassonografia Tireoide', 'USG Tireóide', 'SADT', 'Imagem', '03.02.02.02.30', 60.00, 120.00, 90.00, 'SADT', 'sadt'),
  ('2.03.01.01-2', 'Radiografia de Tórax', 'RX Tórax', 'SADT', 'Imagem', '03.02.01.01.00', 60.00, 120.00, 90.00, 'SADT', 'sadt'),
  ('2.03.02.01-2', 'Radiografia de Coluna', 'RX Coluna', 'SADT', 'Imagem', '03.02.01.01.10', 70.00, 130.00, 100.00, 'SADT', 'sadt'),
  ('2.03.03.01-2', 'Radiografia de Pelvis', 'RX Pelv', 'SADT', 'Imagem', '03.02.01.01.20', 70.00, 130.00, 100.00, 'SADT', 'sadt'),
  ('2.04.01.01-2', 'Tomografia de Crânio', 'TC Crânio', 'SADT', 'Imagem', '03.02.03.01.00', 300.00, 600.00, 450.00, 'SADT', 'sadt'),
  ('2.04.02.01-2', 'Tomografia do Abdomen', 'TC Abd', 'SADT', 'Imagem', '03.02.03.01.10', 350.00, 700.00, 500.00, 'SADT', 'sadt'),
  ('2.05.01.01-2', 'Eletroencefalograma', 'EEG', 'SADT', 'Neurologia', '03.03.01.01.00', 100.00, 200.00, 150.00, 'SADT', 'sadt'),
  ('2.06.01.01-2', 'Teste de Função Pulmonar', 'Espirom', 'SADT', 'Pneumologia', '03.04.01.01.00', 80.00, 150.00, 120.00, 'SADT', 'sadt'),
  
  -- PROCEDIMENTOS
  ('3.01.01.01-2', 'Sutura Simples', 'Sutura', 'Procedimento', 'Cirurgia', '04.03.02.01.00', 100.00, 250.00, 150.00, 'Procedimentos', 'procedimento'),
  ('3.01.02.01-2', 'Retirada de Pontos', 'Ret. Pontos', 'Procedimento', 'Cirurgia', '04.03.02.02.00', 50.00, 150.00, 80.00, 'Procedimentos', 'procedimento'),
  ('3.02.01.01-2', 'Curativo com Troca de Atadura', 'Curativo', 'Procedimento', 'Cirurgia', '04.03.03.01.00', 30.00, 80.00, 50.00, 'Procedimentos', 'procedimento'),
  ('3.03.01.01-2', 'Drenagem de Abscesso', 'Dren. Abs', 'Procedimento', 'Cirurgia', '04.03.04.01.00', 200.00, 500.00, 350.00, 'Procedimentos', 'procedimento'),
  ('3.04.01.01-2', 'Cauterização de Verruga', 'Cauterização', 'Procedimento', 'Dermatologia', '04.02.01.01.00', 100.00, 250.00, 150.00, 'Procedimentos', 'procedimento'),
  ('3.05.01.01-2', 'Infiltração - 1ª Articulação', 'Infiltração 1', 'Procedimento', 'Ortopedia', '04.04.01.01.00', 150.00, 300.00, 200.00, 'Procedimentos', 'procedimento'),
  ('3.05.02.01-2', 'Infiltração - Articulações Adicionais', 'Infiltração Adic', 'Procedimento', 'Ortopedia', '04.04.01.01.10', 80.00, 200.00, 120.00, 'Procedimentos', 'procedimento'),
  ('3.06.01.01-2', 'Aplicação de Injeção Intramuscular', 'Inj IM', 'Procedimento', 'Enfermagem', '04.05.01.01.00', 20.00, 50.00, 30.00, 'Procedimentos', 'procedimento'),
  ('3.07.01.01-2', 'Aplicação de Injeção Intravenosa', 'Inj IV', 'Procedimento', 'Enfermagem', '04.05.02.01.00', 30.00, 80.00, 50.00, 'Procedimentos', 'procedimento'),
  ('3.08.01.01-2', 'Pequeno Procedimento Cirúrgico', 'Pequeno Proc', 'Procedimento', 'Cirurgia', '04.03.01.01.00', 200.00, 500.00, 350.00, 'Procedimentos', 'procedimento'),
  
  -- INTERNAÇÕES
  ('4.01.01.01-2', 'Diária de Internação - Enfermaria', 'Diária Enf', 'Internação', 'Internação', '05.01.01.01.00', 300.00, 600.00, 450.00, 'Internações', 'internacao'),
  ('4.01.02.01-2', 'Diária de Internação - Apartamento', 'Diária Apto', 'Internação', 'Internação', '05.01.01.02.00', 500.00, 1000.00, 750.00, 'Internações', 'internacao'),
  ('4.02.01.01-2', 'Taxa Operatória - Pequena Cirurgia', 'Taxa Op Peq', 'Internação', 'Cirurgia', '05.02.01.01.00', 500.00, 1200.00, 800.00, 'Internações', 'internacao'),
  ('4.02.02.01-2', 'Taxa Operatória - Média Cirurgia', 'Taxa Op Med', 'Internação', 'Cirurgia', '05.02.01.02.00', 800.00, 2000.00, 1200.00, 'Internações', 'internacao'),
  ('4.02.03.01-2', 'Taxa Operatória - Grande Cirurgia', 'Taxa Op Gde', 'Internação', 'Cirurgia', '05.02.01.03.00', 1200.00, 3000.00, 1800.00, 'Internações', 'internacao'),
  
  -- OUTROS PROCEDIMENTOS
  ('5.01.01.01-2', 'Coleta de Material p/ Exame', 'Coleta Material', 'Outros', 'Laboratório', '03.05.01.01.00', 20.00, 50.00, 30.00, 'Outros', 'outro'),
  ('5.02.01.01-2', 'Teste de Gravidez', 'Teste Grav', 'Outros', 'Laboratório', '03.05.02.01.00', 30.00, 60.00, 40.00, 'Outros', 'outro'),
  ('5.03.01.01-2', 'Teste Rápido COVID', 'Teste COVID', 'Outros', 'Laboratório', '03.05.03.01.00', 50.00, 100.00, 70.00, 'Outros', 'outro'),
  ('5.04.01.01-2', 'Imunização - Vacina', 'Vacina', 'Outros', 'Imunização', '06.01.01.01.00', 40.00, 150.00, 80.00, 'Outros', 'outro'),
  ('5.05.01.01-2', 'Eletroforese de Proteínas', 'Eletrof Prot', 'Outros', 'Laboratório', '03.05.04.01.00', 60.00, 120.00, 90.00, 'Outros', 'outro'),
  ('5.06.01.01-2', 'Histerossalpingografia', 'HSG', 'Outros', 'Ginecologia', '03.02.03.02.00', 200.00, 400.00, 300.00, 'Outros', 'outro'),
  ('5.07.01.01-2', 'Mielografia', 'Mielograma', 'Outros', 'Neurologia', '03.02.04.01.00', 250.00, 500.00, 350.00, 'Outros', 'outro'),
  ('5.08.01.01-2', 'Artrocentese', 'Artrocentese', 'Outros', 'Ortopedia', '04.04.02.01.00', 150.00, 300.00, 200.00, 'Outros', 'outro'),
  ('5.09.01.01-2', 'Paracentese', 'Paracentese', 'Outros', 'Cirurgia', '04.06.01.01.00', 200.00, 400.00, 300.00, 'Outros', 'outro'),
  ('5.10.01.01-2', 'Toracocentese', 'Toracocentese', 'Outros', 'Pneumologia', '04.06.02.01.00', 200.00, 400.00, 300.00, 'Outros', 'outro')
) AS proc(codigo, descricao, descricao_curta, grupo, subgrupo, tuss, minimo, maximo, base, categoria_grupo, tipo)
LIMIT 50;

-- Verificar quantos foram inseridos
SELECT COUNT(*) as total_procedimentos FROM cbhpm_procedures WHERE ativo = true;
