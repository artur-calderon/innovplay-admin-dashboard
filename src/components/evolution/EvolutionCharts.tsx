import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  LineChart,
  TrendingUp,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Activity,
  Target,
  Calendar,
  Users,
} from 'lucide-react';
import { Eye, EyeOff } from 'lucide-react';
import { EvolutionData } from './EvolutionChart';

export interface ProcessedEvolutionData {
  /** "Geral" por etapa (notas) */
  generalData: EvolutionData[];
  /** "Geral" por etapa (proficiência) */
  proficiencyData: EvolutionData[];
  /** "Classificação/Aprovação" geral */
  approvalData: EvolutionData[];
  /** por disciplina (notas) */
  subjectData: Record<string, EvolutionData[]>;
  /** por disciplina (proficiência) */
  subjectProficiencyData: Record<string, EvolutionData[]>;
  /** nomes das avaliações para exibição */
  evaluationNames: string[];
}

interface EvolutionChartsProps {
  data: ProcessedEvolutionData;
  isLoading?: boolean;
}

const colors = {
  primary: '#2563eb', // azul profissional
  secondary: '#64748b', // cinza neutro
  success: '#059669', // verde profissional
  warning: '#d97706', // laranja profissional
  danger: '#dc2626', // vermelho profissional
  neutral: '#6b7280', // cinza neutro
};

// Paleta de cores personalizada
const customColors = ['#81338A', '#758E4F', '#F6AE2D', '#33658A', '#86BBD8'];

// Paleta específica para proficiência
const proficiencyColors = ['#5DD9C1', '#ACFCD9', '#B084CC', '#665687', '#190933'];

// Função para obter cor baseada no índice
const getColorByIndex = (index: number): string => {
  return customColors[index % customColors.length];
};

// Função para obter domínio de proficiência baseado na disciplina
const getProficiencyDomain = (subjectName: string): [number, number] => {
  // Se for Matemática, usar 425 como máximo
  if (subjectName.toLowerCase().includes('matemática') || 
      subjectName.toLowerCase().includes('matematica') ||
      subjectName.toLowerCase().includes('math')) {
    return [0, 425];
  }
  // Para outras disciplinas, usar 400 como máximo
  return [0, 400];
};

// Função para obter cores para disciplinas baseada no nome da disciplina
const getSubjectColors = (subjectName: string, subjectIndex: number) => {
  // Paleta específica por disciplina
  const subjectColorMap: { [key: string]: string } = {
    'matemática': '#0077B6',
    'matematica': '#0077B6',
    'math': '#0077B6',
    'língua portuguesa': '#E63946',
    'lingua portuguesa': '#E63946',
    'português': '#E63946',
    'portugues': '#E63946',
    'ciências': '#2A9D8F',
    'ciencias': '#2A9D8F',
    'ciência': '#2A9D8F',
    'ciencia': '#2A9D8F',
    'história': '#8D6E63',
    'historia': '#8D6E63',
    'geografia': '#6B8E23',
    'inglês': '#6A4C93',
    'ingles': '#6A4C93',
    'english': '#6A4C93',
    'educação física': '#F4A261',
    'educacao fisica': '#F4A261',
    'educação fisica': '#F4A261',
    'educacao física': '#F4A261',
    'física': '#F4A261',
    'fisica': '#F4A261',
    'arte': '#E76F51',
    'art': '#E76F51'
  };

  // Buscar cor baseada no nome da disciplina
  const baseColor = Object.keys(subjectColorMap).find(key => 
    subjectName.toLowerCase().includes(key.toLowerCase())
  );

  const primaryColor = baseColor ? subjectColorMap[baseColor] : customColors[subjectIndex % customColors.length];
  
  // Gerar variações da cor principal para as 3 avaliações
  const palette = generateColorVariations(primaryColor);
  
  return {
    bar: palette[0],
    line: palette[1],
    palette: palette,
    primaryColor: primaryColor
  };
};

// Função para gerar variações de uma cor
const generateColorVariations = (baseColor: string): string[] => {
  // Converter hex para RGB
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Gerar variações (mais claro, original, mais escuro)
  const variations = [
    `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`, // Mais claro
    baseColor, // Original
    `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})` // Mais escuro
  ];
  
  return variations;
};

// Função para obter cor da linha baseada na evolução
const getLineColorByEvolution = (data: Record<string, unknown>[]): string => {
  if (data.length < 2) return '#6B7280'; // Cinza se não há dados suficientes
  
  const firstValue = data[0].nota as number || data[0].proficiencia as number || 0;
  const lastValue = data[data.length - 1].nota as number || data[data.length - 1].proficiencia as number || 0;
  
  const difference = lastValue - firstValue;
  const threshold = 0.1; // Threshold para considerar mudança significativa
  
  if (difference > threshold) {
    return '#10B981'; // Verde vibrante para subida
  } else if (difference < -threshold) {
    return '#EF4444'; // Vermelho vibrante para descida
  } else {
    return '#6B7280'; // Cinza para manutenção
  }
};

type SegmentedRow<T> = T & {
  up?: number | null;
  down?: number | null;
  flat?: number | null;
};

/**
 * Quebra a série em 3: up (verde), down (vermelha), flat (cinza).
 * Importante: marca SEMPRE os dois endpoints do segmento (i-1 e i),
 * senão o Recharts não desenha o trecho.
 */
function segmentLine<T extends Record<string, unknown>>(
  rows: T[],
  key: 'nota' | 'proficiencia',
  threshold = 0.1
): SegmentedRow<T>[] {
  if (!rows || rows.length === 0) return [];
  const up: (number | null)[] = Array(rows.length).fill(null);
  const down: (number | null)[] = Array(rows.length).fill(null);
  const flat: (number | null)[] = Array(rows.length).fill(null);

  for (let i = 1; i < rows.length; i++) {
    const prev = safe(Number(rows[i - 1]?.[key]));
    const cur = safe(Number(rows[i]?.[key]));
    
    if (prev === undefined || cur === undefined) continue;

    if (cur > prev + threshold) {
      up[i - 1] = prev; up[i] = cur;
    } else if (cur < prev - threshold) {
      down[i - 1] = prev; down[i] = cur;
    } else {
      flat[i - 1] = prev; flat[i] = cur;
    }
  }

  return rows.map((r, idx) => ({
    ...r,
    up: up[idx],
    down: down[idx],
    flat: flat[idx],
  })) as SegmentedRow<T>[];
}

function safe(n?: number | null): number | undefined {
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

function pct(from?: number, to?: number): number | undefined {
  const a = safe(from);
  const b = safe(to);
  if (a === undefined || b === undefined) return undefined;
  if (a === 0) return b === 0 ? 0 : 100; // Se de 0 para qualquer valor > 0, é 100% de crescimento
  return ((b - a) / a) * 100;
}

/**
 * ===========================
 *  RÓTULO DE % ACIMA DA LINHA
 *  ===========================
 *  Gera um renderer que: (1) só desenha no endpoint direito do segmento ativo
 *  e (2) calcula % vs. ponto anterior usando a chave indicada.
 */
const makeDeltaLabelRenderer = (
  data: Array<Record<string, unknown>>,
  valueKey: 'nota' | 'proficiencia',
  segmentKey: 'up' | 'down' | 'flat'
) => (props: { x?: number; y?: number; index?: number }) => {
  const { x, y, index } = props;
  
  if (index === 0 || x === undefined || y === undefined) return null;

  const cur = data[index];
  const prev = data[index - 1];

  // Verificar se o segmento atual tem valor (não null/undefined)
  const curSeg = safe(cur?.[segmentKey] as number);
  if (curSeg === undefined) return null;

  const from = safe(prev?.[valueKey] as number);
  const to = safe(cur?.[valueKey] as number);
  const d = pct(from, to);
  if (d === undefined) return null;

  const color = d > 0 ? '#10B981' : d < 0 ? '#EF4444' : '#6B7280';
  const text = `${d > 0 ? '+' : ''}${d.toFixed(1).replace('.', ',')}%`;

  // Detectar se está em modo escuro
  const isDarkMode = document.documentElement.classList.contains('dark');
  const strokeColor = isDarkMode ? 'hsl(var(--background))' : '#ffffff';

  return (
    <g>
      <text
        x={x}
        y={Math.max(y - 20, 20)} // Garante que nunca fique muito próximo do topo
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fill={color}
        stroke={strokeColor}
        strokeWidth={2}
        paintOrder="stroke fill"
      >
        {text}
      </text>
    </g>
  );
};

function mergeByName(rows: EvolutionData[]): EvolutionData[] {
  const map = new Map<string, EvolutionData>();
  for (const r of rows) {
    const key = (r?.name || 'Geral').trim();
    const cur = map.get(key) || { name: key };
    map.set(key, {
      name: key,
      etapa1: safe(r.etapa1) ?? cur.etapa1,
      etapa2: safe(r.etapa2) ?? cur.etapa2,
      etapa3: safe(r.etapa3) ?? cur.etapa3,
      variacao_1_2: safe(r.variacao_1_2) ?? cur.variacao_1_2,
      variacao_2_3: safe(r.variacao_2_3) ?? cur.variacao_2_3,
    });
  }
  for (const v of map.values()) {
    if (v.variacao_1_2 === undefined) v.variacao_1_2 = pct(v.etapa1, v.etapa2);
    if (v.variacao_2_3 === undefined) v.variacao_2_3 = pct(v.etapa2, v.etapa3);
  }
  return [...map.values()];
}

export function EvolutionCharts({ data, isLoading = false }: EvolutionChartsProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'subjects'>('general');
  const [hiddenByChart, setHiddenByChart] = useState<Record<string, Set<string>>>({});

  function getHidden(chartId: string): Set<string> {
    return hiddenByChart[chartId] ?? new Set<string>();
  }

  function handleToggle(chartId: string, name: string) {
    setHiddenByChart(prev => {
      const current = new Set(prev[chartId] ?? new Set<string>());
      if (current.has(name)) current.delete(name); else current.add(name);
      return { ...prev, [chartId]: current };
    });
  }

  function handleShowAll(chartId: string) {
    setHiddenByChart(prev => ({ ...prev, [chartId]: new Set() }));
  }

  function handleHideAll(chartId: string, names: string[]) {
    setHiddenByChart(prev => ({ ...prev, [chartId]: new Set(names) }));
  }

  // Legenda custom: mantém itens padrão e adiciona toggles minimalistas por avaliação
  function createLegendRenderer(chartId: string, names: string[]) {
    return function LegendRenderer(props: { payload?: Array<{ value?: string; color?: string }>; }) {
      const hidden = getHidden(chartId);
      const payload = (props?.payload || []).filter((p) => p?.value !== 'Nota Média' && p?.value !== 'Proficiência');
      return (
        <div className="mt-2 space-y-2 flex flex-col items-center justify-center">
          {/* Itens padrão da legenda */}
          {payload.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
              {payload.map((item, idx) => (
                <div key={`${chartId}-lg-${idx}`} className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color || '#9ca3af' }} />
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
          )}
          {/* Controles minimalistas por avaliação */}
          {names.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {names.map((name) => {
                const isHidden = hidden.has(name);
                return (
                  <button
                    key={`${chartId}-${name}`}
                    type="button"
                    onClick={() => handleToggle(chartId, name)}
                    className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                      isHidden
                        ? 'bg-card text-muted-foreground border-border'
                        : 'bg-card text-foreground border-border hover:border-border/80'
                    }`}
                    aria-pressed={!isHidden}
                    aria-label={`Alternar visibilidade da avaliação ${name}`}
                    title={isHidden ? `Mostrar ${name}` : `Ocultar ${name}`}
                  >
                    {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span className="leading-none">{name}</span>
                  </button>
                );
              })}
              <span className="mx-1 text-border text-xs select-none">|</span>
              <button
                type="button"
                onClick={() => handleHideAll(chartId, names)}
                className="px-2 py-0.5 text-[11px] rounded-full border bg-card text-muted-foreground border-border hover:border-border/80 focus:outline-none focus:ring-2 focus:ring-offset-1 inline-flex items-center gap-1"
                aria-label="Ocultar todas as avaliações deste gráfico"
              >
                <EyeOff className="h-3 w-3" /> Ocultar todas
              </button>
              <button
                type="button"
                onClick={() => handleShowAll(chartId)}
                className="px-2 py-0.5 text-[11px] rounded-full border bg-card text-foreground border-border hover:border-border/80 focus:outline-none focus:ring-2 focus:ring-offset-1 inline-flex items-center gap-1"
                aria-label="Mostrar todas as avaliações deste gráfico"
              >
                <Eye className="h-3 w-3" /> Mostrar todas
              </button>
            </div>
          )}
        </div>
      );
    };
  }

  // Calcular estatísticas gerais
  const generalStats = useMemo(() => {
    const merged = mergeByName(data.generalData || []);
    if (merged.length === 0) return null;
    
    const r = merged[0];
    const etapas = [safe(r.etapa1), safe(r.etapa2), safe(r.etapa3)].filter(v => v !== undefined) as number[];
    
    if (etapas.length === 0) return null;
    
    const media = etapas.reduce((sum, val) => sum + val, 0) / etapas.length;
    const melhorNota = Math.max(...etapas);
    const piorNota = Math.min(...etapas);
    const variacaoTotal = etapas.length > 1 ? pct(etapas[0], etapas[etapas.length - 1]) : 0;
    const tendencia = variacaoTotal && variacaoTotal > 0 ? 'up' : variacaoTotal && variacaoTotal < 0 ? 'down' : 'stable';
    
    return {
      media,
      melhorNota,
      piorNota,
      variacaoTotal: variacaoTotal || 0,
      tendencia,
      totalAvaliacoes: etapas.length,
      progresso: Math.min(100, Math.max(0, (media / 10) * 100)),
      metaAlcancada: media >= 7.0,
    };
  }, [data.generalData]);

  // Dados para gráfico de notas (aba geral)
  const chartData = useMemo(() => {
    const chartId = 'general-nota';
    const hidden = getHidden(chartId);
    if (activeTab === 'general') {
      const merged = mergeByName(data.generalData || []);
      if (merged.length === 0) return [];
      
      const r = merged[0];
      const chartDataArray: Record<string, unknown>[] = [];
      
      // Construir dados usando os valores já processados
      if (data.evaluationNames[0] && !hidden.has(data.evaluationNames[0]) && safe(r.etapa1) !== undefined) {
        chartDataArray.push({
          name: data.evaluationNames[0],
          nota: safe(r.etapa1),
          variacao: 0, // primeira avaliação sempre 0%
          color: getColorByIndex(0),
        });
      }
      
      if (data.evaluationNames[1] && !hidden.has(data.evaluationNames[1]) && safe(r.etapa2) !== undefined) {
        chartDataArray.push({
          name: data.evaluationNames[1],
          nota: safe(r.etapa2),
          variacao: safe(r.variacao_1_2) || 0,
          color: getColorByIndex(1),
        });
      }
      
      if (data.evaluationNames[2] && !hidden.has(data.evaluationNames[2]) && safe(r.etapa3) !== undefined) {
        chartDataArray.push({
          name: data.evaluationNames[2],
          nota: safe(r.etapa3),
          variacao: safe(r.variacao_2_3) || 0,
          color: getColorByIndex(2),
        });
      }
      
      return chartDataArray;
    } else {
      // Para disciplinas, retornar array vazio (será tratado no loop)
      return [];
    }
  }, [data, activeTab, hiddenByChart]);

  // Dados segmentados para gráfico de notas (aba geral)
  const segmentedGeneral = useMemo(
    () => segmentLine(chartData as Record<string, unknown>[], 'nota'),
    [chartData]
  );

  // Dados para gráfico de proficiência (aba geral)
  const proficiencyChartData = useMemo(() => {
    const chartId = 'general-prof';
    const hidden = getHidden(chartId);
    if (activeTab === 'general') {
      const merged = mergeByName(data.proficiencyData || []);
      if (merged.length === 0) return [];
      
      const r = merged[0];
      const chartDataArray: Record<string, unknown>[] = [];
      
      // Construir dados de proficiência
      if (data.evaluationNames[0] && !hidden.has(data.evaluationNames[0]) && safe(r.etapa1) !== undefined) {
        chartDataArray.push({
          name: data.evaluationNames[0],
          proficiencia: safe(r.etapa1),
          color: proficiencyColors[0],
        });
      }
      
      if (data.evaluationNames[1] && !hidden.has(data.evaluationNames[1]) && safe(r.etapa2) !== undefined) {
        chartDataArray.push({
          name: data.evaluationNames[1],
          proficiencia: safe(r.etapa2),
          color: proficiencyColors[1],
        });
      }
      
      if (data.evaluationNames[2] && !hidden.has(data.evaluationNames[2]) && safe(r.etapa3) !== undefined) {
        chartDataArray.push({
          name: data.evaluationNames[2],
          proficiencia: safe(r.etapa3),
          color: proficiencyColors[2],
        });
      }
      
      return chartDataArray;
    } else {
      return [];
    }
  }, [data, activeTab, hiddenByChart]);

  // Dados segmentados para gráfico de proficiência (aba geral)
  const segmentedProficiency = useMemo(
    () => segmentLine(proficiencyChartData as Record<string, unknown>[], 'proficiencia'),
    [proficiencyChartData]
  );

  interface TooltipPayload {
    dataKey: string;
    value: number;
    payload: {
      variacao?: number;
      nota?: number;
      proficiencia?: number;
      up?: number | null;
      down?: number | null;
      flat?: number | null;
      [key: string]: unknown;
    };
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) => {
    if (active && payload && payload.length) {
      const barData = payload.find((p: TooltipPayload) => p.dataKey === 'nota');
      if (barData) {
        const nota = barData.value;
        const variacao = barData.payload.variacao;
        const sinal = variacao > 0 ? '+' : '';
        
        return (
          <div className="bg-card p-3 border border-border rounded-lg shadow-sm">
            <p className="text-sm font-medium text-foreground mb-1">{label}</p>
            <p className="text-sm text-muted-foreground">
              Nota: <span className="font-semibold">{nota.toFixed(1).replace('.', ',')}</span>
            </p>
            <p className={`text-sm font-medium ${
              variacao > 0 ? 'text-green-600 dark:text-green-400' : variacao < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
            }`}>
              Variação: {sinal}{variacao.toFixed(1)}%
            </p>
          </div>
        );
      }
    }
    return null;
  };

  const CustomSubjectTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) => {
    if (active && payload && payload.length) {
      const barData = payload.find((p: TooltipPayload) => p.dataKey === 'nota' || p.dataKey === 'proficiencia');
      if (barData) {
        const value = barData.value;
        const isProficiency = barData.dataKey === 'proficiencia';
        const metricName = isProficiency ? 'Proficiência' : 'Nota';
        
        // Calcular variação baseada nos dados segmentados
        const data = payload[0]?.payload;
        if (data) {
          const currentValue = isProficiency ? data.proficiencia : data.nota;
          const upValue = data.up;
          const downValue = data.down;
          const flatValue = data.flat;
          
          let variacao = 0;
          let status = '';
          
          if (upValue !== null && upValue !== undefined) {
            status = 'Crescimento';
            // Calcular variação baseada no valor anterior
            const prevIndex = payload.findIndex(p => p.payload === data) - 1;
            if (prevIndex >= 0) {
              const prevData = payload[prevIndex]?.payload;
              if (prevData) {
                const prevValue = isProficiency ? prevData.proficiencia : prevData.nota;
                if (prevValue !== undefined) {
                  variacao = pct(prevValue, currentValue) || 0;
                }
              }
            }
          } else if (downValue !== null && downValue !== undefined) {
            status = 'Queda';
            const prevIndex = payload.findIndex(p => p.payload === data) - 1;
            if (prevIndex >= 0) {
              const prevData = payload[prevIndex]?.payload;
              if (prevData) {
                const prevValue = isProficiency ? prevData.proficiencia : prevData.nota;
                if (prevValue !== undefined) {
                  variacao = pct(prevValue, currentValue) || 0;
                }
              }
            }
          } else if (flatValue !== null && flatValue !== undefined) {
            status = 'Constante';
            const prevIndex = payload.findIndex(p => p.payload === data) - 1;
            if (prevIndex >= 0) {
              const prevData = payload[prevIndex]?.payload;
              if (prevData) {
                const prevValue = isProficiency ? prevData.proficiencia : prevData.nota;
                if (prevValue !== undefined) {
                  variacao = pct(prevValue, currentValue) || 0;
                }
              }
            }
          }

          const sinal = variacao > 0 ? '+' : '';
          const colorClass = variacao > 0 ? 'text-green-600 dark:text-green-400' : variacao < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground';

          return (
            <div className="bg-card p-3 border border-border rounded-lg shadow-sm">
              <p className="text-sm font-medium text-foreground mb-1">{label}</p>
              <p className="text-sm text-muted-foreground">
                {metricName}: <span className="font-semibold">{value.toFixed(1).replace('.', ',')}</span>
              </p>
              <p className={`text-sm font-medium ${colorClass}`}>
                {status}: {sinal}{variacao.toFixed(1).replace('.', ',')}%
              </p>
            </div>
          );
        }
      }
    }
    return null;
  };


  if (isLoading) {
    return (
      <Card className="border border-border shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-4">
            <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Processando Dados</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Gerando análise de evolução das avaliações...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data || (!data.generalData?.length && !Object.keys(data.subjectData || {}).length)) {
    return (
      <Card className="border border-border shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-4">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Dados Insuficientes</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Não há dados suficientes para gerar a análise de evolução.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="border border-border shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-4">
            <Activity className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Sem Dados</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Não há dados disponíveis para o período selecionado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="general" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Visão Geral
        </TabsTrigger>
        <TabsTrigger value="subjects" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Por Disciplina
        </TabsTrigger>
      </TabsList>

      {/* VISÃO GERAL */}
      <TabsContent value="general" className="space-y-6">
        {/* Header com controles */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Activity className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Análise de Evolução - Geral</h3>
              <p className="text-sm text-muted-foreground">
                Comparação entre avaliações selecionadas
              </p>
            </div>
          </div>
          {/* Controles globais removidos: visibilidade agora é por gráfico */}
        </div>


        {/* Resumo Estatístico */}
        {generalStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Média Geral</span>
                </div>
                <p className="text-2xl font-semibold text-foreground">
                  {generalStats.media.toFixed(1).replace(".", ",")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">pontos</p>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Melhor Resultado</span>
                </div>
                <p className="text-2xl font-semibold text-foreground">
                  {generalStats.melhorNota.toFixed(1).replace(".", ",")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">pontos</p>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {generalStats.tendencia === 'up' ? (
                    <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : generalStats.tendencia === 'down' ? (
                    <ArrowDownRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium text-muted-foreground">Variação</span>
                </div>
                <p className={`text-2xl font-semibold ${
                  generalStats.variacaoTotal > 0 ? 'text-green-600 dark:text-green-400' : 
                  generalStats.variacaoTotal < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                }`}>
                  {generalStats.variacaoTotal > 0 ? '+' : ''}{generalStats.variacaoTotal.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">período</p>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Total de Avaliações</span>
                </div>
                <p className="text-2xl font-semibold text-foreground">{generalStats.totalAvaliacoes}</p>
                <p className="text-xs text-muted-foreground mt-1">avaliações</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gráficos Detalhados */}
        <div className="grid grid-cols-1 gap-6">
          {!!data.generalData?.length && (
            <Card className="border border-border">
              <CardHeader className="bg-muted border-b border-border">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  Nota Geral
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={segmentedGeneral} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend content={createLegendRenderer('general-nota', data.evaluationNames)} />
                      <Bar 
                        dataKey="nota" 
                        name="Nota Média"
                        legendType="none"
                        barSize={60} 
                        radius={[4, 4, 0, 0]}
                        maxBarSize={80}
                        label={{ 
                          position: 'center', 
                          fontSize: 12, 
                          fill: '#ffffff',
                          fontWeight: 'bold',
                          formatter: (value: number) => value.toFixed(1).replace('.', ',')
                        }}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color as string} />
                        ))}
                      </Bar>
                      {/* Linhas por segmento */}
                      <Line
                        type="linear"
                        dataKey="up"
                        name="Crescimento"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={false}
                        isAnimationActive={false}
                      >
                        <LabelList content={makeDeltaLabelRenderer(segmentedGeneral, 'nota', 'up')} />
                      </Line>
                      <Line
                        type="linear"
                        dataKey="down"
                        name="Queda"
                        stroke="#EF4444"
                        strokeWidth={3}
                        dot={false}
                        isAnimationActive={false}
                      >
                        <LabelList content={makeDeltaLabelRenderer(segmentedGeneral, 'nota', 'down')} />
                      </Line>
                      <Line
                        type="linear"
                        dataKey="flat"
                        name="Permaneceu"
                        stroke="#6B7280"
                        strokeWidth={3}
                        dot={false}
                        isAnimationActive={false}
                      >
                        <LabelList content={makeDeltaLabelRenderer(segmentedGeneral, 'nota', 'flat')} />
                      </Line>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {!!data.proficiencyData?.length && (
            <Card className="border border-border">
              <CardHeader className="bg-muted border-b border-border">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  Proficiência Geral
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={segmentedProficiency} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} />
                      <YAxis 
                        domain={[0, 425]} 
                        tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} 
                        tickFormatter={(value) => value.toFixed(0)}
                        label={{ value: 'Proficiência', angle: -90, position: 'insideLeft', fill: 'hsl(var(--foreground))' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend content={createLegendRenderer('general-prof', data.evaluationNames)} />
                      <Bar
                        dataKey="proficiencia"
                        name="Proficiência"
                        legendType="none"
                        barSize={60} 
                        radius={[4, 4, 0, 0]}
                        maxBarSize={80}
                        label={{ 
                          position: 'center', 
                          fontSize: 12, 
                          fill: '#ffffff',
                          fontWeight: 'bold',
                          formatter: (value: number) => value.toFixed(1).replace('.', ',')
                        }}
                      >
                        {proficiencyChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color as string} />
                        ))}
                      </Bar>
                      {/* Linhas por segmento */}
                      <Line
                        type="linear"
                        dataKey="up"
                        name="Crescimento"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={false}
                        isAnimationActive={false}
                      >
                        <LabelList content={makeDeltaLabelRenderer(segmentedProficiency, 'proficiencia', 'up')} />
                      </Line>
                      <Line
                        type="linear"
                        dataKey="down"
                        name="Queda"
                        stroke="#EF4444"
                        strokeWidth={3}
                        dot={false}
                        isAnimationActive={false}
                      >
                        <LabelList content={makeDeltaLabelRenderer(segmentedProficiency, 'proficiencia', 'down')} />
                      </Line>
                      <Line
                        type="linear"
                        dataKey="flat"
                        name="Permaneceu"
                        stroke="#6B7280"
                        strokeWidth={3}
                        dot={false}
                        isAnimationActive={false}
                      >
                        <LabelList content={makeDeltaLabelRenderer(segmentedProficiency, 'proficiencia', 'flat')} />
                      </Line>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      {/* POR DISCIPLINA */}
      <TabsContent value="subjects" className="space-y-6">
        {/* Header para disciplinas */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <BookOpen className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Análise por Disciplina</h3>
              <p className="text-sm text-muted-foreground">
                Comparação detalhada por disciplina
              </p>
            </div>
          </div>

        {Object.keys(data.subjectData || {}).length === 0 ? (
          <Card className="border border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma Disciplina Encontrada</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">Não há dados de disciplinas para exibir os gráficos.</p>
            </CardContent>
          </Card>
        ) : Object.entries(data.subjectData).filter(([subject, rows]) => {
          const merged = mergeByName(rows);
          if (merged.length === 0) return false;
          
          const r = merged[0];
          const hasAllEvaluations = 
            (data.evaluationNames[0] && safe(r.etapa1) !== undefined) &&
            (data.evaluationNames[1] && safe(r.etapa2) !== undefined) &&
            (data.evaluationNames[2] && safe(r.etapa3) !== undefined);
          
          return hasAllEvaluations;
        }).length === 0 ? (
          <Card className="border border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma Disciplina com Dados Completos</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Não há disciplinas com dados em todas as avaliações selecionadas. 
                Apenas disciplinas com dados completos são exibidas para comparação.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(data.subjectData)
              .filter(([subject, rows]) => {
                // Verificar se a disciplina tem dados em todas as avaliações
                const merged = mergeByName(rows);
                if (merged.length === 0) return false;
                
                const r = merged[0];
                const hasAllEvaluations = 
                  (data.evaluationNames[0] && safe(r.etapa1) !== undefined) &&
                  (data.evaluationNames[1] && safe(r.etapa2) !== undefined) &&
                  (data.evaluationNames[2] && safe(r.etapa3) !== undefined);
                
                return hasAllEvaluations;
              })
              .map(([subject, rows], subjectIndex) => {
              // Construir dados específicos para esta disciplina
              const merged = mergeByName(rows);
              if (merged.length === 0) return null;
              
              const r = merged[0];
              const subjectChartData: Record<string, unknown>[] = [];
              const subjectColors = getSubjectColors(subject, subjectIndex);
              const hiddenSubjectNota = getHidden(`subject-${subject}-nota`);
              
              // Dados de notas
              if (data.evaluationNames[0] && !hiddenSubjectNota.has(data.evaluationNames[0]) && safe(r.etapa1) !== undefined) {
                subjectChartData.push({
                  name: data.evaluationNames[0],
                  nota: safe(r.etapa1),
                  color: subjectColors.palette[0],
                });
              }
              
              if (data.evaluationNames[1] && !hiddenSubjectNota.has(data.evaluationNames[1]) && safe(r.etapa2) !== undefined) {
                subjectChartData.push({
                  name: data.evaluationNames[1],
                  nota: safe(r.etapa2),
                  color: subjectColors.palette[1],
                });
              }
              
              if (data.evaluationNames[2] && !hiddenSubjectNota.has(data.evaluationNames[2]) && safe(r.etapa3) !== undefined) {
                subjectChartData.push({
                  name: data.evaluationNames[2],
                  nota: safe(r.etapa3),
                  color: subjectColors.palette[2],
                });
              }

              // Gerar dados segmentados para notas
              const subjectSegmented = segmentLine(subjectChartData as Record<string, unknown>[], 'nota');

              // Dados de proficiência para esta disciplina
              const subjectProficiencyData = data.subjectProficiencyData[subject] || [];
              const mergedProficiency = mergeByName(subjectProficiencyData);
              const proficiencyChartData: Record<string, unknown>[] = [];
              const hiddenSubjectProf = getHidden(`subject-${subject}-prof`);
              
              // Verificar se há dados de proficiência em todas as avaliações
              const hasAllProficiencyEvaluations = mergedProficiency.length > 0 && 
                (data.evaluationNames[0] && safe(mergedProficiency[0].etapa1) !== undefined) &&
                (data.evaluationNames[1] && safe(mergedProficiency[0].etapa2) !== undefined) &&
                (data.evaluationNames[2] && safe(mergedProficiency[0].etapa3) !== undefined);
              
              if (mergedProficiency.length > 0 && hasAllProficiencyEvaluations) {
                const prof = mergedProficiency[0];
                
                if (data.evaluationNames[0] && !hiddenSubjectProf.has(data.evaluationNames[0]) && safe(prof.etapa1) !== undefined) {
                  proficiencyChartData.push({
                    name: data.evaluationNames[0],
                    proficiencia: safe(prof.etapa1),
                    color: subjectColors.palette[0],
                  });
                }
                
                if (data.evaluationNames[1] && !hiddenSubjectProf.has(data.evaluationNames[1]) && safe(prof.etapa2) !== undefined) {
                  proficiencyChartData.push({
                    name: data.evaluationNames[1],
                    proficiencia: safe(prof.etapa2),
                    color: subjectColors.palette[1],
                  });
                }
                
                if (data.evaluationNames[2] && !hiddenSubjectProf.has(data.evaluationNames[2]) && safe(prof.etapa3) !== undefined) {
                  proficiencyChartData.push({
                    name: data.evaluationNames[2],
                    proficiencia: safe(prof.etapa3),
                    color: subjectColors.palette[2],
                  });
                }
              }

              // Gerar dados segmentados para proficiência
              const subjectProfSegmented = segmentLine(proficiencyChartData as Record<string, unknown>[], 'proficiencia');

              return (
                <div key={subject} className="space-y-4">
                  <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                    {subject}
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {/* Gráfico de Notas */}
                <Card className="border border-border">
                  <CardHeader className="bg-muted border-b border-border">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                          <TrendingUp className="h-5 w-5 text-muted-foreground" />
                          Notas - {subject}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={subjectSegmented} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} />
                          <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} />
                              <Tooltip content={<CustomSubjectTooltip />} />
                              <Legend content={createLegendRenderer(`subject-${subject}-nota`, data.evaluationNames)} />
                          <Bar 
                            dataKey="nota" 
                                name="Nota Média"
                            legendType="none"
                            barSize={60} 
                                radius={[4, 4, 0, 0]}
                            maxBarSize={80}
                            label={{ 
                              position: 'center', 
                              fontSize: 12, 
                              fill: '#ffffff',
                              fontWeight: 'bold',
                              formatter: (value: number) => value.toFixed(1).replace('.', ',')
                            }}
                              >
                                {subjectChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color as string} />
                                ))}
                              </Bar>
                              {/* Linhas por segmento + % acima da linha */}
                              <Line
                                type="linear"
                                dataKey="up"
                                name="Crescimento"
                                stroke="#10B981"
                                strokeWidth={3}
                                dot={false}
                                isAnimationActive={false}
                              >
                                <LabelList content={makeDeltaLabelRenderer(subjectSegmented, 'nota', 'up')} />
                              </Line>
                              <Line
                                type="linear"
                                dataKey="down"
                                name="Queda"
                                stroke="#EF4444"
                                strokeWidth={3}
                                dot={false}
                                isAnimationActive={false}
                              >
                                <LabelList content={makeDeltaLabelRenderer(subjectSegmented, 'nota', 'down')} />
                              </Line>
                              <Line
                                type="linear"
                                dataKey="flat"
                                name="Permaneceu"
                                stroke="#6B7280"
                                strokeWidth={3}
                                dot={false}
                                isAnimationActive={false}
                              >
                                <LabelList content={makeDeltaLabelRenderer(subjectSegmented, 'nota', 'flat')} />
                              </Line>
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Gráfico de Proficiência - apenas se houver dados completos */}
                    {hasAllProficiencyEvaluations && proficiencyChartData.length > 0 && (
                      <Card className="border border-border">
                        <CardHeader className="bg-muted border-b border-border">
                          <CardTitle className="flex items-center gap-2 text-foreground">
                            <Target className="h-5 w-5 text-muted-foreground" />
                            Proficiência - {subject}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={subjectProfSegmented} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} />
                              <YAxis 
                                domain={getProficiencyDomain(subject)} 
                                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} 
                                tickFormatter={(value) => value.toFixed(0)}
                                label={{ value: 'Proficiência', angle: -90, position: 'insideLeft', fill: 'hsl(var(--foreground))' }}
                              />
                              <Tooltip content={<CustomSubjectTooltip />} />
                              <Legend content={createLegendRenderer(`subject-${subject}-prof`, data.evaluationNames)} />
                              <Bar
                                dataKey="proficiencia"
                                name="Proficiência"
                                legendType="none"
                                barSize={60}
                                radius={[4, 4, 0, 0]}
                                maxBarSize={80}
                                label={{ 
                                  position: 'center', 
                                  fontSize: 12, 
                                  fill: '#ffffff',
                                  fontWeight: 'bold',
                                  formatter: (value: number) => value.toFixed(1).replace('.', ',')
                                }}
                              >
                                {proficiencyChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color as string} />
                                ))}
                              </Bar>
                              {/* Linhas por segmento + % acima da linha */}
                              <Line
                                type="linear"
                                dataKey="up"
                                name="Crescimento"
                                stroke="#10B981"
                                strokeWidth={3}
                                dot={false}
                                isAnimationActive={false}
                              >
                                <LabelList content={makeDeltaLabelRenderer(subjectProfSegmented, 'proficiencia', 'up')} />
                              </Line>
                              <Line
                                type="linear"
                                dataKey="down"
                                name="Queda"
                                stroke="#EF4444"
                                strokeWidth={3}
                                dot={false}
                                isAnimationActive={false}
                              >
                                <LabelList content={makeDeltaLabelRenderer(subjectProfSegmented, 'proficiencia', 'down')} />
                              </Line>
                              <Line
                                type="linear"
                                dataKey="flat"
                                name="Permaneceu"
                                stroke="#6B7280"
                                strokeWidth={3}
                                dot={false}
                                isAnimationActive={false}
                              >
                                <LabelList content={makeDeltaLabelRenderer(subjectProfSegmented, 'proficiencia', 'flat')} />
                              </Line>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                    )}
              </div>
                </div>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}