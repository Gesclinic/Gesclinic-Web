import { describe, expect, it } from 'vitest';
import { calculateRepasseLine, resolveRepasseRule } from '../src/lib/repasseEnterpriseApi';

const line = {
  date: '2026-10-08',
  professional_id: 'professional-1',
  specialty: 'Neurologia',
  convenio_id: 'convenio-1',
  procedure_id: 'service-1',
  produced_amount: 1000,
  billed_amount: 900,
  received_amount: 800,
  glosa_amount: 0,
};

describe('repasse rule engine', () => {
  it('prefers the most specific matching rule before numeric priority', () => {
    const rules = [
      { id: 'general', is_active: true, professional_id: 'professional-1', priority: 1 },
      {
        id: 'specific',
        is_active: true,
        professional_id: 'professional-1',
        convenio_id: 'convenio-1',
        procedure_id: 'service-1',
        priority: 100,
      },
    ];

    expect(resolveRepasseRule(rules, line)?.id).toBe('specific');
  });

  it('requires every configured rule filter to match', () => {
    const rules = [{
      id: 'other-convenio',
      is_active: true,
      professional_id: 'professional-1',
      convenio_id: 'convenio-2',
      procedure_id: 'service-1',
    }];

    expect(resolveRepasseRule(rules, line)).toBeNull();
  });

  it('calculates progressive percentage from the selected base range', () => {
    const calculation = calculateRepasseLine({
      applies_to: 'recebido',
      percentage: 50,
      progressive_ranges: [
        { from: 0, to: 499.99, percentage: 40 },
        { from: 500, to: null, percentage: 65 },
      ],
    }, line);

    expect(calculation.base).toBe(800);
    expect(calculation.gross).toBe(520);
    expect(calculation.percentageApplied).toBe(65);
  });

  it('supports fixed value with floor and ceiling constraints', () => {
    const calculation = calculateRepasseLine({
      applies_to: 'produzido',
      fixed_value: 300,
      floor_value: 100,
      ceiling_value: 250,
    }, line);

    expect(calculation.gross).toBe(250);
    expect(calculation.percentageApplied).toBe(0);
  });
});
