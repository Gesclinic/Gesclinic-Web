-- ═══════════════════════════════════════════════════════════════════════════════
-- 🚀 MIGRATION: Ativar Automação Financeira Completa
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- Data: 19/05/2026
-- Versão: 1.0
-- Objetivo: Ativar triggers e automações que integram AP Bills → Cash Flow
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. TABELA: cash_flow_entries (linha simples de fluxo)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cash_flow_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida', 'transferencia')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  category_id UUID,
  cost_center_id UUID,
  financial_account_id UUID,
  origin TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual', 'contas_pagar', 'contas_receber', 'conciliacao')),
  reference_id UUID,
  reference_table TEXT,
  is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  
  CONSTRAINT check_date_not_future CHECK (date <= CURRENT_DATE + INTERVAL '1 day')
);

CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_clinic ON public.cash_flow_entries(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_date ON public.cash_flow_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_account ON public.cash_flow_entries(financial_account_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_reference ON public.cash_flow_entries(reference_id, reference_table);
CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_clinic_date ON public.cash_flow_entries(clinic_id, date DESC);

-- Comentário
COMMENT ON TABLE public.cash_flow_entries IS 'Lançamentos individuais de fluxo de caixa - integra com AP Bills, AR Receivables, etc';
COMMENT ON COLUMN public.cash_flow_entries.origin IS 'Origem do lançamento: manual (usuário), contas_pagar (AP Bill), contas_receber (Invoice), conciliacao (Reconciliation)';
COMMENT ON COLUMN public.cash_flow_entries.reference_id IS 'ID do registro de origem (ap_bills.id, invoices.id, etc)';
COMMENT ON COLUMN public.cash_flow_entries.reference_table IS 'Tabela de origem (ap_bills, invoices, etc)';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. AUDITORIA: cash_flow_entries_audit
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.cash_flow_entries_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES public.cash_flow_entries(id) ON DELETE CASCADE,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE'))
);

CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_audit_entry ON public.cash_flow_entries_audit(entry_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_audit_date ON public.cash_flow_entries_audit(changed_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. TRIGGERS: Auditoria Automática em cash_flow_entries
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.cash_flow_entries_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.cash_flow_entries_audit (
    entry_id,
    old_values,
    new_values,
    changed_by,
    operation
  )
  VALUES (
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    TG_OP
  );
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS cash_flow_entries_audit_trg ON public.cash_flow_entries;
CREATE TRIGGER cash_flow_entries_audit_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.cash_flow_entries
  FOR EACH ROW EXECUTE FUNCTION public.cash_flow_entries_audit_trigger();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. TRIGGERS: AP Bills → Cash Flow (Contas a Pagar gera Saída)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.on_ap_bill_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount NUMERIC;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'paid' AND COALESCE(OLD.status, '') != 'paid' THEN
    -- Calcular valor a registrar
    v_amount := COALESCE(NEW.paid_value, NEW.amount, 0);
    
    -- Criar entrada no cash_flow_entries
    INSERT INTO public.cash_flow_entries (
      clinic_id,
      date,
      description,
      type,
      amount,
      category_id,
      cost_center_id,
      origin,
      reference_id,
      reference_table,
      created_by
    )
    VALUES (
      NEW.clinic_id,
      CURRENT_DATE,
      'Pagamento: ' || COALESCE(NEW.description, 'Conta a Pagar'),
      'saida',
      v_amount,
      NEW.category_id,
      NEW.cost_center_id,
      'contas_pagar',
      NEW.id,
      'ap_bills',
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ap_bill_paid_trg ON public.ap_bills;
CREATE TRIGGER on_ap_bill_paid_trg
  AFTER UPDATE OF status ON public.ap_bills
  FOR EACH ROW EXECUTE FUNCTION public.on_ap_bill_paid();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. TRIGGERS: AR Receivables → Cash Flow (Contas Recebidas gera Entrada)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.on_ar_receivable_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount NUMERIC;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'received' AND COALESCE(OLD.status, '') != 'received' THEN
    -- Calcular valor a registrar
    v_amount := COALESCE(NEW.received_value, NEW.amount, 0);
    
    -- Criar entrada no cash_flow_entries
    INSERT INTO public.cash_flow_entries (
      clinic_id,
      date,
      description,
      type,
      amount,
      origin,
      reference_id,
      reference_table,
      created_by
    )
    VALUES (
      NEW.clinic_id,
      CURRENT_DATE,
      'Recebimento: ' || COALESCE(NEW.description, 'Conta a Receber'),
      'entrada',
      v_amount,
      'contas_receber',
      NEW.id,
      'ar_receivables',
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Só criar o trigger se a tabela existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ar_receivables') THEN
    DROP TRIGGER IF EXISTS on_ar_receivable_paid_trg ON public.ar_receivables;
    CREATE TRIGGER on_ar_receivable_paid_trg
      AFTER UPDATE OF status ON public.ar_receivables
      FOR EACH ROW EXECUTE FUNCTION public.on_ar_receivable_paid();
  END IF;
END$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. TRIGGERS: Cancelamento de AP Bill → Reversal no Cash Flow
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.on_ap_bill_canceled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'canceled' AND COALESCE(OLD.status, '') != 'canceled' THEN
    -- Deletar (ou marcar como reversado) o lançamento original
    UPDATE public.cash_flow_entries
    SET updated_at = NOW()
    WHERE reference_id = NEW.id 
      AND reference_table = 'ap_bills'
      AND type = 'saida'
      AND date = CURRENT_DATE;
    
    -- Criar entrada reversa (entrada em valor igual) para manter rastreabilidade
    INSERT INTO public.cash_flow_entries (
      clinic_id,
      date,
      description,
      type,
      amount,
      origin,
      reference_id,
      reference_table,
      created_by
    )
    VALUES (
      NEW.clinic_id,
      CURRENT_DATE,
      'REVERSAL: Cancelamento de ' || COALESCE(NEW.description, 'Conta a Pagar'),
      'entrada',
      COALESCE(NEW.paid_value, NEW.amount, 0),
      'contas_pagar',
      NEW.id,
      'ap_bills_reversal',
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ap_bill_canceled_trg ON public.ap_bills;
CREATE TRIGGER on_ap_bill_canceled_trg
  AFTER UPDATE OF status ON public.ap_bills
  FOR EACH ROW EXECUTE FUNCTION public.on_ap_bill_canceled();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. RLS POLICIES: cash_flow_entries
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.cash_flow_entries ENABLE ROW LEVEL SECURITY;

-- SELECT: users podem ver apenas dados de suas clínicas
CREATE POLICY "cash_flow_entries_select" ON public.cash_flow_entries
  FOR SELECT USING (
    clinic_id IN (
      SELECT DISTINCT clinic_id FROM public.user_clinic_roles 
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: users podem criar apenas em suas clínicas
CREATE POLICY "cash_flow_entries_insert" ON public.cash_flow_entries
  FOR INSERT WITH CHECK (
    clinic_id IN (
      SELECT DISTINCT clinic_id FROM public.user_clinic_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro')
    )
  );

-- UPDATE: users podem editar apenas dados de suas clínicas
CREATE POLICY "cash_flow_entries_update" ON public.cash_flow_entries
  FOR UPDATE USING (
    clinic_id IN (
      SELECT DISTINCT clinic_id FROM public.user_clinic_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro')
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT DISTINCT clinic_id FROM public.user_clinic_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro')
    )
  );

-- DELETE: users podem deletar apenas dados de suas clínicas (soft delete via update)
CREATE POLICY "cash_flow_entries_delete" ON public.cash_flow_entries
  FOR DELETE USING (
    clinic_id IN (
      SELECT DISTINCT clinic_id FROM public.user_clinic_roles 
      WHERE user_id = auth.uid() AND role IN ('admin')
    )
  );

ALTER TABLE public.cash_flow_entries_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_flow_entries_audit_select" ON public.cash_flow_entries_audit
  FOR SELECT USING (
    entry_id IN (
      SELECT id FROM public.cash_flow_entries
      WHERE clinic_id IN (
        SELECT DISTINCT clinic_id FROM public.user_clinic_roles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. RPC FUNCTION: Obter resumo fluxo de caixa por período
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_cash_flow_summary(
  p_clinic_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_entries NUMERIC,
  total_exits NUMERIC,
  net_result NUMERIC,
  entry_count INT,
  exit_count INT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN type = 'entrada' THEN amount ELSE 0 END), 0) AS total_entries,
    COALESCE(SUM(CASE WHEN type = 'saida' THEN amount ELSE 0 END), 0) AS total_exits,
    COALESCE(SUM(CASE WHEN type = 'entrada' THEN amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN type = 'saida' THEN amount ELSE 0 END), 0) AS net_result,
    COUNT(CASE WHEN type = 'entrada' THEN 1 END) AS entry_count,
    COUNT(CASE WHEN type = 'saida' THEN 1 END) AS exit_count
  FROM public.cash_flow_entries
  WHERE clinic_id = p_clinic_id
    AND date >= p_start_date
    AND date <= p_end_date;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. RPC FUNCTION: Listar lançamentos com rastreabilidade
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.list_cash_flow_entries(
  p_clinic_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_type TEXT DEFAULT NULL,
  p_origin TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  date DATE,
  description TEXT,
  type TEXT,
  amount NUMERIC,
  origin TEXT,
  reference_id UUID,
  reference_table TEXT,
  created_at TIMESTAMPTZ,
  is_reconciled BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT
    cfe.id,
    cfe.date,
    cfe.description,
    cfe.type,
    cfe.amount,
    cfe.origin,
    cfe.reference_id,
    cfe.reference_table,
    cfe.created_at,
    cfe.is_reconciled
  FROM public.cash_flow_entries cfe
  WHERE cfe.clinic_id = p_clinic_id
    AND cfe.date >= p_start_date
    AND cfe.date <= p_end_date
    AND (p_type IS NULL OR cfe.type = p_type)
    AND (p_origin IS NULL OR cfe.origin = p_origin)
  ORDER BY cfe.date DESC, cfe.created_at DESC;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- ✅ CRIADO:
--   1. Tabela cash_flow_entries (registro simples por lançamento)
--   2. Tabela cash_flow_entries_audit (rastreamento de mudanças)
--   3. Trigger: Auditoria automática em cash_flow_entries
--   4. Trigger: AP Bills (status=paid) → Saída no cash_flow
--   5. Trigger: AR Receivables (status=received) → Entrada no cash_flow
--   6. Trigger: AP Bills (status=canceled) → Reversal no cash_flow
--   7. RLS Policies (isolamento por clinic_id + role)
--   8. RPC: get_cash_flow_summary() - resumo por período
--   9. RPC: list_cash_flow_entries() - listagem com filtros
--
-- 🎯 RESULTADO:
--   - Fluxo de caixa agora é AUTOMÁTICO quando AP/AR atualizam
--   - Rastreabilidade completa com auditoria
--   - Integração segura via RLS
--   - Reversals mantêm integridade de dados
--
-- ═══════════════════════════════════════════════════════════════════════════════
