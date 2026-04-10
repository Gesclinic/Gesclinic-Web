-- ============================================================
-- Inserir Procedimentos e Exames de NEUROLOGIA Completos
-- Inclui: Clínica, Cirúrgica, Diagnóstico, Terapêutico
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
  'Neurologia',
  true
FROM clinic_data,
(VALUES 
  -- ============================================================
  -- CONSULTAS NEUROLÓGICAS
  -- ============================================================
  ('6.01.01.01-2', 'Consulta - Neurologista Clínico', 'Consult. Neuro Clín', 'Consultas', 'Neurologia Clínica', '0601010112', 150.00, 250.00, 180.00, 'Consultas', 'consulta'),
  ('6.01.02.01-2', 'Consulta - Neurocirurgião', 'Consult. Neurocirurgião', 'Consultas', 'Neurocirurgia', '0601020112', 180.00, 300.00, 220.00, 'Consultas', 'consulta'),
  ('6.01.03.01-2', 'Consulta - Neurologista Pediátrico', 'Consult. Neuro Ped', 'Consultas', 'Neurologia Pediátrica', '0601030112', 140.00, 230.00, 170.00, 'Consultas', 'consulta'),
  ('6.01.04.01-2', 'Consulta - Especialista em Distúrbios do Movimento', 'Consult. Dist. Movimento', 'Consultas', 'Neurologia Especializada', '0601040112', 160.00, 270.00, 200.00, 'Consultas', 'consulta'),
  ('6.01.05.01-2', 'Consulta - Especialista em Cefaleia', 'Consult. Cefaleia', 'Consultas', 'Neurologia Especializada', '0601050112', 150.00, 250.00, 180.00, 'Consultas', 'consulta'),
  ('6.01.06.01-2', 'Consulta - Especialista em Epilepsia', 'Consult. Epilepsia', 'Consultas', 'Neurologia Especializada', '0601060112', 160.00, 270.00, 200.00, 'Consultas', 'consulta'),
  ('6.01.07.01-2', 'Consulta - Especialista em Sono', 'Consult. Sono', 'Consultas', 'Medicina do Sono', '0601070112', 140.00, 240.00, 180.00, 'Consultas', 'consulta'),
  ('6.01.08.01-2', 'Consulta de Retorno/Seguimento Neurológico', 'Consult. Retorno Neuro', 'Consultas', 'Neurologia Clínica', '0601080112', 120.00, 200.00, 150.00, 'Consultas', 'consulta'),
  
  -- ============================================================
  -- EXAMES DIAGNÓSTICOS - ELETROFISIOLOGIA
  -- ============================================================
  ('7.01.01.01-2', 'Eletroencefalograma (EEG) - Básico', 'EEG Básico', 'SADT', 'Eletrofisiologia', '03.03.01.01.00', 120.00, 200.00, 160.00, 'SADT', 'sadt'),
  ('7.01.02.01-2', 'Eletroencefalograma (EEG) - Prolongado 24h', 'EEG 24h', 'SADT', 'Eletrofisiologia', '03.03.01.02.00', 400.00, 700.00, 550.00, 'SADT', 'sadt'),
  ('7.01.03.01-2', 'Eletroencefalograma (EEG) - com Privação de Sono', 'EEG Priv. Sono', 'SADT', 'Eletrofisiologia', '03.03.01.03.00', 180.00, 300.00, 240.00, 'SADT', 'sadt'),
  ('7.01.04.01-2', 'Eletroencefalograma (EEG) - Vídeo EEG', 'Vídeo EEG', 'SADT', 'Eletrofisiologia', '03.03.01.04.00', 500.00, 900.00, 700.00, 'SADT', 'sadt'),
  ('7.02.01.01-2', 'Eletromiografia (EMG) - Membro Superior', 'EMG MMSS', 'SADT', 'Eletrofisiologia', '03.03.02.01.00', 150.00, 250.00, 200.00, 'SADT', 'sadt'),
  ('7.02.02.01-2', 'Eletromiografia (EMG) - Membro Inferior', 'EMG MMII', 'SADT', 'Eletrofisiologia', '03.03.02.02.00', 150.00, 250.00, 200.00, 'SADT', 'sadt'),
  ('7.02.03.01-2', 'Eletromiografia (EMG) - 4 Membros', 'EMG 4 Membros', 'SADT', 'Eletrofisiologia', '03.03.02.03.00', 250.00, 450.00, 350.00, 'SADT', 'sadt'),
  ('7.03.01.01-2', 'Velocidade de Condução Nervosa (VCN) - Simples', 'VCN Simples', 'SADT', 'Eletrofisiologia', '03.03.03.01.00', 120.00, 200.00, 160.00, 'SADT', 'sadt'),
  ('7.03.02.01-2', 'Velocidade de Condução Nervosa (VCN) - Completa', 'VCN Completa', 'SADT', 'Eletrofisiologia', '03.03.03.02.00', 200.00, 350.00, 280.00, 'SADT', 'sadt'),
  ('7.04.01.01-2', 'Teste de Estimulação Repetitiva', 'Estim. Repetitiva', 'SADT', 'Eletrofisiologia', '03.03.04.01.00', 180.00, 300.00, 240.00, 'SADT', 'sadt'),
  ('7.05.01.01-2', 'Polisonografia', 'Polissonografia', 'SADT', 'Medicina do Sono', '03.03.05.01.00', 300.00, 600.00, 450.00, 'SADT', 'sadt'),
  
  -- ============================================================
  -- EXAMES DIAGNÓSTICOS - IMAGEM
  -- ============================================================
  ('7.06.01.01-2', 'Ressonância Magnética (RM) - Encéfalo', 'RM Encéfalo', 'SADT', 'Imagem', '03.02.04.01.00', 350.00, 700.00, 500.00, 'SADT', 'sadt'),
  ('7.06.02.01-2', 'Ressonância Magnética (RM) - Medula Espinhal', 'RM Medula', 'SADT', 'Imagem', '03.02.04.02.00', 350.00, 700.00, 500.00, 'SADT', 'sadt'),
  ('7.06.03.01-2', 'Ressonância Magnética (RM) - Coluna Cervical', 'RM Col. Cervical', 'SADT', 'Imagem', '03.02.04.03.00', 300.00, 600.00, 450.00, 'SADT', 'sadt'),
  ('7.06.04.01-2', 'Ressonância Magnética (RM) - Coluna Lombar', 'RM Col. Lombar', 'SADT', 'Imagem', '03.02.04.04.00', 300.00, 600.00, 450.00, 'SADT', 'sadt'),
  ('7.06.05.01-2', 'Ressonância Magnética (RM) - Crânio com Contraste', 'RM Crânio c/ Contraste', 'SADT', 'Imagem', '03.02.04.05.00', 400.00, 800.00, 600.00, 'SADT', 'sadt'),
  ('7.07.01.01-2', 'Tomografia Computadorizada (TC) - Encéfalo', 'TC Encéfalo', 'SADT', 'Imagem', '03.02.03.01.00', 200.00, 400.00, 300.00, 'SADT', 'sadt'),
  ('7.07.02.01-2', 'Tomografia Computadorizada (TC) - Coluna Cervical', 'TC Col. Cervical', 'SADT', 'Imagem', '03.02.03.01.10', 200.00, 400.00, 300.00, 'SADT', 'sadt'),
  ('7.07.03.01-2', 'Tomografia Computadorizada (TC) - Coluna Lombar', 'TC Col. Lombar', 'SADT', 'Imagem', '03.02.03.01.20', 200.00, 400.00, 300.00, 'SADT', 'sadt'),
  ('7.08.01.01-2', 'Angiografia por Ressonância (ARM) - Intracraniana', 'ARM Intracraniana', 'SADT', 'Imagem', '03.02.05.01.00', 400.00, 800.00, 600.00, 'SADT', 'sadt'),
  ('7.08.02.01-2', 'Angiografia por Tomografia (CTA) - Intracraniana', 'CTA Intracraniana', 'SADT', 'Imagem', '03.02.05.02.00', 350.00, 700.00, 500.00, 'SADT', 'sadt'),
  ('7.09.01.01-2', 'Tomografia por Emissão de Fótons Únicos (SPECT)', 'SPECT Cerebral', 'SADT', 'Imagem', '03.02.06.01.00', 400.00, 800.00, 600.00, 'SADT', 'sadt'),
  ('7.10.01.01-2', 'Positron Emission Tomography (PET) - Encéfalo', 'PET Encéfalo', 'SADT', 'Imagem', '03.02.07.01.00', 500.00, 1000.00, 750.00, 'SADT', 'sadt'),
  
  -- ============================================================
  -- EXAMES DIAGNÓSTICOS - PROCEDIMENTOS
  -- ============================================================
  ('7.11.01.01-2', 'Punção Lombar Diagnóstica', 'Punção Lombar Diag', 'Outros', 'Laboratório', '04.06.03.01.00', 200.00, 400.00, 300.00, 'Outros', 'outro'),
  ('7.11.02.01-2', 'Punção Suboccipital', 'Punção Suboccipital', 'Outros', 'Laboratório', '04.06.04.01.00', 250.00, 500.00, 350.00, 'Outros', 'outro'),
  ('7.12.01.01-2', 'Biópsia de Nervo Periférico', 'Biópsia Nervo', 'Outros', 'Laboratorio Esp', '04.06.05.01.00', 300.00, 600.00, 450.00, 'Outros', 'outro'),
  ('7.13.01.01-2', 'Biópsia Muscular', 'Biópsia Muscular', 'Outros', 'Laboratorio Esp', '04.06.06.01.00', 300.00, 600.00, 450.00, 'Outros', 'outro'),
  ('7.14.01.01-2', 'Teste de Nistagmo Posicional', 'Teste Nistagmo', 'Outros', 'Especializado', '03.03.06.01.00', 80.00, 150.00, 120.00, 'Outros', 'outro'),
  ('7.15.01.01-2', 'Teste de Romberg e Marcha', 'Teste Romberg', 'Outros', 'Especializado', '03.03.07.01.00', 50.00, 100.00, 80.00, 'Outros', 'outro'),
  ('7.16.01.01-2', 'Teste de Função Vestibular', 'Teste Vestibular', 'Outros', 'Especializado', '03.03.08.01.00', 150.00, 250.00, 200.00, 'Outros', 'outro'),
  
  -- ============================================================
  -- PROCEDIMENTOS TERAPÊUTICOS E DIAGNÓSTICOS INTERVENCIONISTAS
  -- ============================================================
  ('8.01.01.01-2', 'Infiltração de Nervo Periférico', 'Infiltração Nervo', 'Procedimento', 'Neurologia Intervencionista', '04.07.01.01.00', 150.00, 300.00, 200.00, 'Procedimentos', 'procedimento'),
  ('8.01.02.01-2', 'Bloqueio Nervoso Periférico', 'Bloqueio Nervo', 'Procedimento', 'Neurologia Intervencionista', '04.07.02.01.00', 200.00, 400.00, 300.00, 'Procedimentos', 'procedimento'),
  ('8.02.01.01-2', 'Injeção Epidural Cervical', 'Injeção Epidural Cerv', 'Procedimento', 'Neurologia Intervencionista', '04.07.03.01.00', 200.00, 400.00, 300.00, 'Procedimentos', 'procedimento'),
  ('8.02.02.01-2', 'Injeção Epidural Torácica', 'Injeção Epidural Tor', 'Procedimento', 'Neurologia Intervencionista', '04.07.03.02.00', 200.00, 400.00, 300.00, 'Procedimentos', 'procedimento'),
  ('8.02.03.01-2', 'Injeção Epidural Lombossacra', 'Injeção Epidural Lomb', 'Procedimento', 'Neurologia Intervencionista', '04.07.03.03.00', 200.00, 400.00, 300.00, 'Procedimentos', 'procedimento'),
  ('8.03.01.01-2', 'Injeção de Toxina Botulínica - Aplicação Simples', 'Toxina Botulínica 1', 'Procedimento', 'Neurologia Especializada', '04.07.04.01.00', 150.00, 400.00, 250.00, 'Procedimentos', 'procedimento'),
  ('8.03.02.01-2', 'Injeção de Toxina Botulínica - Aplicações Múltiplas', 'Toxina Botulínica Mult', 'Procedimento', 'Neurologia Especializada', '04.07.04.02.00', 250.00, 600.00, 400.00, 'Procedimentos', 'procedimento'),
  ('8.04.01.01-2', 'Estimulação Transcraniana com Corrente Contínua (tDCS)', 'tDCS', 'Procedimento', 'Neuromodulação', '04.07.05.01.00', 100.00, 250.00, 180.00, 'Procedimentos', 'procedimento'),
  ('8.05.01.01-2', 'Estimulação Magnética Transcraniana (EMT)', 'EMT', 'Procedimento', 'Neuromodulação', '04.07.06.01.00', 150.00, 300.00, 220.00, 'Procedimentos', 'procedimento'),
  
  -- ============================================================
  -- PROCEDIMENTOS CIRÚRGICOS NEUROLÓGICOS
  -- ============================================================
  ('9.01.01.01-2', 'Craniotomia Supratentorial', 'Craniotomia Suprat', 'Internação', 'Neurocirurgia', '05.03.01.01.00', 2000.00, 5000.00, 3000.00, 'Procedimentos Cirúrgicos', 'internacao'),
  ('9.01.02.01-2', 'Craniotomia Infratentorial', 'Craniotomia Infrat', 'Internação', 'Neurocirurgia', '05.03.01.02.00', 2000.00, 5000.00, 3000.00, 'Procedimentos Cirúrgicos', 'internacao'),
  ('9.02.01.01-2', 'Ressecção Cirúrgica de Tumor Cerebral', 'Ressec. Tumor Cerebral', 'Internação', 'Neurocirurgia', '05.03.02.01.00', 3000.00, 8000.00, 5000.00, 'Procedimentos Cirúrgicos', 'internacao'),
  ('9.03.01.01-2', 'Descompressão de Medula Espinhal', 'Descompr. Medula', 'Internação', 'Neurocirurgia', '05.03.03.01.00', 2500.00, 6000.00, 4000.00, 'Procedimentos Cirúrgicos', 'internacao'),
  ('9.04.01.01-2', 'Ressecção de Hérnia de Disco - Cervical', 'Herniectomia Cerv', 'Internação', 'Neurocirurgia', '05.03.04.01.00', 2000.00, 5000.00, 3500.00, 'Procedimentos Cirúrgicos', 'internacao'),
  ('9.04.02.01-2', 'Ressecção de Hérnia de Disco - Torácica', 'Herniectomia Tor', 'Internação', 'Neurocirurgia', '05.03.04.02.00', 2000.00, 5000.00, 3500.00, 'Procedimentos Cirúrgicos', 'internacao'),
  ('9.04.03.01-2', 'Ressecção de Hérnia de Disco - Lombossacra', 'Herniectomia Lomb', 'Internação', 'Neurocirurgia', '05.03.04.03.00', 1800.00, 4500.00, 3000.00, 'Procedimentos Cirúrgicos', 'internacao'),
  ('9.04.04.01-2', 'Microdiscectomia Percutânea', 'Microdiscectomia', 'Procedimento', 'Neurocirurgia Minimamente Invasiva', '04.08.01.01.00', 1200.00, 3000.00, 2000.00, 'Procedimentos', 'procedimento'),
  ('9.05.01.01-2', 'Fusão Vertebral - Cervical', 'Fusão Vert. Cerv', 'Internação', 'Neurocirurgia', '05.03.05.01.00', 3000.00, 7000.00, 5000.00, 'Procedimentos Cirúrgicos', 'internacao'),
  ('9.05.02.01-2', 'Fusão Vertebral - Lombossacra', 'Fusão Vert. Lomb', 'Internação', 'Neurocirurgia', '05.03.05.02.00', 3000.00, 7000.00, 5000.00, 'Procedimentos Cirúrgicos', 'internacao'),
  ('9.06.01.01-2', 'Implantação de Válvula de Derivação Ventricular (VP)', 'Implantação VP', 'Internação', 'Neurocirurgia', '05.03.06.01.00', 2500.00, 6000.00, 4000.00, 'Procedimentos Cirúrgicos', 'internacao'),
  ('9.07.01.01-2', 'Clip de Aneurisma Intracraniano', 'Clip Aneurisma', 'Internação', 'Neurocirurgia', '05.03.07.01.00', 4000.00, 10000.00, 6000.00, 'Procedimentos Cirúrgicos', 'internacao'),
  ('9.08.01.01-2', 'Ressecção de Malformação Arteriovenosa (MAV)', 'Ressec. MAV', 'Internação', 'Neurocirurgia', '05.03.08.01.00', 3500.00, 8000.00, 5500.00, 'Procedimentos Cirúrgicos', 'internacao'),
  ('9.09.01.01-2', 'Cranioplastia', 'Cranioplastia', 'Internação', 'Neurocirurgia', '05.03.09.01.00', 1500.00, 4000.00, 2500.00, 'Procedimentos Cirúrgicos', 'internacao'),
  ('9.10.01.01-2', 'Drenagem de Hematoma Subdural', 'Dren. Hematoma', 'Procedimento', 'Neurocirurgia', '04.08.02.01.00', 800.00, 2000.00, 1500.00, 'Procedimentos', 'procedimento'),
  ('9.11.01.01-2', 'Estereotaxia - Biópsia', 'Estereotaxia Biópsia', 'Procedimento', 'Neurocirurgia', '04.08.03.01.00', 1000.00, 2500.00, 1800.00, 'Procedimentos', 'procedimento'),
  ('9.12.01.01-2', 'Implantação de Eletrodo para Estimulação Cerebral Profunda', 'Eletrodo ECP', 'Internação', 'Neurocirurgia', '05.03.10.01.00', 4000.00, 10000.00, 7000.00, 'Procedimentos Cirúrgicos', 'internacao'),
  ('9.13.01.01-2', 'Cirurgia de Epilepsia - Ressecção Focal', 'Cirurgia Epilepsia', 'Internação', 'Neurocirurgia', '05.03.11.01.00', 3000.00, 7000.00, 5000.00, 'Procedimentos Cirúrgicos', 'internacao'),
  ('9.14.01.01-2', 'Neurólise de Nervo Periférico', 'Neurólise Nervo', 'Procedimento', 'Neurocirurgia Periférica', '04.08.04.01.00', 800.00, 2000.00, 1500.00, 'Procedimentos', 'procedimento'),
  ('9.15.01.01-2', 'Transplante de Nervo Periférico', 'Transplante Nervo', 'Procedimento', 'Neurocirurgia Periférica', '04.08.05.01.00', 1000.00, 2500.00, 1800.00, 'Procedimentos', 'procedimento')
) AS proc(codigo, descricao, descricao_curta, grupo, subgrupo, tuss, minimo, maximo, base, categoria_grupo, tipo)
LIMIT 100;

-- Verificar inserções
SELECT COUNT(*) as total_neurologia FROM cbhpm_procedures 
WHERE categoria = 'Neurologia' AND ativo = true;
