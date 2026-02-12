/**
 * Componente de countdown para eventos de competição.
 * Exibe tempo restante até uma data específica de forma bem minimalista.
 */
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CompetitionCountdownProps {
  /** Data alvo no formato ISO string */
  targetDate: string | null | undefined;
  /** Label a ser exibido antes do countdown (ex: "Inscrição fecha em") */
  label: string;
  /** Classe CSS adicional para o container */
  className?: string;
  /** Variante do badge (default: "secondary") */
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

/**
 * Formata o tempo restante em formato legível.
 * Retorna "Xd Xh Xm", "Xh Xm", "Xm" ou "Expirado"
 */
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Expirado';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (remainingHours > 0) {
    parts.push(`${remainingHours}h`);
  }
  if (remainingMinutes > 0 || days === 0) {
    parts.push(`${remainingMinutes}m`);
  }

  // Se for menos de 1 minuto, mostrar segundos também
  if (days === 0 && remainingHours === 0 && remainingMinutes === 0 && remainingSeconds > 0) {
    return `${remainingSeconds}s`;
  }

  return parts.join(' ') || '0m';
}

export function CompetitionCountdown({
  targetDate,
  label,
  className = '',
  variant = 'secondary',
}: CompetitionCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!targetDate) {
      setTimeRemaining('—');
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const target = new Date(targetDate).getTime();
      const diff = target - now;
      setTimeRemaining(formatTimeRemaining(diff));
    };

    // Atualizar imediatamente
    updateCountdown();

    // Atualizar a cada segundo
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate) {
    return null;
  }

  const isExpired = timeRemaining === 'Expirado';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs text-muted-foreground',
        className,
      )}
    >
      <Clock className="h-3 w-3" />
      <span className={cn(isExpired && 'opacity-70')}>
        {label}: {isExpired ? 'encerrado' : timeRemaining}
      </span>
    </span>
  );
}
