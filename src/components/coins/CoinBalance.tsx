import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coins } from "lucide-react";
import { getCoinBalance } from "@/services/coinsApi";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

export interface CoinBalanceProps {
  studentId?: string;
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
  /** Se true, envolve em link para histórico (só faz sentido para aluno) */
  linkToHistory?: boolean;
}

const sizeClasses = {
  small: "text-sm",
  medium: "text-base",
  large: "text-2xl",
};

export const CoinBalance: React.FC<CoinBalanceProps> = ({
  studentId,
  size = "medium",
  showLabel = true,
  linkToHistory = false,
}) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchBalance = async () => {
      try {
        setError(null);
        const res = await getCoinBalance(studentId);
        if (!cancelled) setBalance(res.balance);
      } catch (err) {
        if (!cancelled) {
          setError("Erro ao buscar saldo");
          setBalance(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchBalance();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading) {
    return (
      <div
        className={`coin-balance coin-balance--${size} flex items-center gap-2 text-muted-foreground ${sizeClasses[size]}`}
        data-testid="coin-balance"
      >
        <Coins className={sizeClasses[size]} />
        <span>Carregando...</span>
      </div>
    );
  }

  const displayBalance = balance ?? 0;
  const content = (
    <div
      className={`coin-balance coin-balance--${size} flex items-center gap-2 ${sizeClasses[size]}`}
      data-testid="coin-balance"
    >
      <Coins className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
      <span className="font-medium">{displayBalance}</span>
      {showLabel && (
        <span className="text-muted-foreground text-sm">moedas</span>
      )}
    </div>
  );

  if (error) {
    return (
      <div
        className={`coin-balance coin-balance--${size} flex items-center gap-2 ${sizeClasses[size]} text-muted-foreground`}
        data-testid="coin-balance"
        title={error}
      >
        <Coins className={sizeClasses[size]} />
        <span>{displayBalance}</span>
        {showLabel && <span className="text-sm">moedas</span>}
      </div>
    );
  }

  if (linkToHistory) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/aluno/moedas/historico"
              className="hover:opacity-80 transition-opacity"
            >
              {content}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Ver histórico completo</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};
