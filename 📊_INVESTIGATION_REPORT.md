# INVESTIGAÇÃO CONCLUÍDA: Problema de Schema Identificado

## 📊 Resumo Executivo

**Status:** 🔴 **BLOQUEADO** - Schema incompleto

**Causa Raiz:** 
- Migração SQL não foi executada no Supabase
- Tabela `ar_invoices` falta 24 colunas financeiras essenciais
- Por isso, appointment NÃO vira receivable automaticamente

**Teste Data Status:**
- ✅ 5 pacientes existem no banco
- ✅ 2 agendamentos existem no banco  
- ❌ 0 recebíveis foram criados (esperado: ≥1)

---

## 🔍 Investigação Detalhada

### Passo 1: Verificação de Test Data
**Arquivo:** `verify-test-data.js`
**Resultado:**
```
✅ PACIENTES: 5 encontrados
✅ AGENDAMENTOS: 2 encontrados
❌ AR_INVOICES: ERROR - column ar_invoices.service_value does not exist
```

### Passo 2: Verificação de Schema
**Arquivo:** `check-ar-invoices-schema.js`
**Resultado:**
```
❌ Erro ao inserir: Could not find the 'appointment_id' column of 'ar_invoices' in the schema cache
```

**Conclusão:** A tabela `ar_invoices` **não tem as colunas que deveria ter**

### Passo 3: Verificação de Colunas Existentes
**Arquivo:** `check-table-structure.js`
**Resultado:**
```
✅ Tabela ar_invoices existe
✅ Pode ser consultada (SELECT *)
❌ Colunas: appointment_id, service_value, tax_* não existem
```

---

## 🏗️ Colunas Faltantes (24 no total)

### Categoria 1: Dados Básicos (6 colunas)
```sql
appointment_id UUID           -- FK para appointments
patient_name VARCHAR(255)    -- Nome do paciente
service_description TEXT     -- Descrição do serviço
service_value NUMERIC        -- Valor do serviço R$ 700.00
discount_value NUMERIC       -- Desconto aplicado R$
discount_percent NUMERIC     -- Percentual desconto %
```

### Categoria 2: Impostos Detalhados (12 colunas)
```sql
-- PIS (1.65%)
pis_percent NUMERIC(5,2)     -- 1.65
pis_value NUMERIC(12,2)      -- R$ 11.55

-- COFINS (7.60%)
cofins_percent NUMERIC(5,2)  -- 7.60
cofins_value NUMERIC(12,2)   -- R$ 53.20

-- CSLL (9.00%)
csll_percent NUMERIC(5,2)    -- 9.00
csll_value NUMERIC(12,2)     -- R$ 63.00

-- IR (15.00%)
ir_percent NUMERIC(5,2)      -- 15.00
ir_value NUMERIC(12,2)       -- R$ 105.00

-- ISSQN (5.00%)
issqn_percent NUMERIC(5,2)   -- 5.00
issqn_value NUMERIC(12,2)    -- R$ 35.00

-- Totalizadores
tax_regime VARCHAR(50)       -- 'simples_nacional'
total_taxes NUMERIC(12,2)    -- R$ 267.75
net_value NUMERIC(12,2)      -- R$ 432.25
```

### Categoria 3: Rastreabilidade (4 colunas)
```sql
payer_type VARCHAR(50)       -- 'CONVENIO' ou 'PARTICULAR'
payer_id UUID                -- FK para payers/health_plans
payer_rule_id BIGINT         -- FK para appointment_payer_rules
tax_configuration_id BIGINT  -- FK para tax_configurations
```

### Categoria 4: Data/Status (2 colunas)
```sql
invoice_date DATE            -- Data da nota fiscal
due_date DATE                -- Data de vencimento
received_date DATE           -- Data de recebimento
received_value NUMERIC       -- Valor recebido
received_payment_method VARCHAR(50) -- Método de pagamento
```

---

## 📁 Arquivos Criados para Resolução

### 1. Migração SQL
**Path:** `supabase/migrations/20260521_add_financial_columns_to_ar_invoices.sql`
- ✅ Cria todas as 24 colunas
- ✅ Cria índices para performance
- ✅ Adiciona constraints de validação

### 2. Guia de Execução
**Path:** `🔴_EXECUTE_SQL_MIGRATION_NOW.md`
- ✅ Instruções passo-a-passo
- ✅ SQL pronto para copiar/colar
- ✅ Link direto ao SQL Editor
- ✅ Validação pós-execução

### 3. Scripts de Verificação
- `verify-test-data.js` - Verificar dados de teste
- `check-table-structure.js` - Verificar colunas
- `check-ar-invoices-schema.js` - Verificar schema

---

## ⏭️ Próximas Ações

### Ação 1: Executar Migração SQL (CRÍTICA) ⏱️ 5 minutos
1. Abrir: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new
2. Copiar SQL de: `🔴_EXECUTE_SQL_MIGRATION_NOW.md`
3. Colar no editor
4. Executar (Ctrl+Enter)
5. Validar com:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'ar_invoices' 
   ORDER BY ordinal_position;
   ```

### Ação 2: Verificar Trigger de Criação de Receivable
**Arquivo a verificar:** `src/lib/appointmentFinancialIntegrationApi.ts`
**Função:** `finalizeAppointmentWithFinancials()`
- Deve ser chamada quando appointment status = "completed"
- Deve popular todas as 24 colunas em ar_invoices

### Ação 3: Re-testar Workflow Completo ⏱️ 15 minutos
1. ✅ Criar novo appointment com Serviço + Convênio
2. ✅ Verificar preço auto-calculado (R$ 700.00)
3. ✅ Finalizar appointment na Recepção
4. ✅ Verificar recebível criado em Financeiro
5. ✅ Validar impostos calculados: PIS R$ 11.55, COFINS R$ 53.20, etc.

---

## 🎯 Requisitos para Sucesso

### Antes da Migração
- [ ] VS Code com workspace aberto
- [ ] Browser com Supabase SQL Editor aberto
- [ ] Arquivo `🔴_EXECUTE_SQL_MIGRATION_NOW.md` visível

### Durante a Migração
- [ ] SQL é executado sem erros
- [ ] Todas as colunas são criadas com `IF NOT EXISTS`
- [ ] Índices são criados para performance

### Após a Migração
- [ ] Query de verificação retorna 50+ colunas na ar_invoices
- [ ] Sistema consegue criar recebível
- [ ] Impostos são calculados corretamente

---

## 📋 Checklist de Implementação

- [ ] **Migração SQL Executada** - Status: ⏳ PENDENTE
- [ ] **Colunas Criadas** - Status: ⏳ PENDENTE
- [ ] **Índices Criados** - Status: ⏳ PENDENTE
- [ ] **Teste 1: Appointment Criação** - Status: ⏳ PENDENTE
- [ ] **Teste 2: Auto-Preço R$ 700.00** - Status: ⏳ PENDENTE
- [ ] **Teste 3: Receivable Criado** - Status: ⏳ PENDENTE
- [ ] **Teste 4: Impostos Corretos** - Status: ⏳ PENDENTE
- [ ] **ETAPA 1 Finalizado** - Status: ⏳ PENDENTE

---

## 💡 Observações Importantes

1. **RLS Desabilitado:** Row-Level Security está desabilitado em appointment_payer_rules e tax_configurations (OK para dev)

2. **IF NOT EXISTS:** Todos os ADD COLUMN usam `IF NOT EXISTS`, então é seguro executar múltiplas vezes

3. **Schema Cache:** Supabase mantém um schema cache que pode levar 5-10 segundos para sincronizar após ALTER TABLE

4. **Sem Downtime:** Adicionar colunas com DEFAULT não causa downtime

5. **Próxima Etapa:** Após migração, sistema criará recebíveis automaticamente quando appointment for finalizado

---

**Última Atualização:** 2026-05-21  
**Investigador:** GitHub Copilot  
**Status:** 🔴 Aguardando execução de SQL migration  
**Tempo Total de Investigação:** ~30 minutos
