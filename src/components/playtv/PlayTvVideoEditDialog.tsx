import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Link2, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { getPlayTvApiErrorMessage, linksSnapshotFromVideo, validatePlayTvVideoUrl } from '@/lib/playtv';
import { useToast } from '@/hooks/use-toast';
import { isPlayTvLinkResource, PlayTvVideo, type UpdatePlayTvVideoDTO } from '@/types/playtv';

type LinkDraft = { key: string; serverId?: string; title: string; url: string };

function draftsSnapshot(drafts: LinkDraft[]): string {
  return JSON.stringify(
    drafts.map((d) => ({ id: d.serverId ?? null, title: d.title.trim(), url: d.url.trim() }))
  );
}

interface PlayTvVideoEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: PlayTvVideo;
  onSaved: () => void;
}

export function PlayTvVideoEditDialog({ open, onOpenChange, video, onSaved }: PlayTvVideoEditDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [linkDrafts, setLinkDrafts] = useState<LinkDraft[]>([]);
  const [grades, setGrades] = useState<Array<{ id: string; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const initialRef = useRef({
    title: '',
    url: '',
    gradeId: '',
    subjectId: '',
    linksSnap: '',
  });

  useEffect(() => {
    if (!open || !video) return;

    initialRef.current = {
      title: (video.title ?? '').trim(),
      url: video.url.trim(),
      gradeId: video.grade.id,
      subjectId: video.subject.id,
      linksSnap: linksSnapshotFromVideo(video),
    };

    setTitle(video.title ?? '');
    setUrl(video.url);
    setGradeId(video.grade.id);
    setSubjectId(video.subject.id);

    const links = (video.resources ?? [])
      .filter(isPlayTvLinkResource)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    setLinkDrafts(
      links.map((l) => ({
        key: l.id ?? crypto.randomUUID(),
        serverId: l.id,
        title: l.title,
        url: l.url,
      }))
    );
  }, [open, video]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoadingOptions(true);
    Promise.all([
      api.get('/grades/').catch(() => ({ data: [] })),
      api.get('/subjects').catch(() => ({ data: [] })),
    ])
      .then(([gRes, sRes]) => {
        if (cancelled) return;
        setGrades(gRes.data || []);
        setSubjects(sRes.data || []);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const addLinkRow = () => {
    setLinkDrafts((prev) => [...prev, { key: crypto.randomUUID(), title: '', url: '' }]);
  };

  const removeLinkRow = (key: string) => {
    setLinkDrafts((prev) => prev.filter((r) => r.key !== key));
  };

  const updateLinkDraft = (key: string, patch: Partial<Pick<LinkDraft, 'title' | 'url'>>) => {
    setLinkDrafts((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const validateLinks = (): boolean => {
    for (const row of linkDrafts) {
      const t = row.title.trim();
      const u = row.url.trim();
      if (!t && !u) continue;
      if (!t || !u) {
        toast({
          title: 'Links',
          description: 'Cada link precisa de nome e URL.',
          variant: 'destructive',
        });
        return false;
      }
      if (t.length > 200) {
        toast({
          title: 'Links',
          description: 'Título do link: no máximo 200 caracteres.',
          variant: 'destructive',
        });
        return false;
      }
      if (!validatePlayTvVideoUrl(u)) {
        toast({
          title: 'Links',
          description: 'Informe uma URL válida (http/https) para cada link.',
          variant: 'destructive',
        });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePlayTvVideoUrl(url.trim())) {
      toast({
        title: 'Validação',
        description: 'Informe uma URL válida para o vídeo.',
        variant: 'destructive',
      });
      return;
    }
    if (!gradeId || !subjectId) {
      toast({
        title: 'Validação',
        description: 'Selecione série e disciplina.',
        variant: 'destructive',
      });
      return;
    }
    if (!validateLinks()) return;

    const ini = initialRef.current;
    const linksChanged = draftsSnapshot(linkDrafts) !== ini.linksSnap;
    const titleChanged = title.trim() !== ini.title;
    const urlChanged = url.trim() !== ini.url;
    const gradeChanged = gradeId !== ini.gradeId;
    const subjectChanged = subjectId !== ini.subjectId;

    const body: UpdatePlayTvVideoDTO = {};
    if (titleChanged) body.title = title.trim() || null;
    if (urlChanged) body.url = url.trim();
    if (gradeChanged) body.grade = gradeId;
    if (subjectChanged) body.subject = subjectId;

    if (linksChanged) {
      const effective = linkDrafts.filter((r) => r.title.trim() && r.url.trim());
      body.resources = effective.map((d, i) => ({
        ...(d.serverId ? { id: d.serverId } : {}),
        type: 'link' as const,
        title: d.title.trim(),
        url: d.url.trim(),
        sort_order: i,
      }));
    }

    if (Object.keys(body).length === 0) {
      toast({
        title: 'Nenhuma alteração',
        description: 'Altere algum campo antes de salvar.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/play-tv/videos/${video.id}`, body);
      toast({
        title: 'Vídeo atualizado',
        description: 'As alterações foram salvas.',
      });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erro ao salvar',
        description: getPlayTvApiErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" ariaTitle="Editar vídeo Play TV">
        <DialogHeader>
          <DialogTitle>Editar vídeo</DialogTitle>
          <DialogDescription>
            Alterações parciais: só os campos modificados são enviados. Links listados substituem todos os links
            atuais; arquivos anexos não são alterados aqui.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-ptv-title">Título</Label>
            <Input
              id="edit-ptv-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Título opcional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-ptv-url">
              URL do vídeo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-ptv-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Série</Label>
              <Select value={gradeId} onValueChange={setGradeId} disabled={isLoadingOptions}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingOptions ? 'Carregando...' : 'Selecione'} />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Select value={subjectId} onValueChange={setSubjectId} disabled={isLoadingOptions}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingOptions ? 'Carregando...' : 'Selecione'} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-dashed p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" />
                Links complementares
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addLinkRow}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            {linkDrafts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum link. Links removidos da lista serão excluídos ao salvar.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {linkDrafts.map((row) => (
                  <div key={row.key} className="flex flex-col gap-2 sm:flex-row sm:items-end border rounded-md p-2 bg-muted/30">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Nome</Label>
                      <Input
                        value={row.title}
                        maxLength={200}
                        onChange={(e) => updateLinkDraft(row.key, { title: e.target.value })}
                        placeholder="Nome do link"
                      />
                    </div>
                    <div className="flex-[2] space-y-1">
                      <Label className="text-xs">URL</Label>
                      <Input
                        type="url"
                        value={row.url}
                        onChange={(e) => updateLinkDraft(row.key, { url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive shrink-0"
                      onClick={() => removeLinkRow(row.key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar alterações'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
