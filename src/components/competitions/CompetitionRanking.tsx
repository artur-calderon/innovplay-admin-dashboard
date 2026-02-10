/**
 * Ranking da competição: minha posição, pódio (top 3), lista completa com paginação.
 * Suporta auto-atualização quando ranking_visibility = 'realtime'.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Trophy, Coins, RefreshCw, Loader2, User } from 'lucide-react';
import { getCompetitionRanking, type CompetitionRankingEntry } from '@/services/competitionsApi';
import { getMedalEmoji, formatCoins } from '@/utils/coins';
import type { RewardConfig } from '@/types/competition-types';

const PAGE_SIZE = 20;
const POLL_INTERVAL_MS = 30000; // 30 segundos para ranking em tempo real

export interface CompetitionRankingProps {
  competitionId: string;
  competitionName: string;
  /** 'realtime' = durante prova ou após; 'final' = só após encerrar */
  rankingVisibility: 'realtime' | 'final' | string;
  rewardConfig?: RewardConfig | null;
  /** Se true, faz polling a cada X segundos e mostra botão Atualizar */
  isRealtime?: boolean;
  /** Exibir inline (sem header próprio) ou como página completa */
  inline?: boolean;
  /** Filtro por turma (opcional) */
  classId?: string;
  /** Filtro por escola (opcional) */
  schoolId?: string;
}

function PodiumPlace({
  entry,
  place,
}: {
  entry: CompetitionRankingEntry;
  place: 1 | 2 | 3;
}) {
  const height = place === 1 ? 'h-32' : place === 2 ? 'h-28' : 'h-24';
  const medal = getMedalEmoji(place);
  const borderColor =
    place === 1
      ? 'border-amber-400'
      : place === 2
        ? 'border-slate-400'
        : 'border-amber-600';

  return (
    <div className={`flex flex-col items-center gap-2 ${height} justify-end`}>
      <Avatar className="h-14 w-14 border-2 border-muted">
        <AvatarImage src={entry.avatar_url} alt={entry.name} />
        <AvatarFallback>
          <User className="h-6 w-6 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      <span className="text-lg font-semibold truncate max-w-[120px] text-center" title={entry.name}>
        {entry.name}
      </span>
      {entry.class_name && (
        <span className="text-xs text-muted-foreground truncate max-w-[120px] text-center">
          {entry.class_name}
        </span>
      )}
      <span className="text-sm font-medium">{entry.value_label ?? entry.value}</span>
      {entry.coins_earned != null && entry.coins_earned > 0 && (
        <Badge variant="secondary" className="gap-1">
          <Coins className="h-3 w-3" />
          +{formatCoins(entry.coins_earned)} moedas
        </Badge>
      )}
      <div
        className={`w-16 rounded-t-lg border-2 ${borderColor} bg-muted/50 flex items-center justify-center py-2`}
      >
        <span className="text-2xl">{medal || `${place}º`}</span>
      </div>
    </div>
  );
}

export function CompetitionRanking({
  competitionId,
  competitionName,
  rankingVisibility,
  rewardConfig,
  isRealtime = false,
  inline = false,
  classId,
  schoolId,
}: CompetitionRankingProps) {
  const [data, setData] = useState<{
    entries: CompetitionRankingEntry[];
    total: number;
    my_position?: number;
    my_coins_earned?: number;
  } | null>(null);
  const [top3, setTop3] = useState<CompetitionRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('');

  const fetchRanking = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await getCompetitionRanking(competitionId, {
        page,
        page_size: PAGE_SIZE,
        ...(classId && { class_id: classId }),
        ...(schoolId && { school_id: schoolId }),
      });
      setData({
        entries: res.entries,
        total: res.total,
        my_position: res.my_position,
        my_coins_earned: res.my_coins_earned,
      });
      const firstThree = res.entries.filter((e) => e.position >= 1 && e.position <= 3);
      if (firstThree.length > 0) {
        setTop3((prev) => (prev.length >= 3 ? prev : firstThree));
      }
      // Atualizar timestamp da última atualização
      if (isRealtime) {
        setLastUpdateTime(Date.now());
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(
        status === 403
          ? 'Ranking só é exibido após o encerramento da competição.'
          : 'Não foi possível carregar o ranking.'
      );
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [competitionId, page, classId, schoolId]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  useEffect(() => {
    if (!isRealtime || !competitionId) return;
    const interval = setInterval(() => fetchRanking(true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isRealtime, competitionId, fetchRanking]);

  // Atualizar contador de tempo desde última atualização
  useEffect(() => {
    if (!isRealtime || !lastUpdateTime) {
      setTimeSinceUpdate('');
      return;
    }

    const updateTimeSince = () => {
      const now = Date.now();
      const diffSeconds = Math.floor((now - lastUpdateTime) / 1000);
      
      if (diffSeconds < 60) {
        setTimeSinceUpdate(`${diffSeconds}s`);
      } else if (diffSeconds < 3600) {
        const minutes = Math.floor(diffSeconds / 60);
        setTimeSinceUpdate(`${minutes}min`);
      } else {
        const hours = Math.floor(diffSeconds / 3600);
        setTimeSinceUpdate(`${hours}h`);
      }
    };

    updateTimeSince();
    const interval = setInterval(updateTimeSince, 1000);
    return () => clearInterval(interval);
  }, [isRealtime, lastUpdateTime]);

  const podiumOrder: (1 | 2 | 3)[] = [2, 1, 3]; // 2º à esquerda, 1º centro, 3º à direita
  const listEntries = data?.entries ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {error}
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchRanking()}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!inline && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-xl font-bold">Ranking - {competitionName}</h2>
          {isRealtime && (
            <div className="flex items-center gap-2">
              {timeSinceUpdate && (
                <Badge variant="outline" className="text-xs">
                  Última atualização: há {timeSinceUpdate}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchRanking(true)}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Atualizar ranking
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Minha posição */}
      {data?.my_position != null && data.total > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-lg font-semibold text-center">
              Você está em <span className="text-primary">{data.my_position}º</span> lugar de{' '}
              {data.total} participantes
            </p>
            {data.my_coins_earned != null && data.my_coins_earned > 0 && (
              <div className="mt-2 flex justify-center">
                <Badge className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  <Coins className="h-4 w-4" />
                  Você ganhou {formatCoins(data.my_coins_earned)} moedas!
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pódio (top 3) */}
      {top3.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5" /> Pódio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-center gap-4 sm:gap-8">
              {podiumOrder.map((place) => {
                const entry = top3.find((e) => e.position === place);
                if (!entry) return <div key={place} className="w-24" />;
                return (
                  <PodiumPlace key={entry.student_id} entry={entry} place={place} />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista completa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista completa</CardTitle>
        </CardHeader>
        <CardContent>
          {listEntries.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum participante no ranking ainda.</p>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Pos.</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden sm:table-cell">Turma</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      {rewardConfig?.ranking_rewards?.length ? (
                        <TableHead className="text-right w-24">Moedas</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listEntries.map((entry) => (
                      <TableRow key={entry.student_id}>
                        <TableCell className="font-medium">
                          {getMedalEmoji(entry.position) || `${entry.position}º`}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={entry.avatar_url} />
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <span>{entry.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {entry.class_name ?? '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {entry.value_label ?? entry.value}
                        </TableCell>
                        {rewardConfig?.ranking_rewards?.length ? (
                          <TableCell className="text-right">
                            {entry.coins_earned != null ? (
                              <span className="text-amber-600 dark:text-amber-400">
                                +{formatCoins(entry.coins_earned)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (page > 1) setPage((p) => p - 1);
                        }}
                        className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(p);
                            }}
                            isActive={page === p}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (page < totalPages) setPage((p) => p + 1);
                        }}
                        className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
