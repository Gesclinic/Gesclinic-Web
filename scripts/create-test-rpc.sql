/**
 * create-test-rpc.sql
 * 
 * Function to create rateio rule and test AP bypassing RLS
 */

-- Create function to insert allocation rule (bypasses RLS)
CREATE OR REPLACE FUNCTION create_test_rateio_rule(
  p_clinic_id UUID,
  p_source_center_id UUID,
  p_method TEXT,
  p_items JSONB
)
RETURNS TABLE(success BOOLEAN, allocation_id UUID, message TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alloc_id UUID;
  v_item JSONB;
BEGIN
  -- Create allocation
  INSERT INTO financial_cost_center_allocations (
    clinic_id,
    source_cost_center_id,
    allocation_method,
    is_active,
    description,
    created_at,
    updated_at
  ) VALUES (
    p_clinic_id,
    p_source_center_id,
    p_method,
    TRUE,
    'Test allocation - ' || NOW()::TEXT,
    NOW(),
    NOW()
  )
  INTO v_alloc_id;

  -- Insert items
  FOR v_item IN SELECT jsonb_array_elements(p_items)
  LOOP
    INSERT INTO financial_cost_center_allocation_items (
      allocation_id,
      target_cost_center_id,
      percentage,
      fixed_amount
    ) VALUES (
      v_alloc_id,
      (v_item->>'target_cost_center_id')::UUID,
      (v_item->>'percentage')::NUMERIC,
      (v_item->>'fixed_amount')::NUMERIC
    );
  END LOOP;

  RETURN QUERY SELECT TRUE, v_alloc_id, 'Rule created successfully'::TEXT;
END;
$$;

-- Grant execute permission to anon
GRANT EXECUTE ON FUNCTION create_test_rateio_rule(UUID, UUID, TEXT, JSONB) TO anon;
