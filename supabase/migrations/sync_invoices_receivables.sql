-- SQL to sync ar_invoices to ar_receivables
-- Run this in Supabase SQL Editor

BEGIN;

-- Create function to sync from ar_invoices to ar_receivables
CREATE OR REPLACE FUNCTION sync_invoices_to_receivables()
RETURNS TABLE (inserted_count INT, error_msg TEXT) AS $$
DECLARE
  v_count INT;
  v_error_msg TEXT;
BEGIN
  BEGIN
    INSERT INTO ar_receivables (
      clinic_id,
      appointment_id,
      patient_id,
      patient_name,
      description,
      amount,
      valor_bruto,
      status,
      due_date,
      received_value,
      received_at,
      payer_name,
      origem,
      data_vencimento
    )
    SELECT
      i.clinic_id,
      i.appointment_id,
      i.patient_id,
      i.patient_name,
      i.description,
      i.amount,
      i.amount AS valor_bruto,
      CASE 
        WHEN i.status = 'pending' THEN 'open'
        WHEN i.status = 'paid' THEN 'received'
        ELSE i.status
      END,
      i.due_date,
      COALESCE(i.received_value, 0),
      i.received_at,
      COALESCE(i.patient_name, 'Paciente'),
      'Sistema',
      i.due_date
    FROM ar_invoices i
    WHERE i.amount > 0
      AND NOT EXISTS (
        SELECT 1 FROM ar_receivables r 
        WHERE r.appointment_id = i.appointment_id 
          AND r.amount = i.amount
      )
    ON CONFLICT DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_count, NULL::TEXT;
  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;
    RETURN QUERY SELECT 0, v_error_msg;
  END;
END;
$$ LANGUAGE plpgsql;

-- Also create a trigger to automatically sync when invoices are created
CREATE OR REPLACE FUNCTION trigger_sync_invoice_to_receivables()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ar_receivables (
    clinic_id,
    appointment_id,
    patient_id,
    patient_name,
    description,
    amount,
    valor_bruto,
    status,
    due_date,
    received_value,
    received_at,
    payer_name,
    origem,
    data_vencimento
  ) VALUES (
    NEW.clinic_id,
    NEW.appointment_id,
    NEW.patient_id,
    NEW.patient_name,
    NEW.description,
    NEW.amount,
    NEW.amount,
    CASE 
      WHEN NEW.status = 'pending' THEN 'open'
      WHEN NEW.status = 'paid' THEN 'received'
      ELSE NEW.status
    END,
    NEW.due_date,
    COALESCE(NEW.received_value, 0),
    NEW.received_at,
    COALESCE(NEW.patient_name, 'Paciente'),
    'Sistema',
    NEW.due_date
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the insert
  RAISE WARNING 'Error syncing invoice to receivables: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS tr_sync_invoice_to_receivables ON ar_invoices;

-- Create trigger
CREATE TRIGGER tr_sync_invoice_to_receivables
AFTER INSERT ON ar_invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_invoice_to_receivables();

COMMIT;
