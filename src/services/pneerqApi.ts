import { api } from '@/lib/api';

/** Métricas numéricas comuns nos indicadores PNEERQ */
export interface PneerqMetricas {
  numerador?: number;
  denominador?: number;
  valor?: number;
}

/** Indicador dentro de um eixo (contrato evolutivo — campos extras permitidos) */
export interface PneerqIndicador {
  id?: string;
  nome?: string;
  descricao?: string;
  unidade?: string;
  metricas?: PneerqMetricas;
  porGrupoRacial?: Record<string, PneerqMetricas>;
  /** Quando o backend enviar categorias para gráficos */
  distribuicao?: Record<string, number>;
  [key: string]: unknown;
}

export interface PneerqEixo {
  nome?: string;
  indicadores?: PneerqIndicador[];
  [key: string]: unknown;
}

export type PneerqEixos = Record<string, PneerqEixo>;

export interface PneerqFormResultBody {
  formId?: string;
  totalRespostas?: number;
  filtros?: Record<string, unknown>;
  gruposRaciais?: unknown;
  dashboard?: PneerqDashboard;
  metadados?: Record<string, unknown>;
  eixos?: PneerqEixos;
}

export interface PneerqDashboardChart {
  titulo?: string;
  labels?: string[];
  valuesCount?: number[];
  valuesPercent?: number[];
}

export interface PneerqDashboardKpi {
  id: string;
  titulo: string;
  subtitulo?: string;
  unidade: 'percent' | 'pp' | 'label' | string;
  valor: number | string;
}

export interface PneerqDashboardMatrixRow {
  eixo: string;
  referencia?: string;
  saude?: number;
  status?: 'CONCLUÍDO' | 'ALERTA' | 'CRÍTICO' | string;
}

export interface PneerqDashboard {
  charts?: {
    curriculo?: PneerqDashboardChart;
    expectativa?: PneerqDashboardChart;
    [key: string]: PneerqDashboardChart | undefined;
  };
  kpis?: PneerqDashboardKpi[];
  matrix?: PneerqDashboardMatrixRow[];
  quality?: Record<string, unknown>;
  score?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PneerqAggregatedResultBody {
  escopo?: Record<string, unknown>;
  formularios?: Array<{
    formId?: string;
    formTitle?: string;
    formType?: string;
    totalRespostas?: number;
  }>;
  totalFormularios?: number;
  totalRespostas?: number;
  pneerqConsolidado?: {
    gruposRaciais?: unknown;
    dashboard?: PneerqDashboard;
    metadados?: Record<string, unknown>;
    eixos?: PneerqEixos;
  };
  geradoEm?: string;
}

export interface PneerqProcessingBody {
  status: 'processing';
  message?: string;
  pollSameUrl?: boolean;
  cacheStatus?: Record<string, unknown>;
}

export type PneerqFormApiResponse = PneerqFormResultBody | PneerqProcessingBody;
export type PneerqAggregatedApiResponse = PneerqAggregatedResultBody | PneerqProcessingBody;

export interface BuildPneerqParamsInput {
  state: string;
  municipio: string;
  escolaCsv?: string;
  serieCsv?: string;
  turmaCsv?: string;
  ageDistortionDelta?: number;
}

/**
 * Query params alinhados à documentação PNEERQ (state, municipio, escola, serie, turma, ageDistortionDelta).
 */
export function buildPneerqQueryParams(input: BuildPneerqParamsInput): Record<string, string | number> {
  const p: Record<string, string | number> = {
    state: input.state,
    municipio: input.municipio,
  };
  if (input.escolaCsv) p.escola = input.escolaCsv;
  if (input.serieCsv) p.serie = input.serieCsv;
  if (input.turmaCsv) p.turma = input.turmaCsv;
  if (input.ageDistortionDelta !== undefined && input.ageDistortionDelta !== null) {
    p.ageDistortionDelta = input.ageDistortionDelta;
  }
  return p;
}

export type PneerqRequestConfig = {
  params?: Record<string, string | number>;
  meta?: { cityId?: string };
};

export function isPneerqProcessingPayload(data: unknown): data is PneerqProcessingBody {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as PneerqProcessingBody).status === 'processing'
  );
}

/**
 * GET por formulário — 200 com dados, 202 com processamento em background.
 */
export async function fetchPneerqByForm(
  formId: string,
  config: PneerqRequestConfig
): Promise<{ status: number; data: PneerqFormApiResponse }> {
  const res = await api.get<PneerqFormApiResponse>(`/forms/${formId}/results/pneerq`, {
    ...config,
    validateStatus: (s) => s === 200 || s === 202,
  });
  return { status: res.status, data: res.data };
}

/**
 * GET agregado por escopo.
 */
export async function fetchPneerqAggregated(
  config: PneerqRequestConfig
): Promise<{ status: number; data: PneerqAggregatedApiResponse }> {
  const res = await api.get<PneerqAggregatedApiResponse>('/forms/aggregated/results/pneerq', {
    ...config,
    validateStatus: (s) => s === 200 || s === 202,
  });
  return { status: res.status, data: res.data };
}
