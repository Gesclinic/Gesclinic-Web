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
