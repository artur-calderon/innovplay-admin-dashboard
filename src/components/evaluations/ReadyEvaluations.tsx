import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Filter, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  model?: string;
  status?: string;
  grade?: { id: string; name: string };
  created_by?: string;
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
}

export function ReadyEvaluations({ onUseEvaluation }: ReadyEvaluationsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const itemsPerPage = 10;
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchEvaluations();
    fetchFiltersData();
  }, []);

  const fetchEvaluations = async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      
      if (filters.subject !== 'all') params.subject_id = filters.subject;
      if (filters.type !== 'all') params.type = filters.type;
      if (filters.model !== 'all') params.model = filters.model;
      if (filters.grade !== 'all') params.grade_id = filters.grade;
      
      const response = await api.get("/test", { params });
      
      if (response.data && Array.isArray(response.data)) {
        setEvaluations(response.data);
      } else if (response.data?.message === "Nenhuma avaliação encontrada para este usuário") {
        setEvaluations([]);
      } else {
        setEvaluations([]);
      }
    } catch (error: any) {
      console.error("Erro ao buscar avaliações:", error);
      if (error.response?.status === 404) {
        setEvaluations([]);
      } else if (error.response?.data?.error) {
        toast({
          title: "Erro",
          description: error.response.data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao carregar avaliações",
          description: "Não foi possível carregar as avaliações.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFiltersData = async () => {
    try {
      const [subjectsRes, gradesRes] = await Promise.all([
        api.get("/subjects"),
        api.get("/grades/")
      ]);
      
      setSubjects(subjectsRes.data || []);
      setGrades(gradesRes.data || []);
    } catch (error) {
      console.error("Erro ao buscar dados dos filtros:", error);
    }
  };

  // Refetch when filters change
  useEffect(() => {
    fetchEvaluations();
  }, [filters]);

  const filteredEvaluations = evaluations.filter(
    (evaluation) =>
      evaluation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.subject?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.id.includes(searchTerm)
  );

  // Calcular índices para paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEvaluations.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEvaluations.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Resetar para primeira página quando o termo de busca mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleView = (evaluationId: string) => {
    navigate(`/app/avaliacao/${evaluationId}`);
  };

  const handleEdit = (evaluationId: string) => {
    navigate(`/app/avaliacao/${evaluationId}/editar`);
  };

  const handleDelete = async () => {
    if (!evaluationToDelete) return;

    try {
      await api.delete(`/test/${evaluationToDelete}`);
      toast({
        title: "Sucesso",
        description: "Avaliação excluída com sucesso",
      });
      fetchEvaluations();
    } catch (error) {
      console.error("Erro ao excluir avaliação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a avaliação",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setEvaluationToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await api.delete("/test", { data: { ids: selectedIds } });
      toast({
        title: "Sucesso",
        description: `${selectedIds.length} avaliações foram excluídas.`,
      });
      fetchEvaluations();
      setSelectedIds([]);
    } catch (error) {
      console.error("Erro ao excluir avaliações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir as avaliações selecionadas.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(currentItems.map((item) => item.id));
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

  const clearFilters = () => {
    setFilters({
      subject: 'all',
      type: 'all',
      model: 'all',
      grade: 'all'
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== 'all');

  return (
    <div className="space-y-6">
      {/* Header com busca e filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar avaliações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={filters.subject} onValueChange={(value) => handleFilterChange('subject', value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Disciplina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="AVALIACAO">Avaliação</SelectItem>
              <SelectItem value="SIMULADO">Simulado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.model} onValueChange={(value) => handleFilterChange('model', value)}>
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

          <Select value={filters.grade} onValueChange={(value) => handleFilterChange('grade', value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Série" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {grades.map((grade) => (
                <SelectItem key={grade.id} value={grade.id}>
                  {grade.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchEvaluations}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
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
            onClick={() => {
              setEvaluationToDelete(null);
              setDeleteDialogOpen(true);
            }}
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
                      {filteredEvaluations.length} avaliação(ões) encontrada(s)
                    </span>
                  )}
                </div>
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        currentItems.length > 0 &&
                        selectedIds.length === currentItems.length
                      }
                      onCheckedChange={handleSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead className="min-w-[250px]">Título</TableHead>
                  <TableHead className="hidden sm:table-cell">Disciplina(s)</TableHead>
                  <TableHead className="hidden md:table-cell">Tipo/Modelo</TableHead>
                  <TableHead className="hidden md:table-cell">Questões</TableHead>
                  <TableHead className="hidden lg:table-cell">Série</TableHead>
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
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : currentItems.length > 0 ? (
                  currentItems.map((evaluation) => (
                    <TableRow key={evaluation.id} data-state={selectedIds.includes(evaluation.id) && "selected"}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(evaluation.id)}
                          onCheckedChange={(checked) => handleSelectOne(evaluation.id, !!checked)}
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
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(evaluation.subjects_info) && evaluation.subjects_info.length > 0
                            ? evaluation.subjects_info.slice(0, 2).map((subj: { id: string, name: string }) => (
                              <Badge key={subj.id} variant="secondary" className="text-xs">
                                {subj.name}
                              </Badge>
                            ))
                            : evaluation.subject?.name && (
                              <Badge variant="secondary" className="text-xs">
                                {evaluation.subject.name}
                              </Badge>
                            )}
                          {evaluation.subjects_info?.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{evaluation.subjects_info.length - 2}
                            </Badge>
                          )}
                        </div>
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
                          {evaluation.questions.length}
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
                          {formatDate(evaluation.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(evaluation.id)}
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(evaluation.id)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEvaluationToDelete(evaluation.id);
                              setDeleteDialogOpen(true);
                            }}
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
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-muted-foreground">
                          {searchTerm || hasActiveFilters 
                            ? "Nenhuma avaliação encontrada com os filtros aplicados" 
                            : "Nenhuma avaliação encontrada"}
                        </p>
                        {(searchTerm || hasActiveFilters) && (
                          <Button variant="outline" size="sm" onClick={() => {
                            setSearchTerm("");
                            clearFilters();
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
      {!isLoading && filteredEvaluations.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredEvaluations.length)} de {filteredEvaluations.length} avaliações
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
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
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
            <AlertDialogAction onClick={evaluationToDelete ? handleDelete : handleBulkDelete}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
