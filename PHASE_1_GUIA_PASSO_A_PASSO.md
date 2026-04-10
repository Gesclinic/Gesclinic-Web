# 🚀 PHASE 1 — GUIA DE IMPLEMENTAÇÃO PASSO-A-PASSO

**Objetivo:** Aplicar SQL triggers + RPCs para auto-criar AR, guias TISS, e calcular repasse  
**Arquivo:** `supabase/migrations/2026-04-11_phase1_appointment_financial_integration.sql`  
**Tempo:** 30 minutos (executar + validar)  
**Posição:** Este é o primeiro passo da implementação

---

## 📋 PRÉ-REQUISITOS

Antes de começar, verifique:

- [ ] Acesso ao Supabase dashboard (https://app.supabase.com)
- [ ] Backups do banco de dados feitos (sempre antes de ALTER)
- [ ] Staging database disponível para teste (RECOMENDADO)
- [ ] Arquivo migration criado: `supabase/migrations/2026-04-11_phase1_appointment_financial_integration.sql`

---

## 🔧 PASSO 1: REVISAR O SQL (2 minutos)

**O arquivo migration contém:**

| Item | Tipo | Função |
|------|------|--------|
| `create_ar_receivable_from_appointment()` | Function | Insere AR quando atendimento completo |
| `create_tiss_guide_from_appointment()` | Function | Insere guia TISS quando atendimento completo (convênio) |
| `cancel_ar_receivable_from_appointment()` | Function | Cancela AR quando agendamento cancelado |
| `calculate_repasse_per_appointment()` | RPC | Calcula repasse em tempo real (precedência) |
| `trg_create_ar_on_appointment_attended` | Trigger | Dispara função 1 |
| `trg_create_tiss_guide_on_appointment_attended` | Trigger | Dispara função 2 |
| `trg_cancel_ar_on_appointment_canceled` | Trigger | Dispara função 3 |
| 6 indexes | Performance | Otimiza queries dos triggers |

**✅ Revisar:** Abra o arquivo em editor de texto ou VS Code. Certifique-se que não há syntaxes erros (deve ser idempotente).

---

## 🌐 PASSO 2: ACESSAR SUPABASE SQL EDITOR

### Opção A: Via Dashboard (Recomendado)
1. Acesse https://app.supabase.com
2. Selecione seu projeto **Gesclinic**
3. Clique em **SQL Editor** (esquerda)
4. Clique em **+ New Query**

### Opção B: Via CLI (Se preferir terminal)
```powershell
# Navegar para o projeto
cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"

# Conectar ao Supabase via CLI (se tiver instalado)
supabase db push
```

---

## 📝 PASSO 3: COLAR & EXECUTAR SQL

### Se escolheu Opção A (Dashboard):

1. **Abra o arquivo SQL:**
   ```
   supabase/migrations/2026-04-11_phase1_appointment_financial_integration.sql
   ```

2. **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)

3. **Cole no SQL Editor do Supabase** (Ctrl+V)

4. **Clique em "RUN"** (botão azul, canto inferior direito)

### Se escolheu Opção B (CLI):
```powershell
# Mover arquivo migration para o diretório correto se não estiver
# Depois rodar:
supabase db push
```

---

## ⏳ PASSO 4: AGUARDAR EXECUÇÃO

**Tempo esperado:** 5-10 segundos para execução completa

**Você deve ver:**
```
✓ All functions created successfully
✓ All triggers registered
✓ All indexes created
```

**Se houver ERRO:**

| Erro | Causa | Solução |
|------|-------|--------|
| `"relation ar_receivables does not exist"` | Tabela não existe no DB | Rodar migrations anteriores primeiro |
| `"function already exists"` | Função já criada | Normal (SQL usa CREATE OR REPLACE) |
| `"permission denied"` | Sem permissão | Usar role com permissão SUPERUSER |

---

## ✅ PASSO 5: VALIDAÇÃO — VERIFICAR FUNÇÕES

Após execução, rodar **3 queries de validação** (no SQL Editor):

### Validação 1: Verificar Functions Existem
```sql
SELECT proname, nargs, prosecdef
FROM pg_proc 
WHERE proname IN (
  'create_ar_receivable_from_appointment',
  'create_tiss_guide_from_appointment',
  'cancel_ar_receivable_from_appointment',
  'calculate_repasse_per_appointment'
)
ORDER BY proname;
```

**Resultado esperado:** 4 linhas (uma para cada function)

```
proname | nargs | prosecdef
──────────────────────────
create_ar_receivable_from_appointment | 0 | true
create_tiss_guide_from_appointment | 0 | true
cancel_ar_receivable_from_appointment | 0 | true
calculate_repasse_per_appointment | 3 | false
```

✅ Se vir 4 linhas: **Functions OK**

---

### Validação 2: Verificar Triggers Existem
```sql
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers 
WHERE trigger_name IN (
  'trg_create_ar_on_appointment_attended',
  'trg_create_tiss_guide_on_appointment_attended',
  'trg_cancel_ar_on_appointment_canceled'
)
ORDER BY trigger_name;
```

**Resultado esperado:** 3 linhas (uma para cada trigger)

```
trigger_name | event_object_table | event_manipulation
───────────────────────────────────────────────────
trg_cancel_ar_on_appointment_canceled | appointments | UPDATE
trg_create_ar_on_appointment_attended | appointments | UPDATE
trg_create_tiss_guide_on_appointment_attended | appointments | UPDATE
```

✅ Se vir 3 linhas: **Triggers OK**

---

### Validação 3: Verificar Indexes Foram Criados
```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE indexname LIKE 'idx%appointment%'
   OR indexname LIKE 'idx%repasse%'
   OR indexname LIKE 'idx%billing%'
   OR indexname LIKE 'idx%ar_receivables%'
ORDER BY indexname;
```

**Resultado esperado:** ≥ 6 indexes

```
indexname | tablename
──────────────────────
idx_appointments_status_clinic | appointments
idx_ar_receivables_appointment_clinic | ar_receivables
idx_billing_guides_appointment_clinic | billing_guides
idx_repasse_config_grupo_active | repasse_config_grupo
idx_repasse_config_profissional_active | repasse_config_profissional
idx_repasse_config_servico_active | repasse_config_servico
```

✅ Se vir ≥ 6 linhas: **Indexes OK**

---

## 🧪 PASSO 6: TESTE FUNCIONAL (OPCIONAL mas RECOMENDADO)

Se tudo passou em validação, faça um teste funcional:

### 6a. Criar Agendamento de Teste
```sql
-- Substitua os UUIDs com IDs reais do seu banco
-- Para listar IDs: SELECT id, name FROM clinics LIMIT 1;

INSERT INTO appointments (
  id,
  clinic_id,
  patient_id,
  professional_id,
  service_id,
  payer_id,
  scheduled_datetime,
  status,
  total_value,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'SEU_CLINIC_ID_AQUI',
  'SEU_PATIENT_ID_AQUI',
  'SEU_PROFESSIONAL_ID_AQUI',
  'SEU_SERVICE_ID_AQUI',
  'SEU_PAYER_ID_AQUI',
  NOW() + INTERVAL '1 day',
  'scheduled',
  150.00,
  NOW(),
  NOW()
)
RETURNING id AS appointment_id;
```

**Copie o appointment_id retornado.** Você vai precisar dele nos próximos passos.

### 6b. Marcar como "Attended"
```sql
-- Substitua o UUID com o appointment_id do passo anterior
UPDATE appointments
SET status = 'attended', updated_at = NOW()
WHERE id = 'SEU_APPOINTMENT_ID_AQUI'
RETURNING id;
```

### 6c. Verificar AR Foi Criado Automaticamente
```sql
-- Se aparecer 1 linha: ✅ Trigger disparou corretamente!
SELECT id, appointment_id, payer_name, valor, status, origem
FROM ar_receivables
WHERE appointment_id = 'SEU_APPOINTMENT_ID_AQUI';
```

**Resultado esperado:** 1 linha com status='open', origem='agenda', valor=150.00

### 6d. Verificar Guia TISS Foi Criada (se convênio)
```sql
-- Se payer_id foi definido, guia deve existir
SELECT id, appointment_id, guide_number, status
FROM billing_guides
WHERE appointment_id = 'SEU_APPOINTMENT_ID_AQUI';
```

**Resultado esperado (se convênio):** 1 linha com status='draft'

### 6e. Testar Cancelamento
```sql
-- Marcar agendamento como cancelado
UPDATE appointments
SET status = 'canceled', updated_at = NOW()
WHERE id = 'SEU_APPOINTMENT_ID_AQUI'
RETURNING id;

-- Verificar AR foi cancelado (soft-delete)
SELECT id, status FROM ar_receivables
WHERE appointment_id = 'SEU_APPOINTMENT_ID_AQUI';
```

**Resultado esperado:** AR com status='canceled'

---

## 📊 PASSO 7: VALIDAÇÃO PRÉ-PRODUÇÃO

Checklist antes de usar em produção:

- [ ] Todas 3 validações SQL passaram (functions, triggers, indexes)
- [ ] Teste funcional funcionou (AR criado, guia criado, cancelamento revertido)
- [ ] Nenhum erro nos logs do Supabase (verificar em Logs → Realtime)
- [ ] Backup do banco feito (recomendado antes de cada de push)
- [ ] Testes passaram em cenários:
  - [ ] Appointment particular (sem payer_id) → cria AR, NÃO cria guia
  - [ ] Appointment convênio (com payer_id) → cria AR E guia
  - [ ] Cancelamento → AR soft-deleted

---

## 🚨 ROLLBACK (Se algo der errado)

Se precisar desfazer tudo:

```sql
-- Dropar triggers
DROP TRIGGER IF EXISTS trg_create_ar_on_appointment_attended ON appointments;
DROP TRIGGER IF EXISTS trg_create_tiss_guide_on_appointment_attended ON appointments;
DROP TRIGGER IF EXISTS trg_cancel_ar_on_appointment_canceled ON appointments;

-- Dropar functions
DROP FUNCTION IF EXISTS create_ar_receivable_from_appointment();
DROP FUNCTION IF EXISTS create_tiss_guide_from_appointment();
DROP FUNCTION IF EXISTS cancel_ar_receivable_from_appointment();
DROP FUNCTION IF EXISTS calculate_repasse_per_appointment(UUID, UUID, UUID);

-- Dropar indexes
DROP INDEX IF EXISTS idx_ar_receivables_appointment_clinic;
DROP INDEX IF EXISTS idx_billing_guides_appointment_clinic;
DROP INDEX IF EXISTS idx_appointments_status_clinic;
DROP INDEX IF EXISTS idx_repasse_config_servico_active;
DROP INDEX IF EXISTS idx_repasse_config_grupo_active;
DROP INDEX IF EXISTS idx_repasse_config_profissional_active;
```

---

## ✨ PRÓXIMA ETAPA

Após validação com **100% sucesso**:

1. ✅ **PHASE 1 (SQL)** concluída
2. 📝 Marque este passo como DONE
3. 🎯 Próximo: **PHASE 2 — API Functions** (2-3h)
   - Arquivo: `src/lib/appointmentFinancialIntegrationApi.js`
   - Tarefas: Implements 5 API functions que chamam os RPCs

---

## 📞 TROUBLESHOOTING

| Problema | Diagnóstico | Solução |
|----------|-------------|--------|
| "Permission denied" | Conta sem permissão | Usar role SUPERUSER ou admin |
| Trigger não dispara | RLS policy bloqueando | Verificar RLS policies em `ar_receivables` |
| AR não criada | Tabela vazia/referência errada | Testar com IDs válidos, verificar FK constraints |
| Query timeout | Muitos dados/index faltando | Esperar mais ou adicionar index manually |

---

**🎯 Tempo total para PHASE 1:** ~30 minutos  
**Status:** Aguardando execução do SQL  

**Próximo comando:** Executar o arquivo migration no Supabase e reportar resultados!
