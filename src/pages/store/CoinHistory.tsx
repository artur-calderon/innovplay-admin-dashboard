import React, { useState, useEffect } from 'react';
import { Coins, TrendingUp, Award, List, Plus, Minus } from 'lucide-react';
import { CoinBalance } from '@/components/coins/CoinBalance';
import { getTransactions, type CoinTransaction } from '@/services/coinsApi';
import { formatCoins } from '@/utils/coins';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;
type FilterType = 'all' | 'participation' | 'ranking';

function filterTransactions(
  transactions: CoinTransaction[],
  filter: FilterType
): CoinTransaction[] {
  if (filter === 'all') return transactions;
  if (filter === 'participation')
    return transactions.filter((t) => t.reason === 'competition_participation');
  if (filter === 'ranking')
    return transactions.filter((t) => t.reason.startsWith('competition_rank_'));
  return transactions;
}

function formatTransactionDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  if (isToday) {
    return `Hoje às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const CoinHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const list = await getTransactions();
        setTransactions(list);
      } catch {
        // Silenciar erro ao buscar histórico
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const filteredTransactions = filterTransactions(transactions, filter);
  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = filteredTransactions.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE
  );

  return (
    <div className="container mx-auto py-6 px-4 space-y-6 max-w-4xl">
      {/* Hero: saldo em destaque */}
      <Card className="overflow-hidden border-2 border-amber-200/60 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg">
                <Coins className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-amber-900 dark:text-amber-100">
                  Afirme Coins
                </h1>
                <p className="text-sm text-amber-700/80 dark:text-amber-300/80">
                  Suas moedas ganhas em atividades e competições
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-center sm:text-right">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-1">
                  Saldo atual
                </p>
                <CoinBalance size="large" asCard />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros em abas */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <List className="h-5 w-5 text-muted-foreground" />
          Histórico de movimentações
        </h2>
        <Tabs
          value={filter}
          onValueChange={(v) => {
            setFilter(v as FilterType);
            setPage(0);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all" className="flex items-center gap-2">
              Todos
            </TabsTrigger>
            <TabsTrigger value="participation" className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" />
              Participação
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2">
              <Award className="h-3.5 w-3.5" />
              Ranking
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Coins className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">Nenhuma movimentação ainda</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Quando você ganhar ou usar moedas em competições e atividades, tudo aparecerá aqui.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {paginated.map((transaction) => {
                  const isCredit = transaction.amount > 0;
                  return (
                    <Card
                      key={transaction.id}
                      className={cn(
                        'transition-colors',
                        isCredit
                          ? 'border-green-200/70 dark:border-green-800/40 bg-green-50/30 dark:bg-green-950/20'
                          : 'border-red-200/70 dark:border-red-800/40 bg-red-50/30 dark:bg-red-950/20'
                      )}
                    >
                      <CardContent className="p-4 flex flex-wrap items-center gap-3 sm:gap-4">
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                            isCredit ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'
                          )}
                        >
                          {isCredit ? (
                            <Plus className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Minus className="h-5 w-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">
                            {transaction.description || transaction.reason}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatTransactionDate(transaction.created_at)}
                          </p>
                        </div>
                        <div className="flex items-baseline gap-3 shrink-0">
                          <span
                            className={cn(
                              'text-lg font-bold tabular-nums',
                              isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            )}
                          >
                            {isCredit ? '+' : ''}{formatCoins(transaction.amount)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Saldo: {formatCoins(transaction.balance_after)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      Página {currentPage + 1} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage >= totalPages - 1}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CoinHistory;
