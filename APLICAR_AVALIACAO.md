# Funcionalidade: Aplicar Avaliação

## Visão Geral

A funcionalidade de "Aplicar Avaliação" permite que professores e administradores apliquem uma avaliação para as turmas já vinculadas à avaliação, configurando quando ela ficará disponível para os alunos. Também permite remover turmas da aplicação.

## Componente: StartEvaluationModal

### Funcionalidades

- **Turmas Vinculadas**: Busca automática das turmas já vinculadas à avaliação
- **Configuração de Datas**: Definição de data/hora de início e término da avaliação
- **Remoção de Turmas**: Remover turmas individuais ou todas as turmas da aplicação
- **Validação**: Validação robusta usando Zod
- **Integração com API**: Chamada para `POST /tests/{test_id}/apply`
- **Tratamento de Erros**: Tratamento completo de erros e avisos da API

### Como Usar

```tsx
import StartEvaluationModal from "@/components/evaluations/StartEvaluationModal";

// No seu componente
const [showModal, setShowModal] = useState(false);
const [evaluation, setEvaluation] = useState(null);

const handleConfirm = async (startDateTime: string, endDateTime: string) => {
  // Lógica adicional após aplicar a avaliação
  console.log("Avaliação aplicada:", { startDateTime, endDateTime });
};

return (
  <StartEvaluationModal
    isOpen={showModal}
    onClose={() => setShowModal(false)}
    onConfirm={handleConfirm}
    evaluation={evaluation}
  />
);
```

## API Integration

### Endpoint para Buscar Turmas Vinculadas
```
GET /test/{test_id}/classes
```

### Endpoint para Aplicar Avaliação
```
POST /tests/{test_id}/apply
```

### Endpoint para Remover Turma Individual
```
DELETE /test/{test_id}/classes/{class_id}
```

### Endpoint para Remover Múltiplas Turmas
```
DELETE /test/{test_id}/remove
```

Payload para remover múltiplas turmas:
```json
{
  "classes": ["uuid-classe-1", "uuid-classe-2", "uuid-classe-3"]
}
```

### Payload para Aplicar Avaliação
```json
{
  "classes": [
    {
      "class_id": "uuid-da-classe-1",
      "application": "2024-01-15T10:00:00",
      "expiration": "2024-01-15T12:00:00"
    },
    {
      "class_id": "uuid-da-classe-2",
      "application": "2024-01-16T09:00:00",
      "expiration": "2024-01-16T11:00:00"
    }
  ]
}
```

### Respostas da API

#### Sucesso (200)
```json
{
  "message": "Test applied to 3 classes successfully",
  "applied_classes": [
    "uuid-da-classe-1",
    "uuid-da-classe-2", 
    "uuid-da-classe-3"
  ]
}
```

#### Sucesso com Avisos (201)
```json
{
  "message": "Test applied to 2 classes successfully",
  "applied_classes": [
    "uuid-da-classe-1",
    "uuid-da-classe-2"
  ],
  "warnings": [
    "Test is already applied to class uuid-da-classe-3",
    "Invalid date format for class uuid-da-classe-4: Invalid isoformat string"
  ]
}
```

#### Erro (400)
```json
{
  "error": "No classes were applied",
  "details": [
    "class_id is required for each class",
    "Test is already applied to class uuid-da-classe-1"
  ]
}
```

## Interface do Usuário

### Exibição das Turmas Vinculadas
- Lista das turmas já vinculadas à avaliação com informações:
  - Nome da turma
  - Escola
  - Série/Curso
  - Número de alunos
- **Não há seleção manual** - todas as turmas vinculadas serão aplicadas
- Contador de turmas que receberão a avaliação

### Ações de Remoção
- **Botão "X" individual**: Remove uma turma específica
- **Botão "Remover Todas"**: Remove todas as turmas de uma vez
- **Confirmação**: Dialogs de confirmação para evitar remoções acidentais
- **Loading states**: Indicadores visuais durante as operações

### Configuração de Datas
- Campo de data/hora de início
- Campo de data/hora de término
- Validação automática (término > início)
- Cálculo e exibição do período total

### Estados de Loading
- Skeleton loaders durante carregamento das turmas
- Botão de loading durante aplicação
- Loading states individuais para remoção de turmas
- Feedback visual para todas as ações

## Validações

### Formulário
- Data de início é obrigatória
- Data de término é obrigatória
- Data de término deve ser posterior à data de início
- Pelo menos uma turma deve estar vinculada à avaliação

### API
- Tratamento de erros de rede
- Tratamento de erros de validação do backend
- Exibição de avisos quando aplicável

## Integração com Componentes Existentes

### ReadyEvaluations.tsx
O componente já está integrado e funcionando. A função `handleConfirmStartEvaluation` foi mantida para compatibilidade.

### ViewEvaluation.tsx
O componente já está integrado e funcionando. A função `handleConfirmStartEvaluation` foi mantida para compatibilidade.

## Fluxo de Uso

### Aplicar Avaliação
1. **Abrir Modal**: Usuário clica em "Aplicar Avaliação"
2. **Carregar Turmas**: Sistema busca automaticamente as turmas vinculadas à avaliação
3. **Visualizar Turmas**: Usuário vê quais turmas receberão a avaliação
4. **Configurar Datas**: Usuário define período de disponibilidade
5. **Aplicar**: Sistema envia dados para API (todas as turmas vinculadas)
6. **Feedback**: Sistema exibe resultado (sucesso/erro/avisos)
7. **Fechar**: Modal fecha e lista é atualizada

### Remover Turmas
1. **Remover Individual**: Clicar no "X" ao lado da turma → Confirmar → Remover
2. **Remover Todas**: Clicar em "Remover Todas" → Confirmar → Remover todas
3. **Feedback**: Sistema exibe resultado da remoção
4. **Atualização**: Lista de turmas é recarregada automaticamente

## Benefícios

- **Simplicidade**: Não precisa selecionar turmas novamente
- **Consistência**: Usa as turmas já vinculadas na criação da avaliação
- **Flexibilidade**: Permite remover turmas quando necessário
- **Controle**: Configuração precisa de datas de disponibilidade
- **Feedback**: Informações detalhadas sobre o resultado da operação
- **Validação**: Prevenção de erros com validação robusta
- **UX**: Interface intuitiva e responsiva

## Diferenças da Versão Anterior

- ❌ **Removido**: Seleção manual de turmas
- ✅ **Adicionado**: Busca automática das turmas vinculadas
- ✅ **Adicionado**: Funcionalidade de remoção de turmas
- ✅ **Adicionado**: Botões de remoção individual e em massa
- ✅ **Adicionado**: Dialogs de confirmação para remoções
- ✅ **Corrigido**: Rotas da API (singular vs plural)
- ✅ **Mantido**: Configuração de datas e validações
- ✅ **Mantido**: Integração com API e tratamento de erros
- ✅ **Melhorado**: Interface mais limpa e focada 