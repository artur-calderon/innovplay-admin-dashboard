# Sistema de Avaliações/Provas

Este componente implementa um sistema completo de provas/avaliações com integração com APIs backend, controle de tempo, auto-save e interface responsiva.

## 🎯 Funcionalidades Principais

### 1. **Fluxo Completo de Avaliação**
- **Tela de Instruções**: Informações do teste, tempo limite, número de questões
- **Tela da Prova**: Interface para responder questões com timer em tempo real
- **Tela de Resultados**: Nota final, acertos, conceito e opção de impressão

### 2. **Controle de Tempo**
- Timer countdown em tempo real
- Alertas quando restam 5 minutos
- Auto-finalização quando tempo expira
- Verificação periódica do status da sessão (a cada 30s)

### 3. **Auto-save Inteligente**
- Salva respostas automaticamente a cada mudança
- Debounce de 2 segundos para evitar muitas requisições
- Indicador visual de "salvando..."
- Backup no localStorage

### 4. **Tipos de Questões Suportados**
- **Múltipla Escolha**: Uma opção correta
- **Verdadeiro/Falso**: Resposta binária
- **Múltipla Resposta**: Várias opções corretas
- **Dissertativa**: Texto livre

## 🏗️ Arquitetura

### Estrutura de Arquivos
```
src/
├── components/evaluations/TakeEvaluation/
│   ├── index.tsx              # Componente principal
│   └── README.md              # Esta documentação
├── hooks/
│   └── useEvaluation.ts       # Hook personalizado para lógica
├── services/
│   └── evaluationApi.ts       # Serviço para APIs
└── types/
    └── evaluation-types.ts    # Interfaces TypeScript
```

### Estados da Avaliação
```typescript
type EvaluationState = 
  | 'loading'      // Carregando dados
  | 'instructions' // Tela de instruções
  | 'active'       // Prova em andamento
  | 'completed'    // Prova finalizada
  | 'expired'      // Tempo esgotado
  | 'error'        // Erro no carregamento
```

## 🔌 Integração com APIs

### Endpoints Utilizados

#### 1. **Iniciar Sessão**
```typescript
POST /student-answers/sessions/start
{
  "student_id": "uuid",
  "test_id": "uuid", 
  "time_limit_minutes": 60
}
```

#### 2. **Verificar Status**
```typescript
GET /student-answers/sessions/{session_id}/status
```

#### 3. **Salvar Respostas Parciais**
```typescript
POST /student-answers/save-partial
{
  "session_id": "uuid",
  "answers": [
    {
      "question_id": "uuid",
      "answer": "resposta"
    }
  ]
}
```

#### 4. **Finalizar Prova**
```typescript
POST /student-answers/submit
{
  "session_id": "uuid",
  "answers": [...]
}
```

## 🎨 Interface do Usuário

### Tela de Instruções
- Informações do teste (título, disciplina, tempo)
- Número total de questões
- Instruções específicas
- Botão para iniciar avaliação

### Tela da Prova
- **Header Fixo**: Timer, progresso, indicador de salvamento
- **Navegação Lateral**: Botões numerados para cada questão
- **Área Principal**: Questão atual com opções de resposta
- **Navegação**: Botões anterior/próxima

### Tela de Resultados
- Nota final em porcentagem
- Número de acertos/total
- Conceito (se disponível)
- Opções para voltar ou imprimir

## ⚙️ Configuração

### Variáveis de Ambiente
```env
VITE_API_BASE_URL=http://localhost:5000
```

### Dependências
```json
{
  "react": "^18.x",
  "react-router-dom": "^6.x",
  "lucide-react": "^0.x",
  "axios": "^1.x"
}
```

## 🚀 Como Usar

### 1. **Importar o Componente**
```tsx
import TakeEvaluation from '@/components/evaluations/TakeEvaluation';
```

### 2. **Configurar Rota**
```tsx
<Route path="/avaliacao/:evaluationId" element={<TakeEvaluation />} />
```

### 3. **Acessar via URL**
```
/app/avaliacao/123e4567-e89b-12d3-a456-426614174000
```

## 🔧 Funcionalidades Técnicas

### Auto-save
- Salva automaticamente a cada mudança de resposta
- Debounce de 2 segundos
- Backup no localStorage
- Indicador visual de salvamento

### Controle de Tempo
- Timer countdown em tempo real
- Verificação periódica do status (30s)
- Auto-finalização quando expira
- Alertas de tempo acabando

### Tratamento de Erros
- Sessão expirada (410)
- Erro de rede
- Validação de dados
- Fallback para dados mock

### Recuperação de Sessão
- Verifica sessão existente no localStorage
- Recupera respostas salvas
- Continua de onde parou

## 🎯 Casos de Uso

### 1. **Primeira Acesso**
1. Usuário acessa URL da avaliação
2. Sistema carrega dados do teste
3. Mostra tela de instruções
4. Usuário clica "Iniciar Avaliação"
5. Sistema cria sessão no backend
6. Redireciona para tela da prova

### 2. **Recarregamento da Página**
1. Usuário recarrega durante a prova
2. Sistema verifica localStorage
3. Recupera sessão do backend
4. Restaura respostas salvas
5. Continua de onde parou

### 3. **Tempo Esgotado**
1. Timer chega a zero
2. Sistema mostra alerta
3. Auto-finaliza após 3 segundos
4. Envia respostas para backend
5. Mostra tela de resultados

### 4. **Finalização Manual**
1. Usuário clica "Enviar Avaliação"
2. Sistema mostra confirmação
3. Envia respostas para backend
4. Mostra tela de resultados
5. Limpa dados locais

## 🔒 Segurança

### Validações
- Verificação de sessão ativa
- Validação de tempo restante
- Prevenção de múltiplas submissões
- Sanitização de dados

### Proteções
- Não permite navegar durante submissão
- Confirmação antes de sair
- Backup local de respostas
- Tratamento de erros de rede

## 📱 Responsividade

### Desktop
- Layout em grid com navegação lateral
- Timer e progresso no header
- Botões grandes para navegação

### Mobile
- Layout adaptativo
- Navegação por swipe
- Botões otimizados para touch
- Timer sempre visível

## 🧪 Testes

### Cenários de Teste
1. **Fluxo Completo**: Iniciar → Responder → Finalizar
2. **Recarregamento**: Testar recuperação de sessão
3. **Tempo Esgotado**: Verificar auto-finalização
4. **Erro de Rede**: Testar fallbacks
5. **Múltiplas Abas**: Prevenir conflitos

### Dados Mock
```typescript
const mockData: TestData = {
  id: "test-1",
  title: "Avaliação de Matemática - 1º Bimestre",
  subject: { id: "math", name: "Matemática" },
  duration: 60,
  totalQuestions: 5,
  instructions: "Leia atentamente cada questão...",
  questions: [...]
};
```

## 🔄 Atualizações Futuras

### Melhorias Planejadas
- [ ] Suporte a imagens nas questões
- [ ] Modo offline com sincronização
- [ ] Relatórios detalhados
- [ ] Integração com LMS
- [ ] Suporte a áudio/vídeo
- [ ] Modo de revisão
- [ ] Exportação de resultados

### Otimizações
- [ ] Lazy loading de questões
- [ ] Cache inteligente
- [ ] Compressão de dados
- [ ] WebSocket para tempo real
- [ ] Service Worker para offline

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs do console
2. Testar com dados mock
3. Verificar conectividade com API
4. Validar formato dos dados

---

**Desenvolvido para o sistema Afirme Play Admin Dashboard** 