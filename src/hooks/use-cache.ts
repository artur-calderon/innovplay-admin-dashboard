import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

// Configurações de cache
const CACHE_CONFIG = {
  evaluations: { ttl: 5 * 60 * 1000 }, // 5 minutos
  stats: { ttl: 2 * 60 * 1000 }, // 2 minutos
  questions: { ttl: 10 * 60 * 1000 }, // 10 minutos
  subjects: { ttl: 30 * 60 * 1000 }, // 30 minutos
  schools: { ttl: 30 * 60 * 1000 }, // 30 minutos
  default: { ttl: 5 * 60 * 1000 } // 5 minutos
};

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheHookOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheKey?: string;
  onError?: (error: any) => void;
}

// Cache global em memória
const cache = new Map<string, CacheItem<any>>();

// Utilitário para gerar chave de cache
const generateCacheKey = (url: string, params?: any): string => {
  const paramString = params ? JSON.stringify(params) : '';
  return `${url}${paramString}`;
};

// Verificar se o cache está válido
const isCacheValid = (cacheItem: CacheItem<any>): boolean => {
  return Date.now() - cacheItem.timestamp < cacheItem.ttl;
};

// Determinar TTL baseado na URL
const getTTL = (url: string): number => {
  if (url.includes('stats')) return CACHE_CONFIG.stats.ttl;
  if (url.includes('evaluations') || url.includes('test')) return CACHE_CONFIG.evaluations.ttl;
  if (url.includes('questions')) return CACHE_CONFIG.questions.ttl;
  if (url.includes('subjects')) return CACHE_CONFIG.subjects.ttl;
  if (url.includes('schools')) return CACHE_CONFIG.schools.ttl;
  return CACHE_CONFIG.default.ttl;
};

// Hook principal de cache
export function useCache<T>(
  url: string,
  options: CacheHookOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const {
    enabled = true,
    staleTime = 0,
    cacheKey: customCacheKey,
    onError
  } = options;

  // Função para fazer fetch dos dados
  const fetchData = useCallback(async (params?: any, forceRefresh = false) => {
    if (!enabled) return;

    const cacheKey = customCacheKey || generateCacheKey(url, params);
    const cachedItem = cache.get(cacheKey);

    // Se há cache válido e não é refresh forçado, usar cache
    if (cachedItem && isCacheValid(cachedItem) && !forceRefresh) {
      setData(cachedItem.data);
      setIsLoading(false);
      setError(null);
      return cachedItem.data;
    }

    // Se há cache, mas está stale, mostrar dados stale enquanto revalida
    if (cachedItem && !forceRefresh) {
      setData(cachedItem.data);
      setIsValidating(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await api.get(url, params ? { params } : undefined);
      const newData = response.data;

      // Atualizar cache
      const ttl = getTTL(url);
      cache.set(cacheKey, {
        data: newData,
        timestamp: Date.now(),
        ttl
      });

      setData(newData);
      setError(null);
      return newData;
    } catch (err: any) {
      setError(err);
      if (onError) onError(err);

      // Se há cache, mesmo expirado, usar em caso de erro
      if (cachedItem) {
        setData(cachedItem.data);
      }

      throw err;
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  }, [url, enabled, customCacheKey, onError]);

  // Função para invalidar cache
  const invalidateCache = useCallback((specificKey?: string) => {
    if (specificKey) {
      cache.delete(specificKey);
    } else {
      const cacheKey = customCacheKey || generateCacheKey(url);
      cache.delete(cacheKey);
    }
  }, [url, customCacheKey]);

  // Função para refetch
  const refetch = useCallback((params?: any) => {
    return fetchData(params, true);
  }, [fetchData]);

  // Função para mutate (atualizar cache diretamente)
  const mutate = useCallback((newData: T, params?: any) => {
    const cacheKey = customCacheKey || generateCacheKey(url, params);
    const ttl = getTTL(url);

    cache.set(cacheKey, {
      data: newData,
      timestamp: Date.now(),
      ttl
    });

    setData(newData);
  }, [url, customCacheKey]);

  // Fetch inicial
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [fetchData, enabled]);

  return {
    data,
    isLoading,
    error,
    isValidating,
    refetch,
    mutate,
    invalidateCache
  };
}

// Hook específico para avaliações com paginação
export function useEvaluations(params: {
  page?: number;
  per_page?: number;
  status?: string;
  subject_id?: string;
  type?: string;
  model?: string;
  grade_id?: string;
} = {}) {
  const cacheKey = `evaluations-${JSON.stringify(params)}`;

  const result = useCache<{
    data: any[];
    pagination: {
      page: number;
      per_page: number;
      total: number;
      pages: number;
      has_next: boolean;
      has_prev: boolean;
      next_num: number | null;
      prev_num: number | null;
    };
  }>('/test/', {
    cacheKey,
    staleTime: 2 * 60 * 1000 // 2 minutos
  });

  // Garantir que sempre retornamos um objeto válido
  return {
    ...result,
    data: result.data || {
      data: [],
      pagination: {
        page: 1,
        per_page: 10,
        total: 0,
        pages: 1,
        has_next: false,
        has_prev: false,
        next_num: null,
        prev_num: null
      }
    }
  };
}



// Hook específico para estatísticas
export function useEvaluationStats() {
  return useCache<{
    total: number;
    this_month: number;
    total_questions: number;
    average_questions: number;
    virtual_evaluations: number;
    physical_evaluations: number;
    by_type: Record<string, number>;
    by_model: Record<string, number>;
    by_status: Record<string, number>;
    last_sync: string;
  }>('/evaluations/stats', {
    staleTime: 60 * 1000 // 1 minuto
  });
}

// Hook para limpeza de cache
export function useCacheManager() {
  const clearCache = useCallback(() => {
    cache.clear();
  }, []);

  const clearCacheByPattern = useCallback((pattern: string) => {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  }, []);

  const getCacheSize = useCallback(() => {
    return cache.size;
  }, []);

  const getCacheInfo = useCallback(() => {
    const info = Array.from(cache.entries()).map(([key, item]) => ({
      key,
      size: JSON.stringify(item.data).length,
      age: Date.now() - item.timestamp,
      ttl: item.ttl,
      isValid: isCacheValid(item)
    }));
    return info;
  }, []);

  return {
    clearCache,
    clearCacheByPattern,
    getCacheSize,
    getCacheInfo
  };
} 