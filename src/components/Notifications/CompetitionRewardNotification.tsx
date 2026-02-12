/**
 * Notificação de prêmio de competição: quando o aluno ganhou moedas no ranking.
 * Exibe toast com mensagem de parabéns e link para ver o ranking completo.
 * O backend pode criar uma notificação ao pagar o ranking; o frontend exibe este toast/modal.
 */
import React from 'react';
import { Trophy } from 'lucide-react';
import { ToastAction } from '@/components/ui/toast';
import { formatCoins } from '@/utils/coins';

export interface CompetitionRewardPayload {
  position: number;
  competitionName: string;
  coins: number;
  competitionId: string;
}

type ToastFn = (props: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactElement;
  duration?: number;
  variant?: 'default' | 'destructive';
}) => { id: string; dismiss: () => void };

/**
 * Exibe um toast de prêmio de competição.
 * Use quando o backend notificar que o aluno ganhou moedas no ranking (ex.: ao processar ranking final).
 *
 * @example
 * // Dentro de um componente:
 * const { toast } = useToast();
 * const navigate = useNavigate();
 * showCompetitionRewardNotification(toast, navigate, {
 *   position: 2,
 *   competitionName: 'Matemática 2025',
 *   coins: 75,
 *   competitionId: 'uuid',
 * });
 */
export function showCompetitionRewardNotification(
  toast: ToastFn,
  navigate: (path: string) => void,
  payload: CompetitionRewardPayload
): void {
  const { position, competitionName, coins, competitionId } = payload;
  const rankingPath = `/aluno/competitions/${competitionId}/ranking`;

  toast({
    title: (
      <span className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
        Parabéns!
      </span>
    ),
    description: (
      <span>
        Você ficou em <strong>{position}º</strong> lugar na competição{' '}
        <strong>{competitionName}</strong> e ganhou{' '}
        <strong>{formatCoins(coins)} moedas</strong>!
      </span>
    ),
    action: (
      <ToastAction
        altText="Ver ranking completo"
        onClick={() => navigate(rankingPath)}
      >
        Ver ranking
      </ToastAction>
    ),
    duration: 8000,
  });
}

/**
 * Conteúdo reutilizável para exibir em modal (opcional).
 * Útil se o app preferir modal em vez de toast.
 */
export function CompetitionRewardContent({ payload }: { payload: CompetitionRewardPayload }) {
  const { position, competitionName, coins } = payload;
  return (
    <div className="space-y-2">
      <p className="font-semibold flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        Parabéns!
      </p>
      <p className="text-sm text-muted-foreground">
        Você ficou em <strong>{position}º</strong> lugar na competição{' '}
        <strong>{competitionName}</strong> e ganhou{' '}
        <strong>{formatCoins(coins)} moedas</strong>!
      </p>
    </div>
  );
}
