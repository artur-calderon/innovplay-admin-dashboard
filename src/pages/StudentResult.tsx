import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Target, ArrowLeft, Lock, Clock, Sparkles } from "lucide-react";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { format, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";

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

export default function StudentResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<MyClassTestItem | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [scorePct, setScorePct] = useState<number | null>(null);

  const endDate = useMemo(() => {
    const raw = test?.application_info?.expiration;
    return raw ? new Date(raw) : null;
  }, [test]);

  const isDeadlinePassed = useMemo(() => {
    if (!endDate) return false;
    return isAfter(new Date(), endDate);
  }, [endDate]);

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

        // Tentar pegar diretamente da avaliação do aluno
        const directGrade = typeof found.student_status?.grade === "number" ? found.student_status.grade : null;
        const directScore = typeof found.student_status?.score === "number" ? found.student_status.score : null;

        if (directGrade != null || directScore != null) {
          setGrade(directGrade != null ? directGrade : Math.round(((directScore || 0) / 10) * 10) / 10);
          setScorePct(directScore != null ? directScore : Math.round(((directGrade || 0) * 10) * 10) / 10);
          return;
        }

        // Fallback: buscar resultado detalhado (pode exigir studentId do domínio)
        try {
          const detailed = await EvaluationResultsApiService.getStudentDetailedResults(String(id), String(user.id));
          if (detailed) {
            setGrade(typeof detailed.grade === "number" ? detailed.grade : Math.round((detailed.score_percentage / 10) * 10) / 10);
            setScorePct(typeof detailed.score_percentage === "number" ? detailed.score_percentage : Math.round(((detailed.grade || 0) * 10) * 10) / 10);
          }
        } catch (e) {
          // Ignorar, manter sem nota (em processamento)
        }
      } catch (e: any) {
        setError(e?.message || "Erro ao carregar resultado");
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
            <div className="grid gap-6 md:grid-cols-2 items-center">
              <div className="relative flex items-center justify-center">
                <div className="absolute -z-10 h-56 w-56 rounded-full bg-gradient-to-tr from-purple-200 via-pink-200 to-yellow-100 blur-2xl" />
                <div className="relative h-48 w-48 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 p-1">
                  <div className="h-full w-full rounded-full bg-white flex flex-col items-center justify-center">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Sua Nota</div>
                    <div className={`text-5xl font-extrabold ${passedGood ? "text-green-600" : "text-orange-600"}`}>
                      {gradeRounded != null ? gradeRounded.toFixed(1) : "-"}
                    </div>
                    <div className="text-xs text-gray-500">de 10</div>
                    {scoreRounded != null && (
                      <div className="mt-2 text-sm text-gray-600">({scoreRounded}% acertos)</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {passedGood ? (
                    <Trophy className="h-6 w-6 text-yellow-500" />
                  ) : (
                    <Target className="h-6 w-6 text-purple-600" />
                  )}
                  <p className="text-gray-700">
                    {passedGood ? "Excelente! Continue assim." : "Bom esforço! Você está no caminho."}
                  </p>
                </div>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}


