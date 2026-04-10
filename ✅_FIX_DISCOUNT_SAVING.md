# ✅ FIX: Desconto Não Estava Salvando

## 🔴 Problema
Os descontos aplicados no modal de agendamento não estavam sendo salvos no banco de dados.

## 🔍 Root Cause (Causa Raiz)
No componente `AppointmentUnitedModal.jsx`, a função `handleSaveChanges()` estava processando o desconto através do sistema de pagamentos, mas **NÃO estava salvando o desconto diretamente na tabela `appointments`**.

Quando criando um novo agendamento, o objeto `newAppointmentData` NÃO incluía o campo `discount`.
Quando editando um agendamento, o objeto `updateData` NÃO incluía o campo `discount`.

Isso significava que o valor do desconto obtido de `pagamentoData.discount` nunca era persistido no banco de dados.

## ✅ Solução Implementada

### 1️⃣ Adicionado `discount` ao criar novo agendamento
**Arquivo:** `src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx` (Linhas ~603-615)

```javascript
// ✅ ANTES (sem desconto)
const newAppointmentData = {
  clinic_id: clinicId,
  patient_id: agendamentoData.patientId || null,
  // ... outros campos
  duration: agendamentoData.duration,
};

// ✅ DEPOIS (com desconto)
const newAppointmentData = {
  clinic_id: clinicId,
  patient_id: agendamentoData.patientId || null,
  // ... outros campos
  discount: pagamentoData.discount ? parseFloat(pagamentoData.discount) : 0,
  duration: agendamentoData.duration,
};
```

### 2️⃣ Adicionado `discount` ao editar agendamento
**Arquivo:** `src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx` (Linhas ~619-633)

```javascript
// ✅ ANTES (sem desconto)
const updateData = {
  status: agendamentoData.status,
  // ... outros campos
  notes: agendamentoData.notes,
};

// ✅ DEPOIS (com desconto)
const updateData = {
  status: agendamentoData.status,
  // ... outros campos
  discount: pagamentoData.discount ? parseFloat(pagamentoData.discount) : 0,
  notes: agendamentoData.notes,
};
```

### 3️⃣ Adicionado carregamento do desconto ao editar agendamento
**Arquivo:** `src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx` (Linhas ~343-350)

```javascript
// ✅ ANTES (sem carregamento de desconto)
setPagamentoData(prev => ({
  ...defaultPaymentData,
  payment_method: 'DINHEIRO',
  dinheiro: {
    ...defaultPaymentData.dinheiro,
    value_received: appointment.value?.toString() || '0.00',
  }
}));

// ✅ DEPOIS (com carregamento de desconto)
setPagamentoData(prev => ({
  ...defaultPaymentData,
  payment_method: appointment.payment_method || 'DINHEIRO',
  discount: appointment.discount ? parseFloat(appointment.discount).toFixed(2) : '0.00',
  dinheiro: {
    ...defaultPaymentData.dinheiro,
    value_received: appointment.value?.toString() || '0.00',
  }
}));
```

## 🎯 Resultado

Agora quando o usuário:
1. **Cria um novo agendamento** com desconto → Desconto é SALVO na tabela `appointments`
2. **Edita um agendamento** e aplica desconto → Desconto é SALVO na tabela `appointments`
3. **Reabre um agendamento** para edição → Desconto anterior é CARREGADO do banco de dados

## 🧪 Como Testar

1. Abrir modal de criar/editar agendamento
2. Ir para aba "Pagamento"
3. Clicar em "➕ Aplicar Desconto"
4. Preencher valor do desconto e motivo
5. Clicar em "Criar Agendamento" ou "Salvar"
6. Reabrir o agendamento → O desconto deve estar lá! ✅

## 📝 Notas Adicionais

- O desconto também continua sendo registrado na tabela `discount_authorizations` para auditoria
- O sistema mantém a integração com a tabela `discount_authorizations` que registra o motivo e observações
- O desconto é calculado corretamente no resumo financeiro (Valor a Receber = Valor Total - Desconto)

## 🚀 Status
✅ **RESOLVIDO** - Descontos agora são salvos corretamente!
