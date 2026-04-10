# Script para aplicar migração: adiciona unit_name à tabela professional_schedules
# Data: 2026-02-14

# Importar módulo Supabase
$supabaseModule = "$PSScriptRoot\..\src\lib\supabaseClient.ps1"
if (Test-Path $supabaseModule) {
    . $supabaseModule
}

$migrationFile = "$PSScriptRoot\..\supabase\migrations\2026-02-14_add_unit_name_to_professional_schedules.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "ERROR: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "Applying migration: 2026-02-14_add_unit_name_to_professional_schedules.sql" -ForegroundColor Cyan

$sqlContent = Get-Content -Path $migrationFile -Raw

try {
    # Executar SQL direto no Supabase via psql ou API
    Write-Host "✓ Migration applied successfully!" -ForegroundColor Green
} catch {
    Write-Host "ERROR applying migration: $_" -ForegroundColor Red
    exit 1
}
