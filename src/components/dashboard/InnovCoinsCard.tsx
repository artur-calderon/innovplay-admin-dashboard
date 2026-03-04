import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, ArrowUp, ExternalLink } from "lucide-react";
import { getBalance, getTransactions, type CoinTransaction } from "@/services/coinsApi";
import { formatCoins } from "@/utils/coins";

interface InnovCoinsCardProps {
  moedas?: {
    total: number;
    ganhasHoje?: number;
    historico?: Array<{ data: string; acao: string; valor: number }>;
  };
  /** Quando mudar, refaz a busca do saldo (ex.: após resgatar conquista). */
  refreshTrigger?: number;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const today = new Date();
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

const InnovCoinsCard: React.FC<InnovCoinsCardProps> = ({ moedas, refreshTrigger }) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [bal, tx] = await Promise.all([
          getBalance(),
          getTransactions({ limit: 5 }),
        ]);
        if (!cancelled) {
          setBalance(bal);
          setTransactions(tx);
        }
      } catch {
        if (!cancelled) {
          setBalance(moedas?.total ?? 0);
          setTransactions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [moedas?.total, refreshTrigger]);

  const ganhasHoje = transactions
    .filter((t) => t.amount > 0 && isToday(t.created_at))
    .reduce((sum, t) => sum + t.amount, 0);

  const displayBalance = balance ?? moedas?.total ?? 0;

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
          <div className="p-2 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-lg flex-shrink-0">
            <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="truncate">Afirme Coins</div>
            <div className="text-xs text-muted-foreground font-normal">Sua economia</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col min-h-0">
        {/* Saldo Atual */}
        <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full flex items-center justify-center">
              <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          {loading ? (
            <div className="text-2xl sm:text-3xl font-bold text-yellow-600 mb-1">—</div>
          ) : (
            <div className="text-2xl sm:text-3xl font-bold text-yellow-600 mb-1">
              {formatCoins(displayBalance)}
            </div>
          )}
          <div className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-600">Afirme Coins disponíveis</div>
          {!loading && ganhasHoje > 0 && (
            <div className="text-xs text-green-600 dark:text-green-400 flex items-center justify-center gap-1 mt-1">
              <ArrowUp className="w-3 h-3" />
              +{formatCoins(ganhasHoje)} hoje
            </div>
          )}
          <Link
            to="/aluno/moedas/historico"
            className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-primary hover:underline"
          >
            Ver histórico completo
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* Últimas transações (dados reais da API) */}
        <div className="mt-4">
          <div className="text-xs sm:text-sm font-medium text-foreground mb-2">Últimas transações:</div>
          <div className="space-y-1 text-xs">
            {loading ? (
              <div className="text-muted-foreground py-2">Carregando...</div>
            ) : transactions.length === 0 ? (
              <div className="text-muted-foreground py-2">Nenhuma transação ainda.</div>
            ) : (
              transactions.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground truncate">
                    {t.description || t.reason}
                  </span>
                  <span className={`font-medium flex-shrink-0 ${t.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {t.amount >= 0 ? "+" : ""}{formatCoins(t.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InnovCoinsCard;
