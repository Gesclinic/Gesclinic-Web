# AUDITORIA_FATURAMENTO_ATUAL

Data: 2026-06-11
Escopo: módulo Faturamento Enterprise, integrações Agenda -> Atendimento -> Faturamento -> Contas a Receber -> Fluxo de Caixa -> DRE -> Repasse Médico.
Critério: não criar duplicatas; mapear e reutilizar o que já existe.

## Resumo executivo

O GesClinic já possui base enterprise relevante para faturamento, porém distribuída entre `src/pages/clinica/faturamento`, `src/pages/clinica/financeiro`, `src/lib` e migrações Supabase. A fonte oficial de serviços do atendimento é `appointment_services`; `appointment_items` deve permanecer como legado histórico.

Score atual após esta revisão: 82/100.

- Implementado: motor Agenda -> Recebível, Contas a Receber enterprise, glosas, parcelas/baixas, fluxo previsto/DRE/indicadores, repasse, validação/geração TISS, rotas principais de Faturamento.
- Parcial: telas de Faturamento ainda misturam dados reais e mocks em Lotes/Relatórios/Guias específicas; integração externa real com operadoras depende de credenciais/endpoints e backend para SFTP.
- Não existe ou futuro: integrações fiscais externas, SPED, NFSe real, staging/produção automatizados dentro deste workspace.

## Mapa obrigatório

| Área | Status | Evidências | Observações |
| --- | ---: | --- | --- |
| Agenda | ✅ Implementado | `src/lib/appointmentsApi.js`, rotas Agenda, fluxo de atendimento | Integra com faturamento via `syncAppointmentBilling`. |
| Appointment Services | ✅ Implementado | `appointment_services`, `src/lib/appointmentItemsApi.js`, `src/pages/clinica/agenda/components/AppointmentItemsManager.jsx` | Fonte oficial consolidada. |
| Recebíveis | ✅ Implementado | `src/lib/receivablesApi.js`, `src/lib/receivableMotorApi.js` | CRUD, normalização, pagamentos, glosas e anexos. |
| Contas a Receber | ✅ Implementado | `src/pages/clinica/financeiro/ContasReceber.jsx`, `NovoRecebimento.jsx`, `EditarRecebimento.jsx` | Tela enterprise validada em sessão anterior. |
| Fluxo de Caixa | ✅ Implementado | `src/lib/cashflowApi.js`, `src/pages/clinica/financeiro/FluxoCaixa.jsx` | Automação prevista em `appointmentFinancialAutomations.js`. |
| DRE | ✅ Implementado | `src/lib/dreApi.js`, `src/lib/dreMotorApi.js`, `src/lib/dynamicDREApi.ts` | Receitas alimentadas por automações financeiras. |
| Repasse Médico | ✅ Implementado | `src/lib/repasseMedicoApi.js`, `src/lib/medicalRepasseMotorApi.js`, páginas Repasse | Regras, geração, extrato e integração AP. |
| Convênios | ✅ Implementado | `healthInsurancesApi.js`, TISS fields em migrações | Base cadastral/TISS existente. |
| Profissionais | ✅ Implementado | base-sistema/profissionais, repasse, appointments | Usado em agenda, TISS e repasse. |
| Pacientes | ✅ Implementado | pacientes, appointments, TISS data | Usado em guias e recebíveis. |
| Procedimentos | ✅ Implementado | services/procedures, TUSS fields | TISS exige código TUSS. |
| Guias | ⚠️ Parcial | `billing_guides`, `GuiasPage.jsx`, `GuiasConsulta.jsx` | Consulta existe; internação/SADT estão preparadas mas algumas telas ainda são placeholder. |
| Lotes | ⚠️ Parcial | `billing_batches`, `FaturamentoDashboard.jsx`, `LotesPage.jsx` | Dashboard real existe; página de lotes simples ainda usa mock local. |
| XML/TISS | ⚠️ Parcial | `tissApi.js`, `tissSubmissionServiceApi.js`, `XMLPage.jsx` | Geração/submissão preparada; envio externo real depende de operadora. Bug crítico corrigido nesta rodada. |
| Retornos & Recibos | ⚠️ Parcial | `RetornosPage.jsx`, `tiss_submissions`, webhook handler | Estrutura pronta; precisa homologação com payloads reais. |
| Glosas | ✅ Implementado | `receivable_glosas`, `registerReceivableGlosa`, workflow em ContasReceber | Parcial/total/técnica/administrativa suportadas no fluxo financeiro. |
| Financeiro | ✅ Implementado | Contas a Receber, AP, cashflow, DRE, cockpit | Integrações principais existem. |

## Classificação por fase do prompt

| Fase | Status | Resultado |
| --- | ---: | --- |
| 0 Auditoria | ✅ Implementado | Este relatório gerado. |
| 1 Motor de faturamento | ✅ Implementado | `syncAppointmentBilling` usa `appointment_services` e cria `ar_invoices`. |
| 2 Particular | ✅ Implementado | Métodos normalizados: PIX, cartão, débito, crédito, dinheiro, boleto, transferência; baixa parcial/split em Recebíveis. |
| 3 Convênios | ⚠️ Parcial | Guias/lotes/faturas/status existem; envio externo precisa credenciais e homologação. |
| 4 TISS/XML | ⚠️ Parcial | Validação/geração/submissão preparada; correção aplicada em `tissSubmissionServiceApi.js`. |
| 5 Glosas | ✅ Implementado | Registro, workflow, evidências e dashboard em Contas Receber. |
| 6 Contas a Receber | ✅ Implementado | Todo faturamento de atendimento gera `ar_invoices`. |
| 7 Fluxo de Caixa | ✅ Implementado | Automação prevista/indicadores via `appointmentFinancialAutomations.js`. |
| 8 DRE | ✅ Implementado | DRE dinâmica e métricas alimentadas por receita. |
| 9 Produção Médica | ⚠️ Parcial | Relatórios de produção existem; consolidação executiva ainda dispersa. |
| 10 Repasse Médico | ✅ Implementado | APIs e páginas de repasse existentes. |
| 11 Lote de Faturamento | ⚠️ Parcial | `billing_batches` e dashboard real existem; página simplificada de lotes ainda requer persistência total. |
| 12 Dashboard Executivo | ⚠️ Parcial | Cockpit financeiro e dashboard faturamento existem, mas KPIs de faturamento principal ainda não estão todos dinâmicos. |
| 13 Relatórios Gerenciais | ⚠️ Parcial | Relatórios existem e exportação em Contas Receber; página de Faturamento ainda tem mock em partes. |
| 14 UX/UI Enterprise | ⚠️ Parcial | UI com grids, filtros e KPIs em Financeiro; Faturamento precisa padronização completa. |
| 15 Automações | ✅ Implementado | Agenda -> Recebível -> automações financeiras operantes. |
| 16 Segurança | ⚠️ Parcial | RLS/clinic_id existem em migrações principais; precisa auditoria contínua em todas as tabelas novas. |
| 17 Compliance | ⚠️ Parcial | TISS/LGPD/auditoria preparados; fiscal externo futuro. |
| 18 Testes | ⚠️ Parcial | Testes unitários existentes; E2E completo de ponta a ponta ainda pendente. |
| 19 Relatório Final | ✅ Implementado | `IMPLEMENTACAO_FATURAMENTO_ENTERPRISE.md` gerado. |

## Bugs encontrados nesta auditoria

1. `src/lib/tissSubmissionServiceApi.js` tinha variáveis `data` inexistentes e retornos mortos em HTTP, SFTP, portal e `fetchCompleteGuideData`.
2. `/clinica/faturamento/dashboard` apontava para a página inicial de cards, apesar de existir `FaturamentoDashboard.jsx` com consulta real a `billing_batches`.
3. Algumas páginas do submódulo Faturamento ainda usam dados mockados ou placeholders, especialmente `LotesPage.jsx`, `RelatoriosPage.jsx` e abas internação/SADT de `GuiasPage.jsx`.

## Pendências reais

- Homologar TISS com operadoras reais por método `api`, `portal` e backend SFTP.
- Trocar mocks restantes de Lotes/Relatórios por consultas reais reutilizando `billing_batches`, `billing_guides`, `tiss_submissions` e `receivable_glosas`.
- Criar suíte E2E completa Agenda -> Atendimento -> Faturamento -> Recebível -> Baixa -> Fluxo -> DRE -> Repasse.
- Validar staging e produção com URLs/credenciais próprias; este workspace só permite validação local/link Supabase.
