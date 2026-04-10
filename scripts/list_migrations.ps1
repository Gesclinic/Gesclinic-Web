#!/usr/bin/env pwsh
# Script simples para aplicar migrations do Supabase

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "APLICAR MIGRATIONS DO SUPABASE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Carregar .env
$envFile = "$PSScriptRoot\..\\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "ERRO: Arquivo .env nao encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "Carregando variaveis de ambiente..." -ForegroundColor Yellow
$env:VITE_SUPABASE_URL = ""
$env:VITE_SUPABASE_ANON_KEY = ""

Get-Content $envFile | ForEach-Object {
    if ($_ -match "VITE_SUPABASE_URL") {
        $env:VITE_SUPABASE_URL = ($_ -split "=" | Select-Object -Last 1).Trim().Trim('"')
    }
    if ($_ -match "VITE_SUPABASE_ANON_KEY") {
        $env:VITE_SUPABASE_ANON_KEY = ($_ -split "=" | Select-Object -Last 1).Trim().Trim('"')
    }
}

if (-not $env:VITE_SUPABASE_URL -or -not $env:VITE_SUPABASE_ANON_KEY) {
    Write-Host "ERRO: Variaveis nao definidas no .env" -ForegroundColor Red
    exit 1
}

Write-Host "OK - Variaveis carregadas" -ForegroundColor Green
Write-Host ""

# Listar migrations
$migrationsDir = "$PSScriptRoot\..\supabase\migrations"
$migrations = @()
$migrations = Get-ChildItem -Path $migrationsDir -Filter "*.sql" -File | Sort-Object Name

Write-Host "Migrations encontradas: $($migrations.Count)" -ForegroundColor Cyan
$migrations | ForEach-Object {
    Write-Host "  - $($_.Name)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INSTRUCOES PARA APLICAR MANUALMENTE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Abra o Supabase Dashboard:" -ForegroundColor Yellow
Write-Host "   https://app.supabase.com/project/gvdkdjyupktlflwurike/sql/new" -ForegroundColor Green
Write-Host ""

Write-Host "2. Copie e execute os arquivos SQL na ordem:" -ForegroundColor Yellow
Write-Host ""

$counter = 1
$migrations | ForEach-Object {
    Write-Host "   $counter) $($_.Name)" -ForegroundColor Cyan
    $counter++
}

Write-Host ""
Write-Host "3. Clique em Run (ou Ctrl+Enter)" -ForegroundColor Yellow
Write-Host "4. Aguarde a mensagem de sucesso" -ForegroundColor Yellow
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STATUS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL Supabase: $($env:VITE_SUPABASE_URL)" -ForegroundColor Gray
Write-Host "Chave: $($env:VITE_SUPABASE_ANON_KEY.Substring(0, 20))..." -ForegroundColor Gray
Write-Host "Migrations: $($migrations.Count) arquivos" -ForegroundColor Gray
Write-Host ""

Write-Host "Pronto para aplicar migrations!" -ForegroundColor Green
Write-Host ""
