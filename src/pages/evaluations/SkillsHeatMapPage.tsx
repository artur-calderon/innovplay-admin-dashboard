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
import { Separator } from '@/components/ui/separator';
import { Loader2, RefreshCw, Thermometer, FileDown } from 'lucide-react';
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
import {
  downloadSkillsHeatMapGeneralPdf,
  downloadSkillsHeatMapSkillPdf,
  type SkillsHeatMapPdfMeta,
} from '@/utils/report/skillsHeatMapPdf';

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
        'w-full rounded-lg p-2.5 text-left shadow-sm transition hover:opacity-95 hover:ring-2 hover:ring-primary/40',
        CARD_BG[h.faixa] || CARD_BG.basico
      )}
    >
      <div className="font-semibold text-xs leading-tight">{skillDisplayTitle(h)}</div>
      {disciplina && (
        <div className="mt-1 text-[10px] font-medium opacity-90 line-clamp-1 leading-snug">
          {disciplina}
        </div>
      )}
      <div className="mt-1.5 text-2xl font-bold leading-none">{h.percentual_acertos.toFixed(1)}%</div>
      <div className="mt-1 text-[11px] opacity-90">Acertaram</div>
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

function MapSummaryCards({
  avaliacaoLabel,
  alunosEscopo,
  alunosParticipantes,
}: {
  avaliacaoLabel: string;
  alunosEscopo: number | string;
  alunosParticipantes: number | string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Avaliação
        </p>
        <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-foreground">
          {avaliacaoLabel || '—'}
        </p>
      </div>

      <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Quantidade de alunos
        </p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
          {alunosEscopo ?? '—'}
        </p>
      </div>

      <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Alunos que participaram
        </p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-primary">
          {alunosParticipantes ?? '—'}
        </p>
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
            <h3 className="mb-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {FAIXA_LABELS[faixa]}
            </h3>
            {list.length === 0 ? (
              <p className="mt-4 text-center text-sm text-muted-foreground">Nenhuma habilidade</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {list.map((h, idx) => (
                  <SkillCard
                    key={`${h.skill_id}-${h.subject_id ?? 's'}-${h.question_ref ?? h.questao_numero ?? idx}`}
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
  const [dialogListaTab, setDialogListaTab] = useState<'acertaram' | 'erraram'>('acertaram');

  const periodoLabelText = useMemo(() => {
    if (selectedPeriod === 'all') return undefined;
    const n = normalizeResultsPeriodYm(selectedPeriod);
    if (n === 'all') return undefined;
    const [y, mo] = n.split('-');
    return `${mo}/${y}`;
  }, [selectedPeriod]);

  const filtrosPdfOnline = useMemo(() => {
    const lines: string[] = [];
    const e = oEstados.find((x) => x.id === oEstado)?.nome;
    const m = oMunicipios.find((x) => x.id === oMunicipio)?.nome;
    const av = oAvaliacoes.find((x) => x.id === oAvaliacao)?.nome;
    const es = oEscolas.find((x) => x.id === oEscola)?.nome;
    const sr = oSeries.find((x) => x.id === oSerie)?.nome;
    const tu = oTurmas.find((x) => x.id === oTurma)?.nome;
    const di = oDisciplinas.find((x) => x.id === oDisciplina)?.nome;
    if (e && oEstado !== 'all') lines.push(`Estado: ${e}`);
    if (m && oMunicipio !== 'all') lines.push(`Município: ${m}`);
    if (av && oAvaliacao !== 'all') lines.push(`Avaliação: ${av}`);
    if (es && oEscola !== 'all') lines.push(`Escola: ${es}`);
    if (sr && oSerie !== 'all') lines.push(`Série: ${sr}`);
    if (tu && oTurma !== 'all') lines.push(`Turma: ${tu}`);
    if (di && oDisciplina !== 'all') lines.push(`Disciplina: ${di}`);
    return lines;
  }, [
    oEstado,
    oMunicipio,
    oAvaliacao,
    oEscola,
    oSerie,
    oTurma,
    oDisciplina,
    oEstados,
    oMunicipios,
    oAvaliacoes,
    oEscolas,
    oSeries,
    oTurmas,
    oDisciplinas,
  ]);

  const filtrosPdfCartao = useMemo(() => {
    const lines: string[] = [];
    const e = cEstados.find((x) => x.id === cEstado)?.nome;
    const m = cMunicipios.find((x) => x.id === cMunicipio)?.nome;
    const gb = cGabaritos.find((x) => x.id === cGabarito)?.nome;
    const es = cEscolas.find((x) => x.id === cEscola)?.nome;
    const sr = cSeries.find((x) => x.id === cSerie)?.nome;
    const tu = cTurmas.find((x) => x.id === cTurma)?.nome;
    const di = cDisciplinas.find((x) => x.id === cDisciplina)?.nome;
    if (e && cEstado !== 'all') lines.push(`Estado: ${e}`);
    if (m && cMunicipio !== 'all') lines.push(`Município: ${m}`);
    if (gb && cGabarito !== 'all') lines.push(`Gabarito: ${gb}`);
    if (es && cEscola !== 'all') lines.push(`Escola: ${es}`);
    if (sr && cSerie !== 'all') lines.push(`Série: ${sr}`);
    if (tu && cTurma !== 'all') lines.push(`Turma: ${tu}`);
    if (di && cDisciplina !== 'all') lines.push(`Disciplina (bloco): ${di}`);
    return lines;
  }, [
    cEstado,
    cMunicipio,
    cGabarito,
    cEscola,
    cSerie,
    cTurma,
    cDisciplina,
    cEstados,
    cMunicipios,
    cGabaritos,
    cEscolas,
    cSeries,
    cTurmas,
    cDisciplinas,
  ]);

  const filtrosMetaOnline = useMemo<SkillsHeatMapPdfMeta>(() => ({
    estado:    oEstados.find((x) => x.id === oEstado)?.nome,
    municipio: oMunicipios.find((x) => x.id === oMunicipio)?.nome,
    avaliacao: oAvaliacoes.find((x) => x.id === oAvaliacao)?.nome,
    escola:    oEscolas.find((x) => x.id === oEscola)?.nome,
    serie:     oSeries.find((x) => x.id === oSerie)?.nome,
    turma:     oTurmas.find((x) => x.id === oTurma)?.nome,
    disciplina: oDisciplinas.find((x) => x.id === oDisciplina)?.nome,
  }), [
    oEstado, oMunicipio, oAvaliacao, oEscola, oSerie, oTurma, oDisciplina,
    oEstados, oMunicipios, oAvaliacoes, oEscolas, oSeries, oTurmas, oDisciplinas,
  ]);

  const filtrosMetaCartao = useMemo<SkillsHeatMapPdfMeta>(() => ({
    estado:    cEstados.find((x) => x.id === cEstado)?.nome,
    municipio: cMunicipios.find((x) => x.id === cMunicipio)?.nome,
    gabarito:  cGabaritos.find((x) => x.id === cGabarito)?.nome,
    escola:    cEscolas.find((x) => x.id === cEscola)?.nome,
    serie:     cSeries.find((x) => x.id === cSerie)?.nome,
    turma:     cTurmas.find((x) => x.id === cTurma)?.nome,
    disciplina: cDisciplinas.find((x) => x.id === cDisciplina)?.nome,
  }), [
    cEstado, cMunicipio, cGabarito, cEscola, cSerie, cTurma, cDisciplina,
    cEstados, cMunicipios, cGabaritos, cEscolas, cSeries, cTurmas, cDisciplinas,
  ]);

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
    setDialogListaTab('acertaram');
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
        question_ref: h.question_ref ?? null,
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
    setDialogListaTab('acertaram');
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
        question_ref: h.question_ref ?? null,
        ...(periodoYm ? { periodo: periodoYm } : {}),
      });
      setDialogErros(data);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar alunos.', variant: 'destructive' });
    } finally {
      setLoadingErros(false);
    }
  };

  const handlePdfGeral = () => {
    const run = async () => {
      if (tab === 'online') {
        if (!mapOnline) return;
        await downloadSkillsHeatMapGeneralPdf({
          modo: 'online',
          map: mapOnline,
          filtrosTexto: filtrosPdfOnline,
          periodoLabel: periodoLabelText,
          meta: filtrosMetaOnline,
        });
      } else {
        if (!mapCartao) return;
        await downloadSkillsHeatMapGeneralPdf({
          modo: 'cartao',
          map: mapCartao,
          filtrosTexto: filtrosPdfCartao,
          periodoLabel: periodoLabelText,
          meta: filtrosMetaCartao,
        });
      }
      toast({ title: 'PDF gerado', description: 'O download deve começar em instantes.' });
    };
    run().catch(() => {
      toast({ title: 'Erro', description: 'Não foi possível gerar o PDF.', variant: 'destructive' });
    });
  };

  const handlePdfHabilidade = () => {
    if (!dialogSkill || !dialogErros) return;
    const run = async () => {
      await downloadSkillsHeatMapSkillPdf({
        modo: tab,
        skill: dialogSkill!,
        erros: dialogErros!,
        filtrosTexto: tab === 'online' ? filtrosPdfOnline : filtrosPdfCartao,
        periodoLabel: periodoLabelText,
        meta: tab === 'online' ? filtrosMetaOnline : filtrosMetaCartao,
      });
      toast({ title: 'PDF gerado', description: 'O download deve começar em instantes.' });
    };
    run().catch(() => {
      toast({ title: 'Erro', description: 'Não foi possível gerar o PDF.', variant: 'destructive' });
    });
  };

  return (
    <div className="container max-w-[1400px] py-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Thermometer className="h-8 w-8 text-primary" aria-hidden />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mapa de habilidades</h1>
          <p className="text-sm text-muted-foreground">
            Desempenho por habilidade em faixas de acertos; clique em uma habilidade para ver detalhes e listas de acertos e erros (apenas participantes).
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
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePdfGeral}
              disabled={
                loadingMap ||
                (tab === 'online' ? !mapOnline : !mapCartao)
              }
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              PDF geral
            </Button>
            <Button
              type="button"
              onClick={() => (tab === 'online' ? void loadOnlineMap() : void loadCartaoMap())}
              disabled={
                loadingMap ||
                loadingFilters ||
                (tab === 'online' ? !canLoadOnlineMap : !canLoadCartaoMap)
              }
              className="gap-2"
            >
              {loadingMap ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar mapa
            </Button>
          </div>
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
                <MapSummaryCards
                  avaliacaoLabel={oAvaliacoes.find((x) => x.id === oAvaliacao)?.nome || '—'}
                  alunosEscopo={
                    mapOnline.total_alunos_escopo_turma ??
                    mapOnline.total_alunos_participantes ??
                    mapOnline.total_alunos_escopo ??
                    '—'
                  }
                  alunosParticipantes={
                    mapOnline.total_alunos_participantes ?? mapOnline.total_alunos_escopo ?? '—'
                  }
                />
                <HeatMapLegendInside />
                <HeatColumns
                  porFaixa={mapOnline.por_faixa}
                  onSkillClick={openErrosOnline}
                  gridClassName="mt-0"
                />
                {(mapOnline.total_alunos_escopo_turma != null ||
                  mapOnline.total_alunos_participantes != null ||
                  mapOnline.total_alunos_escopo != null) && (
                  <p className="text-sm text-muted-foreground">
                    Alunos no recorte (turma):{' '}
                    {mapOnline.total_alunos_escopo_turma ?? mapOnline.total_alunos_participantes ?? mapOnline.total_alunos_escopo}
                    {' · '}
                    Participantes:{' '}
                    {mapOnline.total_alunos_participantes ?? mapOnline.total_alunos_escopo ?? '—'}
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
                <MapSummaryCards
                  avaliacaoLabel={cGabaritos.find((x) => x.id === cGabarito)?.nome || '—'}
                  alunosEscopo={
                    mapCartao.total_alunos_escopo_turma ??
                    mapCartao.total_alunos_participantes ??
                    mapCartao.total_alunos_escopo ??
                    '—'
                  }
                  alunosParticipantes={
                    mapCartao.total_alunos_participantes ?? mapCartao.total_alunos_escopo ?? '—'
                  }
                />
                <HeatMapLegendInside />
                <HeatColumns
                  porFaixa={mapCartao.por_faixa}
                  onSkillClick={openErrosCartao}
                  gridClassName="mt-0"
                />
                {(mapCartao.total_alunos_escopo_turma != null ||
                  mapCartao.total_alunos_participantes != null ||
                  mapCartao.total_alunos_escopo != null) && (
                  <p className="text-sm text-muted-foreground">
                    Alunos no recorte (turma):{' '}
                    {mapCartao.total_alunos_escopo_turma ?? mapCartao.total_alunos_participantes ?? mapCartao.total_alunos_escopo}
                    {' · '}
                    Participantes:{' '}
                    {mapCartao.total_alunos_participantes ?? mapCartao.total_alunos_escopo ?? '—'}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0">
          <div className="px-6 pt-6 pb-2">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-lg leading-snug">
                    {dialogSkill ? skillDisplayTitle(dialogSkill) : 'Detalhe da habilidade'}
                  </DialogTitle>
                  {dialogSkill &&
                    (() => {
                      const dn = skillDisciplinaLabel(dialogSkill);
                      return dn ? (
                        <DialogDescription className="text-sm text-muted-foreground font-normal">
                          {dn}
                        </DialogDescription>
                      ) : null;
                    })()}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2"
                  onClick={handlePdfHabilidade}
                  disabled={loadingErros || !dialogSkill || !dialogErros}
                >
                  <FileDown className="h-4 w-4" />
                  PDF da habilidade
                </Button>
              </div>
            </DialogHeader>
            {dialogSkill && (dialogSkill.descricao || '').trim() ? (
              <div className="mt-3 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm leading-relaxed text-foreground">
                {(dialogSkill.descricao || '').trim()}
              </div>
            ) : null}
            {(() => {
              const mapAtual = tab === 'online' ? mapOnline : mapCartao;
              const nTurma =
                mapAtual?.total_alunos_escopo_turma ??
                mapAtual?.total_alunos_participantes ??
                mapAtual?.total_alunos_escopo;
              const nPartMap =
                mapAtual?.total_alunos_participantes ?? mapAtual?.total_alunos_escopo;
              if (nTurma == null && nPartMap == null) return null;
              return (
                <p className="mt-3 text-xs text-muted-foreground">
                  Recorte do mapa — alunos na turma: {nTurma ?? '—'} · participantes no mapa:{' '}
                  {nPartMap ?? '—'}
                </p>
              );
            })()}
          </div>
          <Separator />
          <div className="min-h-0 flex-1 overflow-hidden px-6 pb-6 pt-4">
            {loadingErros && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loadingErros && dialogErros && dialogSkill && (
              <div className="flex h-full min-h-[320px] flex-col gap-4">
                {(() => {
                  const tot = dialogErros.total_alunos_escopo;
                  const nErr = dialogErros.total_alunos_que_erraram;
                  const nOk =
                    dialogErros.total_alunos_que_acertaram ?? Math.max(0, tot - nErr);
                  const pe = dialogErros.percentual_erros;
                  const pa =
                    dialogErros.percentual_acertos ?? (tot > 0 ? (nOk / tot) * 100 : 0);
                  return (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="rounded-md border bg-card px-3 py-2 text-center">
                        <div className="text-[11px] font-medium uppercase text-muted-foreground">
                          Participantes
                        </div>
                        <div className="text-lg font-semibold tabular-nums">{tot}</div>
                      </div>
                      <div className="rounded-md border bg-emerald-500/10 px-3 py-2 text-center">
                        <div className="text-[11px] font-medium uppercase text-emerald-800 dark:text-emerald-200">
                          Acertaram
                        </div>
                        <div className="text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                          {nOk}{' '}
                          <span className="text-xs font-normal opacity-80">
                            ({pa.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="rounded-md border bg-red-500/10 px-3 py-2 text-center">
                        <div className="text-[11px] font-medium uppercase text-red-800 dark:text-red-200">
                          Erraram
                        </div>
                        <div className="text-lg font-semibold tabular-nums text-red-700 dark:text-red-300">
                          {nErr}{' '}
                          <span className="text-xs font-normal opacity-80">
                            ({pe.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <Tabs
                  value={dialogListaTab}
                  onValueChange={(v) => setDialogListaTab(v as 'acertaram' | 'erraram')}
                  className="flex min-h-0 flex-1 flex-col gap-2"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="acertaram">
                      Acertaram (
                      {dialogErros.total_alunos_que_acertaram ??
                        Math.max(
                          0,
                          dialogErros.total_alunos_escopo - dialogErros.total_alunos_que_erraram
                        )}
                      )
                    </TabsTrigger>
                    <TabsTrigger value="erraram">
                      Erraram ({dialogErros.total_alunos_que_erraram})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="acertaram" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
                    <ScrollArea className="h-[min(40vh,320px)] rounded-md border">
                      <ul className="space-y-0 p-2 text-sm">
                        {(dialogErros.alunos_que_acertaram ?? []).length === 0 ? (
                          <li className="px-2 py-6 text-center text-muted-foreground">
                            Nenhum participante acertou todos os itens desta habilidade.
                          </li>
                        ) : (
                          (dialogErros.alunos_que_acertaram ?? []).map((a) => (
                            <li
                              key={a.id}
                              className="border-b border-border/50 px-2 py-2 last:border-0"
                            >
                              <div className="font-medium text-emerald-600 dark:text-emerald-400">
                                {a.nome}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {[a.escola, a.serie, a.turma].filter(Boolean).join(' · ')}
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="erraram" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
                    <ScrollArea className="h-[min(40vh,320px)] rounded-md border">
                      <ul className="space-y-0 p-2 text-sm">
                        {(dialogErros.alunos_que_erraram ?? dialogErros.alunos).length === 0 ? (
                          <li className="px-2 py-6 text-center text-muted-foreground">
                            Nenhum participante errou itens desta habilidade.
                          </li>
                        ) : (
                          (dialogErros.alunos_que_erraram ?? dialogErros.alunos).map((a) => (
                            <li
                              key={a.id}
                              className="border-b border-border/50 px-2 py-2 last:border-0"
                            >
                              <div className="font-medium text-red-600 dark:text-red-400">{a.nome}</div>
                              <div className="text-xs text-muted-foreground">
                                {[a.escola, a.serie, a.turma].filter(Boolean).join(' · ')}
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
                <p className="text-xs text-muted-foreground">
                  Listas e percentuais consideram apenas <strong>participantes</strong> (com prova ou cartão
                  válido), excluindo faltosos.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
