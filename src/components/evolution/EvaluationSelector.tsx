import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DisciplineTagWithChildren } from '@/components/ui/discipline-tag';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, BookOpen, Users, TrendingUp } from 'lucide-react';

interface Evaluation {
  id: string;
  titulo: string;
  disciplina: string;
  status: string;
  data_aplicacao: string;
}

interface Grade {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
}

interface EvaluationSelectorProps {
  evaluations: Evaluation[];
  selectedEvaluations: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onCompare: () => void;
  isLoading?: boolean;
  // Novos props para Série e Turma:
  grades?: Grade[];
  classes?: Class[];
  selectedGrade?: string;
  selectedClass?: string;
  onGradeChange?: (gradeId: string) => void;
  onClassChange?: (classId: string) => void;
}

export function EvaluationSelector({
  evaluations,
  selectedEvaluations,
  onSelectionChange,
  onCompare,
  isLoading = false,
  grades = [],
  classes = [],
  selectedGrade = 'all',
  selectedClass = 'all',
  onGradeChange,
  onClassChange
}: EvaluationSelectorProps) {
  
  const handleEvaluationToggle = (evaluationId: string) => {
    const isSelected = selectedEvaluations.includes(evaluationId);
    
    if (isSelected) {
      // Remover da seleção
      onSelectionChange(selectedEvaluations.filter(id => id !== evaluationId));
    } else {
      // Adicionar à seleção
      onSelectionChange([...selectedEvaluations, evaluationId]);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Data não informada';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'concluida':
      case 'finalizada':
      case 'concluída':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'em_andamento':
      case 'em andamento':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pendente':
      case 'agendada':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const isEvaluationReady = (status: string) => {
    const readyStatuses = ['concluida', 'finalizada', 'concluída'];
    return readyStatuses.includes(status.toLowerCase());
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'concluida':
      case 'finalizada':
      case 'concluída':
        return 'Concluída';
      case 'em_andamento':
      case 'em andamento':
        return 'Em Andamento';
      case 'pendente':
        return 'Pendente';
      case 'agendada':
        return 'Agendada';
      default:
        return 'Desconhecido';
    }
  };

  if (evaluations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma avaliação disponível
          </h3>
          <p className="text-gray-600 text-center max-w-md">
            Selecione uma escola para visualizar as avaliações disponíveis para comparação.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Adicionar Mais Avaliações para Comparação
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Selecione avaliações adicionais para comparar com a avaliação principal já selecionada.
        </p>
        
        {/* Filtros opcionais de Série e Turma */}
        {(grades.length > 0 || classes.length > 0) && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {grades.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Série (opcional)</label>
                <Select 
                  value={selectedGrade} 
                  onValueChange={onGradeChange}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione a série" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {grades.map(grade => (
                      <SelectItem key={grade.id} value={grade.id}>
                        {grade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {classes.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Turma (opcional)</label>
                <Select 
                  value={selectedClass} 
                  onValueChange={onClassChange}
                  disabled={isLoading || selectedGrade === 'all'}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {classes.map(classItem => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de avaliações */}
        <div className="space-y-3">
          {evaluations.map((evaluation, index) => {
            const isSelected = selectedEvaluations.includes(evaluation.id);
            const isFirst = index === 0;
            const isLast = index === evaluations.length - 1;
            
            return (
              <div key={evaluation.id} className="relative">
                {/* Conector VS (não mostrar no primeiro item) */}
                {!isFirst && (
                  <div className="flex items-center justify-center py-2">
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      <TrendingUp className="h-3 w-3" />
                      VS
                    </div>
                  </div>
                )}

                {/* Card da avaliação */}
                <div
                  className={`
                    relative border-2 rounded-lg p-4 transition-all duration-200 cursor-pointer
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                  onClick={() => handleEvaluationToggle(evaluation.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="flex-shrink-0 mt-1">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleEvaluationToggle(evaluation.id)}
                        disabled={isLoading || !isEvaluationReady(evaluation.status)}
                        className="h-4 w-4"
                      />
                    </div>

                    {/* Conteúdo da avaliação */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium truncate ${!isEvaluationReady(evaluation.status) ? 'text-gray-400' : 'text-gray-900'}`}>
                            {evaluation.titulo || 'Sem título'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <DisciplineTagWithChildren
                              subjectName={evaluation.disciplina || 'Disciplina não informada'}
                              className="text-xs"
                            >
                              <BookOpen className="mr-1 h-3 w-3" />
                              {evaluation.disciplina || 'Disciplina não informada'}
                            </DisciplineTagWithChildren>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getStatusColor(evaluation.status)}`}
                            >
                              {getStatusLabel(evaluation.status)}
                            </Badge>
                          </div>
                          {!isEvaluationReady(evaluation.status) && (
                            <p className="text-xs text-orange-600 mt-1">
                              ⚠️ Avaliação ainda não finalizada
                            </p>
                          )}
                        </div>

                        {/* Data */}
                        <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                          <Calendar className="h-3 w-3" />
                          {formatDate(evaluation.data_aplicacao)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Indicador de seleção */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Informações de seleção */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {selectedEvaluations.length} de {evaluations.length} avaliações selecionadas
              </span>
            </div>
            
            {selectedEvaluations.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedEvaluations.length >= 2 ? 'Pronto para comparar' : 'Selecione mais 1'}
              </Badge>
            )}
          </div>
          
          {selectedEvaluations.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500">
                Avaliações selecionadas: {selectedEvaluations.length}
                {selectedEvaluations.length < 2 && ' (mínimo 2 para comparar)'}
              </p>
            </div>
          )}
        </div>

        {/* Botão de comparação */}
        <div className="flex justify-end">
          <Button
            onClick={onCompare}
            disabled={selectedEvaluations.length < 2 || isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <TrendingUp className="h-4 w-4 mr-2 animate-spin" />
                Comparando...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Comparar ({selectedEvaluations.length})
              </>
            )}
          </Button>
        </div>

        {/* Mensagem de validação */}
        {selectedEvaluations.length > 0 && selectedEvaluations.length < 2 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ Selecione pelo menos 2 avaliações para realizar a comparação.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
