#!/usr/bin/env pwsh
# Script para aplicar migrations que adicionam colunas faltantes

$migrationFile = "supabase/migrations/2026-02-13_add_missing_columns.sql"

Write-Host "⏳ Lendo arquivo de migração..." -ForegroundColor Cyan
$sqlContent = Get-Content $migrationFile -Raw

Write-Host "📋 SQL a executar:" -ForegroundColor Yellow
Write-Host $sqlContent
Write-Host ""

Write-Host "❗ AÇÃO NECESSÁRIA:" -ForegroundColor Red
Write-Host ""
Write-Host "1. Acesse: https://app.supabase.com" -ForegroundColor White
Write-Host "2. Vá ao seu projeto Gesclinic" -ForegroundColor White
Write-Host "3. Clique em 'SQL Editor'" -ForegroundColor White
Write-Host "4. Clique em 'New Query'" -ForegroundColor White
Write-Host "5. Cole o SQL abaixo e execute:" -ForegroundColor White
Write-Host ""
Write-Host "═" * 80 -ForegroundColor Cyan
Write-Host $sqlContent -ForegroundColor Green
Write-Host "═" * 80 -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Após executar no Supabase, refresque a página da aplicação" -ForegroundColor Yellow
