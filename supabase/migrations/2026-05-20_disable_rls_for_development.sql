-- ============================================================================
-- Disable RLS for Development - appointment_payer_rules and tax_configurations
-- ============================================================================
-- WARNING: This disables RLS for development/testing only.
-- In production, enable RLS with proper policies.

-- Disable RLS on these tables to allow full access during development
ALTER TABLE appointment_payer_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE tax_configurations DISABLE ROW LEVEL SECURITY;
