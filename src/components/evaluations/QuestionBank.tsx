import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Check, Plus, Loader2, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Question } from "./types"; // Import Question type only
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import React from "react";

interface ApiQuestionOption {
  id?: string;
  text: string;
  isCorrect?: boolean;
}

interface ApiQuestion {
  id: string;
  title?: string;
  text: string;
  formatted_text?: string;
  subject_id: string;
  subject?: { id: string; name: string };
  grade?: { id: string; name: string };
  grade_id?: string;
  difficulty_level?: string;
  question_type?: string;
  value?: number;
  correct_answer?: string;
  formatted_solution?: string;
  alternatives?: ApiQuestionOption[];
  skill?: string | string[];
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

interface EvaluationFromBank {
  title: string;
  subject: string; // Or subjectId if preferred
  grade: string; // Or gradeId if preferred
  questions: Question[]; // Use the full Question type now
}

interface QuestionBankProps {
  open: boolean;
  onClose: () => void;
  subjectId: string | null; // Can be used to pre-filter questions
  onQuestionSelected: (question: Question) => void; // Callback for selecting a single question
  // If selecting multiple questions at once is needed, add a new prop:
  // onQuestionsSelected: (questions: Question[]) => void;
  onCreateEvaluation?: (evaluation: EvaluationFromBank) => void;
}

// ErrorBoundary local para QuestionBank
class QuestionBankErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: unknown}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return <div className="text-red-600 p-4">Erro inesperado no Banco de Questões: {String(this.state.error)}</div>;
    }
    return this.props.children;
  }
}

export function QuestionBank({
  open,
  onClose,
  subjectId,
  onQuestionSelected,
  onCreateEvaluation
}: QuestionBankProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]); // Stores IDs of selected questions
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const [filters, setFilters] = useState({
    subject: "",
    grade: "",
    difficulty: "",
    type: "",
  });

  // State for the internal Create Evaluation dialog (if still needed)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [evaluationTitle, setEvaluationTitle] = useState("");
  const [evaluationGrade, setEvaluationGrade] = useState("");

  // Filter options
  const difficulties = ["Abaixo do Básico", "Básico", "Adequado", "Avançado"];
  const types = [
    { key: "multipleChoice", label: "Múltipla Escolha" },
    { key: "essay", label: "Dissertativa" }
  ];

  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchQuestions();
      fetchSubjects();
      fetchGrades();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      fetchQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, subjectId]);

  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      setErro(null);
      const response = await api.get("/questions/");
      // Garante que questions sempre é array
      const data = response.data;
      if (Array.isArray(data)) {
        setQuestions(data);
      } else if (Array.isArray(data?.questions)) {
        setQuestions(data.questions);
      } else {
        setQuestions([]);
      }
    } catch (error) {
      console.error("Erro ao buscar questões:", error);
      setErro("Erro ao carregar questões do banco. Verifique sua conexão.");
      setQuestions([]);
      toast({
        title: "Erro",
        description: "Erro ao carregar questões do banco. Verifique sua conexão.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get("/subjects");
      setSubjects(response.data || []);
    } catch (error) {
      console.error("Erro ao buscar disciplinas:", error);
    }
  };

  const fetchGrades = async () => {
    try {
      const response = await api.get("/grades/");
      setGrades(response.data || []);
    } catch (error) {
      console.error("Erro ao buscar séries:", error);
    }
  };

  // Filtro robusto, protegendo contra undefined
  const filteredQuestions = (questions || []).filter((question) => {
    const matchesSearch = (question.text || "").toLowerCase().includes(searchTerm.toLowerCase());
    // subjectId prop pode ser null ou string
    const matchesSubjectId = !subjectId || (question.subject && question.subject.id === subjectId);
    const matchesSubject = !filters.subject || (question.subject && question.subject.name === filters.subject);
    const matchesGrade = !filters.grade || (question.grade && question.grade.name === filters.grade);
    const matchesDifficulty = !filters.difficulty || question.difficulty === filters.difficulty;
    const matchesType = !filters.type || question.type === filters.type;
    return matchesSearch && matchesSubjectId && matchesSubject && matchesGrade && matchesDifficulty && matchesType;
  });

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );
  };

  // This handler is for the internal 'Create Evaluation' button within QuestionBank
  const handleCreateEvaluation = () => {
    const selectedQuestionObjects = (questions || []).filter(q => selectedQuestions.includes(q.id));
    if(onCreateEvaluation) {
      onCreateEvaluation({
        title: evaluationTitle,
        subject: filters.subject || "Múltiplas disciplinas",
        grade: evaluationGrade || filters.grade || "Múltiplas séries",
        questions: selectedQuestionObjects,
      });
    }
    setSelectedQuestions([]);
    setIsCreateDialogOpen(false);
    setEvaluationTitle("");
    setEvaluationGrade("");
  };

  // Handler para adicionar questões selecionadas
  const handleSelectQuestions = () => {
    const selectedQuestionObjects = (questions || []).filter(q => selectedQuestions.includes(q.id));
    selectedQuestionObjects.forEach(q => onQuestionSelected(q));
    setSelectedQuestions([]);
    onClose();
  };

  const resetFilters = () => {
    setFilters({
      subject: "",
      grade: "",
      difficulty: "",
      type: "",
    });
  };

  // LOGS para depuração
  // console.log({ questions, grades, subjects, types, filters, filteredQuestions });

  // Checagem de dados essenciais
  if (!Array.isArray(questions)) return <div className="text-red-600 p-4">Erro: Lista de questões inválida.</div>;
  if (!Array.isArray(grades)) return <div className="text-red-600 p-4">Erro: Lista de séries inválida.</div>;
  if (!Array.isArray(subjects)) return <div className="text-red-600 p-4">Erro: Lista de disciplinas inválida.</div>;
  if (!Array.isArray(types)) return <div className="text-red-600 p-4">Erro: Lista de tipos inválida.</div>;
  if (erro) return <div className="text-red-600 p-4">Erro: {erro}</div>;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-screen-lg overflow-y-auto max-h-[90vh]"
        aria-describedby="question-bank-description"
      >
        <DialogHeader>
          <DialogTitle>Banco de Questões</DialogTitle>
          <DialogDescription id="question-bank-description">
            Selecione as questões que deseja adicionar.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 -mx-4">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar no banco de questões..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtros
                    {Object.values(filters).some(Boolean) && (
                      <span className="ml-1 rounded-full bg-primary w-5 h-5 text-[10px] flex items-center justify-center text-primary-foreground">
                        {Object.values(filters).filter(Boolean).length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Filtros</h4>
                      <p className="text-sm text-muted-foreground">
                        Filtre as questões por disciplina, série, dificuldade e tipo
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="subject">Disciplina</Label>
                        <select
                          id="subject"
                          className="col-span-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={filters.subject}
                          onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                        >
                          <option value="">Todas</option>
                          {(subjects || []).map((subject) => (
                            <option key={subject.id} value={subject.name}>
                              {subject.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="grade">Série</Label>
                        <select
                          id="grade"
                          className="col-span-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={filters.grade}
                          onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                        >
                          <option value="">Todas</option>
                          {(grades || []).map((grade) => (
                            <option key={grade.id} value={grade.name}>
                              {grade.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="difficulty">Dificuldade</Label>
                        <select
                          id="difficulty"
                          className="col-span-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={filters.difficulty}
                          onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                        >
                          <option value="">Todas</option>
                          {difficulties.map((difficulty) => (
                            <option key={difficulty} value={difficulty}>
                              {difficulty}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="type">Tipo</Label>
                        <select
                          id="type"
                          className="col-span-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={filters.type}
                          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        >
                          <option value="">Todos</option>
                          {(types || []).map((type) => (
                            <option key={type.key} value={type.key}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button variant="outline" onClick={resetFilters} className="col-span-3">
                        Limpar Filtros
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                onClick={fetchQuestions}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Atualizar"
                )}
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead className="min-w-[200px]">Questão</TableHead>
                      <TableHead className="w-32 hidden sm:table-cell">Disciplina</TableHead>
                      <TableHead className="w-24 hidden md:table-cell">Série</TableHead>
                      <TableHead className="w-24 hidden lg:table-cell">Dificuldade</TableHead>
                      <TableHead className="w-24 hidden lg:table-cell">Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <>
              {/* Questions Table */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead className="min-w-[200px]">Questão</TableHead>
                      <TableHead className="w-32 hidden sm:table-cell">Disciplina</TableHead>
                      <TableHead className="w-24 hidden md:table-cell">Série</TableHead>
                      <TableHead className="w-24 hidden lg:table-cell">Dificuldade</TableHead>
                      <TableHead className="w-24 hidden lg:table-cell">Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(filteredQuestions || []).length > 0 ? (
                      (filteredQuestions || []).map((question) => (
                        <TableRow key={question.id}>
                          <TableCell className="w-12">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleQuestionSelection(question.id)}
                              className={cn("rounded-full", selectedQuestions.includes(question.id) ? "bg-green-500 text-white hover:bg-green-600" : "hover:bg-gray-200")}
                            >
                              {selectedQuestions.includes(question.id) ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={question.text}>{question.text}</TableCell>
                          <TableCell className="hidden sm:table-cell">{question.subject ? question.subject.name : "-"}</TableCell>
                          <TableCell className="hidden md:table-cell">{question.grade ? question.grade.name : "-"}</TableCell>
                          <TableCell className="hidden lg:table-cell">{question.difficulty || "-"}</TableCell>
                          <TableCell className="w-24 hidden lg:table-cell">
                            {question.type === 'multipleChoice' ? 'Múltipla Escolha' : 
                              question.type === 'trueFalse' ? 'Verdadeiro/Falso' : 
                              question.type === 'open' ? 'Dissertativa' : 'Outro'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                          {searchTerm || Object.values(filters).some(Boolean) 
                            ? "Nenhuma questão encontrada com os filtros aplicados." 
                            : "Nenhuma questão disponível no banco."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Show total count */}
              {filteredQuestions.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {filteredQuestions.length} questões encontradas • {selectedQuestions.length} selecionadas
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSelectQuestions} disabled={selectedQuestions.length === 0 || isLoading}>
              Adicionar Selecionadas ({selectedQuestions.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Exporta o componente com ErrorBoundary
export default function QuestionBankWithBoundary(props: QuestionBankProps) {
  return (
    <QuestionBankErrorBoundary>
      <QuestionBank {...props} />
    </QuestionBankErrorBoundary>
  );
}
