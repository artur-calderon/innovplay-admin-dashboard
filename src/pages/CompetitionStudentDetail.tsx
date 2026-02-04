/**
 * Detalhes da competição para o estudante (ver + inscrever-se).
 * Rota: /aluno/competitions/:id
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { getCompetitionDetails, unenrollCompetition } from '@/services/competitionsApi';
import type { Competition } from '@/types/competition-types';
import { EnrollConfirmationModal } from '@/components/competitions/EnrollConfirmationModal';

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
  if (c.application && new Date(c.application).getTime() < Date.now()) return true;
  return false;
}

function canUnenroll(c: Competition): boolean {
  if (!c.is_enrolled) return false;
  if (c.application && new Date(c.application).getTime() <= Date.now()) return false;
  return true;
}

export default function CompetitionStudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unenrolling, setUnenrolling] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);

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

  const isEnrolled = competition?.is_enrolled === true;
  const showEnrollButton = canEnroll(competition!) && !isEnrolled && competition;
  const inApplication = competition ? isInApplicationPeriod(competition) : false;
  const inEnrollment = competition ? isEnrollmentPeriod(competition) : false;
  const ended = competition ? isCompetitionEnded(competition) : false;

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

  const handleFazerProva = () => {
    if (!id) return;
    navigate(`/aluno/competitions/${id}/fazer`);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="container mx-auto py-12">
        <Button variant="ghost" onClick={() => navigate('/aluno/competitions')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            {error || 'Competição não encontrada.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  const maxParticipants = competition.max_participants ?? competition.limit;
  const hasLimit = maxParticipants != null && maxParticipants > 0;
  const enrolledCount = competition.enrolled_count ?? 0;
  const progressPercent = hasLimit ? Math.min(100, (enrolledCount / maxParticipants!) * 100) : 0;

  const rankingVisibility = (competition.ranking_visibility ?? '').toLowerCase();
  const showRankingRealtime = rankingVisibility === 'realtime' && inApplication;
  const showRankingFinal = rankingVisibility === 'final' && ended;

  return (
    <div className="container mx-auto space-y-6 py-6 px-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate('/aluno/competitions')} className="mb-2 -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar às competições
          </Button>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight">
            <Trophy className="h-7 w-7 text-primary" />
            {competition.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {competition.subject_name ?? competition.subject_id} · Nível {competition.level}
            </Badge>
            {isEnrolled ? (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                <CheckCircle className="mr-1 h-3 w-3" /> Inscrito
              </Badge>
            ) : (
              <Badge variant="outline">Não inscrito</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showEnrollButton && (
            <Button onClick={() => setEnrollModalOpen(true)} size="lg">
              <UserPlus className="mr-2 h-4 w-4" />
              Inscrever-se
            </Button>
          )}
          {isEnrolled && canUnenroll(competition) && (
            <Button variant="outline" size="sm" onClick={handleUnenroll} disabled={unenrolling}>
              {unenrolling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cancelar inscrição
            </Button>
          )}
          {isEnrolled && inApplication && (
            <Button size="lg" onClick={handleFazerProva}>
              <Award className="mr-2 h-4 w-4" />
              Fazer prova
            </Button>
          )}
        </div>
      </div>

      {/* Sobre a competição */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sobre a competição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {competition.description && (
            <p className="text-sm text-muted-foreground">{competition.description}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{competition.subject_name ?? competition.subject_id}</Badge>
            <Badge variant="secondary">Nível {competition.level}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4 shrink-0" />
            <span>
              {competition.question_ids?.length ?? 0} questão(ões)
              {competition.question_mode && ` · Modo: ${competition.question_mode}`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Cronograma */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Cronograma
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div
              className={`rounded-lg border p-4 ${inEnrollment && !inApplication ? 'border-primary bg-primary/5' : ''}`}
            >
              <p className="text-xs font-medium text-muted-foreground">Inscrição</p>
              <p className="text-sm font-medium">
                {formatDate(competition.enrollment_start)} – {formatDate(competition.enrollment_end)}
              </p>
              {inEnrollment && !inApplication && (
                <Badge className="mt-2 bg-primary/20 text-primary">Em inscrição</Badge>
              )}
            </div>
            <div
              className={`rounded-lg border p-4 ${inApplication ? 'border-primary bg-primary/5' : ''}`}
            >
              <p className="text-xs font-medium text-muted-foreground">Aplicação</p>
              <p className="text-sm font-medium">{formatDate(competition.application)}</p>
              {inApplication && <Badge className="mt-2 bg-primary/20 text-primary">Em aplicação</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recompensas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Coins className="h-5 w-5" /> Recompensas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(competition.reward_config?.participation_coins != null ||
            competition.reward_participation != null) && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
              <Coins className="h-8 w-8 text-amber-500 shrink-0" />
              <p className="font-medium">
                Ganhe {String(competition.reward_config?.participation_coins ?? competition.reward_participation)} moedas só por participar!
              </p>
            </div>
          )}
          {(competition.reward_config?.ranking_rewards?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Prêmios para o top 3:</p>
              <ul className="flex flex-wrap gap-3">
                {competition.reward_config!.ranking_rewards!.slice(0, 3).map((r) => (
                  <li key={r.position} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                    <Medal className="h-5 w-5 text-amber-500" />
                    <span>{r.position}º → {r.coins} moedas</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!competition.reward_config?.participation_coins &&
            !competition.reward_participation &&
            (!competition.reward_config?.ranking_rewards?.length) && (
              <p className="text-sm text-muted-foreground">Nenhuma recompensa informada.</p>
            )}
        </CardContent>
      </Card>

      {/* Vagas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> Vagas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasLimit ? (
            <div className="space-y-2">
              <p className="text-sm">
                {enrolledCount} de {maxParticipants} vagas preenchidas
              </p>
              <Progress value={progressPercent} className="h-3" />
            </div>
          ) : (
            <p className="text-sm font-medium">Vagas ilimitadas</p>
          )}
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ranking</CardTitle>
        </CardHeader>
        <CardContent>
          {showRankingRealtime && (
            <p className="text-sm text-muted-foreground">
              Ranking ao vivo (em breve).
            </p>
          )}
          {showRankingFinal && (
            <p className="text-sm text-muted-foreground">
              Ranking final (em breve).
            </p>
          )}
          {!showRankingRealtime && !showRankingFinal && (
            <p className="text-sm text-muted-foreground">
              Ranking será divulgado após o término.
            </p>
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
