-- ============================================================
-- PARTE 2: EXAMES DE ELETROFISIOLOGIA (10 registros)
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
  minimo, maximo, base, true, false, 'sadt', 'unidade',
  'Neurologia', 'Neurologia', true
FROM clinic_data,
(VALUES
  ('7.01.01.01-2', 'Eletroencefalograma (EEG) - Básico', 'EEG Básico', 'SADT', 'Eletrofisiologia', '0303010100', 120.00, 200.00, 160.00),
  ('7.01.02.01-2', 'Eletroencefalograma (EEG) - Prolongado 24h', 'EEG 24h', 'SADT', 'Eletrofisiologia', '0303010200', 400.00, 700.00, 550.00),
  ('7.01.03.01-2', 'Eletroencefalograma (EEG) - com Privação de Sono', 'EEG Priv. Sono', 'SADT', 'Eletrofisiologia', '0303010300', 180.00, 300.00, 240.00),
  ('7.01.04.01-2', 'Eletroencefalograma (EEG) - Vídeo EEG', 'Vídeo EEG', 'SADT', 'Eletrofisiologia', '0303010400', 500.00, 900.00, 700.00),
  ('7.02.01.01-2', 'Eletromiografia (EMG) - Membro Superior', 'EMG MMSS', 'SADT', 'Eletrofisiologia', '0303020100', 150.00, 250.00, 200.00),
  ('7.02.02.01-2', 'Eletromiografia (EMG) - Membro Inferior', 'EMG MMII', 'SADT', 'Eletrofisiologia', '0303020200', 150.00, 250.00, 200.00),
  ('7.02.03.01-2', 'Eletromiografia (EMG) - 4 Membros', 'EMG 4 Membros', 'SADT', 'Eletrofisiologia', '0303020300', 250.00, 450.00, 350.00),
  ('7.03.01.01-2', 'Velocidade de Condução Nervosa (VCN) - Simples', 'VCN Simples', 'SADT', 'Eletrofisiologia', '0303030100', 120.00, 200.00, 160.00),
  ('7.03.02.01-2', 'Velocidade de Condução Nervosa (VCN) - Completa', 'VCN Completa', 'SADT', 'Eletrofisiologia', '0303030200', 200.00, 350.00, 280.00),
  ('7.04.01.01-2', 'Teste de Estimulação Repetitiva', 'Estim. Repetitiva', 'SADT', 'Eletrofisiologia', '0303040100', 180.00, 300.00, 240.00)
) AS t(codigo, descricao, descricao_curta, grupo, subgrupo, tuss, minimo, maximo, base);

SELECT COUNT(*) as eletrofisiologia_inserida FROM cbhpm_procedures WHERE codigo_cbhpm LIKE '7.%' AND tipo_guia = 'sadt' AND ativo = true;
