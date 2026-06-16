#!/bin/bash
# ============================================================================
# SCRIPT: Executar Migrações SQL - ETAPAS 1-3
# Propósito: Aplicar todas as tabelas/funções/triggers no Supabase
# ============================================================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}EXECUÇÃO DE MIGRAÇÕES: ETAPAS 1-3${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

# ============================================================================
# PASSO 1: PREPARAÇÃO
# ============================================================================

echo -e "${GREEN}[PASSO 1] Preparando ambiente...${NC}"
echo "Você precisa de:"
echo "  ✓ Acesso ao Supabase Dashboard"
echo "  ✓ Permissão de admin"
echo "  ✓ Projeto com banco de dados"
echo ""

# ============================================================================
# PASSO 2: INSTRUÇÕES MANUAIS
# ============================================================================

echo -e "${GREEN}[PASSO 2] Instruções para Executar Migrações${NC}"
echo ""
echo "OPÇÃO A: Via Supabase Dashboard (Recomendado)"
echo "─────────────────────────────────────────────────────────────────"
echo "1. Acesse: https://app.supabase.com"
echo "2. Selecione seu projeto: gesclinic-web"
echo "3. No menu esquerdo, clique em: SQL Editor"
echo "4. Clique em: + New"
echo "5. Cole o conteúdo de cada migration:"
echo ""
echo "   PRIMEIRA:  supabase/migrations/20260525_ETAPA1_ENHANCED_AUTOMATIONS.sql"
echo "   SEGUNDA:   supabase/migrations/20260525_ETAPA2_RECEIVABLE_MOTOR.sql"
echo "   TERCEIRA:  supabase/migrations/20260525_ETAPA3_PAYMENT_SETTLEMENT_MOTOR.sql"
echo ""
echo "6. Clique em: Run"
echo "7. Aguarde completar (indica com ✓)"
echo "8. Repita para as 3 migrações"
echo ""

echo -e "${GREEN}[PASSO 3] Validação Pós-Execução${NC}"
echo ""
echo "Após cada migração, copie e execute a VALIDAÇÃO:"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "VALIDAÇÃO ETAPA 1:"
echo "───────────────────────────────────────────────────────────────────"
cat << 'EOF'
-- Verificar tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'financial_automation_queue',
    'dre_metrics',
    'financial_indicators'
  )
ORDER BY table_name;

-- Verificar funções
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'fn_%'
  AND routine_name LIKE '%orchestrate%'
LIMIT 5;

-- Resultado esperado: 3 tabelas + 4 funções
EOF
echo "═══════════════════════════════════════════════════════════════════"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "VALIDAÇÃO ETAPA 2:"
echo "───────────────────────────────────────────────────────────────────"
cat << 'EOF'
-- Verificar tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'ar_receivable%'
ORDER BY table_name;

-- Verificar views
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'VIEW'
  AND table_name LIKE 'vw_receivables%';

-- Resultado esperado: 3 tabelas AR + 1 view
EOF
echo "═══════════════════════════════════════════════════════════════════"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "VALIDAÇÃO ETAPA 3:"
echo "───────────────────────────────────────────────────────────────────"
cat << 'EOF'
-- Verificar tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'payment_%'
ORDER BY table_name;

-- Verificar função atômica
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'fn_process_settlement_atomically';

-- Resultado esperado: 2 tabelas + 1 função atômica
EOF
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# ============================================================================
# PASSO 4: VALIDAÇÃO COMPLETA
# ============================================================================

echo -e "${GREEN}[PASSO 4] Validação Completa (Execute no Final)${NC}"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
cat << 'EOF'
-- Contar todas as tabelas criadas
SELECT COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'financial_automation_queue',
    'dre_metrics',
    'financial_indicators',
    'ar_receivable_installments',
    'ar_payments',
    'ar_payment_splits',
    'payment_settlements',
    'payment_reversals'
  );

-- Resultado esperado: 8

-- Contar funções criadas
SELECT COUNT(*) as total_functions
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND (
    routine_name LIKE 'fn_%' OR 
    routine_name LIKE 'sp_%'
  );

-- Resultado esperado: 15+

-- Verificar RLS habilitado
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'financial_automation_queue',
    'dre_metrics',
    'financial_indicators',
    'ar_receivable_installments',
    'ar_payments',
    'ar_payment_splits',
    'payment_settlements',
    'payment_reversals'
  )
ORDER BY tablename;
EOF
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# ============================================================================
# PASSO 5: TESTES RÁPIDOS
# ============================================================================

echo -e "${GREEN}[PASSO 5] Testes Rápidos (Após Migrações)${NC}"
echo ""
echo "Test 1: Criar Receivable com Parcelas"
echo "─────────────────────────────────────────────────────────────────"
echo "Use a API: src/lib/receivableMotorApi.js"
echo ""
echo "```javascript
import { createReceivableWithInstallments } from '@/lib/receivableMotorApi';

const result = await createReceivableWithInstallments({
  clinicId: 'your-clinic-id',
  appointmentId: 'your-appointment-id',
  pacientName: 'João Silva',
  payerType: 'particular',
  amount: 1000,
  installments: 3,
  dueDate: '2026-06-01',
});

console.log('Created:', result);
// Esperado: { success: true, receivableId: 'uuid', installmentCount: 3 }
```"
echo ""

echo "Test 2: Registrar Pagamento Parcial"
echo "─────────────────────────────────────────────────────────────────"
echo "```javascript
import { registerPartialPayment } from '@/lib/receivableMotorApi';

const result = await registerPartialPayment({
  clinicId: 'your-clinic-id',
  receivableId: 'receivable-from-test1',
  paymentAmount: 600, // 60% do total
  paymentMethod: 'credit_card',
});

console.log('Partial Payment:', result);
// Esperado: { success: true, newStatus: 'partial', remainingAmount: 400 }
```"
echo ""

echo "Test 3: Registrar Split Pagamento"
echo "─────────────────────────────────────────────────────────────────"
echo "```javascript
import { registerSplitPayment } from '@/lib/receivableMotorApi';

const result = await registerSplitPayment({
  clinicId: 'your-clinic-id',
  receivableId: 'receivable-from-test1',
  totalAmount: 400,
  splits: [
    { method: 'pix', amount: 240, date: '2026-05-25' },
    { method: 'debit_card', amount: 160, date: '2026-05-25' },
  ],
});

console.log('Split Payment:', result);
// Esperado: { success: true, payments: [...] }
```"
echo ""

echo "Test 4: Registrar Settlement (Liquidação)"
echo "─────────────────────────────────────────────────────────────────"
echo "```javascript
import { registerPaymentSettlement } from '@/lib/paymentSettlementMotorApi';

const result = await registerPaymentSettlement({
  clinicId: 'your-clinic-id',
  receivableId: 'receivable-from-test1',
  paymentId: 'payment-from-test3',
  settledAmount: 400, // Total que recebemos
  settlementType: 'pix',
  bankAccountId: 'your-bank-account-id',
  settlementDate: '2026-05-25',
});

console.log('Settlement:', result);
// Esperado: { success: true, settlementId: 'uuid', settledAmount: 400 }
```"
echo ""

# ============================================================================
# PASSO 6: TROUBLESHOOTING
# ============================================================================

echo -e "${GREEN}[PASSO 6] Troubleshooting${NC}"
echo ""
echo "Se receber erro ao executar migração:"
echo ""
echo "1. Erro: 'Already exists'"
echo "   Solução: As tabelas já existem. Isso é normal."
echo ""
echo "2. Erro: 'Foreign key constraint failed'"
echo "   Solução: Verifique se as tabelas referenciadas existem."
echo "   Execute as migrações em ordem: ETAPA1 → ETAPA2 → ETAPA3"
echo ""
echo "3. Erro: 'Permission denied'"
echo "   Solução: Você precisa de permissão admin no Supabase."
echo "   Verifique em: Project Settings → Users"
echo ""
echo "4. Erro: 'Syntax error'"
echo "   Solução: Verifique se o SQL foi copiado corretamente."
echo "   Compare com o arquivo original."
echo ""

# ============================================================================
# PASSO 7: PRÓXIMOS PASSOS
# ============================================================================

echo -e "${GREEN}[PASSO 7] Próximos Passos${NC}"
echo ""
echo "Após validar as migrações:"
echo ""
echo "1. Atualizar package.json (se necessário)"
echo "2. Rodar: npm install"
echo "3. Rodar: npm run dev"
echo "4. Testar endpoints no Postman/Insomnia"
echo "5. Testar fluxo end-to-end:"
echo "   - Criar appointment"
echo "   - Marcar como attended"
echo "   - Verificar AR criada"
echo "   - Registrar pagamento"
echo "   - Verificar settlement"
echo ""

# ============================================================================
# FINALIZANDO
# ============================================================================

echo -e "${YELLOW}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Script de execução criado com sucesso!${NC}"
echo ""
echo "Próximo comando:"
echo "  1. Copie cada SQL para o Supabase Dashboard"
echo "  2. Execute as validações"
echo "  3. Rode os testes rápidos"
echo ""
echo "Tempo estimado: 15 minutos"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════════${NC}"
