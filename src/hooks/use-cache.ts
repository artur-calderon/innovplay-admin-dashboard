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

  // Função para invalidar cache por padrão (para avaliações)
  const invalidateCacheByPattern = useCallback((pattern: string) => {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  }, []);

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
    invalidateCache,
    invalidateCacheByPattern
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

  // ✅ MELHORADO: Função para invalidar cache de avaliações de forma mais abrangente
  const invalidateEvaluationsCache = useCallback(() => {
    console.log("🗑️ Invalidando cache de avaliações...");
    
    // Invalidar cache específico desta instância
    result.invalidateCache();
    
    // Invalidar todas as chaves de cache relacionadas a avaliações
    result.invalidateCacheByPattern('evaluations-');
    
    // ✅ NOVO: Invalidar também cache de estatísticas que podem ser afetadas
    result.invalidateCacheByPattern('evaluation-stats');
    result.invalidateCacheByPattern('/evaluations/stats');
    
    console.log("✅ Cache de avaliações invalidado com sucesso");
  }, [result]);

  // ✅ NOVO: Função para forçar refresh imediato
  const forceRefresh = useCallback(async () => {
    console.log("🔄 Forçando refresh de avaliações...");
    
    try {
      // Invalidar cache primeiro
      invalidateEvaluationsCache();
      
      // Aguardar um pouco para garantir que o cache foi limpo
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Fazer refetch
      const newData = await result.refetch();
      
      console.log("✅ Refresh forçado concluído");
      return newData;
    } catch (error) {
      console.error("❌ Erro no refresh forçado:", error);
      throw error;
    }
  }, [invalidateEvaluationsCache, result]);

  // ✅ NOVO: Função para invalidar cache após operações CRUD
  const invalidateAfterCRUD = useCallback(async () => {
    console.log("🔄 Invalidando cache após operação CRUD...");
    
    try {
      // Invalidar cache de avaliações
      invalidateEvaluationsCache();
      
      // Aguardar um pouco para garantir que o cache foi limpo
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Fazer refetch para garantir dados atualizados
      await result.refetch();
      
      console.log("✅ Cache invalidado e dados atualizados após CRUD");
    } catch (error) {
      console.error("❌ Erro ao invalidar cache após CRUD:", error);
    }
  }, [invalidateEvaluationsCache, result]);

  // Garantir que sempre retornamos um objeto válido
  return {
    ...result,
    invalidateEvaluationsCache,
    forceRefresh,
    invalidateAfterCRUD,
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

// ✅ NOVO: Hook personalizado para gerenciar atualizações de avaliações
export function useEvaluationsManager() {
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [isUpdating, setIsUpdating] = useState(false);

  // Função para forçar atualização de todas as instâncias de avaliações
  const forceUpdateAllEvaluations = useCallback(async () => {
    console.log("🔄 Forçando atualização de todas as avaliações...");
    
    setIsUpdating(true);
    try {
      // Invalidar todas as chaves de cache relacionadas a avaliações
      for (const key of cache.keys()) {
        if (key.includes('evaluations-') || key.includes('/test/')) {
          cache.delete(key);
        }
      }
      
      // Invalidar cache de estatísticas
      for (const key of cache.keys()) {
        if (key.includes('evaluation-stats') || key.includes('/evaluations/stats')) {
          cache.delete(key);
        }
      }
      
      // Atualizar timestamp
      setLastUpdate(Date.now());
      
      console.log("✅ Cache de avaliações limpo com sucesso");
    } catch (error) {
      console.error("❌ Erro ao limpar cache de avaliações:", error);
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Função para atualizar após operações CRUD
  const updateAfterCRUD = useCallback(async () => {
    console.log("🔄 Atualizando após operação CRUD...");
    
    setIsUpdating(true);
    try {
      await forceUpdateAllEvaluations();
      
      // Aguardar um pouco para garantir que o cache foi limpo
      await new Promise(resolve => setTimeout(resolve, 250));
      
      console.log("✅ Atualização após CRUD concluída");
    } catch (error) {
      console.error("❌ Erro na atualização após CRUD:", error);
    } finally {
      setIsUpdating(false);
    }
  }, [forceUpdateAllEvaluations]);

  return {
    lastUpdate,
    isUpdating,
    forceUpdateAllEvaluations,
    updateAfterCRUD
  };
}

// Hook específico para estatísticas de avaliações
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

// ===== NOVOS HOOKS PARA ENDPOINTS DE DASHBOARD =====

// Hook para métricas gerais do dashboard
export function useDashboardStats() {
  return useCache<{
    total_evaluations: number;
    active_evaluations: number;
    completed_evaluations: number;
    total_students: number;
    average_completion_rate: number;
    pending_evaluations: number;
    this_month_evaluations: number;
  }>('/dashboard/stats', {
    staleTime: 2 * 60 * 1000 // 2 minutos
  });
}

// Hook para estatísticas ampliadas do dashboard
export function useComprehensiveDashboardStats() {
  return useCache<{
    evaluations: {
      total: number;
      by_status: Record<string, number>;
      by_type: Record<string, number>;
      by_subject: Record<string, number>;
    };
    students: {
      total: number;
      active: number;
      by_grade: Record<string, number>;
    };
    schools: {
      total: number;
      with_evaluations: number;
      by_municipality: Record<string, number>;
    };
    performance: {
      average_score: number;
      average_proficiency: number;
      completion_rate: number;
    };
  }>('/dashboard/comprehensive-stats', {
    staleTime: 5 * 60 * 1000 // 5 minutos
  });
}

// Hook para estatísticas globais de resultados
export function useGlobalResultsStats() {
  return useCache<{
    total_avaliacoes_concluidas: number;
    total_avaliacoes_pendentes: number;
    media_nota_global: number;
    total_alunos: number;
    tempo_medio_execucao: number;
    disciplina_melhor_desempenho: {
      nome: string;
      media_nota: number;
      media_proficiencia: number;
    };
  }>('/evaluation-results/stats', {
    staleTime: 3 * 60 * 1000 // 3 minutos
  });
}

// Hook para estatísticas de status das avaliações (para gráficos de pizza/donut)
export function useEvaluationStatusStats() {
  return useCache<{
    total_evaluations: number;
    by_status: Array<{
      status: string;
      count: number;
      percentage: number;
      label: string;
    }>;
    last_updated: string;
  }>('/evaluation-results/avaliacoes/estatisticas-status', {
    staleTime: 2 * 60 * 1000 // 2 minutos
  });
}

// Hook para lista de avaliações com agregados (para tabelas/rankings)
export function useEvaluationsListWithAggregates(
  page: number = 1,
  perPage: number = 10,
  filters?: {
    status?: string;
    subject?: string;
    municipality?: string;
    school?: string;
  }
) {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });

  if (filters?.status) params.append('status', filters.status);
  if (filters?.subject) params.append('subject', filters.subject);
  if (filters?.municipality) params.append('municipality', filters.municipality);
  if (filters?.school) params.append('school', filters.school);

  return useCache<{
    data: Array<{
      id: string;
      titulo: string;
      disciplina: string;
      municipio: string;
      escola: string;
      status: string;
      total_alunos: number;
      alunos_concluidos: number;
      media_nota: number;
      ultima_atualizacao: string;
      progress_percentage: number;
    }>;
    pagination: {
      current_page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  }>(`/evaluation-results/list?${params}`, {
    staleTime: 1 * 60 * 1000, // 1 minuto
    cacheKey: `evaluations-list-${page}-${perPage}-${JSON.stringify(filters || {})}`
  });
}

// ===== HOOKS PARA OPERAÇÕES ESPECÍFICAS DE AVALIAÇÕES =====

// Hook para verificação em lote de status (operação mais pesada, cache maior)
export function useBulkEvaluationStatusCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  
  const checkAllEvaluations = useCallback(async (filters?: {
    municipio?: string;
    escola?: string;
    status?: string;
  }) => {
    setIsChecking(true);
    try {
      // Importar o serviço dinamicamente para evitar dependência circular
      const { EvaluationResultsApiService } = await import('@/services/evaluationResultsApi');
      const result = await EvaluationResultsApiService.verificarTodasAvaliacoes(filters);
      setLastCheck(new Date());
      return result;
    } catch (error) {
      console.error('Erro ao verificar todas as avaliações:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    checkAllEvaluations,
    isChecking,
    lastCheck
  };
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