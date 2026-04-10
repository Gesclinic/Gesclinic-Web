#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Abre Supabase Dashboard e prepara o SQL para colar
#>

# Read SQL file
$sqlFile = Join-Path (Get-Item -Path "." | Select-Object -ExpandProperty FullName) "supabase\migrations\2026-01-07_create_stock_balance_function.sql"
$sqlContent = Get-Content $sqlFile -Raw

# Copy to clipboard
$sqlContent | Set-Clipboard

Write-Host "✅ SQL copiado para a área de transferência!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Instruções:" -ForegroundColor Cyan
Write-Host "1. A página do Supabase será aberta em 3 segundos..." -ForegroundColor Gray
Write-Host "2. Selecione seu projeto" -ForegroundColor Gray
Write-Host "3. Clique em 'SQL Editor'" -ForegroundColor Gray
Write-Host "4. Clique em '+ New Query'" -ForegroundColor Gray
Write-Host "5. Cole o SQL (Ctrl+V)" -ForegroundColor Gray
Write-Host "6. Clique em 'Run'" -ForegroundColor Gray
Write-Host ""

Start-Sleep -Seconds 2

# Open Supabase Dashboard
Start-Process "https://app.supabase.com"

Write-Host "🚀 Dashboard aberto! O SQL está na área de transferência." -ForegroundColor Green
Write-Host ""
Write-Host "Apos executar, volte aqui e digite 'npm run dev' para recarregar a aplicacao." -ForegroundColor Yellow
