import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EvolutionData {
  name: string;
  etapa1: number;
  etapa2: number;
  etapa3?: number;
  variacao_1_2: number;
  variacao_2_3?: number;
}

interface EvolutionChartProps {
  data: EvolutionData[];
  metric: 'grade' | 'proficiency' | 'classification' | 'participation' | 'approval';
  title: string;
  subtitle?: string;
  yAxisLabel?: string;
  yAxisDomain?: [number, number];
  showVariation?: boolean;
}

export function EvolutionChart({
  data,
  metric,
  title,
  subtitle,
  yAxisLabel = 'Valor',
  yAxisDomain = [0, 10],
  showVariation = true
}: EvolutionChartProps) {
  
  // Cores por etapa (seguindo padrão da imagem)
  const colors = {
    etapa1: '#fb923c', // laranja
    etapa2: '#a855f7', // roxo
    etapa3: '#22c55e', // verde
    increase: '#22c55e', // verde para crescimento
    decrease: '#ef4444', // vermelho para decréscimo
    stable: '#6b7280' // cinza para estável
  };

  // Formatar dados para o gráfico
  const chartData = data.map(item => {
    const formattedItem: any = {
      name: item.name,
      '1ª Etapa': item.etapa1,
      '2ª Etapa': item.etapa2,
      'Variação 1→2': item.variacao_1_2
    };

    if (item.etapa3 !== undefined) {
      formattedItem['3ª Etapa'] = item.etapa3;
      if (item.variacao_2_3 !== undefined) {
        formattedItem['Variação 2→3'] = item.variacao_2_3;
      }
    }

    return formattedItem;
  });

  // Customizar tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey.includes('Variação')) {
              const value = entry.value;
              const isPositive = value > 0;
              const isNegative = value < 0;
              const isStable = value === 0;
              
              return (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm font-medium">{entry.dataKey}:</span>
                  <span className={`text-sm font-bold ${
                    isPositive ? 'text-green-600' : 
                    isNegative ? 'text-red-600' : 
                    'text-gray-600'
                  }`}>
                    {isPositive ? '+' : ''}{value.toFixed(1)}%
                    {isPositive && <TrendingUp className="inline h-3 w-3 ml-1" />}
                    {isNegative && <TrendingDown className="inline h-3 w-3 ml-1" />}
                    {isStable && <Minus className="inline h-3 w-3 ml-1" />}
                  </span>
                </div>
              );
            } else {
              return (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm font-medium">{entry.dataKey}:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {entry.value.toFixed(1)}
                  </span>
                </div>
              );
            }
          })}
        </div>
      );
    }
    return null;
  };

  // Customizar label das barras
  const CustomBarLabel = ({ x, y, width, value }: any) => {
    return (
      <text
        x={x + width / 2}
        y={y - 5}
        textAnchor="middle"
        className="text-xs font-medium fill-gray-700"
      >
        {value.toFixed(1)}
      </text>
    );
  };

  // Customizar label das linhas
  const CustomLineLabel = ({ x, y, value }: any) => {
    const isPositive = value > 0;
    const isNegative = value < 0;
    const isStable = value === 0;
    
    return (
      <text
        x={x}
        y={y - 10}
        textAnchor="middle"
        className={`text-xs font-bold ${
          isPositive ? 'fill-green-600' : 
          isNegative ? 'fill-red-600' : 
          'fill-gray-600'
        }`}
      >
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {title}
        </CardTitle>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#d1d5db' }}
              />
              <YAxis 
                yAxisId="left"
                label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
                domain={yAxisDomain}
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#d1d5db' }}
              />
              {showVariation && (
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'Variação (%)', angle: 90, position: 'insideRight' }}
                  domain={[-100, 100]}
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#d1d5db' }}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              
              {/* Barras das etapas */}
              <Bar 
                yAxisId="left"
                dataKey="1ª Etapa" 
                fill={colors.etapa1}
                name="1ª Etapa"
                radius={[2, 2, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-1-${index}`} fill={colors.etapa1} />
                ))}
              </Bar>
              
              <Bar 
                yAxisId="left"
                dataKey="2ª Etapa" 
                fill={colors.etapa2}
                name="2ª Etapa"
                radius={[2, 2, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-2-${index}`} fill={colors.etapa2} />
                ))}
              </Bar>
              
              {chartData.some(item => item['3ª Etapa'] !== undefined) && (
                <Bar 
                  yAxisId="left"
                  dataKey="3ª Etapa" 
                  fill={colors.etapa3}
                  name="3ª Etapa"
                  radius={[2, 2, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-3-${index}`} fill={colors.etapa3} />
                  ))}
                </Bar>
              )}
              
              {/* Linhas de variação */}
              {showVariation && (
                <>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="Variação 1→2"
                    stroke={colors.increase}
                    strokeWidth={3}
                    dot={{ r: 4, fill: colors.increase }}
                    name="Variação 1→2"
                  />
                  {chartData.some(item => item['Variação 2→3'] !== undefined) && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="Variação 2→3"
                      stroke={colors.increase}
                      strokeWidth={3}
                      dot={{ r: 4, fill: colors.increase }}
                      name="Variação 2→3"
                    />
                  )}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legenda */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.etapa1 }} />
            <span>1ª Etapa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.etapa2 }} />
            <span>2ª Etapa</span>
          </div>
          {chartData.some(item => item['3ª Etapa'] !== undefined) && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.etapa3 }} />
              <span>3ª Etapa</span>
            </div>
          )}
          {showVariation && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-green-500" />
              <span>Variação (%)</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

