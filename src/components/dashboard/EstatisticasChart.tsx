import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  BarChart3, 
  LineChart, 
  Target, 
  Star, 
  Flame, 
  Calendar 
} from "lucide-react";

interface EstatisticasChartProps {
  stats: {
    estatisticas: {
      semana: Array<{ day: string; nota: number; avaliacao: string }>;
      mes: Array<{ week: string; nota: number; avaliacoes: number }>;
      ano: Array<{ month: string; nota: number; avaliacoes: number }>;
      resumo: {
        media: number;
        melhorNota: number;
        streak: number;
        metaAlcancada: boolean;
        progresso: number;
        totalAvaliacoes: number;
        tendencia: 'up' | 'down' | 'stable';
      };
    };
  };
  chartType: 'bar' | 'line' | 'area' | 'pie';
  period: 'week' | 'month' | 'year';
  onChartTypeChange: (type: 'bar' | 'line' | 'area' | 'pie') => void;
  onPeriodChange: (period: 'week' | 'month' | 'year') => void;
}

const EstatisticasChart: React.FC<EstatisticasChartProps> = ({ 
  stats, 
  chartType, 
  period, 
  onChartTypeChange, 
  onPeriodChange 
}) => {
  const getCurrentData = () => {
    switch (period) {
      case 'week':
        return stats.estatisticas.semana || [];
      case 'month':
        return stats.estatisticas.mes || [];
      case 'year':
        return stats.estatisticas.ano || [];
      default:
        return [];
    }
  };

  const data = getCurrentData();
  
  if (!data || data.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex-shrink-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold truncate">Estatísticas de Performance</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Notas das suas avaliações</p>
            </div>
          </div>
        </div>
        
        <div className="bg-muted rounded-lg p-8 text-center">
          <div className="text-muted-foreground mb-2">
            <Activity className="w-12 h-12 mx-auto" />
          </div>
          <h4 className="text-lg font-medium text-foreground mb-2">Sem dados</h4>
          <p className="text-sm text-muted-foreground">Não há estatísticas disponíveis para o período selecionado.</p>
        </div>
      </div>
    );
  }
  
  const maxValue = Math.max(...data.map(item => 'nota' in item ? item.nota : 0));
  const minValue = Math.min(...data.map(item => 'nota' in item ? item.nota : 0));

  const getLabel = (item: { day?: string; week?: string; month?: string; nota: number }) => {
    if ('day' in item) return item.day;
    if ('week' in item) return item.week;
    if ('month' in item) return item.month;
    return '';
  };

  const getValue = (item: { nota: number }) => {
    return item.nota || 0;
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <div className="h-64 flex items-end justify-between gap-2 px-2">
            {data.map((item, index) => (
              <div key={index} className="flex flex-col items-center flex-1 group">
                <div 
                  className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg min-h-[20px] transition-all duration-500 hover:from-purple-600 hover:to-purple-400 cursor-pointer shadow-lg"
                  style={{ height: `${(getValue(item) / 10) * 200}px` }}
                  title={`${getLabel(item)}: ${getValue(item)}`}
                />
                <span className="text-xs text-muted-foreground mt-2 font-medium group-hover:text-purple-600 transition-colors">
                  {getLabel(item)}
                </span>
                <span className="text-xs font-bold text-blue-600 group-hover:text-purple-600 transition-colors">
                  {(Math.ceil(getValue(item) * 10) / 10).toString().replace('.', ',')}
                </span>
              </div>
            ))}
          </div>
        );
      
      case 'line':
        return (
          <div className="h-64 relative px-2">
            <svg className="w-full h-full" viewBox="0 0 400 200">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
              <polyline
                points={data.map((item, index) => 
                  `${(index / (data.length - 1)) * 380 + 10},${200 - (getValue(item) / 10) * 180}`
                ).join(' ')}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                className="drop-shadow-sm"
              />
              {data.map((item, index) => (
                <circle
                  key={index}
                  cx={(index / (data.length - 1)) * 380 + 10}
                  cy={200 - (getValue(item) / 10) * 180}
                  r="4"
                  fill="#3B82F6"
                  className="hover:fill-purple-600 transition-colors cursor-pointer"
                />
              ))}
            </svg>
            <div className="flex justify-between mt-2">
              {data.map((item, index) => (
                <div key={index} className="text-xs text-center">
                  <div className="text-muted-foreground">{getLabel(item)}</div>
                  <div className="font-bold text-blue-600">{(Math.ceil(getValue(item) * 10) / 10).toString().replace('.', ',')}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'area':
        return (
          <div className="h-64 relative px-2">
            <svg className="w-full h-full" viewBox="0 0 400 200">
              <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              <polygon
                points={`10,200 ${data.map((item, index) => 
                  `${(index / (data.length - 1)) * 380 + 10},${200 - (getValue(item) / 10) * 180}`
                ).join(' ')} ${380 + 10},200`}
                fill="url(#areaGradient)"
                className="drop-shadow-sm"
              />
              <polyline
                points={data.map((item, index) => 
                  `${(index / (data.length - 1)) * 380 + 10},${200 - (getValue(item) / 10) * 180}`
                ).join(' ')}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
              />
            </svg>
            <div className="flex justify-between mt-2">
              {data.map((item, index) => (
                <div key={index} className="text-xs text-center">
                  <div className="text-muted-foreground">{getLabel(item)}</div>
                  <div className="font-bold text-blue-600">{(Math.ceil(getValue(item) * 10) / 10).toString().replace('.', ',')}</div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Estatísticas de Performance</h3>
            <p className="text-sm text-muted-foreground">Notas das suas avaliações</p>
          </div>
        </div>
        
        {/* Controles de período e tipo de gráfico */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Button
              size="sm"
              variant={period === 'week' ? 'default' : 'ghost'}
              onClick={() => onPeriodChange('week')}
              className="text-xs px-2 sm:px-3"
            >
              <span className="hidden sm:inline">Semana</span>
              <span className="sm:hidden">Sem</span>
            </Button>
            <Button
              size="sm"
              variant={period === 'month' ? 'default' : 'ghost'}
              onClick={() => onPeriodChange('month')}
              className="text-xs px-2 sm:px-3"
            >
              Mês
            </Button>
            <Button
              size="sm"
              variant={period === 'year' ? 'default' : 'ghost'}
              onClick={() => onPeriodChange('year')}
              className="text-xs px-2 sm:px-3"
            >
              Ano
            </Button>
          </div>
          
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Button
              size="sm"
              variant={chartType === 'bar' ? 'default' : 'ghost'}
              onClick={() => onChartTypeChange('bar')}
              className="text-xs p-2"
            >
              <BarChart3 className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant={chartType === 'line' ? 'default' : 'ghost'}
              onClick={() => onChartTypeChange('line')}
              className="text-xs p-2"
            >
              <LineChart className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant={chartType === 'area' ? 'default' : 'ghost'}
              onClick={() => onChartTypeChange('area')}
              className="text-xs p-2"
            >
              <Activity className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Estatísticas de resumo gamificadas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-2 sm:p-3 text-white">
          <div className="flex items-center gap-1 sm:gap-2">
            <Target className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-xs font-medium truncate">Média</span>
          </div>
          <p className="text-sm sm:text-lg font-bold truncate">
            {stats.estatisticas.resumo.media ? (Math.ceil(stats.estatisticas.resumo.media * 10) / 10).toString().replace('.', ',') : '0'}
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg p-2 sm:p-3 text-white">
          <div className="flex items-center gap-1 sm:gap-2">
            <Star className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-xs font-medium truncate">Melhor</span>
          </div>
          <p className="text-sm sm:text-lg font-bold truncate">
            {stats.estatisticas.resumo.melhorNota ? (Math.ceil(stats.estatisticas.resumo.melhorNota * 10) / 10).toString().replace('.', ',') : '0'}
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-2 sm:p-3 text-white">
          <div className="flex items-center gap-1 sm:gap-2">
            <Flame className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-xs font-medium truncate">Streak</span>
          </div>
          <p className="text-sm sm:text-lg font-bold truncate">{stats.estatisticas.resumo.streak} dias</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg p-2 sm:p-3 text-white">
          <div className="flex items-center gap-1 sm:gap-2">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="text-xs font-medium truncate">Total</span>
          </div>
          <p className="text-sm sm:text-lg font-bold truncate">{stats.estatisticas.resumo.totalAvaliacoes}</p>
        </div>
      </div>

      {/* Gráfico principal */}
      <div className="bg-muted rounded-lg p-3 sm:p-4">
        {renderChart()}
      </div>

      {/* Progresso da meta */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs sm:text-sm font-medium truncate">Meta do Mês</span>
          <Badge className={`${stats.estatisticas.resumo.metaAlcancada ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} flex-shrink-0 text-xs`}>
            {stats.estatisticas.resumo.metaAlcancada ? '🎉 Alcançada!' : '💪 Em progresso'}
          </Badge>
        </div>
        <Progress value={stats.estatisticas.resumo.progresso} className="h-3 mb-2" />
        <p className="text-xs text-muted-foreground">{stats.estatisticas.resumo.progresso}% da meta mensal</p>
      </div>
    </div>
  );
};

export default EstatisticasChart;
