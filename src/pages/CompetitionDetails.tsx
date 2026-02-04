/**
 * Detalhes da competição (admin, coordenador, diretor, tec admin).
 * Rota: /app/competitions/:id
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, ArrowLeft, Calendar, Clock, Trophy, BookOpen, Coins, Users, Award, Pencil, Send, Trash2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { getCompetition, publishCompetition, cancelCompetition, deleteCompetition } from '@/services/competitionsApi';
import type { Competition, CompetitionStatus } from '@/types/competition-types';
import { EditCompetitionModal } from '@/components/competitions/EditCompetitionModal';

function getStatusConfig(status: CompetitionStatus) {
  const s = String(status).toLowerCase();
  if (s === 'draft' || s === 'rascunho') return { label: 'Rascunho', className: 'bg-muted text-muted-foreground' };
  if (s === 'aberta' || s === 'enrollment_open') return { label: s === 'aberta' ? 'Aberta' : 'Inscrições abertas', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200' };
  if (s === 'scheduled') return { label: 'Agendada', className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200' };
  if (s === 'active') return { label: 'Ativa', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200' };
  if (s === 'completed') return { label: 'Encerrada', className: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200' };
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
  }, [id]);

  const statusConfig = competition ? getStatusConfig(competition.status) : null;
  const s = competition ? String(competition.status).toLowerCase() : '';
  const isDraft = competition && (s === 'rascunho' || s === 'draft');
  const isCancelled = competition && (s === 'cancelada' || s === 'cancelled');
  const isAberta = competition && (s === 'aberta' || s === 'enrollment_open' || s === 'active');
  const isCompleted = competition && (s === 'completed' || s === 'encerrada');
  /** Só pode excluir direto em rascunho ou já cancelada; aberta/encerrada precisa cancelar antes. */
  const canDeleteDirectly = isDraft || isCancelled;
  /** Pode cancelar quando aberta ou encerrada (depois pode excluir). */
  const canCancel = isAberta || isCompleted;
  const canEdit = isDraft || isAberta;

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

  return (
    <div className="container mx-auto space-y-6 py-6 px-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate('/app/competitions')} className="mb-2 -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar à lista
          </Button>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight">
            <Trophy className="h-7 w-7 text-primary" />
            {competition.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {statusConfig && <Badge className={statusConfig.className}>{statusConfig.label}</Badge>}
            <span className="text-sm text-muted-foreground">
              {competition.subject_name ?? competition.subject_id} · Nível {competition.level}
              {competition.scope && ` · Escopo: ${competition.scope}`}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
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
          {canCancel && (
            <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)} disabled={actionLoading}>
              <XCircle className="mr-2 h-4 w-4" /> Cancelar competição
            </Button>
          )}
          {canDeleteDirectly && (
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} disabled={actionLoading}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
          )}
          {canCancel && (
            <p className="text-xs text-muted-foreground">Depois de cancelar, você poderá excluir.</p>
          )}
        </div>
      </div>

      {/* Seção: Informações */}
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
                <p className="text-sm">{formatDate(competition.enrollment_start)} até {formatDate(competition.enrollment_end)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border p-3">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Aplicação</p>
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
                  Modo: {competition.question_mode === 'auto_random' ? 'Aleatório' : (competition.question_mode ?? '—')}
                  {competition.question_mode === 'auto_random' && competition.question_rules != null
                    ? (() => {
                        const r = typeof competition.question_rules === 'object' ? competition.question_rules : (() => { try { return JSON.parse(competition.question_rules as string); } catch { return null; } })();
                        const n = (r as { num_questions?: number } | null)?.num_questions ?? competition.question_ids?.length ?? 0;
                        return ` · ${n} questão(ões) sorteadas`;
                      })()
                    : ` · ${competition.question_ids?.length ?? 0} questão(ões)`}
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
                  Participação: {String(competition.reward_config?.participation_coins ?? competition.reward_participation ?? '—')}
                  {((competition.reward_config?.ranking_rewards?.length ?? 0) > 0 || competition.reward_ranking != null) && (
                    <> · Ranking: {competition.reward_config?.ranking_rewards?.length ? competition.reward_config.ranking_rewards.map((r) => `${r.position}º: ${r.coins}`).join(', ') : String(competition.reward_ranking ?? '—')}</>
                  )}
                </p>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Inscritos / Vagas: {competition.enrolled_count ?? 0} / {competition.max_participants ?? competition.limit ?? '∞'}
          </p>
        </CardContent>
      </Card>

      {/* Seção: Inscritos (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> Inscritos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Lista de alunos inscritos será exibida aqui (quando disponível). Nome, Turma, Data de inscrição.
          </p>
        </CardContent>
      </Card>

      {/* Seção: Resultados (se encerrada) */}
      {String(competition.status).toLowerCase() === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5" /> Resultados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ranking final e moedas distribuídas (quando disponível).
            </p>
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
