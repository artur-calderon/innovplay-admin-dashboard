import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

// Interface para resposta da nova API de avaliação
interface EvaluationGradesResponse {
  success: boolean;
  data: {
    user_id: string;
    student_id: string;
    evaluation_id: string;
    evaluation_name: string;
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
  <Card className="hover:shadow-lg transition-shadow duration-300">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{value}</span>
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
  <Card className="hover:shadow-lg transition-shadow duration-300">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{position}º</span>
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

// Componente para badge de classificação
const ClassificationBadge = ({ classification }: { classification: string }) => {
  const getBadgeStyle = (classification: string) => {
    switch (classification.toLowerCase()) {
      case 'avançado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'adequado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'básico':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'abaixo do básico':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

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
    console.log('🔍 Fazendo chamada para API de avaliação:', `/students/${userId}/grades/evaluation/${evaluationId}`);
    const response = await api.get(`/students/${userId}/grades/evaluation/${evaluationId}`);
    console.log('📊 Resposta da API de avaliação:', response.data);
    return response.data;
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        // Buscar avaliações da turma do aluno (autenticado)
        const resp = await api.get("/test/my-class/tests");
        const tests: MyClassTestItem[] = resp.data?.tests || [];
        const found = tests.find(t => String(t.test_id) === String(id)) || null;
        setTest(found);

        if (!found) {
          setError("Avaliação não encontrada");
          return;
        }

        // Regra: só liberar após o prazo final
        const expiration = found.application_info?.expiration;
        const passed = expiration ? new Date() >= new Date(expiration) : false;

        if (!passed) {
          // Não buscar nota antes do prazo
          return;
        }

        // Tentar usar nova API primeiro
        try {
          console.log('🔄 Tentando buscar dados via nova API...');
          const apiData = await fetchEvaluationGrades(String(user.id), String(id));
          
          if (apiData.success && apiData.data) {
            console.log('✅ Dados obtidos via nova API:', apiData.data);
            setEvaluationData(apiData);
            setGrade(apiData.data.grade);
            setScorePct(apiData.data.score_percentage);
            setProficiency(apiData.data.proficiency);
            setClassification(apiData.data.classification);
            setCorrectAnswers(apiData.data.correct_answers);
            setTotalQuestions(apiData.data.total_questions);
            setRankings(apiData.data.rankings);
            return;
          }
        } catch (apiError) {
          console.log('⚠️ Nova API falhou, usando fallback:', apiError);
        }

        // Fallback: tentar pegar diretamente da avaliação do aluno
        const directGrade = typeof found.student_status?.grade === "number" ? found.student_status.grade : null;
        const directScore = typeof found.student_status?.score === "number" ? found.student_status.score : null;

        if (directGrade != null || directScore != null) {
          console.log('📊 Usando dados diretos da avaliação');
          setGrade(directGrade != null ? directGrade : Math.round(((directScore || 0) / 10) * 10) / 10);
          setScorePct(directScore != null ? directScore : Math.round(((directGrade || 0) * 10) * 10) / 10);
          return;
        }

        // Fallback final: buscar resultado detalhado (pode exigir studentId do domínio)
        try {
          console.log('🔄 Usando fallback final...');
          const detailed = await EvaluationResultsApiService.getStudentDetailedResults(String(id), String(user.id));
          if (detailed) {
            setGrade(typeof detailed.grade === "number" ? detailed.grade : Math.round((detailed.score_percentage / 10) * 10) / 10);
            setScorePct(typeof detailed.score_percentage === "number" ? detailed.score_percentage : Math.round(((detailed.grade || 0) * 10) * 10) / 10);
          }
        } catch (e) {
          console.log('⚠️ Todos os métodos falharam, mantendo sem nota');
          // Ignorar, manter sem nota (em processamento)
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Erro ao carregar resultado";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user.id]);

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

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Card>
          <CardContent className="p-6 text-red-600">{error}</CardContent>
        </Card>
      </div>
    );
  }

  const locked = !isDeadlinePassed;
  const scoreRounded = typeof scorePct === "number" ? Math.round(scorePct) : null;
  const gradeRounded = typeof grade === "number" ? Math.round(grade * 10) / 10 : null;
  const passedGood = (gradeRounded ?? (scoreRounded != null ? scoreRounded / 10 : 0)) >= 7;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resultado da Avaliação</h1>
          <p className="text-muted-foreground">{test?.title}</p>
        </div>
        <Button variant="ghost" onClick={() => navigate("/aluno/avaliacoes")}>Minhas Avaliações</Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Seu desempenho</CardTitle>
            {locked ? (
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Lock className="h-3.5 w-3.5 mr-1" /> Bloqueado até o prazo
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Liberado
              </Badge>
            )}
          </div>
          <div className="text-sm text-white/90 mt-2">
            {headerSubjects}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {locked && endDate ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <Lock className="h-10 w-10 text-gray-500 mb-3" />
              <p className="text-gray-700 mb-1">O resultado ficará disponível após o prazo final.</p>
              <p className="text-gray-600 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {`Disponível em ${format(parseISO(endDate.toISOString()), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`}
              </p>
              <div className="mt-6">
                <Button onClick={() => navigate(-1)} className="bg-gray-800 hover:bg-gray-900">Voltar</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Layout principal com nota circular e cards informativos */}
              <div className="grid gap-6 lg:grid-cols-3 items-start">
                {/* Nota Circular - Elemento Principal */}
                <div className="lg:col-span-1 flex justify-center">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute -z-10 h-56 w-56 rounded-full bg-gradient-to-tr from-purple-200 via-pink-200 to-yellow-100 blur-2xl" />
                    <div className="relative h-48 w-48 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 p-1">
                      <div className="h-full w-full rounded-full bg-white flex flex-col items-center justify-center">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Sua Nota</div>
                        <div className={`text-5xl font-extrabold ${passedGood ? "text-green-600" : "text-orange-600"}`}>
                          {gradeRounded != null ? (Math.ceil(gradeRounded * 10) / 10).toString().replace('.', ',') : "-"}
                        </div>
                        <div className="text-xs text-gray-500">de 10</div>
                        {scoreRounded != null && (
                          <div className="mt-2 text-sm text-gray-600">({scoreRounded}% acertos)</div>
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
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    ) : (
                      <Target className="h-6 w-6 text-purple-600" />
                    )}
                    <p className="text-gray-700">
                      {passedGood ? "Excelente! Continue assim." : "Bom esforço! Você está no caminho."}
                    </p>
                  </div>

                  {/* Grid de Cards Informativos */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Proficiência */}
                    {proficiency !== null && (
                      <StatCard
                        title="Proficiência"
                        value={(Math.ceil(proficiency * 10) / 10).toString().replace('.', ',')}
                        icon={TrendingUp}
                        color="bg-green-500"
                        subtitle="pontos"
                      />
                    )}

                    {/* Acertos */}
                    {correctAnswers !== null && totalQuestions !== null && (
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
                        <Card className="hover:shadow-lg transition-shadow duration-300">
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
                    <div className="text-sm text-gray-600">
                      Prazo da avaliação: {format(parseISO(endDate.toISOString()), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  )}
                  
                  <div>
                    <Button variant="outline" onClick={() => navigate("/aluno/avaliacoes")}>Voltar às avaliações</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


