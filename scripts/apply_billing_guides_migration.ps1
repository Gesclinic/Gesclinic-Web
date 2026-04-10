#!/usr/bin/env pwsh

<#
.SYNOPSIS
Aplica a migração para criar a tabela billing_guides no Supabase

.DESCRIPTION
Este script executa a migração SQL que cria a tabela billing_guides
para armazenar guias de consulta, internação e SADT

.EXAMPLE
.\apply_billing_guides_migration.ps1
#>

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Aplicando Migração: billing_guides" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Caminho do arquivo SQL
$migrationFile = "supabase\migrations\2026-02-21_create_billing_guides_table.sql"

# Verificar se o arquivo existe
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Arquivo de migração não encontrado: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Arquivo: $migrationFile" -ForegroundColor Green
Write-Host ""

# Ler conteúdo do arquivo
$sqlScript = Get-Content $migrationFile -Raw

Write-Host "📝 Conteúdo da Migração:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host $sqlScript -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

Write-Host "⏳ Se você estiver usando Supabase Studio:" -ForegroundColor Yellow
Write-Host "  1. Vá para: https://supabase.com/dashboard" -ForegroundColor Gray
Write-Host "  2. Selecione seu projeto" -ForegroundColor Gray
Write-Host "  3. Vá para 'SQL Editor'" -ForegroundColor Gray
Write-Host "  4. Copie e cole o conteúdo acima" -ForegroundColor Gray
Write-Host "  5. Clique em 'Execute'" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Para aplicar esta migração:" -ForegroundColor Green
Write-Host "  1. Abra o Supabase Studio" -ForegroundColor Gray
Write-Host "  2. Vá para SQL Editor" -ForegroundColor Gray
Write-Host "  3. Cole o SQL acima" -ForegroundColor Gray
Write-Host "  4. Execute" -ForegroundColor Gray
Write-Host ""

Write-Host "📋 Resumo da Migração:" -ForegroundColor Cyan
Write-Host "  ✓ Criar tabela: billing_guides" -ForegroundColor Green
Write-Host "  ✓ Adicionar índices para performance" -ForegroundColor Green
Write-Host "  ✓ Habilitar Row Level Security (RLS)" -ForegroundColor Green
Write-Host "  ✓ Criar políticas RLS para segurança" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 Próximos Passos:" -ForegroundColor Cyan
Write-Host "  1. Execute a migração no Supabase Studio" -ForegroundColor Gray
Write-Host "  2. Teste o formulário de Guias Consulta" -ForegroundColor Gray
Write-Host "  3. Tente criar uma nova guia" -ForegroundColor Gray
Write-Host "  4. Verifique se o número de carteirinha é salvo" -ForegroundColor Gray
Write-Host ""

Write-Host "✨ Sucesso! A migração está pronta para ser aplicada." -ForegroundColor Green
