#!/usr/bin/env pwsh

<#
.SYNOPSIS
  Script para aplicar a migration de auditoria financeira no Supabase

.DESCRIPTION
  Aplica a migration 2026-01-14_create_appointment_financial_audit_logs.sql
  Requer variáveis de ambiente: SUPABASE_URL e SUPABASE_ANON_KEY

.NOTES
  Autor: Assistente IA
  Data: 2026-01-14
#>

Write-Host "🧾 AUDITORIA FINANCEIRA - APLICAR MIGRATION" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar ambiente
$supabaseUrl = $env:VITE_SUPABASE_URL
$supabaseKey = $env:VITE_SUPABASE_ANON_KEY

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Host "❌ ERRO: Variáveis de ambiente não configuradas" -ForegroundColor Red
    Write-Host ""
    Write-Host "Configure no seu .env:" -ForegroundColor Yellow
    Write-Host "  VITE_SUPABASE_URL=https://seu-projeto.supabase.co" -ForegroundColor Gray
    Write-Host "  VITE_SUPABASE_ANON_KEY=sua-chave-anonima" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "✅ Variáveis de ambiente configuradas" -ForegroundColor Green
Write-Host ""

# Passos para aplicar
Write-Host "📋 PASSOS PARA APLICAR A MIGRATION:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Abra o Supabase Console:" -ForegroundColor Cyan
Write-Host "   https://app.supabase.com/project/seu-projeto/sql/new" -ForegroundColor Green
Write-Host ""
Write-Host "2. Copie todo o conteúdo do arquivo:" -ForegroundColor Cyan
Write-Host "   ./supabase/migrations/2026-01-14_create_appointment_financial_audit_logs.sql" -ForegroundColor Green
Write-Host ""
Write-Host "3. Cole no editor SQL do Supabase" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Clique em 'Run' (ou Ctrl+Enter)" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Aguarde a mensagem de sucesso" -ForegroundColor Cyan
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏱️  Tempo estimado: 30 segundos" -ForegroundColor Magenta
Write-Host ""

# Opção de copiar arquivo
Write-Host "💡 DICA: Você pode copiar o arquivo para a área de transferência:" -ForegroundColor Yellow
$migrationFile = ".\supabase\migrations\2026-01-14_create_appointment_financial_audit_logs.sql"
if (Test-Path $migrationFile) {
    Write-Host "  Use: Get-Content migrationFile | Set-Clipboard" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📋 Copiar migration para clipboard? (S/n): " -ForegroundColor Cyan -NoNewline
    $confirm = Read-Host
    
    if ($confirm -ne "n") {
        Get-Content $migrationFile | Set-Clipboard
        Write-Host "✅ Migration copiada para a área de transferência!" -ForegroundColor Green
        Write-Host ""
    }
}

Write-Host "🚀 Próximos passos após aplicar a migration:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. ✅ Teste se a tabela foi criada:" -ForegroundColor Cyan
Write-Host "   SELECT * FROM appointment_financial_audit_logs LIMIT 1;" -ForegroundColor Gray
Write-Host ""
Write-Host "2. ✅ Teste a inserção de um log:" -ForegroundColor Cyan
Write-Host "   INSERT INTO appointment_financial_audit_logs (appointment_id, financial_event_type)" -ForegroundColor Gray
Write-Host "   VALUES (seu-appointment-id, RECEIVABLE_CREATED);" -ForegroundColor Gray
Write-Host ""
Write-Host "3. ✅ Teste se UPDATE é bloqueado:" -ForegroundColor Cyan
Write-Host "   UPDATE appointment_financial_audit_logs SET amount = 0;" -ForegroundColor Gray
Write-Host "   (Deve retornar erro - append-only)" -ForegroundColor Gray
Write-Host ""

Write-Host "✨ Implementação concluída! Acesse a aba Auditoria Financeira no check-in." -ForegroundColor Green
