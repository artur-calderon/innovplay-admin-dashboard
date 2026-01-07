# Dados do Sistema

Esta pasta contém todos os dados estáticos e mockados do sistema.

## Estrutura

```
src/data/
├── formsData.ts    # Dados dos questionários socioeconômicos
├── index.ts        # Exportações centralizadas
└── README.md       # Esta documentação
```

## Questionários Disponíveis

### Alunos
- **questionsAlunoJovem**: Questionário para estudantes dos anos iniciais (1° ao 5° ano), EJA 1° ao 5° período e Educação Infantil
- **questionsAlunoVelho**: Questionário para estudantes dos anos finais (6° ao 9° ano) e EJA 6° ao 9° período

### Professores
- **professorQuestions**: Questionário de caracterização e condições de trabalho para professores da Educação Básica

### Diretores
- **diretorQuestions**: Questionário de caracterização da escola e condições de gestão para diretores escolares

## Uso

```typescript
import { 
  questionsAlunoJovem, 
  questionsAlunoVelho, 
  professorQuestions, 
  diretorQuestions 
} from '@/data';
```

## Tipos

Todos os dados seguem as interfaces definidas em `@/types/forms`:
- `Question`: Interface para questões individuais
- `FormSection`: Interface para seções de formulário
- `FormType`: Interface para tipos de questionário
- `FormRegistration`: Interface para registros de questionário

