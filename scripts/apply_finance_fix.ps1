#!/usr/bin/env pwsh

# ============================================================
# Script para aplicar migração de correção de views financeiras
# ============================================================

param(
    [string]$SqlFilePath = "supabase\migrations\20260121_fix_finance_views.sql",
    [string]$ProjectPath = "."
)

# Verifica se o arquivo existe
if (-not (Test-Path $SqlFilePath)) {
    Write-Host "❌ Arquivo SQL não encontrado: $SqlFilePath" -ForegroundColor Red
    exit 1
}

# Lê o SQL
$sqlContent = Get-Content $SqlFilePath -Raw

Write-Host "📋 Aplicando migração de correção de views financeiras..." -ForegroundColor Cyan
Write-Host "📁 Arquivo: $SqlFilePath" -ForegroundColor Gray
Write-Host ""

# Tenta aplicar usando Supabase CLI se disponível
if (Get-Command supabase -ErrorAction SilentlyContinue) {
    Write-Host "🔄 Usando Supabase CLI..." -ForegroundColor Yellow
    
    # Se estiver no diretório do projeto
    $currentDir = Get-Location
    if (Test-Path ".supabase") {
        Write-Host "✅ Projeto Supabase detectado" -ForegroundColor Green
        
        # Tenta aplicar via psql (se configured)
        if (Get-Command psql -ErrorAction SilentlyContinue) {
            Write-Host "📡 Aplicando SQL via psql..." -ForegroundColor Cyan
            
            # Ler arquivo .env se existir para pegar credenciais
            $envFile = ".env"
            if (Test-Path $envFile) {
                $envContent = Get-Content $envFile | Where-Object { $_ -match "SUPABASE" }
                Write-Host "📖 Arquivo .env encontrado" -ForegroundColor Gray
            }
            
            # Nota: na prática, o usuário precisa configurar a conexão ao Supabase manualmente
            Write-Host "⚠️  Você precisa aplicar este SQL manualmente no Supabase:" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "1. Acesse: https://app.supabase.com" -ForegroundColor White
            Write-Host "2. Vá para: SQL Editor" -ForegroundColor White
            Write-Host "3. Crie uma nova query" -ForegroundColor White
            Write-Host "4. Cole o conteúdo do arquivo:" -ForegroundColor White
            Write-Host "   $SqlFilePath" -ForegroundColor Cyan
            Write-Host "5. Clique em 'Run'" -ForegroundColor White
            Write-Host ""
            Write-Host "📋 Conteúdo a executar:" -ForegroundColor Cyan
            Write-Host "─" * 60
            Write-Host $sqlContent
            Write-Host "─" * 60
        } else {
            Write-Host "⚠️  psql não encontrado. Execute manualmente no Supabase." -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  Projeto Supabase não detectado neste diretório" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Supabase CLI não instalado" -ForegroundColor Yellow
    Write-Host "📋 Execute este SQL manualmente no Supabase SQL Editor:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host $sqlContent
}

Write-Host ""
Write-Host "✅ Script concluído" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Aplique o SQL no Supabase" -ForegroundColor White
Write-Host "2. Recarregue o navegador (F5)" -ForegroundColor White
Write-Host "3. Verifique os erros no console de desenvolvedor" -ForegroundColor White
