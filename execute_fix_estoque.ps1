# Read SQL file and copy to clipboard
$sqlFile = Join-Path (Get-Location) "supabase\migrations\2026-01-07_create_stock_balance_function.sql"
$sqlContent = Get-Content $sqlFile -Raw

# Copy to clipboard
$sqlContent | Set-Clipboard

Write-Host "=== FIX ESTOQUE - RESTAURAR FUNCAO ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "OK - SQL copiado para clipboard!" -ForegroundColor Green
Write-Host ""
Write-Host "Passos:" -ForegroundColor Cyan
Write-Host "1. Abra https://app.supabase.com" -ForegroundColor Gray
Write-Host "2. Selecione o projeto" -ForegroundColor Gray  
Write-Host "3. Clique em SQL Editor (lado esquerdo)" -ForegroundColor Gray
Write-Host "4. Clique em + New Query" -ForegroundColor Gray
Write-Host "5. Cole o SQL (Ctrl+V)" -ForegroundColor Gray
Write-Host "6. Clique em RUN (botao azul)" -ForegroundColor Gray
Write-Host "7. Aguarde a conclusao" -ForegroundColor Gray
Write-Host ""
Write-Host "Apos, recarregue o navegador (F5)" -ForegroundColor Yellow
Write-Host ""

# Open Supabase
Start-Process "https://app.supabase.com"
