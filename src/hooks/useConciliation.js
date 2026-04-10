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
  getStatementHistory
} from '@/lib/conciliationApi';
import {
  CONCILIATION_STATUS,
  TRANSACTION_TYPE,
  FINANCIAL_LINK_TYPE
} from '@/lib/conciliationStatus';

/**
 * Hook principal para Conciliação Bancária
 */
export function useConciliation(clinicId) {
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({
    status: null,
    startDate: null,
    endDate: null,
    accountId: null,
    search: ''
  });

  const [indicators, setIndicators] = useState({
    pending: 0,
    conciliated: 0,
    adjusted: 0,
    divergent: 0,
    ignored: 0,
    totalCredit: 0,
    totalDebit: 0,
    difference: 0
  });

  const [bankAccounts, setBankAccounts] = useState([]);
  const [suggestions, setSuggestions] = useState({});
  const [selectedStatement, setSelectedStatement] = useState(null);

  /**
   * Carregar extratos
   */
  const loadStatements = useCallback(async (page = 0, pageSize = 50) => {
    try {
      setLoading(true);
      setError(null);

      const result = await listBankStatements({
        clinicId,
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
        accountId: filters.accountId,
        search: filters.search,
        limit: pageSize,
        offset: page * pageSize
      });

      setStatements(result.data);
    } catch (err) {
      console.error('Error loading statements:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clinicId, filters]);

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

  /**
   * Carregar indicadores
   */
  const loadIndicators = useCallback(async () => {
    try {
      const ind = await getIndicators(
        clinicId,
        filters.accountId,
        filters.startDate,
        filters.endDate
      );
      setIndicators(ind);
    } catch (err) {
      console.error('Error loading indicators:', err);
    }
  }, [clinicId, filters.accountId, filters.startDate, filters.endDate]);

  /**
   * Importar extrato (função wrapper)
   */
  const importExtract = useCallback(async (items, accountId) => {
    try {
      setLoading(true);
      setError(null);

      const result = await importBankStatements({
        clinicId,
        statements: items,
        accountId
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
  }, [clinicId, loadStatements, loadIndicators]);

  /**
   * Buscar sugestões para um extrato
   */
  const findSuggestionsForStatement = useCallback(async (statement) => {
    try {
      const sugg = await findSuggestions({
        clinicId,
        amount: statement.amount,
        description: statement.description,
        transactionType: statement.transaction_type,
        statementDate: statement.statement_date
      });

      setSuggestions(prev => ({
        ...prev,
        [statement.id]: sugg
      }));

      return sugg;
    } catch (err) {
      console.error('Error finding suggestions:', err);
      return [];
    }
  }, [clinicId]);

  /**
   * Conciliar um extrato
   */
  const handleConciliate = useCallback(async (statementId, financialId, financialType) => {
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
  }, [loadStatements, loadIndicators]);

  /**
   * Criar lançamento e vincular
   */
  const handleCreateAndLink = useCallback(async (statementId, financialData) => {
    try {
      setLoading(true);
      setError(null);

      await createAndLinkFinancial({
        statementId,
        ...financialData,
        clinicId
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
  }, [clinicId, loadStatements, loadIndicators]);

  /**
   * Marcar como divergente
   */
  const handleMarkDivergent = useCallback(async (statementId, reason) => {
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
  }, [loadStatements, loadIndicators]);

  /**
   * Ignorar lançamento
   */
  const handleIgnore = useCallback(async (statementId, reason) => {
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
  }, [loadStatements, loadIndicators]);

  /**
   * Conciliar múltiplos selecionados
   */
  const handleBulkConciliate = useCallback(async (selectedIds, getMatchFunction) => {
    try {
      setLoading(true);
      setError(null);

      const promises = selectedIds.map(async (id) => {
        const statement = statements.find(s => s.id === id);
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
  }, [statements, loadStatements, loadIndicators]);

  /**
   * Atualizar filtros
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
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
      search: ''
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
    }
  }, [clinicId, filters, loadStatements, loadIndicators, loadBankAccounts]);

  return {
    // Estado
    statements,
    loading,
    error,
    indicators,
    bankAccounts,
    suggestions,
    selectedStatement,
    filters,

    // Ações
    importExtract,
    findSuggestionsForStatement,
    handleConciliate,
    handleCreateAndLink,
    handleMarkDivergent,
    handleIgnore,
    handleBulkConciliate,
    setSelectedStatement,
    updateFilters,
    clearFilters,
    getHistory,

    // Reload
    loadStatements,
    loadIndicators,
    loadBankAccounts
  };
}

/**
 * Hook auxiliar para parsing de arquivo de extrato
 */
export function useBankStatementParser() {
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);

  /**
   * Parse CSV
   */
  const parseCSV = useCallback((fileContent) => {
    try {
      setParsing(true);
      setParseError(null);

      const lines = fileContent.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      const statements = lines.slice(1).map((line, idx) => {
        const values = line.split(',').map(v => v.trim());
        const row = {};

        headers.forEach((header, i) => {
          row[header] = values[i];
        });

        return {
          date: row.data || row.date,
          description: row.descricao || row.description,
          amount: parseFloat(row.valor || row.amount),
          type: row.tipo || row.type === 'C' || row.type === 'credit' ? TRANSACTION_TYPE.CREDIT : TRANSACTION_TYPE.DEBIT
        };
      });

      return statements;
    } catch (err) {
      setParseError(err.message);
      throw err;
    } finally {
      setParsing(false);
    }
  }, []);

  /**
   * Parse OFX
   */
  const parseOFX = useCallback((fileContent) => {
    try {
      setParsing(true);
      setParseError(null);

      const statements = [];
      const transactions = fileContent.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/g) || [];

      transactions.forEach(tx => {
        const dateMatch = tx.match(/<DTPOSTED>(\d{8})/);
        const amountMatch = tx.match(/<TRNAMT>(-?\d+\.?\d*)/);
        const descMatch = tx.match(/<MEMO>(.*?)</);
        const typeMatch = tx.match(/<TRNTYPE>(\w+)/);

        if (dateMatch && amountMatch) {
          const amount = parseFloat(amountMatch[1]);
          statements.push({
            date: dateMatch[1],
            description: descMatch ? descMatch[1] : 'OFX Transaction',
            amount: Math.abs(amount),
            type: amount > 0 ? TRANSACTION_TYPE.CREDIT : TRANSACTION_TYPE.DEBIT
          });
        }
      });

      return statements;
    } catch (err) {
      setParseError(err.message);
      throw err;
    } finally {
      setParsing(false);
    }
  }, []);

  return {
    parsing,
    parseError,
    parseCSV,
    parseOFX
  };
}
