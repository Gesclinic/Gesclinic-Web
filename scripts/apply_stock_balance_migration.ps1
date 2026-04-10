# Script para aplicar a migration de cálculo de saldo de estoque
# Execute este SQL diretamente no SQL Editor do Supabase

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  MIGRATION: Stock Balance Functions" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "INSTRUCOES:" -ForegroundColor Yellow
Write-Host "1. Abra o Supabase Dashboard" -ForegroundColor White
Write-Host "2. Va em SQL Editor" -ForegroundColor White
Write-Host "3. Copie e execute o conteudo do arquivo:" -ForegroundColor White
Write-Host "   supabase/migrations/2026-01-07_create_stock_balance_function.sql" -ForegroundColor Green
Write-Host ""
Write-Host "OU execute diretamente via psql/pgAdmin com o conteudo abaixo:" -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan

Get-Content "c:\Users\ferna\Desktop\Projeto Gesclinic Web\supabase\migrations\2026-01-07_create_stock_balance_function.sql"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "APOS APLICAR A MIGRATION:" -ForegroundColor Yellow
Write-Host "1. Recarregue a pagina de Produtos" -ForegroundColor White
Write-Host "2. O saldo deve aparecer CORRETO (Caneta com 200 unidades)" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
