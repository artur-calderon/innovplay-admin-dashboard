import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useDashboardStats, 
  useComprehensiveDashboardStats, 
  useGlobalResultsStats, 
  useEvaluationStatusStats,
  useEvaluationsListWithAggregates
} from '@/hooks/use-cache';
import { BarChart3, TrendingUp, Users, FileText, Clock, Award, School, Target } from 'lucide-react';

// Componente de exemplo demonstrando como usar os novos endpoints
export function DashboardChartsExample() {
  // Usar os novos hooks para obter dados dos endpoints
  const { data: dashboardStats, isLoading: loadingDashboard } = useDashboardStats();
  const { data: comprehensiveStats, isLoading: loadingComprehensive } = useComprehensiveDashboardStats();
  const { data: globalStats, isLoading: loadingGlobal } = useGlobalResultsStats();
  const { data: statusStats, isLoading: loadingStatus } = useEvaluationStatusStats();
  const { data: evaluationsList, isLoading: loadingList } = useEvaluationsListWithAggregates(1, 5);

  return (
    <div className="space-y-6">
      {/* Métricas Gerais do Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingDashboard ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{dashboardStats?.total_evaluations || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardStats?.this_month_evaluations || 0} este mês
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliações Ativas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingDashboard ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {dashboardStats?.active_evaluations || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboardStats?.pending_evaluations || 0} pendentes
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingDashboard ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{dashboardStats?.total_students || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardStats?.average_completion_rate || 0}% taxa de conclusão
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Global</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingGlobal ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-600">
                  {globalStats?.media_nota_global?.toFixed(1) || '0.0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {globalStats?.disciplina_melhor_desempenho?.nome || 'N/A'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas de Status (ideal para gráfico de pizza/donut) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Distribuição por Status
          </CardTitle>
          <CardDescription>
            Ideal para gráficos de pizza ou donut
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingStatus ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <div className="space-y-3">
              {statusStats?.by_status.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={item.status === 'concluida' ? 'default' : 'secondary'}>
                      {item.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {item.count} avaliações
                    </span>
                  </div>
                  <span className="font-semibold">{item.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas Ampliadas (ideal para múltiplos gráficos) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por Disciplina</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingComprehensive ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(comprehensiveStats?.evaluations.by_subject || {}).map(([subject, count]) => (
                  <div key={subject} className="flex justify-between text-sm">
                    <span>{subject}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <School className="h-4 w-4" />
              Escolas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingComprehensive ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {comprehensiveStats?.schools.total || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {comprehensiveStats?.schools.with_evaluations || 0} com avaliações
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingComprehensive ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-600">
                  {comprehensiveStats?.performance.average_score?.toFixed(1) || '0.0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {comprehensiveStats?.performance.completion_rate?.toFixed(1) || '0.0'}% conclusão
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de Avaliações com Agregados (ideal para tabelas/rankings) */}
      <Card>
        <CardHeader>
          <CardTitle>Avaliações Recentes</CardTitle>
          <CardDescription>
            Lista com agregados - ideal para tabelas de ranking/andamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {evaluationsList?.data.map((evaluation) => (
                <div key={evaluation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm">{evaluation.titulo}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{evaluation.disciplina}</span>
                      <span>•</span>
                      <span>{evaluation.escola}</span>
                      <span>•</span>
                      <Badge variant={evaluation.status === 'concluida' ? 'default' : 'secondary'} className="text-xs">
                        {evaluation.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-semibold text-sm">
                      {evaluation.alunos_concluidos}/{evaluation.total_alunos}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {evaluation.progress_percentage.toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações sobre os Endpoints */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">📊 Endpoints Implementados</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 space-y-2">
          <p><strong>GET /dashboard/stats:</strong> Métricas gerais (cards principais)</p>
          <p><strong>GET /dashboard/comprehensive-stats:</strong> Estatísticas ampliadas (múltiplos gráficos)</p>
          <p><strong>GET /evaluation-results/stats:</strong> Estatísticas globais dos resultados</p>
          <p><strong>GET /evaluation-results/list:</strong> Lista com agregados (tabelas/rankings)</p>
          <p><strong>GET /evaluation-results/avaliacoes:</strong> Visão consolidada filtrável ✅ <em>Nova API Unificada</em></p>
          <p><strong>GET /evaluation-results/avaliacoes/estatisticas-status:</strong> Para gráficos de pizza/donut</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default DashboardChartsExample;
