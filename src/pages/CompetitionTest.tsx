/**
 * Página de redirecionamento: /aluno/competitions/:id/test
 * Redireciona para a prova (/aluno/avaliacao/:test_id/fazer) com contexto de competição.
 * Reutiliza o componente existente de prova (TakeEvaluation).
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getCompetitionDetails } from '@/services/competitionsApi';

interface LocationState {
  testId?: string;
}

export default function CompetitionTest() {
  const { id: competitionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? null) as LocationState | null;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!competitionId) {
      navigate('/aluno/competitions');
      return;
    }

    getCompetitionDetails(competitionId)
      .then((competition) => {
        const tid = competition.test_id ?? state?.testId;
        if (!tid) {
          setError('Esta competição não possui prova vinculada.');
          return;
        }
        const participationCoins = Number(
          competition.reward_config?.participation_coins ?? competition.reward_participation ?? 50
        );
        const rankingVisibility = (competition.ranking_visibility ?? '').toLowerCase();
        const showRankingRealtime = rankingVisibility === 'realtime';
        navigate(`/aluno/avaliacao/${tid}/fazer`, {
          replace: true,
          state: {
            fromCompetition: true,
            competitionId,
            competitionName: competition.name,
            participationCoins,
            rankingVisibility,
            showRankingButton: showRankingRealtime,
          },
        });
      })
      .catch(() => {
        setError('Não foi possível carregar a competição.');
      });
  }, [competitionId, navigate, state?.testId]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-4">
        <p className="text-destructive">{error}</p>
        <button
          type="button"
          className="text-sm text-primary underline"
          onClick={() => navigate('/aluno/competitions')}
        >
          Voltar para competições
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Preparando sua prova...</p>
    </div>
  );
}
