# GUIA DE INSTALAÇÃO - GESCLINIC DATABASE

**Data:** 12 de Janeiro de 2026  
**Versão:** 1.0

---

## 📋 PASSO-A-PASSO

### 1. PREPARAÇÃO

Antes de começar, você precisa de:
- ✅ Acesso ao Supabase Dashboard (https://supabase.com)
- ✅ Arquivo SQL de inicialização: `20260113_COMPREHENSIVE_INIT.sql`
- ✅ Arquivos de migração existentes na pasta `supabase/migrations/`

---

### 2. EXECUTAR O SCRIPT PRINCIPAL

1. Abra seu projeto no **Supabase Dashboard**
2. Navegue até **SQL Editor**
3. Clique em **+ New query**
4. Cole o conteúdo de `20260113_COMPREHENSIVE_INIT.sql`
5. Clique em **▶ Execute** (canto superior direito)
6. Aguarde a conclusão (pode levar 30-60 segundos)

**Resultado esperado:** 73 tabelas criadas com sucesso ✅

---

### 3. APLICAR MIGRAÇÕES ESPECÍFICAS

As seguintes migrações já existem e devem ser aplicadas em ordem:

#### **Financeiro**
```bash
cd supabase/migrations
# Windows PowerShell
.\apply_finance_migrations.ps1
```

Esta migração cria:
- Views de AP Bills com categoria
- Funções de DRE e Fluxo de Caixa
- RPCs de pagamento em lote

#### **Estoque**
```bash
.\apply_stock_balance_migration.ps1
```

Esta migração cria:
- Função de saldo de estoque
- Triggers de atualização automática

#### **Conciliação Bancária**
Já incluída no script principal. Caso precise executar separadamente:
```sql
-- Execute em SQL Editor do Supabase
SELECT * FROM conciliation_bank_statements LIMIT 1;
-- Se retornar erro 'table does not exist', execute:
-- 20260113_create_conciliation_tables.sql
```

---

### 4. VERIFICAR A INSTALAÇÃO

Execute as seguintes consultas no SQL Editor para validar:

#### ✅ Verificar todas as tabelas foram criadas:
```sql
SELECT COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';
-- Esperado: 73 linhas
```

#### ✅ Verificar tabelas principais:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

#### ✅ Verificar índices foram criados:
```sql
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY indexname;
-- Esperado: ~150+ índices
```

#### ✅ Verificar triggers foram criados:
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
-- Esperado: ~12 triggers de update_timestamp
```

---

## 🔐 CONFIGURAR ROW LEVEL SECURITY (RLS)

Para cada tabela, você deve configurar políticas de RLS. Exemplo para a tabela `patients`:

```sql
-- Habilitar RLS na tabela
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Política de leitura: usuário vê apenas pacientes de sua clínica
CREATE POLICY patients_select_policy
ON patients FOR SELECT
USING (
  clinic_id = (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  )
);

-- Política de inserção
CREATE POLICY patients_insert_policy
ON patients FOR INSERT
WITH CHECK (
  clinic_id = (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  )
);

-- Política de atualização
CREATE POLICY patients_update_policy
ON patients FOR UPDATE
USING (
  clinic_id = (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  )
);

-- Política de deleção
CREATE POLICY patients_delete_policy
ON patients FOR DELETE
USING (
  clinic_id = (
    SELECT clinic_id FROM users WHERE id = auth.uid()
  )
);
```

**Repita para todas as tabelas que possuem `clinic_id`.**

---

## 🌱 POPULAR DADOS DE TESTE (OPCIONAL)

Execute o script de demo:

```bash
node scripts/popularDemoClinic.js
```

Este script cria:
- 1 clínica de teste
- 10 pacientes
- 5 profissionais
- 20 agendamentos
- Dados de exemplo em outras tabelas

---

## 🔍 TROUBLESHOOTING

### Erro: "Table already exists"
**Solução:** Execute `20260113_COMPREHENSIVE_INIT.sql` que inclui `IF NOT EXISTS`

### Erro: "Foreign key constraint violation"
**Solução:** Certifique-se de executar a criação de tabelas na ordem correta (o script cuida disso)

### Performance lenta
**Solução:** Se muitas tabelas foram criadas, o Supabase está sincronizando:
- Aguarde 2-3 minutos
- Verifique o status em **Database** → **Schemas** → **public**

### Triggers não disparam
**Solução:** Triggers automáticas de `updated_at` dependem de:
```sql
-- Verificar se a função existe
SELECT * FROM pg_proc WHERE proname = 'update_timestamp';

-- Se não existir, criar manualmente:
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 ESTRUTURA DE PASTAS (MIGRATIONS)

```
supabase/migrations/
├── 00_COMPLETE_INIT.sql              (Schema completo - LEGADO)
├── 00_SAFE_INIT.sql                  (Safe version - LEGADO)
├── 20260113_COMPREHENSIVE_INIT.sql   (✅ NOVO - USE ESTE)
├── 20260110_create_dre_cash_flow.sql
├── 20260110_create_pay_accounts_payable_batch.sql
├── 20260110_create_view_ap_bills_with_category.sql
├── 20260111_ap_items_and_taxes.sql
├── 20260111_create_recurring_accounts_payable.sql
├── 20260112_add_repasse_linking.sql
├── 20260112_conciliation_audit.sql
├── 20260112_create_ar_receivables.sql
├── 20260112_create_cash_flow.sql
├── 20260112_create_conciliation_bank_statements.sql
├── 20260112_create_repasse_medico.sql
├── 20260112_repasse_medico_dashboard_function.sql
├── 20260112_repasse_medico_functions.sql
├── 20260112_repasse_medico_functions_detalhe.sql
├── 20260112_repasse_medico_triggers.sql
├── 20260112_update_cashflow_summary_for_ar.sql
├── 20260113_create_conciliation_tables.sql
├── 2026-01-06_add_stock_suppliers_address_and_documents.sql
├── 2026-01-07_add_payment_fields_to_ap_bills.sql
├── 2026-01-07_alter_stock_requests_add_purpose_and_approval.sql
├── 2026-01-07_create_stock_balance_function.sql
├── 2026-01-07_create_stock_requests.sql
├── 2026-01-07_rls_policies_stock_requests.sql
└── scripts/
    ├── apply_finance_migrations.ps1
    ├── apply_stock_balance_migration.ps1
    └── apply_conciliation_migration.ps1
```

---

## 🎯 ORDEM DE EXECUÇÃO RECOMENDADA

### **Opção 1: Instalação Rápida (Recomendado)**
1. Execute: `20260113_COMPREHENSIVE_INIT.sql` (73 tabelas)
2. Execute: Scripts de migração financeira e estoque (se necessário)

### **Opção 2: Instalação Manual (Para debug)**
1. Execute cada migração em ordem numérica
2. Verifique com as consultas SQL do step 4

### **Opção 3: Sem Dados (Produção)**
1. Execute: `20260113_COMPREHENSIVE_INIT.sql`
2. Não execute scripts de população de dados
3. Configure RLS manualmente

---

## 📝 CHECKLIST DE INSTALAÇÃO

- [ ] ✅ Arquivo `20260113_COMPREHENSIVE_INIT.sql` criado
- [ ] ✅ Documento de referência `DATABASE_SCHEMA_REFERENCE.md` criado
- [ ] ✅ Script ejecutado no Supabase SQL Editor
- [ ] ✅ 73 tabelas criadas com sucesso
- [ ] ✅ Índices criados (150+)
- [ ] ✅ Triggers de `updated_at` funcionando
- [ ] ✅ Views criadas (se aplicável)
- [ ] ✅ RLS policies configuradas (opcional, recomendado)
- [ ] ✅ Dados de teste populados (opcional)
- [ ] ✅ Conexão da API JS testada

---

## 🔗 REFERÊNCIAS

- **Database Reference:** `DATABASE_SCHEMA_REFERENCE.md`
- **SQL Script:** `supabase/migrations/20260113_COMPREHENSIVE_INIT.sql`
- **Docs Supabase:** https://supabase.com/docs/guides/database
- **Supabase Auth:** https://supabase.com/docs/guides/auth

---

## 💬 SUPORTE

Se encontrar problemas:

1. Verifique os **Logs do Supabase** em **Database** → **Logs**
2. Consulte `DATABASE_SCHEMA_REFERENCE.md` para entender a estrutura
3. Use as **Consultas SQL de Validação** (step 4) para diagnosticar

---

**Status:** ✅ Instalação pronta para começar!
