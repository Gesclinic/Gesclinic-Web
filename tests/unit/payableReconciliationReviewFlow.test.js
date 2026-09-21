import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const conciliationPage = readFileSync(resolve('src/pages/clinica/financeiro/ConciliacaoBancaria.jsx'), 'utf8');
const conciliationHook = readFileSync(resolve('src/hooks/useConciliation.js'), 'utf8');
const conciliationApi = readFileSync(resolve('src/lib/conciliationApi.js'), 'utf8');
const payablesReview = readFileSync(resolve('src/components/financeiro/conciliacao/ConciliacaoPayablesReview.jsx'), 'utf8');
const runPayableMatchingBlock = conciliationHook.match(
  /const runPayableMatching = useCallback\([\s\S]*?\n  \}, \[clinicId, loadPayableReviews\]\);/,
)?.[0] || '';

describe('fluxo de revisao de conciliacao AP', () => {
  it('mantem o matching AP apontando para revisao apos executar a rotina inteligente', () => {
    expect(conciliationPage).toContain("runPayableMatching('review')");
    expect(conciliationHook).toContain("const runPayableMatching = useCallback(async (nextStatus = 'review')");
    expect(runPayableMatchingBlock).toContain('setPayableReviewStatus(nextStatus)');
    expect(runPayableMatchingBlock).toContain('await loadPayableReviews(nextStatus)');
    expect(runPayableMatchingBlock).not.toContain('await loadPayableReviews(payableReviewStatus)');
  });

  it('usa mensagens em portugues na revisao AP de conciliacao bancaria', () => {
    expect(conciliationPage).toContain('correspondência(s) de Contas a Pagar encontrada(s) para revisão');
    expect(payablesReview).toContain('Revisão de Correspondências de Contas a Pagar');
    expect(payablesReview).toContain('Rodar conciliação AP');
    expect(payablesReview).toContain('Nenhuma correspondência de AP encontrada para o filtro atual.');

    expect(conciliationPage).not.toContain('match(es) de Contas a Pagar encontrados para revisao');
    expect(payablesReview).not.toContain('Rodar Matching AP');
    expect(payablesReview).not.toContain('Nenhum match de AP');
  });

  it('preserva filtros de revisao, aprovado, rejeitado e todos na API de conciliacao AP', () => {
    expect(conciliationApi).toContain("if (status === 'matched')");
    expect(conciliationApi).toContain("if (status === 'rejected')");
    expect(conciliationApi).toContain("if (status === 'all')");
    expect(conciliationApi).toContain('CONCILIATION_STATUS.PENDING');
    expect(conciliationApi).toContain('CONCILIATION_STATUS.CONCILIATED');
    expect(conciliationApi).toContain('CONCILIATION_STATUS.DIVERGENT');
    expect(conciliationApi).toContain("status: 'REJECTED'");
  });

  it('usa contadores independentes do filtro atual na fila de revisao AP', () => {
    expect(conciliationApi).toContain('export async function listPayableReconciliationReviewCounts(clinicId)');
    expect(conciliationApi).toContain("listPayableReconciliationReviews(clinicId, 'review')");
    expect(conciliationApi).toContain("listPayableReconciliationReviews(clinicId, 'matched')");
    expect(conciliationApi).toContain("listPayableReconciliationReviews(clinicId, 'rejected')");
    expect(conciliationApi).toContain('all: review.length + matched.length + rejected.length');

    expect(conciliationHook).toContain('listPayableReconciliationReviewCounts');
    expect(conciliationHook).toContain('const [payableReviewCounts, setPayableReviewCounts]');
    expect(conciliationHook).toContain('await loadPayableReviewCounts()');
    expect(conciliationPage).toContain('reviewCounts={payableReviewCounts}');

    expect(payablesReview).toContain('reviewCounts = { review: 0, matched: 0, rejected: 0, all: 0 }');
    expect(payablesReview).toContain('Em revisão ({reviewCounts.review || 0})');
    expect(payablesReview).toContain('Aprovados ({reviewCounts.matched || 0})');
    expect(payablesReview).toContain('Rejeitados ({reviewCounts.rejected || 0})');
    expect(payablesReview).toContain('Todos ({reviewCounts.all || 0})');
    expect(payablesReview).not.toContain('reviews.reduce');
  });
});
