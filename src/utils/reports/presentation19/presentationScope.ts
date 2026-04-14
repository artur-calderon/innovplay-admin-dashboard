import type { PresentationComparisonAxis } from "@/types/presentation19-slides";

export type PresentationScopeSelection = {
  school: string;
  serie: string;
  turma: string;
};

/** Deriva o eixo de comparação a partir dos filtros (mesma ideia do relatório escolar). */
export function deriveComparisonAxis(sel: PresentationScopeSelection): PresentationComparisonAxis {
  if (sel.turma !== "all") return "aluno";
  if (sel.serie !== "all") return "turma";
  if (sel.school !== "all") return "serie";
  return "escola";
}

export function comparisonAxisPresenceTitle(axis: PresentationComparisonAxis): string {
  switch (axis) {
    case "escola":
      return "Presença por escola";
    case "serie":
      return "Presença por série";
    case "turma":
      return "Presença por turma";
    case "aluno":
      return "Presença da turma";
    default:
      return "Presença";
  }
}

export function comparisonAxisLevelsTitle(axis: PresentationComparisonAxis): string {
  switch (axis) {
    case "escola":
      return "Níveis por escola";
    case "serie":
      return "Níveis por série";
    case "turma":
      return "Níveis por turma";
    case "aluno":
      return "Níveis dos alunos (agregado)";
    default:
      return "Níveis de aprendizagem";
  }
}

export function comparisonAxisProficiencyTitle(axis: PresentationComparisonAxis): string {
  switch (axis) {
    case "escola":
      return "Proficiência por escola";
    case "serie":
      return "Proficiência por série";
    case "turma":
      return "Proficiência por turma";
    case "aluno":
      return "Proficiência por aluno";
    default:
      return "Proficiência";
  }
}

export function comparisonColumnLabel(axis: PresentationComparisonAxis): string {
  switch (axis) {
    case "escola":
      return "Escola";
    case "serie":
      return "Série";
    case "turma":
      return "Turma";
    case "aluno":
      return "Aluno";
    default:
      return "Categoria";
  }
}

/** Sufixo do escopo em títulos de slide (maiúsculas), alinhado ao eixo de comparação. */
export function presentationScopeSuffixUpper(axis: PresentationComparisonAxis): string {
  switch (axis) {
    case "escola":
      return "POR ESCOLA";
    case "serie":
      return "POR SÉRIE";
    case "turma":
      return "POR TURMA";
    case "aluno":
      return "POR ALUNO";
    default:
      return "";
  }
}

/** Presença no eixo `aluno`: agregado da turma (não “por aluno” na presença). */
function presentationPresenceScopeUpper(axis: PresentationComparisonAxis): string {
  if (axis === "aluno") return "DA TURMA";
  return presentationScopeSuffixUpper(axis);
}

export function presentationTitleTablePresence(axis: PresentationComparisonAxis): string {
  return `TABELA DE PRESENÇA — ${presentationPresenceScopeUpper(axis)}`;
}

export function presentationTitleChartPresence(axis: PresentationComparisonAxis): string {
  return `GRÁFICO DE PRESENÇA — ${presentationPresenceScopeUpper(axis)}`;
}

export function presentationTitleTableLevels(axis: PresentationComparisonAxis): string {
  return `TABELA DE NÍVEIS — ${presentationScopeSuffixUpper(axis)}`;
}

export function presentationTitleChartLevels(axis: PresentationComparisonAxis): string {
  return `GRÁFICO DE NÍVEIS — ${presentationScopeSuffixUpper(axis)}`;
}

export function presentationTitleTableGrades(axis: PresentationComparisonAxis): string {
  return `TABELA DE NOTAS — ${presentationScopeSuffixUpper(axis)}`;
}

export function presentationTitleChartGrades(axis: PresentationComparisonAxis): string {
  return `GRÁFICO DE NOTAS — ${presentationScopeSuffixUpper(axis)}`;
}

/** Gráfico de proficiência geral (uma barra por categoria do eixo). */
export function presentationTitleProficiencyGeneralChart(axis: PresentationComparisonAxis): string {
  if (axis === "aluno") return "PROFICIÊNCIA — POR ALUNO";
  return `PROFICIÊNCIA GERAL — ${presentationScopeSuffixUpper(axis)}`;
}

export function presentationTitleProficiencyByDiscipline(axis: PresentationComparisonAxis): string {
  return `PROFICIÊNCIA POR DISCIPLINA — ${presentationScopeSuffixUpper(axis)}`;
}

export function presentationSectionLevels(axis: PresentationComparisonAxis): string {
  return `NÍVEIS DE APRENDIZAGEM — ${presentationScopeSuffixUpper(axis)}`;
}

export function presentationSectionProficiency(axis: PresentationComparisonAxis): string {
  return `PROFICIÊNCIAS — ${presentationScopeSuffixUpper(axis)}`;
}

export function presentationSectionGrades(axis: PresentationComparisonAxis): string {
  return `NOTAS — ${presentationScopeSuffixUpper(axis)}`;
}

export function presentationSectionGradesTagline(axis: PresentationComparisonAxis): string {
  switch (axis) {
    case "escola":
      return "Médias e comparação — por escola";
    case "serie":
      return "Médias e comparação — por série";
    case "turma":
      return "Médias e comparação — por turma";
    case "aluno":
      return "Médias e comparação — por aluno";
    default:
      return "Médias e comparação";
  }
}

/** Slides de ranking/detalhe (eixo aluno). */
export function presentationTitleTableStudents(): string {
  return "TABELA DE ALUNOS — POR ALUNO";
}

export function presentationSectionStudentsTitle(): string {
  return "ALUNOS — DETALHES POR ALUNO";
}

export function presentationSectionQuestionsTitle(): string {
  return "QUESTÕES — ANÁLISE POR HABILIDADE";
}

export function presentationSectionQuestionsTagline(): string {
  return "Percentual de acerto por questão e habilidade";
}

/** Capa antes da tabela de questões de uma turma (cartão-resposta / tabela detalhada). */
export function presentationQuestionsTurmaCoverLine(serieLabel: string, turmaNome: string): string {
  return `Tabela de questões — ${serieLabel} — ${turmaNome}`;
}

/** Subtítulo de capítulo quando o slide usa duas linhas (PPTX / preview). */
export function presentationSectionProficiencyTagline(axis: PresentationComparisonAxis): string {
  switch (axis) {
    case "escola":
      return "Proficiência geral e por disciplina — por escola";
    case "serie":
      return "Proficiência geral e por disciplina — por série";
    case "turma":
      return "Proficiência geral e por disciplina — por turma";
    case "aluno":
      return "Proficiência geral e por disciplina — por aluno";
    default:
      return "Proficiência geral e por disciplina";
  }
}

export function presentationSectionLevelsTagline(axis: PresentationComparisonAxis): string {
  switch (axis) {
    case "escola":
      return "Distribuição dos níveis de aprendizagem — por escola";
    case "serie":
      return "Distribuição dos níveis de aprendizagem — por série";
    case "turma":
      return "Distribuição dos níveis de aprendizagem — por turma";
    case "aluno":
      return "Distribuição dos níveis de aprendizagem — por aluno";
    default:
      return comparisonAxisLevelsTitle(axis);
  }
}
