import React, { useEffect, useMemo, useRef, useState } from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Clock,
  ExternalLink,
  FileText,
  Save,
  Trash2,
  XCircle,
  ArrowUp,
  ArrowDown,
  GripVertical,
  RefreshCw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { SaveFilterDialog } from '@/components/clinica/financeiro/SaveFilterDialog';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  listReceivables,
  arStatusOptions,
  updateReceivable,
  deleteReceivable,
  registerReceivablePayment,
  registerReceivableGlosa,
  updateReceivableGlosaWorkflow,
  uploadReceivableGlosaEvidenceFile,
} from '@/lib/receivablesApi';
import { listAccountPlans, listCostCenters } from '@/lib/financeApi';
import { listProfessionals } from '@/lib/professionalsApi';
import { listPayers } from '@/lib/payersApi';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
// TODO: PHASE 3B - Enable FinancialIntegrationStatus after implementing bulk validation functions
// import FinancialIntegrationStatus from '@/components/clinica/financeiro/FinancialIntegrationStatus';
import RelatoriosToolbar from '@/components/financeiro/RelatoriosToolbar';
import ReceivableNfInput from '@/components/financeiro/ReceivableNfInput';

const emptyReceivableFilters = {
  payer: '',
  status: '',
  origin: '',
  payerType: '',
  payerId: '',
  professionalId: '',
  ccId: '',
  planId: '',
  emissionStart: '',
  emissionEnd: '',
  dueStart: '',
  dueEnd: '',
  receivedStart: '',
  receivedEnd: '',
  companyId: '',
  unitId: '',
  unitName: '',
  specialtyId: '',
  specialtyName: '',
  paymentMethod: '',
  insuranceBillingStatus: '',
  tissXmlStatus: '',
  insuranceReturnStatus: '',
  hasGlosa: '',
  documentExtraction: '',
  fiscalReview: '',
  minValue: '',
  maxValue: '',
  search: '',
};

const RECEIVABLES_PAGE_SIZE = 100;
const RECEIVABLE_COLUMNS_STORAGE_KEY = 'contas_receber_visible_columns_v1';
const receivableColumnOptions = [
  { key: 'payer', label: 'Pagador' },
  { key: 'description', label: 'Descrição' },
  { key: 'service', label: 'Serviço' },
  { key: 'serviceGroup', label: 'Grupo' },
  { key: 'payerContract', label: 'Convênio' },
  { key: 'professional', label: 'Profissional' },
  { key: 'unit', label: 'Unidade' },
  { key: 'specialty', label: 'Especialidade' },
  { key: 'paymentMethod', label: 'Forma de Pagamento' },
  { key: 'competence', label: 'Competência' },
  { key: 'dueDate', label: 'Vencimento' },
  { key: 'accountPlan', label: 'Plano de Contas' },
  { key: 'status', label: 'Status' },
  { key: 'nf', label: 'NF' },
  { key: 'insurance', label: 'TISS/Convênio' },
  { key: 'return', label: 'Retorno' },
  { key: 'gross', label: 'Bruto' },
  { key: 'cardFee', label: 'Taxa Cartão' },
  { key: 'received', label: 'Recebido' },
  { key: 'glosa', label: 'Glosa' },
  { key: 'repasse', label: 'Repasse' },
  { key: 'balance', label: 'Saldo' },
  { key: 'docs', label: 'Docs' },
];
const defaultVisibleReceivableColumns = receivableColumnOptions.reduce((acc, column) => {
  acc[column.key] = true;
  return acc;
}, {});
const defaultReceivableColumnOrder = receivableColumnOptions.map((column) => column.key);

const receivableTextReplacements = [
  [/SERVI�+OS/gi, 'SERVIÇOS'],
  [/\bSERVICOS\b/gi, 'SERVIÇOS'],
  [/M�+DICOS/gi, 'MÉDICOS'],
  [/\bMEDICOS\b/gi, 'MÉDICOS'],
  [/M�+DICO/gi, 'MÉDICO'],
  [/\bMEDICO\b/gi, 'MÉDICO'],
  [/\bMEDICA\b/gi, 'MÉDICA'],
  [/OP�+ES/gi, 'OPÇÕES'],
  [/OP�+O/gi, 'OPÇÃO'],
  [/\bOPCOES\b/gi, 'OPÇÕES'],
  [/\bOPCAO\b/gi, 'OPÇÃO'],
  [/INFORMA�+ES/gi, 'INFORMAÇÕES'],
  [/INFORMA�+O/gi, 'INFORMAÇÃO'],
  [/FUNDA�+O/gi, 'FUNDAÇÃO'],
  [/\bFUNDACAO\b/gi, 'FUNDAÇÃO'],
  [/\bS�+O\b/gi, 'SÃO'],
  [/\bSAO\b/gi, 'SÃO'],
  [/\bINFORMACOES\b/gi, 'INFORMAÇÕES'],
  [/\bINFORMACAO\b/gi, 'INFORMAÇÃO'],
  [/DESCRI�+O/gi, 'DESCRIÇÃO'],
  [/\bDESCRICAO\b/gi, 'DESCRIÇÃO'],
  [/ATEN�+O/gi, 'ATENÇÃO'],
  [/\bATENCAO\b/gi, 'ATENÇÃO'],
  [/EMISS�+O/gi, 'EMISSÃO'],
  [/\bEMISSAO\b/gi, 'EMISSÃO'],
  [/REVIS�+O/gi, 'REVISÃO'],
  [/\bREVISAO\b/gi, 'REVISÃO'],
  [/CONV�+NIO/gi, 'CONVÊNIO'],
  [/\bCONVENIO\b/gi, 'CONVÊNIO'],
  [/CART�+O/gi, 'CARTÃO'],
  [/\bCARTAO\b/gi, 'CARTÃO'],
  [/LAN�+AMENTO/gi, 'LANÇAMENTO'],
  [/\bLANCAMENTO\b/gi, 'LANÇAMENTO'],
  [/CL�+NICA/gi, 'CLÍNICA'],
  [/\bCLINICA\b/gi, 'CLÍNICA'],
  [/PR�+XIMOS/gi, 'PRÓXIMOS'],
  [/\bPROXIMOS\b/gi, 'PRÓXIMOS'],
  [/V�+LIDO/gi, 'VÁLIDO'],
  [/\bVALIDO\b/gi, 'VÁLIDO'],
  [/N�+O/gi, 'NÃO'],
  [/\bNAO\b/gi, 'NÃO'],
];

const receivableTextFields = [
  'payer_display',
  'payer_name',
  'patient_name',
  'description',
  'convenio_name',
  'professional_name',
  'profissional_name',
  'unit_name',
  'unidade_name',
  'clinic_unit_name',
  'specialty_name',
  'plano_contas_name',
  'insurance_billing_status',
  'tiss_xml_status',
  'insurance_return_status',
  'insurance_return_protocol',
  'insurance_invoice_number',
  'ans_registration',
  'guide_number',
  'payment_method',
  'forma_prevista',
  'received_payment_method',
  'card_brand',
  'processor_name',
];

function formatReceivableText(value) {
  if (!value) {
    return '';
  }

  return receivableTextReplacements.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    String(value),
  ).replace(/\s+/g, ' ').trim();
}

function formatReceivableRowTexts(row) {
  if (!row || typeof row !== 'object') {
    return row;
  }

  const formatted = { ...row };
  receivableTextFields.forEach((field) => {
    if (formatted[field] !== undefined && formatted[field] !== null) {
      formatted[field] = formatReceivableText(formatted[field]);
    }
  });

  if (Array.isArray(formatted.appointments)) {
    formatted.appointments = formatted.appointments.map((appointment) => ({
      ...appointment,
      notes: formatReceivableText(appointment?.notes),
      payment_method: formatReceivableText(appointment?.payment_method),
    }));
  }

  return formatted;
}

function mergeReceivableEnterpriseMetadata(row, enterprisePatch) {
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return {
    ...metadata,
    enterprise: {
      ...(metadata.enterprise || {}),
      ...enterprisePatch,
    },
  };
}

function normalizeReconciliationText(value) {
  return formatReceivableText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function reconciliationDateDiffDays(first, second) {
  if (!first || !second) {
    return 999;
  }
  const firstDate = new Date(`${String(first).split('T')[0]}T00:00:00`).getTime();
  const secondDate = new Date(`${String(second).split('T')[0]}T00:00:00`).getTime();
  if (Number.isNaN(firstDate) || Number.isNaN(secondDate)) {
    return 999;
  }
  return Math.abs(Math.round((firstDate - secondDate) / 86400000));
}

function scoreReceivableTransaction(receivable, transaction) {
  const grossAmount = getGrossAmount(receivable);
  const balanceAmount = getReceivableBalance(receivable);
  const paidAmount = Number(receivable.received_value || receivable.paid_total || 0);
  const candidateAmounts = [balanceAmount, grossAmount, Number(receivable.amount || 0), paidAmount]
    .filter((value) => Number.isFinite(value) && value > 0);
  const transactionAmount = Math.abs(Number(transaction.amount || 0));
  const bestAmountDiff = candidateAmounts.length
    ? Math.min(...candidateAmounts.map((amount) => Math.abs(amount - transactionAmount)))
    : 999999;
  const referenceAmount = candidateAmounts[0] || transactionAmount || 0;
  const amountTolerance = Math.max(0.05, referenceAmount * 0.01);
  const dateReference = receivable.received_date || receivable.payment_date || receivable.due_date || receivable.data_emissao || receivable.created_at;
  const days = reconciliationDateDiffDays(dateReference, transaction.transaction_date);
  const receivableText = normalizeReconciliationText([
    receivable.payer_display,
    receivable.payer_name,
    receivable.patient_name,
    receivable.convenio_name,
    receivable.description,
    receivable.insurance_invoice_number,
    receivable.guide_number,
  ].filter(Boolean).join(' '));
  const transactionText = normalizeReconciliationText(transaction.description);
  const textTokens = receivableText.split(' ').filter((token) => token.length >= 4);
  const tokenHits = textTokens.filter((token) => transactionText.includes(token)).length;

  let score = 0;
  const reasons = [];

  if (bestAmountDiff <= amountTolerance) {
    score += 55;
    reasons.push('valor exato');
  } else if (bestAmountDiff <= Math.max(5, referenceAmount * 0.05)) {
    score += 30;
    reasons.push('valor aproximado');
  }

  if (days <= 1) {
    score += 25;
    reasons.push('data D+1');
  } else if (days <= 7) {
    score += 15;
    reasons.push('data em 7 dias');
  }

  if (tokenHits >= 2) {
    score += 20;
    reasons.push('texto compatível');
  } else if (tokenHits === 1) {
    score += 10;
    reasons.push('texto parcial');
  }

  if (!transactionAmount || !candidateAmounts.length) {
    score = 0;
  }

  return {
    score: Math.min(score, 100),
    reason: reasons.join(', ') || 'sem evidência suficiente',
  };
}

function labelReceivableReconciliationMatchType(matchType) {
  const labels = {
    auto_exact: 'Correspondência exata automática',
    auto_fuzzy: 'Correspondência provável automática',
    auto_partial: 'Correspondência parcial automática',
    manual_approved: 'Aprovada manualmente',
  };
  return labels[matchType] || matchType || '';
}

function normalizeReceivableColumnOrder(order) {
  const availableKeys = new Set(defaultReceivableColumnOrder);
  const storedKeys = Array.isArray(order) ? order.filter((key) => availableKeys.has(key)) : [];
  return [...storedKeys, ...defaultReceivableColumnOrder.filter((key) => !storedKeys.includes(key))];
}

function loadReceivableColumnSettings() {
  try {
    const stored = localStorage.getItem(RECEIVABLE_COLUMNS_STORAGE_KEY);
    if (!stored) {
      return { visible: defaultVisibleReceivableColumns, order: defaultReceivableColumnOrder };
    }
    const parsed = JSON.parse(stored);
    const visible = parsed?.visible
      ? { ...defaultVisibleReceivableColumns, ...parsed.visible }
      : { ...defaultVisibleReceivableColumns, ...parsed };
    return {
      visible,
      order: normalizeReceivableColumnOrder(parsed?.order),
    };
  } catch {
    return { visible: defaultVisibleReceivableColumns, order: defaultReceivableColumnOrder };
  }
}

function loadVisibleReceivableColumns() {
  return loadReceivableColumnSettings().visible;
}

function loadReceivableColumnOrder() {
  return loadReceivableColumnSettings().order;
}

function getReceivableNfDisplay(row) {
  const extractionFields = row?.metadata?.document_extraction?.fields || {};
  const inferNumberFromXmlName = (value) => {
    const key = String(value || '').match(/([0-9]{40,60})\.xml$/i)?.[1] || '';
    if (!key) return null;
    const nfseNumber = key.match(/0{6,}([0-9]{3,6})2606/)?.[1];
    return nfseNumber || null;
  };
  const number = extractionFields.guide_number
    || extractionFields.numero_guia
    || extractionFields.nf_number
    || extractionFields.invoice_number
    || row?.insurance_invoice_number
    || row?.guide_number
    || inferNumberFromXmlName(row?.nf_document_name)
    || inferNumberFromXmlName(row?.metadata?.source_file_name)
    || row?.metadata?.guide_number
    || row?.metadata?.invoice_number
    || row?.metadata?.xml?.guide_number
    || null;
  const name = row?.nf_document_name || row?.metadata?.source_file_name || null;
  return {
    number,
    name,
    url: row?.nf_document_url || null,
  };
}

function buildFiltersFromSearchParams(searchParams) {
  return {
    ...emptyReceivableFilters,
    payer: searchParams.get('payer') || '',
    status: searchParams.get('status') || '',
    origin: searchParams.get('origin') || '',
    payerType: searchParams.get('payerType') || '',
    payerId: searchParams.get('payerId') || '',
    professionalId: searchParams.get('professionalId') || '',
    ccId: searchParams.get('ccId') || '',
    planId: searchParams.get('planId') || '',
    emissionStart: searchParams.get('emissionStart') || '',
    emissionEnd: searchParams.get('emissionEnd') || '',
    dueStart: searchParams.get('dueStart') || '',
    dueEnd: searchParams.get('dueEnd') || '',
    receivedStart: searchParams.get('receivedStart') || '',
    receivedEnd: searchParams.get('receivedEnd') || '',
    companyId: searchParams.get('companyId') || '',
    unitId: searchParams.get('unitId') || '',
    unitName: searchParams.get('unitName') || '',
    specialtyId: searchParams.get('specialtyId') || '',
    specialtyName: searchParams.get('specialtyName') || '',
    paymentMethod: searchParams.get('paymentMethod') || '',
    insuranceBillingStatus: searchParams.get('insuranceBillingStatus') || '',
    tissXmlStatus: searchParams.get('tissXmlStatus') || '',
    insuranceReturnStatus: searchParams.get('insuranceReturnStatus') || '',
    hasGlosa: searchParams.get('hasGlosa') || '',
    documentExtraction: searchParams.get('documentExtraction') || '',
    fiscalReview: searchParams.get('fiscalReview') || '',
    minValue: searchParams.get('minValue') || '',
    maxValue: searchParams.get('maxValue') || '',
    search: searchParams.get('search') || '',
  };
}

function getTodayDateOnly() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseDateOnly(value) {
  if (!value) return null;
  const datePart = String(value).split('T')[0];
  const parts = datePart.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function isReceivableOverdue(row) {
  if (['received', 'canceled', 'glossed'].includes(row.status)) return false;
  const dueDate = parseDateOnly(row.due_date || row.data_vencimento);
  if (!dueDate) return row.status === 'overdue';
  return row.status === 'overdue' || dueDate < getTodayDateOnly();
}

function hasUrlFilters(filters) {
  return Object.values(filters).some(Boolean);
}

function getDisplayAmount(row) {
  return Number(row?.net_value ?? row?.balance_amount ?? row?.amount ?? 0);
}

function getGrossAmount(row) {
  const extractionAmount = row?.metadata?.document_extraction?.fields?.amount;
  return Number(row?.gross_amount ?? extractionAmount ?? row?.amount ?? 0);
}

function isCardReceivable(row = {}) {
  const text = [row.payment_method, row.forma_prevista, row.received_payment_method, row.card_brand, row.processor_name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return /cartao|card|credito|debito/.test(text);
}

function getCardFeeAmount(row) {
  const explicitFee = Number(row?.fee_amount ?? row?.card_fee_amount ?? row?.processing_fee_amount ?? 0);
  if (explicitFee > 0) return explicitFee;
  if (!isCardReceivable(row)) return 0;
  const gross = getGrossAmount(row);
  const net = Number(row?.net_value ?? row?.received_value ?? row?.paid_total ?? row?.balance_amount ?? 0);
  const discount = Number(row?.discount_value ?? row?.descontos ?? 0);
  const taxes = Number(row?.taxes_value ?? row?.total_taxes ?? 0);
  if (gross <= 0 || net <= 0) return 0;
  return Math.max(0, gross - discount - taxes - net);
}

function getReceivableBalance(row) {
  return Math.max(0, getDisplayAmount(row) - Number(row?.received_value || row?.paid_total || 0) - Number(row?.glosa_value || 0));
}

function getGlosaEvidence(row) {
  const latestGlosa = row?.last_glosa || {};
  const url = row?.glosa_evidence_url || latestGlosa.evidence_url;
  const name = row?.glosa_evidence_name || latestGlosa.evidence_name;
  if (!url) {
    return null;
  }
  return {
    url,
    name: name || 'Evidência da glosa',
  };
}

function getDocumentExtraction(row) {
  const extraction = row?.metadata?.document_extraction;
  if (!extraction) {
    return null;
  }
  const confidence = extraction.confidence || 'manual';
  const documentType = String(extraction.documentType || 'documento').toUpperCase();
  const taxes = Number(row?.taxes_value || 0);
  return {
    confidence,
    label: confidence === 'alta' ? `${documentType} alta` : `${documentType} ${confidence}`,
    title: [
      `Leitura ${confidence}`,
      extraction.issuerName ? `Emissor: ${extraction.issuerName}` : null,
      taxes > 0 ? `Impostos: ${(taxes || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : null,
      Array.isArray(extraction.warnings) && extraction.warnings[0] ? extraction.warnings[0] : null,
    ].filter(Boolean).join(' | '),
  };
}

function getFiscalReviewStatus(row) {
  const extraction = getDocumentExtraction(row);
  if (!extraction) {
    return null;
  }
  const review = row?.metadata?.fiscal_review || row?.metadata?.document_extraction?.review || {};
  if (review.status === 'reviewed') {
    return {
      status: 'reviewed',
      label: 'Revisado',
      reviewedAt: review.reviewed_at || null,
      reviewedBy: review.reviewed_by || null,
      notes: review.notes || '',
    };
  }
  return {
    status: 'pending',
    label: 'Pendente',
    reviewedAt: null,
    reviewedBy: null,
    notes: review.notes || '',
  };
}

function formatFiscalValue(value, type = 'text') {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (type === 'currency') {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  if (type === 'date') {
    const parts = String(value).split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return String(value);
}

function buildFiscalReviewRows(row) {
  const fields = row?.metadata?.document_extraction?.fields || {};
  return [
    { label: 'Pagador', xml: formatReceivableText(fields.payer_name), saved: formatReceivableText(row?.payer_display || row?.payer_name || row?.patient_name) },
    { label: 'Descricao', xml: formatReceivableText(fields.description), saved: formatReceivableText(row?.description) },
    { label: 'Valor bruto', xml: fields.amount, saved: getGrossAmount(row), type: 'currency' },
    { label: 'Impostos', xml: fields.taxes_value, saved: row?.taxes_value, type: 'currency' },
    { label: 'Emissao', xml: fields.invoice_date, saved: row?.invoice_date || row?.data_emissao, type: 'date' },
    { label: 'Vencimento', xml: fields.due_date, saved: row?.due_date, type: 'date' },
    { label: 'Forma prevista', xml: formatReceivableText(fields.payment_method), saved: formatReceivableText(row?.payment_method || row?.forma_prevista) },
    { label: 'Numero NF/guia', xml: formatReceivableText(fields.guide_number), saved: formatReceivableText(row?.guide_number) },
  ];
}

function fiscalValuesMatch(xmlValue, savedValue, type = 'text') {
  if ((xmlValue === null || xmlValue === undefined || xmlValue === '') && (savedValue === null || savedValue === undefined || savedValue === '')) {
    return true;
  }
  if (type === 'currency') {
    return Math.abs(Number(xmlValue || 0) - Number(savedValue || 0)) < 0.01;
  }
  if (type === 'date') {
    return String(xmlValue || '').split('T')[0] === String(savedValue || '').split('T')[0];
  }
  return String(xmlValue || '').trim().toLowerCase() === String(savedValue || '').trim().toLowerCase();
}

function formatExportDate(value) {
  if (!value) {
    return '';
  }
  return formatFiscalValue(value, 'date');
}

function buildReceivableReportRow(row) {
  const extraction = row?.metadata?.document_extraction || null;
  const extractionFields = extraction?.fields || {};
  const fiscalReview = getFiscalReviewStatus(row);
  const reviewRows = buildFiscalReviewRows(row);
  const currentDivergences = extraction ? reviewRows.filter((item) => !fiscalValuesMatch(item.xml, item.saved, item.type)).length : 0;
  const storedReview = row?.metadata?.fiscal_review || {};
  const events = Array.isArray(row?.metadata?.fiscal_review_events) ? row.metadata.fiscal_review_events : [];

  return {
    pagador: formatReceivableText(row.payer_display || row.payer_name || row.patient_name || ''),
    descricao: formatReceivableText(row.description || ''),
    convenio: formatReceivableText(row.convenio_name || ''),
    tipo_pagador: formatReceivableText(row.payer_type || ''),
    origem: formatReceivableText(row.origem || ''),
    profissional: formatReceivableText(row.professional_name || row.profissional_name || ''),
    unidade: formatReceivableText(row.unit_name || row.unidade_name || row.clinic_unit_name || ''),
    especialidade: formatReceivableText(row.specialty_name || ''),
    forma_pagamento: formatReceivableText(row.received_payment_method || row.forma_prevista || row.payment_method || ''),
    competencia: formatExportDate(row.competency_date || row.data_emissao || row.emission_date || row.created_at),
    emissao: formatExportDate(row.invoice_date || row.data_emissao),
    vencimento: formatExportDate(row.due_date),
    plano_contas: formatReceivableText(row.plano_contas_name || ''),
    status: formatReceivableText(row.status || ''),
    bruto: getGrossAmount(row),
    valor: Number(row.amount || 0),
    taxa_cartao: getCardFeeAmount(row),
    recebido: Number(row.received_value || row.paid_total || 0),
    glosa: Number(row.glosa_value || 0),
    repasse: Number(row.repasse_expected || row.repasse_medico || 0),
    saldo: getReceivableBalance(row),
    documento_fiscal_tipo: formatReceivableText(extraction?.documentType ? String(extraction.documentType).toUpperCase() : ''),
    confianca_leitura: formatReceivableText(extraction?.confidence || ''),
    emissor_xml: formatReceivableText(extraction?.issuerName || ''),
    numero_nf_xml: formatReceivableText(extractionFields.guide_number || ''),
    valor_xml: extractionFields.amount ? Number(extractionFields.amount) : null,
    impostos_xml: Number(row.taxes_value || extractionFields.taxes_value || 0),
    emissao_xml: formatExportDate(extractionFields.invoice_date),
    vencimento_xml: formatExportDate(extractionFields.due_date),
    forma_xml: formatReceivableText(extractionFields.payment_method || ''),
    status_revisao_fiscal: formatReceivableText(fiscalReview?.label || ''),
    revisado_em: formatExportDate(fiscalReview?.reviewedAt || storedReview.reviewed_at),
    revisado_por: formatReceivableText(fiscalReview?.reviewedBy || storedReview.reviewed_by || ''),
    qtd_divergencias: Number(storedReview.divergence_count ?? currentDivergences ?? 0),
    observacao_revisao: formatReceivableText(fiscalReview?.notes || storedReview.notes || ''),
    eventos_revisao: events.length,
    ans: formatReceivableText(row.ans_registration || ''),
    fatura_convenio: formatReceivableText(row.insurance_invoice_number || ''),
    status_convenio: formatReceivableText(row.insurance_billing_status || ''),
    status_xml_tiss: formatReceivableText(row.tiss_xml_status || ''),
    retorno_convenio: formatReceivableText(row.insurance_return_status || ''),
    protocolo_retorno: formatReceivableText(row.insurance_return_protocol || ''),
    data_retorno: formatExportDate(row.insurance_return_date),
  };
}

function daysSinceFiscalReference(row) {
  const extractionFields = row?.metadata?.document_extraction?.fields || {};
  const sourceDate = extractionFields.invoice_date || row?.invoice_date || row?.created_at || row?.due_date;
  if (!sourceDate) {
    return 0;
  }
  const date = new Date(sourceDate);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function getFiscalDivergenceCount(row) {
  if (!getDocumentExtraction(row)) {
    return 0;
  }
  return buildFiscalReviewRows(row).filter((item) => !fiscalValuesMatch(item.xml, item.saved, item.type)).length;
}

function buildFiscalReviewQueue(rows) {
  return rows
    .map((row) => {
      const extraction = getDocumentExtraction(row);
      const review = getFiscalReviewStatus(row);
      if (!extraction || review?.status !== 'pending') {
        return null;
      }
      const divergenceCount = getFiscalDivergenceCount(row);
      const ageDays = daysSinceFiscalReference(row);
      const score = (divergenceCount * 10) + Math.min(ageDays, 30);
      return {
        row,
        extraction,
        divergenceCount,
        ageDays,
        score,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function applyClientReceivableFilters(rowsData, nextFilters) {
  const filteredByDocument = nextFilters.documentExtraction === 'with_extraction'
    ? rowsData.filter((row) => getDocumentExtraction(row))
    : nextFilters.documentExtraction === 'without_extraction'
      ? rowsData.filter((row) => !getDocumentExtraction(row))
      : rowsData;

  const filteredByReview = nextFilters.fiscalReview === 'pending'
    ? filteredByDocument.filter((row) => getFiscalReviewStatus(row)?.status === 'pending')
    : nextFilters.fiscalReview === 'reviewed'
      ? filteredByDocument.filter((row) => getFiscalReviewStatus(row)?.status === 'reviewed')
      : filteredByDocument;

  if (nextFilters.status === 'overdue') {
    return filteredByReview.filter(isReceivableOverdue);
  }

  if (nextFilters.status === 'open') {
    return filteredByReview.filter((row) => ['open', 'pending'].includes(row.status) && !isReceivableOverdue(row));
  }

  return filteredByReview;
}

export default function ContasReceber() {
  const breadcrumbs = useBreadcrumbs([
    { label: 'Financeiro', path: '/clinica/financeiro' },
    { label: 'Contas a Receber' },
  ]);
  const { clinicId, currentRole, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const urlFilters = useMemo(
    () => buildFiltersFromSearchParams(new URLSearchParams(searchParamsKey)),
    [searchParamsKey],
  );
  const source = searchParams.get('from');
  const trace = searchParams.get('trace');
  const cameFromCashflow = source === 'fluxo-caixa';
  const cameFromDre = source === 'dre';
  const returnTo = searchParams.get('returnTo') || '/clinica/financeiro/resultado';
  const isAdmin = ['admin', 'administrador', 'owner', 'super_admin'].includes(
    String(currentRole || '').toLowerCase(),
  );

  const [filters, setFilters] = useState(urlFilters);
  const [rows, setRows] = useState([]);
  const [allLoadedRows, setAllLoadedRows] = useState([]); // Armazena TODOS os dados para calcular indicadores
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMoreRows, setHasMoreRows] = useState(false);
  const [professionals, setProfessionals] = useState([]);
  const [plans, setPlans] = useState([]);
  const [payers, setPayers] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [confirmReceived, setConfirmReceived] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [receiveForm, setReceiveForm] = useState({
    amount: '',
    paymentMethod: 'pix',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    splitAmount: '',
    splitMethod: '',
    splitReference: '',
    notes: '',
  });
  const [glosaAction, setGlosaAction] = useState(null);
  const [glosaForm, setGlosaForm] = useState({
    glosaAmount: '',
    paidAmount: '',
    reason: '',
    glosaType: 'administrativa',
    contestationStatus: 'pendente',
    responsible: '',
    glosaDate: new Date().toISOString().split('T')[0],
  });
  const [glosaWorkflowAction, setGlosaWorkflowAction] = useState(null);
  const [documentDetailsRow, setDocumentDetailsRow] = useState(null);
  const [fiscalReviewNotes, setFiscalReviewNotes] = useState('');
  const [glosaWorkflowForm, setGlosaWorkflowForm] = useState({
    status: 'contestada',
    contestedAmount: '',
    recoveredAmount: '',
    finalLossAmount: '',
    contestationDeadline: '',
    responsible: '',
    notes: '',
  });
  const [glosaEvidenceFile, setGlosaEvidenceFile] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [saveFilterDialogOpen, setSaveFilterDialogOpen] = useState(false);
  const [selectedReceivableIds, setSelectedReceivableIds] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(loadVisibleReceivableColumns);
  const [columnOrder, setColumnOrder] = useState(loadReceivableColumnOrder);
  const [draggingColumnKey, setDraggingColumnKey] = useState(null);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkConfirmAction, setBulkConfirmAction] = useState(null);
  const [bulkReceiveForm, setBulkReceiveForm] = useState({
    paymentMethod: 'pix',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  });
  const [bulkGlosaForm, setBulkGlosaForm] = useState({
    glosaAmount: '',
    paidAmount: '',
    reason: '',
    glosaType: 'administrativa',
    contestationStatus: 'pendente',
    responsible: '',
    glosaDate: new Date().toISOString().split('T')[0],
  });
  const [bulkGlosaWorkflowForm, setBulkGlosaWorkflowForm] = useState({
    contestedAmount: '',
    recoveredAmount: '',
    finalLossAmount: '',
    contestationDeadline: '',
    responsible: '',
    notes: '',
  });
  const [isReconcilingReceivables, setIsReconcilingReceivables] = useState(false);
  const [reconciliationSummary, setReconciliationSummary] = useState('');
  const [reconciliationResult, setReconciliationResult] = useState(null);
  const [reconciliationActionId, setReconciliationActionId] = useState(null);
  const [xmlBatchProgress, setXmlBatchProgress] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const xmlBatchCompletionToastRef = useRef(new Set());

  // Hook para gerenciar filtros salvos
  const { savedFilters, saveFilter, deleteFilter, getFilter } = useSavedFilters('contas_receber_filters');
  const isColumnVisible = (key) => visibleColumns[key] !== false;
  const orderedColumnOptions = useMemo(
    () => columnOrder
      .map((key) => receivableColumnOptions.find((column) => column.key === key))
      .filter(Boolean),
    [columnOrder],
  );
  const orderedVisibleColumns = useMemo(
    () => orderedColumnOptions.filter((column) => isColumnVisible(column.key)),
    [orderedColumnOptions, visibleColumns],
  );
  const visibleColumnCount = orderedVisibleColumns.length + 2;
  const tableMinWidth = Math.max(760, 160 + (visibleColumnCount * 112));
  const xmlBatchPercent = xmlBatchProgress
    ? Math.min(100, Math.round(((xmlBatchProgress.created || 0) / Math.max(1, xmlBatchProgress.total || 1)) * 100))
    : 0;

  const showXmlBatchFinishedToast = (detail = {}) => {
    const batchKey = detail.batchId || 'xml-lote-sem-id';
    if (xmlBatchCompletionToastRef.current.has(batchKey)) {
      return;
    }
    xmlBatchCompletionToastRef.current.add(batchKey);
    toast({
      variant: detail.created ? 'default' : 'destructive',
      title: detail.created ? `${detail.created} recebivel(is) criado(s)` : 'Nenhum documento importado',
      description: detail.failures?.length
        ? `${detail.failures.length} documento(s) nao foram importados.`
        : 'Contas a receber abertas e fluxo previsto atualizados.',
    });
  };

  const renderXmlBatchProgress = (className = '') => {
    if (!xmlBatchProgress?.active) {
      return null;
    }

    return (
      <div className={`min-w-[260px] max-w-md rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 ${className}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
            <span className="truncate font-medium">
              Gerando recebiveis
            </span>
          </div>
          <span className="shrink-0 font-semibold text-slate-900">
            {Math.min(xmlBatchProgress.created || 0, xmlBatchProgress.total || 0)}/{xmlBatchProgress.total || 0}
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${xmlBatchPercent}%` }}
          />
        </div>
        {(xmlBatchProgress.currentFile || xmlBatchProgress.failures?.length) && (
          <p className="mt-1 truncate text-[11px] text-slate-500">
            {xmlBatchProgress.currentFile || `${xmlBatchProgress.failures.length} falha(s)`}
          </p>
        )}
      </div>
    );
  };

  const moveColumn = (columnKey, direction) => {
    setColumnOrder((current) => {
      const next = normalizeReceivableColumnOrder(current);
      const index = next.indexOf(columnKey);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= next.length) {
        return next;
      }
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const moveColumnToPosition = (columnKey, targetKey, insertAfter = false) => {
    if (!columnKey || !targetKey || columnKey === targetKey) {
      return;
    }
    setColumnOrder((current) => {
      const next = normalizeReceivableColumnOrder(current);
      const sourceIndex = next.indexOf(columnKey);
      const targetIndex = next.indexOf(targetKey);
      if (sourceIndex < 0 || targetIndex < 0) {
        return next;
      }
      const [movedColumn] = next.splice(sourceIndex, 1);
      const adjustedTargetIndex = next.indexOf(targetKey);
      next.splice(adjustedTargetIndex + (insertAfter ? 1 : 0), 0, movedColumn);
      return next;
    });
  };

  const resetColumnLayout = () => {
    setVisibleColumns(defaultVisibleReceivableColumns);
    setColumnOrder(defaultReceivableColumnOrder);
  };

  useEffect(() => {
    try {
      localStorage.setItem(RECEIVABLE_COLUMNS_STORAGE_KEY, JSON.stringify({
        visible: visibleColumns,
        order: columnOrder,
      }));
    } catch {
      // Ignore storage errors; the current session still keeps the selected layout.
    }
  }, [visibleColumns, columnOrder]);

  // Calcular resumo financeiro
  const summary = useMemo(() => {
    const activeRows = allLoadedRows.filter((r) => !['canceled', 'glossed'].includes(r.status));
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const in30Date = in30.toISOString().split('T')[0];
    const total = activeRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const realized = allLoadedRows.reduce((s, r) => s + (Number(r.received_value || r.paid_total) || 0), 0);
    const receivedToday = allLoadedRows
      .filter((r) => String(r.received_date || '').slice(0, 10) === today)
      .reduce((s, r) => s + (Number(r.received_value || r.paid_total || 0) || 0), 0);
    const receivedMonth = allLoadedRows
      .filter((r) => String(r.received_date || '').slice(0, 10) >= startOfMonth)
      .reduce((s, r) => s + (Number(r.received_value || r.paid_total || 0) || 0), 0);
    const next30 = activeRows
      .filter((r) => r.due_date && r.due_date >= today && r.due_date <= in30Date && !['received', 'canceled', 'glossed'].includes(r.status))
      .reduce((s, r) => s + getDisplayAmount(r), 0);
    const received = allLoadedRows
      .filter((r) => r.status === 'received')
      .reduce((s, r) => s + (Number(r.received_value || r.net_value || r.amount) || 0), 0);
    const pending = activeRows
      .filter((r) => !['received', 'canceled', 'glossed'].includes(r.status))
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const overdue = activeRows
      .filter(isReceivableOverdue)
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const canceled = allLoadedRows
      .filter((r) => r.status === 'canceled')
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const glosas = allLoadedRows.reduce((s, r) => s + Number(r.glosa_value || 0), 0);
    const glosaRows = allLoadedRows.filter((r) => Number(r.glosa_value || 0) > 0 || r.last_glosa);
    const glosaContested = glosaRows.reduce((s, r) => s + Number(r.last_glosa?.contested_amount || 0), 0);
    const glosaRecovered = glosaRows.reduce((s, r) => s + Number(r.last_glosa?.recovered_amount || 0), 0);
    const glosaFinalLoss = glosaRows.reduce((s, r) => s + Number(r.last_glosa?.final_loss_amount || 0), 0);
    const glosaOpenCount = glosaRows.filter((r) => !['recuperada', 'aceita_perda'].includes(String(r.last_glosa?.contestation_status || '').toLowerCase())).length;
    const extractedDocuments = allLoadedRows.filter((r) => getDocumentExtraction(r));
    const extractedTaxes = extractedDocuments.reduce((s, r) => s + Number(r.taxes_value || 0), 0);
    const fiscalPendingRows = extractedDocuments.filter((r) => getFiscalReviewStatus(r)?.status === 'pending');
    const fiscalDivergenceRows = extractedDocuments.filter((r) => getFiscalDivergenceCount(r) > 0);
    const oldFiscalPendingRows = fiscalPendingRows.filter((r) => daysSinceFiscalReference(r) >= 7);
    const fiscalReviewQueue = buildFiscalReviewQueue(allLoadedRows);
    const fiscalReviewPending = fiscalPendingRows.length;
    const fiscalReviewDone = extractedDocuments.filter((r) => getFiscalReviewStatus(r)?.status === 'reviewed').length;
    const repasseExpected = allLoadedRows.reduce((s, r) => s + Number(r.repasse_expected || r.repasse_medico || 0), 0);
    const repassePaid = allLoadedRows.reduce((s, r) => s + Number(r.repasse_paid || 0), 0);
    const convenioRevenue = allLoadedRows.filter((r) => ['convenio', 'CONVENIO'].includes(String(r.payer_type))).reduce((s, r) => s + getDisplayAmount(r), 0);
    const particularRevenue = allLoadedRows.filter((r) => !r.payer_type || ['paciente', 'particular', 'PARTICULAR'].includes(String(r.payer_type))).reduce((s, r) => s + getDisplayAmount(r), 0);
    const companyRevenue = allLoadedRows.filter((r) => ['empresa', 'EMPRESA'].includes(String(r.payer_type))).reduce((s, r) => s + getDisplayAmount(r), 0);
    const revenueByUnit = allLoadedRows.reduce((map, row) => {
      const unitName = row.unit_name || row.unidade_name || row.clinic_unit_name || 'Sem unidade';
      map.set(unitName, (map.get(unitName) || 0) + getDisplayAmount(row));
      return map;
    }, new Map());
    const topUnitRevenue = [...revenueByUnit.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))[0] || { name: 'Sem unidade', value: 0 };
    const averageTicket = allLoadedRows.length ? total / allLoadedRows.length : 0;
    const defaultRate = total > 0 ? (overdue / total) * 100 : 0;

    return {
      total,
      realized,
      received,
      receivedToday,
      receivedMonth,
      pending,
      overdue,
      canceled,
      next30,
      glosas,
      glosaRows: glosaRows.length,
      glosaOpenCount,
      glosaContested,
      glosaRecovered,
      glosaFinalLoss,
      extractedDocuments: extractedDocuments.length,
      extractedTaxes,
      fiscalReviewPending,
      fiscalReviewDone,
      fiscalDivergences: fiscalDivergenceRows.length,
      oldFiscalPending: oldFiscalPendingRows.length,
      fiscalReviewQueue,
      repasseExpected,
      repassePaid,
      convenioRevenue,
      particularRevenue,
      companyRevenue,
      topUnitRevenue,
      averageTicket,
      defaultRate,
    };

  }, [allLoadedRows]);
  // Paginação
  const paginationInfo = useMemo(() => {
    const totalRows = rows.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedRows = rows.slice(startIndex, endIndex);
    
    return {
      totalRows,
      totalPages,
      startIndex,
      endIndex,
      currentPage,
      rowsPerPage,
      paginatedRows,
    };
  }, [rows, currentPage, rowsPerPage]);

  const selectableRows = useMemo(
    () => rows.filter((row) => isAdmin || !['received', 'canceled', 'glossed'].includes(row.status)),
    [rows, isAdmin],
  );

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedReceivableIds.includes(row.id)),
    [rows, selectedReceivableIds],
  );

  const receivableById = useMemo(
    () => new Map(rows.map((row) => [row.id, row])),
    [rows],
  );

  const allVisibleSelected = selectableRows.length > 0
    && selectableRows.every((row) => selectedReceivableIds.includes(row.id));

  const selectedTotal = useMemo(
    () => selectedRows.reduce((sum, row) => sum + getReceivableBalance(row), 0),
    [selectedRows],
  );

  const activeFilterChips = useMemo(() => {
    const labels = {
      payer: 'Pagador',
      status: 'Status',
      origin: 'Origem',
      payerType: 'Tipo',
      payerId: 'Convênio/empresa',
      professionalId: 'Profissional',
      ccId: 'Centro de custo',
      planId: 'Plano',
      emissionStart: 'Emissão de',
      emissionEnd: 'Emissão até',
      dueStart: 'Vencimento de',
      dueEnd: 'Vencimento até',
      receivedStart: 'Recebimento de',
      receivedEnd: 'Recebimento até',
      unitName: 'Unidade',
      specialtyName: 'Especialidade',
      paymentMethod: 'Forma',
      insuranceBillingStatus: 'Status convênio',
      tissXmlStatus: 'XML TISS',
      insuranceReturnStatus: 'Retorno',
      hasGlosa: 'Glosa',
      documentExtraction: 'Documento fiscal',
      fiscalReview: 'Revisão fiscal',
      minValue: 'Valor mín.',
      maxValue: 'Valor máx.',
      search: 'Busca',
    };
    const valueLabel = (key, value) => {
      if (key === 'status') return arStatusOptions.find((item) => item.value === value)?.label || value;
      if (key === 'payerId') return payers.find((item) => item.id === value)?.name || value;
      if (key === 'professionalId') return professionals.find((item) => item.id === value)?.name || value;
      if (key === 'planId') return plans.find((item) => item.id === value)?.name || value;
      if (key === 'ccId') return costCenters.find((item) => item.id === value)?.name || value;
      if (key === 'payerType') return { PARTICULAR: 'Paciente/particular', CONVENIO: 'Convênio', EMPRESA: 'Empresa' }[value] || value;
      if (key === 'hasGlosa') return value === 'true' ? 'Com glosa' : 'Sem glosa';
      if (key === 'documentExtraction') return value === 'with_extraction' ? 'Com XML lido' : 'Sem XML lido';
      if (key === 'fiscalReview') return value === 'pending' ? 'Pendente' : 'Revisado';
      if (key === 'paymentMethod') {
        return {
          pix: 'PIX',
          cash: 'Dinheiro',
          cartao_credito: 'Cartão de crédito',
          cartao_debito: 'Cartão de débito',
          boleto: 'Boleto',
          convenio: 'Convênio',
          ted: 'Transferência',
          cheque: 'Cheque',
        }[value] || value;
      }
      return value;
    };

    return Object.entries(filters)
      .filter(([key, value]) => value && key !== 'companyId' && key !== 'unitId' && key !== 'specialtyId')
      .map(([key, value]) => ({ key, label: labels[key] || key, value: valueLabel(key, value) }));
  }, [filters, payers, professionals, plans, costCenters]);

  // Carregar TODOS os recebíveis para calcular indicadores gerais da clínica (sem filtros da tela)
  const loadAllReceivablesForSummary = async () => {
    if (!clinicId) return;
    try {
      // Os indicadores devem permanecer globais mesmo quando a lista estiver filtrada pela DRE.
      const data = await listReceivables({
        clinicId,
        limit: 10000, // Carregar até 10k registros para indicadores, sem paginação
        offset: 0,
      });
      const rowsData = Array.isArray(data) ? data : [];
      const summaryRows = rowsData.map(formatReceivableRowTexts);
      setAllLoadedRows(summaryRows);
      console.log('✓ allLoadedRows atualizado com', summaryRows.length, 'registros totais para indicadores');
    } catch (e) {
      console.error('❌ loadAllReceivablesForSummary error:', e?.message);
    }
  };

  const load = async (nextFilters = filters, options = {}) => {
    if (!clinicId) {
      return;
    }
    const append = Boolean(options.append);
    const offset = append ? nextOffset : 0;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setNextOffset(0);
      setHasMoreRows(false);
    }
    try {
      const data = await listReceivables({
        clinicId,
        payer: nextFilters.payer,
        payerType: nextFilters.payerType || null,
        status: nextFilters.status === 'overdue' ? 'open' : nextFilters.status || null,
        origin: nextFilters.origin || null,
        payerId: nextFilters.payerId || null,
        professionalId: nextFilters.professionalId || null,
        ccId: nextFilters.ccId || null,
        planId: nextFilters.planId || null,
        emissionStart: nextFilters.emissionStart || null,
        emissionEnd: nextFilters.emissionEnd || null,
        dueStart: nextFilters.dueStart || null,
        dueEnd: nextFilters.dueEnd || null,
        receivedStart: nextFilters.receivedStart || null,
        receivedEnd: nextFilters.receivedEnd || null,
        companyId: nextFilters.companyId || null,
        unitId: nextFilters.unitId || null,
        unitName: nextFilters.unitName || null,
        specialtyId: nextFilters.specialtyId || null,
        specialtyName: nextFilters.specialtyName || null,
        paymentMethod: nextFilters.paymentMethod || null,
        insuranceBillingStatus: nextFilters.insuranceBillingStatus || null,
        tissXmlStatus: nextFilters.tissXmlStatus || null,
        insuranceReturnStatus: nextFilters.insuranceReturnStatus || null,
        hasGlosa: nextFilters.hasGlosa === '' ? null : nextFilters.hasGlosa,
        minValue: nextFilters.minValue || null,
        maxValue: nextFilters.maxValue || null,
        search: nextFilters.search || null,
        limit: RECEIVABLES_PAGE_SIZE,
        offset,
      });

      if (!append && data?.length === 0) {
        console.warn('⚠️ [ContasReceber] Nenhum resultado encontrado com os filtros aplicados');
      }

      const rowsData = Array.isArray(data) ? data : [];
      const filteredRows = applyClientReceivableFilters(rowsData.map(formatReceivableRowTexts), nextFilters);
      setRows((current) => (append ? [...current, ...filteredRows] : filteredRows));
      setNextOffset(offset + rowsData.length);
      setHasMoreRows(rowsData.length === RECEIVABLES_PAGE_SIZE);
    } catch (e) {
      console.error('❌ Receivables load error', e?.message || e);
      console.error('   Stack:', e?.stack);
      if (!append) {
        setRows([]);
      }
      toast({ variant: 'destructive', title: 'Erro ao carregar contas a receber', description: e?.message });
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const runReceivablesSmartReconciliation = async () => {
    if (!clinicId) {
      return;
    }

    setIsReconcilingReceivables(true);
    setReconciliationSummary('');
    setReconciliationResult(null);

    try {
      const { data: receivablesData, error: receivablesError } = await supabase
        .from('ar_invoices')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('due_date', { ascending: false })
        .limit(500);

      if (receivablesError) throw receivablesError;

      const receivables = (receivablesData || [])
        .map(formatReceivableRowTexts)
        .filter((row) => !['canceled', 'glossed'].includes(String(row.status || '').toLowerCase()));

      const { data: statements, error: statementsError } = await supabase
        .from('bank_statements')
        .select('id')
        .eq('clinic_id', clinicId)
        .order('statement_date', { ascending: false })
        .limit(100);

      if (statementsError) throw statementsError;

      const statementIds = (statements || []).map((statement) => statement.id);
      if (!statementIds.length) {
        const emptyResult = { total_candidates: 0, matched: 0, review: 0, unmatched: 0, matches: [] };
        setReconciliationResult(emptyResult);
        setReconciliationSummary('0 conciliada(s), 0 para revisão, 0 sem conciliação.');
        return;
      }

      const { data: transactions, error: transactionsError } = await supabase
        .from('bank_transactions')
        .select('*')
        .in('statement_id', statementIds)
        .is('matched_to_id', null)
        .gt('amount', 0)
        .order('transaction_date', { ascending: false })
        .limit(1000);

      if (transactionsError) throw transactionsError;

      const usedTransactions = new Set();
      const matches = [];

      for (const receivable of receivables) {
        let bestTransaction = null;
        let bestScore = { score: 0, reason: '' };

        for (const transaction of transactions || []) {
          if (usedTransactions.has(transaction.id)) continue;
          const score = scoreReceivableTransaction(receivable, transaction);
          if (score.score > bestScore.score) {
            bestTransaction = transaction;
            bestScore = score;
          }
        }

        if (!bestTransaction || bestScore.score < 60) continue;

        usedTransactions.add(bestTransaction.id);
        const status = bestScore.score >= 85 ? 'matched' : 'review';
        const matchType = bestScore.score >= 95 ? 'auto_exact' : bestScore.score >= 75 ? 'auto_fuzzy' : 'auto_partial';
        const reconciliation = {
          status: status === 'matched' ? 'MATCHED' : 'AWAITING_REVIEW',
          bank_transaction_id: bestTransaction.id,
          confidence: bestScore.score,
          match_type: matchType,
          matched_at: new Date().toISOString(),
          matched_by: user?.id || null,
          score_reason: bestScore.reason,
          module: 'accounts_receivable',
        };

        await supabase
          .from('bank_transactions')
          .update({
            matched_to_id: receivable.id,
            match_type: matchType,
            match_confidence: bestScore.score,
            status,
            notes: `Contas a Receber: ${bestScore.reason}`,
          })
          .eq('id', bestTransaction.id);

        await supabase
          .from('ar_invoices')
          .update({ metadata: mergeReceivableEnterpriseMetadata(receivable, { reconciliation }) })
          .eq('id', receivable.id);

        matches.push({
          receivable_id: receivable.id,
          bank_transaction_id: bestTransaction.id,
          transaction_date: bestTransaction.transaction_date,
          amount: Number(bestTransaction.amount || 0),
          description: formatReceivableText(bestTransaction.description || ''),
          match_type: matchType,
          confidence: bestScore.score,
          status,
          score_reason: bestScore.reason,
        });
      }

      const result = {
        total_candidates: matches.length,
        matched: matches.filter((match) => match.status === 'matched').length,
        review: matches.filter((match) => match.status === 'review').length,
        unmatched: Math.max(0, (transactions || []).length - matches.length),
        matches,
      };

      setRows((current) => current.map((row) => {
        const match = matches.find((item) => item.receivable_id === row.id);
        if (!match) return row;
        const reconciliation = {
          status: match.status === 'matched' ? 'MATCHED' : 'AWAITING_REVIEW',
          bank_transaction_id: match.bank_transaction_id,
          confidence: match.confidence,
          match_type: match.match_type,
          matched_at: new Date().toISOString(),
          matched_by: user?.id || null,
          score_reason: match.score_reason,
          module: 'accounts_receivable',
        };
        return {
          ...row,
          metadata: mergeReceivableEnterpriseMetadata(row, { reconciliation }),
        };
      }));
      setReconciliationResult(result);
      setReconciliationSummary(`${result.matched} conciliada(s), ${result.review} para revisão, ${result.unmatched} sem conciliação.`);
      toast({ title: 'Conciliação concluída', description: `${result.matched} conciliada(s), ${result.review} para revisão.` });
    } catch (error) {
      console.error('Erro ao conciliar contas a receber', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao conciliar recebíveis',
        description: error?.message || 'Não foi possível executar a conciliação bancária.',
      });
    } finally {
      setIsReconcilingReceivables(false);
    }
  };

  const getReceivableForReconciliation = async (receivableId) => {
    const current = receivableById.get(receivableId);
    if (current) return current;
    const { data, error } = await supabase
      .from('ar_invoices')
      .select('*')
      .eq('id', receivableId)
      .single();
    if (error) throw error;
    return formatReceivableRowTexts(data);
  };

  const approveReceivableReconciliation = async (match) => {
    setReconciliationActionId(match.bank_transaction_id);
    try {
      const receivable = await getReceivableForReconciliation(match.receivable_id);
      const approvedAt = new Date().toISOString();
      const reconciliation = {
        status: 'MATCHED',
        bank_transaction_id: match.bank_transaction_id,
        confidence: Number(match.confidence || receivable.metadata?.enterprise?.reconciliation?.confidence || 100),
        match_type: match.match_type || receivable.metadata?.enterprise?.reconciliation?.match_type || 'manual_approved',
        approved_at: approvedAt,
        approved_by: user?.id || null,
        score_reason: match.score_reason || receivable.metadata?.enterprise?.reconciliation?.score_reason || null,
        module: 'accounts_receivable',
      };

      const { error: transactionError } = await supabase
        .from('bank_transactions')
        .update({
          matched_to_id: match.receivable_id,
          status: 'matched',
          notes: `Match AR aprovado em ${approvedAt}`,
        })
        .eq('id', match.bank_transaction_id);

      if (transactionError) throw transactionError;

      const { data, error } = await supabase
        .from('ar_invoices')
        .update({ metadata: mergeReceivableEnterpriseMetadata(receivable, { reconciliation }) })
        .eq('id', match.receivable_id)
        .select()
        .single();

      if (error) throw error;

      setRows((current) => current.map((row) => (row.id === match.receivable_id ? formatReceivableRowTexts(data) : row)));
      setReconciliationResult((current) => current
        ? {
            ...current,
            matches: current.matches.map((item) => item.bank_transaction_id === match.bank_transaction_id ? { ...item, status: 'matched' } : item),
            matched: current.matches.filter((item) => item.bank_transaction_id === match.bank_transaction_id || item.status === 'matched').length,
            review: current.matches.filter((item) => item.bank_transaction_id !== match.bank_transaction_id && item.status === 'review').length,
          }
        : current);
      toast({ title: 'Conciliação aprovada', description: 'O recebível foi vinculado à transação bancária.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao aprovar conciliação', description: error?.message });
    } finally {
      setReconciliationActionId(null);
    }
  };

  const rejectReceivableReconciliation = async (match) => {
    setReconciliationActionId(match.bank_transaction_id);
    try {
      const receivable = await getReceivableForReconciliation(match.receivable_id);
      const rejectedAt = new Date().toISOString();
      const reconciliation = {
        ...(receivable.metadata?.enterprise?.reconciliation || {}),
        status: 'REJECTED',
        rejected_at: rejectedAt,
        rejected_by: user?.id || null,
        rejection_reason: match.score_reason || 'Rejeitado na revisão manual',
        module: 'accounts_receivable',
      };

      const { error: transactionError } = await supabase
        .from('bank_transactions')
        .update({
          matched_to_id: null,
          status: 'rejected',
          notes: reconciliation.rejection_reason,
        })
        .eq('id', match.bank_transaction_id);

      if (transactionError) throw transactionError;

      const { data, error } = await supabase
        .from('ar_invoices')
        .update({ metadata: mergeReceivableEnterpriseMetadata(receivable, { reconciliation }) })
        .eq('id', match.receivable_id)
        .select()
        .single();

      if (error) throw error;

      setRows((current) => current.map((row) => (row.id === match.receivable_id ? formatReceivableRowTexts(data) : row)));
      setReconciliationResult((current) => current
        ? {
            ...current,
            matches: current.matches.filter((item) => item.bank_transaction_id !== match.bank_transaction_id),
            review: current.matches.filter((item) => item.bank_transaction_id !== match.bank_transaction_id && item.status === 'review').length,
            unmatched: current.unmatched + 1,
          }
        : current);
      toast({ title: 'Conciliação rejeitada', description: 'A sugestão foi removida da revisão.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao rejeitar conciliação', description: error?.message });
    } finally {
      setReconciliationActionId(null);
    }
  };
  const emptyFilters = emptyReceivableFilters;

  const formatDateInput = (date) => date.toISOString().split('T')[0];

  const applyFiltersAndLoad = (nextFilters) => {
    setFilters(nextFilters);
    setShowFilters(true);
    load(nextFilters);
    loadAllReceivablesForSummary(nextFilters); // Carregar TODOS para indicadores
  };

  const applyQuickFilter = (preset) => {
    const today = new Date();
    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const base = { ...emptyFilters };
    const presets = {
      overdue: { ...base, status: 'overdue', dueEnd: formatDateInput(yesterday) },
      next30: { ...base, status: 'open', dueStart: formatDateInput(today), dueEnd: formatDateInput(in30) },
      receivedToday: { ...base, receivedStart: formatDateInput(today), receivedEnd: formatDateInput(today), status: 'received' },
      glosas: { ...base, hasGlosa: 'true' },
      fiscalPending: { ...base, documentExtraction: 'with_extraction', fiscalReview: 'pending' },
      convenioTiss: { ...base, payerType: 'CONVENIO', tissXmlStatus: 'NAO_GERADO' },
    };

    applyFiltersAndLoad(presets[preset] || base);
  };

  const clearFilter = (key) => {
    const nextFilters = { ...filters, [key]: '' };
    applyFiltersAndLoad(nextFilters);
  };

  const loadMoreRows = () => {
    load(filters, { append: true });
    loadAllReceivablesForSummary(filters); // Atualizar TODOS para indicadores
  };

  const openDocumentDetails = (row) => {
    setFiscalReviewNotes(row?.metadata?.fiscal_review?.notes || '');
    setDocumentDetailsRow(row);
  };

  const markFiscalReviewDone = async (row, divergences = []) => {
    if (!row?.id) {
      return;
    }
    setActionLoadingId(`fiscal-review-${row.id}`);
    try {
      const previousEvents = Array.isArray(row.metadata?.fiscal_review_events)
        ? row.metadata.fiscal_review_events
        : [];
      const metadata = {
        ...(row.metadata || {}),
        fiscal_review: {
          status: 'reviewed',
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentRole || 'operador',
          divergence_count: divergences.length,
          notes: fiscalReviewNotes || null,
        },
        fiscal_review_events: [
          ...previousEvents,
          {
            action: 'reviewed',
            at: new Date().toISOString(),
            by: currentRole || 'operador',
            divergence_count: divergences.length,
            notes: fiscalReviewNotes || null,
          },
        ],
      };
      const updated = await updateReceivable(row.id, { metadata }, clinicId);
      const nextRow = { ...row, ...updated, metadata };
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, ...nextRow } : item)));
      setDocumentDetailsRow(nextRow);
      toast({ title: 'Revisao fiscal marcada', description: divergences.length ? 'Lancamento revisado com divergencias registradas.' : 'Lancamento revisado sem divergencias.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao marcar revisao', description: error?.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const reopenFiscalReview = async (row) => {
    if (!row?.id) {
      return;
    }
    setActionLoadingId(`fiscal-reopen-${row.id}`);
    try {
      const previousEvents = Array.isArray(row.metadata?.fiscal_review_events)
        ? row.metadata.fiscal_review_events
        : [];
      const metadata = {
        ...(row.metadata || {}),
        fiscal_review: {
          status: 'pending',
          reopened_at: new Date().toISOString(),
          reopened_by: currentRole || 'operador',
          notes: fiscalReviewNotes || null,
        },
        fiscal_review_events: [
          ...previousEvents,
          {
            action: 'reopened',
            at: new Date().toISOString(),
            by: currentRole || 'operador',
            notes: fiscalReviewNotes || null,
          },
        ],
      };
      const updated = await updateReceivable(row.id, { metadata }, clinicId);
      const nextRow = { ...row, ...updated, metadata };
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, ...nextRow } : item)));
      setDocumentDetailsRow(nextRow);
      toast({ title: 'Revisao fiscal reaberta', description: 'O XML voltou para a fila de revisao.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao reabrir revisao', description: error?.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusLabel = (row, isOverdue) => {
    if (row.status === 'received') return 'Recebido';
    if (row.status === 'canceled') return 'Cancelado';
    if (row.status === 'glossed') return 'Glosado';
    if (row.status === 'partial') return 'Parcial';
    if (row.status === 'billed') return 'Faturado';
    if (row.status === 'reversed') return 'Estornado';
    if (isOverdue) return 'Atrasado';
    if (row.status === 'planned') return 'Previsto';
    return 'Pendente';
  };

  const getStatusColor = (row, isOverdue) => {
    if (row.status === 'received') return 'bg-green-100 text-green-800';
    if (row.status === 'canceled') return 'bg-gray-200 text-gray-700';
    if (row.status === 'glossed') return 'bg-purple-100 text-purple-800';
    if (row.status === 'partial') return 'bg-blue-100 text-blue-800';
    if (row.status === 'billed') return 'bg-indigo-100 text-indigo-800';
    if (row.status === 'reversed') return 'bg-slate-200 text-slate-800';
    if (isOverdue) return 'bg-red-100 text-red-800';
    if (row.status === 'planned') return 'bg-sky-100 text-sky-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const handleSaveFilter = (name) => {
    const filterData = { ...filters };
    saveFilter(name, filterData);
  };

  const handleLoadFilter = (name) => {
    const filterData = getFilter(name);
    if (filterData) {
      setFilters(filterData);
      load(filterData);
    }
  };

  useEffect(() => {
    setFilters(urlFilters);
    if (cameFromCashflow || cameFromDre || hasUrlFilters(urlFilters)) {
      setShowFilters(true);
    }
    load(urlFilters);
    loadAllReceivablesForSummary(urlFilters); // Carregar TODOS para indicadores
  }, [clinicId, searchParamsKey]);

  useEffect(() => {
    if (source !== 'xml-lote') {
      return;
    }
    const batchId = searchParams.get('batch');
    const total = Number(searchParams.get('total') || 0);
    const imported = Number(searchParams.get('imported') || 0);
    const processing = searchParams.get('processing') === '1';
    let savedProgress = null;
    if (batchId) {
      try {
        savedProgress = JSON.parse(window.sessionStorage.getItem(`contas_receber_xml_lote_${batchId}`) || 'null');
      } catch {
        savedProgress = null;
      }
    }
    if (processing || savedProgress) {
      setXmlBatchProgress({
        active: savedProgress?.active ?? processing,
        batchId,
        total: savedProgress?.total || total,
        created: savedProgress?.created || imported || 0,
        failures: savedProgress?.failures || [],
        currentFile: savedProgress?.currentFile || null,
      });
    } else if (imported) {
      showXmlBatchFinishedToast({ batchId: `imported-${searchParams.get('t') || imported}`, total: imported, created: imported, failures: [] });
    }
  }, [source, searchParamsKey]);

  useEffect(() => {
    const isCurrentClinicBatch = (detail) => !detail?.clinicId || detail.clinicId === clinicId;
    const applyProgress = (detail) => {
      if (!isCurrentClinicBatch(detail)) {
        return;
      }
      setXmlBatchProgress((current) => ({
        active: detail.active !== false,
        batchId: detail.batchId || current?.batchId || null,
        total: detail.total || current?.total || 0,
        created: detail.created ?? current?.created ?? 0,
        failures: detail.failures || current?.failures || [],
        currentFile: detail.currentFile || null,
      }));
    };

    const handleProgress = (event) => applyProgress(event.detail || {});
    const handleCreated = (event) => {
      const detail = event.detail || {};
      if (!isCurrentClinicBatch(detail)) {
        return;
      }
      applyProgress(detail);
      const createdRows = Array.isArray(detail.rows) ? detail.rows.filter(Boolean) : [];
      if (!createdRows.length) {
        return;
      }
      setRows((current) => {
        const existingIds = new Set(current.map((row) => row.id));
        const newRows = createdRows.filter((row) => row?.id && !existingIds.has(row.id));
        return newRows.length ? [...newRows, ...current] : current;
      });
    };
    const handleFinished = (event) => {
      const detail = event.detail || {};
      if (!isCurrentClinicBatch(detail)) {
        return;
      }
      setXmlBatchProgress(null);
      load(filters);
      loadAllReceivablesForSummary(filters); // Carregar TODOS para indicadores
      showXmlBatchFinishedToast(detail);
    };

    window.addEventListener('receivables:xml-batch-progress', handleProgress);
    window.addEventListener('receivables:xml-batch-created', handleCreated);
    window.addEventListener('receivables:xml-batch-finished', handleFinished);
    return () => {
      window.removeEventListener('receivables:xml-batch-progress', handleProgress);
      window.removeEventListener('receivables:xml-batch-created', handleCreated);
      window.removeEventListener('receivables:xml-batch-finished', handleFinished);
    };
  }, [clinicId, filters, toast]);

  useEffect(() => {
    const batchId = xmlBatchProgress?.batchId || (source === 'xml-lote' ? searchParams.get('batch') : null);
    if (!batchId || !xmlBatchProgress?.active) {
      return;
    }

    let lastCreated = xmlBatchProgress.created || 0;
    const syncProgressFromStorage = () => {
      let savedProgress = null;
      try {
        savedProgress = JSON.parse(window.sessionStorage.getItem(`contas_receber_xml_lote_${batchId}`) || 'null');
      } catch {
        savedProgress = null;
      }

      if (!savedProgress || (savedProgress.clinicId && savedProgress.clinicId !== clinicId)) {
        return;
      }

      setXmlBatchProgress((current) => ({
        active: savedProgress.active !== false,
        batchId: savedProgress.batchId || current?.batchId || batchId,
        total: savedProgress.total || current?.total || 0,
        created: savedProgress.created ?? current?.created ?? 0,
        failures: savedProgress.failures || current?.failures || [],
        currentFile: savedProgress.currentFile || null,
      }));

      const savedCreated = Number(savedProgress.created || 0);
      if (savedCreated > lastCreated) {
        lastCreated = savedCreated;
        load(filters);
        loadAllReceivablesForSummary(filters); // Carregar TODOS para indicadores
      }

      if (savedProgress.active === false) {
        setXmlBatchProgress(null);
        load(filters);
        loadAllReceivablesForSummary(filters); // Carregar TODOS para indicadores
        showXmlBatchFinishedToast(savedProgress);
      }
    };

    syncProgressFromStorage();
    const intervalId = window.setInterval(syncProgressFromStorage, 800);
    return () => window.clearInterval(intervalId);
  }, [clinicId, filters, searchParamsKey, source, xmlBatchProgress?.active, xmlBatchProgress?.batchId]);

  // Aviso ao sair da página durante processamento XML
  useEffect(() => {
    if (!xmlBatchProgress?.active) {
      return;
    }

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Existe um carregamento em progresso. Se você sair desta página, poderá perder as informações. Tem certeza que deseja sair?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [xmlBatchProgress?.active]);

  // Resetar página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    if (!clinicId) {
      return;
    }
    (async () => {
      try {
        const ps = await listProfessionals(clinicId);
        setProfessionals(ps || []);
      } catch {}
    })();
  }, [clinicId]);
  useEffect(() => {
    if (!clinicId) {
      return;
    }
    (async () => {
      try {
        const items = await listPayers(clinicId);
        setPayers(items || []);
      } catch {}
    })();
  }, [clinicId]);
  useEffect(() => {
    if (!clinicId) {
      return;
    }
    (async () => {
      try {
        const cs = await listAccountPlans(clinicId);
        setPlans((cs || []).filter((c) => !!c.parent_id));
        const cc = await listCostCenters(clinicId);
        setCostCenters(cc || []);
      } catch {}
    })();
  }, [clinicId]);

  // Funções para manipular descrição e convênio
  const extractConvenioFromDescription = (desc) => {
    if (!desc) {
      return null;
    }
    const desc_lower = desc.toLowerCase();

    if (desc_lower.includes('particular')) {
      return 'Particular';
    }
    if (desc_lower.includes('unimed')) {
      const match = desc.match(/Unimed[^-]*/i);
      return match ? match[0].trim() : 'Unimed';
    }
    if (desc_lower.includes('sulamerica')) {
      return 'SulAmérica';
    }
    if (desc_lower.includes('bradesco')) {
      return 'Bradesco';
    }
    if (desc_lower.includes('notre dame')) {
      return 'Notre Dame';
    }

    const parts = desc.split(' - ');
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart && lastPart.length > 0 && lastPart.length < 100) {
        return lastPart;
      }
    }
    return null;
  };

  const formatPaymentMethod = (method) => {
    if (!method) {
      return null;
    }
    const lower = String(method)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const paymentMethods = {
      debito: 'Débito',
      credito: 'Crédito',
      dinheiro: 'Dinheiro',
      pix: 'PIX',
      ted: 'TED',
      cheque: 'Cheque',
      cartao: 'Cartão',
      cartão: 'Cartão',
      transferencia: 'Transferência',
      'cartao de credito': 'Cartão de crédito',
      'cartao de debito': 'Cartão de débito',
      vale: 'Vale',
      outro: 'Outro',
      deposito: 'Depósito',
      boleto: 'Boleto',
      doc: 'DOC',
      convenio: 'Convênio',
    };
    return paymentMethods[lower] || method;
  };

  const resolveBulkPaymentMethod = (row) => {
    const extractionFields = row.metadata?.document_extraction?.fields || {};
    return row.received_payment_method
      || row.payment_method
      || row.forma_prevista
      || extractionFields.payment_method
      || row.metadata?.card?.method
      || row.metadata?.last_payment?.methods?.[0]?.method
      || bulkReceiveForm.paymentMethod;
  };

  // 🔗 Enriquecer dados com payers e plano de contas padrão
  useEffect(() => {
    if (!rows.length) return;

    // Check if already enriched
    if (rows[0]?.__receivableDisplayEnriched) {
      console.log('✅ Already enriched, skipping');
      return;
    }

    const enrichRows = async () => {
      try {
        console.log('🔄 Enriching', rows.length, 'rows...');

        // Step 1: Extract convenio from description using existing logic
        const enrichedWithDescription = rows.map((r) => {
          const convenio_name_extracted = extractConvenioFromDescription(r.description);
          const forma_prevista_extracted = r.payment_method || r.appointments?.[0]?.payment_method || null;

          console.log(`Row ${r.id} raw data:`, {
            description: r.description?.substring(0, 50),
            extracted_convenio: convenio_name_extracted,
            payment_method_ar: r.payment_method,
            payment_method_apt: r.appointments?.[0]?.payment_method,
            final_forma_prevista: forma_prevista_extracted,
            plano_contas_id_ar: r.plano_contas_id,
            plano_contas_id_apt: r.appointments?.[0]?.plano_contas_id,
          });

          return {
            ...r,
            convenio_name: r.convenio_name || convenio_name_extracted || 'Particular',
            forma_prevista: forma_prevista_extracted,
          };
        });

        // Step 2: Collect unique IDs from ar_invoices or appointments
        const planoIds = new Set();
        const payerIds = new Set();
        const professionalIds = new Set();
        const patientIds = new Set();
        const serviceIds = new Set();
        const roomIds = new Set();
        enrichedWithDescription.forEach((r) => {
          const apt = Array.isArray(r.appointments) ? r.appointments[0] : r.appointments;
          const payerId = r.payer_id || r.convenio_id || r.empresa_id || apt?.payer_id;
          const professionalId = r.professional_id || r.profissional_id || apt?.professional_id;
          const patientId = r.patient_id || r.paciente_id || apt?.patient_id;
          const serviceId = r.service_id || r.procedure_id || apt?.service_id;
          const roomId = r.room_id || apt?.room_id;
          if (payerId) {
            payerIds.add(payerId);
          }
          if (professionalId) {
            professionalIds.add(professionalId);
          }
          if (patientId) {
            patientIds.add(patientId);
          }
          if (serviceId) {
            serviceIds.add(serviceId);
          }
          if (roomId) {
            roomIds.add(roomId);
          }
          // Try ar_invoices column first
          if (r.plano_contas_id || r.chart_account_id) {
            planoIds.add(r.plano_contas_id || r.chart_account_id);
          } else {
            // Fall back to appointments
            if (apt?.plano_contas_id) {
              planoIds.add(apt.plano_contas_id);
            }
          }
        });

        console.log('📋 Collected plano_contas IDs:', Array.from(planoIds), 'count:', planoIds.size);

        // Step 3: Fetch related names if we have IDs
        const planoMap = {};
        if (planoIds.size > 0) {
          try {
            const planoData = await listAccountPlans(clinicId);
            const index = new Map((planoData || []).map((p) => [p.id, p.name]));
            Array.from(planoIds).forEach((id) => {
              if (index.has(id)) {
                planoMap[id] = index.get(id);
              }
            });
            console.log('✓ Plano map built:', planoMap);
          } catch (err) {
            console.error('❌ Exception fetching standard chart of accounts:', err);
          }
        } else {
          console.log('ℹ️ No plano_contas IDs found in data');
        }

        const payerMap = {};
        if (payerIds.size > 0) {
          try {
            const { data: payerData, error } = await supabase
              .from('payers')
              .select('id, name')
              .in('id', Array.from(payerIds));
            if (error) {
              console.error('❌ Error fetching payers:', error);
            } else {
              payerData?.forEach((payer) => {
                payerMap[payer.id] = payer.name;
              });
            }
          } catch (err) {
            console.error('❌ Exception fetching payers:', err);
          }
        }

        const professionalMap = {};
        if (professionalIds.size > 0) {
          try {
            const { data: professionalData, error } = await supabase
              .from('professionals')
              .select('id, name')
              .in('id', Array.from(professionalIds));
            if (error) {
              console.error('❌ Error fetching professionals:', error);
            } else {
              professionalData?.forEach((professional) => {
                professionalMap[professional.id] = professional.name;
              });
            }
          } catch (err) {
            console.error('❌ Exception fetching professionals:', err);
          }
        }

        const patientMap = {};
        if (patientIds.size > 0) {
          try {
            const { data: patientData, error } = await supabase
              .from('patients')
              .select('id, name')
              .in('id', Array.from(patientIds));
            if (error) {
              console.error('❌ Error fetching patients:', error);
            } else {
              patientData?.forEach((patient) => {
                patientMap[patient.id] = patient.name;
              });
            }
          } catch (err) {
            console.error('❌ Exception fetching patients:', err);
          }
        }

        const serviceMap = {};
        if (serviceIds.size > 0) {
          try {
            const { data: serviceData, error } = await supabase
              .from('services')
              .select('id, name')
              .in('id', Array.from(serviceIds));
            if (error) {
              console.error('❌ Error fetching services:', error);
            } else {
              serviceData?.forEach((service) => {
                serviceMap[service.id] = service.name;
              });
            }
          } catch (err) {
            console.error('❌ Exception fetching services:', err);
          }
        }

        const roomMap = {};
        if (roomIds.size > 0) {
          try {
            const { data: roomData, error } = await supabase
              .from('rooms')
              .select('id, name')
              .in('id', Array.from(roomIds));
            if (error) {
              console.error('❌ Error fetching rooms:', error);
            } else {
              roomData?.forEach((room) => {
                roomMap[room.id] = room.name;
              });
            }
          } catch (err) {
            console.error('❌ Exception fetching rooms:', err);
          }
        }

        const pickReceivableText = (...values) => values.find((value) => {
          if (value === null || value === undefined) {
            return false;
          }
          const text = String(value).trim();
          return text && text !== '—';
        });

        // Step 4: Apply enriched data
        const finalRows = enrichedWithDescription.map((r) => {
          const appointment = Array.isArray(r.appointments) ? r.appointments[0] : r.appointments;
          const metadata = r.metadata || {};
          const paymentData = metadata.payment_data || {};
          const appointmentData = metadata.appointment || paymentData.appointment || {};
          const patientId = r.patient_id || r.paciente_id || appointment?.patient_id;
          const serviceId = r.service_id || r.procedure_id || appointment?.service_id;
          const roomId = r.room_id || appointment?.room_id;
          const appointmentPatientName = pickReceivableText(patientId ? patientMap[patientId] : null, appointment?.patients?.name, appointment?.patient_name, appointmentData.patientName);
          const appointmentServiceName = pickReceivableText(
            serviceId ? serviceMap[serviceId] : null,
            appointmentData.serviceName,
            paymentData.serviceName,
            appointment?.services?.name,
            appointment?.service_name,
            r.procedure_name,
            r.service_description,
            r.description
          );
          const appointmentProfessionalName = pickReceivableText(
            appointmentData.professionalName,
            paymentData.professionalName,
            appointment?.professionals?.name,
            appointment?.professional_name
          );
          const appointmentUnitName = pickReceivableText(
            appointmentData.unitName,
            appointmentData.roomName,
            paymentData.unitName,
            paymentData.roomName,
            appointment?.unit_name,
            roomId ? roomMap[roomId] : null,
            appointment?.rooms?.unit_name,
            appointment?.rooms?.name
          );
          const appointmentSpecialtyName = pickReceivableText(
            appointmentData.specialtyName,
            paymentData.specialtyName,
            appointment?.professionals?.specialty_name,
            appointment?.professionals?.specialty,
            appointment?.specialty_name
          );
          const appointmentServiceGroup = pickReceivableText(
            appointmentData.serviceGroup,
            paymentData.serviceGroup,
            appointment?.services?.group_name,
            appointment?.services?.service_group,
            appointment?.services?.category,
            r.registered_service_group,
            r.service_group
          );
          const planoId = r.plano_contas_id || r.chart_account_id || appointment?.plano_contas_id;
          const payerId = r.payer_id || r.convenio_id || r.empresa_id || appointment?.payer_id;
          const professionalId = r.professional_id || r.profissional_id || appointment?.professional_id;
          const plano_contas_name = planoId ? planoMap[planoId] : 'Operacional';
          const payerName = payerId ? payerMap[payerId] : null;
          const professionalName = pickReceivableText(professionalId ? professionalMap[professionalId] : null, appointmentProfessionalName);
          const patientName = pickReceivableText(r.patient_name, r.payer_name, appointmentPatientName);
          const serviceName = pickReceivableText(r.registered_service_name, appointmentServiceName);
          const isGenericAgendaDescription = r.description === 'Recebimento registrado pela agenda';
          const serviceDescription = pickReceivableText(isGenericAgendaDescription ? serviceName : r.service_description, serviceName);
          const procedureName = pickReceivableText(r.procedure_name, serviceName);
          const description = isGenericAgendaDescription
            ? pickReceivableText(serviceDescription && patientName ? `${serviceDescription} - ${patientName}` : null, serviceDescription, r.description)
            : r.description;

          console.log(`✓ Final ${r.id}: convenio=${r.convenio_name}, plano=${plano_contas_name}, forma=${r.forma_prevista}`);

          return {
            ...r,
            __receivableDisplayEnriched: true,
            payer_display: formatReceivableText(pickReceivableText(r.payer_display, patientName)),
            payer_name: formatReceivableText(pickReceivableText(r.payer_name, patientName)),
            patient_name: formatReceivableText(patientName),
            description: formatReceivableText(description),
            service_description: formatReceivableText(serviceDescription),
            procedure_name: formatReceivableText(procedureName),
            registered_service_name: formatReceivableText(serviceName),
            service_group: formatReceivableText(appointmentServiceGroup || r.service_group),
            registered_service_group: formatReceivableText(appointmentServiceGroup || r.registered_service_group),
            convenio_name: formatReceivableText(pickReceivableText(payerName, r.convenio_name)),
            professional_name: formatReceivableText(pickReceivableText(professionalName, r.professional_name, r.profissional_name)),
            profissional_name: formatReceivableText(pickReceivableText(professionalName, r.profissional_name, r.professional_name)),
            unit_name: formatReceivableText(pickReceivableText(r.unit_name, r.unidade_name, appointmentUnitName)),
            unidade_name: formatReceivableText(pickReceivableText(r.unidade_name, r.unit_name, appointmentUnitName)),
            specialty_name: formatReceivableText(pickReceivableText(r.specialty_name, appointmentSpecialtyName)),
            plano_contas_name: formatReceivableText(plano_contas_name),
            forma_prevista: r.forma_prevista,
          };
        });

        setRows(finalRows.map(formatReceivableRowTexts));
        console.log('✅ Enrichment complete');
      } catch (err) {
        console.error('❌ Enrichment error:', err);
      }
    };

    enrichRows();
  }, [rows]);

  useEffect(() => {
    setSelectedReceivableIds((current) => current.filter((id) => rows.some((row) => row.id === id)));
  }, [rows]);

  const toggleReceivableSelection = (rowId) => {
    setSelectedReceivableIds((current) => (
      current.includes(rowId)
        ? current.filter((id) => id !== rowId)
        : [...current, rowId]
    ));
  };

  const toggleAllVisibleSelection = () => {
    if (allVisibleSelected) {
      setSelectedReceivableIds((current) => current.filter((id) => !selectableRows.some((row) => row.id === id)));
      return;
    }
    setSelectedReceivableIds((current) => Array.from(new Set([...current, ...selectableRows.map((row) => row.id)])));
  };

  const clearSelection = () => {
    setSelectedReceivableIds([]);
    setBulkAction('');
  };

  const getBulkActionLabel = (type) => ({
    receive: 'Registrar recebimento',
    glosa: 'Registrar glosa',
    glosa_contestada: 'Contestar glosa',
    glosa_recuperada: 'Recuperar glosa',
    glosa_aceita: 'Aceitar perda',
    fiscal_review: 'Marcar revisão fiscal',
    fiscal_reopen: 'Reabrir revisão fiscal',
    cancel: 'Cancelar lançamentos',
    delete: 'Excluir lançamentos',
  }[type] || 'Executar ação');

  const getBulkActionCandidates = (type, actionRows = selectedRows) => {
    if (type === 'delete') return actionRows;
    if (type === 'receive' || type === 'glosa') {
      return actionRows.filter((row) => !['received', 'canceled', 'glossed'].includes(row.status));
    }
    if (['glosa_contestada', 'glosa_recuperada', 'glosa_aceita'].includes(type)) {
      return actionRows.filter((row) => Number(row.glosa_value || 0) > 0 || row.last_glosa);
    }
    if (type === 'fiscal_review') {
      return actionRows.filter((row) => getDocumentExtraction(row) && getFiscalReviewStatus(row)?.status !== 'reviewed');
    }
    if (type === 'fiscal_reopen') {
      return actionRows.filter((row) => getDocumentExtraction(row) && getFiscalReviewStatus(row)?.status === 'reviewed');
    }
    if (type === 'cancel') {
      return actionRows.filter((row) => !['canceled', 'glossed'].includes(row.status));
    }
    return actionRows;
  };

  const getBulkGlosaWorkflowStatus = (type) => ({
    glosa_contestada: 'contestada',
    glosa_recuperada: 'recuperada',
    glosa_aceita: 'aceita',
  }[type]);

  const applyBulkAction = () => {
    if (!selectedRows.length) {
      toast({ variant: 'destructive', title: 'Nenhum lançamento selecionado' });
      return;
    }
    if (!bulkAction) {
      toast({ variant: 'destructive', title: 'Selecione uma ação' });
      return;
    }
    if (bulkAction === 'delete' && !isAdmin) {
      toast({ variant: 'destructive', title: 'Apenas admin pode excluir lançamentos' });
      return;
    }
    const candidates = getBulkActionCandidates(bulkAction, selectedRows);
    if (!candidates.length) {
      toast({ variant: 'destructive', title: 'Nenhum lançamento apto para esta ação' });
      return;
    }
    setBulkConfirmAction({ type: bulkAction, rows: candidates });
  };

  const executeBulkReceive = async () => {
    const candidates = getBulkActionCandidates('receive');
    if (!candidates.length) {
      toast({ variant: 'destructive', title: 'Nenhum lançamento apto para receber' });
      return;
    }

    setActionLoadingId('bulk-receive');
    setBulkConfirmAction(null);
    toast({ title: 'Processando recebimentos em lote', description: `${candidates.length} lançamento(s) serão baixados.` });
    const failures = [];
    const updates = [];
    try {
      for (const row of candidates) {
        try {
          const amount = getReceivableBalance(row) || getDisplayAmount(row);
          const paymentMethod = resolveBulkPaymentMethod(row);
          const updated = await registerReceivablePayment({
            clinicId,
            receivableId: row.id,
            amount,
            payments: [{
              amount,
              method: paymentMethod,
              reference: bulkReceiveForm.reference,
            }],
            paymentDate: bulkReceiveForm.paymentDate || new Date().toISOString().slice(0, 10),
            notes: bulkReceiveForm.notes,
            createdBy: currentRole || 'user',
          });
          updates.push(updated);
        } catch (error) {
          failures.push(`${row.patient_name || row.payer_name || row.description || row.id}: ${error?.message || 'erro desconhecido'}`);
        }
      }

      setRows((prev) => prev.map((row) => updates.find((updated) => updated.id === row.id) || row));
      if (updates.length) {
        const date = new Date(bulkReceiveForm.paymentDate || new Date());
        const { error: commissionError } = await supabase.rpc('generate_doctor_commissions_v2', {
          p_clinic_id: clinicId,
          p_month: date.getMonth() + 1,
          p_year: date.getFullYear(),
          p_mode: 'standard',
        });
        if (commissionError) console.warn('generate_doctor_commissions_v2 error', commissionError.message);
      }
      toast({
        title: `${updates.length} recebimento(s) registrado(s)`,
        description: failures.length ? `${failures.length} lançamento(s) não foram processados.` : 'Selecionados atualizados com sucesso.',
      });
      if (failures.length) console.warn('[ContasReceber] Falhas no recebimento em lote:', failures);
      clearSelection();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro no recebimento em lote', description: error?.message || 'Nao foi possivel concluir a ação.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const executeBulkStatusAction = async (type) => {
    const candidates = bulkConfirmAction?.type === type ? bulkConfirmAction.rows : getBulkActionCandidates(type);
    if (!candidates.length) {
      toast({ variant: 'destructive', title: 'Nenhum lançamento apto para a ação' });
      return;
    }

    setActionLoadingId(`bulk-${type}`);
    setBulkConfirmAction(null);
    toast({
      title: type === 'delete' ? 'Excluindo lançamentos selecionados' : 'Cancelando lançamentos em lote',
      description: `${candidates.length} lançamento(s) serão processados.`,
    });
    const failures = [];
    const deletedIds = new Set();
    const updatedRows = [];
    try {
      if (type === 'delete') {
        for (const row of candidates) {
          setRows((prev) => prev.filter((item) => item.id !== row.id));
          setSelectedReceivableIds((current) => current.filter((id) => id !== row.id));
          await new Promise((resolve) => setTimeout(resolve, 60));
        }

        for (const row of candidates) {
          try {
            await deleteReceivable(row.id, clinicId);
            deletedIds.add(row.id);
          } catch (error) {
            failures.push(`${row.patient_name || row.payer_name || row.description || row.id}: ${error?.message || 'erro desconhecido'}`);
            setRows((prev) => (prev.some((item) => item.id === row.id) ? prev : [row, ...prev]));
          }
        }

        toast({
          title: `${deletedIds.size} lançamento(s) excluído(s)`,
          description: failures.length
            ? `${failures.length} lançamento(s) não foram processados.`
            : 'Os registros selecionados foram removidos definitivamente.',
        });
        if (failures.length) console.warn('[ContasReceber] Falhas na ação em lote:', failures);
        clearSelection();
        return;
      }

      for (const row of candidates) {
        try {
          const updated = await updateReceivable(row.id, {
            status: 'canceled',
            received_value: 0,
            received_date: null,
            received_at: null,
          }, clinicId);
          updatedRows.push(updated);
        } catch (error) {
          failures.push(`${row.patient_name || row.payer_name || row.description || row.id}: ${error?.message || 'erro desconhecido'}`);
        }
      }

      setRows((prev) => prev.map((row) => updatedRows.find((updated) => updated.id === row.id) || row));
      const successCount = updatedRows.length;
      toast({
        title: `${successCount} lançamento(s) cancelado(s)`,
        description: failures.length
          ? `${failures.length} lançamento(s) não foram processados.`
          : 'Selecionados atualizados com sucesso.',
      });
      if (failures.length) console.warn('[ContasReceber] Falhas na ação em lote:', failures);
      clearSelection();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro na ação em lote', description: error?.message || 'Nao foi possivel concluir a ação.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const executeBulkGlosa = async () => {
    const candidates = getBulkActionCandidates('glosa');
    if (!candidates.length) {
      toast({ variant: 'destructive', title: 'Nenhum lançamento apto para glosa' });
      return;
    }

    setActionLoadingId('bulk-glosa');
    setBulkConfirmAction(null);
    toast({ title: 'Registrando glosas em lote', description: `${candidates.length} lançamento(s) serão processados.` });
    const failures = [];
    const updatedRows = [];
    try {
      for (const row of candidates) {
        try {
          const glosaAmount = Number(bulkGlosaForm.glosaAmount || getReceivableBalance(row) || getDisplayAmount(row));
          const paidAmount = Number(bulkGlosaForm.paidAmount || row.received_value || row.paid_total || 0);
          const updated = await registerReceivableGlosa({
            clinicId,
            receivableId: row.id,
            sentAmount: getDisplayAmount(row),
            paidAmount,
            glosaAmount,
            reason: bulkGlosaForm.reason,
            glosaType: bulkGlosaForm.glosaType,
            contestationStatus: bulkGlosaForm.contestationStatus,
            responsible: bulkGlosaForm.responsible || currentRole || '',
            glosaDate: bulkGlosaForm.glosaDate,
          });
          updatedRows.push(updated);
        } catch (error) {
          failures.push(`${row.patient_name || row.payer_name || row.description || row.id}: ${error?.message || 'erro desconhecido'}`);
        }
      }

      setRows((prev) => prev.map((row) => updatedRows.find((updated) => updated.id === row.id) || row));
      toast({
        title: `${updatedRows.length} glosa(s) registrada(s)`,
        description: failures.length ? `${failures.length} lançamento(s) não foram processados.` : 'Selecionados atualizados com sucesso.',
      });
      if (failures.length) console.warn('[ContasReceber] Falhas na glosa em lote:', failures);
      clearSelection();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro na glosa em lote', description: error?.message || 'Nao foi possivel concluir a ação.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const executeBulkGlosaWorkflow = async (type) => {
    const status = getBulkGlosaWorkflowStatus(type);
    const candidates = getBulkActionCandidates(type);
    if (!status || !candidates.length) {
      toast({ variant: 'destructive', title: 'Nenhuma glosa apta para esta ação' });
      return;
    }

    setActionLoadingId(`bulk-${type}`);
    setBulkConfirmAction(null);
    toast({ title: `${getBulkActionLabel(type)} em lote`, description: `${candidates.length} lançamento(s) serão processados.` });
    const failures = [];
    const results = [];
    try {
      for (const row of candidates) {
        try {
          const glosaValue = Number(row.glosa_value || row.last_glosa?.glosa_amount || 0);
          const result = await updateReceivableGlosaWorkflow({
            clinicId,
            receivableId: row.id,
            status,
            contestedAmount: Number(bulkGlosaWorkflowForm.contestedAmount || (status === 'contestada' ? glosaValue : 0)),
            recoveredAmount: Number(bulkGlosaWorkflowForm.recoveredAmount || (status === 'recuperada' ? glosaValue : 0)),
            finalLossAmount: Number(bulkGlosaWorkflowForm.finalLossAmount || (status === 'aceita' ? glosaValue : 0)),
            contestationDeadline: bulkGlosaWorkflowForm.contestationDeadline || null,
            responsible: bulkGlosaWorkflowForm.responsible || currentRole || '',
            notes: bulkGlosaWorkflowForm.notes,
            evidenceUrl: null,
            evidencePath: null,
            evidenceName: null,
          });
          results.push({ id: row.id, result });
        } catch (error) {
          failures.push(`${row.patient_name || row.payer_name || row.description || row.id}: ${error?.message || 'erro desconhecido'}`);
        }
      }

      setRows((prev) => prev.map((row) => {
        const match = results.find((item) => item.id === row.id);
        if (!match) return row;
        return {
          ...row,
          ...match.result.receivable,
          last_glosa: match.result.glosa,
          glosa_evidence_url: match.result.glosa?.evidence_url || row.glosa_evidence_url || null,
          glosa_evidence_path: match.result.glosa?.evidence_path || row.glosa_evidence_path || null,
          glosa_evidence_name: match.result.glosa?.evidence_name || row.glosa_evidence_name || null,
        };
      }));
      toast({
        title: `${results.length} glosa(s) atualizada(s)`,
        description: failures.length ? `${failures.length} lançamento(s) não foram processados.` : 'Selecionados atualizados com sucesso.',
      });
      if (failures.length) console.warn('[ContasReceber] Falhas no workflow de glosa em lote:', failures);
      clearSelection();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro no workflow de glosa em lote', description: error?.message || 'Nao foi possivel concluir a ação.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const executeBulkFiscalReview = async (type) => {
    const candidates = getBulkActionCandidates(type);
    if (!candidates.length) {
      toast({ variant: 'destructive', title: 'Nenhum documento apto para revisão fiscal' });
      return;
    }

    setActionLoadingId(`bulk-${type}`);
    setBulkConfirmAction(null);
    const isReopen = type === 'fiscal_reopen';
    toast({ title: `${getBulkActionLabel(type)} em lote`, description: `${candidates.length} documento(s) serão processados.` });
    const failures = [];
    const updatedRows = [];
    try {
      for (const row of candidates) {
        try {
          const previousEvents = Array.isArray(row.metadata?.fiscal_review_events) ? row.metadata.fiscal_review_events : [];
          const metadata = {
            ...(row.metadata || {}),
            fiscal_review: isReopen
              ? {
                  status: 'pending',
                  reopened_at: new Date().toISOString(),
                  reopened_by: currentRole || 'operador',
                  notes: fiscalReviewNotes || null,
                }
              : {
                  status: 'reviewed',
                  reviewed_at: new Date().toISOString(),
                  reviewed_by: currentRole || 'operador',
                  divergence_count: 0,
                  notes: fiscalReviewNotes || null,
                },
            fiscal_review_events: [
              ...previousEvents,
              {
                action: isReopen ? 'reopened' : 'reviewed',
                at: new Date().toISOString(),
                by: currentRole || 'operador',
                divergence_count: isReopen ? undefined : 0,
                notes: fiscalReviewNotes || null,
              },
            ],
          };
          const updated = await updateReceivable(row.id, { metadata }, clinicId);
          updatedRows.push({ ...row, ...updated, metadata });
        } catch (error) {
          failures.push(`${row.patient_name || row.payer_name || row.description || row.id}: ${error?.message || 'erro desconhecido'}`);
        }
      }

      setRows((prev) => prev.map((row) => updatedRows.find((updated) => updated.id === row.id) || row));
      toast({
        title: `${updatedRows.length} documento(s) atualizado(s)`,
        description: failures.length ? `${failures.length} documento(s) não foram processados.` : 'Selecionados atualizados com sucesso.',
      });
      if (failures.length) console.warn('[ContasReceber] Falhas na revisão fiscal em lote:', failures);
      clearSelection();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro na revisão fiscal em lote', description: error?.message || 'Nao foi possivel concluir a ação.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const openReceiveModal = (row) => {
    const balance = getReceivableBalance(row);
    setReceiveForm({
      amount: balance ? balance.toFixed(2) : getDisplayAmount(row).toFixed(2),
      paymentMethod: row.payment_method || row.received_payment_method || 'pix',
      paymentDate: new Date().toISOString().split('T')[0],
      reference: '',
      splitAmount: '',
      splitMethod: '',
      splitReference: '',
      notes: '',
    });
    setConfirmReceived(row);
  };

  const openGlosaModal = (row) => {
    setGlosaForm({
      glosaAmount: '',
      paidAmount: Number(row.received_value || row.paid_total || 0).toFixed(2),
      reason: '',
      glosaType: 'administrativa',
      contestationStatus: 'pendente',
      responsible: '',
      glosaDate: new Date().toISOString().split('T')[0],
    });
    setGlosaAction(row);
  };

  const openGlosaWorkflowModal = (row, status) => {
    const glosaValue = Number(row.glosa_value || 0);
    setGlosaWorkflowForm({
      status,
      contestedAmount: status === 'contestada' ? glosaValue.toFixed(2) : '',
      recoveredAmount: status === 'recuperada' ? Math.min(glosaValue, getReceivableBalance(row)).toFixed(2) : '',
      finalLossAmount: status === 'aceita' ? glosaValue.toFixed(2) : '',
      contestationDeadline: '',
      responsible: '',
      notes: '',
    });
    setGlosaEvidenceFile(null);
    setGlosaWorkflowAction(row);
  };

  const markReceived = async (row) => {
    setActionLoadingId(row.id);
    try {
      const primaryAmount = Number(receiveForm.amount || getReceivableBalance(row));
      const splitAmount = Number(receiveForm.splitAmount || 0);
      const payments = [
        {
          method: receiveForm.paymentMethod || 'pix',
          amount: primaryAmount,
          reference: receiveForm.reference,
        },
        splitAmount > 0
          ? {
              method: receiveForm.splitMethod || 'outro',
              amount: splitAmount,
              reference: receiveForm.splitReference,
            }
          : null,
      ].filter(Boolean);
      const updated = await registerReceivablePayment({
        clinicId,
        receivableId: row.id,
        amount: primaryAmount + splitAmount,
        payments,
        paymentDate: receiveForm.paymentDate || new Date().toISOString().slice(0, 10),
        notes: receiveForm.notes,
        createdBy: currentRole || 'user',
      });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...updated } : r)));
      setConfirmReceived(null);
      setReceiveForm({
        amount: '',
        paymentMethod: 'pix',
        paymentDate: new Date().toISOString().split('T')[0],
        reference: '',
        splitAmount: '',
        splitMethod: '',
        splitReference: '',
        notes: '',
      });
      // Dispara cálculo de repasse para mês/ano do recebimento
      const d = updated.received_date || updated.received_at ? new Date(updated.received_date || updated.received_at) : new Date();
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const { error: commissionError } = await supabase.rpc('generate_doctor_commissions_v2', {
          p_clinic_id: clinicId,
          p_month: m,
          p_year: y,
          p_mode: 'standard',
      });
      if (commissionError) {
        console.warn('generate_doctor_commissions_v2 error', commissionError.message);
      }
      toast({ title: 'Recebimento registrado', description: 'Saldo, fluxo de caixa e repasses foram atualizados.' });
    } catch (e) {
      console.warn('markReceived error', e?.message || e);
      toast({ variant: 'destructive', title: 'Erro ao confirmar recebimento', description: e?.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const registerGlosa = async (row) => {
    setActionLoadingId(row.id);
    try {
      const updated = await registerReceivableGlosa({
        clinicId,
        receivableId: row.id,
        sentAmount: getDisplayAmount(row),
        paidAmount: Number(glosaForm.paidAmount || row.received_value || row.paid_total || 0),
        glosaAmount: Number(glosaForm.glosaAmount || 0),
        reason: glosaForm.reason,
        glosaType: glosaForm.glosaType,
        contestationStatus: glosaForm.contestationStatus,
        responsible: glosaForm.responsible,
        glosaDate: glosaForm.glosaDate,
      });
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, ...updated } : item)));
      setGlosaAction(null);
      toast({ title: 'Glosa registrada', description: 'O recebivel foi atualizado com saldo e status de glosa.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao registrar glosa', description: e?.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const updateGlosaWorkflow = async (row) => {
    setActionLoadingId(row.id);
    try {
      const evidencePayload = glosaEvidenceFile
        ? await uploadReceivableGlosaEvidenceFile(clinicId, glosaEvidenceFile)
        : null;
      const result = await updateReceivableGlosaWorkflow({
        clinicId,
        receivableId: row.id,
        status: glosaWorkflowForm.status,
        contestedAmount: Number(glosaWorkflowForm.contestedAmount || 0),
        recoveredAmount: Number(glosaWorkflowForm.recoveredAmount || 0),
        finalLossAmount: Number(glosaWorkflowForm.finalLossAmount || 0),
        contestationDeadline: glosaWorkflowForm.contestationDeadline || null,
        responsible: glosaWorkflowForm.responsible || currentRole || '',
        notes: glosaWorkflowForm.notes,
        evidenceUrl: evidencePayload?.url || null,
        evidencePath: evidencePayload?.path || null,
        evidenceName: evidencePayload?.name || null,
      });
      setRows((prev) => prev.map((item) => (item.id === row.id ? {
        ...item,
        ...result.receivable,
        last_glosa: result.glosa,
        glosa_evidence_url: result.glosa?.evidence_url || null,
        glosa_evidence_path: result.glosa?.evidence_path || null,
        glosa_evidence_name: result.glosa?.evidence_name || null,
      } : item)));
      setGlosaWorkflowAction(null);
      setGlosaEvidenceFile(null);
      const labels = { contestada: 'contestada', recuperada: 'recuperada', aceita: 'aceita como perda' };
      toast({ title: 'Workflow de glosa atualizado', description: `Glosa ${labels[glosaWorkflowForm.status] || 'atualizada'} com sucesso.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar glosa', description: e?.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const cancelReceivable = async (row) => {
    setActionLoadingId(row.id);
    try {
      const updated = await updateReceivable(row.id, {
        status: 'canceled',
        received_value: 0,
        received_date: null,
        received_at: null,
      }, clinicId);
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, ...updated } : item)));
      setConfirmAction(null);
      toast({ title: 'Lançamento cancelado', description: 'Ele não entra mais como pendente, atrasado ou no fluxo de caixa.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao cancelar lançamento', description: e?.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const removeReceivable = async (row) => {
    if (!isAdmin) {
      toast({ variant: 'destructive', title: 'Apenas admin pode excluir lançamentos' });
      return;
    }
    setActionLoadingId(row.id);
    try {
      await deleteReceivable(row.id, clinicId);
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      setConfirmAction(null);
      toast({ title: 'Lançamento excluído', description: 'O registro foi removido definitivamente.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao excluir lançamento', description: e?.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  // 🔗 Função para acessar a origem do pagamento
  const handleOriginClick = async (row) => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔗 [ContasReceber] handleOriginClick INICIADO');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 LINHA COMPLETA DA TABELA:', JSON.stringify(row, null, 2));
    console.log('Origem:', row.origem);
    console.log(
      'appointment_id:',
      row.appointment_id,
      '(tipo:',
      typeof row.appointment_id,
      ', vazio?:',
      !row.appointment_id,
      ')',
    );
    console.log('data_emissao:', row.data_emissao, '(type:', typeof row.data_emissao + ')');
    console.log(
      'due_date:',
      row.due_date,
      '(type:',
      typeof row.due_date + ')',
    );

    if (row.origem !== 'Agenda') {
      console.log('❌ Não é Agenda, ignorando');
      return;
    }

    console.log('✅ É Agenda, processando...');

    // Se tem appointmentId, buscar DATA do agendamento no banco
    if (row.appointment_id) {
      console.log('✅ Priori 1: Tem appointmentId =', row.appointment_id);
      console.log('🔍 Buscando dados do agendamento na tabela "appointments"...');

      let appointmentDate = null;

      try {
        // Buscar o agendamento para pegar a data - buscando TODOS os campos
        console.log('📡 Enviando query:', { table: 'appointments', id: row.appointment_id });
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', row.appointment_id)
          .single();

        console.log('📨 Resposta Supabase - data:', appointmentData);
        console.log('📨 Resposta Supabase - error:', appointmentError);

        if (appointmentData) {
          console.log('✅ Agendamento encontrado - TODOS OS CAMPOS:', appointmentData);

          // Log de cada campo de data potencial
          console.log('   - appointment_date:', appointmentData.appointment_date);
          console.log('   - date:', appointmentData.date);
          console.log('   - data:', appointmentData.data);
          console.log('   - data_atendimento:', appointmentData.data_atendimento);
          console.log('   - scheduled_date:', appointmentData.scheduled_date);
          console.log('   - service_date:', appointmentData.service_date);

          // Procurar a data em qualquer campo que pareça ter data
          const dateCandidates = [
            appointmentData.appointment_date,
            appointmentData.date,
            appointmentData.data,
            appointmentData.data_atendimento,
            appointmentData.scheduled_date,
            appointmentData.service_date,
          ];

          for (const candidate of dateCandidates) {
            if (candidate) {
              let extracted = candidate;
              if (typeof extracted === 'string' && extracted.includes('T')) {
                extracted = extracted.split('T')[0];
              }
              if (/^\d{4}-\d{2}-\d{2}/.test(extracted)) {
                appointmentDate = extracted;
                console.log('✅ Data extraída do agendamento:', appointmentDate);
                break;
              }
            }
          }
        } else if (appointmentError) {
          console.warn('❌ Erro ao buscar agendamento:', appointmentError);
        } else {
          console.warn('⚠️  Agendamento não encontrado (null)');
        }
      } catch (e) {
        console.warn('❌ Erro try/catch ao buscar agendamento:', e?.message || e);
      }

      // 🔄 FALLBACK: Se não encontrou data do agendamento, usar data_emissao
      if (!appointmentDate) {
        console.log('⚠️  appointmentDate ainda está vazio, tentando data_emissao...');
        if (row.data_emissao) {
          let extracted = row.data_emissao;
          if (typeof extracted === 'string' && extracted.includes('T')) {
            extracted = extracted.split('T')[0];
          }
          if (/^\d{4}-\d{2}-\d{2}/.test(extracted)) {
            appointmentDate = extracted;
            console.log('✅ Usando fallback data_emissao:', appointmentDate);
          }
        } else {
          console.log('⚠️  data_emissao também está vazia');
        }
      }

      // 🔄 FALLBACK: Se ainda não tem, usar due_date (ÚLTIMO RECURSO)
      if (!appointmentDate) {
        console.log(
          '❌ appointmentDate AINDA está vazio! Caindo para ÚLTIMO RECURSO due_date...',
        );
        if (row.due_date) {
          let extracted = row.due_date;
          if (typeof extracted === 'string' && extracted.includes('T')) {
            extracted = extracted.split('T')[0];
          }
          if (/^\d{4}-\d{2}-\d{2}/.test(extracted)) {
            appointmentDate = extracted;
            console.log(
              '⚠️  ⚠️  ⚠️  ÚLTIMO RECURSO: Using fallback due_date:',
              appointmentDate,
            );
          }
        } else {
          console.log('⚠️  due_date também está vazia!');
        }
      }

      const navUrl = appointmentDate
        ? `/clinica/agenda?appointmentDate=${appointmentDate}&appointmentId=${row.appointment_id}&mode=edit`
        : `/clinica/agenda?appointmentId=${row.appointment_id}&mode=edit`;
      const navState = {
        fromFinancial: true,
        appointmentId: row.appointment_id,
        mode: 'edit',
        ...(appointmentDate && { appointmentDate }),
      };

      console.log('═══════════════════════════════════════════════════════');
      console.log('📊 RESUMO FINAL - Prioridade 1 (com appointment_id):');
      console.log('   appointmentDate encontrada:', appointmentDate);
      console.log('   Navegando para:', navUrl);
      console.log('   State:', navState);
      console.log('═══════════════════════════════════════════════════════');

      // 💾 BACKUP: Guardar no localStorage
      localStorage.setItem('agendaFromFinancialAppointmentId', row.appointment_id);
      if (appointmentDate) {
        localStorage.setItem('agendaFromFinancialDate', appointmentDate);
      }
      console.log('💾 Guardado em localStorage:', {
        appointmentId: row.appointment_id,
        appointmentDate,
      });

      navigate(navUrl, { state: navState });
      return;
    }

    // Se tem data_emissao, usar ela (garantir que é apenas data YYYY-MM-DD)
    if (row.data_emissao) {
      let extractedDate = row.data_emissao;

      // Se tiver 'T' (timestamp), extrair só a parte da data
      if (typeof extractedDate === 'string' && extractedDate.includes('T')) {
        extractedDate = extractedDate.split('T')[0];
      }

      // Garantir formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}/.test(extractedDate)) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ Priori 2: SEM appointment_id, Usando data_emissao =', extractedDate);
        console.log('═══════════════════════════════════════════════════════');
        const navUrl = `/clinica/agenda?appointmentDate=${extractedDate}`;
        const navState = { fromFinancial: true, appointmentDate: extractedDate };

        // 💾 BACKUP: Guardar no localStorage
        localStorage.setItem('agendaFromFinancialDate', extractedDate);
        console.log('💾 Guardado em localStorage: agendaFromFinancialDate =', extractedDate);

        navigate(navUrl, { state: navState });
        return;
      } else {
        console.log('⚠️  data_emissao não está em formato YYYY-MM-DD:', extractedDate);
      }
    } else {
      console.log('⚠️  row.data_emissao está vazio/null');
    }

    // Se tem due_date (fallback)
    if (row.due_date) {
      let extractedDate = row.due_date;

      if (typeof extractedDate === 'string' && extractedDate.includes('T')) {
        extractedDate = extractedDate.split('T')[0];
      }

      if (/^\d{4}-\d{2}-\d{2}/.test(extractedDate)) {
        console.log('═══════════════════════════════════════════════════════');
        console.log(
          '⚠️  ⚠️  ⚠️  Priori 3: ÚLTIMO RECURSO - Usando due_date =',
          extractedDate,
        );
        console.log('⚠️  ISSO SIGNIFICA QUE O APPOINTMENT_ID ESTÁ VAZIO OU NÃO ENCONTRADO!');
        console.log('═══════════════════════════════════════════════════════');
        const navUrl = `/clinica/agenda?appointmentDate=${extractedDate}`;
        const navState = { fromFinancial: true, appointmentDate: extractedDate };

        // 💾 BACKUP: Guardar no localStorage
        localStorage.setItem('agendaFromFinancialDate', extractedDate);
        console.log('💾 Guardado em localStorage: agendaFromFinancialDate =', extractedDate);

        navigate(navUrl, { state: navState });
        return;
      }
    }

    console.log('❌ Sem dados válidos, indo para agenda vazio');
    navigate('/clinica/agenda');
  };

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Contas a Receber"
      subtitle="Gerencie valores pendentes de pacientes, convênios ou empresas."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isReconcilingReceivables || !clinicId}
            onClick={runReceivablesSmartReconciliation}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isReconcilingReceivables ? 'animate-spin' : ''}`} />
            {isReconcilingReceivables ? 'Conciliando' : 'Conciliar'}
          </Button>
          <Button
            className="bg-blue-600 text-white"
            onClick={() => navigate('/clinica/financeiro/receber/nova')}
          >
            <Plus className="mr-2 w-4 h-4" /> Novo Recebimento
          </Button>
        </div>
      }
    >
      {reconciliationSummary && (
        <Card className="mb-4 border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Conciliação inteligente concluída: {reconciliationSummary}
        </Card>
      )}

      {renderXmlBatchProgress('mb-4')}

      {reconciliationResult?.matches?.length ? (
        <Card className="mb-4 border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Revisão de conciliação</p>
              <p className="text-xs text-slate-500">Confirme ou rejeite sugestões antes de fechar a conciliação bancária de recebíveis.</p>
            </div>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
              {reconciliationResult.matches.filter((match) => match.status === 'review').length} para revisar
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-3 py-2 font-medium">Recebível</th>
                  <th className="px-3 py-2 font-medium">Extrato</th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                  <th className="px-3 py-2 text-center font-medium">Confiança</th>
                  <th className="px-3 py-2 font-medium">Evidência</th>
                  <th className="px-3 py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {reconciliationResult.matches.map((match) => {
                  const receivable = receivableById.get(match.receivable_id);
                  const isMatched = match.status === 'matched';
                  const isBusy = reconciliationActionId === match.bank_transaction_id;
                  return (
                    <tr key={`${match.receivable_id}-${match.bank_transaction_id}`} className="border-b last:border-0">
                      <td className="px-3 py-3 align-top">
                        <div className="font-medium text-slate-900">
                          {formatReceivableText(receivable?.payer_display || receivable?.payer_name || receivable?.patient_name) || 'Recebível fora da página atual'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatReceivableText(receivable?.description) || match.receivable_id}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="font-medium text-slate-900">{formatReceivableText(match.description) || 'Transação bancária'}</div>
                        <div className="text-xs text-slate-500">{match.transaction_date}</div>
                      </td>
                      <td className="px-3 py-3 text-right align-top font-medium">
                        {Number(match.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-3 py-3 text-center align-top">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${match.confidence >= 85 ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-700'}`}>
                          {Math.round(match.confidence)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top text-xs text-slate-600">
                        <div>{labelReceivableReconciliationMatchType(match.match_type)}</div>
                        <div>{formatReceivableText(match.score_reason)}</div>
                      </td>
                      <td className="px-3 py-3 text-right align-top">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={isMatched ? 'outline' : 'default'}
                            disabled={isBusy || isMatched}
                            onClick={() => approveReceivableReconciliation(match)}
                          >
                            Aprovar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isBusy || isMatched}
                            onClick={() => rejectReceivableReconciliation(match)}
                          >
                            Rejeitar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {cameFromCashflow && (
        <Card className="mb-4 border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Origem: Fluxo de Caixa{trace ? ` (${trace})` : ''}. Os filtros desta tela foram carregados a partir do atalho financeiro.
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/clinica/financeiro/fluxo-caixa')}
              >
                Voltar ao Fluxo de Caixa
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate('/clinica/financeiro/receber', { replace: true })}
              >
                Limpar rastreio
              </Button>
            </div>
          </div>
        </Card>
      )}

      {cameFromDre && (
        <Card className="mb-4 border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Origem: DRE Gerencial{trace ? ` (${trace})` : ''}. As contas foram filtradas a partir do paciente/profissional selecionado.
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(returnTo)}
              >
                Voltar para DRE
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate('/clinica/financeiro/receber', { replace: true })}
              >
                Limpar rastreio
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* RESUMO FINANCEIRO */}
      <div className="grid gap-3 mb-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {[
          { label: 'Receita prevista', value: summary.total, hint: `${allLoadedRows.length} contas`, tone: 'text-blue-700', icon: Clock },
          { label: 'Realizada', value: summary.realized, hint: 'Baixas registradas', tone: 'text-green-700', icon: Check },
          { label: 'Recebido no mês', value: summary.receivedMonth, hint: 'Competência atual', tone: 'text-emerald-700', icon: Check },
          { label: 'Recebido hoje', value: summary.receivedToday, hint: 'Operação diária', tone: 'text-cyan-700', icon: Check },
          { label: 'Próximos 30 dias', value: summary.next30, hint: 'Vencimentos futuros', tone: 'text-indigo-700', icon: Clock },
          { label: 'Vencido', value: summary.overdue, hint: `${summary.defaultRate.toFixed(1)}% inadimplência`, tone: 'text-red-700', icon: AlertCircle },
          { label: 'Pendente', value: summary.pending, hint: 'Saldo aberto', tone: 'text-orange-700', icon: Clock },
          { label: 'Glosas', value: summary.glosas, hint: 'Valor glosado', tone: 'text-rose-700', icon: XCircle },
          { label: 'Impostos XML', value: summary.extractedTaxes, hint: `${summary.extractedDocuments} docs lidos`, tone: 'text-emerald-700', icon: FileText },
          { label: 'Revisao fiscal', value: summary.fiscalReviewPending, hint: `${summary.fiscalReviewDone} revisados`, tone: summary.fiscalReviewPending ? 'text-amber-700' : 'text-green-700', icon: AlertCircle, numeric: true },
          { label: 'Ticket médio', value: summary.averageTicket, hint: 'Por lançamento', tone: 'text-slate-700', icon: FileText },
          { label: 'Repasse previsto', value: summary.repasseExpected, hint: 'Profissionais', tone: 'text-violet-700', icon: FileText },
          { label: 'Repasse pago', value: summary.repassePaid, hint: 'Comissões baixadas', tone: 'text-fuchsia-700', icon: Check },
          { label: 'Receitas convênios', value: summary.convenioRevenue, hint: 'Pagador convênio', tone: 'text-teal-700', icon: FileText },
          { label: 'Receitas particulares', value: summary.particularRevenue, hint: 'Pacientes e particulares', tone: 'text-sky-700', icon: FileText },
          { label: 'Receitas empresas', value: summary.companyRevenue, hint: 'Pagador empresa', tone: 'text-purple-700', icon: FileText },
          { label: 'Receita por unidade', value: summary.topUnitRevenue.value, hint: summary.topUnitRevenue.name, tone: 'text-lime-700', icon: FileText },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="p-3 border-gray-200 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500">{item.label}</p>
                  <p className={`mt-1 text-lg font-bold ${item.tone}`}>
                    {item.numeric
                      ? (item.value || 0).toLocaleString('pt-BR')
                      : (item.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500 truncate">{item.hint}</p>
                </div>
                <Icon className={`w-5 h-5 ${item.tone}`} />
              </div>
            </Card>
          );
        })}
      </div>

      {(summary.fiscalReviewPending > 0 || summary.fiscalDivergences > 0) && (
        <Card className="mb-6 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Alertas de revisao fiscal XML</p>
              <p className="text-xs text-amber-800">
                {summary.fiscalReviewPending} pendente(s), {summary.oldFiscalPending} com 7+ dias e {summary.fiscalDivergences} com divergencia(s) atuais.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const nextFilters = { ...filters, documentExtraction: 'with_extraction', fiscalReview: 'pending' };
                  setFilters(nextFilters);
                  setShowFilters(true);
                  load(nextFilters);
                }}
              >
                Ver pendentes
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-amber-600 text-white hover:bg-amber-700"
                onClick={() => {
                  const nextFilters = { ...filters, documentExtraction: 'with_extraction', fiscalReview: '' };
                  setFilters(nextFilters);
                  setShowFilters(true);
                  load(nextFilters);
                }}
              >
                Revisar XMLs
              </Button>
            </div>
          </div>
          {summary.fiscalReviewQueue?.length > 0 && (
            <div className="mt-4 grid gap-2 lg:grid-cols-2">
              {summary.fiscalReviewQueue.map((item) => (
                <div
                  key={item.row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border border-amber-200 bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {formatReceivableText(item.row.payer_display || item.row.payer_name || item.row.patient_name) || 'Pagador nao informado'}
                    </p>
                    <p className="truncate text-xs text-slate-600">{formatReceivableText(item.row.description) || 'Lancamento sem descricao'}</p>
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">{item.extraction.label}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">{item.ageDays} dia(s)</span>
                      <span className={`rounded px-2 py-0.5 ${item.divergenceCount ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {item.divergenceCount} divergencia(s)
                      </span>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => openDocumentDetails(item.row)}>
                    Revisar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {summary.glosaRows > 0 && (
        <Card className="mb-6 border-rose-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-900">Dashboard de Glosas</p>
              <p className="text-xs text-slate-500">Acompanhamento operacional das glosas no filtro atual.</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const nextFilters = { ...filters, hasGlosa: 'true' };
                setFilters(nextFilters);
                setShowFilters(true);
                load(nextFilters);
              }}
            >
              Ver glosas
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Lancamentos', value: (summary.glosaRows || 0).toLocaleString('pt-BR'), hint: 'Com glosa', tone: 'text-rose-700' },
              { label: 'Abertas', value: (summary.glosaOpenCount || 0).toLocaleString('pt-BR'), hint: 'Pendentes/contestadas', tone: 'text-amber-700' },
              { label: 'Valor glosado', value: (summary.glosas || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), hint: 'Saldo glosado atual', tone: 'text-rose-700' },
              { label: 'Recuperado', value: (summary.glosaRecovered || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), hint: 'Recuperacao registrada', tone: 'text-emerald-700' },
              { label: 'Perda final', value: (summary.glosaFinalLoss || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), hint: 'Aceite de perda', tone: 'text-slate-700' },
            ].map((item) => (
              <div key={item.label} className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-medium text-slate-500">{item.label}</p>
                <p className={`mt-1 text-base font-bold ${item.tone}`}>{item.value}</p>
                <p className="mt-1 text-[11px] text-slate-500">{item.hint}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 📊 FINANCIAL INTEGRATION STATUS (PHASE 3B) - Disabled until bulk validation functions are implemented */}
      {/* <div className="mb-6">
        <FinancialIntegrationStatus />
      </div> */}

      {/* RELAT�RIOS TOOLBAR */}
      <RelatoriosToolbar
        title="Contas a Receber"
        data={rows.map(buildReceivableReportRow)}
        columns={[
          { key: 'pagador', label: 'Pagador', width: 20 },
          { key: 'descricao', label: 'Descricao', width: 25 },
          { key: 'convenio', label: 'Convenio', width: 20 },
          { key: 'tipo_pagador', label: 'Tipo pagador', width: 14 },
          { key: 'origem', label: 'Origem', width: 14 },
          { key: 'profissional', label: 'Profissional', width: 22 },
          { key: 'unidade', label: 'Unidade', width: 18 },
          { key: 'especialidade', label: 'Especialidade', width: 20 },
          { key: 'forma_pagamento', label: 'Forma pagamento', width: 18 },
          { key: 'competencia', label: 'Competencia', width: 14 },
          { key: 'emissao', label: 'Emissao', width: 12 },
          { key: 'vencimento', label: 'Vencimento', width: 12 },
          { key: 'plano_contas', label: 'Plano de contas', width: 20 },
          { key: 'status', label: 'Status', width: 12 },
          { key: 'bruto', label: 'Bruto', width: 15, format: 'currency' },
          { key: 'valor', label: 'Valor', width: 15, format: 'currency' },
          { key: 'taxa_cartao', label: 'Taxa cartao', width: 15, format: 'currency' },
          { key: 'recebido', label: 'Recebido', width: 16, format: 'currency' },
          { key: 'glosa', label: 'Glosa', width: 15, format: 'currency' },
          { key: 'repasse', label: 'Repasse', width: 15, format: 'currency' },
          { key: 'saldo', label: 'Saldo', width: 16, format: 'currency' },
          { key: 'ans', label: 'ANS', width: 14 },
          { key: 'fatura_convenio', label: 'Fatura convenio', width: 18 },
          { key: 'status_convenio', label: 'Status convenio', width: 18 },
          { key: 'status_xml_tiss', label: 'Status XML TISS', width: 18 },
          { key: 'retorno_convenio', label: 'Retorno convenio', width: 18 },
          { key: 'protocolo_retorno', label: 'Protocolo retorno', width: 20 },
          { key: 'data_retorno', label: 'Data retorno', width: 14 },
          { key: 'documento_fiscal_tipo', label: 'Tipo doc fiscal', width: 16 },
          { key: 'confianca_leitura', label: 'Confianca leitura', width: 18 },
          { key: 'emissor_xml', label: 'Emissor XML', width: 24 },
          { key: 'numero_nf_xml', label: 'Numero NF XML', width: 16 },
          { key: 'valor_xml', label: 'Valor XML', width: 15, format: 'currency' },
          { key: 'impostos_xml', label: 'Impostos XML', width: 15, format: 'currency' },
          { key: 'emissao_xml', label: 'Emissao XML', width: 14 },
          { key: 'vencimento_xml', label: 'Vencimento XML', width: 16 },
          { key: 'forma_xml', label: 'Forma XML', width: 14 },
          { key: 'status_revisao_fiscal', label: 'Status revisao fiscal', width: 20 },
          { key: 'revisado_em', label: 'Revisado em', width: 14 },
          { key: 'revisado_por', label: 'Revisado por', width: 16 },
          { key: 'qtd_divergencias', label: 'Qtd divergencias', width: 16 },
          { key: 'observacao_revisao', label: 'Observacao revisao', width: 30 },
          { key: 'eventos_revisao', label: 'Eventos revisao', width: 16 },
        ]}
        templateFileName="contas_receber"
      />

      <Card className="p-4 mb-6 border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Atalhos operacionais</p>
            <p className="text-xs text-slate-500">Use os recortes mais frequentes do fechamento sem configurar filtros manualmente.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => applyQuickFilter('overdue')}>Vencidos</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyQuickFilter('next30')}>Próx. 30 dias</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyQuickFilter('receivedToday')}>Recebidos hoje</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyQuickFilter('glosas')}>Glosas</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyQuickFilter('fiscalPending')}>XML pendente</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyQuickFilter('convenioTiss')}>TISS não gerado</Button>
          </div>
        </div>
        {activeFilterChips.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-xs font-medium text-slate-500">Filtros ativos</span>
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => clearFilter(chip.key)}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100"
                title="Remover filtro"
              >
                {chip.label}: {chip.value} ×
              </button>
            ))}
            <Button type="button" size="sm" variant="ghost" onClick={() => applyFiltersAndLoad(emptyFilters)}>
              Limpar todos
            </Button>
          </div>
        )}
      </Card>

      {/* FILTROS */}
      <Card className="p-6 mb-6 border border-slate-100 shadow-sm rounded-xl">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="mb-4 flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={showFilters}
        >
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-600" />
            Filtros Avançados
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-normal text-slate-500">
              {activeFilterChips.length} ativo(s)
            </span>
          </h3>
          {showFilters ? <ChevronUp className="h-5 w-5 text-slate-600" /> : <ChevronDown className="h-5 w-5 text-slate-600" />}
        </button>

        {showFilters && (
          <div className="space-y-4 border-t border-slate-100 pt-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar por descrição..."
              className="pl-9"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onKeyPress={(e) => e.key === 'Enter' && load(filters)}
            />
          </div>
        </div>

          <div>
            <div className="grid md:grid-cols-4 gap-3 mb-4 pb-4 border-b">
              <Input
                placeholder="Paciente / Pagador"
                value={filters.payer}
                onChange={(e) => setFilters((f) => ({ ...f, payer: e.target.value }))}
              />
              <select
                className="border rounded px-3 py-2 text-sm"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="">Status (todos)</option>
                {arStatusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                className="border rounded px-3 py-2 text-sm"
                value={filters.origin}
                onChange={(e) => setFilters((f) => ({ ...f, origin: e.target.value }))}
              >
                <option value="">Origem (todas)</option>
                <option value="Agenda">Agenda</option>
                <option value="Faturamento">Faturamento</option>
                <option value="Contrato">Contrato</option>
                <option value="Manual">Manual</option>
              </select>
              <select
                className="border rounded px-3 py-2 text-sm"
                value={filters.payerType}
                onChange={(e) => setFilters((f) => ({ ...f, payerType: e.target.value }))}
              >
                <option value="">Pagador (todos)</option>
                <option value="PARTICULAR">Paciente/particular</option>
                <option value="CONVENIO">Convênio</option>
                <option value="EMPRESA">Empresa</option>
              </select>
              <select
                className="border rounded px-3 py-2 text-sm"
                value={filters.payerId}
                onChange={(e) => setFilters((f) => ({ ...f, payerId: e.target.value }))}
              >
                <option value="">Convênio/empresa</option>
                {payers.map((payer) => (
                  <option key={payer.id} value={payer.id}>{payer.name}</option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-4 gap-3 mb-4 pb-4 border-b">
              <Input
                placeholder="Unidade"
                value={filters.unitName}
                onChange={(e) => setFilters((f) => ({ ...f, unitName: e.target.value }))}
              />
              <Input
                placeholder="Especialidade"
                value={filters.specialtyName}
                onChange={(e) => setFilters((f) => ({ ...f, specialtyName: e.target.value }))}
              />
              <select
                className="border rounded px-3 py-2 text-sm"
                value={filters.insuranceBillingStatus}
                onChange={(e) => setFilters((f) => ({ ...f, insuranceBillingStatus: e.target.value }))}
              >
                <option value="">Status convênio</option>
                <option value="PENDENTE">Pendente</option>
                <option value="FATURADO">Faturado</option>
                <option value="ENVIADO">Enviado</option>
                <option value="RECEBIDO">Recebido</option>
                <option value="GLOSADO">Glosado</option>
              </select>
              <select
                className="border rounded px-3 py-2 text-sm"
                value={filters.tissXmlStatus}
                onChange={(e) => setFilters((f) => ({ ...f, tissXmlStatus: e.target.value }))}
              >
                <option value="">Status XML TISS</option>
                <option value="NAO_GERADO">Não gerado</option>
                <option value="GERADO">Gerado</option>
                <option value="ENVIADO">Enviado</option>
                <option value="ERRO">Erro</option>
              </select>
            </div>

            <div className="grid md:grid-cols-4 gap-3 mb-4 pb-4 border-b">
              <select
                className="border rounded px-3 py-2 text-sm"
                value={filters.insuranceReturnStatus}
                onChange={(e) => setFilters((f) => ({ ...f, insuranceReturnStatus: e.target.value }))}
              >
                <option value="">Retorno convênio</option>
                <option value="PENDENTE">Pendente</option>
                <option value="PROCESSADO">Processado</option>
                <option value="PAGO">Pago</option>
                <option value="GLOSADO">Glosado</option>
                <option value="RECURSADO">Recursado</option>
              </select>
            </div>

            <div className="grid md:grid-cols-4 gap-3 mb-4 pb-4 border-b">
              <div>
                <label className="text-xs text-gray-600">Vencimento de</label>
                <Input
                  type="date"
                  value={filters.dueStart}
                  onChange={(e) => setFilters((f) => ({ ...f, dueStart: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Vencimento até</label>
                <Input
                  type="date"
                  value={filters.dueEnd}
                  onChange={(e) => setFilters((f) => ({ ...f, dueEnd: e.target.value }))}
                />
              </div>
              <select
                className="border rounded px-3 py-2 text-sm"
                value={filters.professionalId}
                onChange={(e) => setFilters((f) => ({ ...f, professionalId: e.target.value }))}
              >
                <option value="">Profissional</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                className="border rounded px-3 py-2 text-sm"
                value={filters.planId}
                onChange={(e) => setFilters((f) => ({ ...f, planId: e.target.value }))}
              >
                <option value="">Plano de Contas</option>
                {plans.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-4 gap-3 mb-4 pb-4 border-b">
              <select
                className="border rounded px-3 py-2 text-sm"
                value={filters.ccId}
                onChange={(e) => setFilters((f) => ({ ...f, ccId: e.target.value }))}
              >
                <option value="">Centro de custo</option>
                {costCenters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                className="border rounded px-3 py-2 text-sm"
                value={filters.paymentMethod}
                onChange={(e) => setFilters((f) => ({ ...f, paymentMethod: e.target.value }))}
              >
                <option value="">Forma de pagamento</option>
                <option value="pix">PIX</option>
                <option value="cash">Dinheiro</option>
                <option value="cartao_credito">Cartão de crédito</option>
                <option value="cartao_debito">Cartão de débito</option>
                <option value="boleto">Boleto</option>
                <option value="convenio">Convênio</option>
                <option value="ted">Transferência</option>
                <option value="cheque">Cheque</option>
              </select>
              <select
                className="border rounded px-3 py-2 text-sm"
                value={filters.hasGlosa}
                onChange={(e) => setFilters((f) => ({ ...f, hasGlosa: e.target.value }))}
              >
                <option value="">Glosa (todos)</option>
                <option value="true">Com glosa</option>
                <option value="false">Sem glosa</option>
              </select>
              <select
                className="border rounded px-3 py-2 text-sm"
                value={filters.documentExtraction}
                onChange={(e) => setFilters((f) => ({ ...f, documentExtraction: e.target.value }))}
              >
                <option value="">Documento fiscal</option>
                <option value="with_extraction">Com XML lido</option>
                <option value="without_extraction">Sem XML lido</option>
              </select>
              <select
                className="border rounded px-3 py-2 text-sm"
                value={filters.fiscalReview}
                onChange={(e) => setFilters((f) => ({ ...f, fiscalReview: e.target.value }))}
              >
                <option value="">Revisao fiscal</option>
                <option value="pending">Pendente</option>
                <option value="reviewed">Revisado</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Valor mín."
                  value={filters.minValue}
                  onChange={(e) => setFilters((f) => ({ ...f, minValue: e.target.value }))}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Valor máx."
                  value={filters.maxValue}
                  onChange={(e) => setFilters((f) => ({ ...f, maxValue: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-3 mb-4 pb-4 border-b">
              <div>
                <label className="text-xs text-gray-600">Emissão de</label>
                <Input
                  type="date"
                  value={filters.emissionStart}
                  onChange={(e) => setFilters((f) => ({ ...f, emissionStart: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Emissão até</label>
                <Input
                  type="date"
                  value={filters.emissionEnd}
                  onChange={(e) => setFilters((f) => ({ ...f, emissionEnd: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Recebimento de</label>
                <Input
                  type="date"
                  value={filters.receivedStart}
                  onChange={(e) => setFilters((f) => ({ ...f, receivedStart: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Recebimento até</label>
                <Input
                  type="date"
                  value={filters.receivedEnd}
                  onChange={(e) => setFilters((f) => ({ ...f, receivedEnd: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <Button className="gap-2" onClick={() => load(filters)} disabled={loading}>
                <Filter className="h-4 w-4" />
                {loading ? 'Filtrando...' : 'Filtrar'}
              </Button>
              <Button
                variant="outline"
                onClick={() => applyFiltersAndLoad(emptyFilters)}
              >
                Limpar Filtros
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSaveFilterDialogOpen(true)}
                disabled={loading}
                title="Salvar configuração atual como filtro"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Salvar Filtro
              </Button>
              {savedFilters.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loading}
                      title="Carregar um filtro salvo"
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Carregar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filtros Salvos</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {savedFilters.map((filter) => (
                      <div key={filter.name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100">
                        <button
                          onClick={() => handleLoadFilter(filter.name)}
                          className="flex-1 text-left text-sm hover:text-blue-600"
                        >
                          {filter.name}
                        </button>
                        <button
                          onClick={() => deleteFilter(filter.name)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button variant="ghost" className="ml-auto">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
          </div>
        )}

        <SaveFilterDialog
          open={saveFilterDialogOpen}
          onOpenChange={setSaveFilterDialogOpen}
          onSave={handleSaveFilter}
          existingNames={savedFilters.map((f) => f.name)}
          loading={loading}
        />
      </Card>

      {/* 📋 TABELA */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <label className="inline-flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={allVisibleSelected}
                onChange={toggleAllVisibleSelection}
                disabled={!selectableRows.length}
              />
              Marcar todos visíveis
            </label>
            <span className="text-slate-500">
              {selectedRows.length} selecionado{selectedRows.length === 1 ? '' : 's'}
              {selectedRows.length ? ` · ${(selectedTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}
            </span>
            {selectedRows.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                Desmarcar
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                  Colunas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-96 w-80 overflow-auto">
                <DropdownMenuLabel>Colunas visíveis e ordem</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    resetColumnLayout();
                  }}
                >
                  Restaurar padrão
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setVisibleColumns({ payer: true, description: true, nf: true, dueDate: true, status: true, gross: true, balance: true });
                    setColumnOrder(['payer', 'description', 'nf', 'dueDate', 'status', 'gross', 'balance', ...defaultReceivableColumnOrder.filter((key) => !['payer', 'description', 'nf', 'dueDate', 'status', 'gross', 'balance'].includes(key))]);
                  }}
                >
                  Visualização essencial
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {orderedColumnOptions.map((column, index) => (
                  <div
                    key={column.key}
                    draggable
                    onDragStart={(event) => {
                      setDraggingColumnKey(column.key);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', column.key);
                    }}
                    onDragEnd={() => setDraggingColumnKey(null)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceKey = draggingColumnKey || event.dataTransfer.getData('text/plain');
                      const rect = event.currentTarget.getBoundingClientRect();
                      const insertAfter = event.clientY > rect.top + (rect.height / 2);
                      moveColumnToPosition(sourceKey, column.key, insertAfter);
                      setDraggingColumnKey(null);
                    }}
                    className={`flex cursor-grab items-center gap-1 px-1 py-0.5 active:cursor-grabbing ${draggingColumnKey === column.key ? 'opacity-50' : ''}`}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <DropdownMenuCheckboxItem
                      checked={isColumnVisible(column.key)}
                      onCheckedChange={(checked) => setVisibleColumns((current) => ({ ...current, [column.key]: Boolean(checked) }))}
                      onSelect={(event) => event.preventDefault()}
                      className="min-w-0 flex-1"
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded border text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        moveColumn(column.key, -1);
                      }}
                      disabled={index === 0}
                      title="Mover para cima"
                      aria-label={`Mover ${column.label} para cima`}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded border text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        moveColumn(column.key, 1);
                      }}
                      disabled={index === orderedColumnOptions.length - 1}
                      title="Mover para baixo"
                      aria-label={`Mover ${column.label} para baixo`}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <select
              className="h-9 rounded border px-3 text-sm"
              value={bulkAction}
              onChange={(event) => setBulkAction(event.target.value)}
              disabled={!selectedRows.length}
            >
              <option value="">Ação selecionada</option>
              <option value="receive">Registrar recebimento</option>
              <option value="glosa">Registrar glosa</option>
              <option value="glosa_contestada">Contestar glosa</option>
              <option value="glosa_recuperada">Recuperar glosa</option>
              <option value="glosa_aceita">Aceitar perda</option>
              <option value="fiscal_review">Marcar revisão fiscal</option>
              <option value="fiscal_reopen">Reabrir revisão fiscal</option>
              <option value="cancel">Cancelar lançamentos</option>
              {isAdmin && <option value="delete">Excluir lançamentos</option>}
            </select>
            <Button
              type="button"
              size="sm"
              className="bg-blue-600 text-white"
              onClick={applyBulkAction}
              disabled={!selectedRows.length || !bulkAction || Boolean(actionLoadingId)}
            >
              Aplicar
            </Button>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm" style={{ minWidth: `${tableMinWidth}px` }}>
            <thead className="sticky top-0 z-10 bg-gray-100 border-b">
              <tr>
                <th className="w-12 px-4 py-3 text-left font-semibold">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisibleSelection}
                    disabled={!selectableRows.length}
                    aria-label="Selecionar todos os lançamentos visíveis"
                  />
                </th>
                {orderedVisibleColumns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 font-semibold ${['competence', 'dueDate', 'status', 'docs'].includes(column.key) ? 'text-center' : ['gross', 'cardFee', 'received', 'glosa', 'repasse', 'balance'].includes(column.key) ? 'text-right' : 'text-left'}`}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="text-center px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={visibleColumnCount} className="py-12 text-center text-gray-500">
                    {loading ? (
                      <div className="mx-auto max-w-xl space-y-3 px-6">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600">
                          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600"></div>
                          Carregando recebíveis...
                        </div>
                        {[0, 1, 2].map((item) => (
                          <div key={item} className="grid grid-cols-5 gap-2">
                            <div className="h-3 rounded bg-slate-200" />
                            <div className="h-3 rounded bg-slate-200" />
                            <div className="h-3 rounded bg-slate-200" />
                            <div className="h-3 rounded bg-slate-200" />
                            <div className="h-3 rounded bg-slate-200" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      'Nenhum registro encontrado'
                    )}
                  </td>
                </tr>
              )}
              {paginationInfo.paginatedRows.map((r) => {
                const isOverdue = isReceivableOverdue(r);
                const statusColor = getStatusColor(r, isOverdue);
                const canReceive = !['received', 'canceled', 'glossed'].includes(r.status);
                const canCancel = !['canceled', 'glossed'].includes(r.status);
                const balance = getReceivableBalance(r);
                const competence = r.competency_date || r.data_emissao || r.emission_date || r.created_at;
                const glosaEvidence = getGlosaEvidence(r);
                const documentExtraction = getDocumentExtraction(r);
                const fiscalReview = getFiscalReviewStatus(r);
                const nfDisplay = getReceivableNfDisplay(r);
                const columnCells = {
                  payer: (
                    <td key="payer" className="px-4 py-3 text-gray-700">
                      {formatReceivableText(r.payer_display || r.payer_name || r.patient_name) || '—'}
                    </td>
                  ),
                  description: (
                    <td key="description" className="px-4 py-3 text-gray-700">
                      {formatReceivableText((r.description || r.patient_name || r.appointments?.[0]?.notes || '').split(' - ')[0]) || 'Atendimento'}
                    </td>
                  ),
                  service: (
                    <td key="service" className="px-4 py-3 text-gray-700">
                      <p className="max-w-[220px] truncate" title={formatReceivableText(r.registered_service_name)}>
                        {formatReceivableText(r.registered_service_name) || 'Serviço não vinculado'}
                      </p>
                    </td>
                  ),
                  serviceGroup: (
                    <td key="serviceGroup" className="px-4 py-3 text-gray-700">
                      <p className="max-w-[160px] truncate" title={formatReceivableText(r.service_group || r.registered_service_group)}>
                        {formatReceivableText(r.service_group || r.registered_service_group) || 'Grupo não vinculado'}
                      </p>
                    </td>
                  ),
                  payerContract: <td key="payerContract" className="px-4 py-3 text-gray-700">{formatReceivableText(r.convenio_name) || '—'}</td>,
                  professional: <td key="professional" className="px-4 py-3 text-gray-700">{formatReceivableText(r.professional_name || r.profissional_name) || 'Não identificado'}</td>,
                  unit: (
                    <td key="unit" className="px-4 py-3 text-gray-700">
                      <p className="max-w-[160px] truncate" title={formatReceivableText(r.unit_name || r.unidade_name)}>
                        {formatReceivableText(r.unit_name || r.unidade_name) || '—'}
                      </p>
                    </td>
                  ),
                  specialty: (
                    <td key="specialty" className="px-4 py-3 text-gray-700">
                      <p className="max-w-[180px] truncate" title={formatReceivableText(r.specialty_name)}>
                        {formatReceivableText(r.specialty_name) || 'Sem especialidade'}
                      </p>
                    </td>
                  ),
                  paymentMethod: (
                    <td key="paymentMethod" className="px-4 py-3 text-gray-700 capitalize">
                      {formatPaymentMethod(r.received_payment_method || r.forma_prevista || r.payment_method) || '—'}
                    </td>
                  ),
                  competence: (
                    <td key="competence" className="px-4 py-3 text-center text-gray-700">
                      {competence ? new Date(competence).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }) : '—'}
                    </td>
                  ),
                  dueDate: (
                    <td key="dueDate" className="px-4 py-3 text-center">
                      {(() => {
                        let displayDate = null;
                        const isParticular = !!r.paciente_id;
                        const isAgenda = r.origem === 'Agenda';
                        const isMoneyPayment = ['dinheiro', 'pix', 'ted'].includes(String(r.forma_prevista || '').toLowerCase());
                        const isCreditCard = String(r.forma_prevista || '').toLowerCase() === 'cartão';

                        if (isAgenda && isParticular) {
                          if (isMoneyPayment && r.data_emissao) {
                            const parts = r.data_emissao.split('-');
                            displayDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                          } else if (isCreditCard && r.data_emissao && r.total_parcelas) {
                            const parts = r.data_emissao.split('-');
                            const baseDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                            baseDate.setDate(baseDate.getDate() + 30);
                            displayDate = baseDate;
                          } else if (r.data_emissao) {
                            const parts = r.data_emissao.split('-');
                            displayDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                          }
                        }

                        if (!displayDate && r.due_date) {
                          const parts = r.due_date.split('-');
                          displayDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                        }

                        return displayDate ? displayDate.toLocaleDateString('pt-BR') : '—';
                      })()}
                    </td>
                  ),
                  accountPlan: <td key="accountPlan" className="px-4 py-3 text-gray-700">{formatReceivableText(r.plano_contas_name) || 'Não classificado'}</td>,
                  status: (
                    <td key="status" className="px-4 py-3 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                        {getStatusLabel(r, isOverdue)}
                      </span>
                    </td>
                  ),
                  nf: (
                    <td key="nf" className="px-4 py-3 text-gray-700">
                      <div className="max-w-[180px] space-y-1 text-xs">
                        {nfDisplay.url ? (
                          <a
                            href={nfDisplay.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded border border-blue-200 px-2 py-1 font-medium text-blue-700 hover:bg-blue-50"
                            title={formatReceivableText(nfDisplay.name) || 'Abrir NF'}
                          >
                            <FileText className="h-3 w-3" />
                            {formatReceivableText(nfDisplay.number) || 'NF XML'}
                          </a>
                        ) : (
                          <p className="font-medium text-slate-700">{formatReceivableText(nfDisplay.number) || 'NF não cadastrada'}</p>
                        )}
                        {nfDisplay.name && <p className="truncate text-gray-500" title={formatReceivableText(nfDisplay.name)}>{formatReceivableText(nfDisplay.name)}</p>}
                      </div>
                    </td>
                  ),
                  insurance: (
                    <td key="insurance" className="px-4 py-3 text-gray-700">
                      <div className="max-w-[160px] space-y-0.5 text-xs">
                        <p className="truncate font-semibold text-slate-700">{formatReceivableText(r.insurance_billing_status) || '—'}</p>
                        <p className="truncate text-blue-700">XML: {formatReceivableText(r.tiss_xml_status) || '—'}</p>
                        {r.ans_registration && <p className="truncate text-gray-500">ANS {formatReceivableText(r.ans_registration)}</p>}
                      </div>
                    </td>
                  ),
                  return: (
                    <td key="return" className="px-4 py-3 text-gray-700">
                      <div className="max-w-[160px] space-y-0.5 text-xs">
                        <p className="truncate font-semibold text-slate-700">{formatReceivableText(r.insurance_return_status) || '—'}</p>
                        <p className="truncate text-gray-500">{formatReceivableText(r.insurance_return_protocol) || 'Sem protocolo'}</p>
                      </div>
                    </td>
                  ),
                  gross: <td key="gross" className="px-4 py-3 text-right font-bold text-gray-900">{getGrossAmount(r).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>,
                  cardFee: <td key="cardFee" className="px-4 py-3 text-right text-amber-700 font-medium">{getCardFeeAmount(r).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>,
                  received: <td key="received" className="px-4 py-3 text-right text-green-700 font-medium">{Number(r.received_value || r.paid_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>,
                  glosa: <td key="glosa" className="px-4 py-3 text-right text-rose-700 font-medium">{Number(r.glosa_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>,
                  repasse: <td key="repasse" className="px-4 py-3 text-right text-violet-700 font-medium">{Number(r.repasse_expected || r.repasse_medico || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>,
                  balance: <td key="balance" className="px-4 py-3 text-right font-bold text-slate-900">{balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>,
                  docs: (
                    <td key="docs" className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {glosaEvidence && (
                          <a
                            href={glosaEvidence.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded border border-amber-200 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                            title={glosaEvidence.name}
                          >
                            <FileText className="w-3 h-3" />
                            Glosa
                          </a>
                        )}
                        {documentExtraction && (
                          <button
                            type="button"
                            onClick={() => openDocumentDetails(r)}
                            className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                            title={documentExtraction.title}
                          >
                            <FileText className="w-3 h-3" />
                            {documentExtraction.label}
                            {fiscalReview?.status === 'reviewed' ? ' revisado' : ' pendente'}
                          </button>
                        )}
                        {!glosaEvidence && !documentExtraction && <span className="text-xs text-gray-400">—</span>}
                      </div>
                    </td>
                  ),
                };

                return (
                  <tr key={r.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={selectedReceivableIds.includes(r.id)}
                        onChange={() => toggleReceivableSelection(r.id)}
                        disabled={!isAdmin && ['received', 'canceled', 'glossed'].includes(r.status)}
                        aria-label={`Selecionar ${formatReceivableText(r.payer_display || r.payer_name || r.patient_name) || 'lançamento'}`}
                      />
                    </td>
                    {orderedVisibleColumns.map((column) => columnCells[column.key] || null)}
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center flex-wrap">
                        {r.appointment_id && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handleOriginClick(r)}
                          >
                            📋 Agendamento
                          </Button>
                        )}
                        {canReceive && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => openReceiveModal(r)}
                              disabled={actionLoadingId === r.id}
                            >
                              Receber
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-700 border-rose-200 hover:bg-rose-50"
                              onClick={() => openGlosaModal(r)}
                              disabled={actionLoadingId === r.id}
                            >
                              Glosa
                            </Button>
                            {Number(r.glosa_value || 0) > 0 && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-amber-700 border-amber-200 hover:bg-amber-50"
                                  onClick={() => openGlosaWorkflowModal(r, 'contestada')}
                                  disabled={actionLoadingId === r.id}
                                >
                                  Contestar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                  onClick={() => openGlosaWorkflowModal(r, 'recuperada')}
                                  disabled={actionLoadingId === r.id}
                                >
                                  Recuperar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-slate-700 border-slate-200 hover:bg-slate-50"
                                  onClick={() => openGlosaWorkflowModal(r, 'aceita')}
                                  disabled={actionLoadingId === r.id}
                                >
                                  Aceitar perda
                                </Button>
                              </>
                            )}
                          </>
                        )}
                        {canCancel && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-700 border-red-200 hover:bg-red-50"
                            onClick={() => setConfirmAction({ type: 'cancel', row: r })}
                            disabled={actionLoadingId === r.id}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Cancelar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/clinica/financeiro/receber/${r.id}/editar`)}
                          disabled={r.status === 'canceled' || actionLoadingId === r.id}
                        >
                          Editar
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-700 border-red-200 hover:bg-red-50"
                            onClick={() => setConfirmAction({ type: 'delete', row: r })}
                            disabled={actionLoadingId === r.id}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Excluir
                          </Button>
                        )}
                        {r.status === 'received' && (
                          <span className="text-xs text-gray-500">Finalizado</span>
                        )}
                        {r.status === 'canceled' && (
                          <span className="text-xs text-gray-500">Cancelado</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-slate-600">
              Linhas por página:
            </span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 border border-slate-200 rounded bg-white text-slate-700 hover:border-slate-300 cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="text-slate-600">
            Exibindo {paginationInfo.totalRows === 0 ? 0 : paginationInfo.startIndex + 1}-{Math.min(paginationInfo.endIndex, paginationInfo.totalRows)} de {paginationInfo.totalRows} recebível{paginationInfo.totalRows === 1 ? '' : 's'}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1 || loading}
              title="Primeira página"
            >
              ⟨⟨
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading}
              title="Página anterior"
            >
              ⟨
            </Button>
            <span className="px-3 py-1.5 text-slate-700">
              Página {paginationInfo.currentPage} de {paginationInfo.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(paginationInfo.totalPages, currentPage + 1))}
              disabled={currentPage === paginationInfo.totalPages || loading}
              title="Próxima página"
            >
              ⟩
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(paginationInfo.totalPages)}
              disabled={currentPage === paginationInfo.totalPages || loading}
              title="Última página"
            >
              ⟩⟩
            </Button>
          </div>

          {hasMoreRows && (
            <Button type="button" variant="outline" size="sm" onClick={loadMoreRows} disabled={loading || loadingMore}>
              {loadingMore ? 'Carregando...' : 'Carregar mais lotes'}
            </Button>
          )}
        </div>
      </Card>

      {/* MODAL RECEBIMENTO PARCIAL/SPLIT */}
      {confirmReceived && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl">
            <h3 className="text-lg font-bold mb-1">Registrar recebimento</h3>
            <p className="text-sm text-gray-600 mb-4">
              {formatReceivableText(confirmReceived.description) || 'Recebimento'} · {formatReceivableText(confirmReceived.payer_name || confirmReceived.patient_name) || 'Pagador não informado'}
            </p>
            <div className="grid grid-cols-3 gap-3 rounded border bg-gray-50 p-3 text-sm mb-4">
              <div>
                <span className="text-gray-500">Valor</span>
                <p className="font-bold text-gray-900">{(getDisplayAmount(confirmReceived) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <div>
                <span className="text-gray-500">Recebido</span>
                <p className="font-bold text-green-700">{Number(confirmReceived.received_value || confirmReceived.paid_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <div>
                <span className="text-gray-500">Saldo</span>
                <p className="font-bold text-blue-700">{(getReceivableBalance(confirmReceived) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-600">Valor recebido</label>
                <Input type="number" min="0" step="0.01" value={receiveForm.amount} onChange={(e) => setReceiveForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Forma</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={receiveForm.paymentMethod} onChange={(e) => setReceiveForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                  <option value="pix">PIX</option>
                  <option value="cash">Dinheiro</option>
                  <option value="cartao_credito">Cartão de crédito</option>
                  <option value="cartao_debito">Cartão de débito</option>
                  <option value="boleto">Boleto</option>
                  <option value="ted">Transferência</option>
                  <option value="cheque">Cheque</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Data</label>
                <Input type="date" value={receiveForm.paymentDate} onChange={(e) => setReceiveForm((f) => ({ ...f, paymentDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3 mb-3">
              <Input placeholder="Referência" value={receiveForm.reference} onChange={(e) => setReceiveForm((f) => ({ ...f, reference: e.target.value }))} />
              <Input type="number" min="0" step="0.01" placeholder="Valor 2ª forma" value={receiveForm.splitAmount} onChange={(e) => setReceiveForm((f) => ({ ...f, splitAmount: e.target.value }))} />
              <select className="border rounded px-3 py-2 text-sm" value={receiveForm.splitMethod} onChange={(e) => setReceiveForm((f) => ({ ...f, splitMethod: e.target.value }))}>
                <option value="">2ª forma</option>
                <option value="pix">PIX</option>
                <option value="cash">Dinheiro</option>
                <option value="cartao_credito">Cartão de crédito</option>
                <option value="cartao_debito">Cartão de débito</option>
                <option value="boleto">Boleto</option>
                <option value="ted">Transferência</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <Input className="mb-4" placeholder="Observações" value={receiveForm.notes} onChange={(e) => setReceiveForm((f) => ({ ...f, notes: e.target.value }))} />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setConfirmReceived(null)} className="flex-1">
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white flex-1"
                onClick={() => markReceived(confirmReceived)}
                disabled={actionLoadingId === confirmReceived.id}
              >
                {actionLoadingId === confirmReceived.id ? 'Registrando...' : 'Registrar recebimento'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {glosaAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-xl shadow-xl">
            <h3 className="text-lg font-bold mb-1">Registrar glosa</h3>
            <p className="text-sm text-gray-600 mb-4">
              {formatReceivableText(glosaAction.description) || 'Recebimento'} · {formatReceivableText(glosaAction.payer_name || glosaAction.patient_name) || 'Pagador não informado'}
            </p>
            <div className="grid md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-600">Valor glosado</label>
                <Input type="number" min="0" step="0.01" value={glosaForm.glosaAmount} onChange={(e) => setGlosaForm((f) => ({ ...f, glosaAmount: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Valor pago</label>
                <Input type="number" min="0" step="0.01" value={glosaForm.paidAmount} onChange={(e) => setGlosaForm((f) => ({ ...f, paidAmount: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Data</label>
                <Input type="date" value={glosaForm.glosaDate} onChange={(e) => setGlosaForm((f) => ({ ...f, glosaDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3 mb-3">
              <select className="border rounded px-3 py-2 text-sm" value={glosaForm.glosaType} onChange={(e) => setGlosaForm((f) => ({ ...f, glosaType: e.target.value }))}>
                <option value="administrativa">Administrativa</option>
                <option value="tecnica">Técnica</option>
                <option value="contratual">Contratual</option>
                <option value="auditoria">Auditoria</option>
              </select>
              <select className="border rounded px-3 py-2 text-sm" value={glosaForm.contestationStatus} onChange={(e) => setGlosaForm((f) => ({ ...f, contestationStatus: e.target.value }))}>
                <option value="pendente">Pendente</option>
                <option value="contestada">Contestada</option>
                <option value="aceita">Aceita</option>
                <option value="recuperada">Recuperada</option>
              </select>
            </div>
            <Input className="mb-3" placeholder="Responsável" value={glosaForm.responsible} onChange={(e) => setGlosaForm((f) => ({ ...f, responsible: e.target.value }))} />
            <Input className="mb-4" placeholder="Motivo da glosa" value={glosaForm.reason} onChange={(e) => setGlosaForm((f) => ({ ...f, reason: e.target.value }))} />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setGlosaAction(null)} className="flex-1">Cancelar</Button>
              <Button className="bg-rose-600 hover:bg-rose-700 text-white flex-1" onClick={() => registerGlosa(glosaAction)} disabled={actionLoadingId === glosaAction.id}>
                {actionLoadingId === glosaAction.id ? 'Registrando...' : 'Registrar glosa'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {glosaWorkflowAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl">
            <h3 className="text-lg font-bold mb-1">Workflow da glosa</h3>
            <p className="text-sm text-gray-600 mb-4">
              {formatReceivableText(glosaWorkflowAction.description) || 'Recebimento'} · {formatReceivableText(glosaWorkflowAction.payer_name || glosaWorkflowAction.patient_name) || 'Pagador não informado'}
            </p>
            <div className="grid grid-cols-3 gap-3 rounded border bg-gray-50 p-3 text-sm mb-4">
              <div>
                <span className="text-gray-500">Glosa atual</span>
                <p className="font-bold text-rose-700">{Number(glosaWorkflowAction.glosa_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <div>
                <span className="text-gray-500">Recebido</span>
                <p className="font-bold text-green-700">{Number(glosaWorkflowAction.received_value || glosaWorkflowAction.paid_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <div>
                <span className="text-gray-500">Saldo</span>
                <p className="font-bold text-blue-700">{(getReceivableBalance(glosaWorkflowAction) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
            </div>
            {(() => {
              const glosaEvidence = getGlosaEvidence(glosaWorkflowAction);
              if (!glosaEvidence) {
                return null;
              }
              return (
                <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm">
                  <span className="block text-xs font-medium text-amber-700">Evidência anexada</span>
                  <a
                    href={glosaEvidence.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-2 font-semibold text-amber-800 hover:text-amber-900"
                    title={glosaEvidence.name}
                  >
                    <FileText className="h-4 w-4" />
                    {glosaEvidence.name}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              );
            })()}
            <div className="grid md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-600">Status</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={glosaWorkflowForm.status} onChange={(e) => setGlosaWorkflowForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="contestada">Contestada</option>
                  <option value="recuperada">Recuperada</option>
                  <option value="aceita">Aceita como perda</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Valor contestado</label>
                <Input type="number" min="0" step="0.01" value={glosaWorkflowForm.contestedAmount} onChange={(e) => setGlosaWorkflowForm((f) => ({ ...f, contestedAmount: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Prazo contestação</label>
                <Input type="date" value={glosaWorkflowForm.contestationDeadline} onChange={(e) => setGlosaWorkflowForm((f) => ({ ...f, contestationDeadline: e.target.value }))} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-600">Valor recuperado</label>
                <Input type="number" min="0" step="0.01" value={glosaWorkflowForm.recoveredAmount} onChange={(e) => setGlosaWorkflowForm((f) => ({ ...f, recoveredAmount: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Perda final</label>
                <Input type="number" min="0" step="0.01" value={glosaWorkflowForm.finalLossAmount} onChange={(e) => setGlosaWorkflowForm((f) => ({ ...f, finalLossAmount: e.target.value }))} />
              </div>
            </div>
            <Input className="mb-3" placeholder="Responsável" value={glosaWorkflowForm.responsible} onChange={(e) => setGlosaWorkflowForm((f) => ({ ...f, responsible: e.target.value }))} />
            <Input className="mb-4" placeholder="Observações do workflow" value={glosaWorkflowForm.notes} onChange={(e) => setGlosaWorkflowForm((f) => ({ ...f, notes: e.target.value }))} />
            <div className="mb-4">
              <ReceivableNfInput
                selectedFile={glosaEvidenceFile}
                onFileSelected={setGlosaEvidenceFile}
                label="Evidência da glosa"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setGlosaWorkflowAction(null)} className="flex-1">Cancelar</Button>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white flex-1" onClick={() => updateGlosaWorkflow(glosaWorkflowAction)} disabled={actionLoadingId === glosaWorkflowAction.id}>
                {actionLoadingId === glosaWorkflowAction.id ? 'Atualizando...' : 'Atualizar glosa'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {documentDetailsRow && (() => {
        const extraction = documentDetailsRow.metadata?.document_extraction || {};
        const fiscalReview = getFiscalReviewStatus(documentDetailsRow);
        const reviewRows = buildFiscalReviewRows(documentDetailsRow);
        const divergences = reviewRows.filter((item) => !fiscalValuesMatch(item.xml, item.saved, item.type));
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
              <div className="flex flex-none items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Revisao fiscal do documento</h3>
                  <p className="text-sm text-gray-600">
                    {formatReceivableText(documentDetailsRow.description) || 'Recebimento'} · {formatReceivableText(documentDetailsRow.patient_name) || 'Pagador nao informado'}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setDocumentDetailsRow(null)}>
                  Fechar
                </Button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded border bg-emerald-50 p-2.5">
                  <p className="text-xs text-emerald-700">Tipo</p>
                  <p className="font-bold text-emerald-900">{String(extraction.documentType || 'documento').toUpperCase()}</p>
                </div>
                <div className="rounded border bg-emerald-50 p-2.5">
                  <p className="text-xs text-emerald-700">Confianca</p>
                  <p className="font-bold text-emerald-900">{extraction.confidence || 'manual'}</p>
                </div>
                <div className="rounded border bg-slate-50 p-2.5">
                  <p className="text-xs text-slate-600">Impostos</p>
                  <p className="font-bold text-slate-900">{formatFiscalValue(documentDetailsRow.taxes_value, 'currency')}</p>
                </div>
                <div className={`rounded border p-2.5 ${divergences.length ? 'bg-amber-50' : 'bg-green-50'}`}>
                  <p className={divergences.length ? 'text-xs text-amber-700' : 'text-xs text-green-700'}>Conferencia</p>
                  <p className={divergences.length ? 'font-bold text-amber-900' : 'font-bold text-green-900'}>
                    {divergences.length ? `${divergences.length} divergencias` : 'Sem divergencias'}
                  </p>
                </div>
                <div className={`rounded border p-2.5 ${fiscalReview?.status === 'reviewed' ? 'bg-green-50' : 'bg-amber-50'}`}>
                  <p className={fiscalReview?.status === 'reviewed' ? 'text-xs text-green-700' : 'text-xs text-amber-700'}>Status fiscal</p>
                  <p className={fiscalReview?.status === 'reviewed' ? 'font-bold text-green-900' : 'font-bold text-amber-900'}>
                    {fiscalReview?.label || 'Pendente'}
                  </p>
                </div>
              </div>

              {fiscalReview?.status === 'reviewed' && (
                <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  Revisado em {formatFiscalValue(fiscalReview.reviewedAt, 'date')} por {fiscalReview.reviewedBy || 'operador'}.
                  {fiscalReview.notes ? <span className="block mt-1">Observacao: {fiscalReview.notes}</span> : null}
                </div>
              )}

              {extraction.issuerName && (
                <div className="rounded border bg-slate-50 p-3 text-sm text-slate-700">
                  <span className="font-semibold">Emissor identificado:</span> {extraction.issuerName}
                </div>
              )}

              <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Campo</th>
                      <th className="px-3 py-2 text-left font-semibold">XML</th>
                      <th className="px-3 py-2 text-left font-semibold">Lancamento salvo</th>
                      <th className="px-3 py-2 text-center font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewRows.map((item) => {
                      const matches = fiscalValuesMatch(item.xml, item.saved, item.type);
                      return (
                        <tr key={item.label} className="border-b last:border-b-0">
                          <td className="px-3 py-2 font-medium text-slate-700">{item.label}</td>
                          <td className="max-w-[240px] break-words px-3 py-2 text-slate-700">{formatFiscalValue(item.xml, item.type)}</td>
                          <td className="max-w-[280px] break-words px-3 py-2 text-slate-700">{formatFiscalValue(item.saved, item.type)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${matches ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {matches ? 'OK' : 'Revisar'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {Array.isArray(extraction.warnings) && extraction.warnings.length > 0 && (
                <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {extraction.warnings.join(' ')}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-600">Observacao da revisao fiscal</label>
                <Input
                  className="mt-1"
                  value={fiscalReviewNotes}
                  onChange={(event) => setFiscalReviewNotes(event.target.value)}
                  placeholder="Ex.: conferido com XML original, ajustar guia, divergencia aceita"
                />
              </div>
              </div>

              <div className="flex flex-none flex-wrap justify-end gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:px-5">
                {documentDetailsRow.nf_document_url && (
                  <Button type="button" variant="outline" asChild>
                    <a href={documentDetailsRow.nf_document_url} target="_blank" rel="noreferrer">
                      Abrir documento
                    </a>
                  </Button>
                )}
                <Button type="button" className="bg-blue-600 text-white" onClick={() => navigate(`/clinica/financeiro/receber/${documentDetailsRow.id}/editar`)}>
                  Editar lancamento
                </Button>
                {fiscalReview?.status === 'reviewed' ? (
                  <Button
                    type="button"
                    className="bg-amber-600 text-white"
                    onClick={() => reopenFiscalReview(documentDetailsRow)}
                    disabled={actionLoadingId === `fiscal-reopen-${documentDetailsRow.id}`}
                  >
                    {actionLoadingId === `fiscal-reopen-${documentDetailsRow.id}` ? 'Reabrindo...' : 'Reabrir revisao'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="bg-emerald-600 text-white"
                    onClick={() => markFiscalReviewDone(documentDetailsRow, divergences)}
                    disabled={actionLoadingId === `fiscal-review-${documentDetailsRow.id}`}
                  >
                    {actionLoadingId === `fiscal-review-${documentDetailsRow.id}` ? 'Marcando...' : 'Marcar revisado'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {bulkConfirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-xl shadow-xl">
            <h3 className="text-lg font-bold mb-2">
              {bulkConfirmAction.type === 'delete'
                ? 'Excluir lançamentos?'
                : `${getBulkActionLabel(bulkConfirmAction.type)} em lote?`}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {bulkConfirmAction.type === 'delete' ? 'Tem certeza que deseja excluir definitivamente ' : ''}
              {bulkConfirmAction.rows.length} lançamento{bulkConfirmAction.rows.length === 1 ? '' : 's'} apto{bulkConfirmAction.rows.length === 1 ? '' : 's'} · {' '}
              {bulkConfirmAction.rows.reduce((sum, row) => sum + getReceivableBalance(row), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              {bulkConfirmAction.type === 'delete' ? '? Esta ação não pode ser desfeita.' : ''}
            </p>

            {bulkConfirmAction.type === 'receive' && (
              <div className="mb-4 grid gap-3 rounded border bg-gray-50 p-3 md:grid-cols-2">
                <div>
                  <label className="text-xs text-gray-600">Forma padrão quando faltar no lançamento</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={bulkReceiveForm.paymentMethod}
                    onChange={(event) => setBulkReceiveForm((form) => ({ ...form, paymentMethod: event.target.value }))}
                  >
                    <option value="pix">PIX</option>
                    <option value="cash">Dinheiro</option>
                    <option value="cartao_credito">Cartão de crédito</option>
                    <option value="cartao_debito">Cartão de débito</option>
                    <option value="boleto">Boleto</option>
                    <option value="ted">Transferência</option>
                    <option value="cheque">Cheque</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Data</label>
                  <Input
                    type="date"
                    value={bulkReceiveForm.paymentDate}
                    onChange={(event) => setBulkReceiveForm((form) => ({ ...form, paymentDate: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Referência</label>
                  <Input
                    value={bulkReceiveForm.reference}
                    onChange={(event) => setBulkReceiveForm((form) => ({ ...form, reference: event.target.value }))}
                    placeholder="Ex.: baixa em lote"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Observações</label>
                  <Input
                    value={bulkReceiveForm.notes}
                    onChange={(event) => setBulkReceiveForm((form) => ({ ...form, notes: event.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            )}

            {bulkConfirmAction.type === 'glosa' && (
              <div className="mb-4 grid gap-3 rounded border bg-gray-50 p-3 md:grid-cols-3">
                <div>
                  <label className="text-xs text-gray-600">Valor glosado padrão</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={bulkGlosaForm.glosaAmount}
                    onChange={(event) => setBulkGlosaForm((form) => ({ ...form, glosaAmount: event.target.value }))}
                    placeholder="Saldo individual"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Valor pago padrão</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={bulkGlosaForm.paidAmount}
                    onChange={(event) => setBulkGlosaForm((form) => ({ ...form, paidAmount: event.target.value }))}
                    placeholder="Recebido atual"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Data</label>
                  <Input
                    type="date"
                    value={bulkGlosaForm.glosaDate}
                    onChange={(event) => setBulkGlosaForm((form) => ({ ...form, glosaDate: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Tipo</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={bulkGlosaForm.glosaType}
                    onChange={(event) => setBulkGlosaForm((form) => ({ ...form, glosaType: event.target.value }))}
                  >
                    <option value="administrativa">Administrativa</option>
                    <option value="tecnica">Técnica</option>
                    <option value="contratual">Contratual</option>
                    <option value="auditoria">Auditoria</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Status</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={bulkGlosaForm.contestationStatus}
                    onChange={(event) => setBulkGlosaForm((form) => ({ ...form, contestationStatus: event.target.value }))}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="contestada">Contestada</option>
                    <option value="aceita">Aceita</option>
                    <option value="recuperada">Recuperada</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Responsável</label>
                  <Input
                    value={bulkGlosaForm.responsible}
                    onChange={(event) => setBulkGlosaForm((form) => ({ ...form, responsible: event.target.value }))}
                    placeholder={currentRole || 'Operador'}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs text-gray-600">Motivo</label>
                  <Input
                    value={bulkGlosaForm.reason}
                    onChange={(event) => setBulkGlosaForm((form) => ({ ...form, reason: event.target.value }))}
                    placeholder="Motivo aplicado aos selecionados"
                  />
                </div>
              </div>
            )}

            {['glosa_contestada', 'glosa_recuperada', 'glosa_aceita'].includes(bulkConfirmAction.type) && (
              <div className="mb-4 grid gap-3 rounded border bg-gray-50 p-3 md:grid-cols-3">
                <div>
                  <label className="text-xs text-gray-600">Valor contestado padrão</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={bulkGlosaWorkflowForm.contestedAmount}
                    onChange={(event) => setBulkGlosaWorkflowForm((form) => ({ ...form, contestedAmount: event.target.value }))}
                    placeholder="Glosa individual"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Valor recuperado padrão</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={bulkGlosaWorkflowForm.recoveredAmount}
                    onChange={(event) => setBulkGlosaWorkflowForm((form) => ({ ...form, recoveredAmount: event.target.value }))}
                    placeholder="Glosa individual"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Perda final padrão</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={bulkGlosaWorkflowForm.finalLossAmount}
                    onChange={(event) => setBulkGlosaWorkflowForm((form) => ({ ...form, finalLossAmount: event.target.value }))}
                    placeholder="Glosa individual"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Prazo contestação</label>
                  <Input
                    type="date"
                    value={bulkGlosaWorkflowForm.contestationDeadline}
                    onChange={(event) => setBulkGlosaWorkflowForm((form) => ({ ...form, contestationDeadline: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Responsável</label>
                  <Input
                    value={bulkGlosaWorkflowForm.responsible}
                    onChange={(event) => setBulkGlosaWorkflowForm((form) => ({ ...form, responsible: event.target.value }))}
                    placeholder={currentRole || 'Operador'}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Observações</label>
                  <Input
                    value={bulkGlosaWorkflowForm.notes}
                    onChange={(event) => setBulkGlosaWorkflowForm((form) => ({ ...form, notes: event.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            )}

            {['fiscal_review', 'fiscal_reopen'].includes(bulkConfirmAction.type) && (
              <div className="mb-4 rounded border bg-gray-50 p-3">
                <label className="text-xs text-gray-600">Observação da revisão fiscal</label>
                <Input
                  value={fiscalReviewNotes}
                  onChange={(event) => setFiscalReviewNotes(event.target.value)}
                  placeholder="Opcional"
                />
              </div>
            )}

            <div className="mb-5 max-h-44 overflow-auto rounded border divide-y text-sm">
              {bulkConfirmAction.rows.slice(0, 12).map((row) => (
                <div key={row.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2">
                  <span className="truncate">{formatReceivableText(row.patient_name || row.payer_name || row.description) || 'Recebimento'}</span>
                  <span className="text-xs font-medium text-slate-500">{formatPaymentMethod(resolveBulkPaymentMethod(row)) || 'Outro'}</span>
                  <span className="font-semibold text-slate-900">
                    {getReceivableBalance(row).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              ))}
              {bulkConfirmAction.rows.length > 12 && (
                <div className="px-3 py-2 text-xs text-slate-500">
                  + {bulkConfirmAction.rows.length - 12} lançamento{bulkConfirmAction.rows.length - 12 === 1 ? '' : 's'}
                </div>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-6">
              {bulkConfirmAction.type === 'receive'
                ? 'Cada lançamento será baixado pelo saldo em aberto usando a forma de pagamento individual. A forma padrão só será usada quando o lançamento não tiver forma definida.'
                : bulkConfirmAction.type === 'glosa'
                  ? 'Quando os valores padrão ficarem vazios, cada lançamento usa o próprio saldo/recebido atual para registrar a glosa.'
                  : ['glosa_contestada', 'glosa_recuperada', 'glosa_aceita'].includes(bulkConfirmAction.type)
                    ? 'Quando os valores padrão ficarem vazios, cada glosa usa seu próprio valor atual no campo correspondente da ação.'
                    : ['fiscal_review', 'fiscal_reopen'].includes(bulkConfirmAction.type)
                      ? 'A ação fiscal será aplicada apenas aos lançamentos selecionados que possuem XML/documento fiscal compatível.'
                : bulkConfirmAction.type === 'delete'
                  ? 'A exclusão em lote remove os registros selecionados do Contas a Receber e está disponível apenas para admin.'
                  : 'Os lançamentos selecionados ficarão como cancelados e deixarão de compor pendências, atrasos e fluxo de caixa.'}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setBulkConfirmAction(null)} className="flex-1">
                {bulkConfirmAction.type === 'delete' ? 'Cancelar' : 'Voltar'}
              </Button>
              <Button
                className={`${bulkConfirmAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white flex-1`}
                onClick={() => {
                  if (bulkConfirmAction.type === 'receive') {
                    executeBulkReceive();
                    return;
                  }
                  if (bulkConfirmAction.type === 'glosa') {
                    executeBulkGlosa();
                    return;
                  }
                  if (['glosa_contestada', 'glosa_recuperada', 'glosa_aceita'].includes(bulkConfirmAction.type)) {
                    executeBulkGlosaWorkflow(bulkConfirmAction.type);
                    return;
                  }
                  if (['fiscal_review', 'fiscal_reopen'].includes(bulkConfirmAction.type)) {
                    executeBulkFiscalReview(bulkConfirmAction.type);
                    return;
                  }
                  executeBulkStatusAction(bulkConfirmAction.type);
                }}
                disabled={Boolean(actionLoadingId)}
              >
                {actionLoadingId
                  ? bulkConfirmAction.type === 'delete' ? 'Excluindo...' : 'Processando...'
                  : bulkConfirmAction.type === 'delete' ? 'Excluir' : 'Confirmar ação'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-4">
              {confirmAction.type === 'delete' ? 'Excluir lançamento?' : 'Cancelar lançamento?'}
            </h3>
            <p className="text-gray-700 mb-6">
              <strong>{formatReceivableText(confirmAction.row.description) || 'Recebimento'}</strong>
              <br />
              de <strong>{formatReceivableText(confirmAction.row.payer_name || confirmAction.row.patient_name) || '—'}</strong>
              <br />
              Valor:{' '}
              <span className="font-bold text-gray-900">
                {getDisplayAmount(confirmAction.row).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </span>
            </p>
            <p className="text-sm text-gray-600 mb-6">
              {confirmAction.type === 'delete'
                ? 'Esta ação remove o registro definitivamente e está disponível apenas para admin.'
                : 'O lançamento ficará como cancelado e deixará de compor pendências, atrasos e fluxo de caixa.'}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setConfirmAction(null)} className="flex-1">
                Voltar
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white flex-1"
                onClick={() => {
                  if (confirmAction.type === 'delete') {
                    removeReceivable(confirmAction.row);
                    return;
                  }
                  cancelReceivable(confirmAction.row);
                }}
                disabled={actionLoadingId === confirmAction.row.id}
              >
                {actionLoadingId === confirmAction.row.id
                  ? 'Processando...'
                  : confirmAction.type === 'delete'
                    ? 'Excluir'
                    : 'Cancelar lançamento'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
