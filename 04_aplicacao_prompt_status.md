📋 APLICAÇÃO DO PROMPT - 03_FRONTEND_BASE_DO_SISTEMA

═════════════════════════════════════════════════════════════════════════════════

STATUS: ✅ 60% IMPLEMENTADO

═════════════════════════════════════════════════════════════════════════════════

RESUMO DAS MUDANÇAS:

┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. ServicosPage.jsx - ATUALIZADO ✅                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Novos campos adicionados:                                                  │
│   ✅ default_duration_minutes (Duração padrão em minutos)                  │
│   ✅ billing_type (Tipo de cobrança: per_consultation, per_hour, etc)     │
│   ✅ allow_scheduling_fit (Permite encaixe: boolean)                       │
│   ✅ requires_authorization (Exige autorização: boolean)                   │
│   ✅ base_value (Valor base em R$: decimal)                                │
│                                                                             │
│ Atualizações na Interface:                                                 │
│   ✅ Tabela: Coluna "Duração" (exibe minutos)                             │
│   ✅ Tabela: Coluna "Tipo Cobrança" (com badge colorido)                  │
│   ✅ Tabela: Coluna "Valor Base" (formatado em R$)                         │
│   ✅ Formulário: Select dinâmico para tipos de cobrança                    │
│   ✅ Formulário: Input número para duração (mínimo 15 min, step 15)       │
│   ✅ Formulário: Input decimal para valor base                             │
│   ✅ Formulário: Checkbox para "Permite encaixe"                           │
│   ✅ Formulário: Checkbox para "Exige autorização"                         │
│                                                                             │
│ Localização: src/pages/clinica/base-sistema/ServicosPage.jsx              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. ProfessionalsPage.jsx - ATUALIZADO ✅                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Alterações:                                                                 │
│   ✅ Função handleDelete() modificada para INATIVAR ao invés de DELETAR    │
│   ✅ Botão delete removido da tabela                                       │
│   ✅ Novo comportamento: Clica no X → Inativa profissional                 │
│   ✅ Mensagem de confirmação atualizada                                    │
│   ✅ Apenas profissionais ativos mostram botão para inativar               │
│                                                                             │
│ Regra Implementada:                                                         │
│   "Não permitir exclusão física (apenas inativar)"                         │
│                                                                             │
│ Localização: src/pages/clinica/base-sistema/ProfessionalsPage.jsx          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. ConveniosPage.jsx - ATUALIZADO ✅                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Novos campos BACKEND adicionados:                                          │
│   ✅ contact_phone (Telefone de contato)                                   │
│   ✅ discount_percentage (% de desconto)                                   │
│   ✅ minimum_margin_percentage (% margem mínima)                           │
│   ✅ special_rules (Regras específicas)                                    │
│                                                                             │
│ Novos campos INTERFACE adicionados:                                        │
│   ✅ Input: Telefone de Contato                                            │
│   ✅ Input: Desconto (%) com validação 0-100                              │
│   ✅ Input: Margem Mínima (%) com validação 0-100                         │
│   ✅ Textarea: Regras Específicas                                          │
│                                                                             │
│ Estado (FormData) atualizado:                                              │
│   ✅ handleNew() - inicializa novos campos                                │
│   ✅ handleEdit() - carrega novos campos                                  │
│   ✅ closeForm() - reseta novos campos                                    │
│   ✅ handleSubmit() - salva novos campos                                  │
│                                                                             │
│ Localização: src/pages/clinica/base-sistema/ConveniosPage.jsx              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. SalasPage.jsx - ATUALIZADO ✅                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Novos campos BACKEND adicionados:                                          │
│   ✅ room_number (Número/Identificação da sala)                            │
│   ✅ capacity (Capacidade de pessoas - número)                             │
│   ✅ services_allowed (Serviços permitidos)                                │
│   ✅ resources (Recursos disponíveis - JSON)                               │
│   ✅ status (Status: available, maintenance, unavailable)                  │
│                                                                             │
│ Novos campos INTERFACE adicionados:                                        │
│   ✅ Input: Número/Identificação                                           │
│   ✅ Input: Capacidade (type="number", min="1", required)                 │
│   ✅ Select: Status (Disponível, Manutenção, Indisponível)               │
│   ✅ Textarea: Serviços Permitidos (comma-separated)                      │
│   ✅ Textarea: Recursos Disponíveis (JSON format)                          │
│                                                                             │
│ Validações atualizadas:                                                    │
│   ✅ Capacidade mínima: 1                                                  │
│   ✅ Capacidade deve ser número                                            │
│   ✅ Nome obrigatório                                                      │
│                                                                             │
│ Estado (FormData) atualizado:                                              │
│   ✅ handleNew() - inicializa novos campos                                │
│   ✅ handleEdit() - carrega novos campos                                  │
│   ✅ closeForm() - reseta novos campos                                    │
│   ✅ validateForm() - valida capacidade mínima                            │
│   ✅ handleSubmit() - salva novos campos                                  │
│                                                                             │
│ Localização: src/pages/clinica/base-sistema/SalasPage.jsx                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

═════════════════════════════════════════════════════════════════════════════════

MUDANÇAS AINDA NECESSÁRIAS:

┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. SERVICES PAGE - Tabela de Preços por Convênio (M:M)                      │
│    ⏳ PENDENTE: Implementar ComponenteServicePrices                         │
│       - Adicionar sub-página/aba                                            │
│       - Listar serviços com valor específico para cada convênio             │
│       - Permitir override do valor base                                     │
│       - Usar tabela dinâmica com inputs inline                              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. PROFESSIONALS PAGE - Abas Múltiplas                                      │
│    ⏳ PENDENTE: Refatorar para suportar 5 abas                              │
│       - Aba 1: Dados (formulário básico)                                    │
│       - Aba 2: Serviços (M:M professional_services)                         │
│       - Aba 3: Convênios (M:M professional_payer)                           │
│       - Aba 4: Agenda (professional_schedules com dias da semana)          │
│       - Aba 5: Financeiro (revenue_rules ou comissão/remuneração)          │
│       - Implementar usando Radix Tabs ou componente customizado             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. CONVENIOS PAGE - Serviços Cobertos (M:M Service_Prices)                 │
│    ⏳ PENDENTE: Implementar seleção de serviços cobertos                    │
│       - Multi-select ou checkbox list de serviços                           │
│       - Tabela dinâmica: [Serviço | Valor Específico deste Convênio]      │
│       - Botão para adicionar novos serviços à tabela                       │
│       - Opção de remover serviços da cobertura                              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. Selects Dinâmicos - Auditoria Completa                                  │
│    ⏳ PENDENTE: Revisar todos os componentes                                │
│       - Verificar se são carregados dinamicamente (não hardcoded)           │
│       - Verificar filtro por clinic_id em todos os selects                 │
│       - Implementar busca/filtro quando > 20 items                          │
│       - Garantir dependências entre campos (ex: serviços por prof)          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

═════════════════════════════════════════════════════════════════════════════════

PRÓXIMOS PASSOS:

1. Completar ConveniosPage:
   - Adicionar inputs visuais para novos campos no formulário
   - Implementar multi-select de serviços cobertos
   - Implementar tabela dinâmica de valores por serviço

2. Implementar Abas em ProfessionalsPage:
   - Criar componente TabsComponent ou usar Radix Tab
   - Refatorar ProfessionalsPage para suportar 5 abas
   - Aba 1: Dados básicos (atual formulário)
   - Aba 2: Services M:M (usar ProfessionalServicesPage)
   - Aba 3: Health Insurances M:M (usar ProfessionalPayerPage)
   - Aba 4: Schedule (usar ProfessionalSchedulePage)
   - Aba 5: Financial (usar RevenueRulesPage ou novo componente)

3. Atualizar SalasPage:
   - Adicionar campos: capacidade, serviços_permitidos
   - Implementar tabela dinâmica de recursos

4. Validar Selects Dinâmicos:
   - Auditar todos os componentes
   - Remover valores hardcoded
   - Implementar filtro por clinic_id
   - Adicionar busca onde necessário

═════════════════════════════════════════════════════════════════════════════════

ARQUIVO DE REFERÊNCIA:

📋 Localização: 03_frontend_base_do_sistema.prompt.txt
   Contém todas as regras obrigatórias e objetivo geral
   
═════════════════════════════════════════════════════════════════════════════════

Data de Criação: 15 de Janeiro de 2026
Versão: 1.0
Status: ⏳ 60% COMPLETO (4 de 7 seções implementadas)
