import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Trophy, BarChart3, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    application?: string;
    expiration?: string;
  };
  duration?: number;
  total_questions?: number;
  max_score?: number;
  availability: AvailabilityInfo;
  student_status: StudentStatusInfo;
}

export default function StudentResults() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<MyClassTestItem[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Usar rotas diretas do backend (sem prefixo /api)
        const resp = await fetch('/test/my-class/tests');
        const data = await resp.json();
        const items: MyClassTestItem[] = data?.tests || [];
        setTests(items);
      } catch (e) {
        setTests([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const availableResults = useMemo(() => {
    return tests
      .filter(t => t.student_status?.has_completed)
      .filter(t => {
        const exp = t.application_info?.expiration;
        return exp ? new Date() >= new Date(exp) : false;
      })
      .map(t => ({
        id: t.test_id,
        title: t.title,
        subjects: t.subjects_info && t.subjects_info.length > 0
          ? t.subjects_info.map(s => s.name).join(", ")
          : (t.subject?.name || ""),
        expiration: t.application_info?.expiration,
        grade: typeof t.student_status?.grade === 'number' ? t.student_status.grade : null,
        score: typeof t.student_status?.score === 'number' ? t.student_status.score : null
      }));
  }, [tests]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meus Resultados</h1>
          <p className="text-muted-foreground">Veja as notas liberadas após o prazo</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/aluno/avaliacoes')}>
          Ir para Avaliações
        </Button>
      </div>

      {availableResults.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-600">
            Nenhum resultado disponível no momento.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableResults.map(r => {
            const gradeRounded = typeof r.grade === 'number' ? Math.round(r.grade * 10) / 10 : null;
            const scorePct = typeof r.score === 'number' ? Math.round(r.score) : null;
            return (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base line-clamp-2">{r.title}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      <BarChart3 className="h-3.5 w-3.5 mr-1" /> Resultado
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {r.subjects && (
                    <div className="text-sm text-gray-600">{r.subjects}</div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    Liberado em {r.expiration ? format(parseISO(r.expiration), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-gray-700">
                      {gradeRounded != null ? (
                        <span className="font-semibold">Nota: {gradeRounded.toFixed(1)}/10</span>
                      ) : scorePct != null ? (
                        <span className="font-semibold">Acertos: {scorePct}%</span>
                      ) : (
                        <span className="text-gray-500">Nota em processamento</span>
                      )}
                    </div>
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => navigate(`/aluno/avaliacao/${r.id}/resultado`)}>
                      <Trophy className="h-4 w-4 mr-2" /> Ver
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


