import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OlimpiadaCardData, OlimpiadaStatus } from '@/types/olimpiada-types';
import { 
  Trophy, 
  Medal, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock, 
  Eye,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OlimpiadaCardProps {
  olimpiada: OlimpiadaCardData;
  onView?: (id: string) => void;
  onViewResults?: (id: string) => void;
  onApply?: (id: string) => void;
  className?: string;
}

const getStatusConfig = (status: OlimpiadaStatus) => {
  switch (status) {
    case 'draft':
      return {
        label: 'Rascunho',
        color: 'bg-gray-500',
        icon: Clock,
      };
    case 'scheduled':
      return {
        label: 'Agendada',
        color: 'bg-blue-500',
        icon: Calendar,
      };
    case 'active':
      return {
        label: 'Ativa',
        color: 'bg-green-500',
        icon: Play,
      };
    case 'completed':
      return {
        label: 'Concluída',
        color: 'bg-purple-500',
        icon: CheckCircle2,
      };
    case 'cancelled':
      return {
        label: 'Cancelada',
        color: 'bg-red-500',
        icon: Clock,
      };
    default:
      return {
        label: 'Desconhecido',
        color: 'bg-gray-500',
        icon: Clock,
      };
  }
};

export function OlimpiadaCard({
  olimpiada,
  onView,
  onViewResults,
  onApply,
  className,
}: OlimpiadaCardProps) {
  const statusConfig = getStatusConfig(olimpiada.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.01] sm:hover:scale-[1.02]',
        'bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50',
        'dark:from-yellow-950/20 dark:via-amber-950/20 dark:to-orange-950/20',
        'border-yellow-200 dark:border-yellow-800',
        'w-full',
        className
      )}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 opacity-10">
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 text-4xl sm:text-6xl">🏆</div>
      </div>

      <CardHeader className="relative">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <CardTitle className="text-lg sm:text-xl font-bold text-yellow-900 dark:text-yellow-100 truncate">
                {olimpiada.title}
              </CardTitle>
            </div>
            {olimpiada.description && (
              <CardDescription className="text-xs sm:text-sm text-yellow-800/80 dark:text-yellow-200/80 line-clamp-2">
                {olimpiada.description}
              </CardDescription>
            )}
          </div>
          <Badge
            className={cn(
              'flex items-center gap-1 w-fit',
              statusConfig.color,
              'text-white border-0 text-xs sm:text-sm'
            )}
          >
            <StatusIcon className="h-3 w-3" />
            <span className="hidden sm:inline">{statusConfig.label}</span>
            <span className="sm:hidden">{statusConfig.label.split(' ')[0]}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Subjects */}
        {olimpiada.subjects && olimpiada.subjects.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {olimpiada.subjects.slice(0, 3).map((subject) => (
              <Badge
                key={subject.id}
                variant="outline"
                className="bg-yellow-100/50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100"
              >
                {subject.name}
              </Badge>
            ))}
            {olimpiada.subjects.length > 3 && (
              <Badge
                variant="outline"
                className="bg-yellow-100/50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100"
              >
                +{olimpiada.subjects.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {olimpiada.startDateTime && (
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <span className="text-yellow-900 dark:text-yellow-100 truncate">
                {format(new Date(olimpiada.startDateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <span className="text-yellow-900 dark:text-yellow-100">
              {olimpiada.completedStudents || 0}/{olimpiada.totalStudents || 0} alunos
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {olimpiada.totalStudents && olimpiada.totalStudents > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-yellow-800 dark:text-yellow-200">
              <span>Progresso</span>
              <span>
                {Math.round(
                  ((olimpiada.completedStudents || 0) / olimpiada.totalStudents) * 100
                )}%
              </span>
            </div>
            <div className="h-2 bg-yellow-200 dark:bg-yellow-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-300"
                style={{
                  width: `${((olimpiada.completedStudents || 0) / olimpiada.totalStudents) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="relative flex flex-col gap-3">
        {/* Botões principais (Ver e Resultados) */}
        <div className="grid grid-cols-2 gap-2">
          {onView && (
            <Button
              variant="outline"
              size="default"
              onClick={() => onView(olimpiada.id)}
              className="border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver
            </Button>
          )}
          {onViewResults && (
            <Button
              variant="outline"
              size="default"
              onClick={() => onViewResults(olimpiada.id)}
              className="border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
              disabled={(olimpiada.completedStudents || 0) === 0}
              title={(olimpiada.completedStudents || 0) === 0 ? 'Nenhum resultado disponível ainda' : 'Ver resultados'}
            >
              <Medal className="h-4 w-4 mr-2" />
              Resultados
            </Button>
          )}
        </div>
        
        {/* Botão Aplicar em linha separada e maior */}
        {onApply && olimpiada.status === 'scheduled' && (
          <Button
            size="lg"
            onClick={() => onApply(olimpiada.id)}
            className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold shadow-md"
          >
            <Play className="h-5 w-5 mr-2" />
            Aplicar Olimpíada
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
