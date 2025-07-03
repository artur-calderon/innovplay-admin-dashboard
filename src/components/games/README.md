# Componentes de Jogos Educativos

Este diretório contém os componentes para gerenciamento e visualização de jogos educativos do Wordwall.

## Componentes

### WordwallGameForm
Componente para professores adicionarem jogos do Wordwall à plataforma.

**Funcionalidades:**
- Botão para criar novo jogo no Wordwall (abre em nova aba)
- Campo para colar URL de jogo existente
- Validação de URL do Wordwall
- Pré-visualização do jogo usando oEmbed API
- Salvamento do jogo no backend

**Uso:**
```jsx
import WordwallGameForm from '@/components/games/WordwallGameForm';

<WordwallGameForm />
```

### GamesList
Componente para alunos visualizarem jogos organizados por disciplina.

**Funcionalidades:**
- Lista de jogos com filtro por disciplina
- Cards com thumbnail e informações do jogo
- Navegação para página específica do jogo
- Estados de loading e erro

**Uso:**
```jsx
import GamesList from '@/components/games/GamesList';

<GamesList />
```

### GameView
Componente para exibir um jogo específico em tela cheia.

**Funcionalidades:**
- Exibição do jogo em iframe
- Informações detalhadas do jogo
- Navegação de volta à lista
- Instruções de como jogar

**Uso:**
```jsx
import GameView from '@/components/games/GameView';

<GameView />
```

## Rotas Configuradas

- `/app/jogos` - Gerenciamento de jogos (professores)
- `/aluno/jogos` - Lista de jogos (alunos)
- `/aluno/jogos/:id` - Visualização de jogo específico (alunos)

## API Endpoints

### POST /games
Salva um novo jogo no backend.

**Payload:**
```json
{
  "url": "https://wordwall.net/pt/resource/94433702/roleta",
  "title": "Título do Jogo",
  "iframeHtml": "<iframe>...</iframe>",
  "thumbnail": "https://...",
  "author": "Nome do Autor",
  "provider": "wordwall",
  "discipline": "Matemática"
}
```

### GET /games
Lista todos os jogos disponíveis.

### GET /games/:id
Obtém informações de um jogo específico.

## Dependências

- `lucide-react` - Ícones
- `@/lib/api` - Cliente HTTP
- `@/components/ui/*` - Componentes de UI
- `react-router-dom` - Navegação

## Notas Técnicas

- Todos os componentes são funcionais (hooks)
- Validação de URLs do Wordwall
- Tratamento de erros com mensagens amigáveis
- Estados de loading para melhor UX
- Responsivo para diferentes tamanhos de tela 