import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Target,
} from "lucide-react";
import { DashboardApiService } from "@/services/dashboardApi";

const LIMIT = 50;
const MAX_VISIBLE = 10;

type Nivel = "Avançado" | "Adequado" | "Básico" | "Abaixo do Básico";

const NIVEIS_VALIDOS: Nivel[] = ["Avançado", "Adequado", "Básico", "Abaixo do Básico"];

type QuestaoDashboard = {
  id: string;
  titulo: string;
  disciplina: string;
  ano_serie: string;
  autor: string;
  data_criacao: string;
  dificuldade?: string;
  classification?: string;
  tipo_questao: string;
  quantidade_respostas: number;
  taxa_acerto: number | null;
  quantidade_avaliacoes: number;
  ultima_utilizacao: string | null;
  habilidade: string | null;
};

function parseNivelFromApi(value: string | null | undefined): Nivel | null {
  if (!value || typeof value !== "string") return null;
  const normalized = value.trim();
  const found = NIVEIS_VALIDOS.find((n) => n === normalized);
  return found ?? null;
}

function getNivelFromTaxaAcerto(taxa: number | null): Nivel | null {
  if (taxa == null) return null;
  if (taxa >= 75) return "Avançado";
  if (taxa >= 50) return "Adequado";
  if (taxa >= 25) return "Básico";
  return "Abaixo do Básico";
}

/** Usa classification ou dificuldade do JSON; fallback para nível calculado pela taxa de acerto. */
function resolveNivel(q: QuestaoDashboard): Nivel | null {
  const fromClassification = parseNivelFromApi(q.classification);
  if (fromClassification != null) return fromClassification;
  const fromDificuldade = parseNivelFromApi(q.dificuldade);
  if (fromDificuldade != null) return fromDificuldade;
  return getNivelFromTaxaAcerto(q.taxa_acerto);
}

function getNivelBadgeClass(nivel: Nivel): string {
  switch (nivel) {
    case "Avançado":
      return "bg-green-800 dark:bg-green-900 text-green-100 dark:text-green-200";
    case "Adequado":
      return "bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400";
    case "Básico":
      return "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400";
    case "Abaixo do Básico":
      return "bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function QuestionsList() {
  const [questoes, setQuestoes] = useState<QuestaoDashboard[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestoes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await DashboardApiService.getQuestoesDashboard(LIMIT, 0);
        if (data?.questoes && Array.isArray(data.questoes)) {
          setQuestoes(data.questoes);
          setTotal(data.total ?? data.questoes.length);
        } else {
          setQuestoes([]);
          setTotal(0);
        }
      } catch (err) {
        console.error("Erro ao buscar questões do dashboard:", err);
        setQuestoes([]);
        setTotal(0);
        setError("Não foi possível carregar as questões.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestoes();
  }, []);

  const exibir = useMemo(() => {
    const ordenadas = [...questoes].sort(
      (a, b) => b.quantidade_respostas - a.quantidade_respostas
    );
    return ordenadas.slice(0, MAX_VISIBLE);
  }, [questoes]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-violet-500" />
            Lista de Questões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-violet-500" />
            Lista de Questões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 py-4">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-1 flex-none">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-5 w-5 text-violet-500" />
          Lista de Questões
          {total > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              (mais tentadas · {exibir.length}
              {total > exibir.length ? ` de ${total}` : ""})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pt-2 pb-4">
        {exibir.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">
            Nenhuma questão encontrada.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 h-full">
            {exibir.map((q) => {
              const nivel = resolveNivel(q);
              return (
                <div
                  key={q.id}
                  className="p-2.5 rounded-lg border border-border hover:bg-muted/40 transition-colors flex flex-col gap-1"
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-1 flex-1 min-w-0">
                      {q.titulo || `Questão ${q.id}`}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0">
                      {nivel != null ? (
                        <Badge className={`text-[10px] px-1.5 py-0 ${getNivelBadgeClass(nivel)}`}>
                          {nivel}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span>{q.disciplina || "—"}</span>
                    <span>·</span>
                    <span>{q.ano_serie || "—"}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5">
                      <ClipboardCheck className="h-3 w-3" />
                      {q.quantidade_respostas} tentativas
                    </span>
                    {q.taxa_acerto != null && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5">
                          <BarChart3 className="h-3 w-3" />
                          {Number(q.taxa_acerto).toFixed(0)}% acerto
                        </span>
                      </>
                    )}
                    {q.quantidade_avaliacoes > 0 && (
                      <>
                        <span>·</span>
                        <span>{q.quantidade_avaliacoes} aval.</span>
                      </>
                    )}
                    {q.habilidade && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5 font-medium text-foreground/90">
                          <Target className="h-3 w-3" />
                          {q.habilidade}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
