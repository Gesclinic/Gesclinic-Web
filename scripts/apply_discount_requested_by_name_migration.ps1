# Script para aplicar a migração de discount_requested_by_name ao Supabase

# ⚠️ INSTRUCOES MANUAIS - Execute no SQL Editor do Supabase:
# 1. Acesse: https://supabase.com/dashboard/project/_/editor
# 2. Cole o SQL abaixo e execute:

$sql = @"
-- Adicionar campo discount_requested_by_name à tabela appointments
-- Este campo armazena o nome/email de quem solicitou o desconto

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS discount_requested_by_name VARCHAR(255) NULL;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_appointments_discount_requested_by_name 
ON appointments(discount_requested_by_name);

-- Comentar a coluna para documentação
COMMENT ON COLUMN appointments.discount_requested_by_name IS 
'Nome ou email do usuário que solicitou o desconto. Preenchido automaticamente quando discount_requested_by é definido.';
"@

Write-Host "✅ SQL para executar no Supabase SQL Editor:" -ForegroundColor Green
Write-Host ""
Write-Host $sql -ForegroundColor Cyan
Write-Host ""
Write-Host "🔗 URL do Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host "https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql" -ForegroundColor Blue
Write-Host ""
Write-Host "📋 Passos:" -ForegroundColor Green
Write-Host "1. Copie o SQL acima"
Write-Host "2. Abra a URL do Supabase SQL Editor"
Write-Host "3. Cole o SQL no editor"
Write-Host "4. Clique em 'Run'" -ForegroundColor Yellow
Write-Host "5. Aguarde a confirmação de sucesso"
