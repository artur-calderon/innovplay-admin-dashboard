import React, { useMemo, useState, useEffect } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';

type Metric = 'grade' | 'proficiency' | 'approval';

export interface EvolutionData {
  name: string;
  etapa1?: number | null;
  etapa2?: number | null;
  etapa3?: number | null;
  variacao_1_2?: number | null;
  variacao_2_3?: number | null;
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
    return merged.map((r) => ({
      name: r.name,
      [evaluationNames[0] || '1ª Etapa']: safe(r.etapa1) ?? null,
      [evaluationNames[1] || '2ª Etapa']: safe(r.etapa2) ?? null,
      [evaluationNames[2] || '3ª Etapa']: safe(r.etapa3) ?? null,
      'Variação 1→2': safe(r.variacao_1_2),
      'Variação 2→3': safe(r.variacao_2_3),
    }));
  }, [merged, evaluationNames]);

  const leftDomain = yAxisDomain ?? domainFor(metric, merged);
  const leftLabel = yAxisLabel ?? labelFor(metric);

  const leftTick = (v: number) =>
    metric === 'approval' ? `${nf1.format(v)}%` : nf1.format(v);

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
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ 
                top: 16, 
                right: isMobile ? 10 : 28, 
                left: isMobile ? 8 : 12, 
                bottom: 8 
              }}
              barCategoryGap={isMobile ? "15%" : "25%"}
              barGap={isMobile ? 4 : 8}
              accessibilityLayer
              aria-label={`Gráfico de ${title}`}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#eef2f7" 
                opacity={0.5}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: isMobile ? 10 : 12 }}
                tickLine={{ stroke: '#d1d5db' }}
                minTickGap={isMobile ? 16 : 32}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? "end" : "middle"}
                height={isMobile ? 60 : 30}
              />
              <YAxis
                yAxisId="left"
                domain={leftDomain}
                label={isMobile ? undefined : { value: leftLabel, angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: isMobile ? 10 : 12 }}
                tickLine={{ stroke: '#d1d5db' }}
                tickFormatter={leftTick}
                width={isMobile ? 40 : 60}
              />
              {showVariation && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[-100, 100]}
                  label={{ value: 'Variação (%)', angle: 90, position: 'insideRight' }}
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#d1d5db' }}
                  tickFormatter={(v) => `${nf1.format(v)}%`}
                />
              )}
              <Tooltip
                contentStyle={{ 
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                formatter={tooltipFormatter}
                labelStyle={{ fontWeight: 'bold', marginBottom: 4 }}
              />

              {/* Barras - SEMPRE renderizar as 3 */}
              <Bar yAxisId="left" dataKey={evaluationNames[0] || '1ª Etapa'} name={evaluationNames[0] || '1ª Etapa'} fill={colors.etapa1} radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => <Cell key={`b1-${i}`} fill={colors.etapa1} />)}
              </Bar>
              <Bar yAxisId="left" dataKey={evaluationNames[1] || '2ª Etapa'} name={evaluationNames[1] || '2ª Etapa'} fill={colors.etapa2} radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => <Cell key={`b2-${i}`} fill={colors.etapa2} />)}
              </Bar>
              <Bar yAxisId="left" dataKey={evaluationNames[2] || '3ª Etapa'} name={evaluationNames[2] || '3ª Etapa'} fill={colors.etapa3} radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => <Cell key={`b3-${i}`} fill={colors.etapa3} />)}
              </Bar>

              {/* Linhas de variação */}
              {showVariation && (
                <>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="Variação 1→2"
                    name="Variação 1→2"
                    stroke="#0891b2"
                    strokeWidth={2.5}
                    dot={VariationDot('Variação 1→2')}
                    connectNulls
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="Variação 2→3"
                    name="Variação 2→3"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    dot={VariationDot('Variação 2→3')}
                    connectNulls
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda enxuta */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: colors.etapa1 }} />
            {evaluationNames[0] || '1ª Etapa'}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: colors.etapa2 }} />
            {evaluationNames[1] || '2ª Etapa'}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: colors.etapa3 }} />
            {evaluationNames[2] || '3ª Etapa'}
          </div>
          {showVariation && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">↗</span>
                </div>
                <span className="text-xs text-green-600">Aumento</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">↘</span>
                </div>
                <span className="text-xs text-red-600">Queda</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-gray-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">→</span>
                </div>
                <span className="text-xs text-gray-600">Estável</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}