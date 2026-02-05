/**
 * Modal de confirmação de inscrição do aluno na competição.
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Coins, Loader2, Trophy, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { enrollCompetition } from '@/services/competitionsApi';
import type { Competition } from '@/types/competition-types';

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  try {
    return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return value;
  }
}

function formatRewardsSummary(c: Competition): string {
  const parts: string[] = [];
  const part = c.reward_config?.participation_coins ?? c.reward_participation;
  if (part != null && part !== '') parts.push(`${part} moedas por participar`);
  const rank = c.reward_config?.ranking_rewards;
  if (rank?.length) {
    const top = rank.slice(0, 3).map((r) => `${r.position}º → ${r.coins} moedas`).join(', ');
    parts.push(`Top 3: ${top}`);
  } else if (c.reward_ranking != null && c.reward_ranking !== '') {
    parts.push(`Ranking: ${c.reward_ranking} moedas`);
  }
  return parts.length ? parts.join(' · ') : '—';
}

function formatSlotsSummary(c: Competition): { line: string; remainingText: string | null } {
  const max = c.max_participants ?? c.limit;
  const enrolled = c.enrolled_count ?? 0;

  if (max == null || max <= 0) {
    return {
      line: 'Essa competição tem vagas ilimitadas.',
      remainingText: null,
    };
  }

  const remaining = Math.max(max - enrolled, 0);
  return {
    line: `Vagas: ${enrolled} de ${max} já preenchidas.`,
    remainingText: `Restam ${remaining} vaga${remaining === 1 ? '' : 's'}, confirme sua inscrição para garantir seu lugar.`,
  };
}

export interface EnrollConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition: Competition | null;
  onConfirm: () => void;
}

export function EnrollConfirmationModal({
  open,
  onOpenChange,
  competition,
  onConfirm,
}: EnrollConfirmationModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!competition?.id) return;
    setLoading(true);
    try {
      await enrollCompetition(competition.id);
      toast({
        title: 'Inscrição realizada!',
        description: 'Boa sorte!',
      });
      onConfirm();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Não foi possível realizar a inscrição.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!loading) onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Confirmar inscrição na competição
          </DialogTitle>
          <DialogDescription>
            Você está se inscrevendo em:{' '}
            <span className="font-semibold text-foreground">
              {competition?.name ?? '—'}
            </span>
          </DialogDescription>
        </DialogHeader>

        {competition && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium text-muted-foreground">
              {competition.subject_name ?? competition.subject_id} · Nível {competition.level}
            </p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>
                Inscrições até {formatDate(competition.enrollment_end)}
              </span>
            </div>
            {competition.application && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>
                  Prova: {formatDate(competition.application)} →{' '}
                  {formatDate(competition.expiration)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Coins className="h-4 w-4 shrink-0" />
              <span>{formatRewardsSummary(competition)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" />
              {(() => {
                const { line } = formatSlotsSummary(competition);
                return <span>{line}</span>;
              })()}
            </div>

            {(() => {
              const part = competition.reward_config?.participation_coins ?? competition.reward_participation;
              const hasParticipation = part != null && part !== '';
              const rank = competition.reward_config?.ranking_rewards;
              const hasRanking = !!rank?.length;

              if (!hasParticipation && !hasRanking) return null;

              return (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {hasParticipation && (
                    <p>
                      Você ganha{' '}
                      <span className="font-semibold">
                        {String(part)} moedas ao participar.
                      </span>
                    </p>
                  )}
                  {hasRanking && (
                    <p>
                      Além disso, os melhores colocados ganham moedas extras.
                    </p>
                  )}
                </div>
              );
            })()}

            {(() => {
              const { remainingText } = formatSlotsSummary(competition);
              if (!remainingText) return null;
              return (
                <p className="mt-1 text-xs text-muted-foreground">
                  {remainingText}
                </p>
              );
            })()}

            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-semibold">
                Você vai se inscrever na competição {competition.name};
              </span>{' '}
              inscrições até {formatDate(competition.enrollment_end)}, prova em{' '}
              {formatDate(competition.application)} →{' '}
              {formatDate(competition.expiration)}
              {competition.reward_config?.participation_coins != null ||
              competition.reward_participation != null
                ? `, e ganhará ${
                    competition.reward_config?.participation_coins ??
                    competition.reward_participation
                  } moedas ao participar.`
                : '.'}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !competition?.id}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar inscrição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
