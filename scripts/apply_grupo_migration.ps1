# Script to apply grupo migration to Supabase
# Execute this to add 'grupo' column to service_prices table

$supabaseUrl = $env:VITE_SUPABASE_URL
$supabaseKey = $env:VITE_SUPABASE_ANON_KEY

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Error "❌ VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables not set"
    exit 1
}

$migrationFile = Join-Path $PSScriptRoot ".." "supabase" "migrations" "20260218_add_grupo_to_service_prices.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Error "❌ Migration file not found: $migrationFile"
    exit 1
}

# Read migration SQL
$sql = Get-Content $migrationFile -Raw

Write-Host "🔄 Applying migration: add 'grupo' column to service_prices table..." -ForegroundColor Cyan

# Execute via Supabase API
$headers = @{
    "Authorization" = "Bearer $supabaseKey"
    "Content-Type" = "application/json"
}

$body = @{
    query = $sql
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest `
        -Uri "$supabaseUrl/rest/v1/rpc/exec_sql" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop

    Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
    Write-Host "📝 Column 'grupo' has been added to service_prices table" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Note: If RPC method doesn't exist, please apply SQL manually in Supabase dashboard:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host $sql -ForegroundColor Gray
    Write-Host ""
    Write-Host "Steps:" -ForegroundColor Cyan
    Write-Host "1. Go to https://app.supabase.com/project/[your-project]/sql/new" -ForegroundColor Gray
    Write-Host "2. Paste the SQL above" -ForegroundColor Gray
    Write-Host "3. Click 'Run'" -ForegroundColor Gray
}
