#!/usr/bin/env pwsh
# Fix foreign key constraint on service_prices.payer_id
# This migration corrects the FK that was incorrectly pointing to health_insurances instead of payers

$migration = @"
-- Fix foreign key constraint on service_prices.payer_id
ALTER TABLE IF EXISTS public.service_prices
DROP CONSTRAINT IF EXISTS fk_service_prices_payer_id CASCADE;

ALTER TABLE IF EXISTS public.service_prices
ADD CONSTRAINT fk_service_prices_payer_id 
FOREIGN KEY (payer_id) REFERENCES public.payers(id) ON DELETE SET NULL;
"@

Write-Host "🔧 Fixing service_prices FK constraint..." -ForegroundColor Cyan
Write-Host "Migration SQL:" -ForegroundColor Cyan
Write-Host $migration -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  To apply this migration:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to Supabase Dashboard > SQL Editor" -ForegroundColor White
Write-Host "2. Paste the SQL above" -ForegroundColor White
Write-Host "3. Click 'RUN'" -ForegroundColor White
Write-Host ""
Write-Host "📋 File location:" -ForegroundColor Cyan
Write-Host "supabase/migrations/20260217_fix_service_prices_payer_fk.sql" -ForegroundColor Gray
