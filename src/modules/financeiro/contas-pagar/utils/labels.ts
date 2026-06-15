import {
  ApprovalStage,
  DreClassification,
  PayableApprovalAction,
  PayableStatus,
  PayableType,
  PaymentMethodType,
  RecurrenceType,
} from '../types';

export const PAYABLE_STATUS_LABELS: Record<PayableStatus, string> = {
  [PayableStatus.OPEN]: 'Aberto',
  [PayableStatus.APPROVING]: 'Em aprovação',
  [PayableStatus.APPROVED]: 'Aprovado',
  [PayableStatus.OVERDUE]: 'Vencido',
  [PayableStatus.PARTIAL]: 'Parcial',
  [PayableStatus.PAID]: 'Pago',
  [PayableStatus.BLOCKED]: 'Bloqueado',
  [PayableStatus.CANCELED]: 'Cancelado',
  [PayableStatus.NEGOTIATED]: 'Negociado',
  [PayableStatus.REVERSED]: 'Estornado',
};

export const PAYABLE_TYPE_LABELS: Record<PayableType, string> = {
  [PayableType.FIXED]: 'Fixa',
  [PayableType.VARIABLE]: 'Variável',
  [PayableType.TAX]: 'Imposto',
  [PayableType.PAYROLL]: 'Folha de pagamento',
  [PayableType.SUPPLIER]: 'Fornecedor',
  [PayableType.SERVICE]: 'Serviço',
  [PayableType.RENT]: 'Aluguel',
  [PayableType.UTILITIES]: 'Utilidades',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  [PaymentMethodType.PIX]: 'PIX',
  [PaymentMethodType.TED]: 'TED',
  [PaymentMethodType.DOC]: 'DOC',
  [PaymentMethodType.CASH]: 'Dinheiro',
  [PaymentMethodType.CREDIT_CARD]: 'Cartão de crédito',
  [PaymentMethodType.DEBIT_CARD]: 'Cartão de débito',
  [PaymentMethodType.BANK_SLIP]: 'Boleto',
  [PaymentMethodType.OTHER]: 'Outro',
};

export const DRE_CLASSIFICATION_LABELS: Record<DreClassification, string> = {
  [DreClassification.OPERATIONAL]: 'Operacional',
  [DreClassification.ADMINISTRATIVE]: 'Administrativa',
  [DreClassification.ASSISTENTIAL]: 'Assistencial',
  [DreClassification.FINANCIAL]: 'Financeira',
  [DreClassification.TAX]: 'Tributária',
  [DreClassification.MEDICAL_REPASS]: 'Repasse médico',
};

export const RECURRENCE_TYPE_LABELS: Record<RecurrenceType, string> = {
  [RecurrenceType.DAILY]: 'Diária',
  [RecurrenceType.WEEKLY]: 'Semanal',
  [RecurrenceType.BIWEEKLY]: 'Quinzenal',
  [RecurrenceType.MONTHLY]: 'Mensal',
  [RecurrenceType.QUARTERLY]: 'Trimestral',
  [RecurrenceType.SEMIANNUAL]: 'Semestral',
  [RecurrenceType.ANNUAL]: 'Anual',
};

export const APPROVAL_STAGE_LABELS: Record<ApprovalStage, string> = {
  [ApprovalStage.LAUNCHED]: 'Lançada',
  [ApprovalStage.REVIEWED]: 'Conferida',
  [ApprovalStage.APPROVED]: 'Aprovada',
  [ApprovalStage.RELEASED]: 'Liberada',
  [ApprovalStage.PAID]: 'Paga',
};

export const APPROVAL_ACTION_LABELS: Record<PayableApprovalAction, string> = {
  [PayableApprovalAction.SEND_TO_APPROVAL]: 'Enviada para aprovação',
  [PayableApprovalAction.CHECK]: 'Conferida',
  [PayableApprovalAction.APPROVE]: 'Aprovada',
  [PayableApprovalAction.RELEASE]: 'Liberada',
  [PayableApprovalAction.BLOCK]: 'Bloqueada',
  [PayableApprovalAction.REVERSE]: 'Estornada',
};

const reconciliationStatusLabels: Record<string, string> = {
  MATCHED: 'Conciliada',
  AWAITING_REVIEW: 'Aguardando revisão',
  REJECTED: 'Rejeitada',
  matched: 'Conciliada',
  review: 'Para revisão',
  unmatched: 'Sem conciliação',
  rejected: 'Rejeitada',
};

const matchTypeLabels: Record<string, string> = {
  auto_exact: 'Correspondência exata automática',
  auto_fuzzy: 'Correspondência provável automática',
  auto_partial: 'Correspondência parcial automática',
  manual: 'Manual',
  manual_approved: 'Aprovada manualmente',
};

export function labelPayableStatus(status?: PayableStatus | string | null) {
  return status ? PAYABLE_STATUS_LABELS[status as PayableStatus] || String(status) : '';
}

export function labelPaymentMethod(method?: PaymentMethodType | string | null) {
  return method ? PAYMENT_METHOD_LABELS[method as PaymentMethodType] || String(method) : '';
}

export function labelPayableType(type?: PayableType | string | null) {
  return type ? PAYABLE_TYPE_LABELS[type as PayableType] || String(type) : '';
}

export function labelDreClassification(classification?: DreClassification | string | null) {
  return classification ? DRE_CLASSIFICATION_LABELS[classification as DreClassification] || String(classification) : '';
}

export function labelRecurrenceType(type?: RecurrenceType | string | null) {
  return type ? RECURRENCE_TYPE_LABELS[type as RecurrenceType] || String(type) : '';
}

export function labelApprovalStage(stage?: ApprovalStage | string | null) {
  return stage ? APPROVAL_STAGE_LABELS[stage as ApprovalStage] || String(stage) : '';
}

export function labelApprovalAction(action?: PayableApprovalAction | string | null) {
  return action ? APPROVAL_ACTION_LABELS[action as PayableApprovalAction] || String(action) : '';
}

export function labelReconciliationStatus(status?: string | null) {
  return status ? reconciliationStatusLabels[status] || String(status) : '';
}

export function labelReconciliationMatchType(matchType?: string | null) {
  return matchType ? matchTypeLabels[matchType] || String(matchType) : '';
}