import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EvaluationApiService } from '@/services/evaluationApi';
import { OlimpiadasApiService } from '@/services/olimpiadasApi';
import TakeEvaluation from '@/components/evaluations/TakeEvaluation';
import { TestData } from '@/types/evaluation-types';
import { api } from '@/lib/api';

export default function OlimpiadaStudent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState<TestData | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [canStart, setCanStart] = useState(false);
  const [canStartReason, setCanStartReason] = useState<string>('');
  const [shouldStopPolling, setShouldStopPolling] = useState(false);

  useEffect(() => {
    if (id) {
      loadOlimpiada();
    }
  }, [id]);

  // ✅ NOVO: Monitorar status da sessão periodicamente para detectar quando foi finalizada
  // IMPORTANTE: Este useEffect deve estar ANTES de qualquer return condicional para seguir as regras dos hooks
  useEffect(() => {
    // Parar polling se não há condições para continuar
    if (!id || !canStart || hasCompleted || shouldStopPolling) return;

    const checkSessionStatus = async () => {
      try {
        const sessionInfo = await EvaluationApiService.getTestSessionInfo(id);
        
        // Parar polling se sessão não existe mais
        if (!sessionInfo.session_exists) {
          setShouldStopPolling(true);
          return;
        }
        
        // Parar polling e redirecionar se finalizada
        if (sessionInfo.status === 'finalizada' || sessionInfo.status === 'completed') {
          setShouldStopPolling(true);
          console.log('✅ [OlimpiadaStudent] Olimpíada finalizada, redirecionando para /aluno/olimpiadas');
          navigate('/aluno/olimpiadas');
          return;
        }
        
        // Parar polling se expirada
        if (sessionInfo.status === 'expirada' || sessionInfo.is_expired) {
          setShouldStopPolling(true);
          return;
        }
      } catch (error: any) {
        // ✅ CORRIGIDO: Parar polling em caso de erro 404 ou 410 (sessão não existe ou expirada)
        if (error?.response?.status === 404 || error?.response?.status === 410) {
          console.log('🛑 [OlimpiadaStudent] Sessão não encontrada ou expirada, parando polling');
          setShouldStopPolling(true);
          return;
        }
        // Ignorar outros erros silenciosamente para evitar spam no console
      }
    };

    // Verificar a cada 3 segundos
    const interval = setInterval(checkSessionStatus, 3000);

    return () => clearInterval(interval);
  }, [id, canStart, hasCompleted, shouldStopPolling, navigate]);

  const DEFAULT_TIME_ZONE = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
    } catch (error) {
      return "America/Sao_Paulo";
    }
  })();

  function resolveTimeZone(candidate?: string): string {
    if (!candidate) {
      return DEFAULT_TIME_ZONE;
    }

    try {
      // Validar timezone usando Intl
      new Intl.DateTimeFormat("pt-BR", { timeZone: candidate });
      return candidate;
    } catch (error) {
      return DEFAULT_TIME_ZONE;
    }
  }

  function formatDateTimeForDisplay(value?: string, timeZone?: string): string | null {
    if (!value) {
      return null;
    }

    // ✅ CORREÇÃO: Se a data não tem timezone (não termina com Z nem tem +/-HH:MM),
    // assumir que está em UTC e adicionar 'Z' para forçar interpretação correta
    let dateString = value;
    const hasTimezone = value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value);
    
    if (!hasTimezone) {
      // Backend retorna data em UTC mas sem o 'Z'
      // Adicionar 'Z' para forçar interpretação como UTC
      dateString = value.includes('.') 
        ? value.split('.')[0] + 'Z' // Remover microsegundos e adicionar Z
        : value + 'Z';
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const safeTimeZone = resolveTimeZone(timeZone);

    const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: safeTimeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: safeTimeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });

    return `${dateFormatter.format(date)} às ${timeFormatter.format(date)}`;
  }

  const loadOlimpiada = async () => {
    if (!id) return;

    setLoading(true);
    try {
      // Buscar dados da olimpíada (inclui informações de timezone)
      const olimpiada = await OlimpiadasApiService.getOlimpiada(id);
      
      // Buscar dados do teste (questões)
      const test = await EvaluationApiService.getTestData(id);
      
      // Preservar informações de timezone da olimpíada no testData
      // Isso garante que as datas sejam exibidas corretamente
      if (test && olimpiada) {
        // Adicionar timezone ao testData se disponível
        const timeZone = 
          olimpiada.applicationTimeZone ||
          olimpiada.timeZone ||
          olimpiada.availability?.time_zone ||
          olimpiada.availability?.timezone ||
          DEFAULT_TIME_ZONE;
        
        // Log para debug
        console.log('📅 Timezone da olimpíada:', {
          id,
          timeZone,
          startDateTime: olimpiada.startDateTime,
          endDateTime: olimpiada.endDateTime,
          formattedStart: formatDateTimeForDisplay(olimpiada.startDateTime, timeZone),
          formattedEnd: formatDateTimeForDisplay(olimpiada.endDateTime, timeZone)
        });
      }
      
      // ✅ CRÍTICO: Mesclar duration da olimpíada como fallback se test.duration vier null
      // O backend pode retornar duration null para olimpíadas mas corretamente para avaliações
      const finalDuration = test.duration || olimpiada.duration || 60;
      
      console.log('🔍 [OlimpiadaStudent] Preparando dados do teste:', {
        testId: test.id,
        testDuration: test.duration,
        olimpiadaDuration: olimpiada.duration,
        finalDuration: finalDuration,
        willUseFallback: !test.duration
      });
      
      setTestData({
        ...test,
        duration: finalDuration // ✅ Garantir que duration nunca seja null/undefined
      });
      
      // ✅ PADRONIZADO: Verificar se pode iniciar usando endpoint can-start (mesmo padrão de StudentEvaluations)
      try {
        const response = await api.get(`/student-answers/student/${id}/can-start`);
        const canStartData = response.data;

        console.log("🔍 [OlimpiadaStudent] Resposta do can-start:", canStartData);

        if (canStartData.can_start) {
          setCanStart(true);
        } else {
          setCanStart(false);
          setCanStartReason(canStartData.reason || "Não foi possível iniciar a olimpíada");
          toast({
            title: "Não é possível iniciar",
            description: canStartData.reason || "Não foi possível iniciar a olimpíada",
            variant: "destructive",
          });
        }
      } catch (error: unknown) {
        const apiError = error as { message?: string; response?: { data?: { error?: string; message?: string }; status?: number }; config?: { url?: string } };
        
        console.error("❌ [OlimpiadaStudent] Erro ao verificar se pode iniciar:", error);
        console.error("Detalhes do erro:", {
          message: apiError.message,
          response: apiError.response?.data,
          status: apiError.response?.status,
          url: apiError.config?.url
        });

        let errorMessage = "Erro ao verificar disponibilidade da olimpíada";

        if (apiError.response?.data?.error) {
          errorMessage = apiError.response.data.error;
        } else if (apiError.response?.data?.message) {
          errorMessage = apiError.response.data.message;
        }

        setCanStart(false);
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      // Verificar se já completou
      try {
        const sessionInfo = await EvaluationApiService.getTestSessionInfo(id);
        if (sessionInfo.status === 'finalizada' || sessionInfo.status === 'completed') {
          setHasCompleted(true);
          // Buscar resultados
          const resultsData = await OlimpiadasApiService.getOlimpiadaResults(id);
          // Encontrar resultado do aluno atual
          // Nota: Seria necessário buscar o ID do aluno logado
          // Por enquanto, vamos apenas marcar como completo
        }
      } catch (error) {
        // Sessão não existe ainda, pode fazer a olimpíada
        console.log('Sessão não encontrada, aluno pode fazer a olimpíada');
      }

      // Verificar se o tipo está correto
      if (test && test.type !== 'OLIMPIADA' && test.type !== 'OLIMPÍADA') {
        console.warn('⚠️ [OlimpiadaStudent] testData.type não é OLIMPIADA:', test.type);
      }
    } catch (error) {
      console.error('Erro ao carregar olimpíada:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar olimpíada',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Olimpíada não encontrada</p>
            <Button onClick={() => navigate('/aluno/olimpiadas')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se já completou, mostrar resultado
  if (hasCompleted) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-950/20 dark:via-amber-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-6 w-6 text-yellow-600" />
              <CardTitle className="text-2xl">Olimpíada Concluída!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">{testData.title}</h2>
              <Badge variant="outline" className="text-sm">
                {testData.subject.name}
              </Badge>
            </div>

            {results && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white/50 dark:bg-gray-900/50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Nota</div>
                      <div className="text-3xl font-bold text-yellow-600">
                        {results.score?.toFixed(1) || '0.0'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 dark:bg-gray-900/50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Acertos</div>
                      <div className="text-3xl font-bold text-green-600">
                        {results.correct_answers || 0}/{results.total_questions || 0}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 dark:bg-gray-900/50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Classificação</div>
                      <Badge className="text-lg px-4 py-2">
                        {results.classification || 'N/A'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/aluno/olimpiadas')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Olimpíadas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ PADRONIZADO: Verificar se pode iniciar antes de renderizar TakeEvaluation
  if (!canStart) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {canStartReason || "Não é possível iniciar a olimpíada no momento"}
            </p>
            <Button onClick={() => navigate('/aluno/olimpiadas')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Olimpíadas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renderizar TakeEvaluation com tema de olimpíadas
  return (
    <div className="olimpiada-theme">
      <TakeEvaluation />
    </div>
  );
}
