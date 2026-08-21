-- ============================================================================
-- Consolidated from 20260118_add_address_fields_to_health_insurances.sql
-- ============================================================================

-- ============================================================
-- Migration: Adicionar Campos de Endere├ºo ├á Tabela health_insurances
-- Data: 18 de janeiro de 2026
-- ============================================================

-- Adicionar campos de endere├ºo ├á tabela health_insurances
ALTER TABLE IF EXISTS health_insurances
ADD COLUMN IF NOT EXISTS address_street VARCHAR(255),
ADD COLUMN IF NOT EXISTS address_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS address_neighborhood VARCHAR(100),
ADD COLUMN IF NOT EXISTS address_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS address_state VARCHAR(2),
ADD COLUMN IF NOT EXISTS address_zip_code VARCHAR(20);

-- Criar ├¡ndice para melhor performance nas buscas por cidade/estado
CREATE INDEX IF NOT EXISTS idx_health_insurances_address
ON health_insurances(clinic_id, address_city, address_state)
WHERE active = TRUE;

-- ============================================================
-- Coment├írios nas colunas para documenta├º├úo
-- ============================================================
COMMENT ON COLUMN health_insurances.address_street IS 'Rua/Avenida do endere├ºo';
COMMENT ON COLUMN health_insurances.address_number IS 'N├║mero do endere├ºo';
COMMENT ON COLUMN health_insurances.address_neighborhood IS 'Bairro';
COMMENT ON COLUMN health_insurances.address_city IS 'Cidade';
COMMENT ON COLUMN health_insurances.address_state IS 'Estado (UF) - 2 caracteres';
COMMENT ON COLUMN health_insurances.address_zip_code IS 'CEP';

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================

-- ============================================================================
-- Consolidated from 20260118_add_category_to_resources.sql
-- ============================================================================

-- Migration: Add category column to resources table
-- Date: 2026-01-18
-- Description: Adiciona coluna 'category' ├á tabela 'resources' para categorizar equipamentos, materiais, etc.

-- Adicionar coluna category se n├úo existir
ALTER TABLE public.resources
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT NULL;

-- Adicionar coment├írio na coluna
COMMENT ON COLUMN public.resources.category IS 'Categoria do recurso (Equipamento, Material, Instrumento, etc.)';

-- Criar ├¡ndice na coluna category para melhor performance nas buscas
CREATE INDEX IF NOT EXISTS idx_resources_category
ON public.resources(clinic_id, category)
WHERE active = true;

-- ============================================================================
-- Consolidated from 20260118_add_fields_to_health_insurances.sql
-- ============================================================================

-- Adicionar campos de configura├º├úo aos conv├¬nios
ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS minimum_margin_percentage DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS special_rules TEXT;

-- ============================================================================
-- Consolidated from 20260118_add_timestamps_to_health_insurances.sql
-- ============================================================================

-- Adicionar colunas de timestamp ├á tabela health_insurances se n├úo existirem
ALTER TABLE health_insurances
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- ============================================================================
-- Consolidated from 20260118_add_tiss_mandatory_fields.sql
-- ============================================================================

-- ============================================================
-- Migration: Adicionar Campos Obrigat├│rios para TISS XML
-- Data: 18 de janeiro de 2026
-- ============================================================

-- 1. SERVICES - Adicionar campos TISS
ALTER TABLE IF EXISTS services
ADD COLUMN IF NOT EXISTS tuss_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS type_service VARCHAR(50),
ADD COLUMN IF NOT EXISTS guide_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS unit_measure VARCHAR(20),
ADD COLUMN IF NOT EXISTS cost_value DECIMAL(12,2);

-- Criar ├¡ndices para performance
CREATE INDEX IF NOT EXISTS idx_services_tuss_code
ON services(clinic_id, tuss_code)
WHERE active = TRUE;

-- 2. PROFESSIONALS - Adicionar campos TISS
ALTER TABLE IF EXISTS professionals
ADD COLUMN IF NOT EXISTS cbo_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS cns_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS council_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS council_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS council_state VARCHAR(2);

-- Criar ├¡ndices
CREATE INDEX IF NOT EXISTS idx_professionals_cbo_code
ON professionals(clinic_id, cbo_code);

-- 3. HEALTH_INSURANCES - Adicionar campos TISS
ALTER TABLE IF EXISTS health_insurances
ADD COLUMN IF NOT EXISTS registration_ans VARCHAR(20),
ADD COLUMN IF NOT EXISTS tiss_pattern BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS guide_format VARCHAR(50);

-- Criar ├¡ndices
CREATE INDEX IF NOT EXISTS idx_health_insurances_ans
ON health_insurances(clinic_id, registration_ans);

-- 4. PROFESSIONAL_PAYERS - Validar credential_number
-- Se n├úo tiver a coluna:
ALTER TABLE IF EXISTS professional_payers
ADD COLUMN IF NOT EXISTS credential_number VARCHAR(50);

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================

-- ============================================================================
-- Consolidated from 20260118_add_tiss_version_field.sql
-- ============================================================================

-- ============================================================
-- Migration: Adicionar Campo tiss_version ├á Tabela health_insurances
-- Data: 18 de janeiro de 2026
-- ============================================================

-- Adicionar coluna de vers├úo TISS
ALTER TABLE IF EXISTS health_insurances
ADD COLUMN IF NOT EXISTS tiss_version VARCHAR(20) DEFAULT '3.05.00';

-- Criar ├¡ndice para melhor performance
CREATE INDEX IF NOT EXISTS idx_health_insurances_tiss_version
ON health_insurances(clinic_id, tiss_version)
WHERE active = TRUE;

-- ============================================================
-- Coment├írio na coluna para documenta├º├úo
-- ============================================================
COMMENT ON COLUMN health_insurances.tiss_version IS 'Vers├úo do padr├úo TISS utilizado pelo conv├¬nio (ex: 3.05.00)';

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================

-- ============================================================================
-- Consolidated from 20260118_fix_health_insurances_type_check.sql
-- ============================================================================

-- Corrigir constraint no campo type da tabela health_insurances
-- Remover constraint incorreta e adicionar a correta

-- Primeiro, remover a constraint incorreta se existir
ALTER TABLE health_insurances
DROP CONSTRAINT IF EXISTS health_insurances_type_check;

-- Adicionar o constraint correto
ALTER TABLE health_insurances
ADD CONSTRAINT health_insurances_type_check
CHECK (type IS NULL OR type IN ('private_insurance', 'health_plan', 'government', 'direct_pay', 'other'));

-- ============================================================================
-- Consolidated from 20260118_rls_policies.sql
-- ============================================================================

-- ============================================================
-- ROW LEVEL SECURITY POLICIES FOR MULTI-TENANT ISOLATION
-- ============================================================
-- Ensure each clinic can only see and modify their own data

-- Enable RLS on all relevant tables
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CLINICS TABLE POLICIES
-- ============================================================

-- Only allow users to see their own clinic
CREATE POLICY "clinics_select_own"
  ON clinics FOR SELECT
  USING (
    id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- Only allow clinic admins to update their clinic
CREATE POLICY "clinics_update_own"
  ON clinics FOR UPDATE
  USING (
    id IN (
      SELECT clinic_id FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- USERS TABLE POLICIES
-- ============================================================

-- Users can see users from their own clinic
CREATE POLICY "users_select_own_clinic"
  ON users FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- Only admins can insert new users in their clinic
CREATE POLICY "users_insert_own_clinic"
  ON users FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update users in their clinic
CREATE POLICY "users_update_own_clinic"
  ON users FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can delete users from their clinic (only admins)
CREATE POLICY "users_delete_own_clinic"
  ON users FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- CLINIC SUBSCRIPTIONS POLICIES
-- ============================================================

CREATE POLICY "clinic_subscriptions_select"
  ON clinic_subscriptions FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "clinic_subscriptions_update"
  ON clinic_subscriptions FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- SUBSCRIPTION PLANS POLICIES (Public read-only)
-- ============================================================

CREATE POLICY "subscription_plans_select"
  ON subscription_plans FOR SELECT
  USING (true);  -- Anyone can view plans

-- ============================================================
-- PATIENTS TABLE POLICIES
-- ============================================================

CREATE POLICY "patients_select"
  ON patients FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "patients_insert"
  ON patients FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "patients_update"
  ON patients FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "patients_delete"
  ON patients FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- PROFESSIONALS TABLE POLICIES
-- ============================================================

CREATE POLICY "professionals_select"
  ON professionals FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "professionals_insert"
  ON professionals FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "professionals_update"
  ON professionals FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "professionals_delete"
  ON professionals FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- APPOINTMENTS TABLE POLICIES
-- ============================================================

CREATE POLICY "appointments_select"
  ON appointments FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "appointments_insert"
  ON appointments FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "appointments_update"
  ON appointments FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "appointments_delete"
  ON appointments FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- SERVICES TABLE POLICIES
-- ============================================================

CREATE POLICY "services_select"
  ON services FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "services_insert"
  ON services FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "services_update"
  ON services FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "services_delete"
  ON services FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- SERVICE GROUPS TABLE POLICIES
-- ============================================================

CREATE POLICY "service_groups_select"
  ON service_groups FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "service_groups_insert"
  ON service_groups FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "service_groups_update"
  ON service_groups FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "service_groups_delete"
  ON service_groups FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- ROOMS TABLE POLICIES
-- ============================================================

CREATE POLICY "rooms_select"
  ON rooms FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "rooms_insert"
  ON rooms FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "rooms_update"
  ON rooms FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "rooms_delete"
  ON rooms FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- STOCK TABLE POLICIES
-- ============================================================

CREATE POLICY "stock_select"
  ON stock FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "stock_insert"
  ON stock FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "stock_update"
  ON stock FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "stock_delete"
  ON stock FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- STOCK ITEMS TABLE POLICIES
-- ============================================================

CREATE POLICY "stock_items_select"
  ON stock_items FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "stock_items_insert"
  ON stock_items FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "stock_items_update"
  ON stock_items FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- STOCK CATEGORIES TABLE POLICIES
-- ============================================================

CREATE POLICY "stock_categories_select"
  ON stock_categories FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "stock_categories_insert"
  ON stock_categories FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "stock_categories_update"
  ON stock_categories FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- STOCK SUPPLIERS TABLE POLICIES
-- ============================================================

CREATE POLICY "stock_suppliers_select"
  ON stock_suppliers FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "stock_suppliers_insert"
  ON stock_suppliers FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "stock_suppliers_update"
  ON stock_suppliers FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- STOCK MOVEMENTS TABLE POLICIES
-- ============================================================

CREATE POLICY "stock_movements_select"
  ON stock_movements FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "stock_movements_insert"
  ON stock_movements FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- AP BILLS TABLE POLICIES (Contas a Pagar)
-- ============================================================

CREATE POLICY "ap_bills_select"
  ON ap_bills FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "ap_bills_insert"
  ON ap_bills FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "ap_bills_update"
  ON ap_bills FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "ap_bills_delete"
  ON ap_bills FOR DELETE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- AP ITEMS TABLE POLICIES
-- ============================================================

CREATE POLICY "ap_items_select"
  ON ap_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ap_bills
      WHERE ap_bills.id = ap_items.ap_bill_id
      AND ap_bills.clinic_id IN (
        SELECT clinic_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================
-- AR RECEIVABLES TABLE POLICIES (Contas a Receber)
-- ============================================================

CREATE POLICY "ar_receivables_select"
  ON ar_receivables FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "ar_receivables_insert"
  ON ar_receivables FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "ar_receivables_update"
  ON ar_receivables FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- CHART OF ACCOUNTS TABLE POLICIES
-- ============================================================

CREATE POLICY "chart_of_accounts_select"
  ON chart_of_accounts FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "chart_of_accounts_insert"
  ON chart_of_accounts FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "chart_of_accounts_update"
  ON chart_of_accounts FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- ACCOUNT PLANS TABLE POLICIES
-- ============================================================

CREATE POLICY "account_plans_select"
  ON account_plans FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "account_plans_insert"
  ON account_plans FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "account_plans_update"
  ON account_plans FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- COST CENTERS TABLE POLICIES
-- ============================================================

CREATE POLICY "cost_centers_select"
  ON cost_centers FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "cost_centers_insert"
  ON cost_centers FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "cost_centers_update"
  ON cost_centers FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- PAYERS TABLE POLICIES
-- ============================================================

CREATE POLICY "payers_select"
  ON payers FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "payers_insert"
  ON payers FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "payers_update"
  ON payers FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- PLANS TABLE POLICIES
-- ============================================================

CREATE POLICY "plans_select"
  ON plans FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "plans_insert"
  ON plans FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "plans_update"
  ON plans FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- PAYMENT METHODS TABLE POLICIES
-- ============================================================

CREATE POLICY "payment_methods_select"
  ON payment_methods FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "payment_methods_insert"
  ON payment_methods FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "payment_methods_update"
  ON payment_methods FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE id = auth.uid()
    )
  );

-- Confirmation
SELECT 'RLS Policies criadas com sucesso!' as status;
