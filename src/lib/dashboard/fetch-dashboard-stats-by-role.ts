import { api } from "@/lib/api";

interface BaseDashboardResponse {
  students?: number;
  schools?: number;
  evaluations?: number;
  games?: number;
  users?: number;
  questions?: number;
  classes?: number;
  teachers?: number;
  last_sync?: string;
}

interface EvaluationStatsResponse {
  total?: number;
  this_month?: number;
  total_questions?: number;
  average_questions?: number;
}

export interface DashboardCounts {
  students: number;
  evaluations: number;
  games: number;
  users: number;
  questions: number;
  classes: number;
  teachers: number;
  institution: {
    label: string;
    count: number;
  };
  lastSync: string | null;
}

interface FetchOptions {
  userId: string;
  role: string;
}

function normaliseNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function extractArrayLength(payload: unknown): number {
  if (Array.isArray(payload)) {
    return payload.length;
  }

  if (payload && typeof payload === "object") {
    const possibleData = (payload as { data?: unknown[]; results?: unknown[] }).data ?? (payload as { data?: unknown[]; results?: unknown[] }).results;
    if (Array.isArray(possibleData)) {
      return possibleData.length;
    }
  }

  return 0;
}

async function safeGet<T>(request: () => Promise<{ data: T }>): Promise<T | null> {
  try {
    const response = await request();
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    return null;
  }
}

export async function fetchDashboardCountsByRole(options: FetchOptions): Promise<DashboardCounts> {
  const role = String(options.role || "").toLowerCase();

  const [comprehensiveRaw, evaluationRaw] = await Promise.all([
    safeGet<BaseDashboardResponse>(() => api.get("/dashboard/comprehensive-stats")),
    safeGet<EvaluationStatsResponse>(() => api.get("/evaluations/stats")),
  ]);

  const comprehensive = comprehensiveRaw ?? {};
  const evaluation = evaluationRaw ?? {};

  let students = normaliseNumber(comprehensive.students);
  let evaluations = normaliseNumber(comprehensive.evaluations);
  let games = normaliseNumber(comprehensive.games);
  let users = normaliseNumber(comprehensive.users);
  let questions = normaliseNumber(comprehensive.questions || evaluation.total_questions);
  let classes = normaliseNumber(comprehensive.classes);
  let teachers = normaliseNumber(comprehensive.teachers);
  let institutionLabel = "Escolas cadastradas";
  let institutionCount = normaliseNumber(comprehensive.schools);

  if (role === "tecadm") {
    institutionLabel = "Escolas do município";
  }

  if (role === "diretor" || role === "coordenador") {
    institutionLabel = "Turmas cadastradas";
    institutionCount = normaliseNumber(comprehensive.classes);
  }

  if (role === "professor") {
    institutionLabel = "Turmas cadastradas";

    const [classesResponse, studentsResponse, evaluationsResponse] = await Promise.all([
      safeGet<unknown>(() => api.get("/classes", { params: { per_page: 1000 } })),
      safeGet<unknown>(() => api.get("/students", { params: { per_page: 1000 } })),
      safeGet<unknown>(() => api.get("/test", { params: { per_page: 1000 } })),
    ]);

    const teacherClassesCount = extractArrayLength(classesResponse);
    const teacherStudentsCount = extractArrayLength(studentsResponse);
    const teacherEvaluationsCount = extractArrayLength(
      evaluationsResponse && typeof evaluationsResponse === "object"
        ? (evaluationsResponse as { data?: unknown[]; tests?: unknown[] }).data ?? (evaluationsResponse as { data?: unknown[]; tests?: unknown[] }).tests
        : evaluationsResponse,
    );

    institutionCount = teacherClassesCount;
    classes = teacherClassesCount;
    if (teacherStudentsCount > 0) {
      students = teacherStudentsCount;
    }
    if (teacherEvaluationsCount > 0) {
      evaluations = teacherEvaluationsCount;
    }
    // Professores não precisam visualizar total de professores
    teachers = 0;
  }

  return {
    students,
    evaluations,
    games,
    users,
    questions,
    classes,
    teachers,
    institution: {
      label: institutionLabel,
      count: institutionCount,
    },
    lastSync: comprehensive.last_sync ?? null,
  };
}

