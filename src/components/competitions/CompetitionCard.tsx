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
  CheckCircle2,
  Clock,
  Eye,
  ListPlus,
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

interface CompetitionCardProps {
  competition: Competition;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onCancel?: (id: string) => void;
  onPublish?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddQuestions?: (id: string) => void;
  className?: string;
}

function isDraft(status: CompetitionStatus): boolean {
  const s = String(status).toLowerCase();
  return s === 'draft' || s === 'rascunho';
}

function getStatusConfig(status: CompetitionStatus) {
  const s = String(status).toLowerCase();
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
      return {
        label: 'Concluída',
        className: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:border-violet-800',
        icon: CheckCircle2,
      };
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
  onPublish,
  onDelete,
  onAddQuestions,
  className,
}: CompetitionCardProps) {
  const statusConfig = getStatusConfig(competition.status);
  const StatusIcon = statusConfig.icon;
  const draft = isDraft(competition.status);
  const cancelled = String(competition.status).toLowerCase() === 'cancelled' || String(competition.status).toLowerCase() === 'cancelada';
  const canAddQuestions = competition.question_mode === 'manual';

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
            {competition.subject_name ?? competition.subject_id} · Nível {competition.level}
          </CardDescription>
        </div>
        <Badge variant="secondary" className={cn('shrink-0 border font-medium', statusConfig.className)}>
          <StatusIcon className="mr-1 h-3 w-3" />
          {statusConfig.label}
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 pt-0 text-sm">
        {competition.enrollment_end && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            Inscrição até: {formatDate(competition.enrollment_end)}
          </p>
        )}
        {competition.application && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            Aplicação: {formatDate(competition.application)}
          </p>
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
          {onPublish && draft && (
            <Button size="sm" onClick={() => onPublish(competition.id)}>
              <Send className="mr-1 h-4 w-4" />
              Publicar
            </Button>
          )}
          {onAddQuestions && canAddQuestions && draft && (
            <Button variant="outline" size="sm" onClick={() => onAddQuestions(competition.id)}>
              <ListPlus className="mr-1 h-4 w-4" />
              Questões
            </Button>
          )}
        </div>
        {(onCancel || onDelete) && !cancelled && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onDelete && draft && (
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => onDelete(competition.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              )}
              {onCancel && (
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => onCancel(competition.id)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar competição
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardFooter>
    </Card>
  );
}
