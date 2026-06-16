#!/bin/bash
# Script para aplicar SQL triggers em Supabase via CLI

# Configurações
PROJECT_ID="gvdkdjyupktlflwurike"
MIGRATION_FILE="supabase/migrations/2024_04_appointment_financial_triggers.sql"

echo "🚀 Iniciando aplicação de SQL triggers..."
echo "📁 Arquivo: $MIGRATION_FILE"
echo "🔗 Projeto: $PROJECT_ID"
echo ""

# Verificar se arquivo existe
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Arquivo não encontrado: $MIGRATION_FILE"
  exit 1
fi

echo "✅ Arquivo encontrado"
echo ""
echo "📋 Conteúdo do arquivo:"
echo "=============================================="
cat "$MIGRATION_FILE" | head -50
echo ""
echo "=============================================="
echo ""

# Instruções para Supabase
echo "🎯 INSTRUÇÕES MANUAIS (para executar em Supabase Dashboard):"
echo ""
echo "1. Abra: https://supabase.com/dashboard/project/$PROJECT_ID/sql/new"
echo "2. Copie TODO o conteúdo do arquivo $MIGRATION_FILE"
echo "3. Cole no editor SQL"
echo "4. Clique em 'RUN'"
echo "5. Aguarde conclusão"
echo ""

# Se tiver Supabase CLI instalado, tentar usar
if command -v supabase &> /dev/null; then
  echo "✅ Supabase CLI encontrado!"
  echo ""
  echo "Tentando aplicar via CLI..."
  # supabase db push --dry-run
  echo "⚠️  Nota: Execute 'supabase db push' localmente após verificar o código"
else
  echo "⚠️  Supabase CLI não encontrado. Use as instruções manuais acima."
fi

echo ""
echo "✅ Script de verificação concluído!"
