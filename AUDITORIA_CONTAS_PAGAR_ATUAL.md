# Auditoria Contas a Pagar Atual

Data: 2026-06-11

## Escopo Auditado

Auditoria realizada antes da evolucao enterprise, com foco em evitar duplicacao de paginas, componentes, hooks, services e tabelas.

## Frontend

| Item | Status | Evidencia | Observacao |
| --- | --- | --- | --- |
| Rota principal `/clinica/financeiro/contas-pagar` | Implementado | `src/AppRoutes.jsx` | Usa o modulo moderno `src/modules/financeiro/contas-pagar/pages`. |
| Pagina moderna Contas a Pagar | Implementado | `src/modules/financeiro/contas-pagar/pages/index.tsx` | Dashboard, filtros, tabela, modais de criar/editar, pagar e cancelar. |
| Pagina legada ContasPagar | Parcial | `src/pages/clinica/financeiro/ContasPagar.jsx` | Mantida como legado/referencia; nao e a rota principal atual. |
| Criacao/edicao legada | Parcial | `src/pages/clinica/financeiro/NovaConta.jsx`, `src/pages/clinica/financeiro/EditarConta.jsx` | Tem itens, impostos, anexo e repasse; nao deve ser duplicada no modulo novo. |
| Componentes de dashboard | Parcial | `PayablesDashboard.tsx` | KPIs basicos implementados; faltavam quebras executivas e impacto financeiro local. |
| Data grid | Parcial | `PayablesTable.tsx` | Tabela com selecao e acoes; faltavam colunas enterprise e status ampliados. |
| Modais | Parcial | `CreateEditPayableModal.tsx`, `PayPayableModal.tsx`, `CancelPayableModal.tsx`, `InstallmentModal.tsx`, `RecurrenceModal.tsx` | Modais existentes reaproveitados. Pagamento tinha mismatch de parametros no modal ativo. |
| Hooks React Query | Implementado | `usePayables.ts` | Lista, detalhe, summary, auditoria, anexos, recorrencia, parcelamento e mutacoes. |
| Hooks de opcoes financeiras | Parcial | `useFinanceOptions.ts` | Carrega plano de contas e centros de custo; modal ainda usava inputs livres. |
| Contextos | Implementado | `useClinicContext`, `useAuth` | `clinic_id` e usuario disponiveis para tenant e auditoria. |
| Stores globais | Nao existe | - | Nao identificado store dedicado para contas a pagar. React Query e estado local sao o padrao atual. |

## Backend / APIs / Services

| Item | Status | Evidencia | Observacao |
| --- | --- | --- | --- |
| Service moderno de payables | Implementado | `src/modules/financeiro/contas-pagar/services/payablesApi.ts` | CRUD, pagamento, cancelamento, anexos, auditoria, recorrencia e parcelamento. |
| API financeira legada | Implementado | `src/lib/financeApi.js` | `listAPQuery`, `createAP`, `updateAP`, batch payment, plano de contas, fornecedores e metodos. |
| Fluxo de caixa dashboard | Parcial | `src/services/dashboardDataService.js`, `src/pages/clinica/financeiro/FluxoCaixa.jsx` | Consome AP para dashboard; integracao transacional depende de banco/RPC/triggers. |
| DRE | Parcial | `src/pages/clinica/financeiro/DRE.jsx`, `src/components/financeiro/DRE/DREDashboard` | Existe dashboard/rotas, mas alimentacao AP direta precisa padronizacao por plano/competencia. |
| Repasse medico | Parcial | `src/pages/financeiro/RepasseMedico*`, `src/lib/medicalRepasseApi` | Existe modulo de repasse; AP tem campos legados opcionais para linkage em telas antigas. |
| Conciliacao bancaria | Parcial | `src/pages/financeiro/Conciliador`, `src/pages/clinica/financeiro/ConciliacaoBancaria.jsx` | Existe modulo de conciliacao; matching AP nao esta centralizado no service moderno. |
| Triggers payables | Parcial | `supabase/migrations/20260518_expand_payables_enterprise.sql` | Trigger calcula liquido/saldo/status e audita mudancas. Status enterprise ampliado ainda incompleto. |

## Banco de Dados

| Tabela / Objeto | Status | Evidencia | Observacao |
| --- | --- | --- | --- |
| `ap_bills` | Implementado | migrations + APIs | Tabela real usada para contas a pagar. Deve ser reutilizada, nao criar `financial_payables`. |
| `financial_payables` | Nao existe | busca no workspace | Nao identificado uso real. Recomendacao: nao criar duplicata; evoluir `ap_bills`. |
| `financial_transactions` | Parcial | `src/modules/financeiro/lancamentos` | Motor de lancamentos existe; integracao automatica AP deve ser por referencia/metadados. |
| `cash_flow` | Parcial | APIs/dashboard/migrations existentes | Fluxo existe como dashboard/servicos; AP invalida caches e deve gerar/atualizar previsoes via banco. |
| `cash_flow_entries` | Parcial | busca em migrations/APIs | Ha referencias financeiras, mas nao foi identificado contrato unico AP -> cash_flow_entries no modulo novo. |
| `dre` | Parcial | paginas/components DRE | DRE existe, mas dependente de classificacao consistente. |
| `cost_centers` | Implementado | `useFinanceOptions`, `listCostCenters` | Reutilizar centros existentes; modal moderno precisava select real. |
| `chart_of_accounts` / plano de contas | Implementado | `ChartOfAccountsPage`, `listAccountPlans` | Reutilizar plano de contas existente; AP ja tem `chart_account_id`. |
| `financial_accounts` | Implementado | `src/modules/financeiro/contas-financeiras` | Contas financeiras existem; AP precisava campo/integração mais explicita. |
| `payable_recurring_configs` | Implementado | migration payables enterprise | Recorrencia ja criada. |
| `payable_attachments` | Implementado | migration payables enterprise | Anexos ja criados. |
| `payables_audit` | Implementado | migration payables enterprise | Auditoria ja criada. |

## Integracoes

| Integracao | Status | Observacao |
| --- | --- | --- |
| Fluxo de Caixa | Parcial | Dashboard consome AP e hooks invalidam cache; faltava reforco de metadados/eventos e consistencia no pagamento. |
| DRE | Parcial | Depende de plano de contas, centro de custo, categoria e competencia; campos existem, UX precisava exigir/sinalizar melhor. |
| Contas Financeiras | Parcial | Modulo existe; AP tinha input livre para conta financeira sem tipo declarado. |
| Centros de Custo | Parcial | Fonte existe; AP precisava select e preparar rateio. |
| Plano de Contas | Parcial | Fonte existe; AP precisava select e filtros/colunas mais visiveis. |
| Repasse Medico | Parcial | Modulo existe; preparacao deve ocorrer por metadados/tipo/categoria sem duplicar tabelas. |
| Conciliacao Bancaria | Parcial | Metodo de pagamento existe; matching automatico/manual ainda nao centralizado em AP. |
| Compras / Contratos / Hospitalar | Parcial | Campos/documentos podem ser carregados em metadados; nao ha workflow completo dedicado no AP moderno. |

## Conclusao da Auditoria

O caminho correto e consolidar no modulo ativo `src/modules/financeiro/contas-pagar`, reutilizando `ap_bills`, `payable_recurring_configs`, `payable_attachments`, `payables_audit`, `usePayables`, `useFinanceOptions`, `PayablesDashboard`, `PayablesTable` e os modais existentes.

Nao foram criadas tabelas duplicadas. A evolucao deve ampliar enums, metadados, UX, filtros, metricas e integracoes no service/hook existente.