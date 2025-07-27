# 🚀 Guia Prático de Uso do Cache Validado

## 📋 Quick Start

### 1. Importação Básica
```typescript
import { validatedCache, CacheKeys, CacheDataType } from '@/components/evaluations/results/cache';
```

### 2. Uso Básico
```typescript
// Armazenar dados
validatedCache.set(
    CacheKeys.studentResults('eval-123', 'student-456'),
    studentData,
    true, // isComplete
    { type: CacheDataType.STUDENT_RESULTS }
);

// Recuperar dados
const data = validatedCache.get(
    CacheKeys.studentResults('eval-123', 'student-456'),
    true // requireComplete
);
```

---

## 🎯 Cenários de Uso Reais

### Cenário 1: Carregamento de Resultado de Aluno

```typescript
// components/StudentResults.tsx
import React from 'react';
import { useStudentResultsWithCache } from '@/components/evaluations/results/cache';

interface StudentResultsProps {
    evaluationId: string;
    studentId: string;
}

const StudentResults: React.FC<StudentResultsProps> = ({ evaluationId, studentId }) => {
    const {
        data,
        isLoading,
        isLoadingFromCache,
        isLoadingFromAPI,
        error,
        isComplete,
        cacheInfo,
        refetch
    } = useStudentResultsWithCache(evaluationId, studentId, {
        requireComplete: true, // ✅ Só aceitar dados completos
        enableCaching: true
    });

    // Estados de loading diferenciados
    if (isLoading) {
        return (
            <div className="loading-container">
                {isLoadingFromCache && (
                    <div className="flex items-center gap-2">
                        <span className="animate-spin">🔍</span>
                        <span>Verificando cache local...</span>
                    </div>
                )}
                {isLoadingFromAPI && (
                    <div className="flex items-center gap-2">
                        <span className="animate-spin">🌐</span>
                        <span>Buscando dados atualizados...</span>
                    </div>
                )}
            </div>
        );
    }

    // Tratamento de erro
    if (error) {
        return (
            <div className="error-container bg-red-50 border border-red-200 p-4 rounded-lg">
                <h3 className="text-red-800 font-semibold">❌ Erro ao Carregar Dados</h3>
                <p className="text-red-600">{error}</p>
                <button 
                    onClick={refetch}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    🔄 Tentar Novamente
                </button>
            </div>
        );
    }

    // Dados incompletos
    if (!data || !isComplete) {
        return (
            <div className="incomplete-data bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <h3 className="text-yellow-800 font-semibold">⏳ Avaliação Incompleta</h3>
                <p className="text-yellow-600">
                    O aluno ainda não finalizou esta avaliação ou os dados não estão completos.
                </p>
                <button 
                    onClick={refetch}
                    className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                >
                    🔄 Verificar Novamente
                </button>
            </div>
        );
    }

    // Dados completos - renderizar resultado
    return (
        <div className="student-results bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{data.student_name}</h2>
                
                {/* Indicador de cache */}
                {cacheInfo.isFromCache && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>📦</span>
                        <span>Cache ({cacheInfo.cacheAge}s)</span>
                    </div>
                )}
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="stat-card">
                    <div className="text-2xl font-bold text-green-600">{data.grade?.toFixed(1)}</div>
                    <div className="text-sm text-gray-600">Nota Final</div>
                </div>
                <div className="stat-card">
                    <div className="text-2xl font-bold text-blue-600">{data.proficiencia?.toFixed(0)}</div>
                    <div className="text-sm text-gray-600">Proficiência</div>
                </div>
                <div className="stat-card">
                    <div className="text-2xl font-bold text-purple-600">{data.correct_answers}</div>
                    <div className="text-sm text-gray-600">Acertos</div>
                </div>
            </div>

            {/* Classificação */}
            <div className="classification mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    data.classificacao === 'Avançado' ? 'bg-green-100 text-green-800' :
                    data.classificacao === 'Adequado' ? 'bg-blue-100 text-blue-800' :
                    data.classificacao === 'Básico' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                }`}>
                    {data.classificacao}
                </span>
            </div>

            {/* Ações */}
            <div className="actions flex gap-2">
                <button 
                    onClick={refetch}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    🔄 Atualizar Dados
                </button>
            </div>
        </div>
    );
};

export default StudentResults;
```

### Cenário 2: Lista de Resultados de Turma

```typescript
// components/ClassResults.tsx
import React, { useState } from 'react';
import { useMultipleStudentsWithCache, CacheUtils } from '@/components/evaluations/results/cache';

interface ClassResultsProps {
    evaluationId: string;
    studentIds: string[];
}

const ClassResults: React.FC<ClassResultsProps> = ({ evaluationId, studentIds }) => {
    const [showOnlyComplete, setShowOnlyComplete] = useState(true);
    
    const {
        studentsData,
        isLoading,
        errors,
        cacheStats,
        refetch
    } = useMultipleStudentsWithCache(evaluationId, studentIds, {
        requireComplete: showOnlyComplete,
        enableCaching: true
    });

    // Filtrar apenas alunos com dados válidos
    const validStudents = Object.entries(studentsData)
        .filter(([_, data]) => data && (!showOnlyComplete || data.is_complete))
        .map(([studentId, data]) => ({ studentId, ...data }));

    return (
        <div className="class-results">
            {/* Header com controles */}
            <div className="header flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Resultados da Turma</h2>
                
                <div className="controls flex items-center gap-4">
                    {/* Filtro de completude */}
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={showOnlyComplete}
                            onChange={(e) => setShowOnlyComplete(e.target.checked)}
                        />
                        <span className="text-sm">Apenas completos</span>
                    </label>

                    {/* Estatísticas do cache */}
                    <div className="cache-stats text-sm text-gray-600">
                        📦 Cache: {cacheStats.hits}/{cacheStats.total} hits 
                        ({((cacheStats.hits / cacheStats.total) * 100).toFixed(1)}%)
                    </div>

                    {/* Ações */}
                    <button 
                        onClick={refetch}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        disabled={isLoading}
                    >
                        {isLoading ? '⏳' : '🔄'} Atualizar
                    </button>
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="loading text-center py-8">
                    <div className="animate-spin text-4xl mb-2">⏳</div>
                    <div>Carregando resultados da turma...</div>
                    <div className="text-sm text-gray-600 mt-2">
                        Verificando cache para {studentIds.length} alunos
                    </div>
                </div>
            )}

            {/* Erros */}
            {Object.keys(errors).length > 0 && (
                <div className="errors bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
                    <h3 className="text-red-800 font-semibold mb-2">⚠️ Erros Encontrados:</h3>
                    <ul className="text-red-600 text-sm">
                        {Object.entries(errors).map(([studentId, error]) => (
                            <li key={studentId}>• Aluno {studentId}: {error}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Resultados */}
            {!isLoading && (
                <div className="results">
                    {validStudents.length === 0 ? (
                        <div className="no-results text-center py-12 bg-gray-50 rounded-lg">
                            <div className="text-4xl mb-2">📋</div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                Nenhum resultado encontrado
                            </h3>
                            <p className="text-gray-600">
                                {showOnlyComplete 
                                    ? 'Nenhum aluno completou a avaliação ainda.'
                                    : 'Não há dados disponíveis para esta turma.'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {validStudents.map((student) => (
                                <div 
                                    key={student.studentId}
                                    className="student-card bg-white border border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold">{student.student_name}</h3>
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            student.is_complete 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {student.is_complete ? '✅ Completo' : '⏳ Parcial'}
                                        </span>
                                    </div>

                                    {student.is_complete && (
                                        <div className="stats grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <div className="font-bold text-green-600">
                                                    {student.grade?.toFixed(1) || 'N/A'}
                                                </div>
                                                <div className="text-gray-600">Nota</div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-blue-600">
                                                    {student.proficiencia?.toFixed(0) || 'N/A'}
                                                </div>
                                                <div className="text-gray-600">Proficiência</div>
                                            </div>
                                        </div>
                                    )}

                                    {!student.is_complete && (
                                        <div className="incomplete-info text-sm text-gray-600">
                                            Status: {student.completion_status.replace('_', ' ')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ClassResults;
```

### Cenário 3: Gerenciamento de Cache para Admin

```typescript
// components/CacheManager.tsx
import React, { useState, useEffect } from 'react';
import { CacheUtils, validatedCache, CacheDataType } from '@/components/evaluations/results/cache';

const CacheManager: React.FC = () => {
    const [stats, setStats] = useState(CacheUtils.getCacheStats());
    const [keys, setKeys] = useState(CacheUtils.listCacheKeys());
    const [selectedType, setSelectedType] = useState<CacheDataType | 'all'>('all');

    const refreshData = () => {
        setStats(CacheUtils.getCacheStats());
        setKeys(CacheUtils.listCacheKeys());
    };

    useEffect(() => {
        const interval = setInterval(refreshData, 5000); // Atualizar a cada 5 segundos
        return () => clearInterval(interval);
    }, []);

    const handleClearByType = (type: CacheDataType) => {
        const removed = validatedCache.clearByType(type);
        alert(`${removed} entradas do tipo ${type} foram removidas`);
        refreshData();
    };

    const handleClearIncomplete = () => {
        const removed = CacheUtils.clearIncompleteData();
        alert(`${removed} entradas incompletas foram removidas`);
        refreshData();
    };

    const handleClearAll = () => {
        if (confirm('Tem certeza que deseja limpar todo o cache?')) {
            validatedCache.clear();
            refreshData();
        }
    };

    const filteredKeys = selectedType === 'all' 
        ? keys 
        : keys.filter(key => key.type === selectedType);

    return (
        <div className="cache-manager bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6">🗄️ Gerenciador de Cache</h2>

            {/* Estatísticas */}
            <div className="stats mb-6">
                <h3 className="text-lg font-semibold mb-3">📊 Estatísticas</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="stat-item bg-blue-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{stats.totalEntries}</div>
                        <div className="text-sm text-blue-700">Total</div>
                    </div>
                    <div className="stat-item bg-green-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{stats.completeEntries}</div>
                        <div className="text-sm text-green-700">Completos</div>
                    </div>
                    <div className="stat-item bg-yellow-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{stats.incompleteEntries}</div>
                        <div className="text-sm text-yellow-700">Incompletos</div>
                    </div>
                    <div className="stat-item bg-red-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{stats.expiredEntries}</div>
                        <div className="text-sm text-red-700">Expirados</div>
                    </div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                    Uso de memória: {(stats.memoryUsage / 1024).toFixed(2)} KB
                </div>
            </div>

            {/* Ações de Limpeza */}
            <div className="actions mb-6">
                <h3 className="text-lg font-semibold mb-3">🧹 Ações de Limpeza</h3>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleClearIncomplete}
                        className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                    >
                        🗑️ Limpar Incompletos
                    </button>
                    
                    {Object.values(CacheDataType).map(type => (
                        <button
                            key={type}
                            onClick={() => handleClearByType(type)}
                            className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                            🗑️ Limpar {type}
                        </button>
                    ))}
                    
                    <button
                        onClick={handleClearAll}
                        className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 text-sm"
                    >
                        💣 Limpar Tudo
                    </button>
                    
                    <button
                        onClick={refreshData}
                        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                        🔄 Atualizar
                    </button>
                </div>
            </div>

            {/* Lista de Chaves */}
            <div className="keys-list">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">🔑 Chaves no Cache</h3>
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value as CacheDataType | 'all')}
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                    >
                        <option value="all">Todos os tipos</option>
                        {Object.values(CacheDataType).map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredKeys.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            Nenhuma chave encontrada
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="text-left p-2 border-b">Chave</th>
                                    <th className="text-left p-2 border-b">Tipo</th>
                                    <th className="text-center p-2 border-b">Status</th>
                                    <th className="text-center p-2 border-b">Idade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredKeys.map((keyInfo, index) => (
                                    <tr key={keyInfo.key} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="p-2 font-mono text-xs max-w-xs truncate">{keyInfo.key}</td>
                                        <td className="p-2">{keyInfo.type}</td>
                                        <td className="p-2 text-center">
                                            <span className={`px-2 py-1 rounded text-xs ${
                                                keyInfo.isExpired ? 'bg-red-100 text-red-800' :
                                                keyInfo.isComplete ? 'bg-green-100 text-green-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {keyInfo.isExpired ? '⏰ Expirado' :
                                                 keyInfo.isComplete ? '✅ Completo' : '⏳ Incompleto'}
                                            </span>
                                        </td>
                                        <td className="p-2 text-center">{keyInfo.age}s</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CacheManager;
```

---

## 🔧 Dicas de Performance

### 1. **Use requireComplete Adequadamente**
```typescript
// ❌ Ruim: Sempre requerer dados completos
const data = validatedCache.get(key, true); // Pode ser desnecessário

// ✅ Bom: Requerer baseado no contexto
const data = validatedCache.get(key, needsFullAnalysis);
```

### 2. **Invalide Cache Inteligentemente**
```typescript
// ❌ Ruim: Invalidar todo o cache
validatedCache.clear();

// ✅ Bom: Invalidar especificamente
validatedCache.clearByEvaluationId(evaluationId);
```

### 3. **Monitor o Cache Regularmente**
```typescript
// Verificar saúde do cache periodicamente
setInterval(() => {
    const stats = validatedCache.getStats();
    if (stats.expiredEntries > 10) {
        validatedCache.cleanup();
    }
}, 60000); // A cada minuto
```

---

## 🚨 Troubleshooting

### Problema: Cache não está sendo usado
**Solução**: Verifique se `enableCaching: true` nas opções

### Problema: Dados incompletos sendo servidos
**Solução**: Use `requireComplete: true` quando precisar de dados completos

### Problema: Memória crescendo indefinidamente
**Solução**: Implemente limpeza periódica com `validatedCache.cleanup()`

### Problema: Dados desatualizados
**Solução**: Use `forceFresh: true` ou invalide o cache específico 