-- Ampliar opções de applies_to para suportar 'bruto' e 'liquido'
-- bruto   = mesmo que produzido (valor gerado antes de deduções)
-- liquido = mesmo que recebido  (valor após glosas/descontos)

alter table public.medical_repasse_rules
  drop constraint if exists medical_repasse_rules_applies_to_check;

alter table public.medical_repasse_rules
  add constraint medical_repasse_rules_applies_to_check
    check (applies_to in ('produzido', 'faturado', 'recebido', 'bruto', 'liquido'));
