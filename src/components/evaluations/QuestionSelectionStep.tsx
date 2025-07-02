import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Plus, 
  Trash2, 
  Eye, 
  Filter, 
  X, 
  BookOpen, 
  CheckCircle,
  AlertCircle,
  FileText
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { EvaluationFormData, Question, Subject } from "./types";
import { QuestionBank } from "./QuestionBank";

interface QuestionSelectionStepProps {
  evaluationData: EvaluationFormData;
  selectedQuestions: Question[];
  onQuestionsChange: (questions: Question[]) => void;
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
  alternatives?: { id?: string; text: string; isCorrect?: boolean }[];
  skill?: string | string[];
  created_by?: string;
}

interface QuestionPreviewData {
  question: Question;
  isOpen: boolean;
}

export default function QuestionSelectionStep({ 
  evaluationData, 
  selectedQuestions, 
  onQuestionsChange 
}: QuestionSelectionStepProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [previewData, setPreviewData] = useState<QuestionPreviewData>({ question: {} as Question, isOpen: false });
  
  const { toast } = useToast();

  // Carregar questões baseadas nas disciplinas selecionadas
  useEffect(() => {
    if (evaluationData.subjects.length > 0) {
      fetchQuestionsForSubjects();
    }
  }, [evaluationData.subjects]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = availableQuestions;

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(q => 
        q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.subject.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por disciplina
    if (selectedSubjectFilter !== "all") {
      filtered = filtered.filter(q => q.subject.id === selectedSubjectFilter);
    }

    // Filtro por dificuldade
    if (difficultyFilter !== "all") {
      filtered = filtered.filter(q => q.difficulty === difficultyFilter);
    }

    // Filtro por tipo
    if (typeFilter !== "all") {
      filtered = filtered.filter(q => q.type === typeFilter);
    }

    // Excluir questões já selecionadas
    filtered = filtered.filter(q => 
      !selectedQuestions.find(selected => selected.id === q.id)
    );

    setFilteredQuestions(filtered);
  }, [availableQuestions, searchTerm, selectedSubjectFilter, difficultyFilter, typeFilter, selectedQuestions]);

  const fetchQuestionsForSubjects = async () => {
    try {
      setIsLoading(true);
      const subjectIds = evaluationData.subjects.map(s => s.id);
      
      // Buscar questões para todas as disciplinas selecionadas
      const promises = subjectIds.map(subjectId => 
        api.get(`/questions/?subject_id=${subjectId}`)
      );
      
      const responses = await Promise.all(promises);
      
      // Combinar todas as questões
      const allQuestions: Question[] = [];
      responses.forEach(response => {
        if (response.data && Array.isArray(response.data)) {
          const transformedQuestions = response.data.map(transformApiQuestion);
          allQuestions.push(...transformedQuestions);
        }
      });

      // Remover duplicatas baseado no ID
      const uniqueQuestions = allQuestions.filter((question, index, self) =>
        index === self.findIndex(q => q.id === question.id)
      );

      setAvailableQuestions(uniqueQuestions);
      
    } catch (error) {
      console.error("Erro ao buscar questões:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar questões das disciplinas selecionadas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const transformApiQuestion = (apiQuestion: ApiQuestion): Question => {
    return {
      id: apiQuestion.id,
      title: apiQuestion.title || "",
      text: apiQuestion.text,
      formattedText: apiQuestion.formatted_text,
      subjectId: apiQuestion.subject_id,
      subject: apiQuestion.subject || { id: apiQuestion.subject_id, name: "Disciplina não definida" },
      grade: apiQuestion.grade || { id: apiQuestion.grade_id || "", name: "Série não definida" },
      difficulty: apiQuestion.difficulty_level || "Básico",
      type: apiQuestion.question_type === "essay" ? "open" : 
            apiQuestion.question_type === "trueFalse" ? "trueFalse" : "multipleChoice",
      value: String(apiQuestion.value || 1.0),
      solution: apiQuestion.correct_answer || "",
      formattedSolution: apiQuestion.formatted_solution,
      options: apiQuestion.alternatives || [],
      skills: Array.isArray(apiQuestion.skill) ? apiQuestion.skill : [apiQuestion.skill || ""],
      created_by: apiQuestion.created_by || "",
    };
  };

  const handleAddQuestion = (question: Question) => {
    const updated = [...selectedQuestions, question];
    onQuestionsChange(updated);
    
    toast({
      title: "Questão adicionada",
      description: `"${question.text.substring(0, 50)}..." foi adicionada à avaliação`,
    });
  };

  const handleRemoveQuestion = (questionId: string) => {
    const updated = selectedQuestions.filter(q => q.id !== questionId);
    onQuestionsChange(updated);
    
    toast({
      title: "Questão removida",
      description: "Questão removida da avaliação",
      variant: "destructive",
    });
  };

  const handleQuestionFromBank = (question: Question) => {
    if (!selectedQuestions.find(q => q.id === question.id)) {
      handleAddQuestion(question);
    }
  };

  const handlePreviewQuestion = (question: Question) => {
    setPreviewData({ question, isOpen: true });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSubjectFilter("all");
    setDifficultyFilter("all");
    setTypeFilter("all");
  };

  const getTotalPoints = () => {
    return selectedQuestions.reduce((sum, q) => sum + parseFloat(q.value || "1"), 0);
  };

  const getQuestionsBySubject = () => {
    const bySubject: { [key: string]: { subject: Subject; questions: Question[] } } = {};
    
    selectedQuestions.forEach(question => {
      const subjectId = question.subject.id;
      if (!bySubject[subjectId]) {
        bySubject[subjectId] = {
          subject: question.subject,
          questions: []
        };
      }
      bySubject[subjectId].questions.push(question);
    });
    
    return bySubject;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const questionsBySubject = getQuestionsBySubject();

  return (
    <div className="space-y-6">
      {/* Resumo das Questões Selecionadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Questões Selecionadas
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {selectedQuestions.length} questões • {getTotalPoints().toFixed(1)} pts
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedQuestions.length > 0 ? (
            <div className="space-y-4">
              {/* Questões agrupadas por disciplina */}
              {Object.values(questionsBySubject).map(({ subject, questions }) => (
                <div key={subject.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{subject.name}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {questions.length} questões
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {questions.map((question, index) => (
                      <div key={question.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">Q{index + 1}</span>
                            <Badge variant="outline" className="text-xs">
                              {question.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {question.value} pts
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {question.text}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreviewQuestion(question)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveQuestion(question.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-2">Nenhuma questão selecionada</p>
              <p className="text-sm text-gray-400">
                Use os filtros abaixo ou o banco de questões para adicionar questões
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Busca e Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-500" />
              Adicionar Questões
            </div>
            <Button
              variant="outline"
              onClick={() => setShowQuestionBank(true)}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Banco de Questões
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar questões..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedSubjectFilter} onValueChange={setSelectedSubjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Disciplina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as disciplinas</SelectItem>
                {evaluationData.subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Dificuldade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Abaixo do Básico">Abaixo do Básico</SelectItem>
                <SelectItem value="Básico">Básico</SelectItem>
                <SelectItem value="Adequado">Adequado</SelectItem>
                <SelectItem value="Avançado">Avançado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="multipleChoice">Múltipla Escolha</SelectItem>
                <SelectItem value="trueFalse">Verdadeiro/Falso</SelectItem>
                <SelectItem value="open">Dissertativa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info sobre filtros ativos */}
          {(searchTerm || selectedSubjectFilter !== "all" || difficultyFilter !== "all" || typeFilter !== "all") && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  {filteredQuestions.length} questões encontradas com os filtros aplicados
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          )}

          {/* Lista de Questões Disponíveis */}
          {filteredQuestions.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Questão</TableHead>
                    <TableHead className="w-32">Disciplina</TableHead>
                    <TableHead className="w-24">Dificuldade</TableHead>
                    <TableHead className="w-20">Pontos</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.slice(0, 20).map((question, index) => (
                    <TableRow key={question.id}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddQuestion(question)}
                          className="hover:bg-green-100"
                        >
                          <Plus className="h-4 w-4 text-green-600" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <p className="line-clamp-2 text-sm">{question.text}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {question.subject.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            question.difficulty === "Avançado" ? "text-green-700" :
                            question.difficulty === "Adequado" ? "text-green-600" :
                            question.difficulty === "Básico" ? "text-yellow-600" :
                            "text-red-600"
                          }`}
                        >
                          {question.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{question.value}</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreviewQuestion(question)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {availableQuestions.length === 0 
                  ? "Nenhuma questão encontrada para as disciplinas selecionadas."
                  : "Nenhuma questão encontrada com os filtros aplicados."
                }
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Question Bank Modal */}
      <QuestionBank
        open={showQuestionBank}
        onClose={() => setShowQuestionBank(false)}
        subjectId={null}
        onQuestionSelected={handleQuestionFromBank}
      />

      {/* Question Preview Modal */}
      <Dialog open={previewData.isOpen} onOpenChange={(open) => setPreviewData({ ...previewData, isOpen: open })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar Questão</DialogTitle>
            <DialogDescription>
              Disciplina: {previewData.question.subject?.name} • 
              Dificuldade: {previewData.question.difficulty} • 
              Pontos: {previewData.question.value}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Enunciado:</Label>
              <p className="mt-1 text-sm">{previewData.question.text}</p>
            </div>
            
            {previewData.question.options && previewData.question.options.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Alternativas:</Label>
                <div className="mt-2 space-y-2">
                  {previewData.question.options.map((option, index) => (
                    <div key={index} className={`p-2 rounded border ${option.isCorrect ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                      <span className="font-medium">
                        {String.fromCharCode(65 + index)}) 
                      </span>
                      {option.text}
                      {option.isCorrect && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Correta
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewData.question.skills && previewData.question.skills.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Habilidades:</Label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {previewData.question.skills.map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
