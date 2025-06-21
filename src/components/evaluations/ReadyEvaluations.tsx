import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
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
}

interface ReadyEvaluationsProps {
  onUseEvaluation?: (evaluation: Evaluation) => void;
}

export function ReadyEvaluations({ onUseEvaluation }: ReadyEvaluationsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [evaluationToDelete, setEvaluationToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/test/user/me");
      console.log(response.data);
      if (response.data.message === "Nenhuma avaliação encontrada para este usuário") {
        setEvaluations([]);
      } else {
        setEvaluations(response.data);
      }
    } catch (error: any) {
      console.error("Erro ao buscar avaliações:", error);
      if (error.response?.data?.error) {
        toast({
          title: "Erro",
          description: error.response.data.error,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvaluations = evaluations.filter(
    (evaluation) =>
      evaluation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.description.toLowerCase().includes(searchTerm.toLowerCase())
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
  }, [searchTerm]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleView = (evaluationId: string) => {
    navigate(`/app/avaliacao/${evaluationId}`);
  };

  const handleEdit = (evaluationId: string) => {
    navigate(`/app/avaliacao/editar/${evaluationId}`);
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar minhas avaliações prontas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {selectedIds.length > 0 && (
          <Button
            variant="destructive"
            onClick={() => {
              setEvaluationToDelete(null); // Clear single delete state
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir ({selectedIds.length})
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden overflow-x-auto">
        <div className="min-w-full">
          <Table>
            <TableCaption>Lista de avaliações prontas disponíveis</TableCaption>
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
                <TableHead className="w-[250px]">Título</TableHead>
                <TableHead className="hidden sm:table-cell">Disciplina</TableHead>
                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                <TableHead className="hidden md:table-cell">Nº Questões</TableHead>
                <TableHead className="hidden lg:table-cell">Data de criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando avaliações...
                  </TableCell>
                </TableRow>
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
                    <TableCell className="font-medium">{evaluation.title}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {evaluation.subject.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{evaluation.type}</TableCell>
                    <TableCell className="hidden md:table-cell">{evaluation.questions.length}</TableCell>
                    <TableCell className="hidden lg:table-cell">{formatDate(evaluation.createdAt)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(evaluation.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(evaluation.id)}
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
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Nenhuma avaliação encontrada para este usuário
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {!isLoading && filteredEvaluations.length > 0 && (
        <div className="flex items-center justify-between mt-4">
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
              >
                {page}
              </Button>
            ))}
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
            <AlertDialogAction onClick={evaluationToDelete ? handleDelete : handleBulkDelete}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
