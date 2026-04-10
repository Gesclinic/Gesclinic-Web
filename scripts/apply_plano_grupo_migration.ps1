#!/usr/bin/env pwsh

# Script para aplicar migração - Adiciona colunas plano e grupo à tabela service_prices

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Aplicando Migração: Add plano_grupo_to_service_prices" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Verificar se o arquivo SQL existe
$sqlFile = "supabase/migrations/20260218_add_plano_grupo_to_service_prices.sql"
if (!(Test-Path $sqlFile)) {
    Write-Host "❌ Arquivo SQL não encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

# Ler o conteúdo do arquivo SQL
$sqlContent = Get-Content $sqlFile -Raw

Write-Host ""
Write-Host "📝 SQL a ser executado:" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host $sqlContent -ForegroundColor Gray
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""

Write-Host "⚠️  Execute este script no Supabase SQL Editor" -ForegroundColor Yellow
Write-Host "   em: https://app.supabase.com/project/YOUR_PROJECT/sql/new" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Copie o SQL acima e execute no editor SQL do Supabase" -ForegroundColor Green
Write-Host ""
