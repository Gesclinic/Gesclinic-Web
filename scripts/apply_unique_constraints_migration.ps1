# Apply Unique Constraints Migration for SERVICE_PRICES and PROFESSIONAL_SERVICES

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📋 UNIQUE CONSTRAINTS MIGRATION" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "This migration adds UNIQUE constraints required for UPSERT operations:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1️⃣  professional_services (clinic_id, professional_id, service_id)" -ForegroundColor Green
Write-Host "  2️⃣  service_prices (clinic_id, service_id, payer_id, plan_id)" -ForegroundColor Green
Write-Host ""
Write-Host "These constraints enable ON CONFLICT operations in the application." -ForegroundColor Yellow
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 STEPS TO APPLY:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open Supabase Dashboard: https://app.supabase.com" -ForegroundColor White
Write-Host "2. Select your project (Gesclinic)" -ForegroundColor White
Write-Host "3. Go to SQL Editor" -ForegroundColor White
Write-Host "4. Click 'New Query'" -ForegroundColor White
Write-Host "5. Copy the SQL from: supabase/migrations/2026-02-13_add_unique_constraints.sql" -ForegroundColor White
Write-Host "6. Paste into the SQL Editor" -ForegroundColor White
Write-Host "7. Click 'Run'" -ForegroundColor White
Write-Host "8. Verify: No errors shown" -ForegroundColor White
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ After applying, the application will be able to:" -ForegroundColor Green
Write-Host "  • Save particular service prices (professional_services)" -ForegroundColor White
Write-Host "  • Save convênio/plan prices (service_prices)" -ForegroundColor White
Write-Host "  • Update existing prices without conflicts" -ForegroundColor White
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
