# Implementacao Centro de Custo ERP Hospitalar

## Estrutura criada
- Migracao `supabase/migrations/20260619101500_upgrade_financial_cost_centers_enterprise.sql`:
  - Expansao da tabela existente `financial_cost_centers` com campos enterprise: `center_type`, `unit_name`, `responsible_name`, `color`, `icon`, `metadata`.
  - Indices por tipo, unidade e responsavel.
  - Estrutura de rateio automatico:
    - `financial_cost_center_allocations`
    - `financial_cost_center_allocation_items`
  - RLS para leitura/escrita por clinica e perfis `admin`/`financeiro`.
- Biblioteca enterprise de centros de custo `src/lib/enterpriseCostCenters.js`:
  - Template ERP hospitalar multinivel (1 a 4 niveis) com codigos padrao.
  - Seed/upsert: `applyEnterpriseCostCenterTemplate`.
  - Reparo de descricoes: `repairCostCenterDescriptions`.
  - Classificacao automatica contextual: `detectCostCenterCodeByContext`.
  - Resolucao automatica de centro: `resolveEnterpriseCostCenterId`.

## Estrutura reutilizada
- Tabela existente `financial_cost_centers` (sem duplicacao).
- Modulo existente `src/modules/financeiro/centro-custo/**`.
- Toolbar de relatorios existente `src/components/financeiro/RelatoriosToolbar.jsx`.
- Integrador enterprise existente de plano de contas em `src/lib/enterpriseChartOfAccounts.js`.

## APIs utilizadas
- `src/modules/financeiro/centro-custo/services/costCentersApi.ts`:
  - CRUD de centros de custo existente.
  - Novas APIs de rateio:
    - `listCostCenterAllocations`
    - `saveCostCenterAllocation`
- `src/lib/financeApi.js`:
  - `createAP` com centro de custo obrigatorio e resolucao automatica.
- `src/lib/receivablesApi.js`:
  - `createReceivable` com centro de custo obrigatorio e resolucao automatica.

## Tabelas utilizadas
- `financial_cost_centers`
- `financial_cost_centers_audit`
- `financial_cost_center_allocations`
- `financial_cost_center_allocation_items`
- `ap_bills`
- `ar_invoices`
- `financial_transactions`
- `financial_chart_of_accounts`

## Integracoes realizadas
- Plano de Contas:
  - Mantida classificacao enterprise por conta contabil.
  - Centro de custo resolvido por contexto e preenchido automaticamente.
- Contas a Pagar:
  - Centro de custo obrigatorio no `createAP`.
  - Falha explicita quando nao existir centro configurado.
- Contas a Receber:
  - Centro de custo obrigatorio no `createReceivable`.
  - Resolucao automatica por especialidade, convenio, unidade e descricao.
- Fluxo de Caixa e DRE:
  - Integracao preservada por propagacao de lancamentos e invalidacao de cache/dashboard.
- Cockpit Financeiro:
  - Mantido consumo dos dados financeiros consolidados.

## Fluxos automatizados
- Aplicar modelo ERP de centros de custo na tela de Centro de Custos.
- Corrigir descricoes faltantes com base no template padrao.
- Sugerir centro de custo por contexto (assistencial, especialidade, convenio, unidade, administrativo, tecnologia, operacoes).
- Persistir regras de rateio com multiplos centros destino por percentual e/ou valor fixo.

## Impacto no Plano de Contas
- Contas configuradas com `requires_cost_center` passam a operar com classificacao consistente.
- Reduz risco de lancamentos sem dimensao gerencial.

## Impacto na DRE
- Preparacao para DRE por centro de custo, unidade, especialidade e convenio.
- Base estrutural consolidada em dimensoes empresariais.

## Impacto no Fluxo de Caixa
- Lançamentos de AP/AR passam a carregar centro de custo de forma obrigatoria/automatica.
- Melhora rastreabilidade de entradas e saidas por area.

## Impacto no Faturamento
- Classificacao por convenio, especialidade e unidade passa a ter alvo de centro de custo padrão.
- Facilita analises de margem e rentabilidade por linha assistencial.

## Impacto nos Recebiveis
- Impede criacao de recebivel sem centro de custo.
- Classifica automaticamente consultas, exames, telemedicina e convenios.

## Impacto nos Pagamentos
- Impede criacao de AP sem centro de custo.
- Classifica automaticamente despesas operacionais e administrativas por contexto.

## Validacao
- Build: executar `npm run build`.
- Staging: aplicar migracao e validar seed ERP + AP/AR obrigatorios.
- Producao: rollout com monitoramento de erros de classificacao.
- Performance: indices por `clinic_id`, `center_type`, `unit_name`, `responsible_name` e tabelas de rateio.
- Seguranca: RLS aplicada nas tabelas de rateio e centros.
- Multiempresa/Multiclinica: isolamento por `clinic_id`.
