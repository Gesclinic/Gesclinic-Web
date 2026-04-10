# SCRIPT DE LIMPEZA - Deletar todos os agendamentos via API REST Supabase
# 
# Uso: 
#   PowerShell -ExecutionPolicy Bypass -File scripts/clean-appointments.ps1

$ErrorActionPreference = "Stop"

# Configuracao do Supabase
$SUPABASE_URL = "https://gvdkdjyupktlflwurike.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1Mjc1NzcsImV4cCI6MTc2ODIwMzU3N30.e0D4b0MWdCE0E8Z1rSfJN3G3HG5P0rX0M0Y0Z0A0Z0A"
$table = "appointments"

try {
    Write-Host "Deletando todos os registros de $table..." -ForegroundColor Cyan
    Write-Host ""
    
    # Fazer requisicao DELETE usando curl
    # A API REST do Supabase suporta DELETE com filtro vazio para deletar tudo
    $response = curl.exe `
        -X DELETE `
        "$SUPABASE_URL/rest/v1/$table" `
        -H "apikey: $SUPABASE_KEY" `
        -H "Authorization: Bearer $SUPABASE_KEY" `
        -H "Content-Type: application/json" `
        -d "{}" `
        --write-out "%{http_code}" `
        -s
    
    $httpCode = $response[-3..-1] -join ""
    
    if ($httpCode -eq "204" -or $httpCode -eq "200") {
        Write-Host "SUCESSO!" -ForegroundColor Green
        Write-Host "Todos os agendamentos foram deletados" -ForegroundColor Green
        Write-Host ""
        Write-Host "HTTP Status: $httpCode" -ForegroundColor Green
    } else {
        Write-Host "Resposta inesperada" -ForegroundColor Yellow
        Write-Host "HTTP Status: $httpCode" -ForegroundColor Yellow
        Write-Host "Resposta: $response" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Limpeza de agendamentos concluida!" -ForegroundColor Green
