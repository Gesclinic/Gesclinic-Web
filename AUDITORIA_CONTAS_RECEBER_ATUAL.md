# Auditoria Contas a Receber Atual

Data: 2026-06-11

## Escopo

Auditoria do modulo Contas a Receber antes da evolucao enterprise, seguindo a regra de nao criar arquivos, services, hooks, componentes ou tabelas duplicadas sem verificar o que ja existe.

## Resumo Executivo

| Area                            | Status               | Evidencia                                                                                                           | Observacao                                                                                                                |
| ------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Tela principal Contas a Receber | ✅ ja existe         | `src/pages/clinica/financeiro/ContasReceber.jsx`                                                                    | Lista `ar_invoices`, filtros, resumo, acoes receber/cancelar/excluir admin, retorno do fluxo de caixa.                    |
| Criacao de recebivel            | ✅ ja existe         | `src/pages/clinica/financeiro/NovoRecebimento.jsx`                                                                  | Cria em `ar_invoices`, parcelamento simples, NF, planos, profissionais, centros de custo.                                 |
| Edicao de recebivel             | ✅ ja existe         | `src/pages/clinica/financeiro/EditarRecebimento.jsx`                                                                | Edita campos principais e NF.                                                                                             |
| API principal atual             | ✅ ja existe         | `src/lib/receivablesApi.js`                                                                                         | CRUD atual usa `ar_invoices` como fonte oficial da tela.                                                                  |
| Motor legado/alternativo        | ⚠️ parcial           | `src/lib/receivableMotorApi.js`, `src/lib/receivableAutomationApi.ts`                                               | Usa `ar_receivables`, `ar_payments`, `receivable_payments`; nao esta consolidado com a tela atual.                        |
| NF/anexo                        | ✅ ja existe         | `src/components/financeiro/ReceivableNfInput.jsx`                                                                   | Anexo/foto reutilizavel, usado nas telas de recebimento.                                                                  |
| Fluxo de caixa                  | ⚠️ parcial           | `src/components/financeiro/ReceivableSummary.jsx`, `src/services/dashboardDataService.js`, `src/lib/cashflowApi.js` | Tela atual integra por `ar_invoices`; algumas automacoes usam `ar_receivables`.                                           |
| DRE                             | ⚠️ parcial           | `src/pages/financeiro/DashboardDRE.jsx`, migrations DRE                                                             | Existem dashboards e migrations, mas a rastreabilidade por categoria enterprise ainda nao esta totalmente ligada na tela. |
| Repasse medico                  | ⚠️ parcial           | `src/pages/clinica/financeiro/RepasseMedico.jsx`, `generate_doctor_commissions_v2`, migrations repasse              | Ha geracao ao confirmar recebimento, mas modelo de repasse por recebivel ainda nao aparece na tela principal.             |
| Glosas                          | ⚠️ parcial           | `status = glossed`, audit logs `GLOSA_REGISTERED`                                                                   | Sem UI completa, sem tabela operacional dedicada encontrada para gestao de glosas em Contas a Receber.                    |
| Recebimento parcial             | ⚠️ parcial           | status `partial`, motores `registerPartialPayment`, `receivable_payments` em TS                                     | Tela atual so confirma recebimento total; parcial nao esta consolidado na UI principal.                                   |
| Multiplas formas/split          | ⚠️ parcial           | `payment_method`, card processors, `2026-04-30_add_payment_splits.sql`                                              | Campos e migrations existem, mas split nao esta implementado na tela Contas a Receber.                                    |
| Convenios/TISS                  | ⚠️ parcial           | `healthInsurancesApi`, `tissApi`, billing guides migrations                                                         | Estrutura existe, mas Contas a Receber nao tem fluxo enterprise de guias/lotes/glosas.                                    |
| Agenda/Procedimentos            | ✅ ja existe/parcial | `appointmentFinancialIntegrationApi.ts`, `appointment_services`                                                     | API moderna calcula valores a partir de `appointment_services`; ha legado com `appointment_items`.                        |
| RLS/multi-tenant                | ⚠️ parcial           | migrations RLS, `clinic_id` em APIs                                                                                 | Existe isolamento por `clinic_id`, mas ha migrations permissivas antigas e tabelas paralelas.                             |

## Frontend Mapeado

### Pages

- ✅ `src/pages/clinica/financeiro/ContasReceber.jsx`: pagina principal atual.
- ✅ `src/pages/clinica/financeiro/NovoRecebimento.jsx`: criacao manual.
- ✅ `src/pages/clinica/financeiro/EditarRecebimento.jsx`: edicao.
- ✅ `src/pages/clinica/financeiro/RepasseMedico.jsx`: repasse separado.
- ⚠️ `src/pages/clinica/financeiro/ProcessadorFeesAnalytics.jsx`: analitico de taxas ainda referencia `ar_receivables` e mock fallback.

### Components

- ✅ `src/components/financeiro/ReceivableSummary.jsx`: resumo no fluxo de caixa.
- ✅ `src/components/financeiro/ReceivableNfInput.jsx`: anexo/foto de NF.
- ✅ `src/pages/clinica/financeiro/components/ReceivablesStatusBoard.jsx`: quadro de status existente.
- ✅ `src/components/financeiro/RelatoriosToolbar.jsx`: exportacao/relatorios reutilizavel.
- ⚠️ `src/components/clinica/financeiro/FinancialIntegrationStatus.jsx`: desabilitado na tela atual por TODO.

### Hooks / Contexts / Stores

- ✅ `useAuth()` em `SupabaseAuthContext` fornece `clinicId` e `currentRole`.
- ✅ `useSavedFilters('contas_receber_filters')` usado para filtros salvos.
- ✅ `useClinicContext()` existe no app, mas a tela atual usa `useAuth()`.
- ⚠️ `src/modules/financeiro/hooks/useReceivableAutomation.ts` existe, mas nao e o hook central da tela atual.
- ❌ Store dedicada de Contas a Receber nao encontrada.

## Backend / APIs Mapeados

### API atual da tela

- ✅ `src/lib/receivablesApi.js`
  - `listReceivables()` lista `ar_invoices`.
  - `createReceivable()` cria parcelas como multiplas linhas em `ar_invoices`.
  - `updateReceivable()` atualiza status/campos.
  - `deleteReceivable()` remove registro, usado apenas por admin.
  - `uploadReceivableNfFile()` usa bucket `finance_docs`.
  - `arStatusOptions` inclui open/planned/received/partial/overdue/canceled/glossed.

### APIs paralelas/legadas

- ⚠️ `src/lib/receivableMotorApi.js`: motor mais completo, mas baseado em `ar_receivables`, `ar_payments`, `ar_receivable_installments`.
- ⚠️ `src/lib/receivableAutomationApi.ts`: usa RPCs e tabelas `receivable_installments`, `receivable_payments`, `receivable_reconciliation`.
- ⚠️ `src/lib/appointmentFinancialIntegrationApi.ts`: usa `appointment_services` e cria `ar_invoices`, mais alinhado com a tela atual.
- ⚠️ `src/lib/invoiceService.js`, `financialCheckInApi.js`, `appointmentBillingApi.js`: ainda usam `ar_receivables`.

## Banco / Migrations

### Tabela fonte da tela atual

- ✅ `ar_invoices`
  - Garantida por `supabase/migrations/20260611_ensure_ar_invoices_receivable_form_columns.sql`.
  - Campos presentes/garantidos: appointment, paciente, descricao, valor bruto/liquido, desconto, status, forma pagamento, plano, origem, centro custo, profissional, pagador, datas, processadora, taxas cartao, NF, impostos.
  - Indices por clinic/status/datas/paciente/plano/profissional/pagador.

### Tabelas paralelas/legadas

- ⚠️ `ar_receivables`
  - Criada em migrations antigas/consolidadas.
  - Usada por motores antigos, invoiceService, check-in financeiro, alguns hooks e fluxos de caixa realtime.
  - Ha migration `sync_invoices_receivables.sql` tentando sincronizar `ar_invoices` para `ar_receivables`.
- ⚠️ `ar_payments`, `ar_receivable_installments`, `ar_payment_splits`, `receivable_payments`, `receivable_installments`
  - Existem referencias e/ou migrations, mas nao sao o caminho principal da tela atual.

### Views / Functions / Triggers

- ✅ `create_receivable_from_appointment` aparece em mais de uma migration, incluindo versoes para `ar_invoices` e `ar_receivables`.
- ✅ `trg_receivable_created` e `trg_receivable_updated` em `ar_invoices` aparecem na migration `2024_04_appointment_financial_triggers.sql`.
- ⚠️ `create_receivable_on_appointment_attended` em `2026-06-06_fase9-11_financial_integration.sql` cria `ar_receivables`, nao `ar_invoices`.
- ⚠️ `sync_cashflow_on_receivable_update` em `ar_receivables`; tela atual usa `ar_invoices`.
- ✅ Views `vw_production_report`, `vw_billing_report`, `vw_receivables_report` existem para `ar_receivables`.

### RLS

- ⚠️ Ha migrations de RLS para `ar_receivables` e tabelas financeiras.
- ⚠️ Tambem existem migrations permissivas antigas (`USING true`) e fixes, exigindo validacao no banco aplicado.
- ✅ O codigo atual filtra por `clinic_id` em `listReceivables()` e delete opcional com `clinicId`.

## Financeiro e Integracoes

| Requisito                  | Status | Evidencia                                                                             | Gap                                                                     |
| -------------------------- | ------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| contas_receber/ar_invoices | ✅     | `ContasReceber.jsx`, `receivablesApi.js`, migration 20260611                          | Consolidar status enterprise e pagamentos historicos.                   |
| receivables/ar_receivables | ⚠️     | motores antigos e migrations                                                          | Evitar duplicacao; definir estrategia de compatibilidade.               |
| financial_transactions     | ⚠️     | migrations `2026-05-13_create_financial_transactions.sql`                             | Tela atual nao grava diretamente nessa tabela.                          |
| cash_flow                  | ⚠️     | `ReceivableSummary`, `cashflowApi`, triggers antigas                                  | Caminhos mistos `ar_invoices`/`ar_receivables`.                         |
| DRE                        | ⚠️     | dashboards/migrations DRE                                                             | Falta granularidade por origem/categoria na tela.                       |
| repasse                    | ⚠️     | `generate_doctor_commissions_v2` apos receber                                         | Falta campos visiveis por recebivel.                                    |
| appointment_services       | ✅     | `appointmentFinancialIntegrationApi.ts` busca valores quando appointment.value e nulo | Garantir que novas automacoes usem esta fonte, nao `appointment_items`. |
| appointment_items          | ⚠️     | `appointmentItemsApi.js` existe                                                       | Nao deve ser usado para gerar recebivel enterprise, conforme requisito. |

## Status por Fase Solicitada

| Fase                            | Status        | Observacao                                                                                                                 |
| ------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Fase 1 Dashboard Enterprise     | ⚠️ parcial    | Ha 4 KPIs basicos; falta dashboard executivo completo.                                                                     |
| Fase 2 Estrutura dos Recebiveis | ⚠️ parcial    | `ar_invoices` tem muitos campos, mas faltam guia/lote/procedimento/especialidade/unidade/glosa/repasse detalhados na tela. |
| Fase 3 Status Financeiros       | ⚠️ parcial    | Existem open/planned/received/partial/overdue/canceled/glossed; faltam faturado, estornado e normalizacao enterprise.      |
| Fase 4 Recebimento Parcial      | ⚠️ parcial    | Motores existem, UI principal nao permite receber parcialmente.                                                            |
| Fase 5 Multiplas Formas         | ⚠️ parcial    | Forma prevista existe; split nao esta na UI.                                                                               |
| Fase 6 Glosas                   | ⚠️ parcial    | Status glosado existe; modulo de glosa nao.                                                                                |
| Fase 7 Convenios                | ⚠️ parcial    | TISS/guias existem fora da tela; sem workflow completo em Receber.                                                         |
| Fase 8 Integracao Agenda        | ✅/⚠️         | `appointment_services` usado em API moderna; triggers paralelos precisam consolidacao.                                     |
| Fase 9 Fluxo Caixa              | ⚠️ parcial    | Integracao visual e alguns triggers; falta trilha unica.                                                                   |
| Fase 10 DRE                     | ⚠️ parcial    | Existe estrutura; falta classificacao enterprise no recebivel.                                                             |
| Fase 11 Repasse Medico          | ⚠️ parcial    | Geracao apos receber existe; campos por recebivel precisam aparecer.                                                       |
| Fase 12 Filtros Enterprise      | ⚠️ parcial    | Filtros atuais bons, mas faltam convenio, empresa, unidade, especialidade, forma, glosa, valor.                            |
| Fase 13 Tabela Enterprise       | ⚠️ parcial    | Tabela existe, mas colunas enterprise incompletas.                                                                         |
| Fase 14 Relatorios              | ⚠️ parcial    | `RelatoriosToolbar` exporta dados atuais; falta carteira completa de relatorios.                                           |
| Fase 15 UX Moderna              | ⚠️ parcial    | Cards/filtros/tabela existem; falta quick filters, drawer, skeleton, grid moderno.                                         |
| Fase 16 Performance             | ⚠️ parcial    | Tela usa state local e fetch manual; sem React Query central/virtualizacao.                                                |
| Fase 17 Seguranca               | ⚠️ parcial    | `clinic_id` presente; RLS precisa validacao do estado aplicado.                                                            |
| Fase 18 Testes                  | ⚠️ parcial    | Scripts existem, mas suite especifica enterprise nao foi executada ainda.                                                  |
| Fase 19 Relatorio Final         | ❌ nao existe | Sera gerado apos implementacao.                                                                                            |

## Riscos Principais

1. Dupla fonte conceitual: `ar_invoices` e `ar_receivables` coexistem. A tela atual usa `ar_invoices`; muitas automacoes antigas usam `ar_receivables`.
2. Recebimento parcial e split existem em motores/tabelas paralelas, mas nao estao consolidados no fluxo da tela atual.
3. Glosas ainda sao status, nao modulo operacional completo.
4. RLS tem historico de migrations permissivas e fixes; precisa validar no banco real antes de producao.
5. Algumas APIs antigas ainda usam `appointment_items`; novas evolucoes devem usar `appointment_services`.

## Diretriz de Implementacao Pos-Auditoria

- Reutilizar `ContasReceber.jsx`, `NovoRecebimento.jsx`, `EditarRecebimento.jsx`, `ReceivableNfInput.jsx`, `receivablesApi.js`.
- Nao criar novo modulo paralelo.
- Usar `ar_invoices` como fonte da tela atual e preparar compatibilidade com tabelas legadas onde necessario.
- Criar novas tabelas somente com `CREATE TABLE IF NOT EXISTS` e nomes especificos quando o recurso nao existir de forma operacional, especialmente historico de pagamentos e glosas.
- Usar `appointment_services` como fonte de procedimentos/valores da agenda.
