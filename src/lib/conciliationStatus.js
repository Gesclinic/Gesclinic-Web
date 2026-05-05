// src/lib/conciliationStatus.js
// Constantes e tipos para Conciliação Bancária

/**
 * Status de um lançamento de extrato bancário
 */
export const CONCILIATION_STATUS = {
  PENDING: 'pending', // 🟡 Ainda não conciliado
  CONCILIATED: 'conciliated', // 🟢 Casado com lançamento
  ADJUSTED: 'adjusted', // 🔵 Gerou lançamento automático
  DIVERGENT: 'divergent', // 🔴 Valor ou data não batem
  IGNORED: 'ignored', // ⚠ Não entra no financeiro
};

/**
 * Mapa visual para status
 */
export const CONCILIATION_STATUS_VISUAL = {
  [CONCILIATION_STATUS.PENDING]: {
    label: 'Pendente',
    color: 'yellow',
    icon: '🟡',
    className: 'bg-yellow-100 text-yellow-800',
  },
  [CONCILIATION_STATUS.CONCILIATED]: {
    label: 'Conciliado',
    color: 'green',
    icon: '🟢',
    className: 'bg-green-100 text-green-800',
  },
  [CONCILIATION_STATUS.ADJUSTED]: {
    label: 'Ajustado',
    color: 'blue',
    icon: '🔵',
    className: 'bg-blue-100 text-blue-800',
  },
  [CONCILIATION_STATUS.DIVERGENT]: {
    label: 'Divergente',
    color: 'red',
    icon: '🔴',
    className: 'bg-red-100 text-red-800',
  },
  [CONCILIATION_STATUS.IGNORED]: {
    label: 'Ignorado',
    color: 'gray',
    icon: '⚠',
    className: 'bg-gray-100 text-gray-800',
  },
};

/**
 * Tipo de transação bancária
 */
export const TRANSACTION_TYPE = {
  CREDIT: 'credit', // Entrada
  DEBIT: 'debit', // Saída
};

/**
 * Mapa de tipos de transação
 */
export const TRANSACTION_TYPE_LABELS = {
  [TRANSACTION_TYPE.CREDIT]: 'Crédito (Entrada)',
  [TRANSACTION_TYPE.DEBIT]: 'Débito (Saída)',
};

/**
 * Tipos de lançamentos financeiros vinculáveis
 */
export const FINANCIAL_LINK_TYPE = {
  PAYABLE: 'payable', // Contas a Pagar
  RECEIVABLE: 'receivable', // Contas a Receber
};

/**
 * Ações de conciliação (para histórico)
 */
export const CONCILIATION_ACTION = {
  CONCILIATE: 'conciliate', // Vinculou com lançamento existente
  ADJUST: 'adjust', // Criou lançamento automático
  DIVERGENT: 'divergent', // Marcou como divergente
  IGNORE: 'ignore', // Ignorou
  UNLINK: 'unlink', // Desvinculou
};

/**
 * Limites padrão para sugestão automática
 */
export const SUGGESTION_LIMITS = {
  MAX_DAYS_DIFFERENCE: 2, // Máximo 2 dias de diferença
  MIN_MATCH_SCORE: 0.7, // Mínimo 70% de similaridade
};

/**
 * Palavras-chave para regras automáticas padrão
 */
export const DEFAULT_AUTO_RULES = [
  {
    rule_name: 'Tarifas Bancárias',
    pattern_keywords: ['tarifa', 'taxa', 'saldo', 'manutenção', 'juros'],
    transaction_type: TRANSACTION_TYPE.DEBIT,
    default_category: 'Tarifas Bancárias',
    priority: 100,
  },
  {
    rule_name: 'DOC/TED Enviado',
    pattern_keywords: ['doc', 'ted', 'transferência', 'enviado'],
    transaction_type: TRANSACTION_TYPE.DEBIT,
    default_category: 'Transferências Bancárias',
    priority: 90,
  },
  {
    rule_name: 'PIX Recebido',
    pattern_keywords: ['pix', 'recebido'],
    transaction_type: TRANSACTION_TYPE.CREDIT,
    default_category: 'Receita de Serviços',
    priority: 85,
  },
  {
    rule_name: 'Cheque Depositado',
    pattern_keywords: ['cheque', 'compensação'],
    transaction_type: TRANSACTION_TYPE.CREDIT,
    default_category: 'Receita de Serviços',
    priority: 80,
  },
];

/**
 * Métodos padrão de importação
 */
export const IMPORT_FORMATS = {
  OFX: 'ofx', // Open Financial Exchange
  CSV: 'csv', // Comma-Separated Values
  TSV: 'tsv', // Tab-Separated Values
  JSON: 'json', // JSON format
};

/**
 * Campos esperados em cada formato
 */
export const IMPORT_FORMAT_FIELDS = {
  [IMPORT_FORMATS.CSV]: ['data', 'descricao', 'valor', 'tipo'],
  [IMPORT_FORMATS.TSV]: ['data', 'descricao', 'valor', 'tipo'],
  [IMPORT_FORMATS.OFX]: ['dtposted', 'memo', 'trnamt'],
  [IMPORT_FORMATS.JSON]: ['date', 'description', 'amount', 'type'],
};

/**
 * Mensagens padrão
 */
export const CONCILIATION_MESSAGES = {
  IMPORT_SUCCESS: 'Extrato importado com sucesso',
  IMPORT_ERROR: 'Erro ao importar extrato',
  CONCILIATE_SUCCESS: 'Lançamento conciliado com sucesso',
  CONCILIATE_ERROR: 'Erro ao conciliar lançamento',
  CREATE_SUCCESS: 'Lançamento criado e vinculado com sucesso',
  CREATE_ERROR: 'Erro ao criar lançamento',
  DIVERGENT_SUCCESS: 'Marcado como divergente',
  IGNORE_SUCCESS: 'Lançamento ignorado',
  UNLINK_SUCCESS: 'Vínculo removido',
};
