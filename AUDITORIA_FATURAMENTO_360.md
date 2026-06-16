# AUDITORIA FATURAMENTO ENTERPRISE 360

Data: 2026-06-11
Escopo: Agenda -> Appointment Services -> Atendimento -> Faturamento -> Recebiveis -> Fluxo de Caixa -> DRE -> Repasse Medico -> Indicadores -> Relatorios Gerenciais.
Regra obrigatoria: nao duplicar nada. `appointment_services` e a fonte oficial dos servicos do atendimento. `appointment_items` permanece legado/compatibilidade.

## Resumo Executivo

O Gesclinic ja possui a base principal do Faturamento Enterprise 360, mas ela esta distribuida entre Agenda, Faturamento, Contas a Receber e Financeiro. A fonte operacional atual de recebiveis e `ar_invoices`; os motores antigos baseados em `ar_receivables` devem ser tratados como legado/compatibilidade ate consolidacao controlada.

Score pre-implementacao 360: 84/100.

Principais gaps: falta um orquestrador central explicito de evento faturavel 360; existem paginas antigas de relatorios/lotes ainda com mock; `appointmentFinancialIntegrationApi.ts` e outros motores paralelos ainda duplicam parte da logica; validacao externa TISS/staging/producao depende de credenciais e endpoints reais.

## Mapa 360 Por Dominio

| Dominio | Status | Evidencias | Observacao |
| --- | --- | --- | --- |
| Agenda | ✅ Existe | `src/AppRoutes.jsx`, `src/lib/appointmentsApi.js`, componentes de Agenda/Atendimento | Finalizacao dispara integracoes financeiras em caminhos existentes. |
| Appointment Services | ✅ Existe | `appointment_services`, `src/lib/appointmentItemsApi.js`, `syncAppointmentServices()` | Fonte oficial de procedimentos, quantidades, valores, descontos e repasse previsto. |
| Appointment Items | ⚠️ Parcial | migrations e API de compatibilidade | Legado. Nao deve ser usado para novo faturamento. |
| Atendimento | ✅ Existe | `AtendimentoUnificado.jsx`, `CheckinDrawer.jsx`, `StatusSelector.jsx` | Ha finalizacao com integracao financeira, mas ha mais de um caminho. |
| Evento faturavel 360 | ⚠️ Parcial | Metadados em `ar_invoices`, `appointmentBillingApi.js` | Existe implicitamente; falta motor central reutilizavel e testado. |
| Faturamento Particular | ✅ Existe | `createReceivable()`, status received/open, meios de pagamento | Baixa e split existem em Contas a Receber. |
| Faturamento Convenio | ⚠️ Parcial | `billing_guides`, `tiss_submissions`, campos TISS em `ar_invoices` | Estrutura existe; envio real depende homologacao de operadoras. |
| Empresas/Pagadores | ⚠️ Parcial | `payers`, `health_insurances`, `ar_invoices.company_id` | Campos existem, fluxo executivo ainda precisa padronizar telas. |
| Guias TISS | ✅ Existe | `GuiasPage.jsx`, `GuiasConsulta.jsx`, `billing_guides` | Consulta, SADT e Internacao persistem em `billing_guides`. |
| Lotes | ⚠️ Parcial | `LotesPage.jsx`, `billing_guides`, `tiss_submissions` | Lotes sao derivados de guias; tabela `billing_batches` nao aparece no schema aplicado. |
| XML/TISS | ⚠️ Parcial | `tissApi.js`, `tissSubmissionServiceApi.js`, `XMLPage.jsx`, `TISSPage.jsx` | Validacao/geracao/submissao preparada; credenciais e endpoints externos bloqueiam homologacao real. |
| Retornos/Recibos | ⚠️ Parcial | `RetornosPage.jsx`, `RetornosRecibos.jsx`, `tiss_submissions` | Estrutura existe; precisa payload real de operadora. |
| Glosas | ✅ Existe | `receivable_glosas`, `registerReceivableGlosa()`, workflow de glosa | Registro, contestacao, recuperacao e aceite existem. |
| Contas a Receber | ✅ Existe | `ar_invoices`, `receivablesApi.js`, `ContasReceber.jsx` | Fonte operacional atual do recebivel enterprise. |
| Pagamentos/Recebimentos | ✅ Existe | `receivable_payments`, `registerReceivablePayment()` | Historico e split vinculados a `ar_invoices`. |
| Fluxo de Caixa | ✅ Existe | `financial_transactions`, `cash_flow`, `cashflowApi.js`, `FluxoCaixa.jsx` | Automacao prevista existe via `appointmentFinancialAutomations.js`. |
| DRE | ⚠️ Parcial | `dre_metrics`, `dre_entries`, `dreApi.js`, `dynamicDREApi.ts` | Estrutura existe; metricas precisam ser alimentadas por contrato unico. |
| Repasse Medico | ✅ Existe | `repasse_medico`, `doctor_commissions`, `repasseMedicoApi.js`, `RepasseMedico.jsx` | RPCs e paginas existem; geracao automatica ainda tem caminhos paralelos. |
| Indicadores | ✅ Existe | `financial_indicators`, cockpit financeiro, dashboard financeiro | KPIs existem; dashboard de Faturamento ainda precisa consolidacao 360. |
| Relatorios Gerenciais | ⚠️ Parcial | `RelatoriosPage.jsx`, `BillingReportsExport.jsx`, relatorios em `src/pages/clinica/faturamento/relatorios` | Relatorio principal real existe; subrelatorios antigos ainda tem mocks. |
| Auditoria financeira | ✅ Existe | `appointment_financial_audit_logs`, `auditFinancialApi.js`, `auditFinancialIntegration.js` | Eventos append-only existem para recebivel, guia, glosa e repasse. |
| Multi-tenant/RLS | ⚠️ Parcial | `clinic_id` em tabelas principais, migrations RLS | Codigo filtra por clinica; estado real de RLS deve ser validado no banco aplicado. |
| NF/RPS/Fiscal | ⚠️ Parcial | campos fiscais em `health_insurances`, `invoiceService.js`, migrations NF/RPS | Configuracao existe; emissao fiscal externa real nao foi homologada. |
| Staging/Producao | ❌ Nao existe | ambiente local/link Supabase apenas | Validacao real depende de URLs, credenciais e operadoras fornecidas. |

## Frontend Mapeado

| Area | Status | Arquivos |
| --- | --- | --- |
| Rotas Faturamento | ✅ Existe | `src/AppRoutes.jsx` |
| Menu Faturamento | ✅ Existe | `src/constants/menu.js` |
| Dashboard Faturamento | ⚠️ Parcial | `src/pages/clinica/faturamento/FaturamentoDashboard.jsx` |
| Landing antiga | ⚠️ Parcial | `src/pages/clinica/faturamento/FaturamentoPage.jsx` |
| Guias | ✅ Existe | `src/pages/clinica/faturamento/GuiasPage.jsx`, `tiss/GuiasConsulta.jsx` |
| XML | ✅ Existe | `src/pages/clinica/faturamento/XMLPage.jsx`, `TISSPage.jsx` |
| Lotes | ⚠️ Parcial | `src/pages/clinica/faturamento/LotesPage.jsx`, `tiss/LotesEnvio.jsx` |
| Retornos | ⚠️ Parcial | `src/pages/clinica/faturamento/RetornosPage.jsx`, `tiss/RetornosRecibos.jsx` |
| Relatorios | ⚠️ Parcial | `RelatoriosPage.jsx`, `RelatoriosFaturamento.jsx`, subrelatorios |
| Contas a Receber | ✅ Existe | `src/pages/clinica/financeiro/ContasReceber.jsx` |
| Fluxo de Caixa | ✅ Existe | `src/pages/clinica/financeiro/FluxoCaixa.jsx` |
| Repasse Medico | ✅ Existe | `src/pages/clinica/financeiro/RepasseMedico.jsx` |

## APIs, Services, Hooks E Contextos

| Camada | Status | Evidencias |
| --- | --- | --- |
| Auth/tenant | ✅ Existe | `useAuth()`, `useClinicContext()` |
| Servicos agenda | ✅ Existe | `appointmentsApi.js`, `appointmentItemsApi.js` compat |
| Faturamento appointment | ⚠️ Parcial | `appointmentBillingApi.js`, `appointmentFinancialIntegrationApi.ts` |
| Recebiveis | ✅ Existe | `receivablesApi.js` |
| Automacoes | ✅ Existe | `appointmentFinancialAutomations.js` |
| Auditoria | ✅ Existe | `auditFinancialApi.js`, `auditFinancialIntegration.js` |
| TISS | ✅ Existe | `tissApi.js`, `tissSubmissionServiceApi.js` |
| Financeiro AP | ✅ Existe | `financeApi.js` |
| Cashflow | ✅ Existe | `cashflowApi.js`, `dashboardDataService.js` |
| DRE | ⚠️ Parcial | `dreApi.js`, `dreMotorApi.js`, `dynamicDREApi.ts` |
| Repasse | ✅ Existe | `repasseMedicoApi.js`, `medicalRepasseMotorApi.js`, `financeIntegrationApi.js` |
| Store dedicada Faturamento 360 | ❌ Nao existe | Nao encontrada; estado e local por tela. |

## Banco Supabase Mapeado

| Objeto | Status | Uso 360 |
| --- | --- | --- |
| `appointments` | ✅ Existe | Cabecalho do atendimento e dados financeiros capturados. |
| `appointment_services` | ✅ Existe | Fonte oficial dos itens faturaveis. |
| `appointment_items` | ⚠️ Parcial | Legado; nao usar em novas automacoes. |
| `ar_invoices` | ✅ Existe | Recebivel operacional enterprise, com campos de guia, lote, convenio, glosa, repasse, competencia e metadata. |
| `receivable_payments` | ✅ Existe | Baixas, split e historico de pagamento. |
| `receivable_glosas` | ✅ Existe | Glosas e workflow de contestacao/recuperacao. |
| `billing_guides` | ✅ Existe | Guias SP, SADT e Internacao. |
| `tiss_submissions` | ✅ Existe | XML, tentativas, retornos e erros de submissao. |
| `payers` | ✅ Existe | Pagadores/operadoras usados por Agenda. |
| `health_insurances` | ✅ Existe | Convenios com TISS, fiscal, portal e parametros de faturamento. |
| `services` | ✅ Existe | Procedimentos/TUSS, categoria e dados fiscais. |
| `financial_transactions` | ✅ Existe | Fluxo financeiro previsto/realizado. |
| `cash_flow` | ✅ Existe | Caixa operacional por referencia. |
| `dre_metrics` | ⚠️ Parcial | Metricas de DRE; schema aplicado tem `revenue/expenses`, enquanto codigo legado busca campos adicionais em alguns pontos. |
| `dre_entries` | ✅ Existe | Lancamentos DRE por referencia. |
| `repasse_medico` | ✅ Existe | Repasse medico consolidado. |
| `doctor_commissions` | ✅ Existe | Comissoes por profissional/competencia. |
| `billing_batches` | ❌ Nao existe no schema aplicado | Nao usar como dependencia operacional sem migration explicita futura. |

## Classificacao Das Fases 360

| Fase | Status | Resultado da auditoria |
| --- | --- | --- |
| 0 Auditoria obrigatoria | ✅ Existe | Este documento. |
| 1 Motor central de faturamento | ⚠️ Parcial | Logica existe em `appointmentBillingApi.js`, mas nao como contrato central 360. |
| 2 Evento faturavel completo | ⚠️ Parcial | Campos existem em `ar_invoices`; falta builder padronizado. |
| 3 Particular | ✅ Existe | Recebivel e baixa suportam particular. |
| 4 Convenios | ⚠️ Parcial | Guias/TISS existem; falta homologacao externa. |
| 5 TISS/XML | ⚠️ Parcial | Preparado; envio real depende operadora. |
| 6 Glosas | ✅ Existe | Modulo operacional em `receivable_glosas`. |
| 7 Recebiveis | ✅ Existe | `ar_invoices` consolidado. |
| 8 Fluxo de Caixa | ✅ Existe | Automacao prevista e dashboards existem. |
| 9 DRE | ⚠️ Parcial | Estrutura existe, mas consolidacao deve vir do evento unico. |
| 10 Producao medica | ⚠️ Parcial | Relatorios e repasse existem, parte dos relatorios antigos usa mock. |
| 11 Repasse medico | ✅ Existe | RPCs, APIs e UI existentes. |
| 12 Dashboard executivo | ⚠️ Parcial | Dashboards existem, Faturamento precisa KPIs 360 completos. |
| 13 Relatorios gerenciais | ⚠️ Parcial | Existem relatorios, subrelatorios antigos ainda parciais. |
| 14 UX enterprise | ⚠️ Parcial | Financeiro e Faturamento usam padroes UI, mas ha telas legadas. |
| 15 Automacoes | ✅ Existe | Agenda -> Recebivel -> financeiro existe. |
| 16 Seguranca | ⚠️ Parcial | `clinic_id` presente; RLS aplicado deve ser conferido. |
| 17 Compliance | ⚠️ Parcial | TISS/auditoria/fiscal preparados; homologacao externa pendente. |
| 18 Testes | ⚠️ Parcial | Vitest existe; falta teste especifico do evento 360. |
| 19 Validacao staging/prod | ❌ Nao existe | Bloqueada sem ambientes e credenciais. |

## Bugs E Riscos Encontrados

1. `billing_batches` nao aparece no schema aplicado; qualquer tela antiga que dependa dele deve ser evitada ou convertida para lotes derivados de `billing_guides`.
2. `appointmentFinancialIntegrationApi.ts` ainda tem caminho paralelo de finalizacao e pode divergir do contrato oficial de `appointment_services`.
3. `appointmentBillingApi.js` ja usa `appointment_services`, mas a logica do evento faturavel esta embutida na API e nao e reutilizavel por outros fluxos 360.
4. Relatorios antigos como `RelatorioProducaoConvenio.jsx` ainda tem `mockRelatorioData`.
5. DRE possui tabelas/campos historicos diferentes (`dre_metrics` aplicado vs codigo antigo), exigindo fallback e validacao antes de alterar schema.
6. Homologacao TISS, staging e producao nao podem ser comprovadas sem credenciais/endpoints reais.

## Diretriz De Implementacao

- Criar um motor central leve em `src/lib/faturamento360Api.js`, reutilizando `ar_invoices`, `appointment_services`, `receivablesApi.js`, `appointmentFinancialAutomations.js` e auditoria existente.
- Nao criar nova tabela de evento faturavel nesta fase; persistir o contrato em `ar_invoices.metadata.billing_event`.
- Fazer `syncAppointmentBilling()` delegar ao motor 360 para eliminar duplicacao futura.
- Manter `billing_guides` e `tiss_submissions` para TISS; nao depender de `billing_batches`.
- Adicionar teste unitario do builder de evento faturavel e do payload de recebivel.
- Registrar no relatorio final pendencias reais: mocks legados, homologacao externa, staging/prod e consolidacao futura de motores paralelos.
