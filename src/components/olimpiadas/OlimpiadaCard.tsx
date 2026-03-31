import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DisciplineTag } from '@/components/ui/discipline-tag';
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
  Play,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EvaluationResultsApiService } from '@/services/evaluation/evaluationResultsApi';

interface OlimpiadaCardProps {
  olimpiada: OlimpiadaCardData;
  onView?: (id: string) => void;
  onViewResults?: (id: string) => void;
  onApply?: (id: string) => void;
  onDelete?: (id: string) => void;
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
  onDelete,
  className,
}: OlimpiadaCardProps) {
  const statusConfig = getStatusConfig(olimpiada.status);
  const StatusIcon = statusConfig.icon;
  const [participantsCount, setParticipantsCount] = useState(olimpiada.completedStudents || 0);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Estado para total de alunos também
  const [totalCount, setTotalCount] = useState(olimpiada.totalStudents || 0);

  // Inicializar estados com valores da prop
  useEffect(() => {
    setParticipantsCount(olimpiada.completedStudents || 0);
    setTotalCount(olimpiada.totalStudents || 0);
  }, [olimpiada.completedStudents, olimpiada.totalStudents]);

  // Atualizar participantes em tempo real para olimpíadas ativas ou quando não há dados
  useEffect(() => {
    // Buscar dados sempre para garantir que temos os valores corretos
    // 1. Olimpíada está ativa (atualização em tempo real)
    // 2. Não tem dados de participantes ou total (buscar uma vez para preencher)
    // 3. Olimpíada está concluída (mostrar dados finais)
    // 4. ✅ Modo individual: sempre buscar se houver selected_students (mesmo que status seja scheduled)
    const hasIndividualStudents = olimpiada.selected_students && olimpiada.selected_students.length > 0;
    const shouldFetch = olimpiada.status === 'active' || 
                       olimpiada.status === 'completed' ||
                       (olimpiada.completedStudents === 0 && olimpiada.totalStudents === 0) ||
                       hasIndividualStudents; // ✅ Buscar sempre quando há alunos individuais aplicados

    const fetchParticipants = async () => {
      try {
        setIsLoadingParticipants(true);
        
        if (import.meta.env.DEV) {
          console.log(`[OlimpiadaCard] Buscando participantes para ${olimpiada.id}`, {
            selected_students: olimpiada.selected_students,
            status: olimpiada.status,
            hasSelectedStudents: olimpiada.selected_students?.length > 0
          });
        }
        
        const detailedReport = await EvaluationResultsApiService.getDetailedReport(olimpiada.id);
        if (detailedReport?.alunos && Array.isArray(detailedReport.alunos)) {
          let alunos = detailedReport.alunos;
          
          if (import.meta.env.DEV) {
            console.log(`[OlimpiadaCard] Relatório retornou ${alunos.length} alunos`, {
              alunoIds: alunos.map((a: any) => String(a.id || a.student_id || 'desconhecido')),
              statuses: alunos.map((a: any) => a.status)
            });
          }
          
          // ✅ Modo individual: filtrar apenas alunos em selected_students OU alunos individuais aplicados
          if (olimpiada.selected_students && olimpiada.selected_students.length > 0) {
            const selectedIds = olimpiada.selected_students.map((id) => String(id));
            
            if (import.meta.env.DEV) {
              console.log(`[OlimpiadaCard] Filtrando por selected_students:`, selectedIds);
            }
            
            alunos = alunos.filter((a: { id?: string; student_id?: string }) => {
              const alunoId = String(a.id || a.student_id || '');
              // Comparar de forma mais flexível (com e sem hífens, case-insensitive)
              const matches = selectedIds.some((selectedId) => {
                const normalizedSelected = selectedId.toLowerCase().replace(/-/g, '');
                const normalizedAluno = alunoId.toLowerCase().replace(/-/g, '');
                return normalizedSelected === normalizedAluno || selectedId === alunoId;
              });
              
              if (import.meta.env.DEV && matches) {
                console.log(`[OlimpiadaCard] Aluno encontrado:`, { alunoId, selectedIds });
              }
              
              return matches;
            });
            
            if (import.meta.env.DEV) {
              console.log(`[OlimpiadaCard] Após filtro: ${alunos.length} alunos de ${detailedReport.alunos.length} total`, {
                selectedIds,
                alunosEncontrados: alunos.map((a: any) => ({
                  id: String(a.id || a.student_id),
                  status: a.status,
                  nome: a.nome || a.name
                }))
              });
            }
          } else {
            // ✅ Fallback: tentar identificar alunos individuais pelo application_info
            const alunosIndividuais = alunos.filter((a: any) => {
              return a.application_info?.student_test_olimpics_id || 
                     a.student_test_olimpics_id ||
                     (a.application_info && !a.application_info.class_test_id && a.application_info.student_test_olimpics_id);
            });
            
            if (alunosIndividuais.length > 0) {
              alunos = alunosIndividuais;
              if (import.meta.env.DEV) {
                console.log(`[OlimpiadaCard] Identificados ${alunos.length} alunos individuais pelo application_info`);
              }
            }
          }
          
          const total = alunos.length;
          const completed = alunos.filter((a: { status?: string }) => a.status === 'concluida').length;

          if (import.meta.env.DEV) {
            console.log(`[OlimpiadaCard] Atualizando contadores:`, { total, completed, olimpiadaId: olimpiada.id });
          }

          // Sempre atualizar, mesmo se for 0
          setParticipantsCount(completed);
          setTotalCount(total);
          setLastUpdate(new Date());
        } else {
          // Se não houver alunos no relatório, manter valores originais
          if (import.meta.env.DEV) {
            console.log(`[OlimpiadaCard] Olimpíada ${olimpiada.id} não possui dados de alunos ainda`);
          }
        }
      } catch (error) {
        // Se falhar (ex: olimpíada ainda não foi aplicada), manter valores originais
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        // Não logar erro se for 404 ou se a olimpíada ainda não foi aplicada
        if (!errorMessage.includes('404') && !errorMessage.includes('não possui')) {
          console.warn(`[OlimpiadaCard] Erro ao buscar participantes para olimpíada ${olimpiada.id}:`, error);
        }
        // Não resetar valores em caso de erro para não perder dados já carregados
      } finally {
        setIsLoadingParticipants(false);
      }
    };

    if (shouldFetch) {
      // Buscar imediatamente
      fetchParticipants();

      // Atualizar a cada 30 segundos apenas para olimpíadas ativas
      if (olimpiada.status === 'active') {
        const interval = setInterval(fetchParticipants, 30000);
        return () => clearInterval(interval);
      }
    }
  }, [olimpiada.id, olimpiada.status, olimpiada.selected_students]);

  // Usar o contador atualizado se disponível, senão usar o valor original
  // Priorizar valores atualizados, mas manter valores originais se atualizados forem 0 e originais não
  const displayParticipants = participantsCount >= 0 ? participantsCount : (olimpiada.completedStudents || 0);
  const isIndividual = (olimpiada.selected_students?.length ?? 0) > 0;
  // Modo individual: quando selected_students tem length, usar como total para não mostrar 0/4
  const displayTotal =
    totalCount > 0
      ? totalCount
      : (olimpiada.selected_students?.length ?? 0) > 0
        ? olimpiada.selected_students!.length
        : (olimpiada.totalStudents || 0);

  return (
    <Card
      className={cn(
        'group relative overflow-visible transition-all duration-300 hover:shadow-lg hover:scale-[1.01] sm:hover:scale-[1.02]',
        'bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50',
        'dark:from-yellow-950/20 dark:via-amber-950/20 dark:to-orange-950/20',
        'border-yellow-200 dark:border-yellow-800',
        'w-full',
        'flex flex-col',
        className
      )}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 opacity-10">
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 text-4xl sm:text-6xl">🏆</div>
      </div>

      <CardHeader className="relative flex-shrink-0 pb-2 sm:pb-4 overflow-visible">
        <div className="flex flex-col gap-2 w-full min-w-0 overflow-visible">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="flex-1 min-w-0 overflow-visible">
              <div className="flex items-start gap-2 mb-2 min-w-0 overflow-visible">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <CardTitle
                  className="text-base sm:text-lg md:text-xl font-bold text-yellow-900 dark:text-yellow-100 min-w-0 break-all overflow-visible"
                  title={olimpiada.title}
                  style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', display: 'block' } as React.CSSProperties}
                >
                  {olimpiada.title}
                </CardTitle>
              </div>
              {olimpiada.description && (
                <CardDescription className="text-xs sm:text-sm text-yellow-800/80 dark:text-yellow-200/80 line-clamp-2 break-words">
                  {olimpiada.description}
                </CardDescription>
              )}
            </div>
            <Badge
              className={cn(
                'flex items-center gap-1 flex-shrink-0',
                statusConfig.color,
                'text-white border-0 text-xs'
              )}
            >
              <StatusIcon className="h-3 w-3" />
              <span className="hidden xs:inline">{statusConfig.label}</span>
              <span className="xs:hidden">{statusConfig.label.split(' ')[0]}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4 flex-1">
        {/* Subjects */}
        {olimpiada.subjects && olimpiada.subjects.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {olimpiada.subjects.slice(0, 3).map((subject) => (
              <DisciplineTag key={subject.id} subjectId={subject.id} name={subject.name} />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
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
              {isLoadingParticipants && displayTotal === 0 ? (
                <span className="text-muted-foreground">Carregando...</span>
              ) : (
                `${displayParticipants}/${displayTotal} ${displayTotal === 1 ? 'aluno' : 'alunos'}`
              )}
            </span>
            {(olimpiada.status === 'active' || isLoadingParticipants) && (
              <div className="flex items-center gap-1 ml-1" title={`Atualizado em tempo real${lastUpdate ? ` - ${format(lastUpdate, "HH:mm:ss")}` : ''}`}>
                {isLoadingParticipants ? (
                  <RefreshCw className="h-3 w-3 text-yellow-600 dark:text-yellow-400 animate-spin" />
                ) : (
                  olimpiada.status === 'active' && (
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {displayTotal > 0 ? (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-yellow-800 dark:text-yellow-200">
              <span>Progresso</span>
              <span>
                {Math.round((displayParticipants / displayTotal) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-yellow-200 dark:bg-yellow-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all duration-300"
                style={{
                  width: `${Math.min((displayParticipants / displayTotal) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        ) : isLoadingParticipants ? (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-yellow-800 dark:text-yellow-200">
              <span>Progresso</span>
              <span className="text-muted-foreground">Carregando...</span>
            </div>
            <div className="h-2 bg-yellow-200 dark:bg-yellow-900 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-300 dark:bg-yellow-800 animate-pulse" style={{ width: '50%' }} />
            </div>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="relative flex flex-col gap-2 sm:gap-3 flex-shrink-0">
        {/* Botões principais (Ver e Resultados) */}
        <div className="grid grid-cols-2 gap-2 w-full">
          {onView && (
            <Button
              size="sm"
              onClick={() => onView(olimpiada.id)}
              className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold shadow-md border-0 text-xs sm:text-sm"
            >
              <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Ver</span>
              <span className="xs:hidden">Ver</span>
            </Button>
          )}
          {onViewResults && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewResults(olimpiada.id)}
              className="border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-xs sm:text-sm"
              disabled={displayTotal === 0}
              title={
                displayTotal === 0
                  ? 'Nenhum resultado disponível ainda'
                  : isIndividual
                    ? 'Ver resultado (mesma página do aluno)'
                    : 'Ver resultados'
              }
            >
              <Medal className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">{isIndividual ? 'Resultado' : 'Resultados'}</span>
              <span className="xs:hidden">{isIndividual ? 'Res.' : 'Res.'}</span>
            </Button>
          )}
        </div>
        
        {/* Botão Aplicar em linha separada e maior */}
        {onApply && olimpiada.status === 'scheduled' && (
          <Button
            size="default"
            onClick={() => onApply(olimpiada.id)}
            className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold shadow-md text-xs sm:text-sm"
          >
            <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="hidden sm:inline">Aplicar Olimpíada</span>
            <span className="sm:hidden">Aplicar</span>
          </Button>
        )}

        {/* Botão Deletar */}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(olimpiada.id)}
            className="w-full h-8 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300 text-xs"
            title="Excluir olimpíada"
          >
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            <span className="hidden xs:inline">Excluir</span>
            <span className="xs:hidden">Del</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
