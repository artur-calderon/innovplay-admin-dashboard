import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Filter, RefreshCw, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
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
import { useEvaluations, useCache } from "@/hooks/use-cache";
import { useAuth } from "@/context/authContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ErrorBoundary from "./ErrorBoundary";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "./results/constants";

interface Evaluation {
  id: string;
  title: string;
  subject: { id: string; name: string };
  description: string;
  createdAt: string;
  type: string;
  questions: Array<{
    id: string;
    title: string;
    question_type: string;
    command: string;
  }>;
  subjects_info: Array<{ id: string; name: string }>;
  subjects?: Array<{ id: string; name: string }>; // Campo oficial do backend
  subjects_count?: number; // Quantidade de disciplinas
  model?: string;
  status?: string;
  grade?: { id: string; name: string };
  created_by?: string;
  createdBy?: { id: string; name: string }; // Campo do backend para informações do criador
  duration?: number; // Duração em minutos
  startDateTime?: string; // Data de início quando ativada
  endDateTime?: string; // Data de fim quando ativada
}

interface Subject {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  name: string;
}

interface ReadyEvaluationsProps {
  onUseEvaluation?: (evaluation: Evaluation) => void;
  showMyEvaluations?: boolean; // true = mostrar apenas minhas avaliações, false = mostrar todas
}

// Componente separado para listar disciplinas
const SubjectsList = ({ evaluation }: { evaluation: Evaluation }) => {
  // Função para extrair disciplinas
  const getSubjects = () => {
    // Prioridade 1: subjects (campo oficial do backend)
    if (evaluation.subjects && Array.isArray(evaluation.subjects) && evaluation.subjects.length > 0) {
      return evaluation.subjects;
    }

    // Prioridade 2: subjects_info (fallback)
    if (evaluation.subjects_info && Array.isArray(evaluation.subjects_info) && evaluation.subjects_info.length > 0) {
      return evaluation.subjects_info;
    }

    // Prioridade 3: subject único (fallback)
    if (evaluation.subject && evaluation.subject.name) {
      return [evaluation.subject];
    }

    return [];
  };

  const subjects = getSubjects();
  const subjectsCount = evaluation.subjects_count || subjects.length;

  // Se não há disciplinas
  if (subjects.length === 0) {
    return (
      <div className="flex flex-wrap gap-1">
        <Badge variant="secondary" className="text-xs text-gray-500">
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
              <p className="font-semibold text-sm text-gray-900">Outras disciplinas:</p>
              <div className="space-y-1">
                {subjects.slice(2).map((subject, index) => (
                  <div key={subject.id || index} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">{subject.name}</span>
                  </div>
                ))}
                {subjectsCount > subjects.length && (
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    <span className="text-sm text-gray-500">
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
  hasActiveFilters
}: {
  evaluations: Evaluation[];
  pagination: any;
  isLoading: boolean;
  searchTerm: string;
  filters: any;
  selectedIds: string[];
  currentPage: number;
  itemsPerPage: number;
  subjects: Subject[];
  grades: Grade[];
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
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getTypeColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'AVALIACAO': return 'bg-blue-100 text-blue-800';
      case 'SIMULADO': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getModelColor = (model: string) => {
    switch (model?.toUpperCase()) {
      case 'SAEB': return 'bg-purple-100 text-purple-800';
      case 'PROVA': return 'bg-orange-100 text-orange-800';
      case 'AVALIE': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
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

  // Usar paginação do backend
  const currentItems = Array.isArray(searchTerm ? filteredEvaluations : evaluations)
    ? (searchTerm ? filteredEvaluations : evaluations)
    : [];
  const totalPages = pagination?.pages || 1;
  const hasNextPage = pagination?.has_next || false;
  const hasPrevPage = pagination?.has_prev || false;

  return (
    <div className="space-y-6">
      {/* Header com busca e filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
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
        <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
          <span className="text-sm text-blue-800">
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
                      {searchTerm ? filteredEvaluations.length : pagination?.total || 0} avaliação(ões) encontrada(s)
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
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onStartEvaluation(evaluation)}
                              title="Aplicar Avaliação"
                              className="text-green-600 hover:text-green-700"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onView(evaluation.id)}
                              title="Visualizar"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(evaluation.id)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(evaluation.id)}
                              title="Excluir"
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
          <div className="text-sm text-gray-500">
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

  // ✅ Verificação inicial de segurança
  if (!navigate || !toast) {
    return <div>Carregando...</div>;
  }

  // ✅ Hook para todas as avaliações (mesma rota para todos)
  const {
    data: evaluationsData,
    isLoading,
    error: evaluationsError,
    refetch,
    invalidateCache,
    invalidateEvaluationsCache
  } = useEvaluations({
    page: currentPage,
    per_page: itemsPerPage,
    ...(filters.subject !== 'all' && { subject_id: filters.subject }),
    ...(filters.type !== 'all' && { type: filters.type }),
    ...(filters.model !== 'all' && { model: filters.model }),
    ...(filters.grade !== 'all' && { grade_id: filters.grade })
  });

  // ✅ Preparar dados das avaliações com verificações de segurança
  const allEvaluations = Array.isArray(evaluationsData?.data) ? evaluationsData.data : [];
  const pagination = evaluationsData?.pagination;

  // ✅ Filtrar avaliações baseado na prop showMyEvaluations
  const evaluations = showMyEvaluations
    ? allEvaluations.filter(evaluation => evaluation.createdBy?.id === user.id)
    : allEvaluations;

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

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // ✅ NOVO: Resetar para primeira página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // ✅ NOVO: Forçar atualização quando forceUpdate mudar
  useEffect(() => {
    // Este useEffect força a re-renderização da interface
    // quando uma avaliação é excluída ou aplicada
  }, [forceUpdate]);

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

      // ✅ NOVO: Invalidar cache e recarregar dados
      console.log("🔄 Invalidando cache e recarregando dados...");
      invalidateEvaluationsCache();
      
      // Forçar atualização imediata do estado local
      if (showMyEvaluations) {
        // Se estamos mostrando apenas minhas avaliações, remover a avaliação excluída do estado local
        const updatedEvaluations = allEvaluations.filter(evaluation => evaluation.id !== evaluationToDelete);
        // Atualizar o estado local imediatamente
        // Note: isso é uma solução temporária, o refetch deve resolver o problema
      }
      
      // Aguardar um pouco antes de fazer refetch para garantir que o cache foi limpo
      setTimeout(() => {
        refetch();
        setForceUpdate(prev => prev + 1); // Forçar re-render
      }, 100);
    } catch (error: any) {
      console.error("❌ Erro detalhado ao excluir avaliação:", {
        error,
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });

      let errorMessage: string = ERROR_MESSAGES.SERVER_ERROR;

      if (error.response?.status === 404) {
        errorMessage = ERROR_MESSAGES.DATA_NOT_FOUND;
      } else if (error.response?.status === 403) {
        errorMessage = ERROR_MESSAGES.FORBIDDEN;
      } else if (error.response?.status === 401) {
        errorMessage = ERROR_MESSAGES.UNAUTHORIZED;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
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

      // ✅ NOVO: Invalidar cache e recarregar dados
      console.log("🔄 Invalidando cache e recarregando dados...");
      invalidateEvaluationsCache();
      
      // Forçar atualização imediata do estado local
      if (showMyEvaluations) {
        // Se estamos mostrando apenas minhas avaliações, remover as avaliações excluídas do estado local
        const updatedEvaluations = allEvaluations.filter(evaluation => !selectedIds.includes(evaluation.id));
        // Atualizar o estado local imediatamente
        // Note: isso é uma solução temporária, o refetch deve resolver o problema
      }
      
      // Aguardar um pouco antes de fazer refetch para garantir que o cache foi limpo
      setTimeout(() => {
        refetch();
        setSelectedIds([]);
        setForceUpdate(prev => prev + 1); // Forçar re-render
      }, 100);
    } catch (error: any) {
      console.error("❌ Erro detalhado ao excluir avaliações em massa:", {
        error,
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data,
        selectedIds
      });

      let errorMessage = "Não foi possível excluir as avaliações selecionadas";

      if (error.response?.status === 404) {
        errorMessage = "Uma ou mais avaliações não foram encontradas";
      } else if (error.response?.status === 403) {
        errorMessage = "Sem permissão para excluir estas avaliações";
      } else if (error.response?.status === 401) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
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

  const handleConfirmStartEvaluation = async (startDateTime: string, endDateTime: string, classIds: string[]) => {
    if (!selectedEvaluationToStart) return;

    console.log("🚀 Aplicando avaliação:", {
      evaluationId: selectedEvaluationToStart.id,
      classIds,
      startDateTime,
      endDateTime
    });

    try {
      // ✅ FORMATO CORRETO - Enviar como um único request com array de classes
      const classesData = classIds.map(classId => ({
        class_id: classId,
        application: startDateTime,
        expiration: endDateTime
      }));

      console.log("📡 Enviando dados para API:", {
        url: `/test/${selectedEvaluationToStart.id}/apply`,
        data: { classes: classesData }
      });

      const response = await api.post(`/test/${selectedEvaluationToStart.id}/apply`, {
        classes: classesData
      });

      console.log("✅ Resposta da API:", response.data);

      // ✅ NOVO: Invalidar cache e recarregar dados
      invalidateEvaluationsCache();
      
      // Aguardar um pouco antes de fazer refetch para garantir que o cache foi limpo
      setTimeout(() => {
        refetch();
        setForceUpdate(prev => prev + 1); // Forçar re-render
      }, 100);

      toast({
        title: "🎉 Avaliação aplicada com sucesso!",
        description: `A avaliação "${selectedEvaluationToStart.title}" foi aplicada para ${classIds.length} turma(s) e ficará disponível no horário configurado.`,
      });
    } catch (error: any) {
      console.error("❌ Erro ao aplicar avaliação:", error);

      let errorMessage = "Erro ao aplicar avaliação. Tente novamente.";

      if (error.response?.status === 404) {
        errorMessage = "Avaliação não encontrada";
      } else if (error.response?.status === 403) {
        errorMessage = "Sem permissão para aplicar esta avaliação";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || "Dados inválidos para aplicação";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
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
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  // Renderizar a tabela de avaliações
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <div className="space-y-6">
          <EvaluationsTable
            evaluations={evaluations}
            pagination={pagination}
            isLoading={isLoading}
            searchTerm={searchTerm}
            filters={filters}
            selectedIds={selectedIds}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            subjects={subjects}
            grades={grades}
            onPageChange={handlePageChange}
            onFilterChange={handleFilterChange}
            onSearchChange={setSearchTerm}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStartEvaluation={handleStartEvaluation}
            onRefresh={refetch}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
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
