import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Customized,
  Legend,
  Line,
  LineChart,
  ComposedChart,
  Scatter,
  ScatterChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, BookOpen, Target, TrendingUp, TrendingDown } from "lucide-react";
import { EvolutionChartData, MetricType, DisciplineType } from "@/types/evolution-types";

// Interface para dados de comparação existentes
interface StudentCompareResponse {
  student: {
    id: string;
    user_id: string;
    name: string;
  };
  evaluations: Array<{
    order: number;
    id: string;
    title: string;
    created_at: string;
    application_date: string;
  }>;
  total_evaluations: number;
  comparisons: Array<{
    from_evaluation: {
      id: string;
      title: string;
      order: number;
    };
    to_evaluation: {
      id: string;
      title: string;
      order: number;
    };
    general_comparison: {
      student_grade: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: {
          value: number;
          percentage: number;
          direction: 'increase' | 'decrease';
        };
      };
      student_proficiency: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: {
          value: number;
          percentage: number;
          direction: 'increase' | 'decrease';
        };
      };
      student_classification: {
        evaluation_1: string;
        evaluation_2: string;
      };
      correct_answers: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: {
          value: number;
          percentage: number;
          direction: 'increase' | 'decrease';
        };
      };
      total_questions: {
        evaluation_1: number;
        evaluation_2: number;
      };
      score_percentage: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: {
          value: number;
          percentage: number;
          direction: 'increase' | 'decrease';
        };
      };
    };
    subject_comparison: Record<string, {
      subject_id: string;
      student_grade: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: {
          value: number;
          percentage: number;
          direction: 'increase' | 'decrease';
        };
      };
      student_proficiency: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: {
          value: number;
          percentage: number;
          direction: 'increase' | 'decrease';
        };
      };
      student_classification: {
        evaluation_1: string;
        evaluation_2: string;
      };
      correct_answers: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: {
          value: number;
          percentage: number;
          direction: 'increase' | 'decrease';
        };
      };
      total_questions: {
        evaluation_1: number;
        evaluation_2: number;
      };
    }>;
  }>;
  total_comparisons: number;
}

interface EvolutionChartProps {
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  isLoading?: boolean;
}

const EvolutionChart: React.FC<EvolutionChartProps> = ({ data, isLoading = false }) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('grade');
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineType>('Geral');

  // Cores para as avaliações (exatas da imagem)
  const getStageColor = (index: number): string => {
    const colors = [
      '#D28B3F', // Laranja (1ª Etapa) - exata da imagem
      '#8A2BE2', // Roxo (2ª Etapa) - exata da imagem
      '#2E8B57', // Verde (3ª Etapa) - exata da imagem
      '#3B82F6', // Azul (4ª Etapa)
      '#EC4899', // Rosa (5ª Etapa)
      '#F59E0B', // Amarelo (6ª Etapa)
      '#EF4444', // Vermelho (7ª Etapa)
      '#06B6D4', // Ciano (8ª Etapa)
    ];
    return colors[index % colors.length];
  };

  // Converter classificação em valor numérico
  const getClassificationValue = (classification: string): number => {
    const classificationMap: Record<string, number> = {
      'Muito Abaixo': 1,
      'Abaixo': 2,
      'Adequado': 3,
      'Avançado': 4,
      'Muito Avançado': 5,
    };
    return classificationMap[classification] || 0;
  };

  // Processar dados para o gráfico
  const chartData = useMemo(() => {
    if (!data || !data.evaluations || data.evaluations.length < 2) {
      return null;
    }

    // Ordenar avaliações por ordem cronológica
    const sortedEvaluations = [...data.evaluations].sort((a, b) => a.order - b.order);
    
    // Obter disciplinas disponíveis
    const disciplines = ['Geral'];
    if (data.comparisons.length > 0) {
      const subjects = Object.keys(data.comparisons[0].subject_comparison || {});
      disciplines.push(...subjects);
    }

    const processDiscipline = (discipline: string): EvolutionChartData => {
      const evaluations = sortedEvaluations.map((evaluation, index) => {
        let value = 0;
        
        if (discipline === 'Geral') {
          // Usar dados gerais
          const comparison = data.comparisons.find(comp => 
            comp.from_evaluation.id === evaluation.id || comp.to_evaluation.id === evaluation.id
          );
          
          if (comparison) {
            if (selectedMetric === 'grade') {
              value = comparison.general_comparison.student_grade[`evaluation_${index + 1}`] || 0;
            } else if (selectedMetric === 'proficiency') {
              value = comparison.general_comparison.student_proficiency[`evaluation_${index + 1}`] || 0;
            } else if (selectedMetric === 'classification') {
              const classification = comparison.general_comparison.student_classification[`evaluation_${index + 1}`];
              value = getClassificationValue(classification);
            }
          }
        } else {
          // Usar dados por disciplina
          const comparison = data.comparisons.find(comp => 
            comp.from_evaluation.id === evaluation.id || comp.to_evaluation.id === evaluation.id
          );
          
          if (comparison?.subject_comparison[discipline]) {
            const subjectData = comparison.subject_comparison[discipline];
            if (selectedMetric === 'grade') {
              value = subjectData.student_grade[`evaluation_${index + 1}`] || 0;
            } else if (selectedMetric === 'proficiency') {
              value = subjectData.student_proficiency[`evaluation_${index + 1}`] || 0;
            } else if (selectedMetric === 'classification') {
              const classification = subjectData.student_classification[`evaluation_${index + 1}`];
              value = getClassificationValue(classification);
            }
          }
        }

        return {
          name: evaluation.title,
          value: Math.round(value * 10) / 10, // Arredondar para 1 casa decimal
          color: getStageColor(index),
          order: evaluation.order,
        };
      });

      // Calcular variações usando dados reais da API
      const variations = [];
      if (data.comparisons && data.comparisons.length > 0) {
        data.comparisons.forEach((comparison, index) => {
          let evolutionData = null;
          
          if (discipline === 'Geral') {
            // Usar dados gerais baseados na métrica selecionada
            if (selectedMetric === 'grade') {
              evolutionData = comparison.general_comparison.student_grade.evolution;
            } else if (selectedMetric === 'proficiency') {
              evolutionData = comparison.general_comparison.student_proficiency.evolution;
            } else if (selectedMetric === 'classification') {
              // Para classificação, calcular a evolução manualmente
              const fromValue = getClassificationValue(comparison.general_comparison.student_classification.evaluation_1);
              const toValue = getClassificationValue(comparison.general_comparison.student_classification.evaluation_2);
              const percentage = fromValue > 0 ? ((toValue - fromValue) / fromValue) * 100 : 0;
              evolutionData = {
                percentage: Math.round(percentage * 10) / 10,
                direction: percentage >= 0 ? 'increase' : 'decrease'
              };
            }
          } else if (comparison.subject_comparison[discipline]) {
            // Usar dados por disciplina
            const subjectData = comparison.subject_comparison[discipline];
            if (selectedMetric === 'grade') {
              evolutionData = subjectData.student_grade.evolution;
            } else if (selectedMetric === 'proficiency') {
              evolutionData = subjectData.student_proficiency.evolution;
            } else if (selectedMetric === 'classification') {
              const fromValue = getClassificationValue(subjectData.student_classification.evaluation_1);
              const toValue = getClassificationValue(subjectData.student_classification.evaluation_2);
              const percentage = fromValue > 0 ? ((toValue - fromValue) / fromValue) * 100 : 0;
              evolutionData = {
                percentage: Math.round(percentage * 10) / 10,
                direction: percentage >= 0 ? 'increase' : 'decrease'
              };
            }
          }
          
          if (evolutionData) {
            variations.push({
              from: comparison.from_evaluation.order - 1, // Converter para índice baseado em 0
              to: comparison.to_evaluation.order - 1,
              percentage: evolutionData.percentage,
              direction: evolutionData.direction,
            });
          }
        });
      }

      return {
        discipline,
        evaluations,
        variations,
      };
    };

    return processDiscipline(selectedDiscipline);
  }, [data, selectedMetric, selectedDiscipline]);

  // Componente para desenhar apenas as linhas de conexão
  interface ConnectionLinesProps {
    formattedGraphicalItems?: Array<{
      props?: {
        points?: Array<{ x: number; y: number }>;
        children?: unknown | unknown[];
      };
    }>;
  }

  const ConnectionLines = (props: ConnectionLinesProps) => {
    if (!chartData || chartData.variations.length === 0) {
      return null;
    }

    // Usar as props do Customized para obter as coordenadas dos pontos do Scatter
    const { formattedGraphicalItems } = props;
    
    if (!formattedGraphicalItems || !formattedGraphicalItems[0]) {
      return null;
    }
    
    // Procurar pelos pontos do Scatter
    const findScatterPoints = (items: Array<{ props?: { points?: Array<{ x: number; y: number }>; children?: unknown | unknown[] } }>): Array<{ x: number; y: number }> => {
      const result: Array<{ x: number; y: number }> = [];
      items.forEach(item => {
        if (item.props) {
          if (item.props.points) {
            result.push(...item.props.points);
          }
          if (item.props.children) {
            const childrenArray = Array.isArray(item.props.children) ? item.props.children : [item.props.children];
            result.push(...findScatterPoints(childrenArray as Array<{ props?: { points?: Array<{ x: number; y: number }>; children?: unknown | unknown[] } }>));
          }
        }
      });
      return result;
    };
    
    const scatterPoints = findScatterPoints(formattedGraphicalItems);
    
    if (!scatterPoints || scatterPoints.length < 2) {
      return null;
    }

    return (
      <g>
        {/* Linhas de conexão entre os pontos do Scatter */}
        {chartData.variations.map((variation, index) => {
          const prevPoint = scatterPoints[variation.from];
          const currPoint = scatterPoints[variation.to];
          
          if (!prevPoint || !currPoint) return null;
          
          const color = variation.direction === 'increase' ? '#22c55e' : '#ef4444';
          const midX = (prevPoint.x + currPoint.x) / 2;
          const midY = (prevPoint.y + currPoint.y) / 2;

          return (
            <g key={`line-${index}`}>
              {/* Linha de conexão entre os pontos */}
              <line
                x1={prevPoint.x}
                y1={prevPoint.y}
                x2={currPoint.x}
                y2={currPoint.y}
                stroke={color}
                strokeWidth={3}
              />
              
              {/* Texto com percentual no meio da linha */}
              <text
                x={midX}
                y={midY - 10}
                fill={color}
                fontSize={12}
                fontWeight="bold"
                textAnchor="middle"
              >
                {variation.direction === 'increase' ? '+' : ''}{variation.percentage}%
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  // Tooltip personalizado
  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ payload: { value: number; color: string } }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card p-4 border border-border rounded-xl shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: data.color }}
            />
            <p className="font-semibold text-sm text-foreground">{label}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-foreground">
              <span className="font-medium">Valor:</span> 
              <span className="ml-1 font-bold text-lg" style={{ color: data.color }}>
                {data.value.toFixed(1)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedMetric === 'grade' ? 'Nota (0-10)' : 
               selectedMetric === 'proficiency' ? 'Proficiência' : 'Classificação (1-5)'}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex-shrink-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="truncate">Evolução do Aluno</div>
              <div className="text-xs text-muted-foreground font-normal">Carregando dados...</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-64 bg-muted rounded-lg animate-pulse flex items-center justify-center">
            <div className="text-muted-foreground">Carregando gráfico...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !chartData || chartData.evaluations.length < 2) {
    return (
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex-shrink-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="truncate">Evolução do Aluno</div>
              <div className="text-xs text-muted-foreground font-normal">Sem avaliações para comparar</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium">Sem avaliações para comparar</p>
              <p className="text-sm text-muted-foreground mt-2">
                É necessário pelo menos 2 avaliações para mostrar a evolução
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex-shrink-0">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="truncate">Evolução do Aluno</div>
            <div className="text-xs text-muted-foreground font-normal">
              {selectedDiscipline} - {selectedMetric === 'grade' ? 'Nota' : 
               selectedMetric === 'proficiency' ? 'Proficiência' : 'Classificação'}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Controles */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex gap-1">
            <Button
              variant={selectedMetric === 'grade' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedMetric('grade')}
            >
              <BookOpen className="w-4 h-4 mr-1" />
              Nota
            </Button>
            <Button
              variant={selectedMetric === 'proficiency' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedMetric('proficiency')}
            >
              <Target className="w-4 h-4 mr-1" />
              Proficiência
            </Button>
            <Button
              variant={selectedMetric === 'classification' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedMetric('classification')}
            >
              <Activity className="w-4 h-4 mr-1" />
              Classificação
            </Button>
          </div>
          
          <div className="flex gap-1">
            {['Geral', 'Matemática', 'Português'].map((discipline) => (
              <Button
                key={discipline}
                variant={selectedDiscipline === discipline ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDiscipline(discipline as DisciplineType)}
              >
                {discipline}
              </Button>
            ))}
          </div>
        </div>

        {/* Gráfico */}
        <div className="h-96 bg-muted rounded-lg p-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData.evaluations}
              margin={{ top: 40, right: 40, left: 40, bottom: 80 }}
            >
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={11}
                tick={{ fill: 'hsl(var(--foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                domain={selectedMetric === 'classification' ? [0, 6] : [0, 'dataMax + 1']}
                tickFormatter={(value: number) => {
                  if (selectedMetric === 'classification') {
                    const classificationMap: Record<number, string> = {
                      1: 'Muito Abaixo',
                      2: 'Abaixo', 
                      3: 'Adequado',
                      4: 'Avançado',
                      5: 'Muito Avançado'
                    };
                    return classificationMap[value] || value.toString();
                  }
                  return value.toFixed(1);
                }}
                fontSize={11}
                tick={{ fill: 'hsl(var(--foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              <Bar 
                dataKey="value" 
                radius={[6, 6, 0, 0]}
                maxBarSize={80}
                shape={(props: {
                  payload?: { color?: string };
                  fill?: string;
                  tooltipPayload?: unknown;
                  tooltipPosition?: unknown;
                  dataKey?: unknown;
                  x?: number;
                  y?: number;
                  width?: number;
                  height?: number;
                  rx?: number;
                  ry?: number;
                  className?: string;
                  style?: React.CSSProperties;
                  onClick?: () => void;
                  onMouseEnter?: () => void;
                  onMouseLeave?: () => void;
                }) => {
                  const { 
                    payload, 
                    fill, 
                    tooltipPayload, 
                    tooltipPosition, 
                    dataKey,
                    // Filtrar todas as props do Recharts que não são válidas para elementos DOM
                    ...rest 
                  } = props;
                  
                  // Criar um objeto limpo apenas com props válidas para SVG rect
                  const validProps: Record<string, string | number | React.CSSProperties | (() => void) | undefined> = {};
                  const validSvgProps = ['x', 'y', 'width', 'height', 'rx', 'ry', 'className', 'style', 'onClick', 'onMouseEnter', 'onMouseLeave'];
                  
                  Object.keys(rest).forEach(key => {
                    if (validSvgProps.includes(key) || key.startsWith('data-') || key.startsWith('aria-')) {
                      validProps[key] = rest[key as keyof typeof rest];
                    }
                  });
                  
                  return (
                    <rect
                      {...validProps}
                      fill={payload?.color || fill}
                    />
                  );
                }}
              >
                <LabelList 
                  dataKey="value" 
                  position="top" 
                  formatter={(value: number) => value.toFixed(1)}
                  style={{ fill: 'hsl(var(--foreground))', fontSize: '11px', fontWeight: 'bold' }}
                />
              </Bar>
              
              {/* Pontos no topo das barras usando Scatter */}
              <Scatter 
                dataKey="value" 
                fill="#8884d8"
                r={4}
                stroke="white"
                strokeWidth={2}
                shape={(props: { payload?: { color?: string }; cx?: number; cy?: number }) => {
                  const color = props.payload?.color || '#8884d8';
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={4}
                      fill={color}
                      stroke="white"
                      strokeWidth={2}
                    />
                  );
                }}
              />
              
              <Customized component={ConnectionLines} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

      </CardContent>
    </Card>
  );
};

export default EvolutionChart;

