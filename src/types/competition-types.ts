/**
 * Tipos e Interfaces para o Sistema de Competições
 */

// ========================================
// TIPOS BASE
// ========================================

export type CompetitionStatus = 'agendada' | 'aberta' | 'em_andamento' | 'finalizada';
export type CompetitionDifficulty = 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
export type QuestionSelectionMode = 'manual' | 'automatico';

// ========================================
// INTERFACE PRINCIPAL DE COMPETIÇÃO
// ========================================

export interface Competition {
  id: string;
  titulo: string;
  // Compatibilidade: backend pode retornar 'title' também
  title?: string;
  disciplina_id: string;
  disciplina_nome?: string;
  // Compatibilidade: backend pode retornar 'subject' também
  subject?: string;
  data_inicio: string;
  data_fim: string;
  // Compatibilidade: backend pode retornar 'time_limit' e 'end_time' também
  time_limit?: string;
  end_time?: string;
  duracao: number; // em minutos
  duration?: number; // compatibilidade
  max_participantes: number;
  participantes_atual?: number;
  recompensas: CompetitionRewards;
  turmas: string[];
  classes?: string[]; // compatibilidade
  questoes: string[];
  questions?: string[]; // compatibilidade
  status: CompetitionStatus;
  
  // Campos opcionais para exibição
  nivel?: string;
  escola?: string;
  municipio?: string;
  estado?: string;
  dificuldade?: CompetitionDifficulty | CompetitionDifficulty[];
  total_questoes?: number;
  icone?: string;
  cor?: string;
  descricao?: string;
  description?: string; // compatibilidade
  instrucoes?: string; // Instruções especiais para alunos
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  
  // Campos adicionais para listagem de competições disponíveis
  inscrito?: boolean;
  enrollment_status?: string | null;
}

// ========================================
// RECOMPENSAS
// ========================================

export interface CompetitionRewards {
  ouro: number;    // 1º lugar
  prata: number;   // 2º lugar
  bronze: number;  // 3º lugar
  participacao: number; // Recompensa por participação (obrigatório)
  // Opcionais para premiação estendida
  quarto?: number;
  quinto?: number;
}

// ========================================
// FORMULÁRIO DE CRIAÇÃO
// ========================================

export interface CompetitionFormData {
  titulo: string;
  disciplina_id: string;
  dataInicio: Date;
  dataFim: Date;
  duracao: number; // minutos
  maxParticipantes: number;
  recompensas: CompetitionRewards;
  turmas: string[]; // IDs das turmas selecionadas
  questoes: string[]; // IDs das questões (se manual)
  modo_selecao: QuestionSelectionMode;
  quantidade_questoes?: number; // Se automático
  dificuldades?: CompetitionDifficulty[]; // Níveis de dificuldade selecionados (pode ser múltiplos)
  serie_id?: string; // Filtro opcional para questões automáticas
  descricao?: string;
  // Campos adicionais
  instrucoes?: string; // Instruções especiais para alunos
  icone?: string; // Ícone/emoji personalizado
  cor?: string; // Cor personalizada (hex)
}

// ========================================
// STATUS DE INSCRIÇÃO
// ========================================

export interface CompetitionEnrollmentStatus {
  is_enrolled: boolean;
  enrollment_id?: string;
  enrolled_at?: string;
  can_enroll: boolean;
  reason?: string; // Motivo se não puder inscrever
  has_started?: boolean;
  has_finished?: boolean;
  result?: CompetitionResult;
}

// ========================================
// SESSÃO DE COMPETIÇÃO (EXECUÇÃO)
// ========================================

export interface CompetitionSession {
  session_id: string;
  competition_id: string;
  student_id: string;
  started_at: string;
  expires_at: string;
  time_limit_minutes: number;
  remaining_time_minutes: number;
  questions: CompetitionQuestion[];
  total_questions: number;
  current_answers?: Record<string, string>; // question_id -> answer
}

export interface CompetitionQuestion {
  id: string;
  numero: number;
  texto: string;
  texto_formatado?: string;
  alternativas: CompetitionAlternative[];
  disciplina?: string;
  habilidade?: string;
  codigo_habilidade?: string;
  dificuldade?: CompetitionDifficulty;
  valor?: number; // Pontuação da questão
  imagem_url?: string;
}

export interface CompetitionAlternative {
  id: string;
  letra: string; // A, B, C, D, E
  texto: string;
  is_correct?: boolean; // Só disponível após submissão
}

// ========================================
// RESPOSTAS E SUBMISSÃO
// ========================================

export interface CompetitionAnswer {
  question_id: string;
  answer: string; // letra ou id da alternativa
  answered_at?: string;
}

export interface CompetitionSubmitResponse {
  success: boolean;
  score: number; // Nota de 0 a 10
  proficiencia?: number;
  ranking_position: number;
  total_participants: number;
  coins_earned: number;
  correct_answers: number;
  wrong_answers: number;
  blank_answers: number;
  total_questions: number;
  time_spent: number; // segundos
  classificacao?: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
  
  // Detalhamento por questão (opcional)
  questions_feedback?: Array<{
    question_id: string;
    question_numero: number;
    is_correct: boolean;
    correct_answer?: string;
    student_answer?: string;
  }>;
}

// ========================================
// RESULTADOS
// ========================================

export interface CompetitionResult {
  id: string;
  competition_id: string;
  student_id: string;
  student_name: string;
  turma: string;
  escola: string;
  serie?: string;
  
  // Pontuação
  nota: number;
  proficiencia?: number;
  classificacao?: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
  
  // Estatísticas
  acertos: number;
  erros: number;
  em_branco: number;
  total_questoes: number;
  percentual_acertos: number;
  
  // Ranking
  posicao: number;
  moedas_ganhas: number;
  
  // Tempo
  tempo_gasto: number; // segundos
  
  // Timestamps
  started_at?: string;
  finished_at?: string;
}

export interface CompetitionRanking {
  aluno_id: string;
  aluno_nome: string;
  turma: string;
  escola: string;
  serie?: string;
  nota: number;
  proficiencia?: number;
  classificacao?: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
  acertos: number;
  total_questoes: number;
  percentual_acertos: number;
  posicao: number;
  moedas_ganhas: number;
  tempo_gasto: number;
}

// ========================================
// RESPOSTA DE RESULTADOS COMPLETA
// ========================================

// Estrutura documentada (backend retorna)
export interface CompetitionResultsResponseBackend {
  disciplinas: Array<{
    id: string;
    nome: string;
    questoes: Array<{
      numero: number;
      habilidade?: string;
      codigo_habilidade?: string;
      question_id: string;
    }>;
    alunos: Array<{
      id: string;
      nome: string;
      escola: string;
      serie: string;
      turma: string;
      respostas_por_questao: Array<{
        questao: number;
        acertou: boolean;
        respondeu: boolean;
        resposta: string;
      }>;
      total_acertos: number;
      total_erros: number;
      total_respondidas: number;
      total_questoes_disciplina: number;
      total_em_branco: number;
      nivel_proficiencia: string;
      nota: number;
      proficiencia: number;
      status: string;
      percentual_acertos: number;
      posicao: number;
      moedas_ganhas: number;
      tempo_gasto: number;
    }>;
  }>;
  geral: {
    alunos: Array<{
      id: string;
      nome: string;
      escola: string;
      serie: string;
      turma: string;
      nota_geral: number;
      proficiencia_geral: number;
      nivel_proficiencia_geral: string;
      total_acertos_geral: number;
      total_questoes_geral: number;
      total_respondidas_geral: number;
      total_em_branco_geral: number;
      percentual_acertos_geral: number;
      status_geral: string;
      posicao: number;
      moedas_ganhas: number;
      tempo_gasto: number;
    }>;
  };
}

// Estrutura atual (compatibilidade)
export interface CompetitionResultsResponse {
  competicao?: Competition;
  estatisticas?: {
    total_inscritos: number;
    total_participantes: number;
    total_finalizados: number;
    media_nota: number;
    media_proficiencia?: number;
    media_tempo: number; // segundos
    maior_nota: number;
    menor_nota: number;
    desvio_padrao?: number;
    distribuicao_classificacao?: {
      abaixo_do_basico: number;
      basico: number;
      adequado: number;
      avancado: number;
    };
  };
  ranking?: CompetitionRanking[];
  estatisticas_por_questao?: Array<{
    questao_numero: number;
    questao_id: string;
    percentual_acertos: number;
    total_respostas: number;
    habilidade?: string;
    codigo_habilidade?: string;
  }>;
  top_3?: {
    primeiro?: CompetitionRanking;
    segundo?: CompetitionRanking;
    terceiro?: CompetitionRanking;
  };
  // Campos da estrutura documentada
  disciplinas?: CompetitionResultsResponseBackend['disciplinas'];
  geral?: CompetitionResultsResponseBackend['geral'];
}

// ========================================
// FILTROS
// ========================================

export interface CompetitionFilters {
  status?: CompetitionStatus;
  disciplina_id?: string;
  escola_id?: string;
  municipio_id?: string;
  estado_id?: string;
  data_inicio_from?: string;
  data_inicio_to?: string;
}

// ========================================
// GERAÇÃO AUTOMÁTICA DE QUESTÕES
// ========================================

export interface GenerateQuestionsParams {
  disciplina_id: string;
  quantidade: number;
  dificuldades?: CompetitionDifficulty[]; // Níveis de dificuldade (pode ser múltiplos)
  serie_id?: string;
  habilidades?: string[]; // Filtrar por habilidades específicas
}

export interface GenerateQuestionsResponse {
  question_ids: string[];
  total_generated: number;
  questions_preview?: Array<{
    id: string;
    titulo: string;
    dificuldade: string;
  }>;
}

// ========================================
// VERIFICAÇÃO DE INÍCIO
// ========================================

export interface CanStartResponse {
  // Backend retorna 'pode_iniciar', mas mantemos 'can_start' para compatibilidade
  pode_iniciar?: boolean;
  can_start: boolean;
  // Backend retorna 'motivo', mas mantemos 'reason' para compatibilidade
  motivo?: string;
  reason?: string;
  starts_at?: string; // Se não pode iniciar ainda
  competition_data?: {
    titulo: string;
    duracao: number;
    total_questoes: number;
    recompensas: CompetitionRewards;
    descricao?: string;
  };
}

// ========================================
// TIPOS DE RESPOSTA COM WRAPPER
// ========================================

export interface ApiResponse<T> {
  mensagem?: string;
  message?: string; // compatibilidade
  data: T;
  erro?: string;
  error?: string; // compatibilidade
}

export interface EnrollmentResponse {
  mensagem?: string;
  message?: string; // compatibilidade
  data: {
    enrollment_id?: string;
  };
}

// ========================================
// TURMAS PARA SELEÇÃO
// ========================================

export interface ClassForSelection {
  id: string;
  nome: string;
  serie: string;
  escola: string;
  escola_id: string;
  total_alunos: number;
  municipio?: string;
  estado?: string;
}

// ========================================
// HISTÓRICO DE MOEDAS
// ========================================

export interface RewardHistoryItem {
  competition_id: string;
  competition_titulo: string;
  posicao: number;
  moedas: number;
  data: string;
}

// ========================================
// TIPOS AUXILIARES PARA UI
// ========================================

export type CompetitionCardStatus = 'disponivel' | 'inscrito' | 'em_andamento' | 'finalizado' | 'aguardando';

export interface CompetitionCardData extends Competition {
  // Campos computados para exibição no card
  cardStatus: CompetitionCardStatus;
  tempoRestante?: string;
  podeInscrever: boolean;
  podeIniciar: boolean;
  jaParticipou: boolean;
  minhaPosicao?: number;
  minhasMoedas?: number;
}

// ========================================
// PROPS DOS COMPONENTES
// ========================================

export interface CompetitionAdminPanelProps {
  onSuccess?: (competition: Competition) => void;
  onCancel?: () => void;
  editingCompetition?: Competition;
}

export interface ClassSelectorProps {
  open: boolean;
  onClose: () => void;
  selectedClasses: string[];
  onClassesSelected: (classIds: string[]) => void;
  filterBySchool?: string;
  filterByGrade?: string;
}

export interface CompetitionEnrollmentProps {
  competition: Competition;
  onEnrolled?: () => void;
  onStarted?: () => void;
}

export interface CompetitionResultsCardsProps {
  competitions: Competition[];
  onViewResults?: (competitionId: string) => void;
}

