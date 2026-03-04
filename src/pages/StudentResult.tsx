import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Target, ArrowLeft, Lock, Clock, Sparkles, TrendingUp, Users, Award, BookOpen, BarChart3 } from "lucide-react";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { format, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import StudentBulletin, { type DisciplineStatsMap } from "@/components/evaluations/StudentBulletin";
import { saveBulletinStatsToStorage, loadBulletinStatsFromStorage } from "@/components/evaluations/utils/bulletinStorage";

// Interface para resposta da nova API de avaliação
interface EvaluationGradesResponse {
  success: boolean;
  data: {
    user_id: string;
    student_id: string;
    student_name: string;
    student_registration?: string;
    evaluation_id: string;
    evaluation_name: string;
    school_name?: string;
    class_name?: string;
    proficiency: number;
    grade: number;
    classification: string;
    correct_answers: number;
    total_questions: number;
    score_percentage: number;
    rankings: {
      school: {
        position: number;
        total_students: number;
        ranking: Array<{
          position: number;
          student_id: string;
          student_name: string;
          proficiency: number;
        }>;
      };
      class: {
        position: number;
        total_students: number;
        ranking: Array<{
          position: number;
          student_id: string;
          student_name: string;
          proficiency: number;
        }>;
      };
      municipality: {
        position: number;
        total_students: number;
        ranking: Array<{
          position: number;
          student_id: string;
          student_name: string;
          proficiency: number;
        }>;
      };
    };
    subject_results?: Array<{
      subject_id: string;
      subject_name: string;
      correct_answers: number;
      total_questions: number;
      score_percentage: number;
      grade: number;
      proficiency: number;
      classification: string;
    }>;
  };
  message: string;
}

interface AvailabilityInfo {
  is_available: boolean;
  status: "available" | "not_available" | "not_yet_available" | "expired" | "completed" | "not_started";
}

interface StudentStatusInfo {
  has_completed: boolean;
  status: "nao_iniciada" | "em_andamento" | "finalizada" | "expirada" | "corrigida" | "revisada";
  can_start: boolean;
  score?: number; // percentual 0-100
  grade?: number; // 0-10
}

interface MyClassTestItem {
  test_id: string;
  title: string;
  subjects_info?: { id: string; name: string }[];
  subject?: { id: string; name: string };
  application_info?: {
    application?: string; // início
    expiration?: string; // fim
  };
  duration?: number;
  total_questions?: number;
  max_score?: number;
  availability: AvailabilityInfo;
  student_status: StudentStatusInfo;
}

// Componente para card de estatística
const StatCard = ({ 
  title, 
  value, 
  icon: Icon,
  color = "bg-blue-500",
  subtitle
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
  subtitle?: string;
}) => (
  <Card className="hover:shadow-lg transition-shadow duration-300 bg-card border-border">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">{value}</span>
            {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
          </div>
        </div>
        <div className={`p-3 rounded-full ${color} text-white`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Componente para card de ranking
const RankingCard = ({ 
  title, 
  position, 
  totalStudents,
  icon: Icon,
  color = "bg-purple-500"
}: {
  title: string;
  position: number;
  totalStudents: number;
  icon: React.ElementType;
  color?: string;
}) => (
  <Card className="hover:shadow-lg transition-shadow duration-300 bg-card border-border">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">{position}º</span>
            <span className="text-sm text-muted-foreground">de {totalStudents}</span>
          </div>
        </div>
        <div className={`p-3 rounded-full ${color} text-white`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Componente para badge de classificação (com suporte a dark mode)
const ClassificationBadge = ({ classification }: { classification: string }) => {
  const getBadgeStyle = (classification: string) => {
    switch (classification.toLowerCase()) {
      case 'avançado':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700';
      case 'adequado':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700';
      case 'básico':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-700';
      case 'abaixo do básico':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  return (
    <Badge className={`px-3 py-1 ${getBadgeStyle(classification)}`}>
      <Award className="w-3 h-3 mr-1" />
      {classification}
    </Badge>
  );
};

export default function StudentResult() {
  const params = useParams<{ id?: string; testId?: string; studentId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Modo admin: /app/olimpiada-resultado/:testId/:studentId (mesma rota/API que o aluno vê)
  const isAdminView = Boolean(params.testId && params.studentId);
  const testId = params.testId ?? params.id;
  const studentId = params.studentId ?? user?.id ?? null;
  const id = testId ?? undefined;

  // Detectar se é uma olimpíada pela URL
  const isOlimpiada = location.pathname.includes('/olimpiada/') || isAdminView;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<MyClassTestItem | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [scorePct, setScorePct] = useState<number | null>(null);
  
  // Novos estados para dados da API
  const [evaluationData, setEvaluationData] = useState<EvaluationGradesResponse | null>(null);
  const [proficiency, setProficiency] = useState<number | null>(null);
  const [classification, setClassification] = useState<string | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState<number | null>(null);
  const [totalQuestions, setTotalQuestions] = useState<number | null>(null);
  const [rankings, setRankings] = useState<EvaluationGradesResponse['data']['rankings'] | null>(null);
  const [disciplineStats, setDisciplineStats] = useState<DisciplineStatsMap | null>(null);

  const endDate = useMemo(() => {
    const raw = test?.application_info?.expiration;
    return raw ? new Date(raw) : null;
  }, [test]);

  const isDeadlinePassed = useMemo(() => {
    if (!endDate) return false;
    return isAfter(new Date(), endDate);
  }, [endDate]);

  // Função para buscar dados da avaliação via nova API
  const fetchEvaluationGrades = async (userId: string, evaluationId: string): Promise<EvaluationGradesResponse> => {
    const response = await api.get(`/students/${userId}/grades/evaluation/${evaluationId}`);
    return response.data;
  };

  const buildDisciplineStats = useCallback((data: EvaluationGradesResponse["data"]): DisciplineStatsMap => {
    const stats: DisciplineStatsMap = {};

    (data.subject_results || []).forEach((subject) => {
      stats[subject.subject_name] = {
        nota: subject.grade ?? 0,
        proficiencia: subject.proficiency ?? 0,
        totalQuestions: subject.total_questions ?? 0,
        correctAnswers: subject.correct_answers ?? 0,
      };
    });

    stats.GERAL = {
      nota: data.grade ?? 0,
      proficiencia: data.proficiency ?? 0,
      totalQuestions: data.total_questions ?? 0,
      correctAnswers: data.correct_answers ?? 0,
    };

    return stats;
  }, []);

  // Função auxiliar para buscar resultados
  const fetchResults = async (): Promise<{ found: boolean; hasResults: boolean }> => {
    if (!testId || !studentId) return { found: false, hasResults: false };

    try {
      // Modo admin: mesma rota que o aluno usa — GET /evaluation-results/<test_id>/student/<student_id>/results
      if (isAdminView) {
        const detailed = await EvaluationResultsApiService.getStudentDetailedResults(String(testId), String(studentId));
        if (!detailed) {
          return { found: true, hasResults: false };
        }
        let testTitle = "Olimpíada";
        try {
          const testResp = await api.get(`/test/${testId}`);
          if (testResp.data?.title) testTitle = testResp.data.title.replace(/\[OLIMPÍADA\]\s?/gi, "").trim() || testTitle;
        } catch (_) {}
        setTest({
          test_id: testId,
          title: testTitle,
          availability: { is_available: true, status: "completed" as const },
          student_status: { has_completed: true, status: "finalizada", can_start: false, score: detailed.score_percentage, grade: detailed.grade },
        } as MyClassTestItem);
        setGrade(typeof detailed.grade === "number" ? detailed.grade : null);
        setScorePct(typeof detailed.score_percentage === "number" ? detailed.score_percentage : null);
        setProficiency(typeof detailed.proficiencia === "number" ? detailed.proficiencia : null);
        setClassification(detailed.classificacao ?? null);
        setCorrectAnswers(typeof detailed.correct_answers === "number" ? detailed.correct_answers : null);
        setTotalQuestions(typeof detailed.total_questions === "number" ? detailed.total_questions : null);
        setEvaluationData({
          success: true,
          data: {
            user_id: studentId,
            student_id: studentId,
            student_name: detailed.student_name ?? "Aluno",
            evaluation_id: testId,
            evaluation_name: testTitle,
            grade: detailed.grade ?? 0,
            proficiency: detailed.proficiencia ?? 0,
            classification: detailed.classificacao ?? "",
            correct_answers: detailed.correct_answers ?? 0,
            total_questions: detailed.total_questions ?? 0,
            score_percentage: detailed.score_percentage ?? 0,
            rankings: { school: { position: 0, total_students: 0, ranking: [] }, class: { position: 0, total_students: 0, ranking: [] }, municipality: { position: 0, total_students: 0, ranking: [] } },
          },
          message: "",
        });
        return { found: true, hasResults: true };
      }

      // Modo aluno: buscar avaliações da turma do aluno (autenticado)
      const resp = await api.get("/test/my-class/tests");
      const tests: MyClassTestItem[] = resp.data?.tests || [];
      const found = tests.find(t => String(t.test_id) === String(id)) || null;
      
      if (!found) {
        return { found: false, hasResults: false };
      }

      setTest(found);

      const hasCompleted = found.student_status?.has_completed;
      if (!hasCompleted) {
        return { found: true, hasResults: false };
      }

      try {
        const apiData = await fetchEvaluationGrades(String(user!.id), String(id));

        if (apiData.success && apiData.data) {
          setEvaluationData(apiData);

          const apiDisciplineStats = buildDisciplineStats(apiData.data);
          setDisciplineStats(apiDisciplineStats);
          saveBulletinStatsToStorage(String(id), String(user.id), apiDisciplineStats);
          
          // ✅ CORRIGIDO: Validar e converter valores antes de definir
          const apiGrade = typeof apiData.data.grade === "number" && !isNaN(apiData.data.grade) 
            ? apiData.data.grade 
            : null;
          
          const apiScorePct = typeof apiData.data.score_percentage === "number" && !isNaN(apiData.data.score_percentage)
            ? apiData.data.score_percentage
            : null;
          
          const apiProficiency = typeof apiData.data.proficiency === "number" && !isNaN(apiData.data.proficiency)
            ? apiData.data.proficiency
            : null;
          
          const apiCorrectAnswers = typeof apiData.data.correct_answers === "number" && !isNaN(apiData.data.correct_answers)
            ? apiData.data.correct_answers
            : null;
          
          const apiTotalQuestions = typeof apiData.data.total_questions === "number" && !isNaN(apiData.data.total_questions)
            ? apiData.data.total_questions
            : null;
          
          setGrade(apiGrade);
          setScorePct(apiScorePct);
          setProficiency(apiProficiency);
          setClassification(apiData.data.classification || null);
          setCorrectAnswers(apiCorrectAnswers);
          setTotalQuestions(apiTotalQuestions);
          setRankings(apiData.data.rankings);
          return { found: true, hasResults: true }; // Resultados encontrados
        }
      } catch {
        const storedStats = loadBulletinStatsFromStorage<DisciplineStatsMap>(String(id), String(user.id));
        if (storedStats) {
          setDisciplineStats(storedStats);
        }
      }

      // Fallback: tentar pegar diretamente da avaliação do aluno
      const directGrade = typeof found.student_status?.grade === "number" ? found.student_status.grade : null;
      const directScore = typeof found.student_status?.score === "number" ? found.student_status.score : null;

      if (directGrade != null || directScore != null) {
        setGrade(directGrade != null ? directGrade : Math.round(((directScore || 0) / 10) * 10) / 10);
        setScorePct(directScore != null ? directScore : Math.round(((directGrade || 0) * 10) * 10) / 10);
        if (!disciplineStats) {
          const storedStats = loadBulletinStatsFromStorage<DisciplineStatsMap>(String(id), String(user.id));
          if (storedStats) {
            setDisciplineStats(storedStats);
          }
        }
        return { found: true, hasResults: true }; // Resultados encontrados
      }

      // Fallback final: buscar resultado detalhado
      try {
        const detailed = await EvaluationResultsApiService.getStudentDetailedResults(String(id), String(user.id));
        if (detailed) {
          // ✅ CORRIGIDO: Usar dados do StudentDetailedResult corretamente
          const detailedGrade = typeof detailed.grade === "number" && !isNaN(detailed.grade) 
            ? detailed.grade 
            : (typeof detailed.score_percentage === "number" && !isNaN(detailed.score_percentage)
              ? Math.round((detailed.score_percentage / 10) * 10) / 10
              : null);
          
          const detailedScorePct = typeof detailed.score_percentage === "number" && !isNaN(detailed.score_percentage)
            ? detailed.score_percentage
            : (typeof detailed.grade === "number" && !isNaN(detailed.grade)
              ? Math.round(((detailed.grade || 0) * 10) * 10) / 10
              : null);
          
          const detailedProficiency = typeof detailed.proficiencia === "number" && !isNaN(detailed.proficiencia)
            ? detailed.proficiencia
            : null;
          
          const detailedCorrectAnswers = typeof detailed.correct_answers === "number" && !isNaN(detailed.correct_answers)
            ? detailed.correct_answers
            : null;
          
          const detailedTotalQuestions = typeof detailed.total_questions === "number" && !isNaN(detailed.total_questions)
            ? detailed.total_questions
            : null;
          
          setGrade(detailedGrade);
          setScorePct(detailedScorePct);
          setProficiency(detailedProficiency);
          setClassification(detailed.classificacao || null);
          setCorrectAnswers(detailedCorrectAnswers);
          setTotalQuestions(detailedTotalQuestions);
          if (!disciplineStats) {
            const storedStats = loadBulletinStatsFromStorage<DisciplineStatsMap>(String(id), String(user.id));
            if (storedStats) {
              setDisciplineStats(storedStats);
            }
          }
          
          return { found: true, hasResults: true }; // Resultados encontrados
        }
      } catch {
        // Manter sem nota
      }

      return { found: true, hasResults: false };
    } catch {
      return { found: false, hasResults: false };
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      
      try {
        const { found, hasResults } = await fetchResults();
        
        if (!found) {
          setError("Avaliação não encontrada");
          setLoading(false);
          return;
        }

        // Se encontrou a avaliação mas não tem resultados ainda, o polling será iniciado no próximo useEffect
        // Não definir erro aqui, apenas aguardar o polling
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Erro ao carregar resultado";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [testId, studentId, isAdminView, id, user?.id]);

  // Polling automático para verificar resultados quando completado mas sem nota
  useEffect(() => {
    if (!id || !user?.id || !test) return;
    
    const hasCompleted = test.student_status?.has_completed;
    const hasResults = grade !== null || scorePct !== null;
    
    // Iniciar polling apenas se completou mas ainda não tem resultados
    if (!hasCompleted || hasResults) return;

    let attempts = 0;
    const maxAttempts = 24;
    const pollInterval = 5000;

    const intervalId = setInterval(async () => {
      attempts++;
      const { found, hasResults: foundResults } = await fetchResults();
      if (foundResults || attempts >= maxAttempts) {
        clearInterval(intervalId);
      }
    }, pollInterval);

    // Limpar intervalo quando componente desmontar ou quando resultados forem encontrados
    return () => {
      clearInterval(intervalId);
    };
  }, [id, user?.id, test, grade, scorePct]);

  const headerSubjects = useMemo(() => {
    if (test?.subjects_info && test.subjects_info.length > 0) {
      return test.subjects_info.map(s => s.name).join(", ");
    }
    if (test?.subject) return test.subject.name;
    return "";
  }, [test]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // Se há erro e não há test, mostrar erro
  // Mas se há test mesmo com erro, continuar renderizando (pode ser erro temporário)
  if (error && !test) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Card>
          <CardContent className="p-6 text-red-600 dark:text-red-400">{error}</CardContent>
        </Card>
      </div>
    );
  }

  // Se não há test e não está carregando, verificar se temos dados da API
  // Se temos dados da API, podemos renderizar mesmo sem test
  if (!test && !loading && !evaluationData) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Card>
          <CardContent className="p-6 text-red-600 dark:text-red-400">
            {error || "Avaliação não encontrada"}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ MODIFICADO: Bloqueio baseado apenas em ter completado a avaliação
  // Se temos dados da API, considerar como desbloqueado
  const locked = !test?.student_status?.has_completed && !evaluationData;
  const scoreRounded = typeof scorePct === "number" ? Math.round(scorePct) : null;
  const gradeRounded = typeof grade === "number" ? Math.round(grade * 10) / 10 : null;
  const passedGood = (gradeRounded ?? (scoreRounded != null ? scoreRounded / 10 : 0)) >= 7;

  // Usar título da avaliação de test ou evaluationData
  const evaluationTitle = test?.title || evaluationData?.data?.evaluation_name || (isOlimpiada ? "Resultado da Olimpíada" : "Resultado da Avaliação");
  
  // Títulos e navegação: admin (olimpiada-resultado/:testId/:studentId) vs aluno
  const pageTitle = isAdminView
    ? "Resultado do Aluno - Olimpíada"
    : isOlimpiada
      ? "Resultado da Olimpíada"
      : "Resultado da Avaliação";
  const backButtonText = isAdminView ? "Voltar às Olimpíadas" : isOlimpiada ? "Voltar às Olimpíadas" : "Voltar às Avaliações";
  const backButtonPath = isAdminView ? "/app/olimpiadas" : isOlimpiada ? "/aluno/olimpiadas" : "/aluno/avaliacoes";
  const myItemsButtonText = isAdminView ? "Voltar às Olimpíadas" : isOlimpiada ? "Minhas Olimpíadas" : "Minhas Avaliações";
  const myItemsButtonPath = isAdminView ? "/app/olimpiadas" : isOlimpiada ? "/aluno/olimpiadas" : "/aluno/avaliacoes";

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
            <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            {pageTitle}
          </h1>
          <p className="text-muted-foreground">{evaluationTitle}</p>
        </div>
        <Button variant="ghost" onClick={() => navigate(myItemsButtonPath)}>{myItemsButtonText}</Button>
      </div>

      <Card className="overflow-hidden bg-card border-border">
        <CardHeader className={isOlimpiada 
          ? "bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 text-white"
          : "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white"
        }>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Seu desempenho</CardTitle>
            {locked ? (
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Lock className="h-3.5 w-3.5 mr-1" /> Complete a avaliação
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Resultados disponíveis
              </Badge>
            )}
          </div>
          <div className="text-sm text-white/90 mt-2">
            {headerSubjects || (evaluationData?.data && "Avaliação concluída")}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {locked ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <Lock className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-foreground mb-1">Complete a avaliação para ver seus resultados.</p>
              <p className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Resultados disponíveis após finalizar a avaliação
              </p>
              <div className="mt-6">
                <Button onClick={() => navigate(backButtonPath)} className="bg-primary hover:bg-primary/90">{backButtonText}</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Layout principal com nota circular e cards informativos */}
              <div className="grid gap-6 lg:grid-cols-3 items-start">
                {/* Nota Circular - Elemento Principal */}
                <div className="lg:col-span-1 flex justify-center">
                  <div className="relative flex items-center justify-center">
                    <div className={`absolute -z-10 h-56 w-56 rounded-full blur-2xl ${
                      isOlimpiada 
                        ? "bg-gradient-to-tr from-yellow-200 via-amber-200 to-orange-100 dark:from-yellow-900/50 dark:via-amber-800/40 dark:to-orange-900/40" 
                        : "bg-gradient-to-tr from-purple-200 via-pink-200 to-yellow-100 dark:from-purple-900/50 dark:via-pink-800/40 dark:to-indigo-900/40"
                    }`} />
                    <div className={`relative h-48 w-48 rounded-full p-1 ${
                      isOlimpiada 
                        ? "bg-gradient-to-br from-yellow-600 to-amber-600" 
                        : "bg-gradient-to-br from-indigo-600 to-purple-600"
                    }`}>
                      <div className="h-full w-full rounded-full bg-white dark:bg-card flex flex-col items-center justify-center border border-transparent dark:border-border/50">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Sua Nota</div>
                        <div className={`text-5xl font-extrabold ${passedGood ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
                          {gradeRounded != null ? (Math.ceil(gradeRounded * 10) / 10).toString().replace('.', ',') : "-"}
                        </div>
                        <div className="text-xs text-muted-foreground">de 10</div>
                        {scoreRounded != null && (
                          <div className="mt-2 text-sm text-muted-foreground">({scoreRounded}% acertos)</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cards Informativos */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Mensagem de feedback */}
                  <div className="flex items-center gap-2 mb-4">
                    {passedGood ? (
                      <Trophy className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />
                    ) : (
                      <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    )}
                    <p className="text-foreground">
                      {passedGood ? "Excelente! Continue assim." : "Bom esforço! Você está no caminho."}
                    </p>
                  </div>

                  {/* Grid de Cards Informativos */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Proficiência */}
                    {proficiency !== null && !isNaN(proficiency) && proficiency >= 0 && (
                       <StatCard
                         title="Proficiência"
                         value={proficiency.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                         icon={TrendingUp}
                         color="bg-green-500"
                         subtitle="pontos"
                       />
                     )}

                    {/* Acertos */}
                    {correctAnswers !== null && totalQuestions !== null && 
                     !isNaN(correctAnswers) && !isNaN(totalQuestions) && 
                     correctAnswers >= 0 && totalQuestions > 0 && (
                      <StatCard
                        title="Acertos"
                        value={`${correctAnswers}/${totalQuestions}`}
                        icon={BookOpen}
                        color="bg-blue-500"
                        subtitle="questões"
                      />
                    )}

                    {/* Classificação */}
                    {classification && (
                      <div className="md:col-span-2">
                        <Card className="hover:shadow-lg transition-shadow duration-300 bg-card border-border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Classificação</p>
                                <ClassificationBadge classification={classification} />
                              </div>
                              <div className="p-3 rounded-full bg-purple-500 text-white">
                                <Award className="w-5 h-5" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Rankings */}
                    {rankings && (
                      <>
                        <RankingCard
                          title="Posição na Turma"
                          position={rankings.class.position}
                          totalStudents={rankings.class.total_students}
                          icon={Users}
                          color="bg-orange-500"
                        />
                        <RankingCard
                          title="Posição na Escola"
                          position={rankings.school.position}
                          totalStudents={rankings.school.total_students}
                          icon={BarChart3}
                          color="bg-indigo-500"
                        />
                      </>
                    )}
                  </div>

                  {/* Informações adicionais */}
                  {endDate && (
                    <div className="text-sm text-muted-foreground">
                      Prazo da avaliação: {format(parseISO(endDate.toISOString()), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  )}
                  
                  <div>
                    <Button variant="outline" className="border-border bg-transparent hover:bg-muted" onClick={() => navigate(backButtonPath)}>{backButtonText}</Button>
                  </div>
                </div>
              </div>

              {/* Boletim de Questões */}
              {id && user.id && (
                <div className="mt-8">
                  <StudentBulletin
                    testId={id}
                    studentId={String(user.id)}
                    initialDisciplineStats={disciplineStats || undefined}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


