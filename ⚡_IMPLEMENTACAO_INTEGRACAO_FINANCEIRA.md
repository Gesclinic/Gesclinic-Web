# 🚀 Implementação: Integração Financeira Automática em Atendimentos

## Sumário Executivo

Quando um paciente é **liberado para atendimento** (clique em "🟢 Liberar para Atendimento"), o sistema agora **automaticamente**:

✅ Cria registro de **Produção Médica**
✅ Calcula **Repasse Médico** (70/30)  
✅ Cria **Transação Financeira** (receita)
✅ Cria **Contas a Receber** (PARTICULAR) ou **Guia de Faturamento** (CONVÊNIO)

---

## Status de Implementação

### ✅ Código Implementado

1. **Check-in Drawer** (`CheckinDrawer.jsx`)
   - Importação da API de integração financeira
   - Chamada automática ao liberar para atendimento
   - Tratamento de erros e avisos

2. **API de Integração** (`appointmentFinancialIntegrationApi.js`)
   - Funções JavaScript para chamar RPCs
   - Orquestração de produção + repasse + financeiro

3. **Check-in Financeiro** (`financialCheckInApi.js`)  
   - **CORRIGIDO**: Agora usa tabela correta `ar_receivables` (não `accounts_receivable`)
   - Criação de Contas a Receber com campos corretos
   - Suporte para convênio/particular

### ⏳ Pendente: Deploy das Funções RPC

As 3 funções RPC precisam ser **executadas no Supabase**:
- `finalize_appointment_financial()`
- `process_appointment_medical_production()`
- `calculate_monthly_repasse()`

**Arquivo**: `supabase/migrations/20260405_appointment_financial_integration.sql`

---

## Como Fazer Deploy (3 Minutos)

### Opção 1: Automática (Recomendado) ⭐

```powershell
# Abra PowerShell em c:\Users\ferna\Desktop\Projeto Gesclinic Web
cd scripts
.\apply_appointment_financial_integration.ps1
```

Isso irá:
1. ✅ Copiar o SQL para clipboard
2. ✅ Abrir https://console.supabase.com/project/gvdkdjyupktlflwurike/sql/new
3. ✅ Colar (Ctrl+V) e executar (Ctrl+Enter)

### Opção 2: Manual

1. Abra: https://console.supabase.com/project/gvdkdjyupktlflwurike/sql/new
2. Copie todo o conteúdo de: `supabase/migrations/20260405_appointment_financial_integration.sql`
3. Cole no Supabase SQL Editor
4. Clique em **RUN**

---

## Fluxo de Teste

### Teste Pré-Deploy (Opcional)

Se quiser testar antes de fazer deploy no Supabase:

```bash
npm run dev
```

Você verá erros no console porque as RPCs não existem ainda. Isso é **normal**.

### Teste Pós-Deploy ✅

**Depois de executar o script acima:**

```bash
npm run dev
```

1. **Acesse**: http://localhost:3000/clinica/agenda
2. **Crie um agendamento** de teste:
   - Paciente: Qualquer
   - Data/Hora: Hoje ou amanhã
   - Profissional: Qualquer
   - Serviço: Qualquer (com preço)
   - Tipo: PARTICULAR (para testar AR)

3. **Complete o Check-in**:
   - Clique em "Check-in" na agenda
   - Complete a aba "Checklist"
   - Valide a aba "Financeiro"

4. **Libere para Atendimento**:
   - Clique em "🟢 LIBERAR PARA ATENDIMENTO"
   - Aguarde processamento (2-5 segundos)
   - Você verá aviso de sucesso

5. **Verifique Geração Automática**:
   - Vá em "Financeiro" → "Contas a Receber"
   - Deve aparecer novo registro com:
     - **Paciente**: Você criou
     - **Valor**: Valor do serviço
     - **Status**: "open"
     - **Data de Vencimento**: +5 dias

### Sucesso! ✅

Se o registro apareceu em "Contas a Receber", tudo está funcionando!

---

## Testar com Convênio/Insurance

Para testar com paciente de **convênio** (gera AR + Guia de Faturamento):

1. **Edite o agendamento** APÓS criar
2. Clique em "Tipo de Pagador"
3. Selecione "CONVÊNIO" e preencha dados
4. Faça check-in normalmente
5. Libere para atendimento

**Resultado esperado**: Dois registros criados
- ✅ Contas a Receber (em "Contas a Receber")
- ✅ Guia de Faturamento (em "Faturamento")

---

## Troubleshooting

### Erro: "Function finalize_appointment_financial not found"

**Causa**: As funções RPC ainda não foram deployadas

**Solução**:
```powershell
.\scripts\apply_appointment_financial_integration.ps1
```

### Erro: "Inserting into ar_receivables violates RLS"

**Causa**: Problema de RLS (Row Level Security)

**Solução**:
1. Verifique que `clinic_id` está correto
2. Verifique permissões do usuário em Supabase

### Nenhum erro, mas nenhum registro foi criado

**Causa**: A função rodou, mas algo foi silenciosamente skipped

**Verificar**:
1. Abra console (F12) no navegador
2. Veja os logs em "Console"
3. Procure por "💰 [Liberação] Processando"
4. Veja resposta em `financialResult`

---

## Estrutura de Dados Criados

Quando você libera um atendimento, o sistema cria:

### 1. medical_production
```
{
  id: uuid,
  clinic_id: uuid,
  professional_id: uuid,
  atendimento_id: appointment_id,  ← Link!
  tipo: 'consulta',
  valor_bruto: 150.00,
  valor_liquido: 112.50,
  data_atendimento: 2026-01-15,
}
```

### 2. financial_transactions
```
{
  id: uuid,
  clinic_id: uuid,
  description: 'Receita - Consulta (15/01/2026)',
  amount: 150.00,
  type: 'revenue',
  category: 'appointment',
  status: 'processed',
  professional_id: uuid,
}
```

### 3. medical_repasse
```
{
  id: uuid,
  clinic_id: uuid,
  professional_id: uuid,
  periodo_inicio: 2026-01-01,
  periodo_fim: 2026-01-31,
  valor_profissional: 84.375,    ← 70%
  valor_clinica: 28.125,         ← 30%
  status: 'pendente',
}
```

### 4. ar_receivables (PARTICULAR)
```
{
  id: uuid,
  clinic_id: uuid,
  paciente_id: uuid,
  appointment_id: uuid,          ← Link!
  descricao: 'Atendimento - 15/01/2026',
  valor_bruto: 150.00,
  descontos: 0.00,
  valor_liquido: 150.00,
  data_vencimento: 2026-01-20,
  status: 'open',
  origem: 'Agenda',
  profissional_id: uuid,
  servico_id: uuid,
}
```

---

## Arquivos Modificados

### ✅ Corrigidos
- `src/lib/receivablesApi.js` - Usa `ar_receivables` (não view)
- `src/lib/financialCheckInApi.js` - Insere em `ar_receivables` com campos corretos

### ✅ Novos Imports
- `src/pages/clinica/agenda/components/CheckinDrawer.jsx` 
  - Import: `finalizeAppointmentWithFinancials`
  - Nova função: Integração na `handleLiberar()`

### ✅ Scripts Criados
- `scripts/apply_appointment_financial_integration.ps1` - Deploy automático

---

## Próximos Passos (Opcional)

1. **Criar dashboard de análise**
   - Produção diária
   - Repasse mensal
   - Receita vs Recebimento

2. **Automação de Recebimento**
   - Marcar como recebido quando pagamento processado
   - Integração com gateway de pagamento

3. **Bulk Operations**
   - Liberar múltiplos atendimentos
   - Gerar lote de faturamento

---

## Perguntas?

- **Onde está o código?** → `src/pages/clinica/agenda/components/CheckinDrawer.jsx` (linhas 167-214)
- **Qual a tabela?** → `ar_receivables` (não `accounts_receivable`)
- **Como desabilitar?** → Remover linhas 167-214 do CheckinDrawer.jsx
- **Pode falhar?** → Sim, se as RPCs não existem ou dados incompletos. Avisos aparecerão na UI.

---

## Resumo do que foi feito

| Item | Status | Local |
|------|--------|-------|
| API JS para integração | ✅ | `appointmentFinancialIntegrationApi.js` |
| Correção de tabela | ✅ | `receivablesApi.js`, `financialCheckInApi.js` |
| Integração em CheckinDrawer | ✅ | `CheckinDrawer.jsx` |
| Script de deploy | ✅ | `scripts/apply_appointment_financial_integration.ps1` |
| Funções RPC | ⏳ | Execute script acima |
| Testes | ⏳ | Siga "Fluxo de Teste" acima |

---

**Data**: 2026-01-15
**Versão**: 1.0
**Status**: Pronto para Deploy ✅
