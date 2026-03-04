import { api } from "@/lib/api"

/** Resposta de GET /test/student/result/<test_id> (acertos por disciplina + geral) */
export interface StudentResultByTestResponse {
  test_id: string
  test_title: string
  acertos_por_disciplina: Array<{
    subject_id: string
    subject_name: string
    correct_answers: number
    total_questions: number
  }>
  geral: {
    correct_answers: number
    total_questions: number
  }
}

/**
 * GET /test/student/result/<test_id>
 * Autenticação: JWT (aluno). Retorna acertos por disciplina e geral para o gráfico de barras.
 */
export async function getStudentResultByTest(testId: string): Promise<StudentResultByTestResponse> {
  const { data } = await api.get<StudentResultByTestResponse>(`/test/student/result/${testId}`)
  return data
}

/** Dados de evolução em um comparison (student_grade, etc.) */
interface EvolutionData {
  value?: number
  percentage?: number
  direction?: string
}

/** Resposta de POST /test/student/compare (evolução entre provas) */
export interface StudentCompareResponse {
  student?: { id: string; user_id: string; name: string }
  evaluations: Array<{
    order?: number
    id: string
    title: string
    created_at?: string
    application_date?: string
  }>
  total_evaluations: number
  comparisons: Array<{
    from_evaluation: { id: string; title: string; order: number }
    to_evaluation: { id: string; title: string; order: number }
    general_comparison: {
      student_grade?: {
        evaluation_1: number
        evaluation_2: number
        evolution?: EvolutionData
      }
      student_proficiency?: { evaluation_1: number; evaluation_2: number; evolution?: EvolutionData }
      correct_answers?: { evaluation_1: number; evaluation_2: number; evolution?: EvolutionData }
      total_questions?: { evaluation_1: number; evaluation_2: number }
      score_percentage?: { evaluation_1: number; evaluation_2: number; evolution?: EvolutionData }
    }
    subject_comparison?: Record<string, unknown>
  }>
  total_comparisons: number
}

/**
 * POST /test/student/compare
 * Body: { student_id, test_ids } (mínimo 2; ordem cronológica: mais antiga → mais recente).
 * Retorna evaluations e comparisons para o gráfico de evolução (nota por avaliação).
 */
export async function studentCompare(
  studentId: string,
  testIds: string[]
): Promise<StudentCompareResponse> {
  if (testIds.length < 2) {
    throw new Error("São necessárias pelo menos 2 avaliações para comparar.")
  }
  const { data } = await api.post<StudentCompareResponse>("/test/student/compare", {
    student_id: studentId,
    test_ids: testIds,
  })
  return data
}
