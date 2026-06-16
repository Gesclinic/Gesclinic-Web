import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const payableSummary = readFileSync(resolve('src/components/financeiro/PayableSummary.jsx'), 'utf8');
const financialInsights = readFileSync(resolve('src/lib/financialInsights.ts'), 'utf8');
const appRoutes = readFileSync(resolve('src/AppRoutes.jsx'), 'utf8');
const payablesPage = readFileSync(
  resolve('src/modules/financeiro/contas-pagar/pages/index.tsx'),
  'utf8',
);

const operationalOpenStatusQuery = 'status=open,partial,approved,overdue';

describe('atalhos de contas a pagar vindos do fluxo de caixa', () => {
  it('mantem os atalhos alinhados com o total operacional em aberto', () => {
    [payableSummary, financialInsights, appRoutes].forEach((source) => {
      expect(source).toContain(operationalOpenStatusQuery);
    });

    expect(payableSummary).toMatch(/\['OPEN',\s*'PARTIAL',\s*'APPROVED',\s*'OVERDUE'\]\.includes\(status\)/);
    expect(payableSummary).not.toContain('/clinica/financeiro/contas-pagar?from=fluxo-caixa&trace=payable-summary&status=open\'');
    expect(financialInsights).not.toContain('/clinica/financeiro/contas-pagar?from=fluxo-caixa&trace=financial-insight&status=open\'');
  });

  it('converte status multiplos da URL em filtro .in para ap_bills', () => {
    expect(payablesPage).toContain('function normalizePayableStatusParams(values: string[]): PayableStatus[]');
    expect(payablesPage).toMatch(/values\s*\.flatMap\(\(value\) => value\.split\(','\)\)/);
    expect(payablesPage).toContain("statusList: statusList.length > 1 ? statusList : undefined");
    expect(payablesPage).toContain('status: filters.statusList?.length ? filters.statusList : filters.status ? [filters.status as PayableStatus] : undefined');
    expect(payablesPage).toContain('status: e.target.value, statusList: undefined');
  });
});
