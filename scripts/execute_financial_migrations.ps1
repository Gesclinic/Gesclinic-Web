# Supabase Financial Migrations Executor
# Executa todas as migrations do sistema financeiro

param(
    [Parameter(Mandatory=$false)]
    [string]$Method = "manual"
)

$WorkspacePath = "c:\Users\ferna\Desktop\Projeto Gesclinic Web"
$EnvFilePath = "$WorkspacePath\.env"
$MigrationFile = "$WorkspacePath\supabase\migrations\EXECUTE_ALL_CONSOLIDATED.sql"

Write-Host "Gesclinic - Financial System Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Ler credenciais
Write-Host "[1] Lendo credenciais Supabase..." -ForegroundColor Yellow
$envContent = Get-Content $EnvFilePath -Raw
$supabaseUrl = ($envContent | Select-String 'VITE_SUPABASE_URL=(.+)').Matches[0].Groups[1].Value
$anonKey = ($envContent | Select-String 'VITE_SUPABASE_ANON_KEY=(.+)').Matches[0].Groups[1].Value

if ([string]::IsNullOrEmpty($supabaseUrl) -or [string]::IsNullOrEmpty($anonKey)) {
    Write-Host "ERRO: Nao foi possivel ler credenciais do .env" -ForegroundColor Red
    exit 1
}

Write-Host "OK: Credenciais carregadas" -ForegroundColor Green
Write-Host "URL: $supabaseUrl" -ForegroundColor Gray
Write-Host ""

# 2. Ler arquivo SQL
Write-Host "[2] Lendo arquivo SQL..." -ForegroundColor Yellow
if (-not (Test-Path $MigrationFile)) {
    Write-Host "ERRO: Arquivo SQL nao encontrado" -ForegroundColor Red
    exit 1
}

$sqlContent = Get-Content $MigrationFile -Raw
$charCount = ($sqlContent | Measure-Object -Character).Characters
Write-Host "OK: SQL carregado ($charCount caracteres)" -ForegroundColor Green
Write-Host ""

# 3. Executar
Write-Host "[3] Executando migrations..." -ForegroundColor Yellow
Write-Host ""

if ($Method -eq "manual") {
    Write-Host "METODO: COPIA e COLA (Recomendado)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[PASSO 1] Abra: https://console.supabase.com/project/gvdkdjyupktlflwurike/sql/new" -ForegroundColor White
    Write-Host ""
    Write-Host "[PASSO 2] Copiando SQL para clipboard..." -ForegroundColor Yellow
    $sqlContent | Set-Clipboard
    Write-Host "OK: SQL copiado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "[PASSO 3] Cole o SQL (Ctrl+V) no console Supabase" -ForegroundColor White
    Write-Host "[PASSO 4] Clique RUN ou pressione Ctrl+Enter" -ForegroundColor White
    Write-Host "[PASSO 5] Aguarde conclusao" -ForegroundColor White
    Write-Host ""
    
    $response = Read-Host "Abrir console Supabase no navegador agora? (S/N)"
    if ($response -eq "S" -or $response -eq "s") {
        Start-Process "https://console.supabase.com/project/gvdkdjyupktlflwurike/sql/new"
        Start-Sleep -Seconds 3
        Write-Host ""
        Write-Host "Browser aberto! Agora: Cole (Ctrl+V) e clique RUN" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "OK: Migracao pronta" -ForegroundColor Green
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "1. npm run dev" -ForegroundColor White
Write-Host "2. Acesse http://localhost:3000/clinica/financeiro/resultado" -ForegroundColor White
Write-Host "3. DRE deve carregar com dados mock (eh normal - sem transacoes ainda)" -ForegroundColor White
Write-Host ""
