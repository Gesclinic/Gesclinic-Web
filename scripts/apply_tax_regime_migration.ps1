# Script to apply tax regime migration to Supabase
# This script reads and executes the SQL migration for adding tax_regime column

param(
    [string]$SupabaseUrl = $env:VITE_SUPABASE_URL,
    [string]$SupabaseKey = $env:VITE_SUPABASE_ANON_KEY
)

if (-not $SupabaseUrl -or -not $SupabaseKey) {
    Write-Error "ERROR: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables"
    exit 1
}

$migrationFile = "supabase/migrations/20260318_add_tax_regime_to_repasse_config.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Error "Migration file not found: $migrationFile"
    exit 1
}

$sqlContent = Get-Content -Path $migrationFile -Raw

Write-Host "Applying migration: $migrationFile"
Write-Host "═" * 60

# Execute via curl to Supabase REST API
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $SupabaseKey"
}

$body = @{
    query = $sqlContent
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$SupabaseUrl/rest/v1/rpc/migrate" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "✅ Migration applied successfully!"
    Write-Host $response.Content
}
catch {
    Write-Host "⚠️  Note: If using Supabase dashboard, execute the SQL manually:"
    Write-Host ""
    Write-Host $sqlContent
    Write-Host ""
    Write-Host "Or use Supabase CLI: supabase migration up"
}
