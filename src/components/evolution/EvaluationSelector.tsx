import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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

interface Grade { id: string; name: string; }
interface Class { id: string; name: string; }

interface EvaluationSelectorProps {
  evaluations: Evaluation[];
  selectedEvaluations: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onCompare: () => void;
  isLoading?: boolean;
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

  const handleToggle = (id: string) => {
    onSelectionChange(
      selectedEvaluations.includes(id)
        ? selectedEvaluations.filter(x => x !== id)
        : [...selectedEvaluations, id]
    );
  };

  const formatDate = (s: string) => {
    try {
      const d = new Date(s);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return 'Data não informada'; }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'concluida':
      case 'finalizada':
      case 'concluída': return 'bg-green-100 text-green-800 border-green-300';
      case 'em_andamento':
      case 'em andamento': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pendente':
      case 'agendada': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const isReady = (s: string) => ['concluida', 'finalizada', 'concluída'].includes(s.toLowerCase());
  const statusLabel = (s: string) => ({
    'concluida': 'Concluída',
    'concluída': 'Concluída',
    'finalizada': 'Concluída',
    'em_andamento': 'Em Andamento',
    'em andamento': 'Em Andamento',
    'pendente': 'Pendente',
    'agendada': 'Agendada',
  }[s.toLowerCase()] ?? 'Desconhecido');

  if (!evaluations.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma avaliação disponível</h3>
          <p className="text-gray-600 text-center max-w-md">Selecione uma escola para visualizar as avaliações disponíveis para comparação.</p>
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

        {(grades.length > 0 || classes.length > 0) && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {grades.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Série (opcional)</label>
                <Select value={selectedGrade} onValueChange={onGradeChange} disabled={isLoading}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione a série" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {classes.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Turma (opcional)</label>
                <Select value={selectedClass} onValueChange={onClassChange} disabled={isLoading || selectedGrade === 'all'}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          {evaluations.map((ev) => {
            const selected = selectedEvaluations.includes(ev.id);
            return (
              <div key={ev.id}>
                <div
          className={`relative border-2 rounded-lg p-4 transition-all duration-200 cursor-pointer
            ${selected ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}
          onClick={() => handleToggle(ev.id)}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <Checkbox
                checked={selected}
                onChange={() => handleToggle(ev.id)}
                disabled={isLoading || !isReady(ev.status)}
                className="h-4 w-4"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium truncate ${!isReady(ev.status) ? 'text-gray-400' : 'text-gray-900'}`}>{ev.titulo || 'Sem título'}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs"><BookOpen className="h-3 w-3 mr-1" />{ev.disciplina || 'Disciplina não informada'}</Badge>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(ev.status)}`}>{statusLabel(ev.status)}</Badge>
                  </div>
                  {!isReady(ev.status) && <p className="text-xs text-orange-600 mt-1">⚠️ Avaliação ainda não finalizada</p>}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                  <Calendar className="h-3 w-3" />
                  {formatDate(ev.data_aplicacao)}
                </div>
              </div>
            </div>
          </div>
          {selected && (
            <div className="absolute top-2 right-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"><div className="w-1.5 h-1.5 bg-white rounded-full" /></div>
            </div>
          )}
        </div>
              </div>
            );
          })}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">{selectedEvaluations.length} de {evaluations.length} avaliações selecionadas</span>
            </div>
            {selectedEvaluations.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedEvaluations.length >= 2 ? 'Pronto para comparar' : 'Selecione mais 1'}
              </Badge>
            )}
          </div>
          {selectedEvaluations.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Avaliações selecionadas: {selectedEvaluations.length}{selectedEvaluations.length < 2 && ' (mínimo 2 para comparar)'}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onCompare} disabled={selectedEvaluations.length < 2 || isLoading} className="min-w-[120px]">
            <TrendingUp className="h-4 w-4 mr-2" />
            Comparar ({selectedEvaluations.length})
          </Button>
        </div>

        {selectedEvaluations.length > 0 && selectedEvaluations.length < 2 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">⚠️ Selecione pelo menos 2 avaliações para realizar a comparação.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}