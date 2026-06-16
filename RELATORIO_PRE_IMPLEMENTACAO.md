# Relatorio Pre Implementacao - Consolidacao de Servicos e Faturamento

Data: 2026-06-11

## Decisao Arquitetural

`appointment_services` e a fonte oficial para servicos do atendimento.

`appointment_items` fica classificada como legado/experimento. Nenhum codigo em `src/` deve consultar ou gravar essa tabela.

## Auditoria de Referencias

### Frontend e APIs em `src/`

Referencias ativas encontradas para `appointment_services`:

- `src/lib/appointmentsApi.js`: cria, le, atualiza status e sincroniza servicos do agendamento em `appointment_services`.
- `src/lib/appointmentItemsApi.js`: camada de compatibilidade mantida com nomes antigos, mas agora usando exclusivamente `appointment_services`.
- `src/pages/clinica/agenda/components/AppointmentItemsManager.jsx`: carrega, adiciona, edita, duplica, remove e recalcula itens via `getAppointmentServices()`/`syncAppointmentServices()`.
- `src/pages/clinica/agenda/components/AppointmentItemsTable.jsx`: grid visual dos itens do atendimento.
- `src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx`: usa `getAppointmentServices()` e `syncAppointmentServices()` para persistencia no modal principal.
- `src/pages/clinica/agenda/components/AtendimentoUnificado.jsx`: usa `getAppointmentServices()` e `syncAppointmentServices()` em atendimento.
- `src/pages/clinica/agenda/AgendaPage.jsx`: sincroniza `appointmentServices` apos criacao de agendamento.
- `src/lib/appointmentBillingApi.js`: faturamento de agenda agora le `appointment_services` e gera recebiveis enterprise.
- `src/lib/appointmentFinancialIntegrationApi.ts`: calcula valor a partir de `appointment_services` quando `appointments.value` nao existe.
- `src/components/financeiro/ProfitMap.jsx`: comentario indicando uso futuro de dados reais de `appointment_services`.

Resultado da auditoria em `src/`: nao ha mais referencia a `appointment_items`.

### Supabase, migrations, triggers, functions e views

Referencias historicas a `appointment_items` permanecem em migrations antigas:

- `supabase/migrations/2026-06-01_create_appointment_items.sql`
- `supabase/migrations/2026-01-08_fix_appointment_items_rls.sql`
- `supabase/migrations/2026-01-09_fix_rls_see_appointment_items.sql`
- `supabase/migrations/2026-01-12_add_is_temporary_to_appointment_items.sql`

Esses arquivos sao historico de banco e nao devem ser reaplicados como caminho oficial.

Referencias estruturais atuais a `appointment_services` existem em:

- `supabase/migrations/2026-06-06_fase6-8_architectural_prep.sql`: prepara plano, autorizacao, repasse medico, producao e status no servico.
- `supabase/migrations/2026-06-06_fase9-11_financial_integration.sql`: usa `appointment_services` para integracao financeira e views.
- `supabase/migrations/2026-06-07_add_unique_constraint_appointment_services.sql`: constraint de integridade da tabela oficial.
- `supabase/migrations/FIX_RECEIVABLE_FUNCTION_DUPLICATE.sql`: usa `appointment_services` no fluxo de recebiveis.

## Diagnostico Confirmado

Antes da correcao, havia uma API legada (`appointmentItemsApi.js`) com CRUD completo em `appointment_items`, enquanto o fluxo principal salvava em `appointment_services`. Isso explica o comportamento de servicos gravados que desaparecem ao editar quando qualquer chamada antiga e usada.

## Riscos Identificados

- Migrations antigas de `appointment_items` ainda existem no repositorio e podem confundir aplicacoes futuras de banco.
- Algumas integracoes financeiras paralelas coexistem (`appointmentBillingApi.js`, `appointmentFinancialIntegrationApi.ts`, automacoes financeiras e APIs de recebiveis). A entrega reutilizou as APIs existentes em vez de criar tabelas duplicadas.
- O workspace possui muitas alteracoes nao relacionadas ja presentes; a implementacao foi limitada aos arquivos diretamente envolvidos.

## Recomendacao

Manter `appointment_items` apenas como legado historico. Qualquer nova funcao, trigger, view, componente ou relatorio deve partir de `appointment_services`.
