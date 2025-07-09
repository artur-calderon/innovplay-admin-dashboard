// ✅ Sistema de Cache Inteligente para Avaliações
interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number;
  priority: 'high' | 'medium' | 'low';
  size: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheConfig {
  maxSize: number; // em MB
  defaultTtl: number; // em ms
  compressionEnabled: boolean;
  persistToLocalStorage: boolean;
  enableMetrics: boolean;
}

class SmartCache {
  private static instance: SmartCache;
  private cache: Map<string, CacheItem> = new Map();
  private config: CacheConfig;
  private metrics: {
    hits: number;
    misses: number;
    evictions: number;
    totalSize: number;
    compressionRatio: number;
  } = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    compressionRatio: 0
  };

  private constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB
      defaultTtl: 5 * 60 * 1000, // 5 minutos
      compressionEnabled: true,
      persistToLocalStorage: true,
      enableMetrics: true,
      ...config
    };
    
    this.loadFromStorage();
    this.setupCleanupInterval();
  }

  static getInstance(config?: Partial<CacheConfig>): SmartCache {
    if (!SmartCache.instance) {
      SmartCache.instance = new SmartCache(config);
    }
    return SmartCache.instance;
  }

  // ✅ Operações principais do cache
  set(key: string, data: any, options: {
    ttl?: number;
    priority?: 'high' | 'medium' | 'low';
    persist?: boolean;
  } = {}): void {
    const now = Date.now();
    const serialized = this.serialize(data);
    const size = this.calculateSize(serialized);
    
    // Verificar se precisa fazer eviction
    this.ensureSpace(size);
    
    const item: CacheItem = {
      data: this.config.compressionEnabled ? this.compress(serialized) : serialized,
      timestamp: now,
      ttl: options.ttl || this.config.defaultTtl,
      priority: options.priority || 'medium',
      size,
      accessCount: 0,
      lastAccessed: now
    };

    this.cache.set(key, item);
    this.metrics.totalSize += size;
    
    if (options.persist !== false && this.config.persistToLocalStorage) {
      this.persistToStorage(key, item);
    }
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.metrics.misses++;
      return null;
    }

    const now = Date.now();
    
    // Verificar se expirou
    if (now - item.timestamp > item.ttl) {
      this.delete(key);
      this.metrics.misses++;
      return null;
    }

    // Atualizar estatísticas de acesso
    item.accessCount++;
    item.lastAccessed = now;
    
    this.metrics.hits++;
    
    // Descomprimir se necessário
    const rawData = this.config.compressionEnabled ? 
      this.decompress(item.data) : item.data;
    
    return this.deserialize(rawData);
  }

  // ✅ Cache específico para avaliações
  setEvaluation(evaluationId: string, data: any, options: {
    includeQuestions?: boolean;
    includeAnswers?: boolean;
    ttl?: number;
  } = {}): void {
    const ttl = options.ttl || (options.includeQuestions ? 15 * 60 * 1000 : 5 * 60 * 1000);
    
    this.set(`evaluation:${evaluationId}`, data, {
      ttl,
      priority: 'high',
      persist: true
    });
    
    // Cache específico para questões (TTL maior)
    if (options.includeQuestions && data.questions) {
      this.set(`evaluation:${evaluationId}:questions`, data.questions, {
        ttl: 30 * 60 * 1000, // 30 minutos
        priority: 'high'
      });
    }
    
    // Cache para respostas (TTL menor, mais volátil)
    if (options.includeAnswers && data.answers) {
      this.set(`evaluation:${evaluationId}:answers`, data.answers, {
        ttl: 2 * 60 * 1000, // 2 minutos
        priority: 'medium'
      });
    }
  }

  getEvaluation(evaluationId: string): any | null {
    return this.get(`evaluation:${evaluationId}`);
  }

  // ✅ Cache para resultados de avaliação
  setEvaluationResults(evaluationId: string, results: any, ttl: number = 10 * 60 * 1000): void {
    this.set(`evaluation:${evaluationId}:results`, results, {
      ttl,
      priority: 'medium'
    });
  }

  getEvaluationResults(evaluationId: string): any | null {
    return this.get(`evaluation:${evaluationId}:results`);
  }

  // ✅ Cache para turmas
  setClasses(schoolId: string, classes: any[], ttl: number = 15 * 60 * 1000): void {
    this.set(`classes:school:${schoolId}`, classes, {
      ttl,
      priority: 'medium'
    });
  }

  getClasses(schoolId: string): any[] | null {
    return this.get(`classes:school:${schoolId}`);
  }

  // ✅ Cache para estatísticas do dashboard
  setDashboardStats(stats: any, ttl: number = 5 * 60 * 1000): void {
    this.set('dashboard:stats', stats, {
      ttl,
      priority: 'low'
    });
  }

  getDashboardStats(): any | null {
    return this.get('dashboard:stats');
  }

  // ✅ Operações de limpeza e manutenção
  delete(key: string): void {
    const item = this.cache.get(key);
    if (item) {
      this.cache.delete(key);
      this.metrics.totalSize -= item.size;
      
      if (this.config.persistToLocalStorage) {
        localStorage.removeItem(`cache:${key}`);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.metrics.totalSize = 0;
    this.metrics.hits = 0;
    this.metrics.misses = 0;
    this.metrics.evictions = 0;
    
    if (this.config.persistToLocalStorage) {
      this.clearStorage();
    }
  }

  // ✅ Invalidar cache por padrão
  invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
  }

  // ✅ Estratégias de eviction
  private ensureSpace(newItemSize: number): void {
    const maxSize = this.config.maxSize;
    let currentSize = this.metrics.totalSize;
    
    if (currentSize + newItemSize <= maxSize) {
      return;
    }
    
    // Estratégia LRU com prioridade
    const itemsToEvict = Array.from(this.cache.entries())
      .sort((a, b) => {
        const [, itemA] = a;
        const [, itemB] = b;
        
        // Prioridade menor primeiro
        const priorityWeight = {
          'low': 1,
          'medium': 2,
          'high': 3
        };
        
        if (priorityWeight[itemA.priority] !== priorityWeight[itemB.priority]) {
          return priorityWeight[itemA.priority] - priorityWeight[itemB.priority];
        }
        
        // Depois por último acesso
        return itemA.lastAccessed - itemB.lastAccessed;
      });
    
    for (const [key, item] of itemsToEvict) {
      this.delete(key);
      this.metrics.evictions++;
      currentSize -= item.size;
      
      if (currentSize + newItemSize <= maxSize) {
        break;
      }
    }
  }

  // ✅ Persistência em localStorage
  private persistToStorage(key: string, item: CacheItem): void {
    try {
      const storageKey = `cache:${key}`;
      const storageData = {
        ...item,
        version: '1.0'
      };
      
      localStorage.setItem(storageKey, JSON.stringify(storageData));
    } catch (error) {
      console.warn('Erro ao persistir cache:', error);
    }
  }

  private loadFromStorage(): void {
    if (!this.config.persistToLocalStorage) return;
    
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('cache:'));
      
      for (const storageKey of keys) {
        const key = storageKey.replace('cache:', '');
        const rawData = localStorage.getItem(storageKey);
        
        if (rawData) {
          const item: CacheItem = JSON.parse(rawData);
          const now = Date.now();
          
          // Verificar se não expirou
          if (now - item.timestamp <= item.ttl) {
            this.cache.set(key, item);
            this.metrics.totalSize += item.size;
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar cache do storage:', error);
    }
  }

  private clearStorage(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('cache:'));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Erro ao limpar cache do storage:', error);
    }
  }

  // ✅ Compressão e serialização
  private serialize(data: any): string {
    return JSON.stringify(data);
  }

  private deserialize(data: string): any {
    return JSON.parse(data);
  }

  private compress(data: string): string {
    // Implementação simples de compressão (em produção, usar biblioteca como lz-string)
    return data; // Por enquanto, sem compressão
  }

  private decompress(data: string): string {
    return data; // Por enquanto, sem descompressão
  }

  private calculateSize(data: string): number {
    return new Blob([data]).size;
  }

  // ✅ Limpeza automática
  private setupCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // A cada minuto
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
  }

  // ✅ Métricas e debugging
  getMetrics() {
    const hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses) * 100;
    
    return {
      ...this.metrics,
      hitRate: hitRate || 0,
      cacheSize: this.cache.size,
      maxSize: this.config.maxSize,
      memoryUsage: (this.metrics.totalSize / this.config.maxSize) * 100
    };
  }

  getDebugInfo() {
    return {
      config: this.config,
      metrics: this.getMetrics(),
      cacheKeys: Array.from(this.cache.keys()),
      oldestItem: this.getOldestItem(),
      largestItem: this.getLargestItem()
    };
  }

  private getOldestItem(): { key: string; age: number } | null {
    let oldest: { key: string; age: number } | null = null;
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      const age = now - item.timestamp;
      if (!oldest || age > oldest.age) {
        oldest = { key, age };
      }
    }
    
    return oldest;
  }

  private getLargestItem(): { key: string; size: number } | null {
    let largest: { key: string; size: number } | null = null;
    
    for (const [key, item] of this.cache.entries()) {
      if (!largest || item.size > largest.size) {
        largest = { key, size: item.size };
      }
    }
    
    return largest;
  }
}

// ✅ Instância singleton exportada
export const smartCache = SmartCache.getInstance({
  maxSize: 100 * 1024 * 1024, // 100MB
  defaultTtl: 5 * 60 * 1000, // 5 minutos
  compressionEnabled: false, // Desabilitado por enquanto
  persistToLocalStorage: true,
  enableMetrics: true
});

// ✅ Helpers específicos para avaliações
export const evaluationCache = {
  // Cache para dados de avaliação
  setEvaluation: (id: string, data: any, ttl?: number) => 
    smartCache.setEvaluation(id, data, { includeQuestions: true, ttl }),
  
  getEvaluation: (id: string) => 
    smartCache.getEvaluation(id),
  
  // Cache para progresso do aluno
  setProgress: (evaluationId: string, progress: any) => 
    smartCache.set(`progress:${evaluationId}`, progress, { ttl: 2 * 60 * 1000 }),
  
  getProgress: (evaluationId: string) => 
    smartCache.get(`progress:${evaluationId}`),
  
  // Cache para resultados
  setResults: (evaluationId: string, results: any) => 
    smartCache.setEvaluationResults(evaluationId, results),
  
  getResults: (evaluationId: string) => 
    smartCache.getEvaluationResults(evaluationId),
  
  // Invalidar cache relacionado a uma avaliação
  invalidateEvaluation: (evaluationId: string) => 
    smartCache.invalidatePattern(`evaluation:${evaluationId}`),
  
  // Cache para turmas
  setClasses: (schoolId: string, classes: any[]) => 
    smartCache.setClasses(schoolId, classes),
  
  getClasses: (schoolId: string) => 
    smartCache.getClasses(schoolId),
  
  // Cache para estatísticas
  setStats: (stats: any) => 
    smartCache.setDashboardStats(stats),
  
  getStats: () => 
    smartCache.getDashboardStats(),
  
  // Métricas
  getMetrics: () => smartCache.getMetrics(),
  
  // Debug
  getDebugInfo: () => smartCache.getDebugInfo()
};

export default smartCache; 