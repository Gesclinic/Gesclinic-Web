# 💻 FASE 12: COMANDOS PRONTOS (COPIE & COLE)

---

## ✅ TESTE 1: Database Triggers + Automação

Copie e cole cada bloco abaixo no **Supabase SQL Editor**:

---

### Passo 1.1: Verificar Triggers Ativos

```sql
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY trigger_name;
```

**Resultado esperado**: 3+ triggers (tipo: trg_* ou update_*)

---

### Passo 1.2: Verificar Funções Criadas

```sql
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_name LIKE '%receivable%' OR routine_name LIKE '%professional%' OR routine_name LIKE '%sync%' OR routine_name LIKE '%cashflow%')
ORDER BY routine_name;
```

**Resultado esperado**: 16 funções

---

### Passo 1.3: Verificar Índices

```sql
SELECT indexname, tablename
FROM pg_indexes 
WHERE tablename = 'appointment_services' 
AND indexname LIKE 'idx_%'
ORDER BY indexname;
```

**Resultado esperado**: 3 índices (plan_id, medical_production_id, status)

---

### Passo 1.4: Verificar Colunas Novas

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'appointment_services' 
AND column_name IN ('plan_id', 'authorization_number', 'professional_percentage', 'professional_discount', 'medical_production_id')
ORDER BY ordinal_position;
```

**Resultado esperado**: 5 colunas

---

## ✅ TESTE 2: Views de Relatórios

### Passo 2.1: Verificar vw_production_report

```sql
SELECT *
FROM vw_production_report 
LIMIT 10;
```

**Resultado esperado**: Dados com professional_name, total_appointments, total_revenue, average_ticket

---

### Passo 2.2: Verificar vw_billing_report

```sql
SELECT *
FROM vw_billing_report 
LIMIT 10;
```

**Resultado esperado**: Dados com plan_name, total_appointments, total_bruto, total_discount, total_liquido, total_received

---

### Passo 2.3: Verificar vw_receivables_report

```sql
SELECT *
FROM vw_receivables_report 
LIMIT 10;
```

**Resultado esperado**: Dados com id, amount, status, due_date, days_overdue, status_label

---

## ✅ TESTE 3: Workflow Automático (Agendamento → Recebível → Cashflow)

### Passo 3.1: Contar registros ANTES

```sql
SELECT COUNT(*) as count_appointments_attended FROM appointments WHERE status = 'attended' AND clinic_id = 'COLE_SEU_CLINIC_ID_AQUI';
SELECT COUNT(*) as count_receivables FROM ar_receivables WHERE clinic_id = 'COLE_SEU_CLINIC_ID_AQUI';
SELECT COUNT(*) as count_cashflow FROM ap_cashflow WHERE clinic_id = 'COLE_SEU_CLINIC_ID_AQUI';
```

---

### Passo 3.2: Criar Agendamento Teste

```sql
INSERT INTO appointments (
  clinic_id,
  patient_id, 
  professional_id,
  room_id,
  status,
  appointment_start,
  appointment_end,
  value
)
VALUES (
  'COLE_SEU_CLINIC_ID_AQUI',
  'COLE_SEU_PATIENT_ID_AQUI',
  'COLE_SEU_PROFESSIONAL_ID_AQUI',
  'COLE_SEU_ROOM_ID_OU_NULL',
  'attended',
  NOW(),
  NOW() + INTERVAL '1 hour',
  150.00
)
RETURNING id, status, value;
```

**Copie o ID do agendamento** que foi retornado para usar nos próximos passos!

---

### Passo 3.3: Verificar se Recebível foi Criado (deve ser automático!)

```sql
SELECT id, appointment_id, amount, status, created_at
FROM ar_receivables 
WHERE appointment_id = 'COLE_O_ID_DO_AGENDAMENTO_AQUI'
ORDER BY created_at DESC;
```

**Resultado esperado**: 1 recebível com status = 'pending' (criado automaticamente pelo trigger!)

---

### Passo 3.4: Marcar Recebível como Paid

```sql
UPDATE ar_receivables 
SET status = 'paid', 
    payment_method = 'cash', 
    paid_at = NOW()
WHERE appointment_id = 'COLE_O_ID_DO_AGENDAMENTO_AQUI'
RETURNING id, status, paid_at;
```

**Copie o ID do recebível** que foi retornado!

---

### Passo 3.5: Verificar se Cashflow foi Criado (deve ser automático!)

```sql
SELECT id, receivable_id, amount, status, created_at
FROM ap_cashflow 
WHERE receivable_id = 'COLE_O_ID_DO_RECEIVABLE_AQUI'
ORDER BY created_at DESC;
```

**Resultado esperado**: 1 entrada de cashflow com status = 'reconciled' (criado automaticamente pelo trigger!)

---

### Passo 3.6: Verificar Audit Trail

```sql
SELECT id, appointment_id, service_description, service_value, status
FROM ar_receivable_items 
WHERE appointment_id = 'COLE_O_ID_DO_AGENDAMENTO_AQUI'
ORDER BY created_at;
```

**Resultado esperado**: Registros detalhados de cada item do recebível

---

## ✅ TESTE 4: Contar Totais Finais

```sql
SELECT 
  COUNT(DISTINCT a.id) as total_attended_appointments,
  COUNT(DISTINCT r.id) as total_receivables,
  COUNT(DISTINCT c.id) as total_cashflow_entries,
  SUM(r.amount) as total_receivable_amount,
  SUM(c.amount) as total_cashflow_amount
FROM appointments a
LEFT JOIN ar_receivables r ON a.id = r.appointment_id
LEFT JOIN ap_cashflow c ON r.id = c.receivable_id
WHERE a.clinic_id = 'COLE_SEU_CLINIC_ID_AQUI'
  AND a.status = 'attended';
```

**Resultado esperado**: Números aumentaram comparado ao Passo 3.1 ✅

---

## 📝 NOTAS IMPORTANTES

```
1. Substituir "COLE_SEU_CLINIC_ID_AQUI" com seu clinic_id real
2. Substituir "COLE_SEU_PATIENT_ID_AQUI" com um patient_id real
3. Substituir "COLE_SEU_PROFESSIONAL_ID_AQUI" com um professional_id real
4. room_id pode ser NULL se não existir
5. Copiar o ID retornado e usar nos próximos comandos
```

---

## ✅ CHECKLIST DO TESTE 1-3

```
Teste 1: Database Structure
□ Triggers: 3+ encontrados
□ Funções: 16 encontrados
□ Índices: 3 encontrados
□ Colunas: 5 encontrados

Teste 2: Views
□ vw_production_report: Retorna dados
□ vw_billing_report: Retorna dados
□ vw_receivables_report: Retorna dados

Teste 3: Workflow Automático
□ Agendamento criado
□ Recebível criado AUTOMATICAMENTE
□ Recebível marcado paid
□ Cashflow criado AUTOMATICAMENTE
□ Audit trail criada

Resultado: ✅ SUCESSO!
```

---

**Tempo: ~20-30 minutos | Próximo: Teste 4 (UI Components) e Teste 5 (E2E)**

