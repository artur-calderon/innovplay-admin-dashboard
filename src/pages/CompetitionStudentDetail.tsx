/**
 * Detalhes da competição para o estudante (ver + inscrever-se).
 * Rota: /aluno/competitions/:id
 * Layout gamificado: hero com CTA claro, resumo visual, só informações relevantes.
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Trophy,
  BookOpen,
  Coins,
  UserPlus,
  Loader2,
  CheckCircle,
  Medal,
  Users,
  Award,
  AlertCircle,
  Timer,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { getCompetitionDetails, getMyCompetitionSession, unenrollCompetition, startCompetition } from '@/services/competitionsApi';
import type { Competition } from '@/types/competition-types';
import { EnrollConfirmationModal } from '@/components/competitions/EnrollConfirmationModal';
import { EnrollmentStatusBadge, type EnrollmentStatus } from '@/components/competitions/EnrollmentStatusBadge';
import { SlotsProgress } from '@/components/competitions/SlotsProgress';
import { Countdown } from '@/components/competitions/Countdown';
import { CompetitionRanking } from '@/components/competitions/CompetitionRanking';
import { formatCompetitionLevel } from '@/utils/competitionLevel';
import { getCompetitionSubjectDisplay } from '@/utils/competitionSubjectName';
import { getSubjectColors } from '@/utils/competitionSubjectColors';

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  try {
    return format(new Date(value), "dd/MM 'às' HH:mm", { locale: ptBR });
  } catch {
    return value;
  }
}

const OPEN_STATUSES = ['aberta', 'enrollment_open', 'active', 'scheduled'];

function canEnroll(c: Competition): boolean {
  const s = String(c.status).toLowerCase();
  if (!OPEN_STATUSES.includes(s)) return false;
  if (c.enrollment_end && new Date(c.enrollment_end) < new Date()) return false;
  const max = c.max_participants ?? c.limit;
  if (max != null && max > 0 && (c.enrolled_count ?? 0) >= max) return false;
  return true;
}

function isInApplicationPeriod(c: Competition): boolean {
  if (!c.application) return false;
  const now = Date.now();
  const appStart = new Date(c.application).getTime();
  const appEnd = c.expiration ? new Date(c.expiration).getTime() : appStart + 24 * 60 * 60 * 1000;
  return now >= appStart && now <= appEnd;
}

function isEnrollmentPeriod(c: Competition): boolean {
  const now = Date.now();
  if (c.enrollment_start && new Date(c.enrollment_start).getTime() > now) return false;
  if (c.enrollment_end && new Date(c.enrollment_end).getTime() < now) return false;
  return true;
}

function isCompetitionEnded(c: Competition): boolean {
  const s = String(c.status).toLowerCase();
  if (s === 'completed' || s === 'cancelled' || s === 'cancelada') return true;
  if (c.expiration && new Date(c.expiration).getTime() < Date.now()) return true;
  return false;
}

function canUnenroll(c: Competition): boolean {
  if (!c.is_enrolled) return false;
  if (c.application && new Date(c.application).getTime() <= Date.now()) return false;
  return true;
}

/** Competição finalizada (encerrada pelo admin); resultados/ranking só após isso. */
function isCompetitionFinalized(c: Competition): boolean {
  const s = String(c.status ?? '').toLowerCase();
  return s === 'completed' || s === 'encerrada' || c.is_finished === true;
}

export default function CompetitionStudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unenrolling, setUnenrolling] = useState(false);
  const [startingProva, setStartingProva] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.get<{ id: string; name: string }[]>('/subjects').then((res) => {
      if (!cancelled && Array.isArray(res.data)) setSubjects(res.data);
    }).catch(() => { if (!cancelled) setSubjects([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getCompetitionDetails(id)
      .then(setCompetition)
      .catch((err) => {
        setError(err?.response?.data?.message || err?.message || 'Erro ao carregar.');
        setCompetition(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Enriquecer dados da tentativa com /competitions/:id/my-session quando o aluno estiver inscrito.
  useEffect(() => {
    if (!id || !competition?.is_enrolled) return;
    let cancelled = false;
    getMyCompetitionSession(id)
      .then((session) => {
        if (cancelled || !session) return;
        setCompetition((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            test_id: session.test_id ?? prev.test_id,
            attempt_status: (session.status as Competition['attempt_status']) ?? prev.attempt_status,
            attempt_started_at: (session.started_at as string | undefined) ?? prev.attempt_started_at,
            attempt_completed_at: (session.submitted_at as string | undefined) ?? prev.attempt_completed_at,
          };
        });
      })
      .catch(() => {
        // silencioso: se /my-session falhar, seguimos com os dados de /details
      });
    return () => {
      cancelled = true;
    };
  }, [id, competition?.is_enrolled]);

  const isEnrolled = competition?.is_enrolled === true;
  const inApplication = competition ? isInApplicationPeriod(competition) : false;
  const inEnrollment = competition ? isEnrollmentPeriod(competition) : false;
  const ended = competition ? isCompetitionEnded(competition) : false;

  const now = Date.now();
  const maxParticipants = competition?.max_participants ?? competition?.limit;
  const hasLimit = maxParticipants != null && maxParticipants > 0;
  const enrolledCount = competition?.enrolled_count ?? 0;
  const isFull = hasLimit && enrolledCount >= (maxParticipants ?? 0);

  let enrollmentStatus: EnrollmentStatus = 'not_enrolled';
  if (ended) {
    enrollmentStatus = 'finished';
  } else if (isEnrolled) {
    enrollmentStatus = 'enrolled';
  } else if (hasLimit && isFull) {
    enrollmentStatus = 'full';
  } else if (competition?.enrollment_end && new Date(competition.enrollment_end).getTime() < now) {
    enrollmentStatus = 'enrollment_closed';
  }

  const enrollmentNotStarted =
    competition?.enrollment_start &&
    new Date(competition.enrollment_start).getTime() > now;
  const enrollmentEnded =
    competition?.enrollment_end &&
    new Date(competition.enrollment_end).getTime() < now;

  const handleEnrollSuccess = () => {
    setCompetition((prev) => (prev ? { ...prev, is_enrolled: true } : null));
    toast({ title: 'Inscrição realizada!', description: 'Boa sorte!' });
  };

  const handleUnenroll = async () => {
    if (!id || !competition) return;
    setUnenrolling(true);
    try {
      await unenrollCompetition(id);
      setCompetition((prev) => (prev ? { ...prev, is_enrolled: false } : null));
      toast({ title: 'Inscrição cancelada.', description: 'Sua inscrição foi removida.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Não foi possível cancelar a inscrição.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setUnenrolling(false);
    }
  };

  /** Status da prova do aluno: não iniciada, em andamento ou finalizada. Considera concluída se attempt_completed_at existir ou attempt_status for completed/finalizada/concluída. */
  const rawAttemptStatus = (competition?.attempt_status ?? 'not_started') as string;
  const hasCompletedAt = Boolean(competition?.attempt_completed_at);
  const isCompletedStatus = ['completed', 'finalizada', 'finalizado', 'concluída', 'concluido'].includes(rawAttemptStatus.toLowerCase());
  const attemptStatus = hasCompletedAt || isCompletedStatus ? 'completed' : (rawAttemptStatus === 'in_progress' ? 'in_progress' : 'not_started');
  const testId = competition?.test_id;
  const attemptStartedAt = competition?.attempt_started_at;

  /** Tempo decorrido desde o início da prova (para "Continuar prova"). */
  const elapsedTimeText = (() => {
    if (!attemptStartedAt) return null;
    try {
      const start = new Date(attemptStartedAt).getTime();
      const now = Date.now();
      const diffMs = now - start;
      const minutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(minutes / 60);
      if (hours > 0) return `${hours}h ${minutes % 60}min`;
      return `${minutes} min`;
    } catch {
      return null;
    }
  })();

  const participationCoins = Number(
    competition?.reward_config?.participation_coins ?? competition?.reward_participation ?? 50
  );
  const rankingVisibility = (competition?.ranking_visibility ?? '').toLowerCase();
  const showRankingRealtime = rankingVisibility === 'realtime' && (inApplication || ended);

  const handleIniciarProva = async () => {
    if (!id || !competition) return;
    setStartingProva(true);
    try {
      const res = await startCompetition(id);
      const tid = res.test_id;
      if (!tid) {
        toast({ title: 'Erro', description: 'Não foi possível obter a prova.', variant: 'destructive' });
        return;
      }
      setCompetition((prev) => prev ? { ...prev, attempt_status: 'in_progress', attempt_started_at: new Date().toISOString(), test_id: tid } : null);
      navigate(`/aluno/avaliacao/${tid}/fazer`, {
        state: {
          fromCompetition: true,
          competitionId: id,
          competitionName: competition.name,
          participationCoins: Number.isNaN(participationCoins) ? 50 : participationCoins,
          rankingVisibility,
          showRankingButton: showRankingRealtime,
        },
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Não foi possível iniciar a prova.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setStartingProva(false);
    }
  };

  const handleContinuarProva = () => {
    if (!testId || !id || !competition) return;
    navigate(`/aluno/avaliacao/${testId}/fazer`, {
      state: {
        fromCompetition: true,
        competitionId: id,
        competitionName: competition.name,
        participationCoins: Number.isNaN(participationCoins) ? 50 : participationCoins,
        rankingVisibility,
        showRankingButton: showRankingRealtime,
      },
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="container mx-auto py-12 min-h-screen">
        <Button variant="ghost" onClick={() => navigate('/aluno/competitions')} className="mb-4 rounded-full border-violet-300 dark:border-violet-500/50 hover:bg-violet-500/15">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Card className="rounded-2xl border-2 border-violet-200/50 dark:border-violet-500/30 overflow-hidden">
          <CardContent className="py-12 text-center text-destructive">
            {error || 'Competição não encontrada.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedQuestionIds =
    competition.selected_question_ids ?? competition.question_ids ?? [];
  const totalQuestions = selectedQuestionIds.length;

  const competitionFinalized = competition ? isCompetitionFinalized(competition) : false;
  const showRankingFinal = rankingVisibility === 'final' && ended && competitionFinalized;

  /** Badge de status da prova (padrão StudentEvaluations/OlimpiadasStudent). */
  const getProofStatusBadge = () => {
    if (!isEnrolled) return null;
    if (attemptStatus === 'completed') {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
          <CheckCircle className="h-3 w-3" />
          Concluída
        </Badge>
      );
    }
    if (ended) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Expirada
        </Badge>
      );
    }
    if (!inApplication && competition.application) {
      return (
        <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-700">
          <Calendar className="h-3 w-3" />
          Agendada
        </Badge>
      );
    }
    if (attemptStatus === 'in_progress') {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Timer className="h-3 w-3" />
          Em andamento
        </Badge>
      );
    }
    if (inApplication) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Disponível
        </Badge>
      );
    }
    return null;
  };

  const subjectDisplayName = getCompetitionSubjectDisplay(competition, subjects);
  const subjectColors = getSubjectColors(competition.subject_id ?? '', subjectDisplayName);
  const hasRewards =
    competition.reward_config?.participation_coins != null ||
    competition.reward_participation != null ||
    (competition.reward_config?.ranking_rewards?.length ?? 0) > 0;

  return (
    <div className="container mx-auto space-y-6 py-6 px-4 min-h-screen">
      {/* Hero gamificado + CTA único */}
      <Card className={`overflow-hidden rounded-2xl border-2 border-l-4 ${subjectColors.border} ${subjectColors.bg} transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10 animate-fade-in-up`}>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Button variant="ghost" size="sm" onClick={() => navigate('/aluno/competitions')} className="mb-2 -ml-2 text-muted-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar às competições
              </Button>
              <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${subjectColors.badge}`}>
                  <Trophy className={`h-6 w-6 ${subjectColors.accent}`} />
                </span>
                {competition.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className={subjectColors.badge}>
                  {subjectDisplayName}
                </Badge>
                <Badge variant="outline">{formatCompetitionLevel(competition.level)}</Badge>
                <EnrollmentStatusBadge status={enrollmentStatus} />
                {getProofStatusBadge()}
              </div>
              {competition.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2 max-w-xl">
                  {competition.description}
                </p>
              )}
            </div>
            <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
              {!isEnrolled && (
                <>
                  <Button
                    size="lg"
                    className="min-w-[180px] bg-primary hover:bg-primary/90"
                    onClick={() => setEnrollModalOpen(true)}
                    disabled={!canEnroll(competition)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Inscrever-se
                  </Button>
                  {!canEnroll(competition) && !ended && (
                    <p className="text-xs text-muted-foreground text-right max-w-[200px]">
                      {enrollmentNotStarted
                        ? 'Inscrições em breve.'
                        : isFull
                          ? 'Vagas esgotadas.'
                          : enrollmentEnded
                            ? 'Inscrições encerradas.'
                            : 'Indisponível.'}
                    </p>
                  )}
                </>
              )}
              {isEnrolled && (
                <div className="flex flex-col gap-2">
                  {attemptStatus === 'completed' && competitionFinalized && (
                    <Button size="lg" onClick={() => navigate('/aluno/resultados?tab=competicao')} className="bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Ver resultado
                    </Button>
                  )}
                  {attemptStatus === 'in_progress' && testId && (inApplication || ended) && (
                    <Button
                      size="lg"
                      onClick={ended ? (competitionFinalized ? () => navigate('/aluno/resultados?tab=competicao') : undefined) : handleContinuarProva}
                      disabled={ended && !competitionFinalized}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {ended ? (competitionFinalized ? 'Ver resultado' : 'Resultado após finalização da competição') : `Continuar prova${elapsedTimeText ? ` (${elapsedTimeText})` : ''}`}
                    </Button>
                  )}
                  {inApplication && attemptStatus !== 'completed' && attemptStatus !== 'in_progress' && (
                    <Button size="lg" onClick={handleIniciarProva} disabled={startingProva}>
                      {startingProva ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Award className="mr-2 h-4 w-4" />}
                      {' '}Iniciar prova
                    </Button>
                  )}
                  {!inApplication && !ended && attemptStatus !== 'completed' && attemptStatus !== 'in_progress' && (
                    <Button size="lg" disabled>
                      <Calendar className="mr-2 h-4 w-4" />
                      Prova ainda não começou
                    </Button>
                  )}
                  {ended && attemptStatus !== 'completed' && attemptStatus !== 'in_progress' && (
                    <Button size="lg" disabled className="opacity-70">
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Prova finalizada
                    </Button>
                  )}
                  {canUnenroll(competition) && (
                    <Button variant="ghost" size="sm" onClick={handleUnenroll} disabled={unenrolling} className="text-muted-foreground">
                      {unenrolling ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                      Cancelar inscrição
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Countdown em destaque */}
          <div className="mt-4 flex flex-wrap gap-4">
            {!isEnrolled && inEnrollment && competition.enrollment_end && !ended && (
              <Countdown targetDate={competition.enrollment_end} label="Inscrição fecha" />
            )}
            {isEnrolled && !inApplication && competition.application && !ended && (
              <Countdown targetDate={competition.application} label="Prova começa" />
            )}
            {isEnrolled && inApplication && competition.expiration && !ended && (
              <Countdown targetDate={competition.expiration} label="Prova termina" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumo: datas, questões, recompensas, vagas — tudo em um card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Calendar className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Inscrições</p>
                <p className="text-sm font-medium">
                  {competition.enrollment_start
                    ? format(new Date(competition.enrollment_start), 'dd/MM', { locale: ptBR })
                    : '—'}
                  {' → '}
                  {competition.enrollment_end
                    ? format(new Date(competition.enrollment_end), 'dd/MM', { locale: ptBR })
                    : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Clock className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Prova</p>
                <p className="text-sm font-medium">
                  {competition.application
                    ? format(new Date(competition.application), "dd/MM 'às' HH:mm", { locale: ptBR })
                    : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <BookOpen className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Questões</p>
                <p className="text-sm font-medium">
                  {totalQuestions} {totalQuestions === 1 ? 'questão' : 'questões'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Coins className="h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Recompensas</p>
                {hasRewards ? (
                  <p className="text-sm font-medium">
                    {participationCoins} moedas por participar
                    {(competition.reward_config?.ranking_rewards?.length ?? 0) > 0 && (
                      <> · Pódio com mais moedas</>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem recompensas em moedas</p>
                )}
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Users className="h-4 w-4" /> Vagas
            </p>
            <SlotsProgress enrolledCount={enrolledCount} maxParticipants={maxParticipants} />
          </div>
          {(competition.reward_config?.ranking_rewards?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {competition.reward_config!.ranking_rewards!.slice(0, 5).map((r) => (
                <Badge key={r.position} variant="secondary" className="gap-1">
                  <Medal className="h-3.5 w-3.5 text-amber-500" />
                  {r.position}º: {r.coins} moedas
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ranking — só quando disponível */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5" /> Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(showRankingRealtime || showRankingFinal) ? (
            <>
              <CompetitionRanking
                competitionId={id!}
                competitionName={competition.name}
                rankingVisibility={rankingVisibility}
                rewardConfig={competition.reward_config ?? undefined}
                isRealtime={showRankingRealtime}
                inline
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => navigate(`/aluno/competitions/${id}/ranking`)}
              >
                <Trophy className="mr-2 h-4 w-4" />
                Ver ranking completo
              </Button>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                O ranking será divulgado após o término da competição.
              </p>
              {competition.expiration && !ended && (
                <Countdown targetDate={competition.expiration} label="Competição termina" />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <EnrollConfirmationModal
        open={enrollModalOpen}
        onOpenChange={setEnrollModalOpen}
        competition={competition}
        onConfirm={handleEnrollSuccess}
      />
    </div>
  );
}
