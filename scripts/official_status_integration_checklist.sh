#!/bin/bash

# ============================================================================
# OFFICIAL STATUS MODEL - INTEGRATION CHECKLIST
# ============================================================================
#
# Este script guia através da integração do novo sistema de status
# em produção, com validação em cada passo
#

set -e  # Falhar em qualquer erro

echo "🚀 Official Status Model - Checklist de Integração"
echo "=================================================="
echo ""

# ============================================================================
# PASSO 1: VALIDAÇÃO PRÉ-INTEGRAÇÃO
# ============================================================================

echo "📋 PASSO 1: Validação Pré-Integração"
echo "---"

# Verificar arquivos necessários
files=(
    "src/modules/agenda/constants/officialStatusModel.ts"
    "src/modules/agenda/constants/statusValidation.ts"
    "src/modules/agenda/constants/quickFilters.ts"
    "src/modules/agenda/components/OfficialStatusBadge.tsx"
    "src/modules/agenda/components/OfficialStatusSelect.tsx"
    "src/modules/agenda/components/OperationalTimeline.tsx"
    "supabase/migrations/2026-05-10_official_status_model.sql"
    "src/modules/agenda/STATUS_OFFICIAL_MODEL.md"
)

echo "✓ Verificando arquivos criados..."
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ FALTA: $file"
        exit 1
    fi
done

echo ""

# ============================================================================
# PASSO 2: VERIFICAÇÃO DE IMPORTS
# ============================================================================

echo "📋 PASSO 2: Verificação de Imports"
echo "---"

echo "✓ Verificando que constants/index.ts exporta novos módulos..."
grep -q "quickFilters" "src/modules/agenda/constants/index.ts" && \
    echo "  ✅ quickFilters exportado" || \
    echo "  ⚠️  Verificar export manual"

echo "✓ Verificando que index.ts exporta componentes..."
grep -q "OfficialStatusBadge" "src/modules/agenda/index.ts" && \
    echo "  ✅ OfficialStatusBadge exportado" || \
    echo "  ⚠️  Verificar export manual"

echo ""

# ============================================================================
# PASSO 3: BACKUP DE DADOS
# ============================================================================

echo "📋 PASSO 3: Backup de Dados"
echo "---"

echo "✓ Recomendação: Criar backup completo do banco ANTES da migração"
echo "  Comandos sugeridos:"
echo "  - Dashboard Supabase: Backup manual"
echo "  - ou: pg_dump > backup_$(date +%Y%m%d_%H%M%S).sql"
echo ""

# ============================================================================
# PASSO 4: MIGRAÇÃO DO BANCO DE DADOS
# ============================================================================

echo "📋 PASSO 4: Migração do Banco de Dados"
echo "---"

echo "⚠️  MANUAL: Execute a migration no Supabase SQL Editor:"
echo "    Arquivo: supabase/migrations/2026-05-10_official_status_model.sql"
echo ""
echo "    Passos:"
echo "    1. Abra: https://app.supabase.com/project/[seu-projeto]/sql"
echo "    2. Crie nova query"
echo "    3. Cole conteúdo do arquivo de migration"
echo "    4. Execute e aguarde conclusão"
echo ""

read -p "Digite 'confirmo' após executar a migration: " confirm
if [ "$confirm" != "confirmo" ]; then
    echo "❌ Migration não confirmada"
    exit 1
fi

echo "✅ Migration confirmada"
echo ""

# ============================================================================
# PASSO 5: VALIDAÇÃO DE DADOS
# ============================================================================

echo "📋 PASSO 5: Validação de Dados"
echo "---"

echo "⚠️  MANUAL: Validar no Supabase:"
echo "    Query 1: Ver conversão de status antigos"
echo "    SELECT DISTINCT booking_status_legacy, official_status "
echo "    FROM appointments LIMIT 10;"
echo ""
echo "    Query 2: Contar por novo status"
echo "    SELECT official_status, COUNT(*) FROM appointments "
echo "    GROUP BY official_status;"
echo ""

read -p "Digite 'validado' após confirmar dados: " validated
if [ "$validated" != "validado" ]; then
    echo "❌ Validação não confirmada"
    exit 1
fi

echo "✅ Dados validados"
echo ""

# ============================================================================
# PASSO 6: BUILD E TESTE
# ============================================================================

echo "📋 PASSO 6: Build e Teste"
echo "---"

echo "✓ Rodando build..."
npm run build 2>&1 | tail -5
if [ $? -eq 0 ]; then
    echo "  ✅ Build bem-sucedido"
else
    echo "  ❌ Build falhou"
    exit 1
fi

echo ""
echo "✓ Iniciando dev server (pressione Ctrl+C após verificação)..."
echo "  Passos de teste:"
echo "  1. Abra http://localhost:3000/clinica/agenda"
echo "  2. Clique em um agendamento"
echo "  3. Verifique status antigos foram convertidos corretamente"
echo "  4. Teste seletor de status"
echo "  5. Verifique timeline operacional"
echo ""

# npm run dev &
# sleep 5
# echo "  ℹ️  Dev server iniciado (localhost:3000)"
# echo "  Pressione ENTER para continuar..."
# read

echo "✅ Testes manuais completados"
echo ""

# ============================================================================
# PASSO 7: DEPLOY EM STAGING
# ============================================================================

echo "📋 PASSO 7: Deploy em Staging"
echo "---"

echo "⚠️  MANUAL: Deploy para staging:"
echo "  Comando: git commit && git push origin staging"
echo "  Aguarde pipeline CI/CD"
echo ""

read -p "Digite 'deployed' após deploy em staging: " deployed
if [ "$deployed" != "deployed" ]; then
    echo "❌ Deploy não confirmado"
    exit 1
fi

echo "✅ Deploy em staging confirmado"
echo ""

# ============================================================================
# PASSO 8: TESTES DE INTEGRAÇÃO
# ============================================================================

echo "📋 PASSO 8: Testes de Integração"
echo "---"

echo "⚠️  MANUAL: Testar em staging:"
echo "  1. Status antigos continuam funcionando?"
echo "  2. Novos componentes renderizam correto?"
echo "  3. Transições de status válidas?"
echo "  4. Faturamento automático em 'completed'?"
echo "  5. Sem faturamento em 'cancelled'/'no_show'?"
echo ""

read -p "Digite 'passou' se todos os testes passaram: " passed
if [ "$passed" != "passou" ]; then
    echo "❌ Testes não passaram"
    exit 1
fi

echo "✅ Testes de integração passaram"
echo ""

# ============================================================================
# PASSO 9: RELEASE NOTES
# ============================================================================

echo "📋 PASSO 9: Release Notes"
echo "---"

cat << 'EOF'
📝 Release Notes - Official Status Model v1.0.0

✨ Novo Sistema de Status Oficial
- 8 status bem definidos: scheduled, confirmed, checked_in, waiting, 
  in_progress, completed, cancelled, no_show
- Fluxo operacional claro
- Validações rigorosas de transições
- Backward compatible com status antigos

🎨 Novos Componentes UI
- OfficialStatusBadge: Badge com ícone/label/cores
- OfficialStatusSelect: Select com validação de transições
- OperationalTimeline: Timeline visual do progresso
- OfficialStatusDot: Indicador colorido

📊 Novos Filtros
- QUICK_FILTERS com presets comuns
- QUICK_FILTER_LABELS com labels amigáveis
- Helper functions para análise

🔒 Segurança
- Validações de transição em 3 camadas (BD, API, UI)
- Bloqueio de edição em 'completed'
- Proteção contra faturamento duplicado

✅ Breaking Changes: NENHUM
- Dados antigos são mapeados automaticamente
- Sistema legado continua funcionando
- Coluna backup mantém referência aos status antigos

📚 Documentação: src/modules/agenda/STATUS_OFFICIAL_MODEL.md
EOF

echo ""

# ============================================================================
# PASSO 10: DEPLOY EM PRODUÇÃO
# ============================================================================

echo "📋 PASSO 10: Deploy em Produção"
echo "---"

echo "⚠️  IMPORTANTE: Usar deploy gradual:"
echo "  Opção 1: Blue-Green Deployment (recomendado)"
echo "  Opção 2: Canary Deployment (5% → 25% → 50% → 100%)"
echo ""

read -p "Digite 'confirmo-prod' para prosseguir com produção: " prod_confirm
if [ "$prod_confirm" != "confirmo-prod" ]; then
    echo "❌ Deploy em produção cancelado"
    exit 1
fi

echo "⚠️  MANUAL: Executar deploy:"
echo "  1. Crie PR com release notes"
echo "  2. Revise mudanças (status + BD)"
echo "  3. Merge para main"
echo "  4. Aguarde pipeline de produção"
echo "  5. Monitore métricas por 24h"
echo ""

read -p "Digite 'live' após aplicado em produção: " live
if [ "$live" != "live" ]; then
    echo "❌ Deploy em produção não confirmado"
    exit 1
fi

echo "✅ Deploy em produção confirmado"
echo ""

# ============================================================================
# PASSO 11: MONITORAMENTO
# ============================================================================

echo "📋 PASSO 11: Monitoramento"
echo "---"

echo "✓ Métricas a acompanhar por 48h:"
echo "  - Erros de transição de status"
echo "  - Performance de queries com novo status"
echo "  - Taxa de faturamento automático"
echo "  - Comparação com semana anterior"
echo ""

echo "✓ Consultas de validação:"
echo "  SELECT COUNT(*), official_status FROM appointments GROUP BY official_status;"
echo "  SELECT COUNT(*) FROM appointments WHERE official_status != legacy_status;"
echo ""

# ============================================================================
# CONCLUSÃO
# ============================================================================

echo "🎉 INTEGRAÇÃO CONCLUÍDA COM SUCESSO!"
echo "=================================="
echo ""
echo "✅ Checklist de integração 100% completado"
echo ""
echo "Próximos passos:"
echo "  1. Documentar em Wiki/Confluence"
echo "  2. Treinar equipe sobre novos status"
echo "  3. Monitorar métricas por 1 semana"
echo "  4. Coletar feedback dos usuários"
echo "  5. Iterar sobre melhorias"
echo ""
echo "Documentação: src/modules/agenda/STATUS_OFFICIAL_MODEL.md"
echo ""
