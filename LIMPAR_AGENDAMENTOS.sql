-- 🗑️ LIMPEZA DE AGENDAMENTOS
-- Execute este script no Supabase SQL Editor para deletar TODOS os agendamentos

-- ============================================
-- MOSTRAR QUANTOS REGISTROS EXISTEM (antes de deletar)
-- ============================================
SELECT COUNT(*) as total_agendamentos FROM appointments;

-- ============================================
-- DELETAR TODOS OS AGENDAMENTOS
-- ============================================
DELETE FROM appointments;

-- ============================================
-- CONFIRMAR QUE FOI DELETADO (deve retornar 0)
-- ============================================
SELECT COUNT(*) as total_agendamentos_depois FROM appointments;

-- ============================================
-- Se quiser resetar o ID sequence (opcional)
-- ============================================
-- ALTER SEQUENCE appointments_id_seq RESTART WITH 1;
