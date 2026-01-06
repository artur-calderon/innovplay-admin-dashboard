import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/authContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Trophy,
  Users,
  Clock,
  Coins,
  BookOpen,
  Calculator,
  Globe,
  Atom,
  MapPin,
  Languages,
  Palette,
  Music,
  Star,
  Calendar,
  Timer,
  Award,
  Target,
  Zap,
  Filter,
  Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Torneio {
  id: string;
  titulo: string;
  disciplina: string;
  nivel: string;
  escola: string;
  dataInicio: Date;
  dataFim: Date;
  participantes: number;
  maxParticipantes: number;
  recompensaOuro: number;
  recompensaPrata: number;
  recompensaBronze: number;
  status: 'disponivel' | 'inscrito' | 'em_andamento' | 'finalizado';
  dificuldade: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
  duracao: number; // em minutos
  questoes: number;
  icone: string;
  cor: string;
  descricao: string;
}

type FiltroStatus = 'todos' | 'disponivel' | 'inscrito' | 'em_andamento' | 'finalizado';
type FiltroDisciplina = 'todas' | 'matematica' | 'portugues' | 'ciencias' | 'historia' | 'geografia' | 'ingles' | 'arte' | 'educacao_fisica';

const Competicoes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [torneios, setTorneios] = useState<Torneio[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [filtroDisciplina, setFiltroDisciplina] = useState<FiltroDisciplina>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Dados mockados de torneios
  const mockTorneios: Torneio[] = [
    {
      id: '1',
      titulo: 'Desafio Matemático Semanal',
      disciplina: 'Matemática',
      nivel: '9º Ano',
      escola: 'Todas as Escolas',
      dataInicio: new Date(Date.now() + 2 * 60 * 60 * 1000), // Em 2 horas
      dataFim: new Date(Date.now() + 26 * 60 * 60 * 1000), // Em 26 horas
      participantes: 234,
      maxParticipantes: 500,
      recompensaOuro: 100,
      recompensaPrata: 60,
      recompensaBronze: 30,
      status: 'disponivel',
      dificuldade: 'Adequado',
      duracao: 45,
      questoes: 20,
      icone: '🧮',
      cor: 'bg-blue-500',
      descricao: 'Teste seus conhecimentos em álgebra, geometria e estatística!'
    },
    {
      id: '2',
      titulo: 'Português: Interpretação de Texto',
      disciplina: 'Português',
      nivel: '8º-9º Ano',
      escola: 'Regional Sul',
      dataInicio: new Date(Date.now() - 1 * 60 * 60 * 1000), // Começou há 1 hora
      dataFim: new Date(Date.now() + 23 * 60 * 60 * 1000), // Termina em 23 horas
      participantes: 156,
      maxParticipantes: 300,
      recompensaOuro: 90,
      recompensaPrata: 50,
      recompensaBronze: 25,
      status: 'inscrito',
      dificuldade: 'Adequado',
      duracao: 40,
      questoes: 15,
      icone: '📚',
      cor: 'bg-green-500',
      descricao: 'Domine a arte da interpretação e análise textual!'
    },
    {
      id: '3',
      titulo: 'Ciências da Natureza',
      disciplina: 'Ciências',
      nivel: '7º-8º Ano',
      escola: 'Todas as Escolas',
      dataInicio: new Date(Date.now() - 25 * 60 * 60 * 1000), // Começou há 25 horas
      dataFim: new Date(Date.now() - 1 * 60 * 60 * 1000), // Terminou há 1 hora
      participantes: 189,
      maxParticipantes: 400,
      recompensaOuro: 80,
      recompensaPrata: 45,
      recompensaBronze: 20,
      status: 'finalizado',
      dificuldade: 'Básico',
      duracao: 35,
      questoes: 18,
      icone: '🔬',
      cor: 'bg-purple-500',
      descricao: 'Explore os mistérios da física, química e biologia!'
    },
    {
      id: '4',
      titulo: 'História do Brasil',
      disciplina: 'História',
      nivel: '8º Ano',
      escola: 'Regional Norte',
      dataInicio: new Date(Date.now() + 24 * 60 * 60 * 1000), // Em 1 dia
      dataFim: new Date(Date.now() + 48 * 60 * 60 * 1000), // Em 2 dias
      participantes: 78,
      maxParticipantes: 200,
      recompensaOuro: 70,
      recompensaPrata: 40,
      recompensaBronze: 15,
      status: 'disponivel',
      dificuldade: 'Adequado',
      duracao: 30,
      questoes: 12,
      icone: '🏛️',
      cor: 'bg-yellow-500',
      descricao: 'Viaje pela rica história do nosso país!'
    },
    {
      id: '5',
      titulo: 'Geografia Mundial',
      disciplina: 'Geografia',
      nivel: '9º Ano',
      escola: 'Todas as Escolas',
      dataInicio: new Date(Date.now() + 72 * 60 * 60 * 1000), // Em 3 dias
      dataFim: new Date(Date.now() + 96 * 60 * 60 * 1000), // Em 4 dias
      participantes: 45,
      maxParticipantes: 350,
      recompensaOuro: 110,
      recompensaPrata: 65,
      recompensaBronze: 35,
      status: 'disponivel',
      dificuldade: 'Avançado',
      duracao: 50,
      questoes: 25,
      icone: '🌍',
      cor: 'bg-teal-500',
      descricao: 'Desbrave continentes e culturas ao redor do globo!'
    },
    {
      id: '6',
      titulo: 'English Challenge',
      disciplina: 'Inglês',
      nivel: '8º-9º Ano',
      escola: 'Todas as Escolas',
      dataInicio: new Date(Date.now() - 30 * 60 * 1000), // Começou há 30 min
      dataFim: new Date(Date.now() + 23.5 * 60 * 60 * 1000), // Termina em 23h30min
      participantes: 167,
      maxParticipantes: 250,
      recompensaOuro: 85,
      recompensaPrata: 50,
      recompensaBronze: 25,
      status: 'em_andamento',
      dificuldade: 'Adequado',
      duracao: 35,
      questoes: 16,
      icone: '🇺🇸',
      cor: 'bg-red-500',
      descricao: 'Test your English skills with grammar and vocabulary!'
    }
  ];

  useEffect(() => {
    const loadTorneios = async () => {
      try {
        setIsLoading(true);
        // Simular delay de carregamento
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTorneios(mockTorneios);
      } catch (error) {
        console.error('Erro ao carregar torneios:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os torneios.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTorneios();
  }, [toast]);

  const handleInscricao = (torneioId: string) => {
    setTorneios(prev => prev.map(torneio => 
      torneio.id === torneioId 
        ? { ...torneio, status: 'inscrito', participantes: torneio.participantes + 1 }
        : torneio
    ));
    toast({
      title: "Inscrição realizada!",
      description: "Você foi inscrito no torneio com sucesso.",
    });
  };

  const handleIniciarTorneio = (torneioId: string) => {
    const torneio = torneios.find(t => t.id === torneioId);
    if (torneio) {
      // Navegar para a página de execução do torneio
      const basePath = user?.role === 'aluno' ? '/aluno' : '/app';
      navigate(`${basePath}/torneio/${torneioId}`);
    }
  };

  const formatTimeRemaining = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expirado';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'disponivel':
        return <Badge className="bg-green-100 text-green-800">Disponível</Badge>;
      case 'inscrito':
        return <Badge className="bg-blue-100 text-blue-800">Inscrito</Badge>;
      case 'em_andamento':
        return <Badge className="bg-orange-100 text-orange-800">Em Andamento</Badge>;
      case 'finalizado':
        return <Badge className="bg-gray-100 text-gray-800">Finalizado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDifficultyColor = (dificuldade: string) => {
    switch (dificuldade) {
      case 'Abaixo do Básico':
        return 'text-red-600';
      case 'Básico':
        return 'text-yellow-600';
      case 'Adequado':
        return 'text-green-600';
      case 'Avançado':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const torneiosFiltrados = torneios.filter(torneio => {
    const matchStatus = filtroStatus === 'todos' || torneio.status === filtroStatus;
    const matchDisciplina = filtroDisciplina === 'todas' || 
      torneio.disciplina.toLowerCase().includes(filtroDisciplina.replace('_', ' '));
    const matchSearch = torneio.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      torneio.disciplina.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchStatus && matchDisciplina && matchSearch;
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-40 bg-gray-200 rounded"></div>
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
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Competições</h1>
            <p className="text-gray-600">Participe de torneios semanais e ganhe recompensas!</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 px-3 py-1">
            <Coins className="w-4 h-4 mr-1" />
            Ganhe AfirmeCoins
          </Badge>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar torneios..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="todos">Todos os Status</option>
          <option value="disponivel">Disponível</option>
          <option value="inscrito">Inscrito</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="finalizado">Finalizado</option>
        </select>

        <select
          value={filtroDisciplina}
          onChange={(e) => setFiltroDisciplina(e.target.value as FiltroDisciplina)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="todas">Todas as Disciplinas</option>
          <option value="matematica">Matemática</option>
          <option value="portugues">Português</option>
          <option value="ciencias">Ciências</option>
          <option value="historia">História</option>
          <option value="geografia">Geografia</option>
          <option value="ingles">Inglês</option>
        </select>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{torneios.length}</div>
            <div className="text-sm text-blue-700">Torneios Ativos</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {torneios.reduce((sum, t) => sum + t.participantes, 0)}
            </div>
            <div className="text-sm text-green-700">Participantes</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {torneios.reduce((sum, t) => sum + t.recompensaOuro, 0)}
            </div>
            <div className="text-sm text-yellow-700">Total em Prêmios</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {torneios.filter(t => t.status === 'inscrito').length}
            </div>
            <div className="text-sm text-purple-700">Seus Torneios</div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Torneios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {torneiosFiltrados.map((torneio) => (
          <Card key={torneio.id} className="hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${torneio.cor} rounded-full flex items-center justify-center text-2xl`}>
                    {torneio.icone}
                  </div>
                  <div>
                    <CardTitle className="text-lg leading-tight">{torneio.titulo}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {torneio.disciplina}
                      </Badge>
                      <span className={`text-xs font-medium ${getDifficultyColor(torneio.dificuldade)}`}>
                        {torneio.dificuldade.charAt(0).toUpperCase() + torneio.dificuldade.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                {getStatusBadge(torneio.status)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{torneio.descricao}</p>
              
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span>{torneio.participantes}/{torneio.maxParticipantes}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>{torneio.duracao}min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-gray-500" />
                  <span>{torneio.questoes} questões</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gray-500" />
                  <span>{torneio.nivel}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Participantes</span>
                  <span>{Math.round((torneio.participantes / torneio.maxParticipantes) * 100)}%</span>
                </div>
                <Progress value={(torneio.participantes / torneio.maxParticipantes) * 100} className="h-2" />
              </div>

              {/* Recompensas */}
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-700">Recompensas</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="text-yellow-600 font-bold">🥇 {torneio.recompensaOuro}</div>
                    <div className="text-yellow-700">1º lugar</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600 font-bold">🥈 {torneio.recompensaPrata}</div>
                    <div className="text-gray-700">2º lugar</div>
                  </div>
                  <div className="text-center">
                    <div className="text-orange-600 font-bold">🥉 {torneio.recompensaBronze}</div>
                    <div className="text-orange-700">3º lugar</div>
                  </div>
                </div>
              </div>

              {/* Timer */}
              {torneio.status !== 'finalizado' && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">
                      {torneio.status === 'disponivel' ? 'Inscrições até:' : 
                       torneio.status === 'inscrito' || torneio.status === 'em_andamento' ? 'Termina em:' : 'Tempo restante:'}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-blue-600 mt-1">
                    {formatTimeRemaining(torneio.dataFim)}
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="pt-2">
                {torneio.status === 'disponivel' && (
                  <Button 
                    onClick={() => handleInscricao(torneio.id)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Inscrever-se
                  </Button>
                )}
                
                {torneio.status === 'inscrito' && (
                  <Button 
                    onClick={() => handleIniciarTorneio(torneio.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Iniciar Torneio
                  </Button>
                )}
                
                {torneio.status === 'em_andamento' && (
                  <Button 
                    onClick={() => handleIniciarTorneio(torneio.id)}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    <Timer className="w-4 h-4 mr-2" />
                    Continuar
                  </Button>
                )}
                
                {torneio.status === 'finalizado' && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    disabled
                  >
                    <Award className="w-4 h-4 mr-2" />
                    Finalizado
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {torneiosFiltrados.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum torneio encontrado</h3>
          <p className="text-gray-600">Tente ajustar os filtros ou aguarde novos torneios!</p>
        </div>
      )}
    </div>
  );
};

export default Competicoes; 