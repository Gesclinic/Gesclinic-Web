/**
 * 💰 Payables Table Component
 * Enterprise table with advanced features
 */

import React, { useMemo, useState } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Badge,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Download,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/modules/financeiro/utils/calculations';
import { Payable, PayableStatus } from '../types';
import { cn } from '@/lib/utils';

interface PayablesTableProps {
  payables: Payable[];
  isLoading?: boolean;
  onView?: (payable: Payable) => void;
  onEdit?: (payable: Payable) => void;
  onDelete?: (payable: Payable) => void;
  onPay?: (payable: Payable) => void;
  onSelectChange?: (selected: string[]) => void;
  className?: string;
}

const STATUS_COLORS: Record<PayableStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  OPEN: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  OVERDUE: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  PARTIAL: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: <DollarSign className="w-4 h-4" />,
  },
  PAID: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  CANCELED: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  NEGOTIATED: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    icon: <AlertCircle className="w-4 h-4" />,
  },
};

const STATUS_LABELS: Record<PayableStatus, string> = {
  OPEN: 'Aberto',
  OVERDUE: 'Vencido',
  PARTIAL: 'Parcial',
  PAID: 'Pago',
  CANCELED: 'Cancelado',
  NEGOTIATED: 'Negociado',
};

export const PayablesTable = React.memo<PayablesTableProps>(
  ({
    payables,
    isLoading,
    onView,
    onEdit,
    onDelete,
    onPay,
    onSelectChange,
    className,
  }) => {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [deleteItem, setDeleteItem] = useState<Payable | null>(null);

    const handleSelectAll = (checked: boolean) => {
      if (checked) {
        const newSelected = new Set(payables.map((p) => p.id));
        setSelected(newSelected);
        onSelectChange?.(Array.from(newSelected));
      } else {
        setSelected(new Set());
        onSelectChange?.([]);
      }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
      const newSelected = new Set(selected);
      if (checked) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      setSelected(newSelected);
      onSelectChange?.(Array.from(newSelected));
    };

    const isAllSelected = payables.length > 0 && selected.size === payables.length;
    const isSomeSelected = selected.size > 0 && selected.size < payables.length;

    const overdueDays = useMemo(() => {
      const today = new Date();
      return (payable: Payable) => {
        const dueDate = new Date(payable.due_date);
        if (dueDate >= today) return null;
        const diff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
      };
    }, []);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando contas a pagar...</div>
        </div>
      );
    }

    if (payables.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
          <div className="text-gray-500">Nenhuma conta a pagar encontrada</div>
        </div>
      );
    }

    return (
      <>
        <div className={cn('border rounded-lg overflow-hidden', className)}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      indeterminate={isSomeSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map((payable) => {
                  const isSelected = selected.has(payable.id);
                  const days = overdueDays(payable);
                  const isOverdue = days !== null && payable.status !== PayableStatus.PAID;

                  return (
                    <TableRow
                      key={payable.id}
                      className={cn(
                        'hover:bg-gray-50 transition-colors',
                        isSelected && 'bg-blue-50',
                        isOverdue && 'bg-red-50'
                      )}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(payable.id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>

                      {/* Due Date */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {formatDate(payable.due_date)}
                          </span>
                          {isOverdue && (
                            <span className="text-xs text-red-600 font-semibold">
                              {days} dias vencido
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Supplier */}
                      <TableCell className="font-medium max-w-40 truncate">
                        {payable.supplier_name}
                      </TableCell>

                      {/* Description */}
                      <TableCell className="max-w-48 truncate text-gray-600">
                        {payable.description}
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        {payable.category ? (
                          <Badge variant="outline" className="text-xs">
                            {payable.category}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payable.net_amount)}
                      </TableCell>

                      {/* Balance */}
                      <TableCell className="text-right">
                        <span
                          className={
                            payable.balance_amount > 0 ? 'text-red-600 font-semibold' : 'text-green-600'
                          }
                        >
                          {formatCurrency(payable.balance_amount)}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                              STATUS_COLORS[payable.status].bg,
                              STATUS_COLORS[payable.status].text
                            )}
                          >
                            {STATUS_COLORS[payable.status].icon}
                            {STATUS_LABELS[payable.status]}
                          </div>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView?.(payable)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            {payable.status !== PayableStatus.PAID && (
                              <DropdownMenuItem onClick={() => onEdit?.(payable)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {payable.balance_amount > 0 && (
                              <DropdownMenuItem onClick={() => onPay?.(payable)}>
                                <DollarSign className="w-4 h-4 mr-2" />
                                Registrar Pagamento
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setDeleteItem(payable)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
          <AlertDialogContent>
            <AlertDialogTitle>Excluir Conta a Pagar?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta a pagar de{' '}
              <strong>{deleteItem?.supplier_name}</strong> no valor de{' '}
              <strong>{formatCurrency(deleteItem?.net_amount || 0)}</strong>? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteItem) {
                    onDelete?.(deleteItem);
                    setDeleteItem(null);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Excluir
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }
);

PayablesTable.displayName = 'PayablesTable';
