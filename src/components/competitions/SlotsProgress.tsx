import React from 'react';
import { Progress } from '@/components/ui/progress';

export interface SlotsProgressProps {
  enrolledCount?: number | null;
  maxParticipants?: number | null;
}

export function SlotsProgress({ enrolledCount = 0, maxParticipants }: SlotsProgressProps) {
  const hasLimit = maxParticipants != null && maxParticipants > 0;

  if (!hasLimit) {
    return <p className="text-sm font-medium">Vagas ilimitadas</p>;
  }

  const safeMax = maxParticipants!;
  const filled = Math.min(enrolledCount, safeMax);
  const progressPercent = Math.min(100, (filled / safeMax) * 100);
  const remaining = Math.max(safeMax - filled, 0);

  return (
    <div className="space-y-2">
      <p className="text-sm">
        Vagas: {filled} de {safeMax} preenchidas
      </p>
      <Progress value={progressPercent} className="h-3" />
      <p className="text-xs text-muted-foreground">
        Restam {remaining} vaga{remaining === 1 ? '' : 's'}.
      </p>
    </div>
  );
}

