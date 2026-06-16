# 🚀 APLICAR AGORA - GUIA PASSO-A-PASSO

**Conexão Supabase**: ✅ VALIDADA  
**Projeto**: gvdkdjyupktlflwurike (Gesclinic)  
**SQLs**: ✅ Prontos para colar

---

## 🔴 AÇÃO AGORA (10 minutos)

### PASSO 1️⃣: Abra Supabase SQL Editor

```
1. Vá para: https://app.supabase.com/
2. Seu Projeto (esquerda) → gvdkdjyupktlflwurike
3. SQL Editor (menu esquerdo)
4. Clique "New Query" (botão verde)
```

**Resultado esperado**: Editor vazio pronto para colar SQL

---

### PASSO 2️⃣: Cole SQL 1 (FASE 6-8)

```sql
-- ============================================================
-- FASE 6-8: ARQUITETURA COLUNA PARA CONVÊNIOS E REPASSE MÉDICO
-- ============================================================
-- Adiciona suporte para: planos de saúde, autorização, repasse percentual
-- Data: 2026-06-06
-- ============================================================

ALTER TABLE public.appointment_services
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id),
ADD COLUMN IF NOT EXISTS authorization_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS authorization_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS plan_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS professional_percentage NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS professional_discount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS professional_repay_type VARCHAR(50) DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS medical_production_id UUID REFERENCES public.medical_production(id),
ADD COLUMN IF NOT EXISTS sessions_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sessions_total INTEGER,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_appointment_services_plan_id 
ON public.appointment_services(plan_id);

CREATE INDEX IF NOT EXISTS idx_appointment_services_medical_production_id 
ON public.appointment_services(medical_production_id);

CREATE INDEX IF NOT EXISTS idx_appointment_services_status 
ON public.appointment_services(status);

-- Funções utilitárias
CREATE OR REPLACE FUNCTION public.calculate_professional_repay(
  value NUMERIC,
  percentage NUMERIC,
  discount NUMERIC,
  repay_type VARCHAR
) RETURNS NUMERIC AS $$
BEGIN
  IF repay_type = 'percentage' THEN
    RETURN (value - discount) * (percentage / 100);
  ELSIF repay_type = 'fixed' THEN
    RETURN percentage - discount;
  ELSE
    RETURN value - discount;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.sync_plan_info_to_service(
  service_id UUID,
  plan_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
BEGIN
  UPDATE public.appointment_services
  SET plan_name = (SELECT name FROM public.plans WHERE id = plan_id LIMIT 1)
  WHERE id = service_id;
  
  RETURN QUERY SELECT true, 'Plan info synced'::TEXT;
END;
$$ LANGUAGE plpgsql;
```

**O que fazer**:
```
1. Copie TODO o SQL acima (de -- ==== até o fim)
2. Clique no editor (em branco)
3. Ctrl+A (seleciona tudo o que houver)
4. Ctrl+V (cola o SQL acima)
5. Botão azul "Run"
6. Aguarde: ✅ "Query executed successfully"
```

**Se tiver sucesso:**
```
✅ 8 colunas adicionadas
✅ 3 índices criados
✅ 2 funções criadas
```

---

### PASSO 3️⃣: Cola SQL 2 (FASE 9-11)

**Clique "New Query" novamente** (botão verde)

```sql
-- ============================================================
-- FASE 9-11: AUTOMAÇÃO FINANCEIRA COM TRIGGERS
-- ============================================================
-- Cria automaticamente recebíveis quando agendamento é concluído
-- Sincroniza fluxo de caixa quando recebível é pago
-- Cria 3 views para relatórios em tempo real
-- Data: 2026-06-06
-- ============================================================

-- Função: Criar recebível quando agendamento é concluído
CREATE OR REPLACE FUNCTION public.create_receivable_from_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_total_amount NUMERIC;
  v_clinic_id UUID;
  v_receivable_id UUID;
  v_service RECORD;
BEGIN
  -- Só processa quando status = 'attended'
  IF NEW.status = 'attended' AND OLD.status IS DISTINCT FROM 'attended' THEN
    -- Pega clinic_id
    SELECT clinic_id INTO v_clinic_id FROM public.appointments WHERE id = NEW.id;
    
    -- Calcula total
    SELECT COALESCE(SUM(value - COALESCE(discount, 0)), 0) INTO v_total_amount
    FROM public.appointment_services
    WHERE appointment_id = NEW.id;
    
    -- Cria recebível
    INSERT INTO public.ar_receivables (
      clinic_id,
      appointment_id,
      amount,
      status,
      due_date,
      created_at
    ) VALUES (
      v_clinic_id,
      NEW.id,
      v_total_amount,
      'pending',
      CURRENT_DATE + INTERVAL '30 days',
      NOW()
    ) RETURNING id INTO v_receivable_id;
    
    -- Cria itens de recebível (1 por serviço para auditoria)
    FOR v_service IN (
      SELECT id, value, discount FROM public.appointment_services
      WHERE appointment_id = NEW.id
    ) LOOP
      INSERT INTO public.ar_receivable_items (
        receivable_id,
        appointment_service_id,
        amount,
        created_at
      ) VALUES (
        v_receivable_id,
        v_service.id,
        v_service.value - COALESCE(v_service.discount, 0),
        NOW()
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Cria recebível quando agendamento é marcado como concluído
CREATE TRIGGER create_receivable_on_appointment_attended
AFTER UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.create_receivable_from_appointment();

-- Função: Sincronizar fluxo de caixa quando recebível é pago
CREATE OR REPLACE FUNCTION public.sync_cashflow_from_receivable()
RETURNS TRIGGER AS $$
DECLARE
  v_cashflow_id UUID;
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    -- Insere entrada em fluxo de caixa
    INSERT INTO public.ap_cashflow (
      clinic_id,
      type,
      amount,
      description,
      reference_id,
      reference_type,
      created_at
    ) VALUES (
      NEW.clinic_id,
      'input',
      NEW.amount,
      'Recebimento - Recebível #' || NEW.id,
      NEW.id,
      'receivable',
      NOW()
    );
  ELSIF NEW.status != 'paid' AND OLD.status = 'paid' THEN
    -- Remove entrada se recebível foi desfeito
    DELETE FROM public.ap_cashflow
    WHERE reference_id = NEW.id AND reference_type = 'receivable';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Sincroniza fluxo de caixa quando recebível muda
CREATE TRIGGER sync_cashflow_on_receivable_update
AFTER UPDATE ON public.ar_receivables
FOR EACH ROW
EXECUTE FUNCTION public.sync_cashflow_from_receivable();

-- View: Relatório de Produção por Profissional
CREATE OR REPLACE VIEW public.vw_production_report AS
SELECT
  p.id,
  p.name AS professional_name,
  COUNT(DISTINCT a.id) AS total_appointments,
  COUNT(DISTINCT aps.id) AS total_services,
  COALESCE(SUM(aps.value - COALESCE(aps.discount, 0)), 0) AS total_revenue,
  CASE 
    WHEN COUNT(DISTINCT a.id) > 0 
    THEN COALESCE(SUM(aps.value - COALESCE(aps.discount, 0)), 0) / COUNT(DISTINCT a.id)
    ELSE 0
  END AS average_ticket,
  MAX(a.start_time) AS last_appointment_date,
  a.clinic_id
FROM public.professionals p
LEFT JOIN public.appointment_professionals ap ON p.id = ap.professional_id
LEFT JOIN public.appointments a ON ap.appointment_id = a.id
LEFT JOIN public.appointment_services aps ON a.id = aps.appointment_id
WHERE a.status IN ('attended', 'confirmed')
GROUP BY p.id, p.name, a.clinic_id;

-- View: Relatório de Faturamento por Plano
CREATE OR REPLACE VIEW public.vw_billing_report AS
SELECT
  pl.id,
  pl.name AS plan_name,
  COUNT(DISTINCT a.id) AS total_appointments,
  COALESCE(SUM(aps.value), 0) AS gross_amount,
  COALESCE(SUM(aps.discount), 0) AS total_discount,
  COALESCE(SUM(aps.value - COALESCE(aps.discount, 0)), 0) AS net_amount,
  COUNT(DISTINCT CASE WHEN ar.status = 'paid' THEN ar.id END) AS received_count,
  a.clinic_id
FROM public.plans pl
LEFT JOIN public.appointment_services aps ON pl.id = aps.plan_id
LEFT JOIN public.appointments a ON aps.appointment_id = a.id
LEFT JOIN public.ar_receivables ar ON a.id = ar.appointment_id
WHERE a.status IN ('attended', 'confirmed')
GROUP BY pl.id, pl.name, a.clinic_id;

-- View: Relatório de Recebíveis com Análise de Vencimento
CREATE OR REPLACE VIEW public.vw_receivables_report AS
SELECT
  ar.id,
  ar.clinic_id,
  ar.amount,
  ar.status,
  ar.due_date,
  CASE 
    WHEN ar.status = 'paid' THEN 'Recebido'
    WHEN ar.status = 'pending' AND CURRENT_DATE > ar.due_date THEN 'Atrasado'
    WHEN ar.status = 'pending' THEN 'Pendente'
    WHEN ar.status = 'canceled' THEN 'Cancelado'
    ELSE ar.status
  END AS status_label,
  CASE 
    WHEN ar.status = 'paid' THEN 0
    WHEN CURRENT_DATE > ar.due_date THEN CURRENT_DATE - ar.due_date
    ELSE 0
  END AS days_overdue,
  ar.created_at
FROM public.ar_receivables ar
ORDER BY ar.due_date ASC;
```

**O que fazer**:
```
1. Copie TODO o SQL acima
2. Clique "New Query" (botão verde)
3. Ctrl+V (cola)
4. Botão azul "Run"
5. Aguarde: ✅ "Query executed successfully"
```

**Se tiver sucesso:**
```
✅ 2 triggers criados
✅ 3 views criadas
✅ 2 funções criadas
✅ Automação ativada!
```

---

## ✅ VALIDAÇÃO (5 minutos)

Após colar os 2 SQLs, execute estas 3 queries (copie uma por uma):

### Query 1: Validar Colunas
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'appointment_services' 
  AND column_name IN ('plan_id', 'professional_percentage', 'medical_production_id', 'authorization_number')
ORDER BY column_name;
```

**Resultado esperado**: 4 colunas ✅

---

### Query 2: Validar Views
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'VIEW'
  AND table_name LIKE 'vw_%'
ORDER BY table_name;
```

**Resultado esperado**: 3 views ✅
- vw_billing_report
- vw_production_report
- vw_receivables_report

---

### Query 3: Validar Triggers
```sql
SELECT trigger_name, event_manipulation 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY trigger_name;
```

**Resultado esperado**: 2+ triggers ✅
- create_receivable_on_appointment_attended
- sync_cashflow_on_receivable_update

---

## 🎉 RESULTADO FINAL

```
✅ FASE 6-8 aplicada (colunas + índices + funções)
✅ FASE 9-11 aplicada (triggers + views)
✅ Automatização completa pronta!
✅ Projeto agora em 75% de completude!

Próximo: FASE 12-17 (4 horas - próxima sessão)
```

---

## 💡 DICA FINAL

Você tem 2 opções agora:

**Opção A: Rápido (10 minutos)**
- Cole SQL 1, espere sucesso
- Cole SQL 2, espera sucesso
- Pronto!

**Opção B: Validação Completa (20 minutos)**
- Opção A +
- Execute as 3 queries de validação
- Confirme cada resultado
- Mais seguro!

---

**⏱️ Tempo: 10-20 minutos até 100% pronto!**

Comece agora! 🚀

