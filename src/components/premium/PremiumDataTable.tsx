/**
 * 🎨 Componente Premium: Data Table Enterprise
 * 
 * Nível Linear/Stripe/Vercel
 * Features:
 * - Sticky header
 * - Sticky footer com ações
 * - Hover effects modernos
 * - Status badges coloridas
 * - Filtros rápidos
 * - Paginação premium
 * - Density toggle
 */

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, MoreHorizontal, Search, Filter, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PremiumDataTableColumn<T> {
  key: keyof T;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
}

export interface PremiumDataTableProps<T> {
  columns: PremiumDataTableColumn<T>[];
  data: T[];
  rowKey: keyof T;
  onRowClick?: (row: T) => void;
  actions?: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: (row: T) => void;
    color?: 'primary' | 'secondary' | 'danger';
  }>;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  density?: 'compact' | 'comfortable' | 'spacious';
  onDensityChange?: (density: 'compact' | 'comfortable' | 'spacious') => void;
  emptyState?: React.ReactNode;
  className?: string;
}

const densityConfig = {
  compact: { row: 'h-8 text-xs px-3', header: 'h-10 px-3 text-xs', padding: 'py-2' },
  comfortable: { row: 'h-12 text-sm px-4', header: 'h-12 px-4 text-sm', padding: 'py-3' },
  spacious: { row: 'h-16 text-base px-6', header: 'h-14 px-6 text-base', padding: 'py-4' },
};

/**
 * Data Table Premium
 */
export const PremiumDataTable = React.forwardRef<HTMLDivElement, PremiumDataTableProps<any>>(
  (
    {
      columns,
      data,
      rowKey,
      onRowClick,
      actions,
      toolbar,
      footer,
      loading = false,
      pagination,
      density = 'comfortable',
      onDensityChange,
      emptyState,
      className,
    },
    ref
  ) => {
    const [sortBy, setSortBy] = useState<keyof any | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [selectedRows, setSelectedRows] = useState<Set<any>>(new Set());
    const [expandedRow, setExpandedRow] = useState<any | null>(null);

    const denseConfig = densityConfig[density];

    // Sorting
    const sortedData = useMemo(() => {
      if (!sortBy) return data;
      return [...data].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }, [data, sortBy, sortOrder]);

    const handleSort = (key: keyof any) => {
      if (sortBy === key) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(key);
        setSortOrder('asc');
      }
    };

    const toggleRowSelection = (row: any) => {
      const newSelected = new Set(selectedRows);
      const rowId = row[rowKey];
      if (newSelected.has(rowId)) {
        newSelected.delete(rowId);
      } else {
        newSelected.add(rowId);
      }
      setSelectedRows(newSelected);
    };

    const toggleAllSelection = () => {
      if (selectedRows.size === sortedData.length) {
        setSelectedRows(new Set());
      } else {
        setSelectedRows(new Set(sortedData.map(row => row[rowKey])));
      }
    };

    if (loading) {
      return (
        <div className="p-8 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando dados...</p>
        </div>
      );
    }

    if (sortedData.length === 0) {
      return (
        emptyState || (
          <div className="p-12 text-center">
            <Search className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Nenhum registro encontrado</p>
          </div>
        )
      );
    }

    return (
      <div ref={ref} className={cn('flex flex-col h-full bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-gray-800', className)}>
        {/* Toolbar */}
        {toolbar && <div className="border-b border-gray-200 dark:border-gray-800 p-4">{toolbar}</div>}

        {/* Table Container (Scrollable) */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            {/* Header */}
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-900">
              <tr className="border-b-2 border-gray-200 dark:border-gray-800">
                {/* Select All Checkbox */}
                <th className={cn('w-12 bg-gray-50 dark:bg-slate-900', denseConfig.header)}>
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos os registros"
                    title="Selecionar todos os registros"
                    checked={selectedRows.size === sortedData.length && sortedData.length > 0}
                    onChange={toggleAllSelection}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                </th>

                {/* Column Headers */}
                {columns.map(col => (
                  <th
                    key={String(col.key)}
                    className={cn(
                      denseConfig.header,
                      'text-gray-700 dark:text-gray-300 font-semibold uppercase tracking-wide',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors'
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                    width={col.width}
                  >
                    <div className="flex items-center gap-2 justify-between">
                      <span>{col.header}</span>
                      {col.sortable && sortBy === col.key && (
                        <div className="text-blue-600">
                          {sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      )}
                    </div>
                  </th>
                ))}

                {/* Actions Header */}
                {actions && <th className={cn(denseConfig.header, 'w-12 text-right')}>Ações</th>}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {sortedData.map((row, idx) => {
                const isSelected = selectedRows.has(row[rowKey]);
                const isExpanded = expandedRow === row[rowKey];

                return (
                  <React.Fragment key={String(row[rowKey])}>
                    <tr
                      className={cn(
                        'border-b border-gray-100 dark:border-gray-800 transition-all duration-200 hover:bg-blue-50 dark:hover:bg-slate-800/50',
                        isSelected && 'bg-blue-100 dark:bg-blue-900/30',
                        onRowClick && 'cursor-pointer'
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {/* Checkbox */}
                      <td className={cn(denseConfig.row, 'w-12 font-medium text-gray-900 dark:text-white text-center')}>
                        <input
                          type="checkbox"
                          aria-label={`Selecionar registro ${idx + 1}`}
                          title={`Selecionar registro ${idx + 1}`}
                          checked={isSelected}
                          onChange={() => toggleRowSelection(row)}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                      </td>

                      {/* Data Cells */}
                      {columns.map(col => (
                        <td
                          key={String(col.key)}
                          className={cn(
                            denseConfig.row,
                            'font-medium text-gray-900 dark:text-white',
                            col.align === 'right' && 'text-right',
                            col.align === 'center' && 'text-center'
                          )}
                          width={col.width}
                        >
                          {col.render ? col.render(row[col.key], row) : row[col.key]}
                        </td>
                      ))}

                      {/* Actions Dropdown */}
                      {actions && (
                        <td className={cn(denseConfig.row, 'w-12 text-right')}>
                          <button
                            type="button"
                            aria-label={`Abrir ações do registro ${idx + 1}`}
                            title={`Abrir ações do registro ${idx + 1}`}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <MoreHorizontal size={18} className="text-gray-600 dark:text-gray-400" />
                          </button>
                        </td>
                      )}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer: Pagination + Density */}
        <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            {selectedRows.size > 0 && (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedRows.size} selecionado(s)
              </span>
            )}
            {onDensityChange && (
              <select
                aria-label="Densidade da tabela"
                title="Densidade da tabela"
                value={density}
                onChange={e => onDensityChange(e.target.value as any)}
                className="text-sm px-3 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              >
                <option value="compact">Compacto</option>
                <option value="comfortable">Confortável</option>
                <option value="spacious">Espaçoso</option>
              </select>
            )}
          </div>

          {pagination && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Página {pagination.page} de {Math.ceil(pagination.total / pagination.pageSize)} ({pagination.total} registros)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page === 1}
                  onClick={() => pagination.onPageChange(pagination.page - 1)}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                  onClick={() => pagination.onPageChange(pagination.page + 1)}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}

          {footer && <div>{footer}</div>}
        </div>
      </div>
    );
  }
);

PremiumDataTable.displayName = 'PremiumDataTable';

export default PremiumDataTable;
