import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  FileText,
  MapPin,
  Loader2,
  CheckCircle2,
  Download,
  AlertCircle,
  RefreshCw,
  Clock,
  School,
  Users,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Gabarito } from '@/types/answer-sheet';

type FilterLevel = 'state' | 'city' | 'school' | 'grade' | 'class';

interface FilterOption {
  id: string;
  name: string;
  count?: number;
}

interface SelectedFilters {
  state?: string;
  city?: string;
  school_ids?: string[];
  grade_ids?: string[];
  class_ids?: string[];
}

interface JobStatusResponse {
  job_id: string;
  gabarito_id: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: { current: number; total: number; percentage: number };
  result?: {
    classes_generated?: number;
    total_students?: number;
    minio_url?: string;
    download_url?: string;
    scope_type?: string;
  };
  tasks?: Array<{ class_id: string; class_name: string; status: string }>;
  error?: string;
}

function normalizeOptions(raw: unknown): FilterOption[] {
  if (!raw) return [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object') {
    return (raw as { id?: string; uuid?: string; nome?: string; name?: string }[]).map((item) => ({
      id: item.id || item.uuid || String(item),
      name: (item as { nome?: string; name?: string }).nome || (item as { name?: string }).name || String(item),
      count: (item as { count?: number }).count || 0,
    }));
  }
  if (Array.isArray(raw)) {
    return (raw as (string | { id: string; name: string })[]).map((item, idx) =>
      typeof item === 'string'
        ? { id: item, name: item, count: 0 }
        : { id: item.id || String(idx), name: item.name || item.id, count: 0 }
    );
  }
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return Object.entries(raw).map(([key, val]) => ({
      id: key,
      name: typeof val === 'string' ? val : (val as { nome?: string; name?: string })?.nome || (val as { name?: string })?.name || key,
      count: (val as { count?: number })?.count || 0,
    }));
  }
  return [];
}

export default function AnswerSheetGenerateCards() {
  const { toast } = useToast();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Abas
  const [activeTab, setActiveTab] = useState<'generate' | 'generated'>('generate');

  // Gabaritos
  const [gabaritos, setGabaritos] = useState<Gabarito[]>([]);
  const [isLoadingGabaritos, setIsLoadingGabaritos] = useState(true);
  const [selectedGabaritoId, setSelectedGabaritoId] = useState<string>('');
  const [downloadingGabaritoId, setDownloadingGabaritoId] = useState<string | null>(null);
  const [selectedGabaritos, setSelectedGabaritos] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'single' | 'multiple'>('single');
  const [gabaritoToDelete, setGabaritoToDelete] = useState<string | null>(null);

  // Filtros (escopo)
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>({});
  const [filterLabels, setFilterLabels] = useState<Record<FilterLevel, string>>({
    state: '',
    city: '',
    school: '',
    grade: '',
    class: '',
  });
  const [stateOptions, setStateOptions] = useState<FilterOption[]>([]);
  const [cityOptions, setCityOptions] = useState<FilterOption[]>([]);
  const [schoolOptions, setSchoolOptions] = useState<FilterOption[]>([]);
  const [gradeOptions, setGradeOptions] = useState<FilterOption[]>([]);
  const [classOptions, setClassOptions] = useState<FilterOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Geração
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [jobTasks, setJobTasks] = useState<Array<{ class_id: string; class_name: string; status: string }>>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  const fetchGabaritos = useCallback(async () => {
    try {
      setIsLoadingGabaritos(true);
      const res = await api.get('/answer-sheets/gabaritos');
      setGabaritos(res.data?.gabaritos ?? []);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar os gabaritos.', variant: 'destructive' });
      setGabaritos([]);
    } finally {
      setIsLoadingGabaritos(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchGabaritos();
  }, [fetchGabaritos]);

  useEffect(() => {
    if (activeTab === 'generated') fetchGabaritos();
  }, [activeTab, fetchGabaritos]);

  const handleDownloadGabarito = async (gabaritoId: string) => {
    try {
      setDownloadingGabaritoId(gabaritoId);
      const res = await api.get(`/answer-sheets/gabarito/${gabaritoId}/download`);
      const data = res.data;
      if (data.download_url) {
        window.open(data.download_url, '_blank');
        toast({
          title: 'Download iniciado',
          description: `Arquivo em download. Link expira em ${data.expires_in || '1 hora'}.`,
        });
      } else {
        throw new Error('URL de download não fornecida');
      }
    } catch (err: unknown) {
      const status = err && typeof err === 'object' && 'response' in err ? (err as { response?: { status?: number; data?: { status?: string; error?: string } } }).response?.status : undefined;
      const backendError = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { error?: string } } }).response?.data?.error : undefined;
      let msg = 'Não foi possível baixar o arquivo.';
      if (status === 404) msg = 'Cartões não encontrados.';
      else if (status === 400 && (err as { response?: { data?: { status?: string } } }).response?.data?.status === 'not_generated') msg = 'Os cartões ainda não foram gerados.';
      else if (status === 403) msg = 'Sem permissão para acessar este arquivo.';
      else if (backendError) msg = backendError;
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setDownloadingGabaritoId(null);
    }
  };

  const handleToggleSelectGabarito = (gabaritoId: string) => {
    setSelectedGabaritos((prev) => {
      const next = new Set(prev);
      if (next.has(gabaritoId)) next.delete(gabaritoId);
      else next.add(gabaritoId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedGabaritos.size === gabaritos.length) {
      setSelectedGabaritos(new Set());
    } else {
      setSelectedGabaritos(new Set(gabaritos.map((g) => g.id)));
    }
  };

  const handleOpenDeleteDialog = (gabaritoId?: string) => {
    if (gabaritoId) {
      setGabaritoToDelete(gabaritoId);
      setDeleteMode('single');
    } else {
      setDeleteMode('multiple');
    }
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      if (deleteMode === 'single' && gabaritoToDelete) {
        await api.delete(`/answer-sheets/${gabaritoToDelete}`);
        setGabaritos((prev) => prev.filter((g) => g.id !== gabaritoToDelete));
        toast({ title: 'Sucesso', description: 'Cartão excluído com sucesso.' });
      } else if (deleteMode === 'multiple') {
        const ids = Array.from(selectedGabaritos);
        await Promise.all(ids.map((id) => api.delete(`/answer-sheets/${id}`)));
        setGabaritos((prev) => prev.filter((g) => !selectedGabaritos.has(g.id)));
        setSelectedGabaritos(new Set());
        toast({ title: 'Sucesso', description: 'Cartões excluídos com sucesso.' });
      }
      setShowDeleteDialog(false);
      setGabaritoToDelete(null);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível excluir o(s) cartão(ões).', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const loadNextFilterOptions = useCallback(
    async (filters: SelectedFilters) => {
      try {
        setIsLoadingOptions(true);
        const schoolIds = filters.school_ids ?? [];
        const firstSchoolId = schoolIds[0];
        const firstGradeId = filters.grade_ids?.[0];

        if (!filters.state && !filters.city && schoolIds.length === 0) {
          const res = await api.get('/answer-sheets/opcoes-filtros');
          const normalized = normalizeOptions(res.data?.estados);
          setStateOptions(normalized);
          return;
        }
        if (filters.state && !filters.city) {
          const params = new URLSearchParams();
          params.append('estado', filters.state);
          const res = await api.get(`/answer-sheets/opcoes-filtros?${params}`);
          const normalized = normalizeOptions(res.data?.municipios);
          setCityOptions(normalized);
          return;
        }
        if (filters.city && schoolIds.length === 0) {
          const params = new URLSearchParams();
          if (filters.state) params.append('estado', filters.state);
          params.append('municipio', filters.city);
          const res = await api.get(`/answer-sheets/opcoes-filtros?${params}`);
          const normalized = normalizeOptions(res.data?.escolas);
          setSchoolOptions(normalized);
          return;
        }
        if (schoolIds.length > 0 && !(filters.grade_ids?.length)) {
          const byId = new Map<string, FilterOption>();
          for (const schoolId of schoolIds) {
            const params = new URLSearchParams();
            if (filters.state) params.append('estado', filters.state);
            if (filters.city) params.append('municipio', filters.city);
            params.append('escola', schoolId);
            const res = await api.get(`/answer-sheets/opcoes-filtros?${params}`);
            const normalized = normalizeOptions(res.data?.series);
            normalized.forEach((o) => { if (!byId.has(o.id)) byId.set(o.id, o); });
          }
          setGradeOptions(Array.from(byId.values()));
          return;
        }
        if (schoolIds.length > 0 && filters.grade_ids?.length && !(filters.class_ids?.length)) {
          const byId = new Map<string, FilterOption>();
          for (const schoolId of schoolIds) {
            const params = new URLSearchParams();
            if (filters.state) params.append('estado', filters.state);
            if (filters.city) params.append('municipio', filters.city);
            params.append('escola', schoolId);
            if (firstGradeId) params.append('serie', firstGradeId);
            const res = await api.get(`/answer-sheets/opcoes-filtros?${params}`);
            const normalized = normalizeOptions(res.data?.turmas);
            normalized.forEach((o) => { if (!byId.has(o.id)) byId.set(o.id, o); });
          }
          setClassOptions(Array.from(byId.values()));
          return;
        }
        const params = new URLSearchParams();
        if (filters.state) params.append('estado', filters.state);
        if (filters.city) params.append('municipio', filters.city);
        if (firstSchoolId) params.append('escola', firstSchoolId);
        if (firstGradeId) params.append('serie', firstGradeId);
        if (filters.class_ids?.length) params.append('turma', filters.class_ids[0]);
        const res = await api.get(`/answer-sheets/opcoes-filtros?${params}`);
        if (schoolIds.length > 0 && !(filters.grade_ids?.length) && res.data?.series) {
          setGradeOptions(normalizeOptions(res.data.series));
        } else if (filters.grade_ids?.length && !(filters.class_ids?.length) && res.data?.turmas) {
          setClassOptions(normalizeOptions(res.data.turmas));
        }
      } catch {
        toast({ title: 'Erro', description: 'Não foi possível carregar as opções.', variant: 'destructive' });
      } finally {
        setIsLoadingOptions(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    loadNextFilterOptions(selectedFilters);
  }, [selectedFilters.state, selectedFilters.city, selectedFilters.school_ids?.length, selectedFilters.grade_ids?.length, selectedFilters.class_ids?.length, loadNextFilterOptions]);

  const handleSelectFilter = useCallback(
    async (level: FilterLevel, optionId: string, optionName: string) => {
      if (level !== 'state' && level !== 'city') return;
      const next: SelectedFilters = { ...selectedFilters };
      if (level === 'state') {
        next.state = optionId;
        next.city = undefined;
        next.school_ids = undefined;
        next.grade_ids = undefined;
        next.class_ids = undefined;
        setFilterLabels((p) => ({ ...p, state: optionName, city: '', school: '', grade: '', class: '' }));
      } else {
        next.city = optionId;
        next.school_ids = undefined;
        next.grade_ids = undefined;
        next.class_ids = undefined;
        setFilterLabels((p) => ({ ...p, city: optionName, school: '', grade: '', class: '' }));
      }
      setSelectedFilters(next);
      await loadNextFilterOptions(next);
    },
    [selectedFilters, loadNextFilterOptions]
  );

  const handleSchoolIdsChange = useCallback(
    (ids: string[]) => {
      setSelectedFilters((p) => ({ ...p, school_ids: ids.length ? ids : undefined, grade_ids: undefined, class_ids: undefined }));
      setFilterLabels((p) => ({ ...p, grade: '', class: '' }));
      if (ids.length) loadNextFilterOptions({ ...selectedFilters, school_ids: ids });
      else setGradeOptions([]);
    },
    [selectedFilters, loadNextFilterOptions]
  );

  const handleGradeIdsChange = useCallback(
    (ids: string[]) => {
      setSelectedFilters((p) => ({ ...p, grade_ids: ids.length ? ids : undefined, class_ids: undefined }));
      setFilterLabels((p) => ({ ...p, class: '' }));
      if (ids.length) loadNextFilterOptions({ ...selectedFilters, grade_ids: ids });
      else setClassOptions([]);
    },
    [selectedFilters, loadNextFilterOptions]
  );

  const handleClassIdsChange = useCallback((ids: string[]) => {
    setSelectedFilters((p) => ({ ...p, class_ids: ids.length ? ids : undefined }));
  }, []);

  const handleClearFilter = useCallback(
    (level: FilterLevel) => {
      if (level === 'state') {
        setSelectedFilters({});
        setFilterLabels({ state: '', city: '', school: '', grade: '', class: '' });
        setStateOptions([]);
        setCityOptions([]);
        setSchoolOptions([]);
        setGradeOptions([]);
        setClassOptions([]);
        loadNextFilterOptions({});
        return;
      }
      if (level === 'city') {
        const next = { ...selectedFilters };
        delete next.city;
        next.school_ids = undefined;
        next.grade_ids = undefined;
        next.class_ids = undefined;
        setSelectedFilters(next);
        setFilterLabels((p) => ({ ...p, city: '', school: '', grade: '', class: '' }));
        setSchoolOptions([]);
        setGradeOptions([]);
        setClassOptions([]);
        loadNextFilterOptions(next);
        return;
      }
      if (level === 'school') {
        setSelectedFilters((p) => ({ ...p, school_ids: undefined, grade_ids: undefined, class_ids: undefined }));
        setFilterLabels((p) => ({ ...p, school: '', grade: '', class: '' }));
        setGradeOptions([]);
        setClassOptions([]);
        loadNextFilterOptions({ ...selectedFilters, school_ids: undefined, grade_ids: undefined, class_ids: undefined });
        return;
      }
      if (level === 'grade') {
        setSelectedFilters((p) => ({ ...p, grade_ids: undefined, class_ids: undefined }));
        setFilterLabels((p) => ({ ...p, grade: '', class: '' }));
        setClassOptions([]);
        loadNextFilterOptions({ ...selectedFilters, grade_ids: undefined, class_ids: undefined });
        return;
      }
      setSelectedFilters((p) => ({ ...p, class_ids: undefined }));
      setFilterLabels((p) => ({ ...p, class: '' }));
    },
    [selectedFilters, loadNextFilterOptions]
  );

  const handleGenerate = async () => {
    if (!selectedGabaritoId) {
      toast({ title: 'Selecione um gabarito', variant: 'destructive' });
      return;
    }
    if (!selectedFilters.state || !selectedFilters.city) {
      toast({ title: 'Selecione estado e município', variant: 'destructive' });
      return;
    }
    try {
      setIsGenerating(true);
      setJobId(null);
      setDownloadUrl(null);
      setJobError(null);
      setJobProgress({ current: 0, total: 0, percentage: 0 });
      setJobTasks([]);

      const payload: { gabarito_id: string; school_ids?: string[]; grade_ids?: string[]; class_ids?: string[] } = {
        gabarito_id: selectedGabaritoId,
      };
      if (selectedFilters.school_ids?.length) payload.school_ids = selectedFilters.school_ids;
      if (selectedFilters.grade_ids?.length) payload.grade_ids = selectedFilters.grade_ids;
      if (selectedFilters.class_ids?.length) payload.class_ids = selectedFilters.class_ids;

      const res = await api.post('/answer-sheets/generate', payload, { headers: { 'Content-Type': 'application/json' } });

      if (res.status !== 202) {
        toast({ title: 'Resposta inesperada', description: 'Tente novamente.', variant: 'destructive' });
        setIsGenerating(false);
        return;
      }

      const data = res.data;
      setJobId(data.job_id);
      setJobTasks(data.tasks ?? []);
      setJobProgress({
        current: 0,
        total: data.total_classes ?? data.tasks?.length ?? 1,
        percentage: 0,
      });

      toast({
        title: 'Geração iniciada',
        description: data.note || `Gerando cartões para ${data.total_students ?? 0} alunos.`,
      });

      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await api.get<JobStatusResponse>(`/answer-sheets/jobs/${data.job_id}/status`);
          const d = statusRes.data;

          if (d.progress) {
            setJobProgress({
              current: d.progress.current ?? 0,
              total: d.progress.total || 1,
              percentage: d.progress.percentage ?? 0,
            });
          }
          if (d.tasks?.length) setJobTasks(d.tasks);

          if (d.status === 'completed') {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            setIsGenerating(false);
            const gabaritoId = d.gabarito_id;
            if (gabaritoId) {
              try {
                const downloadRes = await api.get(`/answer-sheets/gabarito/${gabaritoId}/download`);
                const presignedUrl = downloadRes.data?.download_url ?? null;
                setDownloadUrl(presignedUrl);
              } catch {
                setDownloadUrl(null);
              }
            } else {
              setDownloadUrl(null);
            }
            await fetchGabaritos();
            toast({ title: 'Geração concluída', description: 'Cartões gerados com sucesso.' });
          }

          if (d.status === 'failed') {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            setIsGenerating(false);
            setJobError(d.error || 'Erro ao gerar cartões.');
            toast({ title: 'Erro na geração', description: d.error, variant: 'destructive' });
          }
        } catch (err: unknown) {
          const status = err && typeof err === 'object' && 'response' in err && (err as { response?: { status?: number } }).response?.status;
          if (status === 404) {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            setIsGenerating(false);
            setJobError('Job não encontrado. A geração pode ter expirado. Verifique a lista de cartões.');
            toast({
              title: 'Job não encontrado',
              description: 'Verifique a lista de cartões gerados.',
              variant: 'destructive',
            });
          }
        }
      }, 2000);
    } catch (err: unknown) {
      setIsGenerating(false);
      const msg =
        err && typeof err === 'object' && 'response' in err && typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Não foi possível iniciar a geração.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    }
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const selectedGabarito = gabaritos.find((g) => g.id === selectedGabaritoId);
  const canGenerate = selectedGabaritoId && selectedFilters.state && selectedFilters.city && !isGenerating;

  return (
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/5 p-6 md:p-8">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Gerar cartões resposta</h1>
          <p className="mt-1 text-muted-foreground">
            Escolha um gabarito cadastrado e o escopo para gerar os cartões em PDF, ou baixe novamente os cartões já gerados.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'generate' | 'generated')} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="generate">Gerar cartões</TabsTrigger>
          <TabsTrigger value="generated">Cartões gerados</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6 mt-0">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="border-2 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Gabarito</CardTitle>
                  <CardDescription>Selecione o cartão resposta (gabarito) que será usado para gerar os PDFs.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingGabaritos ? (
                <Skeleton className="h-12 w-full rounded-lg" />
              ) : gabaritos.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  Nenhum gabarito encontrado.{' '}
                  <Link to="/app/cartao-resposta/cadastrar" className="text-primary underline underline-offset-2">
                    Cadastrar gabarito
                  </Link>
                </div>
              ) : (
                <Select value={selectedGabaritoId || ''} onValueChange={setSelectedGabaritoId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um gabarito..." />
                  </SelectTrigger>
                  <SelectContent>
                    {gabaritos.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-medium">{g.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {g.num_questions ?? 0} questões · {g.generation_status === 'completed' ? 'Pronto' : 'Pendente'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Escopo da geração</CardTitle>
                  <CardDescription>Estado e município são obrigatórios. Opcionalmente escolha escolas, séries e turmas.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(selectedFilters.state || selectedFilters.city || (selectedFilters.school_ids?.length ?? 0) > 0 || (selectedFilters.grade_ids?.length ?? 0) > 0 || (selectedFilters.class_ids?.length ?? 0) > 0) && (
                <div className="flex flex-wrap gap-2 rounded-lg bg-muted/40 p-3">
                  {filterLabels.state && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                      {filterLabels.state}
                      <button type="button" onClick={() => handleClearFilter('state')} className="rounded-full hover:bg-primary/20 p-0.5" aria-label="Limpar estado">
                        ×
                      </button>
                    </span>
                  )}
                  {filterLabels.city && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                      {filterLabels.city}
                      <button type="button" onClick={() => handleClearFilter('city')} className="rounded-full hover:bg-primary/20 p-0.5" aria-label="Limpar município">
                        ×
                      </button>
                    </span>
                  )}
                  {(selectedFilters.school_ids?.length ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                      {schoolOptions.filter((o) => selectedFilters.school_ids!.includes(o.id)).map((o) => o.name).join(', ') || `${selectedFilters.school_ids!.length} escola(s)`}
                      <button type="button" onClick={() => handleClearFilter('school')} className="rounded-full hover:bg-primary/20 p-0.5" aria-label="Limpar escolas">
                        ×
                      </button>
                    </span>
                  )}
                  {(selectedFilters.grade_ids?.length ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                      {gradeOptions.filter((o) => selectedFilters.grade_ids!.includes(o.id)).map((o) => o.name).join(', ') || `${selectedFilters.grade_ids!.length} série(s)`}
                      <button type="button" onClick={() => handleClearFilter('grade')} className="rounded-full hover:bg-primary/20 p-0.5" aria-label="Limpar séries">
                        ×
                      </button>
                    </span>
                  )}
                  {(selectedFilters.class_ids?.length ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
                      {classOptions.filter((o) => selectedFilters.class_ids!.includes(o.id)).map((o) => o.name).join(', ') || `${selectedFilters.class_ids!.length} turma(s)`}
                      <button type="button" onClick={() => handleClearFilter('class')} className="rounded-full hover:bg-primary/20 p-0.5" aria-label="Limpar turmas">
                        ×
                      </button>
                    </span>
                  )}
                </div>
              )}

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Estado *</Label>
                  <Select
                    value={selectedFilters.state || ''}
                    onValueChange={(v) => {
                      const o = stateOptions.find((x) => x.id === v);
                      if (o) handleSelectFilter('state', v, o.name);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione o estado..." /></SelectTrigger>
                    <SelectContent>
                      {stateOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedFilters.state && (
                  <div className="space-y-2 border-l-2 border-primary/30 pl-4">
                    <Label>Município *</Label>
                    {isLoadingOptions && !cityOptions.length ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select
                        value={selectedFilters.city || ''}
                        onValueChange={(v) => {
                          const o = cityOptions.find((x) => x.id === v);
                          if (o) handleSelectFilter('city', v, o.name);
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione o município..." /></SelectTrigger>
                        <SelectContent>
                          {cityOptions.map((o) => (
                            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {selectedFilters.city && (
                  <div className="space-y-2 border-l-2 border-primary/30 pl-4">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Escola(s) (opcional)</Label>
                      {schoolOptions.length > 0 && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleSchoolIdsChange(schoolOptions.map((o) => o.id))}>
                          Todas
                        </Button>
                      )}
                    </div>
                    {isLoadingOptions && !schoolOptions.length ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <MultiSelect
                        options={schoolOptions.map((o) => ({ id: o.id, name: o.name }))}
                        selected={selectedFilters.school_ids ?? []}
                        onChange={handleSchoolIdsChange}
                        placeholder="Escolas (vazio = todas)"
                        mode="popover"
                        className="w-full"
                      />
                    )}
                  </div>
                )}

                {(selectedFilters.school_ids?.length ?? 0) > 0 && (
                  <div className="space-y-2 border-l-2 border-primary/30 pl-4">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Série(s) (opcional)</Label>
                      {gradeOptions.length > 0 && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleGradeIdsChange(gradeOptions.map((o) => o.id))}>
                          Todas
                        </Button>
                      )}
                    </div>
                    {isLoadingOptions && !gradeOptions.length ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <MultiSelect
                        options={gradeOptions.map((o) => ({ id: o.id, name: o.name }))}
                        selected={selectedFilters.grade_ids ?? []}
                        onChange={handleGradeIdsChange}
                        placeholder="Séries (vazio = todas)"
                        mode="popover"
                        className="w-full"
                      />
                    )}
                  </div>
                )}

                {(selectedFilters.grade_ids?.length ?? 0) > 0 && (
                  <div className="space-y-2 border-l-2 border-primary/30 pl-4">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Turma(s) (opcional)</Label>
                      {classOptions.length > 0 && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleClassIdsChange(classOptions.map((o) => o.id))}>
                          Todas
                        </Button>
                      )}
                    </div>
                    {isLoadingOptions && !classOptions.length ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <MultiSelect
                        options={classOptions.map((o) => ({ id: o.id, name: o.name }))}
                        selected={selectedFilters.class_ids ?? []}
                        onChange={handleClassIdsChange}
                        placeholder="Turmas (vazio = todas)"
                        mode="popover"
                        className="w-full"
                      />
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={handleGenerate} disabled={!canGenerate}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Gerar cartões
                </>
              )}
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/app/cartao-resposta/cadastrar">Cadastrar novo gabarito</Link>
            </Button>
          </div>

          {(jobId || downloadUrl || jobError) && (
            <Card className={jobError ? 'border-destructive/50' : 'border-primary/30'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {downloadUrl ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : jobError ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  {downloadUrl ? 'Geração concluída' : jobError ? 'Erro' : 'Progresso'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {jobError && (
                  <p className="text-sm text-destructive">{jobError}</p>
                )}
                {isGenerating && (
                  <>
                    <Progress value={jobProgress.percentage} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      {jobProgress.current} / {jobProgress.total} turmas
                    </p>
                    {jobTasks.length > 0 && (
                      <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-auto">
                        {jobTasks.map((t) => (
                          <li key={t.class_id}>{t.class_name} — {t.status}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
                {downloadUrl && (
                  <Button asChild>
                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Baixar cartões
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="hidden lg:block">
          <Card className="sticky top-4 border bg-card/80 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              {selectedGabarito ? (
                <>
                  <p><span className="font-medium text-foreground">Gabarito:</span> {selectedGabarito.title}</p>
                  <p><span className="font-medium text-foreground">Questões:</span> {selectedGabarito.num_questions ?? 0}</p>
                </>
              ) : (
                <p>Selecione um gabarito.</p>
              )}
              {selectedFilters.state && <p><span className="font-medium text-foreground">Estado:</span> {filterLabels.state || selectedFilters.state}</p>}
              {selectedFilters.city && <p><span className="font-medium text-foreground">Município:</span> {filterLabels.city || selectedFilters.city}</p>}
              {(selectedFilters.school_ids?.length ?? 0) > 0 && (
                <p><span className="font-medium text-foreground">Escolas:</span> {selectedFilters.school_ids!.length}</p>
              )}
              {(selectedFilters.grade_ids?.length ?? 0) > 0 && (
                <p><span className="font-medium text-foreground">Séries:</span> {selectedFilters.grade_ids!.length}</p>
              )}
              {(selectedFilters.class_ids?.length ?? 0) > 0 && (
                <p><span className="font-medium text-foreground">Turmas:</span> {selectedFilters.class_ids!.length}</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
        </TabsContent>

        <TabsContent value="generated" className="space-y-6 mt-0">
          <Card className="border-2 shadow-sm">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Cartões gerados</CardTitle>
                    <CardDescription>Baixe novamente os PDFs dos cartões já gerados.</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={fetchGabaritos} disabled={isLoadingGabaritos} className="ml-auto">
                  {isLoadingGabaritos ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingGabaritos ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : gabaritos.length === 0 ? (
                <div className="text-center py-12 rounded-lg border border-dashed bg-muted/30">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum cartão gerado ainda.</p>
                  <p className="text-sm text-muted-foreground mt-1">Use a aba &quot;Gerar cartões&quot; para criar os PDFs.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all-generated"
                        checked={gabaritos.length > 0 && selectedGabaritos.size === gabaritos.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="select-all-generated" className="text-sm font-medium cursor-pointer">
                        Selecionar todos ({selectedGabaritos.size}/{gabaritos.length})
                      </Label>
                    </div>
                    {selectedGabaritos.size > 0 && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedGabaritos(new Set())}>
                          Limpar seleção
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleOpenDeleteDialog()} disabled={isDeleting}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir selecionados ({selectedGabaritos.size})
                        </Button>
                      </div>
                    )}
                  </div>
                  {gabaritos.map((gabarito) => (
                    <Card
                      key={gabarito.id}
                      className={`overflow-hidden transition-shadow ${selectedGabaritos.has(gabarito.id) ? 'ring-2 ring-primary' : ''}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <Checkbox
                              id={`select-${gabarito.id}`}
                              checked={selectedGabaritos.has(gabarito.id)}
                              onCheckedChange={() => handleToggleSelectGabarito(gabarito.id)}
                              className="mt-1 shrink-0"
                            />
                            <div className="space-y-3 flex-1 min-w-0">
                            <h3 className="text-lg font-semibold truncate">{gabarito.title}</h3>
                            <div className="flex flex-wrap gap-2 text-sm">
                              {gabarito.generation_status === 'completed' ? (
                                <Badge variant="default" className="bg-green-600 dark:bg-green-700">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Pronto
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Processando
                                </Badge>
                              )}
                              {gabarito.scope_type === 'class' && gabarito.class_name && (
                                <Badge variant="secondary">
                                  <Users className="h-3 w-3 mr-1" />
                                  {gabarito.class_name}
                                </Badge>
                              )}
                              {gabarito.scope_type === 'grade' && gabarito.grade_name && (
                                <Badge variant="secondary">
                                  <School className="h-3 w-3 mr-1" />
                                  {gabarito.grade_name}
                                </Badge>
                              )}
                              {gabarito.scope_type === 'school' && (gabarito.school_name ?? '') && (
                                <Badge variant="secondary">
                                  <School className="h-3 w-3 mr-1" />
                                  {gabarito.school_name}
                                </Badge>
                              )}
                              {gabarito.scope_type === 'city' && (gabarito.municipality || gabarito.state) && (
                                <Badge variant="secondary">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {[gabarito.municipality, gabarito.state].filter(Boolean).join(' - ')}
                                </Badge>
                              )}
                              <Badge variant="outline">{gabarito.students_count ?? 0} aluno(s)</Badge>
                              {(gabarito.classes_count ?? 0) >= 1 && (
                                <Badge variant="outline">{gabarito.classes_count} turma(s)</Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
                              <div>
                                <p className="text-xs text-muted-foreground">Criado em</p>
                                <p className="font-medium text-foreground">
                                  {new Date(gabarito.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              {gabarito.creator_name && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Criado por</p>
                                  <p className="font-medium text-foreground">{gabarito.creator_name}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-muted-foreground">Escopo</p>
                                <p className="font-medium text-foreground capitalize">
                                  {gabarito.scope_type === 'class' && 'Turma'}
                                  {gabarito.scope_type === 'grade' && 'Série'}
                                  {gabarito.scope_type === 'school' && 'Escola'}
                                  {gabarito.scope_type === 'city' && 'Município'}
                                </p>
                              </div>
                            </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            <Button
                              onClick={() => handleDownloadGabarito(gabarito.id)}
                              disabled={downloadingGabaritoId === gabarito.id || !gabarito.can_download}
                            >
                              {downloadingGabaritoId === gabarito.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Baixando...
                                </>
                              ) : !gabarito.can_download ? (
                                <>
                                  <Clock className="h-4 w-4 mr-2" />
                                  Processando
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4 mr-2" />
                                  Baixar ZIP
                                </>
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleOpenDeleteDialog(gabarito.id)}
                              disabled={isDeleting || downloadingGabaritoId === gabarito.id}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Confirmar exclusão
                </DialogTitle>
                <DialogDescription>
                  {deleteMode === 'single' ? (
                    'Tem certeza que deseja excluir este gabarito? Esta ação não pode ser desfeita.'
                  ) : (
                    <>
                      Tem certeza que deseja excluir {selectedGabaritos.size} gabarito(s) selecionado(s)? Esta ação não pode ser desfeita.
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setGabaritoToDelete(null);
                  }}
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
