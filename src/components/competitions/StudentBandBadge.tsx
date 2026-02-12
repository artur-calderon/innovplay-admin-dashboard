import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { getBandColor, type CompetitionBand } from '@/utils/competitionGamification';

interface StudentBandBadgeProps {
  band: CompetitionBand | string;
}

export function StudentBandBadge({ band }: StudentBandBadgeProps) {
  const color = getBandColor(band);

  const style = color
    ? {
        borderColor: color,
        color,
        backgroundColor: 'transparent',
      }
    : undefined;

  return (
    <Badge
      variant="outline"
      className="ml-1 inline-flex items-center gap-1 text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full"
      style={style}
    >
      <Star className="h-3 w-3" />
      <span className="max-w-[80px] truncate">{band}</span>
    </Badge>
  );
}


