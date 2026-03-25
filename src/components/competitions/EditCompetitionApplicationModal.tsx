/**
 * Modal para agendar inscrição/prova e publicar a competição em um único fluxo.
 * Acesso pelo botão de agendamento/publicação no card (quando status = rascunho).
 */
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getCompetitionDetails, publishCompetition, updateCompetition } from '@/services/competition/competitionsApi';
import { parseISOToDatetimeLocal, convertDateTimeLocalToISONaive } from '@/utils/date';
import { CalendarDays, CalendarRange, Clock, Loader2 } from 'lucide-react';
import type { Competition } from '@/types/competition-types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatDatetimeLocalHuman(value: string): string {
  const v = value?.trim();
  if (!v) return '—';

  // `datetime-local` costuma vir como: YYYY-MM-DDTHH:mm (sem timezone).
  // Criamos um Date local e formatamos para PT-BR.
  const date = new Date(v);
  if (Number.isNaN(date.getTime())) return v;
  return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
}

export interface EditCompetitionApplicationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  competitionId: string | null;
  competitionName?: string;
}

export function EditCompetitionApplicationModal({
  open,
  onClose,
  onSuccess,
  competitionId,
  competitionName = '',
}: EditCompetitionApplicationModalProps) {
  const { toast } = useToast();
  const [enrollmentStart, setEnrollmentStart] = useState('');
  const [enrollmentEnd, setEnrollmentEnd] = useState('');
  const [application, setApplication] = useState('');
  const [expiration, setExpiration] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [competition, setCompetition] = useState<Competition | null>(null);

  // Carrega competição e preenche o formulário com as datas atuais (editar em cima do que já existe, como em Ver competição).
  useEffect(() => {
    if (!open || !competitionId) {
      setCompetition(null);
      return;
    }
    setLoadingData(true);
    // Usar /details para garantir que campos de questões (question_ids/question_rules) venham preenchidos.
    getCompetitionDetails(competitionId)
      .then((c) => {
        setCompetition(c);
        setEnrollmentStart(parseISOToDatetimeLocal(c.enrollment_start));
        setEnrollmentEnd(parseISOToDatetimeLocal(c.enrollment_end));
        setApplication(parseISOToDatetimeLocal(c.application));
        setExpiration(parseISOToDatetimeLocal(c.expiration));
      })
      .catch(() => {
        setCompetition(null);
        toast({ title: 'Erro ao carregar competição.', variant: 'destructive' });
      })
      .finally(() => setLoadingData(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast não deve disparar recarga
  }, [open, competitionId]);

  /** Verifica se a competição tem questões configuradas (obrigatório para publicar). */
  function hasQuestions(c: Competition | null): boolean {
    if (!c) return false;
    const mode = (c.question_mode ?? 'manual').toLowerCase();
    if (mode === 'manual' || mode.includes('manual')) {
      const manualCount = (c.question_ids?.length ?? 0) + (c.selected_question_ids?.length ?? 0);
      return manualCount > 0;
    }
    if (mode === 'auto_random' || mode.includes('auto_random') || mode.includes('auto')) {
      const qIdsCount = (c.question_ids?.length ?? 0) + (c.selected_question_ids?.length ?? 0);
      if (qIdsCount > 0) return true;

      const rulesRaw = c.question_rules;
      const findNumQuestions = (rulesObj: unknown): number | null => {
        if (!rulesObj || typeof rulesObj !== 'object') return null;
        const r = rulesObj as Record<string, unknown>;

        if (typeof r.num_questions === 'number') return r.num_questions;
        if (typeof r.num_questions === 'string' && r.num_questions.trim()) {
          const n = Number(r.num_questions);
          return Number.isFinite(n) ? n : null;
        }

        // Tentativas de caminhos alternativos (variações de backend)
        const nestedCandidates = [r.question_rules, r.rules, r.params, r.data].filter(Boolean);
        for (const cand of nestedCandidates) {
          const v = findNumQuestions(cand);
          if (v != null) return v;
        }
        return null;
      };

      if (typeof rulesRaw === 'object' && rulesRaw != null) {
        const n = findNumQuestions(rulesRaw);
        return n != null ? n > 0 : false;
      }
      if (typeof rulesRaw === 'string' && rulesRaw.trim()) {
        try {
          const parsed = JSON.parse(rulesRaw) as unknown;
          const n = findNumQuestions(parsed);
          return n != null ? n > 0 : false;
        } catch {
          return false;
        }
      }

      return false;
    }
    return false;
  }

  const handleSubmit = async () => {
    if (!competitionId) return;

    if (!hasQuestions(competition)) {
      toast({
        title: 'Adicione questões antes de publicar',
        description: 'A competição precisa ter pelo menos uma questão (modo manual: vincule questões; modo aleatório: defina a quantidade).',
        variant: 'destructive',
      });
      return;
    }

    // Usar exatamente o valor atual dos inputs (state) para enviar ao backend
    const startStr = enrollmentStart.trim();
    const endStr = enrollmentEnd.trim();
    const appStr = application.trim();
    const expStr = expiration.trim();

    if (!startStr || !endStr || !appStr || !expStr) {
      toast({
        title: 'Datas obrigatórias',
        description: 'Preencha início/fim das inscrições e início/fim da prova antes de publicar.',
        variant: 'destructive',
      });
      return;
    }

    const enrollmentStartIso = convertDateTimeLocalToISONaive(startStr);
    const enrollmentEndIso = convertDateTimeLocalToISONaive(endStr);
    const applicationIso = convertDateTimeLocalToISONaive(appStr);
    const expirationIso = convertDateTimeLocalToISONaive(expStr);

    const now = new Date();
    const enrollmentStartDate = new Date(enrollmentStartIso);
    const enrollmentEndDate = new Date(enrollmentEndIso);
    const applicationDate = new Date(applicationIso);
    const expirationDate = new Date(expirationIso);

    if (!(enrollmentStartDate < enrollmentEndDate)) {
      toast({
        title: 'Período de inscrição inválido',
        description: 'A data de início das inscrições deve ser anterior à data de fim das inscrições.',
        variant: 'destructive',
      });
      return;
    }

    if (!(enrollmentEndDate <= applicationDate)) {
      toast({
        title: 'Datas inconsistentes',
        description: 'O início da prova deve ser posterior ao fim das inscrições.',
        variant: 'destructive',
      });
      return;
    }

    if (!(applicationDate < expirationDate)) {
      toast({
        title: 'Período da prova inválido',
        description: 'A data de fim da prova deve ser posterior à data de início da prova.',
        variant: 'destructive',
      });
      return;
    }

    if (!(expirationDate > now)) {
      toast({
        title: 'Data de fim no passado',
        description: 'A data de fim da prova deve ser posterior ao momento atual.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        enrollment_start: enrollmentStartIso,
        enrollment_end: enrollmentEndIso,
        application: applicationIso,
        expiration: expirationIso,
      };

      if (process.env.NODE_ENV !== 'production') {
        // Log detalhado do payload enviado ao backend na aplicação/publicação da competição
        console.log(
          '[Competitions] Enviando payload para PUT /competitions/%s (aplicação/publicação):',
          competitionId,
          JSON.stringify(payload, null, 2),
        );
      }

      await updateCompetition(competitionId, payload);
      await publishCompetition(competitionId);
      // Reaplicar as datas após publicar: o backend pode resetar datas no publish; editar de novo garante que as escolhidas permaneçam.
      await updateCompetition(competitionId, payload);

      toast({ title: 'Competição agendada e publicada com sucesso.' });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Erro ao salvar ou publicar a competição.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            Aplicação
          </DialogTitle>
          <DialogDescription>
            {competitionName
              ? `Competição: ${competitionName}`
              : 'Defina o período de inscrições e da prova antes de publicar.'}
          </DialogDescription>
        </DialogHeader>
        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="enrollment_start" className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Início das inscrições
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    id="enrollment_start"
                    type="datetime-local"
                    step="60"
                    value={enrollmentStart}
                    onChange={(e) => setEnrollmentStart(e.target.value)}
                    className="w-full"
                  />
                  {(enrollmentStart || enrollmentStart === '') && (
                    <p className="text-xs text-muted-foreground">
                      {formatDatetimeLocalHuman(enrollmentStart)}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const el = document.getElementById('enrollment_start') as HTMLInputElement | null;
                    if (!el) return;
                    const anyEl = el as HTMLInputElement & { showPicker?: () => void };
                    if (typeof anyEl.showPicker === 'function') {
                      anyEl.showPicker();
                    } else {
                      el.focus();
                      el.click();
                    }
                  }}
                  title="Abrir seletor de data e hora"
                  className="shrink-0"
                >
                  <CalendarRange className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="enrollment_end" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Fim das inscrições
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    id="enrollment_end"
                    type="datetime-local"
                    step="60"
                    value={enrollmentEnd}
                    onChange={(e) => setEnrollmentEnd(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatDatetimeLocalHuman(enrollmentEnd)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const el = document.getElementById('enrollment_end') as HTMLInputElement | null;
                    if (!el) return;
                    const anyEl = el as HTMLInputElement & { showPicker?: () => void };
                    if (typeof anyEl.showPicker === 'function') {
                      anyEl.showPicker();
                    } else {
                      el.focus();
                      el.click();
                    }
                  }}
                  title="Abrir seletor de data e hora"
                  className="shrink-0"
                >
                  <CalendarRange className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="application" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Início da prova
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    id="application"
                    type="datetime-local"
                    step="60"
                    value={application}
                    onChange={(e) => setApplication(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatDatetimeLocalHuman(application)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const el = document.getElementById('application') as HTMLInputElement | null;
                    if (!el) return;
                    const anyEl = el as HTMLInputElement & { showPicker?: () => void };
                    if (typeof anyEl.showPicker === 'function') {
                      anyEl.showPicker();
                    } else {
                      el.focus();
                      el.click();
                    }
                  }}
                  title="Abrir seletor de data e hora"
                  className="shrink-0"
                >
                  <CalendarRange className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiration" className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Fim da prova
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    id="expiration"
                    type="datetime-local"
                    step="60"
                    value={expiration}
                    onChange={(e) => setExpiration(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formatDatetimeLocalHuman(expiration)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const el = document.getElementById('expiration') as HTMLInputElement | null;
                    if (!el) return;
                    const anyEl = el as HTMLInputElement & { showPicker?: () => void };
                    if (typeof anyEl.showPicker === 'function') {
                      anyEl.showPicker();
                    } else {
                      el.focus();
                      el.click();
                    }
                  }}
                  title="Abrir seletor de data e hora"
                  className="shrink-0"
                >
                  <CalendarRange className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {(enrollmentStart || enrollmentEnd || application || expiration) && (
              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                <p>
                  • Inscrições: <strong>{formatDatetimeLocalHuman(enrollmentStart)}</strong> →{' '}
                  <strong>{formatDatetimeLocalHuman(enrollmentEnd)}</strong>
                </p>
                <p>
                  • Prova: <strong>{formatDatetimeLocalHuman(application)}</strong> →{' '}
                  <strong>{formatDatetimeLocalHuman(expiration)}</strong>
                </p>
              </div>
            )}
          </div>
        )}
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || loadingData}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aplicar
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
