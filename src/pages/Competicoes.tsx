import { useState, useEffect } from "react";
import { useAuth } from "@/context/authContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy,
  Users,
  Clock,
  Coins,
  BookOpen,
  Star,
  Calendar,
  Timer,
  Award,
  Target,
  Search,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CompetitionsApiService } from "@/services/competitionsApi";
import { CompetitionEnrollment } from "@/components/competicoes/CompetitionEnrollment";
import type { Competition, CompetitionStatus } from "@/types/competition-types";

type FiltroStatus = 'todos' | CompetitionStatus;
type FiltroDisciplina = 'todas' | string;

const Competicoes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [filtroDisciplina, setFiltroDisciplina] = useState<FiltroDisciplina>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Carregar competições disponíveis
  useEffect(() => {
    loadCompetitions();
  }, []);

  const loadCompetitions = async () => {
    try {
      setIsLoading(true);
      const data = await CompetitionsApiService.getAvailableCompetitions();
      setCompetitions(data);
    } catch (error) {
      console.error('Erro ao carregar competições:', error);
      setCompetitions([]);
      
      const errorMessage = getErrorMessage(error, "Não foi possível carregar as competições. Tente novamente.");
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

  // Formatar tempo restante
  const formatTimeRemaining = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff <= 0) return 'Encerrado';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  // Obter badge de status
  const getStatusBadge = (status: CompetitionStatus) => {
    const configs: Record<CompetitionStatus, { label: string; className: string }> = {
      agendada: { label: 'Agendada', className: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400' },
      aberta: { label: 'Inscrições Abertas', className: 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400' },
      em_andamento: { label: 'Em Andamento', className: 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400' },
      finalizada: { label: 'Finalizada', className: 'bg-muted text-muted-foreground' }
    };

    const config = configs[status] || configs.agendada;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Obter cor da dificuldade
  const getDifficultyColor = (dificuldade: string) => {
    switch (dificuldade) {
      case 'Abaixo do Básico': return 'text-red-600 dark:text-red-400';
      case 'Básico': return 'text-yellow-600 dark:text-yellow-400';
      case 'Adequado': return 'text-green-600 dark:text-green-400';
      case 'Avançado': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-muted-foreground';
    }
  };

  // Filtrar competições
  const competicoesFiltradas = competitions.filter(competition => {
    const matchStatus = filtroStatus === 'todos' || competition.status === filtroStatus;
    const matchDisciplina = filtroDisciplina === 'todas' || 
      competition.disciplina_id === filtroDisciplina ||
      (competition.disciplina_nome || '').toLowerCase().includes(filtroDisciplina.toLowerCase());
    const matchSearch = competition.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (competition.disciplina_nome || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchStatus && matchDisciplina && matchSearch;
  });

  // Extrair disciplinas únicas
  const uniqueDisciplinas = [...new Set(competitions.map(c => c.disciplina_id))];

  // Handler para quando inscrição é realizada
  const handleEnrolled = () => {
    // Recarregar para atualizar status
    loadCompetitions();
  };

  // Handler para quando competição é iniciada
  const handleStarted = () => {
    // Nada adicional necessário - navegação feita no componente
  };

  // Calcular estatísticas
  const stats = {
    total: competitions.filter(c => c.status !== 'finalizada').length,
    participantes: competitions.reduce((sum, c) => sum + (c.participantes_atual || 0), 0),
    premios: competitions.reduce((sum, c) => sum + c.recompensas.ouro, 0),
    inscritos: competitions.filter(c => c.status === 'em_andamento' || c.status === 'aberta').length
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        
        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <Skeleton className="h-40 w-full" />
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 text-blue-600" />
            Competições
          </h1>
          <p className="text-muted-foreground">Participe de competições e ganhe InnovCoins!</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadCompetitions} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400 px-3 py-1">
            <Coins className="w-4 h-4 mr-1" />
            Ganhe InnovCoins
          </Badge>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar competições..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filtroStatus} onValueChange={(value) => setFiltroStatus(value as FiltroStatus)}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            <SelectItem value="agendada">Agendada</SelectItem>
            <SelectItem value="aberta">Inscrições Abertas</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="finalizada">Finalizada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroDisciplina} onValueChange={setFiltroDisciplina}>
          <SelectTrigger>
            <SelectValue placeholder="Disciplina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as Disciplinas</SelectItem>
            {uniqueDisciplinas.map(disciplina => (
              <SelectItem key={disciplina} value={disciplina}>
                {disciplina}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 dark:from-blue-950/30 to-blue-100 dark:to-blue-950/40 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
            <div className="text-sm text-blue-700 dark:text-blue-400">Competições Ativas</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 dark:from-green-950/30 to-green-100 dark:to-green-950/40 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.participantes}</div>
            <div className="text-sm text-green-700 dark:text-green-400">Participantes</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 dark:from-yellow-950/30 to-yellow-100 dark:to-yellow-950/40 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.premios}</div>
            <div className="text-sm text-yellow-700 dark:text-yellow-400">Total em Prêmios</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 dark:from-purple-950/30 to-purple-100 dark:to-purple-950/40 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.inscritos}</div>
            <div className="text-sm text-purple-700 dark:text-purple-400">Disponíveis</div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Competições */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competicoesFiltradas.map((competition) => (
          <Card 
            key={competition.id} 
            className="hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-200 dark:hover:border-blue-800"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${competition.cor || 'bg-blue-500'} rounded-full flex items-center justify-center text-2xl`}>
                    {competition.icone || '🏆'}
                  </div>
                  <div>
                    <CardTitle className="text-lg leading-tight">{competition.titulo}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {competition.disciplina_nome || competition.disciplina_id}
                      </Badge>
                      {competition.dificuldade && (
                        <span className={`text-xs font-medium ${getDifficultyColor(competition.dificuldade)}`}>
                          {competition.dificuldade.charAt(0).toUpperCase() + competition.dificuldade.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {getStatusBadge(competition.status)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {competition.descricao && (
                <p className="text-sm text-muted-foreground">{competition.descricao}</p>
              )}
              
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{competition.participantes_atual || 0}/{competition.max_participantes}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{competition.duracao}min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span>{competition.total_questoes || competition.questoes?.length || 0} questões</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span>{competition.nivel || 'Todos'}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Participantes</span>
                  <span>{Math.round(((competition.participantes_atual || 0) / competition.max_participantes) * 100)}%</span>
                </div>
                <Progress 
                  value={((competition.participantes_atual || 0) / competition.max_participantes) * 100} 
                  className="h-2" 
                />
              </div>

              {/* Recompensas */}
              <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Recompensas</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="text-yellow-600 dark:text-yellow-400 font-bold">🥇 {competition.recompensas.ouro}</div>
                    <div className="text-yellow-700 dark:text-yellow-400">1º lugar</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground font-bold">🥈 {competition.recompensas.prata}</div>
                    <div className="text-muted-foreground">2º lugar</div>
                  </div>
                  <div className="text-center">
                    <div className="text-orange-600 dark:text-orange-400 font-bold">🥉 {competition.recompensas.bronze}</div>
                    <div className="text-orange-700 dark:text-orange-400">3º lugar</div>
                  </div>
                </div>
              </div>

              {/* Timer */}
              {competition.status !== 'finalizada' && (
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                      {competition.status === 'agendada' ? 'Início em:' : 'Termina em:'}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {formatTimeRemaining(
                      competition.status === 'agendada' 
                        ? competition.data_inicio 
                        : competition.data_fim
                    )}
                  </div>
                </div>
              )}

              {/* Componente de Inscrição/Início */}
              <div className="pt-2">
                <CompetitionEnrollment
                  competition={competition}
                  onEnrolled={handleEnrolled}
                  onStarted={handleStarted}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Estado Vazio */}
      {competicoesFiltradas.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <Trophy className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma competição encontrada</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || filtroStatus !== 'todos' || filtroDisciplina !== 'todas'
                ? 'Tente ajustar os filtros de busca.'
                : 'Aguarde novas competições!'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Competicoes;
