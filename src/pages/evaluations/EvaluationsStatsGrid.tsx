import type { LucideIcon } from "lucide-react";
import { BarChart3, FileText, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { EvaluationDashboardStats } from "./evaluationsPage.types";

interface EvaluationsStatsGridProps {
  stats: EvaluationDashboardStats;
  isLoading: boolean;
}

type StatItem = {
  id: string;
  title: string;
  icon: LucideIcon;
  getValue: (s: EvaluationDashboardStats) => number;
  getDescription: (s: EvaluationDashboardStats) => string;
};

const STAT_ITEMS: StatItem[] = [
  {
    id: "total",
    title: "Total de Avaliações",
    icon: FileText,
    getValue: (s) => s.total,
    getDescription: (s) =>
      `${s.virtualEvaluations} virtuais • ${s.physicalEvaluations} físicas`,
  },
  {
    id: "month",
    title: "Este mês",
    icon: TrendingUp,
    getValue: (s) => s.thisMonth,
    getDescription: () => "Avaliações criadas no período",
  },
  {
    id: "results",
    title: "Resultados",
    icon: BarChart3,
    getValue: (s) => s.completedEvaluations,
    getDescription: (s) => `${s.pendingResults} pendentes de correção`,
  },
  {
    id: "questions",
    title: "Banco de questões",
    icon: Users,
    getValue: (s) => s.totalQuestions,
    getDescription: (s) => `Média de ${s.averageQuestions} por avaliação`,
  },
];

export function EvaluationsStatsGrid({ stats, isLoading }: EvaluationsStatsGridProps) {
  return (
    <section
      aria-labelledby="evaluations-stats-heading"
      className="scroll-mt-4"
    >
      <h2 id="evaluations-stats-heading" className="sr-only">
        Visão geral em números
      </h2>
      <ul
        className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4"
        role="list"
      >
        {STAT_ITEMS.map((item) => {
          const Icon = item.icon;
          const value = item.getValue(stats);
          const description = item.getDescription(stats);
          return (
            <li key={item.id}>
              <Card
                className={cn(
                  "h-full border-border/80 transition-shadow duration-200",
                  "hover:border-border hover:shadow-md",
                  "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">
                    {item.title}
                  </CardTitle>
                  <Icon
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </CardHeader>
                <CardContent className="space-y-1">
                  <div
                    className="text-2xl font-bold tabular-nums tracking-tight"
                    aria-live={isLoading ? "polite" : "off"}
                    aria-busy={isLoading}
                  >
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" aria-hidden />
                    ) : (
                      value
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
