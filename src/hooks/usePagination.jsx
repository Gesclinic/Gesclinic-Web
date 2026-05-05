import { useState, useMemo } from 'react';

/**
 * Hook para Paginação de Dados
 *
 * Gerencia paginação de um array de dados com interface simples.
 * Útil para listas que precisam de navegação por páginas.
 *
 * @param {Array} items - Array de itens a paginar
 * @param {number} itemsPerPage - Quantidade de itens por página (default: 20)
 * @param {number} initialPage - Página inicial (default: 1)
 *
 * @returns {Object} Objeto com paginação
 *
 * @example
 * const { items, page, totalPages, nextPage, prevPage, goToPage } =
 *   usePagination(professionals, 20);
 *
 * return (
 *   <>
 *     {items.map(item => <Card key={item.id} item={item} />)}
 *     <Pagination
 *       page={page}
 *       totalPages={totalPages}
 *       onNext={nextPage}
 *       onPrev={prevPage}
 *     />
 *   </>
 * );
 */
export function usePagination(items = [], itemsPerPage = 20, initialPage = 1) {
  const [page, setPage] = useState(Math.max(1, initialPage));

  // Calcular items paginados
  const paginated = useMemo(() => {
    if (!items || items.length === 0) {
      return [];
    }
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return items.slice(start, end);
  }, [items, page, itemsPerPage]);

  // Calcular total de páginas
  const totalPages = useMemo(
    () => Math.ceil((items?.length || 0) / itemsPerPage),
    [items, itemsPerPage],
  );

  // Funções de navegação
  const goToPage = (newPage) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages));
    setPage(validPage);
  };

  const nextPage = () => {
    setPage((p) => Math.min(p + 1, totalPages));
  };

  const prevPage = () => {
    setPage((p) => Math.max(p - 1, 1));
  };

  const goToFirst = () => setPage(1);
  const goToLast = () => setPage(totalPages);

  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // Informações de índice
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, items?.length || 0);
  const itemsCount = items?.length || 0;

  return {
    // Items da página atual
    items: paginated,

    // Navegação
    page,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,

    // Status
    hasNextPage,
    hasPrevPage,
    itemsCount,
    itemsPerPage,

    // Informações úteis
    startIndex,
    endIndex,
    pageStartIndex: startIndex + 1,
    pageEndIndex: endIndex,
    isFirstPage: page === 1,
    isLastPage: page === totalPages,
  };
}

/**
 * Hook para Paginação com Tamanho Dinâmico
 *
 * Permite trocar o itemsPerPage dinamicamente.
 *
 * @param {Array} items
 * @param {number} initialItemsPerPage
 * @returns {Object} { ...usePagination + setItemsPerPage }
 *
 * @example
 * const { items, page, setItemsPerPage } = useDynamicPagination(data, 20);
 *
 * return (
 *   <>
 *     <select onChange={(e) => setItemsPerPage(Number(e.target.value))}>
 *       <option value={10}>10 por página</option>
 *       <option value={20}>20 por página</option>
 *       <option value={50}>50 por página</option>
 *     </select>
 *     {items.map(item => <Card key={item.id} item={item} />)}
 *   </>
 * );
 */
export function useDynamicPagination(items = [], initialItemsPerPage = 20) {
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const pagination = usePagination(items, itemsPerPage, 1);

  // Resetar para página 1 quando trocar itemsPerPage
  const handleChangeItemsPerPage = (newValue) => {
    setItemsPerPage(newValue);
    pagination.goToFirst();
  };

  return {
    ...pagination,
    itemsPerPage,
    setItemsPerPage: handleChangeItemsPerPage,
  };
}

/**
 * Componente: Controle de Paginação
 *
 * Componente UI pronto para usar com usePagination.
 *
 * @example
 * const { items, page, totalPages, nextPage, prevPage, goToPage } =
 *   usePagination(data, 20);
 *
 * return (
 *   <>
 *     <List items={items} />
 *     <PaginationControl
 *       page={page}
 *       totalPages={totalPages}
 *       onPrevious={prevPage}
 *       onNext={nextPage}
 *       onGoToPage={goToPage}
 *     />
 *   </>
 * );
 */
export function PaginationControl({
  page,
  totalPages,
  onPrevious,
  onNext,
  onGoToPage,
  showJumpTo = true,
  className = '',
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <button
        onClick={onPrevious}
        disabled={page === 1}
        className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
      >
        ← Anterior
      </button>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          Página <strong>{page}</strong> de <strong>{totalPages}</strong>
        </span>
      </div>

      {showJumpTo && totalPages > 1 && (
        <input
          type="number"
          min="1"
          max={totalPages}
          value={page}
          onChange={(e) => onGoToPage(Number(e.target.value))}
          className="w-16 px-2 py-1 border rounded text-center"
          title={`Ir para página (1-${totalPages})`}
        />
      )}

      <button
        onClick={onNext}
        disabled={page === totalPages}
        className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
      >
        Próxima →
      </button>
    </div>
  );
}

/**
 * Hook para Paginação Lazy (carrega mais quando scrola)
 *
 * Ao invés de dividir em páginas, carrega mais items quando
 * o usuário scrola até o final (infinite scroll).
 *
 * @param {Array} items
 * @param {number} itemsPerLoad - Quantos items carregar por vez
 * @returns {Object} { displayedItems, hasMore, loadMore, reset }
 *
 * @example
 * const { displayedItems, hasMore, loadMore } = useLazyPagination(data, 20);
 *
 * const observerTarget = useRef(null);
 * useEffect(() => {
 *   const observer = new IntersectionObserver(entries => {
 *     if (entries[0].isIntersecting && hasMore) loadMore();
 *   });
 *   observer.observe(observerTarget.current);
 *   return () => observer.disconnect();
 * }, [hasMore, loadMore]);
 *
 * return (
 *   <>
 *     {displayedItems.map(item => <Card key={item.id} item={item} />)}
 *     {hasMore && <div ref={observerTarget}>Carregando...</div>}
 *   </>
 * );
 */
export function useLazyPagination(items = [], itemsPerLoad = 20) {
  const [displayedCount, setDisplayedCount] = useState(itemsPerLoad);

  const displayedItems = useMemo(
    () => (items || []).slice(0, displayedCount),
    [items, displayedCount],
  );

  const hasMore = displayedCount < (items?.length || 0);

  const loadMore = () => {
    setDisplayedCount((prev) => prev + itemsPerLoad);
  };

  const reset = () => {
    setDisplayedCount(itemsPerLoad);
  };

  return {
    displayedItems,
    displayedCount,
    totalCount: items?.length || 0,
    hasMore,
    loadMore,
    reset,
  };
}

export default usePagination;
