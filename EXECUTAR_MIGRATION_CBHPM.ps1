#!/usr/bin/env powershell
# ============================================================
# ATIVAR TABELA CBHPM NO SUPABASE - SCRIPT AUTOMATIZADO
# ============================================================

Write-Host "`n╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  MIGRAÇÃO CBHPM - EXECUTAR AGORA           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# 1. Ler o arquivo SQL
$sqlFile = "supabase/migrations/20260216_create_cbhpm_table.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ ERRO: Arquivo não encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Arquivo SQL encontrado: $sqlFile`n" -ForegroundColor Green

# 2. Ler conteúdo
$sqlContent = Get-Content $sqlFile -Raw

Write-Host "📋 Instruções para Executar no Supabase:`n" -ForegroundColor Yellow

Write-Host "1️⃣  Abra: https://app.supabase.com" -ForegroundColor Cyan
Write-Host "2️⃣  Selecione seu projeto 'gesclinic'" -ForegroundColor Cyan
Write-Host "3️⃣  Vá para: SQL Editor" -ForegroundColor Cyan
Write-Host "4️⃣  Clique: New Query" -ForegroundColor Cyan
Write-Host "5️⃣  Cole o SQL abaixo:" -ForegroundColor Cyan
Write-Host "6️⃣  Clique: Run (ou Ctrl+Enter)" -ForegroundColor Cyan
Write-Host "7️⃣  Aguarde a execução`n" -ForegroundColor Cyan

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                    SQL PARA COPIAR                    ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Magenta

Write-Host $sqlContent -ForegroundColor White

Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ SQL COPIADO PARA A ÁREA DE TRANSFERÊNCIA          ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

# Copiar para clipboard
$sqlContent | Set-Clipboard

Write-Host "🎯 Próximos passos:" -ForegroundColor Yellow
Write-Host "  1. Abra Supabase Dashboard" -ForegroundColor Gray
Write-Host "  2. Cole o SQL (Ctrl+V)" -ForegroundColor Gray
Write-Host "  3. Execute" -ForegroundColor Gray
Write-Host "  4. Verifique se as tabelas foram criadas" -ForegroundColor Gray
Write-Host "  5. Recarregue a página da web`n" -ForegroundColor Gray

Write-Host "Para copiar novamente, rode este script de novo." -ForegroundColor Gray
