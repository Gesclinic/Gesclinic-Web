# 🚀 APLICAR MIGRAÇÕES - COPIAR-COLAR DIRETO

**Hora**: 21:25  
**Tempo**: ~45 minutos até 100% completo

---

## 📋 INSTRUÇÕES RÁPIDAS

1. **Abrir**: https://app.supabase.com/
2. **Seu Projeto** → SQL Editor
3. **Clicar**: "New Query" (botão)
4. **Copiar**: SQL abaixo
5. **Clicar**: "Run" (botão verde)
6. **Aguardar**: "Query executed successfully" (verde)

---

## 📌 IMPORTANTE

```
⚠️  Antes de aplicar as SQLs:
    1. Criar backup (Settings → Backups → Start Backup)
    2. Aguardar o backup terminar (você recebe email)
    3. Depois rodar os SQLs abaixo (pode ser em paralelo)
```

---

## ✅ SQL 1: FASE 6-8 (COPIAR-COLAR TUDO ABAIXO)

```sql
-- ============================================
-- FASE 6-8: Preparación Arquitectural
-- Adiciona colunas para convênios, repasse médico e produção médica
-- ============================================
-- Data: 2026-06-06
-- Status: Pronta para aplicar

-- FASE 6: Estrutura de Convênios
ALTER TABLE appointment_services
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS authorization_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS authorization_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS plan_name VARCHAR(255);

-- FASE 7: Preparação Repasse Médico
ALTER TABLE appointment_services
ADD COLUMN IF NOT EXISTS professional_percentage NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS professional_discount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS professional_repay_type VARCHAR(50) DEFAULT 'percentage';

-- FASE 8: Preparação Produção Médica
ALTER TABLE appointment_services
ADD COLUMN IF NOT EXISTS medical_production_id UUID REFERENCES medical_production(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sessions_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sessions_total INTEGER,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_appointment_services_plan_id 
ON appointment_services(plan_id);

CREATE INDEX IF NOT EXISTS idx_appointment_services_medical_production_id 
ON appointment_services(medical_production_id);

CREATE INDEX IF NOT EXISTS idx_appointment_services_status 
ON appointment_services(status);

-- Criar função RPC para cálculo de repasse médico
CREATE OR REPLACE FUNCTION calculate_professional_repay(
  p_value NUMERIC,
  p_percentage NUMERIC,
  p_discount NUMERIC,
  p_repay_type VARCHAR
)
RETURNS NUMERIC AS $$
BEGIN
  IF p_repay_type = 'percentage' THEN
    RETURN (p_value - p_discount) * (p_percentage / 100.0);
  ELSIF p_repay_type = 'fixed' THEN
    RETURN p_discount;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Criar função RPC para sincronizar dados de convênio
CREATE OR REPLACE FUNCTION sync_plan_info_to_service(
  p_service_id UUID,
  p_plan_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_plan_name VARCHAR;
BEGIN
  -- Buscar nome do plano
  SELECT name INTO v_plan_name FROM plans WHERE id = p_plan_id;
  
  -- Atualizar appointment_services
  UPDATE appointment_services
  SET plan_name = v_plan_name,
      updated_at = NOW()
  WHERE id = p_service_id;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON COLUMN appointment_services.plan_id IS 'Referência ao convênio/plano de saúde (FASE 6)';
COMMENT ON COLUMN appointment_services.authorization_number IS 'Número de autorização do convênio (FASE 6)';
COMMENT ON COLUMN appointment_services.professional_percentage IS 'Percentual de repasse médico (FASE 7)';
COMMENT ON COLUMN appointment_services.professional_discount IS 'Valor fixo de repasse médico (FASE 7)';
COMMENT ON COLUMN appointment_services.medical_production_id IS 'Link com registro de produção médica (FASE 8)';
COMMENT ON COLUMN appointment_services.status IS 'Status do serviço: pending, partial, completed, cancelled (FASE 8)';
```

### Verificar se funcionou (depois copiar-colar):
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'appointment_services' 
ORDER BY column_name;
```

**Esperado**: Ver 8 colunas novas listadas ✓

---

## ✅ SQL 2: FASE 9-11 (COPIAR-COLAR TUDO ABAIXO)

```sql
-- ============================================
-- FASE 9-11: Integração Financeira
-- Sincroniza appointment_services com ar_receivables e fluxo de caixa
-- ============================================
-- Data: 2026-06-06
-- Status: Pronta para aplicar

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
DROP TRIGGER IF EXISTS create_receivable_on_appointment_insert ON appointments;

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
DROP TRIGGER IF EXISTS sync_cashflow_on_receivable_update ON ar_receivables;

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

### Verificar se funcionou (depois copiar-colar):
```sql
SELECT table_name, table_type FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'VIEW'
  AND table_name LIKE 'vw_%'
ORDER BY table_name;
```

**Esperado**: Ver 3 views criadas ✓

---

## ✅ CHECKLIST FINAL

- [ ] Backup iniciado em Supabase
- [ ] SQL FASE 6-8 copiado e executado
- [ ] Verificação de colunas: 8 novas ✓
- [ ] SQL FASE 9-11 copiado e executado  
- [ ] Verificação de views: 3 novas ✓
- [ ] ✅ MIGRAÇÕES COMPLETAS!

---

## 🎯 DEPOIS DISSO

Quando tudo acabar:

```
✅ Colunas adicionadas em appointment_services
✅ Triggers criados (automático para receivables + cashflow)
✅ Views criadas (produção, faturamento, recebíveis)
✅ FASE 9-11 100% FUNCIONAL

Próximo: FASE 12-17 (Testes - podem ser amanhã)
```

---

**Próxima Ação**: Abrir Supabase e colar SQL 1 primeiro! 🚀

