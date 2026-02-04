## Etapa 2 - Frontend: CRUD de Competições (Admin) e Configuração de Aleatorização

### 1. Objetivo da Etapa

- **Construir a interface de administração de competições**, permitindo:
  - Listar, filtrar e visualizar competições.
  - Criar e editar competições (wizard em múltiplas etapas).
  - Publicar e cancelar competições.
  - Configurar de forma clara as **regras de seleção de questões** (`question_rules`) quando o modo for `auto_random`.

- **Perfil alvo**: usuários com papel `admin` ou `coordenador`.
- **Escopo desta etapa**: foco no CRUD; **inscrição de alunos e ranking vêm em etapas posteriores**.

---

### 2. Rotas e Arquitetura de Páginas

#### 2.1. Rotas principais

- `/admin/competitions`
  - Página de listagem e ações principais.

- (Opcional) `/admin/competitions/:id/edit`
  - Página dedicada de edição avançada (pode ser substituída por modal).

#### 2.2. Arquivos sugeridos

- `src/pages/Admin/Competitions/CompetitionList.tsx`
- `src/pages/Admin/Competitions/CreateCompetitionModal.tsx`
- (Opcional) `src/pages/Admin/Competitions/EditCompetitionPage.tsx`
- Componentes de apoio:
  - `src/pages/Admin/Competitions/CompetitionCard.tsx`
  - `src/pages/Admin/Competitions/CompetitionFilters.tsx`

---

### 3. CompetitionList (Admin)

#### 3.1. Responsabilidades

- Exibir lista de competições retornadas de `GET /competitions/`.
- Controlar filtros (status, disciplina, nível, período, página).
- Permitir ações rápidas:
  - Criar nova competição (abre `CreateCompetitionModal`).
  - Editar competição existente.
  - Publicar competição.
  - Cancelar competição.

#### 3.2. Estrutura de estado

```typescript
const [competitions, setCompetitions] = useState<CompetitionSummary[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const [filters, setFilters] = useState({
  status: 'all',
  subject_id: '',
  level: '',
  from_date: null,
  to_date: null,
});

const [pagination, setPagination] = useState({
  page: 1,
  pageSize: 20,
  total: 0,
});

const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
const [editingCompetitionId, setEditingCompetitionId] = useState<string | null>(null);
```

#### 3.3. Fluxo de dados

- `useEffect` observando `filters` e `pagination`:
  - Chamar `apiClient.get('/competitions/', { params: { ...filters, page, page_size } })`.
  - Preencher `competitions` e `pagination.total`.

- Ações:
  - **Nova competição**:
    - `setEditingCompetitionId(null); setIsCreateModalOpen(true);`
  - **Editar**:
    - `setEditingCompetitionId(competition.id); setIsCreateModalOpen(true);`
  - **Publicar**:
    - Confirm dialog → `POST /competitions/:id/publish` → atualizar lista.
  - **Cancelar**:
    - Confirm dialog (opção de texto com motivo) → `POST /competitions/:id/cancel` → atualizar lista.

---

### 4. CreateCompetitionModal (Wizard)

#### 4.1. Visão geral

- Componente em forma de **wizard de 5 passos**:
  1. Informações básicas.
  2. Datas.
  3. Questões / Aleatorização.
  4. Recompensas.
  5. Configurações avançadas.

- Funciona em dois modos:
  - **Criação**: sem `editingCompetitionId`.
  - **Edição**: com `editingCompetitionId` (carrega dados iniciais e adapta comportamentos).

#### 4.2. Estrutura do estado do formulário

```typescript
type QuestionMode = 'auto_random' | 'manual';

interface QuestionRules {
  num_questions: number;
  grade_filter: {
    grade_ids?: string[];
    min_grade_level?: number;
    max_grade_level?: number;
  };
  difficulty_filter: {
    levels?: ('easy' | 'medium' | 'hard')[];
  };
  tags_filter?: string[];
  allow_repeated_questions?: boolean;
  random_seed?: number | null;
  strategy?: 'uniform';
}

interface RewardRange {
  position_from: number;
  position_to: number;
  coins: number;
}

interface RewardConfig {
  participation_coins: number;
  ranking: RewardRange[];
}

interface CompetitionFormData {
  name: string;
  description: string;
  subject_id: string;
  level: number | string;
  scope: 'individual' | 'turma' | 'escola' | 'rede';
  scope_filter: Record<string, any> | null;

  enrollment_start: string;
  enrollment_end: string;
  application: string;
  expiration: string;
  timezone: string;

  question_mode: QuestionMode;
  question_rules: QuestionRules;

  reward_config: RewardConfig;

  ranking_criteria: string;
  ranking_tiebreaker: string;
  ranking_visibility: 'final' | 'realtime' | 'none';

  max_participants?: number | null;
  recurrence: 'manual';
}
```

#### 4.3. Passo 1 – Informações básicas

- **Campos**:
  - `name`, `description`
  - `subject_id` (select/autocomplete de disciplinas)
  - `level` (select de ano/série)
  - `scope` (por enquanto pode fixar `individual` se filtros ainda não estiverem prontos)

- **Validação**:
  - `name` obrigatório.
  - `subject_id` obrigatório.
  - `level` obrigatório.

#### 4.4. Passo 2 – Datas

- **Campos**:
  - `enrollment_start`, `enrollment_end`, `application`, `expiration` (datetime-local).
  - `timezone` (`America/Sao_Paulo` como default).

- **Validação de front** (espelha backend):
  - `enrollment_start < enrollment_end < application < expiration`.
  - Exibir mensagens de erro inline e bloquear avanço para próximo passo se inválido.

#### 4.5. Passo 3 – Questões / Aleatorização

- **Modo de seleção**:
  - Toggle/Radio:
    - `Aleatória (auto_random)`
    - `Manual`

- **Se `question_mode === 'auto_random'`**:
  - **Bloco Quantidade**:
    - Campo `question_rules.num_questions` (inteiro, mínimo 1).

  - **Bloco Filtros por série/ano**:
    - Multi-select `grade_ids` OR campos numéricos `min_grade_level` / `max_grade_level`.
    - Definir uma abordagem simples inicialmente (por exemplo só `grade_ids`).

  - **Bloco Dificuldade**:
    - Checkboxes: Fácil/Mediana/Difícil (`easy`, `medium`, `hard`).

  - **Bloco Tags (opcional)**:
    - Multi-select de tags de conteúdo/habilidades se backend oferecer.

  - **Bloco Avançado (colapsável)**:
    - Checkbox `allow_repeated_questions`.
    - Campo `random_seed` opcional.

- **Se `question_mode === 'manual'`**:
  - Mostrar texto explicativo:
    - Ex.: “As questões serão vinculadas manualmente em outra tela. Nesta etapa, apenas definimos metadados/datas.”

- **Validação de front**:
  - `num_questions >= 1`.
  - Se nenhum filtro for selecionado, exibir alerta mas permitir (aleatório total), ou forçar pelo menos uma dimensão (decisão de produto).
  - Mapear erros vindos do backend (ex.: “Questões insuficientes...”) para avisos visíveis neste passo.

#### 4.6. Passo 4 – Recompensas

- **Campos**:
  - `reward_config.participation_coins` (inteiro >= 0).
  - Lista editável `reward_config.ranking`:
    - Cada linha: `position_from`, `position_to`, `coins`.

- **UI**:
  - Tabela com linhas:
    - Exemplo inicial:
      - `1º lugar: 100 moedas`
      - `2º–3º lugar: 60 moedas`
  - Botão “Adicionar faixa”.

- **Validação de front (básica)**:
  - `coins > 0`.
  - `position_from >= 1`.
  - `position_to >= position_from`.
  - Não obrigar validação de sobreposição perfeita no front (backend fará validação mais forte).

#### 4.7. Passo 5 – Configurações avançadas

- **Campos**:
  - `ranking_criteria` (ex.: `nota`).
  - `ranking_tiebreaker` (ex.: `tempo_entrega`).
  - `ranking_visibility` (`final`, `realtime`, `none`).
  - `max_participants` (opcional; `null` = ilimitado).
  - `recurrence` (nesta etapa, apenas `manual`).

- **Ações**:
  - Botões:
    - `Voltar`, `Próximo` (nos passos intermediários).
    - `Criar competição` (no último passo).

#### 4.8. Submissão

- **Criação**:
  - `POST /competitions/` com `formData` convertido para o formato esperado pelo backend (datas para ISO).
  - Em caso de sucesso:
    - Fechar modal.
    - Disparar `onSuccess()` para recarregar lista.

- **Edição**:
  - `PUT /competitions/:id`:
    - Carregar dados iniciais com `GET /competitions/:id` ao abrir modal em modo edição.
    - Preencher `formData` e permitir edição conforme regras de status (bloquear campos se `status != 'rascunho'`).

- **Tratamento de erros**:
  - Erros de validação (`400`) com mensagem → exibir toast + highlight no passo correspondente.
  - Erros genéricos (`500`) → toast padrão (“Erro ao salvar competição”).

---

### 5. Integração com Endpoints de Publicação e Cancelamento

#### 5.1. Publicar competição

- Botão “Publicar” em cada card/linha de `CompetitionList` quando `status === 'rascunho'`.
- Fluxo:
  1. Mostrar `ConfirmDialog` com resumo da competição.
  2. Chamar `POST /competitions/:id/publish`.
  3. Em sucesso:
     - Toast “Competição publicada com sucesso!”.
     - Recarregar lista.
  4. Em erro:
     - Exibir mensagem vinda do backend (ex.: “Test não foi criado ainda” / “Datas inválidas” / “Configuração de recompensas ausente”).

#### 5.2. Cancelar competição

- Botão “Cancelar” quando `status === 'aberta'`.
- Fluxo semelhante:
  - `POST /competitions/:id/cancel` (com corpo opcional `reason`).
  - Atualizar status na lista.

---

### 6. Organização Visual e UX

- **Lista de competições**
  - Colunas:
    - Nome, Disciplina, Nível.
    - Período de inscrição.
    - Status (com `badge` de cor).
    - Vagas (`available_slots` / `max_participants` se disponível).
    - Ações (Ver, Editar, Publicar, Cancelar).

- **Filtros**
  - Barra de filtros fixada no topo da página:
    - `Status`: Todos / Rascunho / Abertas / Canceladas.
    - `Disciplina`: select/autocomplete.
    - `Nível`: select de séries/ano.
    - Período (data de aplicação).

- **Wizard**
  - Stepper visual no topo do modal, marcando os cinco passos.
  - Indicar claramente erros no passo correspondente antes de permitir avançar.
  - Botões “Voltar”/“Próximo” sempre visíveis no rodapé.

---

### 7. Checklist Detalhado da Etapa 2 (Frontend)

- **CompetitionList**
  - [ ] Implementar chamada a `GET /competitions/` com filtros e paginação.
  - [ ] Implementar UI de filtros com atualização automática (com debounce simples).
  - [ ] Implementar grid/tabela de competições com colunas e status.
  - [ ] Implementar ações “Nova competição”, “Editar”, “Publicar” e “Cancelar”.

- **CreateCompetitionModal**
  - [ ] Implementar estrutura de wizard (5 passos) com stepper visual.
  - [ ] Implementar passo 1 (informações básicas) com validação.
  - [ ] Implementar passo 2 (datas) com validação encadeada.
  - [ ] Implementar passo 3 (questões/aleatorização) espelhando o contrato de `question_rules`.
  - [ ] Implementar passo 4 (recompensas) com lista de faixas de ranking.
  - [ ] Implementar passo 5 (configurações avançadas).
  - [ ] Integrar submissão de criação (`POST /competitions/`).
  - [ ] Integrar modo edição (`GET /competitions/:id` + `PUT /competitions/:id`).
  - [ ] Mapear erros de backend para mensagens claras no modal.

- **Integração e UX**
  - [ ] Fechar modal e recarregar lista após criação/edição bem-sucedida.
  - [ ] Mostrar toasts de sucesso/erro para operações de criar/editar/publicar/cancelar.
  - [ ] Garantir que botões de ação respeitam permissões (admin/coordenador).

