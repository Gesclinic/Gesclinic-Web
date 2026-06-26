-- Migration: Add description field to get_chart_of_accounts_tree RPC
-- Purpose: Allow description to be retrieved when editing chart of accounts

DROP FUNCTION IF EXISTS get_chart_of_accounts_tree(UUID);

CREATE OR REPLACE FUNCTION get_chart_of_accounts_tree(p_clinic_id UUID)
RETURNS TABLE (
  id UUID,
  parent_id UUID,
  code VARCHAR,
  name VARCHAR,
  description TEXT,
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
    a.description,
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
