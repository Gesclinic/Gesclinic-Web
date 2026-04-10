# ============================================================================
# Script: Apply Billing Columns Migration
# Descrição: Adiciona colunas faltantes para sincronização de faturamento
# ============================================================================

# Carregar variáveis de ambiente
$env_file = ".env"
if (!(Test-Path $env_file)) {
    Write-Host "❌ ERRO: Arquivo .env não encontrado!" -ForegroundColor Red
    exit 1
}

# Ler .env
$env_content = Get-Content $env_file | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }
foreach ($line in $env_content) {
    $key, $value = $line -split '=', 2
    $key = $key.Trim()
    $value = $value.Trim('"')
    
    if ($key -eq "VITE_SUPABASE_URL") { $SUPABASE_URL = $value }
    if ($key -eq "VITE_SUPABASE_ANON_KEY") { $SUPABASE_ANON_KEY = $value }
}

if (!$SUPABASE_URL -or !$SUPABASE_ANON_KEY) {
    Write-Host "❌ ERRO: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Configuração carregada" -ForegroundColor Green
Write-Host "   URL: $SUPABASE_URL" -ForegroundColor Cyan

# Arquivo SQL
$sql_file = "supabase/migrations/2026-04-01_add_billing_columns.sql"

if (!(Test-Path $sql_file)) {
    Write-Host "❌ ERRO: Arquivo SQL não encontrado: $sql_file" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Lendo SQL: $sql_file" -ForegroundColor Yellow
$sql_content = Get-Content $sql_file -Raw

# Executar migração via RPC (simples) ou direto no SQL
Write-Host "🔄 Executando migração SQL..." -ForegroundColor Cyan

# Usar curl para executar SQL direto no Supabase
$headers = @{
    "apikey" = $SUPABASE_ANON_KEY
    "Authorization" = "Bearer $SUPABASE_ANON_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    query = $sql_content
} | ConvertTo-Json

try {
    # Tentar executar SQL direto
    $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/rpc/sql" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop

    Write-Host "✅ Migração aplicada com sucesso!" -ForegroundColor Green
    Write-Host "📊 Resposta: $($response.StatusCode)" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️  Erro ao executar SQL direto. Tente aplicar manualmente no Supabase SQL Editor:" -ForegroundColor Yellow
    Write-Host $sql_content -ForegroundColor Gray
}

Write-Host ""
Write-Host "💡 Próximos passos:" -ForegroundColor Green
Write-Host "   1. Verifique as colunas adicionadas no Supabase"
Write-Host "   2. Teste a criação de Contas a Receber"
Write-Host "   3. Verifique se o faturamento sincroniza corretamente"
