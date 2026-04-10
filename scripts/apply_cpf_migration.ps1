# Script para aplicar a migração de CPF
# Usa curl para fazer uma requisição ao Supabase SQL Editor via API

$supabaseUrl = "https://gvdkdjyupktlflwurike.supabase.co"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1Mjc1NzcsImV4cCI6MTc2ODIwMzU3N30.e0D4b0MWdCE0E8Z1rSfJN3G3HG5P0rX0M0Y0Z0A0Z0A"

$sql = @"
-- Adicionar coluna CPF à tabela professionals
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS cpf VARCHAR(11);

-- Criar índice para CPF
CREATE INDEX IF NOT EXISTS idx_professionals_cpf ON professionals(cpf);
"@

# Executar a query usando o Supabase REST API
$headers = @{
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
    "Content-Type" = "application/json"
}

try {
    # Tentamos usar uma stored procedure ou RPC, mas vamos usar o método direto
    Write-Host "Aplicando migração de CPF..."
    Write-Host "SQL: $sql"
    Write-Host ""
    Write-Host "NOTA: Execute o SQL acima manualmente no Supabase SQL Editor"
    Write-Host "URL: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new"
}
catch {
    Write-Host "Erro: $_"
}
