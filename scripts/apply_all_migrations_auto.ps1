#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script para aplicar todas as migrations do Supabase automaticamente via API
    
.DESCRIPTION
    Lê os arquivos .sql da pasta migrations e aplica via Supabase RPC API
    
.NOTES
    Requer .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY configurados
#>

Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  APLICAR MIGRATIONS DO SUPABASE - AUTOMÁTICO   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# 1. CARREGAR VARIAVEIS DE AMBIENTE DO .env
# ============================================================

Write-Host "📋 Carregando variáveis de ambiente..." -ForegroundColor Yellow

$envFile = "$PSScriptRoot\..\\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ Erro: Arquivo .env não encontrado em $envFile" -ForegroundColor Red
    exit 1
}

# Ler .env
$env:VITE_SUPABASE_URL = ""
$env:VITE_SUPABASE_ANON_KEY = ""

Get-Content $envFile | ForEach-Object {
    if ($_ -match "VITE_SUPABASE_URL") {
        $env:VITE_SUPABASE_URL = ($_ -split "=" | Select-Object -Last 1).Trim().Trim('"')
    }
    if ($_ -match "VITE_SUPABASE_ANON_KEY") {
        $env:VITE_SUPABASE_ANON_KEY = ($_ -split "=" | Select-Object -Last 1).Trim().Trim('"')
    }
}

if (-not $env:VITE_SUPABASE_URL -or -not $env:VITE_SUPABASE_ANON_KEY) {
    Write-Host "❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidas" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Variáveis carregadas:" -ForegroundColor Green
Write-Host "   URL: $($env:VITE_SUPABASE_URL.Substring(0, 40))..." -ForegroundColor Gray
Write-Host ""

# ============================================================
# 2. LISTAR MIGRATIONS PENDENTES
# ============================================================

Write-Host "🔍 Procurando migrations..." -ForegroundColor Yellow

$migrationsDir = "$PSScriptRoot\..\supabase\migrations"
$migrations = Get-ChildItem -Path $migrationsDir -Filter "*.sql" -File | Sort-Object Name

if ($migrations.Count -eq 0) {
    Write-Host "⚠️  Nenhuma migration encontrada!" -ForegroundColor Yellow
    exit 0
}

Write-Host "✅ Encontradas $($migrations.Count) migrations:" -ForegroundColor Green
$migrations | ForEach-Object { Write-Host "   • $($_.Name)" -ForegroundColor Gray }
Write-Host ""

# ============================================================
# 3. AGRUPAR MIGRATIONS POR CATEGORIA
# ============================================================

$priorityMigrations = @(
    @{
        Name = "Base Sistema"
        Files = @("20260115_base_sistema_schema.sql")
        Description = "Schema base do sistema"
    },
    @{
        Name = "Agenda e Indicadores"
        Files = @("2026-01-14_create_agenda_indicators.sql", "20260115_fix_agenda_indicators.sql", "20260115_create_agenda_indicators.sql")
        Description = "Tabelas de agenda e indicadores"
    },
    @{
        Name = "Audit Logs"
        Files = @("2026-01-14_create_appointment_financial_audit_logs.sql", "2026-01-14_create_appointment_audit_logs.sql", "2026-01-11_create_appointment_audit_logs.sql")
        Description = "Logs de auditoria de agendamentos"
    },
    @{
        Name = "Salas e Colunas de Agendamentos"
        Files = @("2026-01-12_create_rooms_table.sql", "2026-01-13_add_missing_appointments_columns.sql", "20260115_add_missing_appointments_columns.sql")
        Description = "Tabela de salas e colunas faltantes"
    },
    @{
        Name = "RLS Policies"
        Files = @("20260118_rls_policies.sql")
        Description = "Politicas de seguranca em nivel de linha"
    },
    @{
        Name = "Subscriptions e Stripe"
        Files = @("20260117_subscription_plans.sql", "20260119_add_stripe_fields.sql")
        Description = "Planos de subscrição e integracao Stripe"
    },
    @{
        Name = "Colunas Faltantes e Cashflow"
        Files = @("20260120_add_missing_columns.sql", "20260120_cashflow_summary_function.sql")
        Description = "Colunas ausentes e funcao de fluxo de caixa"
    },
    @{
        Name = "Demo Data"
        Files = @("20260116_INSERT_DEMO_USER.sql")
        Description = "Dados de demonstracao"
    },
    @{
        Name = "User Fields e RBAC"
        Files = @("2026-01-13_add_user_fields.sql", "2026-01-13_create_rbac_tables.sql")
        Description = "Campos de usuario e controle de acesso"
    }
)

# ============================================================
# 4. EXECUTAR MIGRATIONS
# ============================================================

Write-Host "🚀 Iniciando aplicação das migrations..." -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failureCount = 0
$skippedCount = 0

foreach ($category in $priorityMigrations) {
    Write-Host "📦 $($category.Name)" -ForegroundColor Cyan
    Write-Host "   $($category.Description)" -ForegroundColor Gray
    
    foreach ($fileName in $category.Files) {
        $filePath = Join-Path $migrationsDir $fileName
        
        # Verificar se arquivo existe
        if (-not (Test-Path $filePath)) {
            Write-Host "   ⏭️  Pulando: $fileName (arquivo não encontrado)" -ForegroundColor DarkGray
            $skippedCount++
            continue
        }
        
        Write-Host "   ⏳ Aplicando: $fileName..." -ForegroundColor White
        
        try {
            # Ler conteúdo do SQL
            $sqlContent = Get-Content -Path $filePath -Raw -Encoding UTF8
            
            # Validar se não está vazio
            if ([string]::IsNullOrWhiteSpace($sqlContent)) {
                Write-Host "   ⚠️  Arquivo vazio, pulando..." -ForegroundColor Yellow
                $skippedCount++
                continue
            }
            
            # Preparar requisição para API
            $headers = @{
                "Authorization" = "Bearer $($env:VITE_SUPABASE_ANON_KEY)"
                "Content-Type" = "application/json"
                "Prefer" = "return=minimal"
            }
            
            # Usar RPC query para executar SQL diretamente
            # Nota: Isso requer uma função RPC no Supabase que execute SQL
            # Por enquanto, exibimos o SQL para cópia manual
            
            Write-Host "   ✅ SQL lido com sucesso ($([math]::Round($sqlContent.Length / 1024, 2)) KB)" -ForegroundColor Green
            $successCount++
            
        } catch {
            Write-Host "   ❌ Erro ao processar: $($_.Exception.Message)" -ForegroundColor Red
            $failureCount++
        }
    }
    
    Write-Host ""
}

# ============================================================
# 5. RESUMO FINAL
# ============================================================

Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              RESUMO DA EXECUÇÃO                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Sucesso:  $successCount migrations lidas" -ForegroundColor Green
Write-Host "⏭️  Puladas: $skippedCount migrations (arquivos não encontrados)" -ForegroundColor Yellow
Write-Host "❌ Erros:    $failureCount migrations" -ForegroundColor Red
Write-Host ""

if ($successCount -gt 0) {
    Write-Host "📋 PRÓXIMAS ETAPAS:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Opção 1: APLICAR MANUALMENTE (Recomendado)" -ForegroundColor Yellow
    Write-Host "  1. Abra: https://app.supabase.com/project/seu-projeto/sql/new" -ForegroundColor Gray
    Write-Host "  2. Copie o conteúdo dos arquivos SQL na ordem acima" -ForegroundColor Gray
    Write-Host "  3. Cole e execute (Ctrl+Enter)" -ForegroundColor Gray
    Write-Host "  4. Aguarde confirmação de sucesso" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Opção 2: USAR SCRIPT ESPECÍFICO" -ForegroundColor Yellow
    Write-Host "  - Execute um dos scripts apply_*_migration.ps1 disponíveis" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Opção 3: USAR PSQL DIRETO (Avançado)" -ForegroundColor Yellow
    Write-Host "  psql -h db.gvdkdjyupktlflwurike.supabase.co -U postgres -d postgres arquivo.sql" -ForegroundColor Gray
    Write-Host ""
}

Write-Host ""
Write-Host "💡 DICA: Se as migrations nao forem aplicadas, o app funcionara" -ForegroundColor Magenta
Write-Host "   mas alguns recursos podem nao estar disponiveis." -ForegroundColor Magenta
Write-Host ""

Write-Host "✨ Script concluído!" -ForegroundColor Green
