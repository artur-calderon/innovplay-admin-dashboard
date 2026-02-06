/**
 * Lista de competições para o estudante.
 * Design gamificado: cores por disciplina, seções separadas (Suas competições × Inscreva-se).
 * Rota: /aluno/competitions
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Trophy, Calendar, Clock, Loader2, Eye, UserPlus, Coins, XCircle, Award, CheckCircle, AlertCircle, Timer, Sparkles, Swords, UserCheck, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAvailableCompetitions, unenrollCompetition, startCompetition } from '@/services/competitionsApi';
import type { Competition } from '@/types/competition-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/lib/api';
import { EnrollConfirmationModal } from '@/components/competitions/EnrollConfirmationModal';
import { formatCompetitionLevel } from '@/utils/competitionLevel';
import { getSubjectColors } from '@/utils/competitionSubjectColors';
import { CompetitionCountdown } from '@/components/competitions/CompetitionCountdown';

const OPEN_STATUSES = ['aberta', 'enrollment_open', 'active', 'scheduled'];

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  try {
    return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return value;
  }
}

function isOpenStatus(c: Competition): boolean {
  const s = String(c.status).toLowerCase();
  return OPEN_STATUSES.some((open) => s === open);
}

function isInEnrollmentPeriod(c: Competition): boolean {
  const now = Date.now();
  if (c.enrollment_start && new Date(c.enrollment_start).getTime() > now) return false;
  if (c.enrollment_end && new Date(c.enrollment_end).getTime() < now) return false;
  return true;
}

function hasSlots(c: Competition): boolean {
  const max = c.max_participants ?? c.limit;
  if (max == null || max <= 0) return true;
  const enrolled = c.enrolled_count ?? 0;
  return enrolled < max;
}

function canEnrollNow(c: Competition): boolean {
  return isOpenStatus(c) && isInEnrollmentPeriod(c) && hasSlots(c) && !c.is_enrolled;
}

function isUpcoming(c: Competition): boolean {
  if (c.is_enrolled) return false;
  if (c.enrollment_start && new Date(c.enrollment_start).getTime() > Date.now()) return true;
  return false;
}

function isEnrolled(c: Competition): boolean {
  return c.is_enrolled === true;
}

function isEnded(c: Competition): boolean {
  const s = String(c.status).toLowerCase();
  if (s === 'completed' || s === 'cancelled' || s === 'cancelada') return true;
  if (c.expiration && new Date(c.expiration).getTime() < Date.now()) return true;
  if (c.application && new Date(c.application).getTime() < Date.now() && !c.expiration) return true;
  return false;
}

function canUnenroll(c: Competition): boolean {
  if (!c.is_enrolled) return false;
  const now = Date.now();
  if (c.application && new Date(c.application).getTime() <= now) return false;
  return true;
}

function formatSlots(c: Competition): string {
  const max = c.max_participants ?? c.limit;
  if (max == null || max <= 0) return 'Vagas ilimitadas';
  const enrolled = c.enrolled_count ?? 0;
  const remaining = Math.max(max - enrolled, 0);
  return `${enrolled} de ${max} (restam ${remaining})`;
}

function formatRewardsShort(c: Competition): string {
  const parts: string[] = [];
  const part = c.reward_config?.participation_coins ?? c.reward_participation;
  if (part != null && part !== '') parts.push(`${part} moedas`);
  const rank = c.reward_config?.ranking_rewards;
  if (rank?.length) parts.push('prêmios para top 3');
  return parts.length ? parts.join(' + ') : '—';
}

interface SubjectOption {
  id: string;
  name: string;
}

export default function CompetitionsStudent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | '1' | '2'>('all');
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollCompetitionSelected, setEnrollCompetitionSelected] = useState<Competition | null>(null);
  const [unenrollingId, setUnenrollingId] = useState<string | null>(null);
  const [startingCompId, setStartingCompId] = useState<string | null>(null);
  
  // Filtros avançados
  const [minCoinsFilter, setMinCoinsFilter] = useState<string>('');
  const [onlyWithSlots, setOnlyWithSlots] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'next-week' | 'next-2-weeks' | 'next-month'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchCompetitions = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAvailableCompetitions();
      setCompetitions(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Erro ao carregar competições:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as competições.',
        variant: 'destructive',
      });
      setCompetitions([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

  useEffect(() => {
    let cancelled = false;
    api.get<SubjectOption[]>('/subjects').then((res) => {
      if (!cancelled && Array.isArray(res.data)) setSubjects(res.data);
    }).catch(() => { if (!cancelled) setSubjects([]); });
    return () => { cancelled = true; };
  }, []);

  const filteredBySubject = useMemo(() => {
    let list = competitions;
    
    // Filtro por disciplina
    if (subjectFilter !== 'all') {
      list = list.filter((c) => c.subject_id === subjectFilter);
    }
    
    // Filtro por nível
    if (levelFilter !== 'all') {
      list = list.filter((c) => String(c.level) === levelFilter);
    }
    
    // Filtro por recompensas (moedas mínimas)
    if (minCoinsFilter) {
      const minCoins = Number.parseInt(minCoinsFilter, 10);
      if (!Number.isNaN(minCoins) && minCoins > 0) {
        list = list.filter((c) => {
          const participationCoins = Number(c.reward_config?.participation_coins ?? c.reward_participation ?? 0);
          const rankingRewards = c.reward_config?.ranking_rewards ?? [];
          const maxRankingCoins = rankingRewards.length > 0 
            ? Math.max(...rankingRewards.map(r => r.coins))
            : 0;
          return participationCoins >= minCoins || maxRankingCoins >= minCoins;
        });
      }
    }
    
    // Filtro por vagas disponíveis
    if (onlyWithSlots) {
      list = list.filter((c) => hasSlots(c));
    }
    
    // Filtro por data
    if (dateFilter !== 'all') {
      const now = Date.now();
      let daysAhead = 0;
      switch (dateFilter) {
        case 'next-week':
          daysAhead = 7;
          break;
        case 'next-2-weeks':
          daysAhead = 14;
          break;
        case 'next-month':
          daysAhead = 30;
          break;
      }
      const futureDate = now + (daysAhead * 24 * 60 * 60 * 1000);
      
      list = list.filter((c) => {
        // Verificar se alguma data relevante está dentro do período
        const enrollmentStart = c.enrollment_start ? new Date(c.enrollment_start).getTime() : null;
        const enrollmentEnd = c.enrollment_end ? new Date(c.enrollment_end).getTime() : null;
        const application = c.application ? new Date(c.application).getTime() : null;
        
        return (
          (enrollmentStart != null && enrollmentStart <= futureDate) ||
          (enrollmentEnd != null && enrollmentEnd <= futureDate) ||
          (application != null && application <= futureDate)
        );
      });
    }
    
    return list;
  }, [competitions, subjectFilter, levelFilter, minCoinsFilter, onlyWithSlots, dateFilter]);

  const { abertas, proximas, minhasInscricoes, encerradas } = useMemo(() => {
    const a: Competition[] = [];
    const p: Competition[] = [];
    const m: Competition[] = [];
    const e: Competition[] = [];
    for (const c of filteredBySubject) {
      if (isEnrolled(c)) m.push(c);
      else if (canEnrollNow(c)) a.push(c);
      else if (isUpcoming(c)) p.push(c);
      else if (isEnded(c)) e.push(c);
      else if (!isEnrolled(c) && !canEnrollNow(c) && !isUpcoming(c)) e.push(c);
    }
    return { abertas: a, proximas: p, minhasInscricoes: m, encerradas: e };
  }, [filteredBySubject]);

  const handleOpenEnrollModal = (comp: Competition) => {
    setEnrollCompetitionSelected(comp);
    setEnrollModalOpen(true);
  };

  const handleEnrollConfirm = () => {
    fetchCompetitions();
    setEnrollCompetitionSelected(null);
  };

  const handleUnenroll = async (comp: Competition) => {
    if (!canUnenroll(comp)) return;
    setUnenrollingId(comp.id);
    try {
      await unenrollCompetition(comp.id);
      toast({ title: 'Inscrição cancelada.', description: 'Sua inscrição foi removida.' });
      fetchCompetitions();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Não foi possível cancelar a inscrição.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setUnenrollingId(null);
    }
  };

  const slotsFull = (c: Competition) => !hasSlots(c) && !c.is_enrolled;

  /** Inicia a prova da competição e redireciona para a tela de fazer prova. */
  const handleStartProva = async (comp: Competition) => {
    setStartingCompId(comp.id);
    try {
      const res = await startCompetition(comp.id);
      const testId = res.test_id;
      if (!testId) {
        toast({ title: 'Erro', description: 'Não foi possível obter a prova.', variant: 'destructive' });
        return;
      }
      const rankingVisibility = (comp.ranking_visibility ?? '').toLowerCase();
      const now = Date.now();
      const appStart = comp.application ? new Date(comp.application).getTime() : null;
      const expiration = comp.expiration ? new Date(comp.expiration).getTime() : null;
      const inExam = appStart != null && now >= appStart && (expiration == null || now <= expiration);
      const ended = expiration != null && now > expiration;
      const showRankingRealtime = rankingVisibility === 'realtime' && (inExam || ended);
      const participationCoins = Number(comp.reward_config?.participation_coins ?? comp.reward_participation ?? 50);
      navigate(`/aluno/avaliacao/${testId}/fazer`, {
        state: {
          fromCompetition: true,
          competitionId: comp.id,
          competitionName: comp.name,
          participationCoins: Number.isNaN(participationCoins) ? 50 : participationCoins,
          rankingVisibility,
          showRankingButton: showRankingRealtime,
        },
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Não foi possível iniciar a prova.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setStartingCompId(null);
    }
  };

  /** Redireciona para continuar a prova (já tem test_id). */
  const handleContinuarProva = (comp: Competition) => {
    if (comp.test_id) {
      const rankingVisibility = (comp.ranking_visibility ?? '').toLowerCase();
      const now = Date.now();
      const appStart = comp.application ? new Date(comp.application).getTime() : null;
      const expiration = comp.expiration ? new Date(comp.expiration).getTime() : null;
      const inExam = appStart != null && now >= appStart && (expiration == null || now <= expiration);
      const ended = expiration != null && now > expiration;
      const showRankingRealtime = rankingVisibility === 'realtime' && (inExam || ended);
      const participationCoins = Number(comp.reward_config?.participation_coins ?? comp.reward_participation ?? 50);
      navigate(`/aluno/avaliacao/${comp.test_id}/fazer`, {
        state: {
          fromCompetition: true,
          competitionId: comp.id,
          competitionName: comp.name,
          participationCoins: Number.isNaN(participationCoins) ? 50 : participationCoins,
          rankingVisibility,
          showRankingButton: showRankingRealtime,
        },
      });
    } else {
      navigate(`/aluno/competitions/${comp.id}`);
    }
  };

  /** Considera prova concluída se attempt_completed_at existir ou attempt_status for completed/finalizada/concluída. */
  function isAttemptCompleted(comp: Competition): boolean {
    const raw = (comp.attempt_status ?? '') as string;
    return Boolean(comp.attempt_completed_at) || ['completed', 'finalizada', 'finalizado', 'concluída', 'concluido'].includes(raw.toLowerCase());
  }

  function getProofStatusBadge(comp: Competition) {
    const completed = isAttemptCompleted(comp);
    const attemptStatus = comp.attempt_status ?? 'not_started';
    const now = Date.now();
    const appStart = comp.application ? new Date(comp.application).getTime() : null;
    const expiration = comp.expiration ? new Date(comp.expiration).getTime() : null;
    const ended = expiration != null && now > expiration;
    const inApplication = appStart != null && now >= appStart && (expiration == null || now <= expiration);

    if (completed) {
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
    if (!inApplication && appStart != null) {
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
    return null;
  }

  function getExamStatus(comp: Competition): { title: string; subtitle: string | null } {
    const now = Date.now();
    const appStart = comp.application ? new Date(comp.application).getTime() : null;
    const expiration = comp.expiration ? new Date(comp.expiration).getTime() : null;

    if (appStart == null) {
      return { title: 'Prova sem data definida', subtitle: null };
    }
    if (expiration != null && now > expiration) {
      return { title: 'Prova finalizada', subtitle: `Prova encerrou em ${formatDate(comp.expiration)}` };
    }
    if (now >= appStart && (expiration == null || now <= expiration)) {
      return {
        title: 'Prova em aplicação',
        subtitle: comp.expiration ? `Prova encerra em ${formatDate(comp.expiration)}` : null,
      };
    }
    if (now < appStart) {
      return { title: 'Aguardando início da prova', subtitle: `Prova começa em ${formatDate(comp.application)}` };
    }
    return { title: 'Prova finalizada', subtitle: comp.expiration ? `Prova encerrou em ${formatDate(comp.expiration)}` : null };
  }

  /** Card para "Suas competições" (fazer prova / continuar / ver resultado). */
  function MyCompetitionCard({ comp }: { comp: Competition }) {
    const colors = getSubjectColors(comp.subject_id, comp.subject_name);
    const completed = isAttemptCompleted(comp);
    const rawStatus = comp.attempt_status ?? 'not_started';
    const attemptStatus = completed ? 'completed' : (rawStatus === 'in_progress' ? 'in_progress' : 'not_started');
    const now = Date.now();
    const appStart = comp.application ? new Date(comp.application).getTime() : null;
    const expiration = comp.expiration ? new Date(comp.expiration).getTime() : null;
    const inExam = appStart != null && now >= appStart && (expiration == null || now <= expiration);
    const ended = expiration != null && now > expiration;
    const status = getExamStatus(comp);

    return (
      <Card className={`flex flex-col overflow-hidden border-l-4 transition-all hover:shadow-lg ${colors.border} ${colors.bg}`}>
        <CardContent className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Badge className={`mb-2 ${colors.badge}`}>
                {comp.subject_name ?? comp.subject_id}
              </Badge>
              <h3 className="font-bold text-lg truncate">{comp.name}</h3>
              <p className="text-sm text-muted-foreground">{formatCompetitionLevel(comp.level)}</p>
            </div>
            {getProofStatusBadge(comp)}
          </div>
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {status.title}
            </p>
            {status.subtitle && <p className="text-xs pl-5">{status.subtitle}</p>}
            {comp.enrollment_end && !ended && (
              <div className="mt-1">
                <CompetitionCountdown
                  targetDate={comp.enrollment_end}
                  label="Inscrição fecha em"
                  variant="secondary"
                />
              </div>
            )}
            {comp.application && !ended && (
              <div className="mt-1">
                <CompetitionCountdown
                  targetDate={comp.application}
                  label="Prova abre em"
                  variant="secondary"
                />
              </div>
            )}
            {comp.expiration && !ended && (
              <div className="mt-1">
                <CompetitionCountdown
                  targetDate={comp.expiration}
                  label="Prova fecha em"
                  variant="secondary"
                />
              </div>
            )}
            <p className="flex items-center gap-2">
              <Coins className="h-3.5 w-3.5 shrink-0" />
              {formatRewardsShort(comp)}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/aluno/competitions/${comp.id}`)}>
              <Eye className="mr-1 h-4 w-4" />
              Ver detalhes
            </Button>
            {canUnenroll(comp) && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleUnenroll(comp)} disabled={unenrollingId === comp.id}>
                {unenrollingId === comp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="mr-1 h-4 w-4" />}
                Cancelar inscrição
              </Button>
            )}
            {attemptStatus === 'completed' && (
              <Button size="sm" variant="secondary" onClick={() => comp.test_id ? navigate(`/aluno/avaliacao/${comp.test_id}/resultado`) : navigate(`/aluno/competitions/${comp.id}`)}>
                <CheckCircle className="mr-1 h-4 w-4" />
                Ver resultado
              </Button>
            )}
            {ended && attemptStatus !== 'completed' && (
              <Button size="sm" disabled className="opacity-70 cursor-not-allowed">
                <AlertCircle className="mr-1 h-4 w-4" />
                Expirada
              </Button>
            )}
            {attemptStatus === 'in_progress' && inExam && (
              <Button size="sm" onClick={() => handleContinuarProva(comp)} disabled={startingCompId === comp.id} className={`bg-gradient-to-r ${colors.gradient} text-white border-0 hover:opacity-90`}>
                {startingCompId === comp.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Clock className="mr-1 h-4 w-4" />}
                Continuar prova
              </Button>
            )}
            {!inExam && attemptStatus !== 'completed' && !ended && (
              <Button size="sm" disabled>
                <Calendar className="mr-1 h-4 w-4" />
                Prova ainda não começou
              </Button>
            )}
            {inExam && attemptStatus !== 'completed' && attemptStatus !== 'in_progress' && (
              <Button size="sm" onClick={() => handleStartProva(comp)} disabled={startingCompId != null} className={`bg-gradient-to-r ${colors.gradient} text-white border-0 hover:opacity-90`}>
                {startingCompId === comp.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Award className="mr-1 h-4 w-4" />}
                Fazer prova
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  /** Card para seção Inscreva-se (abertas e próximas). */
  function EnrollCompetitionCard({ comp, variant }: { comp: Competition; variant: 'open' | 'upcoming' }) {
    const colors = getSubjectColors(comp.subject_id, comp.subject_name);

    return (
      <Card className={`flex flex-col overflow-hidden border-l-4 transition-all hover:shadow-lg ${colors.border} ${colors.bg}`}>
        <CardContent className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Badge className={`mb-2 ${colors.badge}`}>
                {comp.subject_name ?? comp.subject_id}
              </Badge>
              <h3 className="font-bold text-lg truncate">{comp.name}</h3>
              <p className="text-sm text-muted-foreground">{formatCompetitionLevel(comp.level)}</p>
            </div>
            {variant === 'upcoming' && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-700">
                Em breve
              </Badge>
            )}
          </div>
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              Inscrição: {formatDate(comp.enrollment_start)} → {formatDate(comp.enrollment_end)}
            </p>
            {comp.enrollment_end && (
              <div className="mt-1">
                <CompetitionCountdown
                  targetDate={comp.enrollment_end}
                  label="Inscrição fecha em"
                  variant="secondary"
                />
              </div>
            )}
            {comp.application && (
              <>
                <p className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  Prova: {formatDate(comp.application)} → {formatDate(comp.expiration)}
                </p>
                <div className="mt-1">
                  <CompetitionCountdown
                    targetDate={comp.application}
                    label="Prova abre em"
                    variant="secondary"
                  />
                </div>
              </>
            )}
            {comp.expiration && (
              <div className="mt-1">
                <CompetitionCountdown
                  targetDate={comp.expiration}
                  label="Prova fecha em"
                  variant="secondary"
                />
              </div>
            )}
            <p className="flex items-center gap-2">Vagas: {formatSlots(comp)}</p>
            <p className="flex items-center gap-2">
              <Coins className="h-3.5 w-3.5 shrink-0" />
              {formatRewardsShort(comp)}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/aluno/competitions/${comp.id}`)}>
              <Eye className="mr-1 h-4 w-4" />
              Ver detalhes
            </Button>
            {variant === 'open' && !comp.is_enrolled && slotsFull(comp) && <Badge variant="secondary">Esgotado</Badge>}
            {variant === 'open' && canEnrollNow(comp) && (
              <Button size="sm" onClick={() => handleOpenEnrollModal(comp)} className={`bg-gradient-to-r ${colors.gradient} text-white border-0 hover:opacity-90`}>
                <UserPlus className="mr-1 h-4 w-4" />
                Inscrever-se
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  /** Card encerrada (lista simples). */
  function EndedCompetitionCard({ comp }: { comp: Competition }) {
    const colors = getSubjectColors(comp.subject_id, comp.subject_name);
    return (
      <Card className={`flex flex-col overflow-hidden border-l-4 opacity-85 ${colors.border} ${colors.bg}`}>
        <CardContent className="flex flex-1 flex-col p-4">
          <Badge className={`mb-2 w-fit ${colors.badge}`}>{comp.subject_name ?? comp.subject_id}</Badge>
          <h3 className="font-semibold truncate">{comp.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{formatCompetitionLevel(comp.level)} · Finalizada</p>
          <Button variant="ghost" size="sm" className="mt-3 w-fit" onClick={() => navigate(`/aluno/competitions/${comp.id}`)}>
            <Eye className="mr-1 h-4 w-4" />
            Ver detalhes
          </Button>
        </CardContent>
      </Card>
    );
  }

  const emptyCard = (message: string) => (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center text-muted-foreground">
        <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-50" />
        {message}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto space-y-8 py-6 px-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <span className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-2 text-white">
              <Trophy className="h-8 w-8" />
            </span>
            Competições
          </h1>
          <p className="mt-1 text-muted-foreground">
            Participe, inscreva-se e dispute o ranking por disciplina.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Disciplina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as disciplinas</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as 'all' | '1' | '2')}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis</SelectItem>
              <SelectItem value="1">{formatCompetitionLevel(1)}</SelectItem>
              <SelectItem value="2">{formatCompetitionLevel(2)}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filtros Avançados */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto">
            <Filter className="mr-2 h-4 w-4" />
            Filtros avançados
            {filtersOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Filtro por recompensas */}
                <div className="space-y-2">
                  <Label htmlFor="min-coins">Moedas mínimas</Label>
                  <Input
                    id="min-coins"
                    type="number"
                    placeholder="Ex: 50"
                    value={minCoinsFilter}
                    onChange={(e) => setMinCoinsFilter(e.target.value)}
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Mostrar apenas competições com pelo menos esta quantidade de moedas
                  </p>
                </div>

                {/* Filtro por vagas */}
                <div className="flex items-start space-x-2 pt-6">
                  <Checkbox
                    id="only-slots"
                    checked={onlyWithSlots}
                    onCheckedChange={(checked) => setOnlyWithSlots(checked === true)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="only-slots" className="cursor-pointer">
                      Só com vagas disponíveis
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Mostrar apenas competições que ainda têm vagas
                    </p>
                  </div>
                </div>

                {/* Filtro por data */}
                <div className="space-y-2">
                  <Label htmlFor="date-filter">Período</Label>
                  <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as typeof dateFilter)}>
                    <SelectTrigger id="date-filter">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as datas</SelectItem>
                      <SelectItem value="next-week">Próximas 2 semanas</SelectItem>
                      <SelectItem value="next-2-weeks">Próximo mês</SelectItem>
                      <SelectItem value="next-month">Próximos 30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Filtrar por competições que começam neste período
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Filtros Avançados */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto">
            <Filter className="mr-2 h-4 w-4" />
            Filtros avançados
            {filtersOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Filtro por recompensas */}
                <div className="space-y-2">
                  <Label htmlFor="min-coins">Moedas mínimas</Label>
                  <Input
                    id="min-coins"
                    type="number"
                    placeholder="Ex: 50"
                    value={minCoinsFilter}
                    onChange={(e) => setMinCoinsFilter(e.target.value)}
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Mostrar apenas competições com pelo menos esta quantidade de moedas
                  </p>
                </div>

                {/* Filtro por vagas */}
                <div className="flex items-start space-x-2 pt-6">
                  <Checkbox
                    id="only-slots"
                    checked={onlyWithSlots}
                    onCheckedChange={(checked) => setOnlyWithSlots(checked === true)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="only-slots" className="cursor-pointer">
                      Só com vagas disponíveis
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Mostrar apenas competições que ainda têm vagas
                    </p>
                  </div>
                </div>

                {/* Filtro por data */}
                <div className="space-y-2">
                  <Label htmlFor="date-filter">Período</Label>
                  <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as typeof dateFilter)}>
                    <SelectTrigger id="date-filter">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as datas</SelectItem>
                      <SelectItem value="next-week">Próximas 2 semanas</SelectItem>
                      <SelectItem value="next-2-weeks">Próximo mês</SelectItem>
                      <SelectItem value="next-month">Próximos 30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Filtrar por competições que começam neste período
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Seção 1: Suas competições (fazer prova / continuar / ver resultado) */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Swords className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Suas competições</h2>
                <p className="text-sm text-muted-foreground">Faça a prova, continue de onde parou ou veja seu resultado.</p>
              </div>
            </div>
            {minhasInscricoes.length === 0 ? (
              emptyCard('Você ainda não está inscrito em nenhuma competição. Inscreva-se na seção abaixo!')
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {minhasInscricoes.map((comp) => (
                  <MyCompetitionCard key={comp.id} comp={comp} />
                ))}
              </div>
            )}
          </section>

          {/* Seção 2: Inscreva-se (abertas + próximas) */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Inscreva-se em novas competições</h2>
                <p className="text-sm text-muted-foreground">Competições abertas para inscrição e em breve.</p>
              </div>
            </div>

            {abertas.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Abertas para inscrição</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {abertas.map((comp) => (
                    <EnrollCompetitionCard key={comp.id} comp={comp} variant="open" />
                  ))}
                </div>
              </div>
            )}

            {proximas.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Em breve</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {proximas.map((comp) => (
                    <EnrollCompetitionCard key={comp.id} comp={comp} variant="upcoming" />
                  ))}
                </div>
              </div>
            )}

            {abertas.length === 0 && proximas.length === 0 && (
              emptyCard('Nenhuma competição aberta ou em breve no momento.')
            )}
          </section>

          {/* Seção 3: Finalizadas (recolhida) */}
          {encerradas.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-muted-foreground">Finalizadas</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {encerradas.map((comp) => (
                  <EndedCompetitionCard key={comp.id} comp={comp} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <EnrollConfirmationModal
        open={enrollModalOpen}
        onOpenChange={setEnrollModalOpen}
        competition={enrollCompetitionSelected}
        onConfirm={handleEnrollConfirm}
      />
    </div>
  );
}
