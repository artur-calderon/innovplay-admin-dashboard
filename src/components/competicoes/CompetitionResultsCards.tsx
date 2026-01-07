import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, 
  Users, 
  BarChart3, 
  Medal, 
  Coins,
  Calendar,
  Clock,
  ArrowRight,
  Crown,
  TrendingUp
} from 'lucide-react';
import { CompetitionsApiService } from '@/services/competitionsApi';
import type { Competition, CompetitionResultsCardsProps, CompetitionResultsResponse } from '@/types/competition-types';

interface CompetitionResultsSummary {
  competition: Competition;
  estatisticas?: {
    total_participantes: number;
    media_nota: number;
    maior_nota: number;
  };
  top_3?: {
    primeiro?: { nome: string; nota: number; moedas: number };
    segundo?: { nome: string; nota: number; moedas: number };
    terceiro?: { nome: string; nota: number; moedas: number };
  };
}

export const CompetitionResultsCards = ({ 
  competitions, 
  onViewResults 
}: CompetitionResultsCardsProps) => {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState<CompetitionResultsSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSummaries();
  }, [competitions]);

  const loadSummaries = async () => {
    try {
      setIsLoading(true);
      
      // Carregar resumo de cada competição
      const summaryPromises = competitions.map(async (competition) => {
        try {
          const results = await CompetitionsApiService.getCompetitionResults(competition.id);
          return {
            competition,
            estatisticas: {
              total_participantes: results.estatisticas.total_participantes,
              media_nota: results.estatisticas.media_nota,
              maior_nota: results.estatisticas.maior_nota
            },
            top_3: {
              primeiro: results.top_3?.primeiro ? {
                nome: results.top_3.primeiro.aluno_nome,
                nota: results.top_3.primeiro.nota,
                moedas: results.top_3.primeiro.moedas_ganhas
              } : undefined,
              segundo: results.top_3?.segundo ? {
                nome: results.top_3.segundo.aluno_nome,
                nota: results.top_3.segundo.nota,
                moedas: results.top_3.segundo.moedas_ganhas
              } : undefined,
              terceiro: results.top_3?.terceiro ? {
                nome: results.top_3.terceiro.aluno_nome,
                nota: results.top_3.terceiro.nota,
                moedas: results.top_3.terceiro.moedas_ganhas
              } : undefined
            }
          };
        } catch {
          // Retornar dados básicos da competição em caso de erro
          return {
            competition,
            estatisticas: {
              total_participantes: competition.participantes_atual || 0,
              media_nota: 0,
              maior_nota: 0
            }
          };
        }
      });

      const results = await Promise.all(summaryPromises);
      setSummaries(results);
    } catch (error) {
      console.error('Erro ao carregar resumos:', error);
      // Usar dados básicos das competições em caso de erro
      setSummaries(competitions.map(competition => ({
        competition,
        estatisticas: {
          total_participantes: competition.participantes_atual || 0,
          media_nota: 0,
          maior_nota: 0
        }
      })));
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewResults = (competitionId: string) => {
    if (onViewResults) {
      onViewResults(competitionId);
    } else {
      navigate(`/app/competicoes/${competitionId}/resultados`);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
  };

  const getStatusConfig = (status: Competition['status']) => {
    const configs = {
      agendada: { label: 'Agendada', color: 'bg-yellow-100 text-yellow-800' },
      aberta: { label: 'Em Inscrições', color: 'bg-green-100 text-green-800' },
      em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
      finalizada: { label: 'Finalizada', color: 'bg-gray-100 text-gray-800' }
    };
    return configs[status] || configs.agendada;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum resultado disponível</h3>
          <p className="text-muted-foreground text-center">
            Os resultados aparecerão aqui após as competições serem finalizadas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {summaries.map(({ competition, estatisticas, top_3 }) => {
        const statusConfig = getStatusConfig(competition.status);
        
        return (
          <Card 
            key={competition.id} 
            className="hover:shadow-xl transition-all duration-300 border-2 overflow-hidden"
          >
            {/* Header com gradiente */}
            <div className={`p-4 ${competition.cor || 'bg-gradient-to-r from-blue-500 to-purple-600'} text-white`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                    {competition.icone || '🏆'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{competition.titulo}</h3>
                    <p className="text-sm opacity-90">{competition.disciplina_nome || competition.disciplina_id}</p>
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="p-4 space-y-4">
              {/* Status e Data */}
              <div className="flex items-center justify-between">
                <Badge className={statusConfig.color}>
                  {statusConfig.label}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {formatDate(competition.data_fim)}
                </div>
              </div>

              {/* Estatísticas */}
              {estatisticas && (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {estatisticas.total_participantes}
                    </div>
                    <div className="text-xs text-muted-foreground">Participantes</div>
                  </div>
                  <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {estatisticas.media_nota.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">Média</div>
                  </div>
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                    <Medal className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                      {estatisticas.maior_nota.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">Maior Nota</div>
                  </div>
                </div>
              )}

              {/* Top 3 - Pódio */}
              {competition.status === 'finalizada' && top_3?.primeiro && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Pódio</span>
                  </div>
                  
                  <div className="space-y-2">
                    {/* 1º Lugar */}
                    {top_3.primeiro && (
                      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🥇</span>
                          <span className="font-medium text-sm truncate max-w-32">
                            {top_3.primeiro.nome}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {top_3.primeiro.nota.toFixed(1)}
                          </Badge>
                          <Badge className="bg-yellow-500 text-xs">
                            <Coins className="w-3 h-3 mr-1" />
                            {top_3.primeiro.moedas}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* 2º Lugar */}
                    {top_3.segundo && (
                      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🥈</span>
                          <span className="font-medium text-sm truncate max-w-32">
                            {top_3.segundo.nome}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {top_3.segundo.nota.toFixed(1)}
                          </Badge>
                          <Badge className="bg-gray-400 text-xs">
                            <Coins className="w-3 h-3 mr-1" />
                            {top_3.segundo.moedas}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* 3º Lugar */}
                    {top_3.terceiro && (
                      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🥉</span>
                          <span className="font-medium text-sm truncate max-w-32">
                            {top_3.terceiro.nome}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {top_3.terceiro.nota.toFixed(1)}
                          </Badge>
                          <Badge className="bg-orange-500 text-xs">
                            <Coins className="w-3 h-3 mr-1" />
                            {top_3.terceiro.moedas}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botão Ver Resultados */}
              <Button
                onClick={() => handleViewResults(competition.id)}
                className="w-full"
                variant={competition.status === 'finalizada' ? 'default' : 'outline'}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Ver Resultados Completos
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default CompetitionResultsCards;

