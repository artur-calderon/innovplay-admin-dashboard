# Tabela de Resultados Detalhados - Estrutura Refatorada

## Visão Geral

Esta refatoração transformou a tabela de resultados detalhados em um sistema modular e reutilizável, mantendo 100% da funcionalidade e visuais originais.

## Estrutura de Arquivos

```
src/
├── types/
│   └── results-table.ts          # Tipos centralizados
├── hooks/
│   └── useResultsTable.ts        # Hooks customizados para lógica
└── components/evaluations/
    └── results-table/
        ├── index.ts              # Exportações principais
        ├── ResultsTable.tsx      # Componente principal
        ├── TableHeader.tsx       # Cabeçalho da tabela
        ├── TableRow.tsx          # Linhas da tabela
        ├── TableLegend.tsx       # Legenda
        └── README.md             # Esta documentação
```

## Componentes

### ResultsTable (Principal)
Componente principal que combina todos os subcomponentes.

**Props:**
- `students`: Array de resultados dos alunos
- `totalQuestions`: Número total de questões
- `startQuestionNumber`: Número inicial das questões (padrão: 1)
- `onViewStudentDetails`: Callback para visualizar detalhes do aluno
- `questoes`: Dados das questões da API
- `questionsWithSkills`: Questões com informações de habilidades
- `skillsMapping`: Mapeamento UUID -> Código de habilidade
- `skillsBySubject`: Skills organizadas por disciplina
- `detailedReport`: Relatório detalhado da avaliação
- `visibleFields`: Campos visíveis na tabela
- `subjectFilter`: Filtro por disciplina

### TableHeader
Responsável pelo cabeçalho da tabela, incluindo:
- Cabeçalho principal com números das questões
- Linha de habilidades com tooltips
- Linha de porcentagem da turma

### TableRow
Renderiza cada linha de aluno com:
- Nome do aluno com ícone de visualização
- Respostas das questões (✓/✗)
- Totais, notas, proficiência e nível

### TableLegend
Exibe a legenda explicativa da tabela.

## Hooks Customizados

### useSkillCodeGenerator
Gera códigos de habilidades baseados em:
- Dados da questão
- Mapeamento de skills
- Disciplina detectada
- Série/ano

### useSkillDescription
Busca descrições das habilidades no mapeamento por disciplina.

### useTurmaPercentages
Calcula porcentagens de acerto da turma por questão.

### useStudentAnswers
Processa respostas dos alunos para exibição.

## Tipos

### QuestionData
```typescript
interface QuestionData {
  id: string;
  numero: number;
  texto: string;
  habilidade: string;
  codigo_habilidade: string;
  tipo: 'multipleChoice' | 'open' | 'trueFalse';
  dificuldade: 'Fácil' | 'Médio' | 'Difícil';
  porcentagem_acertos: number;
  porcentagem_erros: number;
}
```

### StudentResult
```typescript
interface StudentResult {
  id: string;
  nome: string;
  turma: string;
  nota: number;
  proficiencia: number;
  classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
  questoes_respondidas: number;
  acertos: number;
  erros: number;
  em_branco: number;
  tempo_gasto: number;
  status: 'concluida' | 'pendente';
}
```

### VisibleFields
```typescript
interface VisibleFields {
  turma: boolean;
  habilidade: boolean;
  questoes: boolean;
  percentualTurma: boolean;
  total: boolean;
  nota: boolean;
  proficiencia: boolean;
  nivel: boolean;
}
```

## Como Usar

### Importação
```typescript
import { ResultsTable } from './results-table';
```

### Uso Básico
```typescript
<ResultsTable 
  students={filteredStudents} 
  totalQuestions={detailedReport?.questoes.length || 0} 
  startQuestionNumber={1}
  onViewStudentDetails={handleViewStudentDetails}
  questoes={detailedReport?.questoes}
  questionsWithSkills={questionsWithSkills}
  skillsMapping={skillsMapping}
  skillsBySubject={skillsBySubject}
  detailedReport={detailedReport}
  visibleFields={visibleFields}
  subjectFilter={subjectFilter}
/>
```

### Configuração de Campos Visíveis
```typescript
const visibleFields = {
  turma: true,
  habilidade: true,
  questoes: true,
  percentualTurma: true,
  total: true,
  nota: true,
  proficiencia: true,
  nivel: true
};
```

## Benefícios da Refatoração

### 1. Modularidade
- Cada parte da tabela é um componente separado
- Fácil manutenção e teste individual
- Reutilização em outras partes do projeto

### 2. Tipos Centralizados
- Todos os tipos em `src/types/results-table.ts`
- Melhor IntelliSense e type safety
- Documentação clara das interfaces

### 3. Hooks Customizados
- Lógica de negócio separada da UI
- Reutilização da lógica em outros componentes
- Testes mais fáceis

### 4. Manutenibilidade
- Código mais limpo e organizado
- Responsabilidades bem definidas
- Fácil adição de novas funcionalidades

### 5. Reutilização
- Componente `ResultsTable` pode ser usado em outras páginas
- Props bem definidas e flexíveis
- Configuração através de `visibleFields`

### 6. Compatibilidade com API
- Estrutura preparada para dados mais coerentes
- Fácil adaptação para novos formatos de resposta
- Validação de tipos mais robusta

## Funcionalidades Mantidas

✅ **100% da funcionalidade original**
- Visualização de skills com tooltips
- Porcentagens da turma por questão
- Indicadores visuais de acerto/erro
- Filtros e ordenação
- Exportação de dados
- Responsividade

✅ **100% dos visuais originais**
- Estilos e cores mantidos
- Layout e espaçamentos preservados
- Animações e transições
- Ícones e indicadores

## Próximos Passos

1. **Testes Unitários**: Criar testes para cada componente
2. **Documentação de API**: Documentar formatos de dados esperados
3. **Otimizações**: Implementar virtualização para grandes datasets
4. **Novas Funcionalidades**: Adicionar recursos como comparação entre turmas

## Compatibilidade

- ✅ React 18+
- ✅ TypeScript 5+
- ✅ TailwindCSS
- ✅ Shadcn/ui
- ✅ Lucide React Icons 