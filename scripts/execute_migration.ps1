# Script para executar migração no Supabase
# Usando SQL via Supabase CLI ou direto via API

$migrationFile = "C:\Users\ferna\Desktop\Projeto Gesclinic Web\supabase\migrations\20260118_add_fields_to_health_insurances.sql"
$sqlContent = Get-Content -Path $migrationFile -Raw

Write-Host "Migração SQL:" -ForegroundColor Green
Write-Host $sqlContent

Write-Host "`nPara executar no Supabase, copie o SQL acima e execute em:" -ForegroundColor Yellow
Write-Host "Supabase Dashboard > SQL Editor > Paste & Run" -ForegroundColor Cyan
