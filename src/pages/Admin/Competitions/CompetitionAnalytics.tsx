/**
 * Página de Analytics da Competição (Admin).
 * Rota: /app/competitions/:id/analytics
 * Exibe gráficos, métricas, tabelas e ranking usando os mesmos componentes de Results.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, Trophy, Users, Award, TrendingUp, BarChart3, PieChart, BookOpen, Table2 } from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getCompetitionAnalytics, type CompetitionAnalytics } from '@/services/competitionsApi';
import type { CompetitionRankingEntry } from '@/services/competitionsApi';
import { getCompetition } from '@/services/competitionsApi';
import { formatCoins, getMedalEmoji } from '@/utils/coins';
import { ResultsCharts } from '@/components/evaluations/ResultsCharts';
import { ClassStatistics } from '@/components/evaluations/ClassStatistics';
import { StudentRanking } from '@/components/evaluations/StudentRanking';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const COLORS = ['#81338A', '#758E4F', '#F6AE2D', '#33658A', '#86BBD8'];

type StageGroup = 'group1' | 'group2';

/** Converte grade_distribution (faixas do backend) em distribuicao_classificacao para gráficos/estatísticas. */
function gradeDistributionToClassificacao(
  gradeDistribution: { range: string; count: number }[]
): { abaixo_do_basico: number; basico: number; adequado: number; avancado: number } {
  const d = { abaixo_do_basico: 0, basico: 0, adequado: 0, avancado: 0 };
  if (!gradeDistribution?.length) return d;
  const n = gradeDistribution.length;
  gradeDistribution.forEach((item, i) => {
    const count = Number(item.count) || 0;
    if (n <= 4) {
      if (i === 0) d.abaixo_do_basico += count;
      else if (i === 1) d.basico += count;
      else if (i === 2) d.adequado += count;
      else d.avancado += count;
    } else {
      if (i <= 1) d.abaixo_do_basico += count;
      else if (i === 2) d.basico += count;
      else if (i === 3) d.adequado += count;
      else d.avancado += count;
    }
  });
  return d;
}

/** Converte score_percentage em classificacao para StudentRanking. */
function scoreToClassificacao(
  scorePercent: number | undefined,
  value: number | undefined
): 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado' {
  const p = scorePercent ?? (typeof value === 'number' ? value : 0);
  if (p < 25) return 'Abaixo do Básico';
  if (p < 50) return 'Básico';
  if (p < 75) return 'Adequado';
  return 'Avançado';
}

export default function CompetitionAnalytics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<CompetitionAnalytics | null>(null);
  const [competitionName, setCompetitionName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/app/competitions');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [analyticsData, competitionData] = await Promise.all([
          getCompetitionAnalytics(id),
          getCompetition(id).catch(() => null),
        ]);

        setAnalytics(analyticsData);
        if (competitionData) {
          setCompetitionName(competitionData.name);
        }
      } catch (err) {
        console.error('Erro ao carregar analytics:', err);
        setError('Não foi possível carregar os dados de analytics.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const toNumber = (value: unknown, fallback = 0): number => {
    if (value == null) return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  // Dados adaptados para ResultsCharts (estatisticas_gerais + resultados_por_disciplina)
  const chartsApiData = useMemo(() => {
    if (!analytics) return null;
    const avgGrade = analytics.averages?.grade ?? 0;
    const avgProf = analytics.averages?.proficiency ?? 0;
    const dist = gradeDistributionToClassificacao(analytics.grade_distribution ?? []);
    return {
      estatisticas_gerais: {
        media_nota_geral: toNumber(avgGrade),
        media_proficiencia_geral: toNumber(avgProf),
      },
      resultados_por_disciplina: [
        {
          disciplina: competitionName || 'Competição',
          media_nota: toNumber(avgGrade),
          media_proficiencia: toNumber(avgProf),
          distribuicao_classificacao: dist,
        },
      ],
    };
  }, [analytics, competitionName]);

  const chartsEvaluationInfo = useMemo(
    () =>
      analytics
        ? {
            id: id ?? '',
            titulo: competitionName || 'Competição',
            total_alunos: toNumber(analytics.participation?.participated_students),
            alunos_participantes: toNumber(analytics.participation?.participated_students),
            alunos_ausentes: 0,
            media_nota: toNumber(analytics.averages?.grade),
            media_proficiencia: toNumber(analytics.averages?.proficiency),
          }
        : null,
    [analytics, id, competitionName]
  );

  const inferStageGroup = (): StageGroup => 'group1';
  const getMaxForDiscipline = (_disciplina: string, _group: StageGroup): number => 500;

  // Dados adaptados para ClassStatistics (estatisticas_gerais)
  const classStatsApiData = useMemo(() => {
    if (!analytics) return null;
    const participated = toNumber(analytics.participation?.participated_students);
    const dist = gradeDistributionToClassificacao(analytics.grade_distribution ?? []);
    return {
      // 'avaliacao' indica visão geral, usada pelo ClassStatistics para exibir \"Geral\"
      nivel_granularidade: 'avaliacao' as const,
      estatisticas_gerais: {
        tipo: 'competição',
        nome: competitionName || 'Competição',
        total_alunos: participated,
        alunos_participantes: participated,
        alunos_ausentes: 0,
        media_nota_geral: toNumber(analytics.averages?.grade),
        media_proficiencia_geral: toNumber(analytics.averages?.proficiency),
        distribuicao_classificacao: dist,
      },
    };
  }, [analytics, competitionName]);

  // Alunos para StudentRanking (top_10 mapeado para o formato esperado)
  const rankingStudents = useMemo(() => {
    const top10 = analytics?.top_10 ?? [];
    return top10.map((entry: CompetitionRankingEntry) => {
      // Backend pode enviar o nome em \"name\" ou \"student_name\"
      const rawName =
        (entry as any).name ??
        (entry as any).student_name ??
        '';
      const nota = typeof entry.score_percentage === 'number' ? entry.score_percentage : toNumber(entry.value);
      const proficiencia = toNumber(entry.proficiency ?? entry.value);
      return {
        id: entry.student_id ?? '',
        nome: String(rawName),
        turma: entry.class_name ?? '—',
        nota,
        proficiencia,
        classificacao: scoreToClassificacao(entry.score_percentage, entry.value),
        status: 'concluida' as const,
        moedas_ganhas: entry.coins_earned,
        posicao: entry.position,
      };
    });
  }, [analytics?.top_10]);

  if (loading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="ghost" onClick={() => navigate(`/app/competitions/${id}`)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <p className="text-destructive">{error || 'Dados não disponíveis.'}</p>
      </div>
    );
  }

  const totalEligible = toNumber(analytics.enrollment?.eligible_students);
  const totalEnrolled = toNumber(analytics.enrollment?.enrolled_students);
  const totalParticipants = toNumber(analytics.participation?.participated_students);
  const enrollmentRate = toNumber(analytics.enrollment_rate || analytics.enrollment?.rate);
  const participationRate = toNumber(analytics.participation_rate || analytics.participation?.rate);
  const averageGrade = analytics.averages?.grade ?? null;
  const completionRate = totalEnrolled > 0 ? (totalParticipants / totalEnrolled) * 100 : 0;

  const enrollmentPieData = [
    { name: 'Inscritos', value: totalEnrolled },
    { name: 'Não inscritos', value: Math.max(0, totalEligible - totalEnrolled) },
  ].filter((item) => item.value > 0);

  const participationPieData = [
    { name: 'Participantes', value: totalParticipants },
    { name: 'Não participaram', value: Math.max(0, totalEnrolled - totalParticipants) },
  ].filter((item) => item.value > 0);

  const gradeBarData = (analytics.grade_distribution ?? []).map((item) => ({
    name: item.range,
    Quantidade: item.count,
  }));

  const top10 = analytics.top_10 ?? [];

  return (
    <div className="container mx-auto space-y-6 py-6 px-4">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate(`/app/competitions/${id}`)} className="mb-2 -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            <Trophy className="h-6 w-6" />
            Analytics - {competitionName || 'Competição'}
          </h1>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inscritos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEnrolled}</div>
            <p className="text-xs text-muted-foreground">de {totalEligible} elegíveis</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participantes</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalParticipants}</div>
            <p className="text-xs text-muted-foreground">{participationRate.toFixed(1)}% dos inscritos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média de Nota</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageGrade != null ? toNumber(averageGrade).toFixed(1) : '—'}
            </div>
            <p className="text-xs text-muted-foreground">{completionRate.toFixed(1)}% concluíram</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Inscrição</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrollmentRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Inscritos / Elegíveis</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Participação</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{participationRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Participantes / Inscritos</p>
          </CardContent>
        </Card>
      </div>

      {/* Abas: Gráficos | Tabelas | Estatísticas | Ranking */}
      <Tabs defaultValue="charts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="tables" className="flex items-center gap-2">
            <Table2 className="h-4 w-4" />
            Tabelas
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Estatísticas gerais
          </TabsTrigger>
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Ranking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-6 mt-6">
          {/* Gráficos do Results (média nota, proficiência, distribuição) */}
          {chartsApiData?.estatisticas_gerais && chartsApiData?.resultados_por_disciplina ? (
            <ResultsCharts
              apiData={chartsApiData}
              evaluationInfo={chartsEvaluationInfo}
              inferStageGroup={inferStageGroup}
              getMaxForDiscipline={getMaxForDiscipline}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">Não há dados suficientes para gerar os gráficos.</p>
              </CardContent>
            </Card>
          )}

          {/* Gráficos de pizza (inscrição e participação) */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Taxa de Inscrição
                </CardTitle>
              </CardHeader>
              <CardContent>
                {enrollmentPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={enrollmentPieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {enrollmentPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados de inscrição</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Taxa de Participação
                </CardTitle>
              </CardHeader>
              <CardContent>
                {participationPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={participationPieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {participationPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados de participação</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tables" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="h-5 w-5" />
                Resultados dos Alunos
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Top 10 participantes da competição.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {top10.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead className="hidden sm:table-cell">Turma</TableHead>
                        <TableHead className="text-right">Nota / Resultado</TableHead>
                        <TableHead className="text-right w-24">Moedas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {top10.map((entry) => (
                        <TableRow key={`${entry.student_id}-${entry.position}`}>
                          <TableCell className="font-medium">
                            {getMedalEmoji(entry.position) || `${entry.position}º`}
                          </TableCell>
                          <TableCell>{entry.name}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {entry.class_name ?? '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.value_label ?? entry.score_percentage ?? entry.value}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.coins_earned != null && entry.coins_earned > 0
                              ? `+${formatCoins(entry.coins_earned)}`
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum participante no ranking ainda
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6 mt-6">
          {classStatsApiData ? (
            <>
              <div>
                <h2 className="text-lg font-semibold">Estatísticas gerais da competição</h2>
                <p className="text-sm text-muted-foreground">
                  Visão consolidada de desempenho e participação da competição como um todo.
                </p>
              </div>
              <ClassStatistics apiData={classStatsApiData} />
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">Não há dados de estatísticas disponíveis.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ranking" className="space-y-6 mt-6">
          <StudentRanking
            students={rankingStudents}
            maxStudents={50}
            showCoins={true}
            isCompetition={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
