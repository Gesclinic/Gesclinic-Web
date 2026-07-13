/**
 * Financial Accounts Table Component
 * Displays list of financial accounts with actions
 */

import React from 'react';
import { Pencil, Trash2, Star, FileText } from 'lucide-react';
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

  const formatCurrency = (value: number | null | undefined, currency = 'BRL') => (
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(Number(value || 0))
  );

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const dateValue = String(value).split('T')[0];
    const [year, month, day] = dateValue.split('-');
    return year && month && day ? `${day}/${month}/${year}` : '—';
  };

  const getAccountTypeLabel = (account: FinancialAccount) => ACCOUNT_TYPE_LABELS[account.account_type] || 'Conta financeira';

  const getAccountTypeIcon = (account: FinancialAccount) => ACCOUNT_TYPE_ICONS[account.account_type] || '🏦';

  const getBankDisplayName = (account: FinancialAccount) => {
    if (account.bank_name && account.bank_name !== 'Conta financeira') {
      return account.bank_name;
    }
    if (account.account_type === 'CASH') {
      return 'Caixa interno';
    }
    if (account.account_type === 'DIGITAL_WALLET') {
      return 'Carteira digital';
    }
    if (account.account_type === 'CREDIT_CARD') {
      return 'Cartão / operadora';
    }
    return 'Banco não informado';
  };

  const getAccountDisplayName = (account: FinancialAccount) => (
    account.account_name || account.bank_name || getAccountTypeLabel(account)
  );

  const getAccountNumberDisplay = (account: FinancialAccount) => {
    const parts = [];
    if (account.agency) {
      parts.push(`Ag: ${account.agency}`);
    }
    if (account.account_number) {
      parts.push(`Conta: ${account.account_number}`);
    }
    return parts.length > 0 ? parts.join(' | ') : 'Dados bancários não informados';
  };

  const handleDeactivateClick = (account: FinancialAccount) => {
    setDeleteConfirm(account);
  };

  const handleConfirmDeactivate = async () => {
    if (deleteConfirm && onDeactivate) {
      try {
        await onDeactivate(deleteConfirm);
        setDeleteConfirm(null);
      } catch (error) {
        console.error('Error deleting account:', error);
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
        <div className="max-h-[70vh] overflow-auto">
        <Table className="min-w-[1540px] table-fixed">
          <TableHeader>
            <TableRow className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 hover:bg-slate-50">
              <TableHead className="w-[90px] text-center text-gray-700 font-semibold">Código</TableHead>
              <TableHead className="w-[190px] text-gray-700 font-semibold">Banco</TableHead>
              <TableHead className="w-[240px] text-gray-700 font-semibold">Conta</TableHead>
              <TableHead className="w-[170px] text-gray-700 font-semibold">Tipo</TableHead>
              <TableHead className="w-[150px] text-right text-gray-700 font-semibold">Saldo Inicial</TableHead>
              <TableHead className="w-[150px] text-right text-gray-700 font-semibold">Saldo Atual</TableHead>
              <TableHead className="w-[160px] text-right text-gray-700 font-semibold">Saldo Conciliado</TableHead>
              <TableHead className="w-[150px] text-right text-gray-700 font-semibold">Saldo Pendente</TableHead>
              <TableHead className="w-[140px] text-center text-gray-700 font-semibold">Última Mov.</TableHead>
              <TableHead className="w-[150px] text-center text-gray-700 font-semibold">Última Concil.</TableHead>
              <TableHead className="w-[150px] text-center text-gray-700 font-semibold">Conciliação</TableHead>
              <TableHead className="w-[110px] text-center text-gray-700 font-semibold">Fluxo</TableHead>
              <TableHead className="w-[120px] text-center text-gray-700 font-semibold">Status</TableHead>
              <TableHead className="w-[90px] text-center text-gray-700 font-semibold">Padrão</TableHead>
              <TableHead className="sticky right-0 z-30 w-[130px] border-l border-slate-200 bg-slate-50 text-right text-gray-700 font-semibold">Ações</TableHead>
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
                  {account.bank_code ? (
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">{account.bank_code}</span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">Não informado</span>
                  )}
                </TableCell>

                {/* Bank Info */}
                <TableCell>
                  <p className="truncate font-medium text-gray-900" title={getBankDisplayName(account)}>{getBankDisplayName(account)}</p>
                  <p className="text-xs text-gray-500">Moeda: {account.currency || 'BRL'}</p>
                </TableCell>

                {/* Account Info */}
                <TableCell>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900" title={getAccountDisplayName(account)}>{getAccountDisplayName(account)}</p>
                    <p className="text-xs text-gray-500">{getAccountNumberDisplay(account)}</p>
                    {account.pix_key && <p className="truncate text-xs text-gray-500" title={account.pix_key}>Pix: {account.pix_key}</p>}
                    {(account.account_chart_name || account.account_chart_code) && (
                      <p className="truncate text-xs text-gray-500" title={account.account_chart_name || account.account_chart_code}>
                        Plano: {account.account_chart_name || account.account_chart_code}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* Type */}
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{getAccountTypeIcon(account)}</span>
                    <span className="text-sm text-gray-700">{getAccountTypeLabel(account)}</span>
                  </span>
                </TableCell>

                {/* Initial Balance */}
                <TableCell className="text-right">
                  <p className="font-semibold text-slate-700">
                    {formatCurrency(account.initial_balance, account.currency)}
                  </p>
                  <p className="text-xs text-gray-500">Base: {formatDate(account.balance_date)}</p>
                </TableCell>

                {/* Current Balance */}
                <TableCell className="text-right">
                  <p className={`font-semibold ${Number(account.current_balance || 0) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatCurrency(account.current_balance, account.currency)}
                  </p>
                </TableCell>

                {/* Reconciled Balance */}
                <TableCell className="text-right">
                  <p className="font-semibold text-green-700">
                    {formatCurrency(account.balance_reconciled, account.currency)}
                  </p>
                </TableCell>

                {/* Pending Balance */}
                <TableCell className="text-right">
                  <p className="font-semibold text-cyan-600">
                    {formatCurrency(account.balance_pending, account.currency)}
                  </p>
                </TableCell>

                {/* Last Movement */}
                <TableCell className="text-center text-sm text-gray-700">
                  {formatDate(account.last_movement_at)}
                </TableCell>

                {/* Last Reconciliation */}
                <TableCell className="text-center text-sm text-gray-700">
                  {formatDate(account.last_reconciliation_at)}
                </TableCell>

                {/* Reconciliation Status */}
                <TableCell className="text-center">
                  <ReconciliationBadge status={account.reconciliation_status as 'conciliado' | 'pendente' | 'divergente' | null} />
                </TableCell>

                {/* Cashflow */}
                <TableCell className="text-center">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${account.participates_cashflow === false ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'}`}>
                    {account.participates_cashflow === false ? 'Não' : 'Sim'}
                  </span>
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
                <TableCell className="sticky right-0 z-10 border-l border-slate-100 bg-inherit">
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

                      {onDeactivate && (
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
                          <TooltipContent>Excluir</TooltipContent>
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
      </div>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ou Desativar Conta?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta <strong>{deleteConfirm?.account_name}</strong> ({deleteConfirm?.bank_name}) será excluída se não tiver nenhum vínculo de movimentação. Se houver histórico financeiro, ela será apenas desativada e poderá ser consultada no filtro de inativas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeactivate}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
