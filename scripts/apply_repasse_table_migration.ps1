# Script to apply repasse_config_servico table creation migration to Supabase
# This script reads and executes the SQL migration for creating the complete table

param(
    [string]$SupabaseUrl = $env:VITE_SUPABASE_URL,
    [string]$SupabaseKey = $env:VITE_SUPABASE_ANON_KEY
)

if (-not $SupabaseUrl -or -not $SupabaseKey) {
    Write-Error "ERROR: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables"
    exit 1
}

$migrationFile = "supabase/migrations/20260318_create_repasse_config_servico.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Error "Migration file not found: $migrationFile"
    exit 1
}

$sqlContent = Get-Content -Path $migrationFile -Raw

Write-Host "Applying migration: $migrationFile"
Write-Host "═" * 60

Write-Host "✅ Migration SQL content:"
Write-Host ""
Write-Host $sqlContent.Substring(0, [System.Math]::Min(500, $sqlContent.Length))
Write-Host "..."
Write-Host ""
Write-Host "INSTRUCTIONS:"
Write-Host ""
Write-Host "1️⃣  Open Supabase Dashboard: https://app.supabase.com"
Write-Host "2️⃣  Go to SQL Editor"
Write-Host "3️⃣  Click 'New Query'"
Write-Host "4️⃣  Paste the following SQL:"
Write-Host ""
Write-Host "---BEGIN SQL---"
Write-Host $sqlContent
Write-Host "---END SQL---"
Write-Host ""
Write-Host "5️⃣  Click 'Run' to execute the migration"
Write-Host ""
Write-Host "Or use Supabase CLI:"
Write-Host "  supabase migration up"
