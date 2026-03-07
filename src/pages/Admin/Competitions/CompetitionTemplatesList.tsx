/**
 * Lista de templates de competições (admin, coordenador, diretor, tec admin).
 * Rota: /app/competition-templates
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Layers, Plus, Eye, Power, PowerOff, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getCompetitionTemplates,
  activateCompetitionTemplate,
  deactivateCompetitionTemplate,
  createCompetitionTemplate,
  type CompetitionTemplate,
  type CreateCompetitionTemplatePayload,
} from '@/services/competitionTemplatesApi';
import { CompetitionTemplateForm } from '@/components/competitions/CompetitionTemplateForm';

function formatRecurrence(rec: string | undefined): string {
  const r = (rec ?? '').toLowerCase();
  if (r === 'weekly') return 'Semanal';
  if (r === 'biweekly') return 'Quinzenal';
  if (r === 'monthly') return 'Mensal';
  return rec ?? '—';
}

export default function CompetitionTemplatesList() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<CompetitionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getCompetitionTemplates(showOnlyActive ? { active: true } : undefined);
      setTemplates(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Erro ao carregar templates de competições:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os templates de competições.',
        variant: 'destructive',
      });
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [showOnlyActive, toast]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const visibleTemplates = useMemo(
    () =>
      templates.filter((t) => (showOnlyActive ? t.active : true)),
    [templates, showOnlyActive],
  );

  const handleToggleActive = async (template: CompetitionTemplate) => {
    setActionLoadingId(template.id);
    try {
      const fn = template.active ? deactivateCompetitionTemplate : activateCompetitionTemplate;
      const updated = await fn(template.id);
      toast({
        title: template.active ? 'Template desativado.' : 'Template ativado.',
      });
      setTemplates((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
    } catch (error) {
      console.error('Erro ao alterar status do template:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status do template.',
        variant: 'destructive',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreate = async (payload: CreateCompetitionTemplatePayload) => {
    setCreateSubmitting(true);
    try {
      const created = await createCompetitionTemplate(payload);
      toast({
        title: 'Template criado com sucesso.',
      });
      setCreateOpen(false);
      setTemplates((prev) => [created, ...prev]);
    } catch (error: unknown) {
      console.error('Erro ao criar template de competição:', error);
      const msg =
        (error as { message?: string })?.message ??
        'Não foi possível criar o template.';
      toast({
        title: 'Erro',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto space-y-6 py-6 px-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="flex flex-wrap items-center gap-2 sm:gap-3 text-2xl sm:text-3xl font-bold tracking-tight">
            <span className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-2 sm:p-2.5 text-white shadow-sm shrink-0">
              <Layers className="h-6 w-6 sm:h-7 sm:w-7" />
            </span>
            Templates de Competições
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Defina modelos recorrentes de competições por disciplina e nível. O backend
            cuida das datas e gera automaticamente as próximas edições.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center justify-center sm:justify-end w-full sm:w-auto">
          <div className="flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2"
                    onClick={() => setShowOnlyActive((prev) => !prev)}
                  >
                    <Switch
                      id="templates-only-active"
                      checked={showOnlyActive}
                      onCheckedChange={(checked) =>
                        setShowOnlyActive(checked === true)
                      }
                    />
                    <label
                      htmlFor="templates-only-active"
                      className="text-xs sm:text-sm text-muted-foreground cursor-pointer"
                    >
                      Mostrar apenas ativos
                    </label>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Oculte rapidamente templates inativos da lista.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => void fetchTemplates()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              Novo Template
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">
            Templates cadastrados
          </CardTitle>
          <Badge variant="outline">
            {visibleTemplates.length} {visibleTemplates.length === 1 ? 'template' : 'templates'}
          </Badge>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Carregando templates...
            </div>
          ) : visibleTemplates.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Layers className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">Nenhum template encontrado.</p>
              <p className="mt-1 text-xs">
                Clique em <span className="font-semibold">“Novo Template”</span> para criar
                seu primeiro modelo de competição.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Disciplina</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Recorrência</TableHead>
                    <TableHead>Escopo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[160px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleTemplates.map((tpl) => (
                    <TableRow key={tpl.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{tpl.name}</span>
                          {tpl.competitions && tpl.competitions.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {tpl.competitions.length}{' '}
                              {tpl.competitions.length === 1
                                ? 'edição gerada'
                                : 'edições geradas'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{tpl.subject_name ?? tpl.subject_id}</TableCell>
                      <TableCell>{tpl.level}</TableCell>
                      <TableCell>{formatRecurrence(tpl.recurrence)}</TableCell>
                      <TableCell className="capitalize">
                        {tpl.scope ?? 'global'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tpl.active ? 'default' : 'outline'}
                          className={tpl.active ? 'bg-emerald-500 text-white' : ''}
                        >
                          {tpl.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() =>
                                    navigate(`/app/competition-templates/${tpl.id}`)
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Ver detalhes</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={tpl.active ? 'outline' : 'default'}
                                  size="icon"
                                  onClick={() => void handleToggleActive(tpl)}
                                  disabled={actionLoadingId === tpl.id}
                                >
                                  {tpl.active ? (
                                    <PowerOff className="h-4 w-4" />
                                  ) : (
                                    <Power className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {tpl.active
                                    ? 'Desativar template'
                                    : 'Ativar template'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo template de competição</DialogTitle>
          </DialogHeader>
          <CompetitionTemplateForm
            submitting={createSubmitting}
            onSubmit={handleCreate}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

