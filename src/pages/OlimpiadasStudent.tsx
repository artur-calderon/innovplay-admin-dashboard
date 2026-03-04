import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Calendar, Clock, Play, Loader2, AlertCircle, CheckCircle, X, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OlimpiadasApiService } from '@/services/olimpiadasApi';
import { EvaluationApiService } from '@/services/evaluationApi';
import { Olimpiada } from '@/types/olimpiada-types';
import { api } from '@/lib/api';

export default function OlimpiadasStudent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [olimpiadas, setOlimpiadas] = useState<Olimpiada[]>([]);
  const [loading, setLoading] = useState(true);
  // ✅ TEMPORÁRIO: Estado para sessões ativas
  const [activeSessions, setActiveSessions] = useState<Array<{ session_id: string; test_id: string; test_title?: string }>>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    loadOlimpiadas();
    // ✅ TEMPORÁRIO: Carregar sessões ativas
    loadActiveSessions();
  }, []);

  // ✅ TEMPORÁRIO: Função para carregar sessões ativas
  const loadActiveSessions = async () => {
    setLoadingSessions(true);
    try {
      // Buscar todas as sessões do aluno usando a rota oficial do backend
      const response = await api.get('/student-answers/student/sessions');
      const sessions = response.data?.sessions || [];
      
      // Filtrar apenas sessões em andamento
      // A rota retorna status: 'em_andamento', 'finalizada', 'expirada', etc.
      const active = sessions.filter((s: any) => s.status === 'em_andamento');
      
      setActiveSessions(active);
    } catch {
      // Silenciar erro ao carregar sessões
    } finally {
      setLoadingSessions(false);
    }
  };

  // ✅ TEMPORÁRIO: Função para encerrar sessão
  const handleEndSession = async (sessionId: string) => {
    try {
      await EvaluationApiService.endSession(sessionId, 'manual');
      toast({
        title: 'Sessão encerrada',
        description: 'A sessão foi encerrada com sucesso. Você pode iniciar uma nova avaliação ou olimpíada.',
        variant: 'default',
      });
      // Recarregar sessões ativas
      await loadActiveSessions();
      // Recarregar olimpíadas para atualizar status
      await loadOlimpiadas();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: 'Erro',
        description: err?.response?.data?.message || 'Erro ao encerrar sessão',
        variant: 'destructive',
      });
    }
  };

  const loadOlimpiadas = async () => {
    setLoading(true);
    try {
      const response = await OlimpiadasApiService.getStudentOlimpiadas();
      setOlimpiadas(response ?? []);
    } catch (error) {
      setOlimpiadas([]);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar olimpíadas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartOlimpiada = (id: string) => {
    navigate(`/aluno/olimpiada/${id}/fazer`);
  };

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

  function getOlimpiadaTimeZone(olimpiada?: Olimpiada): string {
    if (!olimpiada) {
      return DEFAULT_TIME_ZONE;
    }

    const candidate =
      olimpiada.applicationTimeZone ||
      olimpiada.timeZone ||
      olimpiada.availability?.time_zone ||
      olimpiada.availability?.timezone;

    return resolveTimeZone(candidate);
  }

  // ✅ PADRONIZADO: Função para verificar se a olimpíada está expirada (mesmo padrão de StudentEvaluations)
  const isExpired = (olimpiada: Olimpiada): boolean => {
    return (
      olimpiada.student_status?.status === 'expirada' ||
      olimpiada.availability?.status === 'expired'
    );
  };

  // ✅ PADRONIZADO: Função para obter badge de status (mesmo padrão de StudentEvaluations)
  const getStatusBadge = (olimpiada: Olimpiada) => {
    const { student_status, availability } = olimpiada;

    // Verificar se está concluída primeiro
    if (student_status?.has_completed) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Concluída
        </Badge>
      );
    }

    // Verificar se está expirada (tanto no student_status quanto no availability)
    if (isExpired(olimpiada)) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Expirada
        </Badge>
      );
    }

    // Verificar se está agendada (not_started)
    if (availability?.status === 'not_started') {
      return (
        <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-300">
          <Calendar className="h-3 w-3" />
          Agendada
        </Badge>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4 min-h-screen">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6 min-h-screen">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" id="olimpiadas-page-title">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg shadow-fuchsia-500/30 transition-transform duration-300 hover:scale-110">
            <Trophy className="w-5 h-5 text-white drop-shadow" />
          </span>
          <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 dark:from-violet-400 dark:via-fuchsia-400 dark:to-pink-400 bg-clip-text text-transparent">Olimpíadas Disponíveis</span>
        </h1>
        <p className="text-muted-foreground mt-1 font-medium">
          Participe das olimpíadas e teste seus conhecimentos
        </p>
      </div>

      {/* ✅ TEMPORÁRIO: Card para encerrar sessões ativas */}
      {activeSessions.length > 0 && (
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg text-orange-900 dark:text-orange-100">
                ⚠️ TEMPORÁRIO: Sessões Ativas Encontradas
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              Você tem {activeSessions.length}{' '}
              {activeSessions.length === 1 ? 'sessão ativa' : 'sessões ativas'} que podem
              estar impedindo o início de novas avaliações ou olimpíadas.
            </p>
            <div className="space-y-2">
              {activeSessions.map((session) => (
                <div
                  key={session.session_id}
                  className="flex items-center justify-between p-3 bg-card rounded-md border border-orange-200 dark:border-orange-800"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Sessão: {session.session_id.substring(0, 8)}...
                    </p>
                    {session.test_title && (
                      <p className="text-xs text-muted-foreground">
                        {session.test_title}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => handleEndSession(session.session_id)}
                    variant="destructive"
                    size="sm"
                    className="ml-4"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Encerrar Sessão
                  </Button>
                </div>
              ))}
            </div>
            <Button
              onClick={loadActiveSessions}
              variant="outline"
              size="sm"
              disabled={loadingSessions}
            >
              {loadingSessions ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Atualizar
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {olimpiadas.length === 0 ? (
        <Card className="rounded-2xl border-2 border-dashed border-violet-200/60 dark:border-violet-500/40 overflow-hidden bg-gradient-to-br from-violet-500/5 to-transparent animate-fade-in-up">
          <CardContent className="py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="font-medium text-foreground">
              Nenhuma olimpíada disponível no momento
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Quando houver olimpíadas abertas, elas aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {olimpiadas.map((olimpiada) => (
            <Card
              key={olimpiada.id}
              className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-950/20 dark:via-amber-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800"
            >
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                <div className="absolute top-4 right-4 text-6xl">🏆</div>
              </div>

              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <CardTitle className="text-xl font-bold text-foreground truncate">
                        {olimpiada.title}
                      </CardTitle>
                    </div>
                    {olimpiada.description && (
                      <p className="text-sm text-yellow-800/80 dark:text-yellow-200/80 line-clamp-2">
                        {olimpiada.description}
                      </p>
                    )}
                  </div>
                  {/* ✅ PADRONIZADO: Badge de status (mesmo padrão de StudentEvaluations) */}
                  {getStatusBadge(olimpiada)}
                </div>
              </CardHeader>

              <CardContent className="relative space-y-4">
                {olimpiada.subjects && olimpiada.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {olimpiada.subjects.slice(0, 3).map((subject) => (
                      <Badge
                        key={subject.id}
                        variant="outline"
                        className="bg-yellow-100/50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-foreground"
                      >
                        {subject.name}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  {olimpiada.startDateTime && (
                    <div className="flex items-center gap-2 text-foreground">
                      <Calendar className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span>
                        {(() => {
                          const timeZone = getOlimpiadaTimeZone(olimpiada);
                          const formatted = formatDateTimeForDisplay(olimpiada.startDateTime, timeZone);
                          
                          return formatted || "Data não definida";
                        })()}
                      </span>
                    </div>
                  )}
                  {olimpiada.duration && (
                    <div className="flex items-center gap-2 text-foreground">
                      <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span>{olimpiada.duration} minutos</span>
                    </div>
                  )}
                </div>

                {/* ✅ PADRONIZADO: Botão com verificação de status expirado (mesmo padrão de StudentEvaluations) */}
                {isExpired(olimpiada) ? (
                  <Button
                    disabled
                    className="w-full bg-muted text-white cursor-not-allowed"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Expirada
                  </Button>
                ) : olimpiada.student_status?.has_completed ? (
                  <Button
                    onClick={() => navigate(`/aluno/olimpiada/${olimpiada.id}/resultado`)}
                    className="w-full bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Ver Resultado
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleStartOlimpiada(olimpiada.id)}
                    disabled={!(olimpiada.availability?.is_available === true && olimpiada.student_status?.can_start === true)}
                    className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {(olimpiada.availability?.is_available === true && olimpiada.student_status?.can_start === true) 
                      ? 'Fazer Olimpíada' 
                      : 'Aguardando início'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
