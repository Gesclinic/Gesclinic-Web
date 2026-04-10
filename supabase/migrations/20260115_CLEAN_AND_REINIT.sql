-- ============================================================
-- CLEAN ALL TABLES AND REINITIALIZE
-- ============================================================
-- Drop all existing tables to start fresh
-- This ensures all columns are properly created

-- Disable triggers before dropping
DROP TRIGGER IF EXISTS trg_stock_items_timestamp ON stock_items;
DROP TRIGGER IF EXISTS trg_orcamentos_timestamp ON orcamentos;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS conciliation_auto_rules CASCADE;
DROP TABLE IF EXISTS conciliations CASCADE;
DROP TABLE IF EXISTS conciliation_lines CASCADE;
DROP TABLE IF EXISTS bank_statement_lines CASCADE;
DROP TABLE IF EXISTS bank_statements CASCADE;
DROP TABLE IF EXISTS professional_repasse CASCADE;
DROP TABLE IF EXISTS professional_payments CASCADE;
DROP TABLE IF EXISTS repasse_medico CASCADE;
DROP TABLE IF EXISTS recurring_accounts_payable CASCADE;
DROP TABLE IF EXISTS ar_receivables CASCADE;
DROP TABLE IF EXISTS accounts_receivable CASCADE;
DROP TABLE IF EXISTS accounts_payable CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS ap_bill_comments CASCADE;
DROP TABLE IF EXISTS ap_items CASCADE;
DROP TABLE IF EXISTS ap_bills CASCADE;
DROP TABLE IF EXISTS cost_centers CASCADE;
DROP TABLE IF EXISTS account_plans CASCADE;
DROP TABLE IF EXISTS chart_of_accounts CASCADE;
DROP TABLE IF EXISTS stock_request_items CASCADE;
DROP TABLE IF EXISTS stock_requests CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS stock_locations CASCADE;
DROP TABLE IF EXISTS stock_items CASCADE;
DROP TABLE IF EXISTS stock_suppliers CASCADE;
DROP TABLE IF EXISTS stock_units CASCADE;
DROP TABLE IF EXISTS stock_categories CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS schedule_unavailability CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS professional_schedules CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS payers CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS service_groups CASCADE;
DROP TABLE IF EXISTS patient_document_types CASCADE;
DROP TABLE IF EXISTS document_types CASCADE;
DROP TABLE IF EXISTS patients_files CASCADE;
DROP TABLE IF EXISTS patient_media CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS professionals CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS clinics CASCADE;
DROP TABLE IF EXISTS orcamentos CASCADE;

-- Drop views if they exist
DROP VIEW IF EXISTS ap_bills_with_category;
DROP VIEW IF EXISTS cash_flow;
DROP VIEW IF EXISTS dre_monthly;
DROP VIEW IF EXISTS view_ar_receivables_v1;
DROP VIEW IF EXISTS repasse_dashboard;

-- Confirmation
SELECT 'All tables and views dropped successfully!' as status;
