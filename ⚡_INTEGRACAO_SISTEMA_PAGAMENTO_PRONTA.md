# 💳 INTEGRAÇÃO DO SISTEMA DE PAGAMENTO - COMPLETA

## ✅ O QUE FOI INTEGRADO

### 1. **AppointmentUnitedModal.jsx** - Arquivo Principal
**Arquivo:** `src/pages/clinica/recepcao/components/AppointmentUnitedModal.jsx`

#### Imports Adicionados:
```javascript
import { useAuth } from '@/contexts/AuthContext';
import { PAYMENT_METHOD_CONFIG, defaultPaymentData, validatePaymentData } from '@/lib/paymentMethodsConfig';
import PaymentMethodFields from './PaymentMethodFields';
import { processPaymentComplete } from '@/lib/paymentRegistrationApi';
```

#### Estado Modificado:
```javascript
// Antes: estado simples com 6 campos
// Depois: estado completo com estrutura por método de pagamento
const [pagamentoData, setPagamentoData] = useState(defaultPaymentData);

// defaultPaymentData contém:
{
  payment_method: 'DINHEIRO',
  discount: '0.00',
  dinheiro: { value_received: '', change: '', notes: '' },
  cartao: { brand: '', last_4: '', installments: 1, authorization: '', operator: '', notes: '' },
  pix: { identifier: '', transaction_id: '', bank_account: '', notes: '' },
  cheque: { bank: '', agency: '', account: '', check_number: '', due_date: '', notes: '' },
  boleto: { barcode: '', bank: '', due_date: '', notes: '' }
}
```

#### Handlers Novos:
```javascript
// Mudanças em campos específicos de pagamento
const handlePaymentFieldChange = (field, value) => {
  const methodKey = paymentMethod.toLowerCase();
  setPagamentoData(prev => ({
    ...prev,
    [methodKey]: { ...prev[methodKey], [field]: value }
  }));
};

// Cálculo automático de troco para dinheiro
const handleCalculateChange = (sent) => {
  const amount = parseFloat(agendamentoData.value) || 0;
  const sentAmount = parseFloat(sent) || 0;
  const change = sentAmount - amount;
  
  setPagamentoData(prev => ({
    ...prev,
    dinheiro: {
      ...prev.dinheiro,
      value_received: sent,
      change: change > 0 ? change.toFixed(2) : '0.00'
    }
  }));
};
```

#### handleSaveChanges Atualizado:
```javascript
// Agora também processa pagamentos se for particular
if (isParticular && user?.id) {
  const validation = validatePaymentData(pagamentoData.payment_method, pagamentoData);
  if (!validation.valid) throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
  
  const result = await processPaymentComplete({
    clinicId,
    appointmentId: appointment.id,
    patientId: appointment.patient_id,
    paymentData: pagamentoData,
    performedBy: user.id,
  });
  
  if (!result.success) throw new Error(`Erro: ${result.error}`);
}
```

#### Aba de Pagamento Renovada:
```javascript
{/* ABA: PAGAMENTO */}
{tabAtivo === 'pagamento' && isParticular && (
  <div className="space-y-4">
    {/* Selector de forma de pagamento */}
    <Select value={pagamentoData.payment_method} onChange={...}>
      {/* Dinheiro, Cartão, PIX, Cheque, Boleto */}
    </Select>
    
    {/* Valor Total */}
    <Input type="number" value={agendamentoData.value} />
    
    {/* Desconto */}
    <Input type="number" value={pagamentoData.discount} />
    
    {/* 🔥 NOVO: Componente dinâmico de campos */}
    <PaymentMethodFields
      paymentMethod={pagamentoData.payment_method}
      paymentData={pagamentoData}
      bankAccounts={[]}
      onFieldChange={handlePaymentFieldChange}
      onCalculateChange={handleCalculateChange}
    />
  </div>
)}
```

---

### 2. **PaymentMethodFields.jsx** - Componente de Formulário
**Arquivo:** `src/pages/clinica/recepcao/components/PaymentMethodFields.jsx`

#### Funcionalidades:
- ✅ Renderização dinâmica de campos por tipo de pagamento
- ✅ Máscaras automáticas (numérico, maxLength)
- ✅ Validações de input
- ✅ Cálculo automático de troco para dinheiro
- ✅ Alertas (cheque pré-datado, boleto futuro)
- ✅ Display do valor da transação

#### Props Esperadas:
```javascript
paymentMethod: 'DINHEIRO' | 'CARTAO' | 'PIX' | 'CHEQUE' | 'BOLETO'
paymentData: { [methodKey]: { field1, field2, ... } }
bankAccounts: [] // Contas bancárias para PIX
onFieldChange: (fieldId, value) => void
onCalculateChange: (sentAmount) => void
```

#### Correção Aplicada:
- Ajustada assinatura de `onFieldChange` para receber apenas `(fieldId, value)`
- Removido `methodKey` da chamada (tratado no handler do modal)

---

### 3. **Banco de Dados** - Migração SQL
**Arquivo:** `supabase/migrations/2026-03-07_payment_rastreabilidade_v2.sql`

#### Tabelas Criadas:
1. **accounts_receivable** - Contas a receber com rastreabilidade
2. **journal_entries** - Plano de contas (diário)  
3. **cash_register_sessions** - Caixas do dia
4. **cash_register_movements** - Movimentos individuais
5. **financial_audits** - Log de todas as ações
6. **chart_of_accounts** - Cadastro de plano de contas

#### Status das Migrações:
✅ **JÁ EXECUTADA E FUNCIONANDO NO SUPABASE**

---

### 4. **API de Integração Financeira**
**Arquivo:** `src/lib/paymentRegistrationApi.js`

#### Funções Disponíveis:
```javascript
processPaymentComplete(params) {
  // Orquestra todas as etapas:
  // 1. Registra/atualiza conta a receber
  // 2. Cria entrada no diário (plano de contas)
  // 3. Registra no caixa do dia
  // 4. Cria log de auditoria
  // Retorna: { success: bool, receivableId, error? }
}

closeCashRegister(sessionId) {
  // Finaliza o caixa do dia
  // Calcula discrepâncias
  // Retorna: { success, discrepancy }
}

getCashRegisterMovements(sessionId) {
  // Consulta movimentos do dia
  // Útil para reconciliação
}
```

---

### 5. **Configuração de Métodos de Pagamento**
**Arquivo:** `src/lib/paymentMethodsConfig.js`

#### Estrutura de Dados:
```javascript
PAYMENT_METHODS = {
  DINHEIRO: 'DINHEIRO',      // Dinheiro na mão
  CARTAO: 'CARTAO',          // Cartão crédito/débito
  PIX: 'PIX',                // PIX (instantâneo)
  CHEQUE: 'CHEQUE',          // Cheque
  BOLETO: 'BOLETO'           // Boleto
}

PAYMENT_METHOD_CONFIG[method] = {
  label: 'Forma de Pagamento',
  color: 'color-code',
  icon: 'emoji',
  fields: [
    { id, label, type, required, mask, ... }
  ],
  accountingAccount: 'CAIXA',  // Plano de contas
  receivableType: 'CASH'       // Tipo conta a receber
}
```

#### Campos por Tipo:

**DINHEIRO:**
- value_received (obrigatório)
- change (auto-calculado, desabilitado)
- notes

**CARTAO:**
- brand (VISA, MASTERCARD, ELO, AMEX, HIPERCARD)
- last_4 (últimos 4 dígitos)
- installments (1-12)
- authorization (número de autorização)
- operator (operador que recebeu) **⚠️ IMPORTANTE**
- notes

**PIX:**
- identifier (CPF, email, telefone, etc)
- transaction_id (UUID da transação)
- bank_account (compte bancária)
- notes

**CHEQUE:**
- bank (nome do banco)
- agency (agência)
- account (conta)
- check_number (número do cheque)
- due_date (data compensação)
- notes

**BOLETO:**
- barcode (código barras 47 dígitos)
- bank (banco)
- due_date (vencimento)
- notes

---

## 🎯 FLUXO DE PAGAMENTO COMPLETO

```
1. Usuário seleciona "Particular" como forma de faturamento
   ↓
2. Aba "💳 Pagamento" aparece automaticamente
   ↓
3. Usuário escolhe forma de pagamento (DINHEIRO, CARTÃO, etc)
   ↓
4. Campos específicos da forma de pagamento aparecem dinamicamente
   ↓
5. Usuário preenche campo obrigatórios
   ↓
6. Sistema valida dados com validatePaymentData()
   ↓
7. Ao clicar "Criar Agendamento":
   a. Atualiza agendamento (appointmentsApi)
   b. Registra conta a receber (paymentRegistrationApi)
   c. Cria entrada no diário (journal_entries)
   d. Registra no caixa do dia (cash_register_movements)
   e. Cria log de auditoria (financial_audits)
   ↓
8. Sucesso! Pagamento registrado com rastreabilidade completa
```

---

## ⚡ CHECKLIST DE TESTES

### Para DINHEIRO:
- [ ] Digita valor recebido
- [ ] Verifica se troco calcula automaticamente
- [ ] Salva agendamento
- [ ] Verifica se registra em `accounts_receivable` com `status='received'`

### Para CARTÃO:
- [ ] Seleciona bandeira (VISA, MASTERCARD, etc)
- [ ] Digita últimos 4 dígitos
- [ ] Seleciona número de parcelas
- [ ] Insere número de autorização
- [ ] Seleciona operador
- [ ] Verifica no `cash_register_movements` se `payment_method='CARTAO'`

### Para PIX:
- [ ] Insere chave PIX (CPF/email/telefone)
- [ ] Insere ID da transação (UUID)
- [ ] Seleciona conta bancária
- [ ] Verifica se `receivable_type='PIX'` no banco

### Para CHEQUE:
- [ ] Insere dados do banco
- [ ] Insere número do cheque
- [ ] Seleciona data de compensação
- [ ] **Verifica alerta se data for passada**

### Para BOLETO:
- [ ] Insere código de barras (47 dígitos)
- [ ] Insere banco e data vencimento
- [ ] **Verifica alerta se vencimento for no passado**

---

## 🔗 REFERÊNCIAS DOS ARQUIVOS

| Arquivo | Caminho | Função |
|---------|--------|--------|
| Modal Principal | `src/pages/clinica/recepcao/components/AppointmentUnitedModal.jsx` | Integração e orquestração |
| Componente Campos | `src/pages/clinica/recepcao/components/PaymentMethodFields.jsx` | UI dinâmica |
| Config Pagamentos | `src/lib/paymentMethodsConfig.js` | Estrutura e validação |
| API Financeira | `src/lib/paymentRegistrationApi.js` | Integração banco de dados |
| Migração SQL | `supabase/migrations/2026-03-07_payment_rastreabilidade_v2.sql` | Tabelas e RLS |

---

## 🚀 PRÓXIMOS PASSOS

1. **Testar fluxo completo** com cada tipo de pagamento
2. **Implementar UI de fechamento de caixa** (opcional)
3. **Adicionar relatórios de movimento diário** (opcional)
4. **Treinar operadores** sobre seleção de operador em cartão
5. **Validar integrações** com provedor de cartão (futura fase)

---

## ⚠️ NOTAS IMPORTANTES

- **Operador em Cartão:** Campo obrigatório para rastreabilidade LGPD
- **UUID em PIX:** Não é validado (aceita qualquer UUID)
- **Código de Barras:** Deve ter exatamente 47 dígitos
- **Datas:** Sistema alerta mas permite cheques/boletos pré-datados
- **RLS:** Todos os dados acessíveis apenas dentro da clínica do usuário

---

## 📊 STATUS ATUAL

✅ Banco de dados configurado
✅ API de integração criada
✅ Componentes React integrados
✅ Validações implementadas
✅ Estado gerenciado corretamente
✅ Servidor Vite compilando ✨

**Pronto para testes!**

