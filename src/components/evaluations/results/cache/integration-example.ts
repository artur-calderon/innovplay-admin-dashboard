/**
 * Exemplo de Integração do Cache Validado com Hooks Existentes
 * 
 * Demonstra como integrar o sistema de cache validado com os hooks
 * useStudentAggregatedResults e outros componentes do sistema.
 */

import { useCallback, useEffect, useState } from 'react';
import { validatedCache, CacheKeys, CacheDataType } from './validatedCache';
import { EvaluationResultsApiService } from '@/services/evaluationResultsApi';
import { CompletionStatusLevel } from '../types/completion';
import { getCurrentConfig, conditionalLog } from './config';

// ===== TIPOS PARA INTEGRAÇÃO =====

interface CachedStudentResults {
    student_id: string;
    student_name?: string;
    test_id: string;
    completion_status: CompletionStatusLevel;
    is_complete: boolean;
    grade?: number;
    proficiencia?: number;
    classificacao?: string;
    total_questions?: number;
    correct_answers?: number;
    session_data?: any;
    result_data?: any;
    answers_data?: any[];
    cached_at: number;
}

interface CacheIntegrationOptions {
    requireComplete?: boolean;
    forceFresh?: boolean;
    enableCaching?: boolean;
}

// ===== HOOK INTEGRADO COM CACHE =====

export const useStudentResultsWithCache = (
    testId: string,
    studentId: string,
    options: CacheIntegrationOptions = {}
) => {
    const {
        requireComplete = false,
        forceFresh = false,
        enableCaching = false // ✅ DEBUG: Cache desabilitado temporariamente
    } = options;

    const [data, setData] = useState<CachedStudentResults | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingFromCache, setIsLoadingFromCache] = useState(false);
    const [isLoadingFromAPI, setIsLoadingFromAPI] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cacheHit, setCacheHit] = useState(false);

    // ===== CHAVES DO CACHE =====
    const cacheKey = CacheKeys.studentResults(testId, studentId);
    const sessionKey = CacheKeys.sessionData(testId, studentId);
    const answersKey = CacheKeys.answersData(testId, studentId);

    // ===== FUNÇÃO PARA BUSCAR DADOS DA API =====
    const fetchFromAPI = useCallback(async (): Promise<CachedStudentResults | null> => {
        try {
            setIsLoadingFromAPI(true);
                         conditionalLog(getCurrentConfig(), 'info', `🌐 Buscando dados da API: ${studentId}`);

            // 1. Buscar dados básicos da sessão usando método existente
            let sessionResponse = null;
            try {
                const basicResult = await EvaluationResultsApiService.getStudentDetailedResults(testId, studentId, false);
                if (basicResult) {
                    sessionResponse = {
                        student_id: studentId,
                        student_name: basicResult.student_name || 'Aluno',
                        total_questions: basicResult.total_questions,
                        answered_questions: basicResult.answered_questions,
                        status: basicResult.status === 'concluida' ? 'completed' : 'pending'
                    };
                }
            } catch (sessionError) {
                conditionalLog(getCurrentConfig(), 'warn', '⚠️ Erro ao buscar dados da sessão:', sessionError);
            }
            
            if (!sessionResponse) {
                return null;
            }

            // 2. Determinar se aluno completou
            const isComplete = sessionResponse.status === 'completed' && sessionResponse.answered_questions > 0;
            
            // 3. Se incompleto e requeremos completo, não buscar dados pesados
            if (!isComplete && requireComplete) {
                const basicData: CachedStudentResults = {
                    student_id: studentId,
                    test_id: testId,
                    completion_status: CompletionStatusLevel.PARTIALLY_COMPLETE,
                    is_complete: false,
                    session_data: sessionResponse,
                    cached_at: Date.now()
                };

                // ✅ Cache dados básicos como incompletos
                if (enableCaching) {
                    validatedCache.set(
                        cacheKey,
                        basicData,
                        false, // isComplete = false
                        { type: CacheDataType.STUDENT_RESULTS }
                    );
                }

                return basicData;
            }

            // 4. Se completo ou permitimos incompletos, buscar dados completos
            let resultData = null;
            let answersData = null;

            if (isComplete) {
                // Buscar resultados detalhados
                resultData = await EvaluationResultsApiService.getStudentResults(testId, studentId);
                
                // Buscar respostas se necessário
                if (resultData) {
                    try {
                        answersData = await EvaluationResultsApiService.getStudentDetailedResults(testId, studentId, true);
                        // Extrair apenas as respostas do resultado detalhado
                        if (answersData && answersData.answers) {
                            answersData = answersData.answers;
                        }
                    } catch (answersError) {
                        conditionalLog(getCurrentConfig(), 'warn', '⚠️ Erro ao buscar respostas, continuando sem elas:', answersError);
                    }
                }
            }

            // 5. Consolidar dados
            const consolidatedData: CachedStudentResults = {
                student_id: studentId,
                student_name: resultData?.student_name || sessionResponse.student_name,
                test_id: testId,
                completion_status: isComplete ? CompletionStatusLevel.COMPLETE : CompletionStatusLevel.PARTIALLY_COMPLETE,
                is_complete: isComplete,
                grade: resultData?.grade,
                proficiencia: resultData?.proficiencia,
                classificacao: resultData?.classificacao,
                total_questions: sessionResponse.total_questions,
                correct_answers: resultData?.correct_answers,
                session_data: sessionResponse,
                result_data: resultData,
                answers_data: answersData,
                cached_at: Date.now()
            };

            // ✅ Cache dados consolidados
            if (enableCaching) {
                // Cache resultado principal
                validatedCache.set(
                    cacheKey,
                    consolidatedData,
                    isComplete,
                    { type: CacheDataType.STUDENT_RESULTS }
                );

                // Cache dados auxiliares separadamente
                validatedCache.set(
                    sessionKey,
                    sessionResponse,
                    true,
                    { type: CacheDataType.SESSION_DATA }
                );

                if (answersData) {
                    validatedCache.set(
                        answersKey,
                        answersData,
                        true,
                        { type: CacheDataType.ANSWERS_DATA }
                    );
                }
            }

            return consolidatedData;

                 } catch (apiError) {
             conditionalLog(getCurrentConfig(), 'error', '❌ Erro na API:', apiError);
             throw apiError;
        } finally {
            setIsLoadingFromAPI(false);
        }
    }, [testId, studentId, requireComplete, enableCaching, cacheKey, sessionKey, answersKey]);

    // ===== FUNÇÃO PARA BUSCAR DADOS (CACHE FIRST) =====
    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            setCacheHit(false);

            // ✅ 1. TENTAR BUSCAR DO CACHE PRIMEIRO
            if (enableCaching && !forceFresh) {
                setIsLoadingFromCache(true);
                
                const cachedData = validatedCache.get<CachedStudentResults>(
                    cacheKey,
                    requireComplete
                );

                                 if (cachedData) {
                     conditionalLog(getCurrentConfig(), 'info', `✅ Cache hit: ${studentId} (completo: ${cachedData.is_complete})`);
                     setData(cachedData);
                    setCacheHit(true);
                    setIsLoadingFromCache(false);
                    setIsLoading(false);
                    return;
                }

                setIsLoadingFromCache(false);
            }

                         // ✅ 2. BUSCAR DA API SE NÃO ESTIVER NO CACHE
             conditionalLog(getCurrentConfig(), 'info', `📡 Cache miss, buscando da API: ${studentId}`);
             const apiData = await fetchFromAPI();
            
            if (apiData) {
                setData(apiData);
            } else {
                setError('Dados do aluno não encontrados');
            }

                 } catch (fetchError) {
             conditionalLog(getCurrentConfig(), 'error', '❌ Erro ao buscar dados:', fetchError);
             setError(fetchError instanceof Error ? fetchError.message : 'Erro desconhecido');
        } finally {
            setIsLoading(false);
        }
    }, [testId, studentId, requireComplete, forceFresh, enableCaching, cacheKey, fetchFromAPI]);

    // ===== FUNÇÃO PARA INVALIDAR CACHE =====
    const invalidateCache = useCallback(() => {
        if (enableCaching) {
            validatedCache.delete(cacheKey);
            validatedCache.delete(sessionKey);
            validatedCache.delete(answersKey);
                         conditionalLog(getCurrentConfig(), 'info', `🗑️ Cache invalidado para: ${studentId}`);
        }
    }, [enableCaching, cacheKey, sessionKey, answersKey, studentId]);

    // ===== FUNÇÃO PARA REFETCH =====
    const refetch = useCallback(() => {
        invalidateCache();
        return fetchData();
    }, [invalidateCache, fetchData]);

    // ===== EFFECT PARA CARREGAR DADOS =====
    useEffect(() => {
        if (testId && studentId) {
            fetchData();
        }
    }, [fetchData, testId, studentId]);

    // ===== VALORES COMPUTADOS =====
    const isComplete = data?.is_complete || false;
    const canAnalyze = isComplete && data?.result_data;
    const completionLevel = data?.completion_status || CompletionStatusLevel.NOT_STARTED;
    
    const cacheInfo = {
        isFromCache: cacheHit,
        cacheAge: cacheHit && data ? Math.floor((Date.now() - data.cached_at) / 1000) : 0,
        cacheKey
    };

    return {
        // Dados
        data,
        
        // Estados de loading
        isLoading,
        isLoadingFromCache,
        isLoadingFromAPI,
        
        // Estados de erro
        error,
        
        // Estados computados
        isComplete,
        canAnalyze,
        completionLevel,
        
        // Informações do cache
        cacheInfo,
        
        // Ações
        refetch,
        invalidateCache
    };
};

// ===== HOOK PARA MÚLTIPLOS ALUNOS COM CACHE =====

export const useMultipleStudentsWithCache = (
    testId: string,
    studentIds: string[],
    options: CacheIntegrationOptions = {}
) => {
    const [studentsData, setStudentsData] = useState<Record<string, CachedStudentResults>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [cacheStats, setCacheStats] = useState({
        hits: 0,
        misses: 0,
        total: 0
    });

    const fetchMultipleStudents = useCallback(async () => {
        try {
            setIsLoading(true);
            const results: Record<string, CachedStudentResults> = {};
            const newErrors: Record<string, string> = {};
            let hits = 0;
            let misses = 0;

            // ✅ Buscar cada aluno individualmente (pode ser otimizado para batch)
            for (const studentId of studentIds) {
                try {
                    const cacheKey = CacheKeys.studentResults(testId, studentId);
                    
                    // Tentar cache primeiro
                    let studentData = null;
                    if (options.enableCaching && !options.forceFresh) {
                        studentData = validatedCache.get<CachedStudentResults>(
                            cacheKey,
                            options.requireComplete
                        );
                        
                        if (studentData) {
                            hits++;
                        }
                    }

                    // Se não estiver no cache, buscar da API
                    if (!studentData) {
                        misses++;
                        // Aqui usaríamos a mesma lógica do hook individual
                        // Por simplicidade, apenas marcamos como miss
                                                 conditionalLog(getCurrentConfig(), 'info', `📡 Cache miss para estudante: ${studentId}`);
                    } else {
                        results[studentId] = studentData;
                    }

                } catch (studentError) {
                    newErrors[studentId] = studentError instanceof Error ? studentError.message : 'Erro desconhecido';
                }
            }

            setStudentsData(results);
            setErrors(newErrors);
            setCacheStats({
                hits,
                misses,
                total: studentIds.length
            });

                 } catch (error) {
             conditionalLog(getCurrentConfig(), 'error', '❌ Erro ao buscar múltiplos alunos:', error);
         } finally {
            setIsLoading(false);
        }
    }, [testId, studentIds, options]);

    useEffect(() => {
        if (testId && studentIds.length > 0) {
            fetchMultipleStudents();
        }
    }, [fetchMultipleStudents, testId, studentIds]);

    return {
        studentsData,
        isLoading,
        errors,
        cacheStats,
        refetch: fetchMultipleStudents
    };
};

// ===== UTILITÁRIOS PARA LIMPEZA DE CACHE =====

export const CacheUtils = {
    /**
     * Limpa cache de um aluno específico
     */
    clearStudentCache: (studentId: string) => {
        return validatedCache.clearByStudentId(studentId);
    },

    /**
     * Limpa cache de uma avaliação específica
     */
    clearEvaluationCache: (testId: string) => {
        return validatedCache.clearByEvaluationId(testId);
    },

    /**
     * Limpa apenas dados incompletos
     */
    clearIncompleteData: () => {
        let total = 0;
        Object.values(CacheDataType).forEach(type => {
            total += validatedCache.clearIncompleteByType(type);
        });
        return total;
    },

    /**
     * Obtém estatísticas do cache
     */
    getCacheStats: () => {
        return validatedCache.getStats();
    },

    /**
     * Lista todas as chaves do cache
     */
    listCacheKeys: () => {
        return validatedCache.listKeys();
    }
};

 