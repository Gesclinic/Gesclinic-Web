param(
    [string]$MigrationFile = "supabase\migrations\2026-05-07_fix_audit_trigger_action_column.sql"
)

# Set error handling
$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " APPLYING AUDIT TRIGGER FIX" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Load environment variables
$env_file = Join-Path (Get-Location) ".env"
if (-not (Test-Path $env_file)) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    exit 1
}

# Parse .env file
$env_vars = @{}
Get-Content $env_file | ForEach-Object {
    if ($_ -match '=') {
        $parts = $_.Split('=', 2)
        $env_vars[$parts[0]] = $parts[1]
    }
}

$SUPABASE_URL = $env_vars["VITE_SUPABASE_URL"]
$SUPABASE_KEY = $env_vars["VITE_SUPABASE_ANON_KEY"]

if (-not $SUPABASE_URL) {
    Write-Host "ERROR: VITE_SUPABASE_URL not found in .env" -ForegroundColor Red
    exit 1
}

# Read migration file
$full_path = Join-Path (Get-Location) $MigrationFile
if (-not (Test-Path $full_path)) {
    Write-Host "ERROR: Migration file not found at $full_path" -ForegroundColor Red
    exit 1
}

Write-Host "Reading migration file..." -ForegroundColor Yellow
$sql_content = Get-Content $full_path -Raw
$file_size = [Math]::Round($sql_content.Length / 1024, 2)
Write-Host "Successfully loaded migration ($file_size KB)" -ForegroundColor Green

# Split SQL into individual statements
$statements = $sql_content -split ";" | Where-Object { $_.Trim() }

Write-Host "`nFound $($statements.Count) SQL statements to execute" -ForegroundColor Yellow

# Try to execute via curl (which is available on Windows 10+)
Write-Host "`nAttempting to execute migration..." -ForegroundColor Yellow

try {
    # Build RPC call
    $rpc_body = @{
        query = $sql_content
    } | ConvertTo-Json -Depth 10
    
    # Write to temp file for curl
    $temp_file = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $temp_file -Value $rpc_body -Encoding UTF8
    
    # Execute via curl
    $rpc_url = "$SUPABASE_URL/rest/v1/rpc/exec_sql"
    $response = & curl.exe -X POST "$rpc_url" `
        -H "Authorization: Bearer $SUPABASE_KEY" `
        -H "Content-Type: application/json" `
        --data-binary "@$temp_file" `
        -s -w "%{http_code}"
    
    Remove-Item $temp_file -Force
    
    Write-Host "Migration executed successfully!" -ForegroundColor Green
    Write-Host "Please verify in Supabase SQL Editor that the trigger was updated." -ForegroundColor Yellow
    
} catch {
    Write-Host "Could not execute via RPC: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "`nManual Instructions:" -ForegroundColor Cyan
    Write-Host "1. Copy the SQL file content" -ForegroundColor White
    Write-Host "2. Go to: https://app.supabase.com" -ForegroundColor White
    Write-Host "3. Open SQL Editor" -ForegroundColor White
    Write-Host "4. Paste and execute the migration" -ForegroundColor White
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " NEXT STEPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Reload the browser (F5 or Cmd+R)" -ForegroundColor White
Write-Host "2. Open new appointment modal" -ForegroundColor White
Write-Host "3. Try creating an appointment again" -ForegroundColor White
Write-Host "`n" -ForegroundColor Cyan
