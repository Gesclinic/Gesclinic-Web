/**
 * Financial Accounts Table Component
 * Displays list of financial accounts with actions
 */

import React from 'react';
import { Pencil, Trash2, Check, Star, Eye, FileText } from 'lucide-react';
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
import { FinancialAccount, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS } from '../types';
import { ReconciliationBadge, AccountStatusBadge } from './StatusBadges';
import { TableSkeleton } from './SkeletonLoader';

interface FinancialAccountsTableProps {
  accounts: FinancialAccount[];
  loading?: boolean;
  onEdit?: (account: FinancialAccount) => void;
  onDeactivate?: (account: FinancialAccount) => Promise<void>;
  onSetDefault?: (account: FinancialAccount) => Promise<void>;
  deactivatingId?: string | null;
}

export const FinancialAccountsTable = React.memo<FinancialAccountsTableProps>(({
  accounts,
  loading = false,
  onEdit,
  onDeactivate,
  onSetDefault,
  deactivatingId = null,
}) => {
  const [deleteConfirm, setDeleteConfirm] = React.useState<FinancialAccount | null>(null);

  const handleDeactivateClick = (account: FinancialAccount) => {
    setDeleteConfirm(account);
  };

  const handleConfirmDeactivate = async () => {
    if (deleteConfirm && onDeactivate) {
      try {
        await onDeactivate(deleteConfirm);
        setDeleteConfirm(null);
      } catch (error) {
        console.error('Error deactivating account:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <TableSkeleton />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Nenhuma conta financeira cadastrada</p>
        <p className="text-gray-400 text-sm mt-1">Comece criando uma nova conta</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
              <TableHead className="text-center text-gray-700 font-semibold w-16">Código</TableHead>
              <TableHead className="text-gray-700 font-semibold">Banco</TableHead>
              <TableHead className="text-gray-700 font-semibold">Conta</TableHead>
              <TableHead className="text-gray-700 font-semibold">Tipo</TableHead>
              <TableHead className="text-right text-gray-700 font-semibold">Saldo Atual</TableHead>
              <TableHead className="text-right text-gray-700 font-semibold">Saldo Previsto</TableHead>
              <TableHead className="text-center text-gray-700 font-semibold">Conciliação</TableHead>
              <TableHead className="text-center text-gray-700 font-semibold">Status</TableHead>
              <TableHead className="text-center text-gray-700 font-semibold">Padrão</TableHead>
              <TableHead className="text-right text-gray-700 font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account, idx) => (
              <TableRow
                key={account.id}
                className={`border-b border-slate-100 transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                } hover:bg-blue-50/50 cursor-pointer`}
              >
                {/* Bank Code */}
                <TableCell className="text-center font-mono font-bold text-sm">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">{account.bank_code || '—'}</span>
                </TableCell>

                {/* Bank Info */}
                <TableCell>
                  <p className="font-medium text-gray-900">{account.bank_name}</p>
                </TableCell>

                {/* Account Info */}
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">{account.account_name}</p>
                    <p className="text-xs text-gray-500">
                      {account.agency && `Ag: ${account.agency} `}
                      | CC: {account.account_number?.slice(-4) || 'N/A'}
                    </p>
                  </div>
                </TableCell>

                {/* Type */}
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{ACCOUNT_TYPE_ICONS[account.account_type]}</span>
                    <span className="text-sm text-gray-700">{ACCOUNT_TYPE_LABELS[account.account_type]}</span>
                  </span>
                </TableCell>

                {/* Current Balance */}
                <TableCell className="text-right">
                  <p className="font-semibold text-gray-900">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: account.currency,
                    }).format(account.current_balance)}
                  </p>
                </TableCell>

                {/* Forecast Balance */}
                <TableCell className="text-right">
                  <p className="font-semibold text-cyan-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: account.currency,
                    }).format(account.balance_pending || 0)}
                  </p>
                </TableCell>

                {/* Reconciliation Status */}
                <TableCell className="text-center">
                  <ReconciliationBadge status={account.reconciliation_status as 'conciliado' | 'pendente' | 'divergente' | null} />
                </TableCell>

                {/* Active Status */}
                <TableCell className="text-center">
                  <AccountStatusBadge isActive={account.is_active} />
                </TableCell>

                {/* Default Account */}
                <TableCell className="text-center">
                  {account.is_default ? (
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 mx-auto" />
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <TooltipProvider>
                      {!account.is_default && onSetDefault && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSetDefault(account)}
                              className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                            >
                              <Star className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Definir como padrão</TooltipContent>
                        </Tooltip>
                      )}

                      {onEdit && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(account)}
                              disabled={loading || deactivatingId === account.id}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                      )}

                      {onDeactivate && account.is_active && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivateClick(account)}
                              disabled={loading || deactivatingId === account.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Desativar</TooltipContent>
                        </Tooltip>
                      )}
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a desativar a conta <strong>{deleteConfirm?.account_name}</strong> (
              {deleteConfirm?.bank_name}). Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeactivate}
              className="bg-red-600 hover:bg-red-700"
            >
              Desativar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
