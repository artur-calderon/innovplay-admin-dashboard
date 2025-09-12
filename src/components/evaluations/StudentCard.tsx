import React from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Users, Eye } from 'lucide-react';

interface StudentCardProps {
  student: {
    id: string;
    nome: string;
    turma: string;
    nota: number;
    proficiencia: number;
    classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
    questoes_respondidas: number;
    acertos: number;
    erros: number;
    em_branco: number;
    tempo_gasto: number;
    status: 'concluida' | 'pendente';
  };
  totalQuestions: number;
  subjects: string[];
  onViewDetails: (studentId: string) => void;
}

export function StudentCard({ student, totalQuestions, subjects, onViewDetails }: StudentCardProps) {
  const accuracyRate = (student.questoes_respondidas || 0) > 0
    ? ((student.acertos || 0) / (student.questoes_respondidas || 0)) * 100
    : 0;
  
  const erros = student.erros || 0;
  const emBranco = student.em_branco || 0;
  const tempoGasto = student.tempo_gasto || 0;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white overflow-hidden">
      {/* Header minimalista */}
      <div className="relative bg-purple-600 p-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <CardTitle className="text-lg font-semibold text-white truncate">
              {student.nome}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            {student.turma}
          </Badge>
        </div>
        
        {/* Status badges minimalistas */}
        <div className="flex items-center gap-2">
          <Badge className={student.status === 'concluida' 
            ? 'bg-green-500/90 text-white border-green-400' 
            : 'bg-yellow-500/90 text-white border-yellow-400'}>
            {student.status === 'concluida' ? 'Concluída' : 'Pendente'}
          </Badge>
          <Badge className={student.classificacao === 'Avançado' ? 'bg-emerald-500 text-white' : 
                           student.classificacao === 'Adequado' ? 'bg-green-500 text-white' : 
                           student.classificacao === 'Básico' ? 'bg-yellow-500 text-white' : 
                           'bg-red-500 text-white'}>
            {student.classificacao}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Métricas principais */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {Number(student.nota || 0).toFixed(1)}
            </div>
            <div className="text-xs font-medium text-gray-600">Nota</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {student.proficiencia || 0}
            </div>
            <div className="text-xs font-medium text-purple-700">Proficiência</div>
          </div>
        </div>
        
        {/* Barra de progresso minimalista */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Taxa de Acerto</span>
            <span className="text-sm font-bold text-gray-900">{accuracyRate.toFixed(1)}%</span>
          </div>
          <div className="space-y-2">
            <Progress 
              value={accuracyRate} 
              className="h-2 bg-gray-200"
            />
            <div className="text-center">
              <span className="text-xs font-medium text-black">
                {student.acertos || 0}/{totalQuestions}
              </span>
            </div>
          </div>
        </div>

        {/* Estatísticas detalhadas */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-lg font-bold text-gray-900">{student.acertos || 0}</div>
            <div className="text-xs text-gray-600">Acertos</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-lg font-bold text-gray-900">{erros}</div>
            <div className="text-xs text-gray-600">Erros</div>
          </div>
        </div>

        {/* Informações adicionais */}
        <div className="space-y-2 pt-3 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total de Questões:</span>
            <span className="font-medium text-gray-900">{totalQuestions}</span>
          </div>
          {tempoGasto > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tempo Gasto:</span>
              <span className="font-medium text-gray-900">{Math.round(tempoGasto / 60)}min</span>
            </div>
          )}
          {subjects.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Disciplinas:</span>
              <div className="flex gap-1">
                {subjects.slice(0, 2).map((subject, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-300">
                    {subject}
                  </Badge>
                ))}
                {subjects.length > 2 && (
                  <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-300">
                    +{subjects.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Botão de ação */}
        <div className="pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(student.id)}
            className="w-full bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver Detalhes Completos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
