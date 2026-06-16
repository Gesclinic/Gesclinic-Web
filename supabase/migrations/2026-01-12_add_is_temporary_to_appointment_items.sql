-- Migration: Add is_temporary column to appointment_items table
-- Created: 2026-01-12
-- Purpose: Enable draft mode for service items with temporary state management

ALTER TABLE appointment_items 
ADD COLUMN IF NOT EXISTS is_temporary BOOLEAN DEFAULT true;

-- Add index for better query performance when filtering by is_temporary
CREATE INDEX IF NOT EXISTS idx_appointment_items_is_temporary 
ON appointment_items(appointment_id, is_temporary);

-- Verify column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'appointment_items' 
AND column_name = 'is_temporary';
