# 💳 SISTEMA DE PAGAMENTO COM RASTREABILIDADE COMPLETA

## 📋 Visão Geral

Implementação de um sistema de pagamento robusto que integra:
- ✅ Formas de pagamento com campos obrigatórios e específicos
- ✅ Contas a Receber (accounts_receivable)
- ✅ Plano de Contas (journal_entries)
- ✅ Registro de Caixa (cash_register_sessions/movements)
- ✅ Auditoria Completa (financial_audits)
- ✅ Identificação de Operador (quem recebeu)
- ✅ Fechamento de Caixa

---

## 🏗️ ARQUITETURA

### Camada 1: Configuração (`paymentMethodsConfig.js`)
Define a estrutura de cada forma de pagamento:
- Campos obrigatórios
- Validações
- Máscaras
- Plano de contas associado
- Tipo de conta a receber

**Formas Suportadas:**
1. **DINHEIRO** 💵
   - Campos: Valor Recebido, Troco (automático), Observações
   - Plano de Contas: CAIXA (1.1.1.01)
   - Conta a Receber: CASH

2. **CARTÃO** 💳
   - Campos: Bandeira, Últimos 4 dígitos, Parcelas, Nº Autorização, Operadora
   - Plano de Contas: CARTAO_RECEBER (1.1.2.01)
   - Conta a Receber: CREDIT_CARD
   - **Operadora**: Vincula a qual processadora (Rede, Cielo, Adyen, Stone, etc)
   - **Parcelas**: Gera contas a receber parceladas se > 1

3. **PIX** 📱
   - Campos: Identificador (chave/CPF/telefone), ID Transação (UUID), Conta Bancária Destino, Data/Hora
   - Plano de Contas: PIX_RECEBER (1.1.2.02)
   - Conta a Receber: PIX
   - **Rastreabilidade**: UUID único da transação PIX

4. **CHEQUE** 📋
   - Campos: Banco, Agência, Conta, Nº Cheque, Data Compensação
   - Plano de Contas: CHEQUES_RECEBER (1.1.2.03)
   - Conta a Receber: CHECK
   - **Status**: Pré-datado, Compensado, Devolvido
   - **Aviso**: Alerta para cheques pré-datados

5. **BOLETO** 📄
   - Campos: Código Barras (47 dígitos), Banco, Data Vencimento
   - Plano de Contas: BOLETOS_RECEBER (1.1.2.04)
   - Conta a Receber: BOLETO
   - **Status**: Pendente, Compensado, Vencido
   - **Aviso**: Alerta para boletos futuros

---

### Camada 2: Componentes UI (`PaymentMethodFields.jsx`)
- Renderiza campos dinâmicos baseado na forma de pagamento
- Aplica máscaras automáticas
- Validações em tempo real
- Cálculo automático de troco para dinheiro

**Integração:**
```jsx
<PaymentMethodFields
  paymentMethod={pagamentoData.payment_method}
  paymentData={pagamentoData}
  bankAccounts={bankAccounts}
  onFieldChange={handlePaymentFieldChange}
  onCalculateChange={handleCalculateChange}
/>
```

---

### Camada 3: Integração Financeira (`paymentRegistrationApi.js`)

#### 3.1️⃣ Registrar Conta a Receber
```javascript
await registerOrUpdateReceivable({
  clinicId, appointmentId, patientId, amount, 
  paymentMethod, paymentData, receivedBy
})
```
- ✅ Cria ou atualiza conta a receber
- ✅ Define status = 'received'
- ✅ Armazena `paymentData` completo em JSON
- ✅ Registra quem recebeu (`received_by`)
- ✅ Data/hora do recebimento (`received_at`)

#### 3.2️⃣ Registrar Lançamento Contábil
```javascript
await recordFinancialEntry({
  clinicId, appointmentId, amount, 
  paymentMethod, description
})
```
- ✅ Cria entrada em `journal_entries`
- ✅ Débito na conta de ativo apropriada
- ✅ Crédito em "Receita de Serviços" (futuro)
- ✅ Identifica tipo de lançamento (RECEIPT)
- ✅ Rastreabilidade via `appointment_id`

**Mapeamento de Contas:**
```
DINHEIRO        → 1.1.1.01 (Caixa)
CARTÃO          → 1.1.2.01 (Cartões a Receber)
PIX             → 1.1.2.02 (PIX a Receber)
CHEQUE          → 1.1.2.03 (Cheques a Receber)
BOLETO          → 1.1.2.04 (Boletos a Receber)
```

#### 3.3️⃣ Registrar no Caixa
```javascript
await recordToCashRegister({
  clinicId, amount, paymentMethod, 
  receivedBy, appointmentDetails
})
```
- ✅ Cria/atualiza `cash_register_sessions` (um por dia)
- ✅ Cria movimento em `cash_register_movements`
- ✅ Rastreia quem recebeu (`received_by`)
- ✅ Atualiza saldo do caixa
- ✅ Pronto para fechamento diário

#### 3.4️⃣ Auditoria Completa
```javascript
await auditPaymentRecord({
  clinicId, appointmentId, patientId, amount,
  paymentMethod, paymentDetails, performedBy
})
```
- ✅ Cada transação registrada em `financial_audits`
- ✅ Timestamp preciso
- ✅ Identificação do operador (`performed_by`)
- ✅ Todos os dados de pagamento armazenados
- ✅ User Agent e IP (para rastreamento futuro)

#### 3.5️⃣ Processamento Completo Integrado
```javascript
await processPaymentComplete({
  clinicId, appointmentId, patientId, amount,
  paymentMethod, paymentData, operatorId,
  appointmentDetails
})
```
- ✅ Executa as 4 etapas acima em sequência
- ✅ Orquestra toda a integração
- ✅ Retorna IDs de todos os registros criados
- ✅ Trata erros de forma centralizada

#### 3.6️⃣ Fechamento de Caixa
```javascript
await closeCashRegister(sessionId, closedBy, discrepancy)
```
- ✅ Finaliza caixa do dia
- ✅ Calcula discrepâncias
- ✅ Gera relatório de movimentos
- ✅ Pronto para reconciliação bancária

---

## 🗄️ ESTRUTURA DE BANCO DE DADOS

### Tabelas Necessárias

#### 1. `accounts_receivable` (Contas a Receber)
```sql
- id: UUID
- clinic_id: UUID (FK)
- appointment_id: UUID (FK)
- patient_id: UUID (FK)
- amount: DECIMAL
- amount_received: DECIMAL
- amount_remaining: DECIMAL
- status: ENUM ['open', 'partial', 'received', 'overdue', 'canceled']
- receivable_type: ENUM ['CASH', 'CREDIT_CARD', 'PIX', 'CHECK', 'BOLETO']
- payment_method: VARCHAR (DINHEIRO, CARTAO, PIX, CHEQUE, BOLETO)
- received_by: UUID (FK → users)
- received_at: TIMESTAMP
- payment_details: JSONB (dados completos de pagamento)
- due_date: DATE
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### 2. `journal_entries` (Plano de Contas / Diário)
```sql
- id: UUID
- clinic_id: UUID (FK)
- appointment_id: UUID (FK)
- chart_account: VARCHAR (ex: 1.1.1.01)
- debit_amount: DECIMAL
- credit_amount: DECIMAL
- description: TEXT
- entry_date: TIMESTAMP
- entry_type: ENUM ['RECEIPT', 'EXPENSE', 'ADJUSTMENT']
- payment_method: VARCHAR
- cash_register_id: UUID (FK)
- created_at: TIMESTAMP
```

#### 3. `cash_register_sessions` (Caixas do Dia)
```sql
- id: UUID
- clinic_id: UUID (FK)
- session_date: DATE
- opening_balance: DECIMAL
- current_balance: DECIMAL
- status: ENUM ['open', 'closed']
- opened_at: TIMESTAMP
- closed_at: TIMESTAMP
- closed_by: UUID (FK → users)
- discrepancy: DECIMAL
- notes: TEXT
```

#### 4. `cash_register_movements` (Movimentos do Caixa)
```sql
- id: UUID
- cash_session_id: UUID (FK)
- clinic_id: UUID (FK)
- movement_type: ENUM ['INCOME', 'EXPENSE', 'ADJUSTMENT']
- amount: DECIMAL
- payment_method: VARCHAR
- received_by: UUID (FK → users)
- description: TEXT
- recorded_at: TIMESTAMP
- notes: TEXT
```

#### 5. `financial_audits` (Auditoria)
```sql
- id: UUID
- clinic_id: UUID (FK)
- appointment_id: UUID (FK)
- patient_id: UUID (FK)
- action: VARCHAR (PAYMENT_RECORDED, PAYMENT_EDITED, ETC)
- amount: DECIMAL
- payment_method: VARCHAR
- object_data: JSONB (dados completos antes/depois)
- performed_by: UUID (FK → users)
- performed_at: TIMESTAMP
- ip_address: INET
- user_agent: TEXT
```

#### 6. `chart_of_accounts` (Plano de Contas - Cadastro)
```sql
- id: UUID
- clinic_id: UUID (FK)
- code: VARCHAR (ex: 1.1.1.01)
- name: VARCHAR (Caixa, Bancos, Receitas, etc)
- account_type: ENUM ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']
- parent_code: VARCHAR (referência hierárquica)
- active: BOOLEAN
```

---

## 🔄 FLUXO DE PAGAMENTO

```
┌─────────────────────────────────────────────┐
│ 1. SELECIONAR FORMA DE PAGAMENTO            │
│    • Usuário escolhe: Dinheiro, Cartão...   │
└────────────────┬────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────┐
│ 2. PREENCHER CAMPOS ESPECÍFICOS              │
│    • Para Cartão: Bandeira, 4 dígitos,      │
│      Parcelas, Autorização, Operadora       │
│    • Para PIX: Chave, ID Transação          │
│    • Etc... (conforme configurado)          │
└────────────────┬────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────┐
│ 3. VALIDAR DADOS                             │
│    • Máscaras automáticas                   │
│    • Campos obrigatórios                    │
│    • Formatos (UUID, dígitos, etc)          │
└────────────────┬────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────┐
│ 4. CONFIRMAR PAGAMENTO                      │
│    • Operador confirma dados                │
│    • Sistema já sabe quem é (authenticated) │
└────────────────┬────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────┐
│ 5. PROCESSAR INTEGRAÇÃO COMPLETA            │
│    a) Registrar em accounts_receivable      │
│    b) Registrar em journal_entries          │
│    c) Registrar em cash_register            │
│    d) Registrar auditoria                   │
└────────────────┬────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────┐
│ 6. EXIBIR CONFIRMAÇÃO                       │
│    • Recibo (pode ser impresso)             │
│    • Referência (ID da transação, etc)      │
└────────────────┬────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────┐
│ 7. USAR PARA FECHAMENTO DE CAIXA (fins do dia)
│    • Listar todos os movimentos do dia      │
│    • Conferir saldo                         │
│    • Fechar caixa com discrepâncias         │
│    • Gerar relatório financeiro             │
└─────────────────────────────────────────────┘
```

---

## 🚀 INTEGRAÇÃO NO MODAL

### Passo 1: Importar Componentes
```jsx
import { PaymentMethodFields } from '@/pages/clinica/recepcao/components/PaymentMethodFields';
import { processPaymentComplete } from '@/lib/paymentRegistrationApi';
import { 
  PAYMENT_METHODS, 
  defaultPaymentData 
} from '@/lib/paymentMethodsConfig';
```

### Passo 2: Expandir Estado do Pagamento
```jsx
const [pagamentoData, setPagamentoData] = useState(defaultPaymentData);
```

### Passo 3: Handler para Alteração de Campos
```jsx
const handlePaymentFieldChange = useCallback((methodKey, fieldId, value) => {
  setPagamentoData(prev => ({
    ...prev,
    [methodKey]: {
      ...prev[methodKey] || {},
      [fieldId]: value
    }
  }));
}, []);

const handleCalculateChange = useCallback((valueReceived) => {
  const change = parseFloat(valueReceived) - parseFloat(agendamentoData.value);
  setPagamentoData(prev => ({
    ...prev,
    dinheiro: {
      ...prev.dinheiro,
      change: change.toFixed(2)
    }
  }));
}, [agendamentoData.value]);
```

### Passo 4: Render do Componente
```jsx
{tabAtivo === 'pagamento' && isParticular && (
  <PaymentMethodFields
    paymentMethod={pagamentoData.payment_method}
    paymentData={{
      ...pagamentoData,
      amount: `R$ ${agendamentoData.value}`
    }}
    bankAccounts={bankAccounts} // Carregar via API
    onFieldChange={handlePaymentFieldChange}
    onCalculateChange={handleCalculateChange}
  />
)}
```

### Passo 5: Processar Pagamento ao Salvar
```jsx
const handleSaveChanges = async () => {
  if (mode === 'edit' && appointment?.id) {
    try {
      // Salvar agendamento
      await updateAppointment(appointment.id, {
        status: agendamentoData.status,
        // ... outros campos
      });

      // SE FOR PARTICULAR, PROCESSAR PAGAMENTO
      if (isParticular && mode === 'edit') {
        const result = await processPaymentComplete({
          clinicId: clinic.id,
          appointmentId: appointment.id,
          patientId: appointment.patient_id,
          amount: parseFloat(agendamentoData.value),
          paymentMethod: pagamentoData.payment_method,
          paymentData: pagamentoData,
          operatorId: user.id, // Quem recebeu
          appointmentDetails: {
            patientName: cadastralData.name,
            serviceId: agendamentoData.serviceId,
            date: agendamentoData.date,
            time: agendamentoData.time,
          }
        });

        if (!result.success) {
          throw new Error(`Erro financeiro: ${result.error}`);
        }

        console.log('✅ Integração financeira completa:', result);
      }

      return true;
    } catch (err) {
      console.error('❌ Erro ao salvar:', err);
      throw err;
    }
  }
};
```

---

## 🎯 BENEFÍCIOS

| Aspecto | Benefício |
|---------|-----------|
| **Segurança** | Nunca solicita dados sensíveis completos; rastreabilidade total |
| **Conformidade** | Pronto para NF-e, LGPD, auditorias |
| **Rastreabilidade** | Cada centavo rastreado desde a recepção até o banco |
| **Reconciliação** | Dados estruturados para conciliação bancária futura |
| **Operacional** | Identificação automática de quem recebeu; pronto para fechamento |
| **Extensível** | Fácil adicionar novas formas de pagamento |
| **Integração** | Pronto para integrações com gateways de pagamento |

---

## 📝 PRÓXIMOS PASSOS

1. ✅ Criar tabelas no Supabase (migrations)
2. ✅ Integrar `PaymentMethodFields` no modal
3. ✅ Testar fluxo completo de pagamento
4. ✅ Criar página de fechamento de caixa
5. ⏳ Integrar com gateway de pagamento (Rede, Cielo, etc)
6. ⏳ Gerar relatórios financeiros
7. ⏳ Dashboard de reconciliação bancária
