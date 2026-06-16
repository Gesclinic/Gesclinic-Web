import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const payablesPage = readFileSync(resolve('src/modules/financeiro/contas-pagar/pages/index.tsx'), 'utf8');
const payablesTable = readFileSync(resolve('src/modules/financeiro/contas-pagar/components/PayablesTable.tsx'), 'utf8');
const createEditModal = readFileSync(resolve('src/modules/financeiro/contas-pagar/components/modals/CreateEditPayableModal.tsx'), 'utf8');
const payModal = readFileSync(resolve('src/modules/financeiro/contas-pagar/components/modals/PayPayableModal.tsx'), 'utf8');
const legacyPaymentModal = readFileSync(resolve('src/modules/financeiro/contas-pagar/components/modals/PaymentModal.tsx'), 'utf8');
const legacyPayableFormModal = readFileSync(resolve('src/modules/financeiro/contas-pagar/components/modals/PayableFormModal.tsx'), 'utf8');
const installmentModal = readFileSync(resolve('src/modules/financeiro/contas-pagar/components/modals/InstallmentModal.tsx'), 'utf8');
const approvalDrawer = readFileSync(resolve('src/modules/financeiro/contas-pagar/components/ApprovalWorkflowDrawer.tsx'), 'utf8');
const reconciliationReview = readFileSync(resolve('src/components/financeiro/conciliacao/ConciliacaoPayablesReview.jsx'), 'utf8');
const labels = readFileSync(resolve('src/modules/financeiro/contas-pagar/utils/labels.ts'), 'utf8');

describe('rotulos em portugues na superficie de contas a pagar', () => {
  it('centraliza labels PT-BR para status, pagamento, tipo, recorrencia e conciliacao', () => {
    expect(labels).toContain('PAYABLE_STATUS_LABELS');
    expect(labels).toContain('PAYMENT_METHOD_LABELS');
    expect(labels).toContain('PAYABLE_TYPE_LABELS');
    expect(labels).toContain('RECURRENCE_TYPE_LABELS');
    expect(labels).toContain('labelReconciliationMatchType');
    expect(labels).toContain("[PaymentMethodType.CREDIT_CARD]: 'Cartão de crédito'");
    expect(labels).toContain("auto_fuzzy: 'Correspondência provável automática'");
  });

  it('nao renderiza status, tipos ou conciliacao como codigos crus na pagina principal', () => {
    expect(payablesPage).toContain('labelPayableStatus(filters.status)');
    expect(payablesPage).toContain('labelPayableType(filters.type)');
    expect(payablesPage).toContain('labelPaymentMethod(filters.paymentMethod)');
    expect(payablesPage).toContain('labelReconciliationMatchType(match.match_type)');
    expect(payablesPage).toContain('sem conciliação');

    expect(payablesPage).not.toContain('sem match');
    expect(payablesPage).not.toContain('Status: ${filters.status}');
    expect(payablesPage).not.toContain('Tipo: ${filters.type}');
    expect(payablesPage).not.toContain('Pagamento: ${filters.paymentMethod}');
    expect(payablesPage).not.toContain('forma: payable.payment_method');
    expect(payablesPage).not.toContain('status: payable.status');
    expect(payablesPage).not.toContain('{match.match_type}');
  });

  it('traduz enums exibidos na tabela e nos modais operacionais', () => {
    expect(payablesTable).toContain('labelPaymentMethod(payable.payment_method)');
    expect(createEditModal).toContain('labelPayableType(type)');
    expect(createEditModal).toContain('labelPaymentMethod(method)');
    expect(createEditModal).toContain('labelDreClassification(classification)');
    expect(createEditModal).toContain('labelRecurrenceType(type)');
    expect(payModal).toContain('labelPaymentMethod(method)');
    expect(approvalDrawer).toContain('labelPayableStatus(payable.status)');
    expect(approvalDrawer).toContain('labelApprovalAction(event.action)');

    expect(payablesTable).not.toContain('{payable.payment_method ||');
    expect(createEditModal).not.toContain('>{type}</SelectItem>');
    expect(createEditModal).not.toContain('>{method}</SelectItem>');
    expect(payModal).not.toContain('>{method}</SelectItem>');
    expect(approvalDrawer).not.toContain('{payable.status}</Badge>');
    expect(approvalDrawer).not.toContain('{event.action}</span>');
  });

  it('traduz conciliacao bancaria AP e modais auxiliares sem listas paralelas divergentes', () => {
    expect(reconciliationReview).toContain('labelReconciliationMatchType(transaction.match_type)');
    expect(reconciliationReview).toContain("labelReconciliationStatus(transaction.status || 'review')");
    expect(reconciliationReview).toContain('Revisão de Correspondências de Contas a Pagar');
    expect(reconciliationReview).toContain('Rodar conciliação AP');
    expect(reconciliationReview).toContain('Nenhuma correspondência de AP encontrada');
    expect(legacyPaymentModal).toContain('Object.values(PaymentMethodType)');
    expect(legacyPaymentModal).toContain('labelPaymentMethod(value)');
    expect(legacyPayableFormModal).toContain('Object.values(PayableType)');
    expect(legacyPayableFormModal).toContain('labelPayableType(value)');
    expect(installmentModal).toContain('Prévia do parcelamento');

    expect(reconciliationReview).not.toContain("{transaction.match_type || '-'}");
    expect(reconciliationReview).not.toContain("{transaction.status || 'review'}");
    expect(reconciliationReview).not.toContain('Rodar Matching AP');
    expect(reconciliationReview).not.toContain('Nenhum match de AP');
    expect(legacyPaymentModal).not.toContain("{ value: 'CREDIT_CARD', label:");
    expect(legacyPayableFormModal).not.toContain("{ value: 'SUPPLIER', label:");
    expect(installmentModal).not.toContain('Parcelamento Preview');
    expect(installmentModal).not.toContain('onClose();\n      onClose();');
  });
});
