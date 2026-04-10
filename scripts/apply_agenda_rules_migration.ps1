#!/usr/bin/env pwsh
# Script para aplicar migração de timestamps nas agenda_rules

# Variáveis
$supabaseUrl = $env:VITE_SUPABASE_URL
$anonKey = $env:VITE_SUPABASE_ANON_KEY
$migrationFile = ".\supabase\migrations\2026-01-19_add_timestamps_to_agenda_rules.sql"

if (-not $supabaseUrl -or -not $anonKey) {
    Write-Host "❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não estão definidas" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Arquivo de migração não encontrado: $migrationFile" -ForegroundColor Red
    exit 1
}

# Ler conteúdo do SQL
$sqlContent = Get-Content -Path $migrationFile -Raw

# Construir body da requisição
$body = @{
    query = $sqlContent
} | ConvertTo-Json

Write-Host "🚀 Aplicando migração..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest `
        -Uri "$supabaseUrl/rest/v1/rpc/exec_sql" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "apikey" = $anonKey
            "Authorization" = "Bearer $anonKey"
        } `
        -Body $body `
        -UseBasicParsing

    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 204) {
        Write-Host "✅ Migração aplicada com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Status: $($response.StatusCode)" -ForegroundColor Yellow
        Write-Host $response.Content
    }
} catch {
    Write-Host "Erro ao aplicar migração:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    
    # Tentar usar curl como fallback
    Write-Host "`nAlternativamente, execute manualmente no Supabase SQL Editor:" -ForegroundColor Yellow
    Write-Host "Copie o conteudo de: $migrationFile"
}
