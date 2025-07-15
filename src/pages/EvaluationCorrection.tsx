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
  MessageSquare
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
      finalScore: session.final_score,
      percentage: session.percentage,
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
      console.log('🔍 Buscando detalhes da questão:', questionId);
      const response = await api.get(`/questions/${questionId}`);
      const questionData = response.data;
      
      console.log('📋 Questão encontrada:', {
        id: questionData.id,
        alternativesCount: questionData.alternatives?.length,
        alternatives: questionData.alternatives?.map((alt: any) => ({
          id: alt.id,
          text: alt.text,
          isCorrect: alt.isCorrect
        })),
        // Log completo para debug
        fullResponse: questionData
      });
      
      // Encontrar a alternativa correta
      let correctAnswerId = null;
      if (questionData.alternatives && Array.isArray(questionData.alternatives)) {
        const correctAlternative = questionData.alternatives.find((alt: any) => 
          alt.isCorrect === true || alt.is_correct === true || alt.correct === true
        );
        if (correctAlternative) {
          correctAnswerId = correctAlternative.id;
          console.log('✅ Alternativa correta encontrada:', correctAlternative.text);
        } else {
          console.log('❌ Nenhuma alternativa marcada como correta na API');
        }
      } else {
        console.log('❌ Nenhuma alternativa encontrada na questão');
        console.log('🔍 Campos disponíveis na questão:', Object.keys(questionData));
      }
      
      return {
        correctAnswer: correctAnswerId,
        options: questionData.alternatives || questionData.options || []
      };
    } catch (error) {
      console.error('❌ Erro ao buscar questão:', error);
      return {
        correctAnswer: null,
        options: []
      };
    }
  };

  // Transformar respostas em questões (todas valem 1 ponto)
  const transformAnswerToQuestion = async (answer: any, index: number): Promise<QuestionWithAnswer> => {
    // Se correctAnswer for null, tentar encontrar a alternativa correta baseada no campo isCorrect
    let correctAnswer = answer.correct_answer;
    
    console.log('🔄 Transformando questão:', answer.question_id, '| correctAnswer:', answer.correct_answer);
    
    // Normalizar opções se necessário
    let normalizedOptions = answer.options || [];
    if (Array.isArray(normalizedOptions)) {
      normalizedOptions = normalizedOptions.map((opt: any) => {
        // Verificar diferentes possíveis nomes do campo isCorrect
        const isCorrect = opt.isCorrect === true || 
                         opt.is_correct === true || 
                         opt.correct === true ||
                         opt.isCorrect === 'true' ||
                         opt.is_correct === 'true' ||
                         opt.correct === 'true';
        
        // Log reduzido para evitar spam
        
        return {
          id: opt.id || `option-${normalizedOptions.indexOf(opt)}`,
          text: opt.text || opt.answer || '',
          isCorrect: isCorrect
        };
      });
    }
    
          // Se ainda não temos correctAnswer, buscar da questão completa
      if (!correctAnswer) {
        console.log('🔄 Buscando detalhes da questão do banco...');
        const questionDetails = await fetchQuestionDetails(answer.question_id);
        if (questionDetails && questionDetails.correctAnswer) {
          correctAnswer = questionDetails.correctAnswer;
          if (questionDetails.options && questionDetails.options.length > 0) {
            normalizedOptions = questionDetails.options.map((opt: any) => ({
              id: opt.id || `option-${questionDetails.options.indexOf(opt)}`,
              text: opt.text || opt.answer || '',
              isCorrect: opt.isCorrect === true || opt.is_correct === true || opt.correct === true
            }));
          }
          console.log('✅ Detalhes da questão obtidos:', { correctAnswer, optionsCount: normalizedOptions.length });
        } else {
          console.log('❌ Não foi possível obter detalhes da questão ou alternativa correta');
          
          // 🔧 SOLUÇÃO TEMPORÁRIA: Usar dados das opções originais se disponíveis
          if (answer.options && answer.options.length > 0) {
            console.log('🔄 Usando opções originais como fallback...');
            normalizedOptions = answer.options.map((opt: any, index: number) => ({
              id: opt.id || `option-${index}`,
              text: opt.text || opt.answer || '',
              isCorrect: false // Será calculado baseado no correctAnswer
            }));
            
            // Se temos correctAnswer como texto, tentar encontrar a alternativa correspondente
            if (answer.correct_answer && typeof answer.correct_answer === 'string') {
              const correctOption = normalizedOptions.find((opt: any) => 
                opt.text && opt.text.trim() === answer.correct_answer.trim()
              );
              if (correctOption) {
                correctOption.isCorrect = true;
                correctAnswer = correctOption.id;
                console.log('✅ Alternativa correta encontrada por texto:', correctOption.text);
              }
            }
          }
        }
      } else if (normalizedOptions.length > 0) {
        // Se temos correctAnswer mas não temos isCorrect nas opções, buscar da questão
        const hasCorrectOption = normalizedOptions.some((opt: any) => opt.isCorrect === true);
        if (!hasCorrectOption) {
          console.log('🔄 Buscando detalhes da questão para marcar alternativas corretas...');
          const questionDetails = await fetchQuestionDetails(answer.question_id);
          if (questionDetails && questionDetails.options && questionDetails.options.length > 0) {
            normalizedOptions = questionDetails.options.map((opt: any) => ({
              id: opt.id || `option-${questionDetails.options.indexOf(opt)}`,
              text: opt.text || opt.answer || '',
              isCorrect: opt.isCorrect === true || opt.is_correct === true || opt.correct === true
            }));
          }
        }
      }

    const result = {
      id: answer.question_id,
      number: index + 1,
      type: answer.question_type || 'multiple_choice',
      text: answer.question_text,
      options: normalizedOptions,
      points: 1, // Todas as questões valem 1 ponto
      correctAnswer: correctAnswer,
      studentAnswer: answer.student_answer,
      isCorrect: answer.is_correct,
      manualPoints: answer.manual_points,
      feedback: answer.feedback
    };
    
    console.log('📝 Questão transformada:', {
      id: result.id,
      correctAnswer: result.correctAnswer,
      studentAnswer: result.studentAnswer,
      hasOptions: !!result.options,
      optionsCount: result.options?.length
    });
    
    return result;
  };

  const handleSelectEvaluation = (evaluation: SubmittedEvaluation) => {
    setSelectedEvaluation(evaluation);
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

  const calculateFinalScore = () => {
    if (!selectedEvaluation) return 0;

    let totalScore = 0;
    
    selectedEvaluation.questions.forEach(question => {
      // Correção automática para objetivas
      if (question.type === "essay") {
        // Para questões dissertativas, usar pontuação manual (0 ou 1)
        totalScore += question.manualPoints || 0;
      } else {
        // Para questões de múltipla escolha
        let isCorrect = false;
        
        // Log reduzido para evitar spam
        
        // Se já temos isCorrect calculado, usar ele
        if (question.isCorrect !== undefined && question.isCorrect !== null) {
          isCorrect = question.isCorrect;
          console.log('✅ Usando isCorrect pré-calculado:', isCorrect);
        } else if (question.correctAnswer && question.options && question.options.length > 0) {
          // Tentar encontrar a alternativa correta
          const correctOption = question.options.find(opt => opt.id === question.correctAnswer);
          let selectedOption = question.options.find(opt => String(opt.id) === String(question.studentAnswer))
            || question.options.find(opt => String(opt.id).toLowerCase() === String(question.studentAnswer).toLowerCase())
            || question.options.find(opt => String(question.studentAnswer).includes(opt.id));
          
          // Fallback para índice numérico (option-0, option-1, etc.)
          if (!selectedOption && typeof question.studentAnswer === 'string' && question.studentAnswer.startsWith('option-')) {
            const idx = parseInt(question.studentAnswer.replace('option-', ''), 10);
            if (!isNaN(idx) && question.options && question.options.length > idx) {
              selectedOption = question.options[idx];
            }
          }
          
          // Comparar as alternativas
          isCorrect = selectedOption && correctOption && selectedOption.id === correctOption.id;
          console.log('✅ Comparando alternativas:', { 
            selectedOption: selectedOption?.text, 
            correctOption: correctOption?.text, 
            isCorrect 
          });
        } else if (question.options && question.options.length > 0) {
          // Último fallback: procurar alternativa marcada como correta
          const correctOption = question.options.find(opt => opt.isCorrect === true);
          let selectedOption = question.options.find(opt => String(opt.id) === String(question.studentAnswer))
            || question.options.find(opt => String(opt.id).toLowerCase() === String(question.studentAnswer).toLowerCase());
          
          // Fallback para índice numérico
          if (!selectedOption && typeof question.studentAnswer === 'string' && question.studentAnswer.startsWith('option-')) {
            const idx = parseInt(question.studentAnswer.replace('option-', ''), 10);
            if (!isNaN(idx) && question.options && question.options.length > idx) {
              selectedOption = question.options[idx];
            }
          }
          
          isCorrect = selectedOption && correctOption && selectedOption.id === correctOption.id;
          console.log('🔄 Fallback - alternativa correta:', { 
            correctOption: correctOption?.text, 
            selectedOption: selectedOption?.text, 
            isCorrect 
          });
        } else {
          console.log('❌ Nenhuma estratégia funcionou - sem opções disponíveis');
        }
        
        // Atualizar o isCorrect na questão para evitar recálculos
        if (question.isCorrect === undefined || question.isCorrect === null) {
          question.isCorrect = isCorrect;
        }
        
        if (isCorrect) {
          console.log('✔️ Questão correta:', question.id);
          totalScore += 1;
        } else if (question.correctAnswer) {
          console.log('❌ Questão errada:', question.id, '| correctAnswer:', question.correctAnswer, '| studentAnswer:', question.studentAnswer);
        } else {
          console.log('⚠️ Questão sem correção automática:', question.id, '| studentAnswer:', question.studentAnswer);
        }
      }
    });

    return totalScore;
  };

  const calculatePercentage = () => {
    if (!selectedEvaluation) return 0;

    const totalPossiblePoints = selectedEvaluation.questions.length; // Cada questão vale 1 ponto
    const finalScore = calculateFinalScore();
    
    return totalPossiblePoints > 0 ? Math.round((finalScore / totalPossiblePoints) * 100) : 0;
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
                      {calculateFinalScore()}/{selectedEvaluation.questions.length}
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
            {selectedEvaluation.questions.map((question, index) => {
              // Encontrar alternativa correta e alternativa selecionada usando lógica robusta
              let correctOption = null;
              let selectedOption = null;
              let isCorrect = false;

              if (question.type !== "essay" && question.options && question.options.length > 0) {
                // Tentar encontrar a alternativa correta
                if (question.correctAnswer) {
                  correctOption = question.options.find(opt => opt.id === question.correctAnswer);
                } else {
                  // Fallback: procurar alternativa marcada como correta
                  correctOption = question.options.find(opt => opt.isCorrect === true);
                }

                // Encontrar alternativa selecionada
                selectedOption = question.options.find(opt => String(opt.id) === String(question.studentAnswer))
                  || question.options.find(opt => String(opt.id).toLowerCase() === String(question.studentAnswer).toLowerCase())
                  || question.options.find(opt => String(question.studentAnswer).includes(opt.id));
                
                // Fallback para índice numérico (option-0, option-1, etc.)
                if (!selectedOption && typeof question.studentAnswer === 'string' && question.studentAnswer.startsWith('option-')) {
                  const idx = parseInt(question.studentAnswer.replace('option-', ''), 10);
                  if (!isNaN(idx) && question.options && question.options.length > idx) {
                    selectedOption = question.options[idx];
                  }
                }

                // Determinar se está correto
                if (question.isCorrect !== undefined) {
                  isCorrect = question.isCorrect;
                } else {
                  isCorrect = selectedOption && correctOption && selectedOption.id === correctOption.id;
                }
              }

              return (
                <Card key={question.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Questão {question.number} (1 ponto)
                      </CardTitle>
                      {question.type !== "essay" && (
                        <Badge variant={isCorrect ? "default" : "destructive"}>
                          {isCorrect ? "Correta" : "Incorreta"}
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
                        <p>{selectedOption
                          ? `${String.fromCharCode(65 + question.options.indexOf(selectedOption))}) ${selectedOption.text}`
                          : (question.studentAnswer || "Não respondida")}
                        </p>
                      </div>
                    </div>

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
              
              {evaluation.finalScore !== undefined && (
                <div className="text-sm">
                  <span className="font-medium">Nota: </span>
                  <span className={`font-bold ${evaluation.percentage! >= 70 ? 'text-green-600' : evaluation.percentage! >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {evaluation.finalScore}/{evaluation.questions.length} ({evaluation.percentage}%)
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