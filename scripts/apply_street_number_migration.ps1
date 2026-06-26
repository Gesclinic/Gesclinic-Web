# Script para executar migration via Supabase API REST
# Uso: .\scripts\apply_street_number_migration.ps1

$ErrorActionPreference = "Stop"

# Load .env
$envPath = "$(pwd)\.env"
if (-not (Test-Path $envPath)) {
    Write-Host "❌ Erro: .env não encontrado"
    exit 1
}

# Parse .env
Get-Content $envPath | ForEach-Object {
    if ($_ -match '^\s*([^=]+)=(.+)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"')
        [Environment]::SetEnvironmentVariable($name, $value)
    }
}

$SUPABASE_URL = [Environment]::GetEnvironmentVariable("VITE_SUPABASE_URL")
$SUPABASE_ANON_KEY = [Environment]::GetEnvironmentVariable("VITE_SUPABASE_ANON_KEY")

if (-not $SUPABASE_URL) {
    Write-Host "❌ Erro: VITE_SUPABASE_URL não encontrada no .env"
    exit 1
}

# SQL para executar
$SQL = @"
ALTER TABLE public.stock_suppliers
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS number TEXT;

COMMENT ON COLUMN public.stock_suppliers.street IS 'Rua/Logradouro do fornecedor (extraído do endereço ou XML)';
COMMENT ON COLUMN public.stock_suppliers.number IS 'Número do logradouro';
COMMENT ON COLUMN public.stock_suppliers.address IS 'Endereço completo - Mantido para compatibilidade legada';
"@

Write-Host "`n🚀 Executando migration via Supabase Dashboard SQL Editor..."
Write-Host "   Você precisará fazer isso manualmente."
Write-Host "`n📋 SQL a executar:"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host $SQL
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

Write-Host "`n📌 Passos:"
Write-Host "1. Abra: https://app.supabase.com/project/gvdkdjyupktlflwurike/sql"
Write-Host "2. Clique em 'New Query'"
Write-Host "3. Cole o SQL acima"
Write-Host "4. Clique em 'RUN'"
Write-Host "5. Volte aqui e pressione Enter..."

$null = Read-Host "`n⏳ Pressione Enter depois de executar a SQL no Supabase"

Write-Host "`n✅ Ok! Agora o código está pronto."
Write-Host "   • npm run dev"
Write-Host "   • Teste XML import em Contas a Pagar > Fornecedores"
