-- Fix Contas a Pagar delete flow when audit trigger writes into payables_audit.
-- The delete is authorized on ap_bills, but the trigger also inserts an audit row.
-- SECURITY DEFINER lets the trigger persist audit metadata without exposing direct
-- client-side INSERT access to payables_audit.

ALTER FUNCTION public.audit_ap_bills_changes() SECURITY DEFINER;
ALTER FUNCTION public.audit_ap_bills_changes() SET search_path TO public;

GRANT EXECUTE ON FUNCTION public.audit_ap_bills_changes() TO authenticated, service_role;