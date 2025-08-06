/**
 * Sistema de Cache Validado para Resultados de Avaliação
 * 
 * Este cache considera o estado de completude dos dados e invalida
 * automaticamente dados incompletos quando dados completos são solicitados.
 */

import { getCurrentConfig, conditionalLog } from './config';

// ===== TIPOS E INTERFACES =====

export interface CacheEntry<T = any> {
    data: T;
    isComplete: boolean;
    timestamp: number;
    ttl: number;
    type: CacheDataType;
    key: string;
}

export enum CacheDataType {
    STUDENT_RESULTS = 'student_results',
    EVALUATION_RESULTS = 'evaluation_results',
    AGGREGATED_RESULTS = 'aggregated_results',
    SESSION_DATA = 'session_data',
    ANSWERS_DATA = 'answers_data',
    QUESTIONS_DATA = 'questions_data'
}

export interface CacheStats {
    totalEntries: number;
    entriesByType: Record<CacheDataType, number>;
    completeEntries: number;
    incompleteEntries: number;
    expiredEntries: number;
    memoryUsage: number; // Estimativa em bytes
}

export interface CacheOptions {
    ttl?: number; // TTL customizado em ms (padrão: 5 minutos)
    forceComplete?: boolean; // Se true, invalida dados incompletos
    type: CacheDataType;
}

// ===== CONFIGURAÇÕES =====

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos em millisegundos
const CLEANUP_INTERVAL = 60 * 1000; // 1 minuto para limpeza automática

// ===== CLASSE PRINCIPAL =====

class ValidatedCache {
    private cache = new Map<string, CacheEntry>();
    private cleanupTimer: NodeJS.Timeout | null = null;

    constructor() {
        this.startAutoCleanup();
    }

    // ===== 1. ARMAZENA FLAG isComplete COM DADOS =====

    /**
     * Armazena dados no cache com flag de completude
     */
    set<T>(
        key: string, 
        data: T, 
        isComplete: boolean, 
        options: CacheOptions
    ): void {
        const { ttl = DEFAULT_TTL, type } = options;
        
        // ✅ Verificar se existe entrada incompleta e solicitamos completa
        if (isComplete && this.hasIncompleteEntry(key)) {
            conditionalLog(getCurrentConfig(), 'info', `🔄 Invalidando cache incompleto para ${key} - dados completos chegaram`);
            this.delete(key);
        }

        const entry: CacheEntry<T> = {
            data,
            isComplete,
            timestamp: Date.now(),
            ttl,
            type,
            key
        };

        this.cache.set(key, entry);
        
        conditionalLog(getCurrentConfig(), 'info', `✅ Cache armazenado: ${key} (completo: ${isComplete}, tipo: ${type})`);
    }

    // ===== 2. INVALIDA CACHE INCOMPLETO SE SOLICITADO COMPLETO =====

    /**
     * Recupera dados do cache com validação de completude
     */
    get<T>(key: string, requireComplete = false): T | null {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return null;
        }

        // Verificar TTL
        if (this.isExpired(entry)) {
            conditionalLog(getCurrentConfig(), 'info', `⏰ Cache expirado removido: ${key}`);
            this.delete(key);
            return null;
        }

        // ✅ INVALIDAR CACHE INCOMPLETO SE SOLICITADO COMPLETO
        if (requireComplete && !entry.isComplete) {
            conditionalLog(getCurrentConfig(), 'info', `❌ Cache incompleto invalidado: ${key} (solicitado completo)`);
            this.delete(key);
            return null;
        }

        conditionalLog(getCurrentConfig(), 'info', `✅ Cache hit: ${key} (completo: ${entry.isComplete})`);
        return entry.data;
    }

    /**
     * Verifica se existe entrada incompleta para a chave
     */
    private hasIncompleteEntry(key: string): boolean {
        const entry = this.cache.get(key);
        return entry ? !entry.isComplete && !this.isExpired(entry) : false;
    }

    // ===== 3. TTL DE 5 MINUTOS =====

    /**
     * Verifica se uma entrada expirou
     */
    private isExpired(entry: CacheEntry): boolean {
        return Date.now() - entry.timestamp > entry.ttl;
    }

    /**
     * Remove entradas expiradas automaticamente
     */
    private cleanupExpired(): number {
        let removed = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                this.cache.delete(key);
                removed++;
            }
        }

        if (removed > 0) {
            conditionalLog(getCurrentConfig(), 'info', `🧹 Limpeza automática: ${removed} entradas expiradas removidas`);
        }

        return removed;
    }

    /**
     * Inicia limpeza automática em intervalo
     */
    private startAutoCleanup(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        this.cleanupTimer = setInterval(() => {
            this.cleanupExpired();
        }, CLEANUP_INTERVAL);
    }

    // ===== 4. MÉTODOS CLEAR POR TIPO DE DADOS =====

    /**
     * Remove todas as entradas de um tipo específico
     */
    clearByType(type: CacheDataType): number {
        let removed = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.type === type) {
                this.cache.delete(key);
                removed++;
            }
        }

        conditionalLog(getCurrentConfig(), 'info', `🗑️ Limpeza por tipo ${type}: ${removed} entradas removidas`);
        return removed;
    }

    /**
     * Remove apenas dados incompletos de um tipo específico
     */
    clearIncompleteByType(type: CacheDataType): number {
        let removed = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.type === type && !entry.isComplete) {
                this.cache.delete(key);
                removed++;
            }
        }

        conditionalLog(getCurrentConfig(), 'info', `🗑️ Limpeza incompletos ${type}: ${removed} entradas removidas`);
        return removed;
    }

    /**
     * Remove dados de um estudante específico (todos os tipos)
     */
    clearByStudentId(studentId: string): number {
        let removed = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (key.includes(`student:${studentId}`)) {
                this.cache.delete(key);
                removed++;
            }
        }

        conditionalLog(getCurrentConfig(), 'info', `🗑️ Limpeza estudante ${studentId}: ${removed} entradas removidas`);
        return removed;
    }

    /**
     * Remove dados de uma avaliação específica (todos os tipos)
     */
    clearByEvaluationId(evaluationId: string): number {
        let removed = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (key.includes(`evaluation:${evaluationId}`)) {
                this.cache.delete(key);
                removed++;
            }
        }

        conditionalLog(getCurrentConfig(), 'info', `🗑️ Limpeza avaliação ${evaluationId}: ${removed} entradas removidas`);
        return removed;
    }

    // ===== MÉTODOS AUXILIARES =====

    /**
     * Remove entrada específica
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Limpa todo o cache
     */
    clear(): void {
        const size = this.cache.size;
        this.cache.clear();
        conditionalLog(getCurrentConfig(), 'info', `🗑️ Cache completamente limpo: ${size} entradas removidas`);
    }

    /**
     * Verifica se chave existe no cache (válida)
     */
    has(key: string, requireComplete = false): boolean {
        const entry = this.cache.get(key);
        
        if (!entry || this.isExpired(entry)) {
            return false;
        }

        if (requireComplete && !entry.isComplete) {
            return false;
        }

        return true;
    }

    /**
     * Força limpeza de entradas expiradas
     */
    cleanup(): number {
        return this.cleanupExpired();
    }

    /**
     * Obtém estatísticas do cache
     */
    getStats(): CacheStats {
        const stats: CacheStats = {
            totalEntries: this.cache.size,
            entriesByType: {} as Record<CacheDataType, number>,
            completeEntries: 0,
            incompleteEntries: 0,
            expiredEntries: 0,
            memoryUsage: 0
        };

        // Inicializar contadores por tipo
        Object.values(CacheDataType).forEach(type => {
            stats.entriesByType[type] = 0;
        });

        for (const [key, entry] of this.cache.entries()) {
            // Contar por tipo
            stats.entriesByType[entry.type]++;
            
            // Contar completude
            if (entry.isComplete) {
                stats.completeEntries++;
            } else {
                stats.incompleteEntries++;
            }
            
            // Contar expirados
            if (this.isExpired(entry)) {
                stats.expiredEntries++;
            }
            
            // Estimar uso de memória (aproximado)
            stats.memoryUsage += JSON.stringify(entry).length * 2; // UTF-16
        }

        return stats;
    }

    /**
     * Lista todas as chaves no cache com informações
     */
    listKeys(): Array<{
        key: string;
        type: CacheDataType;
        isComplete: boolean;
        isExpired: boolean;
        age: number; // em segundos
    }> {
        const keys: Array<{
            key: string;
            type: CacheDataType;
            isComplete: boolean;
            isExpired: boolean;
            age: number;
        }> = [];

        for (const [key, entry] of this.cache.entries()) {
            keys.push({
                key,
                type: entry.type,
                isComplete: entry.isComplete,
                isExpired: this.isExpired(entry),
                age: Math.floor((Date.now() - entry.timestamp) / 1000)
            });
        }

        return keys.sort((a, b) => a.key.localeCompare(b.key));
    }

    /**
     * Destrói o cache e para a limpeza automática
     */
    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.clear();
        conditionalLog(getCurrentConfig(), 'info', '💥 Cache destruído');
    }
}

// ===== INSTÂNCIA SINGLETON =====

export const validatedCache = new ValidatedCache();

// ===== UTILITÁRIOS PARA CHAVES =====

export const CacheKeys = {
    studentResults: (evaluationId: string, studentId: string) => 
        `student_results:evaluation:${evaluationId}:student:${studentId}`,
    
    evaluationResults: (evaluationId: string) => 
        `evaluation_results:evaluation:${evaluationId}`,
    
    aggregatedResults: (evaluationId: string, studentId?: string) => 
        studentId 
            ? `aggregated_results:evaluation:${evaluationId}:student:${studentId}`
            : `aggregated_results:evaluation:${evaluationId}`,
    
    sessionData: (evaluationId: string, studentId: string) => 
        `session_data:evaluation:${evaluationId}:student:${studentId}`,
    
    answersData: (evaluationId: string, studentId: string) => 
        `answers_data:evaluation:${evaluationId}:student:${studentId}`,
    
    questionsData: (evaluationId: string) => 
        `questions_data:evaluation:${evaluationId}`
};

// ===== HOOKS UTILITÁRIOS =====

/**
 * Hook para usar o cache validado em componentes React
 */
export const useCacheEntry = <T>(
    key: string, 
    requireComplete = false
): {
    data: T | null;
    isComplete: boolean;
    age: number;
    refresh: () => void;
} => {
    const data = validatedCache.get<T>(key, requireComplete);
    const entry = (validatedCache as any).cache.get(key);
    
    return {
        data,
        isComplete: entry?.isComplete || false,
        age: entry ? Math.floor((Date.now() - entry.timestamp) / 1000) : 0,
        refresh: () => validatedCache.delete(key)
    };
};

export default validatedCache; 