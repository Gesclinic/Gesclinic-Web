import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para gerenciar selects dinâmicos e dependentes
 * Exemplo: Profissional → Serviços, Convênio → Planos
 */
export function useDynamicSelect(initialOptions = []) {
  const [options, setOptions] = useState(initialOptions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadOptions = useCallback(async (fetchFn) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFn();
      setOptions(data || []);
    } catch (err) {
      setError(err.message);
      console.error('Erro ao carregar opções:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearOptions = useCallback(() => {
    setOptions([]);
  }, []);

  return {
    options,
    loading,
    error,
    loadOptions,
    clearOptions,
    setOptions,
  };
}

/**
 * Hook para gerenciar cascata de selects
 * Exemplo: quando profissional muda → carrega serviços
 */
export function useDependentSelect(dependencies = {}) {
  const [cascade, setCascade] = useState({});
  const [loading, setLoading] = useState({});

  const loadCascade = useCallback(
    async (key, dependencyKey, fetchFn) => {
      const dependencyValue = dependencies[dependencyKey];

      // Limpar cascata se dependência estiver vazia
      if (!dependencyValue) {
        setCascade((prev) => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
        return;
      }

      setLoading((prev) => ({ ...prev, [key]: true }));
      try {
        const data = await fetchFn(dependencyValue);
        setCascade((prev) => ({ ...prev, [key]: data || [] }));
      } catch (error) {
        console.error(`Erro ao carregar ${key}:`, error);
        setCascade((prev) => ({ ...prev, [key]: [] }));
      } finally {
        setLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [dependencies],
  );

  const getCascadeOptions = useCallback(
    (key) => {
      return cascade[key] || [];
    },
    [cascade],
  );

  const isCascadeLoading = useCallback(
    (key) => {
      return loading[key] || false;
    },
    [loading],
  );

  return {
    cascade,
    loading,
    loadCascade,
    getCascadeOptions,
    isCascadeLoading,
    setCascade,
  };
}

/**
 * Hook para selects com search/filtro
 */
export function useSearchableSelect(items = []) {
  const [filtered, setFiltered] = useState(items);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFiltered(items);
    } else {
      const term = searchTerm.toLowerCase();
      const results = items.filter(
        (item) =>
          item.label.toLowerCase().includes(term) || item.value.toLowerCase().includes(term),
      );
      setFiltered(results);
    }
  }, [searchTerm, items]);

  const toggle = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const isSelected = (id) => selectedIds.includes(id);

  const clearSearch = () => setSearchTerm('');

  return {
    filtered,
    searchTerm,
    setSearchTerm,
    selectedIds,
    setSelectedIds,
    toggle,
    isSelected,
    clearSearch,
    hasResults: filtered.length > 0,
  };
}

/**
 * Hook para múltiplas seleções com validação
 */
export function useMultiSelect(initialValues = []) {
  const [selected, setSelected] = useState(initialValues);
  const [maxItems, setMaxItems] = useState(null);
  const [required, setRequired] = useState(false);

  const add = (item) => {
    if (maxItems && selected.length >= maxItems) {
      console.warn(`Máximo de ${maxItems} itens atingido`);
      return false;
    }
    if (!selected.find((s) => s.value === item.value)) {
      setSelected((prev) => [...prev, item]);
      return true;
    }
    return false;
  };

  const remove = (value) => {
    setSelected((prev) => prev.filter((s) => s.value !== value));
  };

  const toggle = (item) => {
    if (selected.find((s) => s.value === item.value)) {
      remove(item.value);
    } else {
      add(item);
    }
  };

  const clear = () => setSelected([]);

  const isSelected = (value) => selected.some((s) => s.value === value);

  const canAddMore = () => !maxItems || selected.length < maxItems;

  const validate = () => {
    if (required && selected.length === 0) {
      return { valid: false, error: 'Selecione pelo menos um item' };
    }
    return { valid: true, error: null };
  };

  return {
    selected,
    setSelected,
    add,
    remove,
    toggle,
    clear,
    isSelected,
    canAddMore,
    count: selected.length,
    validate,
    setMaxItems,
    setRequired,
  };
}

/**
 * Hook para select com cache e reuso
 */
export function useCachedSelect(cacheKey, fetchFn, { ttl = 5 * 60 * 1000 } = {}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const load = async (forceRefresh = false) => {
    // Usar cache se disponível e não expirado
    if (!forceRefresh && lastFetch && Date.now() - lastFetch < ttl) {
      const cached = localStorage.getItem(`select_cache_${cacheKey}`);
      if (cached) {
        setOptions(JSON.parse(cached));
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchFn();
      setOptions(data || []);
      setLastFetch(Date.now());
      localStorage.setItem(`select_cache_${cacheKey}`, JSON.stringify(data || []));
    } catch (err) {
      setError(err.message);
      console.error('Erro ao carregar select:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = () => {
    localStorage.removeItem(`select_cache_${cacheKey}`);
    setOptions([]);
    setLastFetch(null);
  };

  return {
    options,
    loading,
    error,
    load,
    clearCache,
    cacheAge: lastFetch ? Date.now() - lastFetch : null,
  };
}
