import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook Universal para Cache de Dados
 * 
 * Implementa cache em memória com TTL (Time To Live) automático.
 * Reduz chamadas desnecessárias à API e melhora performance.
 * 
 * @param {Object} options
 * @param {string} options.key - Chave única para o cache
 * @param {Function} options.fetcher - Função assíncrona que busca os dados
 * @param {number} options.ttl - Tempo em ms que o cache é válido (default: 5 min)
 * @param {boolean} options.enabled - Se deve fazer cache (default: true)
 * 
 * @returns {Object} { data, loading, error, refresh, isCached }
 * 
 * @example
 * const { data: professionals, loading, error, refresh } = useDataCache({
 *   key: `professionals_${clinicId}`,
 *   fetcher: () => professionalsApi.listProfessionals(clinicId),
 *   ttl: 5 * 60 * 1000, // 5 minutos
 * });
 */
export function useDataCache({
  key,
  fetcher,
  ttl = 5 * 60 * 1000, // 5 minutos por padrão
  enabled = true,
} = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const cacheRef = useRef(new Map());

  // Função para obter dados do cache
  const getFromCache = useCallback(() => {
    if (!enabled || !key) return null;

    const cached = cacheRef.current.get(key);
    if (!cached) return null;

    const { data: cachedData, timestamp } = cached;
    const now = Date.now();

    // Verificar se cache ainda é válido
    if (now - timestamp < ttl) {
      return cachedData;
    }

    // Cache expirado, remover
    cacheRef.current.delete(key);
    return null;
  }, [key, ttl, enabled]);

  // Função para salvar no cache
  const saveToCache = useCallback(
    (newData) => {
      if (!enabled || !key) return;

      cacheRef.current.set(key, {
        data: newData,
        timestamp: Date.now(),
      });
    },
    [key, enabled]
  );

  // Função para buscar dados (com cache)
  const refresh = useCallback(async () => {
    if (!fetcher) {
      console.warn('useDataCache: fetcher não fornecido');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      saveToCache(result);
      setIsCached(false);
    } catch (err) {
      console.error(`useDataCache [${key}]: Erro ao buscar dados`, err);
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fetcher, key, saveToCache]);

  // Efeito para carregar dados na montagem
  useEffect(() => {
    if (!enabled || !fetcher || !key) {
      setLoading(false);
      return;
    }

    // Tentar obter do cache primeiro
    const cachedData = getFromCache();
    if (cachedData !== null) {
      setData(cachedData);
      setIsCached(true);
      setLoading(false);
      return;
    }

    // Dados não estão em cache, buscar
    refresh();
  }, [key, fetcher, enabled, refresh, getFromCache]);

  // Função para limpar cache manualmente
  const clearCache = useCallback(() => {
    if (key) {
      cacheRef.current.delete(key);
    }
  }, [key]);

  // Função para limpar todo o cache
  const clearAllCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    data,
    loading,
    error,
    refresh,
    clearCache,
    clearAllCache,
    isCached,
  };
}

/**
 * Hook para Cache com Invalidação Automática
 * 
 * Semelhante a useDataCache, mas com suporte a invalidação
 * de outros hooks que compartilham a mesma chave.
 * 
 * @param {Object} options - Mesmas opções de useDataCache
 * @returns {Object} { data, loading, error, refresh, invalidate }
 * 
 * @example
 * // Hook A (dependência principal)
 * const { data: professionals, invalidate } = useCachedData({
 *   key: `professionals_${clinicId}`,
 *   fetcher: () => professionalsApi.listProfessionals(clinicId),
 * });
 * 
 * // Hook B (dependência)
 * const { data, refresh } = useCachedData({
 *   key: `professionals_${clinicId}`,
 *   fetcher: () => professionalsApi.listProfessionals(clinicId),
 * });
 * 
 * // Na função de editar:
 * const handleUpdate = async (id, updates) => {
 *   await api.updateProfessional(id, updates);
 *   invalidate(`professionals_${clinicId}`); // Invalida todos os hooks
 * };
 */
export function useCachedData(options = {}) {
  const cache = useDataCache(options);
  const { key } = options;

  const invalidate = useCallback((cacheKey = key) => {
    if (cacheKey) {
      cache.clearCache();
      // Refetch dados após invalidação
      cache.refresh();
    }
  }, [key, cache]);

  return {
    ...cache,
    invalidate,
  };
}

/**
 * Gerenciador Global de Cache (Singleton)
 * 
 * Permite compartilhar cache entre múltiplos hooks
 * e invalidar dados quando necessário.
 * 
 * @example
 * // Na edição de um profissional:
 * import { CacheManager } from '@/hooks/useDataCache';
 * 
 * const handleUpdate = async (id, updates) => {
 *   await api.updateProfessional(id, updates);
 *   CacheManager.invalidate(`professionals_${clinicId}`);
 * };
 */
export class CacheManager {
  static #cacheMap = new Map();
  static #listeners = new Map();

  /**
   * Obter dados do cache
   * @param {string} key
   * @returns {any|null}
   */
  static get(key) {
    const cached = this.#cacheMap.get(key);
    if (!cached) return null;

    const { data, timestamp, ttl } = cached;
    const now = Date.now();

    if (now - timestamp < ttl) {
      return data;
    }

    this.#cacheMap.delete(key);
    return null;
  }

  /**
   * Salvar dados no cache
   * @param {string} key
   * @param {any} data
   * @param {number} ttl - Tempo em ms (default: 5 min)
   */
  static set(key, data, ttl = 5 * 60 * 1000) {
    this.#cacheMap.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Invalidar cache de uma chave
   * @param {string} key
   */
  static invalidate(key) {
    this.#cacheMap.delete(key);

    // Notificar listeners
    const listeners = this.#listeners.get(key) || [];
    listeners.forEach((callback) => callback());
  }

  /**
   * Invalidar todo o cache
   */
  static clear() {
    this.#cacheMap.clear();
    this.#listeners.clear();
  }

  /**
   * Registrar listener para invalidação
   * @param {string} key
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  static subscribe(key, callback) {
    if (!this.#listeners.has(key)) {
      this.#listeners.set(key, []);
    }

    this.#listeners.get(key).push(callback);

    // Retornar função para desinscrever
    return () => {
      const listeners = this.#listeners.get(key);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Debug: ver estado do cache
   */
  static debug() {
    console.table(Array.from(this.#cacheMap.entries()).map(([key, value]) => ({
      key,
      size: JSON.stringify(value.data).length,
      age: Date.now() - value.timestamp,
      ttl: value.ttl,
    })));
  }
}

export default useDataCache;
