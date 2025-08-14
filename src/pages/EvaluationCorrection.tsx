import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  Download,
  MessageSquare,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import QuestionPreview from "@/components/evaluations/questions/QuestionPreview";

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
  correctAnswers?: number; // ✅ NOVO: Quantidade de acertos
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
  points: number; // Sempre será 1
  correctAnswer?: string;
  studentAnswer: string;
  isCorrect?: boolean;
  manualPoints?: number; // 0 ou 1 para questões dissertativas
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
  }, [filters]);

  const fetchSubmittedEvaluations = async () => {
    try {
      setIsLoading(true);
      
      // Construir parâmetros de filtro
      const params = new URLSearchParams();
      if (filters.status !== "all") params.append('status', filters.status);
      if (filters.subject !== "all") params.append('subject', filters.subject);
      if (filters.grade !== "all") params.append('grade', filters.grade);
      if (filters.search) params.append('search', filters.search);
      
      // Buscar avaliações enviadas da API real
      const response = await api.get(`/test-sessions/submitted?${params.toString()}`);
      
      if (response.data && Array.isArray(response.data)) {
        // Transformar dados da API para o formato esperado
          const transformedEvaluations = await Promise.all(response.data.map(transformSessionToEvaluation));
        setEvaluations(transformedEvaluations);
      } else {
        setEvaluations([]);
        toast({
          title: "Nenhuma avaliação encontrada",
          description: "Ainda não há avaliações enviadas pelos alunos.",
        });
      }
      
    } catch (error) {
      console.error("Erro ao buscar avaliações enviadas:", error);
      setEvaluations([]);
      toast({
        title: "Erro ao carregar avaliações",
        description: "Não foi possível carregar as avaliações enviadas. Verifique a conexão com o servidor.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Transformar dados da API para o formato esperado
  const transformSessionToEvaluation = async (session: any): Promise<SubmittedEvaluation> => {
    // Transformar respostas de forma assíncrona
    const questions = session.answers ? await Promise.all(session.answers.map(transformAnswerToQuestion)) : [];
    
    // ✅ NOVO: Usar dados calculados pelo backend (agora funcionais)
    const finalScore = session.final_score || 0;
    const percentage = session.percentage || 0;
    const correctAnswers = session.correct_answers || 0;
    
    return {
      id: session.id,
      sessionId: session.id,
      studentId: session.student_id,
      studentName: session.student_name,
      testId: session.test_id,
      testTitle: session.test_title,
      subject: { 
        id: session.subject_id || 'unknown', 
        name: session.subject_name || 'Sem disciplina'
      },
      grade: { 
        id: session.grade_id || 'unknown', 
        name: session.grade_name || 'Sem série'
      },
      submittedAt: session.submitted_at,
      duration: Math.floor((session.time_spent || 0) / 60), // converter segundos para minutos
      status: mapSessionStatus(session.status),
      totalQuestions: session.total_questions || 0,
      answeredQuestions: (session.total_questions || 0) - (session.blank_answers || 0),
      autoScore: session.auto_score,
      manualScore: session.manual_score,
      finalScore: finalScore,
      percentage: percentage,
      correctAnswers: correctAnswers, // ✅ NOVO: Quantidade de acertos
      correctedBy: session.corrected_by,
      correctedAt: session.corrected_at,
      feedback: session.feedback,
      questions: questions
    };
  };

  // Mapear status da sessão
  const mapSessionStatus = (status: string): SubmittedEvaluation["status"] => {
    switch (status) {
      case 'finalizada':
      case 'completed':
      case 'submitted':
        return 'pending';
      case 'correcting':
        return 'correcting';
      case 'corrected':
        return 'corrected';
      case 'reviewed':
      case 'finalized':
        return 'reviewed';
      default:
        return 'pending';
    }
  };

  // Buscar questão completa do banco quando necessário
  const fetchQuestionDetails = async (questionId: string) => {
    try {
      const response = await api.get(`/questions/${questionId}`);
      const questionData = response.data;
      
      // Normalizar alternativas de diferentes formatos possíveis
      let alternatives = questionData.alternatives || questionData.options || [];
      
      // Se não tem alternativas, tentar extrair do correct_answer
      if (!alternatives || alternatives.length === 0) {
    return {
          correctAnswer: questionData.correct_answer || null,
          options: [],
          needsReconstruction: true
        };
      }
      
      // Normalizar cada alternativa
      const normalizedOptions = alternatives.map((alt: any, index: number) => ({
        id: alt.id || `option-${index}`,
        text: alt.text || alt.answer || '',
        isCorrect: alt.isCorrect === true || alt.is_correct === true || alt.correct === true
      }));
      
      // Encontrar alternativa correta
      let correctAnswerId = null;
      const correctAlternative = normalizedOptions.find(alt => alt.isCorrect === true);
      
      if (correctAlternative) {
        correctAnswerId = correctAlternative.id;
      } else {
        // Fallback: usar correct_answer se disponível
        if (questionData.correct_answer) {
          correctAnswerId = questionData.correct_answer;
        }
      }
      
      return {
        correctAnswer: correctAnswerId,
        options: normalizedOptions,
        needsReconstruction: false
      };
    } catch (error) {
      return {
        correctAnswer: null,
        options: [],
        needsReconstruction: false
      };
    }
  };

  // ✅ REMOVIDO: Função isAnswerCorrect não é mais necessária
  // O backend agora calcula automaticamente se a resposta está correta

  // Transformar respostas em questões (todas valem 1 ponto)
  const transformAnswerToQuestion = async (answer: any, index: number): Promise<QuestionWithAnswer> => {
    // ✅ NOVO: Usar dados já calculados pelo backend (agora funcionais)
    const correctAnswer = answer.correct_answer;
    const isCorrect = answer.is_correct === true;
    
    // ✅ NOVO: Usar alternativas já fornecidas pelo backend
    let normalizedOptions = answer.options || [];
    if (Array.isArray(normalizedOptions)) {
      normalizedOptions = normalizedOptions.map((opt: any, idx: number) => ({
        id: opt.id || `option-${idx}`,
        text: opt.text || opt.answer || '',
        isCorrect: opt.isCorrect === true || opt.is_correct === true || opt.correct === true
      }));
    }

    // ✅ NOVO: Fallback apenas se dados estiverem incompletos
    let finalOptions = normalizedOptions;
    if (!correctAnswer || normalizedOptions.length === 0) {
      const questionDetails = await fetchQuestionDetails(answer.question_id);
      
      if (questionDetails.options && questionDetails.options.length > 0) {
        finalOptions = questionDetails.options;
      }
    }

    const questionResult: QuestionWithAnswer = {
      id: answer.question_id,
      number: index + 1,
      type: answer.question_type || 'multiple_choice',
      text: answer.question_text,
      options: finalOptions,
      points: 1,
      correctAnswer: correctAnswer,
      studentAnswer: answer.student_answer,
      isCorrect: isCorrect, // ✅ NOVO: Usar valor calculado pelo backend
      manualPoints: answer.manual_points,
      feedback: answer.feedback
    };
    
    return questionResult;
  };

  const handleSelectEvaluation = (evaluation: SubmittedEvaluation) => {
    setSelectedEvaluation(evaluation);
  };

  // Função para atualizar uma avaliação na lista
  const updateEvaluationInList = (updatedEvaluation: SubmittedEvaluation) => {
    setEvaluations(prev => 
      prev.map(e => e.id === updatedEvaluation.id ? updatedEvaluation : e)
    );
  };

  // ✅ NOVO: Função simplificada - recarregar dados do backend
  const recalculateAllQuestions = () => {
    if (!selectedEvaluation) return;
    
    toast({
      title: "Recarregando dados",
      description: "Recarregando dados do backend...",
    });
    
    // Recarregar dados do backend
    fetchSubmittedEvaluations();
  };

  const handleQuestionScoreChange = (questionId: string, isCorrect: boolean) => {
    if (!selectedEvaluation) return;

    const updatedQuestions = selectedEvaluation.questions.map(q => 
      q.id === questionId ? { ...q, manualPoints: isCorrect ? 1 : 0, isCorrect } : q
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

  // ✅ CORRIGIDO: Função para calcular nota final corretamente
  const calculateFinalScore = () => {
    if (!selectedEvaluation) return 0;

    // Calcular baseado nas questões corretas (cada questão vale 1 ponto)
    const correctCount = selectedEvaluation.questions.filter(q => {
      if (q.type === "essay") {
        return q.manualPoints === 1;
      } else {
        return q.isCorrect === true;
      }
    }).length;

    return correctCount;
  };

  // ✅ CORRIGIDO: Função para calcular porcentagem corretamente
  const calculatePercentage = () => {
    if (!selectedEvaluation || selectedEvaluation.questions.length === 0) return 0;

    const finalScore = calculateFinalScore();
    const percentage = Math.round((finalScore / selectedEvaluation.questions.length) * 100);
    
    return percentage;
  };

  const handleSaveCorrection = async () => {
    if (!selectedEvaluation) return;

    try {
      setIsSaving(true);

      const finalScore = calculateFinalScore();
      const percentage = calculatePercentage();

      const correctionData = {
        questions: selectedEvaluation.questions.map(q => ({
          question_id: q.id,
          is_correct: q.type === "essay" ? (q.manualPoints === 1) : q.isCorrect,
          manual_points: q.type === "essay" ? q.manualPoints : (q.isCorrect ? 1 : 0),
          feedback: q.feedback
        })),
        final_score: finalScore,
        percentage,
        general_feedback: selectedEvaluation.feedback,
        status: "corrected"
      };

      await api.post(`/test-session/${selectedEvaluation.sessionId}/correct`, correctionData);

      toast({
        title: "Correção salva!",
        description: "A correção foi salva com sucesso. Você pode continuar editando.",
      });

      // Atualizar lista local
      const updatedEvaluation = {
        ...selectedEvaluation,
        finalScore,
        percentage,
        status: "corrected" as const,
        correctedAt: new Date().toISOString()
      };
      updateEvaluationInList(updatedEvaluation);

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
        questions: selectedEvaluation.questions.map(q => ({
          question_id: q.id,
          is_correct: q.type === "essay" ? (q.manualPoints === 1) : q.isCorrect,
          manual_points: q.type === "essay" ? q.manualPoints : (q.isCorrect ? 1 : 0),
          feedback: q.feedback
        })),
        final_score: finalScore,
        percentage,
        general_feedback: selectedEvaluation.feedback,
        status: "reviewed"
      };

      await api.post(`/test-session/${selectedEvaluation.sessionId}/finalize`, correctionData);

      toast({
        title: "Correção finalizada!",
        description: "A correção foi finalizada e o resultado foi enviado ao aluno.",
      });

      // Atualizar lista local
      const updatedEvaluation = {
        ...selectedEvaluation,
        finalScore,
        percentage,
        status: "reviewed" as const,
        correctedAt: new Date().toISOString()
      };
      updateEvaluationInList(updatedEvaluation);

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

  // ✅ CORRIGIDO: Função para calcular pontuação de exibição corretamente
  const calculateDisplayScore = (evaluation: SubmittedEvaluation) => {
    // Calcular baseado nas questões corretas (cada questão vale 1 ponto)
    const correctCount = evaluation.questions.filter(q => {
      if (q.type === "essay") {
        return q.manualPoints === 1;
      } else {
        return q.isCorrect === true;
      }
    }).length;

    const totalQuestions = evaluation.questions.length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return {
      score: correctCount,
      percentage: percentage
    };
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
            <Button variant="outline" size="sm" onClick={() => {
              // Atualizar a avaliação na lista antes de voltar
              if (selectedEvaluation) {
                updateEvaluationInList(selectedEvaluation);
              }
              setSelectedEvaluation(null);
            }}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Correção de Avaliação</h1>
              <p className="text-muted-foreground">{selectedEvaluation.testTitle}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={recalculateAllQuestions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
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
                <h4 className="font-medium flex items-center gap-2">
                  Pontuação
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    ✅ Backend
                  </Badge>
                </h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Nota Final:</span>
                    <span className="text-sm font-medium">
                      {calculateFinalScore()}/{selectedEvaluation.questions.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Percentual:</span>
                    <span className={`text-sm font-medium ${calculatePercentage() >= 70 ? 'text-green-600' : calculatePercentage() >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {calculatePercentage()}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Corretas:</span>
                    <span className="text-sm font-medium text-green-600">
                      {selectedEvaluation.correctAnswers || selectedEvaluation.questions.filter(q => q.type === "essay" ? q.manualPoints === 1 : q.isCorrect).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Incorretas:</span>
                    <span className="text-sm font-medium text-red-600">
                      {(selectedEvaluation.totalQuestions || selectedEvaluation.questions.length) - (selectedEvaluation.correctAnswers || selectedEvaluation.questions.filter(q => q.type === "essay" ? q.manualPoints === 1 : q.isCorrect).length)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ✅ NOVO: Feedback Geral Melhorado */}
              <div className="space-y-2">
                <Label htmlFor="general-feedback" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Feedback Geral
                </Label>
                {/* Sugestões de feedback baseadas na performance */}
                {!selectedEvaluation.feedback && (
                  <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border-l-4 border-blue-400">
                    <p className="font-medium">💡 Sugestões de feedback:</p>
                    {calculatePercentage() >= 70 && (
                      <p>• Parabéns pelo excelente desempenho! Continue assim!</p>
                    )}
                    {calculatePercentage() >= 50 && calculatePercentage() < 70 && (
                      <p>• Bom trabalho! Com um pouco mais de estudo você pode melhorar ainda mais.</p>
                    )}
                    {calculatePercentage() < 50 && (
                      <p>• Recomendo revisar os conteúdos e solicitar ajuda se necessário.</p>
                    )}
                  </div>
                )}
                <Textarea
                  id="general-feedback"
                  placeholder="Escreva um feedback personalizado para o aluno sobre seu desempenho nesta avaliação..."
                  value={selectedEvaluation.feedback || ""}
                  onChange={(e) => setSelectedEvaluation(prev => prev ? { ...prev, feedback: e.target.value } : null)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Questões para Correção */}
          <div className="lg:col-span-3 space-y-4">
            {selectedEvaluation.questions.map((question, index) => {
              // NOVO: Matching robusto para alternativas
              let correctOption = null;
              let selectedOption = null;
              let isCorrect = question.isCorrect === true;

              if (question.type !== "essay" && question.options && question.options.length > 0) {
                // Encontrar alternativa correta (id, letra, índice, texto)
                if (question.correctAnswer) {
                  // 1. Por id
                  correctOption = question.options.find(opt => String(opt.id) === String(question.correctAnswer));
                  // 2. Por letra
                  if (!correctOption && question.correctAnswer.length === 1) {
                    const idx = question.correctAnswer.toUpperCase().charCodeAt(0) - 65;
                    if (idx >= 0 && idx < question.options.length) {
                      correctOption = question.options[idx];
                    }
                  }
                  // 3. Por índice numérico
                  if (!correctOption && !isNaN(Number(question.correctAnswer))) {
                    const idx = Number(question.correctAnswer);
                    if (idx >= 0 && idx < question.options.length) {
                      correctOption = question.options[idx];
                    }
                  }
                  // 4. Por texto
                  if (!correctOption) {
                    correctOption = question.options.find(opt => opt.text === question.correctAnswer);
                  }
                  // 5. Por flag isCorrect
                  if (!correctOption) {
                    correctOption = question.options.find(opt => opt.isCorrect === true);
                  }
                } else {
                  // Fallback: por flag isCorrect
                  correctOption = question.options.find(opt => opt.isCorrect === true);
                }

                // ✅ NOVO: Validar se há múltiplas alternativas corretas
                const correctOptions = question.options.filter(opt => opt.isCorrect === true);
                if (correctOptions.length > 1) {
                  console.warn(`⚠️ Question ${question.id} has ${correctOptions.length} correct options:`, 
                    correctOptions.map((opt, idx) => `${String.fromCharCode(65 + question.options.indexOf(opt))}(${opt.id})`).join(', ')
                  );
                  // Usar a primeira alternativa correta encontrada
                  if (!correctOption && correctOptions.length > 0) {
                    correctOption = correctOptions[0];
                  }
                }

                // Encontrar alternativa selecionada pelo aluno (id, letra, índice, texto)
                if (question.studentAnswer) {
                  // 1. Por id
                  selectedOption = question.options.find(opt => String(opt.id) === String(question.studentAnswer));
                  // 2. Por letra
                  if (!selectedOption && question.studentAnswer.length === 1) {
                    const idx = question.studentAnswer.toUpperCase().charCodeAt(0) - 65;
                    if (idx >= 0 && idx < question.options.length) {
                      selectedOption = question.options[idx];
                    }
                  }
                  // 3. Por índice numérico
                  if (!selectedOption && !isNaN(Number(question.studentAnswer))) {
                    const idx = Number(question.studentAnswer);
                    if (idx >= 0 && idx < question.options.length) {
                      selectedOption = question.options[idx];
                    }
                  }
                  // 4. Por texto
                  if (!selectedOption) {
                    selectedOption = question.options.find(opt => opt.text === question.studentAnswer);
                  }
                }

                // ✅ NOVO: Fallback para determinar se está correto quando backend retorna dados inconsistentes
                if (selectedOption && correctOption && selectedOption.id === correctOption.id) {
                  // Se as opções são iguais, mas o backend diz que está errado, usar lógica local
                  if (!isCorrect) {
                    isCorrect = true;
                  }
                }
              }

              return (
                <Card key={question.id} className={`border-l-4 ${isCorrect ? 'border-l-green-500' : question.type === "essay" ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                      Questão {question.number} (1 ponto)
                        {question.type !== "essay" && (
                          isCorrect ? 
                            <CheckCircle className="h-5 w-5 text-green-600" /> : 
                            <XCircle className="h-5 w-5 text-red-600" />
                        )}
                    </CardTitle>
                    {question.type !== "essay" && (
                        <Badge variant={isCorrect ? "default" : "destructive"} className={isCorrect ? "bg-green-600" : "bg-red-600"}>
                          {isCorrect ? "Correta" : "Incorreta"}
                        </Badge>
                      )}
                      {question.type === "essay" && (
                        <Badge variant="secondary">
                          Dissertativa - {question.manualPoints === 1 ? "Correta" : question.manualPoints === 0 ? "Incorreta" : "Aguardando Correção"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Enunciado, imagem e segundo enunciado usando QuestionPreview */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                      <QuestionPreview question={{
                        ...question,
                        // Garante compatibilidade de campos para o componente
                        options: question.options || [],
                        secondStatement: question.secondStatement || question["second_statement"] || "",
                        // Adicione outros campos se necessário
                      }} />
                  </div>

                  {/* Opções (para múltipla escolha) */}
                  {question.options && question.options.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Opções:</p>
                      <div className="grid grid-cols-1 gap-2">
                        {question.options.map((option, optIndex) => {
                          const letter = String.fromCharCode(65 + optIndex);
                            const isOptionCorrect = correctOption && option.id === correctOption.id;
                            const isOptionSelected = selectedOption && option.id === selectedOption.id;
                            // Se for selecionada e correta, verde forte
                            // Se for selecionada e incorreta, vermelho
                            // Se for só correta, verde claro
                            // Senão, padrão
                            let optionClass = '';
                            if (isOptionSelected && isOptionCorrect) {
                              optionClass = 'border-green-500 bg-green-50';
                            } else if (isOptionSelected && !isOptionCorrect) {
                              optionClass = 'border-red-500 bg-red-50';
                            } else if (isOptionCorrect) {
                              optionClass = 'border-green-300 bg-green-25';
                            } else {
                              optionClass = 'border-gray-200';
                            }
                          return (
                            <div
                              key={option.id}
                                className={`p-2 rounded border text-sm ${optionClass}`}
                            >
                              <span className="font-medium">{letter})</span> {option.text}
                                {isOptionCorrect && <CheckCircle className="inline h-4 w-4 ml-2 text-green-600" />}
                                {isOptionSelected && !isOptionCorrect && <XCircle className="inline h-4 w-4 ml-2 text-red-600" />}
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
                        isCorrect ? "border-green-200 bg-green-50" :
                      "border-red-200 bg-red-50"
                    }`}>
                        {selectedOption ? (
                          <div className="flex items-start gap-2">
                            <span className="font-semibold">
                              {String.fromCharCode(65 + question.options.indexOf(selectedOption))})
                            </span>
                            <span>{selectedOption.text}</span>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">
                            {question.studentAnswer ? `Resposta: ${question.studentAnswer}` : "Não respondida"}
                          </p>
                        )}
                    </div>
                  </div>

                    {/* ✅ NOVO: Mostrar gabarito para questões incorretas */}
                    {question.type !== "essay" && !isCorrect && correctOption && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Resposta Correta:</p>
                        <div className="p-3 rounded-lg border border-green-200 bg-green-50">
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-green-700">
                              {String.fromCharCode(65 + question.options.indexOf(correctOption))})
                            </span>
                            <span className="text-green-700">{correctOption.text}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ✅ NOVO: Informações de Debug (apenas em desenvolvimento) */}
                    {process.env.NODE_ENV === 'development' && (
                      <details className="text-xs bg-gray-50 p-2 rounded border">
                        <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800">
                          🔧 Debug Info (Dev)
                        </summary>
                        <div className="mt-2 space-y-1 text-gray-600">
                          <p><strong>Question ID:</strong> {question.id}</p>
                          <p><strong>Backend isCorrect:</strong> {String(question.isCorrect)}</p>
                          <p><strong>Correct Answer:</strong> {question.correctAnswer || 'null'}</p>
                          <p><strong>Student Answer:</strong> {question.studentAnswer || 'null'}</p>
                          <p><strong>Correct Option Found:</strong> {correctOption ? 'Yes' : 'No'}</p>
                          <p><strong>Selected Option Found:</strong> {selectedOption ? 'Yes' : 'No'}</p>
                          {correctOption && (
                            <p><strong>Correct Option:</strong> {String.fromCharCode(65 + question.options.indexOf(correctOption))} - {correctOption.text}</p>
                          )}
                          {selectedOption && (
                            <p><strong>Selected Option:</strong> {String.fromCharCode(65 + question.options.indexOf(selectedOption))} - {selectedOption.text}</p>
                          )}
                          {selectedOption && correctOption && (
                            <p><strong>Options Match:</strong> {selectedOption.id === correctOption.id ? 'Yes' : 'No'}</p>
                          )}
                          <p><strong>Total Options:</strong> {question.options.length}</p>
                          <p><strong>Options with isCorrect=true:</strong> {question.options.filter(opt => opt.isCorrect).map((opt, idx) => `${String.fromCharCode(65 + question.options.indexOf(opt))}(${opt.id})`).join(', ') || 'None'}</p>
                          <p><strong>Selected Option Index:</strong> {selectedOption ? question.options.indexOf(selectedOption) : 'N/A'}</p>
                          <p><strong>Correct Option Index:</strong> {correctOption ? question.options.indexOf(correctOption) : 'N/A'}</p>
                          {question.options.filter(opt => opt.isCorrect).length > 1 && (
                            <p className="text-orange-600 font-medium">⚠️ ATENÇÃO: {question.options.filter(opt => opt.isCorrect).length} alternativas marcadas como corretas!</p>
                          )}
                          {question.options.length > 5 && (
                            <p className="text-red-600 font-medium">🚨 DADOS CORROMPIDOS: {question.options.length} alternativas (normal: 4-5)!</p>
                          )}
                          <details className="text-xs bg-red-50 p-2 rounded border border-red-200">
                            <summary className="cursor-pointer font-medium text-red-700">🔍 Todas as alternativas</summary>
                            <div className="mt-2 space-y-1">
                              {question.options.map((opt, idx) => (
                                <div key={opt.id} className={`p-1 rounded ${opt.isCorrect ? 'bg-green-100' : 'bg-gray-50'}`}>
                                  <strong>{String.fromCharCode(65 + idx)}:</strong> {opt.text.substring(0, 50)}... 
                                  <span className="text-gray-500">({opt.id}) {opt.isCorrect ? '✓' : '✗'}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      </details>
                    )}

                  {/* Correção Manual (apenas para questões dissertativas) */}
                  {question.type === "essay" && (
                    <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-medium text-yellow-800">Correção Manual Necessária</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Avaliação da Resposta</Label>
                          <div className="flex gap-2">
                            <Button
                              variant={question.manualPoints === 1 ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleQuestionScoreChange(question.id, true)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Correta (1 ponto)
                            </Button>
                            <Button
                              variant={question.manualPoints === 0 ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => handleQuestionScoreChange(question.id, false)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Incorreta (0 pontos)
                            </Button>
                          </div>
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
              );
            })}
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
                  <div><strong>Nota Final:</strong> {calculateFinalScore()}/{selectedEvaluation.questions.length} ({calculatePercentage()}%)</div>
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
          <Button variant="outline" onClick={fetchSubmittedEvaluations}>
            <Download className="h-4 w-4 mr-2" />
            Atualizar Lista
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
              
                <div className="text-sm">
                  <span className="font-medium">Nota: </span>
                {(() => {
                  const displayScore = calculateDisplayScore(evaluation);
                  return (
                    <span className={`font-bold ${displayScore.percentage >= 70 ? 'text-green-600' : displayScore.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {displayScore.score}/{evaluation.questions.length} ({displayScore.percentage}%)
                  </span>
                  );
                })()}
                </div>
              
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