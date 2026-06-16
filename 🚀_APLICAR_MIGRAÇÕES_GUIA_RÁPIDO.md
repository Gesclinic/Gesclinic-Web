# 🚀 APLICAR MIGRAÇÕES - GUIA RÁPIDO

**Quando**: Depois de FASE 9-11 estar 100% implementada ✅  
**Tempo**: ~45 minutos  
**Status**: FASE 9-11 Implementação Concluída ✅

---

## ⚡ RESUMO RÁPIDO

```
FASE 9-11 Implementação:    ✅ 100% Completo (código compilável)
Migrations Prontas:        ✅ 2 arquivos SQL criados
Agora:                      🔴 Falta aplicar ao banco
Resultado depois:           ✅ FASE 9-11 100% Funcional
```

---

## 📋 PASSO-A-PASSO PARA APLICAR

### Passo 1: Criar Backup (5 min)

```
1. Abrir: https://app.supabase.com/
2. Seu projeto → Settings → Database (abas)
3. Backups → Manual Backup
4. Clicar "Start Backup"
5. Aguardar (normalmente 5-15 min)
   ├─ Você receberá email quando terminar
   └─ Status aparece em "Recent Backups"
```

**Tempo**: ~10-15 minutos (pode ser feito em paralelo)

---

### Passo 2: Aplicar Migration FASE 6-8 (5 min)

**O que faz**: Adiciona 8 novas colunas em `appointment_services`

```
1. Abrir: https://app.supabase.com/
2. Seu projeto → SQL Editor (abas)
3. Novo Query (botão)
4. Copiar TUDO o conteúdo de: 
   📁 supabase/migrations/2026-06-06_fase6-8_architectural_prep.sql
5. Colar no editor
6. Clicar "Run" (botão verde)
7. Aguardar: "Query executed successfully" (verde)
```

**Arquivo**: `supabase/migrations/2026-06-06_fase6-8_architectural_prep.sql`

**Verificar se funcionou**:
```sql
-- Copiar e colar este query após aplicar:
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'appointment_services' 
ORDER BY column_name;

-- Esperado: Ver colunas novas
-- - plan_id
-- - authorization_number
-- - professional_percentage
-- - professional_discount
-- - professional_repay_type
-- - medical_production_id
-- - sessions_completed
-- - sessions_total
```

---

### Passo 3: Aplicar Migration FASE 9-11 (5 min)

**O que faz**: Cria 2 triggers + 3 views de relatórios

```
1. SQL Editor → Novo Query
2. Copiar TUDO o conteúdo de: 
   📁 supabase/migrations/2026-06-06_fase9-11_financial_integration.sql
3. Colar no editor
4. Clicar "Run"
5. Aguardar: "Query executed successfully" (verde)
```

**Arquivo**: `supabase/migrations/2026-06-06_fase9-11_financial_integration.sql`

**Verificar se funcionou**:
```sql
-- Copiar e colar este query após aplicar:
SELECT 
  table_name, 
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'VIEW'
  AND table_name LIKE 'vw_%'
ORDER BY table_name;

-- Esperado: Ver 3 views criadas
-- - vw_production_report
-- - vw_billing_report
-- - vw_receivables_report
```

---

### Passo 4: Validar Triggers (5 min)

**O que faz**: Verifica que os triggers foram criados

```sql
-- Copiar e colar este query:
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- Esperado: Ver 2 triggers
-- - create_receivable_on_appointment_attended (AFTER UPDATE appointments)
-- - sync_cashflow_on_receivable_update (AFTER UPDATE ar_receivables)
```

---

## 🧪 TESTAR OS TRIGGERS (CRÍTICO!)

Após aplicar todas as migrações, DEVE testar se os triggers funcionam:

### Teste 1: Criar Receivable Automaticamente

```sql
-- 1. Criar appointment de teste
INSERT INTO appointments (
  clinic_id, 
  patient_id, 
  professional_id, 
  service_id, 
  payer_id, 
  scheduled_date, 
  scheduled_time, 
  status
) VALUES (
  'SEU_CLINIC_ID_AQUI',  -- Substituir com ID real
  'SEU_PATIENT_ID_AQUI', -- Substituir com ID real
  'SEU_PROFESSIONAL_ID', -- Substituir com ID real
  'SEU_SERVICE_ID',      -- Substituir com ID real
  'SEU_PAYER_ID',        -- Substituir com ID real
  NOW()::DATE,
  '10:00',
  'confirmed'  -- Começa como confirmed
) RETURNING id;

-- 2. Copiar o ID do appointment retornado
-- 3. Atualizar para "attended" PARA DISPARAR O TRIGGER
UPDATE appointments 
SET status = 'attended', updated_at = NOW()
WHERE id = 'O_ID_QUE_COPIOU_ACIMA';

-- 4. Verificar que receivable foi criado automaticamente
SELECT id, appointment_id, amount, status 
FROM ar_receivables 
WHERE appointment_id = 'O_ID_QUE_COPIOU_ACIMA';

-- Esperado: Um receivable com status = 'pending'
```

### Teste 2: Sincronizar Cashflow Automaticamente

```sql
-- 1. Copiar um receivable_id do teste anterior
-- 2. Atualizar para "paid" PARA DISPARAR O TRIGGER
UPDATE ar_receivables 
SET status = 'paid', payment_method = 'cash', paid_date = NOW()
WHERE id = 'RECEIVABLE_ID_AQUI';

-- 3. Verificar que entrada no cashflow foi criada
SELECT id, reference_id, amount, type
FROM ap_cashflow 
WHERE reference_id = 'RECEIVABLE_ID_AQUI';

-- Esperado: Uma entrada com type = 'input'
```

---

## 🚨 ROLLBACK (Se algo der errado)

Se precisar reverter as migrações:

```sql
-- Remover FASE 9-11 (triggers e views)
DROP TRIGGER IF EXISTS sync_cashflow_on_receivable_update ON ar_receivables;
DROP TRIGGER IF EXISTS create_receivable_on_appointment_attended ON appointments;
DROP FUNCTION IF EXISTS sync_cashflow_from_receivable();
DROP FUNCTION IF EXISTS create_receivable_from_appointment();
DROP VIEW IF EXISTS vw_receivables_report;
DROP VIEW IF EXISTS vw_billing_report;
DROP VIEW IF EXISTS vw_production_report;

-- Remover FASE 6-8 (colunas)
ALTER TABLE appointment_services 
DROP COLUMN IF EXISTS plan_id,
DROP COLUMN IF EXISTS authorization_number,
DROP COLUMN IF EXISTS professional_percentage,
DROP COLUMN IF EXISTS professional_discount,
DROP COLUMN IF EXISTS professional_repay_type,
DROP COLUMN IF EXISTS medical_production_id,
DROP COLUMN IF EXISTS sessions_completed,
DROP COLUMN IF EXISTS sessions_total;
```

**OU usar backup do Supabase**:
- Supabase → Settings → Backups → "Recent Backups" → Clicar no restore

---

## ✅ CHECKLIST FINAL

- [ ] Backup criado (verificar email)
- [ ] FASE 6-8 migration aplicada
- [ ] Colunas novas verificadas (SELECT query)
- [ ] FASE 9-11 migration aplicada
- [ ] Views criadas verificadas (SELECT query)
- [ ] Triggers criados verificados (SELECT query)
- [ ] Teste 1: Receivable criado automaticamente ✓
- [ ] Teste 2: Cashflow sincronizado automaticamente ✓
- [ ] ✅ TODAS AS MIGRAÇÕES APLICADAS!

---

## 📚 ARQUIVOS DE REFERÊNCIA

```
📁 supabase/migrations/
  ├─ 2026-06-06_fase6-8_architectural_prep.sql (200+ linhas)
  └─ 2026-06-06_fase9-11_financial_integration.sql (200+ linhas)

📁 Documentação:
  ├─ ✅_FASE9-11_IMPLEMENTACAO_COMPLETA.md
  ├─ ⚡_MASTER_MIGRATION_PLAN_FINAL.md
  └─ 🎯_PROXIMA_FASE_RESUMO_EXECUTIVO.md
```

---

## 🎯 PRÓXIMAS AÇÕES

### Se as migrações funcionarem:
```
1. ✅ Fazer commit: git add . && git commit -m "FASE 9-11: Completo com migrações aplicadas"
2. 🎯 Começar FASE 12-17 (Testes & Deploy)
```

### Se algo der errado:
```
1. 📋 Ler mensagem de erro (geralmente está no Supabase)
2. 🔙 Fazer rollback usando instrução acima
3. 📞 Verificar arquivo SQL (pode haver typo)
4. 🔄 Tentar novamente
```

---

## ⏱️ TIMELINE

```
Agora (20:50):
├─ Backup preparado (10-15 min)
├─ FASE 6-8 migration aplicada (5 min)
├─ FASE 9-11 migration aplicada (5 min)
├─ Validação triggers (5 min)
├─ Testes (10 min)
└─ ✅ 40-50 minutos total

Resultado:
└─ 100% da FASE 9-11 FUNCIONANDO + BD SINCRONIZADO
```

---

## 📞 SUMÁRIO

| Ação | Tempo | Status |
|------|-------|--------|
| Criar Backup | 10-15 min | ⏳ |
| Aplicar FASE 6-8 | 5 min | ⏳ |
| Aplicar FASE 9-11 | 5 min | ⏳ |
| Validar | 10 min | ⏳ |
| Testar Triggers | 10 min | ⏳ |
| **TOTAL** | **~45 min** | **⏳** |

---

**Próxima Ação**: Abrir https://app.supabase.com/ → Settings → Backup → Clicar "Start Backup"

Depois de ~15 minutos quando backup acabar: SQL Editor → Novo Query → Copiar FASE 6-8 migration SQL

