/**
 * Detalhes da competição (admin, coordenador, diretor, tec admin).
 * Rota: /app/competitions/:id
 * Layout gamificado: resumo visual, métricas em destaque, só informações relevantes.
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Loader2, ArrowLeft, Calendar, Clock, Trophy, BookOpen, Coins, Users, Award, Pencil, Send, Trash2, XCircle, UserCheck, Flag, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  getCompetition,
  publishCompetition,
  cancelCompetition,
  deleteCompetition,
  getEligibleStudentsForCompetition,
  getEnrolledStudentsForCompetition,
  getCompetitionRanking,
  finalizeCompetition,
  type EligibleStudent,
  type EnrolledStudent,
  type CompetitionRankingEntry,
} from '@/services/competitionsApi';
import type { Competition, CompetitionStatus } from '@/types/competition-types';
import { EditCompetitionModal } from '@/components/competitions/EditCompetitionModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCoins, getMedalEmoji } from '@/utils/coins';
import { getSubjectColors } from '@/utils/competitionSubjectColors';
import { api } from '@/lib/api';

const FINALIZADA_STYLE = 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200';

function getStatusConfig(status: CompetitionStatus, competition?: { expiration?: string; application?: string } | null) {
  const s = String(status).toLowerCase();
  const now = Date.now();
  // Só considerar finalizada se expiration passou E application também já passou (prova começou e terminou)
  const applicationStarted = competition?.application ? new Date(competition.application).getTime() <= now : false;
  const applicationEnded = competition?.expiration ? new Date(competition.expiration).getTime() < now : false;
  const isActuallyFinished = applicationStarted && applicationEnded;
  if (s === 'completed' || s === 'encerrada' || isActuallyFinished) {
    return { label: 'Finalizada', className: FINALIZADA_STYLE };
  }
  if (s === 'draft' || s === 'rascunho') return { label: 'Rascunho', className: 'bg-muted text-muted-foreground' };
  if (s === 'aberta' || s === 'enrollment_open') return { label: s === 'aberta' ? 'Aberta' : 'Inscrições abertas', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200' };
  if (s === 'scheduled') return { label: 'Agendada', className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200' };
  if (s === 'active') return { label: 'Ativa', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200' };
  if (s === 'cancelled' || s === 'cancelada') return { label: 'Cancelada', className: 'bg-destructive/10 text-destructive' };
  return { label: String(status), className: 'bg-muted text-muted-foreground' };
}

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  try {
    return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return value;
  }
}

export default function CompetitionDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questions, setQuestions] = useState<
    { id: string; title: string; text: string; difficulty?: string; value?: number }[]
  >([]);
  const [eligibleStudents, setEligibleStudents] = useState<EligibleStudent[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [eligibleError, setEligibleError] = useState<string | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [enrolledLoading, setEnrolledLoading] = useState(false);
  const [enrolledError, setEnrolledError] = useState<string | null>(null);
  const [rankingEntries, setRankingEntries] = useState<CompetitionRankingEntry[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [rankingForbidden, setRankingForbidden] = useState(false);
  const [questionsSectionOpen, setQuestionsSectionOpen] = useState(false);
  const [enrolledSectionOpen, setEnrolledSectionOpen] = useState(false);
  const [eligibleSectionOpen, setEligibleSectionOpen] = useState(false);

  const fetchCompetition = () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getCompetition(id)
      .then(setCompetition)
      .catch((err) => {
        setError(err?.response?.data?.message || err?.message || 'Erro ao carregar.');
        setCompetition(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCompetition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const loadEligibleStudents = async () => {
      if (!id) return;
      setEligibleLoading(true);
      setEligibleError(null);
      try {
        const list = await getEligibleStudentsForCompetition(id, { limit: 100, offset: 0 });
        setEligibleStudents(list);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data
            ?.message ||
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Não foi possível carregar os alunos elegíveis.';
        setEligibleError(msg);
      } finally {
        setEligibleLoading(false);
      }
    };

    loadEligibleStudents();
  }, [id]);

  useEffect(() => {
    const loadEnrolledStudents = async () => {
      if (!id) return;
      setEnrolledLoading(true);
      setEnrolledError(null);
      try {
        const list = await getEnrolledStudentsForCompetition(id, { limit: 500 });
        setEnrolledStudents(list);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message
          ?? (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          ?? 'Não foi possível carregar os alunos inscritos.';
        setEnrolledError(msg);
        setEnrolledStudents([]);
      } finally {
        setEnrolledLoading(false);
      }
    };
    loadEnrolledStudents();
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const loadQuestions = async () => {
      const ids = competition?.selected_question_ids ?? competition?.question_ids ?? [];
      if (!ids.length) {
        setQuestions([]);
        return;
      }
      setQuestionsLoading(true);
      try {
        const list = await Promise.all(
          ids.map((qid) =>
            api
              .get(`/questions/${qid}`)
              .then((res) => res.data)
              .catch(() => null)
          )
        );
        if (cancelled) return;
        const mapped =
          list
            .filter(Boolean)
            .map((q: {
              id: unknown;
              title?: unknown;
              text?: unknown;
              formatted_text?: unknown;
              difficulty_level?: unknown;
              difficulty?: unknown;
              value?: unknown;
            }) => ({
              id: String(q.id),
              title: String(q.title ?? ''),
              text: String(q.text ?? q.formatted_text ?? ''),
              difficulty: (q.difficulty_level ?? q.difficulty) as string | undefined,
              value: typeof q.value === 'number' ? q.value : undefined,
            })) ?? [];
        setQuestions(mapped);
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    };

    loadQuestions();
    return () => {
      cancelled = true;
    };
  }, [competition]);

  useEffect(() => {
    if (!id || !competition) return;
    const statusLower = String(competition.status).toLowerCase();
    const encerrada = statusLower === 'completed' || statusLower === 'encerrada';
    if (!encerrada) {
      setRankingEntries([]);
      setRankingForbidden(false);
      setRankingError(null);
      return;
    }
    let cancelled = false;
    setRankingLoading(true);
    setRankingError(null);
    setRankingForbidden(false);
    getCompetitionRanking(id, { limit: 100 })
      .then((res) => {
        if (!cancelled) {
          const sorted = [...(res.entries ?? [])].sort((a, b) => a.position - b.position);
          setRankingEntries(sorted);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          setRankingForbidden(true);
          setRankingEntries([]);
        } else {
          setRankingError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Não foi possível carregar o ranking.');
        }
      })
      .finally(() => {
        if (!cancelled) setRankingLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when id or status changes
  }, [id, competition?.id, competition?.status]);

  const statusConfig = competition ? getStatusConfig(competition.status, competition) : null;
  const s = competition ? String(competition.status).toLowerCase() : '';
  const now = Date.now();
  const applicationStarted = competition?.application ? new Date(competition.application).getTime() <= now : false;
  const applicationEnded = competition?.expiration ? new Date(competition.expiration).getTime() < now : false;
  const isActuallyFinished = applicationStarted && applicationEnded;
  const isDraft = competition && (s === 'rascunho' || s === 'draft');
  const isCancelled = competition && (s === 'cancelada' || s === 'cancelled');
  const isAberta = competition && (s === 'aberta' || s === 'enrollment_open' || s === 'active');
  const isCompleted = competition && (s === 'completed' || s === 'encerrada' || isActuallyFinished);
  const isEncerrada = competition && (s === 'completed' || s === 'encerrada');
  const isOpenOrActive = competition && (s === 'aberta' || s === 'enrollment_open' || s === 'active' || s === 'em_andamento');
  /** Botão "Finalizar competição": data de expiração já passou e competição ainda aberta/em andamento. */
  const canFinalize = isOpenOrActive && isActuallyFinished;
  /** Só pode excluir direto em rascunho ou já cancelada; aberta/finalizada precisa cancelar antes. */
  const canDeleteDirectly = isDraft || isCancelled;
  /** Cancelar competição desabilitado na UI (não exibir no card). */
  const canCancel = false;
  const canEdit = isDraft || isAberta;

  const handleFinalize = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await finalizeCompetition(id);
      toast({ title: 'Competição finalizada. Ranking gerado e recompensas pagas.' });
      fetchCompetition();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao finalizar.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await publishCompetition(id);
      toast({ title: 'Competição publicada.' });
      fetchCompetition();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao publicar.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await cancelCompetition(id, cancelReason.trim() ? { reason: cancelReason } : undefined);
      toast({ title: 'Competição cancelada.' });
      setCancelOpen(false);
      setCancelReason('');
      fetchCompetition();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao cancelar.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await deleteCompetition(id);
      toast({ title: 'Competição excluída.' });
      setDeleteOpen(false);
      navigate('/app/competitions');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message
        || (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Erro ao excluir.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setActionLoading(false);
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
        <Button variant="ghost" onClick={() => navigate('/app/competitions')} className="mb-4">
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

  const subjectColors = getSubjectColors(competition.subject_id ?? '', competition.subject_name);
  const questionCount = competition.selected_question_ids?.length ?? competition.question_ids?.length ?? 0;
  const enrolledCount = competition.enrolled_count ?? enrolledStudents.length;
  const maxParticipants = competition.max_participants ?? competition.limit;
  const hasLimit = maxParticipants != null && maxParticipants > 0;
  const slotsPercent = hasLimit && maxParticipants! > 0
    ? Math.min(100, (enrolledCount / maxParticipants!) * 100)
    : 0;
  const top3 = rankingEntries.filter((e) => e.position >= 1 && e.position <= 3);
  const SHOW_INSCRIBED = 6;
  const enrolledToShow = enrolledStudents.slice(0, SHOW_INSCRIBED);
  const hasMoreEnrolled = enrolledStudents.length > SHOW_INSCRIBED;

  return (
    <div className="container mx-auto space-y-6 py-6 px-4">
      {/* Hero gamificado */}
      <Card className={`overflow-hidden border-l-4 ${subjectColors.border} ${subjectColors.bg}`}>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Button variant="ghost" size="sm" onClick={() => navigate('/app/competitions')} className="mb-2 -ml-2 text-muted-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar à lista
              </Button>
              <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${subjectColors.badge}`}>
                  <Trophy className={`h-6 w-6 ${subjectColors.accent}`} />
                </span>
                {competition.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {statusConfig && <Badge className={statusConfig.className}>{statusConfig.label}</Badge>}
                <Badge variant="secondary" className={subjectColors.badge}>
                  {competition.subject_name ?? competition.subject_id}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Nível {competition.level}
                  {competition.scope ? ` · ${competition.scope}` : ''}
                </span>
              </div>
              {competition.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2 max-w-2xl">
                  {competition.description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </Button>
              )}
              {isDraft && (
                <Button size="sm" onClick={handlePublish} disabled={actionLoading}>
                  <Send className="mr-2 h-4 w-4" /> Publicar
                </Button>
              )}
              {canFinalize && (
                <Button size="sm" onClick={handleFinalize} disabled={actionLoading}>
                  <Flag className="mr-2 h-4 w-4" /> Finalizar
                </Button>
              )}
              {isCompleted && (
                <Button variant="outline" size="sm" onClick={() => navigate(`/app/competitions/${id}/analytics`)}>
                  <BarChart3 className="mr-2 h-4 w-4" /> Analytics
                </Button>
              )}
              {canCancel && (
                <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)} disabled={actionLoading}>
                  <XCircle className="mr-2 h-4 w-4" /> Cancelar
                </Button>
              )}
              {canDeleteDirectly && (
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} disabled={actionLoading}>
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </Button>
              )}
            </div>
          </div>

          {/* Métricas em linha */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-background/60 p-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Inscrições
              </p>
              <p className="text-sm font-semibold truncate" title={`${formatDate(competition.enrollment_start)} → ${formatDate(competition.enrollment_end)}`}>
                até {competition.enrollment_end ? format(new Date(competition.enrollment_end), 'dd/MM', { locale: ptBR }) : '—'}
              </p>
            </div>
            <div className="rounded-lg border bg-background/60 p-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Prova
              </p>
              <p className="text-sm font-semibold">
                {competition.application ? format(new Date(competition.application), 'dd/MM HH:mm', { locale: ptBR }) : '—'}
              </p>
            </div>
            <div className="rounded-lg border bg-background/60 p-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" /> Questões
              </p>
              <p className="text-sm font-semibold">{questionCount}</p>
            </div>
            <div className="rounded-lg border bg-background/60 p-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5" /> Inscritos
              </p>
              <p className="text-sm font-semibold">
                {enrolledCount}
                {hasLimit ? ` / ${maxParticipants}` : ''}
              </p>
              {hasLimit && (
                <Progress value={slotsPercent} className="h-1.5 mt-1" />
              )}
            </div>
          </div>

          {/* Recompensas resumidas */}
          {(competition.reward_config?.participation_coins != null ||
            (competition.reward_config?.ranking_rewards?.length ?? 0) > 0 ||
            competition.reward_participation != null) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <Coins className="h-4 w-4 text-amber-500" />
              <span>
                Participação: {String(competition.reward_config?.participation_coins ?? competition.reward_participation ?? '—')} moedas
                {(competition.reward_config?.ranking_rewards?.length ?? 0) > 0 && (
                  <> · Pódio: {competition.reward_config!.ranking_rewards!.slice(0, 3).map((r) => `${r.position}º ${formatCoins(r.coins)}`).join(', ')}</>
                )}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questões (collapsible) */}
      <Collapsible open={questionsSectionOpen} onOpenChange={setQuestionsSectionOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" /> Questões
                  <Badge variant="secondary">{questionCount}</Badge>
                </CardTitle>
                {questionsSectionOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {questionsLoading ? (
                <p className="text-sm text-muted-foreground py-4">Carregando...</p>
              ) : !questionCount ? (
                <p className="text-sm text-muted-foreground py-4">Nenhuma questão selecionada.</p>
              ) : questions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Não foi possível carregar as questões.</p>
              ) : (
                <div className="space-y-2">
                  {questions.map((q, index) => (
                    <div key={q.id} className="rounded-lg border bg-muted/20 p-3 text-sm flex justify-between items-center gap-2">
                      <span className="font-medium">Questão {index + 1}{q.title ? ` · ${q.title}` : ''}</span>
                      <span className="text-xs text-muted-foreground">
                        {q.difficulty ?? '—'} {typeof q.value === 'number' ? `· ${q.value} pts` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Inscritos (collapsible, primeiros 6 visíveis) */}
      <Collapsible open={enrolledSectionOpen} onOpenChange={setEnrolledSectionOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5" /> Inscritos
                  <Badge variant="secondary">{enrolledCount}</Badge>
                </CardTitle>
                {enrolledStudents.length > 0 && (enrolledSectionOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />)}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {enrolledLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                  <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
                </div>
              ) : enrolledError ? (
                <p className="text-sm text-destructive py-4">{enrolledError}</p>
              ) : !enrolledStudents.length ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhum inscrito ainda.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(enrolledSectionOpen ? enrolledStudents : enrolledToShow).map((student) => {
                    const info = [student.class_name, student.grade_name].filter(Boolean).join(' · ');
                    return (
                      <div key={student.id} className={`flex items-center gap-3 rounded-lg border p-3 border-l-4 ${subjectColors.border}`}>
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold ${subjectColors.badge}`}>
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{student.name}</p>
                          {info && <p className="text-xs text-muted-foreground truncate">{info}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {!enrolledSectionOpen && hasMoreEnrolled && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Clique em &quot;Inscritos&quot; para ver todos ({enrolledStudents.length}).
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Elegíveis (collapsible) */}
      <Collapsible open={eligibleSectionOpen} onOpenChange={setEligibleSectionOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" /> Podem se inscrever
                  <Badge variant="outline">{eligibleLoading ? '...' : eligibleStudents.length}</Badge>
                </CardTitle>
                {eligibleSectionOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {eligibleLoading ? (
                <p className="text-sm text-muted-foreground py-4">Carregando...</p>
              ) : eligibleError ? (
                <p className="text-sm text-destructive py-4">{eligibleError}</p>
              ) : !eligibleStudents.length ? (
                <p className="text-sm text-muted-foreground py-4">Nenhum aluno elegível no momento.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {eligibleStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      <span className="font-medium">{student.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[student.grade_name, student.class_name].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Ranking (quando encerrada) — pódio + tabela */}
      {isEncerrada && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5" /> Ranking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {rankingForbidden ? (
              <p className="text-sm text-muted-foreground py-4">Ranking disponível após encerramento.</p>
            ) : rankingLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
                <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
              </div>
            ) : rankingError ? (
              <p className="text-sm text-destructive py-4">{rankingError}</p>
            ) : !rankingEntries.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhum participante no ranking.</p>
            ) : (
              <>
                {top3.length >= 2 && (
                  <div className="flex items-end justify-center gap-2 sm:gap-4">
                    {top3.find((e) => e.position === 2) && (
                      <div className="flex flex-col items-center gap-1 order-1">
                        <span className="text-2xl">{getMedalEmoji(2)}</span>
                        <p className="text-sm font-semibold truncate max-w-[100px] text-center">
                          {top3.find((e) => e.position === 2)?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">2º</p>
                      </div>
                    )}
                    {top3.find((e) => e.position === 1) && (
                      <div className="flex flex-col items-center gap-1 order-0">
                        <span className="text-3xl">{getMedalEmoji(1)}</span>
                        <p className="text-sm font-semibold truncate max-w-[100px] text-center">
                          {top3.find((e) => e.position === 1)?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">1º</p>
                      </div>
                    )}
                    {top3.find((e) => e.position === 3) && (
                      <div className="flex flex-col items-center gap-1 order-2">
                        <span className="text-2xl">{getMedalEmoji(3)}</span>
                        <p className="text-sm font-semibold truncate max-w-[100px] text-center">
                          {top3.find((e) => e.position === 3)?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">3º</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead className="hidden sm:table-cell">Turma</TableHead>
                        <TableHead className="text-right">Nota</TableHead>
                        <TableHead className="text-right w-20">Moedas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rankingEntries.map((entry) => (
                        <TableRow key={`${entry.student_id}-${entry.position}`}>
                          <TableCell className="font-medium">
                            {getMedalEmoji(entry.position) || `${entry.position}º`}
                          </TableCell>
                          <TableCell>{entry.name}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {entry.class_name ?? '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.value_label ?? entry.score_percentage ?? entry.value}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.coins_earned != null && entry.coins_earned > 0
                              ? `+${formatCoins(entry.coins_earned)}`
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <EditCompetitionModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => { fetchCompetition(); setEditOpen(false); }}
        competitionId={id!}
        competition={competition}
      />

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar competição</AlertDialogTitle>
            <AlertDialogDescription>Confirme o cancelamento. Opcionalmente informe o motivo.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label className="text-sm">Motivo (opcional)</Label>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} className="mt-1 resize-none" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Voltar</AlertDialogCancel>
            <AlertDialogAction disabled={actionLoading} className="bg-destructive text-destructive-foreground" onClick={handleCancel}>Cancelar competição</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir competição</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A competição e os dados relacionados (inscrições, resultados, recompensas) serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Voltar</AlertDialogCancel>
            <AlertDialogAction disabled={actionLoading} className="bg-destructive text-destructive-foreground" onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
