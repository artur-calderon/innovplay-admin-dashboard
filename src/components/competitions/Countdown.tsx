import React, { useEffect, useState } from 'react';

export interface CountdownProps {
  targetDate?: string | Date | null;
  label: string;
}

function computeRemaining(target: Date | null): string | null {
  if (!target) return null;
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return null;

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return parts.join(' ');
}

export function Countdown({ targetDate, label }: CountdownProps) {
  const [text, setText] = useState<string | null>(() => {
    if (!targetDate) return null;
    const target =
      typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
    return computeRemaining(target);
  });

  useEffect(() => {
    if (!targetDate) return;
    const target =
      typeof targetDate === 'string' ? new Date(targetDate) : targetDate;

    const update = () => {
      setText(computeRemaining(target));
    };

    update();
    const id = window.setInterval(update, 30_000); // atualiza a cada 30s
    return () => window.clearInterval(id);
  }, [targetDate]);

  if (!targetDate || !text) return null;

  return (
    <p className="text-xs text-muted-foreground">
      {label} em: <span className="font-medium">{text}</span>
    </p>
  );
}

