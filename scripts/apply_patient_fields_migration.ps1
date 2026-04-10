# Script para aplicar a migration de campos de pacientes
# Execute este conteúdo no SQL Editor do Supabase

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  MIGRATION: Add Patient Fields" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "INSTRUCOES:" -ForegroundColor Yellow
Write-Host "1. Abra o Supabase Dashboard" -ForegroundColor White
Write-Host "2. Va em SQL Editor" -ForegroundColor White
Write-Host "3. Copie e execute o conteudo abaixo:" -ForegroundColor White
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Get-Content "c:\Users\ferna\Desktop\Projeto Gesclinic Web\supabase\migrations\20260114_add_patient_fields.sql"
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "APOS APLICAR:" -ForegroundColor Yellow
Write-Host "- Navegue para http://localhost:3000/clinica/pacientes/novo" -ForegroundColor White
Write-Host "- Tente criar um novo paciente" -ForegroundColor White
Write-Host "- Os campos cell_phone, street, number, neighborhood devem estar disponiveis" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
