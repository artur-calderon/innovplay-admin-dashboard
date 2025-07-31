/**
 * Configuração do Sistema de Cache Validado
 * 
 * Permite personalizar TTL, intervalos de limpeza e outros parâmetros
 * sem alterar o código principal do cache.
 */

export interface CacheConfig {
    // TTL padrão em millisegundos (5 minutos)
    defaultTTL: number;
    
    // Intervalo de limpeza automática em millisegundos (1 minuto)
    cleanupInterval: number;
    
    // Limite máximo de entradas no cache (0 = ilimitado)
    maxEntries: number;
    
    // Limite de memória em bytes (0 = ilimitado)
    maxMemoryUsage: number;
    
    // Ativar logs detalhados
    enableDetailedLogs: boolean;
    
    // Configurações por tipo de dados
    typeSpecificConfigs: Record<string, {
        ttl?: number;
        maxEntries?: number;
        enableCompression?: boolean;
    }>;
}

// ===== CONFIGURAÇÃO PADRÃO =====

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
    // ✅ DEBUG: TTL muito baixo para forçar sempre buscar da API
    defaultTTL: 1 * 1000, // 1 segundo (praticamente desabilitado)
    
    // Limpeza a cada minuto
    cleanupInterval: 60 * 1000,
    
    // Sem limite de entradas (gerenciado por TTL)
    maxEntries: 0,
    
    // 10MB de limite de memória
    maxMemoryUsage: 10 * 1024 * 1024,
    
    // ✅ DEBUG: Logs sempre habilitados para debug
    enableDetailedLogs: true,
    
    // Configurações específicas por tipo
    typeSpecificConfigs: {
        'student_results': {
            ttl: 1 * 1000, // ✅ DEBUG: 1 segundo
            maxEntries: 50, // Máximo 50 resultados de alunos
            enableCompression: false
        },
        'evaluation_results': {
            ttl: 1 * 1000, // ✅ DEBUG: 1 segundo
            maxEntries: 20, // Máximo 20 avaliações
            enableCompression: false
        },
        'aggregated_results': {
            ttl: 1 * 1000, // ✅ DEBUG: 1 segundo
            maxEntries: 100,
            enableCompression: true // Dados maiores, comprimir
        },
        'session_data': {
            ttl: 1 * 1000, // ✅ DEBUG: 1 segundo
            maxEntries: 100,
            enableCompression: false
        },
        'answers_data': {
            ttl: 1 * 1000, // ✅ DEBUG: 1 segundo
            maxEntries: 30,
            enableCompression: true // Respostas podem ser grandes
        },
        'questions_data': {
            ttl: 1 * 1000, // ✅ DEBUG: 1 segundo
            maxEntries: 10,
            enableCompression: true // Questões com texto grande
        }
    }
};

// ===== CONFIGURAÇÃO PARA DEBUG (CACHE DESABILITADO) =====

export const DEBUG_CACHE_CONFIG: CacheConfig = {
    // ✅ DEBUG: TTL de 0 para desabilitar completamente o cache
    defaultTTL: 0, // 0 = cache desabilitado
    
    // Limpeza imediata
    cleanupInterval: 1000, // 1 segundo
    
    // Sem entradas
    maxEntries: 0,
    
    // Sem limite de memória
    maxMemoryUsage: 0,
    
    // Logs sempre habilitados
    enableDetailedLogs: true,
    
    // Configurações específicas por tipo (todos desabilitados)
    typeSpecificConfigs: {
        'student_results': {
            ttl: 0, // Desabilitado
            maxEntries: 0,
            enableCompression: false
        },
        'evaluation_results': {
            ttl: 0, // Desabilitado
            maxEntries: 0,
            enableCompression: false
        },
        'aggregated_results': {
            ttl: 0, // Desabilitado
            maxEntries: 0,
            enableCompression: false
        },
        'session_data': {
            ttl: 0, // Desabilitado
            maxEntries: 0,
            enableCompression: false
        },
        'answers_data': {
            ttl: 0, // Desabilitado
            maxEntries: 0,
            enableCompression: false
        },
        'questions_data': {
            ttl: 0, // Desabilitado
            maxEntries: 0,
            enableCompression: false
        }
    }
};

// ===== CONFIGURAÇÕES PREDEFINIDAS PARA DIFERENTES AMBIENTES =====

export const PRODUCTION_CONFIG: Partial<CacheConfig> = {
    defaultTTL: 10 * 60 * 1000, // TTL maior em produção
    cleanupInterval: 2 * 60 * 1000, // Limpeza menos frequente
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB em produção
    enableDetailedLogs: false // Logs desabilitados
};

export const DEVELOPMENT_CONFIG: Partial<CacheConfig> = {
    defaultTTL: 2 * 60 * 1000, // TTL menor para desenvolvimento
    cleanupInterval: 30 * 1000, // Limpeza mais frequente
    maxMemoryUsage: 5 * 1024 * 1024, // 5MB em desenvolvimento
    enableDetailedLogs: true // Logs habilitados
};

export const TESTING_CONFIG: Partial<CacheConfig> = {
    defaultTTL: 10 * 1000, // 10 segundos para testes rápidos
    cleanupInterval: 5 * 1000, // Limpeza muito frequente
    maxMemoryUsage: 1 * 1024 * 1024, // 1MB para testes
    enableDetailedLogs: false // Logs silenciosos nos testes
};

// ===== CONFIGURAÇÕES PARA CASOS ESPECÍFICOS =====

export const HIGH_PERFORMANCE_CONFIG: Partial<CacheConfig> = {
    defaultTTL: 15 * 60 * 1000, // TTL mais longo
    cleanupInterval: 5 * 60 * 1000, // Limpeza menos frequente
    maxEntries: 1000, // Mais entradas permitidas
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    enableDetailedLogs: false
};

export const MEMORY_CONSTRAINED_CONFIG: Partial<CacheConfig> = {
    defaultTTL: 2 * 60 * 1000, // TTL menor para liberar memória
    cleanupInterval: 15 * 1000, // Limpeza mais agressiva
    maxEntries: 50, // Poucas entradas
    maxMemoryUsage: 2 * 1024 * 1024, // 2MB apenas
    enableDetailedLogs: false,
    typeSpecificConfigs: {
        'student_results': { maxEntries: 10 },
        'evaluation_results': { maxEntries: 5 },
        'aggregated_results': { maxEntries: 20, enableCompression: true },
        'session_data': { maxEntries: 20 },
        'answers_data': { maxEntries: 5, enableCompression: true },
        'questions_data': { maxEntries: 3, enableCompression: true }
    }
};

// ===== FUNÇÃO PARA MESCLAR CONFIGURAÇÕES =====

export function mergeConfigs(baseConfig: CacheConfig, overrides: Partial<CacheConfig>): CacheConfig {
    return {
        ...baseConfig,
        ...overrides,
        typeSpecificConfigs: {
            ...baseConfig.typeSpecificConfigs,
            ...overrides.typeSpecificConfigs
        }
    };
}

// ===== FUNÇÃO PARA OBTER CONFIGURAÇÃO BASEADA NO AMBIENTE =====

export function getEnvironmentConfig(): CacheConfig {
    const environment = process.env.NODE_ENV || 'development';
    
    let envConfig: Partial<CacheConfig> = {};
    
    switch (environment) {
        case 'production':
            envConfig = PRODUCTION_CONFIG;
            break;
        case 'test':
            envConfig = TESTING_CONFIG;
            break;
        case 'development':
        default:
            envConfig = DEVELOPMENT_CONFIG;
            break;
    }
    
    // Verificar variáveis de ambiente para sobrescrever
    if (process.env.CACHE_TTL) {
        envConfig.defaultTTL = parseInt(process.env.CACHE_TTL, 10) * 1000;
    }
    
    if (process.env.CACHE_CLEANUP_INTERVAL) {
        envConfig.cleanupInterval = parseInt(process.env.CACHE_CLEANUP_INTERVAL, 10) * 1000;
    }
    
    if (process.env.CACHE_MAX_MEMORY) {
        envConfig.maxMemoryUsage = parseInt(process.env.CACHE_MAX_MEMORY, 10) * 1024 * 1024;
    }
    
    if (process.env.CACHE_DETAILED_LOGS) {
        envConfig.enableDetailedLogs = process.env.CACHE_DETAILED_LOGS === 'true';
    }
    
    return mergeConfigs(DEFAULT_CACHE_CONFIG, envConfig);
}

// ===== VALIDAÇÃO DE CONFIGURAÇÃO =====

export function validateConfig(config: CacheConfig): string[] {
    const errors: string[] = [];
    
    if (config.defaultTTL <= 0) {
        errors.push('defaultTTL deve ser maior que zero');
    }
    
    if (config.cleanupInterval <= 0) {
        errors.push('cleanupInterval deve ser maior que zero');
    }
    
    if (config.maxMemoryUsage < 0) {
        errors.push('maxMemoryUsage não pode ser negativo');
    }
    
    if (config.maxEntries < 0) {
        errors.push('maxEntries não pode ser negativo');
    }
    
    // Validar TTL não seja muito pequeno
    if (config.defaultTTL < 1000) {
        errors.push('defaultTTL muito pequeno (mínimo 1 segundo)');
    }
    
    // Validar limpeza não seja muito frequente
    if (config.cleanupInterval < 5000) {
        errors.push('cleanupInterval muito frequente (mínimo 5 segundos)');
    }
    
    return errors;
}

// ===== UTILITÁRIO PARA LOGS CONDICIONAIS =====

export function conditionalLog(config: CacheConfig, level: 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    if (!config.enableDetailedLogs) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[Cache ${level.toUpperCase()}] ${timestamp}:`;
    
    switch (level) {
        case 'info':
            console.log(prefix, message, ...args);
            break;
        case 'warn':
            console.warn(prefix, message, ...args);
            break;
        case 'error':
            console.error(prefix, message, ...args);
            break;
    }
}

// ===== CONFIGURAÇÃO GLOBAL ATUAL =====

let currentConfig: CacheConfig = DEBUG_CACHE_CONFIG; // ✅ DEBUG: Usar configuração de debug

export function getCurrentConfig(): CacheConfig {
    return currentConfig;
}

export function updateConfig(newConfig: Partial<CacheConfig>): void {
    const merged = mergeConfigs(currentConfig, newConfig);
    const errors = validateConfig(merged);
    
    if (errors.length > 0) {
        console.warn(`⚠️ DEBUG: Configuração inválida ignorada (modo debug): ${errors.join(', ')}`);
        return; // ✅ DEBUG: Não falhar em modo debug
    }
    
    currentConfig = merged;
    conditionalLog(currentConfig, 'info', 'Configuração do cache atualizada:', newConfig);
}

// ===== EXEMPLO DE USO EM DIFERENTES AMBIENTES =====

/*
// .env.production
CACHE_TTL=600           # 10 minutos
CACHE_CLEANUP_INTERVAL=120  # 2 minutos
CACHE_MAX_MEMORY=50     # 50MB
CACHE_DETAILED_LOGS=false

// .env.development
CACHE_TTL=120           # 2 minutos
CACHE_CLEANUP_INTERVAL=30   # 30 segundos
CACHE_MAX_MEMORY=5      # 5MB
CACHE_DETAILED_LOGS=true

// Usar no código:
import { updateConfig, HIGH_PERFORMANCE_CONFIG } from './config';

// Para aplicações com alta demanda
updateConfig(HIGH_PERFORMANCE_CONFIG);

// Para aplicações com pouca memória
updateConfig(MEMORY_CONSTRAINED_CONFIG);
*/

export default getCurrentConfig; 