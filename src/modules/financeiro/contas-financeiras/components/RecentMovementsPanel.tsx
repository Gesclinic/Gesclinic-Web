/**
 * Recent Movements Panel Component
 * Displays recent account transactions with pagination and filtering
 */

import React, { useMemo, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccountMovement, MovementType } from '../types';

interface RecentMovementsPanelProps {
  movements: AccountMovement[];
  loading?: boolean;
  onMovementClick?: (movement: AccountMovement) => void;
  pageSize?: number;
}

/**
 * Memoized Recent Movements Panel Component
 */
export const RecentMovementsPanel = React.memo<RecentMovementsPanelProps>(
  ({ movements, loading = false, onMovementClick, pageSize = 10 }) => {
    const [page, setPage] = useState(0);

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    const formatDate = (dateString: string) => {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateString));
    };

    const paginatedMovements = useMemo(() => {
      const sorted = [...movements].sort((a, b) => 
        new Date(b.movement_date).getTime() - new Date(a.movement_date).getTime()
      );
      const start = page * pageSize;
      return sorted.slice(start, start + pageSize);
    }, [movements, page, pageSize]);

    const totalPages = Math.ceil(movements.length / pageSize);

    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      );
    }

    if (movements.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Nenhuma movimentação registrada</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b">
          <h3 className="font-semibold text-base text-gray-900">Movimentações Recentes</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {movements.length} movimentações
          </span>
        </div>

        {/* Movements List */}
        <div className="space-y-2">
          {paginatedMovements.map((movement) => (
            <div
              key={movement.id}
              onClick={() => onMovementClick?.(movement)}
              className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className={`p-2 rounded-full ${
                    movement.movement_type === MovementType.ENTRY
                      ? 'bg-green-100'
                      : 'bg-red-100'
                  }`}
                >
                  {movement.movement_type === MovementType.ENTRY ? (
                    <ArrowUpRight className={`w-4 h-4 text-green-600`} />
                  ) : (
                    <ArrowDownLeft className={`w-4 h-4 text-red-600`} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {movement.description}
                    </p>
                    <p
                      className={`text-sm font-semibold whitespace-nowrap ${
                        movement.movement_type === MovementType.ENTRY
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {movement.movement_type === MovementType.ENTRY ? '+' : '-'}
                      {formatCurrency(movement.amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatDate(movement.movement_date)}</span>
                    {movement.origin && (
                      <>
                        <span>•</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                          {movement.origin}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes (if available) */}
              {movement.notes && (
                <div className="mt-2 pl-11 text-xs text-gray-600 italic">
                  {movement.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <span className="text-xs text-gray-500">
              Página {page + 1} de {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

RecentMovementsPanel.displayName = 'RecentMovementsPanel';
