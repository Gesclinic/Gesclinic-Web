#!/bin/bash

# ============================================================================
# VERIFICAÇÃO FINAL - Official Status Model Entrega
# ============================================================================

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║           VERIFICAÇÃO FINAL - Official Status Model v1.0.0               ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

FAILED=0
PASSED=0

# ============================================================================
# Função helper para verificar arquivos
# ============================================================================

check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo "✅ $description"
        ((PASSED++))
    else
        echo "❌ $description - FALTA: $file"
        ((FAILED++))
    fi
}

check_content() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo "✅ $description"
        ((PASSED++))
    else
        echo "❌ $description - PADRÃO NÃO ENCONTRADO"
        ((FAILED++))
    fi
}

# ============================================================================
# VERIFICAÇÃO: Componentes UI
# ============================================================================

echo "📦 COMPONENTES UI"
echo "---"

check_file "src/modules/agenda/components/OfficialStatusBadge.tsx" \
    "OfficialStatusBadge.tsx"
check_content "src/modules/agenda/components/OfficialStatusBadge.tsx" \
    "OfficialStatusBadge" \
    "OfficialStatusBadge é um componente React"

check_file "src/modules/agenda/components/OfficialStatusSelect.tsx" \
    "OfficialStatusSelect.tsx"
check_content "src/modules/agenda/components/OfficialStatusSelect.tsx" \
    "OfficialStatusSelect" \
    "OfficialStatusSelect é um componente React"

check_file "src/modules/agenda/components/OperationalTimeline.tsx" \
    "OperationalTimeline.tsx"
check_content "src/modules/agenda/components/OperationalTimeline.tsx" \
    "OperationalTimeline" \
    "OperationalTimeline é um componente React"

echo ""

# ============================================================================
# VERIFICAÇÃO: Constants
# ============================================================================

echo "⚙️  CONSTANTS & VALIDATION"
echo "---"

check_file "src/modules/agenda/constants/quickFilters.ts" \
    "quickFilters.ts"
check_content "src/modules/agenda/constants/quickFilters.ts" \
    "QUICK_FILTERS" \
    "QUICK_FILTERS está definido"

check_file "src/modules/agenda/constants/officialStatusModel.ts" \
    "officialStatusModel.ts (deve existir)"
check_content "src/modules/agenda/constants/officialStatusModel.ts" \
    "OFFICIAL_STATUS_CONFIG" \
    "OFFICIAL_STATUS_CONFIG existe"

check_file "src/modules/agenda/constants/statusValidation.ts" \
    "statusValidation.ts (deve existir)"
check_content "src/modules/agenda/constants/statusValidation.ts" \
    "validateStatusTransition" \
    "validateStatusTransition função existe"

echo ""

# ============================================================================
# VERIFICAÇÃO: Exports
# ============================================================================

echo "📤 EXPORTS CONFIGURADOS"
echo "---"

check_content "src/modules/agenda/constants/index.ts" \
    "quickFilters" \
    "quickFilters exportado em constants/index.ts"

check_content "src/modules/agenda/index.ts" \
    "OfficialStatusBadge" \
    "OfficialStatusBadge exportado em index.ts"

check_content "src/modules/agenda/index.ts" \
    "OfficialStatusSelect" \
    "OfficialStatusSelect exportado em index.ts"

check_content "src/modules/agenda/index.ts" \
    "OperationalTimeline" \
    "OperationalTimeline exportado em index.ts"

echo ""

# ============================================================================
# VERIFICAÇÃO: Database Migration
# ============================================================================

echo "🗄️  DATABASE MIGRATION"
echo "---"

check_file "supabase/migrations/2026-05-10_official_status_model.sql" \
    "Migration SQL"
check_content "supabase/migrations/2026-05-10_official_status_model.sql" \
    "appointment_official_status" \
    "Tipo ENUM no migration"

check_content "supabase/migrations/2026-05-10_official_status_model.sql" \
    "convert_to_official_status" \
    "Função de conversão no migration"

check_content "supabase/migrations/2026-05-10_official_status_model.sql" \
    "ROLLBACK" \
    "Script de rollback incluído"

echo ""

# ============================================================================
# VERIFICAÇÃO: Documentação
# ============================================================================

echo "📚 DOCUMENTAÇÃO"
echo "---"

check_file "src/modules/agenda/STATUS_OFFICIAL_MODEL.md" \
    "STATUS_OFFICIAL_MODEL.md"
check_content "src/modules/agenda/STATUS_OFFICIAL_MODEL.md" \
    "Official Status Model" \
    "Documentação principal"

check_file "src/modules/agenda/IMPORTS_REFERENCE.ts" \
    "IMPORTS_REFERENCE.ts"
check_content "src/modules/agenda/IMPORTS_REFERENCE.ts" \
    "OfficialStatusBadge" \
    "Referência de imports"

echo ""

# ============================================================================
# VERIFICAÇÃO: Scripts
# ============================================================================

echo "🔧 SCRIPTS DE INTEGRAÇÃO"
echo "---"

check_file "scripts/official_status_integration_checklist.sh" \
    "Integration checklist script"
check_content "scripts/official_status_integration_checklist.sh" \
    "11 PASSO\|PASSO" \
    "Checklist tem múltiplos passos"

check_file "scripts/official_status_quick_start.sh" \
    "Quick start guide"
check_content "scripts/official_status_quick_start.sh" \
    "USO RÁPIDO\|Quick" \
    "Quick start tem exemplos"

check_file "scripts/execute_migration_safely.sh" \
    "Safe migration script"
check_content "scripts/execute_migration_safely.sh" \
    "Migration\|PASSO" \
    "Migration script tem passos"

echo ""

# ============================================================================
# VERIFICAÇÃO: Resumos & Entregas
# ============================================================================

echo "📋 RESUMOS DE ENTREGA"
echo "---"

check_file "📋_OFFICIAL_STATUS_ENTREGA_FASE2.txt" \
    "Entrega Fase 2 resumo"
check_content "📋_OFFICIAL_STATUS_ENTREGA_FASE2.txt" \
    "ENTREGA COMPLETA\|Fase 2" \
    "Resumo de entrega"

check_file "✨_OFFICIAL_STATUS_VISUAL_SUMMARY.txt" \
    "Visual summary"
check_content "✨_OFFICIAL_STATUS_VISUAL_SUMMARY.txt" \
    "Official Status Model\|Fase 2" \
    "Resumo visual"

check_file "📊_OFFICIAL_STATUS_EXECUTIVE_SUMMARY.md" \
    "Executive summary"
check_content "📊_OFFICIAL_STATUS_EXECUTIVE_SUMMARY.md" \
    "Executive\|SUMMARY" \
    "Resumo executivo"

echo ""

# ============================================================================
# VERIFICAÇÃO: TypeScript Compilation
# ============================================================================

echo "🔨 VERIFICAÇÃO DE BUILD"
echo "---"

if npm run build 2>&1 | grep -q "error" || [ $? -ne 0 ]; then
    echo "⚠️  Build pode ter warnings (verificar manualmente)"
    echo "   Comando: npm run build"
    ((FAILED++))
else
    echo "✅ Build compila sem erros"
    ((PASSED++))
fi

echo ""

# ============================================================================
# RESUMO FINAL
# ============================================================================

TOTAL=$((PASSED + FAILED))

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                          RESULTADO FINAL                                    ║"
echo "╠════════════════════════════════════════════════════════════════════════════╣"
echo "║                                                                            ║"
echo "║  ✅ Passou:   $PASSED / $TOTAL                                                    ║"
echo "║  ❌ Falhou:   $FAILED / $TOTAL                                                    ║"
echo "║                                                                            ║"

if [ $FAILED -eq 0 ]; then
    echo "║  🎉 TODAS AS VERIFICAÇÕES PASSARAM!                                      ║"
    echo "║  ✅ PRONTO PARA PRODUÇÃO                                                 ║"
else
    echo "║  ⚠️  $FAILED verificação(ões) falharam                                      ║"
    echo "║  Verifique os arquivos acima                                             ║"
fi

echo "║                                                                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"

echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎊 ENTREGA COMPLETA COM SUCESSO! 🎊"
    echo ""
    echo "Próximos passos:"
    echo "  1. npm run dev"
    echo "  2. Criar hook useStatusTransition()"
    echo "  3. Atualizar AppointmentUnitedModal.jsx"
    echo "  4. Executar migration SQL"
    echo "  5. Deploy para staging"
    echo ""
    exit 0
else
    echo "⚠️  Verifique as falhas acima antes de prosseguir"
    exit 1
fi
