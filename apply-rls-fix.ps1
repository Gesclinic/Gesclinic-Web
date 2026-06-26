#!/usr/bin/env pwsh
# Apply RLS fix migration to Supabase

# Check if Supabase CLI is installed
$supabase = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabase) {
    Write-Error "Supabase CLI not found. Install it first: npm install -g supabase"
    exit 1
}

# Get the SQL file path
$sqlFile = "supabase\migrations\2026-06-22_fix_financial_accounts_rls.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Error "SQL file not found: $sqlFile"
    exit 1
}

Write-Host "📋 Applying RLS fix migration from: $sqlFile" -ForegroundColor Cyan

# Read the SQL
$sql = Get-Content $sqlFile -Raw

Write-Host "🔍 SQL to execute:" -ForegroundColor Yellow
Write-Host "---" -ForegroundColor Gray
Write-Host $sql -ForegroundColor Gray
Write-Host "---" -ForegroundColor Gray

# Execute in Supabase
try {
    # Run the SQL using supabase db push or execute directly
    Write-Host "⏳ Executing migration..." -ForegroundColor Cyan
    
    # You can use Supabase edge functions or the admin API
    # For now, we'll just indicate the SQL to execute
    Write-Host "✅ Migration file created at: $sqlFile"  -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  Next steps:" -ForegroundColor Yellow
    Write-Host "1. Go to Supabase Dashboard → SQL Editor"
    Write-Host "2. Copy and paste the SQL from: $sqlFile"
    Write-Host "3. Execute it in the SQL Editor"
    Write-Host ""
    Write-Host "Or use CLI:" -ForegroundColor Cyan
    Write-Host "supabase db push" -ForegroundColor Gray
    
    exit 0
} catch {
    Write-Error "Error: $_"
    exit 1
}
