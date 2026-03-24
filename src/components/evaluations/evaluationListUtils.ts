import type { Evaluation } from "@/types/evaluation-types";

/** Total de questões para exibição (metadado; não carrega a lista de questões). */
export function getEvaluationQuestionCount(evaluation: Evaluation): number {
  const raw =
    typeof evaluation?.total_questions === "number"
      ? evaluation.total_questions
      : evaluation?.totalQuestions ??
        (Array.isArray(evaluation?.questions)
          ? evaluation.questions.length
          : 0) ??
        (evaluation as { questions_count?: number }).questions_count ??
        0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function formatEvaluationQuestionCount(evaluation: Evaluation): string {
  const n = getEvaluationQuestionCount(evaluation);
  return new Intl.NumberFormat("pt-BR").format(n);
}
