-- ============================================================================
-- ETAPA 6: CONCILIAÇÃO INTELIGENTE
-- ============================================================================
-- Objetivo: Automatizar reconciliação de transações bancárias
-- Tabelas: bank_statements, bank_transactions, reconciliation_history
-- Funções: 5 funções de matching automático
-- ============================================================================

-- 1. TABELA: EXTRATOS BANCÁRIOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  statement_date DATE NOT NULL,
  import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  file_name VARCHAR(255),
  total_amount DECIMAL(15,2),
  transaction_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'error'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bank_statements_clinic_id ON bank_statements(clinic_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_status ON bank_statements(status);
CREATE INDEX IF NOT EXISTS idx_bank_statements_date ON bank_statements(statement_date DESC);

-- 2. TABELA: TRANSAÇÕES DO EXTRATO
-- ============================================================================
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  reference_number VARCHAR(100),
  matched_to_id UUID, -- ar_invoice ID
  match_type VARCHAR(50), -- 'auto_exact', 'auto_fuzzy', 'auto_partial', 'manual', null
  match_confidence DECIMAL(3,2) DEFAULT 0, -- 0.00 - 1.00
  status VARCHAR(20) DEFAULT 'unmatched', -- 'unmatched', 'matched', 'rejected', 'duplicate'
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_statement_id ON bank_transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_amount ON bank_transactions(amount);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date);

-- 3. TABELA: HISTÓRICO DE RECONCILIAÇÃO
-- ============================================================================
CREATE TABLE IF NOT EXISTS reconciliation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  statement_id UUID REFERENCES bank_statements(id) ON DELETE SET NULL,
  reconciliation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  period_start DATE,
  period_end DATE,
  total_transactions INT,
  total_matched INT,
  total_unmatched INT,
  total_amount_matched DECIMAL(15,2),
  total_amount_unmatched DECIMAL(15,2),
  match_rate DECIMAL(5,2), -- 0-100%
  processing_time_ms INT,
  details JSONB,
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_history_clinic_id ON reconciliation_history(clinic_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_history_date ON reconciliation_history(reconciliation_date DESC);

-- 4. FUNÇÃO: CALCULAR CONFIANÇA DO MATCH
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_match_confidence(
  p_bank_amount DECIMAL,
  p_invoice_amount DECIMAL,
  p_bank_date DATE,
  p_invoice_date DATE,
  p_days_tolerance INT DEFAULT 3
)
RETURNS DECIMAL AS $$
DECLARE
  v_amount_match DECIMAL := 0;
  v_date_match DECIMAL := 0;
  v_confidence DECIMAL := 0;
  v_days_diff INT;
BEGIN
  -- Match de valor: 100% se exato, decresce a 50% se diferença > 1%
  IF p_bank_amount = p_invoice_amount THEN
    v_amount_match := 1.0;
  ELSIF ABS(p_bank_amount - p_invoice_amount) / p_invoice_amount <= 0.01 THEN
    v_amount_match := 0.95;
  ELSIF ABS(p_bank_amount - p_invoice_amount) / p_invoice_amount <= 0.05 THEN
    v_amount_match := 0.80;
  ELSE
    v_amount_match := 0.5;
  END IF;

  -- Match de data: 100% se exato, decresce conforme afasta
  v_days_diff := ABS(EXTRACT(DAY FROM (p_bank_date - p_invoice_date))::INT);
  IF v_days_diff = 0 THEN
    v_date_match := 1.0;
  ELSIF v_days_diff <= p_days_tolerance THEN
    v_date_match := 1.0 - (v_days_diff::DECIMAL / (p_days_tolerance::DECIMAL + 1));
  ELSE
    v_date_match := 0.5;
  END IF;

  -- Confiança final: média ponderada (60% valor, 40% data)
  v_confidence := (v_amount_match * 0.6) + (v_date_match * 0.4);
  
  RETURN ROUND(v_confidence::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql;

-- 5. FUNÇÃO: EXECUTAR MATCHING AUTOMÁTICO
-- ============================================================================
CREATE OR REPLACE FUNCTION match_bank_transactions(p_statement_id UUID)
RETURNS TABLE(
  total_matched INT,
  auto_exact INT,
  auto_fuzzy INT,
  auto_partial INT,
  unmatched INT
) AS $$
DECLARE
  v_auto_exact INT := 0;
  v_auto_fuzzy INT := 0;
  v_auto_partial INT := 0;
  v_clinic_id UUID;
  v_bank_tx RECORD;
  v_best_match RECORD;
  v_confidence DECIMAL;
BEGIN
  -- Obter clinic_id do statement
  SELECT clinic_id INTO v_clinic_id FROM bank_statements WHERE id = p_statement_id;
  
  -- Processar cada transação do extrato
  FOR v_bank_tx IN 
    SELECT * FROM bank_transactions WHERE statement_id = p_statement_id AND status = 'unmatched'
  LOOP
    -- Buscar melhor match exato (valor + data)
    SELECT ai.id, 
           calculate_match_confidence(v_bank_tx.amount, ai.amount, v_bank_tx.transaction_date, ai.due_date, 3) as conf
    INTO v_best_match
    FROM ar_invoices ai
    WHERE ai.clinic_id = v_clinic_id
      AND ai.status = 'open'
      AND ai.amount = v_bank_tx.amount
      AND ABS(EXTRACT(DAY FROM (v_bank_tx.transaction_date - ai.due_date))::INT) <= 0
    ORDER BY conf DESC
    LIMIT 1;

    IF v_best_match.id IS NOT NULL THEN
      -- Match exato encontrado
      UPDATE bank_transactions 
      SET matched_to_id = v_best_match.id, 
          match_type = 'auto_exact', 
          match_confidence = v_best_match.conf,
          status = 'matched'
      WHERE id = v_bank_tx.id;
      v_auto_exact := v_auto_exact + 1;
    ELSE
      -- Tentar match fuzzy (valor similar + data próxima)
      SELECT ai.id,
             calculate_match_confidence(v_bank_tx.amount, ai.amount, v_bank_tx.transaction_date, ai.due_date, 3) as conf
      INTO v_best_match
      FROM ar_invoices ai
      WHERE ai.clinic_id = v_clinic_id
        AND ai.status = 'open'
        AND ABS(ai.amount - v_bank_tx.amount) / ai.amount <= 0.05
        AND ABS(EXTRACT(DAY FROM (v_bank_tx.transaction_date - ai.due_date))::INT) <= 3
      ORDER BY conf DESC
      LIMIT 1;

      IF v_best_match.id IS NOT NULL AND v_best_match.conf >= 0.85 THEN
        -- Match fuzzy encontrado
        UPDATE bank_transactions 
        SET matched_to_id = v_best_match.id, 
            match_type = 'auto_fuzzy', 
            match_confidence = v_best_match.conf,
            status = 'matched'
        WHERE id = v_bank_tx.id;
        v_auto_fuzzy := v_auto_fuzzy + 1;
      ELSE
        -- Tentar match parcial (apenas valor)
        SELECT ai.id,
               calculate_match_confidence(v_bank_tx.amount, ai.amount, v_bank_tx.transaction_date, ai.due_date, 3) as conf
        INTO v_best_match
        FROM ar_invoices ai
        WHERE ai.clinic_id = v_clinic_id
          AND ai.status = 'open'
          AND ai.amount = v_bank_tx.amount
        ORDER BY ABS(EXTRACT(DAY FROM (v_bank_tx.transaction_date - ai.due_date))::INT)
        LIMIT 1;

        IF v_best_match.id IS NOT NULL AND v_best_match.conf >= 0.70 THEN
          -- Match parcial encontrado
          UPDATE bank_transactions 
          SET matched_to_id = v_best_match.id, 
              match_type = 'auto_partial', 
              match_confidence = v_best_match.conf,
              status = 'matched'
          WHERE id = v_bank_tx.id;
          v_auto_partial := v_auto_partial + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- Atualizar statement status
  UPDATE bank_statements 
  SET status = 'completed', updated_at = CURRENT_TIMESTAMP
  WHERE id = p_statement_id;

  RETURN QUERY
  SELECT 
    (v_auto_exact + v_auto_fuzzy + v_auto_partial)::INT,
    v_auto_exact,
    v_auto_fuzzy,
    v_auto_partial,
    (SELECT COUNT(*)::INT FROM bank_transactions WHERE statement_id = p_statement_id AND status = 'unmatched');
END;
$$ LANGUAGE plpgsql;

-- 6. FUNÇÃO: DETECTAR DUPLICATAS
-- ============================================================================
CREATE OR REPLACE FUNCTION detect_bank_duplicates(p_clinic_id UUID, p_date_range INT DEFAULT 7)
RETURNS TABLE(
  transaction_id UUID,
  duplicate_of_id UUID,
  amount DECIMAL,
  date DATE,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bt1.id,
    bt2.id,
    bt1.amount,
    bt1.transaction_date,
    bt1.description
  FROM bank_transactions bt1
  JOIN bank_transactions bt2 ON 
    bt1.amount = bt2.amount 
    AND ABS(EXTRACT(DAY FROM (bt1.transaction_date - bt2.transaction_date))::INT) <= p_date_range
    AND bt1.id > bt2.id
  JOIN bank_statements bs1 ON bt1.statement_id = bs1.id
  WHERE bs1.clinic_id = p_clinic_id
    AND bt1.status = 'unmatched'
    AND bt2.status = 'unmatched';
END;
$$ LANGUAGE plpgsql;

-- 7. FUNÇÃO: GERAR RELATÓRIO DE RECONCILIAÇÃO
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_reconciliation_report(
  p_clinic_id UUID,
  p_statement_id UUID,
  p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_report_id UUID;
  v_total_tx INT;
  v_total_matched INT;
  v_total_unmatched INT;
  v_total_amount_matched DECIMAL;
  v_total_amount_unmatched DECIMAL;
  v_match_rate DECIMAL;
  v_period_start DATE;
  v_period_end DATE;
  v_processing_time INT;
  v_start_time TIMESTAMP;
BEGIN
  v_start_time := CURRENT_TIMESTAMP;
  v_report_id := gen_random_uuid();

  -- Coletar estatísticas
  SELECT statement_date, statement_date INTO v_period_start, v_period_end
  FROM bank_statements WHERE id = p_statement_id;

  SELECT 
    COUNT(*)::INT,
    SUM(CASE WHEN status = 'matched' THEN 1 ELSE 0 END)::INT,
    SUM(CASE WHEN status = 'unmatched' THEN 1 ELSE 0 END)::INT,
    SUM(CASE WHEN status = 'matched' THEN amount ELSE 0 END),
    SUM(CASE WHEN status = 'unmatched' THEN amount ELSE 0 END)
  INTO v_total_tx, v_total_matched, v_total_unmatched, v_total_amount_matched, v_total_amount_unmatched
  FROM bank_transactions WHERE statement_id = p_statement_id;

  v_match_rate := CASE WHEN v_total_tx > 0 THEN (v_total_matched::DECIMAL / v_total_tx) * 100 ELSE 0 END;
  v_processing_time := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_start_time))::INT;

  -- Salvar relatório
  INSERT INTO reconciliation_history (
    id, clinic_id, statement_id, period_start, period_end,
    total_transactions, total_matched, total_unmatched,
    total_amount_matched, total_amount_unmatched, match_rate,
    processing_time_ms, created_by
  ) VALUES (
    v_report_id, p_clinic_id, p_statement_id, v_period_start, v_period_end,
    v_total_tx, v_total_matched, v_total_unmatched,
    v_total_amount_matched, v_total_amount_unmatched, v_match_rate,
    v_processing_time, p_created_by
  );

  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql;

-- 8. VIEWS PARA DASHBOARD
-- ============================================================================
CREATE OR REPLACE VIEW v_reconciliation_summary AS
SELECT 
  bs.clinic_id,
  bs.id as statement_id,
  bs.statement_date,
  COUNT(DISTINCT bt.id) as total_transactions,
  SUM(CASE WHEN bt.status = 'matched' THEN 1 ELSE 0 END) as matched_count,
  SUM(CASE WHEN bt.status = 'unmatched' THEN 1 ELSE 0 END) as unmatched_count,
  ROUND(SUM(CASE WHEN bt.status = 'matched' THEN 1 ELSE 0 END)::DECIMAL / COUNT(DISTINCT bt.id) * 100, 2) as match_rate,
  SUM(CASE WHEN bt.match_type = 'auto_exact' THEN 1 ELSE 0 END) as auto_exact_count,
  SUM(CASE WHEN bt.match_type = 'auto_fuzzy' THEN 1 ELSE 0 END) as auto_fuzzy_count,
  SUM(CASE WHEN bt.match_type = 'auto_partial' THEN 1 ELSE 0 END) as auto_partial_count,
  SUM(CASE WHEN bt.match_type = 'manual' THEN 1 ELSE 0 END) as manual_match_count
FROM bank_statements bs
LEFT JOIN bank_transactions bt ON bs.id = bt.statement_id
GROUP BY bs.clinic_id, bs.id, bs.statement_date;

-- ============================================================================
-- FIM ETAPA 6
-- ============================================================================
