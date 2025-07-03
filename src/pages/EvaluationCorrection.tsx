import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  BookOpen, 
  FileText, 
  Save, 
  Send,
  Eye,
  Filter,
  Search,
  MoreHorizontal,
  Download,
  MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface SubmittedEvaluation {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  testId: string;
  testTitle: string;
  subject: { id: string; name: string };
  grade: { id: string; name: string };
  submittedAt: string;
  duration: number; // em minutos
  status: "pending" | "correcting" | "corrected" | "reviewed";
  totalQuestions: number;
  answeredQuestions: number;
  autoScore?: number; // pontuação automática para múltipla escolha
  manualScore?: number; // pontuação após correção manual
  finalScore?: number;
  percentage?: number;
  correctedBy?: string;
  correctedAt?: string;
  feedback?: string;
  questions: QuestionWithAnswer[];
}

interface QuestionWithAnswer {
  id: string;
  number: number;
  type: "multiple_choice" | "true_false" | "essay" | "multiple_answer";
  text: string;
  options?: { id: string; text: string }[];
  points: number;
  correctAnswer?: string;
  studentAnswer: string;
  isCorrect?: boolean;
  manualPoints?: number;
  feedback?: string;
}

interface FilterOptions {
  status: string;
  subject: string;
  grade: string;
  search: string;
}

export default function EvaluationCorrection() {
  const [evaluations, setEvaluations] = useState<SubmittedEvaluation[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<SubmittedEvaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: "all",
    subject: "all", 
    grade: "all",
    search: ""
  });
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubmittedEvaluations();
  }, []);

  const fetchSubmittedEvaluations = async () => {
    try {
      setIsLoading(true);
      
      // Construir parâmetros de filtro
      const params = new URLSearchParams();
      if (filters.status !== "all") params.append('status', filters.status);
      if (filters.subject !== "all") params.append('subject', filters.subject);
      if (filters.grade !== "all") params.append('grade', filters.grade);
      if (filters.search) params.append('search', filters.search);
      
      // API call para buscar avaliações enviadas
      const response = await api.get(`/evaluation-results/admin/submitted-evaluations?${params.toString()}`);
      setEvaluations(response.data);
      
      if (response.data.length === 0) {
        toast({
          title: "Nenhuma avaliação encontrada",
          description: "Ainda não há avaliações enviadas pelos alunos.",
        });
      }
      
    } catch (error) {
      console.error("Erro ao buscar avaliações enviadas:", error);
      
      // Fallback para dados mock se a API falhar
      const mockEvaluations = getMockSubmittedEvaluations();
      setEvaluations(mockEvaluations);
      
      toast({
        title: "Modo de demonstração",
        description: "Exibindo dados mock. Verifique a conexão com o backend.",
        variant: "default",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getMockSubmittedEvaluations = (): SubmittedEvaluation[] => [
    {
      id: "sub-1",
      sessionId: "session-1",
      studentId: "student-1",
      studentName: "Ana Silva Santos",
      testId: "eval-1",
      testTitle: "Avaliação de Matemática - 1º Bimestre",
      subject: { id: "math", name: "Matemática" },
      grade: { id: "5ano", name: "5º Ano" },
      submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      duration: 85,
      status: "pending",
      totalQuestions: 3,
      answeredQuestions: 3,
      autoScore: 4,
      questions: [
        {
          id: "q1",
          number: 1,
          type: "multiple_choice",
          text: "Qual é o resultado da operação 2,5 + 3,7?",
          options: [
            { id: "a", text: "5,2" },
            { id: "b", text: "6,2" },
            { id: "c", text: "6,1" },
            { id: "d", text: "5,3" }
          ],
          points: 2,
          correctAnswer: "b",
          studentAnswer: "b",
          isCorrect: true
        },
        {
          id: "q2",
          number: 2,
          type: "true_false",
          text: "A fração 3/4 é equivalente a 0,75.",
          points: 2,
          correctAnswer: "true",
          studentAnswer: "true",
          isCorrect: true
        },
        {
          id: "q3",
          number: 3,
          type: "essay",
          text: "Explique como você faria para somar as frações 1/4 + 2/3.",
          points: 3,
          studentAnswer: "Primeiro encontro o denominador comum que é 12. Depois transformo: 1/4 = 3/12 e 2/3 = 8/12. Aí somo: 3/12 + 8/12 = 11/12."
        }
      ]
    },
    {
      id: "sub-2",
      sessionId: "session-2", 
      studentId: "student-2",
      studentName: "Bruno Costa Lima",
      testId: "eval-1",
      testTitle: "Avaliação de Matemática - 1º Bimestre",
      subject: { id: "math", name: "Matemática" },
      grade: { id: "5ano", name: "5º Ano" },
      submittedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      duration: 75,
      status: "corrected",
      totalQuestions: 3,
      answeredQuestions: 2,
      autoScore: 2,
      manualScore: 6,
      finalScore: 6,
      percentage: 85.7,
      correctedBy: "admin",
      correctedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      feedback: "Bom trabalho! Demonstrou compreensão dos conceitos básicos.",
      questions: [
        {
          id: "q1",
          number: 1,
          type: "multiple_choice",
          text: "Qual é o resultado da operação 2,5 + 3,7?",
          options: [
            { id: "a", text: "5,2" },
            { id: "b", text: "6,2" },
            { id: "c", text: "6,1" },
            { id: "d", text: "5,3" }
          ],
          points: 2,
          correctAnswer: "b",
          studentAnswer: "c",
          isCorrect: false
        },
        {
          id: "q2",
          number: 2,
          type: "true_false",
          text: "A fração 3/4 é equivalente a 0,75.",
          points: 2,
          correctAnswer: "true",
          studentAnswer: "true",
          isCorrect: true
        },
        {
          id: "q3",
          number: 3,
          type: "essay",
          text: "Explique como você faria para somar as frações 1/4 + 2/3.",
          points: 3,
          studentAnswer: "Uso o mmc para igualar os denominadores",
          manualPoints: 1,
          feedback: "Resposta incompleta. Faltou mostrar o cálculo completo."
        }
      ]
    }
  ];

  const handleSelectEvaluation = (evaluation: SubmittedEvaluation) => {
    setSelectedEvaluation(evaluation);
  };

  const handleQuestionScoreChange = (questionId: string, manualPoints: number) => {
    if (!selectedEvaluation) return;

    const updatedQuestions = selectedEvaluation.questions.map(q => 
      q.id === questionId ? { ...q, manualPoints } : q
    );

    const updatedEvaluation = {
      ...selectedEvaluation,
      questions: updatedQuestions
    };

    setSelectedEvaluation(updatedEvaluation);
  };

  const handleQuestionFeedback = (questionId: string, feedback: string) => {
    if (!selectedEvaluation) return;

    const updatedQuestions = selectedEvaluation.questions.map(q => 
      q.id === questionId ? { ...q, feedback } : q
    );

    const updatedEvaluation = {
      ...selectedEvaluation,
      questions: updatedQuestions
    };

    setSelectedEvaluation(updatedEvaluation);
  };

  const calculateFinalScore = () => {
    if (!selectedEvaluation) return 0;

    let totalScore = 0;
    
    selectedEvaluation.questions.forEach(question => {
      if (question.type === "essay") {
        totalScore += question.manualPoints || 0;
      } else if (question.isCorrect) {
        totalScore += question.points;
      }
    });

    return totalScore;
  };

  const calculatePercentage = () => {
    if (!selectedEvaluation) return 0;

    const totalPossiblePoints = selectedEvaluation.questions.reduce((sum, q) => sum + q.points, 0);
    const finalScore = calculateFinalScore();
    
    return Math.round((finalScore / totalPossiblePoints) * 100);
  };

  const handleSaveCorrection = async () => {
    if (!selectedEvaluation) return;

    try {
      setIsSaving(true);

      const finalScore = calculateFinalScore();
      const percentage = calculatePercentage();

      const correctionData = {
        sessionId: selectedEvaluation.sessionId,
        questions: selectedEvaluation.questions.map(q => ({
          questionId: q.id,
          manualPoints: q.manualPoints,
          feedback: q.feedback
        })),
        finalScore,
        percentage,
        generalFeedback: selectedEvaluation.feedback,
        status: "corrected"
      };

      await api.patch(`/evaluation-results/admin/evaluations/${selectedEvaluation.id}/correct`, correctionData);

      toast({
        title: "Correção salva!",
        description: "A correção foi salva com sucesso. Você pode continuar editando.",
      });

      // Atualizar lista local
      const updatedEvaluations = evaluations.map(e => 
        e.id === selectedEvaluation.id 
          ? { ...e, finalScore, percentage, status: "corrected" as const, correctedAt: new Date().toISOString() }
          : e
      );
      setEvaluations(updatedEvaluations);

    } catch (error) {
      console.error("Erro ao salvar correção:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a correção",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinishCorrection = async () => {
    if (!selectedEvaluation) return;

    try {
      setIsSaving(true);

      const finalScore = calculateFinalScore();
      const percentage = calculatePercentage();

      const correctionData = {
        sessionId: selectedEvaluation.sessionId,
        questions: selectedEvaluation.questions.map(q => ({
          questionId: q.id,
          manualPoints: q.manualPoints,
          feedback: q.feedback
        })),
        finalScore,
        percentage,
        generalFeedback: selectedEvaluation.feedback,
        status: "reviewed"
      };

      await api.patch(`/evaluation-results/admin/evaluations/${selectedEvaluation.id}/finish`, correctionData);

      toast({
        title: "Correção finalizada!",
        description: "A correção foi finalizada e o resultado foi enviado ao aluno.",
      });

      // Atualizar lista local
      const updatedEvaluations = evaluations.map(e => 
        e.id === selectedEvaluation.id 
          ? { ...e, finalScore, percentage, status: "reviewed" as const, correctedAt: new Date().toISOString() }
          : e
      );
      setEvaluations(updatedEvaluations);

      // Voltar para lista
      setSelectedEvaluation(null);

    } catch (error) {
      console.error("Erro ao finalizar correção:", error);
      toast({
        title: "Erro",
        description: "Não foi possível finalizar a correção",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setShowFinishDialog(false);
    }
  };

  const filteredEvaluations = evaluations.filter(evaluation => {
    const matchesStatus = filters.status === "all" || evaluation.status === filters.status;
    const matchesSubject = filters.subject === "all" || evaluation.subject.id === filters.subject;
    const matchesGrade = filters.grade === "all" || evaluation.grade.id === filters.grade;
    const matchesSearch = evaluation.studentName.toLowerCase().includes(filters.search.toLowerCase()) ||
                         evaluation.testTitle.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesStatus && matchesSubject && matchesGrade && matchesSearch;
  });

  const getStatusBadge = (status: SubmittedEvaluation["status"]) => {
    const configs = {
      pending: { label: "Pendente", variant: "destructive" as const, icon: Clock },
      correcting: { label: "Corrigindo", variant: "secondary" as const, icon: Eye },
      corrected: { label: "Corrigida", variant: "default" as const, icon: CheckCircle },
      reviewed: { label: "Finalizada", variant: "default" as const, icon: CheckCircle },
    };

    const config = configs[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Vista de correção detalhada
  if (selectedEvaluation) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setSelectedEvaluation(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Correção de Avaliação</h1>
              <p className="text-muted-foreground">{selectedEvaluation.testTitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSaveCorrection} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
            <Button onClick={() => setShowFinishDialog(true)} disabled={isSaving}>
              <Send className="h-4 w-4 mr-2" />
              Finalizar Correção
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Informações do Aluno */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Informações do Aluno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedEvaluation.studentName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedEvaluation.subject.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedEvaluation.grade.name}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Enviado em:</span>
                  <span className="text-sm">{formatDate(selectedEvaluation.submittedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Duração:</span>
                  <span className="text-sm">{formatDuration(selectedEvaluation.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {getStatusBadge(selectedEvaluation.status)}
                </div>
              </div>

              <Separator />

              {/* Resultado Atual */}
              <div className="space-y-2">
                <h4 className="font-medium">Pontuação</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Nota Final:</span>
                    <span className="text-sm font-medium">
                      {calculateFinalScore()}/{selectedEvaluation.questions.reduce((sum, q) => sum + q.points, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Percentual:</span>
                    <span className="text-sm font-medium">{calculatePercentage()}%</span>
                  </div>
                </div>
              </div>

              {/* Feedback Geral */}
              <div className="space-y-2">
                <Label htmlFor="general-feedback">Feedback Geral</Label>
                <Textarea
                  id="general-feedback"
                  placeholder="Adicione um feedback geral sobre o desempenho do aluno..."
                  value={selectedEvaluation.feedback || ""}
                  onChange={(e) => setSelectedEvaluation(prev => prev ? { ...prev, feedback: e.target.value } : null)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Questões para Correção */}
          <div className="lg:col-span-3 space-y-4">
            {selectedEvaluation.questions.map((question, index) => (
              <Card key={question.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Questão {question.number} ({question.points} ponto{question.points !== 1 ? 's' : ''})
                    </CardTitle>
                    {question.type !== "essay" && (
                      <Badge variant={question.isCorrect ? "default" : "destructive"}>
                        {question.isCorrect ? "Correta" : "Incorreta"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Enunciado da Questão */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Enunciado:</p>
                    <p>{question.text}</p>
                  </div>

                  {/* Opções (para múltipla escolha) */}
                  {question.options && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Opções:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {question.options.map((option, optIndex) => {
                          const letter = String.fromCharCode(65 + optIndex);
                          const isCorrect = option.id === question.correctAnswer;
                          const isSelected = option.id === question.studentAnswer;
                          
                          return (
                            <div
                              key={option.id}
                              className={`p-2 rounded border text-sm ${
                                isSelected && isCorrect ? 'border-green-500 bg-green-50' :
                                isSelected && !isCorrect ? 'border-red-500 bg-red-50' :
                                isCorrect ? 'border-green-300 bg-green-25' :
                                'border-gray-200'
                              }`}
                            >
                              <span className="font-medium">{letter})</span> {option.text}
                              {isCorrect && <CheckCircle className="inline h-4 w-4 ml-2 text-green-600" />}
                              {isSelected && !isCorrect && <XCircle className="inline h-4 w-4 ml-2 text-red-600" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Resposta do Aluno */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Resposta do Aluno:</p>
                    <div className={`p-3 rounded-lg border ${
                      question.type === "essay" ? "border-blue-200 bg-blue-50" :
                      question.isCorrect ? "border-green-200 bg-green-50" : 
                      "border-red-200 bg-red-50"
                    }`}>
                      <p>{question.studentAnswer}</p>
                    </div>
                  </div>

                  {/* Correção Manual (para questões dissertativas) */}
                  {question.type === "essay" && (
                    <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-medium text-yellow-800">Correção Manual Necessária</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`points-${question.id}`}>
                            Pontos (máx: {question.points})
                          </Label>
                          <Input
                            id={`points-${question.id}`}
                            type="number"
                            min="0"
                            max={question.points}
                            step="0.5"
                            value={question.manualPoints || ""}
                            onChange={(e) => handleQuestionScoreChange(question.id, parseFloat(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`feedback-${question.id}`}>Feedback da Questão</Label>
                          <Textarea
                            id={`feedback-${question.id}`}
                            placeholder="Feedback específico para esta questão..."
                            value={question.feedback || ""}
                            onChange={(e) => handleQuestionFeedback(question.id, e.target.value)}
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Dialog de Confirmação */}
        <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalizar Correção</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem certeza que deseja finalizar a correção desta avaliação?
                
                <div className="mt-4 space-y-2">
                  <div><strong>Aluno:</strong> {selectedEvaluation.studentName}</div>
                  <div><strong>Avaliação:</strong> {selectedEvaluation.testTitle}</div>
                  <div><strong>Nota Final:</strong> {calculateFinalScore()}/{selectedEvaluation.questions.reduce((sum, q) => sum + q.points, 0)} ({calculatePercentage()}%)</div>
                </div>

                <div className="mt-4 text-sm text-orange-600">
                  ⚠️ Após finalizar, o resultado será enviado ao aluno e não poderá mais ser editado.
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleFinishCorrection} disabled={isSaving}>
                {isSaving ? "Finalizando..." : "Finalizar Correção"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Vista de lista de avaliações
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Correção de Avaliações</h1>
          <p className="text-muted-foreground">
            Gerencie e corrija as avaliações enviadas pelos alunos
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="correcting">Corrigindo</SelectItem>
                  <SelectItem value="corrected">Corrigidas</SelectItem>
                  <SelectItem value="reviewed">Finalizadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Select value={filters.subject} onValueChange={(value) => setFilters(prev => ({ ...prev, subject: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="math">Matemática</SelectItem>
                  <SelectItem value="port">Português</SelectItem>
                  <SelectItem value="cienc">Ciências</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Série</Label>
              <Select value={filters.grade} onValueChange={(value) => setFilters(prev => ({ ...prev, grade: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="5ano">5º Ano</SelectItem>
                  <SelectItem value="6ano">6º Ano</SelectItem>
                  <SelectItem value="7ano">7º Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Aluno ou avaliação..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {evaluations.filter(e => e.status === 'pending').length}
            </div>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {evaluations.filter(e => e.status === 'correcting').length}
            </div>
            <p className="text-sm text-muted-foreground">Em Correção</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {evaluations.filter(e => e.status === 'corrected').length}
            </div>
            <p className="text-sm text-muted-foreground">Corrigidas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {evaluations.filter(e => e.status === 'reviewed').length}
            </div>
            <p className="text-sm text-muted-foreground">Finalizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Avaliações */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEvaluations.map((evaluation) => (
          <Card key={evaluation.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base truncate">{evaluation.testTitle}</CardTitle>
                {getStatusBadge(evaluation.status)}
              </div>
              <div className="text-sm text-muted-foreground">
                {evaluation.subject.name} • {evaluation.grade.name}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{evaluation.studentName}</span>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Enviado em: {formatDate(evaluation.submittedAt)}
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Questões: {evaluation.answeredQuestions}/{evaluation.totalQuestions}</span>
                <span>Duração: {formatDuration(evaluation.duration)}</span>
              </div>
              
              {evaluation.finalScore !== undefined && (
                <div className="text-sm">
                  <span className="font-medium">Nota: </span>
                  <span className={`font-bold ${evaluation.percentage! >= 70 ? 'text-green-600' : evaluation.percentage! >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {evaluation.finalScore}/{evaluation.questions.reduce((sum, q) => sum + q.points, 0)} ({evaluation.percentage}%)
                  </span>
                </div>
              )}
              
              <Button 
                className="w-full"
                onClick={() => handleSelectEvaluation(evaluation)}
                variant={evaluation.status === 'pending' ? "default" : "outline"}
              >
                {evaluation.status === 'pending' ? "Iniciar Correção" : 
                 evaluation.status === 'correcting' ? "Continuar Correção" :
                 "Ver Correção"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEvaluations.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma avaliação encontrada
            </h3>
            <p className="text-gray-600">
              {filters.status !== "all" || filters.search ? 
                "Tente ajustar os filtros para ver mais resultados." :
                "Ainda não há avaliações enviadas pelos alunos."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 