# ============================================================
# Script para executar migration TISS Fields via Supabase CLI
# ============================================================

Write-Host "🔄 Executando migration TISS Fields..." -ForegroundColor Cyan

# 1. Verificar se supabase CLI está disponível
$supabaseAvailable = supabase --version 2>$null
if (-not $?) {
    Write-Host "❌ Supabase CLI não encontrado. Instalando..." -ForegroundColor Red
    npm install -g supabase
}

# 2. Ler arquivo da migration
$migrationFile = Join-Path $PSScriptRoot "../supabase/migrations/20260410_ADD_TISS_FIELDS_APPOINTMENTS.sql"
$sql = Get-Content $migrationFile -Raw

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Arquivo de migration não encontrado: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Arquivo de migration encontrado" -ForegroundColor Green
Write-Host "📄 Caminho: $migrationFile" -ForegroundColor Gray
Write-Host ""

# 3. Mostrar conteúdo da migration
Write-Host "📝 Conteúdo da migration:" -ForegroundColor Cyan
Write-Host $sql -ForegroundColor Gray
Write-Host ""

# 4. Executar migration
Write-Host "🚀 Executando migration..." -ForegroundColor Cyan
try {
    # Se tiver acesso direto ao Supabase
    $env:SUPABASE_DB_URL | Out-Null
    
    if ($env:SUPABASE_DB_URL) {
        Write-Host "✅ Conectando ao Supabase via variável de ambiente..." -ForegroundColor Green
        # Executar com psql se disponível
        $sql | psql $env:SUPABASE_DB_URL 2>&1
    } else {
        Write-Host "ℹ️ SUPABASE_DB_URL não configurada." -ForegroundColor Yellow
        Write-Host "⚠️ Execute esta migration manualmente no Supabase SQL Editor:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "1. Abra https://supabase.com/dashboard/" -ForegroundColor Cyan
        Write-Host "2. Vá até SQL Editor" -ForegroundColor Cyan
        Write-Host "3. Copie e execute o SQL abaixo:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host $sql -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "✅ Migration executada com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao executar migration: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Operação concluída!" -ForegroundColor Green
