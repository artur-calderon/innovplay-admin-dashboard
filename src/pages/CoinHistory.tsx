import React, { useState, useEffect } from 'react';
import { Coins } from 'lucide-react';
import { CoinBalance } from '@/components/Coins/CoinBalance';
import { getTransactions, type CoinTransaction } from '@/services/coinsApi';
import { formatCoins } from '@/utils/coins';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

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
      } catch (error) {
        console.error('Erro ao buscar histórico:', error);
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
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Coins className="h-8 w-8 text-primary" />
            Histórico de Moedas
          </h1>
          <p className="text-muted-foreground">
            Consulte seu saldo e o histórico de transações de moedas.
          </p>
        </div>
        <CoinBalance size="large" />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Label className="shrink-0">Filtrar por tipo:</Label>
        <Select
          value={filter}
          onValueChange={(v) => {
            setFilter(v as FilterType);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="participation">Participação</SelectItem>
            <SelectItem value="ranking">Ranking</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transações</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Coins className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="font-medium text-muted-foreground">Nenhuma transação ainda</p>
              <p className="text-sm text-muted-foreground mt-1">
                Suas movimentações de moedas aparecerão aqui.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Valor</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Saldo após</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <span
                            className={
                              transaction.amount > 0
                                ? 'text-green-600 dark:text-green-400 font-medium'
                                : 'text-red-600 dark:text-red-400 font-medium'
                            }
                          >
                            {transaction.amount > 0 ? '+' : ''}
                            {formatCoins(transaction.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {transaction.description || transaction.reason}
                        </TableCell>
                        <TableCell>
                          {new Date(transaction.created_at).toLocaleDateString(
                            'pt-BR'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCoins(transaction.balance_after)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
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
                      onClick={() =>
                        setPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={currentPage >= totalPages - 1}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CoinHistory;
