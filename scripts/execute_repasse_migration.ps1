#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Execute repasse_config migration on Supabase
.DESCRIPTION
    Applies the SQL migration to create the repasse_config table on Supabase
#>

$sqlFilePath = "supabase/migrations/20260318_create_repasse_config.sql"
$supabaseUrl = "https://gvdkdjyupktlflwurike.supabase.co"

if (-not (Test-Path $sqlFilePath)) {
    Write-Host "❌ Migration file not found: $sqlFilePath" -ForegroundColor Red
    exit 1
}

Write-Host "=" * 80
Write-Host "SUPABASE MIGRATION - repasse_config" -ForegroundColor Cyan
Write-Host "=" * 80

$sqlContent = Get-Content $sqlFilePath -Raw
Write-Host "✓ Migration file loaded: $sqlFilePath" -ForegroundColor Green
Write-Host "✓ SQL size: $($sqlContent.Length) bytes" -ForegroundColor Green

Write-Host "`n" + "=" * 80
Write-Host "MANUAL EXECUTION INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "=" * 80

Write-Host "`nOPÇÃO: Execute SQL manualmente no Supabase Dashboard" -ForegroundColor Green
Write-Host "Link: $supabaseUrl/dashboard/projects" -ForegroundColor Cyan
Write-Host "`n# SQL para executar:`n" -ForegroundColor Yellow
Write-Host $sqlContent -ForegroundColor Gray
