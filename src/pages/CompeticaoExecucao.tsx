import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Timer,
  Trophy,
  Clock,
  Target,
  Zap,
  Award,
  ArrowRight,
  ArrowLeft,
  Coins,
  AlertCircle,
  CheckCircle,
  Sparkles,
  BarChart3,
  Home
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/authContext";
import { CompetitionsApiService } from "@/services/competitionsApi";
import { getErrorMessage, getErrorSuggestion } from "@/utils/errorHandler";
import type { 
  CompetitionSession, 
  CompetitionQuestion, 
  CompetitionSubmitResponse 
} from "@/types/competition-types";

const CompeticaoExecucao = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Estados principais
  const [session, setSession] = useState<CompetitionSession | null>(null);
  const [questions, setQuestions] = useState<CompetitionQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStartModal, setShowStartModal] = useState(true);
  const [showResultModal, setShowResultModal] = useState(false);
  const [competitionResult, setCompetitionResult] = useState<CompetitionSubmitResponse | null>(null);
  const [competitionInfo, setCompetitionInfo] = useState<{
    titulo: string;
    duracao: number;
    total_questoes: number;
    recompensas: { ouro: number; prata: number; bronze: number; participacao: number };
    disciplina?: string;
  } | null>(null);

  // Carregar dados da competição ao montar
  useEffect(() => {
    loadCompetitionInfo();
  }, [competitionId]);

  // Timer
  useEffect(() => {
    if (!session || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, timeRemaining]);

  // Auto-save de respostas (a cada 30 segundos)
  useEffect(() => {
    if (!session) return;

    const autoSaveInterval = setInterval(() => {
      saveCurrentAnswer();
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [session, answers]);

  const loadCompetitionInfo = async () => {
    if (!competitionId) {
      toast({
        title: "Erro",
        description: "ID da competição não encontrado.",
        variant: "destructive",
      });
      navigate('/aluno/competicoes');
      return;
    }

    try {
      setIsLoading(true);
      
      // Verificar se pode iniciar
      const canStartResponse = await CompetitionsApiService.canStartCompetition(competitionId);
      
      // Usar pode_iniciar se disponível, senão usar can_start (compatibilidade)
      const podeIniciar = canStartResponse.pode_iniciar ?? canStartResponse.can_start ?? false;
      const motivo = canStartResponse.motivo || canStartResponse.reason;
      
      if (!podeIniciar) {
        toast({
          title: "Não disponível",
          description: motivo || "Esta competição não está disponível no momento.",
          variant: "destructive",
        });
        navigate('/aluno/competicoes');
        return;
      }

      setCompetitionInfo(canStartResponse.competition_data || null);
    } catch (error) {
      console.error('Erro ao carregar competição:', error);
      
      const errorMessage = getErrorMessage(error, "Não foi possível carregar a competição. Tente novamente.");
      const suggestion = getErrorSuggestion(error);
      
      toast({
        title: "Erro ao carregar",
        description: suggestion ? `${errorMessage} ${suggestion}` : errorMessage,
        variant: "destructive",
        duration: 5000,
      });
      navigate('/aluno/competicoes');
    } finally {
      setIsLoading(false);
    }
  };

  const startCompetition = async () => {
    if (!competitionId) return;

    try {
      setIsStarting(true);
      const sessionData = await CompetitionsApiService.startCompetition(competitionId);
      
      setSession(sessionData);
      setQuestions(sessionData.questions);
      setTimeRemaining(sessionData.time_limit_minutes * 60);
      setStartTime(Date.now());
      setShowStartModal(false);
      
      // Carregar respostas salvas (se houver)
      if (sessionData.current_answers) {
        setAnswers(sessionData.current_answers);
      }

      toast({
        title: "Competição iniciada!",
        description: `Você tem ${sessionData.time_limit_minutes} minutos.`,
      });
    } catch (error) {
      console.error('Erro ao iniciar competição:', error);
      
      const errorMessage = getErrorMessage(error, "Não foi possível iniciar a competição. Tente novamente.");
      const suggestion = getErrorSuggestion(error);
      
      toast({
        title: "Erro ao iniciar",
        description: suggestion ? `${errorMessage} ${suggestion}` : errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsStarting(false);
    }
  };

  const saveCurrentAnswer = useCallback(async () => {
    if (!session) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const currentAnswer = answers[currentQuestion?.id];
    
    if (currentQuestion && currentAnswer) {
      try {
        await CompetitionsApiService.saveAnswer(
          session.session_id,
          currentQuestion.id,
          currentAnswer
        );
      } catch (error) {
        // Silenciosamente falha - não crítico
        console.debug('Auto-save failed:', error);
      }
    }
  }, [session, questions, currentQuestionIndex, answers]);

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleTimeUp = () => {
    toast({
      title: "Tempo esgotado!",
      description: "Enviando suas respostas automaticamente...",
      variant: "destructive",
    });
    submitCompetition();
  };

  const submitCompetition = async () => {
    if (!session || !competitionId) return;

    try {
      setIsSubmitting(true);
      
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      const answersArray = Object.entries(answers).map(([question_id, answer]) => ({
        question_id,
        answer
      }));

      const result = await CompetitionsApiService.submitCompetition({
        competition_id: competitionId,
        session_id: session.session_id,
        answers: answersArray,
        time_spent: timeSpent
      });

      setCompetitionResult(result);
      setShowResultModal(true);
    } catch (error) {
      console.error('Erro ao submeter:', error);
      
      const errorMessage = getErrorMessage(error, "Não foi possível enviar suas respostas. Tente novamente.");
      const suggestion = getErrorSuggestion(error);
      
      toast({
        title: "Erro ao enviar",
        description: suggestion ? `${errorMessage} ${suggestion}` : errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      saveCurrentAnswer();
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      saveCurrentAnswer();
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const goToQuestion = (index: number) => {
    saveCurrentAnswer();
    setCurrentQuestionIndex(index);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (): string => {
    if (!competitionInfo) return 'text-green-600 dark:text-green-400';
    
    const totalSeconds = competitionInfo.duracao * 60;
    const percentageLeft = (timeRemaining / totalSeconds) * 100;
    
    if (percentageLeft > 50) return 'text-green-600 dark:text-green-400';
    if (percentageLeft > 25) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400 animate-pulse';
  };

  const getAnsweredCount = (): number => {
    return questions.filter(q => answers[q.id]).length;
  };

  const getBasePath = () => {
    return user?.role === 'aluno' ? '/aluno' : '/app';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <Card className="animate-pulse">
          <CardContent className="p-8">
            <div className="flex flex-col items-center space-y-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de início
  if (showStartModal && !session) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl">{competitionInfo?.titulo}</CardTitle>
            {competitionInfo?.disciplina && (
              <Badge variant="outline" className="bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 w-fit mx-auto">
                {competitionInfo.disciplina}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {competitionInfo?.duracao}min
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-400">Duração</div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <Target className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {competitionInfo?.total_questoes}
                </div>
                <div className="text-sm text-green-700 dark:text-green-400">Questões</div>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                <Coins className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {competitionInfo?.recompensas?.ouro}
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-400">Max InnovCoins</div>
              </div>
            </div>

            {/* Recompensas */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-400 mb-3">
                Recompensas por Performance
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl mb-1">🥇</div>
                  <div className="font-bold text-yellow-600 dark:text-yellow-400">
                    {competitionInfo?.recompensas?.ouro} coins
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-400">1º lugar</div>
                </div>
                <div>
                  <div className="text-3xl mb-1">🥈</div>
                  <div className="font-bold text-gray-600 dark:text-gray-400">
                    {competitionInfo?.recompensas?.prata} coins
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-400">2º lugar</div>
                </div>
                <div>
                  <div className="text-3xl mb-1">🥉</div>
                  <div className="font-bold text-orange-600 dark:text-orange-400">
                    {competitionInfo?.recompensas?.bronze} coins
                  </div>
                  <div className="text-xs text-orange-700 dark:text-orange-400">3º lugar</div>
                </div>
              </div>
            </div>

            {/* Aviso */}
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-400">
                  Uma vez iniciada, a competição não pode ser pausada. 
                  Certifique-se de ter tempo e conexão estáveis antes de começar.
                </p>
              </div>
            </div>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                variant="outline" 
                onClick={() => navigate(`${getBasePath()}/competicoes`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={startCompetition} 
                disabled={isStarting}
                size="lg" 
                className="bg-green-600 hover:bg-green-700"
              >
                {isStarting ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Iniciar Competição
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de execução
  const currentQuestion = questions[currentQuestionIndex];
  const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;
  const hasCurrentAnswer = currentQuestion && answers[currentQuestion.id];

  return (
    <div className="container mx-auto py-4 px-4 max-w-4xl">
      {/* Header com Timer */}
      <Card className="mb-4 border-2 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="font-bold text-foreground">{competitionInfo?.titulo}</h1>
                <Badge variant="outline" className="text-xs">
                  {competitionInfo?.disciplina}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className={`text-2xl font-bold font-mono ${getTimeColor()}`}>
                  <Timer className="w-4 h-4 inline mr-1" />
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-xs text-muted-foreground">Tempo restante</div>
              </div>
              
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {currentQuestionIndex + 1}/{questions.length}
                </div>
                <div className="text-xs text-muted-foreground">Questão</div>
              </div>

              <div className="text-center">
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  {getAnsweredCount()}
                </div>
                <div className="text-xs text-muted-foreground">Respondidas</div>
              </div>
            </div>
          </div>
          
          <div className="mt-3">
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Questão */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Questão {currentQuestionIndex + 1}
            </CardTitle>
            {currentQuestion?.habilidade && (
              <Badge variant="outline" className="text-xs">
                {currentQuestion.codigo_habilidade || currentQuestion.habilidade}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Texto da questão */}
          <div 
            className="text-base leading-relaxed text-foreground"
            dangerouslySetInnerHTML={{ 
              __html: currentQuestion?.texto_formatado || currentQuestion?.texto || '' 
            }}
          />
          
          {/* Imagem da questão (se houver) */}
          {currentQuestion?.imagem_url && (
            <div className="flex justify-center">
              <img 
                src={currentQuestion.imagem_url} 
                alt="Imagem da questão" 
                className="max-w-full max-h-64 rounded-lg border"
              />
            </div>
          )}
          
          {/* Alternativas */}
          <div className="space-y-3">
            {currentQuestion?.alternativas.map((alternativa) => {
              const isSelected = answers[currentQuestion.id] === alternativa.id;
              
              return (
                <Button
                  key={alternativa.id}
                  variant={isSelected ? "default" : "outline"}
                  className={`w-full justify-start text-left h-auto py-4 px-6 ${
                    isSelected 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' 
                      : 'hover:bg-blue-50 dark:hover:bg-blue-950/30'
                  }`}
                  onClick={() => handleAnswerSelect(currentQuestion.id, alternativa.id)}
                >
                  <span className={`font-bold mr-3 ${isSelected ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>
                    {alternativa.letra})
                  </span>
                  <span className="flex-1">{alternativa.texto}</span>
                  {isSelected && <CheckCircle className="w-5 h-5 ml-2" />}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Navegação */}
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="outline"
          onClick={goToPreviousQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Anterior
        </Button>
        
        <div className="flex gap-2">
          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={submitCompetition}
              className="bg-green-600 hover:bg-green-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4 mr-2" />
                  Finalizar Competição
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={goToNextQuestion}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Próxima
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Indicador de questões */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {questions.map((question, index) => {
              const isAnswered = answers[question.id];
              const isCurrent = index === currentQuestionIndex;
              
              return (
                <button
                  key={question.id}
                  onClick={() => goToQuestion(index)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-2'
                      : isAnswered
                      ? 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-400 hover:bg-green-200'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-600 rounded-full" /> Atual
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 dark:bg-green-950/50 rounded-full border border-green-300" /> Respondida
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-300" /> Pendente
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Resultado */}
      <Dialog open={showResultModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <DialogTitle className="text-2xl text-green-600 dark:text-green-400">
              Competição Finalizada!
            </DialogTitle>
            <DialogDescription>
              Veja seu resultado abaixo
            </DialogDescription>
          </DialogHeader>
          
          {competitionResult && (
            <div className="space-y-6 py-4">
              {/* Posição e Nota */}
              <div className="text-center">
                {competitionResult.ranking_position <= 3 && (
                  <div className="text-6xl mb-4">
                    {competitionResult.ranking_position === 1 ? '🥇' : 
                     competitionResult.ranking_position === 2 ? '🥈' : '🥉'}
                  </div>
                )}
                
                <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {competitionResult.score.toFixed(1)}
                </div>
                <div className="text-muted-foreground">Nota</div>
                
                <div className="mt-4">
                  <Badge className="text-lg px-4 py-2">
                    {competitionResult.ranking_position}º lugar de {competitionResult.total_participants}
                  </Badge>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {competitionResult.correct_answers}
                  </div>
                  <div className="text-xs text-muted-foreground">Acertos</div>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <div className="text-xl font-bold text-red-600 dark:text-red-400">
                    {competitionResult.wrong_answers}
                  </div>
                  <div className="text-xs text-muted-foreground">Erros</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xl font-bold text-gray-600 dark:text-gray-400">
                    {competitionResult.blank_answers}
                  </div>
                  <div className="text-xs text-muted-foreground">Em branco</div>
                </div>
              </div>

              {/* Moedas ganhas */}
              {competitionResult.coins_earned > 0 && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800 text-center">
                  <Sparkles className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    +{competitionResult.coins_earned} InnovCoins
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-400">
                    Parabéns pela sua performance!
                  </div>
                </div>
              )}

              {/* Classificação */}
              {competitionResult.classificacao && (
                <div className="text-center">
                  <Badge variant="outline" className="text-sm px-4 py-2">
                    Classificação: {competitionResult.classificacao}
                  </Badge>
                </div>
              )}

              {/* Botões */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                <Button 
                  onClick={() => navigate(`${getBasePath()}/competicoes`)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Mais Competições
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate(`${getBasePath()}/competicoes/${competitionId}/resultados`)}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Ver Ranking
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompeticaoExecucao;

