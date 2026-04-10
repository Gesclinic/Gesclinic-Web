/**
 * Configuração de Formas de Pagamento
 * Define estrutura, campos obrigatórios e validações para cada forma de pagamento
 */

export const PAYMENT_METHODS = {
  DINHEIRO: 'DINHEIRO',
  CARTAO: 'CARTAO',
  PIX: 'PIX',
  CHEQUE: 'CHEQUE',
  BOLETO: 'BOLETO',
  DOC: 'DOC',
  TED: 'TED',
  DEPOSITO: 'DEPOSITO',
};

export const PAYMENT_METHOD_LABELS = {
  DINHEIRO: '💵 Dinheiro',
  CARTAO: '💳 Cartão',
  PIX: '📱 PIX',
  CHEQUE: '📋 Cheque',
  BOLETO: '📄 Boleto',
  DOC: '🏦 DOC',
  TED: '⚡ TED',
  DEPOSITO: '💰 Depósito',
};

/**
 * Bandeiras de cartão suportadas
 */
export const CARD_BRANDS = [
  { id: 'VISA', label: 'VISA' },
  { id: 'MASTERCARD', label: 'Mastercard' },
  { id: 'ELO', label: 'Elo' },
  { id: 'AMEX', label: 'American Express' },
  { id: 'HIPERCARD', label: 'Hipercard' },
];

/**
 * Configuração de cada forma de pagamento
 */
export const PAYMENT_METHOD_CONFIG = {
  [PAYMENT_METHODS.DINHEIRO]: {
    label: PAYMENT_METHOD_LABELS.DINHEIRO,
    color: 'green',
    icon: '💵',
    fields: [
      { id: 'value_received', label: 'Valor Recebido (R$)', type: 'number', required: true },
      { id: 'change', label: 'Troco (R$)', type: 'number', required: false, disabled: true },
      { id: 'notes', label: 'Observações', type: 'textarea', required: false },
    ],
    accountingAccount: 'CAIXA', // Plano de contas padrão
    receivableType: 'CASH', // Tipo de conta a receber
  },

  [PAYMENT_METHODS.CARTAO]: {
    label: PAYMENT_METHOD_LABELS.CARTAO,
    color: 'purple',
    icon: '💳',
    fields: [
      { id: 'card_brand', label: 'Bandeira', type: 'select', required: true, options: CARD_BRANDS },
      { id: 'card_last_digits', label: 'Últimos 4 Dígitos', type: 'text', required: true, maxLength: 4, mask: 'numeric' },
      { id: 'card_holder_name', label: 'Nome do Titular', type: 'text', required: false },
      { id: 'card_installments', label: 'Nº de Parcelas', type: 'select', required: true, options: Array.from({length: 12}, (_, i) => ({
        id: `${i+1}`,
        label: `${i+1}x`
      })) },
      { id: 'receipt_number', label: 'Nº Autorização/Comprovante', type: 'text', required: true },
      { id: 'processor', label: 'Operadora/Gateway', type: 'text', required: false, placeholder: 'Rede, Cielo, Adyen, etc' },
      { id: 'notes', label: 'Observações', type: 'textarea', required: false },
    ],
    accountingAccount: 'CARTAO_RECEBER', // Plano de contas padrão
    receivableType: 'CREDIT_CARD', // Tipo de conta a receber
  },

  [PAYMENT_METHODS.PIX]: {
    label: PAYMENT_METHOD_LABELS.PIX,
    color: 'blue',
    icon: '📱',
    fields: [
      { id: 'pix_identifier', label: 'Identificador PIX (Chave/CPF/Telefone)', type: 'text', required: true, placeholder: 'email@example.com ou 000.000.000-00' },
      { id: 'pix_transaction_id', label: 'ID da Transação PIX (E2ID)', type: 'text', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { id: 'bank_account', label: 'Conta Bancária Destino', type: 'select', required: true },
      { id: 'pix_timestamp', label: 'Data/Hora do PIX', type: 'datetime-local', required: true },
      { id: 'notes', label: 'Observações', type: 'textarea', required: false },
    ],
    accountingAccount: 'PIX_RECEBER', // Plano de contas padrão
    receivableType: 'PIX', // Tipo de conta a receber
  },

  [PAYMENT_METHODS.CHEQUE]: {
    label: PAYMENT_METHOD_LABELS.CHEQUE,
    color: 'yellow',
    icon: '📋',
    fields: [
      { id: 'check_bank', label: 'Banco', type: 'text', required: true, placeholder: 'BB, Caixa, Itaú, etc' },
      { id: 'check_agency', label: 'Agência', type: 'text', required: true, maxLength: 5, mask: 'numeric' },
      { id: 'check_account', label: 'Conta', type: 'text', required: true, placeholder: '123456-7' },
      { id: 'check_number', label: 'Número do Cheque', type: 'text', required: true, maxLength: 10, mask: 'numeric' },
      { id: 'check_due_date', label: 'Data de Compensação', type: 'date', required: true },
      { id: 'check_owner_name', label: 'Nome do Titular', type: 'text', required: false },
      { id: 'notes', label: 'Observações', type: 'textarea', required: false },
    ],
    accountingAccount: 'CHEQUES_RECEBER', // Plano de contas padrão
    receivableType: 'CHECK', // Tipo de conta a receber
    warning: 'Cheque pré-datado! Registre como pendente de compensação.',
  },

  [PAYMENT_METHODS.BOLETO]: {
    label: PAYMENT_METHOD_LABELS.BOLETO,
    color: 'indigo',
    icon: '📄',
    fields: [
      { id: 'boleto_number', label: 'Código de Barras (47 dígitos)', type: 'text', required: true, maxLength: 47, mask: 'numeric', placeholder: '00000.00000 00000.000000 00000.000000 0 00000000000000' },
      { id: 'boleto_bank', label: 'Banco', type: 'text', required: true, placeholder: 'Caixa, Itaú, etc' },
      { id: 'boleto_amount', label: 'Valor do Boleto (R$)', type: 'number', required: true },
      { id: 'boleto_due_date', label: 'Data de Vencimento', type: 'date', required: true },
      { id: 'boleto_received_date', label: 'Data de Recebimento', type: 'date', required: false },
      { id: 'notes', label: 'Observações', type: 'textarea', required: false },
    ],
    accountingAccount: 'BOLETOS_RECEBER',
    receivableType: 'BOLETO',
    warning: 'Boleto para compensação futura! Registre como pendente de recebimento.',
  },

  [PAYMENT_METHODS.DOC]: {
    label: PAYMENT_METHOD_LABELS.DOC,
    color: 'cyan',
    icon: '🏦',
    fields: [
      { id: 'doc_bank', label: 'Banco Origem', type: 'text', required: true, placeholder: 'Caixa, Itaú, Bradesco, etc' },
      { id: 'doc_agency', label: 'Agência Origem', type: 'text', required: true, mask: 'numeric' },
      { id: 'doc_account', label: 'Conta Origem', type: 'text', required: true, placeholder: '123456-7' },
      { id: 'doc_account_owner', label: 'Titular da Conta', type: 'text', required: true },
      { id: 'doc_cpf_cnpj', label: 'CPF/CNPJ do Titular', type: 'text', required: true, mask: 'numeric' },
      { id: 'doc_transaction_id', label: 'Identificador de Transação DOC', type: 'text', required: false, placeholder: 'Nº DOC ou UR' },
      { id: 'doc_date', label: 'Data da Transação', type: 'date', required: true },
      { id: 'notes', label: 'Observações', type: 'textarea', required: false },
    ],
    accountingAccount: 'TRANSFERENCIAS_RECEBER',
    receivableType: 'TRANSFER',
    warning: 'DOC pode levar até 2 dias úteis para compensação.',
  },

  [PAYMENT_METHODS.TED]: {
    label: PAYMENT_METHOD_LABELS.TED,
    color: 'rose',
    icon: '⚡',
    fields: [
      { id: 'ted_bank', label: 'Banco Origem', type: 'text', required: true, placeholder: 'Caixa, Itaú, Bradesco, etc' },
      { id: 'ted_agency', label: 'Agência Origem', type: 'text', required: true, mask: 'numeric' },
      { id: 'ted_account', label: 'Conta Origem', type: 'text', required: true, placeholder: '123456-7' },
      { id: 'ted_account_owner', label: 'Titular da Conta', type: 'text', required: true },
      { id: 'ted_cpf_cnpj', label: 'CPF/CNPJ do Titular', type: 'text', required: true, mask: 'numeric' },
      { id: 'ted_transaction_id', label: 'Identificador de Transação TED', type: 'text', required: true, placeholder: 'Número do comprovante' },
      { id: 'ted_date', label: 'Data/Hora da Transação', type: 'datetime-local', required: true },
      { id: 'notes', label: 'Observações', type: 'textarea', required: false },
    ],
    accountingAccount: 'TRANSFERENCIAS_RECEBER',
    receivableType: 'TRANSFER',
    warning: 'TED é processada em tempo real (horário comercial).',
  },

  [PAYMENT_METHODS.DEPOSITO]: {
    label: PAYMENT_METHOD_LABELS.DEPOSITO,
    color: 'amber',
    icon: '💰',
    fields: [
      { id: 'deposit_bank', label: 'Banco Destino', type: 'text', required: true, placeholder: 'Caixa, Itaú, Bradesco, etc' },
      { id: 'deposit_agency', label: 'Agência Destino', type: 'text', required: true, mask: 'numeric' },
      { id: 'deposit_account', label: 'Conta Destino', type: 'text', required: true, placeholder: '123456-7' },
      { id: 'deposit_account_type', label: 'Tipo de Conta', type: 'select', required: true, options: [
        { id: 'corrente', label: 'Corrente' },
        { id: 'poupanca', label: 'Poupança' }
      ]},
      { id: 'deposit_amount', label: 'Valor Depositado (R$)', type: 'number', required: true },
      { id: 'deposit_receipt', label: 'Número do Comprovante', type: 'text', required: true },
      { id: 'deposit_date', label: 'Data de Depósito', type: 'date', required: true },
      { id: 'notes', label: 'Observações', type: 'textarea', required: false },
    ],
    accountingAccount: 'DEPOSITOS_RECEBER',
    receivableType: 'DEPOSIT',
  },
};

/**
 * Estado padrão de pagamento
 */
export const defaultPaymentData = {
  payment_method: PAYMENT_METHODS.DINHEIRO,
  amount: '0.00',
  payment_received_by: null, // Quem recebeu (caixa/operador)
  payment_received_at: null, // Quando recebeu (timestamp)
  payment_notes: '', // Observações gerais
  
  // DESCONTO - com autorização
  discount: '0.00',
  discount_reason: '', // Motivo do desconto
  discount_authorized_by: null, // ID do admin que autorizou
  discount_authorized_at: null, // Data/hora da autorização
  discount_observation: '', // Observações sobre o desconto
  
  // PLANO DE CONTAS (Faturamento)
  plano_contas_id: '',
  
  // Campos dinâmicos por forma
  dinheiro: {
    value_received: '',
    change: '',
    notes: '',
  },
  
  cartao: {
    card_brand: '',
    card_last_digits: '',
    card_holder_name: '',
    card_installments: '1',
    receipt_number: '',
    processor: '',
    notes: '',
  },
  
  pix: {
    pix_identifier: '',
    pix_transaction_id: '',
    bank_account: '', // ID da conta bancária
    pix_timestamp: '',
    notes: '',
  },
  
  cheque: {
    check_bank: '',
    check_agency: '',
    check_account: '',
    check_number: '',
    check_due_date: '',
    check_owner_name: '',
    notes: '',
  },
  
  boleto: {
    boleto_number: '',
    boleto_bank: '',
    boleto_amount: '',
    boleto_due_date: '',
    boleto_received_date: '',
    notes: '',
  },

  doc: {
    doc_bank: '',
    doc_agency: '',
    doc_account: '',
    doc_account_owner: '',
    doc_cpf_cnpj: '',
    doc_transaction_id: '',
    doc_date: '',
    notes: '',
  },

  ted: {
    ted_bank: '',
    ted_agency: '',
    ted_account: '',
    ted_account_owner: '',
    ted_cpf_cnpj: '',
    ted_transaction_id: '',
    ted_date: '',
    notes: '',
  },

  deposito: {
    deposit_bank: '',
    deposit_agency: '',
    deposit_account: '',
    deposit_account_type: 'corrente',
    deposit_amount: '',
    deposit_receipt: '',
    deposit_date: '',
    notes: '',
  },
};

/**
 * Valida os dados de pagamento para uma forma específica
 */
export function validatePaymentData(paymentMethod, paymentData) {
  const config = PAYMENT_METHOD_CONFIG[paymentMethod];
  if (!config) return { valid: false, errors: ['Forma de pagamento inválida'] };

  const errors = [];
  const data = paymentData[getPaymentMethodKey(paymentMethod)] || {};

  config.fields.forEach(field => {
    if (field.required && !data[field.id]) {
      errors.push(`${field.label} é obrigatório`);
    }

    // Validações específicas
    if (paymentMethod === PAYMENT_METHODS.CARTAO && field.id === 'card_last_digits') {
      if (data[field.id] && !/^\d{4}$/.test(data[field.id])) {
        errors.push('Últimos 4 dígitos devem conter apenas números');
      }
    }

    if (paymentMethod === PAYMENT_METHODS.PIX && field.id === 'pix_transaction_id') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (data[field.id] && !uuidRegex.test(data[field.id])) {
        errors.push('ID da Transação deve ser um UUID válido');
      }
    }

    if (paymentMethod === PAYMENT_METHODS.BOLETO && field.id === 'boleto_number') {
      if (data[field.id] && !/^\d{47}$/.test(data[field.id].replace(/\D/g, ''))) {
        errors.push('Código de barras deve conter 47 dígitos');
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Retorna o nome da chave do estado baseado na forma de pagamento
 */
export function getPaymentMethodKey(paymentMethod) {
  switch (paymentMethod) {
    case PAYMENT_METHODS.DINHEIRO: return 'dinheiro';
    case PAYMENT_METHODS.CARTAO: return 'cartao';
    case PAYMENT_METHODS.PIX: return 'pix';
    case PAYMENT_METHODS.CHEQUE: return 'cheque';
    case PAYMENT_METHODS.BOLETO: return 'boleto';
    case PAYMENT_METHODS.DOC: return 'doc';
    case PAYMENT_METHODS.TED: return 'ted';
    case PAYMENT_METHODS.DEPOSITO: return 'deposito';
    default: return 'dinheiro';
  }
}

/**
 * Retorna a configuração de cont ability (plano de contas) para uma forma de pagamento
 */
export function getAccountingAccountForPayment(paymentMethod) {
  const config = PAYMENT_METHOD_CONFIG[paymentMethod];
  return config?.accountingAccount || 'CAIXA';
}

/**
 * Retorna o tipo de conta a receber para uma forma de pagamento
 */
export function getReceivableTypeForPayment(paymentMethod) {
  const config = PAYMENT_METHOD_CONFIG[paymentMethod];
  return config?.receivableType || 'CASH';
}
