/**
 * Página de ranking da competição para o aluno.
 * Rota: /aluno/competitions/:id/ranking
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, Coins } from 'lucide-react';
import { getCompetitionDetails, getMyRanking, type MyRankingResponse } from '@/services/competitionsApi';
import { CompetitionRanking } from '@/components/competitions/CompetitionRanking';
import { formatCoins } from '@/utils/coins';

export default function CompetitionRankingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<{
    name: string;
    ranking_visibility?: string;
    reward_config?: { participation_coins?: number; ranking_rewards?: { position: number; coins: number }[] };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myRanking, setMyRanking] = useState<MyRankingResponse | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/aluno/competitions');
      return;
    }
    getCompetitionDetails(id)
      .then(setCompetition)
      .catch(() => setError('Competição não encontrada.'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    getMyRanking(id)
      .then(setMyRanking)
      .catch(() => setMyRanking({ position: null, total_participants: 0 }));
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="ghost" onClick={() => navigate('/aluno/competitions')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <p className="text-destructive">{error || 'Competição não encontrada.'}</p>
      </div>
    );
  }

  const rankingVisibility = (competition.ranking_visibility ?? '').toLowerCase();
  const isRealtime = rankingVisibility === 'realtime';
  const hasMyPosition = myRanking && myRanking.position != null && myRanking.total_participants > 0;

  return (
    <div className="container mx-auto space-y-6 py-6 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate(`/aluno/competitions/${id}`)}
        className="-ml-2 mb-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar à competição
      </Button>

      {/* Meu ranking: posição do aluno + moedas ganhas */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          {hasMyPosition ? (
            <>
              <p className="text-lg font-semibold text-center">
                Sua posição: <span className="text-primary">{myRanking.position}º</span> de{' '}
                {myRanking.total_participants} participantes
              </p>
              {(myRanking.grade != null || myRanking.value != null || myRanking.proficiency != null) && (
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {myRanking.grade != null && `Nota: ${myRanking.grade}`}
                  {myRanking.grade != null && myRanking.proficiency != null && ' · '}
                  {myRanking.proficiency != null && `Proficiência: ${myRanking.proficiency}`}
                  {myRanking.value != null && myRanking.grade == null && myRanking.proficiency == null && `Nota: ${myRanking.value}`}
                </p>
              )}
              {myRanking.coins_earned != null && myRanking.coins_earned > 0 && (
                <div className="mt-2 flex justify-center">
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    <Coins className="h-4 w-4" />
                    Moedas ganhas: {formatCoins(myRanking.coins_earned)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-muted-foreground">
              {myRanking?.message ?? 'Você ainda não tem posição no ranking.'}
            </p>
          )}
        </CardContent>
      </Card>

      <CompetitionRanking
        competitionId={id!}
        competitionName={competition.name}
        rankingVisibility={rankingVisibility}
        rewardConfig={competition.reward_config ?? undefined}
        isRealtime={isRealtime}
        inline={false}
      />
    </div>
  );
}
