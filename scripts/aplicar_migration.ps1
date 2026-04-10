#!/usr/bin/env pwsh

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "AUDITORIA FINANCEIRA - APLICAR MIGRATION" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar ambiente
$supabaseUrl = $env:VITE_SUPABASE_URL
$supabaseKey = $env:VITE_SUPABASE_ANON_KEY

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Host "ERRO: Variaveis de ambiente nao configuradas" -ForegroundColor Red
    Write-Host ""
    Write-Host "Configure no seu .env:" -ForegroundColor Yellow
    Write-Host "  VITE_SUPABASE_URL=https://seu-projeto.supabase.co" -ForegroundColor Gray
    Write-Host "  VITE_SUPABASE_ANON_KEY=sua-chave-anonima" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "Variaveis de ambiente OK!" -ForegroundColor Green
Write-Host ""

# Passos para aplicar
Write-Host "PASSOS PARA APLICAR A MIGRATION:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Abra o Supabase Console:" -ForegroundColor Cyan
Write-Host "   https://app.supabase.com/project/seu-projeto/sql/new" -ForegroundColor Green
Write-Host ""
Write-Host "2. Copie o conteudo do arquivo:" -ForegroundColor Cyan
Write-Host "   ./supabase/migrations/2026-01-14_create_appointment_financial_audit_logs.sql" -ForegroundColor Green
Write-Host ""
Write-Host "3. Cole no editor SQL do Supabase" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Clique em 'Run' (ou Ctrl+Enter)" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Aguarde a mensagem de sucesso" -ForegroundColor Cyan
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tempo estimado: 30 segundos" -ForegroundColor Magenta
Write-Host ""

# Opcao de copiar arquivo
Write-Host "Deseja que eu copie o arquivo para o clipboard?" -ForegroundColor Cyan -NoNewline
Write-Host " (S/n): " -ForegroundColor Cyan -NoNewline
$confirm = Read-Host

if ($confirm -ne "n") {
    $migrationFile = ".\supabase\migrations\2026-01-14_create_appointment_financial_audit_logs.sql"
    if (Test-Path $migrationFile) {
        Get-Content $migrationFile | Set-Clipboard
        Write-Host ""
        Write-Host "SUCESSO! Migration copiada para a area de transferencia!" -ForegroundColor Green
        Write-Host ""
    }
}

Write-Host "Proximos passos apos aplicar a migration:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Teste se a tabela foi criada:" -ForegroundColor Cyan
Write-Host "   SELECT * FROM appointment_financial_audit_logs LIMIT 1;" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Teste a insercao de um log:" -ForegroundColor Cyan
Write-Host "   INSERT INTO appointment_financial_audit_logs (...)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Teste se UPDATE e bloqueado:" -ForegroundColor Cyan
Write-Host "   UPDATE appointment_financial_audit_logs SET amount = 0;" -ForegroundColor Gray
Write-Host "   (Deve retornar erro)" -ForegroundColor Gray
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Implementacao pronta! Comece a usar agora!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
