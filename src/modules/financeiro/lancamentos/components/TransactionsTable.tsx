/**
 * TransactionsTable Component
 * Exibe transações em tabela com ações
 */

import React from 'react';
import { Pencil, Trash2, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
              <TableHead className="text-gray-700 font-semibold">Data</TableHead>
              <TableHead className="text-gray-700 font-semibold">Descrição</TableHead>
              <TableHead className="text-gray-700 font-semibold">Tipo</TableHead>
              <TableHead className="text-right text-gray-700 font-semibold">Valor</TableHead>
              <TableHead className="text-center text-gray-700 font-semibold">Status</TableHead>
              <TableHead className="text-center text-gray-700 font-semibold">Conciliado</TableHead>
              <TableHead className="text-right text-gray-700 font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction, idx) => {
              const isDerived = isDerivedTransaction(transaction);
              const status = String(transaction.status || '').toLowerCase();
              const canEdit = !isDerived && status === 'pending';
              const canDelete = Boolean(onDelete);
              return (
              <TableRow
                key={transaction.id}
                className={`border-b border-slate-100 transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                } hover:bg-blue-50/50`}
              >
                {/* Data */}
                <TableCell className="font-mono text-sm">
                  {formatDate(getTransactionDate(transaction))}
                </TableCell>

                {/* Descrição */}
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    {transaction.document_number && (
                      <p className="text-xs text-gray-500">{transaction.document_number}</p>
                    )}
                  </div>
                </TableCell>

                {/* Tipo */}
                <TableCell>
                  <span className={`text-sm font-medium ${getTypeColor(transaction.transaction_type || transaction.type)}`}>
                    {getTypeLabel(transaction)}
                  </span>
                </TableCell>

                {/* Valor */}
                <TableCell className="text-right">
                  <span className={`font-semibold ${
                    transaction.transaction_type === 'INCOME' || transaction.type === 'revenue' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.transaction_type === 'INCOME' || transaction.type === 'revenue' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell className="text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                    {getStatusLabel(transaction.status)}
                  </span>
                </TableCell>

                {/* Conciliado */}
                <TableCell className="text-center">
                  {isReconciledTransaction(transaction) ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-600 mx-auto" />
                  )}
                </TableCell>

                {/* Ações */}
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <TooltipProvider>
                      {canEdit && onEdit && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(transaction)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                      )}

                      {!isDerived && onRevert && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRevertConfirm(transaction)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Estornar</TooltipContent>
                        </Tooltip>
                      )}

                      {!isDerived && !isReconciledTransaction(transaction) && onReconcile && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onReconcile(transaction)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Conciliar</TooltipContent>
                        </Tooltip>
                      )}

                      {canDelete && onDelete && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(transaction)}
                              disabled={deletingId === transaction.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Deletar</TooltipContent>
                        </Tooltip>
                      )}
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
