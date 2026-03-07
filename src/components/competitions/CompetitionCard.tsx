import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  CalendarRange,
  CheckCircle2,
  Clock,
  Eye,
  MoreVertical,
  Pencil,
  Play,
  Send,
  Trash2,
  Trophy,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Competition, CompetitionStatus } from '@/types/competition-types';
import { formatCompetitionLevel } from '@/utils/competitionLevel';
import { CompetitionCountdown } from '@/components/competitions/CompetitionCountdown';

interface CompetitionCardProps {
  competition: Competition;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onCancel?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Fluxo unificado: abre modal para agendar inscrição/prova e publicar. */
  onScheduleAndPublish?: (id: string) => void;
  className?: string;
}

function isDraft(status: CompetitionStatus): boolean {
  const s = String(status).toLowerCase();
  return s === 'draft' || s === 'rascunho';
}

const finalizadaConfig = {
  label: 'Finalizada',
  className: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:border-violet-800',
  icon: CheckCircle2,
};

const emAndamentoConfig = {
  label: 'Em andamento',
  className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800',
  icon: Play,
};

function getStatusConfig(status: CompetitionStatus, competition?: { expiration?: string; application?: string } | null) {
  const s = String(status).toLowerCase();
  const now = Date.now();
  const applicationStarted = competition?.application ? new Date(competition.application).getTime() <= now : false;
  const applicationEnded = competition?.expiration ? new Date(competition.expiration).getTime() < now : false;
  // Finalizada somente quando o prazo de expiração terminou
  if (applicationEnded) return finalizadaConfig;
  // Dentro do horário de aplicação (prova começou e ainda não expirou) → Em andamento
  if (applicationStarted) return emAndamentoConfig;
  if (s === 'draft' || s === 'rascunho')
    return {
      label: 'Rascunho',
      className: 'bg-muted text-muted-foreground border-border dark:bg-muted/80',
      icon: Clock,
    };
  if (s === 'aberta' || s === 'enrollment_open')
    return {
      label: s === 'aberta' ? 'Aberta' : 'Inscrições abertas',
      className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800',
      icon: Play,
    };
  switch (status) {
    case 'scheduled':
      return {
        label: 'Agendada',
        className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800',
        icon: Calendar,
      };
    case 'enrollment_open':
      return {
        label: 'Inscrições abertas',
        className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800',
        icon: Play,
      };
    case 'active':
      return {
        label: 'Ativa',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800',
        icon: Play,
      };
    case 'completed':
      // Só mostra Finalizada quando expiration passou (já tratado no início da função)
      return emAndamentoConfig;
    case 'cancelled':
      return {
        label: 'Cancelada',
        className: 'bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20 dark:border-destructive/30',
        icon: XCircle,
      };
    default:
      if (s === 'cancelada')
        return {
          label: 'Cancelada',
          className: 'bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20 dark:border-destructive/30',
          icon: XCircle,
        };
      return {
        label: 'Desconhecido',
        className: 'bg-muted text-muted-foreground border-border dark:bg-muted/80',
        icon: Clock,
      };
  }
}

function formatDate(value: string | undefined) {
  if (!value) return '—';
  try {
    return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return value;
  }
}

export function CompetitionCard({
  competition,
  onView,
  onEdit,
  onCancel,
  onDelete,
  onScheduleAndPublish,
  className,
}: CompetitionCardProps) {
  const statusConfig = getStatusConfig(competition.status, competition);
  const StatusIcon = statusConfig.icon;
  const draft = isDraft(competition.status);
  const cancelled = String(competition.status).toLowerCase() === 'cancelled' || String(competition.status).toLowerCase() === 'cancelada';

  return (
    <Card className={cn('flex flex-col transition-shadow hover:shadow-md', className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Trophy className="h-4 w-4" />
            </span>
            <span className="truncate">{competition.name}</span>
          </CardTitle>
          <CardDescription>
            {competition.subject_name ?? competition.subject_id} · {formatCompetitionLevel(competition.level)}
          </CardDescription>
        </div>
        <Badge variant="secondary" className={cn('shrink-0 border font-medium', statusConfig.className)}>
          <StatusIcon className="mr-1 h-3 w-3" />
          {statusConfig.label}
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 pt-0 text-sm">
        {competition.enrollment_end && (
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              Inscrição até: {formatDate(competition.enrollment_end)}
            </p>
            <CompetitionCountdown
              targetDate={competition.enrollment_end}
              label="Inscrição fecha em"
              variant="secondary"
            />
          </div>
        )}
        {competition.application && (
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Aplicação: {formatDate(competition.application)}
            </p>
            <CompetitionCountdown
              targetDate={competition.application}
              label="Prova abre em"
              variant="secondary"
            />
          </div>
        )}
        {competition.expiration && (
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-2 text-muted-foreground">
              <CalendarRange className="h-3.5 w-3.5 shrink-0" />
              Expiração: {formatDate(competition.expiration)}
            </p>
            <CompetitionCountdown
              targetDate={competition.expiration}
              label="Prova fecha em"
              variant="secondary"
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t pt-4">
        <div className="flex flex-wrap gap-2">
          {onView && (
            <Button variant="outline" size="sm" onClick={() => onView(competition.id)}>
              <Eye className="mr-1 h-4 w-4" />
              Ver
            </Button>
          )}
          {onEdit && draft && (
            <Button variant="outline" size="sm" onClick={() => onEdit(competition.id)}>
              <Pencil className="mr-1 h-4 w-4" />
              Editar
            </Button>
          )}
          {onScheduleAndPublish && draft && (
            <Button
              size="sm"
              onClick={() => onScheduleAndPublish(competition.id)}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Send className="mr-1 h-4 w-4" />
              Aplicação
            </Button>
          )}
        </div>
        {onDelete && (draft || cancelled) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => onDelete(competition.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardFooter>
    </Card>
  );
}
