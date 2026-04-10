-- ============================================================
-- PARTE 5: PROCEDIMENTOS CIRÚRGICOS NEUROLÓGICOS (20 registros)
-- ============================================================

WITH clinic_data AS (
  SELECT id FROM clinics LIMIT 1
)
INSERT INTO cbhpm_procedures (
  clinic_id, codigo_cbhpm, descricao_completa, descricao_curta,
  grupo_procedimento, subgrupo_procedimento, codigo_tuss,
  valor_minimo, valor_maximo, valor_base,
  permite_faturamento, exige_autorizacao, tipo_guia, unidade_medida,
  categoria, subcategoria, ativo
)
SELECT clinic_data.id,
  codigo, descricao, descricao_curta, grupo, subgrupo, tuss,
  minimo, maximo, base, true, false, tipo, 'unidade',
  'Neurologia', 'Neurologia', true
FROM clinic_data,
(VALUES
  ('8.05.01.01-2', 'Estimulação Magnética Transcraniana (EMT)', 'EMT', 'Procedimento', 'Neuromodulação', '0407060100', 150.00, 300.00, 220.00, 'procedimento'),
  ('9.01.01.01-2', 'Craniotomia Supratentorial', 'Craniotomia Suprat', 'Internação', 'Neurocirurgia', '0503010100', 2000.00, 5000.00, 3000.00, 'internacao'),
  ('9.01.02.01-2', 'Craniotomia Infratentorial', 'Craniotomia Infrat', 'Internação', 'Neurocirurgia', '0503010200', 2000.00, 5000.00, 3000.00, 'internacao'),
  ('9.02.01.01-2', 'Ressecção Cirúrgica de Tumor Cerebral', 'Ressec. Tumor Cerebral', 'Internação', 'Neurocirurgia', '0503020100', 3000.00, 8000.00, 5000.00, 'internacao'),
  ('9.03.01.01-2', 'Descompressão de Medula Espinhal', 'Descompr. Medula', 'Internação', 'Neurocirurgia', '0503030100', 2500.00, 6000.00, 4000.00, 'internacao'),
  ('9.04.01.01-2', 'Ressecção de Hérnia de Disco - Cervical', 'Herniectomia Cerv', 'Internação', 'Neurocirurgia', '0503040100', 2000.00, 5000.00, 3500.00, 'internacao'),
  ('9.04.02.01-2', 'Ressecção de Hérnia de Disco - Torácica', 'Herniectomia Tor', 'Internação', 'Neurocirurgia', '0503040200', 2000.00, 5000.00, 3500.00, 'internacao'),
  ('9.04.03.01-2', 'Ressecção de Hérnia de Disco - Lombossacra', 'Herniectomia Lomb', 'Internação', 'Neurocirurgia', '0503040300', 1800.00, 4500.00, 3000.00, 'internacao'),
  ('9.04.04.01-2', 'Microdiscectomia Percutânea', 'Microdiscectomia', 'Procedimento', 'Neurocirurgia Minimamente Invasiva', '0408010100', 1200.00, 3000.00, 2000.00, 'procedimento'),
  ('9.05.01.01-2', 'Fusão Vertebral - Cervical', 'Fusão Vert. Cerv', 'Internação', 'Neurocirurgia', '0503050100', 3000.00, 7000.00, 5000.00, 'internacao'),
  ('9.05.02.01-2', 'Fusão Vertebral - Lombossacra', 'Fusão Vert. Lomb', 'Internação', 'Neurocirurgia', '0503050200', 3000.00, 7000.00, 5000.00, 'internacao'),
  ('9.06.01.01-2', 'Implantação de Válvula de Derivação Ventricular (VP)', 'Implantação VP', 'Internação', 'Neurocirurgia', '0503060100', 2500.00, 6000.00, 4000.00, 'internacao'),
  ('9.07.01.01-2', 'Clip de Aneurisma Intracraniano', 'Clip Aneurisma', 'Internação', 'Neurocirurgia', '0503070100', 4000.00, 10000.00, 6000.00, 'internacao'),
  ('9.08.01.01-2', 'Ressecção de Malformação Arteriovenosa (MAV)', 'Ressec. MAV', 'Internação', 'Neurocirurgia', '0503080100', 3500.00, 8000.00, 5500.00, 'internacao'),
  ('9.09.01.01-2', 'Cranioplastia', 'Cranioplastia', 'Internação', 'Neurocirurgia', '0503090100', 1500.00, 4000.00, 2500.00, 'internacao'),
  ('9.10.01.01-2', 'Drenagem de Hematoma Subdural', 'Dren. Hematoma', 'Procedimento', 'Neurocirurgia', '0408020100', 800.00, 2000.00, 1500.00, 'procedimento'),
  ('9.11.01.01-2', 'Estereotaxia - Biópsia', 'Estereotaxia Biópsia', 'Procedimento', 'Neurocirurgia', '0408030100', 1000.00, 2500.00, 1800.00, 'procedimento'),
  ('9.12.01.01-2', 'Implantação de Eletrodo para Estimulação Cerebral Profunda', 'Eletrodo ECP', 'Internação', 'Neurocirurgia', '0503100100', 4000.00, 10000.00, 7000.00, 'internacao'),
  ('9.13.01.01-2', 'Cirurgia de Epilepsia - Ressecção Focal', 'Cirurgia Epilepsia', 'Internação', 'Neurocirurgia', '0503110100', 3000.00, 7000.00, 5000.00, 'internacao'),
  ('9.14.01.01-2', 'Neurólise de Nervo Periférico', 'Neurólise Nervo', 'Procedimento', 'Neurocirurgia Periférica', '0408040100', 800.00, 2000.00, 1500.00, 'procedimento')
) AS t(codigo, descricao, descricao_curta, grupo, subgrupo, tuss, minimo, maximo, base, tipo);

SELECT COUNT(*) as cirurgicos_inseridos FROM cbhpm_procedures WHERE codigo_cbhpm LIKE '9.%' AND ativo = true;

-- VERIFICAÇÃO FINAL
SELECT COUNT(*) as total_neurologia FROM cbhpm_procedures WHERE categoria = 'Neurologia' AND ativo = true;
