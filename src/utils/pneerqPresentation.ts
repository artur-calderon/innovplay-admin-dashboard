import type {
  PneerqAggregatedResultBody,
  PneerqEixo,
  PneerqEixos,
  PneerqFormResultBody,
  PneerqIndicador,
  PneerqDashboard,
  PneerqDashboardKpi,
  PneerqDashboardMatrixRow,
} from '@/services/pneerqApi';

export type ReportMode = 'form' | 'aggregated';

export function getPneerqDashboard(
  mode: ReportMode,
  payload: PneerqFormResultBody | PneerqAggregatedResultBody | null
): PneerqDashboard | undefined {
  if (!payload) return undefined;
  if (mode === 'form') return (payload as PneerqFormResultBody).dashboard;
  return (payload as PneerqAggregatedResultBody).pneerqConsolidado?.dashboard;
}

export function getPneerqEixos(
  mode: ReportMode,
  payload: PneerqFormResultBody | PneerqAggregatedResultBody | null
): PneerqEixos | undefined {
  if (!payload) return undefined;
  if (mode === 'form') {
    return (payload as PneerqFormResultBody).eixos;
  }
  return (payload as PneerqAggregatedResultBody).pneerqConsolidado?.eixos;
}

/** Faixas para barra e badge: valor 0–100 como “saúde” do indicador agregado do eixo */
export function healthStatusFromValor(valor: number | undefined): {
  label: 'CONCLUÍDO' | 'ALERTA' | 'CRÍTICO';
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  frac: number;
} {
  const v = valor ?? 0;
  const frac = Math.max(0, Math.min(100, v)) / 100;
  if (v >= 70) return { label: 'CONCLUÍDO', variant: 'default', frac };
  if (v >= 40) return { label: 'ALERTA', variant: 'secondary', frac };
  return { label: 'CRÍTICO', variant: 'destructive', frac };
}

export interface KpiCardModel {
  title: string;
  value: string;
  hint: string;
}

function formatKpiValue(kpi: PneerqDashboardKpi): string {
  if (kpi.unidade === 'label') return String(kpi.valor ?? '—');
  if (typeof kpi.valor !== 'number') return String(kpi.valor ?? '—');
  if (kpi.unidade === 'percent') return `${kpi.valor.toFixed(kpi.valor % 1 === 0 ? 0 : 1)}%`;
  if (kpi.unidade === 'pp') return `${kpi.valor.toFixed(kpi.valor % 1 === 0 ? 0 : 1)} pp`;
  return String(kpi.valor);
}

export function buildKpiCardsFromDashboard(
  dashboard: PneerqDashboard | undefined,
  totalRespostas?: number
): KpiCardModel[] {
  const cards: KpiCardModel[] = [];
  if (totalRespostas != null && totalRespostas >= 0) {
    cards.push({
      title: 'Respostas no escopo',
      value: String(totalRespostas),
      hint: 'Total de questionários considerados',
    });
  }
  const kpis = dashboard?.kpis ?? [];
  kpis.slice(0, 4).forEach((k) => {
    cards.push({
      title: k.titulo,
      value: formatKpiValue(k),
      hint: k.subtitulo ?? k.id,
    });
  });
  return cards;
}

/**
 * Monta até 4 KPIs a partir dos primeiros indicadores com métrica numérica.
 * Sem dados inventados: só exibe o que vier na API.
 */
export function buildKpiCardsFromEixos(eixos: PneerqEixos | undefined, totalRespostas?: number): KpiCardModel[] {
  const cards: KpiCardModel[] = [];
  if (totalRespostas != null && totalRespostas >= 0) {
    cards.push({
      title: 'Respostas no escopo',
      value: String(totalRespostas),
      hint: 'Total de questionários considerados',
    });
  }
  if (!eixos) return cards;

  for (const [, eixo] of Object.entries(eixos)) {
    const inds = eixo.indicadores ?? [];
    for (const ind of inds) {
      const v = ind.metricas?.valor;
      if (typeof v !== 'number' || Number.isNaN(v)) continue;
      const unit = ind.unidade === 'percent' ? '%' : '';
      cards.push({
        title: ind.nome ?? ind.id ?? 'Indicador',
        value: unit ? `${v.toFixed(v % 1 === 0 ? 0 : 1)}${unit}` : v.toFixed(v % 1 === 0 ? 0 : 2),
        hint: (ind.descricao ?? '').slice(0, 120) || (ind.id ?? ''),
      });
      if (cards.length >= 4) return cards;
    }
    if (cards.length >= 4) break;
  }
  return cards;
}

export interface MatrixRowModel {
  eixoKey: string;
  eixoNome: string;
  subtitle: string;
  fonteLabel: string;
  valor: number | undefined;
}

export interface DashboardMatrixRowModel {
  eixoNome: string;
  referencia: string;
  saude: number | undefined;
  status: string | undefined;
}

export function buildMatrixRowsFromDashboard(dashboard: PneerqDashboard | undefined): DashboardMatrixRowModel[] {
  const rows: PneerqDashboardMatrixRow[] = (dashboard?.matrix ?? []) as PneerqDashboardMatrixRow[];
  return rows.map((r) => ({
    eixoNome: r.eixo,
    referencia: r.referencia ?? '—',
    saude: typeof r.saude === 'number' ? r.saude : undefined,
    status: r.status,
  }));
}

/** Uma linha por eixo: média dos valores dos indicadores ou primeiro valor disponível */
export function buildMatrixRowsFromEixos(eixos: PneerqEixos | undefined): MatrixRowModel[] {
  if (!eixos) return [];
  return Object.entries(eixos).map(([key, eixo]) => {
    const nome = (eixo as PneerqEixo).nome ?? key;
    const inds = (eixo as PneerqEixo).indicadores ?? [];
    const valores = inds
      .map((i) => i.metricas?.valor)
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    const valor =
      valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : undefined;
    const firstInd = inds[0];
    const fonte =
      [firstInd?.id, firstInd?.nome].filter(Boolean).join(' · ') || '—';
    const subtitle =
      (firstInd?.descricao ?? '').slice(0, 80) ||
      `${inds.length} indicador(es)`;
    return {
      eixoKey: key,
      eixoNome: nome,
      subtitle,
      fonteLabel: fonte,
      valor,
    };
  });
}

export interface BarDatum {
  name: string;
  value: number;
}

export interface ChartPair {
  bar: { title: string; data: BarDatum[] };
  pie: { title: string; data: BarDatum[] };
}

export interface DashboardChartsModel {
  curriculo: { title: string; data: BarDatum[] } | null;
  expectativa: { title: string; data: BarDatum[] } | null;
}

export function buildDashboardCharts(dashboard: PneerqDashboard | undefined): DashboardChartsModel {
  const c = dashboard?.charts?.curriculo;
  const e = dashboard?.charts?.expectativa;

  const toData = (labels?: string[], values?: number[]): BarDatum[] => {
    if (!labels?.length || !values?.length) return [];
    return labels.map((name, idx) => ({ name, value: Number(values[idx] ?? 0) }));
  };

  return {
    curriculo: c ? { title: c.titulo ?? 'Abordagem do tema em sala', data: toData(c.labels, c.valuesPercent) } : null,
    expectativa: e ? { title: e.titulo ?? 'Expectativa docente', data: toData(e.labels, e.valuesPercent) } : null,
  };
}

/** Prioriza indicadores com campo `distribuicao`; senão comparação racial PretaParda vs Branca no primeiro indicador com porGrupoRacial */
export function buildChartPairFromEixos(eixos: PneerqEixos | undefined): ChartPair | null {
  if (!eixos) return null;

  let barInd: PneerqIndicador | undefined;
  let pieInd: PneerqIndicador | undefined;

  for (const eixo of Object.values(eixos)) {
    for (const ind of eixo.indicadores ?? []) {
      const d = ind.distribuicao;
      if (d && typeof d === 'object' && Object.keys(d).length > 0) {
        if (!barInd) barInd = ind;
        else if (!pieInd) pieInd = ind;
      }
      if (barInd && pieInd) break;
    }
    if (barInd && pieInd) break;
  }

  const toBarData = (ind: PneerqIndicador): BarDatum[] => {
    const d = ind.distribuicao ?? {};
    return Object.entries(d).map(([name, value]) => ({
      name,
      value: typeof value === 'number' ? value : Number(value) || 0,
    }));
  };

  if (barInd?.distribuicao) {
    const barData = toBarData(barInd);
    if (pieInd?.distribuicao) {
      return {
        bar: {
          title: barInd.nome ?? barInd.id ?? 'Distribuição',
          data: barData,
        },
        pie: {
          title: pieInd.nome ?? pieInd.id ?? 'Distribuição',
          data: toBarData(pieInd),
        },
      };
    }
    const racial = barInd.porGrupoRacial;
    if (racial && Object.keys(racial).length > 0) {
      const pieData: BarDatum[] = Object.entries(racial).map(([name, m]) => ({
        name,
        value: m.valor ?? 0,
      }));
      return {
        bar: { title: barInd.nome ?? barInd.id ?? 'Distribuição', data: barData },
        pie: { title: 'Por grupo racial (valor)', data: pieData },
      };
    }
    return {
      bar: { title: barInd.nome ?? barInd.id ?? 'Distribuição', data: barData },
      pie: { title: 'Comparativo', data: barData.slice(0, Math.min(6, barData.length)) },
    };
  }

  // Fallback: agrupar valores por nome do indicador (barras simples)
  const barFallback: BarDatum[] = [];
  for (const eixo of Object.values(eixos)) {
    for (const ind of eixo.indicadores ?? []) {
      const v = ind.metricas?.valor;
      if (typeof v === 'number') {
        barFallback.push({ name: (ind.nome ?? ind.id ?? '?').slice(0, 24), value: v });
      }
    }
  }
  if (barFallback.length === 0) return null;
  const half = Math.ceil(barFallback.length / 2);
  return {
    bar: { title: 'Indicadores (valor)', data: barFallback.slice(0, half) },
    pie: { title: 'Indicadores (valor)', data: barFallback.slice(half) },
  };
}

export function buildNarrativeParagraphs(eixos: PneerqEixos | undefined): { situacao: string; gestao: string } {
  const rows = buildMatrixRowsFromEixos(eixos).filter((r) => r.valor !== undefined);
  const lowest = rows.reduce(
    (acc, r) => (acc == null || (r.valor ?? 0) < (acc.valor ?? 0) ? r : acc),
    null as MatrixRowModel | null
  );
  const situacao =
    rows.length > 0
      ? `Foram analisados ${rows.length} eixo(s) PNEERQ no escopo selecionado. ` +
        (lowest
          ? `O menor índice médio aparece em “${lowest.eixoNome}” (${(lowest.valor ?? 0).toFixed(1)}).`
          : '')
      : 'Selecione filtros e carregue o relatório para exibir a análise situacional com base nos dados retornados pela API.';

  const gestao =
    lowest && (lowest.valor ?? 0) < 40
      ? `Recomenda-se priorizar ações no eixo “${lowest.eixoNome}”, dado o indicador médio mais baixo no conjunto analisado.`
      : 'Com base nos indicadores disponíveis, mantenha o monitoramento dos eixos e alinhe intervenções às metas do PNEERQ no município.';

  return { situacao, gestao };
}
