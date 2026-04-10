# Script para aplicar a migration de Prontuário
# Execute este conteúdo no SQL Editor do Supabase

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  MIGRATION: Add Prontuario Field" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "INSTRUCOES:" -ForegroundColor Yellow
Write-Host "1. Abra o Supabase Dashboard" -ForegroundColor White
Write-Host "2. Va em SQL Editor" -ForegroundColor White
Write-Host "3. Copie e execute o conteudo abaixo:" -ForegroundColor White
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Get-Content "c:\Users\ferna\Desktop\Projeto Gesclinic Web\supabase\migrations\20260114_add_prontuario_field.sql"
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "APOS APLICAR:" -ForegroundColor Yellow
Write-Host "- Crie um novo paciente" -ForegroundColor White
Write-Host "- Um número de prontuário será gerado automaticamente (ex: GESCL-1001)" -ForegroundColor White
Write-Host "- O número será único por clínica" -ForegroundColor White
Write-Host "- Ele aparecerá no header da página do paciente" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
