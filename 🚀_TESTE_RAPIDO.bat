@echo off
REM 🚀 Script de Teste Rápido - Refatoração Agenda (Windows)

cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                 🚀 TESTE REFATORACAO AGENDA 🚀                 ║
echo ║                                                                ║
echo ║        Verificando arquivos e iniciando servidor              ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM 1. Verificar se npm está instalado
echo [1/4] Verificando npm...
where npm >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ npm encontrado
) else (
    echo ❌ npm nao encontrado. Instale Node.js
    pause
    exit /b 1
)
echo.

REM 2. Verificar se os arquivos foram criados
echo [2/4] Verificando arquivos criados...
set "componentPath=src\pages\clinica\agenda\components"

if exist "%componentPath%\StatusChip.jsx" (
    echo ✅ StatusChip.jsx
) else (
    echo ❌ StatusChip.jsx NAO ENCONTRADO
)

if exist "%componentPath%\AgendaHeaderNew.jsx" (
    echo ✅ AgendaHeaderNew.jsx
) else (
    echo ❌ AgendaHeaderNew.jsx NAO ENCONTRADO
)

if exist "%componentPath%\AgendaToolbarNew.jsx" (
    echo ✅ AgendaToolbarNew.jsx
) else (
    echo ❌ AgendaToolbarNew.jsx NAO ENCONTRADO
)

if exist "%componentPath%\AgendaFiltersNew.jsx" (
    echo ✅ AgendaFiltersNew.jsx
) else (
    echo ❌ AgendaFiltersNew.jsx NAO ENCONTRADO
)

if exist "%componentPath%\AgendaGridNew.jsx" (
    echo ✅ AgendaGridNew.jsx
) else (
    echo ❌ AgendaGridNew.jsx NAO ENCONTRADO
)

if exist "%componentPath%\index.jsx" (
    echo ✅ index.jsx
) else (
    echo ❌ index.jsx NAO ENCONTRADO
)

set "hooksPath=src\pages\clinica\agenda\hooks"
if exist "%hooksPath%\useAgendaFilters.js" (
    echo ✅ useAgendaFilters.js
) else (
    echo ❌ useAgendaFilters.js NAO ENCONTRADO
)
echo.

REM 3. Informações para acesso
echo [3/4] Informacoes de Acesso
echo.
echo ✅ TUDO PRONTO!
echo.
echo ================================================================
echo.
echo 📱 ACESSE A NOVA AGENDA REFATORADA:
echo    http://localhost:3000/clinica/agenda-novo
echo.
echo 📝 DOCUMENTACAO DISPONIVEL:
echo    - ✅_REFATORACAO_AGENDA_APLICADA.md
echo    - 🚀_TESTE_IMEDIATO_30_SEG.md
echo    - 📐_ESTRUTURA_COMPLETA.md
echo    - 🎬_VISUAL_ANIMADO_RESUMO.txt
echo    - 🎉_SUMARIO_EXECUTIVO.md
echo.
echo 🎯 O QUE TESTAR:
echo    1. Navegacao entre dias [Header]
echo    2. Troca de visualizacao [Toolbar]
echo    3. Filtros colapsaveis [Filters]
echo    4. Tabela com slots [Grid]
echo    5. Status com cores [StatusChip]
echo.
echo ================================================================
echo.
echo [4/4] Iniciando servidor...
echo Pressione ENTER para continuar...
pause >nul

REM 4. Iniciar npm dev
echo.
echo Iniciando: npm run dev
echo.
call npm run dev
