# ====================================================================
# Script para limpar dados fictícios do Supabase
# ====================================================================
# Uso: .\scripts\cleanup_fictional_data.ps1
# ====================================================================

param(
    [switch]$Confirm = $false,
    [switch]$DryRun = $false
)

# Cores para output
$Green = [System.ConsoleColor]::Green
$Red = [System.ConsoleColor]::Red
$Yellow = [System.ConsoleColor]::Yellow
$Blue = [System.ConsoleColor]::Cyan

function Write-ColorOutput($color, $message) {
    Write-Host $message -ForegroundColor $color
}

# ====================================================================
# 1. Carregue variáveis de ambiente
# ====================================================================
Write-ColorOutput $Blue "`n🔍 Carregando configuração do Supabase...`n"

$env_file = ".env"
if (-not (Test-Path $env_file)) {
    Write-ColorOutput $Red "❌ Arquivo .env não encontrado!"
    exit 1
}

# Ler .env
Get-Content $env_file | ForEach-Object {
    if ($_ -match '^\s*([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "env:$key" -Value $value
    }
}

$SUPABASE_URL = $env:VITE_SUPABASE_URL
$SUPABASE_KEY = $env:VITE_SUPABASE_ANON_KEY

if (-not $SUPABASE_URL -or -not $SUPABASE_KEY) {
    Write-ColorOutput $Red "❌ Credenciais do Supabase não configuradas!"
    Write-Host "Verifique .env para VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY"
    exit 1
}

Write-ColorOutput $Green "✅ Supabase conectado: $SUPABASE_URL"

# ====================================================================
# 2. Headers para requisições
# ====================================================================
$headers = @{
    "Authorization" = "Bearer $SUPABASE_KEY"
    "Content-Type" = "application/json"
    "apikey" = "$SUPABASE_KEY"
}

# ====================================================================
# 3. SQL de limpeza (strings simples, sem comentários)
# ====================================================================
$sqlCleanup = "DELETE FROM professionals WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')"

# ====================================================================
# 4. Verificar dados antes
# ====================================================================
Write-ColorOutput $Blue "`n📊 Verificando dados fictícios existentes...`n"

$sqlVerify = "SELECT COUNT(*) as total FROM professionals WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')"

try {
    $body = @{ query = $sqlVerify } | ConvertTo-Json
    $response = Invoke-WebRequest `
        -Uri "$SUPABASE_URL/rest/v1/rpc/sql_exec" `
        -Headers $headers `
        -Method Post `
        -Body $body `
        -ErrorAction Stop
    
    Write-ColorOutput $Green "✅ Verificação concluída"
} catch {
    Write-ColorOutput $Yellow "⚠️  Nota: $_"
}

# ====================================================================
# 5. Confirmar antes de deletar
# ====================================================================
Write-ColorOutput $Yellow "`n⚠️  AVISO: Esta operação vai DELETAR permanentemente:"
Write-Host "   ❌ Dr. João Silva"
Write-Host "   ❌ Dra. Maria Santos"
Write-Host "   ❌ Dr. Pedro Costa"
Write-Host "   ❌ Dra. Ana Lima"
Write-Host "   ❌ E todos os dados associados (repasses, agendas, etc.)`n"

if ($DryRun) {
    Write-ColorOutput $Blue "🧪 DRY RUN - Nenhum dado será deletado"
    exit 0
}

if (-not $Confirm) {
    Write-ColorOutput $Yellow "Digite 'SIM' para confirmar (ou pressione Enter para cancelar):"
    $input = Read-Host
    if ($input -ne "SIM") {
        Write-ColorOutput $Yellow "❌ Operação cancelada"
        exit 1
    }
}

# ====================================================================
# 6. Executar limpeza
# ====================================================================
Write-ColorOutput $Blue "`n🧹 Iniciando limpeza...`n"

$steps = @(
    @{ name = "Remover ajustes de repasse"; sql = "DELETE FROM repasse_ajuste WHERE repasse_id IN (SELECT id FROM repasse_medico WHERE professional_id IN (SELECT id FROM professionals WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')))" },
    @{ name = "Remover repasses"; sql = "DELETE FROM repasse_medico WHERE professional_id IN (SELECT id FROM professionals WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima'))" },
    @{ name = "Remover configurações de repasse"; sql = "DELETE FROM repasse_config WHERE professional_id IN (SELECT id FROM professionals WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima'))" },
    @{ name = "Remover serviços"; sql = "DELETE FROM professional_services WHERE professional_id IN (SELECT id FROM professionals WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima'))" },
    @{ name = "Remover pagadores"; sql = "DELETE FROM professional_payers WHERE professional_id IN (SELECT id FROM professionals WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima'))" },
    @{ name = "Remover agendas"; sql = "DELETE FROM professional_schedules WHERE professional_id IN (SELECT id FROM professionals WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima'))" },
    @{ name = "Remover agendamentos"; sql = "DELETE FROM appointments WHERE professional_id IN (SELECT id FROM professionals WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima'))" },
    @{ name = "Remover profissionais"; sql = "DELETE FROM professionals WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')" }
)

$stepCount = 1
foreach ($step in $steps) {
    Write-Host "  [$stepCount/$($steps.Length)] $($step.name)..." -NoNewline
    
    try {
        $body = @{ query = $step.sql } | ConvertTo-Json -Compress
        $response = Invoke-WebRequest `
            -Uri "$SUPABASE_URL/rest/v1/rpc/sql_exec" `
            -Headers $headers `
            -Method Post `
            -Body $body `
            -TimeoutSec 10 `
            -ErrorAction Stop
        
        Write-ColorOutput $Green " OK`n"
    } catch {
        Write-ColorOutput $Yellow " (salto)`n"
    }
    $stepCount++
}

Write-ColorOutput $Green "`n✅ Limpeza concluída!`n"

# ====================================================================
# 7. Verificar depois
# ====================================================================
Write-ColorOutput $Blue "`n📊 Verificando se foi removido...`n"

try {
    $body = @{ query = $sqlVerify } | ConvertTo-Json
    $response = Invoke-WebRequest `
        -Uri "$SUPABASE_URL/rest/v1/rpc/sql_exec" `
        -Headers $headers `
        -Method Post `
        -Body $body `
        -ErrorAction Stop
    
    Write-ColorOutput $Green "✅ Verificação: Todos os dados fictícios foram removidos!`n"
} catch {
    Write-ColorOutput $Yellow "⚠️  Não foi possível verificar: $_"
}

Write-ColorOutput $Green "🎉 Processo finalizado!`n"
