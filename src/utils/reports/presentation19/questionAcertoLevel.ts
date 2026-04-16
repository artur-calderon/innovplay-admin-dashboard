import type { ProficiencyLevel } from "@/components/evaluations/results/utils/proficiency";
import { getProficiencyLevel, getProficiencyTableInfo } from "@/components/evaluations/results/utils/proficiency";

/**
 * Classifica o % de acertos da questão nos 4 níveis, usando a mesma tabela de faixas da série/disciplina
 * (valor convertido para a escala 0–maxProficiência antes de comparar aos intervalos).
 */
export function classifyQuestionAcertoToLevel(
  percentualAcertos: number,
  serieLabel?: string,
  disciplina?: string
): ProficiencyLevel {
  const pct = Math.max(0, Math.min(100, Number(percentualAcertos) || 0));
  const { maxProficiency } = getProficiencyTableInfo(serieLabel, disciplina);
  const scaled = (pct / 100) * maxProficiency;
  return getProficiencyLevel(scaled, serieLabel, disciplina);
}

/** Fundo + texto para célula da coluna Questão (legível em tema claro). */
export const P19_QUESTION_NUM_LEVEL_STYLE: Record<
  ProficiencyLevel,
  { bg: string; color: string; pdfFill: [number, number, number]; pdfText: [number, number, number] }
> = {
  abaixo_do_basico: {
    bg: "#FEF2F2",
    color: "#991B1B",
    pdfFill: [254, 242, 242],
    pdfText: [153, 27, 27],
  },
  basico: {
    bg: "#FEFCE8",
    color: "#A16207",
    pdfFill: [254, 252, 232],
    pdfText: [161, 98, 7],
  },
  adequado: {
    bg: "#DCFCE7",
    color: "#166534",
    pdfFill: [220, 252, 231],
    pdfText: [22, 101, 52],
  },
  avancado: {
    bg: "#D1FAE5",
    color: "#14532D",
    pdfFill: [209, 250, 229],
    pdfText: [20, 83, 45],
  },
};
