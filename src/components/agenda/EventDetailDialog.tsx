import type { ReactNode } from 'react';
import type { EventInput } from '@fullcalendar/core';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BookOpen,
  CalendarDays,
  Clock,
  Download,
  ExternalLink,
  FileStack,
  GraduationCap,
  Link2,
  MapPin,
  Trash2,
  User,
  Users2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

export interface EventDetailFileResource {
  id: string;
  title?: string;
  file_name?: string;
}

export interface EventDetailContextFields {
  subject?: string;
  teacher?: string;
  /** Usado como local quando não há `extendedProps.location` */
  room?: string;
}

export interface EventDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: EventInput | null;
  /** Linhas de texto sobre destinatários (`summarizeStoredTargets`, etc.) */
  audienceLines?: string[] | null;
  /** Campos extras (ex.: disciplina/professor na agenda do aluno) */
  contextFields?: EventDetailContextFields;
  /** Mensagem quando não há descrição */
  emptyDescriptionHint?: string;
  /** Permite remover anexo no modal (admin); aluno só baixa */
  onDeleteFile?: (eventId: string, resourceId: string) => void;
  onDownloadFile?: (eventId: string, resourceId: string) => void;
  /** Rodapé completo; se omitido, exibe só "Fechar" */
  footer?: ReactNode;
}

function hasTimeInfo(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  return dateStr.includes('T') || (dateStr.includes(':') && dateStr.length > 10);
}

export function EventDetailDialog({
  open,
  onOpenChange,
  selected,
  audienceLines,
  contextFields,
  emptyDescriptionHint = 'Sem descrição para este evento.',
  onDeleteFile,
  onDownloadFile,
  footer,
}: EventDetailDialogProps) {
  const ep = selected?.extendedProps || {};
  const linkResources = Array.isArray(ep.resources)
    ? ep.resources.filter((r: any) => r?.type === 'link')
    : [];
  const fileResources: EventDetailFileResource[] = Array.isArray(ep.resources)
    ? ep.resources.filter((r: any) => r?.type === 'file')
    : [];

  const locationText = (ep.location as string | undefined) || contextFields?.room;
  const showClassInfo =
    !!(contextFields?.subject?.trim() || contextFields?.teacher?.trim());

  const hasAudience = !!(audienceLines && audienceLines.length > 0);
  const showEmptyState =
    !selected?.start &&
    !locationText &&
    !hasAudience &&
    linkResources.length === 0 &&
    fileResources.length === 0 &&
    !showClassInfo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full p-0 gap-0 overflow-hidden border-border/60 shadow-xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/[0.12] via-background to-violet-500/[0.08] dark:from-primary/20 dark:via-background dark:to-fuchsia-950/40 px-5 pt-6 pb-5 sm:px-6 border-b border-border/50">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <DialogHeader className="space-y-0 text-left">
            <div className="flex gap-4 pr-10">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-background/80 shadow-md ring-1 ring-primary/25 backdrop-blur-sm dark:bg-card/90">
                <CalendarDays className="h-7 w-7 text-primary" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
                  {selected?.title || 'Evento'}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                  {typeof ep.description === 'string' && ep.description.trim()
                    ? ep.description
                    : emptyDescriptionHint}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="max-h-[min(56vh,420px)] overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 space-y-4">
          {showClassInfo && (
            <Card className="border-border/70 shadow-sm overflow-hidden bg-card/50">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-3 py-2">
                  <GraduationCap className="h-4 w-4 text-primary shrink-0" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Aula / disciplina
                  </span>
                </div>
                <div className="space-y-3 px-3 py-3 text-sm">
                  {contextFields?.subject?.trim() && (
                    <div className="flex gap-3">
                      <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Disciplina</span>
                        <p className="font-medium text-foreground">{contextFields.subject}</p>
                      </div>
                    </div>
                  )}
                  {contextFields?.teacher?.trim() && (
                    <div className="flex gap-3">
                      <User className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Professor(a)</span>
                        <p className="font-medium text-foreground">{contextFields.teacher}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {selected?.start && (
            <Card className="border-border/70 shadow-sm overflow-hidden bg-card/50">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-3 py-2">
                  <Clock className="h-4 w-4 text-primary shrink-0" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Data e horário
                  </span>
                </div>
                <div className="space-y-3 px-3 py-3 text-sm">
                  <div className="flex gap-3">
                    <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground pt-0.5">
                      {hasTimeInfo(selected.start as string) ? 'Início' : 'Data'}
                    </span>
                    <p className="font-medium text-foreground leading-snug">
                      {hasTimeInfo(selected.start as string)
                        ? format(
                            new Date(selected.start as string),
                            "EEEE, dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )
                        : format(new Date(selected.start as string), 'EEEE, dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  {selected?.end && hasTimeInfo(selected.end as string) && (
                    <>
                      <Separator className="bg-border/60" />
                      <div className="flex gap-3">
                        <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground pt-0.5">
                          Fim
                        </span>
                        <p className="font-medium text-foreground leading-snug">
                          {format(
                            new Date(selected.end as string),
                            "EEEE, dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )}
                        </p>
                      </div>
                    </>
                  )}
                  {selected?.end && !hasTimeInfo(selected.end as string) && (
                    <>
                      <Separator className="bg-border/60" />
                      <div className="flex gap-3">
                        <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground pt-0.5">
                          Até
                        </span>
                        <p className="font-medium text-foreground leading-snug">
                          {format(new Date(selected.end as string), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {locationText && (
            <Card className="border-border/70 shadow-sm overflow-hidden bg-card/50">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-3 py-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Local
                  </span>
                </div>
                <p className="px-3 py-3 text-sm font-medium text-foreground leading-relaxed">
                  {locationText}
                </p>
              </CardContent>
            </Card>
          )}

          {hasAudience && (
            <Card className="border-primary/20 shadow-sm overflow-hidden bg-primary/[0.04] dark:bg-primary/10">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 border-b border-primary/15 bg-primary/5 px-3 py-2 dark:bg-primary/10">
                  <Users2 className="h-4 w-4 text-primary shrink-0" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wide text-foreground/80">
                    Quem recebe
                  </span>
                </div>
                <ul className="space-y-2 px-3 py-3 text-sm text-foreground leading-relaxed">
                  {audienceLines!.map((line, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70"
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {linkResources.length > 0 && (
            <Card className="border-border/70 shadow-sm overflow-hidden bg-card/50">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-3 py-2">
                  <Link2 className="h-4 w-4 text-primary shrink-0" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Links
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-3">
                  {linkResources.map((resource: any) => (
                    <a
                      key={resource.id || resource.url}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/80 px-3 py-2.5 text-sm shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
                    >
                      <span className="min-w-0 flex-1 font-medium text-foreground group-hover:text-primary">
                        {resource.title || resource.url}
                      </span>
                      <ExternalLink
                        className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary"
                        aria-hidden
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {fileResources.length > 0 && (
            <Card className="border-border/70 shadow-sm overflow-hidden bg-card/50">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-3 py-2">
                  <FileStack className="h-4 w-4 text-primary shrink-0" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Arquivos
                  </span>
                </div>
                <div className="divide-y divide-border/50">
                  {fileResources.map((resource) => (
                    <div key={resource.id} className="flex items-center gap-2 px-3 py-2.5">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium text-foreground">
                          {resource.title || resource.file_name || 'Arquivo'}
                        </span>
                        {resource.file_name && resource.title !== resource.file_name && (
                          <span className="truncate text-xs text-muted-foreground">
                            {resource.file_name}
                          </span>
                        )}
                      </div>
                      {onDownloadFile && selected?.id && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0 h-9 w-9"
                          title="Baixar"
                          onClick={() => onDownloadFile(String(selected.id), resource.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {onDeleteFile && selected?.id && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-9 w-9 text-destructive hover:text-destructive"
                          title="Remover anexo"
                          onClick={() => onDeleteFile(String(selected.id), resource.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {showEmptyState && (
            <p className="text-center text-sm text-muted-foreground py-6 px-2">
              Este evento ainda não tem horário ou detalhes extras visíveis aqui.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 border-t border-border/50 bg-muted/20 px-4 py-4 sm:flex-row sm:justify-between sm:px-6 sm:py-4">
          {footer ?? (
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
