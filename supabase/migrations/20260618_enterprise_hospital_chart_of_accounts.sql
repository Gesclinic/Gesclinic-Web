-- Enterprise Hospital Chart of Accounts Upgrade
-- Phase 1-3 + governance seed for Gesclinic

BEGIN;

ALTER TABLE public.financial_chart_of_accounts
  ADD COLUMN IF NOT EXISTS category VARCHAR(120),
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(120),
  ADD COLUMN IF NOT EXISTS group_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
  ADD COLUMN IF NOT EXISTS is_analytic BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allows_posting BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_cost_center BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS color VARCHAR(20),
  ADD COLUMN IF NOT EXISTS icon VARCHAR(80),
  ADD COLUMN IF NOT EXISTS integration_key VARCHAR(120),
  ADD COLUMN IF NOT EXISTS dimension_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.financial_chart_of_accounts
  DROP CONSTRAINT IF EXISTS financial_chart_of_accounts_type_check;

ALTER TABLE public.financial_chart_of_accounts
  ADD CONSTRAINT financial_chart_of_accounts_type_check
  CHECK (
    type IN (
      'RECEITA',
      'DESPESA',
      'CUSTO',
      'DEDUCAO',
      'HONORARIO',
      'INVESTIMENTO',
      'ATIVO',
      'PASSIVO',
      'PATRIMONIO'
    )
  );

ALTER TABLE public.financial_chart_of_accounts
  DROP CONSTRAINT IF EXISTS financial_chart_of_accounts_status_check;

ALTER TABLE public.financial_chart_of_accounts
  ADD CONSTRAINT financial_chart_of_accounts_status_check
  CHECK (status IN ('ATIVA', 'INATIVA'));

CREATE INDEX IF NOT EXISTS idx_financial_coa_integration_key
  ON public.financial_chart_of_accounts(clinic_id, integration_key);

-- Avoid audit trigger failures when running via CLI context without auth.uid()
ALTER TABLE public.financial_chart_of_accounts DISABLE TRIGGER USER;

-- Keep compatibility between legacy and enterprise posting flags
UPDATE public.financial_chart_of_accounts
SET allows_posting = COALESCE(accepts_entries, false)
WHERE allows_posting IS DISTINCT FROM COALESCE(accepts_entries, false);

CREATE OR REPLACE FUNCTION public.sync_coa_posting_flags()
RETURNS trigger AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    NEW.accepts_entries := COALESCE(NEW.accepts_entries, NEW.allows_posting, false);
    NEW.allows_posting := COALESCE(NEW.allows_posting, NEW.accepts_entries, false);

    IF NEW.allows_posting THEN
      NEW.is_analytic := true;
    END IF;

    IF NEW.parent_id IS NULL THEN
      NEW.is_synthetic := true;
      IF NEW.allows_posting IS NULL THEN
        NEW.allows_posting := false;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_coa_posting_flags ON public.financial_chart_of_accounts;
CREATE TRIGGER trg_sync_coa_posting_flags
BEFORE INSERT OR UPDATE ON public.financial_chart_of_accounts
FOR EACH ROW EXECUTE FUNCTION public.sync_coa_posting_flags();

CREATE OR REPLACE FUNCTION public.seed_financial_chart_of_accounts(
  p_clinic_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF p_clinic_id IS NULL THEN
    RAISE EXCEPTION 'p_clinic_id is required';
  END IF;

  v_user_id := p_user_id;
  IF v_user_id IS NULL THEN
    BEGIN
      SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;
  END IF;

  WITH seed(code, parent_code, name, type, nature, level, allows_posting, requires_cost_center, integration_key, color, icon, category, subcategory, group_name) AS (
    VALUES
      ('1', NULL, 'RECEITAS', 'RECEITA', 'CREDORA', 1, false, false, 'RECEITAS', '#0f766e', 'banknote', 'RECEITAS', 'ROOT', 'RECEITAS'),
      ('1.1', '1', 'Particular', 'RECEITA', 'CREDORA', 2, true, true, 'RECEITA_PARTICULAR', '#0f766e', 'user-round', 'RECEITAS', 'PARTICULAR', 'RECEITAS'),
      ('1.2', '1', 'Convenios', 'RECEITA', 'CREDORA', 2, false, true, 'RECEITA_CONVENIOS', '#0f766e', 'shield-check', 'RECEITAS', 'CONVENIOS', 'RECEITAS'),
      ('1.2.1', '1.2', 'Unimed', 'RECEITA', 'CREDORA', 3, true, true, 'RECEITA_CONVENIO_UNIMED', '#0f766e', 'heart-pulse', 'RECEITAS', 'CONVENIOS', 'CONVENIOS'),
      ('1.2.2', '1.2', 'Bradesco', 'RECEITA', 'CREDORA', 3, true, true, 'RECEITA_CONVENIO_BRADESCO', '#0f766e', 'heart-pulse', 'RECEITAS', 'CONVENIOS', 'CONVENIOS'),
      ('1.2.3', '1.2', 'Amil', 'RECEITA', 'CREDORA', 3, true, true, 'RECEITA_CONVENIO_AMIL', '#0f766e', 'heart-pulse', 'RECEITAS', 'CONVENIOS', 'CONVENIOS'),
      ('1.2.4', '1.2', 'SulAmerica', 'RECEITA', 'CREDORA', 3, true, true, 'RECEITA_CONVENIO_SULAMERICA', '#0f766e', 'heart-pulse', 'RECEITAS', 'CONVENIOS', 'CONVENIOS'),
      ('1.2.5', '1.2', 'Hapvida', 'RECEITA', 'CREDORA', 3, true, true, 'RECEITA_CONVENIO_HAPVIDA', '#0f766e', 'heart-pulse', 'RECEITAS', 'CONVENIOS', 'CONVENIOS'),
      ('1.3', '1', 'Empresas', 'RECEITA', 'CREDORA', 2, true, true, 'RECEITA_EMPRESAS', '#0f766e', 'building-2', 'RECEITAS', 'EMPRESAS', 'RECEITAS'),
      ('1.4', '1', 'Exames', 'RECEITA', 'CREDORA', 2, true, true, 'RECEITA_EXAMES', '#0f766e', 'flask-conical', 'RECEITAS', 'EXAMES', 'RECEITAS'),
      ('1.5', '1', 'Procedimentos', 'RECEITA', 'CREDORA', 2, true, true, 'RECEITA_PROCEDIMENTOS', '#0f766e', 'stethoscope', 'RECEITAS', 'PROCEDIMENTOS', 'RECEITAS'),
      ('1.6', '1', 'Cirurgias', 'RECEITA', 'CREDORA', 2, true, true, 'RECEITA_CIRURGIAS', '#0f766e', 'scissors', 'RECEITAS', 'CIRURGIAS', 'RECEITAS'),
      ('1.7', '1', 'Internacoes', 'RECEITA', 'CREDORA', 2, true, true, 'RECEITA_INTERNACOES', '#0f766e', 'bed-double', 'RECEITAS', 'INTERNACOES', 'RECEITAS'),
      ('1.8', '1', 'Telemedicina', 'RECEITA', 'CREDORA', 2, true, true, 'RECEITA_TELEMEDICINA', '#0f766e', 'monitor-smartphone', 'RECEITAS', 'TELEMEDICINA', 'RECEITAS'),
      ('1.9', '1', 'Medicina Ocupacional', 'RECEITA', 'CREDORA', 2, true, true, 'RECEITA_OCUPACIONAL', '#0f766e', 'briefcase-medical', 'RECEITAS', 'OCUPACIONAL', 'RECEITAS'),

      ('2', NULL, 'DEDUCOES', 'DEDUCAO', 'DEVEDORA', 1, false, false, 'DEDUCOES', '#b91c1c', 'minus-circle', 'DEDUCOES', 'ROOT', 'DEDUCOES'),
      ('2.1', '2', 'Glosas', 'DEDUCAO', 'DEVEDORA', 2, true, true, 'DEDUCAO_GLOSAS', '#b91c1c', 'shield-x', 'DEDUCOES', 'GLOSAS', 'DEDUCOES'),
      ('2.2', '2', 'ISS', 'DEDUCAO', 'DEVEDORA', 2, true, true, 'DEDUCAO_ISS', '#b91c1c', 'receipt', 'DEDUCOES', 'TRIBUTOS', 'DEDUCOES'),
      ('2.3', '2', 'PIS', 'DEDUCAO', 'DEVEDORA', 2, true, true, 'DEDUCAO_PIS', '#b91c1c', 'receipt', 'DEDUCOES', 'TRIBUTOS', 'DEDUCOES'),
      ('2.4', '2', 'COFINS', 'DEDUCAO', 'DEVEDORA', 2, true, true, 'DEDUCAO_COFINS', '#b91c1c', 'receipt', 'DEDUCOES', 'TRIBUTOS', 'DEDUCOES'),
      ('2.5', '2', 'CSLL', 'DEDUCAO', 'DEVEDORA', 2, true, true, 'DEDUCAO_CSLL', '#b91c1c', 'receipt', 'DEDUCOES', 'TRIBUTOS', 'DEDUCOES'),
      ('2.6', '2', 'IRRF', 'DEDUCAO', 'DEVEDORA', 2, true, true, 'DEDUCAO_IRRF', '#b91c1c', 'receipt', 'DEDUCOES', 'TRIBUTOS', 'DEDUCOES'),
      ('2.7', '2', 'Estornos', 'DEDUCAO', 'DEVEDORA', 2, true, true, 'DEDUCAO_ESTORNOS', '#b91c1c', 'rotate-ccw', 'DEDUCOES', 'ESTORNOS', 'DEDUCOES'),

      ('3', NULL, 'CUSTOS ASSISTENCIAIS', 'CUSTO', 'DEVEDORA', 1, false, false, 'CUSTOS_ASSISTENCIAIS', '#9a3412', 'activity', 'CUSTOS', 'ROOT', 'CUSTOS'),
      ('3.1', '3', 'Materiais', 'CUSTO', 'DEVEDORA', 2, true, true, 'CUSTO_MATERIAIS', '#9a3412', 'package', 'CUSTOS', 'MATERIAIS', 'CUSTOS'),
      ('3.2', '3', 'Medicamentos', 'CUSTO', 'DEVEDORA', 2, true, true, 'CUSTO_MEDICAMENTOS', '#9a3412', 'pill', 'CUSTOS', 'MEDICAMENTOS', 'CUSTOS'),
      ('3.3', '3', 'OPME', 'CUSTO', 'DEVEDORA', 2, true, true, 'CUSTO_OPME', '#9a3412', 'syringe', 'CUSTOS', 'OPME', 'CUSTOS'),
      ('3.4', '3', 'Laboratorio', 'CUSTO', 'DEVEDORA', 2, true, true, 'CUSTO_LABORATORIO', '#9a3412', 'test-tube', 'CUSTOS', 'LABORATORIO', 'CUSTOS'),
      ('3.5', '3', 'Diagnostico', 'CUSTO', 'DEVEDORA', 2, true, true, 'CUSTO_DIAGNOSTICO', '#9a3412', 'scan-search', 'CUSTOS', 'DIAGNOSTICO', 'CUSTOS'),
      ('3.6', '3', 'Centro Cirurgico', 'CUSTO', 'DEVEDORA', 2, true, true, 'CUSTO_CENTRO_CIRURGICO', '#9a3412', 'scissors', 'CUSTOS', 'CIRURGICO', 'CUSTOS'),
      ('3.7', '3', 'Exames', 'CUSTO', 'DEVEDORA', 2, true, true, 'CUSTO_EXAMES', '#9a3412', 'microscope', 'CUSTOS', 'EXAMES', 'CUSTOS'),
      ('3.8', '3', 'Custos Hospitalares', 'CUSTO', 'DEVEDORA', 2, true, true, 'CUSTO_HOSPITALARES', '#9a3412', 'hospital', 'CUSTOS', 'HOSPITALARES', 'CUSTOS'),

      ('4', NULL, 'HONORARIOS MEDICOS', 'HONORARIO', 'DEVEDORA', 1, false, false, 'HONORARIOS_MEDICOS', '#7c3aed', 'stethoscope', 'HONORARIOS', 'ROOT', 'HONORARIOS'),
      ('4.1', '4', 'Producao', 'HONORARIO', 'DEVEDORA', 2, true, true, 'HONORARIO_PRODUCAO', '#7c3aed', 'line-chart', 'HONORARIOS', 'PRODUCAO', 'HONORARIOS'),
      ('4.2', '4', 'Repasses', 'HONORARIO', 'DEVEDORA', 2, true, true, 'HONORARIO_REPASSES', '#7c3aed', 'hand-coins', 'HONORARIOS', 'REPASSES', 'HONORARIOS'),
      ('4.3', '4', 'Plantoes', 'HONORARIO', 'DEVEDORA', 2, true, true, 'HONORARIO_PLANTOES', '#7c3aed', 'clock-3', 'HONORARIOS', 'PLANTOES', 'HONORARIOS'),
      ('4.4', '4', 'Cooperativas', 'HONORARIO', 'DEVEDORA', 2, true, true, 'HONORARIO_COOPERATIVAS', '#7c3aed', 'users', 'HONORARIOS', 'COOPERATIVAS', 'HONORARIOS'),
      ('4.5', '4', 'Terceiros', 'HONORARIO', 'DEVEDORA', 2, true, true, 'HONORARIO_TERCEIROS', '#7c3aed', 'user-cog', 'HONORARIOS', 'TERCEIROS', 'HONORARIOS'),

      ('5', NULL, 'PESSOAL', 'DESPESA', 'DEVEDORA', 1, false, false, 'PESSOAL', '#1d4ed8', 'users-round', 'DESPESAS', 'PESSOAL', 'DESPESAS'),
      ('5.1', '5', 'Salarios', 'DESPESA', 'DEVEDORA', 2, true, true, 'PESSOAL_SALARIOS', '#1d4ed8', 'wallet', 'DESPESAS', 'PESSOAL', 'PESSOAL'),
      ('5.2', '5', 'Pro-Labore', 'DESPESA', 'DEVEDORA', 2, true, true, 'PESSOAL_PROLABORE', '#1d4ed8', 'wallet-cards', 'DESPESAS', 'PESSOAL', 'PESSOAL'),
      ('5.3', '5', 'FGTS', 'DESPESA', 'DEVEDORA', 2, true, true, 'PESSOAL_FGTS', '#1d4ed8', 'landmark', 'DESPESAS', 'PESSOAL', 'PESSOAL'),
      ('5.4', '5', 'INSS', 'DESPESA', 'DEVEDORA', 2, true, true, 'PESSOAL_INSS', '#1d4ed8', 'landmark', 'DESPESAS', 'PESSOAL', 'PESSOAL'),
      ('5.5', '5', 'Beneficios', 'DESPESA', 'DEVEDORA', 2, true, true, 'PESSOAL_BENEFICIOS', '#1d4ed8', 'heart-handshake', 'DESPESAS', 'PESSOAL', 'PESSOAL'),
      ('5.6', '5', 'Ferias', 'DESPESA', 'DEVEDORA', 2, true, true, 'PESSOAL_FERIAS', '#1d4ed8', 'sun', 'DESPESAS', 'PESSOAL', 'PESSOAL'),
      ('5.7', '5', '13 Salario', 'DESPESA', 'DEVEDORA', 2, true, true, 'PESSOAL_13', '#1d4ed8', 'calendar', 'DESPESAS', 'PESSOAL', 'PESSOAL'),

      ('6', NULL, 'DESPESAS ADMINISTRATIVAS', 'DESPESA', 'DEVEDORA', 1, false, false, 'DESPESAS_ADMIN', '#334155', 'briefcase', 'DESPESAS', 'ADMINISTRATIVAS', 'DESPESAS'),
      ('6.1', '6', 'Marketing', 'DESPESA', 'DEVEDORA', 2, true, true, 'DESPESA_MARKETING', '#334155', 'megaphone', 'DESPESAS', 'ADMINISTRATIVAS', 'ADMIN'),
      ('6.2', '6', 'TI', 'DESPESA', 'DEVEDORA', 2, true, true, 'DESPESA_TI', '#334155', 'cpu', 'DESPESAS', 'ADMINISTRATIVAS', 'ADMIN'),
      ('6.3', '6', 'Telefonia', 'DESPESA', 'DEVEDORA', 2, true, true, 'DESPESA_TELEFONIA', '#334155', 'phone', 'DESPESAS', 'ADMINISTRATIVAS', 'ADMIN'),
      ('6.4', '6', 'Internet', 'DESPESA', 'DEVEDORA', 2, true, true, 'DESPESA_INTERNET', '#334155', 'wifi', 'DESPESAS', 'ADMINISTRATIVAS', 'ADMIN'),
      ('6.5', '6', 'Agua', 'DESPESA', 'DEVEDORA', 2, true, true, 'DESPESA_AGUA', '#334155', 'droplets', 'DESPESAS', 'ADMINISTRATIVAS', 'ADMIN'),
      ('6.6', '6', 'Energia', 'DESPESA', 'DEVEDORA', 2, true, true, 'DESPESA_ENERGIA', '#334155', 'zap', 'DESPESAS', 'ADMINISTRATIVAS', 'ADMIN'),
      ('6.7', '6', 'Limpeza', 'DESPESA', 'DEVEDORA', 2, true, true, 'DESPESA_LIMPEZA', '#334155', 'spray-can', 'DESPESAS', 'ADMINISTRATIVAS', 'ADMIN'),
      ('6.8', '6', 'Seguranca', 'DESPESA', 'DEVEDORA', 2, true, true, 'DESPESA_SEGURANCA', '#334155', 'shield', 'DESPESAS', 'ADMINISTRATIVAS', 'ADMIN'),
      ('6.9', '6', 'Contabilidade', 'DESPESA', 'DEVEDORA', 2, true, true, 'DESPESA_CONTABILIDADE', '#334155', 'calculator', 'DESPESAS', 'ADMINISTRATIVAS', 'ADMIN'),
      ('6.10', '6', 'Juridico', 'DESPESA', 'DEVEDORA', 2, true, true, 'DESPESA_JURIDICO', '#334155', 'scale', 'DESPESAS', 'ADMINISTRATIVAS', 'ADMIN'),

      ('7', NULL, 'DESPESAS FINANCEIRAS', 'DESPESA', 'DEVEDORA', 1, false, false, 'DESPESAS_FINANCEIRAS', '#6d28d9', 'landmark', 'DESPESAS', 'FINANCEIRAS', 'DESPESAS'),
      ('7.1', '7', 'Tarifas Bancarias', 'DESPESA', 'DEVEDORA', 2, true, true, 'DESPESA_TARIFAS', '#6d28d9', 'credit-card', 'DESPESAS', 'FINANCEIRAS', 'FINANCEIRAS'),
      ('7.2', '7', 'Juros', 'DESPESA', 'DEVEDORA', 2, true, true, 'DESPESA_JUROS', '#6d28d9', 'percent', 'DESPESAS', 'FINANCEIRAS', 'FINANCEIRAS'),
      ('7.3', '7', 'IOF', 'DESPESA', 'DEVEDORA', 2, true, true, 'DESPESA_IOF', '#6d28d9', 'receipt', 'DESPESAS', 'FINANCEIRAS', 'FINANCEIRAS'),
      ('7.4', '7', 'Emprestimos', 'DESPESA', 'DEVEDORA', 2, true, true, 'DESPESA_EMPRESTIMOS', '#6d28d9', 'banknote', 'DESPESAS', 'FINANCEIRAS', 'FINANCEIRAS'),
      ('7.5', '7', 'Financiamentos', 'DESPESA', 'DEVEDORA', 2, true, true, 'DESPESA_FINANCIAMENTOS', '#6d28d9', 'wallet', 'DESPESAS', 'FINANCEIRAS', 'FINANCEIRAS'),

      ('8', NULL, 'INVESTIMENTOS', 'INVESTIMENTO', 'DEVEDORA', 1, false, false, 'INVESTIMENTOS', '#047857', 'trending-up', 'INVESTIMENTOS', 'ROOT', 'INVESTIMENTOS'),
      ('8.1', '8', 'Equipamentos', 'INVESTIMENTO', 'DEVEDORA', 2, true, true, 'INVESTIMENTO_EQUIPAMENTOS', '#047857', 'monitor', 'INVESTIMENTOS', 'EQUIPAMENTOS', 'INVESTIMENTOS'),
      ('8.2', '8', 'Reformas', 'INVESTIMENTO', 'DEVEDORA', 2, true, true, 'INVESTIMENTO_REFORMAS', '#047857', 'hammer', 'INVESTIMENTOS', 'REFORMAS', 'INVESTIMENTOS'),
      ('8.3', '8', 'Obras', 'INVESTIMENTO', 'DEVEDORA', 2, true, true, 'INVESTIMENTO_OBRAS', '#047857', 'building', 'INVESTIMENTOS', 'OBRAS', 'INVESTIMENTOS'),
      ('8.4', '8', 'Tecnologia', 'INVESTIMENTO', 'DEVEDORA', 2, true, true, 'INVESTIMENTO_TECNOLOGIA', '#047857', 'microchip', 'INVESTIMENTOS', 'TECNOLOGIA', 'INVESTIMENTOS'),

      ('9', NULL, 'PATRIMONIO', 'PATRIMONIO', 'CREDORA', 1, false, false, 'PATRIMONIO', '#1e40af', 'landmark', 'PATRIMONIO', 'ROOT', 'PATRIMONIO'),
      ('9.1', '9', 'Capital Social', 'PATRIMONIO', 'CREDORA', 2, true, false, 'PATRIMONIO_CAPITAL_SOCIAL', '#1e40af', 'coins', 'PATRIMONIO', 'CAPITAL', 'PATRIMONIO'),
      ('9.2', '9', 'Reservas', 'PATRIMONIO', 'CREDORA', 2, true, false, 'PATRIMONIO_RESERVAS', '#1e40af', 'piggy-bank', 'PATRIMONIO', 'RESERVAS', 'PATRIMONIO'),
      ('9.3', '9', 'Lucros Acumulados', 'PATRIMONIO', 'CREDORA', 2, true, false, 'PATRIMONIO_LUCROS', '#1e40af', 'badge-dollar-sign', 'PATRIMONIO', 'LUCROS', 'PATRIMONIO')
  ),
  seed_dedup AS (
    SELECT DISTINCT ON (code) *
    FROM seed
    ORDER BY code
  ),
  upserted AS (
    INSERT INTO public.financial_chart_of_accounts (
      clinic_id,
      parent_id,
      code,
      name,
      description,
      type,
      nature,
      level,
      is_active,
      accepts_entries,
      allows_posting,
      requires_cost_center,
      is_analytic,
      is_synthetic,
      status,
      color,
      icon,
      category,
      subcategory,
      group_name,
      integration_key,
      dimension_config,
      metadata,
      created_by,
      created_at,
      updated_at
    )
    SELECT
      p_clinic_id,
      NULL,
      seed.code,
      seed.name,
      seed.name,
      seed.type,
      seed.nature,
      seed.level,
      true,
      seed.allows_posting,
      seed.allows_posting,
      seed.requires_cost_center,
      seed.allows_posting,
      NOT seed.allows_posting,
      'ATIVA',
      seed.color,
      seed.icon,
      seed.category,
      seed.subcategory,
      seed.group_name,
      seed.integration_key,
      jsonb_build_object(
        'category', true,
        'subcategory', true,
        'group', true,
        'cost_center', true,
        'unit', true,
        'specialty', true,
        'doctor', true,
        'insurance', true,
        'supplier', true,
        'patient', true,
        'company', true
      ),
      jsonb_build_object('seed', 'erp_hospital_enterprise', 'version', '2026-06-18'),
      COALESCE(v_user_id, auth.uid()),
      v_now,
      v_now
    FROM seed_dedup seed
    ON CONFLICT (clinic_id, code)
    DO NOTHING
    RETURNING id, code
  )
  UPDATE public.financial_chart_of_accounts child
  SET parent_id = parent.id,
      updated_at = v_now
  FROM seed_dedup seed,
       public.financial_chart_of_accounts parent
  WHERE child.clinic_id = p_clinic_id
    AND child.code = seed.code
    AND seed.parent_code IS NOT NULL
    AND parent.clinic_id = p_clinic_id
    AND parent.code = seed.parent_code;

  RETURN jsonb_build_object(
    'ok', true,
    'clinic_id', p_clinic_id,
    'seed', 'erp_hospital_enterprise',
    'updated_at', v_now
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure audit trigger works in CLI/admin contexts where auth.uid() can be null
CREATE OR REPLACE FUNCTION public.financial_chart_of_accounts_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.financial_chart_of_accounts_audit (
      account_id, clinic_id, action, changed_by, new_values
    ) VALUES (
      NEW.id,
      NEW.clinic_id,
      'INSERT',
      COALESCE(auth.uid(), NEW.created_by, OLD.created_by),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.financial_chart_of_accounts_audit (
      account_id, clinic_id, action, changed_by, old_values, new_values
    ) VALUES (
      NEW.id,
      NEW.clinic_id,
      'UPDATE',
      COALESCE(auth.uid(), NEW.created_by, OLD.created_by),
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.financial_chart_of_accounts_audit (
      account_id, clinic_id, action, changed_by, old_values
    ) VALUES (
      OLD.id,
      OLD.clinic_id,
      'DELETE',
      COALESCE(auth.uid(), OLD.created_by),
      to_jsonb(OLD)
    );
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.financial_chart_of_accounts ENABLE TRIGGER USER;

COMMIT;

