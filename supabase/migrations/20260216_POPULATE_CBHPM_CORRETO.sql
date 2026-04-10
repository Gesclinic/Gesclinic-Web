-- Migração: Popular CBHPM com códigos oficiais corretos
-- Data: 2024-02-16
-- Descrição: Deleta dados incorretos anteriormente inseridos e popula com tabela CBHPM correta

-- Remover dados anteriores (incorretos)
DELETE FROM cbhpm_procedures WHERE clinic_id = 'dcee437c-fd14-463c-b25e-a318f5da60b7';

-- Inserir dados CBHPM corretos
INSERT INTO cbhpm_procedures (clinic_id, codigo_cbhpm, descricao_completa, codigo_tuss, valor_base, ativo, created_at)
VALUES
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10101012', 'Em consultório (no horário normal ou preestabelecido)', NULL, 92.21, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10101020', 'Em domicílio', NULL, NULL, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10101039', 'Em pronto socorro', NULL, 92.21, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10102019', 'Visita hospitalar a paciente internado', NULL, 45.08, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10103015', 'Atendimento ao recém-nascido em berçário', NULL, 144.26, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10103031', 'Atendimento ao recém-nascido em sala de parto (parto normal ou operatório de alto risco)', NULL, 247.95, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10103023', 'Atendimento ao recém-nascido em sala de parto (parto normal ou operatório de baixo risco)', NULL, 213.01, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10104011', 'Atendimento do intensivista diarista (por dia e por paciente)', NULL, 60.86, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10104020', 'Atendimento médico do intensivista em UTI geral ou pediátrica (plantão de 12 horas - por paciente)', NULL, 144.26, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10105077', 'Acompanhamento médico para transporte intra-hospitalar de pacientes graves, com ventilação assistida, da UTI para o centro de diagnóstico', NULL, 60.86, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10105050', 'Transporte extra-hospitalar aéreo ou aquático de pacientes graves, 1ª hora - a partir do deslocamento do médico', NULL, 172.44, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10105069', 'Transporte extra-hospitalar aéreo ou aquático de pacientes graves, por hora adicional', NULL, 60.86, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10105034', 'Transporte extra-hospitalar terrestre de pacientes graves, 1ª hora - a partir do deslocamento do médico', NULL, 144.26, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10105042', 'Transporte extra-hospitalar terrestre de pacientes graves, por hora adicional - até o retorno do médico à base', NULL, 60.86, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10106014', 'Aconselhamento genético', NULL, 172.44, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10106146', 'Atendimento ambulatorial em puericultura', NULL, 126.23, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10106030', 'Atendimento ao familiar do adolescente', NULL, 33.81, true, NOW()),
('dcee437c-fd14-463c-b25e-a318f5da60b7', '10106049', 'Atendimento pediátrico a gestantes (3º trimestre)', NULL, 60.86, true, NOW());
