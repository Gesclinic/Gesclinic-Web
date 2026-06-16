# Implementacao - Consolidacao de Servicos e Faturamento Enterprise

Data: 2026-06-11

## Resultado Entregue

Fluxo consolidado:

Agenda -> Appointment Services -> Atendimento -> Faturamento -> Contas a Receber -> Fluxo de Caixa/DRE -> Repasse/Relatorios

## Arquivos Alterados

- `src/lib/appointmentItemsApi.js`
- `src/lib/appointmentsApi.js`
- `src/lib/appointmentBillingApi.js`
- `src/pages/clinica/agenda/components/AppointmentItemsManager.jsx`
- `src/pages/clinica/agenda/components/AppointmentItemsTable.jsx`

## Arquivos Criados

- `RELATORIO_PRE_IMPLEMENTACAO.md`
- `IMPLEMENTACAO_CONSOLIDACAO_SERVICOS_E_FATURAMENTO_ENTERPRISE.md`

## Tabelas Reutilizadas

- `appointment_services`: origem oficial de servicos do atendimento.
- `appointments`: cabecalho do agendamento/atendimento.
- `services`: cadastro de procedimentos.
- `payers` e `plans`: fonte de convenio/plano quando vinculados.
- `ar_invoices`: recebiveis enterprise via `createReceivable()`.
- `financial_transactions`, `dre_metrics`, `financial_indicators` e `financial_automation_queue`: automacoes financeiras ja existentes.

## Tabelas Criadas

Nenhuma tabela nova foi criada nesta implementacao. A decisao foi reutilizar a arquitetura existente e evitar duplicacao.

## Integracoes Encontradas

- `getAppointmentServices()` e `syncAppointmentServices()` em `appointmentsApi.js`.
- `createReceivable()` em `receivablesApi.js`.
- `orchestrateAppointmentFinancialAutomations()` em `appointmentFinancialAutomations.js`.
- `finalizeAppointmentWithFinancials()` e `createReceivableFromAppointment()` em `appointmentFinancialIntegrationApi.ts`.
- Fluxos de atendimento em `AppointmentUnitedModal`, `AtendimentoUnificado`, `AgendaPage`, `PatientDetailPage`, `CheckinDrawer` e `StatusSelector`.

## Integracoes Implementadas

- `appointmentItemsApi.js` virou camada de compatibilidade usando exclusivamente `appointment_services`.
- `syncAppointmentServices()` agora aceita itens sem `id`, itens temporarios e quantidade decimal.
- `syncAppointmentServices()` agora remove todos os servicos quando recebe lista vazia, corrigindo exclusao do ultimo item.
- `AppointmentItemsManager` passou a calcular totais com uma unica funcao compartilhada.
- `AppointmentItemsManager` passou a permitir duplicacao de itens sem deduplicar por `service_id`.
- `AppointmentItemsTable` recebeu coluna de `Repasse Previsto` e acao de duplicar.
- `appointmentBillingApi.js` passou a faturar a partir de `appointment_services` e criar recebiveis em `ar_invoices` via `createReceivable()`.
- `appointmentBillingApi.js` passou a acionar automacoes de fluxo de caixa, DRE e indicadores apos criacao do recebivel.
- Metadados do recebivel agora carregam a lista de `appointment_services`, incluindo servico, codigo, quantidade, valor unitario, total e status.

## Bugs Encontrados

- Leitura/gravação divergente: API antiga ainda apontava para `appointment_items`.
- Exclusao do ultimo item nao sincronizava remocao real, pois `syncAppointmentServices([])` retornava antes de deletar.
- Deduplicacao por `service_id` impedia servicos duplicados e multiplas linhas do mesmo procedimento.
- Tabela visual calculava total sem multiplicar sempre por quantidade.
- Faturamento antigo calculava por `appointments.service_id/value`, nao pela lista consolidada em `appointment_services`.

## Correcoes Realizadas

- Remocao de qualquer acesso a `appointment_items` em `src/`.
- Padronizacao de leitura, criacao, atualizacao, duplicacao e exclusao sobre `appointment_services`.
- Calculo unificado de subtotal, desconto, acrescimos, total geral e repasse previsto.
- Faturamento agenda -> recebiveis usando servicos consolidados.
- Preparacao de campos enterprise: convenio, TISS status, glosa futura, competencia, repasse esperado, metadata de procedimentos.

## Testes Executados

- Diagnostico estatico via VS Code: sem erros nos arquivos alterados.
- Busca em `src/`: nenhuma referencia restante a `appointment_items`.
- `npm run build`: aprovado.
- `npm run test -- --run`: aprovado, 15 arquivos de teste e 396 testes passaram.

Observacao: Vitest exibiu warnings de configuracao/deprecacao do Vite/Vitest ja existentes, sem falha de teste.

## Pendencias

- Validar em banco/staging que as colunas enterprise de `appointment_services` e `ar_invoices` estao aplicadas.
- Migrations historicas de `appointment_items` permanecem no repositorio; recomenda-se marcar como legado ou criar migration futura de descontinuacao controlada.
- Integracoes externas ANS/TISS/XML nao foram implementadas, conforme requisito de preparar estrutura sem integracao externa.
- Validacao de producao exige ambiente e credenciais operacionais fora do escopo do build local.

## Roadmap Futuro

- Criar modulo visual completo de faturamento por lotes: particular, convenio, empresa, medico e unidade.
- Implementar ciclo de guias/lotes/faturas/retornos/glosas sobre `ar_invoices` e tabelas auxiliares existentes.
- Criar telas de glosa, recurso e reprocessamento com evidencia e prazos.
- Consolidar um unico orquestrador de finalizacao de atendimento para evitar caminhos paralelos.
- Adicionar testes unitarios para `appointmentItemsApi`, `syncAppointmentServices` e `syncAppointmentBilling`.

## Score Final dos Modulos

- Agenda e servicos: 9/10
- Itens do atendimento: 8/10
- Faturamento base: 7/10
- Contas a receber: 8/10
- Fluxo de caixa/DRE: 7/10
- Repasse medico: 6/10
- Convenios/TISS/glosas: 5/10
- Relatorios gerenciais: 5/10
- Seguranca/compliance: 6/10

## Observacao Final

A entrega consolida o problema critico confirmado: o sistema nao usa mais `appointment_items` em codigo de aplicacao. A partir daqui, novas evolucoes devem preservar `appointment_services` como contrato oficial entre agenda, atendimento, faturamento e financeiro.
