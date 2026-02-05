/**
 * Lista de competições para o estudante.
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calendar, Clock, Loader2, Eye, UserPlus, Coins, XCircle, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAvailableCompetitions, unenrollCompetition } from '@/services/competitionsApi';
import type { Competition } from '@/types/competition-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/lib/api';
import { EnrollConfirmationModal } from '@/components/competitions/EnrollConfirmationModal';
import { formatCompetitionLevel } from '@/utils/competitionLevel';

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
    if (subjectFilter !== 'all') {
      list = list.filter((c) => c.subject_id === subjectFilter);
    }
    if (levelFilter !== 'all') {
      list = list.filter((c) => String(c.level) === levelFilter);
    }
    return list;
  }, [competitions, subjectFilter, levelFilter]);

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

  function getExamStatus(comp: Competition): { title: string; subtitle: string | null } {
    const now = Date.now();
    const appStart = comp.application ? new Date(comp.application).getTime() : null;
    const expiration = comp.expiration ? new Date(comp.expiration).getTime() : null;

    if (appStart == null) {
      return {
        title: 'Prova sem data definida',
        subtitle: null,
      };
    }

    if (expiration != null && now > expiration) {
      return {
        title: 'Prova encerrada',
        subtitle: `Prova encerrou em ${formatDate(comp.expiration)}`,
      };
    }

    if (now >= appStart && (expiration == null || now <= expiration)) {
      return {
        title: 'Prova em aplicação',
        subtitle: comp.expiration
          ? `Prova encerra em ${formatDate(comp.expiration)}`
          : null,
      };
    }

    if (now < appStart) {
      return {
        title: 'Aguardando início da prova',
        subtitle: `Prova começa em ${formatDate(comp.application)}`,
      };
    }

    return {
      title: 'Prova encerrada',
      subtitle: comp.expiration
        ? `Prova encerrou em ${formatDate(comp.expiration)}`
        : null,
    };
  }

  function CompetitionCardList({ list, variant }: { list: Competition[]; variant?: 'default' | 'my_enrollments' }) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((comp) => (
          <Card key={comp.id} className="flex flex-col transition-shadow hover:shadow-md">
            <CardContent className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{comp.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {comp.subject_name ?? comp.subject_id} · {formatCompetitionLevel(comp.level)}
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Inscrição: {formatDate(comp.enrollment_start)} → {formatDate(comp.enrollment_end)}
                </p>
                {comp.application && (
                  <p className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    Prova: {formatDate(comp.application)} → {formatDate(comp.expiration)}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  Vagas: {formatSlots(comp)}
                </p>
                <p className="flex items-center gap-2">
                  <Coins className="h-3.5 w-3.5 shrink-0" />
                  {formatRewardsShort(comp)}
                </p>
                {variant === 'my_enrollments' && (
                  (() => {
                    const status = getExamStatus(comp);
                    return (
                      <div className="mt-1 space-y-0.5">
                        <p className="font-medium text-foreground">{status.title}</p>
                        {status.subtitle && (
                          <p className="text-xs text-muted-foreground">{status.subtitle}</p>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/aluno/competitions/${comp.id}`)}
                >
                  <Eye className="mr-1 h-4 w-4" />
                  Ver detalhes
                </Button>
                {comp.is_enrolled && (
                  <>
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                      Inscrito
                    </Badge>
                    {canUnenroll(comp) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleUnenroll(comp)}
                        disabled={unenrollingId === comp.id}
                      >
                        {unenrollingId === comp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="mr-1 h-4 w-4" />}
                        Cancelar inscrição
                      </Button>
                    )}
                  </>
                )}
                {!comp.is_enrolled && slotsFull(comp) && (
                  <Badge variant="secondary">Esgotado</Badge>
                )}
                {!comp.is_enrolled && canEnrollNow(comp) && (
                  <Button size="sm" onClick={() => handleOpenEnrollModal(comp)}>
                    <UserPlus className="mr-1 h-4 w-4" />
                    Inscrever-se
                  </Button>
                )}
                {variant === 'my_enrollments' && comp.is_enrolled && (
                  (() => {
                    const now = Date.now();
                    const appStart = comp.application ? new Date(comp.application).getTime() : null;
                    const expiration = comp.expiration ? new Date(comp.expiration).getTime() : null;
                    const inExam =
                      appStart != null &&
                      now >= appStart &&
                      (expiration == null || now <= expiration);

                    if (!inExam) {
                      return (
                        <Button size="sm" disabled>
                          <Award className="mr-1 h-4 w-4" />
                          Prova ainda não começou
                        </Button>
                      );
                    }

                    return (
                      <Button
                        size="sm"
                        onClick={() =>
                          toast({
                            title: 'Em breve',
                            description: 'Fluxo de prova ainda não disponível.',
                          })
                        }
                      >
                        <Award className="mr-1 h-4 w-4" />
                        Fazer prova
                      </Button>
                    );
                  })()
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const emptyMessage = (
    <Card>
      <CardContent className="py-16 text-center text-muted-foreground">
        Nenhuma competição nesta aba.
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto space-y-6 py-6 px-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Trophy className="h-8 w-8 text-blue-600" />
            Competições Disponíveis
          </h1>
          <p className="mt-1 text-muted-foreground">
            Veja as competições, inscreva-se e acompanhe suas inscrições.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Todas as disciplinas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as disciplinas</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as 'all' | '1' | '2')}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Todos os níveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis</SelectItem>
              <SelectItem value="1">{formatCompetitionLevel(1)}</SelectItem>
              <SelectItem value="2">{formatCompetitionLevel(2)}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="abertas" className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="abertas">Abertas</TabsTrigger>
          <TabsTrigger value="proximas">Próximas</TabsTrigger>
          <TabsTrigger value="minhas">Minhas Inscrições</TabsTrigger>
          <TabsTrigger value="encerradas">Encerradas</TabsTrigger>
        </TabsList>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <>
            <TabsContent value="abertas" className="mt-4">
              {abertas.length === 0 ? emptyMessage : <CompetitionCardList list={abertas} />}
            </TabsContent>
            <TabsContent value="proximas" className="mt-4">
              {proximas.length === 0 ? emptyMessage : <CompetitionCardList list={proximas} />}
            </TabsContent>
            <TabsContent value="minhas" className="mt-4">
              {minhasInscricoes.length === 0 ? (
                emptyMessage
              ) : (
                <CompetitionCardList list={minhasInscricoes} variant="my_enrollments" />
              )}
            </TabsContent>
            <TabsContent value="encerradas" className="mt-4">
              {encerradas.length === 0 ? emptyMessage : <CompetitionCardList list={encerradas} />}
            </TabsContent>
          </>
        )}
      </Tabs>

      <EnrollConfirmationModal
        open={enrollModalOpen}
        onOpenChange={setEnrollModalOpen}
        competition={enrollCompetitionSelected}
        onConfirm={handleEnrollConfirm}
      />
    </div>
  );
}
