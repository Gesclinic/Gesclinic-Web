-- ============================================================================
-- Fix RLS Policies - Allow Authenticated Users for Development
-- ============================================================================
-- Issue: RLS policies on appointment_payer_rules and tax_configurations
-- require user_roles entries, but these may not be populated for all users.
-- This migration makes the policies more permissive for authenticated users.

-- ============================================================================
-- 1. Drop existing restrictive policies
-- ============================================================================
DROP POLICY IF EXISTS "tax_configurations_clinic_isolation" ON tax_configurations;
DROP POLICY IF EXISTS "appointment_payer_rules_clinic_isolation" ON appointment_payer_rules;

-- ============================================================================
-- 2. Create more permissive policies that allow authenticated users
-- ============================================================================

-- Tax Configurations: Allow any authenticated user for development
-- NOTE: This is permissive for testing. In production, use proper user_roles checks.
CREATE POLICY "tax_configurations_authenticated_access" ON tax_configurations
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Appointment Payer Rules: Allow any authenticated user for development  
-- NOTE: This is permissive for testing. In production, use proper user_roles checks.
CREATE POLICY "appointment_payer_rules_authenticated_access" ON appointment_payer_rules
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- Note: In production, remove the "OR TRUE" fallback and ensure user_roles
-- is properly populated via triggers on auth.users creation or user signup.
-- ============================================================================
