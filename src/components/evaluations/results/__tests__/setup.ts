/**
 * Configuração de Testes - Sistema de Resultados de Avaliação
 * 
 * Configurações necessárias para executar os testes de filtros de completude
 */

import '@testing-library/jest-dom';

// Mock do localStorage para testes do cache
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
    },
    writable: true,
});

// Mock do console para evitar poluição nos testes
const originalConsole = { ...console };

beforeAll(() => {
    // Silenciar logs durante os testes, exceto erros importantes
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    // Manter console.error para debugging
});

afterAll(() => {
    // Restaurar console original
    Object.assign(console, originalConsole);
});

// Configuração global para timeouts de teste
jest.setTimeout(10000); // 10 segundos para testes que envolvem cache/async

// Mock de componentes UI complexos para focar na lógica
jest.mock('@/components/ui/charts', () => ({
    DonutChartComponent: ({ data, title, subtitle }: { data: unknown; title: string; subtitle: string }) => (
        <div data-testid="donut-chart">
            <h3>{title}</h3>
            <p>{subtitle}</p>
            <div data-testid="chart-data">{JSON.stringify(data)}</div>
        </div>
    ),
}));

// Mock do Skeleton para testes mais rápidos
jest.mock('@/components/ui/skeleton', () => ({
    Skeleton: ({ className }: { className?: string }) => (
        <div data-testid="skeleton" className={className}>Loading...</div>
    ),
}));

// Mock do Progress para testes
jest.mock('@/components/ui/progress', () => ({
    Progress: ({ value, className }: { value: number; className?: string }) => (
        <div data-testid="progress" className={className} data-value={value}>
            Progress: {value}%
        </div>
    ),
}));

// Configurações de teste do cache
export const testCacheConfig = {
    defaultTTL: 1000, // 1 segundo para testes rápidos
    enableDetailedLogs: false,
    maxEntries: 100,
    cleanupInterval: 5000,
    maxMemoryUsage: 10 * 1024 * 1024, // 10MB para testes
};

// Dados mock compartilhados entre testes
export const mockEvaluationData = {
    id: 'test-evaluation-123',
    titulo: 'Teste de Matemática - 9º Ano',
    disciplina: 'Matemática',
    curso: 'Ensino Fundamental II',
    serie: '9º Ano',
    escola: 'Escola Teste',
    municipio: 'São Paulo',
    data_aplicacao: '2025-01-25',
    status: 'concluida' as const,
    total_alunos: 4,
    alunos_participantes: 2,
    alunos_ausentes: 2,
    media_nota: 8.85,
    media_proficiencia: 387.5,
    distribuicao_classificacao: {
        abaixo_do_basico: 0,
        basico: 0,
        adequado: 1,
        avancado: 1,
    }
};

// Utilitários de teste
export const waitForCacheUpdate = (ms: number = 100) => 
    new Promise(resolve => setTimeout(resolve, ms));

export const expectElementsToBeFiltered = (
    completeElements: string[],
    incompleteElements: string[]
) => {
    // Verificar que elementos completos estão presentes
    completeElements.forEach(element => {
        expect(screen.getByText(element)).toBeInTheDocument();
    });
    
    // Verificar que elementos incompletos foram filtrados
    incompleteElements.forEach(element => {
        expect(screen.queryByText(element)).not.toBeInTheDocument();
    });
};

// Simulador de dados de avaliação para testes
export const createMockStudentData = (overrides: Partial<any> = {}) => ({
    id: 'mock-student-1',
    nome: 'Aluno Teste',
    turma: '9º A',
    nota: 8.0,
    proficiencia: 300,
    classificacao: 'Adequado',
    acertos: 16,
    total_questoes: 20,
    questoes_respondidas: 20,
    erros: 4,
    em_branco: 0,
    tempo_gasto: 3600,
    status: 'concluida',
    ...overrides
});

// Limpar cache entre testes
export const clearTestCache = () => {
    if (typeof window !== 'undefined' && (window as any).validatedCache) {
        (window as any).validatedCache.clear();
    }
};

console.log('🧪 Configuração de testes carregada - Sistema de Filtros de Completude'); 