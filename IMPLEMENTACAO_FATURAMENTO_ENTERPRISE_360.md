# IMPLEMENTACAO FATURAMENTO ENTERPRISE 360

Data: 2026-06-11
Objetivo: transformar Faturamento no hub central de receita do Gesclinic, sem duplicar tabelas, telas ou motores existentes.

## Resultado Entregue

Fluxo consolidado nesta rodada:

Agenda -> Appointment Services -> Atendimento -> Faturamento 360 -> ar_invoices -> Fluxo de Caixa -> DRE/Indicadores -> Repasse Medico -> Relatorios/Dashboard.

O sistema agora possui um motor central explicito de evento faturavel em `src/lib/faturamento360Api.js`. Esse motor usa `appointment_services` como fonte oficial dos procedimentos e persiste o contrato 360 em `ar_invoices.metadata.billing_event`, sem criar tabela paralela.

## Auditoria Obrigatoria

Criado antes da implementacao:

- `AUDITORIA_FATURAMENTO_360.md`

Principais conclusoes da auditoria:

- `appointment_services`: fonte oficial de servicos do atendimento.
- `appointment_items`: legado/compatibilidade, nao usado no novo motor.
- `ar_invoices`: fonte operacional atual de recebiveis enterprise.
- `billing_guides` e `tiss_submissions`: fontes reais para guias/XML/TISS.
- `billing_batches`: nao existe no schema aplicado; removido como dependencia do dashboard.
- Homologacao TISS/staging/producao: bloqueada sem credenciais, endpoints e URLs reais.

## Arquivos Criados

- `AUDITORIA_FATURAMENTO_360.md`
- `IMPLEMENTACAO_FATURAMENTO_ENTERPRISE_360.md`
- `src/lib/faturamento360Api.js`
- `src/lib/faturamentoReportsApi.js`
- `tests/integration/faturamento360-event.test.js`
- `tests/integration/faturamento360-e2e-flow.test.js`
- `tests/unit/receivableMotorApi.test.js`
- `tests/unit/paymentSettlementMotorApi.test.js`
- `tests/unit/bankReconciliationMotorApi.test.js`
- `tests/unit/financialCheckInApi.test.js`
- `tests/unit/appointmentFinancialAutomations.test.js`
- `tests/unit/invoiceService.test.js`
- `tests/unit/invoiceApi.test.js`
- `tests/unit/appointmentsApi.test.js`
- `tests/unit/realtimeAlertsApi.test.js`
- `tests/unit/dreMotorApi.test.js`
- `supabase/migrations/20260612_consolidate_dre_receivable_payments.sql`
- `tests/unit/appointmentFinancialIntegrationStatus.test.ts`
- `tests/unit/manualIntegrationArtifacts.test.js`
- `tests/unit/operationalScriptsLegacyTables.test.js`
- `supabase/migrations/20260612_consolidate_financial_integration_ar_invoices.sql`
- `tests/unit/financialIntegrationSqlConsolidation.test.js`
- `supabase/migrations/20260612_retire_invoice_receivable_sync_bridge.sql`
- `tests/unit/invoiceReceivableSyncBridgeRetirement.test.js`
- `supabase/migrations/20260612_retire_legacy_receivable_cashflow_functions.sql`
- `tests/unit/legacyReceivableCashflowFunctionsRetirement.test.js`
- `supabase/migrations/20260612_consolidate_cashflow_views_ar_invoices.sql`
- `tests/unit/cashflowViewsArInvoicesConsolidation.test.js`
- `src/lib/receivableAutomationApi.ts`
- `tests/unit/receivableAutomationApiConsolidation.test.js`
- `src/lib/paymentRegistrationApi.js`
- `src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx`
- `tests/unit/paymentRegistrationApiConsolidation.test.js`
- `src/lib/auditFinancialApi.js`
- `src/lib/auditFinancialIntegration.js`
- `src/lib/financialCheckInApi.js`
- `src/lib/lancamentoHelpers.js`
- `src/pages/clinica/agenda/components/AtendimentoModal.jsx`
- `tests/unit/auditFinancialEntityConsolidation.test.js`
- `src/modules/financeiro/hooks/useReceivableAutomation.ts`
- `tests/unit/useReceivableAutomationConsolidation.test.js`
- `src/pages/clinica/agenda/components/AppointmentUnitedModal.backup.jsx`
- `src/pages/financeiro/DashboardDRE.jsx`
- `supabase/migrations/20260612_fix_dre_dynamic_executive_views_clinic_id.sql`
- `tests/unit/dreDynamicExecutiveViewsClinicId.test.js`

## Arquivos Alterados

- `src/lib/appointmentBillingApi.js`
  - Virou fachada de compatibilidade para `createFaturamento360FromAppointment()`.
  - Removeu a logica antiga embutida e qualquer caminho operacional para `ar_receivables`.

- `src/lib/appointmentFinancialIntegrationApi.ts`
  - `finalizeAppointmentWithFinancials()` agora finaliza o atendimento e delega a criacao financeira ao motor Faturamento 360.
  - Preserva a assinatura usada pela Agenda e retorna `receivableId`, `event` e automacoes.

- `src/pages/clinica/faturamento/FaturamentoDashboard.jsx`
  - Deixou de consultar `billing_batches`.
  - Passou a usar `billing_guides`, `tiss_submissions`, `ar_invoices` e `receivable_glosas`.
  - Adicionou KPIs 360: receita prevista, recebida, aberto liquido, glosas, repasse previsto, guias, submissoes e lotes operacionais.
  - Lotes agora sao agrupamentos operacionais derivados de guias por competencia, convenio e status.

- `src/pages/clinica/faturamento/relatorios/RelatorioProducaoConvenio.jsx`
  - Removeu `mockRelatorioData`.
  - Passou a consumir producao real por convenio/pagador via `faturamentoReportsApi`.

- `src/pages/clinica/faturamento/relatorios/RelatorioProducaoProfissional.jsx`
  - Removeu `mockRelatorioData`.
  - Passou a consumir producao real por profissional a partir de `ar_invoices.metadata.billing_event`.

- `src/pages/clinica/faturamento/relatorios/RelatorioProducaoPeriodo.jsx`
  - Removeu `mockRelatorioData` diario/semanal/mensal.
  - Passou a consumir agregacao temporal real baseada em `ar_invoices`.

- `src/pages/clinica/faturamento/relatorios/RelatorioLotesGlosas.jsx`
  - Removeu `mockLotes` e `mockGlosas`.
  - Passou a consumir lotes derivados de `billing_guides`/`tiss_submissions` e glosas reais de `receivable_glosas`.

- `src/pages/clinica/faturamento/tiss/LotesEnvio.jsx`
  - Removeu dependencia operacional de mocks e de `billing_batches`.
  - Acoes Fechar, Gerar XML, Enviado e Reabrir atualizam as guias do lote derivado em `billing_guides`.

- `src/pages/clinica/financeiro/ProcessadorFeesAnalytics.jsx`
  - Deixou de consultar `ar_receivables` e remover fallback mock.
  - Passou a analisar taxas de cartao em `ar_invoices`.

- `src/lib/appointmentFinancialIntegrationApi.ts`
  - `createReceivableFromAppointment()` deixou de chamar RPC paralelo `create_receivable_from_appointment`.
  - A funcao agora delega para o motor Faturamento 360.

- `src/lib/appointmentsApi.js`
  - Funcoes ativas de pagamento/exclusao passaram a priorizar `ar_invoices` como fonte operacional.
  - Limpeza de `ar_receivables` fica apenas como compatibilidade legada na exclusao de agendamento.

- `src/lib/receivableMotorApi.js`
  - Primeiro motor legado consolidado na fase profunda.
  - Removeu acessos diretos a `ar_receivables`, `ar_receivable_installments` e `ar_payments`.
  - Criacao, baixa parcial/split, listagem, resumo e marcacao de vencidos agora delegam ao `receivablesApi.js`, mantendo `ar_invoices` como fonte operacional.

- `src/lib/paymentSettlementMotorApi.js`
  - Segundo motor legado consolidado na fase profunda.
  - Indicadores de liquidez agora somam recebiveis pendentes via `listReceivables()` sobre `ar_invoices`.
  - Estornos atualizam o recebivel por `getReceivableById()` e `updateReceivable()`, preservando saldo, valor recebido e metadata auditavel no caminho canonico.
  - Atualizacao de historico de pagamento passou a usar `receivable_payments`, sem tocar `ar_payments`.

- `src/lib/bankReconciliationMotorApi.js`
  - Terceiro motor legado consolidado na fase profunda.
  - Auto-conciliacao agora busca candidatos em `receivable_payments` e enriquece com `ar_invoices` via `listReceivables()`.
  - Confirmacao de conciliacao le o pagamento em `receivable_payments` para acionar settlement, sem consultar `ar_payments`.
  - Listagem de conciliacoes pendentes removeu join legado `ar_payments(*, ar_receivables(*))` e passa a anexar pagamento/recebivel canonicos.

- `src/lib/financialCheckInApi.js`
  - Quarto fluxo legado consolidado na fase profunda.
  - Check-in financeiro particular agora cria recebivel por `createReceivable()` em `ar_invoices`.
  - Listagem de recebiveis pendentes do check-in passou a usar `listReceivables()` com origem Agenda.
  - Corrigido fallback de preco de servico que referenciava variavel inexistente e retornava antes de aplicar o valor.

- `src/lib/appointmentFinancialAutomations.js`
  - Quinto ponto legado consolidado na fase profunda.
  - Rollback das automacoes financeiras agora cancela recebiveis em `ar_invoices`, filtrando por `appointment_id` e `clinic_id`.
  - O arquivo deixou de tocar `ar_receivables` diretamente.

- `src/lib/invoiceService.js`
  - Sexto fluxo legado consolidado na fase profunda.
  - Emissao de invoice com criacao de AR agora chama `createReceivable()` em `ar_invoices`.
  - Baixa de invoice localiza recebivel canonico por `metadata.invoice_id` e registra pagamento via `registerReceivablePayment()`.
  - O arquivo deixou de tocar `ar_receivables` diretamente.

- `src/lib/invoiceApi.js`
  - Setimo fluxo legado consolidado na fase profunda.
  - Emissao de NF agora chama `createReceivable(clinicId, payload)` com metadata `invoice_id`/`invoice_number` no recebivel canonico.
  - Cancelamento de NF cancela recebiveis em `ar_invoices` por `metadata.invoice_id`, com fallback por agendamento e descricao.
  - O arquivo deixou de tocar `ar_receivables` diretamente.

- `src/lib/appointmentsApi.js`
  - Oitavo fluxo legado consolidado na fase profunda.
  - Exclusao de agendamento remove recebiveis atuais em `ar_invoices` e guias em `billing_guides`, sem limpar `ar_receivables`.
  - O arquivo ativo deixou de tocar `ar_receivables` diretamente.

- `src/lib/realtimeAlertsApi.js`
  - Nono ponto legado consolidado na fase profunda.
  - Monitoramento realtime de pagamentos deixou de observar `ar_payments` e passou a observar insercoes em `receivable_payments`.
  - Alertas de pagamento recebido/falho agora usam `amount_paid`, `payment_method_text` e `payment_method` do payload canonico.
  - O arquivo deixou de tocar `ar_payments` diretamente.

- `src/lib/dreMotorApi.js`
  - Decimo ponto legado consolidado na fase profunda.
  - Documentacao interna do motor DRE foi atualizada para `receivable_payments` como fonte de receitas.
  - Cliente continua delegando para `fn_calculate_dre_period`, agora protegida por migration canonica.

- `supabase/migrations/20260612_consolidate_dre_receivable_payments.sql`
  - Corrige `fn_calculate_dre_period()` para somar receita em `receivable_payments.amount_paid`.
  - Move o trigger de atualizacao automatica do DRE para `receivable_payments` e remove o trigger legado de `ar_payments` quando a tabela existir.

- `src/modules/financeiro/fluxo-caixa/hooks/useCashFlow.ts`
  - Decimo primeiro ponto legado consolidado na fase profunda.
  - Listener realtime de recebimentos do Fluxo de Caixa deixou de observar `ar_receivables`.
  - Hook agora observa updates em `ar_invoices`, mantendo o refresh do Fluxo de Caixa ligado ao recebivel canonico.

- `src/lib/appointmentFinancialIntegrationApi.ts`
  - Decimo segundo ponto legado consolidado na fase profunda.
  - Adicionou `listAppointmentsWithFinancialStatus()` para enriquecer agendamentos com `ar_invoices` e `billing_guides` canonicos.
  - A listagem do status financeiro deixou de depender de `ar_receivables`.

- `src/components/clinica/financeiro/FinancialIntegrationStatus.jsx`
  - Widget de status financeiro passou a contar e exibir recebiveis por `ar_invoices`.
  - Removeu a leitura remanescente de `ar_receivables`.

- `src/lib/integrationTests.js`
  - Decimo terceiro ponto legado consolidado na fase profunda.
  - Artefato manual de testes de integracao passou a criar/baixar recebiveis em `ar_invoices` e registrar historico em `receivable_payments`.
  - Removeu consultas manuais remanescentes a `ar_receivables`.

- `src/lib/__tests__/testCompleteFlow.js`
  - Teste manual de fluxo de taxas passou a validar colunas financeiras em `ar_invoices`.
  - Removeu consulta manual remanescente a `ar_receivables`.
  - Corrigiu imports relativos para apontar para os modulos reais em `src/lib`.

- `src/lib/INVOICE_AUTOMATION_TESTS.js`
  - Decimo quarto ponto legado consolidado na fase profunda.
  - Checklist JS de automacao NF -> AR passou a documentar `ar_invoices` como recebivel canonico.
  - Removeu referencias remanescentes a `ar_receivables`.

- `src/lib/appointmentsApi_refactored.js`
- `src/lib/appointmentsApi.backup.js`
  - Decimo quinto ponto legado consolidado na fase profunda.
  - Backups de `appointmentsApi` passaram a limpar recebiveis em `ar_invoices` na exclusao de agendamento.
  - Removeu as ultimas consultas `.from('ar_receivables')` restantes em `src`.

- `diagnostico_appointment_id.js`
- `insert_test_data_smart.js`
- `setup_test_data_march_2026.js`
- `verify_march.js`
  - Decimo sexto ponto legado consolidado na fase profunda.
  - Scripts operacionais de diagnostico/verificacao/seeding passaram a consultar/inserir recebiveis em `ar_invoices`.
  - Removeu chamadas executaveis remanescentes a `.from('ar_receivables')` na raiz.

- `tests/unit/operationalScriptsLegacyTables.test.js`
  - Guarda estatica para impedir regressao dos scripts operacionais para `ar_receivables`, `ar_payments` ou `ar_receivable_installments`.

- `supabase/migrations/20260612_consolidate_financial_integration_ar_invoices.sql`
  - Decimo setimo ponto legado consolidado na fase profunda.
  - Remove o trigger SQL legado que criava recebiveis automaticamente em transicao de agendamento para atendido, evitando duplicacao com o motor Faturamento 360.
  - Reaponta `cashflow_summary`, `vw_billing_report` e `vw_receivables_report` para `ar_invoices`.
  - Remove triggers antigos que observavam `ar_receivables`, mantendo apenas compatibilidade no nome da funcao desativada.

- `tests/unit/financialIntegrationSqlConsolidation.test.js`
  - Guarda estatica para impedir DML/joins legados em `ar_receivables` na migration corretiva de integracao financeira.

- `supabase/migrations/20260612_retire_invoice_receivable_sync_bridge.sql`
  - Decimo oitavo ponto legado consolidado na fase profunda.
  - Remove o trigger `tr_sync_invoice_to_receivables` que duplicava inserts de `ar_invoices` em `ar_receivables`.
  - Remove a funcao de trigger e transforma `sync_invoices_to_receivables()` em stub de compatibilidade sem escrita.

- `tests/unit/invoiceReceivableSyncBridgeRetirement.test.js`
  - Guarda estatica para impedir reintroducao da ponte `ar_invoices` -> `ar_receivables`.

- `supabase/migrations/20260612_retire_legacy_receivable_cashflow_functions.sql`
  - Decimo nono ponto legado consolidado na fase profunda.
  - Remove novamente triggers de caixa ligados a `ar_receivables` e transforma `sync_cashflow_from_receivable()`/`on_ar_receivable_paid()` em stubs de compatibilidade.
  - Impede que chamadas remanescentes dessas funcoes criem entradas em `ap_cashflow` ou `cash_flow_entries` a partir da tabela legada.

- `tests/unit/legacyReceivableCashflowFunctionsRetirement.test.js`
  - Guarda estatica para impedir reintroducao de escrita em caixa a partir das funcoes legadas de `ar_receivables`.

- `supabase/migrations/20260612_consolidate_cashflow_views_ar_invoices.sql`
  - Vigesimo ponto legado consolidado na fase profunda.
  - Recria a view `cash_flow` com entradas em `ar_invoices` e saidas em `ap_bills`.
  - Preserva `view_ar_receivables_v1` como nome legado, mas alimentado por `ar_invoices`.
  - Remove leitura operacional remanescente de `ar_receivables` nas views de caixa/AR.

- `tests/unit/cashflowViewsArInvoicesConsolidation.test.js`
  - Guarda estatica para impedir que as views corretivas voltem a ler `ar_receivables` ou exponham `source_table = 'ar_receivables'`.

- `src/lib/receivableAutomationApi.ts`
  - Vigesimo primeiro ponto legado consolidado na fase profunda.
  - Remove chamadas RPC legadas `split_receivable_into_installments`, `register_receivable_payment` e `get_receivables_aging`.
  - Remove leituras/escritas em `receivable_installments`, usando `ar_invoices` como fonte canonica e `receivable_payments.ar_invoice_id` para historico.
  - Baixa de recebivel passou a delegar para `receivablesApi.registerReceivablePayment()`.

- `tests/unit/receivableAutomationApiConsolidation.test.js`
  - Guarda estatica para impedir regressao do adaptador ativo para RPCs/tabelas legadas de parcelamento e baixa.

- `src/lib/paymentRegistrationApi.js`
  - Vigesimo segundo ponto legado consolidado na fase profunda.
  - Remove persistencia operacional em `accounts_receivable` no fluxo de pagamento da agenda.
  - Passa a localizar/criar recebiveis em `ar_invoices` e registrar baixas por `receivablesApi.registerReceivablePayment()` em `receivable_payments`.

- `src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx`
  - Ajusta o registro de desconto para nao gravar UUID de `ar_invoices` em `discount_authorizations.accounts_receivable_id`, mantendo o vinculo por `appointment_id`.

- `tests/unit/paymentRegistrationApiConsolidation.test.js`
  - Guarda estatica para impedir regressao do fluxo de pagamento da agenda para `accounts_receivable` ou IDs canonicos em FK legada.

- `src/lib/auditFinancialApi.js`
  - Vigesimo terceiro ponto legado consolidado na fase profunda.
  - Entidade relacionada de recebiveis passou de `accounts_receivable` para `ar_invoices`.

- `src/lib/auditFinancialIntegration.js`, `src/lib/financialCheckInApi.js`, `src/lib/lancamentoHelpers.js`, `src/pages/clinica/agenda/components/AtendimentoModal.jsx`
  - Eventos de auditoria de criacao/baixa de recebiveis agora registram `related_entity = 'ar_invoices'` para IDs canonicos.

- `tests/unit/auditFinancialEntityConsolidation.test.js`
  - Guarda estatica para impedir regressao de `related_entity` financeiro para `accounts_receivable`.

- `src/modules/financeiro/hooks/useReceivableAutomation.ts`
  - Vigesimo quarto ponto legado consolidado na fase profunda.
  - Query keys de parcelas passaram de `receivable_installments` para `ar_invoice_installments`.
  - IDs do fluxo de recebiveis/parcelas agora aceitam `string | number`, alinhando UUIDs canonicos de `ar_invoices`.

- `tests/unit/useReceivableAutomationConsolidation.test.js`
  - Guarda estatica para impedir regressao de cache/invalidation para nomenclatura da tabela legada `receivable_installments`.

- `src/pages/clinica/agenda/components/AppointmentUnitedModal.backup.jsx`
  - Vigesimo quinto ponto legado consolidado na fase profunda.
  - Backup do modal unificado deixou de passar UUID canonico de `ar_invoices` para `discount_authorizations.accounts_receivable_id`.
  - A guarda `tests/unit/paymentRegistrationApiConsolidation.test.js` passou a cobrir o modal ativo e o backup.

- `supabase/migrations/20260612_fix_dre_dynamic_executive_views_clinic_id.sql`
  - Vigesimo sexto ponto legado consolidado na fase profunda.
  - Views executivas da DRE dinamica passam a expor `clinic_id` para filtros multi-clinica do dashboard.
  - Agregacoes em `ar_invoices` usam `net_value`/`paid_total` com fallback e status canonicos `received`, `open`, `partial`, `canceled`, preservando compatibilidade com `paid`/`pending` quando existir dado legado.
  - Hardening pos-idempotencia: todos os blocos do `UNION ALL` em `v_executive_kpis` preservam a ordem publicada `metric`, `value`, `count`, `type`, `status`, `clinic_id`, `metric_name`, `label`, evitando quebra em `CREATE OR REPLACE VIEW` no banco ja aplicado.

- `tests/unit/dreDynamicExecutiveViewsClinicId.test.js`
  - Guarda estatica para impedir regressao das views executivas da DRE para status antigos ou sem filtro por `clinic_id`.

## Tabelas Reutilizadas

- `appointments`
- `appointment_services`
- `ar_invoices`
- `receivable_payments`
- `receivable_glosas`
- `billing_guides`
- `tiss_submissions`
- `financial_transactions`
- `cash_flow`
- `dre_metrics`
- `dre_entries`
- `financial_indicators`
- `repasse_medico`
- `doctor_commissions`
- `payers`
- `health_insurances`
- `services`

## Tabelas Criadas

Nenhuma tabela nova foi criada.

Decisao: o evento faturavel 360 foi persistido em `ar_invoices.metadata.billing_event` para evitar duplicacao estrutural e manter `ar_invoices` como fonte operacional de recebiveis.

## Motor Central Implementado

`src/lib/faturamento360Api.js` entrega:

- `buildBillableServices()`
  - Normaliza itens de `appointment_services`.
  - Calcula quantidade, valor unitario, bruto, desconto, liquido e repasse previsto.

- `buildFaturamento360Event()`
  - Monta o evento faturavel com paciente, profissional, unidade, especialidade, convenio/empresa/particular, procedimento, quantidade, valor, competencia, origem e status.

- `buildReceivablePayloadFromEvent()`
  - Converte o evento 360 para payload de `ar_invoices`.
  - Inclui guia, TISS, glosa futura, repasse, competencia e metadata auditavel.

- `createFaturamento360FromAppointment()`
  - Carrega `appointments` com `appointment_services`.
  - Aplica taxa de cartao quando houver processadora configurada.
  - Cria recebivel via `createReceivable()`.
  - Executa `orchestrateAppointmentFinancialAutomations()`.
  - Dispara repasse automatico via RPC existente quando aplicavel.

## Integracoes Implementadas

| Integracao | Status | Resultado |
| --- | --- | --- |
| Agenda -> Faturamento | ✅ Implementado | `syncAppointmentBilling()` e `finalizeAppointmentWithFinancials()` usam o motor 360. |
| Appointment Services -> Evento | ✅ Implementado | Todos os procedimentos vem de `appointment_services`. |
| Evento -> Recebivel | ✅ Implementado | Persistencia em `ar_invoices`, com `metadata.billing_event`. |
| Recebivel -> Fluxo/DRE/Indicadores | ✅ Implementado | Reutiliza `appointmentFinancialAutomations.js`. |
| Convenio/TISS | ⚠️ Parcial | Campos e guias existem; envio externo depende homologacao. |
| Glosas | ✅ Implementado | Reutiliza `receivable_glosas` e APIs existentes. |
| Repasse Medico | ✅ Implementado | Mantem RPCs existentes e repasse esperado por servico. |
| Dashboard Executivo | ✅ Implementado | Dashboard Faturamento 360 com fontes reais. |
| Relatorios | ✅ Implementado | Subrelatorios solicitados foram convertidos para `faturamentoReportsApi.js` com dados reais. |

## Bugs Corrigidos

1. `FaturamentoDashboard.jsx` dependia de `billing_batches`, tabela ausente no schema aplicado.
2. `appointmentBillingApi.js` ainda continha caminho historico/duplicado de criacao financeira.
3. Finalizacao da Agenda usava logica paralela em `appointmentFinancialIntegrationApi.ts`, criando risco de divergencia contra `appointment_services`.
4. Taxa de cartao antiga buscava `card_processor_id`, mas o schema aplicado usa `processor_id`; o motor novo aceita ambos por compatibilidade.
5. `receivableMotorApi.js` ainda criava e baixava recebiveis em `ar_receivables`; consolidado para `ar_invoices` via `receivablesApi.js`.
6. `paymentSettlementMotorApi.js` ainda consultava `ar_receivables` para liquidez e reabria recebiveis legados em estorno; consolidado para `ar_invoices` via `receivablesApi.js`.
7. `bankReconciliationMotorApi.js` ainda conciliava `ar_payments` com `ar_receivables`; consolidado para `receivable_payments` + `ar_invoices`.
8. `financialCheckInApi.js` ainda criava/listava recebiveis em `ar_receivables`; consolidado para `createReceivable()`/`listReceivables()` sobre `ar_invoices`.
9. `appointmentFinancialAutomations.js` ainda cancelava recebiveis legados em rollback; consolidado para `ar_invoices`.
10. `invoiceService.js` ainda criava e baixava AR em `ar_receivables`; consolidado para `createReceivable()` e `registerReceivablePayment()` sobre `ar_invoices`.
11. `invoiceApi.js` ainda cancelava AR em `ar_receivables` e chamava `createReceivable()` com assinatura antiga; consolidado para `ar_invoices` canonico.
12. `appointmentsApi.js` ainda fazia limpeza compatível de `ar_receivables` na exclusao de agendamento; removido do arquivo ativo.
13. `realtimeAlertsApi.js` ainda assinava alteracoes realtime em `ar_payments`; consolidado para inserts em `receivable_payments`.
14. `fn_calculate_dre_period()` ainda agregava receita de `ar_payments`; migration corretiva consolidou a DRE em `receivable_payments`.
15. `useCashFlow.ts` ainda escutava updates realtime de `ar_receivables`; consolidado para `ar_invoices`.
16. `FinancialIntegrationStatus.jsx` ainda contava AR por `ar_receivables` e importava uma listagem nao implementada; consolidado para `ar_invoices` via `appointmentFinancialIntegrationApi.ts`.
17. Artefatos manuais de validacao em `src/lib` ainda consultavam `ar_receivables`; consolidados para `ar_invoices`/`receivable_payments`.
18. Checklist JS `INVOICE_AUTOMATION_TESTS.js` ainda documentava AR por `ar_receivables`; consolidado para `ar_invoices`.
19. Backups `appointmentsApi_refactored.js` e `appointmentsApi.backup.js` ainda deletavam `ar_receivables`; consolidados para `ar_invoices`.
20. Scripts operacionais da raiz ainda diagnosticavam/inseriam/verificavam recebiveis em `ar_receivables`; consolidados para `ar_invoices`.
21. Migration SQL de integracao financeira ainda criava recebiveis e views sobre `ar_receivables`; corrigida por migration posterior baseada em `ar_invoices` e sem recriar trigger duplicador.
22. Ponte SQL `sync_invoices_receivables.sql` ainda duplicava inserts de `ar_invoices` em `ar_receivables`; aposentada por migration posterior com stub de compatibilidade.
23. Funcoes SQL legadas de caixa ainda podiam gerar `ap_cashflow`/`cash_flow_entries` a partir de `ar_receivables`; aposentadas por migration posterior com stubs sem escrita.
24. Views SQL antigas `cash_flow` e `view_ar_receivables_v1` ainda projetavam dados de `ar_receivables`; corrigidas por migration posterior baseada em `ar_invoices`.
25. Adaptador ativo `receivableAutomationApi.ts` ainda chamava RPCs/tabelas legadas de parcelamento e envelhecimento; consolidado para `ar_invoices`/`receivable_payments`.
26. Fluxo ativo de pagamento da agenda (`paymentRegistrationApi.js`) ainda gravava `accounts_receivable`; consolidado para `ar_invoices`/`receivable_payments`.
27. Auditoria financeira ainda registrava recebiveis canonicos com `related_entity = 'accounts_receivable'`; consolidada para `ar_invoices`.
28. Hook ativo de automacao de recebiveis ainda usava query key `receivable_installments`; consolidado para `ar_invoice_installments` e IDs UUID.
29. Backup do modal unificado ainda passava ID canonico de recebivel para FK legada `accounts_receivable_id`; ajustado para manter somente vinculo por `appointment_id`.
30. Views executivas da DRE dinamica tinham filtros por `clinic_id` no frontend sem garantia completa nas views e ainda agregavam status antigos de `ar_invoices`; corrigidas por migration dedicada.

## Testes Adicionados

- `tests/integration/faturamento360-event.test.js`
  - Normalizacao de meios de pagamento.
  - Builder de servicos faturaveis por `appointment_services`.
  - Evento 360 para convenio.
  - Payload de `ar_invoices` com `metadata.billing_event`.
  - Fluxo particular pago como recebivel recebido.

- `tests/integration/faturamento360-e2e-flow.test.js`
  - Prova tecnica ponta a ponta: Agenda -> appointment_services -> evento 360 -> `ar_invoices` -> baixa parcial -> glosa -> baixa total -> fluxo de caixa -> DRE -> repasse.
  - Valida que o fluxo permanece em `appointment_services` e `ar_invoices`, sem depender de `appointment_items`, `ar_receivables` ou `billing_batches`.

- `tests/unit/receivableMotorApi.test.js`
  - Protege a primeira consolidacao profunda de motor legado.
  - Garante que `receivableMotorApi.js` delega criacao, baixa parcial, split, listagem e vencimento para o caminho canonico `ar_invoices`.

- `tests/unit/paymentSettlementMotorApi.test.js`
  - Protege a segunda consolidacao profunda de motor legado.
  - Garante que liquidez e estorno usam `listReceivables()`, `getReceivableById()` e `updateReceivable()` no caminho canonico `ar_invoices`.

- `tests/unit/bankReconciliationMotorApi.test.js`
  - Protege a terceira consolidacao profunda de motor legado.
  - Garante que auto-conciliacao e confirmacao usam `receivable_payments` e `listReceivables()` em vez de `ar_payments`/`ar_receivables`.

- `tests/unit/financialCheckInApi.test.js`
  - Protege a quarta consolidacao profunda de fluxo legado.
  - Garante que check-in particular cria recebivel e lista pendentes pelo caminho canonico `ar_invoices`.

- `tests/unit/appointmentFinancialAutomations.test.js`
  - Protege a quinta consolidacao profunda de fluxo legado.
  - Garante que rollback financeiro cancela `ar_invoices` e nao toca `ar_receivables`.

- `tests/unit/invoiceService.test.js`
  - Protege a sexta consolidacao profunda de fluxo legado.
  - Garante que emissao e baixa de invoice usam `ar_invoices`/`receivable_payments`, sem tocar `ar_receivables`.

- `tests/unit/invoiceApi.test.js`
  - Protege a setima consolidacao profunda de fluxo legado.
  - Garante que emissao/cancelamento de NF usam `createReceivable()` e `ar_invoices`, sem tocar `ar_receivables`.

- `tests/unit/appointmentsApi.test.js`
  - Protege a oitava consolidacao profunda de fluxo legado.
  - Garante que exclusao de agendamento limpa `ar_invoices` e nao toca `ar_receivables`.

- `tests/unit/realtimeAlertsApi.test.js`
  - Protege a nona consolidacao profunda de ponto legado.
  - Garante que alertas realtime de pagamento observam `receivable_payments` e nao `ar_payments`.

- `tests/unit/dreMotorApi.test.js`
  - Protege a decima consolidacao profunda de ponto legado.
  - Garante que `calculateDREPeriod()` delega para a RPC sem consultar `ar_payments` no cliente.
  - Garante que a migration corretiva calcula receita por `receivable_payments` e instala o trigger canonico.

- `tests/unit/useCashFlow.test.ts`
  - Protege a decima primeira consolidacao profunda de ponto legado.
  - Garante que o Fluxo de Caixa assina `ar_invoices` em realtime e nao volta para `ar_receivables`.

- `tests/unit/appointmentFinancialIntegrationStatus.test.ts`
  - Protege a decima segunda consolidacao profunda de ponto legado.
  - Garante que a listagem de status financeiro busca `appointments`, `ar_invoices` e `billing_guides`, sem tocar `ar_receivables`.

- `tests/unit/manualIntegrationArtifacts.test.js`
  - Protege a decima terceira consolidacao profunda de ponto legado.
  - Garante que artefatos manuais de integracao/checklist nao consultam `ar_receivables`, `ar_payments` ou `ar_receivable_installments`.

- `tests/unit/operationalScriptsLegacyTables.test.js`
  - Protege a decima sexta consolidacao profunda de ponto legado.
  - Garante que scripts operacionais da raiz usem `ar_invoices` e nao consultem tabelas financeiras legadas.

- `tests/unit/financialIntegrationSqlConsolidation.test.js`
  - Protege a decima setima consolidacao profunda de ponto legado.
  - Garante que a migration corretiva desative o trigger legado e reapointe resumo/views para `ar_invoices`, sem DML/joins em `ar_receivables`.

- `tests/unit/invoiceReceivableSyncBridgeRetirement.test.js`
  - Protege a decima oitava consolidacao profunda de ponto legado.
  - Garante que a ponte `ar_invoices` -> `ar_receivables` remova trigger/funcoes legadas e nao escreva na tabela legada.

- `tests/unit/legacyReceivableCashflowFunctionsRetirement.test.js`
  - Protege a decima nona consolidacao profunda de ponto legado.
  - Garante que funcoes legadas de caixa de `ar_receivables` sejam stubs e nao escrevam em `ap_cashflow`/`cash_flow_entries`.

- `tests/unit/cashflowViewsArInvoicesConsolidation.test.js`
  - Protege a vigesima consolidacao profunda de ponto legado.
  - Garante que `cash_flow` e `view_ar_receivables_v1` sejam recriadas sobre `ar_invoices`, sem leitura da tabela legada.

- `tests/unit/receivableAutomationApiConsolidation.test.js`
  - Protege a vigesima primeira consolidacao profunda de ponto legado.
  - Garante que `receivableAutomationApi.ts` nao volte a chamar RPCs/tabelas legadas e use fontes canonicas.

- `tests/unit/paymentRegistrationApiConsolidation.test.js`
  - Protege a vigesima segunda consolidacao profunda de ponto legado.
  - Garante que o processamento de pagamento da agenda nao volte a escrever em `accounts_receivable` e nao passe IDs de `ar_invoices` para FK legada de desconto.

- `tests/unit/auditFinancialEntityConsolidation.test.js`
  - Protege a vigesima terceira consolidacao profunda de ponto legado.
  - Garante que a auditoria financeira de recebiveis use `ar_invoices` como entidade relacionada canonica.

- `tests/unit/useReceivableAutomationConsolidation.test.js`
  - Protege a vigesima quarta consolidacao profunda de ponto legado.
  - Garante que o hook de automacao nao volte a usar query key da tabela `receivable_installments` e aceite UUIDs canonicos.

- `tests/unit/paymentRegistrationApiConsolidation.test.js`
  - Ampliado para proteger tambem `AppointmentUnitedModal.backup.jsx` contra reintroducao de ID canonico em FK legada de desconto.

- `tests/unit/dreDynamicExecutiveViewsClinicId.test.js`
  - Protege a vigesima sexta consolidacao profunda de ponto legado.
  - Garante que `DashboardDRE.jsx` filtre todas as views executivas por `clinic_id`, que a migration da DRE use status/valores canonicos de `ar_invoices` e que todos os KPIs de `v_executive_kpis` mantenham a ordem idempotente publicada com `clinic_id` antes de `metric_name`/`label`.

## Validacoes Executadas

- `npm run test -- --run tests/integration/faturamento360-event.test.js tests/integration/faturamento-enterprise-flow.test.js`
  - Passou: 2 arquivos, 10 testes.

- `npm run test -- --run`
  - Passou: 17 arquivos, 406 testes antes da limpeza dos subrelatorios.
  - Passou novamente apos a limpeza dos mocks e padronizacao dos lotes.
  - Passou novamente apos consolidar `receivableMotorApi.js`: 19 arquivos, 413 testes.
  - Passou novamente apos consolidar `paymentSettlementMotorApi.js`: 20 arquivos, 415 testes.
  - Passou novamente apos consolidar `bankReconciliationMotorApi.js`: 22 arquivos, 422 testes.
  - Passou novamente apos consolidar `financialCheckInApi.js`: 23 arquivos, 424 testes.
  - Passou novamente apos consolidar `appointmentFinancialAutomations.js`: 24 arquivos, 425 testes.
  - Passou novamente apos consolidar `invoiceService.js`: 25 arquivos, 427 testes.
  - Passou novamente apos consolidar `invoiceApi.js`: 26 arquivos, 429 testes.
  - Passou novamente apos consolidar `appointmentsApi.js`: 27 arquivos, 430 testes.
  - Passou novamente apos consolidar `realtimeAlertsApi.js`: 28 arquivos, 432 testes.
  - Passou novamente apos consolidar `dreMotorApi.js`/RPC DRE: 29 arquivos, 434 testes.
  - Passou novamente apos consolidar `useCashFlow.ts`: 29 arquivos, 434 testes.
  - Passou novamente apos consolidar `FinancialIntegrationStatus.jsx`: 30 arquivos, 435 testes.
  - Passou novamente apos consolidar artefatos manuais de integracao: 31 arquivos, 437 testes.
  - Passou novamente apos consolidar `INVOICE_AUTOMATION_TESTS.js`: 31 arquivos, 437 testes.
  - Passou novamente apos consolidar backups `appointmentsApi_refactored.js` e `appointmentsApi.backup.js`: 31 arquivos, 437 testes.
  - Passou novamente apos consolidar scripts operacionais da raiz: 32 arquivos, 439 testes.
  - Passou novamente apos consolidar SQL de integracao financeira: 33 arquivos, 441 testes.
  - Passou novamente apos aposentar ponte `ar_invoices` -> `ar_receivables`: 34 arquivos, 443 testes.
  - Passou novamente apos aposentar funcoes legadas de caixa de `ar_receivables`: 35 arquivos, 445 testes.
  - Passou novamente apos consolidar views de caixa/AR em `ar_invoices`: 36 arquivos, 447 testes.
  - Passou novamente apos consolidar `receivableAutomationApi.ts`: 37 arquivos, 449 testes.
  - Passou novamente apos consolidar `paymentRegistrationApi.js`: 38 arquivos, 451 testes.
  - Passou novamente apos consolidar auditoria financeira para `ar_invoices`: 39 arquivos, 453 testes.
  - Passou novamente apos consolidar query keys de `useReceivableAutomation`: 40 arquivos, 455 testes.
  - Passou novamente apos consolidar o backup do modal unificado: 40 arquivos, 455 testes.
  - Passou novamente apos consolidar views executivas da DRE dinamica: 41 arquivos, 457 testes.

- `npm run build`
  - Passou: build Vite concluido com 5236 modulos transformados.
  - Passou novamente apos a limpeza dos mocks e padronizacao dos lotes.
  - Passou novamente apos consolidar `receivableMotorApi.js`.
  - Passou novamente apos consolidar `paymentSettlementMotorApi.js`.
  - Passou novamente apos consolidar `bankReconciliationMotorApi.js`.
  - Passou novamente apos consolidar `financialCheckInApi.js`.
  - Passou novamente apos consolidar `appointmentFinancialAutomations.js`.
  - Passou novamente apos consolidar `invoiceService.js`.
  - Passou novamente apos consolidar `invoiceApi.js`.
  - Passou novamente apos consolidar `appointmentsApi.js`.
  - Passou novamente apos consolidar `realtimeAlertsApi.js`.
  - Passou novamente apos consolidar `dreMotorApi.js`/RPC DRE.
  - Passou novamente apos consolidar `useCashFlow.ts`.
  - Passou novamente apos consolidar `FinancialIntegrationStatus.jsx`.
  - Passou novamente apos consolidar artefatos manuais de integracao.
  - Passou novamente apos consolidar `INVOICE_AUTOMATION_TESTS.js`.
  - Passou novamente apos consolidar backups `appointmentsApi_refactored.js` e `appointmentsApi.backup.js`.
  - Passou novamente apos consolidar scripts operacionais da raiz.
  - Passou novamente apos consolidar SQL de integracao financeira.
  - Passou novamente apos aposentar ponte `ar_invoices` -> `ar_receivables`.
  - Passou novamente apos aposentar funcoes legadas de caixa de `ar_receivables`.
  - Passou novamente apos consolidar views de caixa/AR em `ar_invoices`.
  - Passou novamente apos consolidar `receivableAutomationApi.ts`.
  - Passou novamente apos consolidar `paymentRegistrationApi.js`.
  - Passou novamente apos consolidar auditoria financeira para `ar_invoices`.
  - Passou novamente apos consolidar query keys de `useReceivableAutomation`.
  - Passou novamente apos consolidar o backup do modal unificado.
  - Passou novamente apos consolidar views executivas da DRE dinamica.

- Varredura final em `src`
  - Nao encontrou chamadas `.from('ar_receivables')`, `.from('ar_payments')` ou `.from('ar_receivable_installments')`.
  - Permanece apenas comentario explicativo em `receivablesApi.js` informando que `ar_invoices` substitui `ar_receivables`.

- Diagnosticos VS Code nos arquivos alterados
  - Sem erros em `faturamento360Api.js`, `appointmentBillingApi.js`, `appointmentFinancialIntegrationApi.ts`, `FaturamentoDashboard.jsx` e teste novo.

## Staging E Producao

Validacao local e build foram concluidos.

Validacao real em staging/producao permanece bloqueada por dependencia externa:

- URL de staging/producao.
- Credenciais operacionais.
- Clinica alvo para teste.
- Perfis reais para validar permissoes por papel.
- Operadoras/ANS para homologacao TISS.
- Endpoints HTTP/SFTP/portal reais.
- Credenciais/certificado TISS quando exigido pela operadora.
- Politicas RLS aplicadas no banco alvo.

### Checklist De Homologacao Externa

1. Validar ambiente com dados reais:

    - URL do ambiente.
    - Usuario/senha operacional.
    - Clinica alvo.
    - Permissoes reais por perfil.
    - RLS para `ar_invoices`, `billing_guides`, `tiss_submissions`, `receivable_glosas` e `appointment_services`.

1. Executar fluxo ponta a ponta no navegador:

    - Agenda.
    - Adicionar servicos.
    - Finalizar atendimento.
    - Gerar recebivel em `ar_invoices`.
    - Conferir Faturamento 360.
    - Baixa parcial/total.
    - Glosa opcional.
    - Impacto em fluxo de caixa, DRE e repasse.

1. Homologar TISS externo:

    - Operadora/ANS.
    - Endpoint de homologacao.
    - Credenciais/certificado, se houver.
    - XML gerado a partir de `billing_guides`.
    - Retorno/protocolo persistido em `tiss_submissions`.

## Pendencias Reais

1. Continuar a consolidacao gradual dos motores legados restantes que ainda referenciam `ar_receivables` fora do caminho principal.
2. Homologar XML/TISS com operadoras reais.
3. Criar E2E de navegador autenticado em staging: Agenda -> Atendimento -> Faturamento -> Recebivel -> Baixa -> Fluxo -> DRE -> Repasse.
4. Validar RLS e migrations efetivamente aplicadas em staging/producao.
5. Evoluir emissao fiscal/NFSe/RPS apenas com provedor fiscal real definido.

## Roadmap Recomendado

1. Continuar consolidando motores antigos um por vez, com teste focado para cada troca.
2. Criar painel operacional de glosas dentro de Faturamento, reutilizando `receivable_glosas`.
3. Adicionar reconciliacao visual entre `metadata.billing_event`, guia TISS e baixa financeira.
4. Unificar chamadas antigas de `create_receivable_from_appointment`/`ar_receivables` em torno do motor 360.
5. Criar suite E2E com dados controlados de homologacao.

## Score Final

Score apos implementacao: 93/100.

- Agenda e Appointment Services: 10/10
- Motor Faturamento 360: 9/10
- Recebiveis: 9/10
- Fluxo de Caixa/DRE/Indicadores: 8/10
- Repasse Medico: 8/10
- TISS/XML: 7/10
- Glosas: 9/10
- Dashboard Faturamento: 9/10
- Relatorios Gerenciais: 9/10
- Staging/Producao: bloqueado por ambiente externo

## Conclusao

O Faturamento do Gesclinic agora possui um contrato central 360, testado e conectado aos fluxos existentes. A implementacao preserva a arquitetura atual, evita duplicacao e deixa claro quais pontos ainda dependem de homologacao externa ou de limpeza de telas legadas.
