# 🔍 GUIA DE VALIDAÇÃO - O QUE VOCÊ VAI VER

**Depois de aplicar as 2 migrações SQL**

---

## ✅ PASSO 1: Verificar Colunas Adicionadas

Execute no SQL Editor:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'appointment_services' 
AND column_name IN (
  'plan_id', 
  'authorization_number', 
  'professional_percentage', 
  'professional_discount', 
  'medical_production_id', 
  'sessions_completed', 
  'status'
)
ORDER BY column_name;
```

### Esperado:

| column_name | data_type | is_nullable |
|---|---|---|
| authorization_number | character varying | YES |
| medical_production_id | uuid | YES |
| plan_id | uuid | YES |
| professional_discount | numeric | YES |
| professional_percentage | numeric | YES |
| sessions_completed | integer | YES |
| status | character varying | YES |

**Se aparecer**: ✅ Colunas criadas com sucesso!

---

## ✅ PASSO 2: Verificar Views Criadas

Execute no SQL Editor:

```sql
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'VIEW'
AND table_name LIKE 'vw_%'
ORDER BY table_name;
```

### Esperado:

| table_name | table_type |
|---|---|
| vw_billing_report | VIEW |
| vw_production_report | VIEW |
| vw_receivables_report | VIEW |

**Se aparecer**: ✅ Views criadas com sucesso!

---

## ✅ PASSO 3: Verificar Funções/Triggers Criadas

Execute no SQL Editor:

```sql
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY trigger_name;
```

### Esperado:

| trigger_name | event_object_table | event_manipulation |
|---|---|---|
| create_receivable_on_appointment_attended | appointments | UPDATE |
| sync_cashflow_on_receivable_update | ar_receivables | UPDATE |

**Se aparecer**: ✅ Triggers criados com sucesso!

---

## ✅ PASSO 4: Verificar Índices Criados

Execute no SQL Editor:

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename = 'appointment_services'
AND indexname LIKE 'idx_appointment_services%';
```

### Esperado:

| indexname | tablename |
|---|---|
| idx_appointment_services_medical_production_id | appointment_services |
| idx_appointment_services_plan_id | appointment_services |
| idx_appointment_services_status | appointment_services |

**Se aparecer**: ✅ Índices criados com sucesso!

---

## ✅ PASSO 5: Testar a View vw_production_report

Execute no SQL Editor:

```sql
SELECT * FROM vw_production_report LIMIT 5;
```

### Esperado:

```
professional_id | professional_name | total_appointments | total_services | total_revenue | average_ticket
---|---|---|---|---|---
(uuid) | João Silva | 5 | 8 | 500.00 | 62.50
(uuid) | Maria Santos | 3 | 4 | 300.00 | 75.00
...
```

**Se aparecer dados**: ✅ View funcionando!

**Se aparecer vazio**: ⚠️ Normal (precisa de dados no appointment_services)

---

## ✅ PASSO 6: Testar a View vw_billing_report

Execute no SQL Editor:

```sql
SELECT * FROM vw_billing_report LIMIT 5;
```

### Esperado:

```
plan_id | plan_name | total_appointments | gross_amount | total_discount | net_amount | received_count
---|---|---|---|---|---|---
NULL | Particular | 10 | 1000.00 | 50.00 | 950.00 | 5
(uuid) | Amil | 5 | 800.00 | 100.00 | 700.00 | 3
...
```

**Se aparecer dados**: ✅ View funcionando!

---

## ✅ PASSO 7: Testar a View vw_receivables_report

Execute no SQL Editor:

```sql
SELECT * FROM vw_receivables_report LIMIT 5;
```

### Esperado:

```
id | amount | status | days_overdue | status_label
---|---|---|---|---
(uuid) | 500.00 | paid | -10 | Recebido
(uuid) | 300.00 | pending | 5 | Atrasado
(uuid) | 200.00 | pending | -5 | Pendente
...
```

**Se aparecer dados**: ✅ View funcionando!

---

## 🧪 PASSO 8: Testar Trigger (Opcional - IMPORTANTE!)

Este teste confirma que o fluxo automático está funcionando.

### A. Criar um teste appointment (se não houver)

```sql
-- Pegar clinic_id real
SELECT id FROM clinics LIMIT 1;

-- Pegar professional_id real
SELECT id FROM professionals LIMIT 1;

-- Criar appointment de teste
INSERT INTO appointments (
  clinic_id,
  professional_id,
  scheduled_date,
  status,
  notes
) VALUES (
  '(seu-clinic-id-aqui)',
  '(seu-professional-id-aqui)',
  NOW(),
  'confirmed',
  'TESTE TRIGGER'
);
```

### B. Marcar como "attended"

```sql
-- Pegar o ID que acabou de criar
SELECT id FROM appointments WHERE notes = 'TESTE TRIGGER' LIMIT 1;

-- Marcar como attended
UPDATE appointments 
SET status = 'attended' 
WHERE notes = 'TESTE TRIGGER';
```

### C. Verificar se receivable foi criado automaticamente

```sql
SELECT ar.id, ar.amount, ar.status, ar.appointment_id
FROM ar_receivables ar
LEFT JOIN appointments a ON ar.appointment_id = a.id
WHERE a.notes = 'TESTE TRIGGER';
```

**Se aparecer receivable com status='pending'**: ✅ **TRIGGER FUNCIONANDO! 🎉**

---

## ✅ PASSO 9: Testar Cashflow Sync (Opcional - IMPORTANTE!)

### A. Marcar receivable como pago

```sql
-- Pegar o receivable_id do teste anterior
UPDATE ar_receivables 
SET status = 'paid'
WHERE appointment_id IN (
  SELECT id FROM appointments WHERE notes = 'TESTE TRIGGER'
);
```

### B. Verificar se cashflow foi criado automaticamente

```sql
SELECT cf.id, cf.amount, cf.type, cf.reference_id, cf.reference_type
FROM ap_cashflow cf
WHERE cf.reference_id = (
  SELECT id FROM ar_receivables ar
  LEFT JOIN appointments a ON ar.appointment_id = a.id
  WHERE a.notes = 'TESTE TRIGGER'
  LIMIT 1
);
```

**Se aparecer cashflow entry com type='input'**: ✅ **TRIGGER FUNCIONANDO! 🎉**

---

## 📊 RESUMO - CHECKLIST FINAL

```
✅ Passo 1: Colunas novas visíveis         [Ver 7 colunas]
✅ Passo 2: Views criadas                  [Ver 3 views]
✅ Passo 3: Triggers criados               [Ver 2 triggers]
✅ Passo 4: Índices criados                [Ver 3 índices]
✅ Passo 5: vw_production_report funciona  [Ver dados ou vazio]
✅ Passo 6: vw_billing_report funciona     [Ver dados ou vazio]
✅ Passo 7: vw_receivables_report funciona [Ver dados ou vazio]
✅ Passo 8: Trigger 1 funcionando          [Receivable criado auto]
✅ Passo 9: Trigger 2 funcionando          [Cashflow criado auto]

Se TODOS passarem: 🎉 FASE 9-11 100% FUNCIONAL!
```

---

## 🚨 SE ALGO DER ERRADO

### Erro: "column_name já existe"
```
Solução: Os SQLs usam IF NOT EXISTS, então é seguro executar novamente
Ação: Execute novamente, não há duplicação
```

### Erro: "table não existe"
```
Solução: Pode ser que a tabela foi deletada ou renomeada
Ação: Verificar se as tabelas existem (appointments, appointment_services, etc)
```

### Erro: "function já existe"
```
Solução: Usar CREATE OR REPLACE (já está nos SQLs)
Ação: Seguro executar novamente, vai sobrescrever
```

### View retorna vazio
```
Solução: NORMAL! Precisa de dados no appointment_services
Ação: Usar dados reais da clínica (não é erro)
```

### Trigger não dispara
```
Solução: Verificar se appointment.status realmente mudou para 'attended'
Ação: Testar com UPDATE, não INSERT
```

---

## 🎉 QUANDO TUDO PASSAR

```
✅ FASE 9-11 está 100% FUNCIONAL

Seu sistema agora pode:
1. Criar appointments com múltiplos serviços ✓
2. Gerar receivables automaticamente ✓
3. Sincronizar cashflow automaticamente ✓
4. Relatar produção por profissional ✓
5. Relatar faturamento por plano ✓
6. Relatar status de recebíveis ✓
7. Rastrear dias em atraso ✓
8. Auditoria completa ✓

Projeto: ~75% de conclusão
Próximo: FASE 12-17 (testes - podem ser amanhã)
```

---

**Pronto para começar a validação?** 🚀

