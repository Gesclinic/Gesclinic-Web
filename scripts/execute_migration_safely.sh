#!/bin/bash

# ============================================================================
# EXECUTAR MIGRATION SQL - GUIA PRÁTICO
# ============================================================================
#
# Instruções passo-a-passo para aplicar a migration de forma segura
#

set -e

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                    MIGRATION: Official Status Model                         ║"
echo "║                       2026-05-10_official_status_model.sql                 ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# PASSO 1: PRÉ-REQUISITOS
# ============================================================================

echo "📋 PASSO 1: Verificar Pré-requisitos"
echo "---"
echo ""

echo "✓ Arquivo de migration:"
if [ -f "supabase/migrations/2026-05-10_official_status_model.sql" ]; then
    echo "  ✅ Arquivo encontrado"
else
    echo "  ❌ Arquivo NÃO encontrado: supabase/migrations/2026-05-10_official_status_model.sql"
    exit 1
fi

echo ""
echo "✓ Credenciais Supabase:"
echo "  ⚠️  Você terá acesso a:"
echo "  - URL do projeto"
echo "  - Chave de admin (use SOMENTE em localhost/CI)"
echo "  - Banco de dados deve estar acessível"
echo ""

# ============================================================================
# PASSO 2: BACKUP ANTERIOR À MIGRAÇÃO
# ============================================================================

echo "📋 PASSO 2: Backup Anterior à Migração"
echo "---"
echo ""

echo "⚠️  IMPORTANTE: Fazer backup ANTES de executar"
echo ""
echo "Opção 1 (Recomendado): Dashboard Supabase"
echo "  1. Acesse: https://app.supabase.com/project/[seu-projeto]"
echo "  2. Vá para: Project Settings > Backups"
echo "  3. Clique: 'Take a backup now'"
echo "  4. Aguarde conclusão (~5-10 minutos)"
echo ""

echo "Opção 2: Export via pg_dump (localhost)"
echo "  PGPASSWORD='senha' pg_dump \\
echo "    -h localhost \\
echo "    -U postgres \\
echo "    -d seu_database > backup_\$(date +%Y%m%d_%H%M%S).sql"
echo ""

read -p "🔒 Backup realizado? (s/n): " backup_done
if [ "$backup_done" != "s" ]; then
    echo "❌ Backup não confirmado. Abortando."
    exit 1
fi

echo "✅ Backup confirmado"
echo ""

# ============================================================================
# PASSO 3: VERIFICAÇÃO PRÉ-MIGRAÇÃO
# ============================================================================

echo "📋 PASSO 3: Verificação Pré-Migração"
echo "---"
echo ""

echo "⚠️  MANUAL: Execute no Supabase SQL Editor:"
echo ""
echo "Query 1: Verificar tabela appointments"
echo "  SELECT COUNT(*) as total_appointments FROM appointments;"
echo ""
echo "Query 2: Ver status atuais"
echo "  SELECT DISTINCT booking_status FROM appointments ORDER BY booking_status;"
echo ""
echo "Query 3: Contar por status"
echo "  SELECT booking_status, COUNT(*) FROM appointments GROUP BY booking_status;"
echo ""

read -p "📊 Verificações realizadas? (s/n): " verification_done
if [ "$verification_done" != "s" ]; then
    echo "❌ Verificações não confirmadas. Abortando."
    exit 1
fi

echo "✅ Verificações confirmadas"
echo ""

# ============================================================================
# PASSO 4: EXECUTAR MIGRATION
# ============================================================================

echo "📋 PASSO 4: Executar Migration"
echo "---"
echo ""

echo "⚠️  MÉTODO RECOMENDADO: Supabase SQL Editor"
echo ""
echo "Passos:"
echo "  1. Abra: https://app.supabase.com/project/[seu-projeto]/sql/new"
echo "  2. Cole todo o conteúdo de:"
echo "     supabase/migrations/2026-05-10_official_status_model.sql"
echo ""
echo "  3. Execute em PARTES (não tudo de uma vez!):"
echo ""
echo "     PARTE 1: CREATE TYPE (enum)"
echo "     ─────────────────────────────"
echo "     CREATE TYPE appointment_official_status AS ENUM (...);"
echo ""
echo "     PARTE 2: Functions"
echo "     ──────────────────"
echo "     CREATE OR REPLACE FUNCTION convert_to_official_status(...);"
echo ""
echo "     PARTE 3: Colunas e dados"
echo "     ────────────────────────"
echo "     ALTER TABLE appointments ADD COLUMN..."
echo "     UPDATE appointments SET..."
echo ""
echo "     PARTE 4: Índices"
echo "     ────────────────"
echo "     CREATE INDEX..."
echo ""
echo "     PARTE 5: Triggers"
echo "     ────────────────"
echo "     CREATE OR REPLACE FUNCTION sync_official_status()..."
echo "     CREATE TRIGGER trigger_sync_official_status..."
echo ""

read -p "🚀 Migration executada? (s/n): " migration_done
if [ "$migration_done" != "s" ]; then
    echo "❌ Migration não executada. Abortando."
    exit 1
fi

echo "✅ Migration executada"
echo ""

# ============================================================================
# PASSO 5: VALIDAÇÃO PÓS-MIGRAÇÃO
# ============================================================================

echo "📋 PASSO 5: Validação Pós-Migração"
echo "---"
echo ""

echo "⚠️  MANUAL: Execute no Supabase SQL Editor:"
echo ""

echo "Query 1: Verificar tipo enum criado"
echo "  SELECT typname FROM pg_type WHERE typname = 'appointment_official_status';"
echo "  Resultado esperado: 'appointment_official_status'"
echo ""

echo "Query 2: Verificar coluna nova"
echo "  SELECT column_name, data_type FROM information_schema.columns"
echo "  WHERE table_name = 'appointments' AND column_name = 'official_status';"
echo "  Resultado esperado: column_name='official_status', data_type='appointment_official_status'"
echo ""

echo "Query 3: Verificar conversão de dados"
echo "  SELECT booking_status_legacy, official_status, COUNT(*)"
echo "  FROM appointments"
echo "  WHERE booking_status_legacy IS NOT NULL"
echo "  GROUP BY booking_status_legacy, official_status"
echo "  ORDER BY booking_status_legacy;"
echo ""

echo "Query 4: Contar por novo status"
echo "  SELECT official_status, COUNT(*)"
echo "  FROM appointments"
echo "  GROUP BY official_status"
echo "  ORDER BY COUNT(*) DESC;"
echo ""

echo "Query 5: Verificar índices criados"
echo "  SELECT indexname FROM pg_indexes"
echo "  WHERE tablename = 'appointments' AND indexname LIKE '%status%';"
echo "  Resultado esperado: 3 índices"
echo ""

read -p "✅ Validações concluídas? (s/n): " validation_done
if [ "$validation_done" != "s" ]; then
    echo "❌ Validações não confirmadas."
    echo "🔄 Considerar ROLLBACK se houver problemas."
    exit 1
fi

echo "✅ Validação confirmada"
echo ""

# ============================================================================
# PASSO 6: TESTAR CONVERSÃO
# ============================================================================

echo "📋 PASSO 6: Testar Conversão de Status"
echo "---"
echo ""

echo "Query: Verificar qualidade da conversão"
echo "  SELECT"
echo "    booking_status_legacy as status_antigo,"
echo "    official_status as status_novo,"
echo "    COUNT(*) as quantidade"
echo "  FROM appointments"
echo "  WHERE booking_status_legacy IS NOT NULL"
echo "  GROUP BY 1, 2"
echo "  ORDER BY quantidade DESC;"
echo ""

echo "Resultado esperado:"
echo "  - Todos os status_antigos mapeados"
echo "  - Nenhum NULL em official_status"
echo "  - Distribuição semelhante aos dados"
echo ""

read -p "📊 Conversão verificada? (s/n): " conversion_done
if [ "$conversion_done" != "s" ]; then
    echo "❌ Conversão não confirmada."
    echo "ℹ️  Pode ser necessário ajustar função convert_to_official_status()"
    exit 1
fi

echo "✅ Conversão confirmada"
echo ""

# ============================================================================
# PASSO 7: BUILD E DEPLOY
# ============================================================================

echo "📋 PASSO 7: Build e Deploy"
echo "---"
echo ""

echo "✓ Construir aplicação com novos tipos"
echo ""

echo "  npm run build"
echo ""

read -p "🔨 Build realizado? (s/n): " build_done
if [ "$build_done" != "s" ]; then
    echo "❌ Build não confirmado."
    exit 1
fi

echo "✅ Build confirmado"
echo ""

# ============================================================================
# PASSO 8: TESTAR EM DESENVOLVIMENTO
# ============================================================================

echo "📋 PASSO 8: Testar em Desenvolvimento"
echo "---"
echo ""

echo "✓ Iniciar servidor de desenvolvimento"
echo ""
echo "  npm run dev"
echo "  # Abrirá em http://localhost:3000"
echo ""

echo "Testes a fazer:"
echo "  1. Navegue até http://localhost:3000/clinica/agenda"
echo "  2. Abra um agendamento antigo"
echo "  3. Verifique se status_antigo foi convertido para official_status"
echo "  4. Teste seletor de status (deve validar transições)"
echo "  5. Teste timeline operacional"
echo ""

read -p "✅ Testes em dev concluídos? (s/n): " dev_test_done
if [ "$dev_test_done" != "s" ]; then
    echo "❌ Testes não confirmados. Verifique console para erros."
    exit 1
fi

echo "✅ Testes em dev confirmados"
echo ""

# ============================================================================
# PASSO 9: DEPLOY EM STAGING (Opcional)
# ============================================================================

echo "📋 PASSO 9: Deploy em Staging"
echo "---"
echo ""

echo "✓ Deploy para ambiente de staging (recomendado antes de produção)"
echo ""
echo "  git add ."
echo "  git commit -m 'feat(agenda): official status model migration'"
echo "  git push origin staging"
echo ""

echo "Aguarde pipeline de CI/CD..."
echo ""

read -p "🚀 Deploy em staging concluído? (s/n): " staging_done
if [ "$staging_done" = "s" ]; then
    echo "✅ Deploy em staging confirmado"
else
    echo "⏭️  Pulando staging, seguindo para produção"
fi

echo ""

# ============================================================================
# PASSO 10: MONITORAMENTO
# ============================================================================

echo "📋 PASSO 10: Monitoramento Pós-Migration"
echo "---"
echo ""

echo "✓ Acompanhar métricas por 24-48h:"
echo ""
echo "  1. Performance de queries com novo status"
echo "  2. Erros de transição de status"
echo "  3. Taxa de sucesso de faturamento automático"
echo "  4. Uso de índices criados"
echo ""

echo "Query para monitorar:"
echo "  SELECT"
echo "    DATE_TRUNC('hour', created_at) as hora,"
echo "    official_status,"
echo "    COUNT(*) as quantidade"
echo "  FROM appointments"
echo "  WHERE created_at > NOW() - INTERVAL '24 hours'"
echo "  GROUP BY 1, 2"
echo "  ORDER BY 1 DESC;"
echo ""

# ============================================================================
# PASSO 11: ROLLBACK (Se necessário)
# ============================================================================

echo "📋 PASSO 11: Rollback (Se necessário)"
echo "---"
echo ""

echo "⚠️  Se houver problemas, use o script de rollback:"
echo ""
echo "  supabase/migrations/2026-05-10_official_status_model.sql"
echo "  (seção ROLLBACK ao final do arquivo)"
echo ""

echo "Passos de rollback:"
echo "  1. Vá para Supabase SQL Editor"
echo "  2. Cole seção ROLLBACK"
echo "  3. Execute"
echo "  4. Restaure backup se necessário"
echo ""

# ============================================================================
# CONCLUSÃO
# ============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                            ║"
echo "║  ✅ MIGRATION CONCLUÍDA COM SUCESSO!                                      ║"
echo "║                                                                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

echo "Resumo:"
echo "  ✅ Tipo ENUM criado"
echo "  ✅ Função de conversão criada"
echo "  ✅ Coluna official_status adicionada"
echo "  ✅ Dados convertidos"
echo "  ✅ Índices criados"
echo "  ✅ Triggers criados"
echo "  ✅ Validações confirmadas"
echo "  ✅ Build bem-sucedido"
echo "  ✅ Testes em dev passaram"
echo ""

echo "Próximos passos:"
echo "  1. Deploy para staging"
echo "  2. Testes de integração"
echo "  3. Deploy para produção"
echo "  4. Monitorar por 48h"
echo ""

echo "Documentação: src/modules/agenda/STATUS_OFFICIAL_MODEL.md"
echo ""
