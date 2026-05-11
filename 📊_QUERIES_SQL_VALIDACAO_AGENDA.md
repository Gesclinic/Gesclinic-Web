# 📊 QUERIES SQL - VALIDAÇÃO DO BANCO DE DADOS

## Executar no Supabase SQL Editor

---

## 1. INTEGRIDADE BÁSICA

### 1.1 Contar registros
```sql
-- Total de agendamentos
SELECT COUNT(*) as total_appointments
FROM appointments
WHERE clinic_id = '{{ CLINIC_ID }}';

-- Total de serviços de agendamentos
SELECT COUNT(*) as total_appointment_services
FROM appointment_services
WHERE clinic_id = '{{ CLINIC_ID }}';

-- Total de receivables
SELECT COUNT(*) as total_ar_receivables
FROM ar_receivables
WHERE appointment_id IN (
  SELECT id FROM appointments WHERE clinic_id = '{{ CLINIC_ID }}'
);
```

---

## 2. CAMPOS NULL - VERIFICAR CORRUPÇÃO

### 2.1 Agendamentos com patient_id NULL
```sql
SELECT id, professional_id, service_id, room_id, payer_id, created_at
FROM appointments
WHERE clinic_id = '{{ CLINIC_ID }}'
  AND patient_id IS NULL
LIMIT 10;

-- ✅ Esperado: 0 registros
-- ❌ Se houver, há corrupção
```

### 2.2 Agendamentos com professional_id NULL
```sql
SELECT id, patient_id, service_id, room_id, payer_id, created_at
FROM appointments
WHERE clinic_id = '{{ CLINIC_ID }}'
  AND professional_id IS NULL
LIMIT 10;

-- ✅ Esperado: 0 registros
-- ❌ Se houver, há problema na criação
```

### 2.3 Agendamentos com service_id NULL
```sql
SELECT id, patient_id, professional_id, room_id, payer_id, created_at
FROM appointments
WHERE clinic_id = '{{ CLINIC_ID }}'
  AND service_id IS NULL
LIMIT 10;

-- ✅ Esperado: 0 registros
-- ⚠️ Poderia ser valido em alguns casos, mas é raro
```

### 2.4 Agendamentos com TODOS os campos principais NULL
```sql
SELECT id, created_at, status
FROM appointments
WHERE clinic_id = '{{ CLINIC_ID }}'
  AND (patient_id IS NULL
    OR professional_id IS NULL
    OR service_id IS NULL
    OR room_id IS NULL)
LIMIT 10;

-- ✅ Esperado: 0-5 registros (muito raro)
-- ❌ Se houver mais de 5%, há problema estrutural
```

---

## 3. ROOM_ID E PAYER_ID - CRÍTICO

### 3.1 Agendamentos SEM room_id (especificidade por clinic)
```sql
SELECT COUNT(*) as count_no_room,
       COUNT(*) * 100.0 / (
         SELECT COUNT(*) FROM appointments 
         WHERE clinic_id = '{{ CLINIC_ID }}'
       ) as percentage
FROM appointments
WHERE clinic_id = '{{ CLINIC_ID }}'
  AND room_id IS NULL
  AND created_at > NOW() - INTERVAL '30 days';

-- ✅ Esperado: 0-10% (alguns sem sala é ok)
-- ❌ Se > 30%, há problema
```

### 3.2 Agendamentos SEM payer_id
```sql
SELECT COUNT(*) as count_no_payer,
       COUNT(*) * 100.0 / (
         SELECT COUNT(*) FROM appointments 
         WHERE clinic_id = '{{ CLINIC_ID }}'
       ) as percentage
FROM appointments
WHERE clinic_id = '{{ CLINIC_ID }}'
  AND payer_id IS NULL
  AND created_at > NOW() - INTERVAL '30 days';

-- ✅ Esperado: 20-40% (muitos particulares é normal)
-- ❌ Se < 5%, pode indicar que particular não está sendo salvo
```

### 3.3 Verificar se room_id referencia tabela rooms corretamente
```sql
-- Agendamentos com room_id mas sala não existe
SELECT a.id, a.room_id, a.created_at
FROM appointments a
LEFT JOIN rooms r ON a.room_id = r.id
WHERE a.clinic_id = '{{ CLINIC_ID }}'
  AND a.room_id IS NOT NULL
  AND r.id IS NULL
LIMIT 10;

-- ✅ Esperado: 0 registros
-- ❌ Se houver, há problema de referencial integrity
```

### 3.4 Verificar se payer_id referencia tabela payers corretamente
```sql
-- Agendamentos com payer_id mas convênio não existe
SELECT a.id, a.payer_id, a.created_at
FROM appointments a
LEFT JOIN payers p ON a.payer_id = p.id
WHERE a.clinic_id = '{{ CLINIC_ID }}'
  AND a.payer_id IS NOT NULL
  AND p.id IS NULL
LIMIT 10;

-- ✅ Esperado: 0 registros
-- ❌ Se houver, há problema (talvez convênio foi deletado)
```

---

## 4. MÚLTIPLOS SERVIÇOS - INTEGRIDADE

### 4.1 Agendamentos SEM appointment_services
```sql
-- Agendamentos criados com múltiplos serviços mas não têm entries
SELECT a.id, a.patient_id, a.created_at, 
       (SELECT COUNT(*) FROM appointment_services 
        WHERE appointment_id = a.id) as services_count
FROM appointments a
WHERE a.clinic_id = '{{ CLINIC_ID }}'
  AND a.created_at > NOW() - INTERVAL '7 days'
HAVING services_count = 0
LIMIT 20;

-- ✅ Esperado: Alguns (agendamentos simples sem múltiplos serviços)
-- ❌ Se MUITOS foram criados com múltiplos serviços mas zerados, há problema
```

### 4.2 Serviços ORPHANS (não têm agendamento)
```sql
-- appointment_services que referem agendamento deletado
SELECT id, appointment_id, clinic_id, created_at
FROM appointment_services
WHERE appointment_id NOT IN (
  SELECT id FROM appointments
)
LIMIT 10;

-- ✅ Esperado: 0 registros
-- ❌ Se houver, há problema no cascading delete
```

### 4.3 Total de serviços por agendamento
```sql
-- Distribuição: quantos agendamentos têm 0, 1, 2, 3+ serviços
SELECT 
  services_count,
  COUNT(*) as appointment_count,
  COUNT(*) * 100.0 / (SELECT COUNT(*) FROM appointments WHERE clinic_id = '{{ CLINIC_ID }}') as percentage
FROM (
  SELECT appointment_id,
         COUNT(*) as services_count
  FROM appointment_services
  WHERE clinic_id = '{{ CLINIC_ID }}'
  GROUP BY appointment_id
) grouped
GROUP BY services_count
ORDER BY services_count;

-- ✅ Resultado esperado (exemplo):
-- services_count | appointment_count | percentage
--       1        |      500          |   60%
--       2        |      200          |   24%
--       3        |       60          |   7%
--       4        |       40          |   5%
--       0        |       30          |   4% (serviços foram deletados)
```

---

## 5. RECEIVABLES - CASCADING

### 5.1 AR Receivables ORPHANS
```sql
-- ar_receivables que referem agendamento deletado
SELECT id, appointment_id, clinic_id, created_at
FROM ar_receivables
WHERE appointment_id NOT IN (
  SELECT id FROM appointments
)
LIMIT 10;

-- ✅ Esperado: 0 registros
-- ❌ Se houver, há problema no cascading delete
```

### 5.2 Agendamentos com receivables correspondentes
```sql
-- Verificar se cada agendamento faturado tem receivable
SELECT 
  a.id,
  a.status,
  a.payment_status,
  COUNT(r.id) as receivables_count
FROM appointments a
LEFT JOIN ar_receivables r ON a.id = r.appointment_id
WHERE a.clinic_id = '{{ CLINIC_ID }}'
  AND a.status = 'completed'
  AND a.created_at > NOW() - INTERVAL '30 days'
GROUP BY a.id
HAVING receivables_count = 0
LIMIT 20;

-- ✅ Esperado: Alguns (nem todo completed tem receivable ainda)
-- ❌ Se MUITOS completed sem receivable, pode haver faturamento perdido
```

---

## 6. DATAS E HORÁRIOS

### 6.1 Agendamentos com scheduled_date > scheduled_time (inconsistência)
```sql
-- Verificar se há conversão errada entre date e time
SELECT id, scheduled_date, scheduled_time, end_time, created_at
FROM appointments
WHERE clinic_id = '{{ CLINIC_ID }}'
  AND (scheduled_date IS NULL OR scheduled_time IS NULL)
LIMIT 10;

-- ✅ Esperado: 0 registros (ambos devem ter valores)
-- ❌ Se houver, há problema de criação
```

### 6.2 Agendamentos com end_time < scheduled_time
```sql
-- Verificar se end_time é sempre maior que start_time
SELECT id, scheduled_date, scheduled_time, end_time
FROM appointments
WHERE clinic_id = '{{ CLINIC_ID }}'
  AND scheduled_time >= end_time
LIMIT 10;

-- ✅ Esperado: 0 registros
-- ❌ Se houver, há problema de validação
```

### 6.3 Horários com formato inválido
```sql
-- Verificar se scheduled_time tem formato HH:MM:SS
SELECT id, scheduled_time, end_time
FROM appointments
WHERE clinic_id = '{{ CLINIC_ID }}'
  AND (scheduled_time !~ '^\d{2}:\d{2}:\d{2}$'
    OR end_time !~ '^\d{2}:\d{2}:\d{2}$')
LIMIT 10;

-- ✅ Esperado: 0 registros
-- ❌ Se houver, há problema de formato
```

---

## 7. STATUS E TRANSIÇÕES

### 7.1 Contagem por status
```sql
SELECT 
  status,
  COUNT(*) as count,
  COUNT(*) * 100.0 / (SELECT COUNT(*) FROM appointments WHERE clinic_id = '{{ CLINIC_ID }}') as percentage
FROM appointments
WHERE clinic_id = '{{ CLINIC_ID }}'
GROUP BY status
ORDER BY count DESC;

-- Resultado esperado:
-- status      | count | percentage
-- scheduled   | 500   | 40%
-- confirmed   | 300   | 24%
-- completed   | 200   | 16%
-- cancelled   | 150   | 12%
-- no_show     | 50    | 4%
-- pending     | 50    | 4%
```

### 7.2 Agendamentos muito antigos em "scheduled"
```sql
-- Agendamentos > 60 dias atrás ainda em scheduled
SELECT id, scheduled_date, status, created_at
FROM appointments
WHERE clinic_id = '{{ CLINIC_ID }}'
  AND status = 'scheduled'
  AND scheduled_date < CURRENT_DATE - INTERVAL '60 days'
LIMIT 20;

-- ✅ Esperado: 0-5 registros (muito raro)
-- ⚠️ Se > 20, pode haver agendamentos que não foram confirmados/cancelados
```

---

## 8. VERIFICAÇÃO DE RLS POLICIES

### 8.1 Listar policies ativas
```sql
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'appointments'
ORDER BY policyname;

-- Esperado ver:
-- appointments_select_all
-- appointments_insert_with_clinic
-- appointments_update_with_clinic
-- appointments_delete_with_clinic
```

### 8.2 Verificar se SELECT retorna dados (teste RLS)
```sql
-- Esta query pode falhar se RLS está muito restritivo
SELECT COUNT(*) FROM appointments LIMIT 1;

-- ✅ Se retorna número: RLS OK
-- ❌ Se retorna 0 ou erro: RLS pode estar bloqueando
```

---

## 9. VERIFICAR RPCS EXISTEM

### 9.1 Listar todas as RPCs de agenda
```sql
SELECT p.proname, pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%agenda%'
  OR p.proname LIKE '%appointment%'
  OR p.proname LIKE '%overlap%'
ORDER BY p.proname;

-- Esperado ver:
-- - list_agenda_v1, list_agenda_v2, list_agenda_v3, list_agenda_v4
-- - has_overlap_appointments
-- - create_or_update_appointment_v1, v2, v3
```

### 9.2 Testar RPC has_overlap_appointments
```sql
-- Testar se existe e funciona
SELECT has_overlap_appointments(
  p_appointment_id := NULL,
  p_professional_id := '{{ PROF_ID }}',
  p_start_time := NOW()::timestamp,
  p_end_time := (NOW() + INTERVAL '1 hour')::timestamp
);

-- ✅ Deve retornar boolean (true se há overlap, false se não)
-- ❌ Se erro, RPC pode estar quebrada
```

---

## 10. PERFORMANCE - VERIFICAR ÍNDICES

### 10.1 Listar índices na tabela appointments
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'appointments'
ORDER BY indexname;

-- Esperado ter índices em:
-- - clinic_id (para filtro por clínica)
-- - professional_id (para filtro por profissional)
-- - scheduled_date (para filtro por data)
-- - patient_id (para filtro por paciente)
-- - status (para filtro por status)
```

### 10.2 Executar EXPLAIN para listar agendamentos (validar query performance)
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM appointments
WHERE clinic_id = '{{ CLINIC_ID }}'
  AND scheduled_date = '2026-05-06'
  AND professional_id = '{{ PROF_ID }}'
ORDER BY scheduled_time ASC;

-- ✅ Esperado: < 100ms com índices
-- ❌ Se > 1s, há problema de performance
```

---

## 11. AUDITORIA - QUEM CRIOU/EDITOU

### 11.1 Verificar campos de auditoria
```sql
SELECT id, created_at, updated_at, created_by, updated_by
FROM appointments
WHERE clinic_id = '{{ CLINIC_ID }}'
LIMIT 5;

-- ✅ Esperado: created_at e updated_at preenchidos
-- ⚠️ Se created_by/updated_by NULL, auditoria incompleta
```

### 11.2 Agendamentos sem created_by
```sql
SELECT id, created_at, created_by
FROM appointments
WHERE clinic_id = '{{ CLINIC_ID }}'
  AND created_by IS NULL
LIMIT 10;

-- ✅ Se zero: Auditoria OK
-- ❌ Se houver: Falta rastreabilidade
```

---

## 12. TESTES DE RELACIONAMENTOS

### 12.1 Consulta COMPLETA com relacionamentos
```sql
SELECT 
  a.id,
  a.clinic_id,
  a.patient_id,
  p.name as patient_name,
  a.professional_id,
  prof.name as professional_name,
  a.service_id,
  s.name as service_name,
  a.room_id,
  r.name as room_name,
  a.payer_id,
  pay.name as payer_name,
  a.scheduled_date,
  a.scheduled_time,
  a.status,
  COUNT(DISTINCT aps.id) as services_count,
  COUNT(DISTINCT ar.id) as receivables_count
FROM appointments a
LEFT JOIN patients p ON a.patient_id = p.id
LEFT JOIN professionals prof ON a.professional_id = prof.id
LEFT JOIN services s ON a.service_id = s.id
LEFT JOIN rooms r ON a.room_id = r.id
LEFT JOIN payers pay ON a.payer_id = pay.id
LEFT JOIN appointment_services aps ON a.id = aps.appointment_id
LEFT JOIN ar_receivables ar ON a.id = ar.appointment_id
WHERE a.clinic_id = '{{ CLINIC_ID }}'
  AND a.created_at > NOW() - INTERVAL '7 days'
GROUP BY a.id, p.id, prof.id, s.id, r.id, pay.id
LIMIT 20;

-- Visualizar: Todos os relacionamentos resolvidos corretamente?
-- ✅ Se sim: Integridade OK
-- ❌ Se houver NULLs inesperados: Há problema
```

---

## SCRIPT DE VALIDAÇÃO RÁPIDA

```sql
-- Executar todos os checks de uma vez
WITH stats AS (
  SELECT 
    'total_appointments' as metric, COUNT(*) as value
  FROM appointments
  WHERE clinic_id = '{{ CLINIC_ID }}'
  
  UNION ALL
  
  SELECT 'appointments_no_patient', COUNT(*)
  FROM appointments
  WHERE clinic_id = '{{ CLINIC_ID }}' AND patient_id IS NULL
  
  UNION ALL
  
  SELECT 'appointments_no_professional', COUNT(*)
  FROM appointments
  WHERE clinic_id = '{{ CLINIC_ID }}' AND professional_id IS NULL
  
  UNION ALL
  
  SELECT 'appointments_no_service', COUNT(*)
  FROM appointments
  WHERE clinic_id = '{{ CLINIC_ID }}' AND service_id IS NULL
  
  UNION ALL
  
  SELECT 'appointments_no_room', COUNT(*)
  FROM appointments
  WHERE clinic_id = '{{ CLINIC_ID }}' AND room_id IS NULL
  
  UNION ALL
  
  SELECT 'appointment_services_total', COUNT(*)
  FROM appointment_services
  WHERE clinic_id = '{{ CLINIC_ID }}'
  
  UNION ALL
  
  SELECT 'appointment_services_orphan', COUNT(*)
  FROM appointment_services
  WHERE appointment_id NOT IN (SELECT id FROM appointments)
  
  UNION ALL
  
  SELECT 'ar_receivables_orphan', COUNT(*)
  FROM ar_receivables
  WHERE appointment_id NOT IN (SELECT id FROM appointments)
)
SELECT * FROM stats;
```

---

**Salvar resultados antes e depois para comparação antes/depois de correções.**
