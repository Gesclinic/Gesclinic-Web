import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * PaginationControls - Controles de paginação reutilizáveis (FASE 13)
 * Exibe botões de navegação e informações de página
 */
export function PaginationControls({ 
  page, 
  pageSize, 
  totalItems = null,
  onPrevPage, 
  onNextPage, 
  hasNextPage = true,
  loading = false 
}) {
  const totalPages = totalItems ? Math.ceil(totalItems / pageSize) : null;
  const canGoBack = page > 1;
  const canGoNext = hasNextPage || (totalPages && page < totalPages);

  return (
    <div className="flex items-center justify-between mt-4 px-4 py-3 bg-gray-50 border-t border-gray-200">
      <div className="text-sm text-gray-600">
        Página <span className="font-semibold">{page}</span>
        {totalPages && <span className="font-semibold"> de {totalPages}</span>}
        {totalItems && <span> • {totalItems} itens</span>}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevPage}
          disabled={!canGoBack || loading}
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!canGoNext || loading}
        >
          Próximo
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * usePaginationState - Hook para gerenciar estado de paginação
 */
export function usePaginationState(initialPage = 1, pageSize = 10) {
  const [page, setPage] = React.useState(initialPage);

  const nextPage = React.useCallback(() => {
    setPage(p => p + 1);
  }, []);

  const prevPage = React.useCallback(() => {
    setPage(p => Math.max(1, p - 1));
  }, []);

  const reset = React.useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  return {
    page,
    setPage,
    nextPage,
    prevPage,
    reset,
    offset: (page - 1) * pageSize
  };
}
