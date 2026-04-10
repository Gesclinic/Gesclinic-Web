# Script para desabilitar arquivos de migração conflitantes
# Uso: .\disable_conflicting_migrations.ps1

Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Desabilitando Migrações Conflitantes" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$migrationsPath = "supabase\migrations"

# Lista de arquivos a desabilitar
$filesToDisable = @(
    "00_CLEAN_AND_INIT.sql",
    "00_COMPLETE_INIT.sql",
    "00_SAFE_INIT.sql",
    "01_CLEAN_AND_CREATE.sql"
)

Write-Host "Arquivos a desabilitar:" -ForegroundColor Yellow
$filesToDisable | ForEach-Object { Write-Host "  • $_" }
Write-Host ""

$disabledCount = 0

foreach ($file in $filesToDisable) {
    $fullPath = Join-Path $migrationsPath $file
    
    if (Test-Path $fullPath) {
        $newName = $file + ".disabled"
        $newPath = Join-Path $migrationsPath $newName
        
        try {
            Rename-Item -Path $fullPath -NewName $newName -ErrorAction Stop
            Write-Host "✅ Desabilitado: $file" -ForegroundColor Green
            $disabledCount++
        }
        catch {
            Write-Host "❌ Erro ao desabilitar $file : $_" -ForegroundColor Red
        }
    }
    else {
        Write-Host "⏭️  Arquivo não encontrado: $file" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Resultado: $disabledCount arquivos desabilitados" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximo passo:" -ForegroundColor Yellow
Write-Host "1. Abra Supabase SQL Editor"
Write-Host "2. Execute: DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
Write-Host "3. Cole e execute: 20260113_COMPREHENSIVE_INIT.sql"
Write-Host ""
