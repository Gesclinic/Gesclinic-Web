# ⚡ FASE 9-11: INTEGRAÇÃO FINANCEIRA
## AR Receivables, Fluxo de Caixa, Relatórios

**Status**: 🚀 PRÓXIMA FASE  
**Objetivo**: Converter appointment_services → ar_receivables → cashflow atomicamente  
**Tempo Estimado**: 5-6 horas  
**Dependência**: FASE 6-8 (Migration SQL aplicada) ✅ Planejada  

---

## 📋 ESCOPO FASE 9-11

### FASE 9: Integração AR Receivables
- Um receivable por appointment
- Múltiplos items (um per service)
- Validação de totalizações
- Sincronização automática

### FASE 10: Integração Fluxo de Caixa
- Registros de entrada baseados em ar_receivables
- Categorização por convênio/particular
- Sincronização automática de status

### FASE 11: Relatórios Financeiros
- Relatório de Produção (por profissional)
- Relatório de Faturamento (por convênio)
- Relatório de Recebíveis (pendentes vs recebidos)
- Exportação para Excel

---

## 🔧 ETAPAS DE IMPLEMENTAÇÃO

### Etapa 1: Criar Migrations SQL

**Arquivo**: `supabase/migrations/2026-06-06_fase9-11_financial_integration.sql`

```sql
-- ============================================
-- FASE 9-11: Integração Financeira
-- Sincroniza appointment_services com ar_receivables e fluxo de caixa
-- ============================================

-- FASE 9: Trigger para criar receivable automaticamente
CREATE OR REPLACE FUNCTION create_receivable_from_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_receivable_id UUID;
  v_total_value NUMERIC;
BEGIN
  -- Calcular valor total dos serviços do agendamento
  SELECT COALESCE(SUM(value - COALESCE(discount, 0)), 0)
  INTO v_total_value
  FROM appointment_services
  WHERE appointment_id = NEW.id;

  -- Criar receivable
  INSERT INTO ar_receivables (
    clinic_id,
    appointment_id,
    payer_id,
    amount,
    status,
    due_date,
    created_at
  ) VALUES (
    NEW.clinic_id,
    NEW.id,
    NEW.payer_id,
    v_total_value,
    'pending',
    NEW.scheduled_date + INTERVAL '30 days',
    NOW()
  ) RETURNING id INTO v_receivable_id;

  -- Criar items no receivable para cada serviço
  INSERT INTO ar_receivable_items (
    receivable_id,
    service_id,
    appointment_service_id,
    description,
    quantity,
    unit_price,
    discount,
    total_amount,
    created_at
  )
  SELECT
    v_receivable_id,
    ast.service_id,
    ast.id,
    s.name,
    COALESCE(ast.quantity, 1),
    ast.value,
    COALESCE(ast.discount, 0),
    ast.value - COALESCE(ast.discount, 0),
    NOW()
  FROM appointment_services ast
  LEFT JOIN services s ON ast.service_id = s.id
  WHERE ast.appointment_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir
DROP TRIGGER IF NOT EXISTS create_receivable_on_appointment_insert ON appointments;

-- Criar trigger apenas para appointments finalizados (attended)
CREATE TRIGGER create_receivable_on_appointment_attended
AFTER UPDATE ON appointments
FOR EACH ROW
WHEN (NEW.status = 'attended' AND OLD.status != 'attended')
EXECUTE FUNCTION create_receivable_from_appointment();

-- FASE 10: Trigger para sincronizar fluxo de caixa
CREATE OR REPLACE FUNCTION sync_cashflow_from_receivable()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_entry_id UUID;
BEGIN
  -- Verificar se já existe entrada de fluxo de caixa
  SELECT id INTO v_existing_entry_id
  FROM ap_cashflow
  WHERE receivable_id = NEW.id
  LIMIT 1;

  IF NEW.status = 'paid' AND v_existing_entry_id IS NULL THEN
    -- Criar entrada de fluxo de caixa quando receivable é pago
    INSERT INTO ap_cashflow (
      clinic_id,
      type,
      amount,
      reference_id,
      reference_type,
      category,
      description,
      payment_date,
      created_at
    ) VALUES (
      NEW.clinic_id,
      'input',
      NEW.amount,
      NEW.id,
      'receivable',
      COALESCE(NEW.category, 'particular'),
      'Recebimento - ' || COALESCE(NEW.id::text, 'N/A'),
      NOW()::DATE,
      NOW()
    );
  ELSIF NEW.status != 'paid' AND v_existing_entry_id IS NOT NULL THEN
    -- Remover entrada se receivable foi despago
    DELETE FROM ap_cashflow WHERE id = v_existing_entry_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir
DROP TRIGGER IF NOT EXISTS sync_cashflow_on_receivable_update ON ar_receivables;

-- Criar trigger novo
CREATE TRIGGER sync_cashflow_on_receivable_update
AFTER UPDATE ON ar_receivables
FOR EACH ROW
EXECUTE FUNCTION sync_cashflow_from_receivable();

-- FASE 11: View para relatório de produção
CREATE OR REPLACE VIEW vw_production_report AS
SELECT
  a.professional_id,
  p.name AS professional_name,
  COUNT(DISTINCT a.id) AS total_appointments,
  COUNT(DISTINCT ast.id) AS total_services,
  COALESCE(SUM(ast.value - COALESCE(ast.discount, 0)), 0) AS total_revenue,
  COALESCE(AVG(ast.value - COALESCE(ast.discount, 0)), 0) AS average_ticket,
  COUNT(DISTINCT ast.service_id) AS distinct_services,
  MAX(a.scheduled_date) AS last_appointment_date,
  a.clinic_id
FROM appointments a
LEFT JOIN professionals p ON a.professional_id = p.id
LEFT JOIN appointment_services ast ON a.id = ast.appointment_id
WHERE a.status IN ('attended', 'confirmed')
GROUP BY a.professional_id, p.name, a.clinic_id;

-- FASE 11: View para relatório de faturamento por convênio
CREATE OR REPLACE VIEW vw_billing_report AS
SELECT
  ast.plan_id,
  COALESCE(ast.plan_name, 'Particular') AS plan_name,
  COUNT(DISTINCT a.id) AS total_appointments,
  COUNT(DISTINCT ast.id) AS total_services,
  COALESCE(SUM(ast.value), 0) AS gross_amount,
  COALESCE(SUM(ast.discount), 0) AS total_discount,
  COALESCE(SUM(ast.value - COALESCE(ast.discount, 0)), 0) AS net_amount,
  COUNT(ar.id) AS total_receivables,
  SUM(CASE WHEN ar.status = 'paid' THEN 1 ELSE 0 END) AS received_count,
  a.clinic_id
FROM appointments a
LEFT JOIN appointment_services ast ON a.id = ast.appointment_id
LEFT JOIN ar_receivables ar ON a.id = ar.appointment_id
WHERE a.status IN ('attended', 'confirmed')
GROUP BY ast.plan_id, ast.plan_name, a.clinic_id;

-- FASE 11: View para relatório de recebíveis
CREATE OR REPLACE VIEW vw_receivables_report AS
SELECT
  ar.id,
  ar.appointment_id,
  a.scheduled_date,
  ar.payer_id,
  ar.amount,
  ar.status,
  ar.due_date,
  CURRENT_DATE - ar.due_date AS days_overdue,
  CASE 
    WHEN ar.status = 'paid' THEN 'Recebido'
    WHEN CURRENT_DATE > ar.due_date THEN 'Atrasado'
    ELSE 'Pendente'
  END AS status_label,
  ar.clinic_id
FROM ar_receivables ar
LEFT JOIN appointments a ON ar.appointment_id = a.id
ORDER BY ar.due_date ASC;

-- Comentários para documentação
COMMENT ON FUNCTION create_receivable_from_appointment IS 'FASE 9: Cria receivable automaticamente quando appointment é marcado como attended';
COMMENT ON FUNCTION sync_cashflow_from_receivable IS 'FASE 10: Sincroniza fluxo de caixa quando receivable é pago';
COMMENT ON VIEW vw_production_report IS 'FASE 11: Relatório de produção por profissional';
COMMENT ON VIEW vw_billing_report IS 'FASE 11: Relatório de faturamento por convênio';
COMMENT ON VIEW vw_receivables_report IS 'FASE 11: Relatório de recebíveis com status';
```

---

### Etapa 2: Adicionar Funções de RPC (Extras)

**Adicionar ao appointmentsApi.js**:

```javascript
/**
 * FASE 9: Finalizar appointment e gerar receivable
 */
export async function finalizeAppointmentWithReceivable(appointmentId) {
  try {
    console.log('💰 [FASE 9] Finalizando appointment e gerando receivable:', appointmentId);
    
    // Atualizar appointment para 'attended'
    const { data: appointment, error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'attended', updated_at: new Date().toISOString() })
      .eq('id', appointmentId)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    // Trigger automático criará o receivable
    console.log('✅ [FASE 9] Appointment finalizado, receivable criado automaticamente');
    return appointment;
  } catch (err) {
    console.error('❌ [FASE 9] Erro ao finalizar appointment:', err);
    throw err;
  }
}

/**
 * FASE 10: Sincronizar fluxo de caixa para receivable
 */
export async function markReceivableAsPaid(receivableId, paymentMethod = 'cash') {
  try {
    console.log('💳 [FASE 10] Marcando receivable como pago:', receivableId);
    
    // Atualizar receivable para 'paid'
    const { data: receivable, error: error } = await supabase
      .from('ar_receivables')
      .update({ 
        status: 'paid', 
        payment_method: paymentMethod,
        paid_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', receivableId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Trigger automático sincronizará fluxo de caixa
    console.log('✅ [FASE 10] Receivable marcado como pago, fluxo de caixa sincronizado');
    return receivable;
  } catch (err) {
    console.error('❌ [FASE 10] Erro ao marcar receivable como pago:', err);
    throw err;
  }
}

/**
 * FASE 11: Obter relatório de produção
 */
export async function getProductionReport(clinicId, startDate, endDate) {
  try {
    console.log('📊 [FASE 11] Obtendo relatório de produção');
    
    const { data, error } = await supabase
      .from('vw_production_report')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('last_appointment_date', startDate)
      .lte('last_appointment_date', endDate)
      .order('total_revenue', { ascending: false });
    
    if (error) throw error;
    console.log('✅ [FASE 11] Relatório de produção gerado');
    return data;
  } catch (err) {
    console.error('❌ [FASE 11] Erro ao gerar relatório de produção:', err);
    return [];
  }
}

/**
 * FASE 11: Obter relatório de faturamento
 */
export async function getBillingReport(clinicId, startDate, endDate) {
  try {
    console.log('📊 [FASE 11] Obtendo relatório de faturamento');
    
    const { data, error } = await supabase
      .from('vw_billing_report')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('net_amount', { ascending: false });
    
    if (error) throw error;
    console.log('✅ [FASE 11] Relatório de faturamento gerado');
    return data;
  } catch (err) {
    console.error('❌ [FASE 11] Erro ao gerar relatório de faturamento:', err);
    return [];
  }
}

/**
 * FASE 11: Obter relatório de recebíveis
 */
export async function getReceivablesReport(clinicId, status = null) {
  try {
    console.log('📊 [FASE 11] Obtendo relatório de recebíveis');
    
    let query = supabase
      .from('vw_receivables_report')
      .select('*')
      .eq('clinic_id', clinicId);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query.order('due_date', { ascending: true });
    
    if (error) throw error;
    console.log('✅ [FASE 11] Relatório de recebíveis gerado');
    return data;
  } catch (err) {
    console.error('❌ [FASE 11] Erro ao gerar relatório de recebíveis:', err);
    return [];
  }
}
```

---

### Etapa 3: Criar Componentes de UI para FASE 11

**Arquivo**: `src/pages/clinica/financeiro/components/ProductionReportCard.jsx`

```javascript
/**
 * ProductionReportCard - Cartão de Produção Médica
 * Mostra: Profissional, Atendimentos, Receita, Ticket Médio
 */
function ProductionReportCard({ report }) {
  return (
    <div style={{
      backgroundColor: '#fff',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#999' }}>👨‍⚕️ Profissional</div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{report.professional_name}</div>
        </div>
        
        <div>
          <div style={{ fontSize: '12px', color: '#999' }}>📊 Atendimentos</div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>{report.total_appointments}</div>
        </div>
        
        <div>
          <div style={{ fontSize: '12px', color: '#999' }}>💰 Receita</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#27ae60' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(report.total_revenue)}
          </div>
        </div>
        
        <div>
          <div style={{ fontSize: '12px', color: '#999' }}>📈 Ticket Médio</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#3498db' }}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(report.average_ticket)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductionReportCard;
```

---

## ✅ CHECKLIST FASE 9-11

### Banco de Dados (FASE 9-10)
- [ ] Criar arquivo migration SQL (FASE 9-11)
- [ ] Adicionar trigger: create_receivable_from_appointment
- [ ] Adicionar trigger: sync_cashflow_from_receivable
- [ ] Criar RPC functions
- [ ] Criar views: vw_production_report
- [ ] Criar views: vw_billing_report
- [ ] Criar views: vw_receivables_report
- [ ] Testar triggers no Supabase

### API Layer (appointmentsApi.js)
- [ ] Adicionar função `finalizeAppointmentWithReceivable()`
- [ ] Adicionar função `markReceivableAsPaid()`
- [ ] Adicionar função `getProductionReport()`
- [ ] Adicionar função `getBillingReport()`
- [ ] Adicionar função `getReceivablesReport()`

### UI Components (FASE 11)
- [ ] Criar `ProductionReportCard.jsx`
- [ ] Criar `BillingReportTable.jsx`
- [ ] Criar `ReceivablesStatusBoard.jsx`
- [ ] Integrar em `/clinica/financeiro/` pages

### Integração & Testes
- [ ] Build: npm run build
- [ ] Dev: npm run dev
- [ ] Teste manual: Criar appointment → Marcar attended → Verificar receivable criado
- [ ] Teste manual: Marcar receivable pago → Verificar fluxo caixa sincronizado

---

## 🎯 FLUXO COMPLETO FASE 9-11

```
User cria Appointment com Serviços
    ↓
Salva em appointment_services ✅ (FASE 4-5)
    ↓
Adiciona plan_id, authorization ✅ (FASE 6-8)
    ↓
Marca appointment como "ATTENDED"
    ↓
TRIGGER: create_receivable_from_appointment()
    ├─ Cria ar_receivables
    └─ Cria ar_receivable_items (1 por serviço)
    ↓
User paga receivable
    ↓
Marca receivable como "PAID"
    ↓
TRIGGER: sync_cashflow_from_receivable()
    ├─ Cria entrada em ap_cashflow
    └─ Sincroniza status
    ↓
Relatórios disponíveis
    ├─ Produção por profissional
    ├─ Faturamento por convênio
    └─ Recebíveis com status
```

---

## 🚀 PRÓXIMAS AÇÕES

1. **Imediato**: Criar migration SQL (FASE 9-11)
2. **Depois**: Adicionar funções ao appointmentsApi.js
3. **Depois**: Criar componentes UI
4. **Depois**: Testar fluxo completo
5. **Depois**: Validar triggers funcionam corretamente
6. **Final**: Aplicar migration no banco

---

## 📊 DEPENDÊNCIAS E FLUXO

```
FASE 1-3 ✅
    ↓
FASE 4-5 ✅
    ↓
FASE 6-8 (Planejada)
    ↓
FASE 9-11 (Este documento) ← PRÓXIMO
    ├─ Trigger: create_receivable
    ├─ Trigger: sync_cashflow
    └─ Views: production, billing, receivables
    ↓
FASE 12-14 (Testes e Validação)
    ↓
FASE 15-17 (Performance, Segurança, Deploy)
```

---

**Status**: 🟢 PRONTO PARA IMPLEMENTAÇÃO  
**Tempo Total**: ~6 horas (FASE 9-11)  
**Próximo**: Implementar FASE 9-11 ou aplicar migrações?
