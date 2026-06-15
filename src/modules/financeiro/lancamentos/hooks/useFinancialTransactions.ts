/**
 * useFinancialTransactions Hook
 * Gerencia CRUD e operações avançadas de transações financeiras
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { customSupabaseClient } from '@/lib/customSupabaseClient';
import { buildDerivedFinancialTransactions, getFinancialConsolidation } from '@/lib/financialConsolidationApi';
import { deleteReceivable } from '@/lib/receivablesApi';
import { deleteAP } from '@/lib/financeApi';
import { invalidateDashboardDataCache } from '@/services/dashboardDataService';
import {
  FinancialTransaction,
  FinancialTransactionCreateInput,
  FinancialTransactionUpdateInput,
  FinancialCategory,
  CostCenter,
  TransactionFilters,
  TransactionQueryOptions,
  FinancialMetrics,
  TransactionStatus,
  TransactionType,
  MovementType,
} from '../types';

interface UseFinancialTransactionsOptions {
  autoFetch?: boolean;
  pageSize?: number;
}

const TYPE_TO_DB: Record<string, string> = {
  INCOME: 'revenue',
  EXPENSE: 'expense',
  TRANSFER: 'transfer',
  REVERSAL: 'reversal',
  FEE: 'fee',
  ADJUSTMENT: 'adjustment',
};

const STATUS_TO_DB: Record<string, string> = {
  PENDING: 'pending',
  PAID: 'paid',
  CANCELED: 'canceled',
  PARTIAL: 'partial',
  SCHEDULED: 'scheduled',
  OPEN: 'open',
  OVERDUE: 'overdue',
  RECEIVED: 'received',
  PROCESSED: 'processed',
};

const STATUS_ALIASES: Record<string, string[]> = {
  PENDING: ['pending', 'pendente'],
  SCHEDULED: ['scheduled', 'agendada', 'agendado', 'programada', 'programado', 'planned', 'previsto'],
  OPEN: ['open', 'aberto', 'em aberto', 'pending', 'pendente'],
  OVERDUE: ['overdue', 'vencido', 'vencida', 'atrasado', 'atrasada'],
  PAID: ['paid', 'pago', 'paga', 'quitado', 'quitada'],
  RECEIVED: ['received', 'recebido', 'recebida', 'paid', 'pago', 'paga', 'quitado', 'quitada'],
  PROCESSED: ['processed', 'processado', 'processada', 'received', 'recebido', 'paid'],
  CANCELED: ['canceled', 'cancelado', 'cancelada', 'cancelled'],
  PARTIAL: ['partial', 'parcial'],
};

function isDerivedTransaction(transaction?: FinancialTransaction | null) {
  if (!transaction) return false;
  const id = String(transaction.id || '');
  return id.startsWith('ar-') || id.startsWith('ap-') || id.startsWith('ft-');
}

function getPersistedTransactionId(transaction: FinancialTransaction) {
  const id = String(transaction.id || '');
  if (id.startsWith('ft-')) return id.slice(3);
  return id;
}

function getTransactionOrigin(transaction: FinancialTransaction) {
  const originModule = String(transaction.origin_module || '').toLowerCase();
  if (originModule) return originModule;
  const id = String(transaction.id || '');
  if (id.startsWith('ar-')) return 'accounts_receivable';
  if (id.startsWith('ap-')) return 'accounts_payable';
  if (id.startsWith('ft-')) return 'financial_transactions';
  return 'financial_transactions';
}

function normalizeTransactionStatus(status?: string) {
  return String(status || '').toLowerCase();
}

function getStatusFilterValues(status?: string) {
  if (!status) return [];
  const key = String(status).toUpperCase();
  const dbStatus = STATUS_TO_DB[key] || String(status).toLowerCase();
  return Array.from(new Set([dbStatus, String(status).toLowerCase(), ...(STATUS_ALIASES[key] || [])]));
}

function matchesStatusFilter(itemStatus: unknown, filterStatus?: string) {
  if (!filterStatus) return true;
  const normalized = normalizeTransactionStatus(String(itemStatus || ''));
  return getStatusFilterValues(filterStatus).includes(normalized);
}

function normalizeText(value: unknown) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function normalizeType(item: any) {
  const type = String(item?.type || '').toLowerCase();
  if (type) return type;
  const transactionType = String(item?.transaction_type || '').toUpperCase();
  if (transactionType === 'INCOME') return 'revenue';
  if (transactionType === 'EXPENSE') return 'expense';
  if (transactionType === 'ADJUSTMENT') return 'deduction';
  return String(item?.transaction_type || '').toLowerCase();
}

function matchesTransactionType(item: any, filterType?: string) {
  if (!filterType) return true;
  const normalized = normalizeType(item);
  const key = String(filterType).toUpperCase();
  const acceptedByType: Record<string, string[]> = {
    INCOME: ['revenue', 'income'],
    EXPENSE: ['expense', 'cost'],
    TRANSFER: ['transfer'],
    REVERSAL: ['reversal'],
    FEE: ['fee'],
    ADJUSTMENT: ['adjustment', 'deduction'],
  };
  return (acceptedByType[key] || [String(filterType).toLowerCase()]).includes(normalized);
}

function matchesMovementType(item: any, filterMovementType?: string) {
  if (!filterMovementType) return true;
  if (item?.movement_type) {
    return String(item.movement_type).toUpperCase() === String(filterMovementType).toUpperCase();
  }
  const isRealized = item?.is_reconciled === true || ['paid', 'received', 'processed', 'pago', 'recebido', 'quitado'].includes(
    normalizeTransactionStatus(item?.status),
  );
  return String(filterMovementType).toUpperCase() === (isRealized ? 'REALIZED' : 'PREDICTED');
}

function normalizeDate(item: any) {
  return String(item?.transaction_date || item?.competency_date || item?.scheduled_date || item?.due_date || '').split('T')[0];
}

function matchesDateRange(item: any, dateFrom?: string, dateTo?: string) {
  const date = normalizeDate(item);
  if (!date) return !dateFrom && !dateTo;
  if (dateFrom && date < dateFrom) return false;
  if (dateTo && date > dateTo) return false;
  return true;
}

function matchesClientFilters(item: any, filters: TransactionFilters) {
  const category = (filters as any).category_id || (filters as any).category;

  if (filters.financial_account_id) {
    const itemAccountId = item?.financial_account_id || item?.account_id;
    if (itemAccountId !== filters.financial_account_id) return false;
  }
  if (!matchesTransactionType(item, filters.transaction_type)) return false;
  if (!matchesStatusFilter(item?.status, filters.status)) return false;
  if (category && item?.category !== category && item?.category_id !== category) return false;
  if (!matchesMovementType(item, filters.movement_type)) return false;
  if (filters.is_reconciled !== undefined && Boolean(item?.is_reconciled) !== filters.is_reconciled) return false;
  if (!matchesDateRange(item, filters.date_from, filters.date_to)) return false;
  if (filters.search) {
    const haystack = normalizeText(item?.description, item?.reference_document, item?.document_number, item?.notes);
    if (!haystack.includes(normalizeText(filters.search))) return false;
  }
  return true;
}

function getOriginKey(item: any) {
  return `${item?.origin_module || ''}:${item?.origin_id || ''}:${normalizeType(item)}:${item?.category || ''}`;
}

function getSemanticKey(item: any) {
  const description = normalizeText(`${item?.description || ''} ${item?.reference_document || ''}`)
    .replace(/^receita bruta -\s*/, '')
    .replace(/^taxa de cartao -\s*/, '')
    .replace(/^desconto concedido -\s*/, '')
    .replace(/^conta a pagar -\s*/, '');
  return [
    normalizeType(item),
    item?.category || '',
    normalizeDate(item),
    Number(item?.amount || 0).toFixed(2),
    description,
  ].join('|');
}

function getIdentifierTokens(value: unknown) {
  const text = normalizeText(value);
  const numericTokens = text.match(/\d{4,}/g) || [];
  const wordTokens = text
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 5 && !['conta', 'pagar', 'receita', 'bruta', 'taxa', 'cartao', 'despesa'].includes(token));
  return new Set([...numericTokens, ...wordTokens]);
}

function hasSharedBusinessIdentifier(left: unknown, right: unknown) {
  const leftTokens = getIdentifierTokens(left);
  if (leftTokens.size === 0) return false;
  const rightTokens = getIdentifierTokens(right);
  for (const token of leftTokens) {
    if (rightTokens.has(token)) return true;
  }
  return false;
}

function isAccountsPayableDerived(item: any) {
  const origin = String(item?.origin_module || '').toLowerCase();
  return origin === 'accounts_payable' || String(item?.id || '').startsWith('ap-');
}

function normalizeTransactionUpdateInput(input: FinancialTransactionUpdateInput) {
  const payload: Record<string, unknown> = {};

  if (input.transaction_type) payload.type = TYPE_TO_DB[input.transaction_type] || String(input.transaction_type).toLowerCase();
  if (input.status) payload.status = STATUS_TO_DB[input.status] || String(input.status).toLowerCase();
  if (input.category_id) payload.category = input.category_id;
  if (input.document_number !== undefined) payload.reference_document = input.document_number || null;
  if (input.description !== undefined) payload.description = input.description;
  if (input.amount !== undefined) payload.amount = input.amount;
  if (input.due_date !== undefined) payload.due_date = input.due_date || null;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.transaction_date !== undefined) payload.scheduled_date = input.transaction_date || null;
  const financialAccountId = (input as any).financial_account_id;
  if (financialAccountId) payload.account_id = financialAccountId;

  return payload;
}

export const useFinancialTransactions = (options: UseFinancialTransactionsOptions = {}) => {
  const { user } = useAuth();
  const clinicContext = useClinicContext();
  const clinicId = clinicContext?.clinicId;
  const { autoFetch = true, pageSize = 20 } = options;

  // Debug logs
  useEffect(() => {
    if (!clinicId) {
      console.warn('⚠️ useFinancialTransactions: clinicId não disponível', { clinicId, clinicContext });
    }
  }, [clinicId, clinicContext]);

  // State
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);

  // Validações
  if (!clinicId) {
    console.error('useFinancialTransactions: clinicId não disponível');
  }

  // =====================================================
  // LISTAGEM E BUSCA
  // =====================================================

  const fetchTransactions = useCallback(
    async (
      filtersParam?: TransactionFilters,
      queryOptions?: TransactionQueryOptions
    ) => {
      if (!clinicId) {
        console.warn('⚠️ fetchTransactions: clinicId not available, skipping fetch');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('🔍 fetchTransactions START:', {
          clinicId,
          filters: filtersParam,
          queryOptions,
        });

        const currentPage = queryOptions?.page || page;
        const limit = queryOptions?.limit || pageSize;
        const offset = (currentPage - 1) * limit;
        const sortBy = queryOptions?.sort_by || 'created_at';
        const sortOrder = queryOptions?.sort_order || 'desc';

        const finalFilters = filtersParam || filters;

        let query = customSupabaseClient
          .from('financial_transactions')
          .select('*', { count: 'exact' })
          .eq('clinic_id', clinicId);

        // Aplicar filtros sobre o schema real atual.
        if (finalFilters.financial_account_id) {
          query = query.or(`financial_account_id.eq.${finalFilters.financial_account_id},account_id.eq.${finalFilters.financial_account_id}`);
        }
        if (finalFilters.transaction_type) {
          const dbType = TYPE_TO_DB[finalFilters.transaction_type as string] || finalFilters.transaction_type;
          query = query.eq('type', dbType);
        }
        if (finalFilters.status) {
          const dbStatuses = getStatusFilterValues(finalFilters.status as string);
          if (dbStatuses.length) query = query.in('status', dbStatuses);
        }
        if (finalFilters.category_id || finalFilters.category) {
          // OLD schema usa 'category' (texto), não category_id
          query = query.eq('category', finalFilters.category_id || finalFilters.category);
        }
        if (finalFilters.is_reconciled !== undefined) {
          query = query.eq('is_reconciled', finalFilters.is_reconciled);
        }
        if (finalFilters.search) {
          query = query.or(
            `description.ilike.%${finalFilters.search}%,reference_document.ilike.%${finalFilters.search}%`
          );
        }

        // Ordenação. A paginação é aplicada depois do merge com lançamentos derivados.
        query = query
          .order(sortBy, { ascending: sortOrder === 'asc' })
          .limit(5000);

        console.log('📊 Query prepared, executing...');
        const { data, count, error: fetchError } = await query;

        console.log('✅ Query result:', {
          dataLength: data?.length || 0,
          count,
          hasError: !!fetchError,
          firstRecord: data?.[0],
        });

        if (fetchError) throw fetchError;

        const persisted = data || [];
        let allMergedTransactions = persisted;
        try {
          const consolidation = await getFinancialConsolidation(
            clinicId,
            finalFilters.date_from || '1900-01-01',
            finalFilters.date_to || '2999-12-31',
          );
          const existingKeys = new Set(persisted.map(getOriginKey));
          const existingSemanticKeys = new Set(persisted.map(getSemanticKey));
          const hasEquivalentPersisted = (derivedItem: any) => persisted.some((item: any) => {
            const exactKey = getOriginKey(derivedItem);
            const itemKey = getOriginKey(item);
            if (itemKey === exactKey) return true;
            if (getSemanticKey(item) === getSemanticKey(derivedItem)) return true;
            const sameAmount = Math.abs(Number(item.amount || 0) - Number(derivedItem.amount || 0)) < 0.01;
            const sameType = normalizeType(item) === normalizeType(derivedItem);
            const sameDate = normalizeDate(item) === normalizeDate(derivedItem);
            const sameCardFee = String(item.category || '') === 'card_fee' && String(derivedItem.category || '') === 'card_fee';
            const itemDescription = normalizeText(`${item.description || ''} ${item.reference_document || ''}`);
            const derivedDescription = normalizeText(derivedItem.description || '');
            const sharedIdentifier = hasSharedBusinessIdentifier(itemDescription, derivedDescription);
            const itemOrigin = String(item.origin_module || '').toLowerCase();
            const derivedOrigin = String(derivedItem.origin_module || '').toLowerCase();
            const sameBusinessOrigin = itemOrigin && derivedOrigin && itemOrigin === derivedOrigin && String(item.origin_id || '') === String(derivedItem.origin_id || '');
            const similarDescription = itemDescription.includes(derivedDescription) || derivedDescription.includes(itemDescription);
            if (sameBusinessOrigin && sameAmount && sameDate) return true;
            if (sameCardFee && sameAmount && sameDate) return true;
            if (isAccountsPayableDerived(derivedItem) && sameAmount && sameType && sharedIdentifier) return true;
            return sameAmount && sameType && sameDate && similarDescription;
          });
          const derived = buildDerivedFinancialTransactions(consolidation)
            .filter((item: any) => {
              const key = getOriginKey(item);
              if (existingKeys.has(key)) return false;
              if (existingSemanticKeys.has(getSemanticKey(item))) return false;
              if (hasEquivalentPersisted(item)) return false;
              if (!matchesTransactionType(item, finalFilters.transaction_type)) return false;
              if (!matchesStatusFilter(item.status, finalFilters.status)) return false;
              if ((finalFilters.category_id || finalFilters.category) && item.category !== (finalFilters.category_id || finalFilters.category)) return false;
              if (!matchesMovementType(item, finalFilters.movement_type)) return false;
              if (finalFilters.is_reconciled !== undefined && item.is_reconciled !== finalFilters.is_reconciled) return false;
              if (!matchesDateRange(item, finalFilters.date_from, finalFilters.date_to)) return false;
              if (finalFilters.search && !String(item.description || '').toLowerCase().includes(String(finalFilters.search).toLowerCase())) return false;
              return true;
            });
          allMergedTransactions = [...persisted, ...derived]
            .sort((a: any, b: any) => String(b.transaction_date || b.competency_date || b.created_at || '').localeCompare(String(a.transaction_date || a.competency_date || a.created_at || '')));
        } catch (derivedError) {
          console.warn('Derived financial transactions skipped:', derivedError);
        }

        const filteredMergedTransactions = allMergedTransactions.filter((item: any) => matchesClientFilters(item, finalFilters));

        setTransactions(filteredMergedTransactions.slice(offset, offset + limit));
        setTotalCount(filteredMergedTransactions.length || count || 0);
        setPage(currentPage);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao carregar transações';
        setError(message);
        console.error('❌ fetchTransactions error:', err);
      } finally {
        setLoading(false);
      }
    },
    [clinicId, pageSize, page, filters]
  );

  const fetchCategories = useCallback(async () => {
    if (!clinicId) return;

    try {
      const { data, error: fetchError } = await customSupabaseClient
        .from('financial_categories')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');

      if (fetchError) throw fetchError;
      setCategories(data || []);
    } catch (err) {
      console.error('fetchCategories error:', err);
    }
  }, [clinicId]);

  const fetchCostCenters = useCallback(async () => {
    if (!clinicId) return;

    try {
      const { data, error: fetchError } = await customSupabaseClient
        .from('cost_centers')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');

      if (fetchError) throw fetchError;
      setCostCenters(data || []);
    } catch (err) {
      console.error('fetchCostCenters error:', err);
    }
  }, [clinicId]);

  // =====================================================
  // CRIAR TRANSAÇÃO
  // =====================================================

  const createTransaction = useCallback(
    async (input: FinancialTransactionCreateInput): Promise<FinancialTransaction | null> => {
      if (!clinicId || !user?.id) return null;

      try {
        setError(null);

        // Validações
        if (!input.description?.trim()) throw new Error('Descrição é obrigatória');
        if (input.amount <= 0) throw new Error('Valor deve ser maior que zero');
        if (!input.financial_account_id) throw new Error('Conta financeira é obrigatória');
        if (!input.transaction_type) throw new Error('Tipo de transação é obrigatório');

        // Converter para schema ANTIGO (20260319)
        const dbType = TYPE_TO_DB[input.transaction_type as string] || input.transaction_type;
        const dbStatus = STATUS_TO_DB[(input.status || TransactionStatus.PENDING) as string] || 'pending';

        const payload = {
          clinic_id: clinicId,
          created_by: user.id,
          account_id: input.financial_account_id, // Rename: financial_account_id → account_id
          type: dbType, // Converter enum para lowercase
          status: dbStatus, // Converter enum para lowercase
          category: input.category || 'general', // schema antigo usa 'category' (texto)
          description: input.description,
          amount: input.amount,
          reference_document: input.reference_document,
          scheduled_date: input.transaction_date,
          due_date: input.due_date || input.transaction_date,
          notes: input.notes,
          origin_module: 'financial_transactions',
        };

        const { data, error: insertError } = await customSupabaseClient
          .from('financial_transactions')
          .insert([payload])
          .select()
          .single();

        if (insertError) throw insertError;

        invalidateDashboardDataCache(clinicId);
        await fetchTransactions();
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar transação';
        setError(message);
        throw err;
      }
    },
    [clinicId, user?.id, fetchTransactions]
  );

  // =====================================================
  // ATUALIZAR TRANSAÇÃO
  // =====================================================

  const updateTransaction = useCallback(
    async (id: string, input: FinancialTransactionUpdateInput): Promise<FinancialTransaction | null> => {
      if (!clinicId || !user?.id) return null;

      try {
        setError(null);

        const transaction = transactions.find(t => t.id === id);
        if (isDerivedTransaction(transaction)) {
          throw new Error('Lançamento derivado deve ser editado no módulo de origem.');
        }
        if (transaction && ['canceled', 'paid'].includes(normalizeTransactionStatus(transaction.status))) {
          throw new Error('Não é possível editar transações canceladas ou pagas');
        }

        const payload = normalizeTransactionUpdateInput(input);

        const { data, error: updateError } = await customSupabaseClient
          .from('financial_transactions')
          .update(payload)
          .eq('id', id)
          .eq('clinic_id', clinicId)
          .select()
          .maybeSingle();

        if (updateError) throw updateError;
        if (!data) throw new Error('Transação não encontrada para atualização');

        invalidateDashboardDataCache(clinicId);
        setTransactions(trans => trans.map(t => (t.id === id ? data : t)));
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar transação';
        setError(message);
        throw err;
      }
    },
    [clinicId, user?.id, transactions]
  );

  // =====================================================
  // CANCELAR TRANSAÇÃO
  // =====================================================

  const cancelTransaction = useCallback(
    async (id: string, reason?: string): Promise<void> => {
      try {
        await updateTransaction(id, {
          status: TransactionStatus.CANCELED,
          notes: reason || 'Cancelada pelo usuário',
        });
      } catch (err) {
        throw err;
      }
    },
    [updateTransaction]
  );

  // =====================================================
  // ESTORNAR TRANSAÇÃO
  // =====================================================

  const revertTransaction = useCallback(
    async (id: string, reason?: string): Promise<FinancialTransaction | null> => {
      if (!clinicId || !user?.id) return null;

      try {
        const original = transactions.find(t => t.id === id);
        if (!original) throw new Error('Transação não encontrada');

        // Criar transação reversa - usar nomes de coluna corretos
        const reversalInput: FinancialTransactionCreateInput = {
          account_id: original.account_id,
          type: original.type === 'revenue' ? 'adjustment' : 'adjustment',
          category: original.category,
          description: `Estorno: ${original.description}`,
          amount: original.amount,
          notes: reason || 'Estorno de transação',
        };

        return await createTransaction(reversalInput);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao estornar transação';
        setError(message);
        throw err;
      }
    },
    [clinicId, user?.id, transactions, createTransaction]
  );

  // =====================================================
  // CONCILIAÇÃO
  // =====================================================

  const reconcileTransaction = useCallback(
    async (id: string): Promise<void> => {
      try {
        // NOTA: is_reconciled não existe na tabela, apenas adicionar uma nota
        await updateTransaction(id, {
          notes: 'Conciliado em ' + new Date().toLocaleDateString('pt-BR'),
        });
      } catch (err) {
        throw err;
      }
    },
    [updateTransaction]
  );

  const reconcileMultiple = useCallback(
    async (ids: string[]): Promise<void> => {
      try {
        setError(null);
        const now = new Date().toLocaleDateString('pt-BR');

        // NOTA: is_reconciled não existe, usar endpoint alternativo se disponível
        // Por enquanto, apenas atualizar notas de cada transação
        for (const id of ids) {
          const transaction = transactions.find(t => t.id === id);
          if (transaction) {
            await updateTransaction(id, {
              notes: `${transaction.notes || ''} [Conciliado: ${now}]`.trim(),
            });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao conciliar transações';
        setError(message);
        throw err;
      }
    },
    [clinicId, updateTransaction, transactions]
  );

  // =====================================================
  // IMPORTAÇÃO EM MASSA
  // =====================================================

  const importTransactions = useCallback(
    async (data: any[]): Promise<{ success: number; failed: number; errors: string[] }> => {
      if (!clinicId || !user?.id) return { success: 0, failed: 0, errors: [] };

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      try {
        setLoading(true);
        setError(null);

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          try {
            // Parse row data - usar nomes de coluna corretos
            const description = row[1] || '';
            const type = (row[2] || 'expense').toLowerCase() as any; // revenue, expense, cost, deduction, adjustment, transfer
            const amount = parseFloat(String(row[4] || 0).replace(',', '.'));
            const status = (row[5] || 'pending').toLowerCase(); // pending, scheduled, processed, paid, canceled
            const notes = row[6] || '';

            // Validações básicas
            if (!description || isNaN(amount) || amount === 0) {
              errors.push(`Linha ${i + 2}: Descrição e valor são obrigatórios`);
              failed++;
              continue;
            }

            // Criar transação - usar campos corretos do schema
            const { error: createError } = await customSupabaseClient
              .from('financial_transactions')
              .insert({
                clinic_id: clinicId,
                account_id: null, // Será preenchido manualmente ou por padrão
                type,
                description,
                amount: Math.abs(amount),
                status,
                notes: notes || null,
                created_by: user.id,
                category: 'other',
              });

            if (createError) {
              errors.push(`Linha ${i + 2}: ${createError.message}`);
              failed++;
            } else {
              success++;
            }
          } catch (rowError) {
            errors.push(`Linha ${i + 2}: ${rowError instanceof Error ? rowError.message : 'Erro desconhecido'}`);
            failed++;
          }
        }

        invalidateDashboardDataCache(clinicId);
        await fetchTransactions();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao importar transações';
        setError(message);
      } finally {
        setLoading(false);
      }

      return { success, failed, errors };
    },
    [clinicId, user?.id, fetchTransactions]
  );

  // =====================================================
  // DELETAR TRANSAÇÃO
  // =====================================================

  const deleteTransaction = useCallback(
    async (id: string): Promise<void> => {
      if (!clinicId) return;

      try {
        setError(null);

        const transaction = transactions.find(t => t.id === id);
        if (transaction) {
          const origin = getTransactionOrigin(transaction);
          const originId = transaction.origin_id || getPersistedTransactionId(transaction);
          if (origin === 'accounts_receivable') {
            await deleteReceivable(originId, clinicId);
            setTransactions(trans => trans.filter(t => t.id !== id && t.origin_id !== originId));
            invalidateDashboardDataCache(clinicId);
            await fetchTransactions();
            return;
          }
          if (origin === 'accounts_payable') {
            await deleteAP(originId);
            setTransactions(trans => trans.filter(t => t.id !== id && t.origin_id !== originId));
            invalidateDashboardDataCache(clinicId);
            await fetchTransactions();
            return;
          }
        }

        const persistedId = transaction ? getPersistedTransactionId(transaction) : id;
        const { error: deleteError } = await customSupabaseClient
          .from('financial_transactions')
          .delete()
          .eq('id', persistedId)
          .eq('clinic_id', clinicId);

        if (deleteError) throw deleteError;

        invalidateDashboardDataCache(clinicId);
        setTransactions(trans => trans.filter(t => t.id !== id && getPersistedTransactionId(t) !== persistedId));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao deletar transação';
        setError(message);
        throw err;
      }
    },
    [clinicId, transactions, fetchTransactions]
  );

  // =====================================================
  // MÉTRICAS
  // =====================================================

  const fetchMetrics = useCallback(async () => {
    if (!clinicId) return;

    try {
      // Calcular métricas baseado nas transações atuais
      // Suportar AMBOS os schemas: OLD (type='revenue') e NEW (transaction_type='INCOME')
      
      const isRealizedStatus = (transaction: any) => {
        const status = String(transaction.status || '').toLowerCase();
        return ['paid', 'received', 'processed', 'pago', 'recebido', 'quitado'].includes(status) || transaction.movement_type === 'REALIZED';
      };

      const isPredictedStatus = (transaction: any) => !isRealizedStatus(transaction);
      const isReconciledTransaction = (transaction: any) => transaction.is_reconciled === true || isRealizedStatus(transaction);

      const income = transactions
        .filter((t: any) => {
          // OLD schema: t.type === 'revenue'
          // NEW schema: t.transaction_type === 'INCOME'
          const isRevenue = t.type === 'revenue' || t.transaction_type === 'INCOME';
          return isRevenue && isRealizedStatus(t);
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const expense = transactions
        .filter((t: any) => {
          // OLD schema: t.type === 'expense' (and other expense types like cost)
          // NEW schema: t.transaction_type === 'EXPENSE'
          const isExpense = 
            (t.type && ['expense', 'cost', 'deduction'].includes(t.type)) || 
            t.transaction_type === 'EXPENSE';
          return isExpense && isRealizedStatus(t);
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      // Realizadas = receitas - despesas (para OLD schema, tudo é realizado)
      // Se tem movement_type, filtra por REALIZED, senão assume tudo como realizado
      const realized = transactions
        .filter((t: any) => isRealizedStatus(t))
        .reduce((sum, t) => {
          const isIncome = t.type === 'revenue' || t.transaction_type === 'INCOME';
          const amount = t.amount || 0;
          return isIncome ? sum + amount : sum - amount;
        }, 0);

      // Previstas = filtra por movement_type='PREDICTED' (não existe em OLD schema, então 0)
      const predicted = transactions
        .filter((t: any) => isPredictedStatus(t))
        .reduce((sum, t) => {
          const isIncome = t.type === 'revenue' || t.transaction_type === 'INCOME';
          const amount = t.amount || 0;
          return isIncome ? sum + amount : sum - amount;
        }, 0);

      // Status normalizados para comparação (OLD: lowercase, NEW: uppercase)
      const normalizeStatus = (status: string) => status.toLowerCase();
      const isIncomeTransaction = (t: any) => t.type === 'revenue' || t.transaction_type === 'INCOME';
      const isExpenseTransaction = (t: any) => (
        (t.type && ['expense', 'cost', 'deduction'].includes(t.type))
        || t.transaction_type === 'EXPENSE'
      );

      const metrics: FinancialMetrics = {
        total_income: income,
        total_expense: expense,
        total_realized: realized,
        total_predicted: predicted,
        net_balance: realized + predicted,
        pending_count: transactions.filter((t: any) => 
          normalizeStatus(t.status) === 'pending'
        ).length,
        paid_count: transactions.filter((t: any) => 
          normalizeStatus(t.status) === 'paid'
        ).length,
        income_paid_count: transactions.filter((t: any) => isIncomeTransaction(t) && isRealizedStatus(t)).length,
        expense_paid_count: transactions.filter((t: any) => isExpenseTransaction(t) && isRealizedStatus(t)).length,
        reconciled_count: transactions.filter((t: any) => isReconciledTransaction(t)).length,
        unreconciled_count: transactions.filter((t: any) => !isReconciledTransaction(t)).length,
      };

      console.log('💰 Financial Metrics Updated:', {
        total_income: income,
        total_expense: expense,
        total_realized: realized,
        total_predicted: predicted,
        transaction_count: transactions.length,
        metrics
      });

      setMetrics(metrics);
    } catch (err) {
      console.error('fetchMetrics error:', err);
    }
  }, [clinicId, transactions]);

  // =====================================================
  // EFEITOS
  // =====================================================

  useEffect(() => {
    if (autoFetch && clinicId) {
      console.log('🚀 useFinancialTransactions autoFetch triggered:', {
        user_id: user?.id,
        clinic_id: clinicId,
        user_email: user?.email,
        autoFetch,
      });
      fetchTransactions();
      fetchCategories();
      fetchCostCenters();
    }
  }, [clinicId, autoFetch, fetchTransactions, fetchCategories, fetchCostCenters]);

  useEffect(() => {
    fetchMetrics();
  }, [transactions, fetchMetrics]);

  // =====================================================
  // RETORNO
  // =====================================================

  return {
    // State
    transactions,
    categories,
    costCenters,
    loading,
    error,
    page,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    filters,
    metrics,

    // Operações
    fetchTransactions,
    fetchCategories,
    fetchCostCenters,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    cancelTransaction,
    revertTransaction,
    reconcileTransaction,
    reconcileMultiple,
    importTransactions,
    fetchMetrics,

    // Setters
    setFilters,
    setPage,
    setError,
  };
};
