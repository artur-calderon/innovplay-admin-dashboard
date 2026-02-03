import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins } from 'lucide-react';
import { getBalance } from '@/services/coinsApi';
import { formatCoins } from '@/utils/coins';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface CoinBalanceProps {
  studentId?: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const sizeClasses = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-2xl',
};

export const CoinBalance: React.FC<CoinBalanceProps> = ({
  studentId,
  size = 'medium',
  showLabel = true,
}) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchBalance = async () => {
      setLoading(true);
      setError(null);
      try {
        const value = await getBalance(studentId);
        if (!cancelled) setBalance(value);
      } catch (err) {
        if (!cancelled) {
          console.error('Erro ao buscar saldo:', err);
          setError('Erro ao carregar saldo');
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
        className={`coin-balance coin-balance--${size} flex items-center gap-2 animate-pulse`}
        data-testid="coin-balance"
      >
        <Coins className={sizeClasses[size]} />
        <span className={sizeClasses[size]}>—</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`coin-balance coin-balance--${size} flex items-center gap-2 text-muted-foreground`}
        data-testid="coin-balance"
      >
        <Coins className={sizeClasses[size]} />
        <span className={sizeClasses[size]}>{error}</span>
      </div>
    );
  }

  const displayValue = balance ?? 0;
  const content = (
    <div
      className={`coin-balance coin-balance--${size} flex items-center gap-2`}
      data-testid="coin-balance"
    >
      <Coins className={sizeClasses[size]} />
      <span className={sizeClasses[size]}>{formatCoins(displayValue)}</span>
      {showLabel && (
        <span className="text-muted-foreground text-sm">moedas</span>
      )}
    </div>
  );

  const showHistoryLink = !studentId;
  if (showHistoryLink) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/aluno/moedas/historico"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {content}
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>Ver histórico</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};
