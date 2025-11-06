import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Filter, RefreshCw, Play, MoreVertical, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { convertDateTimeLocalToISO } from "@/utils/date";
import StartEvaluationModal from "./StartEvaluationModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useEvaluations, useCache, useEvaluationsManager } from "@/hooks/use-cache";
import { useAuth } from "@/context/authContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ErrorBoundary from "./ErrorBoundary";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "./results/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Evaluation, Subject, Grade, getEvaluationSubjects, getEvaluationSubjectsCount } from "@/types/evaluation-types";

interface ReadyEvaluationsProps {
  onUseEvaluation?: (evaluation: Evaluation) => void;
  showMyEvaluations?: boolean; // true = mostrar apenas minhas avaliações, false = mostrar todas
}

interface PaginationData {
  total?: number;
  pages?: number;
  page?: number;
  per_page?: number;
  has_next?: boolean;
  has_prev?: boolean;
}

interface FiltersData {
  subject: string;
  type: string;
  model: string;
  grade: string;
}

// Componente separado para listar disciplinas
const SubjectsList = ({ evaluation }: { evaluation: Evaluation }) => {
  // Usar função helper padronizada
  const subjects = getEvaluationSubjects(evaluation);
  const subjectsCount = getEvaluationSubjectsCount(evaluation);

  // Se não há disciplinas
  if (subjects.length === 0) {
    return (
      <div className="flex flex-wrap gap-1">
        <Badge variant="secondary" className="text-xs text-muted-foreground">
          Sem disciplina
        </Badge>
      </div>
    );
  }

  // Se há apenas uma disciplina
  if (subjects.length === 1) {
    return (
      <div className="flex flex-wrap gap-1">
        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
          {subjects[0].name}
        </Badge>
      </div>
    );
  }

  // Se há múltiplas disciplinas
  return (
    <div className="flex flex-wrap gap-1 max-w-[150px] sm:max-w-[200px]">
      {/* Mostrar as duas primeiras disciplinas */}
      {subjects.slice(0, 2).map((subject, index) => (
        <Badge
          key={subject.id || index}
          variant="secondary"
          className="text-xs bg-blue-100 text-blue-800 font-medium"
        >
          {subject.name}
        </Badge>
      ))}

      {/* Mostrar +n se houver mais de 2 disciplinas */}
      {subjectsCount > 2 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-xs cursor-help hover:bg-blue-50 border-blue-300 text-blue-700 font-semibold"
            >
              +{subjectsCount - 2}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2">
              <p className="font-semibold text-sm text-foreground">Outras disciplinas:</p>
              <div className="space-y-1">
                {subjects.slice(2).map((subject, index) => (
                  <div key={subject.id || index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                    <span className="text-sm text-foreground">{subject.name}</span>
                  </div>
                ))}
                {subjectsCount > subjects.length && (
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full"></div>
                    <span className="text-sm text-muted-foreground">
                      +{subjectsCount - subjects.length} disciplinas adicionais
                    </span>
                  </div>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};

// Componente para renderizar a tabela de avaliações
const EvaluationsTable = ({
  evaluations,
  pagination,
  isLoading,
  searchTerm,
  filters,
  selectedIds,
  currentPage,
  itemsPerPage,
  subjects,
  grades,
  showMyEvaluations,
  onPageChange,
  onFilterChange,
  onSearchChange,
  onSelectAll,
  onSelectOne,
  onView,
  onEdit,
  onDelete,
  onStartEvaluation,
  onRefresh,
  onClearFilters,
  hasActiveFilters,
  onNavigateToPhysical
}: {
  evaluations: Evaluation[];
  pagination: PaginationData | null | undefined;
  isLoading: boolean;
  searchTerm: string;
  filters: FiltersData;
  selectedIds: string[];
  currentPage: number;
  itemsPerPage: number;
  subjects: Subject[];
  grades: Grade[];
  showMyEvaluations?: boolean;
  onPageChange: (page: number) => void;
  onFilterChange: (key: string, value: string) => void;
  onSearchChange: (value: string) => void;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onStartEvaluation: (evaluation: Evaluation) => void;
  onRefresh: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  onNavigateToPhysical: (evaluationId: string) => void;
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getTypeColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'AVALIACAO': return 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400';
      case 'SIMULADO': return 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400';
      default: return 'bg-muted text-foreground';
    }
  };

  const getModelColor = (model: string) => {
    switch (model?.toUpperCase()) {
      case 'SAEB': return 'bg-purple-100 dark:bg-purple-950/30 text-purple-800 dark:text-purple-400';
      case 'PROVA': return 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-400';
      case 'AVALIE': return 'bg-cyan-100 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-400';
      default: return 'bg-muted text-foreground';
    }
  };

  // Filtro de busca local (aplicado após dados já paginados)
  const filteredEvaluations = (evaluations || [])
    .filter(evaluation => evaluation && typeof evaluation === 'object' && evaluation.id)
    .filter(
      (evaluation) =>
        evaluation?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluation?.subject?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluation?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluation?.id?.includes(searchTerm)
    );

  // ✅ CORREÇÃO: Aplicar paginação local quando showMyEvaluations é true e há filtro no frontend
  // Isso garante que todas as avaliações filtradas sejam paginadas corretamente
  const needsLocalPagination = showMyEvaluations && !searchTerm;
  const currentItems = needsLocalPagination
    ? evaluations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : searchTerm
    ? filteredEvaluations
    : evaluations;
  
  const totalPages = pagination?.pages || 1;
  const hasNextPage = pagination?.has_next || false;
  const hasPrevPage = pagination?.has_prev || false;

  return (
    <div className="space-y-6">
      {/* Header com busca e filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar avaliações..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={filters.subject} onValueChange={(value) => onFilterChange('subject', value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Disciplina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {(subjects || []).map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.type} onValueChange={(value) => onFilterChange('type', value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="AVALIACAO">Avaliação</SelectItem>
              <SelectItem value="SIMULADO">Simulado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.model} onValueChange={(value) => onFilterChange('model', value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Modelo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="SAEB">SAEB</SelectItem>
              <SelectItem value="PROVA">Prova</SelectItem>
              <SelectItem value="AVALIE">Avalie</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.grade} onValueChange={(value) => onFilterChange('grade', value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Série" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {(grades || []).map((grade) => (
                <SelectItem key={grade.id} value={grade.id}>
                  {grade.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
            >
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* Ações em lote */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
          <span className="text-sm text-blue-800 dark:text-blue-400">
            {selectedIds.length} avaliação(ões) selecionada(s)
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete('bulk')}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir ({selectedIds.length})
          </Button>
        </div>
      )}

      {/* Tabela de avaliações */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableCaption className="caption-top text-left p-6 pb-0">
                <div className="flex items-center justify-between">
                  <span>Lista de avaliações disponíveis</span>
                  {!isLoading && (
                    <span className="text-sm text-muted-foreground">
                      {searchTerm 
                        ? filteredEvaluations.length 
                        : showMyEvaluations 
                          ? evaluations.length 
                          : pagination?.total || 0
                      } avaliação(ões) encontrada(s)
                    </span>
                  )}
                </div>
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        (currentItems || []).length > 0 &&
                        selectedIds.length === (currentItems || []).length
                      }
                      onCheckedChange={onSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead className="min-w-[200px]">Título</TableHead>
                  <TableHead className="table-cell min-w-[120px]">Disciplina(s)</TableHead>
                  <TableHead className="hidden md:table-cell">Tipo/Modelo</TableHead>
                  <TableHead className="hidden md:table-cell">Questões</TableHead>
                  <TableHead className="hidden lg:table-cell">Série</TableHead>
                  <TableHead className="hidden lg:table-cell">Criador</TableHead>
                  <TableHead className="hidden lg:table-cell">Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell className="table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (currentItems || []).length > 0 ? (
                  (currentItems || [])
                    .filter(evaluation => evaluation && evaluation.id)
                    .map((evaluation) => (
                      <TableRow key={evaluation.id} data-state={selectedIds.includes(evaluation.id) && "selected"}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(evaluation.id)}
                            onCheckedChange={(checked) => onSelectOne(evaluation.id, !!checked)}
                            aria-label={`Selecionar ${evaluation.title}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <div className="line-clamp-1">{evaluation.title}</div>
                            {evaluation.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                {evaluation.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="table-cell">
                          <SubjectsList evaluation={evaluation} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-col gap-1">
                            {evaluation.type && (
                              <Badge className={`text-xs ${getTypeColor(evaluation.type)} w-fit`}>
                                {evaluation.type}
                              </Badge>
                            )}
                            {evaluation.model && (
                              <Badge className={`text-xs ${getModelColor(evaluation.model)} w-fit`}>
                                {evaluation.model}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {(evaluation?.questions || []).length}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {evaluation.grade && (
                            <Badge variant="outline" className="text-xs">
                              {evaluation.grade.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {evaluation.createdBy?.name || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(evaluation.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => onStartEvaluation(evaluation)}
                                  className="text-green-600 focus:text-green-700 cursor-pointer"
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Aplicar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onView(evaluation.id)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onEdit(evaluation.id)}
                                  className="cursor-pointer"
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onDelete(evaluation.id)}
                                  className="text-red-600 focus:text-red-700 cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onNavigateToPhysical(evaluation.id)}
                                  className="text-blue-600 focus:text-blue-700 cursor-pointer"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Transformar em Física
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-muted-foreground">
                          {searchTerm || hasActiveFilters
                            ? "Nenhuma avaliação encontrada com os filtros aplicados"
                            : "Nenhuma avaliação encontrada"}
                        </p>
                        {(searchTerm || hasActiveFilters) && (
                          <Button variant="outline" size="sm" onClick={() => {
                            onSearchChange("");
                            onClearFilters();
                          }}>
                            Limpar filtros
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Paginação */}
      {!isLoading && !searchTerm && pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, pagination.total)} de {pagination.total} avaliações
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!hasPrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasNextPage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export function ReadyEvaluations({ onUseEvaluation, showMyEvaluations = false }: ReadyEvaluationsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [evaluationToDelete, setEvaluationToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    subject: 'all',
    type: 'all',
    model: 'all',
    grade: 'all'
  });
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [selectedEvaluationToStart, setSelectedEvaluationToStart] = useState<Evaluation | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0); // Forçar re-render após exclusão
  const itemsPerPage = 10;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // ✅ NOVO: Hook para gerenciar atualizações de avaliações
  const { updateAfterCRUD, isUpdating } = useEvaluationsManager();

  // ✅ Hook para todas as avaliações (mesma rota para todos)
  // ✅ CORREÇÃO: Quando showMyEvaluations é true, buscar todas as avaliações sem paginação
  // para aplicar paginação local no frontend após filtrar
  const {
    data: evaluationsData,
    isLoading,
    error: evaluationsError,
    refetch,
    invalidateCache,
    invalidateEvaluationsCache,
    forceRefresh,
    invalidateAfterCRUD
  } = useEvaluations({
    // Quando showMyEvaluations é true, buscar todas as avaliações (sem paginação no backend)
    // para aplicar paginação local após filtrar
    ...(showMyEvaluations && user?.id 
      ? { 
          page: 1, 
          per_page: 1000, // Buscar muitas avaliações para filtrar no frontend
          created_by: user.id 
        }
      : { 
          page: currentPage, 
          per_page: itemsPerPage 
        }
    ),
    ...(filters.subject !== 'all' && { subject_id: filters.subject }),
    ...(filters.type !== 'all' && { type: filters.type }),
    ...(filters.model !== 'all' && { model: filters.model }),
    ...(filters.grade !== 'all' && { grade_id: filters.grade })
  });

  // ✅ Preparar dados das avaliações com verificações de segurança
  const rawEvaluations = Array.isArray(evaluationsData?.data) ? evaluationsData.data : [];
  
  // ✅ Filtrar avaliações ativas (não deletadas/arquivadas)
  const allEvaluations = rawEvaluations.filter((evaluation: Evaluation & { deleted_at?: string | null; archived?: boolean; is_active?: boolean }) => 
    !evaluation.deleted_at && 
    !evaluation.archived && 
    evaluation.is_active !== false
  ) as Evaluation[];
  
  // ✅ CORREÇÃO: Aplicar filtro no frontend sempre que showMyEvaluations é true
  // como fallback caso o backend não aplique corretamente
  const filteredEvaluations = showMyEvaluations && user?.id
    ? allEvaluations.filter(evaluation => {
        // Verificar tanto createdBy quanto created_by para compatibilidade
        const createdById = evaluation.createdBy?.id || 
                           (evaluation as { created_by?: { id?: string } | string }).created_by?.id || 
                           ((evaluation as { created_by?: string }).created_by);
        return createdById === user.id;
      })
    : allEvaluations;
  
  // ✅ CORREÇÃO: Ajustar paginação sempre que showMyEvaluations é true e há filtro aplicado no frontend
  const backendPagination = evaluationsData?.pagination;
  const adjustedPagination = showMyEvaluations && user?.id && backendPagination
    ? {
        ...backendPagination,
        total: filteredEvaluations.length,
        pages: Math.ceil(filteredEvaluations.length / itemsPerPage),
        has_next: currentPage < Math.ceil(filteredEvaluations.length / itemsPerPage),
        has_prev: currentPage > 1
      }
    : backendPagination;
  
  const pagination = adjustedPagination;

  // ✅ CORREÇÃO: Usar avaliações filtradas
  const evaluations = filteredEvaluations;

  // ✅ NOVO: Hooks para dados de filtros (cache longo)
  const {
    data: subjects = [],
    isLoading: isLoadingSubjects
  } = useCache<Subject[]>('/subjects', {
    staleTime: 30 * 60 * 1000 // 30 minutos
  });

  const {
    data: grades = [],
    isLoading: isLoadingGrades
  } = useCache<Grade[]>('/grades/', {
    staleTime: 30 * 60 * 1000 // 30 minutos
  });

  // ✅ MELHORADO: Função robusta para atualizar dados
  const refreshData = useCallback(async () => {
    console.log("🔄 Iniciando atualização de dados...");
    
    try {
      // Usar a nova função forceRefresh que é mais robusta
      await forceRefresh();
      
      // Atualizar timestamp de última atualização
      setForceUpdate(prev => prev + 1);
      
      console.log("✅ Dados atualizados com sucesso");
    } catch (error) {
      console.error("❌ Erro ao atualizar dados:", error);
    }
  }, [forceRefresh]);

  // ✅ MELHORADO: Função específica para atualizar após operações CRUD
  const refreshAfterCRUD = useCallback(async () => {
    console.log("🔄 Atualizando dados após operação CRUD...");
    
    try {
      // Usar o hook de gerenciamento para uma atualização mais robusta
      await updateAfterCRUD();
      
      // Fazer refetch dos dados atuais
      await refetch();
      
      // Atualizar estado local
      setForceUpdate(prev => prev + 1);
      
      console.log("✅ Dados atualizados após CRUD com sucesso");
    } catch (error) {
      console.error("❌ Erro ao atualizar dados após CRUD:", error);
    }
  }, [updateAfterCRUD, refetch]);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // ✅ NOVO: Resetar para primeira página quando filtros ou showMyEvaluations mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, showMyEvaluations]);

  // ✅ NOVO: Forçar atualização quando forceUpdate mudar
  useEffect(() => {
    // Este useEffect força a re-renderização da interface
    // quando uma avaliação é excluída ou aplicada
  }, [forceUpdate]);

  // ✅ NOVO: Listener para mudanças de avaliações (se implementado no futuro)
  useEffect(() => {
    // Aqui poderíamos implementar um listener para mudanças em tempo real
    // Por exemplo, usando WebSocket ou polling
  }, []);

  const handleView = (evaluationId: string) => {
    navigate(`/app/avaliacao/${evaluationId}`);
  };

  const handleEdit = (evaluationId: string) => {
    navigate(`/app/avaliacao/${evaluationId}/editar`);
  };

  const handleDelete = async (evaluationId: string) => {
    if (evaluationId === 'bulk') {
      // Exclusão em massa
      await handleBulkDelete();
      return;
    }

    setEvaluationToDelete(evaluationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!evaluationToDelete) {
      console.error("Nenhuma avaliação selecionada para exclusão");
      return;
    }

    console.log("🗑️ Iniciando exclusão da avaliação:", evaluationToDelete);

    try {
      console.log("📡 Fazendo chamada DELETE para:", `/test/${evaluationToDelete}`);
      const response = await api.delete(`/test/${evaluationToDelete}`);
      console.log("✅ Resposta da API:", response);

      toast({
        title: "Sucesso",
        description: SUCCESS_MESSAGES.DATA_DELETED,
      });

      // ✅ MELHORADO: Usar função específica para operações CRUD
      await refreshAfterCRUD();
      
    } catch (error: unknown) {
      const apiError = error as { message?: string; response?: { status?: number; data?: { error?: string } } };
      
      console.error("❌ Erro detalhado ao excluir avaliação:", {
        error,
        message: apiError.message,
        response: apiError.response,
        status: apiError.response?.status,
        data: apiError.response?.data
      });

      let errorMessage: string = ERROR_MESSAGES.SERVER_ERROR;

      if (apiError.response?.status === 404) {
        errorMessage = ERROR_MESSAGES.DATA_NOT_FOUND;
      } else if (apiError.response?.status === 403) {
        errorMessage = ERROR_MESSAGES.FORBIDDEN;
      } else if (apiError.response?.status === 401) {
        errorMessage = ERROR_MESSAGES.UNAUTHORIZED;
      } else if (apiError.response?.data?.error) {
        errorMessage = apiError.response.data.error;
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setEvaluationToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    console.log("🗑️ Iniciando exclusão em massa de avaliações:", selectedIds);

    try {
      console.log("📡 Fazendo chamada DELETE em massa para /test com IDs:", selectedIds);
      const response = await api.delete("/test", { data: { ids: selectedIds } });
      console.log("✅ Resposta da API:", response);

      toast({
        title: "Sucesso",
        description: SUCCESS_MESSAGES.DATA_DELETED,
      });

      // ✅ MELHORADO: Usar função específica para operações CRUD
      await refreshAfterCRUD();
      setSelectedIds([]);
      
    } catch (error: unknown) {
      const apiError = error as { message?: string; response?: { status?: number; data?: { error?: string } } };
      
      console.error("❌ Erro detalhado ao excluir avaliações em massa:", {
        error,
        message: apiError.message,
        response: apiError.response,
        status: apiError.response?.status,
        data: apiError.response?.data,
        selectedIds
      });

      let errorMessage = "Não foi possível excluir as avaliações selecionadas";

      if (apiError.response?.status === 404) {
        errorMessage = "Uma ou mais avaliações não foram encontradas";
      } else if (apiError.response?.status === 403) {
        errorMessage = "Sem permissão para excluir estas avaliações";
      } else if (apiError.response?.status === 401) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (apiError.response?.data?.error) {
        errorMessage = apiError.response.data.error;
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds((evaluations || []).map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      subject: 'all',
      type: 'all',
      model: 'all',
      grade: 'all'
    });
  };

  const handleStartEvaluation = (evaluation: Evaluation) => {
    setSelectedEvaluationToStart(evaluation);
    setStartModalOpen(true);
  };

  const handleNavigateToPhysical = (evaluationId: string) => {
    navigate(`/app/avaliacao/${evaluationId}/fisica`);
  };

  const handleConfirmStartEvaluation = async (startDateTime: string, endDateTime: string, classIds: string[]) => {
    if (!selectedEvaluationToStart) return;

    // Capturar timezone do usuário automaticamente
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // ✅ CORREÇÃO: Converter para ISO com timezone se ainda não estiver convertido
    // Verificar se já está em formato ISO com timezone (contém timezone offset no formato +/-HH:MM)
    // Um datetime-local tem formato "YYYY-MM-DDTHH:mm" (sem timezone)
    // Um ISO com timezone tem formato "YYYY-MM-DDTHH:mm:ss+HH:MM" ou "YYYY-MM-DDTHH:mm:ss-HH:MM"
    const isISOFormat = (dateStr: string) => {
      // Verifica se tem timezone offset (formato +/-HH:MM no final)
      const timezonePattern = /[+-]\d{2}:\d{2}$/;
      return timezonePattern.test(dateStr);
    };
    
    const startDateTimeISO = isISOFormat(startDateTime)
      ? startDateTime
      : convertDateTimeLocalToISO(startDateTime);
    const endDateTimeISO = isISOFormat(endDateTime)
      ? endDateTime
      : convertDateTimeLocalToISO(endDateTime);

    console.log("🚀 Aplicando avaliação:", {
      evaluationId: selectedEvaluationToStart.id,
      classIds,
      original: { startDateTime, endDateTime },
      converted: { startDateTimeISO, endDateTimeISO },
      timezone: userTimezone
    });

    try {
      // ✅ FORMATO CORRETO - Enviar como um único request com array de classes
      const classesData = classIds.map(classId => ({
        class_id: classId,
        application: startDateTimeISO,
        expiration: endDateTimeISO
      }));

      console.log("📡 Enviando dados para API:", {
        url: `/test/${selectedEvaluationToStart.id}/apply`,
        data: { classes: classesData, timezone: userTimezone }
      });

      const response = await api.post(`/test/${selectedEvaluationToStart.id}/apply`, {
        classes: classesData,
        timezone: userTimezone
      });

      console.log("✅ Resposta da API:", response.data);

      // ✅ MELHORADO: Usar função específica para operações CRUD
      await refreshAfterCRUD();

      toast({
        title: "🎉 Avaliação aplicada com sucesso!",
        description: `A avaliação "${selectedEvaluationToStart.title}" foi aplicada para ${classIds.length} turma(s) e ficará disponível no horário configurado.`,
      });

    } catch (error: unknown) {
      const apiError = error as { response?: { status?: number; data?: { error?: string } } };
      
      console.error("❌ Erro ao aplicar avaliação:", error);

      let errorMessage = "Erro ao aplicar avaliação. Tente novamente.";

      if (apiError.response?.status === 404) {
        errorMessage = "Avaliação não encontrada";
      } else if (apiError.response?.status === 403) {
        errorMessage = "Sem permissão para aplicar esta avaliação";
      } else if (apiError.response?.status === 400) {
        errorMessage = apiError.response.data?.error || "Dados inválidos para aplicação";
      } else if (apiError.response?.data?.error) {
        errorMessage = apiError.response.data.error;
      }

      toast({
        title: "Erro ao aplicar avaliação",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setStartModalOpen(false);
      setSelectedEvaluationToStart(null);
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== 'all');

  // ✅ NOVO: Proteção adicional - se há erro de carregamento, mostrar componente simplificado
  if (evaluationsError && !evaluationsData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Erro ao carregar avaliações. Tente novamente.
          </p>
          <Button onClick={() => refreshData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  // ✅ NOVO: Indicador de atualização em andamento
  const isAnyLoading = isLoading || isUpdating;

  // Renderizar a tabela de avaliações
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <div className="space-y-6">
          {/* ✅ NOVO: Indicador de atualização */}
          {isUpdating && (
            <div className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <RefreshCw className="h-4 w-4 mr-2 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-700 dark:text-blue-400">
                Atualizando lista de avaliações...
              </span>
            </div>
          )}

          <EvaluationsTable
            evaluations={evaluations}
            pagination={pagination}
            isLoading={isAnyLoading}
            searchTerm={searchTerm}
            filters={filters}
            selectedIds={selectedIds}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            subjects={subjects}
            grades={grades}
            showMyEvaluations={showMyEvaluations}
            onPageChange={handlePageChange}
            onFilterChange={handleFilterChange}
            onSearchChange={setSearchTerm}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStartEvaluation={handleStartEvaluation}
            onRefresh={refreshData}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
            onNavigateToPhysical={handleNavigateToPhysical}
          />

          {/* Dialog de confirmação de exclusão */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  {evaluationToDelete
                    ? "Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita."
                    : `Tem certeza que deseja excluir ${selectedIds.length} avaliações? Esta ação não pode ser desfeita.`
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete}>
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Modal de Iniciar Avaliação */}
          <StartEvaluationModal
            isOpen={startModalOpen}
            onClose={() => {
              setStartModalOpen(false);
              setSelectedEvaluationToStart(null);
            }}
            onConfirm={handleConfirmStartEvaluation}
            evaluation={selectedEvaluationToStart}
          />
        </div>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
