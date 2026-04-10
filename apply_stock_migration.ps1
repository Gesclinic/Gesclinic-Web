#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Aplica a migration para restaurar a função list_stock_items_with_balance no Supabase
.DESCRIPTION
    Executa o SQL diretamente via curl no Supabase REST API
#>

param(
    [switch]$Force
)

# Load .env
$envFile = Join-Path (Get-Item -Path "." | Select-Object -ExpandProperty FullName) ".env"

if (-not (Test-Path $envFile)) {
    Write-Host "❌ Erro: arquivo .env não encontrado!" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content $envFile | Where-Object { $_ -match "^VITE_SUPABASE" }
$envContent | ForEach-Object {
    $name, $value = $_ -split "=", 2
    [Environment]::SetEnvironmentVariable($name, $value)
}

$SUPABASE_URL = $env:VITE_SUPABASE_URL
$SUPABASE_KEY = $env:VITE_SUPABASE_ANON_KEY

if (-not $SUPABASE_URL -or -not $SUPABASE_KEY) {
    Write-Host "❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Configuração carregada do .env" -ForegroundColor Green
Write-Host "  URL: $($SUPABASE_URL)" -ForegroundColor Gray

# Read SQL file
$sqlFile = Join-Path (Get-Item -Path "." | Select-Object -ExpandProperty FullName) "supabase\migrations\2026-01-07_create_stock_balance_function.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Erro: arquivo SQL não encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "📖 Lendo arquivo SQL..." -ForegroundColor Cyan
$sqlContent = Get-Content $sqlFile -Raw

# Escapar para JSON
$sqlJson = @{
    query = $sqlContent
} | ConvertTo-Json

Write-Host "🚀 Enviando para Supabase..." -ForegroundColor Cyan

# Extract project ID from URL
$projectId = $SUPABASE_URL -replace "https://", "" -replace ".supabase.co", ""

# Use Supabase REST API with proper headers
$headers = @{
    "apikey" = $SUPABASE_KEY
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Content-Type" = "application/json"
}

# Try to execute via Supabase RPC (list_migrations)
# Since we don't have direct SQL execution, we'll show instructions

Write-Host ""
Write-Host "⚠️  Execução automática via API requer service role key (não disponível com anon key)" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ SOLUÇÃO: Execute manualmente no Supabase Dashboard" -ForegroundColor Green
Write-Host ""
Write-Host "Passo 1: Abra https://app.supabase.com" -ForegroundColor Cyan
Write-Host "Passo 2: Selecione seu projeto" -ForegroundColor Cyan
Write-Host "Passo 3: Clique em 'SQL Editor' (lado esquerdo)" -ForegroundColor Cyan
Write-Host "Passo 4: Clique em '+ New Query'" -ForegroundColor Cyan
Write-Host "Passo 5: Cole o SQL abaixo:" -ForegroundColor Cyan
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host $sqlContent -ForegroundColor DarkCyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Passo 6: Clique em 'Run' (botão azul)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tempo estimado: 5-10 segundos" -ForegroundColor Gray
Write-Host ""
Write-Host "Após executar, recarregue o navegador (F5) para testar" -ForegroundColor Green
