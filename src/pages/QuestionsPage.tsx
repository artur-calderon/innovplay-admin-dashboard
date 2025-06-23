import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { Question } from "@/components/evaluations/types";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import QuestionPreview from "@/components/evaluations/questions/QuestionPreview";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface Subject {
  id: string;
  name: string;
}

const QuestionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filterType, setFilterType] = useState<'my' | 'all'>('my');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [viewQuestion, setViewQuestion] = useState<Question | null>(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchQuestions = React.useCallback(async () => {
    setLoading(true);
    try {
      const params: { created_by?: string; subject_id?: string } = {};

      if (filterType === 'my' && user.id) {
        params.created_by = user.id;
      }

      if (selectedSubject && selectedSubject !== 'all') {
        params.subject_id = selectedSubject;
      }

      const response = await api.get("/questions", { params });
      const normalizedQuestions = response.data.map((q: any) => ({
        ...q,
        skills: Array.isArray(q.skills) ? q.skills : (q.skills && typeof q.skills === 'string' ? q.skills.split(',').map(s => s.trim()) : []),
        topics: Array.isArray(q.topics) ? q.topics : (q.topics && typeof q.topics === 'string' ? q.topics.split(',').map(t => t.trim()) : [])
      }));
      setQuestions(normalizedQuestions);
    } catch (error) {
      console.error("Failed to fetch questions", error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [user.id, filterType, selectedSubject]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await api.get("/subjects");
        setSubjects(response.data);
      } catch (error) {
        console.error("Failed to fetch subjects", error);
      }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (user.id || filterType === 'all') {
      fetchQuestions();
    }
  }, [user.id, filterType, selectedSubject, fetchQuestions]);

  const handleDelete = async () => {
    if (!deleteQuestionId) return;

    try {
      await api.delete(`/questions/${deleteQuestionId}`);
      toast({
        title: "Sucesso!",
        description: "A questão foi excluída.",
      });
      setDeleteQuestionId(null);
      fetchQuestions(); // Refresh the list
    } catch (error) {
      console.error("Failed to delete question", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a questão.",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await api.delete("/questions", { data: { ids: selectedIds } });
      toast({
        title: "Sucesso!",
        description: `${selectedIds.length} questões foram excluídas.`,
      });
      setSelectedIds([]);
      fetchQuestions(); // Refresh the list
    } catch (error) {
      console.error("Failed to delete questions", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir as questões selecionadas.",
        variant: "destructive",
      });
    } finally {
      setDeleteQuestionId(null); // Also clear single delete id
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(questions.map((q) => q.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Questões</h1>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setDeleteQuestionId("bulk")} // Use a special ID for bulk
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir ({selectedIds.length})
            </Button>
          )}
          <Button
            onClick={() => navigate("/app/cadastros/questao/criar")}
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova Questão
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <Tabs value={filterType} onValueChange={(value) => setFilterType(value as 'my' | 'all')}>
          <TabsList>
            <TabsTrigger value="my">Minhas Questões</TabsTrigger>
            {user.role === 'admin' && <TabsTrigger value="all">Todas as Questões</TabsTrigger>}
          </TabsList>
        </Tabs>

        <div className="w-1/4">
          <Select onValueChange={setSelectedSubject} value={selectedSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por disciplina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Disciplinas</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table of questions */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-2 w-12">
                <Checkbox
                  checked={questions.length > 0 && selectedIds.length === questions.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Selecionar todas"
                />
              </th>
              <th className="px-4 py-3 text-left">Número</th>
              <th className="px-4 py-3 text-left">Título</th>
              <th className="px-4 py-3 text-left">Disciplina</th>
              <th className="px-4 py-3 text-left">Série</th>
              <th className="px-4 py-3 text-left">Dificuldade</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Valor</th>
              <th className="px-4 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-gray-500">
                  Carregando questões...
                </td>
              </tr>
            ) : questions.length > 0 ? (
              questions.map((question, index) => (
                <tr key={question.id} className="border-b hover:bg-gray-50" data-state={selectedIds.includes(question.id) && "selected"}>
                  <td className="p-2">
                    <Checkbox
                      checked={selectedIds.includes(question.id)}
                      onCheckedChange={(checked) => handleSelectOne(question.id, !!checked)}
                      aria-label={`Selecionar ${question.title}`}
                    />
                  </td>
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3">{question.title}</td>
                  <td className="px-4 py-3">{question.subject?.name}</td>
                  <td className="px-4 py-3">{question.grade?.name}</td>
                  <td className="px-4 py-3">{question.difficulty}</td>
                  <td className="px-4 py-3">
                    {question.type === "multipleChoice" ? "Múltipla Escolha" : "Dissertativa"}
                  </td>
                  <td className="px-4 py-3">{question.value}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setViewQuestion(question)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/app/cadastros/questao/editar/${question.id}`)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteQuestionId(question.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-gray-500">
                  Nenhuma questão encontrada com os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!viewQuestion} onOpenChange={(isOpen) => !isOpen && setViewQuestion(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar Questão</DialogTitle>
          </DialogHeader>
          {viewQuestion && <QuestionPreview question={viewQuestion} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteQuestionId} onOpenChange={(isOpen) => !isOpen && setDeleteQuestionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteQuestionId === 'bulk'
                ? `Tem certeza que deseja excluir as ${selectedIds.length} questões selecionadas?`
                : "Tem certeza que deseja excluir esta questão?"
              }
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteQuestionId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteQuestionId === 'bulk' ? handleBulkDelete : handleDelete}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default QuestionsPage; 