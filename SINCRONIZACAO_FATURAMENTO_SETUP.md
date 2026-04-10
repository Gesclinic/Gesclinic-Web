# 💳 Sincronização de Faturamento - Setup

## O Que Foi Criado

### 1. **Arquivo de Migração SQL**
📄 `supabase/migrations/2026-04-01_add_billing_columns.sql`

Adiciona as colunas faltantes:
- `appointments.payer_name` - Nome do convênio/pagador
- `appointments.plan_name` - Nome do plano de saúde
- `ap_bills.appointment_id` - Referência ao agendamento
- `ap_bills.payer_type` - Tipo de pagador (paciente/convenio)
- `ap_bills.payment_method` - Método de pagamento
- `invoices.appointment_id` - Referência ao agendamento

### 2. **Script de Aplicação**
🔧 `scripts/apply_billing_columns_migration.ps1`

Aplica a migração automaticamente via Supabase

### 3. **Função de Sincronização**
💻 `src/lib/appointmentBillingApi.js`

Contém `syncAppointmentBilling()` que:
- ✅ Lê dados do appointment
- ✅ Cria entrada em `ap_bills` (Contas a Receber)
- ✅ Cria entrada em `invoices` se for convênio
- ✅ Sincroniza valores, descontos, método de pagamento

---

## 📋 Como Usar

### Passo 1: Aplicar Migração

#### Opção A: Via PowerShell (Automático)
```powershell
cd "C:\Users\ferna\Desktop\Projeto Gesclinic Web"
.\scripts\apply_billing_columns_migration.ps1
```

#### Opção B: Aplicar Manualmente no Supabase
1. Acesse: [Supabase Dashboard](https://app.supabase.com)
2. Vá para **SQL Editor**
3. Cole o conteúdo de `supabase/migrations/2026-04-01_add_billing_columns.sql`
4. Execute

### Passo 2: Testar Sincronização

1. **Abra a Agenda**
   - URL: http://localhost:3000/clinica/agenda

2. **Clique em "Atender"**
   - Vai para Página de Paciente

3. **Clique "Iniciar Atendimento"**
   - Status muda para IN_SERVICE

4. **Preencha o Prontuário**
   - Adicione dados clínicos

5. **Clique "Finalizar Atendimento"**
   - ✅ Sincroniza dados para Contas a Receber
   - ✅ Se for convênio, cria Guia de Faturamento

6. **Verifique em Contas a Receber**
   - URL: http://localhost:3000/clinica/financeiro/receber
   - Deve aparecer a conta criada ✅

---

## 📊 Dados Sincronizados

### Conta a Receber (ap_bills)
| Campo | Valor |
|-------|-------|
| `appointment_id` | ID do agendamento |
| `patient_id` | ID do paciente |
| `clinic_id` | ID da clínica |
| `description` | "Serviço - Convênio" |
| `amount` | Valor líquido (com desconto) |
| `due_date` | Data do agendamento |
| `status` | "open" (em aberto) |
| `payment_method` | Método informado |
| `payer_id` | ID do convênio/paciente |
| `payer_type` | "paciente" ou "convenio" |

### Guia de Faturamento (invoices) - Se Convênio
| Campo | Valor |
|-------|-------|
| `appointment_id` | ID do agendamento |
| `patient_id` | ID do paciente |
| `health_plan` | Nome do convênio |
| `authorization_number` | Número da autorização |
| `guide_number` | Número da guia |
| `total_amount` | Valor líquido |
| `status` | "pending_submission" |

---

## ✅ Checklist de Verificação

- [ ] Migração aplicada (colunas existem)
- [ ] App rodando sem erros de console
- [ ] Atendimento criado e finalizado
- [ ] Conta aparece em Contas a Receber
- [ ] Valores corretos (com desconto aplicado)
- [ ] Se convênio, guia criada em Invoices
- [ ] Auditoria registrada em audit_financial

---

## 🔍 Troubleshooting

### Erro: "Column does not exist"
**Solução**: Aplique a migração SQL primeira (Passo 1)

### Erro: "Appointment não encontrado"
**Solução**: Verifique se o appointment realmente existe no banco

### Contas a Receber não aparecem
**Solução**: 
1. Verifique console para erros de sincronização
2. Confirme que `ap_bills` existe e tem dados
3. Recarregue a página de Contas a Receber (F5)

### Valores incorretos
**Solução**: Verifique se `appointment.value` e `appointment.discount` estão corretos

---

## 📝 Logs Disponíveis

Abra o **Console do Navegador** (F12) e procure por:
- `💳 [syncAppointmentBilling]` - Início da sincronização
- `✅ Appointment carregado` - Dados do appointment
- `✅ Conta a Receber criada` - Bill criado com sucesso
- `✅ Guia criada` - Invoice criado (se convênio)

---

## 🚀 Próximas Melhorias

- [ ] Permitir edição de Contas a Receber após criação
- [ ] Sincronizar alterações de status (paid, partial, etc)
- [ ] Gerar relatórios de faturamento
- [ ] Integrar com gateway de pagamento
- [ ] Enviar guias para operadora automaticamente
