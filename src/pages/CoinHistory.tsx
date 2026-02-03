import React, { useState, useEffect } from "react";
import { CoinBalance } from "@/components/Coins/CoinBalance";
import { getCoinTransactions, type CoinTransaction } from "@/services/coinsApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FilterType = "all" | "participation" | "ranking";

function filterTransactions(
  transactions: CoinTransaction[],
  filter: FilterType
): CoinTransaction[] {
  if (filter === "all") return transactions;
  if (filter === "participation")
    return transactions.filter((t) => t.reason === "competition_participation");
  if (filter === "ranking")
    return transactions.filter((t) => t.reason.startsWith("competition_rank_"));
  return transactions;
}

export default function CoinHistory() {
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchTransactions = async () => {
      try {
        setError(null);
        const res = await getCoinTransactions();
        if (!cancelled) setTransactions(res.transactions ?? []);
      } catch (err) {
        if (!cancelled) {
          setError("Erro ao carregar histórico");
          setTransactions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTransactions();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTransactions = filterTransactions(transactions, filter);

  return (
    <div className="coin-history space-y-6">
      <header>
        <h1 className="text-3xl font-bold mb-4">Histórico de Moedas</h1>
        <CoinBalance size="large" />
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="filters flex flex-wrap items-center gap-2">
            <Label htmlFor="filter-type" className="text-sm font-medium">
              Filtrar por tipo:
            </Label>
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as FilterType)}
            >
              <SelectTrigger id="filter-type" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="participation">Participação</SelectItem>
                <SelectItem value="ranking">Ranking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="transactions-list space-y-3">
            {loading ? (
              <div className="text-muted-foreground py-8 text-center">
                Carregando...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                Nenhuma transação ainda
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="transaction-card flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border bg-card"
                >
                  <div
                    className={`font-semibold ${
                      transaction.amount > 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {transaction.amount > 0 ? "+" : ""}
                    {transaction.amount}
                  </div>
                  <div className="flex-1 min-w-0 text-sm text-muted-foreground">
                    {transaction.description || transaction.reason}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(transaction.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Saldo: {transaction.balance_after}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
