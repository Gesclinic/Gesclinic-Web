Write-Host "======================================" -ForegroundColor Cyan
Write-Host "APPOINTMENT TIMESTAMPS MIGRATION" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "SQL File created at:" -ForegroundColor Green
Write-Host "supabase/migrations/20260302_add_appointment_timestamps.sql" -ForegroundColor Green
Write-Host ""
Write-Host "WHAT WAS ADDED:" -ForegroundColor Cyan
Write-Host "- started_at column: When professional starts service" -ForegroundColor Yellow
Write-Host "- finished_at column: When professional finishes service" -ForegroundColor Yellow
Write-Host "- updated_at column: Last change timestamp (auto-updated)" -ForegroundColor Yellow
Write-Host ""
Write-Host "HOW TO APPLY IN SUPABASE:" -ForegroundColor Cyan
Write-Host "1. Open https://app.supabase.com" -ForegroundColor Yellow
Write-Host "2. Select your Gesclinic project" -ForegroundColor Yellow
Write-Host "3. Go to SQL Editor menu" -ForegroundColor Yellow
Write-Host "4. Click New Query button" -ForegroundColor Yellow
Write-Host "5. Copy content from supabase/migrations/20260302_add_appointment_timestamps.sql" -ForegroundColor Yellow
Write-Host "6. Paste it in the SQL editor" -ForegroundColor Yellow
Write-Host "7. Click RUN button" -ForegroundColor Yellow
Write-Host ""
Write-Host "AFTER APPLYING:" -ForegroundColor Green
Write-Host "1. Refresh browser (Ctrl+Shift+R)" -ForegroundColor Green
Write-Host "2. Test Iniciar Atendimento button in agenda" -ForegroundColor Green
Write-Host ""
