-- ============================================================
-- DIAGNÓSTICO e CORREÇÃO: RLS Policy - Appointments UPDATE
-- ============================================================
-- Execute TODOS os passos nessa ordem no Supabase SQL Editor
-- Data: 2026-03-03

-- ============================================================
-- PASSO 1: VERIFICAR SE USUÁRIO TEM CLINIC_ID CORRETO
-- ============================================================
-- Resultado esperado: Uma linha com clinic_id preenchido (UUID)
-- Resultado problema: clinic_id vazio/NULL

SELECT 
  id, 
  email, 
  clinic_id,
  CASE WHEN clinic_id IS NULL THEN '❌ PROBLEMA: clinic_id é NULL' ELSE '✅ CORRETO' END as status
FROM users 
WHERE id = auth.uid()
LIMIT 1;

-- ============================================================
-- PASSO 2: SE clinic_id FOR NULL, CORRIGIR AGORA
-- ============================================================
-- Substitua 'INSIRA-AQUI-O-UUID-DA-CLINICA' pelo UUID de sua clínica
-- Para encontrar UUID das clínicas, execute:
--   SELECT id, name FROM clinics;

UPDATE users 
SET clinic_id = 'INSIRA-AQUI-O-UUID-DA-CLINICA'
WHERE id = auth.uid();

-- Verificar se atualizou
SELECT id, email, clinic_id FROM users WHERE id = auth.uid();

-- ============================================================
-- PASSO 3: TESTAR SE RLS PERMITE SELECT EM APPOINTMENTS
-- ============================================================
-- Resultado esperado: Múltiplas linhas de agendamentos
-- Resultado problema: Vazio (SELECT está bloqueado por RLS)

SELECT COUNT(*) as total_appointments
FROM appointments 
WHERE clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
LIMIT 10;

-- ============================================================
-- PASSO 4: VERIFICAR POLICIES ATUAIS
-- ============================================================
-- Resultado esperado: Ver 3 policies (SELECT, INSERT, UPDATE)
-- Resultado problema: Faltando UPDATE ou WITH CHECK estar vazio

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'appointments'
ORDER BY policyname;

-- ============================================================
-- PASSO 5: CORRIGIR SE POLICY AINDA ESTIVER INCOMPLETA
-- ============================================================
-- Se o WITH CHECK estiver vazio, execute:

DROP POLICY IF EXISTS "appointments_update" ON public.appointments;

CREATE POLICY "appointments_update"
  ON public.appointments
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- Verificar
SELECT policyname, with_check FROM pg_policies 
WHERE tablename = 'appointments' AND policyname = 'appointments_update';

-- ============================================================
-- PASSO 6: TESTAR UPDATE DIRETO NO BANCO
-- ============================================================
-- Substitua 'INSIRA-AQUI-APPOINTMENT-ID' por um ID real de agendamento

-- Primeiro, verificar qual agendamento existe
SELECT id, scheduled_date, professional_id FROM appointments LIMIT 1;

-- Depois testar UPDATE (substitua o ID abaixo)
UPDATE appointments 
SET scheduled_date = '2026-03-08'
WHERE id = 'INSIRA-AQUI-APPOINTMENT-ID';

-- Verificar se mudou
SELECT id, scheduled_date FROM appointments WHERE id = 'INSIRA-AQUI-APPOINTMENT-ID';

-- ============================================================
-- PASSO 7: ALTERNATIVE SOLUTION - Remove .select() do UPDATE
-- ============================================================
-- Se os passos acima falharem, há uma solução alternativa:
-- O .select() no UPDATE pode estar causando problema de RLS
--
-- ARQUIVO: src/pages/clinica/agenda/components/ModalCriarAgendamento.jsx
-- LINHA: 914 (aproximadamente)
--
-- MUDAR DE:
/*
const { data: updateResult, error: updateError } = await supabase
  .from("appointments")
  .update(updatePayload)
  .eq('id', appointmentIdToEdit)
  .select();  // ← REMOVE ISSO
*/

// PARA:
/*
const { data: updateResult, error: updateError } = await supabase
  .from("appointments")
  .update(updatePayload)
  .eq('id', appointmentIdToEdit);
  
// Importar updateAppointment da API
// return updateAppointment(appointmentIdToEdit, updatePayload);
*/

-- ============================================================
-- PASSO 8: VERIFICAR LOGS NO SUPABASE CONSOLE
-- ============================================================
-- Se os testes acima retornarem erro, vá para:
-- 1. Supabase Dashboard → SQL Editor
-- 2. Clique em "Query" → "View logs"
-- 3. Procure por "permission denied"
-- 4. Isso vai mostrar exatamente qual policy está bloqueando

-- ============================================================
-- RESUMO DOS SINTOMAS E SOLUÇÕES
-- ============================================================
/*

SINTOMA 1: UPDATE retorna vazio mas sem erro (updateError: null, updateResult: [])
├─ CAUSA: RLS policy incompleta ou usuario sem clinic_id
├─ SOLUÇÃO: Executar PASSO 1-6 acima

SINTOMA 2: UPDATE retorna erro "permission denied"
├─ CAUSA: RLS policy não permite UPDATE
├─ SOLUÇÃO: Executar PASSO 5 (recriar policy)

SINTOMA 3: SELECT também retorna vazio
├─ CAUSA: RLS SELECT policy está bloqueando
├─ SOLUÇÃO: Verificar SELECT policy (deve ter USING correto)

SINTOMA 4: Tudo acima funciona mas aplicação ainda não funciona
├─ CAUSA: .select() após UPDATE está acionando RLS filter
├─ SOLUÇÃO: Remover .select() ou usar PASSO 7 (alternative solution)

*/
