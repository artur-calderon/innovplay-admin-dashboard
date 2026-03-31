import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Medal, Award } from 'lucide-react';
import { getBandColor, type CompetitionBand } from '@/utils/competition/competitionGamification';
import { api } from '@/lib/api';

interface CompetitionClassificationResponse {
  band: CompetitionBand | string;
  first_places: number;
  second_places: number;
  third_places: number;
  total_podiums: number;
}

export function StudentCompetitionClassificationCard() {
  const [data, setData] = useState<CompetitionClassificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get<CompetitionClassificationResponse>(
        '/competitions/students/me/competition-ranking-classification',
      )
      .then((res) => {
        if (!cancelled) setData(res.data ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError('Não foi possível carregar sua classificação em competições.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card className="border-dashed bg-gradient-to-r from-amber-50/60 via-orange-50/40 to-yellow-50/60 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-yellow-950/10">
        <CardContent className="py-4 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-1">
              <div className="h-4 w-40 bg-muted rounded animate-pulse" />
              <div className="h-3 w-24 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="hidden sm:flex gap-2">
            <div className="h-6 w-12 bg-muted rounded animate-pulse" />
            <div className="h-6 w-12 bg-muted rounded animate-pulse" />
            <div className="h-6 w-12 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || error) {
    return (
      <Card className="border-dashed bg-background/80">
        <CardContent className="py-4 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div>
              <p className="text-sm font-semibold">
                Seu nível em competições ainda está sendo calculado.
              </p>
              <p className="text-xs text-muted-foreground">
                Participe de mais competições para desbloquear sua faixa de desempenho.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const color = getBandColor(data.band);
  const style = color
    ? {
        borderColor: color,
        boxShadow: `0 0 0 1px ${color}30`,
      }
    : undefined;

  return (
    <Card
      className="border-2 bg-gradient-to-r from-background via-background/95 to-background"
      style={style}
    >
      <CardContent className="py-4 px-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md"
            style={{ backgroundColor: color ?? '#7C3AED' }}
          >
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              Seu nível em competições:{' '}
              <span style={{ color: color ?? undefined }}>{data.band}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Continue participando para subir de faixa e conquistar mais medalhas.
            </p>
          </div>
        </div>
        <div className="flex gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-1">
            <Medal className="h-4 w-4 text-amber-500" />
            <span>1º: {data.first_places}</span>
          </div>
          <div className="flex items-center gap-1">
            <Medal className="h-4 w-4 text-slate-400" />
            <span>2º: {data.second_places}</span>
          </div>
          <div className="flex items-center gap-1">
            <Medal className="h-4 w-4 text-amber-700" />
            <span>3º: {data.third_places}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <Award className="h-4 w-4 text-primary" />
            <span>Total: {data.total_podiums}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

