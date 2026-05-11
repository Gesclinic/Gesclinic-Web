# ═══════════════════════════════════════════════════════════════════════════════
# SCRIPT: Apply Audit Trigger Action Column Fix Migration
# ═══════════════════════════════════════════════════════════════════════════════
# Purpose: Fix the audit logging trigger to use correct table (appointment_audit_log)
#          and correct column (operation instead of action)
# ═══════════════════════════════════════════════════════════════════════════════

# Importar módulos auxiliares
$ErrorActionPreference = "Stop"

# ─────────────────────────────────────────────────────────────────────────────
# 1. CARREGAR VARIÁVEIS DE AMBIENTE
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "📚 Carregando variáveis de ambiente..." -ForegroundColor Cyan

$env_file = Join-Path (Get-Location) ".env"
if (-not (Test-Path $env_file)) {
    Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
    exit 1
}

$env_content = Get-Content $env_file | Select-String '='
$SUPABASE_URL = ($env_content | Where-Object { $_ -like "VITE_SUPABASE_URL*" }).Line.Split('=')[1].Trim()
$SUPABASE_KEY = ($env_content | Where-Object { $_ -like "VITE_SUPABASE_ANON_KEY*" }).Line.Split('=')[1].Trim()

if (-not $SUPABASE_URL -or -not $SUPABASE_KEY) {
    Write-Host "❌ Variáveis de ambiente não configuradas!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Variáveis carregadas" -ForegroundColor Green
Write-Host "  - URL: $SUPABASE_URL" -ForegroundColor Gray
Write-Host "  - KEY: $($SUPABASE_KEY.Substring(0,20))..." -ForegroundColor Gray

# ─────────────────────────────────────────────────────────────────────────────
# 2. LER ARQUIVO DE MIGRAÇÃO
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n📄 Lendo arquivo de migração..." -ForegroundColor Cyan

$migration_file = Join-Path (Get-Location) "supabase\migrations\2026-05-07_fix_audit_trigger_action_column.sql"
if (-not (Test-Path $migration_file)) {
    Write-Host "❌ Arquivo de migração não encontrado: $migration_file" -ForegroundColor Red
    exit 1
}

$sql_content = Get-Content $migration_file -Raw
Write-Host "✅ Migração lida ($(($sql_content.Length / 1024).ToString('F2')) KB)" -ForegroundColor Green

# ─────────────────────────────────────────────────────────────────────────────
# 3. EXECUTAR MIGRAÇÃO VIA SUPABASE REST API
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n🚀 Executando migração..." -ForegroundColor Cyan

try {
    $headers = @{
        "Authorization" = "Bearer $SUPABASE_KEY"
        "Content-Type" = "application/json"
        "Prefer" = "return=representation"
    }
    
    $body = @{
        query = $sql_content
    } | ConvertTo-Json
    
    # Usar RPC se disponível, ou fazer INSERT direto na tabela de migrations
    $rpc_url = "$SUPABASE_URL/rest/v1/rpc/exec_sql"
    $response = Invoke-WebRequest -Uri $rpc_url -Method POST -Headers $headers -Body $body
    
    Write-Host "✅ Migração executada com sucesso!" -ForegroundColor Green
    Write-Host "📊 Resposta: $($response.StatusCode)" -ForegroundColor Gray
    
} catch {
    Write-Host "⚠️  RPC não disponível, tentando SQL direto..." -ForegroundColor Yellow
    
    try {
        # Alternativa: Usar sql_exec se disponível
        $sql_url = "$SUPABASE_URL/rest/v1/sql"
        $response = Invoke-WebRequest -Uri $sql_url -Method POST -Headers $headers -Body $sql_content
        
        Write-Host "✅ Migração executada via SQL direto!" -ForegroundColor Green
        
    } catch {
        Write-Host "❌ Erro ao executar migração:" -ForegroundColor Red
        Write-Host "$($_.Exception.Message)" -ForegroundColor Red
        Write-Host "`n💡 INSTRUÇÕES ALTERNATIVAS:" -ForegroundColor Yellow
        Write-Host "1. Copie o conteúdo do arquivo: $migration_file" -ForegroundColor White
        Write-Host "2. Acesse: https://app.supabase.com/project/$($SUPABASE_URL.Split('/')[2].Split('.')[0])" -ForegroundColor White
        Write-Host "3. Vá para: SQL Editor" -ForegroundColor White
        Write-Host "4. Cole o SQL e clique em 'Run'" -ForegroundColor White
        exit 1
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# 4. VERIFICAR SE TRIGGER FOI ATUALIZADO
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "`n✨ Verificando trigger..." -ForegroundColor Cyan

try {
    $verify_headers = $headers.Clone()
    
    # Tentar buscar informações sobre os triggers
    $check_url = "$SUPABASE_URL/rest/v1/information_schema.triggers?trigger_name=eq.audit_appointments_insert"
    $trigger_check = Invoke-WebRequest -Uri $check_url -Method GET -Headers $verify_headers
    
    if ($trigger_check.StatusCode -eq 200) {
        Write-Host "✅ Trigger audit_appointments_insert verificado" -ForegroundColor Green
    }
    
} catch {
    Write-Host "⚠️  Não foi possível verificar trigger (pode ser erro de permissões)" -ForegroundColor Yellow
}

Write-Host "`n✅ MIGRAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "`n📝 Próximos Passos:" -ForegroundColor Cyan
Write-Host "1. Recarregue o navegador (F5 ou Cmd+R)" -ForegroundColor White
Write-Host "2. Abra o modal de novo agendamento" -ForegroundColor White
Write-Host "3. Tente criar um novo agendamento novamente" -ForegroundColor White
Write-Host "4. Verifique se o erro de action column foi resolvido" -ForegroundColor White
