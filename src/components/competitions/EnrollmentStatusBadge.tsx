import React from 'react';
import { Badge } from '@/components/ui/badge';

export type EnrollmentStatus =
  | 'not_enrolled'
  | 'enrolled'
  | 'full'
  | 'enrollment_closed'
  | 'finished';

export interface EnrollmentStatusBadgeProps {
  status: EnrollmentStatus;
}

const LABELS: Record<EnrollmentStatus, string> = {
  not_enrolled: 'Não inscrito',
  enrolled: 'Inscrito',
  full: 'Vagas esgotadas',
  enrollment_closed: 'Inscrição encerrada',
  finished: 'Competição encerrada',
};

export function EnrollmentStatusBadge({ status }: EnrollmentStatusBadgeProps) {
  const label = LABELS[status];

  if (status === 'enrolled') {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
        {label}
      </Badge>
    );
  }

  if (status === 'full') {
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200">
        {label}
      </Badge>
    );
  }

  if (status === 'enrollment_closed') {
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
        {label}
      </Badge>
    );
  }

  if (status === 'finished') {
    return (
      <Badge className="bg-slate-200 text-slate-800 dark:bg-slate-900/60 dark:text-slate-100">
        {label}
      </Badge>
    );
  }

  return <Badge variant="outline">{label}</Badge>;
}

