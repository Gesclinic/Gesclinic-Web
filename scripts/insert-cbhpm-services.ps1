#!/usr/bin/env powershell
# ============================================================
# Script: Inserir CBHPM e Serviços na Base
# Data: 16 de fevereiro de 2026
# Descrição: Executa as migrações para popular dados de CBHPM e Serviços
# ============================================================

Write-Host "🏥 GESCLINIC - Inserir CBHPM e Serviços" -ForegroundColor Cyan
Write-Host "═" * 60 -ForegroundColor Cyan

# Verificar se os arquivos existem
$cbhpmMigration = "supabase/migrations/20260216_insert_cbhpm_procedures.sql"
$servicesMigration = "supabase/migrations/20260216_create_services_from_cbhpm.sql"

if (-not (Test-Path $cbhpmMigration)) {
    Write-Host "❌ Arquivo não encontrado: $cbhpmMigration" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $servicesMigration)) {
    Write-Host "❌ Arquivo não encontrado: $servicesMigration" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 Instruções para executar:" -ForegroundColor Yellow
Write-Host "`n1. Abra o Supabase SQL Editor:"
Write-Host "   🔗 https://app.supabase.com" -ForegroundColor Green
Write-Host "`n2. Selecione seu projeto Gesclinic"
Write-Host "`n3. Copie e execute o conteúdo de:"
Write-Host "   📄 $cbhpmMigration" -ForegroundColor Green
Write-Host "`n4. Depois execute:"
Write-Host "   📄 $servicesMigration" -ForegroundColor Green
Write-Host "`n5. Verifique os resultados com:"
Write-Host "   SELECT COUNT(*) as total_cbhpm FROM cbhpm_procedures WHERE ativo = true;" -ForegroundColor Green
Write-Host "   SELECT COUNT(*) as total_services FROM services WHERE active = true;" -ForegroundColor Green

Write-Host "`n═" * 60 -ForegroundColor Cyan
Write-Host "`n✅ Abra os arquivos de migração para copiar o conteúdo!" -ForegroundColor Green

# Exibir botão para abrir o explorer
$response = Read-Host "`n❓ Deseja abrir a pasta de migrations? (S/N)"
if ($response -eq "S" -or $response -eq "s") {
    Explorer "supabase\migrations"
}
