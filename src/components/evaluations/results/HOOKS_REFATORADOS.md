# 🔄 Hooks Refatorados - Estratégia "Tempo Real + Validação"

## 📋 Visão Geral

Os hooks do sistema de resultados foram **completamente refatorados** para implementar a estratégia **"Tempo Real + Validação"**, permitindo visualizar progresso parcial dos alunos enquanto mantém cálculos oficiais apenas com dados completos.

---

## 🎯 Principais Mudanças

### **Antes (Estratégia "Apenas Completos")**
```typescript
// ❌ Hook antigo - retornava apenas dados completos
const { results, stats } = useResultsData(testId);
```

### **Depois (Estratégia "Tempo Real + Validação")**
```typescript
// ✅ Hook refatorado - retorna dados separados
const { 
  validResults,      // Apenas completos (para cálculos)
  partialResults,    // Parciais (para UI tempo real)
  allResults,        // Todos (completos + parciais)
  completionStatus   // Status de completude geral
} = useResultsData(testId);
```

---

## 🔧 Hooks Refatorados

### **1. `useResultsData` (Entidade Results)**

**Antes:**
```typescript
interface UseResultsDataReturn {
  results: EvaluationResultEntity[];
  stats: ResultsStats | null;
  // ...
}
```

**Depois:**
```typescript
interface UseResultsDataReturn {
  // ✅ NOVO: Dados separados por completude
  validResults: EvaluationResultEntity[]; // Apenas completos (para cálculos)
  partialResults: EvaluationResultEntity[]; // Parciais (para UI tempo real)
  allResults: EvaluationResultEntity[]; // Todos (completos + parciais)
  
  // ✅ NOVO: Estatísticas separadas
  validStats: ResultsStats | null; // Estatísticas apenas de completos
  partialStats: ResultsStats | null; // Estatísticas de parciais
  allStats: ResultsStats | null; // Estatísticas de todos
  
  // ✅ NOVO: Status de completude
  completionStatus: {
    totalStudents: number;
    completedStudents: number;
    partialStudents: number;
    completionRate: number;
    hasIncompleteStudents: boolean;
    message: string;
  };
  
  // ✅ NOVO: Filtros específicos
  getValidResults: () => EvaluationResultEntity[];
  getPartialResults: () => EvaluationResultEntity[];
  getResultsByCompletionStatus: (status: CompletionStatusLevel) => EvaluationResultEntity[];
}
```

**Uso:**
```typescript
const { 
  validResults, 
  partialResults, 
  completionStatus,
  validStats 
} = useResultsData(testId, {
  includePartialInStats: false // Não incluir parciais nos cálculos
});

// Para cálculos oficiais
const averageGrade = validStats?.average_score || 0;

// Para UI tempo real
const studentsToShow = showAll ? [...validResults, ...partialResults] : validResults;
```

### **2. `useSessionsData` (Entidade Sessions)**

**Antes:**
```typescript
interface UseSessionsDataReturn {
  sessions: TestSessionEntity[];
  stats: SessionStats | null;
  // ...
}
```

**Depois:**
```typescript
interface UseSessionsDataReturn {
  // ✅ NOVO: Dados separados por completude
  validSessions: TestSessionEntity[]; // Apenas completas (para cálculos)
  partialSessions: TestSessionEntity[]; // Parciais (para UI tempo real)
  allSessions: TestSessionEntity[]; // Todas (completas + parciais)
  
  // ✅ NOVO: Status de completude
  completionStatus: {
    totalSessions: number;
    completedSessions: number;
    partialSessions: number;
    completionRate: number;
    hasIncompleteSessions: boolean;
    message: string;
  };
  
  // ✅ NOVO: Filtros específicos
  getValidSessions: () => TestSessionEntity[];
  getPartialSessions: () => TestSessionEntity[];
  getSessionsByCompletionStatus: (status: CompletionStatusLevel) => TestSessionEntity[];
}
```

### **3. `useAnswersData` (Entidade Answers)**

**Antes:**
```typescript
interface UseAnswersDataReturn {
  answers: StudentAnswerEntity[];
  stats: AnswerStats | null;
  // ...
}
```

**Depois:**
```typescript
interface UseAnswersDataReturn {
  // ✅ NOVO: Dados separados por completude
  validAnswers: StudentAnswerEntity[]; // Apenas completas (para cálculos)
  partialAnswers: StudentAnswerEntity[]; // Parciais (para UI tempo real)
  allAnswers: StudentAnswerEntity[]; // Todas (completas + parciais)
  
  // ✅ NOVO: Flag para visualização parcial
  isPartialView: boolean;
  setPartialView: (enabled: boolean) => void;
  
  // ✅ NOVO: Filtros específicos
  getValidAnswers: () => StudentAnswerEntity[];
  getPartialAnswers: () => StudentAnswerEntity[];
  getAnswersByCompletionStatus: (status: CompletionStatusLevel) => StudentAnswerEntity[];
}
```

### **4. `useAggregatedResults` (Hook Agregador Principal) - NOVO**

**Funcionalidade:**
- Combina dados de todas as entidades
- Implementa controle granular de visualização
- Fornece estatísticas separadas por completude
- Suporta auto-refresh para tempo real

**Interface:**
```typescript
interface UseAggregatedResultsReturn {
  // ✅ Dados separados por completude
  students: AggregatedStudentData[]; // Apenas completos (para cálculos)
  allStudents: AggregatedStudentData[]; // Todos (incluindo parciais)
  
  // ✅ Status de completude
  completionStatus: CompletionStatus;
  hasIncompleteStudents: boolean;
  
  // ✅ Estatísticas separadas
  stats: AggregatedStats;
  
  // ✅ Controle de visualização
  showAll: boolean;
  setShowAll: (enabled: boolean) => void;
  
  // ✅ Ações
  refetch: () => Promise<void>;
  refreshCompletionStatus: () => void;
  
  // ✅ Filtros específicos
  getCompletedStudents: () => AggregatedStudentData[];
  getPartialStudents: () => AggregatedStudentData[];
  getStudentsByCompletionStatus: (status: CompletionStatusLevel) => AggregatedStudentData[];
  getStudentsByClassification: (classification: string) => AggregatedStudentData[];
}
```

**Uso:**
```typescript
const { 
  students,           // Apenas completos
  allStudents,        // Todos (incluindo parciais)
  completionStatus,   // Status geral
  showAll,           // Controle de visualização
  setShowAll,        // Função para alternar
  stats              // Estatísticas separadas
} = useAggregatedResults(testId, {
  enablePartialView: false,    // Começar mostrando apenas completos
  autoRefresh: true,           // Atualizar automaticamente
  refreshInterval: 30000       // A cada 30 segundos
});

// Para cálculos oficiais (apenas completos)
const officialAverage = stats.validStats.averageGrade;

// Para UI tempo real
const studentsToDisplay = showAll ? allStudents : students;
```

---

## 🎨 Padrões de Uso

### **1. Cálculos Oficiais (Apenas Completos)**
```typescript
const { validResults, validStats } = useResultsData(testId);

// ✅ CORRETO: Usar apenas dados completos para cálculos
const averageGrade = validStats?.average_score || 0;
const totalCompleted = validResults.length;
```

### **2. UI Tempo Real (Incluindo Parciais)**
```typescript
const { allStudents, showAll, setShowAll } = useAggregatedResults(testId);

// ✅ CORRETO: Mostrar todos os alunos na UI
const studentsToShow = allStudents;

// ✅ CORRETO: Permitir alternar visualização
<Switch checked={showAll} onCheckedChange={setShowAll} />
```

### **3. Estatísticas Separadas**
```typescript
const { stats } = useAggregatedResults(testId);

// Estatísticas oficiais (apenas completos)
const officialStats = stats.validStats;

// Estatísticas de monitoramento (parciais)
const monitoringStats = stats.partialStats;

// Estatísticas combinadas (se configurado)
const combinedStats = stats.combinedStats;
```

### **4. Filtros por Completude**
```typescript
const { 
  getCompletedStudents, 
  getPartialStudents,
  getStudentsByCompletionStatus 
} = useAggregatedResults(testId);

// Obter apenas alunos completos
const completedStudents = getCompletedStudents();

// Obter apenas alunos parciais
const partialStudents = getPartialStudents();

// Obter por status específico
const incompleteStudents = getStudentsByCompletionStatus(CompletionStatusLevel.INCOMPLETE);
```

---

## 🔄 Migração de Código Existente

### **Antes (Código Legacy)**
```typescript
// ❌ Código antigo
const { results, stats } = useResultsData(testId);
const averageGrade = stats?.averageGrade || 0;
const studentsToShow = results;
```

### **Depois (Código Refatorado)**
```typescript
// ✅ Código novo - opção 1: manter compatibilidade
const { allResults: results, allStats: stats } = useResultsData(testId);
const averageGrade = stats?.average_score || 0;
const studentsToShow = results;

// ✅ Código novo - opção 2: usar dados separados
const { validResults, validStats, allResults } = useResultsData(testId);
const averageGrade = validStats?.average_score || 0; // Apenas completos
const studentsToShow = allResults; // Todos para UI
```

### **Exports Legacy Mantidos**
```typescript
// ✅ Compatibilidade mantida
export { useResultsData as useEvaluationResults } from './entities/results/useResultsData';
export { useSessionsData as useTestSessions } from './entities/sessions/useSessionsData';
export { useAnswersData as useStudentAnswers } from './entities/answers/useAnswersData';
```

---

## 🎯 Benefícios da Refatoração

### **1. Separação Clara de Responsabilidades**
- **Dados completos**: Para cálculos oficiais e estatísticas
- **Dados parciais**: Para monitoramento em tempo real
- **Dados combinados**: Para visualização completa

### **2. Controle Granular**
- Toggle para alternar entre visualizações
- Filtros específicos por status de completude
- Configurações flexíveis por hook

### **3. Performance Otimizada**
- `useMemo` para separação de dados
- Carregamento condicional de detalhes
- Cache inteligente com flags de completude

### **4. Experiência do Usuário Melhorada**
- Visualização em tempo real do progresso
- Alertas contextuais sobre status de completude
- Recomendações baseadas nos dados

### **5. Manutenibilidade**
- Código mais organizado e legível
- Tipos bem definidos
- Documentação completa

---

## 🚀 Próximos Passos

### **1. Atualizar Componentes**
- Integrar `useAggregatedResults` em `DetailedResultsView`
- Adicionar toggle "Mostrar Todos" em componentes
- Implementar badges de status "Completo/Parcial"

### **2. Testes**
- Criar testes para novos hooks
- Validar separação de dados
- Testar cenários de tempo real

### **3. Documentação**
- Atualizar README principal
- Criar exemplos de uso
- Documentar padrões de migração

---

## 📊 Resumo da Implementação

| Hook | Status | Dados Separados | Status Completude | Filtros Específicos |
|------|--------|----------------|-------------------|-------------------|
| `useResultsData` | ✅ Refatorado | ✅ | ✅ | ✅ |
| `useSessionsData` | ✅ Refatorado | ✅ | ✅ | ✅ |
| `useAnswersData` | ✅ Refatorado | ✅ | ✅ | ✅ |
| `useAggregatedResults` | ✅ Novo | ✅ | ✅ | ✅ |

**🎯 Resultado**: Sistema 100% compatível com estratégia "Tempo Real + Validação" 