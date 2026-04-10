# 🔄 FLUXO DE INTEGRAÇÃO FINANCEIRA COMPLETA

## 1️⃣ FLUXO DE DADOS - DO RECEBIMENTO AO FECHAMENTO

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1️⃣ PACIENTE CHEGA - PREENCHE PAGAMENTO NO MODAL                        │
└─────────────┬───────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2️⃣ SELECIONAR FORMA DE PAGAMENTO                                       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ 💵 DINHEIRO      💳 CARTÃO      📱 PIX      📋 CHEQUE  📄 BOLETO  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  → PaymentMethodFields.jsx converte para campos específicos          │
└─────────────┬───────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3️⃣ PREENCHER DADOS OBRIGATÓRIOS                                        │
│                                                                         │
│  💵 DINHEIRO:           💳 CARTÃO:              📱 PIX:               │
│  ├ Valor Recebido       ├ Bandeira              ├ Chave PIX           │
│  ├ Troco (automático)   ├ Últimos 4 dígitos     ├ ID Transação        │
│  └ Observações          ├ Parcelas              ├ Banco Destino       │
│                        ├ Nº Autorização         ├ Data/Hora           │
│                        ├ Operadora (IMPORTANTE) └ Observações         │
│                        └ Observações                                  │
│                                                                         │
│  📋 CHEQUE:             📄 BOLETO:                                    │
│  ├ Banco                ├ Código Barras (47 dígitos)                  │
│  ├ Agência              ├ Banco                                       │
│  ├ Conta                ├ Data Vencimento                             │
│  ├ Nº Cheque            └ Observações                                 │
│  ├ Data Compensação                                                  │
│  └ Observações                                                        │
│                                                                         │
│  → Máscaras automáticas, validações em tempo real                    │
└─────────────┬───────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4️⃣ CONFIRMAR E PROCESSAR                                              │
│                                                                         │
│  → handleSaveChanges() chama processPaymentComplete()                │
└─────────────┬───────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 5️⃣ PROCESSAMENTO FINANCEIRO COMPLETO (paymentRegistrationApi.js)       │
│                                                                         │
│  ┌─────────────────────────┐     ┌──────────────────────────┐        │
│  │ 5.1️⃣ accounts_receivable│     │ 5.2️⃣ journal_entries    │        │
│  ├─────────────────────────┤     ├──────────────────────────┤        │
│  │ • Cria/Atualiza         │     │ • Registra lançamento    │        │
│  │ • Status = received     │     │ • Débito = valor        │        │
│  │ • Armazena paymentData  │     │ • Account = 1.1.1.01    │        │
│  │   em JSONB              │     │  (ou apropriado)        │        │
│  │ • received_by = user_id │     │ • entry_type = RECEIPT  │        │
│  │ • received_at = now()   │     └──────────────────────────┘        │
│  └─────────────────────────┘                                          │
│           │                                                            │
│           └───────────────┬────────────────────────────────┐          │
│                          ▼                                ▼          │
│           ┌──────────────────────────┐  ┌──────────────────────┐     │
│           │ 5.3️⃣ cash_register     │  │ 5.4️⃣ financial_audits│     │
│           ├──────────────────────────┤  ├──────────────────────┤     │
│           │ Sessions:                │  │ • Log cada ação      │     │
│           │ • Date + Status          │  │ • Performed_by = usr │     │
│           │ • current_balance += R$  │  │ • Timestamp preciso  │     │
│           │                          │  │ • Snapshot de dados  │     │
│           │ Movements:               │  │ • IP + User Agent    │     │
│           │ • movement_type = INCOME │  └──────────────────────┘     │
│           │ • amount = valor         │                               │
│           │ • received_by = user_id  │                               │
│           │ • recorded_at = now()    │                               │
│           └──────────────────────────┘                               │
│                                                                         │
│  ✅ Retorna IDs de todos os registros criados                          │
└─────────────┬───────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 6️⃣ EXIBIR CONFIRMAÇÃO AO USUÁRIO                                       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────┐          │
│  │ ✅ PAGAMENTO REGISTRADO COM SUCESSO                     │          │
│  ├─────────────────────────────────────────────────────────┤          │
│  │ Forma: CARTÃO (VISA) | Valor: R$ 150,00                │          │
│  │ Autorização: 123456789                                  │          │
│  │ Operadora: REDE                                         │          │
│  │ Status: Registrado ✓                                    │          │
│  │                                                         │          │
│  │ Referências:                                            │          │
│  │ • Conta a Receber: a1b2c3d4-...                        │          │
│  │ • Movimento Caixa: e5f6g7h8-...                        │          │
│  │ • Lançamento Contábil: i9j0k1l2-...                    │          │
│  │ • Auditoria: m3n4o5p6-...                              │          │
│  └─────────────────────────────────────────────────────────┘          │
└─────────────┬───────────────────────────────────────────────────────────┘
              │
              ▼
       ┌──────────────┐
       │ Modal Fecha  │
       │ Agenda Recarrega
       └──────────────┘
```

---

## 2️⃣ ESTRUTURA DE BANCO DE DADOS

```
┌─────────────────────────────────────────────────────────────────────────┐
│ APPOINTMENTS (Agendamentos)                                             │
├─────────────────────────────────────────────────────────────────────────┤
│ id, clinic_id, patient_id, professional_id, status, value, ... │
└───┬─────────────────────────────────┬───────────────────────────────────┘
    │                                 │
    │ Quando pagamento é recebido:    │
    ▼                                 ▼
┌─────────────────────────────────┐ ┌──────────────────────────────────┐
│ accounts_receivable             │ │ journal_entries                  │
├─────────────────────────────────┤ ├──────────────────────────────────┤
│ id                              │ │ id                               │
│ clinic_id ◄──FK                 │ │ clinic_id ◄──FK                  │
│ appointment_id ◄──FK            │ │ appointment_id ◄──FK             │
│ patient_id ◄──FK                │ │ chart_account (1.1.1.01)        │
│                                 │ │ debit_amount                     │
│ amount                          │ │ credit_amount                    │
│ amount_received                 │ │ entry_type = RECEIPT            │
│ amount_remaining                │ │ payment_method                   │
│                                 │ │ entry_date = TIMESTAMP          │
│ status = received               │ └──────────────────────────────────┘
│ receivable_type = CREDIT_CARD   │
│ payment_method = CARTAO         │
│                                 │
│ received_by ◄──FK (users)       │
│ received_at = TIMESTAMP         │
│                                 │
│ payment_details = {             │
│   card_brand: "VISA",           │
│   card_last_digits: "1234",     │
│   card_installments: 3,         │
│   receipt_number: "123456",     │
│   processor: "REDE"             │
│ }                               │
└───┬─────────────────────────────┘
    │
    ├─────────────────────────┬─────────────────────────────────────┐
    ▼                         ▼                                     ▼
┌─────────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│ cash_register_      │ │ cash_register_   │ │ financial_audits     │
│ sessions            │ │ movements        │ │                      │
├─────────────────────┤ ├──────────────────┤ ├──────────────────────┤
│ id                  │ │ id               │ │ id                   │
│ cli nic_id          │ │ cash_session_id  │ │ clinic_id            │
│ session_date        │ │ clinic_id        │ │ appointment_id       │
│ status = open       │ │                  │ │ patient_id           │
│ opening_balance     │ │ movement_type =  │ │                      │
│ current_balance     │ │   INCOME         │ │ action = PAYMENT_    │
│                     │ │ amount = 150.00  │ │ RECORDED             │
│ opened_at           │ │                  │ │ amount = 150.00      │
│ closed_at (null)    │ │ payment_method = │ │ payment_method       │
│ closed_by (null)    │ │   CARTAO         │ │                      │
│ discrepancy         │ │                  │ │ object_data = {JSON} │
│                     │ │ received_by ◄─FK │ │ performed_by ◄─FK    │
│                     │ │   (users)        │ │ performed_at         │
│                     │ │ recorded_at      │ │ ip_address           │
│                     │ │ description      │ │ user_agent           │
└─────────────────────┘ └──────────────────┘ └──────────────────────┘
```

---

## 3️⃣ FLUXO DE DADOS PARA CADA FORMA DE PAGAMENTO

### 💵 DINHEIRO
```
┌─────────────────────────────┐
│ Operador recebe dinheiro    │
│ • Valor: R$ 250,00          │
│ • Troco automático: R$ 50   │
└────────────┬────────────────┘
             ▼
    ┌─────────────────┐
    │ Registra em:    │
    │                 │
    │ 1. Conta Receber│  ← paymentData.value = 250
    │ 2. Caixa        │  ← movimento add saldo
    │ 3. Plano Contas │  ← débito 1.1.1.01 (Caixa)
    │ 4. Auditoria    │  ← quem recebeu + timestamp
    └─────────────────┘
```

### 💳 CARTÃO
```
┌──────────────────────────────────┐
│ Operador registra cartão         │
│ • Bandeira: VISA                 │
│ • Últimos 4: 1234                │
│ • Parcelas: 3x                   │
│ • Autorização: 123456789         │
│ • Operadora: REDE (IMPORTANTE!) │
└────────────┬─────────────────────┘
             ▼
    ┌──────────────────────┐
    │ Registra em:         │
    │                      │
    │ 1. Conta Receber     │  ← receivable_type = CREDIT_CARD
    │    • Armazena dados  │     paymentData.processor = REDE
    │    • Status = received
    │                      │
    │ 2. Caixa             │  ← movimento INCOME
    │    • Add saldo       │
    │    • payment_method  │
    │      = CARTAO        │
    │                      │
    │ 3. Plano Contas      │  ← débito 1.1.2.01 (Cartões)
    │                      │
    │ 4. Auditoria         │  ← log completo
    │    • processor = REDE│     (importante para reconciliação)
    └──────────────────────┘
```

### 📱 PIX
```
┌────────────────────────────────┐
│ Operador registra PIX          │
│ • Chave: email@clinica.com     │
│ • ID Trans: e1047061-7aed-...  │
│ • Banco: (selecionado)         │
│ • Data/Hora: 2026-03-07 14:30  │
└────────────┬───────────────────┘
             ▼
    ┌──────────────────────┐
    │ Registra em:         │
    │                      │
    │ 1. Conta Receber     │  ← receivable_type = PIX
    │    • pix_identifier  │     paymentData vinculado
    │    • pix_transaction │     para rastreamento
    │    • bank_account_id │
    │                      │
    │ 2. Caixa             │  ← movimento INCOME
    │    • Saldo banco     │     vinculado à conta PIX
    │                      │
    │ 3. Plano Contas      │  ← débito 1.1.2.02 (PIX)
    │                      │
    │ 4. Auditoria         │  ← pix_transaction_id
    │    • ID único PIX    │     para rastreamento banco
    └──────────────────────┘
```

### 📋 CHEQUE
```
┌────────────────────────────────┐
│ Operador registra cheque       │
│ • Banco: BB                    │
│ • Nº: 0000012345              │
│ • Data: 2026-03-15 (futuro)   │
│ • AVISO: Pré-datado!          │
└────────────┬───────────────────┘
             ▼
    ┌──────────────────────┐
    │ Registra em:         │
    │                      │
    │ 1. Conta Receber     │  ← status = open (não recebido)
    │    • check_bank      │     receivable_type = CHECK
    │    • check_number    │     due_date = 2026-03-15
    │    • check_due_date  │
    │                      │
    │ 2. Caixa             │  ← AVISO: não incrementa saldo
    │    • Registra apenas │     Aguarda compensação
    │                      │
    │ 3. Plano Contas      │  ← débito 1.1.2.03 (Cheques)
    │                      │
    │ 4. Auditoria         │  ← Status futuro
    │    • Aguardando comp.│     Para reconciliação depois
    └──────────────────────┘
```

### 📄 BOLETO
```
┌────────────────────────────────┐
│ Operador registra boleto       │
│ • Código: 47 dígitos           │
│ • Banco: Caixa                 │
│ • Vencimento: 2026-03-20       │
│ • AVISO: Futuro! Pendente.     │
└────────────┬───────────────────┘
             ▼
    ┌──────────────────────┐
    │ Registra em:         │
    │                      │
    │ 1. Conta Receber     │  ← status = open
    │    • boleto_number   │     receivable_type = BOLETO
    │    • boleto_bank     │     due_date = 2026-03-20
    │    • boleto_due_date │
    │                      │
    │ 2. Caixa             │  ← Não incrementa saldo
    │    • Aguarda compen  │     Quando compensado (+), atualiza
    │                      │
    │ 3. Plano Contas      │  ← débito 1.1.2.04 (Boletos)
    │                      │
    │ 4. Auditoria         │  ← Status para acompanhamento
    │    • Pendente comp.  │     Dias para vencer, etc
    └──────────────────────┘
```

---

## 4️⃣ FECHAMENTO DE CAIXA (FIM DO DIA)

```
MANHÃ:
  1. Operador A abre caixa
     → cash_register_sessions criado com opening_balance
  
DURANTE O DIA:
  2. Múltiplas transações registradas
     → cash_register_movements adicionados
     → current_balance atualizado
  
FIM DO DIA:
  3. Operador B lista movimentos
     → getCashRegisterMovements()
     → Resumo por forma de pagamento
  
  4. Conferir saldo físico vs sistema
     ✓ Se Caixa: R$ 2.500,00
     ✓ Cartão: R$ 1.500,00
     ✓ PIX: R$ 800,00
     ─────────────────────
     = R$ 4.800,00
  
  5. Se houver discrepância
     → closeCashRegister(sessionId, operatorB, discrepancy: -50)
     → Registra em financial_audits
  
AUDITORIA:
  6. financial_audits tem log de TUDO
     → Quem abriu/fechou
     → Todas as transações
     → Discrepâncias
     → Pronto para reconciliação bancária
```

---

## 5️⃣ MAPEAMENTO DE CONTAS CONTÁBEIS

```
RECEBIMENTOS ($) ─────────────────────┬─────────────────────┐
                                       │                     │
                    ┌──────────────────┴─┐          ┌────────┴────────┐
                    ▼                    ▼          ▼                 ▼
            ┌─────────────────┐  ┌──────────────┐ ┌──────┐   ┌────────────┐
            │ 1.1.1.01: CAIXA │  │1.1.2.01:CARD │ │1.1.2.│   │1.1.2.04:   │
            │ Dinheiro → +R$  │  │Visa/MC → +R$ │ │02:PIX│   │BOLETOS → + │
            │ (imediato)      │  │(futuro)      │ │ → +R$│   │(futuro)    │
            └─────────────────┘  └──────────────┘ └──────┘   └────────────┘
                    │                 │             │             │
                    └─────────────────┬─────────────┴─────────────┘
                                      ▼
                        ┌──────────────────────────┐
                        │ 4.1.2: RECEITA OPERAC.   │
                        │ (Crédito)                │
                        └──────────────────────────┘
```

---

## 6️⃣ QUERY PARA RECONCILIAÇÃO

```sql
-- Quanto foi recebido em dinheiro?
SELECT SUM(amount) 
FROM cash_register_movements 
WHERE payment_method = 'DINHEIRO'
  AND movement_type = 'INCOME'
  AND recorded_at::DATE = '2026-03-07';

-- Qual operador recebeu mais?
SELECT received_by, COUNT(*), SUM(amount)
FROM cash_register_movements
WHERE recorded_at::DATE = '2026-03-07'
GROUP BY received_by;

-- Total pendente de recebimento (cheques/boletos)?
SELECT COUNT(*), SUM(amount)
FROM accounts_receivable
WHERE status IN ('open', 'partial')
  AND clinic_id = 'clinic-uuid';

-- Todas as transações de um paciente?
SELECT *
FROM financial_audits
WHERE patient_id = 'patient-uuid'
  AND action = 'PAYMENT_RECORDED'
ORDER BY performed_at DESC;

-- Discrepâncias do caixa?
SELECT id, session_date, discrepancy
FROM cash_register_sessions
WHERE discrepancy != 0
  AND clinic_id = 'clinic-uuid'
ORDER BY session_date DESC;
```

---

## ✨ RESULTADO FINAL

Você tem um sistema onde:
✅ Cada pagamento é registrado em 4 tabelas
✅ Rastreabilidade total de quem recebeu
✅ Plano de contas estruturado para auditoria
✅ Caixa do dia com movimentos discriminados
✅ Pronto para reconciliação bancária
✅ Sem dados sensíveis (apenas últimos 4 dígitos)
✅ Integração para gateways de pagamento (operadora)
