import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Book, Search, Plus, Eye, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import QuestionPreview from "./questions/QuestionPreview";
import { Question } from "./types";

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
  secondStatement?: string;
  second_statement?: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  name: string;
}

interface Filters {
  subject: string;
  grade: string;
  difficulty: string;
  type: string;
}

interface QuestionBankProps {
  open: boolean;
  onClose: () => void;
  subjectId: string | null;
  onQuestionSelected: (question: Question) => void;
  onCreateEvaluation?: (evaluation: {
    title: string;
    subject: string;
    grade: string;
    questions: Question[];
  }) => void;
}

const DIFFICULTIES = ["Abaixo do Básico", "Básico", "Adequado", "Avançado"];
const QUESTION_TYPES = [
  { key: "multipleChoice", label: "Múltipla Escolha" },
  { key: "essay", label: "Dissertativa" },
  { key: "trueFalse", label: "Verdadeiro/Falso" }
];

export function QuestionBank({
  open,
  onClose,
  subjectId,
  onQuestionSelected,
}: QuestionBankProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewQuestion, setViewQuestion] = useState<Question | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const { toast } = useToast();
  
  const [filters, setFilters] = useState<Filters>({
    subject: subjectId || "all",
    grade: "all",
    difficulty: "all",
    type: "all",
  });

  const [erro, setErro] = useState<string | null>(null);

  // Atualizar filtro quando subjectId mudar
  useEffect(() => {
    if (subjectId) {
      setFilters(prev => ({ ...prev, subject: subjectId }));
    }
  }, [subjectId]);

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
  }, [filters, subjectId]);

  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      setErro(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error("Token de autenticação não encontrado");
      }
      
      const response = await api.get("/questions/");
      
      let questionsData: ApiQuestion[] = [];
      
      if (Array.isArray(response.data)) {
        questionsData = response.data;
      } else if (response.data && Array.isArray(response.data.questions)) {
        questionsData = response.data.questions;
      } else if (response.data && Array.isArray(response.data.data)) {
        questionsData = response.data.data;
      } else {
        questionsData = [];
      }

      const convertedQuestions: Question[] = questionsData.map((apiQuestion) => {
        const getQuestionType = (type: string | undefined): "multipleChoice" | "open" | "trueFalse" => {
          switch (type) {
            case "multipleChoice":
            case "multiple_choice":
              return "multipleChoice";
            case "open":
            case "essay":
            case "dissertativa":
              return "open";
            case "trueFalse":
            case "true_false":
              return "trueFalse";
            default:
              return "multipleChoice";
          }
        };

        // Mapear dificuldades corretamente
        const mapDifficulty = (difficulty: string | undefined): string => {
          if (!difficulty) return "Básico";
          
          // Normalizar dificuldades
          const normalized = difficulty.trim();
          switch (normalized.toLowerCase()) {
            case 'avançado':
            case 'avancado':
            case 'advanced':
              return 'Avançado';
            case 'adequado':
            case 'adequada':
            case 'adequate':
              return 'Adequado';
            case 'básico':
            case 'basico':
            case 'basic':
              return 'Básico';
            case 'abaixo do básico':
            case 'abaixo do basico':
            case 'below basic':
              return 'Abaixo do Básico';
            default:
              return normalized; // Manter o valor original se não for reconhecido
          }
        };

        const question: Question = {
          id: apiQuestion.id,
          text: apiQuestion.text || apiQuestion.formatted_text || "",
          title: apiQuestion.title || "",
          type: getQuestionType(apiQuestion.question_type),
          difficulty: mapDifficulty(apiQuestion.difficulty || apiQuestion.difficulty_level),
          subjectId: apiQuestion.subject_id || "",
          subject: apiQuestion.subject ? {
            id: apiQuestion.subject.id,
            name: apiQuestion.subject.name
          } : undefined,
          grade: apiQuestion.grade ? {
            id: apiQuestion.grade.id,
            name: apiQuestion.grade.name
          } : undefined,
          value: apiQuestion.value || 1,
          options: apiQuestion.options || apiQuestion.alternatives?.map(alt => ({
            id: alt.id || "",
            text: alt.text,
            isCorrect: alt.isCorrect || false
          })) || [],
          created_by: apiQuestion.created_by || "",
          skills: Array.isArray(apiQuestion.skill) ? apiQuestion.skill : (apiQuestion.skill ? [apiQuestion.skill] : []),
          solution: apiQuestion.formatted_solution || apiQuestion.solution || "",
          formattedText: apiQuestion.formatted_text || apiQuestion.formattedText,
          formattedSolution: apiQuestion.formatted_solution || apiQuestion.formattedSolution,
          secondStatement: apiQuestion.secondStatement || apiQuestion.second_statement || "",
        };
        return question;
      });

      setQuestions(convertedQuestions);
      
    } catch (error) {
      let errorMessage = "Erro ao carregar questões do banco.";
      
      if (error instanceof Error) {
        if (error.message.includes("Token")) {
          errorMessage = "Sessão expirada. Faça login novamente.";
        } else if (error.message.includes("Network")) {
          errorMessage = "Erro de conexão. Verifique sua internet.";
        }
      }
      
      setErro(errorMessage);
      setQuestions([]);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await api.get("/subjects");
      
      if (Array.isArray(response.data)) {
        setSubjects(response.data);
      } else if (response.data && Array.isArray(response.data.data)) {
        setSubjects(response.data.data);
      } else {
        setSubjects([]);
      }
    } catch (error) {
      setSubjects([]);
    }
  };

  const fetchGrades = async () => {
    try {
      const response = await api.get("/grades/");
      
      if (Array.isArray(response.data)) {
        setGrades(response.data);
      } else if (response.data && Array.isArray(response.data.data)) {
        setGrades(response.data.data);
      } else {
        setGrades([]);
      }
    } catch (error) {
      setGrades([]);
    }
  };

  // Filtrar questões
  const filteredQuestions = useMemo(() => {
    return (questions || []).filter((question) => {
      const matchesSearch = (question.text || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (question.title || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubjectId = !subjectId || (question.subject && question.subject.id === subjectId);
      const matchesSubject = !filters.subject || filters.subject === "all" || (question.subject && question.subject.id === filters.subject);
      const matchesGrade = !filters.grade || filters.grade === "all" || (question.grade && question.grade.id === filters.grade);
      const matchesDifficulty = !filters.difficulty || filters.difficulty === "all" || question.difficulty === filters.difficulty;
      const matchesType = !filters.type || filters.type === "all" || question.type === filters.type;
      
      return matchesSearch && matchesSubjectId && matchesSubject && matchesGrade && matchesDifficulty && matchesType;
    });
  }, [questions, searchTerm, subjectId, filters]);

  // Paginação
  const totalPages = Math.ceil(filteredQuestions.length / pageSize);
  const paginatedQuestions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(startIndex, startIndex + pageSize);
  }, [filteredQuestions, currentPage, pageSize]);

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedQuestions(paginatedQuestions.map(q => q.id));
    } else {
      setSelectedQuestions([]);
    }
  };

  const handleSelectQuestions = () => {
    const selectedQuestionObjects = (questions || []).filter(q => selectedQuestions.includes(q.id));
    selectedQuestionObjects.forEach(q => onQuestionSelected(q));
    setSelectedQuestions([]);
    toast({
      title: "Questões adicionadas",
      description: `${selectedQuestionObjects.length} questões foram adicionadas à avaliação.`,
    });
  };

  const handleQuickAdd = (question: Question) => {
    onQuestionSelected(question);
    toast({
      title: "Questão adicionada",
      description: "A questão foi adicionada à avaliação.",
    });
  };

  const resetFilters = () => {
    setFilters({
      subject: subjectId || "all",
      grade: "all",
      difficulty: "all",
      type: "all",
    });
    setSearchTerm("");
    setCurrentPage(1);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Avançado': return 'bg-green-800 text-green-100';
      case 'Adequado': return 'bg-green-100 text-green-800';
      case 'Básico': return 'bg-yellow-100 text-yellow-800';
      case 'Abaixo do Básico': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'multipleChoice': return 'Múltipla Escolha';
      case 'dissertativa': return 'Dissertativa';
      case 'trueFalse': return 'Verdadeiro/Falso';
      default: return type;
    }
  };

  if (!Array.isArray(questions) || !Array.isArray(grades) || !Array.isArray(subjects)) {
    return <div className="text-red-600 p-4">Erro: Dados inválidos.</div>;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-7xl max-h-[90vh] w-[95vw] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Banco de Questões
            </DialogTitle>
          </DialogHeader>

          {/* Filtros e Pesquisa */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="text-sm font-medium">Pesquisar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Buscar por título ou conteúdo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <div>
                  <Label htmlFor="subject-filter" className="text-sm font-medium">Disciplina</Label>
                  <Select
                    value={filters.subject}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, subject: value }))}
                  >
                    <SelectTrigger id="subject-filter" className="w-full sm:w-40">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as disciplinas</SelectItem>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="grade-filter" className="text-sm font-medium">Série</Label>
                  <Select
                    value={filters.grade}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, grade: value }))}
                  >
                    <SelectTrigger id="grade-filter" className="w-full sm:w-32">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as séries</SelectItem>
                      {grades.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="difficulty-filter" className="text-sm font-medium">Dificuldade</Label>
                  <Select
                    value={filters.difficulty}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger id="difficulty-filter" className="w-full sm:w-40">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as dificuldades</SelectItem>
                      {DIFFICULTIES.map((difficulty) => (
                        <SelectItem key={difficulty} value={difficulty}>
                          {difficulty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="type-filter" className="text-sm font-medium">Tipo</Label>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger id="type-filter" className="w-full sm:w-40">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {QUESTION_TYPES.map((type) => (
                        <SelectItem key={type.key} value={type.key}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="text-xs"
              >
                Limpar Filtros
              </Button>
              
              {selectedQuestions.length > 0 && (
                <Button
                  onClick={handleSelectQuestions}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Adicionar {selectedQuestions.length} questões
                </Button>
              )}
            </div>
          </div>

          {/* Lista de Questões */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-4 w-4 mt-1" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16 rounded-full" />
                          <Skeleton className="h-5 w-12 rounded-full" />
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedQuestions.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Checkbox
                        checked={selectedQuestions.length === paginatedQuestions.length && paginatedQuestions.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label className="text-sm font-medium">
                        Selecionar todas desta página ({paginatedQuestions.length})
                      </Label>
                    </div>

                    {paginatedQuestions.map((question, index) => (
                      <Card key={question.id} className={cn(
                        "transition-all duration-200 hover:shadow-md",
                        selectedQuestions.includes(question.id) && "ring-2 ring-blue-500 bg-blue-50"
                      )}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center mt-1">
                              <Checkbox
                                checked={selectedQuestions.includes(question.id)}
                                onCheckedChange={(checked) => toggleQuestionSelection(question.id)}
                              />
                              <span className="ml-2 text-xs text-gray-400 font-mono">
                                #{index + 1 + (currentPage - 1) * pageSize}
                              </span>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm md:text-base mb-2 line-clamp-2">
                                {question.title || question.text}
                              </h4>
                              
                              <div className="flex flex-wrap gap-1 md:gap-2">
                                {question.subject && (
                                  <Badge variant="secondary" className="text-xs">
                                    {question.subject.name}
                                  </Badge>
                                )}
                                {question.grade && (
                                  <Badge variant="outline" className="text-xs">
                                    {question.grade.name}
                                  </Badge>
                                )}
                                <Badge className={cn("text-xs", getDifficultyColor(question.difficulty))}>
                                  {question.difficulty}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {getTypeLabel(question.type)}
                                </Badge>
                                <Badge variant="outline" className="text-xs font-semibold">
                                  {question.value} pt(s)
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleQuickAdd(question)}
                                className="transition-colors hover:bg-green-50 hover:text-green-700"
                                title="Adicionar questão"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewQuestion(question)}
                                className="transition-colors hover:bg-blue-50 hover:text-blue-700"
                                title="Visualizar questão"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <Search className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-lg font-medium text-gray-700">
                            {erro ? "Erro ao carregar questões" : "Nenhuma questão encontrada"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {erro 
                              ? "Verifique sua conexão e tente novamente" 
                              : subjectId
                                ? `Não há questões disponíveis para esta disciplina`
                                : "Ajuste os filtros para encontrar questões"
                            }
                          </p>
                        </div>
                        {erro && (
                          <Button 
                            variant="outline" 
                            onClick={fetchQuestions}
                            className="mt-2"
                          >
                            Tentar novamente
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, filteredQuestions.length)} de {filteredQuestions.length} questões
                  </p>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center space-x-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let page;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

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
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização da Questão */}
      <Dialog open={!!viewQuestion} onOpenChange={() => setViewQuestion(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar Questão</DialogTitle>
          </DialogHeader>
          {viewQuestion && (
            <QuestionPreview question={viewQuestion} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function QuestionBankWithBoundary(props: QuestionBankProps) {
  return <QuestionBank {...props} />;
}
