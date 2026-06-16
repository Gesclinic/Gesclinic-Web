#!/bin/bash
# ============================================================================
# GUIA PRÁTICO: TESTANDO O MOTOR FINANCEIRO ETAPAS 1-3
# ============================================================================

# Este arquivo demonstra como usar as APIs criadas para testar o motor
# financeiro completo de forma prática.

# ============================================================================
# SETUP INICIAL
# ============================================================================

# 1. Certifique-se que as migrações foram executadas
#    Ver: ⚡_SCRIPT_EXECUTAR_MIGRACOES_ETAPAS_1-3.sh

# 2. Iniciar servidor dev
#    npm run dev

# 3. Abrir Postman/Insomnia e começar os testes abaixo

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║       GUIA DE USO: MOTOR FINANCEIRO ETAPAS 1-3                     ║"
echo "║                                                                    ║"
echo "║  Este arquivo contém exemplos de como usar as APIs criadas        ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# TESTE 1: CRIAR RECEIVABLE COM PARCELAMENTO (ETAPA 2)
# ============================================================================

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════╗
║ TESTE 1: CRIAR RECEIVABLE COM PARCELAMENTO (3X)                  ║
╚════════════════════════════════════════════════════════════════════╝

Objetivo: Testar criação automática de parcelas

Arquivo: src/lib/receivableMotorApi.js
Função: createReceivableWithInstallments()

Copie e cole este código em um arquivo TypeScript/JavaScript:

┌────────────────────────────────────────────────────────────────────┐

import { createReceivableWithInstallments } from '@/lib/receivableMotorApi';

export async function testCreateReceivable() {
  console.log('TEST 1: Creating receivable with installments...');

  const result = await createReceivableWithInstallments({
    clinicId: 'YOUR_CLINIC_ID',              // Substitua com ID real
    appointmentId: 'YOUR_APPOINTMENT_ID',    // ID do atendimento
    pacientName: 'João Silva',
    payerType: 'particular',                 // 'insurance', 'particular', 'company'
    payerId: null,                           // Null para particular
    amount: 1200,                            // R$ 1.200
    installments: 3,                         // 3x de R$ 400
    dueDate: '2026-06-01',                   // Primeira parcela
    description: 'Atendimento de consulta',
  });

  console.log('✅ Result:', result);
  // Esperado:
  // {
  //   success: true,
  //   receivableId: 'uuid-xxx',
  //   totalAmount: 1200,
  //   installmentCount: 3,
  //   installments: [
  //     { id: 'uuid', installment_number: 1, amount: 400, due_date: '2026-06-01' },
  //     { id: 'uuid', installment_number: 2, amount: 400, due_date: '2026-07-01' },
  //     { id: 'uuid', installment_number: 3, amount: 400, due_date: '2026-08-01' }
  //   ]
  // }

  return result;
}

// Chamar a função:
testCreateReceivable();

└────────────────────────────────────────────────────────────────────┘

Validações Esperadas:
  ✓ 3 parcelas criadas
  ✓ Status inicial: "pending"
  ✓ Datas espaçadas por 1 mês
  ✓ Valor total = 1200

Erros Possíveis:
  ✗ "clinic_id not found" → Use clinicId válido
  ✗ "Invalid installments" → Use 1-12
  ✗ "Invalid amount" → Deve ser > 0

EOF

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# ============================================================================
# TESTE 2: REGISTRAR PAGAMENTO PARCIAL (ETAPA 2)
# ============================================================================

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════╗
║ TESTE 2: REGISTRAR PAGAMENTO PARCIAL (60%)                        ║
╚════════════════════════════════════════════════════════════════════╝

Objetivo: Testar recebimento parcial com múltiplas formas pagamento

Pré-requisito: Completar TESTE 1 e pegar receivableId

Função: registerPartialPayment()

Copie este código:

┌────────────────────────────────────────────────────────────────────┐

import { registerPartialPayment } from '@/lib/receivableMotorApi';

export async function testPartialPayment(receivableId) {
  console.log('TEST 2: Registering partial payment (60%)...');

  const result = await registerPartialPayment({
    clinicId: 'YOUR_CLINIC_ID',
    receivableId: receivableId,              // ID do teste 1
    paymentAmount: 720,                      // 60% de 1200
    paymentMethod: 'credit_card',            // PIX, TED, credit_card, debit_card, money
    paymentDate: '2026-05-25',
    notes: 'Pagamento parcial - 1ª parcela',
    appliedInterest: 0,                      // Sem juros
    appliedFine: 0,                          // Sem multa
    appliedDiscount: 0,                      // Sem desconto
  });

  console.log('✅ Result:', result);
  // Esperado:
  // {
  //   success: true,
  //   receivableId: 'uuid',
  //   paymentId: 'uuid',
  //   newStatus: 'partial',                  // Changed from 'pending'
  //   paidAmount: 720,                       // 60%
  //   remainingAmount: 480,                  // 40%
  //   totalAmount: 1200
  // }

  return result;
}

testPartialPayment('RECEIVABLE_ID_FROM_TEST1');

└────────────────────────────────────────────────────────────────────┘

Validações Esperadas:
  ✓ Status mudou de "pending" para "partial"
  ✓ paidAmount = 720
  ✓ remainingAmount = 480
  ✓ Payment registrado com método "credit_card"

Verificar no Banco:
  SELECT * FROM ar_receivables WHERE id = 'RECEIVABLE_ID'
  → status = 'partial'
  → paid_amount = 720
  → remaining_amount = 480

EOF

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# ============================================================================
# TESTE 3: SPLIT PAGAMENTO (ETAPA 2)
# ============================================================================

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════╗
║ TESTE 3: SPLIT PAGAMENTO (30% PIX + 10% DINHEIRO)                ║
╚════════════════════════════════════════════════════════════════════╝

Objetivo: Testar pagamento com múltiplas formas em uma transação

Pré-requisito: Completar TESTE 2, receivable ainda tem R$ 480 pendente

Função: registerSplitPayment()

Copie este código:

┌────────────────────────────────────────────────────────────────────┐

import { registerSplitPayment } from '@/lib/receivableMotorApi';

export async function testSplitPayment(receivableId) {
  console.log('TEST 3: Registering split payment (PIX + Cash)...');

  const result = await registerSplitPayment({
    clinicId: 'YOUR_CLINIC_ID',
    receivableId: receivableId,              // Mesmo do teste 1-2
    totalAmount: 480,                        // Restante
    splits: [
      {
        method: 'pix',                       // 60% de 480 = 288
        amount: 288,
        date: '2026-05-25',
      },
      {
        method: 'money',                     // 40% de 480 = 192
        amount: 192,
        date: '2026-05-25',
      },
    ],
    notes: 'Pagamento final com split PIX + Dinheiro',
  });

  console.log('✅ Result:', result);
  // Esperado:
  // {
  //   success: true,
  //   payments: [
  //     { success: true, newStatus: 'partial', ... },
  //     { success: true, newStatus: 'received', ... }  // 100% pago
  //   ]
  // }

  return result;
}

testSplitPayment('RECEIVABLE_ID_FROM_TEST1');

└────────────────────────────────────────────────────────────────────┘

Validações Esperadas:
  ✓ 2 payments criados (PIX + Money)
  ✓ Status final: "received" (100% pago)
  ✓ paidAmount = 1200
  ✓ remainingAmount = 0

Verificar no Banco:
  SELECT * FROM ar_payments WHERE receivable_id = 'RECEIVABLE_ID'
  → 3 linhas: credit_card, pix, money

EOF

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# ============================================================================
# TESTE 4: SETTLEMENT & LIQUIDAÇÃO (ETAPA 3)
# ============================================================================

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════╗
║ TESTE 4: SETTLEMENT & LIQUIDAÇÃO (Atualiza Saldo)                ║
╚════════════════════════════════════════════════════════════════════╝

Objetivo: Testar quando pagamento é efetivamente recebido e atualiza saldo

Pré-requisito: Completar TESTE 3, paymentId obtido

Função: registerPaymentSettlement()

Copie este código:

┌────────────────────────────────────────────────────────────────────┐

import { registerPaymentSettlement } from '@/lib/paymentSettlementMotorApi';

export async function testSettlement(receivableId, paymentId, bankAccountId) {
  console.log('TEST 4: Registering payment settlement...');

  const result = await registerPaymentSettlement({
    clinicId: 'YOUR_CLINIC_ID',
    receivableId: receivableId,
    paymentId: paymentId,                   // Do teste anterior
    settledAmount: 720,                     // PIX confirmado
    settlementType: 'pix',                  // Tipo de settlement
    settlementDate: '2026-05-25',
    bankAccountId: bankAccountId,           // Conta bancária destino
    transactionReference: 'PIX-KEY-12345',
    notes: 'PIX confirmado',
  });

  console.log('✅ Result:', result);
  // Esperado:
  // {
  //   success: true,
  //   settlementId: 'uuid',
  //   paymentId: 'uuid',
  //   settledAmount: 720,
  //   transactionId: 'uuid'                 // Ledger transaction
  // }

  return result;
}

// Para chamar, você precisa de:
// 1. bankAccountId → Consulte tabela financial_accounts
testSettlement('RECEIVABLE_ID', 'PAYMENT_ID', 'BANK_ACCOUNT_ID');

└────────────────────────────────────────────────────────────────────┘

O que Acontece Automaticamente:
  ✓ Saldo da conta bancária aumenta R$ 720
  ✓ Fluxo de caixa realizado atualizado
  ✓ DRE realizado atualizado
  ✓ Indicadores de liquidez atualizados
  ✓ Audit log criado
  ✓ Payment marcado como "PAID"

Verificar no Banco:
  SELECT current_balance FROM financial_accounts WHERE id = 'BANK_ACCOUNT_ID'
  → Saldo aumentou R$ 720

  SELECT * FROM financial_transactions WHERE settlement_id = 'SETTLEMENT_ID'
  → Transação de ledger criada

EOF

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# ============================================================================
# TESTE 5: REVERSAL - ESTORNO (ETAPA 3)
# ============================================================================

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════╗
║ TESTE 5: REVERSAL - ESTORNO DE PAGAMENTO                         ║
╚════════════════════════════════════════════════════════════════════╝

Objetivo: Testar estorno de pagamento (desfazer operação)

Pré-requisito: Completar TESTE 4, settlementId obtido

Função: registerPaymentReversal()

Copie este código:

┌────────────────────────────────────────────────────────────────────┐

import { registerPaymentReversal } from '@/lib/paymentSettlementMotorApi';

export async function testReversal(settlementId, receivableId) {
  console.log('TEST 5: Registering payment reversal...');

  const result = await registerPaymentReversal({
    clinicId: 'YOUR_CLINIC_ID',
    settlementId: settlementId,              // Do teste 4
    receivableId: receivableId,
    reversalReason: 'duplicate',             // duplicate, customer_request, error
    reversalDate: '2026-05-26',
  });

  console.log('✅ Result:', result);
  // Esperado:
  // {
  //   success: true,
  //   reversalId: 'uuid'
  // }

  return result;
}

testReversal('SETTLEMENT_ID', 'RECEIVABLE_ID');

└────────────────────────────────────────────────────────────────────┘

O que Acontece Automaticamente:
  ✓ Reversal record criado
  ✓ Saldo da conta bancária decresce R$ 720
  ✓ Receivable volta para status "pending"
  ✓ Settlement marcado como "reversed"
  ✓ Audit log de reversal criado

Verificar no Banco:
  SELECT * FROM payment_reversals WHERE id = 'REVERSAL_ID'
  → Status = 'completed'

  SELECT current_balance FROM financial_accounts
  → Saldo voltou ao valor anterior

EOF

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# ============================================================================
# TESTE 6: VERIFICAR INDICADORES (ETAPA 1)
# ============================================================================

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════╗
║ TESTE 6: VERIFICAR INDICADORES ATUALIZADOS (ETAPA 1)             ║
╚════════════════════════════════════════════════════════════════════╝

Objetivo: Testar se indicadores foram atualizados automaticamente

SQL para executar no Supabase SQL Editor:

┌────────────────────────────────────────────────────────────────────┐

-- 1. Verificar Financial Indicators
SELECT 
  clinic_id,
  total_revenue,
  pending_revenue,
  overdue_receivables,
  liquidity_ratio,
  financial_health
FROM financial_indicators
WHERE clinic_id = 'YOUR_CLINIC_ID';

-- Esperado:
-- total_revenue: 1200
-- pending_revenue: algum valor
-- liquidity_ratio: > 0
-- financial_health: 'healthy' | 'warning' | 'critical'

-- 2. Verificar DRE Metrics
SELECT 
  month,
  gross_revenue,
  appointment_revenue,
  net_revenue,
  ebitda
FROM dre_metrics
WHERE clinic_id = 'YOUR_CLINIC_ID'
ORDER BY month DESC
LIMIT 1;

-- Esperado:
-- gross_revenue: 1200
-- appointment_revenue: 1200
-- net_revenue: 1200

-- 3. Verificar Financial Transactions
SELECT 
  type,
  status,
  category,
  amount,
  date
FROM financial_transactions
WHERE clinic_id = 'YOUR_CLINIC_ID'
ORDER BY created_at DESC
LIMIT 10;

-- Esperado:
-- INCOME / PREDICTED / appointment / 1200 / 2026-05-28 (3 dias depois)
-- INCOME / PAID / payment_settlement / 720 / 2026-05-25

-- 4. Verificar Audit Logs
SELECT 
  financial_event_type,
  status,
  context,
  performed_at
FROM appointment_financial_audit_logs
WHERE clinic_id = 'YOUR_CLINIC_ID'
ORDER BY performed_at DESC
LIMIT 5;

-- Esperado:
-- APPOINTMENT_ATTENDED / completed / {...}
-- PAYMENT_SETTLED / completed / {...}
-- PAYMENT_REVERSED / completed / {...}

└────────────────────────────────────────────────────────────────────┘

EOF

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# ============================================================================
# RESUMO DOS TESTES
# ============================================================================

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════╗
║ RESUMO: FLUXO COMPLETO DE TESTES                                  ║
╚════════════════════════════════════════════════════════════════════╝

Sequência Recomendada:

  1. TESTE 1: Criar Receivable (1200, 3x)
     └─ Resultado: 3 parcelas criadas (status: pending)

  2. TESTE 2: Pagamento Parcial (60% cartão)
     └─ Resultado: Status mudou para "partial" (720 pago)

  3. TESTE 3: Split Pagamento (40% PIX + Dinheiro)
     └─ Resultado: Status mudou para "received" (100% pago)

  4. TESTE 4: Settlement PIX (720)
     └─ Resultado: Saldo conta aumentou, DRE atualizada

  5. TESTE 5: Reversal do Settlement
     └─ Resultado: Saldo conta voltou, receivable = pending

  6. TESTE 6: Verificar Indicadores
     └─ Resultado: KPIs, DRE, Ledger atualizado

Tempo Total: 15-30 minutos
Problemas? Verificar:
  ✓ Migrações executadas no Supabase
  ✓ clinicId válido
  ✓ appointmentId existe
  ✓ bankAccountId existe

EOF

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "✅ GUIA COMPLETO DE TESTES CRIADO"
echo ""
echo "Próximos passos:"
echo "  1. Executar cada teste em ordem"
echo "  2. Documentar resultados"
echo "  3. Testar com dados reais"
echo "  4. Preparar para ETAPA 6"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
