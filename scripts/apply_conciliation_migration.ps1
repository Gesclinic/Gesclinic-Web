# Script para aplicar migração de conciliação via API Supabase
param(
    [string]$ProjectRef = "gvdkdjyupktlflwurike",
    [string]$AccessToken = $env:SUPABASE_ACCESS_TOKEN
)

if (-not $AccessToken) {
    Write-Host "❌ SUPABASE_ACCESS_TOKEN não configurada"
    exit 1
}

$sqlFile = "supabase/migrations/20260113_create_conciliation_tables.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Arquivo SQL não encontrado: $sqlFile"
    exit 1
}

$sql = Get-Content $sqlFile -Raw

# Preparar payload
$payload = @{
    query = $sql
} | ConvertTo-Json -Depth 10

Write-Host "📤 Enviando SQL para Supabase..."
Write-Host "Tamanho: $($sql.Length) caracteres"

$headers = @{
    "Authorization" = "Bearer $AccessToken"
    "Content-Type" = "application/json"
}

$uri = "https://api.supabase.com/v1/projects/$ProjectRef/database/query"

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $payload -ErrorAction Stop
    Write-Host "✅ Migração aplicada com sucesso!"
    Write-Host $response.Content
} catch {
    Write-Host "❌ Erro ao aplicar migração:"
    Write-Host $_.Exception.Message
    exit 1
}
