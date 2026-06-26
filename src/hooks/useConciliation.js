// src/hooks/useConciliation.js
// Hook para lógica de Conciliação Bancária

import { useState, useCallback, useEffect } from 'react';
import {
  listBankStatements,
  importBankStatements,
  findSuggestions,
  conciliateStatement,
  createAndLinkFinancial,
  markAsDivergent,
  ignoreStatement,
  getIndicators,
  listBankAccounts,
  getStatementHistory,
  runPayableReconciliationMatching,
  listPayableReconciliationReviews,
  listPayableReconciliationReviewCounts,
  approvePayableReconciliationMatch,
  rejectPayableReconciliationMatch,
} from '@/lib/conciliationApi';
import {
  CONCILIATION_STATUS,
  TRANSACTION_TYPE,
  FINANCIAL_LINK_TYPE,
} from '@/lib/conciliationStatus';

/**
 * Hook principal para Conciliação Bancária
 */
export function useConciliation(clinicId) {
  const [statements, setStatements] = useState([]);
  const [statementsTotal, setStatementsTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    status: null,
    startDate: null,
    endDate: null,
    accountId: null,
    search: '',
  });

  const [indicators, setIndicators] = useState({
    pending: 0,
    conciliated: 0,
    adjusted: 0,
    divergent: 0,
    ignored: 0,
    totalCredit: 0,
    totalDebit: 0,
    difference: 0,
  });

  const [bankAccounts, setBankAccounts] = useState([]);
  const [suggestions, setSuggestions] = useState({});
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [payableReviews, setPayableReviews] = useState([]);
  const [payableReviewCounts, setPayableReviewCounts] = useState({ review: 0, matched: 0, rejected: 0, all: 0 });
  const [payableReviewStatus, setPayableReviewStatus] = useState('review');

  /**
   * Carregar extratos
   */
  const loadStatements = useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);

        const pageSize = 500;
        let page = 0;
        let hasMore = true;
        const allStatements = [];
        let totalCount = 0;

        while (hasMore) {
          const result = await listBankStatements({
            clinicId,
            status: filters.status,
            startDate: filters.startDate,
            endDate: filters.endDate,
            accountId: filters.accountId,
            search: filters.search,
            limit: pageSize,
            offset: page * pageSize,
          });

          const rows = result?.data || [];
          allStatements.push(...rows);
          totalCount = result?.count || result?.total || 0;

          if (rows.length < pageSize) {
            hasMore = false;
          } else {
            page += 1;
          }
        }

        setStatements(allStatements);
        setStatementsTotal(totalCount);
      } catch (err) {
        console.error('Error loading statements:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [clinicId, filters],
  );

  /**
   * Carregar contas bancárias
   */
  const loadBankAccounts = useCallback(async () => {
    try {
      const accounts = await listBankAccounts(clinicId);
      setBankAccounts(accounts);
    } catch (err) {
      console.error('Error loading bank accounts:', err);
    }
  }, [clinicId]);

  const loadPayableReviewCounts = useCallback(async () => {
    if (!clinicId) {
      const emptyCounts = { review: 0, matched: 0, rejected: 0, all: 0 };
      setPayableReviewCounts(emptyCounts);
      return emptyCounts;
    }

    try {
      const counts = await listPayableReconciliationReviewCounts(clinicId);
      setPayableReviewCounts(counts);
      return counts;
    } catch (err) {
      console.error('Error loading payable reconciliation review counts:', err);
      setError(err.message);
      return { review: 0, matched: 0, rejected: 0, all: 0 };
    }
  }, [clinicId]);

  const loadPayableReviews = useCallback(
    async (status = payableReviewStatus) => {
      if (!clinicId) {
        setPayableReviews([]);
        setPayableReviewCounts({ review: 0, matched: 0, rejected: 0, all: 0 });
        return [];
      }

      try {
        const reviews = await listPayableReconciliationReviews(clinicId, status);
        setPayableReviews(reviews);
        await loadPayableReviewCounts();
        return reviews;
      } catch (err) {
        console.error('Error loading payable reconciliation reviews:', err);
        setError(err.message);
        return [];
      }
    },
    [clinicId, loadPayableReviewCounts, payableReviewStatus],
  );

  /**
   * Carregar indicadores
   */
  const loadIndicators = useCallback(async () => {
    try {
      const ind = await getIndicators(
        clinicId,
        filters.accountId,
        filters.startDate,
        filters.endDate,
      );
      setIndicators(ind);
    } catch (err) {
      console.error('Error loading indicators:', err);
    }
  }, [clinicId, filters.accountId, filters.startDate, filters.endDate]);

  const runPayableMatching = useCallback(async (nextStatus = 'review') => {
    try {
      setLoading(true);
      setError(null);
      const matches = await runPayableReconciliationMatching(clinicId);
      setPayableReviewStatus(nextStatus);
      await loadPayableReviews(nextStatus);
      return matches;
    } catch (err) {
      console.error('Error running payable matching:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [clinicId, loadPayableReviews]);

  const approvePayableMatch = useCallback(
    async (transactionId, payableId) => {
      try {
        setLoading(true);
        setError(null);
        await approvePayableReconciliationMatch(transactionId, payableId);
        await loadPayableReviews(payableReviewStatus);
        await loadIndicators();
      } catch (err) {
        console.error('Error approving payable match:', err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [loadIndicators, loadPayableReviews, payableReviewStatus],
  );

  const rejectPayableMatch = useCallback(
    async (transactionId, payableId, reason) => {
      try {
        setLoading(true);
        setError(null);
        await rejectPayableReconciliationMatch(transactionId, payableId, reason);
        await loadPayableReviews(payableReviewStatus);
        await loadIndicators();
      } catch (err) {
        console.error('Error rejecting payable match:', err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [loadIndicators, loadPayableReviews, payableReviewStatus],
  );

  /**
   * Importar extrato (função wrapper)
   */
  const importExtract = useCallback(
    async (items, accountId) => {
      try {
        setLoading(true);
        setError(null);

        const result = await importBankStatements({
          clinicId,
          statements: items,
          accountId,
        });

        // Recarregar lista
        await loadStatements();
        await loadIndicators();

        return result;
      } catch (err) {
        console.error('Error importing statements:', err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [clinicId, loadStatements, loadIndicators],
  );

  /**
   * Buscar sugestões para um extrato
   */
  const findSuggestionsForStatement = useCallback(
    async (statement) => {
      try {
        const sugg = await findSuggestions({
          clinicId,
          amount: statement.amount,
          description: statement.description,
          transactionType: statement.transaction_type,
          statementDate: statement.statement_date,
          referenceNumber: statement.bank_id,
          operationType: statement.metadata?.operation_type || statement.operationType || null,
        });

        setSuggestions((prev) => ({
          ...prev,
          [statement.id]: sugg,
        }));

        return sugg;
      } catch (err) {
        console.error('Error finding suggestions:', err);
        return [];
      }
    },
    [clinicId],
  );

  /**
   * Conciliar um extrato
   */
  const handleConciliate = useCallback(
    async (statementId, financialId, financialType) => {
      try {
        setLoading(true);
        setError(null);

        await conciliateStatement(statementId, financialId, financialType);

        // Atualizar lista
        await loadStatements();
        await loadIndicators();

        setSelectedStatement(null);
      } catch (err) {
        console.error('Error conciliating statement:', err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [loadStatements, loadIndicators],
  );

  /**
   * Criar lançamento e vincular
   */
  const handleCreateAndLink = useCallback(
    async (statementId, financialData) => {
      try {
        setLoading(true);
        setError(null);

        await createAndLinkFinancial({
          statementId,
          ...financialData,
          clinicId,
        });

        // Atualizar lista
        await loadStatements();
        await loadIndicators();

        setSelectedStatement(null);
      } catch (err) {
        console.error('Error creating and linking financial:', err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [clinicId, loadStatements, loadIndicators],
  );

  /**
   * Marcar como divergente
   */
  const handleMarkDivergent = useCallback(
    async (statementId, reason) => {
      try {
        setLoading(true);
        setError(null);

        await markAsDivergent(statementId, reason);

        await loadStatements();
        await loadIndicators();

        setSelectedStatement(null);
      } catch (err) {
        console.error('Error marking as divergent:', err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [loadStatements, loadIndicators],
  );

  /**
   * Ignorar lançamento
   */
  const handleIgnore = useCallback(
    async (statementId, reason) => {
      try {
        setLoading(true);
        setError(null);

        await ignoreStatement(statementId, reason);

        await loadStatements();
        await loadIndicators();

        setSelectedStatement(null);
      } catch (err) {
        console.error('Error ignoring statement:', err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [loadStatements, loadIndicators],
  );

  /**
   * Conciliar múltiplos selecionados
   */
  const handleBulkConciliate = useCallback(
    async (selectedIds, getMatchFunction) => {
      try {
        setLoading(true);
        setError(null);

        const promises = selectedIds.map(async (id) => {
          const statement = statements.find((s) => s.id === id);
          const match = await getMatchFunction(id);

          if (match) {
            return conciliateStatement(id, match.financial_id, match.financial_type);
          }
        });

        await Promise.all(promises);
        await loadStatements();
        await loadIndicators();
      } catch (err) {
        console.error('Error in bulk conciliation:', err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [statements, loadStatements, loadIndicators],
  );

  /**
   * Atualizar filtros
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * Limpar filtros
   */
  const clearFilters = useCallback(() => {
    setFilters({
      status: null,
      startDate: null,
      endDate: null,
      accountId: null,
      search: '',
    });
  }, []);

  /**
   * Obter histórico de um lançamento
   */
  const getHistory = useCallback(async (statementId) => {
    try {
      return await getStatementHistory(statementId);
    } catch (err) {
      console.error('Error getting history:', err);
      return [];
    }
  }, []);

  // Efeitos para carregar dados
  useEffect(() => {
    if (clinicId) {
      loadStatements();
      loadIndicators();
      loadBankAccounts();
      loadPayableReviews();
    }
  }, [clinicId, filters, loadStatements, loadIndicators, loadBankAccounts, loadPayableReviews]);

  return {
    // Estado
    statements,
    statementsTotal,
    loading,
    error,
    indicators,
    bankAccounts,
    suggestions,
    selectedStatement,
    payableReviews,
    payableReviewCounts,
    payableReviewStatus,
    filters,

    // Ações
    importExtract,
    findSuggestionsForStatement,
    handleConciliate,
    handleCreateAndLink,
    handleMarkDivergent,
    handleIgnore,
    handleBulkConciliate,
    runPayableMatching,
    approvePayableMatch,
    rejectPayableMatch,
    setSelectedStatement,
    setPayableReviewStatus,
    updateFilters,
    clearFilters,
    getHistory,

    // Reload
    loadStatements,
    loadIndicators,
    loadBankAccounts,
    loadPayableReviews,
    loadPayableReviewCounts,
  };
}

/**
 * Hook auxiliar para parsing de arquivo de extrato
 */
export function useBankStatementParser() {
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);

  const normalizeDate = useCallback((value) => {
    if (!value) {
      return null;
    }

    const raw = String(value).trim();
    if (!raw) {
      return null;
    }

    // Formatos YYYYMMDD ou YYYYMMDDHHmmss
    if (/^\d{8,14}$/.test(raw)) {
      const year = raw.slice(0, 4);
      const month = raw.slice(4, 6);
      const day = raw.slice(6, 8);
      return `${year}-${month}-${day}`;
    }

    // Formatos DD/MM/YYYY ou DD-MM-YYYY
    if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(raw)) {
      const [day, month, year] = raw.split(/[/-]/);
      return `${year}-${month}-${day}`;
    }

    // Formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return null;
  }, []);

  const normalizeAmount = useCallback((value) => {
    if (value === undefined || value === null) {
      return 0;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    const raw = String(value).trim();
    if (!raw) {
      return 0;
    }

    const normalized = raw
      .replace(/\s/g, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '')
      .replace(',', '.');

    const amount = parseFloat(normalized.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(amount) ? amount : 0;
  }, []);

  const cleanText = useCallback((value, fallback = '') => {
    if (value === undefined || value === null) {
      return fallback;
    }

    const cleaned = String(value)
      .replace(/\uFFFD/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned || fallback;
  }, []);

  const normalizeHeader = useCallback((value) => {
    if (value === undefined || value === null) {
      return '';
    }

    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }, []);

  const splitDelimitedLine = useCallback((line, delimiter) => {
    const values = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          insideQuotes = !insideQuotes;
        }
        continue;
      }

      if (char === delimiter && !insideQuotes) {
        values.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    values.push(current);
    return values.map((part) => part.trim());
  }, []);

  const detectDelimiter = useCallback((headerLine) => {
    const candidates = [',', ';', '\t'];
    let selected = ',';
    let maxCount = -1;

    candidates.forEach((candidate) => {
      const count = (headerLine.match(new RegExp(`\\${candidate}`, 'g')) || []).length;
      if (count > maxCount) {
        selected = candidate;
        maxCount = count;
      }
    });

    return selected;
  }, []);

  const extractReferenceNumber = useCallback((text) => {
    if (!text) {
      return null;
    }

    const referencePatterns = [
      /(?:pix|id|aut|nsu|doc|ref|protocolo)\s*[:#-]?\s*([a-z0-9-]{4,})/i,
      /\b([a-z0-9]{10,})\b/i,
    ];

    for (const pattern of referencePatterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    return null;
  }, []);

  const detectOperationType = useCallback((description, typeRaw, memo) => {
    const combined = `${description} ${memo || ''}`.toLowerCase();

    if (/\bpix\b/i.test(combined)) {
      return 'PIX';
    }
    if (/\bted\b|\btransferência?\s+eletrônica/i.test(combined)) {
      return 'TED';
    }
    if (/\bboleto\b|\bregistrado\b/i.test(combined)) {
      return 'BOLETO';
    }
    if (/\bche(que|q)\b/i.test(combined)) {
      return 'CHEQUE';
    }
    if (/\bdepósito\b|\bdep\b|^DEP/i.test(combined)) {
      return 'DEPOSITO';
    }
    if (/\btarifa\b|\btaxa\b|\bIOF\b|^IOF/i.test(combined)) {
      return 'TARIFA';
    }
    if (/\bjuros\b|\bcob\b/i.test(combined)) {
      return 'JUROS';
    }
    if (/\bdev\b|\bdevolução\b/i.test(combined)) {
      return 'DEVOLUCAO';
    }

    return 'OUTRO';
  }, []);

  const extractPartyInfo = useCallback((description) => {
    const partyMatch = description.match(/(?:de|para|conta|cpf|cnpj)[\s:]*([a-záéíóú\d\s\/\.\-]+)/i);
    return {
      party_name: partyMatch ? partyMatch[1].trim().substring(0, 100) : null,
      party_account: null,
      party_bank: null,
      party_agency: null,
    };
  }, []);

  /**
   * Parse CSV
   */
  const parseCSV = useCallback((fileContent) => {
    try {
      setParsing(true);
      setParseError(null);

      const lines = fileContent.trim().split(/\r?\n/);
      const delimiter = detectDelimiter(lines[0]);
      const headers = splitDelimitedLine(lines[0], delimiter).map((h) => normalizeHeader(h));

      const statements = lines.slice(1).map((line, idx) => {
        const values = splitDelimitedLine(line, delimiter);
        const row = {};

        headers.forEach((header, i) => {
          row[header] = values[i];
        });

        const rawType = (row.tipo || row.type || row.transaction_type || '').toString().toLowerCase();
        const normalizedDate = normalizeDate(
          row.data || row.date || row.transaction_date || row.dt || row.posted_date,
        );
        const amountDirect = normalizeAmount(
          row.valor || row.amount || row.transaction_amount,
        );
        const creditAmount = normalizeAmount(row.credito || row.credit || row.entrada);
        const debitAmount = normalizeAmount(row.debito || row.debit || row.saida);
        const amount = amountDirect || creditAmount || debitAmount;

        const explicitCredit =
          rawType === 'c' ||
          rawType === 'credit' ||
          rawType === 'credito' ||
          rawType === 'crédito' ||
          rawType === 'entrada';
        const explicitDebit =
          rawType === 'd' ||
          rawType === 'debit' ||
          rawType === 'debito' ||
          rawType === 'débito' ||
          rawType === 'saida' ||
          rawType === 'saída';

        const operationDescription = cleanText(
          row.historico || row.history || row.memo || row.movimento || row.lancamento,
          '',
        );
        
        // Tentar extrair party name com mais prioridades
        const partyName = cleanText(
          row.nome_pagador ||
            row.nome_favorecido ||
            row.nome ||
            row.paciente ||
            row.convenio ||
            row.favorecido ||
            row.pagador ||
            row.recebedor ||
            row.beneficiario ||
            row.contraparte ||
            row.descricao ||
            row.description,
          '',
        );
        
        // Se operationDescription está vazio e description tem conteúdo, usar description como operação
        const finalOperationDescription = operationDescription || partyName || 'Transação CSV';
        
        // Manter description como está para compatibilidade
        const description = finalOperationDescription;

        const referenceNumber =
          cleanText(
            row.referencia ||
              row.reference ||
              row.documento ||
              row.document_number ||
              row.doc ||
              row.nsu,
          ) ||
          extractReferenceNumber(description);

        return {
          date: normalizedDate,
          description,
          amount: Math.abs(amount),
          type: explicitCredit
            ? TRANSACTION_TYPE.CREDIT
            : explicitDebit
              ? TRANSACTION_TYPE.DEBIT
              : creditAmount > 0
                ? TRANSACTION_TYPE.CREDIT
                : debitAmount > 0
                  ? TRANSACTION_TYPE.DEBIT
              : amount >= 0
                ? TRANSACTION_TYPE.CREDIT
                : TRANSACTION_TYPE.DEBIT,
          referenceNumber: referenceNumber || null,
          bankId: row.id || row.bank_id || row.fitid || referenceNumber || null,
          rawType: rawType || null,
          rawMemo: operationDescription || description,
          partyName: partyName || null,
        };
      });

      return statements
        .map((stmt) => ({
          ...stmt,
          operationType: detectOperationType(stmt.description, stmt.rawType, stmt.rawMemo),
          metadata: {
            raw_type: stmt.rawType,
            raw_memo: stmt.rawMemo,
            transaction_type: stmt.type,
            operation_type: detectOperationType(stmt.description, stmt.rawType, stmt.rawMemo),
            ...extractPartyInfo(stmt.description),
            party_name: stmt.partyName || extractPartyInfo(stmt.description).party_name,
            reference_number: stmt.referenceNumber,
            bank_id: stmt.bankId,
            check_number: null,
            sequence_number: null,
            fee_amount: 0,
            channel: detectOperationType(stmt.description, stmt.rawType, stmt.rawMemo),
            posting_timestamp: null,
            end_balance: null,
            original_encoding: 'utf-8',
          },
        }))
        .filter((stmt) => stmt.date && stmt.amount > 0);
    } catch (err) {
      setParseError(err.message);
      throw err;
    } finally {
      setParsing(false);
    }
  }, [
    cleanText,
    detectDelimiter,
    extractReferenceNumber,
    normalizeAmount,
    normalizeDate,
    detectOperationType,
    extractPartyInfo,
    normalizeHeader,
    splitDelimitedLine,
  ]);

  /**
   * Parse OFX
   */
  const parseOFX = useCallback((fileContent) => {
    try {
      setParsing(true);
      setParseError(null);

      const statements = [];
      const transactions = fileContent.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g) || [];

      const getOfxTagValue = (content, tagName) => {
        const regex = new RegExp(`<${tagName}>([^\\r\\n<]+)`, 'i');
        const match = content.match(regex);
        return match ? match[1].trim() : null;
      };

      transactions.forEach((tx) => {
        const postedAt = getOfxTagValue(tx, 'DTPOSTED');
        const amountRaw = getOfxTagValue(tx, 'TRNAMT');
        const memoRaw = getOfxTagValue(tx, 'MEMO');
        const nameRaw = getOfxTagValue(tx, 'NAME');
        const fitId = getOfxTagValue(tx, 'FITID');
        const checkNum = getOfxTagValue(tx, 'CHECKNUM');
        const typeRaw = (getOfxTagValue(tx, 'TRNTYPE') || '').toLowerCase();

        if (!postedAt || !amountRaw) {
          return;
        }

        const amountSigned = normalizeAmount(amountRaw);
        const date = normalizeDate(postedAt);
        const memo = cleanText(memoRaw);
        const name = cleanText(nameRaw);
        const description = cleanText(
          [name, memo].filter(Boolean).join(' - '),
          'Transação OFX',
        );
        const referenceNumber = fitId || checkNum || extractReferenceNumber(description);

        const typeFromTag =
          typeRaw === 'credit' || typeRaw === 'dep' || typeRaw === 'int'
            ? TRANSACTION_TYPE.CREDIT
            : typeRaw === 'debit' || typeRaw === 'payment' || typeRaw === 'check'
              ? TRANSACTION_TYPE.DEBIT
              : null;

        statements.push({
          date,
          description,
          amount: Math.abs(amountSigned),
          type:
            typeFromTag ||
            (amountSigned >= 0 ? TRANSACTION_TYPE.CREDIT : TRANSACTION_TYPE.DEBIT),
          referenceNumber: referenceNumber || null,
          bankId: fitId || checkNum || referenceNumber || null,
          rawType: typeRaw || null,
          rawMemo: memo || null,
        });
      });

      return statements
        .map((stmt) => ({
          ...stmt,
          operationType: detectOperationType(stmt.description, stmt.rawType, stmt.rawMemo),
          metadata: {
            raw_type: stmt.rawType,
            raw_memo: stmt.rawMemo,
            transaction_type: stmt.type,
            operation_type: detectOperationType(stmt.description, stmt.rawType, stmt.rawMemo),
            ...extractPartyInfo(stmt.description),
            reference_number: stmt.referenceNumber,
            bank_id: stmt.bankId,
            check_number: stmt.rawMemo && /cheque|check/i.test(stmt.rawMemo) ? stmt.bankId : null,
            sequence_number: stmt.bankId,
            fee_amount: /tarifa|taxa|iof/i.test(stmt.description) ? stmt.amount : 0,
            channel: detectOperationType(stmt.description, stmt.rawType, stmt.rawMemo),
            posting_timestamp: null,
            end_balance: null,
            original_encoding: 'utf-8',
          },
        }))
        .filter((stmt) => stmt.date && stmt.amount > 0);
    } catch (err) {
      setParseError(err.message);
      throw err;
    } finally {
      setParsing(false);
    }
  }, [cleanText, extractReferenceNumber, normalizeAmount, normalizeDate, detectOperationType, extractPartyInfo]);

  return {
    parsing,
    parseError,
    parseCSV,
    parseOFX,
  };
}
