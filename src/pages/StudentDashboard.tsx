import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/authContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
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
import { api } from "@/lib/api";

// Interface para resposta da API de notas
interface StudentGradesResponse {
  success: boolean;
  data: {
    user_id: string;
    student_id: string;
    student_name: string;
    student_registration: string | null;
    school_name: string;
    class_name: string;
    general_proficiency: number;
    general_grade: number;
    general_classification: string;
    total_correct_answers: number;
    total_questions_answered: number;
    total_evaluations: number;
    rankings: {
      school: {
        position: number;
        total_students: number;
        ranking: Array<{
          position: number;
          student_id: string;
          student_name: string;
          proficiency: number;
        }>;
      };
      class: {
        position: number;
        total_students: number;
        ranking: Array<{
          position: number;
          student_id: string;
          student_name: string;
          proficiency: number;
        }>;
      };
      municipality: {
        position: number;
        total_students: number;
        ranking: Array<{
          position: number;
          student_id: string;
          student_name: string;
          proficiency: number;
        }>;
      };
    };
  };
  message: string;
}

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
  const [rankingFilter, setRankingFilter] = useState<'turma' | 'escola' | 'municipio'>('turma');

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

  // Dados mockados para ranking (mantidos como fallback)
  const mockRankingData = {
    turma: {
      posicaoAtual: 3,
      pontos: 285.5,
      mudancaPosicao: 1,
      lista: [
        { id: 1, nome: 'Ana Oliveira', acertos: 18, total: 20, posicao: 1, pontos: 320.0 },
        { id: 2, nome: 'Carlos Lima', acertos: 17, total: 20, posicao: 2, pontos: 310.5 },
        { id: 3, nome: 'Pedro Costa', acertos: 15, total: 20, posicao: 3, pontos: 285.5 },
        { id: 4, nome: 'Maria Silva', acertos: 14, total: 20, posicao: 4, pontos: 280.0 },
        { id: 5, nome: 'João Santos', acertos: 13, total: 20, posicao: 5, pontos: 275.0 },
      ],
      proximoObjetivo: {
        posicao: 2,
        pontosNecessarios: 25,
        progresso: 60
      }
    },
    escola: {
      posicaoAtual: 15,
      pontos: 285.5,
      mudancaPosicao: 2,
      lista: [
        { id: 1, nome: 'Lucas Ferreira', acertos: 20, total: 20, posicao: 1, pontos: 380.0 },
        { id: 2, nome: 'Maria Silva', acertos: 19, total: 20, posicao: 2, pontos: 350.0 },
        { id: 3, nome: 'João Santos', acertos: 18, total: 20, posicao: 3, pontos: 345.5 },
        { id: 4, nome: 'Ana Costa', acertos: 17, total: 20, posicao: 4, pontos: 340.0 },
        { id: 5, nome: 'Carlos Lima', acertos: 16, total: 20, posicao: 5, pontos: 335.0 },
        { id: 6, nome: 'Beatriz Ramos', acertos: 15, total: 20, posicao: 6, pontos: 330.0 },
        { id: 7, nome: 'Rafael Martins', acertos: 15, total: 20, posicao: 7, pontos: 325.0 },
        { id: 8, nome: 'Gabriela Dias', acertos: 15, total: 20, posicao: 8, pontos: 320.0 },
        { id: 9, nome: 'Fernanda Rocha', acertos: 15, total: 20, posicao: 9, pontos: 315.0 },
        { id: 10, nome: 'Pedro Costa', acertos: 15, total: 20, posicao: 15, pontos: 285.5 },
      ],
      proximoObjetivo: {
        posicao: 14,
        pontosNecessarios: 10,
        progresso: 80
      }
    },
    municipio: {
      posicaoAtual: 89,
      pontos: 285.5,
      mudancaPosicao: -5,
      lista: [
        { id: 1, nome: 'Lucas Ferreira', acertos: 20, total: 20, posicao: 1, pontos: 380.0 },
        { id: 2, nome: 'Maria Silva', acertos: 19, total: 20, posicao: 2, pontos: 375.0 },
        { id: 3, nome: 'João Santos', acertos: 19, total: 20, posicao: 3, pontos: 370.0 },
        { id: 4, nome: 'Ana Costa', acertos: 18, total: 20, posicao: 4, pontos: 365.0 },
        { id: 5, nome: 'Carlos Lima', acertos: 18, total: 20, posicao: 5, pontos: 360.0 },
        { id: 6, nome: 'Beatriz Ramos', acertos: 17, total: 20, posicao: 6, pontos: 355.0 },
        { id: 7, nome: 'Rafael Martins', acertos: 17, total: 20, posicao: 7, pontos: 350.0 },
        { id: 8, nome: 'Gabriela Dias', acertos: 16, total: 20, posicao: 8, pontos: 345.0 },
        { id: 9, nome: 'Fernanda Rocha', acertos: 16, total: 20, posicao: 9, pontos: 340.0 },
        { id: 10, nome: 'Pedro Costa', acertos: 15, total: 20, posicao: 89, pontos: 285.5 },
      ],
      proximoObjetivo: {
        posicao: 88,
        pontosNecessarios: 5,
        progresso: 50
      }
    }
  };

  // Função para obter dados do ranking baseado no filtro
  const getCurrentRankingData = () => {
    if (!stats) {
      console.log('⚠️ Stats não disponível, usando dados mockados');
      return mockRankingData[rankingFilter];
    }

    console.log('🎯 Filtro de ranking selecionado:', rankingFilter);
    console.log('📊 Stats disponíveis:', stats);

    // Por enquanto, sempre usar dados da turma (que são os únicos mapeados)
    // Quando implementarmos as outras abas, usar os dados específicos
    const currentRanking = stats.ranking;
    
    return {
      posicaoAtual: currentRanking.posicaoAtual,
      pontos: currentRanking.pontos,
      mudancaPosicao: currentRanking.mudancaPosicao,
      lista: currentRanking.lista.length > 0 ? currentRanking.lista : mockRankingData[rankingFilter].lista,
      proximoObjetivo: currentRanking.proximoObjetivo
    };
  };

  // Função para alterar filtro do ranking
  const handleRankingFilterChange = (filter: 'turma' | 'escola' | 'municipio') => {
    setRankingFilter(filter);
  };

  // Função para buscar dados do aluno via API
  const fetchStudentGrades = async (userId: string): Promise<StudentGradesResponse> => {
    console.log('🔍 Fazendo chamada para API:', `/students/${userId}/grades/general`);
    const response = await api.get(`/students/${userId}/grades/general`);
    console.log('📊 Resposta completa da API:', response.data);
    console.log('📈 Dados de rankings:', response.data.data?.rankings);
    return response.data;
  };

  // Função para mapear dados de ranking da API para o formato do componente
  const mapRankingData = (rankingData: Array<{
    position: number;
    student_id: string;
    student_name: string;
    proficiency: number;
  }>) => {
    console.log('🔄 Mapeando dados de ranking:', rankingData);
    const mappedData = rankingData.map((item, index) => ({
      id: index + 1,
      nome: item.student_name,
      acertos: Math.round(item.proficiency / 20), // Aproximação baseada na proficiência
      total: 20,
      posicao: item.position,
      pontos: item.proficiency
    }));
    console.log('✅ Dados mapeados:', mappedData);
    return mappedData;
  };

  // Função para mapear dados da API para a interface atual
  const mapApiDataToStats = (apiData: StudentGradesResponse): StudentStats => {
    console.log('🔄 Mapeando dados da API para interface...');
    console.log('📊 Dados da turma:', apiData.data.rankings.class);
    console.log('📊 Dados da escola:', apiData.data.rankings.school);
    console.log('📊 Dados do município:', apiData.data.rankings.municipality);
    
    return {
      proficiencia: { 
        value: apiData.data.general_proficiency, 
        change: 0, 
        trend: 'up' 
      },
      nota: { 
        value: apiData.data.general_grade, 
        change: 0, 
        trend: 'up' 
      },
      nivel: { 
        value: apiData.data.general_classification, 
        change: 0, 
        trend: 'up' 
      },
      acertos: { 
        value: apiData.data.total_correct_answers, 
        change: 0, 
        trend: 'up' 
      },
      // Manter dados gamificados como mockados
      medalhas: mockStats.medalhas,
      moedas: mockStats.moedas,
      ranking: {
        posicaoAtual: apiData.data.rankings.class.position, // Usar posição da turma como padrão
        pontos: apiData.data.general_proficiency, // Usar proficiência como pontos
        mudancaPosicao: 0,
        lista: mapRankingData(apiData.data.rankings.class.ranking), // Mapear dados da turma
        proximoObjetivo: {
          posicao: Math.max(1, apiData.data.rankings.class.position - 1),
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
          media: apiData.data.general_grade,
          melhorNota: Math.max(apiData.data.general_grade, 9.1),
          streak: 12,
          metaAlcancada: apiData.data.general_grade >= 7.0,
          progresso: Math.min(100, (apiData.data.general_grade / 10) * 100),
          totalAvaliacoes: apiData.data.total_evaluations,
          tendencia: apiData.data.general_grade >= 7.0 ? 'up' : 'stable'
        }
      }
    };
  };

  useEffect(() => {
    const loadStudentStats = async () => {
      try {
        setIsLoading(true);
        
        if (!user?.id) {
          throw new Error('ID do usuário não encontrado');
        }

        // Buscar dados reais da API
        const apiData = await fetchStudentGrades(user.id);
        
        if (!apiData.success) {
          throw new Error(apiData.message || 'Erro ao carregar dados');
        }

        // Mapear dados da API para a interface atual
        const mappedStats = mapApiDataToStats(apiData);
        setStats(mappedStats);
        
      } catch (error) {
        console.error('Erro ao carregar estatísticas do aluno:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar suas estatísticas.",
          variant: "destructive",
        });
        
        // Em caso de erro, mostrar dados vazios ao invés de mockados
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadStudentStats();
  }, [toast, user?.id]);

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon,
    color = "bg-blue-500"
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color?: string;
  }) => (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
                {typeof value === 'number' && value % 1 !== 0 ? (Math.ceil(value * 10) / 10).toString().replace('.', ',') : value}
              </span>
            </div>
          </div>
          <div className={`p-2 sm:p-3 rounded-full ${color} text-white flex-shrink-0`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
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
    
    // Se não há dados, mostrar mensagem
    if (!data || data.length === 0) {
      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex-shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold truncate">Estatísticas de Performance</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Notas das suas avaliações</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <div className="text-gray-400 mb-2">
              <Activity className="w-12 h-12 mx-auto" />
            </div>
            <h4 className="text-lg font-medium text-gray-600 mb-2">Sem dados</h4>
            <p className="text-sm text-gray-500">Não há estatísticas disponíveis para o período selecionado.</p>
          </div>
        </div>
      );
    }
    
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
                    {(Math.ceil(getValue(item) * 10) / 10).toString().replace('.', ',')}
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
                    <div className="font-bold text-blue-600">{(Math.ceil(getValue(item) * 10) / 10).toString().replace('.', ',')}</div>
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
                    <div className="font-bold text-blue-600">{(Math.ceil(getValue(item) * 10) / 10).toString().replace('.', ',')}</div>
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
                className="text-xs px-2 sm:px-3"
              >
                <span className="hidden sm:inline">Semana</span>
                <span className="sm:hidden">Sem</span>
              </Button>
              <Button
                size="sm"
                variant={period === 'month' ? 'default' : 'ghost'}
                onClick={() => setPeriod('month')}
                className="text-xs px-2 sm:px-3"
              >
                Mês
              </Button>
              <Button
                size="sm"
                variant={period === 'year' ? 'default' : 'ghost'}
                onClick={() => setPeriod('year')}
                className="text-xs px-2 sm:px-3"
              >
                Ano
              </Button>
            </div>
            
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                size="sm"
                variant={chartType === 'bar' ? 'default' : 'ghost'}
                onClick={() => setChartType('bar')}
                className="text-xs p-2"
              >
                <BarChart3 className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant={chartType === 'line' ? 'default' : 'ghost'}
                onClick={() => setChartType('line')}
                className="text-xs p-2"
              >
                <LineChart className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant={chartType === 'area' ? 'default' : 'ghost'}
                onClick={() => setChartType('area')}
                className="text-xs p-2"
              >
                <Activity className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Estatísticas de resumo gamificadas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-2 sm:p-3 text-white">
            <div className="flex items-center gap-1 sm:gap-2">
              <Target className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs font-medium truncate">Média</span>
            </div>
            <p className="text-sm sm:text-lg font-bold truncate">
              {stats?.estatisticas.resumo.media ? (Math.ceil(stats.estatisticas.resumo.media * 10) / 10).toString().replace('.', ',') : '0'}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg p-2 sm:p-3 text-white">
            <div className="flex items-center gap-1 sm:gap-2">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs font-medium truncate">Melhor</span>
            </div>
            <p className="text-sm sm:text-lg font-bold truncate">
              {stats?.estatisticas.resumo.melhorNota ? (Math.ceil(stats.estatisticas.resumo.melhorNota * 10) / 10).toString().replace('.', ',') : '0'}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-2 sm:p-3 text-white">
            <div className="flex items-center gap-1 sm:gap-2">
              <Flame className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs font-medium truncate">Streak</span>
            </div>
            <p className="text-sm sm:text-lg font-bold truncate">{stats?.estatisticas.resumo.streak} dias</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg p-2 sm:p-3 text-white">
            <div className="flex items-center gap-1 sm:gap-2">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="text-xs font-medium truncate">Total</span>
            </div>
            <p className="text-sm sm:text-lg font-bold truncate">{stats?.estatisticas.resumo.totalAvaliacoes}</p>
          </div>
        </div>

        {/* Gráfico principal */}
        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
          {renderChart()}
        </div>

        {/* Progresso da meta */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium truncate">Meta do Mês</span>
            <Badge className={`${stats?.estatisticas.resumo.metaAlcancada ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} flex-shrink-0 text-xs`}>
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

  // Se não há dados após o carregamento, mostrar mensagem
  if (!stats) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="text-gray-400 mb-4">
            <User className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-600 mb-2">Sem dados</h2>
          <p className="text-gray-500 mb-6">Não foi possível carregar suas estatísticas no momento.</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="px-6 py-2"
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-shrink-0">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
            <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">Olá, {user?.name || "Aluno"}!</h1>
            <p className="text-sm sm:text-base text-gray-600">Painel do Aluno</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="outline" className="bg-green-100 text-green-800 px-2 sm:px-3 py-1 text-xs sm:text-sm">
            1º Avaliação
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <StatCard
          title="Proficiência"
          value={stats?.proficiencia.value || 0}
          icon={Target}
          color="bg-green-500"
        />
        <StatCard
          title="Nota"
          value={stats?.nota.value ? Math.ceil(stats.nota.value * 10) / 10 : 0}
          icon={BookOpen}
          color="bg-red-500"
        />
        <StatCard
          title="Nível de Classificação"
          value={stats?.nivel.value || 'N/A'}
          icon={Award}
          color="bg-yellow-500"
        />
        <StatCard
          title="Acertos"
          value={stats?.acertos.value || 0}
          icon={Star}
          color="bg-green-500"
        />
      </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6 items-start">
        {/* Medalhas e Moedas - Professional Cards */}
        <div className="xl:col-span-1 space-y-6">
          {/* Medalhas Gamificadas */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex-shrink-0">
                  <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="truncate">Coleção de Medalhas</div>
                  <div className="text-xs text-muted-foreground font-normal">Suas conquistas</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Medalhas Conquistadas */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                <div className="text-center p-1 sm:p-2 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg border border-yellow-300">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-1">
                    <Medal className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div className="text-xs font-medium text-yellow-700 truncate">Primeira Nota 10</div>
                </div>
                <div className="text-center p-1 sm:p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg border border-blue-300">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-1">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div className="text-xs font-medium text-blue-700 truncate">Streak 7 dias</div>
                </div>
                <div className="text-center p-1 sm:p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg border border-purple-300">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-1">
                    <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div className="text-xs font-medium text-purple-700 truncate">Top 10</div>
                </div>
              </div>

              {/* Progresso Geral */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-medium truncate">Progresso da Coleção</span>
                  <span className="text-xs sm:text-sm text-blue-600 font-bold flex-shrink-0">{stats?.medalhas.total}/12</span>
                </div>
                <Progress value={stats?.medalhas.percentage} className="h-3" />
                <div className="text-xs text-muted-foreground">
                  {stats?.medalhas.percentage}% das medalhas conquistadas
                </div>
              </div>

              {/* Próximas Medalhas */}
              <div className="mt-4 p-2 sm:p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-orange-700 truncate">Próximas Conquistas</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-300 rounded-full opacity-50 flex-shrink-0"></div>
                    <span className="text-xs text-gray-600 truncate">Estudioso - 5 avaliações em sequência</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-300 rounded-full opacity-50 flex-shrink-0"></div>
                    <span className="text-xs text-gray-600 truncate">Matemático - 3 notas 10 em matemática</span>
                  </div>
                </div>
              </div>

              {/* Stats das Medalhas */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200">
                  <div className="text-base sm:text-lg font-bold text-yellow-600">3</div>
                  <div className="text-xs text-yellow-700">Ouro</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="text-base sm:text-lg font-bold text-gray-600">1</div>
                  <div className="text-xs text-gray-700">Prata</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Moedas Gamificadas */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-lg flex-shrink-0">
                  <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="truncate">InnovCoins</div>
                  <div className="text-xs text-muted-foreground font-normal">Sua economia</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Saldo Atual */}
              <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200 mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full flex items-center justify-center">
                    <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-yellow-600 mb-1">{stats?.moedas.total}</div>
                <div className="text-xs sm:text-sm text-yellow-700">InnovCoins disponíveis</div>
                <div className="text-xs text-green-600 flex items-center justify-center gap-1 mt-1">
                  <ArrowUp className="w-3 h-3" />
                  +{stats?.moedas.ganhasHoje} hoje
                </div>
              </div>

              {/* Maneiras de Ganhar */}
              <div className="space-y-2 mb-4">
                <div className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Como ganhar mais:</div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs truncate">Fazer avaliação</span>
                  </div>
                  <span className="text-xs font-bold text-green-600 flex-shrink-0">+2 coins</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Star className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs truncate">Nota acima de 8</span>
                  </div>
                  <span className="text-xs font-bold text-blue-600 flex-shrink-0">+5 coins</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Flame className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs truncate">Streak 7 dias</span>
                  </div>
                  <span className="text-xs font-bold text-purple-600 flex-shrink-0">+10 coins</span>
                </div>
              </div>

              {/* Loja Preview */}
              <div className="p-2 sm:p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">🛍️</span>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-indigo-700 truncate">Loja de Recompensas</span>
                </div>
                <div className="space-y-1">
                  {stats?.moedas.loja.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className={`text-xs ${item.disponivel ? 'text-indigo-600' : 'text-gray-400'} truncate`}>
                        {item.item}
                      </span>
                      <span className={`text-xs font-bold ${item.disponivel ? 'text-indigo-700' : 'text-gray-500'} flex-shrink-0`}>
                        {item.preco} coins
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Histórico Rápido */}
              <div className="mt-4">
                <div className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Últimas transações:</div>
                <div className="space-y-1 text-xs">
                  {stats?.moedas.historico.map((transacao, index) => (
                    <div key={index} className="flex items-center justify-between py-1">
                      <span className="text-gray-600 truncate">{transacao.acao}</span>
                      <span className="text-green-600 font-medium flex-shrink-0">+{transacao.valor}</span>
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
              <CardTitle className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex-shrink-0">
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-semibold truncate">Ranking</div>
                  <div className="text-xs text-muted-foreground">Sua posição atual</div>
                </div>
              </CardTitle>
              
              {/* Filtros do Ranking */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mt-3">
                <Button 
                  size="sm" 
                  variant={rankingFilter === 'turma' ? 'default' : 'ghost'} 
                  className="text-xs px-1 sm:px-2 py-1"
                  onClick={() => handleRankingFilterChange('turma')}
                >
                  <span className="hidden sm:inline">Turma</span>
                  <span className="sm:hidden">T</span>
                </Button>
                <Button 
                  size="sm" 
                  variant={rankingFilter === 'escola' ? 'default' : 'ghost'} 
                  className="text-xs px-1 sm:px-2 py-1"
                  onClick={() => handleRankingFilterChange('escola')}
                >
                  <span className="hidden sm:inline">Escola</span>
                  <span className="sm:hidden">E</span>
                </Button>
                <Button 
                  size="sm" 
                  variant={rankingFilter === 'municipio' ? 'default' : 'ghost'} 
                  className="text-xs px-1 sm:px-2 py-1"
                  onClick={() => handleRankingFilterChange('municipio')}
                >
                  <span className="hidden sm:inline">Município</span>
                  <span className="sm:hidden">M</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Sua Posição Destacada */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-2 sm:p-3 mb-4 border-2 border-blue-200 flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs sm:text-sm">{user?.name ? user.name.charAt(0).toUpperCase() : 'J'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs sm:text-sm text-gray-900 truncate">Você está em</div>
                  <div className="flex items-center gap-1 sm:gap-2 mt-1">
                    <Badge className="bg-blue-100 text-blue-800 text-xs px-1 sm:px-2 py-1 flex-shrink-0">{getCurrentRankingData().posicaoAtual}º lugar</Badge>
                    {getCurrentRankingData().mudancaPosicao !== 0 && (
                      <span className={`text-xs flex items-center gap-1 font-medium ${getCurrentRankingData().mudancaPosicao > 0 ? 'text-green-600' : 'text-red-600'} flex-shrink-0`}>
                        {getCurrentRankingData().mudancaPosicao > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {getCurrentRankingData().mudancaPosicao > 0 ? '+' : ''}{getCurrentRankingData().mudancaPosicao} posição{Math.abs(getCurrentRankingData().mudancaPosicao) > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg sm:text-2xl font-bold text-blue-600 leading-none">{getCurrentRankingData().pontos}</div>
                  <div className="text-xs text-muted-foreground">pontos</div>
                </div>
              </div>

              {/* Top 3 Destacado */}
              <div className="grid grid-cols-3 gap-1 sm:gap-2 mb-4">
                {getCurrentRankingData().lista.slice(0, 3).map((item, index) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const colors = [
                    { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'bg-yellow-500', text: 'text-yellow-600' },
                    { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'bg-gray-400', text: 'text-gray-600' },
                    { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-500', text: 'text-orange-600' }
                  ];
                  return (
                    <div key={item.id} className={`text-center p-1 sm:p-2 ${colors[index].bg} rounded-lg border ${colors[index].border}`}>
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 ${colors[index].icon} rounded-full flex items-center justify-center mx-auto mb-1`}>
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
                  <div key={item.id} className="flex items-center gap-2 sm:gap-3 py-2 px-2 hover:bg-gray-50 rounded-lg transition-all duration-200 group">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors flex-shrink-0">
                      <span className="text-xs font-bold text-gray-600 group-hover:text-blue-600">
                        {item.posicao}
                      </span>
                    </div>
                    <Avatar className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-gray-200">
                        {item.nome.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{item.nome}</div>
                    </div>
                    <div className="text-xs font-bold text-gray-600 flex-shrink-0">{item.pontos}</div>
                  </div>
                ))}
              </div>

              {/* Próximo Objetivo */}
              <div className="mt-4 p-2 sm:p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-green-700 truncate">Próximo Objetivo</span>
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