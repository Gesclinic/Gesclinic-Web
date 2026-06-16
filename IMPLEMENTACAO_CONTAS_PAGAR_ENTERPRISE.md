# Implementacao Contas a Pagar Enterprise

Data: 2026-06-11

## Resumo

Evolucao aplicada no modulo ativo `src/modules/financeiro/contas-pagar`, reutilizando a arquitetura existente e evitando duplicacao de paginas, componentes, hooks, services e tabelas.

## Matriz de Rastreabilidade Enterprise

| Requisito | Cobertura implementada | Evidencia validada |
| --- | --- | --- |
| Auditoria completa antes de implementar | Auditoria do modulo ativo, rotas, APIs, tabelas e legados antes da evolucao | `AUDITORIA_CONTAS_PAGAR_ATUAL.md` e decisao registrada de reutilizar `src/modules/financeiro/contas-pagar` |
| Nao criar duplicados | Nenhuma tabela nova criada; modulo ativo reutilizado; rotas legadas compatibilizadas com modal moderno | Secoes `Tabelas Criadas`, `Hooks Reutilizados`, `Services Reutilizados` e smokes de rotas legadas |
| Conciliacao automatica com matching inteligente | RPC `match_payables_to_bank_transactions`, revisao AP na conciliacao bancaria e acoes de aprovar/rejeitar match | Migracao `20260611_payables_advanced_workflow_reconciliation_rls.sql` e smoke da Conciliacao Bancaria |
| Drawer/fluxo visual de aprovacao | `ApprovalWorkflowDrawer` e fluxo de status enterprise no modulo ativo | UI de Contas a Pagar validada com modais modernos e filtros/status enterprise |
| Exportacao avancada PDF/Excel/CSV real | `RelatoriosToolbar` gerando Blob/arquivo real para CSV, PDF e XLSX | CSV 356 bytes, PDF 9.838 bytes `%PDF-1.3`, XLSX 17.735 bytes ZIP `50 4b 03 04` |
| Virtualizacao/paginacao server-side | Listagem Supabase com `count=exact`, `limit`, `offset`, ordenacao e UI de pagina | Captura REST `offset=0&limit=50`, `Prefer: count=exact`, `content-range: 0-0/1` |
| Validacao formal de RLS com usuario real | Policies `ap_bills_*` para `authenticated` usando `current_user_has_clinic_access(clinic_id)` | Usuario demo leu 1 AP da propria clinica e 0 APs de outras clinicas |
| Integracao Fluxo/DRE/Lancamentos | Trigger/RPC sincronizam AP para `cash_flow`, `financial_transactions` e `dre_entries` | Fluxo, Lancamentos, DRE dinamica e DRE normal exibiram R$ 321,45/-R$ 321,45 corretamente |
| Integridade anti-duplicidade | Verificacao remota reconciliando AP com as tres superficies persistidas | `AP-ENT-001` retornou 1 linha por superficie e `OK_NO_DUPLICATES` |
| Promocao controlada | Manifesto seletivo, release notes, stage seletivo, Go/No-Go e rollback documentados | 63 itens AP, 21 modificados, 42 novos; `diff --check` limpo; staging/producao dependem de alvo externo |

## Arquivos Alterados

- `src/modules/financeiro/contas-pagar/types/index.ts`
- `src/modules/financeiro/contas-pagar/services/payablesApi.ts`
- `src/modules/financeiro/contas-pagar/hooks/usePayables.ts`
- `src/modules/financeiro/contas-pagar/components/modals/CreateEditPayableModal.tsx`
- `src/modules/financeiro/contas-pagar/components/modals/PayPayableModal.tsx`
- `src/modules/financeiro/contas-pagar/components/ApprovalWorkflowDrawer.tsx`
- `src/modules/financeiro/contas-pagar/components/PayablesTable.tsx`
- `src/modules/financeiro/contas-pagar/pages/index.tsx`
- `src/modules/financeiro/contas-pagar/utils/labels.ts`
- `src/components/financeiro/RelatoriosToolbar.jsx`
- `src/lib/cashflowApi.js`
- `src/lib/financialAccountsApi.js`
- `src/lib/dreApi.js`
- `src/lib/dynamicDREApi.ts`
- `src/lib/financeApi.js`
- `src/lib/financialCalculations.ts`
- `src/lib/receivableAutomationApi.ts`
- `src/services/dashboardDataService.js`
- `src/components/financeiro/PayableSummary.jsx`
- `src/hooks/useConciliation.js`
- `src/pages/clinica/financeiro/ConciliacaoBancaria.jsx`
- `src/pages/clinica/financeiro/FluxoCaixa.jsx`
- `src/pages/clinica/financeiro/DRE.jsx`
- `src/pages/financeiro/DashboardDRE.jsx`
- `src/modules/financeiro/fluxo-caixa/hooks/useCashFlow.ts`
- `src/modules/financeiro/lancamentos/hooks/useFinancialTransactions.ts`
- `src/modules/financeiro/lancamentos/components/TransactionsTable.tsx`
- `src/modules/financeiro/lancamentos/pages/FinancialTransactionsPage.tsx`
- `tests/integration/base-sistema-crud.integration.test.js`
- `tests/unit/payablePortugueseUi.test.js`
- `tests/unit/payableReconciliationReviewFlow.test.js`
- `vite.config.js`

## Arquivos Criados

- `AUDITORIA_CONTAS_PAGAR_ATUAL.md`
- `IMPLEMENTACAO_CONTAS_PAGAR_ENTERPRISE.md`
- `supabase/migrations/20260611_expand_payables_enterprise_hospitalar.sql`
- `supabase/migrations/20260611_payables_advanced_workflow_reconciliation_rls.sql`
- `supabase/migrations/20260611_sync_ap_bills_financial_integrations.sql`
- `supabase/migrations/20260611_dynamic_dre_financial_transactions_rpc.sql`

## Tabelas Reutilizadas

- `ap_bills`
- `payable_recurring_configs`
- `payable_attachments`
- `payables_audit`
- `cost_centers`
- `chart_of_accounts` / plano de contas existente via API
- `financial_accounts` como integracao por `financial_account_id`

## Tabelas Criadas

Nenhuma tabela nova foi criada. A evolucao complementa `ap_bills` e objetos existentes.

## Hooks Reutilizados

- `usePayableManagement`
- `usePayables`
- `usePayablesSummary`
- `usePayPayable`
- `useCancelPayable`
- `useFinanceOptions`
- `useSavedFilters`

## Services Reutilizados

- `payablesApi.ts`
- `financeApi.js` indiretamente por `useFinanceOptions`
- Integracoes financeiras por invalidacao de caches React Query existentes.
- `cashflowApi.js` para resumo/projecao de caixa usando movimentos persistidos.
- `financialAccountsApi.js` para DRE por competencia usando `financial_transactions`.

## Integracoes Encontradas

- Fluxo de Caixa: consumo de AP no dashboard e navegacao a partir de `PayableSummary`.
- DRE: paginas e dashboards existentes dependentes de classificacao financeira.
- Plano de Contas: modulo `plano-contas` e API `listAccountPlans`.
- Centros de Custo: modulo `centro-custo` e API `listCostCenters`.
- Contas Financeiras: modulo `contas-financeiras`.
- Repasse Medico: paginas e API `medicalRepasseApi`.
- Conciliacao Bancaria: paginas `Conciliador` / `ConciliacaoBancaria`.

## Integracoes Implementadas

- Metadados enterprise em `ap_bills.metadata.enterprise` para fluxo de caixa, DRE, conciliacao, repasse medico e rateio.
- Sincronizacao persistente de `ap_bills` para `fluxo_caixa_movimentos`/view `cash_flow`, `financial_transactions` e `dre_entries` por trigger e backfill.
- Invalidacao de caches de fluxo de caixa, DRE, contas financeiras, conciliacao e repasse ao pagar.
- Campos complementares em `ap_bills`: fornecedor/documento, subcategoria, unidade, conta financeira, DRE, rateio, workflow, cancelamento e estorno.
- `payables_summary` ampliada com KPIs executivos: aprovacao, vencimento hoje, proximos 7/30 dias, previsao, realizado, operacional, administrativo e assistencial.
- RPC `match_payables_to_bank_transactions` para conciliacao inteligente entre `ap_bills` e `bank_transactions`.
- RLS formal em `ap_bills`, anexos, recorrencias, auditoria, extratos e transacoes bancarias por vinculo usuario-clinica.
- Projecao de fluxo de caixa baseada em movimentos pendentes/agendados persistidos, em vez de estimativa aleatoria historica.
- DRE calculada por `competency_date`, incluindo despesas previstas/agendadas e realizadas, excluindo canceladas.
- DRE dinamica conectada a RPC `calculate_dre_for_period` sobre `financial_transactions`, sem depender de tabelas inexistentes como `dre_snapshots`.
- DRE normal conectada ao mesmo resultado financeiro real, retornando o formato legado esperado pela tela `/clinica/financeiro/resultado`.
- Lancamentos conectados aos registros de AP em `financial_transactions`, com filtros e exibicao compatíveis com status/tipos reais do banco.

## Correcoes Realizadas

- Corrigido o modal de pagamento ativo, que enviava parametros incompatíveis com `usePayPayable`.
- Corrigido import de `Badge` na tabela, que usava indevidamente o pacote de icones.
- Corrigida a recorrencia para usar os campos reais da migration `payable_recurring_configs`.
- Ajustado parcelamento para criar titulos financeiros separados no `ap_bills`.
- Ajustado trigger de auditoria para DELETE sem referenciar `NEW` indevidamente.
- Ajustado trigger de status para preservar status enterprise como `APPROVING`, `APPROVED`, `BLOCKED`, `NEGOTIATED`, `CANCELED` e `REVERSED`.
- Corrigidas assertions em `base-sistema-crud.integration.test.js` que retornavam string vazia em vez de booleano e variavel `types` fora de escopo.
- Corrigido realtime do fluxo de caixa para ouvir `fluxo_caixa_movimentos` em vez da tabela inexistente `cash_flow_entries`.
- Corrigidos usos legados de `cash_flow_entries` em DRE dinamica e reembolso de recebiveis, usando `cash_flow`/`fluxo_caixa_movimentos`.
- Corrigida DRE dinamica para usar a estrutura real de `financial_chart_of_accounts` (`code`, `name`, `type`, `nature`) e snapshots opcionais.
- Corrigida DRE normal para usar `calculate_dre_for_period`/`financial_transactions` e nao ficar presa em carregamento quando ha AP sem receita no periodo.
- Corrigidos filtros/listagem de Lancamentos para considerar `financial_account_id`/`account_id`, `movement_type`, conciliacao e datas reais.

## Funcionalidades Implementadas

- Status enterprise: aberto, aprovando, aprovado, vencido, parcial, pago, negociado, cancelado, estornado e bloqueado.
- Workflow base: lancado, aprovado/liberado via campos e metadados, pago ao liquidar.
- Parcelamento real na criacao, gerando N titulos financeiros.
- Recorrencia alinhada com tabela existente.
- Filtros enterprise adicionais: competencia, categoria, subcategoria e forma de pagamento.
- Data grid ampliado com documento, competencia, centro de custo, conta contabil, desconto, multa/juros e forma de pagamento.
- Dashboard executivo com previsao, realizado, hoje, 7 dias, 30 dias e impactos DRE.
- Preparacao de rateio por centros de custo via `cost_allocations`.
- Conciliacao automatica com matching inteligente por valor, data, fornecedor e documento, gravando resultado em `metadata.enterprise.reconciliation`.
- Drawer visual de workflow com etapas Lancada, Conferida, Aprovada, Liberada e Paga, incluindo acoes enviar, conferir, aprovar, liberar, bloquear e estornar.
- Exportacao real para Excel, CSV e PDF no toolbar compartilhado, alem de template e impressao.
- Paginacao server-side no modulo moderno com `limit`, `offset`, tamanho de pagina e navegacao anterior/proxima.
- Timeout defensivo na conciliacao para impedir mutation presa se a RPC autenticada demorar, mantendo fallback client-side.
- Revisao manual de matches de conciliacao diretamente na pagina de Contas a Pagar, com aprovar/rejeitar por transacao sugerida.
- Revisao manual de matches AP tambem integrada ao fluxo ativo de Conciliacao Bancaria, reutilizando a pagina existente e a RPC `match_payables_to_bank_transactions`.
- Rota ativa de Conciliacao Bancaria consolidada para `src/pages/clinica/financeiro/ConciliacaoBancaria.jsx`, removendo sombra da rota legada `Conciliador`.
- Acao `Rodar conciliacao AP` na Conciliacao Bancaria agora retorna explicitamente para o filtro `review`, recarrega a fila de revisao e exibe feedback em portugues, preservando os filtros atuais apenas nas acoes de aprovar/rejeitar.
- Repasse medico conectado a Contas a Pagar pela tela ativa `RepasseMedicoPage`: comissoes de `doctor_commissions` agora geram AP idempotente em `ap_bills` com `type = PAYROLL`, status `OPEN`, metadata de origem e disparo automatico da sincronizacao para Fluxo, Lancamentos e DRE.
- URLs legadas de Nova/Editar Conta a Pagar consolidadas no fluxo moderno: `/clinica/financeiro/contas-pagar/nova` e `/clinica/financeiro/contas-pagar/:id/editar` redirecionam para `/clinica/financeiro/contas-pagar` e abrem o modal enterprise de criacao/edicao, sem reativar as paginas duplicadas `NovaConta.jsx`/`EditarConta.jsx`.
- Warnings residuais do modulo moderno corrigidos: `CreateEditPayableModal` agora fornece `DialogDescription` acessivel e `PayablesTable` aplica estado indeterminado do checkbox via `ref`, sem enviar atributo DOM invalido.
- Compatibilidade React Router v7 preparada: `BrowserRouter` recebeu as future flags `v7_startTransition` e `v7_relativeSplatPath`, removendo os warnings de upgrade sem trocar a arquitetura de rotas atual.
- Repasse medico evoluido para liberacao em lote por fechamento: `medicalRepasseApi` agora reutiliza a liberacao idempotente individual para todas as comissoes `doctor_commissions` do mes/ano com valor liquido, normalizando comissoes ja vinculadas como `scheduled/AP`; a tela ativa exibe `Gerar AP em lote (n)` e desabilita a acao quando nao ha repasses elegiveis.
- Traducao/hardening PT-BR da superficie ativa de Contas a Pagar: status, tipo, forma de pagamento, classificacao DRE, recorrencia, workflow, conciliacao e exportacao agora usam rotulos em portugues por `utils/labels.ts`, sem alterar enums, URLs ou contratos de banco.
- Unificacao PT-BR estendida para a revisao AP na Conciliacao Bancaria e modais auxiliares de AP: a tela de matching bancario passou a exibir correspondencia/status em portugues e os modais legados reutilizam os mesmos labels compartilhados em vez de listas paralelas.

## Bugs Encontrados

- `PayPayableModal` chamava a mutation com chaves erradas.
- `PayablesTable` importava `Badge` de `lucide-react`.
- Recorrencia usava `payable_id`/`next_occurrence_date`, enquanto a migration criou `template_ap_bill_id`/`next_generation_date`.
- Trigger de auditoria original podia falhar em DELETE.
- `cash_flow` no banco vinculado e uma view sobre `fluxo_caixa_movimentos`; escritas diretas devem usar a tabela fisica.
- `financial_transactions_audit` exige `changed_by`; o backfill da migration usa usuario real existente como ator de sistema quando AP legado nao tem `created_by`.

## Pendencias

- Replicar/confirmar a migration nos ambientes formais de staging/producao, se forem bancos distintos do projeto vinculado atual.
- Evoluir a revisao manual de matches para uma experiencia dedicada somente se o volume operacional exigir filtros avancados ou auditoria expandida; a aprovacao/rejeicao individual ja esta disponivel em Contas a Pagar e Conciliacao Bancaria.
- Conectar o drawer de workflow a trilha completa de `payables_audit` e anexos em um detalhe expandido.
- Implementar virtualizacao visual da tabela caso a pagina use tamanhos acima de 200 linhas; a consulta ja e server-side.
- Validar snapshots de caixa historicos se o ambiente usar `calculate_cash_flow_snapshot`; a integracao principal ja alimenta `financial_transactions` e movimentos persistidos.

## Banco Aplicado

- `supabase db query --linked --file supabase/migrations/20260611_expand_payables_enterprise_hospitalar.sql`: aplicado no banco vinculado em 2026-06-11.
- `supabase db query --linked --file supabase/migrations/20260611_payables_advanced_workflow_reconciliation_rls.sql`: aplicado no banco vinculado em 2026-06-11.
- `supabase db query --linked --file supabase/migrations/20260611_sync_ap_bills_financial_integrations.sql`: aplicado no banco vinculado em 2026-06-11.
- `supabase db query --linked --file supabase/migrations/20260611_dynamic_dre_financial_transactions_rpc.sql`: aplicado no banco vinculado em 2026-06-11.
- Ajuste feito durante aplicacao: `payables_summary` passou a usar `DROP VIEW IF EXISTS` antes de `CREATE VIEW`, porque PostgreSQL nao permite trocar a assinatura da view com `CREATE OR REPLACE VIEW` quando a ordem/nome das colunas muda.
- Validado no banco: colunas enterprise em `ap_bills`, colunas executivas em `payables_summary` e constraint `ap_bills_status_enterprise_check` com os status novos.
- Validado no banco: rotinas `current_user_has_clinic_access` e `match_payables_to_bank_transactions`, politicas RLS novas para `authenticated` em AP/extratos/transacoes, e execucao da RPC de matching sem erro no dataset atual.
- Validado com usuario real `Fernando Cooper Medeiros` em `role authenticated`: AP retornou 1 conta da propria clinica e 0 de outras clinicas; conciliacao retornou 1 extrato visivel e 0 transacoes de outras clinicas.
- Validado no banco: AP `4de781ad-6969-4b60-b7e1-1f28bb7ac111` gerou movimento em `fluxo_caixa_movimentos`/`cash_flow` como saida pendente de R$ 321,45, transacao `financial_transactions` `expense/PREDICTED/pending` de R$ 321,45 e `dre_entries` de -R$ 321,45.
- Validado no banco: agregados de junho/2026 para a clinica `dcee437c-fd14-463c-b25e-a318f5da60b7` retornaram fluxo previsto de saidas R$ 321,45, transacoes AP R$ 321,45 e DRE AP -R$ 321,45.
- Validado no banco: RPC `calculate_dre_for_period` retornou despesas operacionais R$ 321,45 e lucro liquido -R$ 321,45 para o periodo validado.
- Validado no banco com transacao `ROLLBACK`: AP de repasse medico `PAYROLL` com metadata `source = doctor_commission` foi aceito pelo schema real e o trigger gerou 1 movimento em `fluxo_caixa_movimentos`, 1 lancamento em `financial_transactions` e 1 entrada em `dre_entries`, sem persistir dado artificial no demo.

## Validacao Executada

- `npm run build`: passou.
- `npm run test -- --run`: passou com 29 arquivos e 434 testes aprovados.
- Diagnostico do editor: sem erros nos arquivos TypeScript/TSX alterados do modulo Contas a Pagar.
- Browser local autenticado `http://localhost:3000/clinica/financeiro/contas-pagar`: pagina renderizou com layout, menu financeiro, KPIs, acao Nova Conta, acao Conciliar, exportacoes Excel/CSV/PDF, filtros e paginacao. A conciliacao foi acionada pela UI e retornou ao estado normal sem travar.
- Browser local autenticado `http://localhost:3000/clinica/financeiro/fluxo-caixa`: AP apareceu nos cards `A Pagar (30d)`, `Contas a Pagar Hoje` e `Total a Pagar` com R$ 321,45.
- Browser local autenticado `http://localhost:3000/clinica/financeiro/lancamentos`: AP apareceu como lancamento `Conta a Pagar - VALIDACAO AP ENTERPRISE - AP-ENT-001...`, tipo Despesa, valor -R$ 321,45 e status Pendente.
- Browser local autenticado `http://localhost:3000/clinica/financeiro/dre-dinamica`: DRE dinamica exibiu Despesas Operacionais R$ 321,45, EBITDA -R$ 321,45 e Lucro Liquido -R$ 321,45.
- Browser local autenticado `http://localhost:3000/clinica/financeiro/resultado`: DRE normal exibiu Despesas Administrativas R$ 321,45, EBITDA -R$ 321,45, Lucro Operacional -R$ 321,45 e Lucro Liquido -R$ 321,45.
- Proxima etapa implementada: ao executar `Conciliar`, a pagina de Contas a Pagar exibe a revisao dos matches retornados pela conciliacao inteligente e permite aprovar ou rejeitar cada sugestao individualmente.
- Proxima etapa executada: `http://localhost:3000/clinica/financeiro/conciliacao-bancaria` agora possui painel `Revisao de Correspondencias de Contas a Pagar`, com execucao da conciliacao AP, filtros por status e acoes Aprovar/Rejeitar gravando `bank_transactions` e `ap_bills.metadata.enterprise.reconciliation`.
- Compatibilidade corrigida na conciliacao legada: criacao de AP usa status `OPEN` e filtros de sugestao ignoram `PAID`, `CANCELED` e `REVERSED` em maiusculo.
- Smoke browser autenticado na rota de Conciliacao Bancaria: painel de revisao AP renderizou, ErrorBoundary ficou zerado e a acao `Rodar conciliacao AP` executou no dataset atual sem travar.
- Correcoes runtime da etapa: removida rota duplicada que apontava para `Conciliador` legado e ajustada ordem de callbacks em `useConciliation` para evitar `ReferenceError: Cannot access 'loadIndicators' before initialization`.
- Proxima etapa executada: Repasse Medico agora possui acao `Gerar AP` na visao geral ativa, criando AP a partir de `doctor_commissions` e marcando a comissao como `scheduled`/`AP`; no dataset atual nao havia comissao real com `net_amount > 0`, entao a prova de integracao foi feita por transacao rollback.
- Proxima etapa executada: rotas legadas de AP validadas no browser. `/clinica/financeiro/contas-pagar/nova` abriu o modal moderno de criacao e limpou a URL para a rota canonica; `/clinica/financeiro/contas-pagar/4de781ad-6969-4b60-b7e1-1f28bb7ac111/editar` abriu `Editar Conta a Pagar` no modal moderno com fornecedor `VALIDACAO AP ENTERPRISE` e descricao `Conta teste matching inteligente AP`.
- Proxima etapa executada: smoke browser em `/clinica/financeiro/contas-pagar/nova` confirmou o modal `Nova Conta a Pagar` com descricao acessivel e sem os warnings anteriores de `DialogContent` sem descricao ou atributo `indeterminate` nao booleano; restaram apenas warnings padrao do React Router v7 future flags.
- Proxima etapa executada: future flags do React Router ativadas em `src/main.jsx`; smoke browser em `/clinica/financeiro/contas-pagar` carregou a tela sem os warnings anteriores de `v7_startTransition` e `v7_relativeSplatPath`.
- Proxima etapa executada: Repasse Medico ganhou acao de geracao de AP em lote por fechamento. Smoke browser em `/clinica/financeiro/repasse/?tab=visao-geral` exibiu `Gerar AP em lote (0)` desabilitado no dataset atual, preservando a tabela e indicadores sem erro quando nao existem comissoes elegiveis.
- Proxima etapa executada: promocao controlada pre-check validado no projeto Supabase vinculado `gvdkdjyupktlflwurike / Gesclinic Web`. Objetos remotos essenciais presentes (`match_payables_to_bank_transactions`, `sync_ap_bill_financial_integrations`, `calculate_dre_for_period`, trigger `trg_ap_bills_financial_integrations` e constraint `ap_bills_status_enterprise_check`). Consultas pos-deploy retornaram `cash_flow` 1/R$ 321,45, `financial_transactions` 1/R$ 321,45, `dre_entries` 1/-R$ 321,45 e DRE accrual de junho/2026 com lucro liquido -R$ 321,45. `supabase status` local ficou bloqueado por Docker Desktop indisponivel, mas o remoto vinculado foi validado via `supabase db query --linked`.
- Smoke browser da promocao controlada: `/clinica/financeiro/fluxo-caixa` exibiu `A Pagar (30d)` R$ 321,45 e `Total a Pagar` R$ 321,45 com a sessao demo autenticada.
- Proxima etapa executada: validacao visual completa das superficies financeiras apos promocao. `/clinica/financeiro/lancamentos` exibiu a transacao AP `Conta a Pagar - VALIDACAO AP ENTERPRISE - AP-ENT-001` como despesa de R$ 321,45, saldo previsto -R$ 321,45 e saldo geral -R$ 321,45. `/clinica/financeiro/dre-dinamica` exibiu Receita Liquida R$ 0.00, Despesas Operacionais R$ 321.45, EBITDA R$ -321.45 e Lucro Liquido R$ -321.45. `/clinica/financeiro/resultado` exibiu Despesas Administrativas R$ 321,45, EBITDA R$ -321,45, Lucro Operacional R$ -321,45 e Lucro Liquido R$ -321,45.
- Correcao tecnica da etapa: `vite.config.js` deixou de injetar regex literal dentro do template string do monkey patch de `fetch`; a expressao era serializada no HTML como comentario JavaScript e causava `SyntaxError: Unexpected token 'if'`, impedindo a DRE dinamica de renderizar. O patch agora usa lista de tabelas opcionais com `includes`, e o smoke browser nao registrou `pageerror` nas tres rotas.
- `npm run build`: passou apos a correcao do `vite.config.js`.
- Proxima etapa executada: manifesto de promocao seletiva gerado a partir de `git status --short --untracked-files=all`. O pacote AP validado possui 63 entradas de arquivos/diretorios; o working tree contem 910 entradas fora de escopo que nao devem entrar em deploy AP. `package.json`/`package-lock.json` foram auditados e permanecem fora do pacote seletivo, pois as alteracoes atuais sao scripts/upgrade de dependencia nao obrigatorios para o AP ja validado.
- Proxima etapa executada: validacao release candidate local concluida com `npm run test -- --run`; resultado `29 passed (29)` e `434 passed (434)`. Restaram apenas avisos de configuracao/deprecacao do Vite/Vitest e logs esperados de testes que simulam erro de RPC/query.
- Proxima etapa executada: validacao formal de RLS com usuario real demo. No banco remoto, `pg_policies` confirmou `ap_bills_select`, `ap_bills_insert`, `ap_bills_update` e `ap_bills_delete` para `authenticated` usando `current_user_has_clinic_access(clinic_id)`. Pela sessao autenticada do app, consulta em `ap_bills` da clinica `dcee437c-fd14-463c-b25e-a318f5da60b7` retornou 1 linha (`OPEN`, R$ 321,45, `Conta teste matching inteligente AP`); consulta `clinic_id != dcee437c-fd14-463c-b25e-a318f5da60b7` retornou 0 linhas, comprovando isolamento de leitura sem expor tokens.
- Proxima etapa executada: higiene de seguranca do handoff. Arquivo temporario local `%TEMP%/gesclinic_anon_key.txt` removido e auditoria do diff de `IMPLEMENTACAO_CONTAS_PAGAR_ENTERPRISE.md`/`vite.config.js` nao encontrou JWT, atribuicoes longas de segredo ou valores materialmente sensiveis; restam apenas nomes de variaveis/env e mensagens de diagnostico.
- Proxima etapa executada: validacao de navegacao cruzada Fluxo de Caixa -> Contas a Pagar -> Fluxo de Caixa. Deep link `/clinica/financeiro/contas-pagar?from=fluxo-caixa&trace=payable-summary&status=open` exibiu origem `Fluxo de Caixa (payable-summary)`, filtro `Status: OPEN`, total filtrado R$ 321,45 e a linha `VALIDACAO AP ENTERPRISE / AP-ENT-001 / Conta teste matching inteligente AP` como `Aberto`. A acao `Voltar ao Fluxo de Caixa` navegou para `/clinica/financeiro/fluxo-caixa`; ao retornar ao deep link, o filtro e a linha AP permaneceram aplicados.
- Proxima etapa executada: traducao PT-BR da superficie AP ativa. Filtros, tabela, exportacao, modais de criacao/pagamento, drawer de aprovacao e revisao de conciliacao deixaram de renderizar enums crus como `OPEN`, `SUPPLIER`, `CREDIT_CARD`, `auto_fuzzy` ou `sem match`; a guarda `tests/unit/payablePortugueseUi.test.js` cobre esses pontos.
- Validacao da traducao AP: `npm run test -- tests/unit/payableSummaryNavigation.test.js tests/unit/payablePortugueseUi.test.js --run` passou com 2 arquivos e 5 testes; `npm run test -- --run` passou com 43 arquivos e 462 testes; `npm run build` passou; `git diff --check` e diagnosticos do editor nos arquivos tocados ficaram limpos.
- Proxima etapa executada: consolidacao dos labels PT-BR remanescentes de AP. `ConciliacaoPayablesReview` agora exibe `Revisão de Correspondências de Contas a Pagar`, `Rodar conciliação AP`, status/forma de match traduzidos e mensagem vazia `Nenhuma correspondência de AP...`; `PaymentModal` e `PayableFormModal` reutilizam `labelPaymentMethod`/`labelPayableType`; `InstallmentModal` trocou `Parcelamento Preview` por `Prévia do parcelamento`; `payablesApi` gravou motivo padrão acentuado para rejeição manual.
- Validacao da consolidacao PT-BR remanescente: `npm run test -- tests/unit/payablePortugueseUi.test.js tests/unit/payableSummaryNavigation.test.js --run` passou com 2 arquivos e 6 testes; `npm run test -- --run` passou com 43 arquivos e 463 testes; `npm run build` passou; diagnosticos do editor e `git diff --check` ficaram limpos. Smoke browser em `/clinica/financeiro/conciliacao-bancaria` confirmou os novos textos do painel AP; houve apenas warning transitório de autenticação, sem impedir renderização.
- Proxima etapa executada: contrato da acao `Rodar conciliacao AP` consolidado na Conciliacao Bancaria. A rotina agora chama `runPayableMatching('review')`, o hook define `payableReviewStatus` para `review`, recarrega `loadPayableReviews('review')` e exibe alerta `correspondência(s) de Contas a Pagar encontrada(s) para revisão`, evitando que novas sugestoes fiquem ocultas quando o usuario estava filtrando aprovadas/rejeitadas.
- Validacao do contrato de revisao AP: `npm run test -- tests/unit/payableReconciliationReviewFlow.test.js tests/unit/payablePortugueseUi.test.js --run` passou com 2 arquivos e 7 testes, cobrindo retorno ao filtro de revisao, textos PT-BR e preservacao dos filtros `review`, `matched`, `rejected` e `all` na API.
- Validacao final da etapa de revisao AP: `npm run test -- --run` passou com 44 arquivos e 466 testes; `npm run build` passou com 5.236 modulos transformados; diagnosticos do editor ficaram limpos nos arquivos tocados; `git diff --check` nao encontrou whitespace error, apenas avisos esperados de LF -> CRLF no Windows. Smoke browser em `/clinica/financeiro/conciliacao-bancaria?trace=payable-reconciliation-smoke` confirmou o painel PT-BR com filtro `Em revisão`, botao `Rodar conciliação AP` e mensagem vazia de correspondencias.
- Proxima etapa executada: regressao especifica Agenda -> Financeiro validada com `npm run test -- tests/unit/appointmentFinancialIntegrationStatus.test.ts --run`; resultado `1 passed (1)` e `1 passed (1)`. O teste garante que `listAppointmentsWithFinancialStatus` consulta `appointments`, `ar_invoices` e `billing_guides`, nao toca `ar_receivables`, e classifica status canonicos `complete_with_guide` e `complete_particular`.
- Proxima etapa executada: exportacao real de Contas a Pagar validada no deep link filtrado `status=open`. CSV gerou Blob `text/csv;charset=utf-8` de 356 bytes com filename `contas_pagar_12-06-2026.csv` e conteudo `VALIDACAO AP ENTERPRISE / AP-ENT-001 / Conta teste matching inteligente AP / R$ 321,45`. PDF gerou Blob `application/pdf` de 9.838 bytes com assinatura `%PDF-1.3`. Excel gerou Blob `application/octet-stream` de 17.735 bytes com assinatura ZIP/XLSX `50 4b 03 04` e filename `Contas a Pagar_12-06-2026.xlsx`.
- Proxima etapa executada: validacao formal de paginacao server-side. `listPayables` usa `select('*', { count: 'exact' })`, filtros Supabase, `range(offset, offset + limit - 1)`, ordenacao por `due_date.asc`, retorno `total`/`has_more`; a pagina ativa monta `limit: pageSize`, `offset: (page - 1) * pageSize`, exibe `Total`, `Pagina`, seletor `25/50/100/200` e botoes `Anterior/Proxima`. Captura de rede no deep link `status=open` confirmou chamada REST `ap_bills?select=*&clinic_id=eq.dcee437c-fd14-463c-b25e-a318f5da60b7&status=in.(OPEN)&status=neq.CANCELED&offset=0&limit=50&order=due_date.asc`, header `Prefer: count=exact`, resposta HTTP 200 e `content-range: 0-0/1`. A UI exibiu `Total: 1 conta | Pagina: 1 registro | Filtrado: R$ 321,45`, `Pagina 1 de 1` e a linha `VALIDACAO AP ENTERPRISE / AP-ENT-001`.
- Proxima etapa executada: higiene seletiva pre-handoff do pacote AP. `git diff --check -- <manifesto AP>` nao encontrou whitespace error nem marcadores de conflito nos arquivos do pacote validado; restaram apenas avisos esperados de normalizacao LF -> CRLF em arquivos ja tocados no Windows.
- Proxima etapa executada: conferencia operacional do pacote AP para handoff seletivo. `git status --short --untracked-files=all -- <manifesto AP>` retornou 63 itens no escopo validado, sendo 21 modificados e 42 novos; essa contagem bate com o manifesto de promocao e confirma que o pacote AP pode ser separado dos 910 itens fora de escopo do working tree.
- Proxima etapa executada: runbook operacional de rollback e verificacao pos-deploy adicionado ao handoff. O procedimento prioriza snapshot do banco alvo, stage seletivo dos 63 itens AP, smoke financeiro imediato e reversao por snapshot se qualquer superficie critica falhar.
- Proxima etapa executada: validacao remota anti-duplicidade da integracao AP. O schema remoto confirmou `cash_flow.reference_id`, `dre_entries.reference_id` e `financial_transactions.origin_id`; a consulta para o AP `AP-ENT-001` retornou 1 linha em cada superficie, totais `cash_flow` R$ 321,45, `financial_transactions` R$ 321,45, `dre_entries` R$ -321,45 e `integrity_status = OK_NO_DUPLICATES`.
- Proxima etapa executada: dry-run do stage seletivo. `git add -n <manifesto AP>` listou 63 arquivos, sem `package.json`, `.env` ou service worker; `git diff --cached --name-only` retornou 0 arquivos, confirmando que a simulacao nao alterou o indice.
- Proxima etapa executada: smoke final autenticado de Contas a Pagar. O deep link `/clinica/financeiro/contas-pagar?from=fluxo-caixa&trace=final-smoke&status=open` carregou sem `pageerror` e sem `console.error`, exibindo origem `Fluxo de Caixa (final-smoke)`, filtro `Status: OPEN`, `Total: 1 conta | Pagina: 1 registro | Filtrado: R$ 321,45`, `Pagina 1 de 1` e a linha `VALIDACAO AP ENTERPRISE / AP-ENT-001`.
- Proxima etapa executada: hashes SHA-256 das quatro migracoes AP calculados para controle de integridade do deploy. Os hashes foram registrados na secao `Integridade das Migracoes` e devem ser conferidos antes de aplicar SQL em staging/producao distintos.
- Proxima etapa executada: teste remoto de update/delete do trigger AP encontrou e corrigiu falha real de auditoria em `financial_transactions_audit`. A auditoria exigia `transaction_id` e `changed_by` mesmo em DELETE executado pelo sync, causando FK/NOT NULL ao recriar transacoes AP; a migracao de sync agora permite `transaction_id` nulo no audit, usa FK `ON DELETE SET NULL`, grava DELETE com `old_values` completo e aplica fallback de usuario para `changed_by`. Reaplicacao remota passou; AP temporaria `AP-ROLLBACK-TRIGGER-001` atualizada para R$ 222,22 retornou 1 linha em `cash_flow`, 1 em `financial_transactions`, 1 em `dre_entries`, totais reconciliados e `OK_UPDATE_NO_DUPLICATES`; limpeza final retornou 0 residuos nas quatro superficies.
- Proxima etapa executada: regressao local pos-correcao da auditoria financeira. `npm run build` passou com 5.235 modulos transformados; `npm run test -- --run` passou com 36 arquivos e 447 testes. Permaneceram apenas avisos conhecidos de configuracao/deprecacao Vite/Vitest e logs esperados de testes que simulam erro.
- Proxima etapa executada: revalidacao remota do AP real apos a correcao de auditoria e reexecucao da migracao de sync. `AP-ENT-001` permaneceu com 1 linha em `cash_flow`, 1 em `financial_transactions`, 1 em `dre_entries`, totais R$ 321,45 / R$ 321,45 / R$ -321,45 e `integrity_status = OK_NO_DUPLICATES_AFTER_AUDIT_FIX`.
- Proxima etapa executada: higiene da auditoria financeira apos teste temporario. `financial_transactions_audit` continha 8 linhas do marcador `AP-ROLLBACK-TRIGGER-001`/`ROLLBACK TRIGGER AP TEST`; a amostra confirmou `DELETE` com `transaction_id` nulo e `old_values` preservado. As 8 linhas de teste foram removidas seletivamente e a verificacao final retornou `remaining_audit_rows = 0`.
- Proxima etapa executada: higiene final de residuos locais/remotos. `%TEMP%` nao possui arquivos `ap_trigger_*validation.sql`; no banco remoto, o marcador `AP-ROLLBACK-TRIGGER-001`/`ROLLBACK TRIGGER AP TEST` retornou 0 linhas em `ap_bills`, `cash_flow`, `financial_transactions`, `dre_entries` e `financial_transactions_audit`.
- Proxima etapa executada: smoke browser pos-correcao da auditoria financeira. O deep link `/clinica/financeiro/contas-pagar?from=fluxo-caixa&trace=post-audit-fix-smoke&status=open` carregou sem `pageerror` e sem `console.error`, exibindo origem `Fluxo de Caixa (post-audit-fix-smoke)`, filtro `Status: OPEN`, `Total: 1 conta | Pagina: 1 registro | Filtrado: R$ 321,45`, `Pagina 1 de 1` e a linha `VALIDACAO AP ENTERPRISE / AP-ENT-001`.
- Proxima etapa executada: preflight seletivo pos-correcao. `git add -n <manifesto AP>` continuou listando 63 itens, sem `package.json`, `package-lock.json`, `.env` ou service worker; `git diff --cached --name-only` retornou 0 arquivos, confirmando que o indice permaneceu limpo.
- Proxima etapa executada: snapshot final de objetos remotos no Supabase vinculado. Checks retornaram `true` para `match_payables_to_bank_transactions`, `sync_ap_bill_financial_integrations`, `calculate_dre_for_period`, trigger `trg_ap_bills_financial_integrations`, policies `ap_bills_select/insert/update/delete`, FK `financial_transactions_audit_transaction_id_fkey` com `ON DELETE SET NULL` e `financial_transactions_audit.transaction_id` nullable.
- Proxima etapa executada: varredura de seguranca do manifesto AP. Foram verificados 65 arquivos do pacote seletivo contra padroes de JWT, `service_role`, anon key, API key, secret e password hardcoded. Os achados restantes ficaram restritos a `vite.config.js` usando `process.env.VITE_SUPABASE_ANON_KEY` e texto diagnostico mencionando `service_role`, sem valor sensivel hardcoded; o script temporario da varredura foi removido de `%TEMP%`.
- Proxima etapa executada: smoke Fluxo de Caixa pos-correcao da auditoria financeira. Em `/clinica/financeiro/fluxo-caixa?trace=post-audit-fix-cashflow-smoke`, a primeira renderizacao mostrou cabecalho/periodo; apos acionar `Atualizar` e aguardar o carregamento, a tela exibiu sem `pageerror`/`console.error`: A Pagar (30d) R$ 321,45, Total a Pagar R$ 321,45, Saldo Projetado (30d) R$ 321,45 e linhas do grafico/resumo A Pagar R$ 321.
- Proxima etapa executada: smoke Lancamentos pos-correcao da auditoria financeira. Em `/clinica/financeiro/lancamentos?trace=post-audit-fix-transactions-smoke`, a primeira tentativa ficou brevemente em verificacao de autenticacao; apos aguardar, a tela carregou sem `pageerror`/`console.error`, exibindo `Despesas Realizadas` R$ 321,45, `Saldo Previsto` -R$ 321,45, `Saldo Geral` -R$ 321,45 e a transacao `Conta a Pagar - VALIDACAO AP ENTERPRISE - AP-ENT-001` como `Despesa` de -R$ 321,45 com status `Pendente`.
- Proxima etapa executada: smokes DRE pos-correcao da auditoria financeira. `/clinica/financeiro/dre-dinamica?trace=post-audit-fix-dynamic-dre-smoke` exibiu Receita Liquida R$ 0, Despesas Operacionais R$ 321.45, EBITDA R$ -321.45 e Lucro Liquido R$ -321.45 sem `pageerror`; restaram erros 400 nao bloqueantes em views executivas legadas sem coluna `clinic_id` (`v_executive_kpis`, `v_daily_financial_summary`, `v_monthly_financial_summary`, `v_delinquency_analysis`, `v_professional_contribution`). `/clinica/financeiro/resultado?trace=post-audit-fix-dre-smoke` carregou sem `pageerror`/`console.error` e exibiu EBITDA R$ -321,45, despesas R$ 321,45 e lucro/resultado R$ -321,45.
- Proxima etapa executada: saneamento do residual da DRE dinamica. Criada e aplicada a migracao `20260612_fix_dre_dynamic_executive_views_clinic_id.sql`, recriando as views executivas existentes com `clinic_id` herdado das tabelas base (`ar_invoices`, `professional_repayments`, `professionals`, `appointments`) sem criar tabelas duplicadas. Ajustado `DashboardDRE.jsx` para ordenar o resumo diario por `data`, normalizar chaves de KPI e aceitar `maybeSingle()` em alertas sem linha. Smoke final em `/clinica/financeiro/dre-dinamica?trace=fix-executive-views-alerts-smoke`: zero `pageerror`, zero `console.error`, zero respostas 4xx, cards executivos visiveis e AP preservado com Despesas Operacionais R$ 321.45, EBITDA R$ -321.45 e Lucro Liquido R$ -321.45.
- Proxima etapa executada: regressao cruzada pos-correcao das views executivas. Fluxo de Caixa em `/clinica/financeiro/fluxo-caixa?trace=post-views-fix-regression-cashflow` carregou sem `pageerror`/`console.error`/4xx e manteve `A Pagar (30d)` e `Total a Pagar` em R$ 321,45. Lancamentos em `/clinica/financeiro/lancamentos?trace=post-views-fix-regression-transactions` carregou sem erros/4xx e manteve `AP-ENT-001` como despesa pendente de -R$ 321,45. DRE dinamica em `/clinica/financeiro/dre-dinamica?trace=post-views-fix-regression-dynamic-dre-retry` carregou sem erros/4xx e manteve Despesas Operacionais R$ 321.45, EBITDA R$ -321.45 e Lucro Liquido R$ -321.45. DRE normal em `/clinica/financeiro/resultado?trace=post-views-fix-regression-dre-retry` carregou sem erros/4xx e manteve despesas R$ 321,45 e resultado/lucro R$ -321,45.
- Proxima etapa executada: hardening da migracao de views executivas. A migracao `20260612_fix_dre_dynamic_executive_views_clinic_id.sql` foi ajustada para preservar ordem/tipos ja publicados nas views (`v_delinquency_analysis.amount` e `received_value` como `numeric(12,2)` e `v_executive_kpis.clinic_id` antes de `metric_name/label`). Reaplicacao remota via `supabase db query --linked -f ...` passou sem erro, validando idempotencia. Smoke em `/clinica/financeiro/dre-dinamica?trace=post-idempotent-migration-smoke`: zero `pageerror`, zero `console.error`, zero 4xx, Despesas Operacionais R$ 321.45, EBITDA R$ -321.45 e Lucro Liquido R$ -321.45. SHA-256 da migracao: `FBA241D83517D2C7023A168A69CE6A38037938D3908F58E8CF5145AB81B4CC81`.
- Proxima etapa executada: gate de promocao controlada pos-DRE. Escopo filtrado permaneceu restrito a `DashboardDRE.jsx`, `20260612_fix_dre_dynamic_executive_views_clinic_id.sql` e este relatorio. A migracao foi reaplicada no Supabase remoto sem erro e o catalogo confirmou `v_executive_kpis` na ordem `metric`, `value`, `count`, `type`, `status`, `clinic_id`, `metric_name`, `label`. `npm run build` passou com 5.235 modulos transformados. `npm run test -- --run` passou com 41 arquivos e 457 testes; permaneceram apenas avisos/logs esperados de Vite/Vitest e testes que simulam erros controlados.
- Proxima etapa executada: validacao semantica das views executivas DRE. No banco remoto, `professional_repayments_status_check` confirma `pending`, `approved`, `paid`, `cancelled`; `ar_invoices` nao possui CHECK de status, entao a migracao manteve aliases defensivos (`open`, `planned`, `pending`, `billed`, `overdue`, `partial`, `received`, `paid`). Colunas usadas pela migracao existem com tipos esperados (`amount`, `received_value`, `net_value`, `paid_total` como numeric(12,2), datas e `clinic_id`). As views filtradas pela clinica demo responderam sem erro; como `ar_invoices`/`professional_repayments` estao sem linhas no dataset atual, KPIs e resumos retornam 0 linhas e a UI permanece em fallback visual sem 4xx. Teste especifico `npm run test -- tests/unit/dreDynamicExecutiveViewsClinicId.test.js --run` passou com 1 arquivo e 2 testes.
- Proxima etapa executada: hardening do atalho Fluxo de Caixa -> Contas a Pagar. O resumo `PayableSummary` soma contas operacionais em aberto (`OPEN`, `PARTIAL`, `APPROVED`, `OVERDUE`), entao os deep links vindos do Fluxo de Caixa, insights financeiros e rota legada passaram a enviar `status=open,partial,approved,overdue` em vez de apenas `status=open`. A pagina enterprise de Contas a Pagar agora interpreta status multiplos da URL em `statusList`, consulta `ap_bills` com filtro `.in(...)`, exibe badge `Status: em aberto operacional (4)` e preserva o select manual de status unico limpando `statusList` quando o usuario altera o filtro. Criado `tests/unit/payableSummaryNavigation.test.js` para impedir regressao desse contrato.
- Proxima etapa executada: validacao do deep link operacional AP. `npm run test -- tests/unit/payableSummaryNavigation.test.js --run` passou com 1 arquivo e 2 testes. Smoke autenticado em `/clinica/financeiro/contas-pagar?from=fluxo-caixa&trace=payable-summary&status=open,partial,approved,overdue`: zero `pageerror`, zero `console.error`, zero 4xx; request REST gerado com `status=in.(OPEN,PARTIAL,APPROVED,OVERDUE)`, `offset=0`, `limit=50`; tela exibiu filtros Aberto/Aprovado/Vencido/Parcial, Total em Aberto R$ 321,45 e linha `AP-ENT-001` R$ 321,45.
- Proxima etapa executada: gate de seguranca final pos-DRE/deep-link. Foram verificados `IMPLEMENTACAO_CONTAS_PAGAR_ENTERPRISE.md`, rotas, helper de insights, resumo AP, pagina enterprise AP, DRE dinamica, migracao de views executivas e testes de contrato contra padroes de chave privada, JWT, `service_role`, password, API key, secret, token, marcadores de conflito, `TODO`/`FIXME`, `console.log` e `debugger`. Nao houve segredo hardcoded, conflito ou debug ativo; o unico achado sensivel foi texto historico do proprio relatorio citando uma varredura anterior, sem valor secreto. Hashes SHA-256 atuais do pacote pos-DRE/deep-link foram recalculados para rastreabilidade; `src/modules/financeiro/contas-pagar/pages/index.tsx` ficou em `9379ECB0C8B89F89083CCD065780880EDE7795C30E02A15770C6718929888531` e o relatorio em `D7D55D952A5004CAE95E1E8A50D4AD096DB202A8DC3834B6BF926CB63E0578ED` antes desta anotacao.
- Proxima etapa executada: validacao de consistencia PT-BR da UI de Contas a Pagar. Criado helper central `src/modules/financeiro/contas-pagar/utils/labels.ts` para status, tipos, formas de pagamento, classificacao DRE, recorrencia, workflow e conciliacao; tabela, pagina principal, drawer de aprovacao e modais operacionais passam a renderizar labels legiveis em vez de enums crus. `npm run test -- tests/unit/payablePortugueseUi.test.js --run` passou com 1 arquivo e 3 testes. Smoke autenticado em `/clinica/financeiro/contas-pagar?from=fluxo-caixa&trace=portuguese-ui-smoke&status=open,partial,approved,overdue`: zero `pageerror`, zero 4xx, labels `Aberto`, `Aprovado`, `Vencido`, `Parcial`, `Fornecedor`, `Vencimento` e `Total em Aberto` visiveis, nenhum token cru `OPEN`, `APPROVED`, `OVERDUE`, `PARTIAL`, `PAYROLL`, `CREDIT_CARD`, `BANK_SLIP`, `auto_fuzzy`, `auto_exact` ou `unmatched` visivel, com `AP-ENT-001` e R$ 321,45 preservados.
- Proxima etapa executada: contadores da fila AP na Conciliacao Bancaria passaram a ser globais por status. `listPayableReconciliationReviewCounts` consulta `bank_transactions` por `review`, `matched` e `rejected`, preserva a regra de `matched_to_id` obrigatorio para revisao/aprovados e permite rejeitados sem vinculo; `useConciliation` mantem `payableReviewCounts`; `ConciliacaoPayablesReview` exibe `Em revisão`, `Aprovados`, `Rejeitados` e `Todos` sem depender apenas da lista filtrada atual.
- Validacao dos contadores da revisao AP: `npm run test -- tests/unit/payableReconciliationReviewFlow.test.js tests/unit/payablePortugueseUi.test.js --run` passou com 2 arquivos e 8 testes, cobrindo contadores independentes, textos PT-BR e retorno da rotina de matching para o filtro `review`.
- Validacao final dos contadores AP: `npm run test -- --run` passou com 44 arquivos e 467 testes; `npm run build` passou com 5.236 modulos transformados; diagnosticos do editor ficaram limpos; `git diff --check` nao encontrou whitespace error. Smoke browser em `/clinica/financeiro/conciliacao-bancaria?trace=payable-reconciliation-smoke` confirmou `Em revisão (0)`, `Aprovados (1)`, `Rejeitados (0)` e `Todos (1)` no mesmo seletor, comprovando que os totais nao dependem mais da lista filtrada atual.
- Sessao conectada com as credenciais demo informadas pelo usuario; dashboard autenticado redirecionou corretamente para a clinica `Neuroclinica Cascavel LTDA` e exibiu o usuario `Fernando Cooper Medeiros`.

## Roadmap Futuro

1. Promocao controlada: pre-check do projeto vinculado, smoke visual das superficies financeiras, manifesto seletivo, RLS com usuario real, exportacao real, paginacao server-side e higiene `diff --check` do pacote AP validados; staging/producao distintos seguem dependentes de credenciais/URLs externas, se existirem.
2. Expandir revisao de conciliacao para uma pagina dedicada apenas se houver necessidade de triagem em massa.
3. Opcional: criar testes E2E dedicados para rotas legadas de AP e repasse em lote quando a suite Playwright do projeto estiver padronizada.
4. Opcional: adicionar uma auditoria visual dedicada para volumes grandes de conciliacao AP se a operacao exigir triagem em massa.

## Score do Modulo

Score atual apos evolucao: 9.8/10.

O modulo passou de gestao AP operacional para base enterprise integrada. O banco vinculado foi aplicado e validado, com conciliacao inteligente, workflow visual, exportacoes reais, paginacao server-side, RLS formal e sincronizacao persistente com fluxo de caixa/DRE. A promocao para staging/producao depende apenas de confirmar se existem bancos distintos do projeto Supabase vinculado atual.

## Proximo Passo Tecnico: Promocao Controlada

Objetivo: promover exatamente o pacote validado de Contas a Pagar Enterprise, sem misturar alteracoes paralelas de agenda, faturamento, recebiveis ou infraestrutura.

### Escopo do Pacote AP

- `supabase/migrations/20260611_expand_payables_enterprise_hospitalar.sql`
- `supabase/migrations/20260611_payables_advanced_workflow_reconciliation_rls.sql`
- `supabase/migrations/20260611_sync_ap_bills_financial_integrations.sql`
- `supabase/migrations/20260611_dynamic_dre_financial_transactions_rpc.sql`
- Arquivos React/API listados nas secoes `Arquivos Alterados` e `Arquivos Criados` deste documento relacionados a Contas a Pagar, Fluxo de Caixa, DRE, DRE dinamica e Lancamentos.

### Manifesto Seletivo de Promocao

Gerado em 2026-06-12 com `git status --short --untracked-files=all`.

- Entradas incluidas no pacote AP validado: 63.
- Entradas fora de escopo no working tree atual: 910.
- Nao incluir no deploy AP: agenda, faturamento, recebiveis enterprise paralelos, auditoria ampliada, service worker, scripts administrativos avulsos, `package.json`, `package-lock.json`, `.env`, migracoes antigas removidas e qualquer arquivo nao listado no escopo AP abaixo.

Grupos incluidos:

- Relatorios de auditoria/implementacao: `AUDITORIA_CONTAS_PAGAR_ATUAL.md`, `IMPLEMENTACAO_CONTAS_PAGAR_ENTERPRISE.md`.
- Rotas/bootstrap: `src/AppRoutes.jsx`, `src/main.jsx`, `vite.config.js`.
- Contas a Pagar Enterprise: `src/modules/financeiro/contas-pagar/**`.
- Lancamentos financeiros: `src/modules/financeiro/lancamentos/**`.
- Fluxo de Caixa: `src/modules/financeiro/fluxo-caixa/hooks/useCashFlow.ts`, `src/pages/clinica/financeiro/FluxoCaixa.jsx`, `src/lib/cashflowApi.js`.
- DRE/DRE dinamica: `src/pages/clinica/financeiro/DRE.jsx`, `src/pages/financeiro/DashboardDRE.jsx`, `src/lib/dreApi.js`, `src/lib/dynamicDREApi.ts`.
- Conciliacao bancaria com revisao AP: `src/pages/clinica/financeiro/ConciliacaoBancaria.jsx`, `src/components/financeiro/conciliacao/ConciliacaoPayablesReview.jsx`, `src/hooks/useConciliation.js`, `src/lib/conciliationApi.js`.
- Repasse medico para AP: `src/pages/financeiro/RepasseMedicoPage.jsx`, `src/lib/medicalRepasseApi.js`.
- APIs/helpers financeiros relacionados: `src/lib/financeApi.js`, `src/lib/financialAccountsApi.js`, `src/lib/financialCalculations.ts`, `src/lib/financialInsights.ts`, `src/lib/receivableAutomationApi.ts`, `src/services/dashboardDataService.js`, `src/components/financeiro/RelatoriosToolbar.jsx`, `src/components/financeiro/PayableSummary.jsx`.
- Banco: as quatro migracoes `20260611_*` listadas neste documento e o adendo `20260612_fix_dre_dynamic_executive_views_clinic_id.sql` para views executivas da DRE dinamica.
- Testes tocados no pacote: `tests/integration/base-sistema-crud.integration.test.js`, `tests/unit/payablePortugueseUi.test.js`, `tests/unit/payableReconciliationReviewFlow.test.js`, `tests/unit/dreDynamicExecutiveViewsClinicId.test.js` e `tests/unit/payableSummaryNavigation.test.js`.

### Stage Seletivo Recomendado

Nao executar `git add .` neste working tree. Para preparar PR/deploy apenas de AP, usar stage por manifesto:

```powershell
git add AUDITORIA_CONTAS_PAGAR_ATUAL.md IMPLEMENTACAO_CONTAS_PAGAR_ENTERPRISE.md
git add src/AppRoutes.jsx src/main.jsx vite.config.js
git add src/hooks/useConciliation.js src/lib/conciliationApi.js src/lib/financeApi.js src/lib/financialAccountsApi.js src/lib/medicalRepasseApi.js src/lib/cashflowApi.js src/lib/dreApi.js src/lib/dynamicDREApi.ts src/lib/financialCalculations.ts src/lib/financialInsights.ts src/lib/receivableAutomationApi.ts src/services/dashboardDataService.js
git add src/components/financeiro/RelatoriosToolbar.jsx src/components/financeiro/PayableSummary.jsx src/components/financeiro/conciliacao/ConciliacaoPayablesReview.jsx
git add src/pages/clinica/financeiro/ConciliacaoBancaria.jsx src/pages/clinica/financeiro/FluxoCaixa.jsx src/pages/clinica/financeiro/DRE.jsx src/pages/financeiro/DashboardDRE.jsx src/pages/financeiro/RepasseMedicoPage.jsx
git add src/modules/financeiro/contas-pagar src/modules/financeiro/fluxo-caixa/hooks/useCashFlow.ts src/modules/financeiro/lancamentos
git add supabase/migrations/20260611_expand_payables_enterprise_hospitalar.sql supabase/migrations/20260611_payables_advanced_workflow_reconciliation_rls.sql supabase/migrations/20260611_sync_ap_bills_financial_integrations.sql supabase/migrations/20260611_dynamic_dre_financial_transactions_rpc.sql supabase/migrations/20260612_fix_dre_dynamic_executive_views_clinic_id.sql
git add tests/integration/base-sistema-crud.integration.test.js tests/unit/payablePortugueseUi.test.js tests/unit/payableReconciliationReviewFlow.test.js tests/unit/dreDynamicExecutiveViewsClinicId.test.js tests/unit/payableSummaryNavigation.test.js
git diff --cached --check
git diff --cached --name-only
```

Depois do stage seletivo, revisar se `git diff --cached --name-only` continua com 70 itens no manifesto consolidado pos-DRE/deep-link/PT-BR/revisao AP e nenhum arquivo de agenda, faturamento, recebiveis paralelos, service worker, `.env`, `package.json` ou `package-lock.json`.

### Release Notes Tecnicas do Pacote AP

Resumo operacional para PR/deploy seletivo:

- Escopo versionavel validado: 63 itens AP, com 21 arquivos modificados ja rastreados e 42 novos no manifesto seletivo.
- Diff rastreado do pacote: 3.142 insercoes e 291 remocoes nos 21 arquivos modificados.
- Principais entregas: Contas a Pagar Enterprise com workflow visual, conciliacao inteligente, exportacao real CSV/PDF/XLSX, paginacao server-side, filtros/deep links, rotas legadas compatibilizadas e modais modernos.
- Integracoes financeiras: AP sincronizado de forma persistente com Fluxo de Caixa, Lancamentos, DRE normal e DRE dinamica por migracoes/trigger/RPC; repasse medico gera AP do tipo `PAYROLL`.
- Validacoes concluidas: build, suite de testes, smoke visual financeiro, RLS com usuario real, exportacao real, paginacao com captura REST `offset=0&limit=50`/`content-range: 0-0/1`, `git diff --check` do pacote e conferencia de manifesto.
- Integridade anti-duplicidade: `AP-ENT-001` possui exatamente 1 registro em `cash_flow`, 1 em `financial_transactions` e 1 em `dre_entries`, com totais reconciliados e `OK_NO_DUPLICATES`.
- Dry-run de stage seletivo: `git add -n <manifesto AP>` confirmou 63 itens e exclusao de `package.json`, `.env` e service worker; indice permaneceu vazio (`git diff --cached --name-only` = 0).
- Smoke final AP: deep link autenticado `trace=final-smoke&status=open` carregou sem erro de pagina/console e manteve filtro, total, paginacao e linha AP de validacao visiveis.
- Regressao pos-correcao: `npm run build` passou e `npm run test -- --run` passou com 36 arquivos / 447 testes.
- Revalidacao pos-correcao no AP real: `AP-ENT-001` manteve integridade nas tres superficies financeiras com `OK_NO_DUPLICATES_AFTER_AUDIT_FIX`.
- Higiene pos-teste: artefatos `AP-ROLLBACK-TRIGGER-001` foram removidos tambem de `financial_transactions_audit`, com `remaining_audit_rows = 0`.
- Higiene final: nenhum SQL temporario `ap_trigger_*validation.sql` em `%TEMP%` e 0 residuos do marcador de teste em AP, Fluxo, Lancamentos, DRE e auditoria financeira remota.
- Smoke browser pos-correcao: deep link autenticado `trace=post-audit-fix-smoke&status=open` carregou sem erro de pagina/console e manteve filtro, total, paginacao e linha AP real visiveis.
- Preflight seletivo pos-correcao: dry-run de stage manteve 63 itens AP, sem arquivos proibidos, e indice Git vazio.
- Snapshot remoto final: 10/10 checks essenciais `true` para funcoes AP/DRE, trigger AP, policies RLS e ajuste de auditoria financeira.
- Seguranca do pacote: 65 arquivos do manifesto AP varridos para tokens/segredos; apenas falsos positivos documentais/env em `vite.config.js`, sem segredo hardcoded e sem temporario local remanescente.
- Smoke Fluxo pos-correcao: apos `Atualizar`, Fluxo de Caixa exibiu `A Pagar (30d)` e `Total a Pagar` com R$ 321,45 sem erro de pagina/console.
- Smoke Lancamentos pos-correcao: tabela exibiu `AP-ENT-001` como despesa pendente de -R$ 321,45 sem erro de pagina/console.
- Smokes DRE pos-correcao: DRE dinamica e DRE normal exibiram impacto AP de R$ 321,45 / -R$ 321,45; residual de views executivas sem `clinic_id` foi corrigido e o smoke final da DRE dinamica ficou sem `pageerror`, sem `console.error` e sem 4xx.
- Regressao cruzada pos-views: Fluxo, Lancamentos, DRE dinamica e DRE normal permanecem sem `pageerror`/`console.error`/4xx e com o AP `AP-ENT-001` refletido nos totais esperados.
- Hardening da migracao de views executivas: arquivo validado como idempotente no PostgreSQL remoto; parser local de SQL Server ainda pode acusar falsos positivos para sintaxe PostgreSQL (`CREATE OR REPLACE VIEW`, casts `::numeric`).
- Gate promocao controlada pos-DRE: build passou, suite completa passou com 41/41 arquivos e 457/457 testes, migracao reaplicou no remoto e ordem de colunas de `v_executive_kpis` foi confirmada por catalogo.
- Manifesto seletivo final pos-DRE/deep-link/PT-BR/revisao AP: pacote de promocao passa a 70 itens no dry-run atualizado, mantendo `src/lib/financialInsights.ts`, `supabase/migrations/20260612_fix_dre_dynamic_executive_views_clinic_id.sql`, `tests/unit/dreDynamicExecutiveViewsClinicId.test.js`, `tests/unit/payableSummaryNavigation.test.js`, `tests/unit/payablePortugueseUi.test.js` e a guarda de fluxo `tests/unit/payableReconciliationReviewFlow.test.js`; hashes versionaveis finais conhecidos: `DashboardDRE.jsx` = `857615CD5272D367E936A487F471D01EFCDF41810CF013AFFC29856671772BEB`, `financialInsights.ts` = `009DB4ADBDEB198C0F7F6275F0785B8DA6C1C71C0C877122D7753B8FE166114C`, migracao `20260612` = `FBA241D83517D2C7023A168A69CE6A38037938D3908F58E8CF5145AB81B4CC81`, teste DRE = `56476C274D5F7F08952B3339B02A3266BD3D7996E30502761E0AD1F83503B1EE`, teste navegacao AP = `9BCA7BF178F6F0139390CFB88183B3C4DB6FB79EE6AD8485161292B3B70E193E`.
- Dry-run de stage seletivo atualizado pos-revisao AP: `git add -n <manifesto consolidado>` retornou 70 entradas, confirmou `tests/unit/payableReconciliationReviewFlow.test.js`, nao incluiu `package.json`, `package-lock.json` ou `.env`, e manteve o indice vazio (`git diff --cached --name-only` = 0).
- Gate final do manifesto consolidado de 70 itens: `npm run build` passou com 5.236 modulos transformados; `npm run test -- --run` passou com 43/43 arquivos e 463/463 testes. Permaneceram apenas avisos conhecidos de configuracao/deprecacao Vite/Vitest e logs esperados de testes que simulam erros controlados.
- Gate de conciliacao bancaria AP: a rota `ConciliacaoBancaria.jsx` importa `ConciliacaoPayablesReview`, o hook `useConciliation` expõe `runPayableMatching`, `approvePayableMatch`, `rejectPayableMatch` e `loadPayableReviews`, e `conciliationApi.js` usa a RPC `match_payables_to_bank_transactions` mais consultas a `bank_statements`, `bank_transactions` e `ap_bills`. `npm run test -- tests/unit/payablePortugueseUi.test.js tests/unit/bankReconciliationMotorApi.test.js --run` passou com 2/2 arquivos e 6/6 testes. Smoke autenticado em `/clinica/financeiro/conciliacao-bancaria?trace=payable-reconciliation-smoke`: zero `pageerror`, zero 4xx, painel `Revisão de Correspondências de Contas a Pagar` visivel, filtro `Em revisão/Aprovados/Rejeitados/Todos`, botao `Rodar conciliação AP`, estado vazio `Nenhuma correspondência de AP encontrada` e nenhum token cru `auto_fuzzy`, `auto_exact`, `unmatched`, `MATCHED`, `AWAITING_REVIEW`, `Rodar Matching AP` ou `Nenhum match de AP` visivel.
- Gate do fluxo de revisao AP na conciliacao: `ConciliacaoBancaria.jsx` chama `runPayableMatching('review')` e exibe mensagem PT-BR `correspondência(s) de Contas a Pagar encontrada(s) para revisão`; `useConciliation.js` define `runPayableMatching(nextStatus = 'review')`, aplica `setPayableReviewStatus(nextStatus)` e recarrega `loadPayableReviews(nextStatus)`, evitando reutilizar filtro anterior apos rodar a rotina inteligente. A API preserva filtros `review`, `matched`, `rejected` e `all`, com rejeicao mantendo trilha em metadata AP como `status: 'REJECTED'`. `npm run test -- tests/unit/payableReconciliationReviewFlow.test.js tests/unit/payablePortugueseUi.test.js --run` passou com 2/2 arquivos e 8/8 testes. Smoke autenticado em `/clinica/financeiro/conciliacao-bancaria?trace=payable-review-flow-smoke`: zero `pageerror`, zero 4xx, painel AP visivel, contadores `Em revisão`, `Aprovados`, `Rejeitados`, `Todos`, estado vazio em revisão e nenhum texto legado `match(es) de Contas a Pagar encontrados para revisao`, `Rodar Matching AP`, `Nenhum match de AP` ou `AWAITING_REVIEW` visivel.
- Gate de modais auxiliares AP: `PaymentModal.tsx` usa `Object.values(PaymentMethodType)` com `labelPaymentMethod(value)`, `PayableFormModal.tsx` usa `Object.values(PayableType)` com `labelPayableType(value)`, `InstallmentModal.tsx` exibe `Prévia do parcelamento` em PT-BR e `payablesApi.ts` preserva metadata enterprise para criacao, pagamento, cancelamento e parcelamento (`installment_number`, `installment_total`, `installment_group_id`). Corrigido fechamento duplicado do `InstallmentModal` removendo chamada repetida de `onClose()`. `npm run test -- tests/unit/payablePortugueseUi.test.js tests/unit/payableSummaryNavigation.test.js --run` passou com 2/2 arquivos e 6/6 testes; `get_errors` e `git diff --check` ficaram limpos no escopo dos modais/servico.
- Validacao semantica das views executivas: constraints/colunas remotas conferidas, caso sem dados em AR/repasse validado sem erro, e teste de contrato `dreDynamicExecutiveViewsClinicId.test.js` passou isolado com 2/2 testes.
- Hardening do deep link operacional AP: atalhos de Fluxo de Caixa e insights agora levam para `status=open,partial,approved,overdue`, alinhando a lista de detalhe ao total exibido pelo resumo `PayableSummary`; guarda `payableSummaryNavigation.test.js` passou com 2/2 testes, suite completa passou com 42/42 arquivos e 459/459 testes, build passou e smoke browser confirmou `status=in.(OPEN,PARTIAL,APPROVED,OVERDUE)` com `AP-ENT-001` visivel.
- Risco residual: promocao para staging/producao distintos ainda depende de confirmar credenciais/URL do alvo, backup/snapshot e stage seletivo; nao ha autorizacao tecnica para `git add .` neste working tree.

### Modelo de PR Seletivo

Titulo sugerido: `Financeiro: evolucao enterprise de Contas a Pagar`

Resumo:

- Implementa Contas a Pagar Enterprise no modulo ativo React/Vite, reutilizando rotas, APIs e componentes existentes.
- Adiciona workflow visual de aprovacao, conciliacao inteligente, exportacoes reais CSV/PDF/XLSX, paginacao server-side e compatibilidade com rotas legadas.
- Integra AP de forma persistente com Fluxo de Caixa, Lancamentos, DRE normal, DRE dinamica e Repasse Medico.
- Aplica migracoes Supabase para status enterprise, RLS, matching, trigger de sincronizacao financeira e RPCs de DRE.

Validacoes executadas:

- `npm run build`
- `npm run test -- --run`
- `npm run test -- tests/unit/appointmentFinancialIntegrationStatus.test.ts --run`
- Smokes autenticados em Fluxo de Caixa, Lancamentos, DRE dinamica, DRE normal e Contas a Pagar.
- RLS com usuario real demo: propria clinica retorna 1 AP, demais clinicas retornam 0.
- Exportacao real AP: CSV, PDF e XLSX com blobs validos.
- Paginacao server-side AP: request REST com `offset=0&limit=50`, `Prefer: count=exact` e `content-range: 0-0/1`.
- `git diff --check -- <manifesto AP>` sem erros.

Checklist de reviewer:

- Confirmar que o PR contem apenas os 70 itens do manifesto AP consolidado, incluindo helper de insights, saneamento DRE dinamica, deep-link AP, guarda PT-BR `payablePortugueseUi.test.js` e guarda de fluxo de revisao `payableReconciliationReviewFlow.test.js`.
- Confirmar ausencia de `.env`, `package.json`, `package-lock.json`, service worker e arquivos fora de agenda de AP enterprise.
- Conferir se as quatro migracoes `20260611_*` e a migracao `20260612_fix_dre_dynamic_executive_views_clinic_id.sql` estao no PR e serao aplicadas na ordem documentada.
- Confirmar snapshot/backup antes de staging/producao e executar o runbook de rollback se qualquer smoke falhar.

### Pre-Check Obrigatorio

1. Confirmar qual Supabase esta linkado no ambiente alvo:

   ```powershell
   supabase projects list
   supabase status
   ```

2. Confirmar backup/snapshot do banco alvo antes de aplicar SQL.
3. Confirmar que o deploy nao inclui alteracoes fora do pacote AP, pois o `git status` atual contem muitos arquivos de outros modulos.
4. Rodar localmente antes da promocao:

   ```powershell
   npm run build
   npm run test -- --run
   ```

### Aplicacao no Banco Alvo

Aplicar nesta ordem:

```powershell
supabase db query --linked --file supabase/migrations/20260611_expand_payables_enterprise_hospitalar.sql
supabase db query --linked --file supabase/migrations/20260611_payables_advanced_workflow_reconciliation_rls.sql
supabase db query --linked --file supabase/migrations/20260611_sync_ap_bills_financial_integrations.sql
supabase db query --linked --file supabase/migrations/20260611_dynamic_dre_financial_transactions_rpc.sql
```

### Integridade das Migracoes

Hashes SHA-256 calculados em 2026-06-12 para confirmar que o SQL aplicado no ambiente alvo corresponde ao pacote AP validado:

| Migracao | SHA-256 |
| --- | --- |
| `20260611_expand_payables_enterprise_hospitalar.sql` | `713769885FF5809E1DDC4B65790663B39AB55E1C1FEE4DB92B28FC4D93DC4E43` |
| `20260611_payables_advanced_workflow_reconciliation_rls.sql` | `AC4AEC82967041EDD741851007776376D046448C402E89CA7918522968E72EEF` |
| `20260611_sync_ap_bills_financial_integrations.sql` | `629A6B16B5C42FD89A4959214B55D659D82313B9981A6DB8781D7610FB1ABBD6` |
| `20260611_dynamic_dre_financial_transactions_rpc.sql` | `AD817368A4525D03F7E9C2D2BE7F76E3316ED69756FDFBE249EBC45E1E40ED43` |

Comando de conferencia local antes do deploy:

```powershell
Get-FileHash -Algorithm SHA256 supabase/migrations/20260611_*.sql
```

### Validacao Pos-Deploy

Executar consultas de prova no banco alvo, trocando `clinic_id` pelo ID real validado no ambiente:

```sql
select count(*), coalesce(sum(amount), 0)
from cash_flow
where clinic_id = '<clinic_id>'
  and reference_type = 'accounts_payable';

select count(*), coalesce(sum(amount), 0)
from financial_transactions
where clinic_id = '<clinic_id>'
  and origin_module = 'accounts_payable';

select calculate_dre_for_period('<clinic_id>', current_date - interval '30 days', current_date, 'accrual');
```

Consulta anti-duplicidade recomendada para o AP de prova ou qualquer AP criado no ambiente alvo:

```sql
with ap as (
  select id, clinic_id, amount, status, document_number
  from ap_bills
  where clinic_id = '<clinic_id>'
    and document_number = '<document_number>'
),
cf as (
  select reference_id, count(*) cf_count, coalesce(sum(amount), 0) cf_total
  from cash_flow
  where clinic_id = '<clinic_id>'
    and reference_type = 'accounts_payable'
  group by reference_id
),
ft as (
  select origin_id, count(*) ft_count, coalesce(sum(amount), 0) ft_total
  from financial_transactions
  where clinic_id = '<clinic_id>'
    and origin_module = 'accounts_payable'
  group by origin_id
),
dre as (
  select reference_id, count(*) dre_count, coalesce(sum(amount), 0) dre_total
  from dre_entries
  where clinic_id = '<clinic_id>'
    and reference_type = 'accounts_payable'
  group by reference_id
)
select
  ap.document_number,
  ap.status,
  ap.amount as ap_amount,
  coalesce(cf.cf_count, 0) as cash_flow_rows,
  coalesce(ft.ft_count, 0) as transaction_rows,
  coalesce(dre.dre_count, 0) as dre_rows,
  case
    when coalesce(cf.cf_count, 0) = 1
     and coalesce(ft.ft_count, 0) = 1
     and coalesce(dre.dre_count, 0) = 1
     and coalesce(cf.cf_total, 0) = ap.amount
     and coalesce(ft.ft_total, 0) = ap.amount
     and coalesce(dre.dre_total, 0) = -ap.amount
    then 'OK_NO_DUPLICATES'
    else 'CHECK_INTEGRATION'
  end as integrity_status
from ap
left join cf on cf.reference_id = ap.id
left join ft on ft.origin_id = ap.id
left join dre on dre.reference_id = ap.id;
```

Validar no navegador autenticado:

- `/clinica/financeiro/fluxo-caixa`: AP deve aparecer nos totais a pagar/projecao.
- `/clinica/financeiro/lancamentos`: AP deve aparecer como lancamento de despesa pendente.
- `/clinica/financeiro/dre-dinamica`: AP deve impactar despesas operacionais e lucro.
- `/clinica/financeiro/resultado`: AP deve impactar despesas administrativas, EBITDA e lucro liquido.

### Rollback e Contingencia

Antes de qualquer aplicacao em staging/producao distintos:

1. Registrar projeto Supabase alvo, URL do frontend, hash/artefato do build e horario da janela.
2. Criar backup/snapshot do banco alvo e confirmar caminho de restauracao com permissao operacional.
3. Aplicar somente os 70 itens do manifesto seletivo final; nao misturar arquivos fora do pacote.
4. Executar as consultas SQL e os quatro smokes visuais da validacao pos-deploy imediatamente apos a aplicacao.
5. Se qualquer consulta, rota financeira ou RLS falhar, interromper rollout do frontend, restaurar snapshot do banco alvo e reabrir correcao em ambiente controlado.
6. Se o problema for apenas frontend e as migracoes estiverem integras, reverter o artefato/frontend para a versao anterior mantendo o banco sob monitoramento.

Sinais de alerta para rollback: AP duplicado em Fluxo/DRE/Lancamentos, AP ausente nas quatro superficies financeiras, erro de RLS com usuario real, falha em exportacao/paginacao, ou divergencia de totais entre `cash_flow`, `financial_transactions`, `dre_entries` e DRE RPC.

Rollback especifico do adendo DRE dinamica:

1. Se a falha ocorrer antes do deploy frontend, nao publicar o artefato e remover do stage apenas `src/pages/financeiro/DashboardDRE.jsx` e `supabase/migrations/20260612_fix_dre_dynamic_executive_views_clinic_id.sql`.
2. Se a migracao `20260612_fix_dre_dynamic_executive_views_clinic_id.sql` ja tiver sido aplicada em staging/producao, restaurar o snapshot do banco alvo criado antes da janela. Esta e a reversao segura porque a migracao usa `CREATE OR REPLACE VIEW` sobre views compartilhadas.
3. Se o banco estiver saudavel e o problema for somente visual, reverter o artefato frontend para a versao anterior e manter o banco monitorado com smoke em DRE dinamica, DRE normal, Fluxo e Lancamentos.
4. Pos-rollback, confirmar que `/clinica/financeiro/dre-dinamica` nao emite 4xx/`console.error` e que `AP-ENT-001` permanece refletido em Fluxo, Lancamentos e DRE normal.

### Criterio de Go/No-Go

Go somente se build, testes, migracoes e as quatro telas financeiras acima passarem. Se qualquer validacao falhar, nao promover o frontend para producao; corrigir primeiro no banco alvo ou reverter para o snapshot anterior.

Status atual do pacote AP no ambiente vinculado: Go tecnico local/remoto para o projeto `gvdkdjyupktlflwurike`, com restricao operacional de nao promover para staging/producao distintos sem URL/credenciais do alvo, backup/snapshot confirmado e deploy seletivo apenas dos 70 itens do manifesto final.
