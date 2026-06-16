# 🔴 CRÍTICO: SQL Migration Necessária

## Problema Encontrado
A tabela `ar_invoices` está **faltando as colunas financeiras** necessárias para o sistema criar recebíveis automaticamente.

**Erro:**
```
column ar_invoices.service_value does not exist
```

**Impacto:**
- ❌ Appointment criado mas NÃO vira Receivable
- ❌ Teste data (2 agendamentos) não aparece em Contas a Receber
- ❌ ETAPA 1 não pode funcionar sem isso

---

## Solução: Execute SQL no Supabase Editor

### 📋 Passo 1: Copie o SQL

Arquivo com todo SQL pronto: **`supabase/migrations/20260521_add_financial_columns_to_ar_invoices.sql`**

OU copie daqui:

```sql
-- ============================================================================
-- MIGRATION: Adicionar colunas financeiras a ar_invoices
-- ============================================================================

-- Colunas básicas
ALTER TABLE ar_invoices
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS service_description TEXT,
ADD COLUMN IF NOT EXISTS service_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) DEFAULT 0.00;

-- Colunas de impostos
ALTER TABLE ar_invoices
ADD COLUMN IF NOT EXISTS tax_regime VARCHAR(50) DEFAULT 'simples_nacional',
ADD COLUMN IF NOT EXISTS pis_percent NUMERIC(5, 2) DEFAULT 1.65,
ADD COLUMN IF NOT EXISTS pis_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS cofins_percent NUMERIC(5, 2) DEFAULT 7.60,
ADD COLUMN IF NOT EXISTS cofins_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS csll_percent NUMERIC(5, 2) DEFAULT 9.00,
ADD COLUMN IF NOT EXISTS csll_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS ir_percent NUMERIC(5, 2) DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS ir_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS issqn_percent NUMERIC(5, 2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS issqn_value NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_taxes NUMERIC(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS net_value NUMERIC(12, 2) DEFAULT 0.00;

-- Rastreabilidade
ALTER TABLE ar_invoices
ADD COLUMN IF NOT EXISTS payer_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS payer_id UUID,
ADD COLUMN IF NOT EXISTS payer_rule_id BIGINT,
ADD COLUMN IF NOT EXISTS tax_configuration_id BIGINT;

-- Data/status
ALTER TABLE ar_invoices
ADD COLUMN IF NOT EXISTS invoice_date DATE,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS received_date DATE,
ADD COLUMN IF NOT EXISTS received_value NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS received_payment_method VARCHAR(50);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ar_invoices_appointment_id ON ar_invoices(appointment_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_patient_name ON ar_invoices(patient_name);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_clinic_appointment ON ar_invoices(clinic_id, appointment_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_status_clinic ON ar_invoices(status, clinic_id);
```

### 🔗 Passo 2: Abra SQL Editor

Clique aqui: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new

### ✍️ Passo 3: Cole e Execute

1. Cola o SQL no editor (Ctrl+V)
2. Clique **Run** ou pressione **Ctrl+Enter** (Windows/Linux) ou **⌘+Enter** (Mac)

### ✅ Passo 4: Confirme Sucesso

Execute este comando para verificar:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'ar_invoices' 
ORDER BY ordinal_position;
```

Você deve ver todas as colunas listadas, incluindo:
- ✓ appointment_id
- ✓ service_value
- ✓ pis_value, cofins_value, csll_value, ir_value, issqn_value
- ✓ total_taxes, net_value

---

## ⏱️ Tempo Estimado
- ⏱️ 3 minutos: Navegar até SQL Editor
- ⏱️ 1 minuto: Colar SQL
- ⏱️ 1 minuto: Executar
- ⏱️ 1 minuto: Verificar resultado
- **Total: ~5 minutos** ✨

---

## O Que Acontece Após Executar

✅ Sistema conseguirá:
1. Criar recebível quando appointment é finalizado
2. Calcular impostos PIS/COFINS/CSLL/IR/ISSQN automaticamente
3. Mostrar dados em "Contas a Receber"
4. Completar testes de ETAPA 1

---

## Próximas Etapas

Após executar o SQL:

1. ✅ Migração concluída
2. ▶️ Criar novo teste de appointment
3. ▶️ Finalizar no módulo Recepção
4. ▶️ Verificar recebível em Financeiro → ETAPA 1 Integração Agenda
5. ▶️ Confirmar impostos calculados corretamente

---

## 🆘 Se Tiver Erro

Se receber erro como `"permission denied"`:

1. Verifique se está logado no Supabase como admin
2. Tente uma coluna por vez
3. Se continuar, contate o suporte

---

**Status:** 🔴 Bloqueado até SQL ser executado

**Arquivo SQL:** `supabase/migrations/20260521_add_financial_columns_to_ar_invoices.sql`

**URL SQL Editor:** https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new
