-- Configura profissionais e repasse do demonstrativo Unimed 506712072.
-- SOLICITANTE define o profissional somente para os aliases abaixo; os demais
-- solicitantes sao atribuidos a Cristiane Egewarth conforme regra da clinica.

CREATE TABLE IF NOT EXISTS public.payer_report_repasse_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  payer_id uuid,
  source_key text NOT NULL,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE RESTRICT,
  requester_aliases text[] NOT NULL DEFAULT '{}',
  is_fallback boolean NOT NULL DEFAULT false,
  calculation_base text NOT NULL CHECK (calculation_base IN ('honorarium_paid')),
  consultation_tax_percentage numeric(7,4) NOT NULL DEFAULT 14.3300,
  procedure_tax_percentage numeric(7,4) NOT NULL DEFAULT 8.9300,
  professional_percentage numeric(7,4) NOT NULL DEFAULT 70.0000,
  clinic_percentage numeric(7,4) NOT NULL DEFAULT 30.0000,
  applies_to text NOT NULL DEFAULT 'received' CHECK (applies_to = 'received'),
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, source_key, professional_id),
  CHECK (professional_percentage + clinic_percentage = 100),
  CHECK (NOT is_fallback OR cardinality(requester_aliases) = 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payer_report_repasse_fallback
  ON public.payer_report_repasse_rules(clinic_id, source_key)
  WHERE is_fallback AND active;

CREATE INDEX IF NOT EXISTS idx_payer_report_repasse_lookup
  ON public.payer_report_repasse_rules(clinic_id, source_key, active);

ALTER TABLE public.payer_report_repasse_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payer_report_repasse_rules_select ON public.payer_report_repasse_rules;
CREATE POLICY payer_report_repasse_rules_select
  ON public.payer_report_repasse_rules FOR SELECT TO authenticated
  USING (public.current_user_has_clinic_access(clinic_id));

DROP POLICY IF EXISTS payer_report_repasse_rules_write ON public.payer_report_repasse_rules;
CREATE POLICY payer_report_repasse_rules_write
  ON public.payer_report_repasse_rules FOR ALL TO authenticated
  USING (public.current_user_has_clinic_access(clinic_id))
  WITH CHECK (public.current_user_has_clinic_access(clinic_id));

DO $$
DECLARE
  v_clinic_id constant uuid := 'dcee437c-fd14-463c-b25e-a318f5da60b7';
  v_payer_id uuid;
  v_tenant_id uuid;
  v_company_id uuid;
  v_branch_id uuid;
  v_professional record;
  v_professional_id uuid;
BEGIN
  SELECT tenant_id, company_id, branch_id
    INTO v_tenant_id, v_company_id, v_branch_id
  FROM public.professionals
  WHERE clinic_id = v_clinic_id AND active
  ORDER BY created_at
  LIMIT 1;

  SELECT id INTO v_payer_id
  FROM public.payers
  WHERE clinic_id = v_clinic_id
    AND lower(trim(name)) IN ('unimed cascavel - pr', 'unimed cascavel')
  ORDER BY CASE WHEN lower(trim(name)) = 'unimed cascavel - pr' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_payer_id IS NULL THEN
    RAISE EXCEPTION 'Convenio canonico Unimed Cascavel nao encontrado para a clinica %', v_clinic_id;
  END IF;

  FOR v_professional IN
    SELECT * FROM (VALUES
      ('ALVARO MOREIRA DA LUZ', 'Álvaro Moreira da Luz', ARRAY['ALVARO MOREIRA DA LUZ']::text[], false),
      ('CRISTIANE EGEWARTH', 'Cristiane Egewarth', ARRAY[]::text[], true),
      ('LAZARO DE LIMA', 'Lázaro de Lima', ARRAY['LAZARO DE LIMA']::text[], false),
      ('MARCELO ALVAREZ RODRIGUES', 'Marcelo Alvarez Rodrigues', ARRAY['MARCELO ALVAREZ RODRIGUES','MARCELO ALVARES RODRIGUES']::text[], false),
      ('MARCIUS BENIGNO MARQUES DOS SANTOS', 'Marcius Benigno Marques dos Santos', ARRAY['MARCIUS BENIGNO MARQUES DOS SANTOS']::text[], false),
      ('MARCOS HENRIQUE LIMA GALLES', 'Marcos Henrique Lima Galles', ARRAY['MARCOS HENRIQUE LIMA GALLES']::text[], false),
      ('PAULO EDUARDO MESTRINELLI CARRILHO', 'Paulo Eduardo Mestrinelli Carrilho', ARRAY['PAULO EDUARDO MESTRINELLI CARRILHO']::text[], false),
      ('STENIO HENRIQUE DE SOUZA', 'Stênio Henrique de Souza', ARRAY['STENIO HENRIQUE DE SOUZA']::text[], false),
      ('TALVANY DONIZETTI DE OLIVEIRA', 'Talvany Donizetti de Oliveira', ARRAY['TALVANY DONIZETTI DE OLIVEIRA','TALVANY DONIZETE DE OLIVEIRA']::text[], false),
      ('EMANUELLE BIANCHI', 'Emanuelle Bianchi', ARRAY['EMANUELLE BIANCHI','EMANUELLE BIANCHI DA SILVA ROCHA','EMANUELLE BIACHI DA SILVA']::text[], false),
      ('LEANDRO PELEGRINI', 'Leandro Pelegrini', ARRAY['LEANDRO PELEGRINI','LEANDRO PELEGRINI DE ALMEIDA']::text[], false)
    ) AS configured(normalized_name, display_name, aliases, is_fallback)
  LOOP
    SELECT id INTO v_professional_id
    FROM public.professionals
    WHERE clinic_id = v_clinic_id
      AND upper(translate(trim(name),
        'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
        'AAAAAEEEEIIIIOOOOOUUUUC')) = ANY (
          array_append(v_professional.aliases, v_professional.normalized_name)
        )
    ORDER BY active DESC, created_at
    LIMIT 1;

    IF v_professional_id IS NULL THEN
      INSERT INTO public.professionals (
        clinic_id, name, specialization, active, crms,
        tenant_id, company_id, branch_id
      ) VALUES (
        v_clinic_id, v_professional.display_name,
        'Médico - cadastro básico importado do demonstrativo Unimed 506712072',
        true, '[]'::jsonb, v_tenant_id, v_company_id, v_branch_id
      ) RETURNING id INTO v_professional_id;
    END IF;

    INSERT INTO public.payer_report_repasse_rules (
      clinic_id, payer_id, source_key, professional_id, requester_aliases,
      is_fallback, calculation_base, consultation_tax_percentage,
      procedure_tax_percentage, professional_percentage, clinic_percentage,
      applies_to, active, notes
    ) VALUES (
      v_clinic_id, v_payer_id, 'UNIMED:506712072', v_professional_id,
      v_professional.aliases, v_professional.is_fallback, 'honorarium_paid',
      14.3300, 8.9300, 70.0000, 30.0000, 'received', true,
      'Base: coluna HONORARIO efetivamente paga. Consulta: deduz 14,33%; exames, cirurgias e procedimentos: deduz 8,93%. Itens integralmente glosados nao geram repasse.'
    )
    ON CONFLICT (clinic_id, source_key, professional_id) DO UPDATE SET
      payer_id = EXCLUDED.payer_id,
      requester_aliases = EXCLUDED.requester_aliases,
      is_fallback = EXCLUDED.is_fallback,
      calculation_base = EXCLUDED.calculation_base,
      consultation_tax_percentage = EXCLUDED.consultation_tax_percentage,
      procedure_tax_percentage = EXCLUDED.procedure_tax_percentage,
      professional_percentage = EXCLUDED.professional_percentage,
      clinic_percentage = EXCLUDED.clinic_percentage,
      applies_to = EXCLUDED.applies_to,
      active = true,
      notes = EXCLUDED.notes,
      updated_at = now();

    INSERT INTO public.medical_repasse_rules (
      clinic_id, name, rule_type, scope_value, professional_id, convenio_id,
      percentage, applies_to, valid_from, priority, is_active, notes
    )
    SELECT
      v_clinic_id,
      'Unimed 506712072 - 70% honorário líquido - ' || v_professional.display_name,
      'individual', 'UNIMED:506712072:HONORARIO_LIQUIDO', v_professional_id,
      v_payer_id, 70.0000, 'recebido', DATE '2026-04-01', 10, true,
      'Regra vinculada a payer_report_repasse_rules. Não aplicar 70% sobre TOTAL: usar HONORARIO menos imposto configurado na regra do relatório.'
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.medical_repasse_rules existing
      WHERE existing.clinic_id = v_clinic_id
        AND existing.professional_id = v_professional_id
        AND existing.scope_value = 'UNIMED:506712072:HONORARIO_LIQUIDO'
    );
  END LOOP;
END $$;

COMMENT ON TABLE public.payer_report_repasse_rules IS
  'Mapeia aliases de solicitante e parâmetros de repasse específicos de retornos de convênio.';