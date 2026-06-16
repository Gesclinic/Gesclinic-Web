/**
 * TransactionsTable Component
 * Exibe transações em tabela com ações
 */

import React from 'react';
import { Pencil, Trash2, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FinancialTransaction,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_STATUS_LABELS,
  STATUS_COLORS,
} from '../types';

interface TransactionsTableProps {
  transactions: FinancialTransaction[];
  loading?: boolean;
  onEdit?: (transaction: FinancialTransaction) => void;
  onDelete?: (transaction: FinancialTransaction) => Promise<void>;
  onRevert?: (transaction: FinancialTransaction) => Promise<void>;
  onReconcile?: (transaction: FinancialTransaction) => Promise<void>;
  deletingId?: string | null;
}

export const TransactionsTable = React.memo<TransactionsTableProps>(({
  transactions,
  loading = false,
  onEdit,
  onDelete,
  onRevert,
  onReconcile,
  deletingId = null,
}) => {
  const [deleteConfirm, setDeleteConfirm] = React.useState<FinancialTransaction | null>(null);
  const [revertConfirm, setRevertConfirm] = React.useState<FinancialTransaction | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = React.useState('');
  const [visibleColumns, setVisibleColumns] = React.useState<Record<string, boolean>>({
    date: true,
    description: true,
    type: true,
    amount: true,
    status: true,
    reconciled: true,
    origin: false,
  });

  React.useEffect(() => {
    setSelectedIds((current) => new Set([...current].filter((id) => transactions.some((item) => item.id === id))));
  }, [transactions]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center">
        <div className="inline-block">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-slate-200 rounded-xl shadow-sm">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Nenhuma transação encontrada</p>
        <p className="text-gray-400 text-sm mt-1">Comece criando uma nova transação</p>
      </div>
    );
  }

  const getStatusColor = (status: string): string => {
    const normalizedStatus = status?.toUpperCase();
    const statusColors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      SCHEDULED: 'bg-blue-100 text-blue-800',
      OPEN: 'bg-yellow-100 text-yellow-800',
      OVERDUE: 'bg-red-100 text-red-800',
      PROCESSED: 'bg-emerald-100 text-emerald-800',
      PAID: 'bg-green-100 text-green-800',
      RECEIVED: 'bg-green-100 text-green-800',
      CANCELED: 'bg-red-100 text-red-800',
      PARTIAL: 'bg-blue-100 text-blue-800',
    };
    return statusColors[normalizedStatus] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string): string => {
    const normalizedType = type?.toUpperCase();
    const typeColors: Record<string, string> = {
      INCOME: 'text-green-600',
      REVENUE: 'text-green-600',
      EXPENSE: 'text-red-600',
      COST: 'text-red-600',
      DEDUCTION: 'text-red-600',
      TRANSFER: 'text-blue-600',
      REVERSAL: 'text-orange-600',
      FEE: 'text-red-600',
      ADJUSTMENT: 'text-purple-600',
    };
    return typeColors[normalizedType] || 'text-gray-600';
  };

  const getTypeLabel = (transaction: FinancialTransaction): string => {
    const type = transaction.transaction_type || transaction.type || '';
    const normalizedType = type.toUpperCase();
    const fallback: Record<string, string> = {
      REVENUE: 'Receita',
      EXPENSE: 'Despesa',
      COST: 'Custo',
      DEDUCTION: 'Dedução',
      TRANSFER: 'Transferência',
      REVERSAL: 'Reversão',
      FEE: 'Taxa',
      ADJUSTMENT: 'Ajuste',
    };

    return TRANSACTION_TYPE_LABELS[normalizedType as keyof typeof TRANSACTION_TYPE_LABELS] || fallback[normalizedType] || type;
  };

  const getStatusLabel = (status: string): string => {
    const normalizedStatus = status?.toUpperCase();
    const fallback: Record<string, string> = {
      PENDING: 'Pendente',
      SCHEDULED: 'Agendada',
      OPEN: 'Em aberto',
      OVERDUE: 'Vencida',
      PROCESSED: 'Processada',
      PAID: 'Paga',
      RECEIVED: 'Recebida',
      CANCELED: 'Cancelada',
      PARTIAL: 'Parcial',
    };

    return TRANSACTION_STATUS_LABELS[normalizedStatus as keyof typeof TRANSACTION_STATUS_LABELS] || fallback[normalizedStatus] || status;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const sanitizeText = (value: unknown) => String(value || '-')
    .replace(/OP�+O/gi, 'OPÇÃO')
    .replace(/�+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const getTransactionDate = (transaction: FinancialTransaction) => (
    transaction.transaction_date || transaction.competency_date || transaction.scheduled_date || transaction.due_date || transaction.created_at || ''
  );

  const isDerivedTransaction = (transaction: FinancialTransaction) => {
    const id = String(transaction.id || '');
    return id.startsWith('ar-') || id.startsWith('ap-') || id.startsWith('ft-');
  };

  const isReconciledTransaction = (transaction: FinancialTransaction) => {
    const status = String(transaction.status || '').toLowerCase();
    return transaction.is_reconciled === true || ['paid', 'received', 'processed', 'pago', 'recebido', 'quitado'].includes(status);
  };

  const isIncomeTransaction = (transaction: FinancialTransaction) => (
    transaction.transaction_type === 'INCOME' || transaction.type === 'revenue'
  );

  const getOriginLabel = (transaction: FinancialTransaction) => {
    const origin = String(transaction.origin_module || '').toLowerCase();
    if (origin === 'accounts_receivable') return 'Contas a Receber';
    if (origin === 'accounts_payable') return 'Contas a Pagar';
    return origin || 'Manual';
  };

  const selectedRows = transactions.filter((transaction) => selectedIds.has(transaction.id));
  const selectedTotal = selectedRows.reduce((sum, transaction) => {
    const amount = Number(transaction.amount || 0);
    return isIncomeTransaction(transaction) ? sum + amount : sum - amount;
  }, 0);
  const allVisibleSelected = transactions.length > 0 && transactions.every((transaction) => selectedIds.has(transaction.id));

  const toggleAllVisibleSelection = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        transactions.forEach((transaction) => next.delete(transaction.id));
      } else {
        transactions.forEach((transaction) => next.add(transaction.id));
      }
      return next;
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportSelectedCsv = () => {
    const rows = selectedRows.length ? selectedRows : transactions;
    const headers = ['Data', 'Descrição', 'Tipo', 'Valor', 'Status', 'Origem'];
    const body = rows.map((transaction) => [
      formatDate(getTransactionDate(transaction)),
      sanitizeText(transaction.description),
      getTypeLabel(transaction),
      String(transaction.amount || 0).replace('.', ','),
      getStatusLabel(String(transaction.status || '')),
      getOriginLabel(transaction),
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[headers.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `lancamentos_${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const applyBulkAction = async () => {
    if (!bulkAction) return;
    if (bulkAction === 'export') {
      exportSelectedCsv();
      return;
    }
    if (!selectedRows.length) return;

    if (bulkAction === 'delete' && !window.confirm(`Excluir ${selectedRows.length} lançamento(s) selecionado(s)?`)) return;
    if (bulkAction === 'revert' && !window.confirm(`Estornar ${selectedRows.length} lançamento(s) selecionado(s)?`)) return;

    for (const transaction of selectedRows) {
      const reconciled = isReconciledTransaction(transaction);
      const status = String(transaction.status || '').toLowerCase();
      const closed = ['canceled', 'cancelado', 'reversed', 'estornado'].includes(status);
      if (bulkAction === 'reconcile' && onReconcile && !reconciled && !closed) await onReconcile(transaction);
      if (bulkAction === 'revert' && onRevert && !closed) await onRevert(transaction);
      if (bulkAction === 'delete' && onDelete) await onDelete(transaction);
    }

    setBulkAction('');
    setSelectedIds(new Set());
  };

  const columnDefinitions = [
    { key: 'date', label: 'Data', width: 'w-[96px]', align: 'text-left' },
    { key: 'description', label: 'Descrição', width: 'w-[340px]', align: 'text-left' },
    { key: 'type', label: 'Tipo', width: 'w-[96px]', align: 'text-left' },
    { key: 'amount', label: 'Valor', width: 'w-[128px]', align: 'text-right' },
    { key: 'status', label: 'Status', width: 'w-[116px]', align: 'text-center' },
    { key: 'reconciled', label: 'Conc.', width: 'w-[78px]', align: 'text-center' },
    { key: 'origin', label: 'Origem', width: 'w-[128px]', align: 'text-left' },
  ];

  const activeColumns = columnDefinitions.filter((column) => visibleColumns[column.key] !== false);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <label className="inline-flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={allVisibleSelected}
                onChange={toggleAllVisibleSelection}
                disabled={!transactions.length}
              />
              Marcar todos visíveis
            </label>
            <span className="text-slate-500">
              {selectedRows.length} selecionado{selectedRows.length === 1 ? '' : 's'}
              {selectedRows.length ? ` · ${formatCurrency(selectedTotal)}` : ''}
            </span>
            {selectedRows.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Desmarcar
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="outline">Colunas</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={(event) => {
                  event.preventDefault();
                  setVisibleColumns({ date: true, description: true, type: true, amount: true, status: true, reconciled: true, origin: false });
                }}>
                  Restaurar padrão
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {columnDefinitions.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.key}
                    checked={visibleColumns[column.key] !== false}
                    onCheckedChange={(checked) => setVisibleColumns((current) => ({ ...current, [column.key]: Boolean(checked) }))}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <select
              className="h-9 min-w-[190px] rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
              value={bulkAction}
              onChange={(event) => setBulkAction(event.target.value)}
              aria-label="Ação selecionada para lançamentos"
              title="Ação selecionada"
            >
              <option value="">Ação selecionada</option>
              <option value="reconcile" disabled={!selectedRows.length}>Conciliar selecionados</option>
              <option value="revert" disabled={!selectedRows.length}>Estornar selecionados</option>
              <option value="delete" disabled={!selectedRows.length}>Excluir selecionados</option>
              <option value="export">Exportar visíveis/selecionados</option>
            </select>
            <Button type="button" size="sm" onClick={applyBulkAction} disabled={!bulkAction || (bulkAction !== 'export' && !selectedRows.length)}>
              Aplicar
            </Button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[1040px] table-fixed text-sm">
            <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="w-10 px-3 py-3 text-left font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisibleSelection}
                    disabled={!transactions.length}
                    aria-label="Selecionar todos os lançamentos visíveis"
                  />
                </th>
                {activeColumns.map((column) => (
                  <th key={column.key} className={`${column.width} px-3 py-3 font-semibold text-slate-700 ${column.align}`}>
                    {column.label}
                  </th>
                ))}
                <th className="w-[136px] border-l border-slate-200 bg-slate-50 px-2 py-3 text-right font-semibold text-slate-700">Ações</th>
              </tr>
            </thead>
            <tbody>
            {transactions.map((transaction, idx) => {
              const isDerived = isDerivedTransaction(transaction);
              const status = String(transaction.status || '').toLowerCase();
              const isClosed = ['canceled', 'cancelado', 'reversed', 'estornado'].includes(status);
              const canEdit = Boolean(onEdit) && !isClosed && !['paid', 'received', 'processed', 'pago', 'recebido', 'quitado'].includes(status);
              const canDelete = Boolean(onDelete);
              const reconciled = isReconciledTransaction(transaction);
              const canRevert = Boolean(onRevert) && !isClosed;
              const canReconcile = Boolean(onReconcile) && !reconciled && !isClosed;
              const rowActions = [
                {
                  key: 'edit',
                  label: canEdit ? (isDerived ? 'Editar no módulo de origem' : 'Editar') : 'Edição indisponível',
                  icon: Pencil,
                  disabled: !canEdit,
                  onClick: () => onEdit?.(transaction),
                  className: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:text-slate-300',
                },
                {
                  key: 'revert',
                  label: canRevert ? 'Estornar' : 'Estorno indisponível',
                  icon: RotateCcw,
                  disabled: !canRevert,
                  onClick: () => setRevertConfirm(transaction),
                  className: 'text-orange-600 hover:text-orange-700 hover:bg-orange-50 disabled:text-slate-300',
                },
                {
                  key: 'reconcile',
                  label: reconciled ? 'Já conciliado' : canReconcile ? 'Conciliar' : 'Conciliação indisponível',
                  icon: CheckCircle,
                  disabled: !canReconcile,
                  onClick: () => onReconcile?.(transaction),
                  className: 'text-green-600 hover:text-green-700 hover:bg-green-50 disabled:text-slate-300',
                },
                {
                  key: 'delete',
                  label: 'Excluir',
                  icon: Trash2,
                  disabled: !canDelete || deletingId === transaction.id,
                  onClick: () => setDeleteConfirm(transaction),
                  className: 'text-red-600 hover:text-red-700 hover:bg-red-50 disabled:text-slate-300',
                },
              ];

              const renderColumn = (key: string) => {
                if (key === 'date') {
                  return <span className="font-mono text-xs text-slate-700">{formatDate(getTransactionDate(transaction))}</span>;
                }
                if (key === 'description') {
                  return (
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-medium leading-5 text-slate-950" title={sanitizeText(transaction.description)}>
                        {sanitizeText(transaction.description)}
                      </p>
                      {(transaction.document_number || transaction.reference_document) && (
                        <p className="mt-1 truncate text-xs text-slate-500">{sanitizeText(transaction.document_number || transaction.reference_document)}</p>
                      )}
                    </div>
                  );
                }
                if (key === 'type') {
                  return <span className={`block truncate text-sm font-semibold ${getTypeColor(transaction.transaction_type || transaction.type)}`} title={getTypeLabel(transaction)}>{getTypeLabel(transaction)}</span>;
                }
                if (key === 'amount') {
                  return (
                    <span className={`whitespace-nowrap font-semibold ${isIncomeTransaction(transaction) ? 'text-green-600' : 'text-red-600'}`}>
                      {isIncomeTransaction(transaction) ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </span>
                  );
                }
                if (key === 'status') {
                  return <span className={`inline-flex max-w-full rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(transaction.status)}`} title={getStatusLabel(transaction.status)}><span className="truncate">{getStatusLabel(transaction.status)}</span></span>;
                }
                if (key === 'reconciled') {
                  return isReconciledTransaction(transaction)
                    ? <CheckCircle className="mx-auto h-5 w-5 text-green-600" />
                    : <AlertCircle className="mx-auto h-5 w-5 text-yellow-600" />;
                }
                if (key === 'origin') {
                  return <span className="block truncate text-sm text-slate-600" title={getOriginLabel(transaction)}>{getOriginLabel(transaction)}</span>;
                }
                return null;
              };

              return (
              <tr
                key={transaction.id}
                className={`border-b border-slate-100 transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                } hover:bg-blue-50/50`}
              >
                <td className="w-10 px-3 py-3 align-middle">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={selectedIds.has(transaction.id)}
                    onChange={() => toggleSelection(transaction.id)}
                    aria-label={`Selecionar ${sanitizeText(transaction.description)}`}
                  />
                </td>
                {activeColumns.map((column) => (
                  <td key={column.key} className={`${column.width} px-3 py-3 align-middle ${column.align}`}>
                    {renderColumn(column.key)}
                  </td>
                ))}
                <td className="border-l border-slate-100 bg-inherit px-2 py-3 align-middle">
                  <div className="flex w-[120px] items-center justify-end gap-0.5 whitespace-nowrap">
                    <TooltipProvider>
                      {rowActions.map((action) => {
                        const Icon = action.icon;
                        return (
                        <Tooltip key={action.key}>
                          <TooltipTrigger asChild>
                            <span className="inline-flex" title={action.label}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={action.onClick}
                              disabled={action.disabled}
                              className={`h-7 w-7 p-0 ${action.className}`}
                              aria-label={action.label}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{action.label}</TooltipContent>
                        </Tooltip>
                        );
                      })}
                    </TooltipProvider>
                  </div>
                </td>
              </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Transação?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3 text-sm">
            <p className="font-medium">{deleteConfirm?.description}</p>
            <p className="text-gray-500">{deleteConfirm?.document_number}</p>
          </div>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteConfirm && onDelete) {
                  await onDelete(deleteConfirm);
                  setDeleteConfirm(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Deletar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revert Confirmation */}
      <AlertDialog open={!!revertConfirm} onOpenChange={(open) => !open && setRevertConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estornar Transação?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja estornar esta transação? Uma nova transação de reversão será criada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3 text-sm">
            <p className="font-medium">{revertConfirm?.description}</p>
            <p className="text-gray-500">{formatCurrency(revertConfirm?.amount || 0)}</p>
          </div>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (revertConfirm && onRevert) {
                  await onRevert(revertConfirm);
                  setRevertConfirm(null);
                }
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Estornar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

TransactionsTable.displayName = 'TransactionsTable';
