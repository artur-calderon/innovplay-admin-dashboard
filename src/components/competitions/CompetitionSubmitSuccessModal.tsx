/**
 * Modal exibido após o aluno entregar a prova de uma competição.
 * Mostra sucesso, moedas ganhas (com animação) e botões Ver ranking / Voltar para competições.
 */
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Coins, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface CompetitionSubmitSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Moedas ganhas por participação (ex.: 50). */
  participationCoins?: number;
  /** Se true, mostra o botão "Ver ranking". */
  showRankingButton?: boolean;
  /** ID da competição para link do ranking. */
  competitionId?: string;
}

export function CompetitionSubmitSuccessModal({
  open,
  onOpenChange,
  participationCoins = 50,
  showRankingButton = false,
  competitionId,
}: CompetitionSubmitSuccessModalProps) {
  const navigate = useNavigate();

  const handleVerRanking = () => {
    onOpenChange(false);
    if (competitionId) {
      navigate(`/aluno/competitions/${competitionId}`);
    } else {
      navigate('/aluno/competitions');
    }
  };

  const handleVoltarCompeticoes = () => {
    onOpenChange(false);
    navigate('/aluno/competitions');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
              <CheckCircle2 className="h-14 w-14 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Prova entregue com sucesso!
          </DialogTitle>
          <DialogDescription className="text-center sr-only">
            Sua prova da competição foi enviada. Você ganhou moedas por participar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Destaque: moedas ganhas com animação */}
          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-6">
            <div className="flex items-center gap-2">
              <Coins className="h-8 w-8 text-amber-500 animate-bounce" aria-hidden />
              <span
                className="text-2xl font-bold text-amber-700 dark:text-amber-400 animate-pulse"
                style={{ animationDuration: '1.5s' }}
              >
                +{participationCoins} moedas!
              </span>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Você ganhou {participationCoins} moedas por participar!
            </p>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Fique de olho no ranking! Primeiros colocados ganham moedas extras.
          </p>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleVoltarCompeticoes}
          >
            <Trophy className="mr-2 h-4 w-4" />
            Voltar para competições
          </Button>
          {showRankingButton && (
            <Button
              className="w-full sm:w-auto"
              onClick={handleVerRanking}
            >
              Ver ranking
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
