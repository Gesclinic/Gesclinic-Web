#!/usr/bin/env pwsh
# Script para copiar migração SQL para clipboard e exibir instrucoes

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Assistente de Migracao Supabase" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

$MigrationFile = "supabase/migrations/2026-01-17_update_cash_schema.sql"

if (-not (Test-Path $MigrationFile)) {
    Write-Host "Erro: Arquivo nao encontrado: $MigrationFile" -ForegroundColor Red
    exit 1
}

# Ler conteúdo
$sqlContent = Get-Content $MigrationFile -Raw

# Copiar para clipboard
$sqlContent | Set-Clipboard

Write-Host "Ok: SQL copiado para clipboard!" -ForegroundColor Green
Write-Host ""

Write-Host "Instrucoes Rapidas:" -ForegroundColor Yellow
Write-Host "1. Abra: https://app.supabase.com" -ForegroundColor Gray
Write-Host "2. Clique no seu projeto" -ForegroundColor Gray
Write-Host "3. Vá para: SQL Editor (menu esquerdo)" -ForegroundColor Gray
Write-Host "4. Clique em: + New Query" -ForegroundColor Gray
Write-Host "5. Cole o SQL: Ctrl+V" -ForegroundColor Gray
Write-Host "6. Execute: Ctrl+Enter ou clique Run" -ForegroundColor Gray
Write-Host "7. Aguarde a conclusao" -ForegroundColor Gray
Write-Host ""

Write-Host "Validacoes apos executar:" -ForegroundColor Cyan
Write-Host "1. Verifique se as colunas foram criadas" -ForegroundColor Gray
Write-Host "2. Abra o arquivo: SUPABASE_MIGRATION_GUIDE.md" -ForegroundColor Gray
Write-Host "3. Execute as queries de validacao fornecidas" -ForegroundColor Gray
Write-Host ""

Write-Host "Status: SQL pronto na clipboard!" -ForegroundColor Green
Write-Host "Tamanho: $([math]::Round($sqlContent.Length / 1024, 2)) KB" -ForegroundColor Gray
Write-Host "Linhas: $(($sqlContent -split "`n").Count)" -ForegroundColor Gray
