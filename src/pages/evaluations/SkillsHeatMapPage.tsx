import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, Thermometer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  fetchAnswerSheetFilterOptions,
  fetchEvaluationFilterOptions,
  fetchSkillsMapCartao,
  fetchSkillsMapCartaoErros,
  fetchSkillsMapOnline,
  fetchSkillsMapOnlineErros,
  type SkillsMapErrosResponse,
  type SkillsMapHabilidade,
  type SkillsMapResponse,
} from '@/services/evaluation/skillsMapApi';
import { ResultsPeriodMonthYearPicker } from '@/components/filters';
import { normalizeResultsPeriodYm } from '@/utils/resultsPeriod';

const FAIXA_ORDER = [
  'abaixo_do_basico',
  'basico',
  'adequado',
  'avancado',
] as const;

const FAIXA_LABELS: Record<(typeof FAIXA_ORDER)[number], string> = {
  abaixo_do_basico: '0–29% Abaixo do Básico',
  basico: '30–59% Básico',
  adequado: '60–79% Adequado',
  avancado: '80–100% Avançado',
};

const CARD_BG: Record<(typeof FAIXA_ORDER)[number], string> = {
  abaixo_do_basico: 'bg-gradient-to-br from-red-600/90 to-orange-500/90 text-white',
  basico: 'bg-gradient-to-br from-amber-400 to-yellow-300 text-amber-950',
  adequado: 'bg-gradient-to-br from-lime-400 to-emerald-300 text-emerald-950',
  avancado: 'bg-gradient-to-br from-emerald-700 to-green-600 text-white',
};

function normEntities(items: unknown): Array<{ id: string; nome: string }> {
  if (!Array.isArray(items)) return [];
  return items.map(
    (item: { id?: string; nome?: string; name?: string; titulo?: string; title?: string }) => ({
      id: String(item.id ?? ''),
      nome: item.nome ?? item.name ?? item.titulo ?? item.title ?? '',
    })
  );
}

function _looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s.trim()
  );
}

/** Título no cartão/modal: nunca mostrar UUID como código. */
function skillDisplayTitle(h: SkillsMapHabilidade): string {
  const c = (h.codigo || '').trim();
  if (c && !_looksLikeUuid(c)) return c;
  const d = (h.descricao || '').trim();
  if (d && !_looksLikeUuid(d)) return d.length > 72 ? `${d.slice(0, 69)}…` : d;
  return 'Habilidade';
}

function skillDisciplinaLabel(h: SkillsMapHabilidade): string | null {
  const n = (h.disciplina_nome || '').trim();
  if (n) return n;
  return null;
}

function filterEvaluationsForDropdown(
  avaliacoes: Array<{ id?: string; titulo?: string; title?: string; type?: string; tipo?: string }>
) {
  return (avaliacoes || [])
    .filter((evaluation) => {
      const raw = (evaluation.type ?? evaluation.tipo ?? '').toString().trim();
      const type = raw.toUpperCase();
      const title = String(evaluation.titulo ?? evaluation.title ?? '').toUpperCase();
      if (type === 'OLIMPIADAS' || type === 'OLIMPIADA' || type.includes('OLIMPI')) return false;
      if (type === 'COMPETICAO' || type === 'COMPETIÇÃO' || type.includes('COMPET')) return false;
      if (title.includes('OLIMPI') || title.includes('OLÍMPIC')) return false;
      return type === '' || type === 'AVALIACAO' || type === 'SIMULADO';
    })
    .map((e) => ({
      id: String(e.id ?? ''),
      nome: e.titulo ?? e.title ?? 'Sem título',
    }));
}

function SkillCard({
  h,
  onClick,
}: {
  h: SkillsMapHabilidade;
  onClick: () => void;
}) {
  const disciplina = skillDisciplinaLabel(h);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl p-3 text-left shadow-sm transition hover:opacity-95 hover:ring-2 hover:ring-primary/40',
        CARD_BG[h.faixa] || CARD_BG.basico
      )}
    >
      <div className="font-semibold text-sm leading-tight">{skillDisplayTitle(h)}</div>
      {disciplina && (
        <div className="mt-1.5 text-[11px] font-medium opacity-90 line-clamp-2 leading-snug">
          {disciplina}
        </div>
      )}
      <div className="mt-2 text-lg font-bold">{h.percentual_acertos.toFixed(1)}%</div>
      <div className="text-xs opacity-90">Acertaram</div>
    </button>
  );
}

const FAIXA_DOT: Record<(typeof FAIXA_ORDER)[number], string> = {
  abaixo_do_basico: 'bg-red-600',
  basico: 'bg-amber-400',
  adequado: 'bg-lime-500',
  avancado: 'bg-emerald-700',
};

function HeatMapLegendInside() {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <p className="text-xs font-medium text-foreground">Guia de percentual de acertos</p>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Valor em cada cartão: fração de alunos com cartão corrigido que acertaram itens da habilidade (faltosos e folhas sem leitura não entram no cálculo).
      </p>
      <div>
        <div className="flex justify-between text-[10px] font-medium tabular-nums text-muted-foreground mb-1 px-0.5">
          <span>0%</span>
          <span>30%</span>
          <span>60%</span>
          <span>80%</span>
          <span>100%</span>
        </div>
        <div
          className="h-9 w-full rounded-md bg-gradient-to-r from-red-600 via-amber-400 via-lime-400 to-emerald-700 shadow-inner ring-1 ring-black/5 dark:ring-white/10"
          role="img"
          aria-label="Escala contínua de zero a cem por cento de acertos"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {FAIXA_ORDER.map((faixa) => (
          <div
            key={faixa}
            className="flex gap-2 rounded-md border border-border/80 bg-background/90 px-2 py-1.5 text-left"
          >
            <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-sm', FAIXA_DOT[faixa])} aria-hidden />
            <span className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight">{FAIXA_LABELS[faixa]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatColumns({
  porFaixa,
  onSkillClick,
  gridClassName,
}: {
  porFaixa: SkillsMapResponse['por_faixa'];
  onSkillClick: (h: SkillsMapHabilidade) => void;
  gridClassName?: string;
}) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-4', gridClassName ?? 'mt-6')}>
      {FAIXA_ORDER.map((faixa) => {
        const list = porFaixa?.[faixa] ?? [];
        return (
          <div key={faixa} className="flex flex-col rounded-lg border bg-muted/30 p-3 min-h-[200px]">
            <h3 className="mb-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {FAIXA_LABELS[faixa]}
            </h3>
            {list.length === 0 ? (
              <p className="mt-4 text-center text-sm text-muted-foreground">Nenhuma habilidade</p>
            ) : (
              <div className="flex flex-col gap-2">
                {list.map((h) => (
                  <SkillCard
                    key={`${h.skill_id}-${h.subject_id ?? 's'}`}
                    h={h}
                    onClick={() => onSkillClick(h)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SkillsHeatMapPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'online' | 'cartao'>('online');

  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const periodoYm = useMemo(() => {
    if (selectedPeriod === 'all') return undefined;
    const n = normalizeResultsPeriodYm(selectedPeriod);
    return n === 'all' ? undefined : n;
  }, [selectedPeriod]);

  const [oEstado, setOEstado] = useState('all');
  const [oMunicipio, setOMunicipio] = useState('all');
  const [oAvaliacao, setOAvaliacao] = useState('all');
  const [oEscola, setOEscola] = useState('all');
  const [oSerie, setOSerie] = useState('all');
  const [oTurma, setOTurma] = useState('all');
  const [oDisciplina, setODisciplina] = useState('all');

  const [oEstados, setOEstados] = useState<Array<{ id: string; nome: string }>>([]);
  const [oMunicipios, setOMunicipios] = useState<Array<{ id: string; nome: string }>>([]);
  const [oAvaliacoes, setOAvaliacoes] = useState<Array<{ id: string; nome: string }>>([]);
  const [oEscolas, setOEscolas] = useState<Array<{ id: string; nome: string }>>([]);
  const [oSeries, setOSeries] = useState<Array<{ id: string; nome: string }>>([]);
  const [oTurmas, setOTurmas] = useState<Array<{ id: string; nome: string }>>([]);
  const [oDisciplinas, setODisciplinas] = useState<Array<{ id: string; nome: string }>>([]);

  const [cEstado, setCEstado] = useState('all');
  const [cMunicipio, setCMunicipio] = useState('all');
  const [cGabarito, setCGabarito] = useState('all');
  const [cEscola, setCEscola] = useState('all');
  const [cSerie, setCSerie] = useState('all');
  const [cTurma, setCTurma] = useState('all');
  const [cDisciplina, setCDisciplina] = useState('all');

  const [cEstados, setCEstados] = useState<Array<{ id: string; nome: string }>>([]);
  const [cMunicipios, setCMunicipios] = useState<Array<{ id: string; nome: string }>>([]);
  const [cGabaritos, setCGabaritos] = useState<Array<{ id: string; nome: string }>>([]);
  const [cEscolas, setCEscolas] = useState<Array<{ id: string; nome: string }>>([]);
  const [cSeries, setCSeries] = useState<Array<{ id: string; nome: string }>>([]);
  const [cTurmas, setCTurmas] = useState<Array<{ id: string; nome: string }>>([]);
  const [cDisciplinas, setCDisciplinas] = useState<Array<{ id: string; nome: string }>>([]);

  const [mapOnline, setMapOnline] = useState<SkillsMapResponse | null>(null);
  const [mapCartao, setMapCartao] = useState<SkillsMapResponse | null>(null);
  const [loadingMap, setLoadingMap] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSkill, setDialogSkill] = useState<SkillsMapHabilidade | null>(null);
  const [dialogErros, setDialogErros] = useState<SkillsMapErrosResponse | null>(null);
  const [loadingErros, setLoadingErros] = useState(false);

  const periodChangeRef = useRef(false);
  useEffect(() => {
    if (!periodChangeRef.current) {
      periodChangeRef.current = true;
      return;
    }
    setOMunicipio('all');
    setOAvaliacao('all');
    setOEscola('all');
    setOSerie('all');
    setOTurma('all');
    setODisciplina('all');
    setMapOnline(null);
    setCMunicipio('all');
    setCGabarito('all');
    setCEscola('all');
    setCSerie('all');
    setCTurma('all');
    setCDisciplina('all');
    setMapCartao(null);
  }, [selectedPeriod]);

  const loadOnlineEstados = useCallback(async () => {
    try {
      setLoadingFilters(true);
      const data = await fetchEvaluationFilterOptions({
        ...(periodoYm ? { periodo: periodoYm } : {}),
      });
      setOEstados(normEntities(data.estados));
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar estados.', variant: 'destructive' });
    } finally {
      setLoadingFilters(false);
    }
  }, [toast, periodoYm]);

  useEffect(() => {
    loadOnlineEstados();
  }, [loadOnlineEstados]);

  useEffect(() => {
    if (oEstado === 'all') {
      setOMunicipios([]);
      return;
    }
    (async () => {
      try {
        setLoadingFilters(true);
        const data = await fetchEvaluationFilterOptions({
          estado: oEstado,
          ...(periodoYm ? { periodo: periodoYm } : {}),
        });
        setOMunicipios(normEntities(data.municipios));
      } catch {
        setOMunicipios([]);
      } finally {
        setLoadingFilters(false);
      }
    })();
  }, [oEstado, periodoYm]);

  useEffect(() => {
    if (oEstado === 'all' || oMunicipio === 'all') {
      setOAvaliacoes([]);
      return;
    }
    (async () => {
      try {
        setLoadingFilters(true);
        const data = await fetchEvaluationFilterOptions({
          estado: oEstado,
          municipio: oMunicipio,
          ...(periodoYm ? { periodo: periodoYm } : {}),
        });
        setOAvaliacoes(filterEvaluationsForDropdown(data.avaliacoes || []));
      } catch {
        setOAvaliacoes([]);
      } finally {
        setLoadingFilters(false);
      }
    })();
  }, [oEstado, oMunicipio, periodoYm]);

  useEffect(() => {
    if (oEstado === 'all' || oMunicipio === 'all' || oAvaliacao === 'all') {
      setOEscolas([]);
      return;
    }
    (async () => {
      try {
        setLoadingFilters(true);
        const data = await fetchEvaluationFilterOptions({
          estado: oEstado,
          municipio: oMunicipio,
          avaliacao: oAvaliacao,
          ...(periodoYm ? { periodo: periodoYm } : {}),
        });
        setOEscolas(normEntities(data.escolas));
      } catch {
        setOEscolas([]);
      } finally {
        setLoadingFilters(false);
      }
    })();
  }, [oEstado, oMunicipio, oAvaliacao, periodoYm]);

  useEffect(() => {
    if (oEstado === 'all' || oMunicipio === 'all' || oAvaliacao === 'all') {
      setOSeries([]);
      return;
    }
    (async () => {
      try {
        setLoadingFilters(true);
        const data = await fetchEvaluationFilterOptions({
          estado: oEstado,
          municipio: oMunicipio,
          avaliacao: oAvaliacao,
          ...(oEscola !== 'all' ? { escola: oEscola } : {}),
          ...(periodoYm ? { periodo: periodoYm } : {}),
        });
        setOSeries(normEntities(data.series));
      } catch {
        setOSeries([]);
      } finally {
        setLoadingFilters(false);
      }
    })();
  }, [oEstado, oMunicipio, oAvaliacao, oEscola, periodoYm]);

  useEffect(() => {
    if (oEstado === 'all' || oMunicipio === 'all' || oAvaliacao === 'all' || oSerie === 'all') {
      setOTurmas([]);
      return;
    }
    (async () => {
      try {
        setLoadingFilters(true);
        const data = await fetchEvaluationFilterOptions({
          estado: oEstado,
          municipio: oMunicipio,
          avaliacao: oAvaliacao,
          ...(oEscola !== 'all' ? { escola: oEscola } : {}),
          serie: oSerie,
          ...(periodoYm ? { periodo: periodoYm } : {}),
        });
        setOTurmas(normEntities(data.turmas));
      } catch {
        setOTurmas([]);
      } finally {
        setLoadingFilters(false);
      }
    })();
  }, [oEstado, oMunicipio, oAvaliacao, oEscola, oSerie, periodoYm]);

  const loadCartaoEstados = useCallback(async () => {
    try {
      setLoadingFilters(true);
      const data = await fetchAnswerSheetFilterOptions({
        ...(periodoYm ? { periodo: periodoYm } : {}),
      });
      setCEstados(normEntities(data.estados));
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar estados.', variant: 'destructive' });
    } finally {
      setLoadingFilters(false);
    }
  }, [toast, periodoYm]);

  useEffect(() => {
    loadCartaoEstados();
  }, [loadCartaoEstados]);

  useEffect(() => {
    if (cEstado === 'all') {
      setCMunicipios([]);
      return;
    }
    (async () => {
      try {
        setLoadingFilters(true);
        const data = await fetchAnswerSheetFilterOptions({
          estado: cEstado,
          ...(periodoYm ? { periodo: periodoYm } : {}),
        });
        setCMunicipios(normEntities(data.municipios));
      } catch {
        setCMunicipios([]);
      } finally {
        setLoadingFilters(false);
      }
    })();
  }, [cEstado, periodoYm]);

  useEffect(() => {
    if (cEstado === 'all' || cMunicipio === 'all') {
      setCGabaritos([]);
      return;
    }
    (async () => {
      try {
        setLoadingFilters(true);
        const data = await fetchAnswerSheetFilterOptions({
          estado: cEstado,
          municipio: cMunicipio,
          ...(periodoYm ? { periodo: periodoYm } : {}),
        });
        setCGabaritos(normEntities(data.gabaritos));
      } catch {
        setCGabaritos([]);
      } finally {
        setLoadingFilters(false);
      }
    })();
  }, [cEstado, cMunicipio, periodoYm]);

  useEffect(() => {
    if (cEstado === 'all' || cMunicipio === 'all' || cGabarito === 'all') {
      setCEscolas([]);
      return;
    }
    (async () => {
      try {
        setLoadingFilters(true);
        const data = await fetchAnswerSheetFilterOptions({
          estado: cEstado,
          municipio: cMunicipio,
          gabarito: cGabarito,
          ...(periodoYm ? { periodo: periodoYm } : {}),
        });
        setCEscolas(normEntities(data.escolas));
      } catch {
        setCEscolas([]);
      } finally {
        setLoadingFilters(false);
      }
    })();
  }, [cEstado, cMunicipio, cGabarito, periodoYm]);

  useEffect(() => {
    if (cEstado === 'all' || cMunicipio === 'all' || cGabarito === 'all') {
      setCSeries([]);
      return;
    }
    (async () => {
      try {
        setLoadingFilters(true);
        const data = await fetchAnswerSheetFilterOptions({
          estado: cEstado,
          municipio: cMunicipio,
          gabarito: cGabarito,
          ...(cEscola !== 'all' ? { escola: cEscola } : {}),
          ...(periodoYm ? { periodo: periodoYm } : {}),
        });
        setCSeries(normEntities(data.series));
      } catch {
        setCSeries([]);
      } finally {
        setLoadingFilters(false);
      }
    })();
  }, [cEstado, cMunicipio, cGabarito, cEscola, periodoYm]);

  useEffect(() => {
    if (cEstado === 'all' || cMunicipio === 'all' || cGabarito === 'all' || cSerie === 'all') {
      setCTurmas([]);
      return;
    }
    (async () => {
      try {
        setLoadingFilters(true);
        const data = await fetchAnswerSheetFilterOptions({
          estado: cEstado,
          municipio: cMunicipio,
          gabarito: cGabarito,
          ...(cEscola !== 'all' ? { escola: cEscola } : {}),
          serie: cSerie,
          ...(periodoYm ? { periodo: periodoYm } : {}),
        });
        setCTurmas(normEntities(data.turmas));
      } catch {
        setCTurmas([]);
      } finally {
        setLoadingFilters(false);
      }
    })();
  }, [cEstado, cMunicipio, cGabarito, cEscola, cSerie, periodoYm]);

  const canLoadOnlineMap =
    oEstado !== 'all' &&
    oMunicipio !== 'all' &&
    oAvaliacao !== 'all';

  const canLoadCartaoMap =
    cEstado !== 'all' &&
    cMunicipio !== 'all' &&
    cGabarito !== 'all';

  const loadOnlineMap = useCallback(async () => {
    if (!canLoadOnlineMap) {
      toast({
        title: 'Filtros incompletos',
        description: 'Selecione estado, município e avaliação.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setLoadingMap(true);
      const data = await fetchSkillsMapOnline({
        estado: oEstado,
        municipio: oMunicipio,
        avaliacao: oAvaliacao,
        escola: oEscola,
        serie: oSerie,
        turma: oTurma,
        disciplina: oDisciplina,
        ...(periodoYm ? { periodo: periodoYm } : {}),
      });
      setMapOnline(data);
      setODisciplinas(data.disciplinas_disponiveis || []);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: string; details?: string } } };
      toast({
        title: 'Erro ao carregar mapa',
        description: ax.response?.data?.details || ax.response?.data?.error || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoadingMap(false);
    }
  }, [
    canLoadOnlineMap,
    oEstado,
    oMunicipio,
    oAvaliacao,
    oEscola,
    oSerie,
    oTurma,
    oDisciplina,
    periodoYm,
    toast,
  ]);

  const loadCartaoMap = useCallback(async () => {
    if (!canLoadCartaoMap) {
      toast({
        title: 'Filtros incompletos',
        description: 'Selecione estado, município e gabarito.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setLoadingMap(true);
      const data = await fetchSkillsMapCartao({
        estado: cEstado,
        municipio: cMunicipio,
        gabarito: cGabarito,
        escola: cEscola,
        serie: cSerie,
        turma: cTurma,
        disciplina: cDisciplina,
        ...(periodoYm ? { periodo: periodoYm } : {}),
      });
      setMapCartao(data);
      setCDisciplinas(data.disciplinas_disponiveis || []);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: string; details?: string } } };
      toast({
        title: 'Erro ao carregar mapa',
        description: ax.response?.data?.details || ax.response?.data?.error || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoadingMap(false);
    }
  }, [
    canLoadCartaoMap,
    cEstado,
    cMunicipio,
    cGabarito,
    cEscola,
    cSerie,
    cTurma,
    cDisciplina,
    periodoYm,
    toast,
  ]);

  useEffect(() => {
    if (!canLoadOnlineMap) return;
    void loadOnlineMap();
  }, [canLoadOnlineMap, loadOnlineMap]);

  useEffect(() => {
    if (!canLoadCartaoMap) return;
    void loadCartaoMap();
  }, [canLoadCartaoMap, loadCartaoMap]);

  const openErrosOnline = async (h: SkillsMapHabilidade) => {
    setDialogSkill(h);
    setDialogOpen(true);
    setDialogErros(null);
    setLoadingErros(true);
    try {
      const data = await fetchSkillsMapOnlineErros({
        estado: oEstado,
        municipio: oMunicipio,
        avaliacao: oAvaliacao,
        escola: oEscola,
        serie: oSerie,
        turma: oTurma,
        disciplina: oDisciplina,
        skill_id: h.skill_id,
        ...(periodoYm ? { periodo: periodoYm } : {}),
      });
      setDialogErros(data);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar alunos.', variant: 'destructive' });
    } finally {
      setLoadingErros(false);
    }
  };

  const openErrosCartao = async (h: SkillsMapHabilidade) => {
    setDialogSkill(h);
    setDialogOpen(true);
    setDialogErros(null);
    setLoadingErros(true);
    try {
      const data = await fetchSkillsMapCartaoErros({
        estado: cEstado,
        municipio: cMunicipio,
        gabarito: cGabarito,
        escola: cEscola,
        serie: cSerie,
        turma: cTurma,
        disciplina: cDisciplina,
        skill_id: h.skill_id,
        bloco_disciplina: h.subject_id ?? null,
        ...(periodoYm ? { periodo: periodoYm } : {}),
      });
      setDialogErros(data);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar alunos.', variant: 'destructive' });
    } finally {
      setLoadingErros(false);
    }
  };

  return (
    <div className="container max-w-[1400px] py-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Thermometer className="h-8 w-8 text-primary" aria-hidden />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mapa de habilidades</h1>
          <p className="text-sm text-muted-foreground">
            Desempenho por habilidade em faixas de acertos; clique para ver alunos que erraram.
          </p>
        </div>
      </div>

      <ResultsPeriodMonthYearPicker
        value={selectedPeriod}
        onChange={setSelectedPeriod}
        disabled={loadingFilters}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'online' | 'cartao')}>
        <div className="flex w-full min-w-0 flex-row flex-wrap items-center justify-between gap-3">
          <TabsList className="min-h-0 min-w-0 flex-1 basis-[min(100%,28rem)] justify-start">
            <TabsTrigger value="online">Avaliação online</TabsTrigger>
            <TabsTrigger value="cartao">Cartão-resposta</TabsTrigger>
          </TabsList>
          <Button
            type="button"
            onClick={() => (tab === 'online' ? void loadOnlineMap() : void loadCartaoMap())}
            disabled={
              loadingMap ||
              loadingFilters ||
              (tab === 'online' ? !canLoadOnlineMap : !canLoadCartaoMap)
            }
            className="shrink-0 gap-2"
          >
            {loadingMap ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar mapa
          </Button>
        </div>

        <TabsContent value="online" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Estado</label>
                <Select value={oEstado} onValueChange={(v) => { setOEstado(v); setOMunicipio('all'); setOAvaliacao('all'); setOEscola('all'); setOSerie('all'); setOTurma('all'); setODisciplina('all'); setMapOnline(null); }}>
                  <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {oEstados.map((x) => (
                      <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Município</label>
                <Select value={oMunicipio} onValueChange={(v) => { setOMunicipio(v); setOAvaliacao('all'); setOEscola('all'); setOSerie('all'); setOTurma('all'); setODisciplina('all'); setMapOnline(null); }} disabled={oEstado === 'all'}>
                  <SelectTrigger><SelectValue placeholder="Município" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {oMunicipios.map((x) => (
                      <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Avaliação</label>
                <Select value={oAvaliacao} onValueChange={(v) => { setOAvaliacao(v); setOEscola('all'); setOSerie('all'); setOTurma('all'); setODisciplina('all'); setMapOnline(null); }} disabled={oMunicipio === 'all'}>
                  <SelectTrigger><SelectValue placeholder="Avaliação" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {oAvaliacoes.map((x) => (
                      <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Escola</label>
                <Select value={oEscola} onValueChange={(v) => { setOEscola(v); setOSerie('all'); setOTurma('all'); setMapOnline(null); }} disabled={oAvaliacao === 'all'}>
                  <SelectTrigger><SelectValue placeholder="Escola" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {oEscolas.map((x) => (
                      <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Série</label>
                <Select value={oSerie} onValueChange={(v) => { setOSerie(v); setOTurma('all'); setMapOnline(null); }} disabled={oAvaliacao === 'all'}>
                  <SelectTrigger><SelectValue placeholder="Série" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {oSeries.map((x) => (
                      <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Turma</label>
                <Select value={oTurma} onValueChange={(v) => { setOTurma(v); setMapOnline(null); }} disabled={oSerie === 'all'}>
                  <SelectTrigger><SelectValue placeholder="Turma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {oTurmas.map((x) => (
                      <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Disciplina</label>
                <Select value={oDisciplina} onValueChange={(v) => { setODisciplina(v); setMapOnline(null); }}>
                  <SelectTrigger><SelectValue placeholder="Disciplina" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {oDisciplinas.map((x) => (
                      <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {mapOnline && (
            <Card className="overflow-hidden">
              <CardContent className="space-y-4 pt-6">
                <HeatMapLegendInside />
                <HeatColumns
                  porFaixa={mapOnline.por_faixa}
                  onSkillClick={openErrosOnline}
                  gridClassName="mt-0"
                />
                {mapOnline.total_alunos_escopo != null && (
                  <p className="text-sm text-muted-foreground">
                    Alunos no escopo: {mapOnline.total_alunos_escopo}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cartao" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Estado</label>
                <Select value={cEstado} onValueChange={(v) => { setCEstado(v); setCMunicipio('all'); setCGabarito('all'); setCEscola('all'); setCSerie('all'); setCTurma('all'); setCDisciplina('all'); setMapCartao(null); }}>
                  <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {cEstados.map((x) => (
                      <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Município</label>
                <Select value={cMunicipio} onValueChange={(v) => { setCMunicipio(v); setCGabarito('all'); setCEscola('all'); setCSerie('all'); setCTurma('all'); setCDisciplina('all'); setMapCartao(null); }} disabled={cEstado === 'all'}>
                  <SelectTrigger><SelectValue placeholder="Município" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {cMunicipios.map((x) => (
                      <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Gabarito / cartão</label>
                <Select value={cGabarito} onValueChange={(v) => { setCGabarito(v); setCEscola('all'); setCSerie('all'); setCTurma('all'); setCDisciplina('all'); setMapCartao(null); }} disabled={cMunicipio === 'all'}>
                  <SelectTrigger><SelectValue placeholder="Gabarito" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {cGabaritos.map((x) => (
                      <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Escola</label>
                <Select value={cEscola} onValueChange={(v) => { setCEscola(v); setCSerie('all'); setCTurma('all'); setMapCartao(null); }} disabled={cGabarito === 'all'}>
                  <SelectTrigger><SelectValue placeholder="Escola" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {cEscolas.map((x) => (
                      <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Série</label>
                <Select value={cSerie} onValueChange={(v) => { setCSerie(v); setCTurma('all'); setMapCartao(null); }} disabled={cGabarito === 'all'}>
                  <SelectTrigger><SelectValue placeholder="Série" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {cSeries.map((x) => (
                      <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Turma</label>
                <Select value={cTurma} onValueChange={(v) => { setCTurma(v); setMapCartao(null); }} disabled={cSerie === 'all'}>
                  <SelectTrigger><SelectValue placeholder="Turma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {cTurmas.map((x) => (
                      <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Disciplina (bloco)</label>
                <Select value={cDisciplina} onValueChange={(v) => { setCDisciplina(v); setMapCartao(null); }}>
                  <SelectTrigger><SelectValue placeholder="Disciplina" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {cDisciplinas.map((x) => (
                      <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {mapCartao && (
            <Card className="overflow-hidden">
              <CardContent className="space-y-4 pt-6">
                <HeatMapLegendInside />
                <HeatColumns
                  porFaixa={mapCartao.por_faixa}
                  onSkillClick={openErrosCartao}
                  gridClassName="mt-0"
                />
                {mapCartao.total_alunos_escopo != null && (
                  <p className="text-sm text-muted-foreground">
                    Alunos no escopo: {mapCartao.total_alunos_escopo}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogSkill ? `Habilidade ${skillDisplayTitle(dialogSkill)}` : 'Alunos que erraram'}
            </DialogTitle>
            {dialogSkill &&
              (() => {
                const dn = skillDisciplinaLabel(dialogSkill);
                return dn ? (
                  <DialogDescription className="text-sm text-muted-foreground font-normal">{dn}</DialogDescription>
                ) : null;
              })()}
          </DialogHeader>
          {loadingErros && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loadingErros && dialogErros && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{dialogErros.percentual_erros.toFixed(1)}%</span>
                {' '}dos alunos no escopo erraram ao menos um item desta habilidade ({dialogErros.total_alunos_que_erraram} de {dialogErros.total_alunos_escopo}).
              </p>
              <ScrollArea className="h-[280px] rounded-md border p-2">
                <ul className="space-y-2 text-sm">
                  {dialogErros.alunos.length === 0 ? (
                    <li className="text-muted-foreground">Nenhum aluno nesta situação.</li>
                  ) : (
                    dialogErros.alunos.map((a) => (
                      <li key={a.id} className="border-b border-border/50 py-2 last:border-0">
                        <div className="font-medium">{a.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {[a.escola, a.serie, a.turma].filter(Boolean).join(' · ')}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
