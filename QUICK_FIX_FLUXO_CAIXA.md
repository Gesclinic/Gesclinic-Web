# 🚀 CORREÇÃO RÁPIDA - Erro 404 em Fluxo de Caixa

## ⚡ Resumo do Problema

```
❌ http://localhost:3000/clinica/financeiro/fluxo
   → 404 Página não encontrada
   → Console: "Could not find the table 'public.view_ar_receivables_v1'"
```

**Causa:** A view `view_ar_receivables_v1` foi dropada mas não foi recriada.

---

## ✅ Solução em 3 Passos

### 1️⃣ Abra o Supabase SQL Editor

1. Acesse: **https://app.supabase.com**
2. Clique em seu projeto
3. Vá para: **SQL Editor** (no menu esquerda)
4. Clique em: **New Query**

### 2️⃣ Cole Este SQL

```sql
-- FIX FINANCE VIEWS
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

ALTER TABLE IF EXISTS public.ap_bills ADD COLUMN IF NOT EXISTS vendor_name text;

DROP VIEW IF EXISTS public.view_ar_receivables_v1;
CREATE OR REPLACE VIEW public.view_ar_receivables_v1 AS
SELECT
  r.id, r.clinic_id, r.origem, r.descricao,
  r.payer_name AS pagador,
  r.paciente_id, r.convenio_id, r.empresa_id,
  r.profissional_id, r.centro_custo_id, r.plano_contas_id,
  r.valor_bruto, r.descontos, r.valor_liquido, r.forma_prevista,
  r.data_emissao, r.data_vencimento, r.data_recebimento,
  r.status, r.parcelado, r.parcela_atual, r.total_parcelas,
  r.grupo_parcelamento_id, r.created_at
FROM public.ar_receivables r;

DROP VIEW IF EXISTS public.ap_bills_with_category;
CREATE OR REPLACE VIEW public.ap_bills_with_category AS
SELECT ap.*, cp.name AS category_name
FROM public.ap_bills ap
LEFT JOIN public.account_plans cp ON cp.id = ap.category_id;

CREATE OR REPLACE FUNCTION public.cashflow_summary(
  p_clinic_id UUID, p_start DATE, p_end DATE
)
RETURNS TABLE (total_entradas NUMERIC, total_saidas NUMERIC, resultado_liquido NUMERIC, saldo_anterior NUMERIC, saldo_final NUMERIC) 
LANGUAGE plpgsql AS $$
DECLARE
  v_entradas NUMERIC := 0;
  v_saidas NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(valor_liquido), 0) INTO v_entradas
  FROM public.ar_receivables
  WHERE clinic_id = p_clinic_id AND status = 'received' AND data_recebimento >= p_start AND data_recebimento <= p_end;

  SELECT COALESCE(SUM(amount), 0) INTO v_saidas
  FROM public.ap_bills
  WHERE clinic_id = p_clinic_id AND status = 'paid' AND due_date >= p_start AND due_date <= p_end;

  RETURN QUERY SELECT v_entradas::NUMERIC, v_saidas::NUMERIC, (v_entradas - v_saidas)::NUMERIC, 0::NUMERIC, (v_entradas - v_saidas)::NUMERIC;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_ap_bills(
  p_clinic_id UUID, p_status_text TEXT DEFAULT NULL, p_limit INT DEFAULT 50, p_offset INT DEFAULT 0
)
RETURNS TABLE (id UUID, clinic_id UUID, category_id UUID, vendor_name TEXT, description TEXT, amount NUMERIC, due_date DATE, issue_date DATE, status TEXT, notes TEXT, payment_method TEXT, document_number TEXT, document_url TEXT, installments INT, ir_pct NUMERIC, csll_pct NUMERIC, pis_cofins_pct NUMERIC, iss_pct NUMERIC, icms_pct NUMERIC, taxes_retained BOOLEAN, repasse_doctor_name TEXT, linked_invoice_id UUID, linked_service TEXT, linked_revenue NUMERIC, method_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT ab.id, ab.clinic_id, ab.category_id, ab.vendor_name, ab.description, ab.amount, ab.due_date, ab.issue_date, ab.status, ab.notes, ab.payment_method, ab.document_number, ab.document_url, ab.installments, ab.ir_pct, ab.csll_pct, ab.pis_cofins_pct, ab.iss_pct, ab.icms_pct, ab.taxes_retained, ab.repasse_doctor_name, ab.linked_invoice_id, ab.linked_service, ab.linked_revenue, ab.method_id, ab.created_at
  FROM public.ap_bills ab
  WHERE ab.clinic_id = p_clinic_id AND (p_status_text IS NULL OR ab.status = p_status_text)
  ORDER BY ab.due_date ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

DROP VIEW IF EXISTS public.cash_flow;
CREATE OR REPLACE VIEW public.cash_flow AS
SELECT 'entrada' AS tipo, r.id AS transaction_id, r.clinic_id, r.data_emissao AS data_movimentacao, r.descricao, r.valor_liquido AS amount, r.centro_custo_id, r.plano_contas_id, r.status, 'ar_receivables' AS source_table, r.created_at
FROM public.ar_receivables r WHERE r.status = 'received'
UNION ALL
SELECT 'saida', ab.id, ab.clinic_id, ab.due_date, ab.description, ab.amount, NULL::UUID, ab.category_id, ab.status, 'ap_bills', ab.created_at
FROM public.ap_bills ab WHERE ab.status = 'paid';

SELECT 'Finance views recreated!' AS status;
```

### 3️⃣ Execute e Recarregue

1. Clique em **"Run"** (ou Ctrl+Enter)
2. Volte para a aba do navegador
3. Pressione **F5** (recarregar)

---

## ✨ O Que Será Corrigido

✅ View `view_ar_receivables_v1` será recriada  
✅ Coluna `vendor_name` será adicionada a `ap_bills`  
✅ View `ap_bills_with_category` será recriada  
✅ Funções de fluxo de caixa serão recriadas  

---

## 📖 Mais Informações

Para detalhes completos, veja: [FIX_FINANCE_VIEWS.md](FIX_FINANCE_VIEWS.md)

---

**Feito! A página deve funcionar agora.** ✅
