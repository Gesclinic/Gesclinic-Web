# Appointment Financial Integration Migration Executor
# Executa as funções RPC para integração de atendimentos com financeiro
# ✅ CORRIGIDO: Agora com DROP IF EXISTS para evitar erro de assinatura duplicada

param(
    [Parameter(Mandatory=$false)]
    [string]$Method = "manual"
)

$WorkspacePath = "c:\Users\ferna\Desktop\Projeto Gesclinic Web"
$MigrationFile = "$WorkspacePath\supabase\migrations\20260405_appointment_financial_integration.sql"

Write-Host "🚀 DEPLOYMENT: Appointment Financial Integration" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANTE: Esta versão inclui DROP IF EXISTS" -ForegroundColor Yellow
Write-Host "   Isso resolve erro: 'function not unique'" -ForegroundColor Yellow
Write-Host ""

# Check migration file exists
if (-not (Test-Path $MigrationFile)) {
    Write-Host "❌ ERRO: Arquivo SQL não encontrado em:" -ForegroundColor Red
    Write-Host $MigrationFile -ForegroundColor Red
    exit 1
}

# Read SQL content
Write-Host "[1] Lendo arquivo SQL de migração..." -ForegroundColor Yellow
$sqlContent = Get-Content $MigrationFile -Raw
$charCount = ($sqlContent | Measure-Object -Character).Characters
Write-Host "✅ SQL carregado ($charCount caracteres)" -ForegroundColor Green
Write-Host ""

Write-Host "[2] Funções RPC que serão criadas/atualizadas:" -ForegroundColor Cyan
Write-Host "   • finalize_appointment_financial(UUID, DECIMAL)" -ForegroundColor Yellow
Write-Host "   • process_appointment_medical_production(UUID, DECIMAL)" -ForegroundColor Yellow
Write-Host "   • calculate_monthly_repasse(UUID, UUID, DATE)" -ForegroundColor Yellow
Write-Host ""

# Copy to clipboard
Write-Host "[3] Copiando SQL para clipboard..." -ForegroundColor Yellow
$sqlContent | Set-Clipboard
Write-Host "✅ SQL copiado para clipboard!" -ForegroundColor Green
Write-Host ""

# Instructions
Write-Host "🔧 COMO APLICAR:" -ForegroundColor Cyan
Write-Host ""
Write-Host "[PASSO 1] Abra o Supabase SQL Editor:" -ForegroundColor White
Write-Host "   👉 https://console.supabase.com/project/gvdkdjyupktlflwurike/sql/new" -ForegroundColor Gray
Write-Host ""
Write-Host "[PASSO 2] Cole o SQL (Ctrl+V) no editor" -ForegroundColor White
Write-Host ""
Write-Host "[PASSO 3] Clique RUN ou pressione Ctrl+Enter" -ForegroundColor White
Write-Host ""
Write-Host "[PASSO 4] Aguarde (2-5 segundos)" -ForegroundColor White
Write-Host ""
Write-Host "[PASSO 5] Se der sucesso, voltamos no terminal ✅" -ForegroundColor White
Write-Host ""

$response = Read-Host "Abrir Supabase SQL Editor agora? (S/N)"
if ($response -eq "S" -or $response -eq "s") {
    Write-Host ""
    Write-Host "🌐 Abrindo browser..." -ForegroundColor Yellow
    Start-Process "https://console.supabase.com/project/gvdkdjyupktlflwurike/sql/new"
    Start-Sleep -Seconds 2
    Write-Host "✅ Browser aberto!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⏳ AGUARDANDO..." -ForegroundColor Cyan
    Write-Host "   Cole (Ctrl+V) → Clique RUN → Aguarde sucesso" -ForegroundColor White
    Write-Host ""
    pause
}

Write-Host ""
Write-Host "✅ APÓS APLICAR NO SUPABASE:" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "1. npm run dev" -ForegroundColor White
Write-Host "2. Acesse http://localhost:3000/clinica/agenda" -ForegroundColor White
Write-Host "3. Crie novo atendimento de teste" -ForegroundColor White
Write-Host "4. Faça check-in do paciente" -ForegroundColor White
Write-Host "5. Clique '🟢 Liberar para Atendimento'" -ForegroundColor White
Write-Host "6. Verifique Contas a Receber (deve ter novo registro!)" -ForegroundColor White
Write-Host ""
Write-Host "✅ SE FUNCIONAR:" -ForegroundColor Green
Write-Host "   • Valor > R$ 0.00" -ForegroundColor Green
Write-Host "   • Nome do paciente na descrição" -ForegroundColor Green
Write-Host "   • Status 'open'" -ForegroundColor Green
Write-Host ""
Write-Host "❌ SE DER ERRO:" -ForegroundColor Red
Write-Host "   • Copie a mensagem de erro" -ForegroundColor Red
Write-Host "   • Procure em: ⚡_FIX_INFORMACOES_FALTANDO_AR.md" -ForegroundColor Red
Write-Host ""
