#!/bin/bash

# Script para aplicar migration no Supabase via CLI
# Use este script se você tiver supabase-cli instalado

# Verificar se supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI não está instalado."
    echo "Instale com: npm install -g @supabase/cli"
    exit 1
fi

echo "Aplicando migrations no Supabase..."
supabase migration up

if [ $? -eq 0 ]; then
    echo "✅ Migration aplicada com sucesso!"
else
    echo "❌ Erro ao aplicar migration"
    echo ""
    echo "Se você não tiver supabase-cli configurado, execute o SQL manualmente:"
    echo "1. Acesse https://app.supabase.com"
    echo "2. Vá até SQL Editor"
    echo "3. Cole e execute o SQL do arquivo: supabase/migrations/2026_01_16_add_code_to_health_insurances.sql"
fi
