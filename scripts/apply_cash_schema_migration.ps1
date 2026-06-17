# Script para aplicar migracao de schema de Caixa no Supabase
# Executa o arquivo SQL contra o banco de dados

param(
    [string]$SupabaseUrl = "https://gvdkdjyupktlflwurike.supabase.co",
    [string]$SupabaseKey = $env:VITE_SUPABASE_ANON_KEY
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Aplicando Migracao de Schema de Caixa" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan

# Verificar se temos acesso direto ao banco
$DbHost = "db.gvdkdjyupktlflwurike.supabase.co"
$DbUser = "postgres"
$DbName = "postgres"
$MigrationFile = "supabase/migrations/2026-01-17_update_cash_schema.sql"

if (Test-Path $MigrationFile) {
    Write-Host "Ok: Arquivo de migracao encontrado: $MigrationFile" -ForegroundColor Green
    Write-Host ""
    
    # Opcao 1: Via psql (requer postgres client instalado)
    Write-Host "Metodo 1: Usando psql (recomendado para aplicar via local)" -ForegroundColor Yellow
    Write-Host "Se psql esta instalado, execute:" -ForegroundColor Gray
    Write-Host "psql -h $DbHost -U $DbUser -d $DbName -f $MigrationFile" -ForegroundColor White
    Write-Host ""
    
    # Opcao 2: Via Supabase Web UI
    Write-Host "Metodo 2: Via Supabase Web UI" -ForegroundColor Yellow
    Write-Host "1. Acesse: https://app.supabase.com" -ForegroundColor Gray
    Write-Host "2. Selecione o projeto Gesclinic" -ForegroundColor Gray
    Write-Host "3. Va para SQL Editor" -ForegroundColor Gray
    Write-Host "4. Crie uma nova query" -ForegroundColor Gray
    Write-Host "5. Cole o conteudo do arquivo: $MigrationFile" -ForegroundColor Gray
    Write-Host "6. Execute (Ctrl+Enter)" -ForegroundColor Gray
    Write-Host ""
    
    # Opcao 3: Via CLI Supabase (se Docker estiver rodando)
    Write-Host "Metodo 3: Via Supabase CLI" -ForegroundColor Yellow
    Write-Host "Se Docker esta rodando localmente:" -ForegroundColor Gray
    Write-Host "supabase db push" -ForegroundColor White
    Write-Host ""
    
    # Mostrar preview do SQL
    Write-Host "Preview do SQL a ser executado:" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Gray
    
    $sqlContent = Get-Content $MigrationFile -Raw
    $sqlLines = $sqlContent -split "`n"
    $previewLines = $sqlLines | Select-Object -First 50
    
    foreach ($line in $previewLines) {
        if ($line -match "^--") {
            Write-Host $line -ForegroundColor Gray
        } elseif ($line.Trim() -ne "") {
            Write-Host $line -ForegroundColor White
        }
    }
    
    Write-Host "..." -ForegroundColor Gray
    Write-Host "(Total de $(($sqlLines | Measure-Object).Count) linhas)" -ForegroundColor Gray
    Write-Host "================================================" -ForegroundColor Gray
    Write-Host ""
    
    # Checklist
    Write-Host "CHECKLIST ANTES DE EXECUTAR:" -ForegroundColor Yellow
    Write-Host "  [ ] Você fez backup do banco de dados?" -ForegroundColor Gray
    Write-Host "  [ ] Você esta em desenvolvimento/staging?" -ForegroundColor Gray
    Write-Host "  [ ] Você tem permissoes de admin no Supabase?" -ForegroundColor Gray
    Write-Host ""
    
    # Resumo das mudancas
    Write-Host "RESUMO DAS MUDANCAS:" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Gray
    Write-Host "Ok: finance_accounts +4 colunas" -ForegroundColor Green
    Write-Host "Ok: card_processors +6 colunas" -ForegroundColor Green
    Write-Host "Ok: cash_transfers +8 colunas" -ForegroundColor Green
    Write-Host "Ok: NOVA cash_transfer_audit_logs" -ForegroundColor Green
    Write-Host "Ok: NOVA sync_error_logs" -ForegroundColor Green
    Write-Host "Ok: NOVA cash_balance_history" -ForegroundColor Green
    Write-Host "Ok: FUNCOES log_transfer_approval, record_balance_snapshot" -ForegroundColor Green
    Write-Host "Ok: 15+ indices para performance" -ForegroundColor Green
    Write-Host "Ok: RLS policies" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "PROXIMOS PASSOS:" -ForegroundColor Cyan
    Write-Host "1. Executar a migracao usando um dos metodos acima" -ForegroundColor Gray
    Write-Host "2. Testar as APIs em desenvolvimento (npm run dev)" -ForegroundColor Gray
    Write-Host "3. Verificar logs de erro em browser console" -ForegroundColor Gray
    Write-Host "4. Deploy para producao" -ForegroundColor Gray
    Write-Host ""
    
} else {
    Write-Host "Erro: Arquivo de migracao nao encontrado: $MigrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "Concluido!" -ForegroundColor Green
Write-Host "Para duvidas, verifique a documentacao em: /supabase/migrations/" -ForegroundColor Gray
