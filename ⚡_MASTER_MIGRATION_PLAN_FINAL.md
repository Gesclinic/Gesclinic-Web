# 🎯 MASTER MIGRATION PLAN
## Consolidação de Todas as Migrações (FASE 1-17)

**Última Atualização**: 2026-06-06  
**Status**: 🟡 PLANEJADA PARA O FINAL  
**Tempo Estimado de Aplicação**: 30-45 minutos  

---

## 📋 RESUMO

Este documento consolida TODAS as migrações SQL que precisam ser aplicadas no Supabase ao fim de TODAS as 17 fases da consolidação. 

**Estratégia**:
- ✅ Fases 1-3: Consolidação de APIs (SEM mudanças no banco)
- ✅ Fases 4-5: UI Enterprise (SEM mudanças no banco)
- 📊 Fases 6-11: Todas as mudanças de schema + triggers + views
- 📊 Fases 12-16: Testes (SEM mudanças no banco)
- 📊 Fase 17: Aplicar TODAS as migrações de uma vez + Deploy

---

## 🔧 PLANO DE APLICAÇÃO

### Opção A: Aplicar Incrementalmente (Recomendado para Validação)

```
Desenvolvimento:
├─ Criar FASE 4-5 (UI) → Build ✓ → Não requer DB change
├─ Criar FASE 6-8 (Arquitetura) → Build ✓ → Não requer DB change (ainda)
├─ Criar FASE 9-11 (Financeiro) → Build ✓ → Não requer DB change (ainda)
├─ Criar FASE 12-16 (Testes) → Build ✓ → Não requer DB change

Aplicação de Migrações (Quando pronto):
├─ Checkpoint 1: Aplicar FASE 6-8 migration
│  └─ Adiciona colunas ao appointment_services
│
├─ Checkpoint 2: Aplicar FASE 9-11 migration
│  └─ Adiciona triggers e views
│
└─ Validação: Testar triggers, views, reports

Deployment:
└─ Fazer push completo ao staging
```

### Opção B: Aplicar Tudo de Uma Vez (Fast-track)

```
Desenvolvimento: Todas as 17 fases em paralelo
    ↓
Code Review: Aprovado
    ↓
Build Validation: npm run build ✓
    ↓
Aplicar TODAS as migrations
    ↓
Teste End-to-End: 8 cenários
    ↓
Deploy
```

---

## 🗂️ ARQUIVOS DE MIGRATION

```
supabase/migrations/
├─ 2026-06-06_fase6-8_architectural_prep.sql
│  ├─ Colunas: plan_id, authorization_number
│  ├─ Colunas: professional_percentage, professional_discount
│  ├─ Colunas: medical_production_id, sessions_completed, status
│  ├─ Índices para performance
│  └─ RPC functions: calculate_professional_repay, sync_plan_info_to_service
│
└─ 2026-06-06_fase9-11_financial_integration.sql
   ├─ Trigger: create_receivable_from_appointment
   ├─ Trigger: sync_cashflow_from_receivable
   ├─ View: vw_production_report
   ├─ View: vw_billing_report
   └─ View: vw_receivables_report
```

---

## 📊 SEQUÊNCIA DE APLICAÇÃO

### Passo 1: Preparar o Banco (Antes de aplicar qualquer migration)

**Verificar**:
```sql
-- 1. Verificar que appointment_services existe
SELECT COUNT(*) FROM appointment_services;

-- 2. Verificar que ar_receivables existe (para FASE 9-11)
SELECT COUNT(*) FROM ar_receivables;

-- 3. Verificar que ap_cashflow existe (para FASE 9-11)
SELECT COUNT(*) FROM ap_cashflow;

-- 4. Verificar que professionals existe
SELECT COUNT(*) FROM professionals;
```

**Backup**:
```bash
# Via Supabase Console:
1. Projeto → Settings → Backups
2. Criar backup manual
3. Aguardar conclusão
```

---

### Passo 2: Aplicar Migration FASE 6-8

**Local de Arquivo**: `supabase/migrations/2026-06-06_fase6-8_architectural_prep.sql`

**Via Supabase Console**:
```
1. Abrir https://app.supabase.com/
2. Projeto → SQL Editor
3. Novo Query
4. Copiar conteúdo completo de 2026-06-06_fase6-8_architectural_prep.sql
5. Executar
6. Aguardar "Query executed successfully"
```

**Verificar Aplicação**:
```sql
-- Verificar que colunas foram adicionadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'appointment_services'
ORDER BY ordinal_position;

-- Deve conter:
-- plan_id, authorization_number, authorization_verified_at, plan_name
-- professional_percentage, professional_discount, professional_repay_type
-- medical_production_id, sessions_completed, sessions_total, status

-- Verificar que funções foram criadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%professional_repay%';
```

---

### Passo 3: Aplicar Migration FASE 9-11

**Local de Arquivo**: `supabase/migrations/2026-06-06_fase9-11_financial_integration.sql`

**Via Supabase Console**:
```
1. Abrir https://app.supabase.com/
2. Projeto → SQL Editor
3. Novo Query
4. Copiar conteúdo completo de 2026-06-06_fase9-11_financial_integration.sql
5. Executar
6. Aguardar "Query executed successfully"
```

**Verificar Aplicação**:
```sql
-- Verificar que triggers foram criados
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'appointments' 
OR event_object_table = 'ar_receivables';

-- Deve conter:
-- create_receivable_on_appointment_attended
-- sync_cashflow_on_receivable_update

-- Verificar que views foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_type = 'VIEW'
AND table_name LIKE 'vw_%';

-- Deve conter:
-- vw_production_report
-- vw_billing_report
-- vw_receivables_report
```

---

### Passo 4: Validar Triggers e Views

**Testar Trigger FASE 9**:
```sql
-- 1. Criar appointment de teste
INSERT INTO appointments (
  clinic_id, patient_id, professional_id, scheduled_date, 
  scheduled_time, payer_id, status, value
) VALUES (
  '<CLINIC_ID>', '<PATIENT_ID>', '<PROF_ID>', 
  CURRENT_DATE, '14:00', '<PAYER_ID>', 'attended', 150.00
);

-- 2. Verificar que receivable foi criado automaticamente
SELECT * FROM ar_receivables 
WHERE appointment_id = '<APPOINTMENT_ID>';

-- 3. Limpar teste
DELETE FROM appointments WHERE id = '<APPOINTMENT_ID>';
```

**Testar Trigger FASE 10**:
```sql
-- 1. Marcar receivable como pago
UPDATE ar_receivables 
SET status = 'paid', payment_method = 'cash'
WHERE id = '<RECEIVABLE_ID>';

-- 2. Verificar que fluxo caixa foi sincronizado
SELECT * FROM ap_cashflow 
WHERE reference_id = '<RECEIVABLE_ID>';
```

**Testar Views FASE 11**:
```sql
-- 1. Teste production report
SELECT * FROM vw_production_report 
WHERE clinic_id = '<CLINIC_ID>' 
LIMIT 5;

-- 2. Teste billing report
SELECT * FROM vw_billing_report 
WHERE clinic_id = '<CLINIC_ID>' 
LIMIT 5;

-- 3. Teste receivables report
SELECT * FROM vw_receivables_report 
WHERE clinic_id = '<CLINIC_ID>' 
LIMIT 5;
```

---

## 🛡️ ROLLBACK PROCEDURE

Se algo der errado durante a aplicação:

### Quick Rollback (< 5 min)
```sql
-- Remover triggers (FASE 9-10)
DROP TRIGGER IF EXISTS create_receivable_on_appointment_attended ON appointments;
DROP TRIGGER IF EXISTS sync_cashflow_on_receivable_update ON ar_receivables;

-- Remover views (FASE 11)
DROP VIEW IF EXISTS vw_production_report;
DROP VIEW IF EXISTS vw_billing_report;
DROP VIEW IF EXISTS vw_receivables_report;

-- Remover functions
DROP FUNCTION IF EXISTS create_receivable_from_appointment();
DROP FUNCTION IF EXISTS sync_cashflow_from_receivable();
DROP FUNCTION IF EXISTS calculate_professional_repay(numeric, numeric, numeric, varchar);
DROP FUNCTION IF EXISTS sync_plan_info_to_service(uuid, uuid);

-- Remover colunas (FASE 6-8) - NÃO FAZER, CRIAR MIGRATION SEPARADA
-- ALTER TABLE appointment_services DROP COLUMN IF EXISTS plan_id, ...
```

### Full Rollback (Usar Backup)
```
1. Supabase Console → Projeto → Settings → Backups
2. Selecionar backup anterior
3. Clicar "Restore"
4. Aguardar restauração
```

---

## ✅ CHECKLIST DE APLICAÇÃO

### Antes de Aplicar
- [ ] Backup manual criado
- [ ] Arquivo de migration validado (sem erros de sintaxe)
- [ ] Build local passou: npm run build ✓
- [ ] Documentação atualizada
- [ ] Time notificado
- [ ] Plano de rollback pronto

### Aplicar Migration FASE 6-8
- [ ] Executar 2026-06-06_fase6-8_architectural_prep.sql
- [ ] Verificar colunas adicionadas
- [ ] Verificar funções criadas
- [ ] Testar tipos de dados corretos

### Aplicar Migration FASE 9-11
- [ ] Executar 2026-06-06_fase9-11_financial_integration.sql
- [ ] Verificar triggers criados
- [ ] Verificar views criadas
- [ ] Testar trigger appointment → receivable
- [ ] Testar trigger receivable pago → cashflow

### Validação Final
- [ ] Nenhum erro nos logs
- [ ] Todas as views retornam dados corretos
- [ ] Triggers executam automaticamente
- [ ] npm run build ainda passa ✓
- [ ] npm run dev funciona sem erros

### Deploy
- [ ] Fazer commit das migrations
- [ ] Fazer push para staging
- [ ] Validar staging = produção em dados
- [ ] Notificar time de sucesso

---

## 📈 PERFORMANCE ESPERADA

Após aplicar as migrações:

```
Operação                    Antes       Depois      Melhoria
─────────────────────────────────────────────────────────
Criar receivable (manual)   2-5 seg     ~50ms       100x (automático)
Sync cashflow (manual)      1-3 seg     ~50ms       50x (automático)
Query production report     500ms       100ms       5x (view indexada)
Query billing report        500ms       100ms       5x (view indexada)
Encontrar receivables       1s          200ms       5x (índices adicionados)
```

---

## 🚀 INFRAESTRUTURA NECESSÁRIA

### Supabase Project
- [ ] postgres_fdw disponível (para RPC)
- [ ] RLS habilitado
- [ ] Backups automáticos ativados (já deve estar)
- [ ] Connection pooling configurado

### Código
- [ ] appointmentsApi.js com novas funções ✅ (Já implementado)
- [ ] BillingTypeSelector.jsx com suporte a plan_id ✅ (Já criado)
- [ ] AppointmentItemsFooter.jsx renderizando repasse ✅ (Já criado)
- [ ] Componentes de relatório (ProductionReportCard, etc) ⏳ (FASE 11)

---

## 🎯 TIMELINE DE APLICAÇÃO

```
T-0h: Início (Desenvolvimento termina, Testes passam)
T-0h+5min: Backup manual criado
T-0h+10min: Migration FASE 6-8 aplicada ✓
T-0h+5min: Validar colunas e funções ✓
T-0h+15min: Migration FASE 9-11 aplicada ✓
T-0h+10min: Validar triggers e views ✓
T-0h+5min: Testes E2E de 8 cenários ✓
T-0h+30-45min: Deploy e notificação ✓
```

---

## 📝 COMANDOS RÁPIDOS

### Ver Status de Migrations
```sql
-- Quais migrations foram aplicadas?
SELECT * FROM schema_migrations;

-- Quando foram aplicadas?
SELECT id, name, executed_at 
FROM schema_migrations 
ORDER BY executed_at DESC;
```

### Ver Índices Criados
```sql
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE tablename = 'appointment_services'
ORDER BY indexname;
```

### Ver Triggers Ativos
```sql
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```

---

## ❓ FAQ

**P: Posso aplicar as migrations durante o horário de funcionamento?**  
R: NÃO. Aplicar fora do horário de pico para evitar locks. Recomendado: madrugada ou fim de semana.

**P: E se der erro no meio da migration?**  
R: As transactions SQL vão fazer rollback automático. Verificar o erro específico nos logs.

**P: Quanto tempo leva?**  
R: ~30-45 minutos (incluindo validação). Se só aplicar SQL: ~5 minutos.

**P: Preciso atualizar código?**  
R: Não. O código já está pronto (appointmentsApi.js + componentes). As migrations só adicionam capacidades.

**P: E se o banco ficar indisponível?**  
R: Usar backup. Recomendado criar backup antes de aplicar.

---

## 📞 SUPORTE

Se algo der errado:

1. **Erro de Sintaxe SQL**: Verificar no arquivo .sql, linha mencionada no erro
2. **Erro de Permission**: Verificar que está usando role correto (service_role)
3. **Erro de Constraint**: Verificar que dados existentes satisfazem novo constraint
4. **Trigger Não Funciona**: Verificar se trigger foi criado (SELECT * FROM triggers)

---

**Status**: 🟢 PRONTO PARA APLICAÇÃO AO FIM DAS 17 FASES  
**Próximo Passo**: Continuar desenvolvendo FASE 9-11 → FASE 12-17 → Aplicar todas as migrações
