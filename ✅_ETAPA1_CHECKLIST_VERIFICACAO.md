# ✅ CHECKLIST DE VERIFICAÇÃO - ETAPA 1

## 🗂️ VERIFICAÇÃO DE TABELAS

Execute no Supabase SQL Editor:

```sql
-- 1. Verificar tabelas criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' AND table_name IN (
  'appointment_financial_rules',
  'appointment_to_receivable_mapping',
  'appointment_financial_audit_logs'
)
ORDER BY table_name;
```

**Resultado esperado**: 3 linhas
- appointment_financial_audit_logs
- appointment_financial_rules
- appointment_to_receivable_mapping

---

## 📊 VERIFICAÇÃO DE ÍNDICES

```sql
-- 2. Verificar índices criados
SELECT indexname FROM pg_indexes 
WHERE tablename IN (
  'appointment_financial_rules',
  'appointment_to_receivable_mapping',
  'appointment_financial_audit_logs'
)
ORDER BY indexname;
```

**Resultado esperado**: 3 linhas
- idx_afal_clinic_created
- idx_afr_clinic_active
- idx_atrm_appointment

---

## 🔒 VERIFICAÇÃO DE RLS POLICIES

```sql
-- 3. Verificar políticas RLS
SELECT schemaname, tablename, policyname, qual
FROM pg_policies
WHERE tablename IN (
  'appointment_financial_rules',
  'appointment_to_receivable_mapping',
  'appointment_financial_audit_logs'
)
ORDER BY tablename, policyname;
```

**Resultado esperado**: 4 políticas
- afr_insert (appointment_financial_rules)
- afr_select (appointment_financial_rules)
- atrm_select (appointment_to_receivable_mapping)
- afal_select (appointment_financial_audit_logs)

---

## ⚙️ VERIFICAÇÃO DE FUNÇÕES

```sql
-- 4. Verificar função trigger criada
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'trigger_appointment_finalized_create_receivable'
  AND routine_schema = 'public';
```

**Resultado esperado**: 1 linha
- trigger_appointment_finalized_create_receivable | FUNCTION

---

## ⚡ VERIFICAÇÃO DE TRIGGERS

```sql
-- 5. Verificar trigger criado
SELECT trigger_name, event_object_table, action_timing, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trg_appointment_finalized_create_receivable'
  AND trigger_schema = 'public';
```

**Resultado esperado**: 1 linha
- trg_appointment_finalized_create_receivable | appointments | AFTER | ...

---

## 📦 VERIFICAÇÃO DE DADOS INICIAIS

```sql
-- 6. Verificar regras padrão inseridas
SELECT clinic_id, name, description, is_active
FROM appointment_financial_rules
WHERE name = 'Regra Padrão'
ORDER BY clinic_id;
```

**Resultado esperado**: 1+ linhas (uma por clínica)
- clinic_id | Regra Padrão | Automação de faturamento padrão | true

---

## 🔐 VERIFICAÇÃO DE ESTRUTURA DE COLUNAS

```sql
-- 7. Verificar colunas de appointment_financial_rules
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'appointment_financial_rules'
ORDER BY ordinal_position;
```

**Resultado esperado**: 13 colunas
- id | UUID | NO
- clinic_id | UUID | NO
- name | TEXT | NO
- description | TEXT | YES
- apply_discount_from_appointment | BOOLEAN | YES
- automatic_discount_percent | NUMERIC | YES
- apply_tax | BOOLEAN | YES
- tax_percent | NUMERIC | YES
- apply_doctor_commission | BOOLEAN | YES
- payment_method_default | TEXT | YES
- is_active | BOOLEAN | YES
- created_at | TIMESTAMP WITH TIME ZONE | YES
- updated_at | TIMESTAMP WITH TIME ZONE | YES

---

## 📋 VERIFICAÇÃO DE ESTRUTURA - appointment_to_receivable_mapping

```sql
-- 8. Verificar colunas de appointment_to_receivable_mapping
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'appointment_to_receivable_mapping'
ORDER BY ordinal_position;
```

**Resultado esperado**: 11 colunas
- id | UUID | NO
- clinic_id | UUID | NO
- appointment_id | UUID | NO
- receivable_id | BIGINT | NO
- rule_id | UUID | YES
- appointment_value | NUMERIC | YES
- discount_applied | NUMERIC | YES
- tax_applied | NUMERIC | YES
- status | TEXT | YES
- created_at | TIMESTAMP WITH TIME ZONE | YES
- updated_at | TIMESTAMP WITH TIME ZONE | YES

---

## 📝 VERIFICAÇÃO DE ESTRUTURA - appointment_financial_audit_logs

```sql
-- 9. Verificar colunas de appointment_financial_audit_logs
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'appointment_financial_audit_logs'
ORDER BY ordinal_position;
```

**Resultado esperado**: 7 colunas
- id | UUID | NO
- clinic_id | UUID | NO
- appointment_id | UUID | YES
- operation_type | TEXT | YES
- operation_details | JSONB | YES
- created_by | TEXT | YES
- created_at | TIMESTAMP WITH TIME ZONE | YES

---

## 🧪 VERIFICAÇÃO FUNCIONAL - RLS (Teste de Segurança)

```sql
-- 10. Testar RLS com JWT (substitua com JWT real)
SET request.jwt.claims = '{"sub":"<user-uuid>","email":"user@test.com"}';

-- Deve retornar 0 linhas se user não tem acesso a nenhuma clínica
SELECT COUNT(*) FROM appointment_financial_rules;

-- Reset JWT
RESET request.jwt.claims;
```

**Resultado esperado**:
- Com JWT de user sem clinic_id: COUNT = 0
- Sem JWT: COUNT = 0
- Com JWT de user com clinic_id: COUNT > 0

---

## 🔄 VERIFICAÇÃO FUNCIONAL - Triggers

```sql
-- 11. Testar trigger (criar appointment de teste)
-- Nota: Requer dados reais de agendamento

-- 1. Criar agendamento de teste com status != 'completed'
-- 2. Marcar como 'completed'
-- 3. Verificar se entrada foi criada em appointment_financial_audit_logs

SELECT * FROM appointment_financial_audit_logs
WHERE operation_type = 'receivable_created'
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado**:
- Entrada recente com operation_type = 'receivable_created'
- operation_details contém {"trigger": "appointment_status_change"}
- created_by = 'system'

---

## 🚀 VERIFICAÇÃO FRONTEND

```bash
# 1. Verificar se component carrega (no navegador)
# URL: http://localhost:3000/clinica/financeiro/etapa1-integracao-agenda

# Deve mostrar:
# - ✅ Dashboard com estatísticas
# - ✅ Botão "Nova Regra"
# - ✅ Lista de regras existentes (deve conter "Regra Padrão")

# 2. Testar criar nova regra
# - Clicar "Nova Regra"
# - Preencher nome e configurações
# - Clicar "Salvar Regra"
# - Verificar se nova regra aparece na lista
```

---

## 📊 MÉTRICAS

| Componente | Esperado | Verificado |
|-----------|----------|-----------|
| Tabelas | 3 | ☐ |
| Índices | 3 | ☐ |
| RLS Policies | 4 | ☐ |
| Functions | 1 | ☐ |
| Triggers | 1 | ☐ |
| Regras Padrão | 1+ | ☐ |
| Frontend Component | ✅ | ☐ |
| API TypeScript | ✅ | ☐ |
| Rota Registrada | ✅ | ☐ |

---

## ⚠️ PROBLEMAS CONHECIDOS E SOLUÇÕES

### Problema 1: `role` column not found
**Solução**: user_roles usa `role_id` (UUID), não string `role`
- ✅ Corrigido: Policies não verificam role (app-level verification)

### Problema 2: Foreign Key Type Mismatch
**Problema**: ar_invoices.id não é BIGINT
- ⚠️ Status: FK temporariamente removida em appointment_to_receivable_mapping.receivable_id
- 🔧 Ação recomendada: Investigar tipo real de ar_invoices.id

**Query para investigar**:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ar_invoices' 
  AND column_name = 'id';
```

### Problema 3: Paste de SQL no Supabase Editor
**Problema**: Linhas perdem quebras, caracteres especiais corrompem
**Solução**: Usar SQL em uma linha (sem quebras) ou arquivo SQL local

---

## ✨ PRÓXIMAS AÇÕES

- [ ] Executar todos os 11 verificações acima
- [ ] Documentar resultados
- [ ] Investigar tipo de ar_invoices.id
- [ ] Testar criação de regra via UI
- [ ] Testar automação completa (agenda → recebível)
- [ ] Validar RLS com usuários reais
- [ ] Performance test com grandes datasets

---

**Status**: Checklist pronto para validação ✅
**Data**: 20/05/2026
**Próxima etapa**: Testes integrados e ajustes conforme necessário
