-- ============================================================
-- LISTA COMPLETA DE SERVIÇOS E PROCEDIMENTOS CBHPM
-- Copie e execute no Supabase SQL Editor
-- ============================================================

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
  -- ===== CONSULTAS - CLÍNICA GERAL E ESPECIALIDADES (25) =====
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
  ('1.01.11.01-2', 'Consulta - Reumatologista', 'Consult. Reuma', 'Consultas', 'Reumatologia', '0101110112', 130.00, 210.00, 155.00, 'Consultas', 'consulta'),
  ('1.01.12.01-2', 'Consulta - Neurologista', 'Consult. Neuro', 'Consultas', 'Neurologia', '0101120112', 140.00, 220.00, 165.00, 'Consultas', 'consulta'),
  ('1.01.13.01-2', 'Consulta - Psiquiatra', 'Consult. Psiq', 'Consultas', 'Psiquiatria', '0101130112', 130.00, 210.00, 160.00, 'Consultas', 'consulta'),
  ('1.01.14.01-2', 'Consulta - Endocrinologista', 'Consult. Endo', 'Consultas', 'Endocrinologia', '0101140112', 140.00, 220.00, 165.00, 'Consultas', 'consulta'),
  ('1.01.15.01-2', 'Consulta - Otorrinolaringologista', 'Consult. ORL', 'Consultas', 'Otorrinolaringologia', '0101150112', 130.00, 210.00, 155.00, 'Consultas', 'consulta'),
  ('1.01.16.01-2', 'Consulta - Cirurgião Geral', 'Consult. CG', 'Consultas', 'Cirurgia Geral', '0101160112', 150.00, 250.00, 180.00, 'Consultas', 'consulta'),
  ('1.01.17.01-2', 'Consulta - Proctologista', 'Consult. Procto', 'Consultas', 'Proctologia', '0101170112', 140.00, 220.00, 165.00, 'Consultas', 'consulta'),
  ('1.01.18.01-2', 'Consulta - Oftalmologia Clínica', 'Consult. Oftalmologia', 'Consultas', 'Oftalmologia Clínica', '0101180112', 150.00, 230.00, 170.00, 'Consultas', 'consulta'),
  ('1.01.19.01-2', 'Consulta - Infectologista', 'Consult. Infecto', 'Consultas', 'Infectologia', '0101190112', 140.00, 220.00, 165.00, 'Consultas', 'consulta'),
  ('1.01.20.01-2', 'Consulta - Oncologista', 'Consult. Onco', 'Consultas', 'Oncologia', '0101200112', 160.00, 260.00, 190.00, 'Consultas', 'consulta'),
  ('1.01.21.01-2', 'Consulta - Cardiologia Pediátrica', 'Consult. Cardio Ped', 'Consultas', 'Cardiologia Pediátrica', '0101210112', 150.00, 250.00, 180.00, 'Consultas', 'consulta'),
  ('1.01.22.01-2', 'Consulta - Neonatologia', 'Consult. Neona', 'Consultas', 'Neonatologia', '0101220112', 140.00, 220.00, 165.00, 'Consultas', 'consulta'),
  ('1.01.23.01-2', 'Consulta - Alergista', 'Consult. Alergia', 'Consultas', 'Alergia e Imunologia', '0101230112', 130.00, 210.00, 155.00, 'Consultas', 'consulta'),
  ('1.01.24.01-2', 'Consulta - Fisiatra', 'Consult. Fisiatra', 'Consultas', 'Medicina Física', '0101240112', 140.00, 220.00, 165.00, 'Consultas', 'consulta'),
  ('1.01.25.01-2', 'Consulta - Geriatria', 'Consult. Geria', 'Consultas', 'Geriatria', '0101250112', 130.00, 210.00, 155.00, 'Consultas', 'consulta'),
  
  -- ===== SADT - EXAMES DIAGNÓSTICOS (35) =====
  -- Cardiologia
  ('2.01.01.01-2', 'Eletrocardiograma', 'ECG', 'SADT', 'Cardiologia', '03.01.02.01.00', 50.00, 100.00, 70.00, 'SADT', 'sadt'),
  ('2.01.02.01-2', 'Teste Ergométrico', 'Teste Ergo', 'SADT', 'Cardiologia', '03.01.02.02.00', 150.00, 300.00, 200.00, 'SADT', 'sadt'),
  ('2.01.03.01-2', 'Ecocardiograma', 'Ecocardia', 'SADT', 'Cardiologia', '03.01.02.03.00', 200.00, 400.00, 280.00, 'SADT', 'sadt'),
  ('2.01.04.01-2', 'Holter 24h', 'Holter', 'SADT', 'Cardiologia', '03.01.02.04.00', 180.00, 350.00, 250.00, 'SADT', 'sadt'),
  ('2.01.05.01-2', 'Monitoramento Ambulatorial de PA', 'MAPA', 'SADT', 'Cardiologia', '03.01.02.05.00', 150.00, 300.00, 200.00, 'SADT', 'sadt'),
  
  -- Ultrassonografia
  ('2.02.01.01-2', 'Ultrassonografia Abdomen Total', 'USG Abd', 'SADT', 'Imagem', '03.02.02.02.00', 80.00, 150.00, 120.00, 'SADT', 'sadt'),
  ('2.02.02.01-2', 'Ultrassonografia Pélvica', 'USG Pelv', 'SADT', 'Imagem', '03.02.02.02.10', 70.00, 140.00, 100.00, 'SADT', 'sadt'),
  ('2.02.03.01-2', 'Ultrassonografia Mamária', 'USG Mama', 'SADT', 'Imagem', '03.02.02.02.20', 90.00, 160.00, 130.00, 'SADT', 'sadt'),
  ('2.02.04.01-2', 'Ultrassonografia Tireoide', 'USG Tireóide', 'SADT', 'Imagem', '03.02.02.02.30', 60.00, 120.00, 90.00, 'SADT', 'sadt'),
  ('2.02.05.01-2', 'Ultrassonografia Próstata', 'USG Próstata', 'SADT', 'Imagem', '03.02.02.02.40', 80.00, 150.00, 120.00, 'SADT', 'sadt'),
  ('2.02.06.01-2', 'Ultrassonografia Renal', 'USG Renal', 'SADT', 'Imagem', '03.02.02.02.50', 70.00, 140.00, 100.00, 'SADT', 'sadt'),
  ('2.02.07.01-2', 'Ultrassonografia Obstétrica', 'USG Obstét', 'SADT', 'Imagem', '03.02.02.02.60', 100.00, 180.00, 140.00, 'SADT', 'sadt'),
  ('2.02.08.01-2', 'Ultrassonografia 3D/4D', 'USG 3D/4D', 'SADT', 'Imagem', '03.02.02.02.70', 120.00, 220.00, 160.00, 'SADT', 'sadt'),
  
  -- Radiografia
  ('2.03.01.01-2', 'Radiografia de Tórax', 'RX Tórax', 'SADT', 'Imagem', '03.02.01.01.00', 60.00, 120.00, 90.00, 'SADT', 'sadt'),
  ('2.03.02.01-2', 'Radiografia de Coluna', 'RX Coluna', 'SADT', 'Imagem', '03.02.01.01.10', 70.00, 130.00, 100.00, 'SADT', 'sadt'),
  ('2.03.03.01-2', 'Radiografia de Pelvis', 'RX Pelv', 'SADT', 'Imagem', '03.02.01.01.20', 70.00, 130.00, 100.00, 'SADT', 'sadt'),
  ('2.03.04.01-2', 'Radiografia de Membros', 'RX Membros', 'SADT', 'Imagem', '03.02.01.01.30', 60.00, 120.00, 90.00, 'SADT', 'sadt'),
  ('2.03.05.01-2', 'Radiografia de Crânio', 'RX Crânio', 'SADT', 'Imagem', '03.02.01.01.40', 70.00, 130.00, 100.00, 'SADT', 'sadt'),
  
  -- Tomografia
  ('2.04.01.01-2', 'Tomografia de Crânio', 'TC Crânio', 'SADT', 'Imagem', '03.02.03.01.00', 300.00, 600.00, 450.00, 'SADT', 'sadt'),
  ('2.04.02.01-2', 'Tomografia do Abdomen', 'TC Abd', 'SADT', 'Imagem', '03.02.03.01.10', 350.00, 700.00, 500.00, 'SADT', 'sadt'),
  ('2.04.03.01-2', 'Tomografia de Tórax', 'TC Tórax', 'SADT', 'Imagem', '03.02.03.01.20', 350.00, 650.00, 480.00, 'SADT', 'sadt'),
  ('2.04.04.01-2', 'Tomografia da Coluna', 'TC Coluna', 'SADT', 'Imagem', '03.02.03.01.30', 300.00, 600.00, 450.00, 'SADT', 'sadt'),
  ('2.04.05.01-2', 'Tomografia Pelvis', 'TC Pelvis', 'SADT', 'Imagem', '03.02.03.01.40', 350.00, 650.00, 480.00, 'SADT', 'sadt'),
  
  -- Ressonância Magnética
  ('2.05.01.01-2', 'Ressonância Magnética Crânio', 'RM Crânio', 'SADT', 'Imagem', '03.02.04.01.00', 500.00, 1000.00, 750.00, 'SADT', 'sadt'),
  ('2.05.02.01-2', 'Ressonância Magnética Coluna', 'RM Coluna', 'SADT', 'Imagem', '03.02.04.01.10', 500.00, 1000.00, 750.00, 'SADT', 'sadt'),
  ('2.05.03.01-2', 'Ressonância Magnética Abdomen', 'RM Abd', 'SADT', 'Imagem', '03.02.04.01.20', 550.00, 1100.00, 800.00, 'SADT', 'sadt'),
  ('2.05.04.01-2', 'Ressonância Magnética Articulações', 'RM Articul', 'SADT', 'Imagem', '03.02.04.01.30', 500.00, 950.00, 700.00, 'SADT', 'sadt'),
  
  -- Eletrofisiologia
  ('2.06.01.01-2', 'Eletroencefalograma', 'EEG', 'SADT', 'Neurologia', '03.03.01.01.00', 100.00, 200.00, 150.00, 'SADT', 'sadt'),
  ('2.06.02.01-2', 'Eletromiografia', 'EMG', 'SADT', 'Neurologia', '03.03.02.01.00', 150.00, 300.00, 200.00, 'SADT', 'sadt'),
  
  -- Pneumologia
  ('2.07.01.01-2', 'Teste de Função Pulmonar', 'Espirom', 'SADT', 'Pneumologia', '03.04.01.01.00', 80.00, 150.00, 120.00, 'SADT', 'sadt'),
  ('2.07.02.01-2', 'Teste de Broncoprovocação', 'TBP', 'SADT', 'Pneumologia', '03.04.02.01.00', 150.00, 300.00, 200.00, 'SADT', 'sadt'),
  
  -- ===== PROCEDIMENTOS CIRÚRGICOS E TERAPÊUTICOS (40) =====
  -- Cirurgia Geral
  ('3.01.01.01-2', 'Sutura Simples', 'Sutura', 'Procedimento', 'Cirurgia', '04.03.02.01.00', 100.00, 250.00, 150.00, 'Procedimentos', 'procedimento'),
  ('3.01.02.01-2', 'Retirada de Pontos', 'Ret. Pontos', 'Procedimento', 'Cirurgia', '04.03.02.02.00', 50.00, 150.00, 80.00, 'Procedimentos', 'procedimento'),
  ('3.02.01.01-2', 'Curativo com Troca de Atadura', 'Curativo', 'Procedimento', 'Cirurgia', '04.03.03.01.00', 30.00, 80.00, 50.00, 'Procedimentos', 'procedimento'),
  ('3.03.01.01-2', 'Drenagem de Abscesso', 'Dren. Abs', 'Procedimento', 'Cirurgia', '04.03.04.01.00', 200.00, 500.00, 350.00, 'Procedimentos', 'procedimento'),
  ('3.03.02.01-2', 'Ressecção de Lesão Benigna Pele', 'Ress Benigna', 'Procedimento', 'Cirurgia', '04.03.04.02.00', 200.00, 400.00, 300.00, 'Procedimentos', 'procedimento'),
  ('3.03.03.01-2', 'Ressecção de Lesão Maligna Pele', 'Ress Maligna', 'Procedimento', 'Cirurgia', '04.03.04.03.00', 300.00, 600.00, 450.00, 'Procedimentos', 'procedimento'),
  
  -- Dermatologia
  ('3.04.01.01-2', 'Cauterização de Verruga', 'Cauterização', 'Procedimento', 'Dermatologia', '04.02.01.01.00', 100.00, 250.00, 150.00, 'Procedimentos', 'procedimento'),
  ('3.04.02.01-2', 'Criocirurgia de Lesão', 'Criocirurgia', 'Procedimento', 'Dermatologia', '04.02.02.01.00', 120.00, 280.00, 180.00, 'Procedimentos', 'procedimento'),
  ('3.04.03.01-2', 'Laser Terapêutico Dermatológico', 'Laser Derma', 'Procedimento', 'Dermatologia', '04.02.03.01.00', 200.00, 500.00, 350.00, 'Procedimentos', 'procedimento'),
  ('3.04.04.01-2', 'Peeling Químico', 'Peeling Quím', 'Procedimento', 'Dermatologia', '04.02.04.01.00', 150.00, 350.00, 250.00, 'Procedimentos', 'procedimento'),
  
  -- Ortopedia
  ('3.05.01.01-2', 'Infiltração - 1ª Articulação', 'Infiltração 1', 'Procedimento', 'Ortopedia', '04.04.01.01.00', 150.00, 300.00, 200.00, 'Procedimentos', 'procedimento'),
  ('3.05.02.01-2', 'Infiltração - Articulações Adicionais', 'Infiltração Adic', 'Procedimento', 'Ortopedia', '04.04.01.01.10', 80.00, 200.00, 120.00, 'Procedimentos', 'procedimento'),
  ('3.05.03.01-2', 'Artrocentese', 'Artrocentese', 'Procedimento', 'Ortopedia', '04.04.02.01.00', 150.00, 300.00, 200.00, 'Procedimentos', 'procedimento'),
  ('3.05.04.01-2', 'Imobilização Gessada', 'Imobiliz Gess', 'Procedimento', 'Ortopedia', '04.04.03.01.00', 100.00, 250.00, 150.00, 'Procedimentos', 'procedimento'),
  
  -- Enfermagem e Procedimentos Menores
  ('3.06.01.01-2', 'Aplicação de Injeção Intramuscular', 'Inj IM', 'Procedimento', 'Enfermagem', '04.05.01.01.00', 20.00, 50.00, 30.00, 'Procedimentos', 'procedimento'),
  ('3.07.01.01-2', 'Aplicação de Injeção Intravenosa', 'Inj IV', 'Procedimento', 'Enfermagem', '04.05.02.01.00', 30.00, 80.00, 50.00, 'Procedimentos', 'procedimento'),
  ('3.08.01.01-2', 'Coleta de Sangue/Punção Venosa', 'Coleta Sangue', 'Procedimento', 'Enfermagem', '04.05.03.01.00', 15.00, 40.00, 25.00, 'Procedimentos', 'procedimento'),
  ('3.08.02.01-2', 'Implantação de Cateter Periférico', 'Cateter Perif', 'Procedimento', 'Enfermagem', '04.05.04.01.00', 50.00, 150.00, 100.00, 'Procedimentos', 'procedimento'),
  
  -- Pequenas Cirurgias
  ('3.09.01.01-2', 'Pequeno Procedimento Cirúrgico', 'Pequeno Proc', 'Procedimento', 'Cirurgia', '04.03.01.01.00', 200.00, 500.00, 350.00, 'Procedimentos', 'procedimento'),
  ('3.09.02.01-2', 'Biopsia de Pele', 'Biopsia Pele', 'Procedimento', 'Cirurgia', '04.03.05.01.00', 150.00, 350.00, 250.00, 'Procedimentos', 'procedimento'),
  ('3.09.03.01-2', 'Biopsia de Mama', 'Biopsia Mama', 'Procedimento', 'Cirurgia', '04.03.06.01.00', 200.00, 400.00, 300.00, 'Procedimentos', 'procedimento'),
  
  -- Ginecologia/Obstetrícia
  ('3.10.01.01-2', 'Papanicolau', 'Papanicolau', 'Procedimento', 'Ginecologia', '06.02.02.01.00', 40.00, 100.00, 60.00, 'Procedimentos', 'procedimento'),
  ('3.10.02.01-2', 'Colposcopia', 'Colposcopia', 'Procedimento', 'Ginecologia', '04.02.05.01.00', 150.00, 350.00, 250.00, 'Procedimentos', 'procedimento'),
  ('3.10.03.01-2', 'Histerossalpingografia', 'HSG', 'Procedimento', 'Ginecologia', '03.02.03.02.00', 200.00, 400.00, 300.00, 'Procedimentos', 'procedimento'),
  ('3.10.04.01-2', 'Curetagem Uterina', 'Curetagem', 'Procedimento', 'Ginecologia', '04.06.03.01.00', 250.00, 500.00, 380.00, 'Procedimentos', 'procedimento'),
  
  -- Urologia
  ('3.11.01.01-2', 'Cateterismo Urinário', 'Cateter Urin', 'Procedimento', 'Urologia', '04.06.04.01.00', 50.00, 150.00, 100.00, 'Procedimentos', 'procedimento'),
  ('3.11.02.01-2', 'Cistoscopia', 'Cistoscopia', 'Procedimento', 'Urologia', '04.06.05.01.00', 250.00, 500.00, 380.00, 'Procedimentos', 'procedimento'),
  
  -- Gastroenterologia
  ('3.12.01.01-2', 'Endoscopia Digestiva Alta', 'EDA', 'Procedimento', 'Gastroenterologia', '04.07.01.01.00', 300.00, 700.00, 500.00, 'Procedimentos', 'procedimento'),
  ('3.12.02.01-2', 'Colonoscopia', 'Colonoscopia', 'Procedimento', 'Gastroenterologia', '04.07.02.01.00', 350.00, 800.00, 600.00, 'Procedimentos', 'procedimento'),
  ('3.12.03.01-2', 'Sigmoidoscopia', 'Sigmoidoscopia', 'Procedimento', 'Gastroenterologia', '04.07.03.01.00', 250.00, 500.00, 380.00, 'Procedimentos', 'procedimento'),
  
  -- Pneumologia
  ('3.13.01.01-2', 'Broncoscopia', 'Broncoscopia', 'Procedimento', 'Pneumologia', '04.08.01.01.00', 300.00, 700.00, 500.00, 'Procedimentos', 'procedimento'),
  
  -- Punções e Drenagens
  ('3.14.01.01-2', 'Paracentese', 'Paracentese', 'Procedimento', 'Cirurgia', '04.06.01.01.00', 200.00, 400.00, 300.00, 'Procedimentos', 'procedimento'),
  ('3.14.02.01-2', 'Toracocentese', 'Toracocentese', 'Procedimento', 'Pneumologia', '04.06.02.01.00', 200.00, 400.00, 300.00, 'Procedimentos', 'procedimento'),
  ('3.14.03.01-2', 'Pericardiocentese', 'Pericardiocentese', 'Procedimento', 'Cardiologia', '04.06.06.01.00', 250.00, 500.00, 380.00, 'Procedimentos', 'procedimento'),
  
  -- ===== INTERNAÇÕES (15) =====
  ('4.01.01.01-2', 'Diária de Internação - Enfermaria', 'Diária Enf', 'Internação', 'Internação', '05.01.01.01.00', 300.00, 600.00, 450.00, 'Internações', 'internacao'),
  ('4.01.02.01-2', 'Diária de Internação - Apartamento', 'Diária Apto', 'Internação', 'Internação', '05.01.01.02.00', 500.00, 1000.00, 750.00, 'Internações', 'internacao'),
  ('4.01.03.01-2', 'Diária de Internação - ICU', 'Diária ICU', 'Internação', 'Internação', '05.01.01.03.00', 800.00, 1500.00, 1100.00, 'Internações', 'internacao'),
  ('4.01.04.01-2', 'Diária de Internação - UTI', 'Diária UTI', 'Internação', 'Internação', '05.01.01.04.00', 900.00, 1800.00, 1300.00, 'Internações', 'internacao'),
  ('4.02.01.01-2', 'Taxa Operatória - Pequena Cirurgia', 'Taxa Op Peq', 'Internação', 'Cirurgia', '05.02.01.01.00', 500.00, 1200.00, 800.00, 'Internações', 'internacao'),
  ('4.02.02.01-2', 'Taxa Operatória - Média Cirurgia', 'Taxa Op Med', 'Internação', 'Cirurgia', '05.02.01.02.00', 800.00, 2000.00, 1200.00, 'Internações', 'internacao'),
  ('4.02.03.01-2', 'Taxa Operatória - Grande Cirurgia', 'Taxa Op Gde', 'Internação', 'Cirurgia', '05.02.01.03.00', 1200.00, 3000.00, 1800.00, 'Internações', 'internacao'),
  ('4.02.04.01-2', 'Taxa Operatória - Cirurgia Cardíaca', 'Taxa Op Card', 'Internação', 'Cirurgia', '05.02.02.01.00', 2000.00, 5000.00, 3000.00, 'Internações', 'internacao'),
  ('4.03.01.01-2', 'Taxa de Sala de Recuperação', 'Taxa Recup', 'Internação', 'Procedimento', '05.03.01.01.00', 200.00, 500.00, 350.00, 'Internações', 'internacao'),
  ('4.04.01.01-2', 'Anestesia - Raquianestesia', 'Anes Raqui', 'Internação', 'Anestesia', '05.04.01.01.00', 200.00, 500.00, 350.00, 'Internações', 'internacao'),
  ('4.04.02.01-2', 'Anestesia - Geral', 'Anes Geral', 'Internação', 'Anestesia', '05.04.01.02.00', 300.00, 700.00, 500.00, 'Internações', 'internacao'),
  ('4.04.03.01-2', 'Anestesia - Local/Regional', 'Anes Local', 'Internação', 'Anestesia', '05.04.01.03.00', 150.00, 350.00, 250.00, 'Internações', 'internacao'),
  ('4.05.01.01-2', 'Oxigenoterapia Hiperbárica', 'Oxigeno Hiperb', 'Internação', 'Procedimento', '05.05.01.01.00', 300.00, 600.00, 450.00, 'Internações', 'internacao'),
  ('4.06.01.01-2', 'Hemodiálise', 'Hemodialise', 'Internação', 'Nefrologia', '05.06.01.01.00', 400.00, 800.00, 600.00, 'Internações', 'internacao'),
  ('4.07.01.01-2', 'Diálise Peritoneal', 'Dialise Periton', 'Internação', 'Nefrologia', '05.07.01.01.00', 350.00, 700.00, 550.00, 'Internações', 'internacao'),
  
  -- ===== PROCEDIMENTOS DE LABORATÓRIO E COLETA (20) =====
  ('5.01.01.01-2', 'Coleta de Material p/ Exame', 'Coleta Material', 'Outros', 'Laboratório', '03.05.01.01.00', 20.00, 50.00, 30.00, 'Outros', 'outro'),
  ('5.01.02.01-2', 'Hemograma Completo', 'Hemograma', 'Outros', 'Laboratório', '03.05.01.02.00', 30.00, 80.00, 50.00, 'Outros', 'outro'),
  ('5.01.03.01-2', 'Bioquímica Sanguínea', 'Bioquímica', 'Outros', 'Laboratório', '03.05.01.03.00', 40.00, 100.00, 70.00, 'Outros', 'outro'),
  ('5.01.04.01-2', 'Coagulograma', 'Coagulograma', 'Outros', 'Laboratório', '03.05.01.04.00', 50.00, 120.00, 80.00, 'Outros', 'outro'),
  ('5.01.05.01-2', 'Perfil Lipídico', 'Perfil Lipídico', 'Outros', 'Laboratório', '03.05.01.05.00', 40.00, 100.00, 70.00, 'Outros', 'outro'),
  ('5.01.06.01-2', 'Glicemia em Jejum', 'Glicemia', 'Outros', 'Laboratório', '03.05.01.06.00', 25.00, 60.00, 40.00, 'Outros', 'outro'),
  ('5.01.07.01-2', 'Teste de Tolerância à Glicose', 'TTG', 'Outros', 'Laboratório', '03.05.01.07.00', 60.00, 150.00, 100.00, 'Outros', 'outro'),
  ('5.01.08.01-2', 'Hemoglobina Glicada', 'HBA1c', 'Outros', 'Laboratório', '03.05.01.08.00', 50.00, 120.00, 80.00, 'Outros', 'outro'),
  ('5.01.09.01-2', 'Função Hepática', 'TGO/TGP', 'Outros', 'Laboratório', '03.05.01.09.00', 40.00, 100.00, 70.00, 'Outros', 'outro'),
  ('5.01.10.01-2', 'Função Renal', 'Creatinina', 'Outros', 'Laboratório', '03.05.01.10.00', 35.00, 90.00, 60.00, 'Outros', 'outro'),
  
  -- Sorologia
  ('5.02.01.01-2', 'Teste de Gravidez (Soro)', 'Teste Grav', 'Outros', 'Laboratório', '03.05.02.01.00', 30.00, 80.00, 50.00, 'Outros', 'outro'),
  ('5.02.02.01-2', 'Sorologia HIV', 'HIV', 'Outros', 'Laboratório', '03.05.02.02.00', 40.00, 100.00, 70.00, 'Outros', 'outro'),
  ('5.02.03.01-2', 'Sorologia Hepatite B', 'Hepatite B', 'Outros', 'Laboratório', '03.05.02.03.00', 50.00, 120.00, 80.00, 'Outros', 'outro'),
  ('5.02.04.01-2', 'Sorologia Hepatite C', 'Hepatite C', 'Outros', 'Laboratório', '03.05.02.04.00', 50.00, 120.00, 80.00, 'Outros', 'outro'),
  ('5.02.05.01-2', 'Sorologia Sífilis (RPR/VDRL)', 'Sífilis', 'Outros', 'Laboratório', '03.05.02.05.00', 35.00, 90.00, 60.00, 'Outros', 'outro'),
  
  -- Testes Rápidos
  ('5.03.01.01-2', 'Teste Rápido COVID', 'Teste COVID', 'Outros', 'Laboratório', '03.05.03.01.00', 50.00, 100.00, 70.00, 'Outros', 'outro'),
  ('5.03.02.01-2', 'Teste Rápido Influenza', 'Teste Influenza', 'Outros', 'Laboratório', '03.05.03.02.00', 40.00, 90.00, 60.00, 'Outros', 'outro'),
  ('5.03.03.01-2', 'Teste Rápido Malária', 'Teste Malária', 'Outros', 'Laboratório', '03.05.03.03.00', 45.00, 100.00, 70.00, 'Outros', 'outro'),
  ('5.03.04.01-2', 'Teste Rápido Dengue', 'Teste Dengue', 'Outros', 'Laboratório', '03.05.03.04.00', 45.00, 100.00, 70.00, 'Outros', 'outro'),
  
  -- ===== IMUNIZAÇÕES E VACINAS (12) =====
  ('6.01.01.01-2', 'Imunização - Vacina BCG', 'Vacina BCG', 'Outros', 'Imunização', '06.01.01.01.00', 40.00, 100.00, 70.00, 'Outros', 'outro'),
  ('6.01.02.01-2', 'Imunização - Vacina Pentavalente', 'Vacina Penta', 'Outros', 'Imunização', '06.01.01.02.00', 50.00, 120.00, 80.00, 'Outros', 'outro'),
  ('6.01.03.01-2', 'Imunização - Vacina Meningocócica', 'Vacina Meningo', 'Outros', 'Imunização', '06.01.01.03.00', 80.00, 150.00, 110.00, 'Outros', 'outro'),
  ('6.01.04.01-2', 'Imunização - Vacina Pneumocócica', 'Vacina Pneumo', 'Outros', 'Imunização', '06.01.01.04.00', 70.00, 140.00, 100.00, 'Outros', 'outro'),
  ('6.01.05.01-2', 'Imunização - Vacina Rotavírus', 'Vacina Rota', 'Outros', 'Imunização', '06.01.01.05.00', 60.00, 130.00, 90.00, 'Outros', 'outro'),
  ('6.01.06.01-2', 'Imunização - Vacina Febre Amarela', 'Vacina FA', 'Outros', 'Imunização', '06.01.01.06.00', 70.00, 140.00, 100.00, 'Outros', 'outro'),
  ('6.01.07.01-2', 'Imunização - Vacina Gripe', 'Vacina Gripe', 'Outros', 'Imunização', '06.01.01.07.00', 50.00, 100.00, 70.00, 'Outros', 'outro'),
  ('6.01.08.01-2', 'Imunização - Vacina COVID-19', 'Vacina COVID', 'Outros', 'Imunização', '06.01.01.08.00', 60.00, 120.00, 80.00, 'Outros', 'outro'),
  ('6.01.09.01-2', 'Imunização - Vacina HPV', 'Vacina HPV', 'Outros', 'Imunização', '06.01.01.09.00', 100.00, 200.00, 150.00, 'Outros', 'outro'),
  ('6.01.10.01-2', 'Imunização - Vacina Tétano', 'Vacina Tétano', 'Outros', 'Imunização', '06.01.01.10.00', 40.00, 90.00, 60.00, 'Outros', 'outro'),
  ('6.01.11.01-2', 'Imunização - Vacina Hepatite A', 'Vacina Hep A', 'Outros', 'Imunização', '06.01.01.11.00', 60.00, 130.00, 90.00, 'Outros', 'outro'),
  ('6.01.12.01-2', 'Imunização - Vacina Hepatite B', 'Vacina Hep B', 'Outros', 'Imunização', '06.01.01.12.00', 60.00, 130.00, 90.00, 'Outros', 'outro'),
  
  -- ===== OUTROS PROCEDIMENTOS (20) =====
  ('7.01.01.01-2', 'Eletroforese de Proteínas', 'Eletrof Prot', 'Outros', 'Laboratório', '03.05.04.01.00', 60.00, 120.00, 90.00, 'Outros', 'outro'),
  ('7.01.02.01-2', 'Imunofixação', 'Imunofixação', 'Outros', 'Laboratório', '03.05.04.02.00', 80.00, 150.00, 120.00, 'Outros', 'outro'),
  ('7.01.03.01-2', 'Dosagem de Vitaminas', 'Dosagem Vit', 'Outros', 'Laboratório', '03.05.04.03.00', 60.00, 150.00, 100.00, 'Outros', 'outro'),
  ('7.01.04.01-2', 'Dosagem de Minerais', 'Dosagem Min', 'Outros', 'Laboratório', '03.05.04.04.00', 70.00, 160.00, 110.00, 'Outros', 'outro'),
  ('7.02.01.01-2', 'Cultura de Urina', 'Cultura Urina', 'Outros', 'Laboratório', '03.05.05.01.00', 50.00, 120.00, 80.00, 'Outros', 'outro'),
  ('7.02.02.01-2', 'Cultura de Sangue', 'Cultura Sangue', 'Outros', 'Laboratório', '03.05.05.02.00', 60.00, 150.00, 100.00, 'Outros', 'outro'),
  ('7.02.03.01-2', 'Cultura de Secreção', 'Cultura Secret', 'Outros', 'Laboratório', '03.05.05.03.00', 50.00, 120.00, 80.00, 'Outros', 'outro'),
  ('7.03.01.01-2', 'Microscopia de Fezes', 'Microscopia Fezes', 'Outros', 'Laboratório', '03.05.06.01.00', 35.00, 80.00, 55.00, 'Outros', 'outro'),
  ('7.03.02.01-2', 'Parasitologia de Fezes', 'Parasito Fezes', 'Outros', 'Laboratório', '03.05.06.02.00', 40.00, 90.00, 65.00, 'Outros', 'outro'),
  ('7.04.01.01-2', 'Teste Alergia Patch', 'Patch Test', 'Outros', 'Alergia', '06.02.01.01.00', 100.00, 250.00, 180.00, 'Outros', 'outro'),
  ('7.04.02.01-2', 'Teste Alergia Prick', 'Prick Test', 'Outros', 'Alergia', '06.02.01.02.00', 120.00, 300.00, 200.00, 'Outros', 'outro'),
  ('7.05.01.01-2', 'Teste Esforço Cardíaco', 'Teste Esforço', 'Outros', 'Cardiologia', '03.01.02.06.00', 150.00, 350.00, 250.00, 'Outros', 'outro'),
  ('7.05.02.01-2', 'Eletrocardiografia Dinâmica', 'Ecg Dinâmica', 'Outros', 'Cardiologia', '03.01.02.07.00', 100.00, 250.00, 180.00, 'Outros', 'outro'),
  ('7.06.01.01-2', 'Mielografia', 'Mielograma', 'Outros', 'Neurologia', '03.02.04.01.00', 250.00, 500.00, 350.00, 'Outros', 'outro'),
  ('7.07.01.01-2', 'Vertebroplastia', 'Vertebroplastia', 'Outros', 'Ortopedia', '04.04.04.01.00', 500.00, 1200.00, 800.00, 'Outros', 'outro'),
  ('7.07.02.01-2', 'Cifoplastia', 'Cifoplastia', 'Outros', 'Ortopedia', '04.04.05.01.00', 550.00, 1300.00, 900.00, 'Outros', 'outro'),
  ('7.08.01.01-2', 'Meditação/Relaxamento Terapêutico', 'Meditação', 'Outros', 'Psicologia', '06.03.01.01.00', 80.00, 150.00, 110.00, 'Outros', 'outro'),
  ('7.08.02.01-2', 'Terapia Cognitivo-Comportamental', 'TCC', 'Outros', 'Psicologia', '06.03.02.01.00', 100.00, 200.00, 150.00, 'Outros', 'outro'),
  ('7.09.01.01-2', 'Fisioterapia Motora', 'Fisio Motor', 'Outros', 'Fisioterapia', '02.01.01.01.00', 70.00, 150.00, 110.00, 'Outros', 'outro'),
  ('7.09.02.01-2', 'Fisioterapia Respiratória', 'Fisio Respir', 'Outros', 'Fisioterapia', '02.01.02.01.00', 70.00, 150.00, 110.00, 'Outros', 'outro')
) AS proc(codigo, descricao, descricao_curta, grupo, subgrupo, tuss, minimo, maximo, base, categoria_grupo, tipo)
ON CONFLICT DO NOTHING;

-- Verificar resultado final
SELECT 
  COUNT(*) as total_procedimentos,
  COUNT(DISTINCT categoria) as categorias,
  STRING_AGG(DISTINCT categoria, ', ' ORDER BY categoria) as categorias_list
FROM cbhpm_procedures 
WHERE clinic_id = (SELECT id FROM clinics LIMIT 1)
AND ativo = true;
