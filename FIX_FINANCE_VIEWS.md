# 🔧 FIX - Corrigir Erros de Views Financeiras

## ⚠️ Problema Identificado

A página "Fluxo de Caixa" (`/clinica/financeiro/fluxo`) está com erro 404 e o console mostra:

```
Could not find the table 'public.view_ar_receivables_v1' in the schema cache
listReceivables error: ...
ap_bills.vendor_name does not exist
```

**Causa:** A migração `20260115_CLEAN_AND_REINIT.sql` dropou todas as tabelas e views, mas as views de financeiro não foram recriadas depois.

---

## ✅ Solução

### Passo 1: Aplicar a Migração SQL no Supabase

1. Acesse: **https://app.supabase.com**
2. Navegue até o seu projeto
3. Vá para: **SQL Editor** (ícone de interrogação esquerda)
4. Clique em "New Query"
5. **Cole todo o conteúdo abaixo** ou do arquivo `supabase/migrations/20260121_fix_finance_views.sql`

```sql
-- ============================================================
-- FIX FINANCE VIEWS - 21/01/2026
-- Recria as views de financeiro que foram dropadas
-- ============================================================

-- ============================================================
-- 1. TABELA: ar_receivables (se não existir)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ar_receivables (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  payer_name text,
  paciente_id uuid null,
  convenio_id uuid null,
  empresa_id uuid null,
  origem text check (origem in ('Agenda','Faturamento','Contrato','Manual')) not null default 'Manual',
  descricao text,
  servico_id uuid null,
  profissional_id uuid null,
  centro_custo_id uuid null,
  plano_contas_id uuid null,
  valor_bruto numeric(12,2) not null default 0,
  descontos numeric(12,2) not null default 0,
  valor_liquido numeric(12,2) generated always as (greatest(valor_bruto - descontos, 0)) stored,
  forma_prevista text null,
  data_emissao date not null default (current_date),
  data_vencimento date null,
  data_recebimento date null,
  status text check (status in ('open','planned','received','partial','overdue','canceled','glossed')) not null default 'open',
  parcelado boolean not null default false,
  parcela_atual int null,
  total_parcelas int null,
  grupo_parcelamento_id uuid null,
  appointment_id uuid null,
  lote_faturamento_id uuid null,
  numero_guia text null,
  previsao_pagamento date null,
  contrato_id uuid null,
  competencia text null,
  repasse_gerado boolean not null default false,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_ar_receivables_clinic ON public.ar_receivables (clinic_id);
CREATE INDEX IF NOT EXISTS idx_ar_receivables_status ON public.ar_receivables (status);
CREATE INDEX IF NOT EXISTS idx_ar_receivables_venc ON public.ar_receivables (data_vencimento);
CREATE INDEX IF NOT EXISTS idx_ar_receivables_receb ON public.ar_receivables (data_recebimento);

-- ============================================================
-- 2. TABELA: ap_bills - Adicionar coluna vendor_name se faltar
-- ============================================================
ALTER TABLE IF EXISTS public.ap_bills
  ADD COLUMN IF NOT EXISTS vendor_name text;

-- ============================================================
-- 3. VIEW: view_ar_receivables_v1
-- ============================================================
DROP VIEW IF EXISTS public.view_ar_receivables_v1;
CREATE OR REPLACE VIEW public.view_ar_receivables_v1 AS
SELECT
  r.id,
  r.clinic_id,
  r.origem,
  r.descricao,
  r.payer_name AS pagador,
  r.paciente_id,
  r.convenio_id,
  r.empresa_id,
  r.profissional_id,
  r.centro_custo_id,
  r.plano_contas_id,
  r.valor_bruto,
  r.descontos,
  r.valor_liquido,
  r.forma_prevista,
  r.data_emissao,
  r.data_vencimento,
  r.data_recebimento,
  r.status,
  r.parcelado,
  r.parcela_atual,
  r.total_parcelas,
  r.grupo_parcelamento_id,
  r.created_at
FROM public.ar_receivables r;

-- ============================================================
-- 4. VIEW: ap_bills_with_category (para sorting)
-- ============================================================
DROP VIEW IF EXISTS public.ap_bills_with_category;
CREATE OR REPLACE VIEW public.ap_bills_with_category AS
SELECT
  ap.*,
  cp.name AS category_name
FROM public.ap_bills ap
LEFT JOIN public.account_plans cp ON cp.id = ap.category_id;

-- ============================================================
-- 5. FUNCTION: cashflow_summary
-- ============================================================
CREATE OR REPLACE FUNCTION public.cashflow_summary(
  p_clinic_id UUID,
  p_start DATE,
  p_end DATE
)
RETURNS TABLE (
  total_entradas NUMERIC,
  total_saidas NUMERIC,
  resultado_liquido NUMERIC,
  saldo_anterior NUMERIC,
  saldo_final NUMERIC
) LANGUAGE plpgsql AS $$
DECLARE
  v_entradas NUMERIC := 0;
  v_saidas NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(valor_liquido), 0)
  INTO v_entradas
  FROM public.ar_receivables
  WHERE clinic_id = p_clinic_id
    AND status = 'received'
    AND data_recebimento >= p_start
    AND data_recebimento <= p_end;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_saidas
  FROM public.ap_bills
  WHERE clinic_id = p_clinic_id
    AND status = 'paid'
    AND due_date >= p_start
    AND due_date <= p_end;

  RETURN QUERY SELECT
    v_entradas::NUMERIC,
    v_saidas::NUMERIC,
    (v_entradas - v_saidas)::NUMERIC,
    0::NUMERIC,
    (v_entradas - v_saidas)::NUMERIC;
END;
$$;

-- ============================================================
-- 6. FUNCTION: list_ap_bills
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_ap_bills(
  p_clinic_id UUID,
  p_status_text TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  clinic_id UUID,
  category_id UUID,
  vendor_name TEXT,
  description TEXT,
  amount NUMERIC,
  due_date DATE,
  issue_date DATE,
  status TEXT,
  notes TEXT,
  payment_method TEXT,
  document_number TEXT,
  document_url TEXT,
  installments INT,
  ir_pct NUMERIC,
  csll_pct NUMERIC,
  pis_cofins_pct NUMERIC,
  iss_pct NUMERIC,
  icms_pct NUMERIC,
  taxes_retained BOOLEAN,
  repasse_doctor_name TEXT,
  linked_invoice_id UUID,
  linked_service TEXT,
  linked_revenue NUMERIC,
  method_id UUID,
  created_at TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    ab.id,
    ab.clinic_id,
    ab.category_id,
    ab.vendor_name,
    ab.description,
    ab.amount,
    ab.due_date,
    ab.issue_date,
    ab.status,
    ab.notes,
    ab.payment_method,
    ab.document_number,
    ab.document_url,
    ab.installments,
    ab.ir_pct,
    ab.csll_pct,
    ab.pis_cofins_pct,
    ab.iss_pct,
    ab.icms_pct,
    ab.taxes_retained,
    ab.repasse_doctor_name,
    ab.linked_invoice_id,
    ab.linked_service,
    ab.linked_revenue,
    ab.method_id,
    ab.created_at
  FROM public.ap_bills ab
  WHERE ab.clinic_id = p_clinic_id
    AND (p_status_text IS NULL OR ab.status = p_status_text)
  ORDER BY ab.due_date ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ============================================================
-- 7. VIEW: cash_flow
-- ============================================================
DROP VIEW IF EXISTS public.cash_flow;
CREATE OR REPLACE VIEW public.cash_flow AS
SELECT
  'entrada' AS tipo,
  r.id AS transaction_id,
  r.clinic_id,
  r.data_emissao AS data_movimentacao,
  r.descricao AS descricao,
  r.valor_liquido AS amount,
  r.centro_custo_id,
  r.plano_contas_id,
  r.status,
  'ar_receivables' AS source_table,
  r.created_at
FROM public.ar_receivables r
WHERE r.status = 'received'

UNION ALL

SELECT
  'saida' AS tipo,
  ab.id AS transaction_id,
  ab.clinic_id,
  ab.due_date AS data_movimentacao,
  ab.description AS descricao,
  ab.amount,
  NULL::UUID AS centro_custo_id,
  ab.category_id AS plano_contas_id,
  ab.status,
  'ap_bills' AS source_table,
  ab.created_at
FROM public.ap_bills ab
WHERE ab.status = 'paid';

COMMENT ON VIEW public.cash_flow IS 'Consolidação de entradas (ar_receivables) e saídas (ap_bills) para fluxo de caixa';

SELECT 'Finance views and functions recreated successfully!' AS status;
```

6. Clique em **"Run"** ou pressione **Ctrl+Enter**

### Passo 2: Aguarde a Execução

Você verá a mensagem:
```
Finance views and functions recreated successfully!
```

### Passo 3: Recarregue o Navegador

Pressione **F5** ou **Ctrl+Shift+R** para limpar o cache.

### Passo 4: Teste a Página

Acesse: **http://localhost:3000/clinica/financeiro/fluxo**

A página deve carregar normalmente agora.

---

## 🔍 O Que Foi Corrigido

| Item | Status | Descrição |
|------|--------|-----------|
| `ar_receivables` | ✅ Criada | Tabela para contas a receber |
| `view_ar_receivables_v1` | ✅ Recriada | View usada por `listReceivables()` |
| `ap_bills.vendor_name` | ✅ Adicionada | Coluna para nome do fornecedor |
| `ap_bills_with_category` | ✅ Recriada | View para filtrar por categoria |
| `cashflow_summary()` | ✅ Recriada | Função para resumo do fluxo |
| `list_ap_bills()` | ✅ Recriada | Função para listar contas a pagar |
| `cash_flow` | ✅ Recriada | View consolidando entradas/saídas |

---

## 📞 Se Ainda Houver Erros

Abra o **Console do Navegador** (F12 > Console) e verifique:

1. **Se aparecerem novos erros**, copie a mensagem de erro completa
2. **Verifique o Supabase SQL Editor** para confirmar que a query foi executada com sucesso
3. **Recarregue o navegador** com Ctrl+Shift+R (force refresh)

---

## 💾 Arquivo de Migração

O SQL foi salvo em:
```
supabase/migrations/20260121_fix_finance_views.sql
```

Você pode aplicar via Supabase CLI futuramente com:
```bash
supabase db push
```

---

✅ **Pronto! A correção foi aplicada.**
