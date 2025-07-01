import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Eye, Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown, Check } from "lucide-react";
import { Question } from "../types";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import QuestionPreview from "./QuestionPreview";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  name: string;
}

interface QuestionApiResponse {
  id: string;
  title: string;
  text: string;
  secondStatement?: string;
  type: string;
  difficulty: string;
  value: number;
  skills: string[] | string;
  topics: string[] | string;
  subject?: { id: string; name: string };
  grade?: { id: string; name: string };
  created_by: string;
  solution?: string;
  formattedText?: string;
  formattedSolution?: string;
  options?: {
    id?: string;
    text: string;
    isCorrect: boolean;
  }[];
}

interface Filters {
  subject: string;
  difficulty: string;
  grade: string;
  type: string;
}

interface SortOption {
  value: string;
  label: string;
  key: keyof Question | 'difficulty' | 'subjectName' | 'gradeName';
  direction: 'asc' | 'desc';
}

const DIFFICULTIES = ['Fácil', 'Médio', 'Difícil'];
const QUESTION_TYPES = [
  { value: 'multipleChoice', label: 'Múltipla Escolha' },
  { value: 'open', label: 'Dissertativa' }
];

const SORT_OPTIONS: SortOption[] = [
  { value: 'title-asc', label: 'Conteúdo (A-Z)', key: 'title', direction: 'asc' },
  { value: 'title-desc', label: 'Conteúdo (Z-A)', key: 'title', direction: 'desc' },
  { value: 'subject-asc', label: 'Disciplina (A-Z)', key: 'subjectName', direction: 'asc' },
  { value: 'subject-desc', label: 'Disciplina (Z-A)', key: 'subjectName', direction: 'desc' },
  { value: 'difficulty-easy', label: 'Dificuldade (Fácil → Difícil)', key: 'difficulty', direction: 'asc' },
  { value: 'difficulty-hard', label: 'Dificuldade (Difícil → Fácil)', key: 'difficulty', direction: 'desc' },
  { value: 'value-asc', label: 'Valor (Menor → Maior)', key: 'value', direction: 'asc' },
  { value: 'value-desc', label: 'Valor (Maior → Menor)', key: 'value', direction: 'desc' },
];

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

interface QuestionBankProps {
  open: boolean;
  onClose: () => void;
  onSelect: (question: Question) => void;
  subjects: Subject[];
  selectedSubjectId?: string;
}

export default function QuestionBank({
  open,
  onClose,
  onSelect,
  subjects,
  selectedSubjectId
}: QuestionBankProps) {
  // Estados principais
  const [questions, setQuestions] = useState<Question[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtros e pesquisa
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filters, setFilters] = useState<Filters>({
    subject: selectedSubjectId || 'all',
    difficulty: 'all',
    grade: 'all',
    type: 'all'
  });

  // Atualizar filtro quando selectedSubjectId mudar
  useEffect(() => {
    if (selectedSubjectId && selectedSubjectId !== 'all') {
      setFilters(prev => ({ ...prev, subject: selectedSubjectId }));
    }
  }, [selectedSubjectId]);
  
  // Estados de ordenação e paginação
  const [sortBy, setSortBy] = useState<string>('title-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  
  // Estados de seleção e modais
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewQuestion, setViewQuestion] = useState<Question | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  const { toast } = useToast();

  // Buscar dados iniciais
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [gradesRes] = await Promise.all([
          api.get("/grades/")
        ]);
        setGrades(gradesRes.data || []);
      } catch (error) {
        console.error("Erro ao buscar dados iniciais:", error);
      }
    };
    fetchInitialData();
  }, []);

  // Buscar questões
  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: Record<string, string> = {};
      if (filters.subject !== 'all') params.subject_id = filters.subject;
      if (filters.difficulty !== 'all') params.difficulty = filters.difficulty;
      if (filters.grade !== 'all') params.grade_id = filters.grade;
      if (filters.type !== 'all') params.type = filters.type;
      
      const response = await api.get("/questions/", { params });
      
      if (response.data && Array.isArray(response.data)) {
        const transformedQuestions = response.data.map((q: QuestionApiResponse) => ({
          id: q.id,
          title: q.title || q.text?.substring(0, 50) + '...',
          text: q.text,
          secondStatement: q.secondStatement,
          type: q.type as "multipleChoice" | "open" | "trueFalse",
          subjectId: q.subject?.id || '',
          difficulty: q.difficulty,
          value: q.value?.toString() || '1',
          skills: Array.isArray(q.skills) ? q.skills : (q.skills ? [q.skills] : []),
          subject: q.subject || { id: '', name: '' },
          grade: q.grade || { id: '', name: '' },
          created_by: q.created_by,
          solution: q.solution || '',
          formattedText: q.formattedText,
          formattedSolution: q.formattedSolution,
          options: q.options?.map(opt => ({
            id: opt.id || Math.random().toString(),
            text: opt.text,
            isCorrect: opt.isCorrect
          })) || []
        }));
        
        setQuestions(transformedQuestions);
      } else {
        setQuestions([]);
      }
    } catch (error) {
      console.error("Erro ao buscar questões:", error);
      setError("Erro ao carregar questões");
      toast({
        title: "Erro",
        description: "Não foi possível carregar as questões",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    if (open) {
      fetchQuestions();
    }
  }, [open, fetchQuestions]);

  // Função de ordenação
  const sortQuestions = (questions: Question[], sortBy: string): Question[] => {
    if (!sortBy || sortBy === 'default') return questions;

    const sortOption = SORT_OPTIONS.find(opt => opt.value === sortBy);
    if (!sortOption) return questions;

    return [...questions].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortOption.key) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'subjectName':
          aValue = a.subject?.name?.toLowerCase() || '';
          bValue = b.subject?.name?.toLowerCase() || '';
          break;
        case 'gradeName':
          aValue = a.grade?.name?.toLowerCase() || '';
          bValue = b.grade?.name?.toLowerCase() || '';
          break;
        case 'difficulty': {
          const difficultyOrder = { 'Fácil': 1, 'Médio': 2, 'Difícil': 3 };
          aValue = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 0;
          bValue = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 0;
          break;
        }
        case 'value':
          aValue = parseFloat(a.value) || 0;
          bValue = parseFloat(b.value) || 0;
          break;
        default:
          aValue = a[sortOption.key as keyof Question] as string || '';
          bValue = b[sortOption.key as keyof Question] as string || '';
      }

      if (aValue < bValue) return sortOption.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOption.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Questões filtradas e ordenadas
  const filteredAndSortedQuestions = useMemo(() => {
    if (questions.length === 0) return [];

    const filtered = questions.filter(question => {
      if (debouncedSearchTerm !== '' && 
          !question.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) &&
          !question.id.includes(debouncedSearchTerm)) {
        return false;
      }
      return true;
    });

    return sortQuestions(filtered, sortBy);
  }, [questions, debouncedSearchTerm, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedQuestions.length / pageSize);
  const paginatedQuestions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedQuestions.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedQuestions, currentPage, pageSize]);

  // Handlers
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedQuestions.map(q => q.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const handleAddSelected = () => {
    const selectedQuestions = questions.filter(q => selectedIds.includes(q.id));
    selectedQuestions.forEach(q => onSelect(q));
    setSelectedIds([]);
    toast({
      title: "Questões adicionadas",
      description: `${selectedQuestions.length} questões adicionadas à avaliação`,
    });
  };

  const handleQuickAdd = (question: Question) => {
    onSelect(question);
    toast({
      title: "Questão adicionada",
      description: "A questão foi adicionada à avaliação",
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Fácil': return 'bg-green-100 text-green-800';
      case 'Médio': return 'bg-yellow-100 text-yellow-800';
      case 'Difícil': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'multipleChoice': return 'Múltipla Escolha';
      case 'open': return 'Dissertativa';
      default: return type;
    }
  };

  const clearFilters = () => {
    setFilters({
      subject: 'all',
      difficulty: 'all',
      grade: 'all',
      type: 'all'
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] w-[95vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl">Banco de Questões</DialogTitle>
          <DialogDescription>
            Selecione questões do banco para adicionar à sua avaliação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barra de pesquisa */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar questões por título ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filtros - Desktop */}
          <div className="hidden md:flex flex-wrap gap-2 items-center">
            <Select value={filters.subject} onValueChange={(value) => handleFilterChange('subject', value)}>
              <SelectTrigger className="w-36 lg:w-40">
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

            <Select value={filters.difficulty} onValueChange={(value) => handleFilterChange('difficulty', value)}>
              <SelectTrigger className="w-32 lg:w-36">
                <SelectValue placeholder="Dificuldade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {DIFFICULTIES.map((difficulty) => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {difficulty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.grade} onValueChange={(value) => handleFilterChange('grade', value)}>
              <SelectTrigger className="w-28 lg:w-32">
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

            <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
              <SelectTrigger className="w-32 lg:w-36">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {QUESTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 lg:w-48">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>

          {/* Filtros - Mobile */}
          <div className="md:hidden">
            <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros e Ordenação
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-sm font-medium">Disciplina</Label>
                    <Select value={filters.subject} onValueChange={(value) => handleFilterChange('subject', value)}>
                      <SelectTrigger className="w-full mt-1">
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
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Dificuldade</Label>
                    <Select value={filters.difficulty} onValueChange={(value) => handleFilterChange('difficulty', value)}>
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Dificuldade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {DIFFICULTIES.map((difficulty) => (
                          <SelectItem key={difficulty} value={difficulty}>
                            {difficulty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Série</Label>
                    <Select value={filters.grade} onValueChange={(value) => handleFilterChange('grade', value)}>
                      <SelectTrigger className="w-full mt-1">
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
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Tipo</Label>
                    <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {QUESTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Ordenar por</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button variant="outline" onClick={clearFilters} className="w-full">
                    Limpar Filtros
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Botões de ação */}
          {selectedIds.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between bg-blue-50 p-3 rounded-lg gap-2">
              <span className="text-sm text-blue-800 text-center sm:text-left">
                {selectedIds.length} questões selecionadas
              </span>
              <Button onClick={handleAddSelected} size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Selecionadas
              </Button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-4 w-4 mt-1 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <div className="flex flex-wrap gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-12" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-8 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Lista de questões */}
          {!loading && (
            <div className="space-y-3">
              {paginatedQuestions.length > 0 ? (
                paginatedQuestions.map((question) => (
                  <Card key={question.id} className={cn(
                    "transition-all hover:shadow-md",
                    selectedIds.includes(question.id) && "ring-2 ring-blue-500 bg-blue-50"
                  )}>
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedIds.includes(question.id)}
                          onCheckedChange={(checked) => handleSelectOne(question.id, !!checked)}
                          className="mt-1 flex-shrink-0"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm md:text-base mb-2 line-clamp-2">
                            {question.title}
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
                            <Badge variant="outline" className="text-xs">
                              {question.value} pt(s)
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuickAdd(question)}
                            className="flex-shrink-0"
                            title="Adicionar questão"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewQuestion(question)}
                            className="flex-shrink-0"
                            title="Visualizar questão"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      {error ? "Erro ao carregar questões" : "Nenhuma questão encontrada"}
                    </p>
                    {error && (
                      <Button variant="outline" onClick={fetchQuestions} className="mt-2">
                        Tentar novamente
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Paginação */}
          {!loading && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, filteredAndSortedQuestions.length)} de {filteredAndSortedQuestions.length} questões
              </p>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {/* Paginação responsiva */}
                <div className="hidden sm:flex items-center space-x-2">
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
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                {/* Paginação mobile - apenas página atual */}
                <div className="sm:hidden">
                  <span className="text-sm text-muted-foreground px-3">
                    {currentPage} / {totalPages}
                  </span>
                </div>
                
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

          {/* Botões de ação do rodapé */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button 
              onClick={handleAddSelected} 
              disabled={selectedIds.length === 0}
              className="w-full sm:w-auto"
            >
              Adicionar Selecionadas ({selectedIds.length})
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Preview de questão */}
      {viewQuestion && (
        <Dialog open={!!viewQuestion} onOpenChange={() => setViewQuestion(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Visualizar Questão</DialogTitle>
            </DialogHeader>
            <QuestionPreview question={viewQuestion} />
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
} 