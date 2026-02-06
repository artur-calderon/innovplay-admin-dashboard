/**
 * Página de Analytics da Competição (Admin).
 * Rota: /app/competitions/:id/analytics
 * Exibe gráficos, métricas e top 10 alunos.
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Trophy, Users, Award, TrendingUp, BarChart3, PieChart, LineChart } from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getCompetitionAnalytics, type CompetitionAnalytics } from '@/services/competitionsApi';
import { getCompetition } from '@/services/competitionsApi';
import { formatCoins, getMedalEmoji } from '@/utils/coins';

const COLORS = ['#81338A', '#758E4F', '#F6AE2D', '#33658A', '#86BBD8'];

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

  // Helpers numéricos
  const toNumber = (value: unknown, fallback = 0): number => {
    if (value == null) return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  // Contagens derivadas a partir das métricas do backend
  const totalEligible = toNumber(analytics.enrollment?.eligible_students);
  const totalEnrolled = toNumber(analytics.enrollment?.enrolled_students);
  const totalParticipants = toNumber(analytics.participation?.participated_students);

  const enrollmentRate = toNumber(analytics.enrollment_rate || analytics.enrollment?.rate);
  const participationRate = toNumber(analytics.participation_rate || analytics.participation?.rate);

  const averageGrade = analytics.averages?.grade ?? null;
  const completionRate =
    totalEnrolled > 0 ? (totalParticipants / totalEnrolled) * 100 : 0;

  // Dados para gráfico de pizza - Taxa de inscrição
  const enrollmentPieData = [
    { name: 'Inscritos', value: totalEnrolled },
    { name: 'Não inscritos', value: Math.max(0, totalEligible - totalEnrolled) },
  ].filter(item => item.value > 0);

  // Dados para gráfico de pizza - Taxa de participação
  const participationPieData = [
    { name: 'Participantes', value: totalParticipants },
    { name: 'Não participaram', value: Math.max(0, totalEnrolled - totalParticipants) },
  ].filter(item => item.value > 0);

  // Dados para gráfico de barras - Distribuição de notas
  const gradeBarData = analytics.grade_distribution.map(item => ({
    name: item.range,
    Quantidade: item.count,
  }));

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
            <p className="text-xs text-muted-foreground">
              de {totalEligible} elegíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participantes</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalParticipants}</div>
            <p className="text-xs text-muted-foreground">
              {participationRate.toFixed(1)}% dos inscritos
            </p>
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
            <p className="text-xs text-muted-foreground">
              {completionRate.toFixed(1)}% concluíram
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Inscrição</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrollmentRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Inscritos / Elegíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Participação</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{participationRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Participantes / Inscritos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico Pizza - Taxa de Inscrição */}
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
                    {enrollmentPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sem dados de inscrição
              </p>
            )}
          </CardContent>
        </Card>

        {/* Gráfico Pizza - Taxa de Participação */}
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
                    {participationPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sem dados de participação
              </p>
            )}
          </CardContent>
        </Card>

        {/* Gráfico Barra - Distribuição de Notas */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Distribuição de Notas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gradeBarData.some(item => item.Quantidade > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gradeBarData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Quantidade" fill="#81338A" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sem dados de distribuição de notas
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Alunos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top 10 Alunos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(analytics.top_10 ?? []).length > 0 ? (
            <div className="space-y-2">
              {analytics.top_10!.map((entry) => (
                <div
                  key={entry.student_id ?? entry.name}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold w-8">
                      {getMedalEmoji(entry.position) || `${entry.position ?? ''}º`}
                    </span>
                    <div>
                      <p className="font-medium">{entry.name}</p>
                      {entry.class_name && (
                        <p className="text-xs text-muted-foreground">{entry.class_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {entry.value_label ?? entry.grade ?? entry.proficiency ?? entry.score_percentage ?? entry.value}
                    </p>
                    {entry.coins_earned != null && Number(entry.coins_earned) > 0 && (
                      <Badge variant="secondary" className="mt-1">
                        +{formatCoins(entry.coins_earned)} moedas
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum participante no ranking ainda
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
