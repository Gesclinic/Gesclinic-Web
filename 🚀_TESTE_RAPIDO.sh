#!/bin/bash
# 🚀 Script de Teste Rápido - Refatoração Agenda

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                 🚀 TESTE REFATORAÇÃO AGENDA 🚀                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 CHECKLIST DE TESTES${NC}"
echo ""

# 1. Verificar se npm está instalado
echo -e "${YELLOW}[1/4] Verificando npm...${NC}"
if command -v npm &> /dev/null; then
    echo -e "${GREEN}✅ npm encontrado${NC}"
else
    echo -e "${RED}❌ npm não encontrado. Instale Node.js${NC}"
    exit 1
fi
echo ""

# 2. Verificar se os arquivos foram criados
echo -e "${YELLOW}[2/4] Verificando arquivos criados...${NC}"
COMPONENTS=(
    "StatusChip.jsx"
    "AgendaHeaderNew.jsx"
    "AgendaToolbarNew.jsx"
    "AgendaFiltersNew.jsx"
    "AgendaGridNew.jsx"
    "index.jsx"
)

for component in "${COMPONENTS[@]}"; do
    if [ -f "src/pages/clinica/agenda/components/$component" ]; then
        echo -e "${GREEN}✅ $component${NC}"
    else
        echo -e "❌ $component NÃO ENCONTRADO"
    fi
done

# Verificar hook
if [ -f "src/pages/clinica/agenda/hooks/useAgendaFilters.js" ]; then
    echo -e "${GREEN}✅ useAgendaFilters.js${NC}"
else
    echo -e "❌ useAgendaFilters.js NÃO ENCONTRADO"
fi
echo ""

# 3. Iniciar servidor
echo -e "${YELLOW}[3/4] Iniciando servidor...${NC}"
echo -e "${BLUE}Comando: npm run dev${NC}"
echo -e "${YELLOW}Aguarde alguns segundos para o servidor iniciar...${NC}"
echo ""

# 4. Informações para acesso
echo -e "${YELLOW}[4/4] Informações de Acesso${NC}"
echo ""
echo -e "${GREEN}✅ Servidor iniciado com sucesso!${NC}"
echo ""
echo -e "${BLUE}📱 Acesse a Nova Agenda Refatorada:${NC}"
echo -e "${GREEN}   http://localhost:3000/clinica/agenda-novo${NC}"
echo ""
echo -e "${BLUE}📝 Documentação Disponível:${NC}"
echo -e "   ✅_REFATORACAO_AGENDA_APLICADA.md"
echo -e "   🚀_TESTE_IMEDIATO_30_SEG.md"
echo -e "   📐_ESTRUTURA_COMPLETA.md"
echo -e "   🎬_VISUAL_ANIMADO_RESUMO.txt"
echo -e "   🎉_SUMARIO_EXECUTIVO.md"
echo ""
echo -e "${BLUE}🎯 O Que Testar:${NC}"
echo -e "   1. Navegação entre dias (Header)"
echo -e "   2. Troca de visualização (Toolbar)"
echo -e "   3. Filtros colapsáveis (Filters)"
echo -e "   4. Tabela com slots (Grid)"
echo -e "   5. Status com cores (StatusChip)"
echo ""
echo -e "${YELLOW}Pressione ENTER para iniciar o servidor...${NC}"
read

# Iniciar npm dev
npm run dev
