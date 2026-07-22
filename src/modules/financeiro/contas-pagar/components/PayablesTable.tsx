/**
 * 💰 Payables Table Component
 * Enterprise table with advanced features
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  FileText,
  ArrowDown,
  ArrowUp,
  GripVertical,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { Payable, PayableStatus } from '../types';
import { cn } from '@/lib/utils';
import { labelPaymentMethod } from '../utils/labels';

// Helper function to format dates
const formatDate = (date: string | undefined): string => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('pt-BR');
};

function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full caption-bottom text-sm', className)} {...props} />;
}

function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('[&_tr]:border-b', className)} {...props} />;
}

function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b transition-colors hover:bg-gray-50 data-[state=selected]:bg-blue-50', className)} {...props} />;
}

function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('px-4 py-3 text-left align-middle font-semibold text-slate-950 [&:has([role=checkbox])]:pr-0', className)} {...props} />;
}

function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 align-middle text-gray-700 [&:has([role=checkbox])]:pr-0', className)} {...props} />;
}

interface PayablesTableProps {
  payables: Payable[];
  isLoading?: boolean;
  onView?: (payable: Payable) => void;
  onEdit?: (payable: Payable) => void;
  onDelete?: (payable: Payable) => void;
  onPay?: (payable: Payable) => void;
  onCancel?: (payable: Payable) => void;
  onSelectChange?: (selected: string[]) => void;
  selectedIds?: string[];
  renderColumnsControl?: (control: React.ReactNode) => React.ReactNode;
  className?: string;
}

type PayableColumnKey =
  | 'dueDate'
  | 'supplier'
  | 'document'
  | 'invoice'
  | 'competency'
  | 'category'
  | 'costCenter'
  | 'chartAccount'
  | 'amount'
  | 'discount'
  | 'fees'
  | 'balance'
  | 'paymentMethod'
  | 'status'
  | 'reconciliation'
  | 'docs';

type PayableColumnOption = {
  key: PayableColumnKey;
  label: string;
  align?: 'left' | 'center' | 'right';
};

const payableColumnOptions: PayableColumnOption[] = [
  { key: 'dueDate', label: 'Vencimento', align: 'center' },
  { key: 'supplier', label: 'Fornecedor' },
  { key: 'document', label: 'Documento' },
  { key: 'invoice', label: 'NF' },
  { key: 'competency', label: 'Competência', align: 'center' },
  { key: 'category', label: 'Categoria' },
  { key: 'costCenter', label: 'Centro Custo' },
  { key: 'chartAccount', label: 'Conta Contábil' },
  { key: 'amount', label: 'Valor', align: 'right' },
  { key: 'discount', label: 'Desconto', align: 'right' },
  { key: 'fees', label: 'Multa/Juros', align: 'right' },
  { key: 'balance', label: 'Saldo', align: 'right' },
  { key: 'paymentMethod', label: 'Forma' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'reconciliation', label: 'Conciliação', align: 'center' },
  { key: 'docs', label: 'Docs', align: 'center' },
];

const defaultPayableColumnOrder = payableColumnOptions.map((column) => column.key);
const defaultPayableVisibleColumns: Record<PayableColumnKey, boolean> = payableColumnOptions.reduce(
  (acc, column) => ({ ...acc, [column.key]: true }),
  {} as Record<PayableColumnKey, boolean>,
);
const payableColumnStorageKey = 'contas_pagar_visible_columns_v1';

function normalizePayableColumnOrder(order?: string[]) {
  const validKeys = new Set(defaultPayableColumnOrder);
  const uniqueOrder = (order || []).filter((key): key is PayableColumnKey => validKeys.has(key as PayableColumnKey));
  return [...uniqueOrder, ...defaultPayableColumnOrder.filter((key) => !uniqueOrder.includes(key))];
}

function loadPayableColumnSettings() {
  if (typeof window === 'undefined') {
    return {
      visibleColumns: defaultPayableVisibleColumns,
      columnOrder: defaultPayableColumnOrder,
    };
  }

  try {
    const raw = window.localStorage.getItem(payableColumnStorageKey);
    if (!raw) {
      return {
        visibleColumns: defaultPayableVisibleColumns,
        columnOrder: defaultPayableColumnOrder,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      visibleColumns: { ...defaultPayableVisibleColumns, ...(parsed.visibleColumns || {}) },
      columnOrder: normalizePayableColumnOrder(parsed.columnOrder),
    };
  } catch {
    return {
      visibleColumns: defaultPayableVisibleColumns,
      columnOrder: defaultPayableColumnOrder,
    };
  }
}

const STATUS_COLORS: Record<PayableStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  OPEN: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  APPROVING: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  APPROVED: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    icon: <CheckCircle2 className="w-4 h-4" />,
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
  BLOCKED: {
    bg: 'bg-slate-200',
    text: 'text-slate-900',
    icon: <AlertCircle className="w-4 h-4" />,
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
  REVERSED: {
    bg: 'bg-gray-200',
    text: 'text-gray-900',
    icon: <AlertCircle className="w-4 h-4" />,
  },
};

const STATUS_LABELS: Record<PayableStatus, string> = {
  OPEN: 'Aberto',
  APPROVING: 'Aprovando',
  APPROVED: 'Aprovado',
  OVERDUE: 'Vencido',
  PARTIAL: 'Parcial',
  PAID: 'Pago',
  BLOCKED: 'Bloqueado',
  CANCELED: 'Cancelado',
  NEGOTIATED: 'Negociado',
  REVERSED: 'Estornado',
};

function getDocumentExtraction(payable: Payable) {
  const extraction = payable.metadata?.document_extraction;
  if (!extraction) return null;
  const documentType = String(extraction.documentType || 'documento').toUpperCase();
  const confidence = extraction.confidence || 'manual';
  return {
    label: `${documentType} ${confidence}`,
    title: [
      `Leitura ${confidence}`,
      extraction.fields?.supplier_name ? `Fornecedor: ${extraction.fields.supplier_name}` : null,
      extraction.fields?.amount ? `Valor: ${formatCurrency(Number(extraction.fields.amount || 0))}` : null,
      Array.isArray(extraction.warnings) && extraction.warnings[0] ? extraction.warnings[0] : null,
    ].filter(Boolean).join(' | '),
  };
}

function getReconciliationState(payable: Payable) {
  const reconciliation = payable.metadata?.enterprise?.reconciliation || {};
  const status = String(reconciliation.status || '').toUpperCase();

  if (status === 'MATCHED' || reconciliation.bank_statement_id || reconciliation.bank_transaction_id) {
    return {
      label: 'Conciliado',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      title: reconciliation.payment_date ? `Conciliado em ${formatDate(reconciliation.payment_date)}` : 'Conciliação bancária vinculada',
    };
  }

  if (status === 'AWAITING_REVIEW') {
    return {
      label: 'Revisão',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      title: 'Conciliação aguardando aprovação',
    };
  }

  if (status === 'REJECTED') {
    return {
      label: 'Rejeitada',
      className: 'border-red-200 bg-red-50 text-red-700',
      title: reconciliation.rejection_reason || 'Conciliação rejeitada',
    };
  }

  return {
    label: 'Pendente',
    className: 'border-slate-200 bg-slate-50 text-slate-500',
    title: 'Sem conciliação bancária vinculada',
  };
}

export const PayablesTable = React.memo<PayablesTableProps>(
  ({
    payables,
    isLoading,
    onView,
    onEdit,
    onDelete,
    onPay,
    onCancel,
    onSelectChange,
    selectedIds,
    renderColumnsControl,
    className,
  }) => {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [deleteItem, setDeleteItem] = useState<Payable | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const initialColumnSettings = useMemo(() => loadPayableColumnSettings(), []);
    const [visibleColumns, setVisibleColumns] = useState<Record<PayableColumnKey, boolean>>(initialColumnSettings.visibleColumns);
    const [columnOrder, setColumnOrder] = useState<PayableColumnKey[]>(initialColumnSettings.columnOrder);
    const [draggingColumnKey, setDraggingColumnKey] = useState<PayableColumnKey | null>(null);

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

    useEffect(() => {
      if (selectedIds) {
        setSelected(new Set(selectedIds));
      }
    }, [selectedIds]);

    const isAllSelected = payables.length > 0 && selected.size === payables.length;
    const isSomeSelected = selected.size > 0 && selected.size < payables.length;
    const selectAllRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      if (selectAllRef.current) {
        selectAllRef.current.indeterminate = isSomeSelected;
      }
    }, [isSomeSelected]);

    useEffect(() => {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(payableColumnStorageKey, JSON.stringify({ visibleColumns, columnOrder }));
    }, [columnOrder, visibleColumns]);

    const orderedColumnOptions = useMemo(() => {
      const optionByKey = new Map(payableColumnOptions.map((column) => [column.key, column]));
      return normalizePayableColumnOrder(columnOrder)
        .map((key) => optionByKey.get(key))
        .filter(Boolean) as PayableColumnOption[];
    }, [columnOrder]);

    const orderedVisibleColumns = useMemo(
      () => orderedColumnOptions.filter((column) => visibleColumns[column.key]),
      [orderedColumnOptions, visibleColumns],
    );

    const isColumnVisible = (key: PayableColumnKey) => Boolean(visibleColumns[key]);

    const resetColumnLayout = () => {
      setVisibleColumns(defaultPayableVisibleColumns);
      setColumnOrder(defaultPayableColumnOrder);
    };

    const moveColumn = (key: PayableColumnKey, direction: -1 | 1) => {
      setColumnOrder((current) => {
        const next = normalizePayableColumnOrder(current);
        const index = next.indexOf(key);
        const targetIndex = index + direction;
        if (index < 0 || targetIndex < 0 || targetIndex >= next.length) return next;
        const [removed] = next.splice(index, 1);
        next.splice(targetIndex, 0, removed);
        return next;
      });
    };

    const moveColumnToPosition = (sourceKey: PayableColumnKey | string, targetKey: PayableColumnKey, insertAfter: boolean) => {
      if (!sourceKey || sourceKey === targetKey) return;
      setColumnOrder((current) => {
        const next = normalizePayableColumnOrder(current);
        const sourceIndex = next.indexOf(sourceKey as PayableColumnKey);
        const targetIndex = next.indexOf(targetKey);
        if (sourceIndex < 0 || targetIndex < 0) return next;
        const [removed] = next.splice(sourceIndex, 1);
        const adjustedTargetIndex = next.indexOf(targetKey);
        next.splice(adjustedTargetIndex + (insertAfter ? 1 : 0), 0, removed);
        return next;
      });
    };

    const overdueDays = useMemo(() => {
      const today = new Date();
      return (payable: Payable) => {
        const dueDate = new Date(payable.due_date);
        if (dueDate >= today) return null;
        const diff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
      };
    }, []);

    const columnsControl = (
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
              setVisibleColumns({
                ...defaultPayableVisibleColumns,
                category: false,
                costCenter: false,
                chartAccount: false,
                discount: false,
                fees: false,
                docs: false,
              });
              setColumnOrder(['dueDate', 'supplier', 'invoice', 'document', 'amount', 'balance', 'paymentMethod', 'status', ...defaultPayableColumnOrder.filter((key) => !['dueDate', 'supplier', 'invoice', 'document', 'amount', 'balance', 'paymentMethod', 'status'].includes(key))]);
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
                const insertAfter = event.clientY > rect.top + rect.height / 2;
                moveColumnToPosition(sourceKey, column.key, insertAfter);
                setDraggingColumnKey(null);
              }}
              className={cn('flex cursor-grab items-center gap-1 px-1 py-0.5 active:cursor-grabbing', draggingColumnKey === column.key && 'opacity-50')}
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
    );

    return (
      <>
        {renderColumnsControl?.(columnsControl)}
        <div className={cn('overflow-hidden', className)}>
          <div className="max-h-[70vh] overflow-auto">
            <Table className="min-w-[1500px]">
              <TableHeader className="sticky top-0 z-10 border-b bg-gray-100">
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      title="Selecionar todas as contas"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </TableHead>
                  {orderedVisibleColumns.map((column) => (
                    <TableHead
                      key={column.key}
                      className={column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : undefined}
                    >
                      {column.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={orderedVisibleColumns.length + 2} className="h-40 text-center text-slate-500">
                      Carregando contas a pagar...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && payables.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={orderedVisibleColumns.length + 2} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <AlertCircle className="mb-3 h-10 w-10 text-slate-300" />
                        <span>Nenhuma conta a pagar encontrada</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && payables.map((payable) => {
                  const isSelected = selected.has(payable.id);
                  const days = overdueDays(payable);
                  const isOverdue = days !== null && payable.status !== PayableStatus.PAID && Number(payable.balance_amount || 0) > 0;
                  const documentExtraction = getDocumentExtraction(payable);
                  const reconciliationState = getReconciliationState(payable);
                  const documentUrl = payable.attachment_url || payable.invoice_pdf_url || payable.invoice_xml_url;
                  const columnCells: Record<PayableColumnKey, React.ReactNode> = {
                    dueDate: (
                      <TableCell key="dueDate" className="text-center">
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
                    ),
                    supplier: (
                      <TableCell key="supplier" className="font-medium max-w-40 truncate">
                        {payable.supplier_name}
                      </TableCell>
                    ),
                    document: (
                      <TableCell key="document" className="max-w-40 truncate text-gray-600">
                        <div className="flex flex-col">
                          <span>{payable.document_number || payable.supplier_document || '-'}</span>
                          <span className="text-xs text-gray-400 truncate">{payable.description}</span>
                        </div>
                      </TableCell>
                    ),
                    invoice: (
                      <TableCell key="invoice" className="max-w-32 truncate text-gray-600">
                        {payable.invoice_number ? `NF ${payable.invoice_number}${payable.invoice_series ? ` / ${payable.invoice_series}` : ''}` : '-'}
                      </TableCell>
                    ),
                    competency: (
                      <TableCell key="competency" className="text-center whitespace-nowrap">
                        {formatDate(payable.competency_date)}
                      </TableCell>
                    ),
                    category: (
                      <TableCell key="category">
                        {payable.category ? (
                          <Badge variant="outline" className="text-xs">
                            {payable.category}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                    ),
                    costCenter: <TableCell key="costCenter" className="max-w-36 truncate text-gray-600">{payable.cost_center_id || '-'}</TableCell>,
                    chartAccount: <TableCell key="chartAccount" className="max-w-36 truncate text-gray-600">{payable.chart_account_id || '-'}</TableCell>,
                    amount: <TableCell key="amount" className="text-right font-medium">{formatCurrency(payable.net_amount)}</TableCell>,
                    discount: <TableCell key="discount" className="text-right text-emerald-700">{formatCurrency(payable.discount_amount || 0)}</TableCell>,
                    fees: <TableCell key="fees" className="text-right text-orange-700">{formatCurrency(Number(payable.fine_amount || 0) + Number(payable.interest_amount || 0))}</TableCell>,
                    balance: (
                      <TableCell key="balance" className="text-right">
                        <span className={payable.balance_amount > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                          {formatCurrency(payable.balance_amount)}
                        </span>
                      </TableCell>
                    ),
                    paymentMethod: <TableCell key="paymentMethod"><span className="text-sm text-gray-600">{labelPaymentMethod(payable.payment_method) || '-'}</span></TableCell>,
                    status: (
                      <TableCell key="status" className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[payable.status].bg, STATUS_COLORS[payable.status].text)}>
                            {STATUS_COLORS[payable.status].icon}
                            {STATUS_LABELS[payable.status]}
                          </div>
                        </div>
                      </TableCell>
                    ),
                    reconciliation: (
                      <TableCell key="reconciliation" className="text-center">
                        <span
                          className={cn('inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium', reconciliationState.className)}
                          title={reconciliationState.title}
                        >
                          {reconciliationState.label}
                        </span>
                      </TableCell>
                    ),
                    docs: (
                      <TableCell key="docs" className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          {documentUrl && (
                            <a
                              href={documentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex w-fit items-center gap-1 rounded border border-blue-200 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                              title="Abrir documento anexado"
                            >
                              <FileText className="h-3 w-3" />
                              Doc
                            </a>
                          )}
                          {documentExtraction && (
                            <span
                              className="inline-flex w-fit items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                              title={documentExtraction.title}
                            >
                              <FileText className="h-3 w-3" />
                              {documentExtraction.label}
                            </span>
                          )}
                          {!documentUrl && !documentExtraction && <span className="text-xs text-gray-400">-</span>}
                        </div>
                      </TableCell>
                    ),
                  };

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
                          title={`Selecionar conta ${payable.supplier_name || payable.description}`}
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(payable.id, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </TableCell>

                      {orderedVisibleColumns.map((column) => columnCells[column.key])}

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
                            {payable.status !== PayableStatus.PAID && payable.status !== PayableStatus.CANCELED && (
                              <DropdownMenuItem onClick={() => onCancel?.(payable)} className="text-red-600">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                Cancelar
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
                onClick={async (event) => {
                  event.preventDefault();
                  if (deleteItem) {
                    try {
                      setIsDeleting(true);
                      await onDelete?.(deleteItem);
                      setDeleteItem(null);
                    } finally {
                      setIsDeleting(false);
                    }
                  }
                }}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }
);

PayablesTable.displayName = 'PayablesTable';
