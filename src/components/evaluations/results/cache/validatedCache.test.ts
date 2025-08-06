/**
 * Testes para o Sistema de Cache Validado
 * 
 * Demonstra e valida todas as funcionalidades do cache:
 * 1. Armazenamento com flag isComplete
 * 2. Invalidação de dados incompletos
 * 3. TTL de 5 minutos
 * 4. Métodos clear por tipo
 */

import { validatedCache, CacheKeys, CacheDataType } from './validatedCache';

// ===== DADOS DE TESTE =====

const mockStudentResults = {
    id: 'student-123',
    nome: 'João Silva',
    nota: 8.5,
    proficiencia: 350,
    classificacao: 'Adequado'
};

const mockPartialStudentResults = {
    id: 'student-123',
    nome: 'João Silva',
    status: 'em_andamento'
};

const mockEvaluationResults = {
    id: 'eval-456',
    titulo: 'Avaliação de Matemática',
    total_alunos: 25,
    media_nota: 7.8
};

// ===== UTILITÁRIOS DE TESTE =====

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const logTestResult = (testName: string, success: boolean, details?: string) => {
    const status = success ? '✅' : '❌';
    console.log(`${status} ${testName}${details ? ` - ${details}` : ''}`);
};

// ===== TESTES =====

export const runValidatedCacheTests = async () => {
    console.log('🧪 Iniciando Testes do Cache Validado\n');

    // Limpar cache antes dos testes
    validatedCache.clear();

    // ===== TESTE 1: Armazenamento com Flag isComplete =====
    console.log('📦 TESTE 1: Armazenamento com Flag isComplete');
    
    try {
        // Armazenar dados incompletos
        validatedCache.set(
            CacheKeys.studentResults('eval-456', 'student-123'),
            mockPartialStudentResults,
            false, // isComplete = false
            { type: CacheDataType.STUDENT_RESULTS }
        );

        // Armazenar dados completos
        validatedCache.set(
            CacheKeys.evaluationResults('eval-456'),
            mockEvaluationResults,
            true, // isComplete = true
            { type: CacheDataType.EVALUATION_RESULTS }
        );

        const stats = validatedCache.getStats();
        const hasIncomplete = stats.incompleteEntries > 0;
        const hasComplete = stats.completeEntries > 0;

        logTestResult('Armazenar dados incompletos', hasIncomplete);
        logTestResult('Armazenar dados completos', hasComplete);
        logTestResult('Estatísticas corretas', stats.totalEntries === 2);

    } catch (error) {
        logTestResult('Teste 1 - Erro', false, error.message);
    }

    console.log('');

    // ===== TESTE 2: Invalidação de Dados Incompletos =====
    console.log('🔄 TESTE 2: Invalidação de Dados Incompletos');

    try {
        const key = CacheKeys.studentResults('eval-789', 'student-456');

        // 1. Armazenar dados incompletos
        validatedCache.set(
            key,
            mockPartialStudentResults,
            false,
            { type: CacheDataType.STUDENT_RESULTS }
        );

        // 2. Tentar recuperar dados incompletos (permitido)
        const incompleteData = validatedCache.get(key, false);
        logTestResult('Recuperar dados incompletos', incompleteData !== null);

        // 3. Tentar recuperar dados completos (deve retornar null)
        const shouldBeNull = validatedCache.get(key, true);
        logTestResult('Rejeitar incompletos quando completos são solicitados', shouldBeNull === null);

        // 4. Armazenar dados completos (deve invalidar os incompletos)
        validatedCache.set(
            key,
            mockStudentResults,
            true,
            { type: CacheDataType.STUDENT_RESULTS }
        );

        // 5. Recuperar dados completos
        const completeData = validatedCache.get(key, true);
        logTestResult('Recuperar dados completos após invalidação', completeData !== null);
        logTestResult('Dados completos corretos', completeData?.nota === 8.5);

    } catch (error) {
        logTestResult('Teste 2 - Erro', false, error.message);
    }

    console.log('');

    // ===== TESTE 3: TTL de 5 Minutos =====
    console.log('⏰ TESTE 3: TTL de 5 Minutos');

    try {
        const shortTTLKey = CacheKeys.sessionData('eval-short', 'student-789');

        // Armazenar com TTL curto para teste (100ms)
        validatedCache.set(
            shortTTLKey,
            { session: 'test' },
            true,
            { type: CacheDataType.SESSION_DATA, ttl: 100 }
        );

        // Verificar se existe imediatamente
        const immediateData = validatedCache.get(shortTTLKey);
        logTestResult('Dados existem imediatamente', immediateData !== null);

        // Aguardar expiração
        await sleep(150);

        // Verificar se expirou
        const expiredData = validatedCache.get(shortTTLKey);
        logTestResult('Dados expiram após TTL', expiredData === null);

        // Verificar TTL padrão (5 minutos)
        const defaultTTLKey = CacheKeys.studentResults('eval-default', 'student-default');
        validatedCache.set(
            defaultTTLKey,
            mockStudentResults,
            true,
            { type: CacheDataType.STUDENT_RESULTS } // Sem TTL = usa padrão
        );

        const defaultData = validatedCache.get(defaultTTLKey);
        logTestResult('TTL padrão funciona', defaultData !== null);

    } catch (error) {
        logTestResult('Teste 3 - Erro', false, error.message);
    }

    console.log('');

    // ===== TESTE 4: Métodos Clear por Tipo =====
    console.log('🗑️ TESTE 4: Métodos Clear por Tipo');

    try {
        // Preparar dados de teste
        const keys = {
            student1: CacheKeys.studentResults('eval-clear', 'student-1'),
            student2: CacheKeys.studentResults('eval-clear', 'student-2'),
            evaluation: CacheKeys.evaluationResults('eval-clear'),
            session: CacheKeys.sessionData('eval-clear', 'student-1')
        };

        // Armazenar dados de diferentes tipos
        validatedCache.set(keys.student1, mockStudentResults, true, { type: CacheDataType.STUDENT_RESULTS });
        validatedCache.set(keys.student2, mockPartialStudentResults, false, { type: CacheDataType.STUDENT_RESULTS });
        validatedCache.set(keys.evaluation, mockEvaluationResults, true, { type: CacheDataType.EVALUATION_RESULTS });
        validatedCache.set(keys.session, { sessionId: 'test' }, true, { type: CacheDataType.SESSION_DATA });

        let stats = validatedCache.getStats();
        const initialTotal = stats.totalEntries;

        // Teste: clearByType
        const removedByType = validatedCache.clearByType(CacheDataType.STUDENT_RESULTS);
        logTestResult('clearByType remove entradas corretas', removedByType === 2);

        // Verificar se outros tipos permaneceram
        const evaluationStillExists = validatedCache.has(keys.evaluation);
        const sessionStillExists = validatedCache.has(keys.session);
        logTestResult('Outros tipos preservados', evaluationStillExists && sessionStillExists);

        // Recriar dados para próximo teste
        validatedCache.set(keys.student1, mockStudentResults, true, { type: CacheDataType.STUDENT_RESULTS });
        validatedCache.set(keys.student2, mockPartialStudentResults, false, { type: CacheDataType.STUDENT_RESULTS });

        // Teste: clearIncompleteByType
        const removedIncomplete = validatedCache.clearIncompleteByType(CacheDataType.STUDENT_RESULTS);
        logTestResult('clearIncompleteByType remove apenas incompletos', removedIncomplete === 1);

        // Verificar se dados completos permaneceram
        const completeStillExists = validatedCache.has(keys.student1);
        logTestResult('Dados completos preservados', completeStillExists);

        // Teste: clearByStudentId
        const removedByStudent = validatedCache.clearByStudentId('student-1');
        logTestResult('clearByStudentId remove dados do estudante', removedByStudent >= 1);

        // Teste: clearByEvaluationId
        const removedByEvaluation = validatedCache.clearByEvaluationId('eval-clear');
        stats = validatedCache.getStats();
        logTestResult('clearByEvaluationId remove dados da avaliação', stats.totalEntries < initialTotal);

    } catch (error) {
        logTestResult('Teste 4 - Erro', false, error.message);
    }

    console.log('');

    // ===== TESTE 5: Funcionalidades Auxiliares =====
    console.log('🔧 TESTE 5: Funcionalidades Auxiliares');

    try {
        // Preparar dados
        const auxKey = CacheKeys.answersData('eval-aux', 'student-aux');
        validatedCache.set(
            auxKey,
            { answers: ['A', 'B', 'C'] },
            true,
            { type: CacheDataType.ANSWERS_DATA }
        );

        // Teste: has()
        const exists = validatedCache.has(auxKey);
        const existsComplete = validatedCache.has(auxKey, true);
        logTestResult('has() funciona', exists);
        logTestResult('has() com requireComplete funciona', existsComplete);

        // Teste: listKeys()
        const keysList = validatedCache.listKeys();
        const hasOurKey = keysList.some(entry => entry.key === auxKey);
        logTestResult('listKeys() retorna chaves', keysList.length > 0);
        logTestResult('listKeys() inclui nossa chave', hasOurKey);

        // Teste: getStats()
        const finalStats = validatedCache.getStats();
        logTestResult('getStats() retorna dados válidos', finalStats.totalEntries >= 0);
        logTestResult('getStats() calcula tipos corretamente', typeof finalStats.entriesByType === 'object');

        // Teste: cleanup()
        const cleanedUp = validatedCache.cleanup();
        logTestResult('cleanup() executa sem erro', cleanedUp >= 0);

    } catch (error) {
        logTestResult('Teste 5 - Erro', false, error.message);
    }

    console.log('');

    // ===== RESULTADOS FINAIS =====
    console.log('📊 RESULTADOS FINAIS');
    
    const finalStats = validatedCache.getStats();
    console.log('📈 Estatísticas finais do cache:');
    console.log(`   Total de entradas: ${finalStats.totalEntries}`);
    console.log(`   Entradas completas: ${finalStats.completeEntries}`);
    console.log(`   Entradas incompletas: ${finalStats.incompleteEntries}`);
    console.log(`   Uso de memória: ${(finalStats.memoryUsage / 1024).toFixed(2)} KB`);
    
    console.log('\n🔍 Chaves no cache:');
    const keys = validatedCache.listKeys();
    keys.forEach(entry => {
        const status = entry.isComplete ? '✅' : '⏳';
        const expired = entry.isExpired ? '⏰' : '';
        console.log(`   ${status} ${entry.key} (${entry.age}s) ${expired}`);
    });

    console.log('\n🧪 Testes do Cache Validado Concluídos!');
};

export default runValidatedCacheTests; 