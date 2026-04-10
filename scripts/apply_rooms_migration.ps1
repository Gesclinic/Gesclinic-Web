# Script para aplicar migração de rooms ao Supabase via SQL

# Você precisa:
# 1. Ir para https://app.supabase.com
# 2. Selecionar seu projeto "gvdkdjyupktlflwurike"
# 3. Ir em "SQL Editor"
# 4. Copiar e colar o SQL abaixo e executar

$sqlFile = "c:\Users\ferna\Desktop\Projeto Gesclinic Web\supabase\migrations\2026-01-12_create_rooms_table.sql"
$sql = Get-Content $sqlFile -Raw

Write-Host "SQL para aplicar (copie e cole no Supabase SQL Editor):" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host $sql
Write-Host "========================================================" -ForegroundColor Green
