/**
 * Detalhes da competição para o estudante (ver + inscrever-se).
 * Rota: /aluno/competitions/:id
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
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { getCompetitionDetails, enrollCompetition, unenrollCompetition } from '@/services/competitionsApi';
import type { Competition } from '@/types/competition-types';

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  try {
    return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
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

export default function CompetitionStudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);

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

  const handleEnroll = async () => {
    if (!id || !competition) return;
    setEnrolling(true);
    try {
      await enrollCompetition(id);
      setCompetition((prev) => (prev ? { ...prev, is_enrolled: true } : null));
      toast({ title: 'Inscrição realizada!', description: 'Você está inscrito nesta competição.' });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Não foi possível realizar a inscrição.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    if (!id || !competition) return;
    setUnenrolling(true);
    try {
      await unenrollCompetition(id);
      setCompetition((prev) => (prev ? { ...prev, is_enrolled: false } : null));
      toast({ title: 'Inscrição cancelada.', description: 'Sua inscrição foi removida.' });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Não foi possível cancelar a inscrição.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setUnenrolling(false);
    }
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

  const showEnrollButton = canEnroll(competition) && !isEnrolled;

  return (
    <div className="container mx-auto space-y-6 py-6 px-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate('/aluno/competitions')}
            className="mb-2 -ml-2"
          >
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
          </div>
        </div>
        {showEnrollButton && (
          <Button onClick={handleEnroll} disabled={enrolling} size="lg">
            {enrolling ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Inscrever-se
          </Button>
        )}
        {isEnrolled && (
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              <CheckCircle className="mr-1 h-3 w-3" />
              Inscrito
            </Badge>
            {canEnroll(competition) && (
              <Button variant="outline" size="sm" onClick={handleUnenroll} disabled={unenrolling}>
                {unenrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Cancelar inscrição
              </Button>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {competition.description && (
            <p className="text-sm text-muted-foreground">{competition.description}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2 rounded-lg border p-3">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Período de inscrição</p>
                <p className="text-sm">
                  {formatDate(competition.enrollment_start)} até {formatDate(competition.enrollment_end)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border p-3">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Data de aplicação</p>
                <p className="text-sm">{formatDate(competition.application)}</p>
              </div>
            </div>
          </div>
          {(competition.question_mode || competition.question_ids?.length) !== undefined && (
            <div className="flex items-start gap-2 rounded-lg border p-3">
              <BookOpen className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Questões</p>
                <p className="text-sm">
                  Modo: {competition.question_mode ?? '—'} · {competition.question_ids?.length ?? 0} questão(ões)
                </p>
              </div>
            </div>
          )}
          {(competition.reward_config?.participation_coins != null ||
            (competition.reward_config?.ranking_rewards?.length ?? 0) > 0 ||
            competition.reward_participation != null ||
            competition.reward_ranking != null) && (
            <div className="flex items-start gap-2 rounded-lg border p-3">
              <Coins className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Recompensas</p>
                <p className="text-sm">
                  Participação: {String(competition.reward_config?.participation_coins ?? competition.reward_participation ?? '—')} moedas
                  {((competition.reward_config?.ranking_rewards?.length ?? 0) > 0 || competition.reward_ranking != null) && (
                    <> · Ranking: {competition.reward_config?.ranking_rewards?.length ? competition.reward_config.ranking_rewards.map((r) => `${r.position}º: ${r.coins}`).join(', ') : String(competition.reward_ranking ?? '—')} moedas</>
                  )}
                </p>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Vagas: {competition.enrolled_count ?? 0} / {competition.max_participants ?? competition.limit ?? '∞'}
            {competition.available_slots != null && ` (${competition.available_slots} disponíveis)`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
