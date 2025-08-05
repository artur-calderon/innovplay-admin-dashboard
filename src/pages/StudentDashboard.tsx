import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/authContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Medal, 
  Coins, 
  Trophy,
  Star,
  Target,
  BookOpen,
  Award,
  User,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Zap,
  Calendar,
  Flame,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StudentStats {
  proficiencia: { value: number; change: number; trend: 'up' | 'down' };
  nota: { value: number; change: number; trend: 'up' | 'down' };
  nivel: { value: string; change: number; trend: 'up' | 'down' };
  acertos: { value: number; change: number; trend: 'up' | 'down' };
  medalhas: { 
    total: number; 
    percentage: number;
    conquistadas: Array<{
      id: string;
      nome: string;
      tipo: 'ouro' | 'prata' | 'bronze';
      icone: string;
      descricao: string;
    }>;
    proximas: Array<{
      id: string;
      nome: string;
      requisito: string;
      progresso: number;
    }>;
  };
  moedas: { 
    total: number;
    ganhasHoje: number;
    historico: Array<{
      data: string;
      acao: string;
      valor: number;
    }>;
    loja: Array<{
      item: string;
      preco: number;
      disponivel: boolean;
    }>;
  };
  ranking: {
    posicaoAtual: number;
    pontos: number;
    mudancaPosicao: number;
    lista: Array<{
      id: number;
      nome: string;
      acertos: number;
      total: number;
      posicao: number;
      pontos: number;
      avatar?: string;
    }>;
    proximoObjetivo: {
      posicao: number;
      pontosNecessarios: number;
      progresso: number;
    };
  };
  estatisticas: {
    semana: Array<{ day: string; nota: number; avaliacao: string }>;
    mes: Array<{ week: string; nota: number; avaliacoes: number }>;
    ano: Array<{ month: string; nota: number; avaliacoes: number }>;
    resumo: {
      media: number;
      melhorNota: number;
      streak: number;
      metaAlcancada: boolean;
      progresso: number;
      totalAvaliacoes: number;
      tendencia: 'up' | 'down' | 'stable';
    };
  };
}

type ChartType = 'bar' | 'line' | 'area' | 'pie';
type PeriodType = 'week' | 'month' | 'year';

const StudentDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [period, setPeriod] = useState<PeriodType>('week');
  const [rankingFilter, setRankingFilter] = useState<'geral' | 'semanal' | 'mensal'>('geral');

  // Dados mockados baseados na imagem + dados de estatísticas
  const mockStats: StudentStats = {
    proficiencia: { value: 119, change: 2.1, trend: 'up' },
    nota: { value: 6.5, change: -3.4, trend: 'down' },
    nivel: { value: 'Abaixo do Básico', change: -3.1, trend: 'down' },
    acertos: { value: 18, change: 2.4, trend: 'up' },
    medalhas: { 
      total: 4, 
      percentage: 60,
      conquistadas: [
        { id: '1', nome: 'Primeira Nota 10', tipo: 'ouro', icone: '🏆', descricao: 'Primeira nota máxima' },
        { id: '2', nome: 'Streak 7 dias', tipo: 'prata', icone: '🔥', descricao: 'Uma semana consecutiva' },
        { id: '3', nome: 'Top 10', tipo: 'bronze', icone: '⭐', descricao: 'Entre os 10 melhores' },
      ],
      proximas: [
        { id: '4', nome: 'Estudioso', requisito: '5 avaliações em sequência', progresso: 60 },
        { id: '5', nome: 'Matemático', requisito: '3 notas 10 em matemática', progresso: 33 },
      ]
    },
    moedas: { 
      total: 21,
      ganhasHoje: 5,
      historico: [
        { data: 'hoje', acao: 'Avaliação Matemática', valor: 5 },
        { data: 'ontem', acao: 'Streak 3 dias', valor: 3 },
        { data: '2 dias', acao: 'Primeira Medalha', valor: 10 },
      ],
      loja: [
        { item: 'Avatar personalizado', preco: 50, disponivel: true },
        { item: 'Tema especial', preco: 100, disponivel: true },
        { item: 'Badge exclusivo', preco: 200, disponivel: false },
      ]
    },
    ranking: {
      posicaoAtual: 5,
      pontos: 847,
      mudancaPosicao: 2,
      lista: [
        { id: 1, nome: 'Lucas Silva', acertos: 58, total: 60, posicao: 1, pontos: 1200 },
        { id: 2, nome: 'Maria Souza', acertos: 56, total: 60, posicao: 2, pontos: 1150 },
        { id: 3, nome: 'Pedro Oliveira', acertos: 54, total: 60, posicao: 3, pontos: 1100 },
        { id: 4, nome: 'Ana Costa', acertos: 52, total: 60, posicao: 4, pontos: 1050 },
        { id: 5, nome: 'João Lima', acertos: 50, total: 60, posicao: 5, pontos: 1000 },
        { id: 6, nome: 'Beatriz Ramos', acertos: 48, total: 60, posicao: 6, pontos: 950 },
        { id: 7, nome: 'Rafael Martins', acertos: 47, total: 60, posicao: 7, pontos: 900 },
        { id: 8, nome: 'Gabriela Dias', acertos: 45, total: 60, posicao: 8, pontos: 850 },
        { id: 9, nome: 'Carlos Mendes', acertos: 44, total: 60, posicao: 9, pontos: 800 },
        { id: 10, nome: 'Fernanda Rocha', acertos: 42, total: 60, posicao: 10, pontos: 750 },
      ],
      proximoObjetivo: {
        posicao: 4,
        pontosNecessarios: 50,
        progresso: 80
      }
    },
    estatisticas: {
      semana: [
        { day: 'Seg', nota: 7.2, avaliacao: 'Matemática' },
        { day: 'Ter', nota: 8.5, avaliacao: 'Português' },
        { day: 'Qua', nota: 6.8, avaliacao: 'História' },
        { day: 'Qui', nota: 9.1, avaliacao: 'Ciências' },
        { day: 'Sex', nota: 7.7, avaliacao: 'Geografia' },
        { day: 'Sáb', nota: 8.9, avaliacao: 'Inglês' },
        { day: 'Dom', nota: 7.5, avaliacao: 'Arte' },
      ],
      mes: [
        { week: 'Sem 1', nota: 7.8, avaliacoes: 12 },
        { week: 'Sem 2', nota: 8.2, avaliacoes: 15 },
        { week: 'Sem 3', nota: 7.1, avaliacoes: 10 },
        { week: 'Sem 4', nota: 8.6, avaliacoes: 18 },
      ],
      ano: [
        { month: 'Jan', nota: 7.2, avaliacoes: 45 },
        { month: 'Fev', nota: 7.8, avaliacoes: 52 },
        { month: 'Mar', nota: 8.1, avaliacoes: 48 },
        { month: 'Abr', nota: 7.5, avaliacoes: 51 },
        { month: 'Mai', nota: 8.3, avaliacoes: 49 },
        { month: 'Jun', nota: 7.9, avaliacoes: 47 },
      ],
      resumo: {
        media: 7.8,
        melhorNota: 9.1,
        streak: 12,
        metaAlcancada: true,
        progresso: 78,
        totalAvaliacoes: 124,
        tendencia: 'up'
      }
    }
  };

  // Diferentes datasets de ranking para cada filtro
  const rankingData = {
    geral: {
      posicaoAtual: 5,
      pontos: 1000,
      mudancaPosicao: 2,
      lista: [
        { id: 1, nome: 'Lucas Silva', acertos: 58, total: 60, posicao: 1, pontos: 1200 },
        { id: 2, nome: 'Maria Souza', acertos: 56, total: 60, posicao: 2, pontos: 1150 },
        { id: 3, nome: 'Pedro Oliveira', acertos: 54, total: 60, posicao: 3, pontos: 1100 },
        { id: 4, nome: 'Ana Costa', acertos: 52, total: 60, posicao: 4, pontos: 1050 },
        { id: 5, nome: 'João Lima', acertos: 50, total: 60, posicao: 5, pontos: 1000 },
        { id: 6, nome: 'Beatriz Ramos', acertos: 48, total: 60, posicao: 6, pontos: 950 },
        { id: 7, nome: 'Rafael Martins', acertos: 47, total: 60, posicao: 7, pontos: 900 },
        { id: 8, nome: 'Gabriela Dias', acertos: 45, total: 60, posicao: 8, pontos: 850 },
        { id: 9, nome: 'Carlos Mendes', acertos: 44, total: 60, posicao: 9, pontos: 800 },
        { id: 10, nome: 'Fernanda Rocha', acertos: 42, total: 60, posicao: 10, pontos: 750 },
      ],
      proximoObjetivo: {
        posicao: 4,
        pontosNecessarios: 50,
        progresso: 80
      }
    },
    semanal: {
      posicaoAtual: 3,
      pontos: 245,
      mudancaPosicao: 1,
      lista: [
        { id: 1, nome: 'Pedro Oliveira', acertos: 15, total: 15, posicao: 1, pontos: 285 },
        { id: 2, nome: 'Maria Souza', acertos: 14, total: 15, posicao: 2, pontos: 270 },
        { id: 3, nome: 'João Lima', acertos: 13, total: 15, posicao: 3, pontos: 245 },
        { id: 4, nome: 'Ana Costa', acertos: 12, total: 15, posicao: 4, pontos: 230 },
        { id: 5, nome: 'Lucas Silva', acertos: 11, total: 15, posicao: 5, pontos: 215 },
        { id: 6, nome: 'Gabriela Dias', acertos: 10, total: 15, posicao: 6, pontos: 200 },
        { id: 7, nome: 'Rafael Martins', acertos: 9, total: 15, posicao: 7, pontos: 185 },
        { id: 8, nome: 'Beatriz Ramos', acertos: 8, total: 15, posicao: 8, pontos: 170 },
        { id: 9, nome: 'Carlos Mendes', acertos: 7, total: 15, posicao: 9, pontos: 155 },
        { id: 10, nome: 'Fernanda Rocha', acertos: 6, total: 15, posicao: 10, pontos: 140 },
      ],
      proximoObjetivo: {
        posicao: 2,
        pontosNecessarios: 25,
        progresso: 60
      }
    },
    mensal: {
      posicaoAtual: 7,
      pontos: 485,
      mudancaPosicao: -2,
      lista: [
        { id: 1, nome: 'Maria Souza', acertos: 45, total: 48, posicao: 1, pontos: 620 },
        { id: 2, nome: 'Lucas Silva', acertos: 44, total: 48, posicao: 2, pontos: 595 },
        { id: 3, nome: 'Ana Costa', acertos: 42, total: 48, posicao: 3, pontos: 570 },
        { id: 4, nome: 'Pedro Oliveira', acertos: 40, total: 48, posicao: 4, pontos: 545 },
        { id: 5, nome: 'Gabriela Dias', acertos: 39, total: 48, posicao: 5, pontos: 520 },
        { id: 6, nome: 'Rafael Martins', acertos: 37, total: 48, posicao: 6, pontos: 510 },
        { id: 7, nome: 'João Lima', acertos: 35, total: 48, posicao: 7, pontos: 485 },
        { id: 8, nome: 'Beatriz Ramos', acertos: 34, total: 48, posicao: 8, pontos: 460 },
        { id: 9, nome: 'Carlos Mendes', acertos: 32, total: 48, posicao: 9, pontos: 435 },
        { id: 10, nome: 'Fernanda Rocha', acertos: 30, total: 48, posicao: 10, pontos: 410 },
      ],
      proximoObjetivo: {
        posicao: 6,
        pontosNecessarios: 25,
        progresso: 50
      }
    }
  };

  // Função para obter dados do ranking baseado no filtro
  const getCurrentRankingData = () => {
    return rankingData[rankingFilter];
  };

  // Função para alterar filtro do ranking
  const handleRankingFilterChange = (filter: 'geral' | 'semanal' | 'mensal') => {
    setRankingFilter(filter);
  };

  useEffect(() => {
    const loadStudentStats = async () => {
      try {
        setIsLoading(true);
        // Simular delay de carregamento
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStats(mockStats);
      } catch (error) {
        console.error('Erro ao carregar estatísticas do aluno:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar suas estatísticas.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadStudentStats();
  }, [toast]);

  const StatCard = ({ 
    title, 
    value, 
    change, 
    trend, 
    icon: Icon,
    color = "bg-blue-500"
  }: {
    title: string;
    value: string | number;
    change: number;
    trend: 'up' | 'down';
    icon: React.ElementType;
    color?: string;
  }) => (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{value}</span>
              <Badge 
                variant={trend === 'up' ? 'default' : 'destructive'}
                className={`text-xs ${trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
              >
                {trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {Math.abs(change)}%
              </Badge>
            </div>
          </div>
          <div className={`p-3 rounded-full ${color} text-white`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const EstatisticasChart = () => {
    const getCurrentData = () => {
      switch (period) {
        case 'week':
          return stats?.estatisticas.semana || [];
        case 'month':
          return stats?.estatisticas.mes || [];
        case 'year':
          return stats?.estatisticas.ano || [];
        default:
          return [];
      }
    };

    const data = getCurrentData();
    const maxValue = Math.max(...data.map(item => 'nota' in item ? item.nota : 0));
    const minValue = Math.min(...data.map(item => 'nota' in item ? item.nota : 0));

    const getLabel = (item: { day?: string; week?: string; month?: string; nota: number }) => {
      if ('day' in item) return item.day;
      if ('week' in item) return item.week;
      if ('month' in item) return item.month;
      return '';
    };

    const getValue = (item: { nota: number }) => {
      return item.nota || 0;
    };

    const renderChart = () => {
      switch (chartType) {
        case 'bar':
          return (
            <div className="h-64 flex items-end justify-between gap-2 px-2">
              {data.map((item, index) => (
                <div key={index} className="flex flex-col items-center flex-1 group">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg min-h-[20px] transition-all duration-500 hover:from-purple-600 hover:to-purple-400 cursor-pointer shadow-lg"
                    style={{ height: `${(getValue(item) / 10) * 200}px` }}
                    title={`${getLabel(item)}: ${getValue(item)}`}
                  />
                  <span className="text-xs text-muted-foreground mt-2 font-medium group-hover:text-purple-600 transition-colors">
                    {getLabel(item)}
                  </span>
                  <span className="text-xs font-bold text-blue-600 group-hover:text-purple-600 transition-colors">
                    {getValue(item).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          );
        
        case 'line':
          return (
            <div className="h-64 relative px-2">
              <svg className="w-full h-full" viewBox="0 0 400 200">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <polyline
                  points={data.map((item, index) => 
                    `${(index / (data.length - 1)) * 380 + 10},${200 - (getValue(item) / 10) * 180}`
                  ).join(' ')}
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="3"
                  className="drop-shadow-sm"
                />
                {data.map((item, index) => (
                  <circle
                    key={index}
                    cx={(index / (data.length - 1)) * 380 + 10}
                    cy={200 - (getValue(item) / 10) * 180}
                    r="4"
                    fill="#3B82F6"
                    className="hover:fill-purple-600 transition-colors cursor-pointer"
                  />
                ))}
              </svg>
              <div className="flex justify-between mt-2">
                {data.map((item, index) => (
                  <div key={index} className="text-xs text-center">
                    <div className="text-muted-foreground">{getLabel(item)}</div>
                    <div className="font-bold text-blue-600">{getValue(item).toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          );

        case 'area':
          return (
            <div className="h-64 relative px-2">
              <svg className="w-full h-full" viewBox="0 0 400 200">
                <defs>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                <polygon
                  points={`10,200 ${data.map((item, index) => 
                    `${(index / (data.length - 1)) * 380 + 10},${200 - (getValue(item) / 10) * 180}`
                  ).join(' ')} ${380 + 10},200`}
                  fill="url(#areaGradient)"
                  className="drop-shadow-sm"
                />
                <polyline
                  points={data.map((item, index) => 
                    `${(index / (data.length - 1)) * 380 + 10},${200 - (getValue(item) / 10) * 180}`
                  ).join(' ')}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                />
              </svg>
              <div className="flex justify-between mt-2">
                {data.map((item, index) => (
                  <div key={index} className="text-xs text-center">
                    <div className="text-muted-foreground">{getLabel(item)}</div>
                    <div className="font-bold text-blue-600">{getValue(item).toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div className="space-y-6">
        {/* Header com controles */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Estatísticas de Performance</h3>
              <p className="text-sm text-muted-foreground">Notas das suas avaliações</p>
            </div>
          </div>
          
          {/* Controles de período e tipo de gráfico */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                size="sm"
                variant={period === 'week' ? 'default' : 'ghost'}
                onClick={() => setPeriod('week')}
                className="text-xs"
              >
                Semana
              </Button>
              <Button
                size="sm"
                variant={period === 'month' ? 'default' : 'ghost'}
                onClick={() => setPeriod('month')}
                className="text-xs"
              >
                Mês
              </Button>
              <Button
                size="sm"
                variant={period === 'year' ? 'default' : 'ghost'}
                onClick={() => setPeriod('year')}
                className="text-xs"
              >
                Ano
              </Button>
            </div>
            
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                size="sm"
                variant={chartType === 'bar' ? 'default' : 'ghost'}
                onClick={() => setChartType('bar')}
                className="text-xs"
              >
                <BarChart3 className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant={chartType === 'line' ? 'default' : 'ghost'}
                onClick={() => setChartType('line')}
                className="text-xs"
              >
                <LineChart className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant={chartType === 'area' ? 'default' : 'ghost'}
                onClick={() => setChartType('area')}
                className="text-xs"
              >
                <Activity className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Estatísticas de resumo gamificadas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 text-white">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span className="text-xs font-medium">Média</span>
            </div>
            <p className="text-lg font-bold">{stats?.estatisticas.resumo.media}</p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg p-3 text-white">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              <span className="text-xs font-medium">Melhor</span>
            </div>
            <p className="text-lg font-bold">{stats?.estatisticas.resumo.melhorNota}</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-3 text-white">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4" />
              <span className="text-xs font-medium">Streak</span>
            </div>
            <p className="text-lg font-bold">{stats?.estatisticas.resumo.streak} dias</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg p-3 text-white">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium">Total</span>
            </div>
            <p className="text-lg font-bold">{stats?.estatisticas.resumo.totalAvaliacoes}</p>
          </div>
        </div>

        {/* Gráfico principal */}
        <div className="bg-gray-50 rounded-lg p-4">
          {renderChart()}
        </div>

        {/* Progresso da meta */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Meta do Mês</span>
            <Badge className={`${stats?.estatisticas.resumo.metaAlcancada ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {stats?.estatisticas.resumo.metaAlcancada ? '🎉 Alcançada!' : '💪 Em progresso'}
            </Badge>
          </div>
          <Progress value={stats?.estatisticas.resumo.progresso} className="h-3 mb-2" />
          <p className="text-xs text-muted-foreground">{stats?.estatisticas.resumo.progresso}% da meta mensal</p>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Olá, {user?.name || "Aluno"}!</h1>
            <p className="text-gray-600">Painel do Aluno</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-100 text-green-800 px-3 py-1">
            1º Avaliação
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Proficiência"
          value={stats?.proficiencia.value || 0}
          change={stats?.proficiencia.change || 0}
          trend={stats?.proficiencia.trend || 'up'}
          icon={Target}
          color="bg-green-500"
        />
        <StatCard
          title="Nota"
          value={stats?.nota.value || 0}
          change={stats?.nota.change || 0}
          trend={stats?.nota.trend || 'down'}
          icon={BookOpen}
          color="bg-red-500"
        />
        <StatCard
          title="Nível de Classificação"
          value={stats?.nivel.value || 'N/A'}
          change={stats?.nivel.change || 0}
          trend={stats?.nivel.trend || 'down'}
          icon={Award}
          color="bg-yellow-500"
        />
        <StatCard
          title="Acertos"
          value={stats?.acertos.value || 0}
          change={stats?.acertos.change || 0}
          trend={stats?.acertos.trend || 'up'}
          icon={Star}
          color="bg-green-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Medalhas e Moedas - Professional Cards */}
        <div className="xl:col-span-1 space-y-6">
          {/* Medalhas Gamificadas */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg">
                  <Medal className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div>Coleção de Medalhas</div>
                  <div className="text-xs text-muted-foreground font-normal">Suas conquistas</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Medalhas Conquistadas */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg border border-yellow-300">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-1">
                    <Medal className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xs font-medium text-yellow-700">Primeira Nota 10</div>
                </div>
                <div className="text-center p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg border border-blue-300">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-1">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xs font-medium text-blue-700">Streak 7 dias</div>
                </div>
                <div className="text-center p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg border border-purple-300">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-1">
                    <Trophy className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xs font-medium text-purple-700">Top 10</div>
                </div>
              </div>

              {/* Progresso Geral */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progresso da Coleção</span>
                  <span className="text-sm text-blue-600 font-bold">{stats?.medalhas.total}/12</span>
                </div>
                <Progress value={stats?.medalhas.percentage} className="h-3" />
                <div className="text-xs text-muted-foreground">
                  {stats?.medalhas.percentage}% das medalhas conquistadas
                </div>
              </div>

              {/* Próximas Medalhas */}
              <div className="mt-4 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">Próximas Conquistas</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-300 rounded-full opacity-50"></div>
                    <span className="text-xs text-gray-600">Estudioso - 5 avaliações em sequência</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-300 rounded-full opacity-50"></div>
                    <span className="text-xs text-gray-600">Matemático - 3 notas 10 em matemática</span>
                  </div>
                </div>
              </div>

              {/* Stats das Medalhas */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200">
                  <div className="text-lg font-bold text-yellow-600">3</div>
                  <div className="text-xs text-yellow-700">Ouro</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="text-lg font-bold text-gray-600">1</div>
                  <div className="text-xs text-gray-700">Prata</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Moedas Gamificadas */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-lg">
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div>InnovCoins</div>
                  <div className="text-xs text-muted-foreground font-normal">Sua economia</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Saldo Atual */}
              <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200 mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full flex items-center justify-center">
                    <Coins className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-yellow-600 mb-1">{stats?.moedas.total}</div>
                <div className="text-sm text-yellow-700">InnovCoins disponíveis</div>
                <div className="text-xs text-green-600 flex items-center justify-center gap-1 mt-1">
                  <ArrowUp className="w-3 h-3" />
                  +{stats?.moedas.ganhasHoje} hoje
                </div>
              </div>

              {/* Maneiras de Ganhar */}
              <div className="space-y-2 mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Como ganhar mais:</div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <BookOpen className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs">Fazer avaliação</span>
                  </div>
                  <span className="text-xs font-bold text-green-600">+2 coins</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Star className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs">Nota acima de 8</span>
                  </div>
                  <span className="text-xs font-bold text-blue-600">+5 coins</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <Flame className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs">Streak 7 dias</span>
                  </div>
                  <span className="text-xs font-bold text-purple-600">+10 coins</span>
                </div>
              </div>

              {/* Loja Preview */}
              <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">🛍️</span>
                  </div>
                  <span className="text-sm font-medium text-indigo-700">Loja de Recompensas</span>
                </div>
                <div className="space-y-1">
                  {stats?.moedas.loja.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className={`text-xs ${item.disponivel ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {item.item}
                      </span>
                      <span className={`text-xs font-bold ${item.disponivel ? 'text-indigo-700' : 'text-gray-500'}`}>
                        {item.preco} coins
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Histórico Rápido */}
              <div className="mt-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Últimas transações:</div>
                <div className="space-y-1 text-xs">
                  {stats?.moedas.historico.map((transacao, index) => (
                    <div key={index} className="flex items-center justify-between py-1">
                      <span className="text-gray-600">{transacao.acao}</span>
                      <span className="text-green-600 font-medium">+{transacao.valor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estatísticas */}
        <div className="xl:col-span-2">
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <EstatisticasChart />
            </CardContent>
          </Card>
        </div>

        {/* Ranking Gamificado */}
        <div className="xl:col-span-1">
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-lg font-semibold">Ranking</div>
                  <div className="text-xs text-muted-foreground">Sua posição atual</div>
                </div>
              </CardTitle>
              
              {/* Filtros do Ranking */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mt-3">
                <Button 
                  size="sm" 
                  variant={rankingFilter === 'geral' ? 'default' : 'ghost'} 
                  className="text-xs px-2 py-1"
                  onClick={() => handleRankingFilterChange('geral')}
                >
                  Geral
                </Button>
                <Button 
                  size="sm" 
                  variant={rankingFilter === 'semanal' ? 'default' : 'ghost'} 
                  className="text-xs px-2 py-1"
                  onClick={() => handleRankingFilterChange('semanal')}
                >
                  Semanal
                </Button>
                <Button 
                  size="sm" 
                  variant={rankingFilter === 'mensal' ? 'default' : 'ghost'} 
                  className="text-xs px-2 py-1"
                  onClick={() => handleRankingFilterChange('mensal')}
                >
                  Mensal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Sua Posição Destacada */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 mb-4 border-2 border-blue-200 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{user?.name ? user.name.charAt(0).toUpperCase() : 'J'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">Você está em</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-1">{getCurrentRankingData().posicaoAtual}º lugar</Badge>
                    {getCurrentRankingData().mudancaPosicao !== 0 && (
                      <span className={`text-xs flex items-center gap-1 font-medium ${getCurrentRankingData().mudancaPosicao > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {getCurrentRankingData().mudancaPosicao > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {getCurrentRankingData().mudancaPosicao > 0 ? '+' : ''}{getCurrentRankingData().mudancaPosicao} posição{Math.abs(getCurrentRankingData().mudancaPosicao) > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600 leading-none">{getCurrentRankingData().pontos}</div>
                  <div className="text-xs text-muted-foreground">pontos</div>
                </div>
              </div>

              {/* Top 3 Destacado */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {getCurrentRankingData().lista.slice(0, 3).map((item, index) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const colors = [
                    { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'bg-yellow-500', text: 'text-yellow-600' },
                    { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'bg-gray-400', text: 'text-gray-600' },
                    { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-500', text: 'text-orange-600' }
                  ];
                  return (
                    <div key={item.id} className={`text-center p-2 ${colors[index].bg} rounded-lg border ${colors[index].border}`}>
                      <div className={`w-8 h-8 ${colors[index].icon} rounded-full flex items-center justify-center mx-auto mb-1`}>
                        <span className="text-white font-bold text-xs">{medals[index]}</span>
                      </div>
                      <div className="text-xs font-medium truncate">{item.nome}</div>
                      <div className={`text-xs ${colors[index].text} font-bold`}>{item.pontos.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
                
              {/* Lista Completa */}
              <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                {getCurrentRankingData().lista.slice(3).map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 py-2 px-2 hover:bg-gray-50 rounded-lg transition-all duration-200 group">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <span className="text-xs font-bold text-gray-600 group-hover:text-blue-600">
                        {item.posicao}
                      </span>
                    </div>
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs bg-gray-200">
                        {item.nome.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{item.nome}</div>
                    </div>
                    <div className="text-xs font-bold text-gray-600">{item.pontos}</div>
                  </div>
                ))}
              </div>

              {/* Próximo Objetivo */}
              <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Próximo Objetivo</span>
                </div>
                <div className="text-xs text-green-600 mb-1">
                  Faltam apenas <span className="font-bold">{getCurrentRankingData().proximoObjetivo.pontosNecessarios} pontos</span> para alcançar o {getCurrentRankingData().proximoObjetivo.posicao}º lugar!
                </div>
                <Progress value={getCurrentRankingData().proximoObjetivo.progresso} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard; 