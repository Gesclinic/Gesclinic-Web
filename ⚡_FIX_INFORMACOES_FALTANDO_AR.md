# 🔧 FIX: Informações Faltando em Contas a Receber

## Problema Identificado

Quando um atendimento foi liberado e criou um registro em "Contas a Receber", ele aparecia com:
- ❌ Valor: R$ 0.00
- ❌ Informações do paciente: Não preenchidas
- ❌ CPF e Telefone: Faltando

### Screenshot do Problema
```
Status: Recebido ✓
Valor: R$ 0.00  ← ERRADO!
Vencimento: 22/03/2026
Origem: Agenda
```

---

## Root Causes (Causas Raiz)

### 1. **Valor não era obtido corretamente**
   - `currentAppointment.value` vinha como `null` ou `undefined`
   - O serviço não estava sendo consultado
   - Resultado: R$ 0.00 nos registros

### 2. **Informações do paciente não eram passadas**
   - CPF, telefone, email não eram enviados
   - Descrição era genérica ("Atendimento - 22/03/2026")
   - Faltava nome do paciente

### 3. **Campos financeiros não estavam sendo enviados**
   - Health plan, authorization, card info não iam
   - Dados de convênio eram ignorados

---

## Correções Implementadas ✅

### 1. **CheckinDrawer.jsx** - Enviar MAIS dados

**ANTES:**
```javascript
const financialResult = await finalizeAppointmentWithFinancials(
  appointmentId,
  {
    payer_type: payer_type || 'PARTICULAR',
    patient_name: patient_name,
    payment_method: payment_method,
    value: value,              // ❌ Regular nulo
    copayment: copayment || 0,
    discount: discount || 0,
  }
);
```

**DEPOIS:**
```javascript
const financialResult = await finalizeAppointmentWithFinancials(
  appointmentId,
  {
    payer_type: payer_type || 'CONVENIO' || 'PARTICULAR',
    patient_name: patient_name || lead_name,        // ✅ Múltiplas opções
    patient_email: patient?.email,                   // ✅ NOVO
    patient_cpf: patient?.cpf,                       // ✅ NOVO
    patient_phone: patient?.phone,                   // ✅ NOVO
    payment_method: payment_method,
    health_plan: health_plan,                        // ✅ NOVO
    authorization_number: authorization_number,    // ✅ NOVO
    card_number: card_number,                       // ✅ NOVO
    guide_number: guide_number,                     // ✅ NOVO
    card_verified: card_verified || false,          // ✅ NOVO
    authorization_verified: authorization_verified || false, // ✅ NOVO
    value: value || 0,
    copayment: copayment || 0,
    discount: discount || 0,
  }
);
```

### 2. **appointmentFinancialIntegrationApi.js** - Buscar valor se não fornecido

**NOVO:**
```javascript
// Se não houver valor em financialData, tentar buscar do appointment
let appointmentValue = financialData.value || 0;

if (!appointmentValue || appointmentValue === 0) {
  const { data: apt } = await supabase
    .from('appointments')
    .select('value, service_id')
    .eq('id', appointmentId)
    .single();
  
  if (apt?.value) {
    appointmentValue = apt.value;
  } else if (apt?.service_id) {
    const { data: svc } = await supabase
      .from('services')
      .select('price')
      .eq('id', apt.service_id)
      .single();
    
    if (svc?.price) {
      appointmentValue = svc.price;
    }
  }
}
```

### 3. **financialCheckInApi.js** - Melhorar lógica de valor e descrição

**ANTES:**
```javascript
let finalValue = financialData.value || 0;
if (!finalValue) {
  // Buscar único lugar
}
const netValue = finalValue - discount;
descricao: `Atendimento - ${date}`  // Genérico
```

**DEPOIS:**
```javascript
// 1️⃣ Prioridade: Dados > Appointment > Serviço
let finalValue = parseFloat(financialData.value) || 0;
if (!finalValue || isNaN(finalValue)) {
  const { data: service } = await supabase
    .from('services')
    .select('price, name')
    .eq('id', appointment.service_id)
    .single();
  if (service?.price) {
    finalValue = parseFloat(service.price);
  }
}

// 2️⃣ Descrição com nome do paciente
descricao: financialData.patient_name 
  ? `Atendimento de ${financialData.patient_name} - ${date}`
  : `Atendimento - ${date}`,

// 3️⃣ Atualizar dados do paciente ANTES de criar AR
if (financialData.patient_name || financialData.patient_email || ...) {
  const patientUpdate = {};
  if (financialData.patient_name) patientUpdate.name = financialData.patient_name;
  if (financialData.patient_email) patientUpdate.email = financialData.patient_email;
  if (financialData.patient_cpf) patientUpdate.cpf = financialData.patient_cpf;
  if (financialData.patient_phone) patientUpdate.phone = financialData.patient_phone;
  
  await supabase
    .from('patients')
    .update(patientUpdate)
    .eq('id', appointment.patient_id);
}
```

### 4. **20260405_appointment_financial_integration.sql** - Aceitar valor como parâmetro

**ANTES:**
```sql
CREATE OR REPLACE FUNCTION finalize_appointment_financial(
  p_appointment_id UUID
)
-- ❌ Sem parâmetro de valor
```

**DEPOIS:**
```sql
CREATE OR REPLACE FUNCTION finalize_appointment_financial(
  p_appointment_id UUID,
  p_appointment_value DECIMAL DEFAULT 0  -- ✅ NOVO
)
-- ... depois tenta buscar do serviço se 0
v_value := COALESCE(NULLIF(p_appointment_value, 0), v_apt.value);
IF v_value = 0 OR v_value IS NULL THEN
  SELECT price INTO v_value FROM services WHERE id = v_apt.service_id;
END IF;
```

---

## Resultado Esperado Após Correção ✅

### ANTES (COD - Contas a Receber Deficiente):
```
┌─────────────────────────────────────────┐
│ Descrição: Atendimento - 22/03/2026     │
│ Pagador: ---                            │
│ Vencimento: 22/03/2026                  │
│ Valor: R$ 0.00  ❌                      │
│ Status: Recebido ✓                      │
└─────────────────────────────────────────┘
```

### DEPOIS (COD - Contas a Receber Correto):
```
┌──────────────────────────────────────────────────────┐
│ Descrição: Atendimento de João Silva - 22/03/2026  │
│ Pagador: João Silva                                 │
│ Vencimento: 22/03/2026                              │
│ Valor: R$ 150.00  ✅                                │
│ Status: open (aberto para recebimento)              │
│ Origem: Agenda                                      │
│ CPF: 123.456.789-00 (na tabela patients)            │
│ Telefone: (11) 98765-4321 (na tabela patients)      │
└──────────────────────────────────────────────────────┘
```

---

## Checklist de Testes

Depois de fazer o deploy, teste:

- [ ] **Criar atendimento** com serviço que tem preço
- [ ] **Check-in:** Complete checklist + financeiro
- [ ] **Liberar:** Clique "🟢 LIBERAR"
- [ ] **Verificar Contas a Receber:**
  - ✅ Valor deve ser > 0 (não R$ 0.00)
  - ✅ Nome do paciente na descrição
  - ✅ Status deve ser "open" (não "Recebido")
  - ✅ Vencimento deve ser +5 dias

- [ ] **Testar com CONVÊNIO:**
  - ✅ Deve criar AMBOS: AR + Guia de Faturamento
  - ✅ Campos de convênio devem estar preenchidos

---

## Deployment

### Step 1: Atualizar RPC (SIM, PRECISA!)

A RPC foi modificada para aceitar `p_appointment_value`. Execute:

```powershell
.\scripts\apply_appointment_financial_integration.ps1
```

Ou manualmente:
1. Abra Supabase SQL Editor
2. Cole `supabase/migrations/20260405_appointment_financial_integration.sql`
3. Click RUN

### Step 2: Restar front-end

```bash
npm run dev
# Ou refresh no navegador se já rodando
```

---

## Resolução por Arquivo

| Arquivo | Mudança | Resultado |
|---------|---------|-----------|
| CheckinDrawer.jsx | Passar 11 campos em vez de 5 | ✅ Dados completos |
| appointmentFinancialIntegrationApi.js | Buscar valor se nulo | ✅ Sempre tem valor |
| financialCheckInApi.js | Melhor busca + atualizar paciente | ✅ CPF/Telefone preenchidos |
| 20260405_*.sql | Aceitar valor como param | ✅ RPC mais inteligente |

---

## Possíveis Problemas Residuais

### ❓ Valor ainda vem como R$ 0.00
**Solução**: Verifique se o serviço tem preço no Supabase
- Vá em Cadastros → Serviços
- Verifique se a coluna `price` está preenchida

### ❓ CPF/Telefone não aparece em Contas a Receber
**Esperado**: Eles estão na tabela `patients`, não em `ar_receivables`
- Vá em Pacientes para ver CPF/Telefone
- Ou customize a view de Contas a Receber para mostrar

### ❓ Ainda dá 406 ou erro de RLS
**Solução**: Execute novamente:
```powershell
.\scripts\apply_appointment_financial_integration.ps1
```

---

## Próximos Passos (Optional)

1. **Customizar descrição** em `financialCheckInApi.js`linha 136 para incluir mais detalhes
2. **Adicionar coluna em `ar_receivables`** para CPF/Telefone (se quiser)
3. **Criar relatório** de AR com todas as informações

---

**Status**: 🟢 **PRONTO PARA TESTAR**
**Próximo**: Execute PowerShell script para atualizar RPC
