import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Timer,
  Trophy,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Zap,
  Award,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Questao {
  id: string;
  pergunta: string;
  alternativas: string[];
  resposta_correta: number;
  disciplina: string;
  nivel: string;
  explicacao: string;
}

interface TorneioInfo {
  id: string;
  titulo: string;
  disciplina: string;
  duracao: number;
  questoes: number;
  recompensaOuro: number;
  recompensaPrata: number;
  recompensaBronze: number;
}

const TorneioExecucao = () => {
  const { torneioId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [torneio, setTorneio] = useState<TorneioInfo | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [questaoAtual, setQuestaoAtual] = useState(0);
  const [respostas, setRespostas] = useState<number[]>([]);
  const [tempoRestante, setTempoRestante] = useState(0);
  const [torneioIniciado, setTorneioIniciado] = useState(false);
  const [torneioFinalizado, setTorneioFinalizado] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Dados mockados do torneio
  const mockTorneio: TorneioInfo = {
    id: torneioId || '1',
    titulo: 'Desafio Matemático Semanal',
    disciplina: 'Matemática',
    duracao: 45,
    questoes: 20,
    recompensaOuro: 100,
    recompensaPrata: 60,
    recompensaBronze: 30
  };

  // Questões mockadas de matemática
  const mockQuestoes: Questao[] = [
    {
      id: '1',
      pergunta: 'Qual é o resultado de 2x + 5 = 13?',
      alternativas: ['x = 3', 'x = 4', 'x = 5', 'x = 6'],
      resposta_correta: 1,
      disciplina: 'Matemática',
      nivel: '9º Ano',
      explicacao: '2x + 5 = 13 → 2x = 13 - 5 → 2x = 8 → x = 4'
    },
    {
      id: '2',
      pergunta: 'A área de um círculo com raio 5cm é:',
      alternativas: ['25π cm²', '10π cm²', '15π cm²', '20π cm²'],
      resposta_correta: 0,
      disciplina: 'Matemática',
      nivel: '9º Ano',
      explicacao: 'A = πr² → A = π × 5² → A = 25π cm²'
    },
    {
      id: '3',
      pergunta: 'Qual é 15% de 200?',
      alternativas: ['25', '30', '35', '40'],
      resposta_correta: 1,
      disciplina: 'Matemática',
      nivel: '9º Ano',
      explicacao: '15% de 200 = 0,15 × 200 = 30'
    },
    {
      id: '4',
      pergunta: 'O valor de √64 é:',
      alternativas: ['6', '7', '8', '9'],
      resposta_correta: 2,
      disciplina: 'Matemática',
      nivel: '9º Ano',
      explicacao: '√64 = 8, pois 8² = 64'
    },
    {
      id: '5',
      pergunta: 'Em uma função f(x) = 2x + 3, qual é f(4)?',
      alternativas: ['9', '10', '11', '12'],
      resposta_correta: 2,
      disciplina: 'Matemática',
      nivel: '9º Ano',
      explicacao: 'f(4) = 2(4) + 3 = 8 + 3 = 11'
    }
  ];

  useEffect(() => {
    const loadTorneio = async () => {
      try {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTorneio(mockTorneio);
        setQuestoes(mockQuestoes);
        setTempoRestante(mockTorneio.duracao * 60); // Converter para segundos
        setRespostas(new Array(mockQuestoes.length).fill(-1));
      } catch (error) {
        console.error('Erro ao carregar torneio:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o torneio.",
          variant: "destructive",
        });
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    loadTorneio();
  }, [torneioId, navigate, toast]);

  useEffect(() => {
    if (!torneioIniciado || torneioFinalizado || tempoRestante <= 0) return;

    const timer = setInterval(() => {
      setTempoRestante(prev => {
        if (prev <= 1) {
          finalizarTorneio();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [torneioIniciado, torneioFinalizado, tempoRestante]);

  const iniciarTorneio = () => {
    setTorneioIniciado(true);
    toast({
      title: "Torneio iniciado!",
      description: `Você tem ${torneio?.duracao} minutos para responder ${torneio?.questoes} questões.`,
    });
  };

  const finalizarTorneio = () => {
    setTorneioFinalizado(true);
    const acertos = calcularAcertos();
    const percentual = (acertos / questoes.length) * 100;
    
    let recompensa = 0;
    if (percentual >= 90) recompensa = torneio?.recompensaOuro || 0;
    else if (percentual >= 75) recompensa = torneio?.recompensaPrata || 0;
    else if (percentual >= 60) recompensa = torneio?.recompensaBronze || 0;

    toast({
      title: "Torneio finalizado!",
      description: `Você acertou ${acertos}/${questoes.length} questões (${percentual.toFixed(1)}%)${recompensa > 0 ? ` e ganhou ${recompensa} AfirmeCoins!` : ''}`,
    });
  };

  const responderQuestao = (alternativa: number) => {
    const novasRespostas = [...respostas];
    novasRespostas[questaoAtual] = alternativa;
    setRespostas(novasRespostas);
  };

  const proximaQuestao = () => {
    if (questaoAtual < questoes.length - 1) {
      setQuestaoAtual(questaoAtual + 1);
    }
  };

  const questaoAnterior = () => {
    if (questaoAtual > 0) {
      setQuestaoAtual(questaoAtual - 1);
    }
  };

  const calcularAcertos = () => {
    return respostas.filter((resposta, index) => 
      resposta === questoes[index]?.resposta_correta
    ).length;
  };

  const formatarTempo = (segundos: number) => {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  const obterCorTempo = () => {
    const percentualTempo = (tempoRestante / (torneio?.duracao || 1 * 60)) * 100;
    if (percentualTempo > 50) return 'text-green-600';
    if (percentualTempo > 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-40 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!torneioIniciado) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <Card className="border-2 border-blue-200">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl">{torneio?.titulo}</CardTitle>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 w-fit mx-auto">
              {torneio?.disciplina}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{torneio?.duracao}min</div>
                <div className="text-sm text-blue-700">Duração</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{torneio?.questoes}</div>
                <div className="text-sm text-green-700">Questões</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <Award className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600">{torneio?.recompensaOuro}</div>
                <div className="text-sm text-yellow-700">Max AfirmeCoins</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 border border-yellow-200">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">Recompensas por Performance</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl mb-1">🥇</div>
                  <div className="font-bold text-yellow-600">{torneio?.recompensaOuro} coins</div>
                  <div className="text-xs text-yellow-700">90%+ de acertos</div>
                </div>
                <div>
                  <div className="text-2xl mb-1">🥈</div>
                  <div className="font-bold text-gray-600">{torneio?.recompensaPrata} coins</div>
                  <div className="text-xs text-gray-700">75%+ de acertos</div>
                </div>
                <div>
                  <div className="text-2xl mb-1">🥉</div>
                  <div className="font-bold text-orange-600">{torneio?.recompensaBronze} coins</div>
                  <div className="text-xs text-orange-700">60%+ de acertos</div>
                </div>
              </div>
            </div>

            <div className="text-center space-y-4">
              <p className="text-gray-600">
                Você está prestes a iniciar o torneio. Uma vez iniciado, o cronômetro não pode ser pausado.
              </p>
              <Button onClick={iniciarTorneio} size="lg" className="bg-green-600 hover:bg-green-700">
                <Zap className="w-5 h-5 mr-2" />
                Iniciar Torneio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (torneioFinalizado) {
    const acertos = calcularAcertos();
    const percentual = (acertos / questoes.length) * 100;
    
    let recompensa = 0;
    let medalha = '';
    if (percentual >= 90) {
      recompensa = torneio?.recompensaOuro || 0;
      medalha = '🥇';
    } else if (percentual >= 75) {
      recompensa = torneio?.recompensaPrata || 0;
      medalha = '🥈';
    } else if (percentual >= 60) {
      recompensa = torneio?.recompensaBronze || 0;
      medalha = '🥉';
    }

    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <Card className="border-2 border-green-200">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl text-green-600">Torneio Finalizado!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              {medalha && <div className="text-6xl mb-4">{medalha}</div>}
              <div className="text-4xl font-bold text-green-600 mb-2">{acertos}/{questoes.length}</div>
              <div className="text-lg text-gray-600 mb-4">acertos ({percentual.toFixed(1)}%)</div>
              {recompensa > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-600">+{recompensa} AfirmeCoins</div>
                  <div className="text-sm text-yellow-700">Parabéns pela sua performance!</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => navigate('/')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Voltar às Competições
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/aluno')}
              >
                Ir para o Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const questao = questoes[questaoAtual];
  const progressoPercentual = ((questaoAtual + 1) / questoes.length) * 100;
  const temRespostaPendente = respostas[questaoAtual] === -1;

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Header com informações do torneio */}
      <Card className="mb-6 border-2 border-blue-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <Trophy className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold">{torneio?.titulo}</h1>
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  {torneio?.disciplina}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className={`text-2xl font-bold ${obterCorTempo()}`}>
                  {formatarTempo(tempoRestante)}
                </div>
                <div className="text-sm text-gray-600">Tempo restante</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {questaoAtual + 1}/{questoes.length}
                </div>
                <div className="text-sm text-gray-600">Questão</div>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress value={progressoPercentual} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Questão atual */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">
            Questão {questaoAtual + 1}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-lg font-medium leading-relaxed">
            {questao?.pergunta}
          </div>
          
          <div className="space-y-3">
            {questao?.alternativas.map((alternativa, index) => (
              <Button
                key={index}
                variant={respostas[questaoAtual] === index ? "default" : "outline"}
                className={`w-full justify-start text-left h-auto py-4 px-6 ${
                  respostas[questaoAtual] === index 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'hover:bg-blue-50'
                }`}
                onClick={() => responderQuestao(index)}
              >
                <span className="font-bold mr-3">{String.fromCharCode(65 + index)})</span>
                {alternativa}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navegação */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={questaoAnterior}
          disabled={questaoAtual === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Anterior
        </Button>
        
        <div className="flex gap-2">
          {questaoAtual === questoes.length - 1 ? (
            <Button
              onClick={finalizarTorneio}
              className="bg-green-600 hover:bg-green-700"
              disabled={respostas.includes(-1)}
            >
              <Trophy className="w-4 h-4 mr-2" />
              Finalizar Torneio
            </Button>
          ) : (
            <Button
              onClick={proximaQuestao}
              disabled={temRespostaPendente}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Próxima
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Indicador de questões respondidas */}
      <div className="mt-6 flex flex-wrap gap-2 justify-center">
        {questoes.map((_, index) => (
          <div
            key={index}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              index === questaoAtual
                ? 'bg-blue-600 text-white'
                : respostas[index] !== -1
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {index + 1}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TorneioExecucao; 