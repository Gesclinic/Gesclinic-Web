# Script para fazer deploy das Edge Functions no Supabase
# Execute: .\deploy-functions.ps1

# Configurações
$SUPABASE_URL = "https://gvdkdjyupktlflwurike.supabase.co"
$PROJECT_ID = "gvdkdjyupktlflwurike"
$SUPABASE_ACCESS_TOKEN = Read-Host "Cole seu token de acesso do Supabase (ou deixe em branco para pular)"

if (-not $SUPABASE_ACCESS_TOKEN) {
    Write-Host "⚠️  Token não fornecido. Use: supabase projects api-keys --project-ref $PROJECT_ID"
    exit
}

$FUNCTIONS_DIR = "$PSScriptRoot\supabase\functions"
$FUNCTIONS = @(
    "create-clinic-from-signup",
    "create-stripe-checkout",
    "stripe-webhook"
)

Write-Host "🚀 Iniciando deploy das Edge Functions..." -ForegroundColor Green

foreach ($func in $FUNCTIONS) {
    $funcPath = Join-Path $FUNCTIONS_DIR $func
    
    if (-not (Test-Path $funcPath)) {
        Write-Host "❌ Função não encontrada: $func" -ForegroundColor Red
        continue
    }
    
    Write-Host "`n📦 Deployando: $func" -ForegroundColor Cyan
    
    # Ler o arquivo index.ts
    $indexPath = Join-Path $funcPath "index.ts"
    if (-not (Test-Path $indexPath)) {
        Write-Host "❌ index.ts não encontrado em $func" -ForegroundColor Red
        continue
    }
    
    $code = Get-Content $indexPath -Raw
    
    # Preparar payload
    $payload = @{
        name = $func
        code = $code
        # Adicionar outros arquivos se existirem
    } | ConvertTo-Json
    
    # Fazer upload via API REST
    $headers = @{
        "Authorization" = "Bearer $SUPABASE_ACCESS_TOKEN"
        "Content-Type" = "application/json"
    }
    
    try {
        $response = Invoke-RestMethod `
            -Uri "$SUPABASE_URL/functions/v1/functions" `
            -Method POST `
            -Headers $headers `
            -Body $payload `
            -ErrorAction Stop
        
        Write-Host "✅ $func deployado com sucesso!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erro ao fazer deploy de $func" -ForegroundColor Red
        Write-Host "Detalhes: $($_.Exception.Message)"
    }
}

Write-Host "`n🎉 Deploy concluído!" -ForegroundColor Green
