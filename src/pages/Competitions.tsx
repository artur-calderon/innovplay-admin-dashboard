import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Filter, Trophy, Search, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import {
  getCompetitions,
  deleteCompetition,
  publishCompetition,
  cancelCompetition,
} from '@/services/competitionsApi';
import type { Competition, CompetitionFilters } from '@/types/competition-types';
import { CompetitionCard } from '@/components/competitions/CompetitionCard';
import { CreateCompetitionModal } from '@/components/competitions/CreateCompetitionModal';
import { CompetitionDetailModal } from '@/components/competitions/CompetitionDetailModal';
import { AddQuestionsModal } from '@/components/competitions/AddQuestionsModal';

interface SubjectOption {
  id: string;
  name: string;
}

const DEFAULT_FILTERS: CompetitionFilters = {
  status: 'all',
  subject_id: 'all',
  level: 'all',
};

export default function Competitions() {
  const { toast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [filters, setFilters] = useState<CompetitionFilters>(DEFAULT_FILTERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [addQuestionsId, setAddQuestionsId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [publishId, setPublishId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.subject_id !== 'all' ||
    filters.level !== 'all' ||
    searchTerm.length > 0;

  const filteredCompetitions = useMemo(() => {
    if (!searchTerm.trim()) return competitions;
    const term = searchTerm.trim().toLowerCase();
    return competitions.filter(
      (c) => c.name?.toLowerCase().includes(term) || c.subject_name?.toLowerCase().includes(term)
    );
  }, [competitions, searchTerm]);

  const fetchCompetitions = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getCompetitions(filters);
      setCompetitions(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Erro ao carregar competições:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as competições.',
        variant: 'destructive',
      });
      setCompetitions([]);
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

  useEffect(() => {
    let cancelled = false;
    api.get<SubjectOption[]>('/subjects').then((res) => {
      if (!cancelled && Array.isArray(res.data)) {
        setSubjects(res.data);
      }
    }).catch(() => {
      if (!cancelled) setSubjects([]);
    });
    return () => { cancelled = true; };
  }, []);

  const handleView = (id: string) => setDetailId(id);
  const handleEdit = (id: string) => setEditId(id);
  const handleAddQuestions = (id: string) => setAddQuestionsId(id);
  const handleDeleteClick = (id: string) => setDeleteId(id);
  const handleCancelClick = (id: string) => setCancelId(id);
  const handlePublishClick = (id: string) => setPublishId(id);

  const canEdit = (c: Competition) =>
    String(c.status).toLowerCase() === 'rascunho' || String(c.status).toLowerCase() === 'draft';

  const runAction = async (
    id: string,
    fn: () => Promise<unknown>,
    successMsg: string,
    errorMsg: string
  ) => {
    setActionLoading(true);
    try {
      await fn();
      toast({ title: successMsg });
      fetchCompetitions();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        errorMsg;
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await runAction(
      deleteId,
      () => deleteCompetition(deleteId),
      'Competição excluída.',
      'Não foi possível excluir a competição.'
    );
    setDeleteId(null);
  };

  const confirmCancel = async () => {
    if (!cancelId) return;
    await runAction(
      cancelId,
      () => cancelCompetition(cancelId),
      'Competição cancelada.',
      'Não foi possível cancelar a competição.'
    );
    setCancelId(null);
  };

  const confirmPublish = async () => {
    if (!publishId) return;
    await runAction(
      publishId,
      () => publishCompetition(publishId),
      'Competição publicada.',
      'Não foi possível publicar a competição.'
    );
    setPublishId(null);
  };

  const competitionForQuestions = useMemo(
    () => (addQuestionsId ? competitions.find((c) => c.id === addQuestionsId) : null),
    [addQuestionsId, competitions]
  );
  const detailCompetition = useMemo(
    () => (detailId ? competitions.find((c) => c.id === detailId) : null),
    [detailId, competitions]
  );

  return (
    <div className="container mx-auto space-y-6 py-6 px-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Trophy className="h-8 w-8 text-blue-600" />
            Competições
          </h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie e crie competições para seus alunos.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Nova Competição
        </Button>
      </div>

      {/* Filtros e Busca — padrão Olimpíadas */}
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar competições por nome ou disciplina..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center justify-between">
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros Avançados
                  {hasActiveFilters && (
                    <Badge
                      variant="secondary"
                      className="ml-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
                    >
                      {[
                        filters.status !== 'all' ? 1 : 0,
                        filters.subject_id !== 'all' ? 1 : 0,
                        filters.level !== 'all' ? 1 : 0,
                        searchTerm.length > 0 ? 1 : 0,
                      ].reduce((a, b) => a + b, 0)}
                    </Badge>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <Select
                      value={filters.status}
                      onValueChange={(value) => setFilters((f) => ({ ...f, status: value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Todos os status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="rascunho">Rascunho</SelectItem>
                        <SelectItem value="aberta">Aberta</SelectItem>
                        <SelectItem value="draft">Rascunho (draft)</SelectItem>
                        <SelectItem value="scheduled">Agendada</SelectItem>
                        <SelectItem value="enrollment_open">Inscrições abertas</SelectItem>
                        <SelectItem value="active">Ativa</SelectItem>
                        <SelectItem value="completed">Concluída</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Disciplina</Label>
                    <Select
                      value={filters.subject_id}
                      onValueChange={(value) => setFilters((f) => ({ ...f, subject_id: value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Todas as disciplinas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as disciplinas</SelectItem>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Nível</Label>
                    <Select
                      value={filters.level}
                      onValueChange={(value) => setFilters((f) => ({ ...f, level: value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Todos os níveis" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os níveis</SelectItem>
                        <SelectItem value="1">Nível 1 (Ed. Infantil, Anos Iniciais, EJA, Ed. Especial)</SelectItem>
                        <SelectItem value="2">Nível 2 (Anos Finais, Ensino Médio)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setFilters(DEFAULT_FILTERS);
                    }}
                    className="w-full sm:w-auto"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Limpar Filtros
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : filteredCompetitions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">
              {searchTerm || hasActiveFilters
                ? 'Nenhuma competição encontrada com os filtros aplicados.'
                : 'Nenhuma competição encontrada. Crie uma nova competição para começar.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCompetitions.map((comp) => (
            <CompetitionCard
              key={comp.id}
              competition={comp}
              onView={handleView}
              onEdit={handleEdit}
              onCancel={handleCancelClick}
              onPublish={handlePublishClick}
              onDelete={handleDeleteClick}
              onAddQuestions={handleAddQuestions}
            />
          ))}
        </div>
      )}

      <CreateCompetitionModal
        open={modalOpen || !!editId}
        onClose={() => { setModalOpen(false); setEditId(null); }}
        onSuccess={() => {
          fetchCompetitions();
          setModalOpen(false);
          setEditId(null);
        }}
        editId={editId}
      />

      <CompetitionDetailModal
        competitionId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        onEdit={(id) => { setDetailId(null); setEditId(id); }}
        canEdit={!!(detailCompetition && canEdit(detailCompetition))}
      />

      <AddQuestionsModal
        competitionId={addQuestionsId}
        competitionName={competitionForQuestions?.name ?? ''}
        open={!!addQuestionsId}
        onClose={() => setAddQuestionsId(null)}
        onSuccess={() => { fetchCompetitions(); setAddQuestionsId(null); }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir competição</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta competição? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={actionLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar competição</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta competição?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} disabled={actionLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancelar competição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!publishId} onOpenChange={(open) => !open && setPublishId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar competição</AlertDialogTitle>
            <AlertDialogDescription>
              Ao publicar, a competição deixará de ser rascunho e ficará aberta. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPublish} disabled={actionLoading}>
              Publicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
