# Script de Deploy da Edge Function via Supabase API
# Antes de rodar: 
# 1. Obtenha um access token em: https://app.supabase.com/account/tokens
# 2. Defina como variável de ambiente: $env:SUPABASE_ACCESS_TOKEN = "seu_token_aqui"

$projectRef = "gvdkdjyupktlflwurike"
$functionName = "create-stripe-checkout"

# Verificar token
if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "❌ SUPABASE_ACCESS_TOKEN não está definido!" -ForegroundColor Red
    Write-Host "`nSiga estes passos:" -ForegroundColor Yellow
    Write-Host "1. Vá para: https://app.supabase.com/account/tokens" 
    Write-Host "2. Gere um novo token de acesso"
    Write-Host "3. Execute este comando:" 
    Write-Host "`n   `$env:SUPABASE_ACCESS_TOKEN = 'seu_token_aqui'"
    Write-Host "`n4. Execute o deploy novamente`n"
    exit 1
}

Write-Host "🚀 Deploy da Edge Function '$functionName'..." -ForegroundColor Cyan

# Ler arquivo TypeScript
$functionPath = "supabase/functions/$functionName/index.ts"
if (-not (Test-Path $functionPath)) {
    Write-Host "❌ Arquivo não encontrado: $functionPath" -ForegroundColor Red
    exit 1
}

$functionCode = Get-Content $functionPath -Raw

# Deploy usando supabase CLI
Write-Host "📦 Fazendo deploy..." -ForegroundColor Yellow
npx supabase functions deploy $functionName --project-ref $projectRef --token $env:SUPABASE_ACCESS_TOKEN

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
    Write-Host "`n🔗 Função disponível em:" -ForegroundColor Cyan
    Write-Host "   https://$projectRef.supabase.co/functions/v1/$functionName`n"
} else {
    Write-Host "❌ Erro no deploy!" -ForegroundColor Red
    exit 1
}
