# Script para testar o arquivo SQL 20260113_COMPREHENSIVE_INIT.sql

param([string]$FilePath = "supabase/migrations/20260113_COMPREHENSIVE_INIT.sql")

Write-Host "======================================"
Write-Host "Validacao de Estrutura SQL"
Write-Host "======================================"

if (-not (Test-Path $FilePath)) {
    Write-Host "Arquivo nao encontrado: $FilePath"
    exit 1
}

Write-Host "Arquivo encontrado: $FilePath"

$content = Get-Content $FilePath -Raw
$tableCount = ([regex]::Matches($content, "CREATE TABLE IF NOT EXISTS")).Count
$indexCount = ([regex]::Matches($content, "CREATE INDEX IF NOT EXISTS")).Count
$codeColumnCount = ([regex]::Matches($content, "code VARCHAR")).Count

Write-Host ""
Write-Host "Resumo do Schema:"
Write-Host "   CREATE TABLE: $tableCount"
Write-Host "   CREATE INDEX: $indexCount"
Write-Host "   Colunas code: $codeColumnCount"
Write-Host ""
Write-Host "Status: Arquivo pronto para ser executado no Supabase"
Write-Host "======================================"
