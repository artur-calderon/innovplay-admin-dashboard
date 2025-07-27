# 🗄️ Sistema de Cache Validado

## 📋 Visão Geral

O sistema de cache validado foi projetado especificamente para gerenciar resultados de avaliação, considerando o estado de completude dos dados e garantindo que apenas dados apropriados sejam servidos conforme a solicitação.

## ✅ Funcionalidades Implementadas

### 1. **Flag isComplete com Dados**
- Cada entrada do cache armazena uma flag `isComplete` junto com os dados
- Permite distinguir entre dados parciais e completos
- Facilita decisões de invalidação inteligente

### 2. **Invalidação Inteligente**
- Dados incompletos são automaticamente invalidados quando dados completos são solicitados
- Evita servir dados parciais quando análise completa é necessária
- Logs detalhados para debugging e monitoramento

### 3. **TTL de 5 Minutos**
- Tempo de vida padrão de 5 minutos para todas as entradas
- TTL customizável por entrada se necessário
- Limpeza automática de entradas expiradas a cada minuto

### 4. **Métodos Clear por Tipo**
- Limpeza granular por tipo de dados (`STUDENT_RESULTS`, `EVALUATION_RESULTS`, etc.)
- Limpeza por estudante ou avaliação específicos
- Limpeza apenas de dados incompletos

---

## 🎯 Como Usar

### Importação
```typescript
import { validatedCache, CacheKeys, CacheDataType } from './cache/validatedCache';
```

### Armazenar Dados
```typescript
// Dados completos
validatedCache.set(
    CacheKeys.studentResults('eval-123', 'student-456'),
    studentData,
    true, // isComplete = true
    { type: CacheDataType.STUDENT_RESULTS }
);

// Dados parciais
validatedCache.set(
    CacheKeys.sessionData('eval-123', 'student-456'),
    partialSessionData,
    false, // isComplete = false
    { type: CacheDataType.SESSION_DATA }
);
```

### Recuperar Dados
```typescript
// Buscar qualquer dados (completos ou incompletos)
const anyData = validatedCache.get(
    CacheKeys.studentResults('eval-123', 'student-456')
);

// Buscar apenas dados completos (invalida incompletos)
const completeData = validatedCache.get(
    CacheKeys.studentResults('eval-123', 'student-456'),
    true // requireComplete = true
);
```

### Limpeza por Tipo
```typescript
// Limpar todos os resultados de estudantes
validatedCache.clearByType(CacheDataType.STUDENT_RESULTS);

// Limpar apenas dados incompletos de um tipo
validatedCache.clearIncompleteByType(CacheDataType.SESSION_DATA);

// Limpar todos os dados de um estudante
validatedCache.clearByStudentId('student-456');

// Limpar todos os dados de uma avaliação
validatedCache.clearByEvaluationId('eval-123');
```

---

## 📊 Tipos de Dados Suportados

```typescript
enum CacheDataType {
    STUDENT_RESULTS = 'student_results',        // Resultados individuais do aluno
    EVALUATION_RESULTS = 'evaluation_results',  // Resultados gerais da avaliação
    AGGREGATED_RESULTS = 'aggregated_results',  // Dados agregados/processados
    SESSION_DATA = 'session_data',              // Dados de sessão do aluno
    ANSWERS_DATA = 'answers_data',              // Respostas detalhadas
    QUESTIONS_DATA = 'questions_data'           // Dados das questões
}
```

---

## 🔧 Utilitários de Chaves

O sistema inclui utilitários para gerar chaves padronizadas:

```typescript
import { CacheKeys } from './cache/validatedCache';

const keys = {
    // Resultados de um aluno específico
    studentResults: CacheKeys.studentResults('eval-123', 'student-456'),
    
    // Resultados gerais da avaliação
    evaluationResults: CacheKeys.evaluationResults('eval-123'),
    
    // Dados agregados (com ou sem estudante específico)
    aggregatedResults: CacheKeys.aggregatedResults('eval-123', 'student-456'),
    
    // Dados de sessão
    sessionData: CacheKeys.sessionData('eval-123', 'student-456'),
    
    // Respostas detalhadas
    answersData: CacheKeys.answersData('eval-123', 'student-456'),
    
    // Dados das questões
    questionsData: CacheKeys.questionsData('eval-123')
};
```

---

## 📈 Monitoramento e Estatísticas

### Obter Estatísticas
```typescript
const stats = validatedCache.getStats();
console.log('📊 Estatísticas do Cache:', {
    total: stats.totalEntries,
    completos: stats.completeEntries,
    incompletos: stats.incompleteEntries,
    expirados: stats.expiredEntries,
    porTipo: stats.entriesByType,
    memoryUsage: `${(stats.memoryUsage / 1024).toFixed(2)} KB`
});
```

### Listar Chaves
```typescript
const keys = validatedCache.listKeys();
keys.forEach(entry => {
    console.log(`${entry.key}: ${entry.isComplete ? '✅' : '⏳'} (${entry.age}s)`);
});
```

---

## 🎛️ Hook React

Para facilitar o uso em componentes React:

```typescript
import { useCacheEntry } from './cache/validatedCache';

function StudentResultsComponent({ evaluationId, studentId }) {
    const cacheKey = CacheKeys.studentResults(evaluationId, studentId);
    const { data, isComplete, age, refresh } = useCacheEntry(cacheKey, true);
    
    if (!data) {
        return <div>Carregando...</div>;
    }
    
    return (
        <div>
            <div>Dados: {isComplete ? 'Completos' : 'Parciais'}</div>
            <div>Idade: {age} segundos</div>
            <button onClick={refresh}>Atualizar</button>
            {/* Renderizar dados */}
        </div>
    );
}
```

---

## 🚨 Cenários de Uso

### Cenário 1: Carregamento Progressivo
```typescript
// 1. Primeiro, dados parciais chegam
validatedCache.set(
    CacheKeys.studentResults('eval-123', 'student-456'),
    { nome: 'João', status: 'em_andamento' },
    false, // Dados incompletos
    { type: CacheDataType.STUDENT_RESULTS }
);

// 2. Componente pode mostrar dados parciais
const partialData = validatedCache.get(
    CacheKeys.studentResults('eval-123', 'student-456')
); // Retorna dados parciais

// 3. Dados completos chegam e invalidam os parciais
validatedCache.set(
    CacheKeys.studentResults('eval-123', 'student-456'),
    { nome: 'João', status: 'concluida', nota: 8.5, proficiencia: 350 },
    true, // Dados completos
    { type: CacheDataType.STUDENT_RESULTS }
);

// 4. Próxima busca retorna dados completos
const completeData = validatedCache.get(
    CacheKeys.studentResults('eval-123', 'student-456'),
    true // Requer completo
); // Retorna dados completos
```

### Cenário 2: Análise que Exige Dados Completos
```typescript
function generateDetailedReport(evaluationId: string, studentId: string) {
    // Só gerar relatório com dados completos
    const completeData = validatedCache.get(
        CacheKeys.studentResults(evaluationId, studentId),
        true // OBRIGATÓRIO: dados completos
    );
    
    if (!completeData) {
        // Dados não estão prontos ou são incompletos
        return null; // Forçar nova busca na API
    }
    
    // Dados completos garantidos - pode gerar relatório
    return generateReport(completeData);
}
```

---

## 🎯 Benefícios

1. **🚀 Performance**: Evita requests desnecessários à API
2. **🔍 Precisão**: Garante qualidade dos dados servidos
3. **⚡ Responsividade**: Permite carregamento progressivo
4. **🛡️ Consistência**: Evita estados inconsistentes na UI
5. **📊 Observabilidade**: Logs e estatísticas detalhadas
6. **🧹 Manutenção**: Limpeza automática e manual granular

---

## ⚙️ Configuração

### TTL Customizado
```typescript
validatedCache.set(
    key,
    data,
    true,
    { 
        type: CacheDataType.STUDENT_RESULTS,
        ttl: 10 * 60 * 1000 // 10 minutos
    }
);
```

### Destruir Cache (cleanup completo)
```typescript
// Para testes ou reset completo
validatedCache.destroy();
```

---

## 🧪 Para Desenvolvimento/Debug

```typescript
// Ver estado atual do cache
console.table(validatedCache.listKeys());

// Forçar limpeza de expirados
const removed = validatedCache.cleanup();

// Ver estatísticas detalhadas
console.log(JSON.stringify(validatedCache.getStats(), null, 2));
``` 