# 🔍 FASE 12: E2E TESTS - PLANO DE AÇÃO PRÁTICO

---

## ⏱️ Tempo: 1 hora

**Objetivo**: Validar todo o workflow automático está funcionando ponta-a-ponta

---

## 🎯 TESTES A EXECUTAR (Na ordem)

### TESTE 1: Database Triggers + Automação (10 min)
```
🔵 Valida: Quando agendamento vira "attended" → recebível criado
🔵 Valida: Quando recebível vira "paid" → cashflow criado
```

**SQL para testar**:
```sql
-- 1. Verificar que triggers estão ativas
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- 2. Verificar que funções estão criadas
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE '%receivable%';

-- 3. Simular workflow: Criar agendamento teste
INSERT INTO appointments (clinic_id, patient_id, professional_id, status, appointment_start, appointment_end)
VALUES (YOUR_CLINIC_ID, YOUR_PATIENT_ID, YOUR_PROF_ID, 'attended', NOW(), NOW() + INTERVAL '1 hour')
RETURNING id, status;

-- 4. Verificar se recebível foi criado automaticamente
SELECT id, appointment_id, amount, status FROM ar_receivables 
WHERE appointment_id = (SELECT id FROM appointments WHERE status = 'attended' ORDER BY created_at DESC LIMIT 1);

-- 5. Marcar recebível como paid
UPDATE ar_receivables 
SET status = 'paid', payment_method = 'cash', paid_at = NOW()
WHERE id = (SELECT id FROM ar_receivables ORDER BY created_at DESC LIMIT 1)
RETURNING id, status;

-- 6. Verificar se cashflow foi criado automaticamente
SELECT id, receivable_id, amount, status FROM ap_cashflow 
WHERE receivable_id = (SELECT id FROM ar_receivables ORDER BY created_at DESC LIMIT 1);
```

**Resultado Esperado**:
```
✅ Triggers ativos (3+)
✅ Funções criadas (16)
✅ Agendamento criado
✅ Recebível criado automaticamente
✅ Recebível marcado como paid
✅ Cashflow criado automaticamente
```

---

### TESTE 2: Views de Relatórios (10 min)
```
🔵 Valida: vw_production_report populada
🔵 Valida: vw_billing_report populada
🔵 Valida: vw_receivables_report populada
```

**SQL para testar**:
```sql
-- 1. Verificar vw_production_report
SELECT professional_name, total_appointments, total_revenue, average_ticket 
FROM vw_production_report 
WHERE clinic_id = YOUR_CLINIC_ID 
LIMIT 5;

-- 2. Verificar vw_billing_report
SELECT plan_name, total_appointments, total_bruto, total_discount, total_liquido, total_received 
FROM vw_billing_report 
WHERE clinic_id = YOUR_CLINIC_ID 
LIMIT 5;

-- 3. Verificar vw_receivables_report
SELECT id, amount, status, due_date, days_overdue, status_label 
FROM vw_receivables_report 
WHERE clinic_id = YOUR_CLINIC_ID 
LIMIT 5;
```

**Resultado Esperado**:
```
✅ vw_production_report retorna dados (minimum 1 row)
✅ vw_billing_report retorna dados (minimum 1 row)
✅ vw_receivables_report retorna dados (minimum 1 row)
✅ Cálculos corretos (revenue, discount, average_ticket)
```

---

### TESTE 3: API Functions (10 min)
```
🔵 Valida: appointmentsApi.finalizeAppointmentWithReceivable()
🔵 Valida: appointmentsApi.markReceivableAsPaid()
🔵 Valida: appointmentsApi.getProductionReport()
🔵 Valida: appointmentsApi.getReceivablesReport()
```

**JavaScript para testar** (Node.js console ou browser console):
```javascript
// Abra seu projeto em http://localhost:3000
// Cole no browser console:

// 1. Teste finalizeAppointmentWithReceivable
const appointmentId = 'seu-appointment-id-aqui';
try {
  const result = await window.appointmentsApi?.finalizeAppointmentWithReceivable?.(appointmentId);
  console.log('✅ finalizeAppointmentWithReceivable:', result);
} catch (e) {
  console.error('❌ Erro:', e.message);
}

// 2. Teste markReceivableAsPaid
const receivableId = 'seu-receivable-id-aqui';
try {
  const result = await window.appointmentsApi?.markReceivableAsPaid?.(receivableId, 'cash');
  console.log('✅ markReceivableAsPaid:', result);
} catch (e) {
  console.error('❌ Erro:', e.message);
}

// 3. Teste getProductionReport
const clinicId = 'seu-clinic-id-aqui';
try {
  const result = await window.appointmentsApi?.getProductionReport?.(clinicId, '2026-01-01', '2026-12-31');
  console.log('✅ getProductionReport:', result);
} catch (e) {
  console.error('❌ Erro:', e.message);
}

// 4. Teste getReceivablesReport
try {
  const result = await window.appointmentsApi?.getReceivablesReport?.(clinicId);
  console.log('✅ getReceivablesReport:', result);
} catch (e) {
  console.error('❌ Erro:', e.message);
}
```

**Resultado Esperado**:
```
✅ Todos 4 functions retornam dados sem erro
✅ Dados são do formato esperado (objeto com propriedades corretas)
✅ Sem exceptions no console
```

---

### TESTE 4: React UI Components (15 min)
```
🔵 Valida: ProductionReportCard renderiza
🔵 Valida: BillingReportTable renderiza
🔵 Valida: ReceivablesStatusBoard renderiza
```

**Passos Manuais**:

1. **Abra aplicação**:
   ```bash
   npm run dev
   # Acesse http://localhost:3000
   ```

2. **Login** com suas credenciais

3. **Navegue** para `/clinica/financeiro`

4. **Valide cada componente**:

   **ProductionReportCard**:
   - ✅ Título "Produção por Profissional" visível
   - ✅ Grid com nomes de profissionais
   - ✅ Valores de faturamento em BRL
   - ✅ Ticket médio calculado
   - ✅ Sem erros no console

   **BillingReportTable**:
   - ✅ Tabela com cabeçalho (Plano, Agendamentos, Bruto, etc)
   - ✅ Linhas com dados de faturamento
   - ✅ Valores em BRL formatados corretamente
   - ✅ Linha de totais no rodapé
   - ✅ Sem erros no console

   **ReceivablesStatusBoard**:
   - ✅ 4 cards de status (Total, Recebido, Pendente, Atrasado)
   - ✅ Números e cores (verde/amarelo/vermelho)
   - ✅ Tabela com detalhes de recebíveis
   - ✅ Coluna "Dias Atrasado" preenchida
   - ✅ Sem erros no console

**Resultado Esperado**:
```
✅ ProductionReportCard: Renderiza com dados corretos
✅ BillingReportTable: Renderiza com dados corretos
✅ ReceivablesStatusBoard: Renderiza com dados corretos
✅ Nenhum erro JavaScript no console
✅ Responsivo em mobile/desktop
```

---

### TESTE 5: End-to-End Workflow (15 min)
```
🔵 Valida: Workflow COMPLETO (agendamento → recebível → cashflow)
```

**Passo-a-passo**:

1. **Crie um agendamento NOVO** no frontend:
   - Acesse `/clinica/agenda`
   - Crie novo agendamento
   - Preencha: paciente, profissional, data/hora, valor
   - Salve (status = 'scheduled')

2. **Marque como "attended"**:
   - Localize agendamento na agenda
   - Click em "Finalizar"
   - Confirme status change para 'attended'

3. **Verifique recebível criado** (SQL):
   ```sql
   SELECT * FROM ar_receivables 
   WHERE appointment_id = YOUR_NEW_APPOINTMENT_ID;
   ```
   ✅ Deve retornar 1 recebível com status = 'pending'

4. **Marque recebível como paid** (SQL ou UI):
   ```sql
   UPDATE ar_receivables 
   SET status = 'paid', paid_at = NOW(), payment_method = 'cash'
   WHERE appointment_id = YOUR_NEW_APPOINTMENT_ID;
   ```

5. **Verifique cashflow criado** (SQL):
   ```sql
   SELECT * FROM ap_cashflow 
   WHERE receivable_id = (
     SELECT id FROM ar_receivables 
     WHERE appointment_id = YOUR_NEW_APPOINTMENT_ID
   );
   ```
   ✅ Deve retornar 1 entrada de cashflow com status = 'reconciled'

6. **Verifique relatórios atualizaram** (UI):
   - Acesse `/clinica/financeiro`
   - ProductionReportCard deve mostrar novo profissional/valor
   - BillingReportTable deve atualizar faturamento
   - ReceivablesStatusBoard deve atualizar status

**Resultado Esperado**:
```
✅ Agendamento criado
✅ Status changed para 'attended'
✅ Recebível criado automaticamente via trigger
✅ Recebível marcado como 'paid'
✅ Cashflow criado automaticamente via trigger
✅ Relatórios atualizaram em tempo real
✅ Nenhum erro em nenhum passo
```

---

## 📋 CHECKLIST FINAL (Marque ✅ após cada teste)

```
E2E Tests Completo:

DATABASE:
□ Triggers ativos
□ Funções criadas (16)
□ Agendamento → Recebível (automático)
□ Recebível → Cashflow (automático)

VIEWS:
□ vw_production_report populada
□ vw_billing_report populada
□ vw_receivables_report populada

API FUNCTIONS:
□ finalizeAppointmentWithReceivable() funciona
□ markReceivableAsPaid() funciona
□ getProductionReport() funciona
□ getReceivablesReport() funciona

UI COMPONENTS:
□ ProductionReportCard renderiza correto
□ BillingReportTable renderiza correto
□ ReceivablesStatusBoard renderiza correto

END-TO-END:
□ Workflow completo (agendamento → cashflow) funciona
□ Relatórios atualizam em tempo real
□ Sem erros no console
□ Sem erros no Supabase

RESULTADO: ✅ FASE 12 COMPLETA!
```

---

## 🚀 PRÓXIMO PASSO

Após completar TODOS os testes acima:

1. ✅ Marque todos ☑️ no checklist
2. ✅ Crie arquivo: `✅_FASE_12_E2E_TESTS_COMPLETA.md`
3. ✅ Liste todos os testes que passaram
4. ✅ Comece FASE 13: Performance (45 min)

---

**Tempo total: ~1 hora | Status: Pronto para começar! ⚡**

