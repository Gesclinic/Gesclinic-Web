# ============================================================
# Script: Aplicar Migration de Endereços ao Supabase
# Descrição: Adiciona campos de endereço à tabela health_insurances
# Data: 18 de janeiro de 2026
# ============================================================

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Supabase Migration - Campos de Endereço" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Arquivo da migration
$migrationFile = ".\supabase\migrations\20260118_add_address_fields_to_health_insurances.sql"

# Verificar se arquivo existe
if (-Not (Test-Path $migrationFile)) {
    Write-Host "❌ Arquivo de migration não encontrado: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Arquivo de migration encontrado" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Conteúdo da migration:" -ForegroundColor Yellow
Get-Content $migrationFile | Write-Host
Write-Host ""

Write-Host "⚠️  Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Abra o Supabase Dashboard da sua clínica" -ForegroundColor White
Write-Host "2. Vá para SQL Editor" -ForegroundColor White
Write-Host "3. Crie uma nova query" -ForegroundColor White
Write-Host "4. Copie e cole o conteúdo acima" -ForegroundColor White
Write-Host "5. Execute a query" -ForegroundColor White
Write-Host ""
Write-Host "💡 Ou use a CLI:" -ForegroundColor Cyan
Write-Host "   supabase db push" -ForegroundColor Gray
Write-Host ""
Write-Host "✨ Após executar a migration:" -ForegroundColor Green
Write-Host "   - Os campos de endereço estarão disponíveis" -ForegroundColor White
Write-Host "   - O formulário salvará os dados corretamente" -ForegroundColor White
Write-Host "   - Você poderá editar convênios com endereços" -ForegroundColor White
Write-Host ""
