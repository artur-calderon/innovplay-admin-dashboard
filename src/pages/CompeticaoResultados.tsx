import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Trophy, 
  Users, 
  BarChart3, 
  Medal, 
  Coins,
  Calendar,
  ArrowLeft,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Target,
  Filter,
  School,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/authContext';
import { CompetitionsApiService } from '@/services/competitionsApi';
import { getErrorMessage, getErrorSuggestion } from '@/utils/errorHandler';

// Reutilizando componentes existentes de avaliações
import { ResultsCharts } from '@/components/evaluations/ResultsCharts';
import { StudentRanking } from '@/components/evaluations/StudentRanking';
import { DisciplineTables } from '@/components/evaluations/DisciplineTables';
import { ClassStatistics } from '@/components/evaluations/ClassStatistics';
import { formatCoins } from '@/utils/coins';

import type { 
  Competition, 
  CompetitionResultsResponse, 
  CompetitionRanking 
} from '@/types/competition-types';

const CompeticaoResultados = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Estados
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [results, setResults] = useState<CompetitionResultsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('ranking');

  // Filtros
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [schools, setSchools] = useState<{ id: string; nome: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; nome: string }[]>([]);

  // Carregar dados
  useEffect(() => {
    if (competitionId) {
      loadResults();
    }
  }, [competitionId]);

  // Carregar filtros quando competição carrega
  useEffect(() => {
    if (competitionId) {
      loadFilters();
    }
  }, [competitionId]);

  const loadResults = async () => {
    if (!competitionId) return;

    try {
      setIsLoading(true);
      
      const filters: Record<string, string> = {};
      if (selectedSchool !== 'all') filters.escola_id = selectedSchool;
      if (selectedClass !== 'all') filters.turma_id = selectedClass;

      const data = await CompetitionsApiService.getCompetitionResults(competitionId, filters);
      setResults(data);
      setCompetition(data.competicao);
    } catch (error) {
      console.error('Erro ao carregar resultados:', error);
      
      const errorMessage = getErrorMessage(error, "Não foi possível carregar os resultados. Tente novamente.");
      const suggestion = getErrorSuggestion(error);
      
      toast({
        title: "Erro ao carregar",
        description: suggestion ? `${errorMessage} ${suggestion}` : errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFilters = async () => {
    if (!competitionId) return;

    try {
      const schoolsData = await CompetitionsApiService.getParticipatingSchools(competitionId);
      setSchools(schoolsData);
      
      if (selectedSchool !== 'all') {
        const classesData = await CompetitionsApiService.getParticipatingClasses(
          competitionId, 
          selectedSchool
        );
        setClasses(classesData);
      }
    } catch (error) {
      console.error('Erro ao carregar filtros:', error);
      setSchools([]);
      setClasses([]);
    }
  };

  // Atualizar classes quando escola muda
  useEffect(() => {
    if (selectedSchool !== 'all' && competitionId) {
      CompetitionsApiService.getParticipatingClasses(competitionId, selectedSchool)
        .then(setClasses)
        .catch(() => setClasses([]));
    } else {
      setClasses([]);
    }
    setSelectedClass('all');
  }, [selectedSchool, competitionId]);

  // Recarregar resultados quando filtros mudam
  useEffect(() => {
    if (competitionId) {
      loadResults();
    }
  }, [selectedSchool, selectedClass]);

  // Exportar resultados
  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!competitionId) return;

    try {
      setIsExporting(true);
      
      const filters: Record<string, string> = {};
      if (selectedSchool !== 'all') filters.escola_id = selectedSchool;
      if (selectedClass !== 'all') filters.turma_id = selectedClass;

      const blob = format === 'excel'
        ? await CompetitionsApiService.exportResultsExcel(competitionId, filters)
        : await CompetitionsApiService.exportResultsPdf(competitionId, filters);

      // Download do arquivo
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `competicao_${competitionId}_resultados.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Download iniciado',
        description: `O arquivo ${format.toUpperCase()} está sendo baixado.`
      });
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar o arquivo de exportação.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Formatar tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Classificação por cor
  const getClassificationColor = (classificacao: string) => {
    switch (classificacao?.toLowerCase()) {
      case 'avançado':
      case 'avancado':
        return 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400';
      case 'adequado':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400';
      case 'básico':
      case 'basico':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400';
      default:
        return 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400';
    }
  };

  // Dados para o componente de ranking (adaptando para o formato esperado)
  const rankingData = useMemo(() => {
    if (!results?.ranking) return [];
    
    return results.ranking.map((item, index) => ({
      id: item.aluno_id,
      aluno_id: item.aluno_id,
      nome: item.aluno_nome,
      turma: item.turma,
      escola: item.escola,
      nota: item.nota,
      nota_geral: item.nota,
      proficiencia: item.proficiencia || 0,
      proficiencia_geral: item.proficiencia || 0,
      classificacao: (item.classificacao || 'Básico') as 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado',
      classificacao_geral: item.classificacao || 'Básico',
      total_questoes: item.total_questoes,
      total_acertos: item.acertos,
      moedas_ganhas: item.moedas_ganhas || 0,
      posicao: index + 1,
      status: 'concluida' as const
    }));
  }, [results?.ranking]);

  // Dados para o componente de gráficos (adaptando formato)
  const chartData = useMemo(() => {
    if (!results?.estatisticas) return null;

    return {
      notaMedia: results.estatisticas.media_nota,
      proficienciaMedia: results.estatisticas.media_proficiencia,
      distribuicaoClassificacao: results.estatisticas.distribuicao_classificacao,
      tempoMedio: results.estatisticas.media_tempo,
      maiorNota: results.estatisticas.maior_nota,
      menorNota: results.estatisticas.menor_nota
    };
  }, [results?.estatisticas]);

  // Loading
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!results || !competition) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trophy className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Resultados não encontrados</h2>
            <p className="text-muted-foreground mb-4">
              Não foi possível carregar os resultados desta competição.
            </p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { estatisticas, ranking, top_3 } = results;
  const basePath = user?.role === 'aluno' ? '/aluno' : '/app';

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className={`w-14 h-14 ${competition.cor || 'bg-gradient-to-br from-blue-500 to-purple-600'} rounded-full flex items-center justify-center text-2xl shadow-lg`}>
            {competition.icone || '🏆'}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{competition.titulo}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{competition.disciplina_nome || competition.disciplina_id}</Badge>
              <Badge className={
                competition.status === 'finalizada' 
                  ? 'bg-gray-100 text-gray-800' 
                  : 'bg-green-100 text-green-800'
              }>
                {competition.status === 'finalizada' ? 'Finalizada' : 'Em Andamento'}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => loadResults()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleExport('excel')}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 dark:from-blue-950/30 to-blue-100 dark:to-blue-950/40 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {estatisticas.total_participantes}
            </div>
            <div className="text-xs text-muted-foreground">Participantes</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 dark:from-green-950/30 to-green-100 dark:to-green-950/40 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {estatisticas.media_nota.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Média</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 dark:from-yellow-950/30 to-yellow-100 dark:to-yellow-950/40 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4 text-center">
            <Medal className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {estatisticas.maior_nota.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Maior Nota</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 dark:from-red-950/30 to-red-100 dark:to-red-950/40 border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {estatisticas.menor_nota.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Menor Nota</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 dark:from-purple-950/30 to-purple-100 dark:to-purple-950/40 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatTime(estatisticas.media_tempo)}
            </div>
            <div className="text-xs text-muted-foreground">Tempo Médio</div>
          </CardContent>
        </Card>
      </div>

      {/* Pódio */}
      {top_3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Pódio
            </CardTitle>
            <CardDescription>Os três melhores colocados da competição</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row justify-center items-end gap-4 py-6">
              {/* 2º Lugar */}
              {top_3.segundo && (
                <div className="flex flex-col items-center order-1 md:order-none">
                  <div className="text-4xl mb-2">🥈</div>
                  <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">2º</span>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="font-semibold truncate max-w-28">{top_3.segundo.aluno_nome}</p>
                    <p className="text-sm text-muted-foreground">{top_3.segundo.turma}</p>
                    <Badge className="mt-2 bg-gray-500">
                      <Coins className="w-3 h-3 mr-1" />
                      {top_3.segundo.moedas_ganhas}
                    </Badge>
                    <p className="text-lg font-bold mt-1">{top_3.segundo.nota.toFixed(1)}</p>
                  </div>
                </div>
              )}

              {/* 1º Lugar */}
              {top_3.primeiro && (
                <div className="flex flex-col items-center order-0 md:order-none scale-110">
                  <div className="text-5xl mb-2">🥇</div>
                  <div className="w-28 h-28 bg-yellow-100 dark:bg-yellow-950/30 rounded-lg flex flex-col items-center justify-center border-2 border-yellow-400">
                    <span className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">1º</span>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="font-bold truncate max-w-32">{top_3.primeiro.aluno_nome}</p>
                    <p className="text-sm text-muted-foreground">{top_3.primeiro.turma}</p>
                    <Badge className="mt-2 bg-yellow-500">
                      <Coins className="w-3 h-3 mr-1" />
                      {top_3.primeiro.moedas_ganhas}
                    </Badge>
                    <p className="text-xl font-bold mt-1 text-yellow-600 dark:text-yellow-400">
                      {top_3.primeiro.nota.toFixed(1)}
                    </p>
                  </div>
                </div>
              )}

              {/* 3º Lugar */}
              {top_3.terceiro && (
                <div className="flex flex-col items-center order-2 md:order-none">
                  <div className="text-4xl mb-2">🥉</div>
                  <div className="w-24 h-24 bg-orange-100 dark:bg-orange-950/30 rounded-lg flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">3º</span>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="font-semibold truncate max-w-28">{top_3.terceiro.aluno_nome}</p>
                    <p className="text-sm text-muted-foreground">{top_3.terceiro.turma}</p>
                    <Badge className="mt-2 bg-orange-500">
                      <Coins className="w-3 h-3 mr-1" />
                      {top_3.terceiro.moedas_ganhas}
                    </Badge>
                    <p className="text-lg font-bold mt-1">{top_3.terceiro.nota.toFixed(1)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger className="w-48">
                <School className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Escola" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Escolas</SelectItem>
                {schools.map(school => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={selectedClass} 
              onValueChange={setSelectedClass}
              disabled={selectedSchool === 'all'}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Turmas</SelectItem>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(selectedSchool !== 'all' || selectedClass !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSelectedSchool('all');
                  setSelectedClass('all');
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs com conteúdo */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ranking">
            <Trophy className="w-4 h-4 mr-2" />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="charts">
            <BarChart3 className="w-4 h-4 mr-2" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="distribution">
            <Target className="w-4 h-4 mr-2" />
            Distribuição
          </TabsTrigger>
          <TabsTrigger value="statistics">
            <Users className="w-4 h-4 mr-2" />
            Estatísticas
          </TabsTrigger>
        </TabsList>

        {/* Tab: Ranking */}
        <TabsContent value="ranking" className="mt-6 space-y-6">
          {/* Ranking Visual com StudentRanking */}
          <StudentRanking 
            students={rankingData}
            maxStudents={100}
            showCoins={true}
            isCompetition={true}
          />
          
          {/* Tabela Detalhada */}
          <Card>
            <CardHeader>
              <CardTitle>Ranking Completo - Tabela Detalhada</CardTitle>
              <CardDescription>
                {ranking.length} participante(s) classificado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Posição</th>
                      <th className="text-left py-3 px-4">Aluno</th>
                      <th className="text-left py-3 px-4">Turma</th>
                      <th className="text-left py-3 px-4">Escola</th>
                      <th className="text-center py-3 px-4">Nota</th>
                      <th className="text-center py-3 px-4">Acertos</th>
                      <th className="text-center py-3 px-4">Classificação</th>
                      <th className="text-center py-3 px-4">Moedas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((item, index) => (
                      <tr 
                        key={item.aluno_id} 
                        className={`border-b hover:bg-muted/50 ${
                          index < 3 ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {item.posicao === 1 && <span className="text-xl">🥇</span>}
                            {item.posicao === 2 && <span className="text-xl">🥈</span>}
                            {item.posicao === 3 && <span className="text-xl">🥉</span>}
                            <span className={`font-bold ${item.posicao <= 3 ? 'text-yellow-600' : ''}`}>
                              {item.posicao}º
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium">{item.aluno_nome}</td>
                        <td className="py-3 px-4 text-muted-foreground">{item.turma}</td>
                        <td className="py-3 px-4 text-muted-foreground">{item.escola}</td>
                        <td className="py-3 px-4 text-center font-bold">{item.nota.toFixed(1)}</td>
                        <td className="py-3 px-4 text-center">
                          {item.acertos}/{item.total_questoes}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={getClassificationColor(item.classificacao || '')}>
                            {item.classificacao}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.moedas_ganhas > 0 ? (
                            <Badge className="bg-yellow-500">
                              <Coins className="w-3 h-3 mr-1" />
                              {formatCoins(item.moedas_ganhas)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Gráficos */}
        <TabsContent value="charts" className="mt-6">
          {chartData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribuição de Classificação */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Classificação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: 'Avançado', value: estatisticas.distribuicao_classificacao?.avancado || 0, color: 'bg-green-500' },
                      { label: 'Adequado', value: estatisticas.distribuicao_classificacao?.adequado || 0, color: 'bg-blue-500' },
                      { label: 'Básico', value: estatisticas.distribuicao_classificacao?.basico || 0, color: 'bg-yellow-500' },
                      { label: 'Abaixo do Básico', value: estatisticas.distribuicao_classificacao?.abaixo_do_basico || 0, color: 'bg-red-500' }
                    ].map((item) => {
                      const total = Object.values(estatisticas.distribuicao_classificacao || {}).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? (item.value / total) * 100 : 0;
                      
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">{item.label}</span>
                            <span className="text-sm text-muted-foreground">
                              {item.value} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <Progress value={percentage} className={`h-3 ${item.color}`} />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Resumo de Notas */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo de Notas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Maior Nota</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {estatisticas.maior_nota.toFixed(1)}
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-500" />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Média</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {estatisticas.media_nota.toFixed(1)}
                        </p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-blue-500" />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Menor Nota</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {estatisticas.menor_nota.toFixed(1)}
                        </p>
                      </div>
                      <TrendingDown className="w-8 h-8 text-red-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Tab: Distribuição */}
        <TabsContent value="distribution" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Participantes</CardTitle>
              <CardDescription>
                Análise detalhada da participação na competição
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {estatisticas.total_inscritos}
                  </div>
                  <p className="text-muted-foreground mt-2">Total de Inscritos</p>
                </div>
                
                <div className="text-center p-6 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                    {estatisticas.total_participantes}
                  </div>
                  <p className="text-muted-foreground mt-2">Participaram</p>
                </div>
                
                <div className="text-center p-6 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                  <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                    {estatisticas.total_finalizados}
                  </div>
                  <p className="text-muted-foreground mt-2">Finalizaram</p>
                </div>
              </div>

              {/* Taxa de conversão */}
              <div className="mt-8">
                <h4 className="font-medium mb-4">Taxa de Conclusão</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Participação</span>
                      <span className="text-sm text-muted-foreground">
                        {((estatisticas.total_participantes / estatisticas.total_inscritos) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={(estatisticas.total_participantes / estatisticas.total_inscritos) * 100} 
                      className="h-3"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Conclusão</span>
                      <span className="text-sm text-muted-foreground">
                        {((estatisticas.total_finalizados / estatisticas.total_participantes) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={(estatisticas.total_finalizados / estatisticas.total_participantes) * 100} 
                      className="h-3"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Estatísticas */}
        <TabsContent value="statistics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Desempenho</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Média de Nota</span>
                    <span className="font-bold">{estatisticas.media_nota.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Desvio Padrão</span>
                    <span className="font-bold">{estatisticas.desvio_padrao?.toFixed(2) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Maior Nota</span>
                    <span className="font-bold text-green-600">{estatisticas.maior_nota.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Menor Nota</span>
                    <span className="font-bold text-red-600">{estatisticas.menor_nota.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Amplitude</span>
                    <span className="font-bold">
                      {(estatisticas.maior_nota - estatisticas.menor_nota).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Tempo Médio</span>
                    <span className="font-bold">{formatTime(estatisticas.media_tempo)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Duração da Competição</span>
                    <span className="font-bold">{competition.duracao} min</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Tempo Limite</span>
                    <span className="font-bold">{competition.duracao * 60}s</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Uso Médio do Tempo</span>
                    <span className="font-bold">
                      {((estatisticas.media_tempo / (competition.duracao * 60)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompeticaoResultados;

