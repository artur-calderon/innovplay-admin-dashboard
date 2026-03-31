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
  etapa4: '#3b82f6', // azul
  etapa5: '#f59e0b', // amarelo
  etapa6: '#ec4899', // rosa
  etapa7: '#14b8a6', // turquesa
  etapa8: '#8b5cf6', // roxo claro
  etapa9: '#f97316', // laranja escuro
  etapa10: '#06b6d4', // ciano
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
    const merged: any = { name: key };
    
    // Mesclar todas as etapas dinamicamente (até 10)
    for (let i = 1; i <= 10; i++) {
      const etapaKey = `etapa${i}` as keyof typeof r;
      merged[etapaKey] = safe((r as any)[etapaKey]) ?? (cur as any)[etapaKey];
    }
    
    // Mesclar todas as variações dinamicamente (até 9: 1→2, 2→3, ..., 9→10)
    for (let i = 1; i <= 9; i++) {
      const variacaoKey = `variacao_${i}_${i + 1}` as keyof typeof r;
      merged[variacaoKey] = safe((r as any)[variacaoKey]) ?? (cur as any)[variacaoKey];
    }
    
    map.set(key, merged);
  }
  
  // Completa variações que não vieram calculadas (dinamicamente)
  for (const v of map.values()) {
    for (let i = 1; i <= 9; i++) {
      const variacaoKey = `variacao_${i}_${i + 1}` as keyof typeof v;
      if ((v as any)[variacaoKey] === undefined) {
        const etapa1Key = `etapa${i}` as keyof typeof v;
        const etapa2Key = `etapa${i + 1}` as keyof typeof v;
        (v as any)[variacaoKey] = pct((v as any)[etapa1Key], (v as any)[etapa2Key]);
      }
    }
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
  // Coletar valores de todas as etapas dinamicamente (até 10)
  const vals = rows.flatMap(r => {
    const etapaValues: (number | undefined)[] = [];
    for (let i = 1; i <= 10; i++) {
      const etapaKey = `etapa${i}` as keyof typeof r;
      etapaValues.push(safe((r as any)[etapaKey]));
    }
    return etapaValues.filter(v => v !== undefined);
  }) as number[];
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
      // Verificar dinamicamente para todas as avaliações (até 10)
      const hasValidDataInAllEvaluations = evaluationNames.every((_, index) => {
        const etapaKey = `etapa${index + 1}` as keyof typeof r;
        return !evaluationNames[index] || safe((r as any)[etapaKey]) !== undefined;
      });
      
      // Se não tem dados válidos em todas as avaliações, pular esta disciplina
      if (!hasValidDataInAllEvaluations) {
        console.log(`🔍 Disciplina "${r.name}" não tem dados válidos em todas as avaliações, removendo do gráfico`);
        return;
      }
      
      const item: Record<string, unknown> = { name: r.name };
      
      // Adicionar dinamicamente todas as avaliações que existem E têm dados válidos
      evaluationNames.forEach((evalName, index) => {
        const etapaKey = `etapa${index + 1}` as keyof typeof r;
        const etapaValue = safe((r as any)[etapaKey]);
        if (etapaValue !== undefined) {
          item[evalName] = etapaValue;
        }
      });
      
      // Adicionar variações dinamicamente (até 9 variações: 1→2, 2→3, ..., 9→10)
      for (let i = 1; i < evaluationNames.length; i++) {
        const variacaoKey = `variacao_${i}_${i + 1}` as keyof typeof r;
        const variacaoValue = (r as any)[variacaoKey];
        if (variacaoValue !== undefined && variacaoValue !== null) {
          item[`Variação ${i}→${i + 1}`] = safe(variacaoValue);
        }
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
    // Verificar dinamicamente para todas as avaliações (até 10)
    const hasValidDataInAllEvaluations = evaluationNames.every((_, index) => {
      const etapaKey = `etapa${index + 1}` as keyof typeof r;
      return !evaluationNames[index] || safe((r as any)[etapaKey]) !== undefined;
    });
    
    // Se não tem dados válidos em todas as avaliações, retornar array vazio
    if (!hasValidDataInAllEvaluations) {
      console.log(`🔍 Disciplina "${r.name}" não tem dados válidos em todas as avaliações, removendo do gráfico de variações`);
      return [];
    }
    
    const data: Record<string, unknown>[] = [];
    
    // Adicionar dinamicamente todas as avaliações com suas variações
    evaluationNames.forEach((evalName, index) => {
      const etapaKey = `etapa${index + 1}` as keyof typeof r;
      const etapaValue = safe((r as any)[etapaKey]);
      
      if (etapaValue !== undefined) {
        let variacao = 0;
        
        // Se não é a primeira avaliação, calcular ou buscar variação
        if (index > 0) {
          const variacaoKey = `variacao_${index}_${index + 1}` as keyof typeof r;
          const variacaoValue = safe((r as any)[variacaoKey]);
          
          if (variacaoValue !== undefined) {
            variacao = variacaoValue;
          } else {
            // Calcular variação manualmente se não existir
            const prevEtapaKey = `etapa${index}` as keyof typeof r;
            const prevValue = safe((r as any)[prevEtapaKey]);
            if (prevValue !== undefined && prevValue > 0) {
              variacao = ((etapaValue - prevValue) / prevValue) * 100;
              // Validar variação calculada (limitar valores extremos)
              if (Math.abs(variacao) > 1000) {
                console.warn(`⚠️ Variação calculada extrema: ${variacao}% entre etapa ${index} e ${index + 1}. Limitando a ±1000%`);
                variacao = variacao > 0 ? 1000 : -1000;
              }
            }
          }
          
          // Validar variação obtida do backend também
          if (variacao !== 0 && Math.abs(variacao) > 1000) {
            console.warn(`⚠️ Variação do servidor extrema: ${variacao}% entre etapa ${index} e ${index + 1}. Limitando a ±1000%`);
            variacao = variacao > 0 ? 1000 : -1000;
          }
        }
        
        data.push({
          name: evalName,
          variacao: variacao
        });
      }
    });
    
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

                    {/* Barras com labels modernos - renderizar dinamicamente para todas as avaliações */}
                    {evaluationNames.map((evalName, index) => {
                      const colorKeys = ['etapa1', 'etapa2', 'etapa3', 'etapa4', 'etapa5', 'etapa6', 'etapa7', 'etapa8', 'etapa9', 'etapa10'] as const;
                      const colorKey = colorKeys[index] || 'etapa1';
                      const stackIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
                      const stackId = stackIds[index] || 'a';
                      
                      return (
                        <Bar 
                          key={`bar-${index}`}
                          yAxisId="left" 
                          dataKey={evalName} 
                          name={evalName} 
                          fill={colors[colorKey]} 
                          radius={8}
                          stackId={stackId}
                        >
                          {chartData.map((_, i) => <Cell key={`b${index}-${i}`} fill={colors[colorKey]} />)}
                          <LabelList
                            position="top"
                            offset={12}
                            className="fill-foreground"
                            fontSize={12}
                            formatter={(value: number) => value ? value.toFixed(1) : ''}
                          />
                        </Bar>
                      );
                    })}

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

                {/* Barras com labels modernos - renderizar dinamicamente para todas as avaliações */}
                {evaluationNames.map((evalName, index) => {
                  const colorKeys = ['etapa1', 'etapa2', 'etapa3', 'etapa4', 'etapa5', 'etapa6', 'etapa7', 'etapa8', 'etapa9', 'etapa10'] as const;
                  const colorKey = colorKeys[index] || 'etapa1';
                  const stackIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
                  const stackId = stackIds[index] || 'a';
                  
                  return (
                    <Bar 
                      key={`bar-${index}`}
                      yAxisId="left" 
                      dataKey={evalName} 
                      name={evalName} 
                      fill={colors[colorKey]} 
                      radius={8}
                      stackId={stackId}
                    >
                      {chartData.map((_, i) => <Cell key={`b${index}-${i}`} fill={colors[colorKey]} />)}
                      <LabelList
                        position="top"
                        offset={12}
                        className="fill-foreground"
                        fontSize={12}
                        formatter={(value: number) => value ? value.toFixed(1) : ''}
                      />
                    </Bar>
                  );
                })}

              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legenda enxuta - renderizar dinamicamente para todas as avaliações */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {evaluationNames.map((evalName, index) => {
            const colorKeys = ['etapa1', 'etapa2', 'etapa3', 'etapa4', 'etapa5', 'etapa6', 'etapa7', 'etapa8', 'etapa9', 'etapa10'] as const;
            const colorKey = colorKeys[index] || 'etapa1';
            
            return (
              <div key={`legend-${index}`} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: colors[colorKey] }} />
                {evalName}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}