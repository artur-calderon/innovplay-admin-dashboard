import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClipboardCheck,
  Save,
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
  AlertTriangle,
  Upload,
  Download,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PhysicalEvaluation {
  id: string;
  title: string;
  subject: { id: string; name: string };
  grade: { id: string; name: string };
  school: { id: string; name: string };
  totalQuestions: number;
  totalStudents: number;
  correctedStudents: number;
  pendingStudents: number;
  appliedAt: string;
  status: "pending" | "in_progress" | "completed";
  answerKey: { questionId: string; correctAnswer: string; points: number }[];
}

interface StudentAnswer {
  id: string;
  studentId: string;
  studentName: string;
  evaluationId: string;
  answers: { questionId: string; answer: string; isCorrect?: boolean; points?: number }[];
  totalScore?: number;
  percentage?: number;
  status: "pending" | "corrected" | "reviewed";
  correctedAt?: string;
  correctedBy?: string;
  observations?: string;
}

interface CorrectionSession {
  evaluationId: string;
  currentStudentIndex: number;
  totalStudents: number;
  correctedCount: number;
  autoSave: boolean;
}

interface PhysicalEvaluationCorrectionProps {
  evaluationId?: string;
  onBack?: () => void;
}

export default function PhysicalEvaluationCorrection({ 
  evaluationId, 
  onBack 
}: PhysicalEvaluationCorrectionProps) {
  const [evaluation, setEvaluation] = useState<PhysicalEvaluation | null>(null);
  const [students, setStudents] = useState<StudentAnswer[]>([]);
  const [currentStudent, setCurrentStudent] = useState<StudentAnswer | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [session, setSession] = useState<CorrectionSession | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showPreview, setShowPreview] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  const { toast } = useToast();

  useEffect(() => {
    if (evaluationId) {
      loadEvaluation();
      loadCorrectionSession();
    }
  }, [evaluationId]);

  // Auto-save a cada 30 segundos
  useEffect(() => {
    if (autoSaveEnabled && currentStudent && currentStudent.status === "pending") {
      const interval = setInterval(() => {
        handleSaveProgress();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [currentStudent, autoSaveEnabled]);

  const loadEvaluation = async () => {
    if (!evaluationId) return;

    try {
      setIsLoading(true);
      const [evalRes, studentsRes] = await Promise.all([
        api.get(`/physical-evaluations/${evaluationId}`),
        api.get(`/physical-evaluations/${evaluationId}/students`)
      ]);

      setEvaluation(evalRes.data);
      setStudents(studentsRes.data);
      
      // Definir estudante atual
      const pending = studentsRes.data.filter((s: StudentAnswer) => s.status === "pending");
      if (pending.length > 0) {
        setCurrentStudent(pending[0]);
        setCurrentIndex(studentsRes.data.indexOf(pending[0]));
      } else if (studentsRes.data.length > 0) {
        setCurrentStudent(studentsRes.data[0]);
        setCurrentIndex(0);
      }

    } catch (error) {
      console.error("Erro ao carregar avaliação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a avaliação",
        variant: "destructive",
      });
      
      // Dados mock para desenvolvimento
      setEvaluation(getMockEvaluation());
      setStudents(getMockStudents());
      setCurrentStudent(getMockStudents()[0]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCorrectionSession = () => {
    if (!evaluationId) return;
    
    const savedSession = localStorage.getItem(`correction_session_${evaluationId}`);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setSession(session);
        setCurrentIndex(session.currentStudentIndex);
        setAutoSaveEnabled(session.autoSave);
      } catch (error) {
        localStorage.removeItem(`correction_session_${evaluationId}`);
      }
    }
  };

  const saveCorrectionSession = (data: Partial<CorrectionSession>) => {
    if (!evaluationId) return;
    
    const sessionData: CorrectionSession = {
      evaluationId,
      currentStudentIndex: currentIndex,
      totalStudents: students.length,
      correctedCount: students.filter(s => s.status === "corrected").length,
      autoSave: autoSaveEnabled,
      ...data
    };
    
    localStorage.setItem(`correction_session_${evaluationId}`, JSON.stringify(sessionData));
    setSession(sessionData);
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    if (!currentStudent || !evaluation) return;

    const updatedAnswers = currentStudent.answers.map(a => 
      a.questionId === questionId 
        ? { 
            ...a, 
            answer,
            isCorrect: evaluation.answerKey.find(key => key.questionId === questionId)?.correctAnswer === answer,
            points: evaluation.answerKey.find(key => key.questionId === questionId)?.correctAnswer === answer 
              ? evaluation.answerKey.find(key => key.questionId === questionId)?.points || 1 
              : 0
          }
        : a
    );

    const totalScore = updatedAnswers.reduce((sum, a) => sum + (a.points || 0), 0);
    const maxScore = evaluation.answerKey.reduce((sum, key) => sum + key.points, 0);
    const percentage = Math.round((totalScore / maxScore) * 100);

    setCurrentStudent({
      ...currentStudent,
      answers: updatedAnswers,
      totalScore,
      percentage
    });
  };

  const handleObservationChange = (observations: string) => {
    if (!currentStudent) return;
    setCurrentStudent({ ...currentStudent, observations });
  };

  const handleSaveProgress = async () => {
    if (!currentStudent || !evaluation) return;

    try {
      setIsSaving(true);
      await api.patch(`/physical-evaluations/students/${currentStudent.id}`, {
        answers: currentStudent.answers,
        totalScore: currentStudent.totalScore,
        percentage: currentStudent.percentage,
        observations: currentStudent.observations,
        status: "pending" // Ainda não finalizada
      });

      toast({
        title: "Progresso salvo",
        description: "Alterações salvas automaticamente",
        duration: 2000,
      });

    } catch (error) {
      console.error("Erro ao salvar progresso:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinishCorrection = async () => {
    if (!currentStudent || !evaluation) return;

    try {
      setIsSaving(true);
      await api.patch(`/physical-evaluations/students/${currentStudent.id}`, {
        answers: currentStudent.answers,
        totalScore: currentStudent.totalScore,
        percentage: currentStudent.percentage,
        observations: currentStudent.observations,
        status: "corrected",
        correctedAt: new Date().toISOString(),
        correctedBy: "current_user_id" // Substituir pelo ID do usuário logado
      });

      // Atualizar lista local
      const updatedStudents = students.map(s => 
        s.id === currentStudent.id 
          ? { ...currentStudent, status: "corrected" as const, correctedAt: new Date().toISOString() }
          : s
      );
      setStudents(updatedStudents);

      toast({
        title: "Correção finalizada!",
        description: `Correção do aluno ${currentStudent.studentName} finalizada com sucesso`,
      });

      // Ir para próximo aluno pendente
      handleNextStudent();

    } catch (error) {
      console.error("Erro ao finalizar correção:", error);
      toast({
        title: "Erro",
        description: "Não foi possível finalizar a correção",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextStudent = () => {
    const pendingStudents = students.filter(s => s.status === "pending");
    if (pendingStudents.length > 0) {
      const nextStudent = pendingStudents[0];
      const nextIndex = students.indexOf(nextStudent);
      setCurrentStudent(nextStudent);
      setCurrentIndex(nextIndex);
    } else {
      // Todos corrigidos
      toast({
        title: "Parabéns!",
        description: "Todas as correções foram finalizadas",
        duration: 5000,
      });
      setCurrentStudent(null);
    }
  };

  const handleSelectStudent = (student: StudentAnswer) => {
    const index = students.indexOf(student);
    setCurrentStudent(student);
    setCurrentIndex(index);
    saveCorrectionSession({ currentStudentIndex: index });
  };

  const handleBulkAction = async (action: "approve" | "reject" | "delete") => {
    if (selectedStudents.length === 0) return;

    try {
      setIsSaving(true);
      
      switch (action) {
        case "approve":
          await api.patch("/physical-evaluations/students/bulk", {
            studentIds: selectedStudents,
            status: "corrected"
          });
          toast({
            title: "Aprovação em lote",
            description: `${selectedStudents.length} correções foram aprovadas`,
          });
          break;
          
        case "reject":
          await api.patch("/physical-evaluations/students/bulk", {
            studentIds: selectedStudents,
            status: "pending"
          });
          toast({
            title: "Rejeição em lote", 
            description: `${selectedStudents.length} correções foram rejeitadas`,
          });
          break;
          
        case "delete":
          await api.delete("/physical-evaluations/students/bulk", {
            data: { studentIds: selectedStudents }
          });
          toast({
            title: "Exclusão em lote",
            description: `${selectedStudents.length} respostas foram excluídas`,
          });
          break;
      }
      
      setSelectedStudents([]);
      loadEvaluation(); // Recarregar dados
      
    } catch (error) {
      console.error("Erro na ação em lote:", error);
      toast({
        title: "Erro",
        description: "Não foi possível executar a ação em lote",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getAnswerLetter = (index: number) => String.fromCharCode(65 + index);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.studentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: StudentAnswer["status"]) => {
    const configs = {
      pending: { label: "Pendente", variant: "secondary" as const, icon: Clock },
      corrected: { label: "Corrigida", variant: "default" as const, icon: CheckCircle },
      reviewed: { label: "Revisada", variant: "secondary" as const, icon: Eye },
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

  const getMockEvaluation = (): PhysicalEvaluation => ({
    id: "eval-1",
    title: "Prova de Matemática - 2º Bimestre",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    school: { id: "school1", name: "E.M. José da Silva" },
    totalQuestions: 15,
    totalStudents: 28,
    correctedStudents: 12,
    pendingStudents: 16,
    appliedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "in_progress",
    answerKey: Array.from({ length: 15 }, (_, i) => ({
      questionId: `q${i + 1}`,
      correctAnswer: ["A", "B", "C", "D"][Math.floor(Math.random() * 4)],
      points: 1
    }))
  });

  const getMockStudents = (): StudentAnswer[] => 
    Array.from({ length: 28 }, (_, i) => ({
      id: `student-${i + 1}`,
      studentId: `std-${i + 1}`,
      studentName: `Aluno ${i + 1}`,
      evaluationId: "eval-1",
      answers: Array.from({ length: 15 }, (_, j) => ({
        questionId: `q${j + 1}`,
        answer: ["A", "B", "C", "D"][Math.floor(Math.random() * 4)],
      })),
      status: i < 12 ? "corrected" : "pending",
      correctedAt: i < 12 ? new Date().toISOString() : undefined,
      observations: i === 0 ? "Aluno demonstrou boa compreensão dos conceitos" : undefined
    }));

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!evaluation || !currentStudent) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <ClipboardCheck className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {!evaluation ? "Avaliação não encontrada" : "Todas as correções finalizadas!"}
          </h2>
          <p className="text-gray-600 mb-4">
            {!evaluation 
              ? "A avaliação que você está procurando não foi encontrada."
              : "Parabéns! Você finalizou a correção de todos os alunos."
            }
          </p>
          <Button onClick={onBack}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{evaluation.title}</h1>
          <p className="text-muted-foreground">
            Correção de cartões resposta • {evaluation.subject.name} • {evaluation.grade.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {evaluation.correctedStudents}/{evaluation.totalStudents} corrigidas
          </Badge>
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso da correção</span>
              <span>{evaluation.correctedStudents}/{evaluation.totalStudents}</span>
            </div>
            <Progress 
              value={(evaluation.correctedStudents / evaluation.totalStudents) * 100} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Alunos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Alunos ({filteredStudents.length})</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowBulkActions(!showBulkActions)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar aluno..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="corrected">Corrigidas</SelectItem>
                  <SelectItem value="reviewed">Revisadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ações em lote */}
            {showBulkActions && selectedStudents.length > 0 && (
              <div className="flex gap-2 p-2 bg-blue-50 rounded-lg">
                <Button size="sm" onClick={() => handleBulkAction("approve")}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Aprovar
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction("reject")}>
                  <XCircle className="h-4 w-4 mr-1" />
                  Rejeitar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleBulkAction("delete")}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              </div>
            )}

            {/* Lista */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    currentStudent?.id === student.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelectStudent(student)}
                >
                  <div className="flex items-center justify-between">
                    {showBulkActions && (
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStudents([...selectedStudents, student.id]);
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <div className="flex-1 min-w-0 ml-2">
                      <p className="font-medium truncate">{student.studentName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(student.status)}
                        {student.percentage !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {student.percentage}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Correção do Aluno Atual */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {currentStudent.studentName}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Aluno {currentIndex + 1} de {students.length}
                  </Badge>
                  {autoSaveEnabled && (
                    <Badge variant="secondary" className="text-xs">
                      <Save className="h-3 w-3 mr-1" />
                      Auto-save
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Respostas */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Gabarito do Aluno</Label>
                <div className="grid grid-cols-5 gap-3">
                  {currentStudent.answers.map((answer, index) => {
                    const correctAnswer = evaluation.answerKey.find(key => key.questionId === answer.questionId)?.correctAnswer;
                    const isCorrect = answer.answer === correctAnswer;
                    
                    return (
                      <div key={answer.questionId} className="space-y-2">
                        <Label className="text-sm">Q{index + 1}</Label>
                        <Select
                          value={answer.answer}
                          onValueChange={(value) => handleAnswerChange(answer.questionId, value)}
                        >
                          <SelectTrigger className={`${
                            answer.answer ? (isCorrect ? 'border-green-500' : 'border-red-500') : ''
                          }`}>
                            <SelectValue placeholder="---" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Em branco</SelectItem>
                            {["A", "B", "C", "D"].map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {answer.answer && (
                          <div className="text-center">
                            {isCorrect ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resultado Atual */}
              {currentStudent.totalScore !== undefined && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {currentStudent.totalScore}/{evaluation.answerKey.reduce((sum, key) => sum + key.points, 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">Pontuação</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {currentStudent.answers.filter(a => a.isCorrect).length}
                    </div>
                    <p className="text-sm text-muted-foreground">Acertos</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {currentStudent.percentage || 0}%
                    </div>
                    <p className="text-sm text-muted-foreground">Percentual</p>
                  </div>
                </div>
              )}

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="observations">Observações (opcional)</Label>
                <Textarea
                  id="observations"
                  placeholder="Adicione observações sobre a correção..."
                  value={currentStudent.observations || ""}
                  onChange={(e) => handleObservationChange(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Ações */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="auto-save"
                    checked={autoSaveEnabled}
                    onCheckedChange={setAutoSaveEnabled}
                  />
                  <Label htmlFor="auto-save" className="text-sm">
                    Salvamento automático
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSaveProgress}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Progresso
                  </Button>
                  
                  <Button
                    onClick={handleFinishCorrection}
                    disabled={isSaving || currentStudent.status === "corrected"}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSaving ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Finalizar Correção
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gabarito de Referência */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Gabarito Oficial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-10 gap-2">
                {evaluation.answerKey.map((key, index) => (
                  <div key={key.questionId} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Q{index + 1}</div>
                    <Badge variant="outline" className="text-sm font-mono">
                      {key.correctAnswer}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 