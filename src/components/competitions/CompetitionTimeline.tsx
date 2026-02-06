import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface CompetitionTimelineProps {
  enrollmentStart?: string | null;
  enrollmentEnd?: string | null;
  application?: string | null;
  expiration?: string | null;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return format(new Date(value), "dd/MM 'às' HH:mm", { locale: ptBR });
  } catch {
    return value;
  }
}

export function CompetitionTimeline({
  enrollmentStart,
  enrollmentEnd,
  application,
  expiration,
}: CompetitionTimelineProps) {
  const now = Date.now();
  const enrollmentStartTs = enrollmentStart ? new Date(enrollmentStart).getTime() : null;
  const enrollmentEndTs = enrollmentEnd ? new Date(enrollmentEnd).getTime() : null;
  const applicationTs = application ? new Date(application).getTime() : null;
  const expirationTs = expiration ? new Date(expiration).getTime() : null;

  const inEnrollment =
    (enrollmentStartTs == null || enrollmentStartTs <= now) &&
    (enrollmentEndTs == null || enrollmentEndTs >= now);

  const inApplication =
    applicationTs != null &&
    ((expirationTs != null && now >= applicationTs && now <= expirationTs) ||
      (expirationTs == null && now >= applicationTs));

  const beforeEnrollment = enrollmentStartTs != null && now < enrollmentStartTs;
  const betweenEnrollmentAndExam =
    !beforeEnrollment &&
    !inApplication &&
    enrollmentEndTs != null &&
    applicationTs != null &&
    now >= enrollmentEndTs &&
    now < applicationTs;

  const examInProgress = inApplication;

  let helperText: string | null = null;
  if (beforeEnrollment && enrollmentStart) {
    helperText = `Inscrições abrem em ${formatDateTime(enrollmentStart)}`;
  } else if (betweenEnrollmentAndExam && application) {
    helperText = `Prova começa em ${formatDateTime(application)}`;
  } else if (examInProgress && expiration) {
    helperText = `Prova encerra em ${formatDateTime(expiration)}`;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div
          className={`relative rounded-lg border p-4 ${
            inEnrollment && !inApplication ? 'border-primary bg-primary/5' : ''
          }`}
        >
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Inscrições
          </p>
          <p className="text-sm font-medium">
            {formatDateTime(enrollmentStart)} → {formatDateTime(enrollmentEnd)}
          </p>
          {inEnrollment && !inApplication && (
            <Badge className="mt-2 bg-primary/20 text-primary">Em andamento</Badge>
          )}
        </div>

        <div
          className={`relative rounded-lg border p-4 ${
            inApplication ? 'border-primary bg-primary/5' : ''
          }`}
        >
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            Prova
          </p>
          <p className="text-sm font-medium">
            {formatDateTime(application)} → {formatDateTime(expiration)}
          </p>
          {inApplication && (
            <Badge className="mt-2 bg-primary/20 text-primary">Em aplicação</Badge>
          )}
        </div>
      </div>

      {helperText && (
        <p className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  );
}

