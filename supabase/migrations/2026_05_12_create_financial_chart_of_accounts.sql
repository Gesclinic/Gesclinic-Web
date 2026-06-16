-- Create financial_chart_of_accounts table
CREATE TABLE IF NOT EXISTS financial_chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES financial_chart_of_accounts(id) ON DELETE SET NULL,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('RECEITA', 'DESPESA', 'ATIVO', 'PASSIVO', 'PATRIMONIO')),
  nature VARCHAR(20) NOT NULL CHECK (nature IN ('CREDORA', 'DEVEDORA')),
  level INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  accepts_entries BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, code)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_chart_of_accounts_clinic_id ON financial_chart_of_accounts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_financial_chart_of_accounts_parent_id ON financial_chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_financial_chart_of_accounts_code ON financial_chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_financial_chart_of_accounts_type ON financial_chart_of_accounts(type);
CREATE INDEX IF NOT EXISTS idx_financial_chart_of_accounts_is_active ON financial_chart_of_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_financial_chart_of_accounts_clinic_parent ON financial_chart_of_accounts(clinic_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_financial_chart_of_accounts_clinic_active ON financial_chart_of_accounts(clinic_id, is_active);

-- Create audit table for tracking changes
CREATE TABLE IF NOT EXISTS financial_chart_of_accounts_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES financial_chart_of_accounts(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  old_values JSONB,
  new_values JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_chart_of_accounts_audit_clinic_id ON financial_chart_of_accounts_audit(clinic_id);
CREATE INDEX IF NOT EXISTS idx_financial_chart_of_accounts_audit_account_id ON financial_chart_of_accounts_audit(account_id);

-- Enable RLS
ALTER TABLE financial_chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_chart_of_accounts_audit ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view accounts from their clinic" ON financial_chart_of_accounts;
DROP POLICY IF EXISTS "Users can insert accounts in their clinic" ON financial_chart_of_accounts;
DROP POLICY IF EXISTS "Users can update accounts in their clinic" ON financial_chart_of_accounts;
DROP POLICY IF EXISTS "Users can delete accounts in their clinic" ON financial_chart_of_accounts;
DROP POLICY IF EXISTS "Users can view audit logs from their clinic" ON financial_chart_of_accounts_audit;
DROP POLICY IF EXISTS "System can insert audit logs" ON financial_chart_of_accounts_audit;

-- RLS Policy: Users can only see accounts from their clinic
CREATE POLICY "Users can view accounts from their clinic"
  ON financial_chart_of_accounts
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert accounts in their clinic
CREATE POLICY "Users can insert accounts in their clinic"
  ON financial_chart_of_accounts
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_roles 
      WHERE user_id = auth.uid() AND role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'financeiro')
      )
    ) AND
    created_by = auth.uid()
  );

-- RLS Policy: Users can update accounts in their clinic
CREATE POLICY "Users can update accounts in their clinic"
  ON financial_chart_of_accounts
  FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles 
      WHERE user_id = auth.uid() AND role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'financeiro')
      )
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_roles 
      WHERE user_id = auth.uid() AND role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'financeiro')
      )
    ) AND
    clinic_id = (SELECT clinic_id FROM financial_chart_of_accounts WHERE id = financial_chart_of_accounts.id)
  );

-- RLS Policy: Users can delete accounts in their clinic (with restrictions on audit)
CREATE POLICY "Users can delete accounts in their clinic"
  ON financial_chart_of_accounts
  FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles 
      WHERE user_id = auth.uid() AND role_id IN (
        SELECT id FROM roles WHERE name = 'admin'
      )
    )
  );

-- RLS Policy: Audit table - users can view audit logs from their clinic
CREATE POLICY "Users can view audit logs from their clinic"
  ON financial_chart_of_accounts_audit
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_roles 
      WHERE user_id = auth.uid() AND role_id IN (
        SELECT id FROM roles WHERE name IN ('admin', 'financeiro')
      )
    )
  );

-- RLS Policy: Audit table - system can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON financial_chart_of_accounts_audit
  FOR INSERT
  WITH CHECK (true);

-- Create trigger function for audit logging
DROP TRIGGER IF EXISTS financial_chart_of_accounts_audit ON financial_chart_of_accounts;
DROP FUNCTION IF EXISTS financial_chart_of_accounts_audit_trigger();

CREATE OR REPLACE FUNCTION financial_chart_of_accounts_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO financial_chart_of_accounts_audit (
      account_id, clinic_id, action, changed_by, new_values
    ) VALUES (
      NEW.id, NEW.clinic_id, 'INSERT', NEW.created_by, to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO financial_chart_of_accounts_audit (
      account_id, clinic_id, action, changed_by, old_values, new_values
    ) VALUES (
      NEW.id, NEW.clinic_id, 'UPDATE', auth.uid(), to_jsonb(OLD), to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO financial_chart_of_accounts_audit (
      account_id, clinic_id, action, changed_by, old_values
    ) VALUES (
      OLD.id, OLD.clinic_id, 'DELETE', auth.uid(), to_jsonb(OLD)
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER financial_chart_of_accounts_audit
  AFTER INSERT OR UPDATE OR DELETE ON financial_chart_of_accounts
  FOR EACH ROW
  EXECUTE FUNCTION financial_chart_of_accounts_audit_trigger();

-- Create function to get hierarchical chart of accounts
DROP FUNCTION IF EXISTS get_chart_of_accounts_tree(UUID);

CREATE OR REPLACE FUNCTION get_chart_of_accounts_tree(p_clinic_id UUID)
RETURNS TABLE (
  id UUID,
  parent_id UUID,
  code VARCHAR,
  name VARCHAR,
  type VARCHAR,
  nature VARCHAR,
  level INTEGER,
  is_active BOOLEAN,
  accepts_entries BOOLEAN,
  child_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.parent_id,
    a.code,
    a.name,
    a.type,
    a.nature,
    a.level,
    a.is_active,
    a.accepts_entries,
    (SELECT COUNT(*) FROM financial_chart_of_accounts b WHERE b.parent_id = a.id)::INTEGER as child_count
  FROM financial_chart_of_accounts a
  WHERE a.clinic_id = p_clinic_id
  ORDER BY a.parent_id NULLS FIRST, a.code;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate account deletion (no active entries)
DROP FUNCTION IF EXISTS can_delete_chart_account(UUID);

CREATE OR REPLACE FUNCTION can_delete_chart_account(p_account_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_children BOOLEAN;
  has_entries BOOLEAN;
BEGIN
  -- Check if account has child accounts
  SELECT EXISTS(
    SELECT 1 FROM financial_chart_of_accounts 
    WHERE parent_id = p_account_id
  ) INTO has_children;
  
  IF has_children THEN
    RETURN FALSE;
  END IF;
  
  -- Check if account has financial entries (placeholder - will be implemented when AP/AR/invoices are linked)
  has_entries := FALSE;
  
  RETURN NOT has_entries;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE financial_chart_of_accounts IS 'Central chart of accounts for financial module - supports hierarchical structure with multi-clinic isolation';
COMMENT ON TABLE financial_chart_of_accounts_audit IS 'Audit trail for chart of accounts modifications';
