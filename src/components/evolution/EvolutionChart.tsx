import React, { useMemo, useState, useEffect } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { TrendingUp, ArrowUpRight, ArrowDownRight, ArrowRight, BarChart3, LineChart as LineChartIcon } from 'lucide-react';

type Metric = 'grade' | 'proficiency' | 'approval';

export interface EvolutionData {
  name: string;
  etapa1?: number | null;
  etapa2?: number | null;
  etapa3?: number | null;
  etapa4?: number | null;
  etapa5?: number | null;
  etapa6?: number | null;
  etapa7?: number | null;
  etapa8?: number | null;
  etapa9?: number | null;
  etapa10?: number | null;
  variacao_1_2?: number | null;
  variacao_2_3?: number | null;
  variacao_3_4?: number | null;
  variacao_4_5?: number | null;
  variacao_5_6?: number | null;
  variacao_6_7?: number | null;
  variacao_7_8?: number | null;
  variacao_8_9?: number | null;
  variacao_9_10?: number | null;
  // Método auxiliar para acessar etapas dinamicamente
  [key: string]: string | number | null | undefined;
}

interface EvolutionChartProps {
  data: EvolutionData[];
  metric: Metric;
  title: string;
  subtitle?: string;
  /** opcional – se não enviar eu calculo automaticamente de forma segura */
  yAxisLabel?: string;
  yAxisDomain?: [number, number];
  showVariation?: boolean;
  /** nomes das avaliações para exibir em vez de "1ª Etapa", "2ª Etapa" */
  evaluationNames?: string[];
}

const colors = {
  etapa1: '#fb923c', // laranja
  etapa2: '#a855f7', // roxo
  etapa3: '#22c55e', // verde
  up: '#16a34a',
  down: '#ef4444',
  flat: '#6b7280',
};

const nf1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  
  return matches;
}

function safe(n?: number | null): number | undefined {
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

function pct(from?: number, to?: number): number | undefined {
  const a = safe(from);
  const b = safe(to);
  if (a === undefined || b === undefined) return undefined;
  if (a === 0) return b === 0 ? 0 : undefined; // evita explodir divisão por 0
  return ((b - a) / a) * 100;
}

function mergeByName(rows: EvolutionData[]): EvolutionData[] {
  // Une registros com o mesmo "name" (evita "GERAL" duplicado lado a lado)
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
  // completa variações que não vieram calculadas
  for (const v of map.values()) {
    if (v.variacao_1_2 === undefined) v.variacao_1_2 = pct(v.etapa1, v.etapa2);
    if (v.variacao_2_3 === undefined) v.variacao_2_3 = pct(v.etapa2, v.etapa3);
  }
  return [...map.values()];
}

function labelFor(metric: Metric) {
  switch (metric) {
    case 'grade': return 'Nota (0–10)';
    case 'approval': return 'Taxa de Aprovação (%)';
    case 'proficiency': return 'Proficiência';
  }
}

function domainFor(metric: Metric, rows: EvolutionData[]): [number, number] {
  if (metric === 'grade') return [0, 10];
  if (metric === 'approval') return [0, 100];

  // proficiência: calcula automaticamente com folga
  const vals = rows.flatMap(r => [r.etapa1, r.etapa2, r.etapa3].map(safe).filter(v => v !== undefined)) as number[];
  const max = vals.length ? Math.max(...vals) : 10;
  // arredonda pra cima (múltiplos de 25) pra ficar elegante
  const ceilTo = (n: number, step: number) => Math.ceil(n / step) * step;
  return [0, ceilTo(max * 1.05, 25)];
}

const VariationDot = (key: 'Variação 1→2' | 'Variação 2→3') =>
  (props: { cx?: number; cy?: number; payload?: Record<string, unknown> }) => {
    const v = props?.payload?.[key] as number | undefined;
    if (v === undefined || v === null) return null;
    
    const color = v > 0 ? colors.up : v < 0 ? colors.down : colors.flat;
    const Icon = v > 0 ? ArrowUpRight : v < 0 ? ArrowDownRight : ArrowRight;
    
    return (
      <g>
        {/* Círculo de fundo com sombra */}
        <circle cx={props.cx} cy={props.cy} r={10} fill={color} stroke="#fff" strokeWidth={2} opacity={0.9} />
        <circle cx={props.cx! + 1} cy={props.cy! + 1} r={10} fill={color} opacity={0.3} />
        
        {/* Ícone de seta do Lucide */}
        <foreignObject 
          x={props.cx! - 8} 
          y={props.cy! - 8} 
          width={16} 
          height={16}
        >
          <Icon size={16} color="#fff" strokeWidth={2.5} />
        </foreignObject>
        
        {/* Texto da porcentagem com fundo */}
        <rect 
          x={props.cx! - 20} 
          y={props.cy! - 25} 
          width={40} 
          height={12} 
          fill="rgba(255,255,255,0.9)" 
          stroke={color} 
          strokeWidth={1}
          rx={2}
        />
        <text 
          x={props.cx} 
          y={props.cy! - 17} 
          textAnchor="middle" 
          fontSize="9" 
          fontWeight="bold" 
          fill={color}
        >
          {`${v > 0 ? '+' : ''}${nf1.format(v)}%`}
        </text>
      </g>
    );
  };

export function EvolutionChart({
  data,
  metric,
  title,
  subtitle,
  yAxisLabel,
  yAxisDomain,
  showVariation = true,
  evaluationNames = [],
}: EvolutionChartProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const merged = useMemo(() => mergeByName(data || []), [data]);

  const chartData = useMemo(() => {
    const data: Record<string, unknown>[] = [];
    
    merged.forEach((r) => {
      // Verificar se a disciplina tem dados válidos em TODAS as avaliações que estão sendo comparadas
      // Considerar null/undefined como inválido, mas 0 pode ser um valor válido
      const hasValidDataInAllEvaluations = (
        (!evaluationNames[0] || safe(r.etapa1) !== undefined) &&
        (!evaluationNames[1] || safe(r.etapa2) !== undefined) &&
        (!evaluationNames[2] || safe(r.etapa3) !== undefined)
      );
      
      // Se não tem dados válidos em todas as avaliações, pular esta disciplina
      if (!hasValidDataInAllEvaluations) {
        console.log(`🔍 Disciplina "${r.name}" não tem dados válidos em todas as avaliações, removendo do gráfico`);
        console.log(`🔍 Dados da disciplina:`, {
          etapa1: r.etapa1,
          etapa2: r.etapa2,
          etapa3: r.etapa3,
          evaluationNames
        });
        return;
      }
      
      const item: Record<string, unknown> = { name: r.name };
      
      // Adicionar apenas as avaliações que existem E têm dados válidos
      if (evaluationNames[0] && safe(r.etapa1) !== undefined) {
        item[evaluationNames[0]] = safe(r.etapa1);
      }
      if (evaluationNames[1] && safe(r.etapa2) !== undefined) {
        item[evaluationNames[1]] = safe(r.etapa2);
      }
      if (evaluationNames[2] && safe(r.etapa3) !== undefined) {
        item[evaluationNames[2]] = safe(r.etapa3);
      }
      
      // Adicionar variações se existirem
      if (r.variacao_1_2 !== undefined && r.variacao_1_2 !== null) {
        item['Variação 1→2'] = safe(r.variacao_1_2);
      }
      if (r.variacao_2_3 !== undefined && r.variacao_2_3 !== null) {
        item['Variação 2→3'] = safe(r.variacao_2_3);
      }
      
      data.push(item);
    });
    
    console.log('🔍 chartData filtrado:', data);
    return data;
  }, [merged, evaluationNames]);

  // Dados específicos para o gráfico de linhas de variações
  const variationChartData = useMemo(() => {
    console.log('🔍 merged:', merged);
    console.log('🔍 evaluationNames:', evaluationNames);
    
    if (merged.length === 0) return [];
    
    const r = merged[0]; // pegar primeiro registro (GERAL ou nome da disciplina)
    console.log('🔍 primeiro registro (r):', r);
    
    // Verificar se a disciplina tem dados válidos em TODAS as avaliações para poder calcular variações
    // Considerar null/undefined como inválido, mas 0 pode ser um valor válido
    const hasValidDataInAllEvaluations = (
      (!evaluationNames[0] || safe(r.etapa1) !== undefined) &&
      (!evaluationNames[1] || safe(r.etapa2) !== undefined) &&
      (!evaluationNames[2] || safe(r.etapa3) !== undefined)
    );
    
    // Se não tem dados válidos em todas as avaliações, retornar array vazio
    if (!hasValidDataInAllEvaluations) {
      console.log(`🔍 Disciplina "${r.name}" não tem dados válidos em todas as avaliações, removendo do gráfico de variações`);
      console.log(`🔍 Dados da disciplina para variações:`, {
        etapa1: r.etapa1,
        etapa2: r.etapa2,
        etapa3: r.etapa3,
        variacao_1_2: r.variacao_1_2,
        variacao_2_3: r.variacao_2_3,
        evaluationNames
      });
      return [];
    }
    
    const data: Record<string, unknown>[] = [];
    
    // Ponto 1: Primeira avaliação (baseline = 0%) - só incluir se tiver dados válidos
    if (evaluationNames[0] && safe(r.etapa1) !== undefined) {
      data.push({
        name: evaluationNames[0],
        variacao: 0
      });
    }
    
    // Ponto 2: Segunda avaliação (variação 1→2) - só incluir se tiver dados válidos
    if (evaluationNames[1] && safe(r.etapa2) !== undefined && r.variacao_1_2 !== undefined && r.variacao_1_2 !== null) {
      data.push({
        name: evaluationNames[1],
        variacao: safe(r.variacao_1_2)
      });
    }
    
    // Ponto 3: Terceira avaliação (variação 2→3) - só incluir se tiver dados válidos
    if (evaluationNames[2] && safe(r.etapa3) !== undefined && r.variacao_2_3 !== undefined && r.variacao_2_3 !== null) {
      data.push({
        name: evaluationNames[2],
        variacao: safe(r.variacao_2_3)
      });
    }
    
    console.log('🔍 variationChartData filtrado:', data);
    return data;
  }, [merged, evaluationNames]);

  // Dados segmentados alinhados ao eixo X
  const segmentedData = useMemo(() => {
    if (variationChartData.length < 2) return variationChartData;
    
    // Copia alinhada ao eixo X + campos por direção
    const base = variationChartData.map(p => ({
      ...p,
      asc: null as number | null,
      desc: null as number | null,
      stable: null as number | null,
    })) as Array<{
      name: string;
      variacao: number;
      asc: number | null;
      desc: number | null;
      stable: number | null;
    }>;
    
    // Marcar segmentos na mesma série baseada na direção
    for (let i = 0; i < base.length - 1; i++) {
      const a = base[i].variacao as number;
      const b = base[i + 1].variacao as number;
      const key = b > a ? 'asc' : b < a ? 'desc' : 'stable';
      
      // Marcar os dois extremos do segmento na MESMA série
      (base[i] as Record<string, unknown>)[key] = a;
      (base[i + 1] as Record<string, unknown>)[key] = b;
    }
    
    console.log('🔍 segmentedData:', base);
    return base;
  }, [variationChartData]);

  const leftDomain = yAxisDomain ?? domainFor(metric, merged);
  const leftLabel = yAxisLabel ?? labelFor(metric);

  const leftTick = (v: number) =>
    metric === 'approval' ? `${nf1.format(v)}%` : nf1.format(v);

  // Configuração do chart para variações
  const variationChartConfig = {
    variacao: {
      label: "Variação",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  const tooltipFormatter = (value: unknown, key: string) => {
    if (typeof value !== 'number') return ['–', key];
    if (key.startsWith('Variação')) return [`${value > 0 ? '+' : ''}${nf1.format(value)}%`, key];
    return [metric === 'approval' ? `${nf1.format(value)}%` : nf1.format(value), key];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {title}
        </CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        {/* Descrição para leitores de tela */}
        <span className="sr-only">
          Gráfico mostrando evolução de {title.toLowerCase()} em {chartData.length} categoria(s)
        </span>
      </CardHeader>
      <CardContent>
        {showVariation && variationChartData.length > 0 ? (
          <Tabs defaultValue="columns" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="columns" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Valores
              </TabsTrigger>
              <TabsTrigger value="variations" className="flex items-center gap-2">
                <LineChartIcon className="h-4 w-4" />
                Variações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="columns" className="space-y-4">
              {/* Gráfico principal de colunas */}
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ 
                      top: 20,
                      left: 12,
                      right: 12,
                      bottom: 8
                    }}
                    barCategoryGap={isMobile ? "5%" : "10%"}
                    barGap={isMobile ? 2 : 4}
                    accessibilityLayer
                    aria-label={`Gráfico de ${title}`}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      tickFormatter={(value) => value.length > 8 ? value.slice(0, 8) + '...' : value}
                    />
                    <YAxis
                      yAxisId="left"
                      domain={leftDomain}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      tickFormatter={leftTick}
                      width={isMobile ? 40 : 60}
                    />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                              <p className="font-medium text-sm mb-2">{label}</p>
                              <div className="space-y-1">
                                {payload.map((entry, index) => {
                                  const value = entry.value as number;
                                  const color = entry.color;
                                  return (
                                    <div key={index} className="flex items-center gap-2">
                                      <div 
                                        className="w-3 h-3 rounded" 
                                        style={{ backgroundColor: color }}
                                      />
                                      <span className="text-sm font-medium">{entry.name}:</span>
                                      <span className="text-sm">
                                        {metric === 'approval' ? `${value.toFixed(1)}%` : value.toFixed(1)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    {/* Barras com labels modernos - primeira coluna sempre no início */}
                    <Bar 
                      yAxisId="left" 
                      dataKey={evaluationNames[0] || '1ª Etapa'} 
                      name={evaluationNames[0] || '1ª Etapa'} 
                      fill={colors.etapa1} 
                      radius={8}
                      stackId="a"
                    >
                      {chartData.map((_, i) => <Cell key={`b1-${i}`} fill={colors.etapa1} />)}
                      <LabelList
                        position="top"
                        offset={12}
                        className="fill-foreground"
                        fontSize={12}
                        formatter={(value: number) => value ? value.toFixed(1) : ''}
                      />
                    </Bar>
                    
                    {evaluationNames[1] && (
                      <Bar 
                        yAxisId="left" 
                        dataKey={evaluationNames[1]} 
                        name={evaluationNames[1]} 
                        fill={colors.etapa2} 
                        radius={8}
                        stackId="b"
                      >
                        {chartData.map((_, i) => <Cell key={`b2-${i}`} fill={colors.etapa2} />)}
                        <LabelList
                          position="top"
                          offset={12}
                          className="fill-foreground"
                          fontSize={12}
                          formatter={(value: number) => value ? value.toFixed(1) : ''}
                        />
                      </Bar>
                    )}
                    
                    {evaluationNames[2] && (
                      <Bar 
                        yAxisId="left" 
                        dataKey={evaluationNames[2]} 
                        name={evaluationNames[2]} 
                        fill={colors.etapa3} 
                        radius={8}
                        stackId="c"
                      >
                        {chartData.map((_, i) => <Cell key={`b3-${i}`} fill={colors.etapa3} />)}
                        <LabelList
                          position="top"
                          offset={12}
                          className="fill-foreground"
                          fontSize={12}
                          formatter={(value: number) => value ? value.toFixed(1) : ''}
                        />
                      </Bar>
                    )}

                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="variations" className="space-y-4">
              {/* Gráfico de linhas para variações - Estilo moderno */}
              <ChartContainer config={variationChartConfig} className="h-80 w-full">
                <LineChart
                  data={segmentedData}
                  margin={{
                    left: 12,
                    right: 12,
                    top: 8,
                    bottom: 8
                  }}
                  accessibilityLayer
                  aria-label={`Gráfico de variações de ${title}`}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: isMobile ? 9 : 11 }}
                    tickFormatter={(value) => value.length > 8 ? value.slice(0, 8) + '...' : value}
                    allowDuplicatedCategory={false}
                  />
                  <YAxis
                    yAxisId="variation"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: isMobile ? 9 : 11 }}
                    domain={[-100, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const value = payload[0]?.value as number;
                        const color = value > 0 ? '#16a34a' : value < 0 ? '#ef4444' : '#6b7280';
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="font-medium text-sm">{label}</p>
                            <p className="text-sm" style={{ color }}>
                              Variação: {value > 0 ? '+' : ''}{value?.toFixed(1)}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  
                  {/* Segmentos coloridos, todos usando o MESMO data do LineChart */}
                  <Line
                    yAxisId="variation"
                    type="linear"
                    dataKey="asc"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="variation"
                    type="linear"
                    dataKey="desc"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="variation"
                    type="linear"
                    dataKey="stable"
                    stroke="#6b7280"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  
                  {/* Pontos coloridos */}
                  <Line
                    yAxisId="variation"
                    type="linear"
                    dataKey="variacao"
                    stroke="transparent"
                    strokeWidth={0}
                    isAnimationActive={false}
                    dot={(props: { cx?: number; cy?: number; index?: number; payload?: { variacao?: number } }) => {
                      const { cx, cy, payload, index } = props;
                      const value = payload?.variacao ?? 0;
                      const color = value > 0 ? '#16a34a' : value < 0 ? '#ef4444' : '#6b7280';
                      return (
                        <circle
                          key={`dot-${index}`}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={color}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      );
                    }}
                  />
                </LineChart>
              </ChartContainer>
            </TabsContent>
          </Tabs>
        ) : (
          /* Fallback para quando não há dados de variação */
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ 
                  top: 20,
                  left: 12,
                  right: 12,
                  bottom: 8
                }}
                barCategoryGap={isMobile ? "5%" : "10%"}
                barGap={isMobile ? 2 : 4}
                accessibilityLayer
                aria-label={`Gráfico de ${title}`}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  tickFormatter={(value) => value.length > 8 ? value.slice(0, 8) + '...' : value}
                />
                <YAxis
                  yAxisId="left"
                  domain={leftDomain}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  tickFormatter={leftTick}
                  width={isMobile ? 40 : 60}
                />
                <Tooltip
                  cursor={false}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-medium text-sm mb-2">{label}</p>
                          <div className="space-y-1">
                            {payload.map((entry, index) => {
                              const value = entry.value as number;
                              const color = entry.color;
                              return (
                                <div key={index} className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded" 
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-sm font-medium">{entry.name}:</span>
                                  <span className="text-sm">
                                    {metric === 'approval' ? `${value.toFixed(1)}%` : value.toFixed(1)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Barras com labels modernos - primeira coluna sempre no início */}
                <Bar 
                  yAxisId="left" 
                  dataKey={evaluationNames[0] || '1ª Etapa'} 
                  name={evaluationNames[0] || '1ª Etapa'} 
                  fill={colors.etapa1} 
                  radius={8}
                  stackId="a"
                >
                  {chartData.map((_, i) => <Cell key={`b1-${i}`} fill={colors.etapa1} />)}
                  <LabelList
                    position="top"
                    offset={12}
                    className="fill-foreground"
                    fontSize={12}
                    formatter={(value: number) => value ? value.toFixed(1) : ''}
                  />
                </Bar>
                
                {evaluationNames[1] && (
                  <Bar 
                    yAxisId="left" 
                    dataKey={evaluationNames[1]} 
                    name={evaluationNames[1]} 
                    fill={colors.etapa2} 
                    radius={8}
                    stackId="b"
                  >
                    {chartData.map((_, i) => <Cell key={`b2-${i}`} fill={colors.etapa2} />)}
                    <LabelList
                      position="top"
                      offset={12}
                      className="fill-foreground"
                      fontSize={12}
                      formatter={(value: number) => value ? value.toFixed(1) : ''}
                    />
                  </Bar>
                )}
                
                {evaluationNames[2] && (
                  <Bar 
                    yAxisId="left" 
                    dataKey={evaluationNames[2]} 
                    name={evaluationNames[2]} 
                    fill={colors.etapa3} 
                    radius={8}
                    stackId="c"
                  >
                    {chartData.map((_, i) => <Cell key={`b3-${i}`} fill={colors.etapa3} />)}
                    <LabelList
                      position="top"
                      offset={12}
                      className="fill-foreground"
                      fontSize={12}
                      formatter={(value: number) => value ? value.toFixed(1) : ''}
                    />
                  </Bar>
                )}

              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legenda enxuta */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {evaluationNames[0] && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: colors.etapa1 }} />
              {evaluationNames[0]}
            </div>
          )}
          {evaluationNames[1] && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: colors.etapa2 }} />
              {evaluationNames[1]}
            </div>
          )}
          {evaluationNames[2] && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: colors.etapa3 }} />
              {evaluationNames[2]}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}