import type { NovaRespostaAPI } from "@/services/evaluation/evaluationResultsApi";
import type { RelatorioCompleto } from "@/types/evaluation-results";

export type Presentation19Mode = "answer_sheet" | "evaluations";

export type SlideQuestionRow = {
  questao: number;
  habilidade: string;
  percentualAcertos: number;
};

export type PresenceBySeriesRow = {
  serie: string;
  totalAlunos: number;
  totalPresentes: number;
  presencaMediaPct: number;
  alunosFaltosos: number;
  /** usado apenas para capa/labels quando necessário */
  turmaLabel?: string;
};

export type NiveisBySeriesRow = {
  serie: string;
  abaixoDoBasico: number;
  basico: number;
  adequado: number;
  avancado: number;
  total: number;
};

export type ProficiencyGeneralByTurmaRow = {
  turma: string;
  proficiencia: number;
};

export type ProficiencyByDisciplineByTurmaRow = {
  disciplina: string;
  valuesByTurma: Array<{ turma: string; proficiencia: number }>;
};

export type ProjectionTableRow = {
  disciplina: string;
  proficienciaDisciplina: number;
  projPlus20Disciplina: number;
  proficienciaGeral: number;
  projPlus20Geral: number;
};

export type Presentation19DeckData = {
  mode: Presentation19Mode;
  municipioNome: string;
  avaliacaoNome: string;
  escolasParticipantes: string[];

  totalAlunosParticiparam: number;

  /** Slide 4 */
  curso: string;
  serie: string;
  turma: string;

  /** Slides 5-6 */
  presencaPorSerie: PresenceBySeriesRow[];

  /** Slides 9-10 */
  niveisPorSerie: NiveisBySeriesRow[];

  /** Slides 12-14 */
  proficienciaGeralPorTurma: ProficiencyGeneralByTurmaRow[];
  proficienciaPorDisciplinaPorTurma: ProficiencyByDisciplineByTurmaRow[];
  projeccaoTabela: ProjectionTableRow[];

  /** Slides 18 */
  questoesTabela: SlideQuestionRow[];

  /** Slide 8 */
  levelGuide: Array<{
    label: string;
    description: string;
    color: string;
  }>;

  /** Metas/aux */
  primaryColor: string;
  logoDataUrl?: string;
  /** usado para capas dinâmicas 16-17 */
  serieNomeCapas: string;
  turmaNomeCapas: string;
};

export type BuildDeckDataArgs = {
  mode: Presentation19Mode;
  // O endpoint 1 (`relatorio-detalhado`) pode variar entre contratos no backend.
  // Para o deck, tratamos como parcial e usamos apenas as chaves existentes.
  relatorioDetalhado: Partial<RelatorioCompleto> | null;
  novaRespostaAgregados: NovaRespostaAPI | null;
  primaryColor: string;
  logoDataUrl?: string;
};

