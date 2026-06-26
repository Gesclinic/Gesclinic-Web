# IMPLEMENTACAO_PLANO_CONTAS_ERP_HOSPITALAR

Data: 2026-06-18
Escopo: Plano de Contas ERP Hospitalar Enterprise integrado ao ecossistema financeiro GesClinic

## 1) Auditoria completa executada (reuso sem duplicacao)

### Modulos auditados
- Plano de Contas: `financial_chart_of_accounts`, tela `PlanoContas`, API `chartOfAccountsApi`
- Contas a Receber: `receivablesApi`, tela `ContasReceber`
- Contas a Pagar: `financeApi` (AP), tela `ContasPagar`
- Fluxo de Caixa: `cashflowApi`, tela `FluxoCaixa`, consolidadores
- DRE e DRE Dinamica: `dynamicDREApi`, `dreApi`, `dreMotorApi`
- Centros de Custos: `financial_cost_centers` + `listCostCenters`
- Faturamento: migracoes enterprise e APIs relacionadas
- Repasse Medico: APIs e migracoes de repasse
- Cockpit Financeiro: telas e modulos analytics existentes

### Resultado da auditoria
- Ja existia base enterprise consistente para plano de contas, AR/AP, DRE, caixa e auditoria.
- A implementacao foi feita por extensao e integracao da base existente.
- Nao foram criados modulos paralelos duplicados de rotas/hooks/services.

## 2) Estrutura criada e estrutura reaproveitada

### Estrutura criada
- `src/lib/enterpriseChartOfAccounts.js`
  - Classificacao inteligente de receitas (AR) e despesas (AP)
  - Regras por descricao, convenio, tipo de pagador e contexto operacional
  - Fallbacks por codigo do plano (ex.: 1.2.1 Unimed, 6.2 TI, 7.2 Juros)
  - Resolucao de centro de custo padrao

- `supabase/migrations/20260618_enterprise_hospital_chart_of_accounts.sql`
  - Expansao de `financial_chart_of_accounts` com campos enterprise
  - Garantia de consistencia de flags analitica/sintetica/posting
  - Seed padrao ERP hospitalar com os grupos 1..9 e subgrupos
  - Parametrizacao de dimensoes em `dimension_config`

- `IMPLEMENTACAO_PLANO_CONTAS_ERP_HOSPITALAR.md`

### Estrutura reaproveitada
- Tela existente de plano de contas (`PlanoContas`) expandida
- API existente (`chartOfAccountsApi`) reaproveitada
- Funcoes existentes de seed e arvore (`seed_financial_chart_of_accounts`, `get_chart_of_accounts_tree`)
- Contas a Receber (`receivablesApi`) reaproveitada com classificacao automatica
- Contas a Pagar (`financeApi`) reaproveitada com classificacao automatica
- DRE, Fluxo de Caixa e Cockpit reaproveitados sem duplicacao

## 3) Tabelas utilizadas

- `financial_chart_of_accounts`
- `financial_chart_of_accounts_audit`
- `ar_invoices`
- `ap_bills`
- `financial_transactions`
- `financial_cost_centers`

## 4) APIs utilizadas

- `chartOfAccountsApi` (`list/create/update/delete/get audit`)
- `financeApi` (`listAccountPlans`, `listCostCenters`, `createAP`)
- `receivablesApi` (`createReceivable`)
- `dynamicDREApi`
- `cashflowApi`

## 5) Hooks utilizados

- Hooks ja existentes no modulo financeiro, sem criacao de duplicatas.
- Integracoes mantidas com contextos de autenticacao/clinica ja existentes.

## 6) Integracoes realizadas por fase

### Fase 1 - Plano de Contas multinivel
- Nivel ilimitado efetivo habilitado na tela (removida restricao de pai apenas nivel 1).
- Calculo de nivel por ancestralidade no client para visualizacao correta.
- Conta ampliada com atributos enterprise: codigo, natureza, descricao, posting, obrigatoriedade de centro de custo.

### Fase 2 - Estrutura ERP hospitalar
- Seed hospitalar enterprise incluído em migration com grupos:
  - Receitas
  - Deducoes
  - Custos Assistenciais
  - Honorarios Medicos
  - Pessoal
  - Despesas Administrativas
  - Despesas Financeiras
  - Investimentos
  - Patrimonio

### Fase 3 - Parametrizacao inteligente
- Inclusao de `dimension_config` no plano para suportar dimensoes:
  - categoria, subcategoria, grupo, centro de custo, unidade, especialidade, medico, convenio, fornecedor, paciente, empresa

### Fase 4 - Integracao Contas a Receber
- `createReceivable` agora classifica automaticamente e de forma obrigatoria.
- Regra de bloqueio: sem classificacao contabil -> nao grava receita.
- Mapeamentos automaticos para particular/convenios/exames/cirurgias/telemedicina etc.

### Fase 5 - Integracao Contas a Pagar
- `createAP` agora classifica automaticamente e de forma obrigatoria.
- Regra de bloqueio: sem conta contabil -> nao grava despesa.
- Mapeamentos automaticos para impostos, pessoal, repasses, custos assistenciais e despesas administrativas/financeiras.

### Fase 6 - Integracao Fluxo de Caixa
- Integracao preservada e reforcada via `financial_transactions` (ja existente).
- Recebimentos e pagamentos continuam alimentando previsto/realizado/consolidado.

### Fase 7 - Integracao DRE
- DRE dinamica ja baseada em dados reais e plano de contas.
- Conta contabil classificada automaticamente em AR/AP reduz lancamentos sem categoria no DRE.

### Fase 8 - Centros de Custos
- Classificador tenta resolver centro de custo padrao automaticamente.
- Estrutura de obrigatoriedade por conta habilitada (`requires_cost_center`).

### Fase 9 - Dashboard
- Sem duplicar dashboards: aproveitado cockpit/fluxo/DRE existentes.
- KPI passa a receber base melhor classificada (impacto indireto positivo imediato).

### Fase 10 - Importador ERP
- Importador da tela Plano de Contas ampliado para:
  - CSV
  - XLSX
  - XLSM
  - XLS
- Mapeamento de colunas suportado (codigo, nome, tipo, conta pai, categoria, subcategoria).

### Fase 11 - Governanca
- Auditoria reaproveitada em `financial_chart_of_accounts_audit`.
- Painel de logs de auditoria adicionado na tela de Plano de Contas.
- Tracking de acao e timestamp exibido.

### Fase 12 - Relatorio final
- Documento atual consolida tudo que foi implementado e reaproveitado.

## 7) Impactos por dominio

### Impacto no DRE
- Reducao de contas sem classificacao.
- Melhor atribuicao por natureza/tipo, melhorando composicao de margens e EBITDA.

### Impacto no Fluxo de Caixa
- Melhora da qualificacao dos movimentos via classificacao automatica.
- Menos ruído em entradas/saidas sem conta contabil.

### Impacto no Faturamento
- Receitas de convenio/particular/exames/cirurgias passam a cair em contas coerentes.

### Impacto no Contas a Receber
- Bloqueio de receitavel sem classificacao contabil.
- Mapeamento automatico por regra de negocio hospitalar.

### Impacto no Contas a Pagar
- Bloqueio de AP sem classificacao contabil.
- Mapeamento automatico por regra de negocio hospitalar.

## 8) Validacoes

### Build
- Status: OK
- Comando: `npm run build`

### Staging
- Status: Pendente (depende deploy do ambiente)

### Producao
- Status: Pendente (depende janela de deploy)

### Performance
- Status: Parcialmente validado (build OK, sem benchmark dedicado)

### Seguranca
- Status: Parcialmente validado (RLS e estrutura existente preservadas; sem pentest)

### Multiempresa / Multiclinica
- Status: OK por arquitetura (todas regras com `clinic_id`)

## 9) Arquivos alterados nesta implementacao

- `src/lib/enterpriseChartOfAccounts.js`
- `src/lib/receivablesApi.js`
- `src/lib/financeApi.js`
- `src/pages/clinica/financeiro/PlanoContas.jsx`
- `src/modules/financeiro/plano-contas/types/index.ts`
- `supabase/migrations/20260618_enterprise_hospital_chart_of_accounts.sql`
- `IMPLEMENTACAO_PLANO_CONTAS_ERP_HOSPITALAR.md`

## 10) Conclusao

O Plano de Contas foi elevado para um padrao ERP Hospitalar Enterprise sem duplicar modulos existentes, com classificacao automatica obrigatoria em AR/AP, importador multiformato e governanca auditavel, mantendo integracao com Fluxo de Caixa, DRE, Cockpit Financeiro, Faturamento, Repasse e Centros de Custo.
