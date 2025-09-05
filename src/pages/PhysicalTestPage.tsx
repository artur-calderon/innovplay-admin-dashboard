import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Download,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  FileImage,
  Settings,
  RefreshCw,
  Eye,
  AlertCircle,
  QrCode,
  Printer,
  Trash2,
  MoreVertical
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/context/authContext";

interface PhysicalTestStatus {
  test_id: string;
  test_title: string;
  is_applied: boolean;
  total_students: number;
  generated_forms: number;
  corrected_forms: number;
  pending_forms: number;
  last_generation?: string;
  class_tests?: Array<{
    id: string;
    class_id: string;
    application: string;
    expiration: string;
    status: string;
  }>;
}

interface GeneratedForm {
  id: string;
  test_id: string;
  student_id: string | null;
  student_name: string;
  qr_code_data: string;
  status: string;
  has_pdf_data: boolean;
  created_at: string;
  is_corrected?: boolean;
  correction_score?: number;
}

interface CorrectionResult {
  student_id: string;
  student_name: string;
  correct_answers: number;
  incorrect_answers: number;
  unanswered: number;
  total_questions: number;
  score: number;
  corrected_image: string;
  processed_at: string;
}

export default function PhysicalTestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Estados principais
  const [testStatus, setTestStatus] = useState<PhysicalTestStatus | null>(null);
  const [generatedForms, setGeneratedForms] = useState<GeneratedForm[]>([]);
  const [correctionResults, setCorrectionResults] = useState<CorrectionResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [correctionProgress, setCorrectionProgress] = useState(0);
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isGeneratingIndividual, setIsGeneratingIndividual] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [totalStudents, setTotalStudents] = useState(0);
  const [classes, setClasses] = useState<any[]>([]);

  // Carregar dados iniciais
  useEffect(() => {
    if (id) {
      loadTestData();
    }
  }, [id]);

  const loadTestData = async () => {
    try {
      setIsLoading(true);
      
      // Carregar status da prova
      console.log("🔍 Carregando status da prova física...");
      const statusResponse = await api.get(`/physical-tests/test/${id}/status`);
      console.log("📊 Status da prova:", statusResponse.data);
      setTestStatus(statusResponse.data);

      // Carregar turmas da avaliação
      console.log("🏫 Carregando turmas da avaliação...");
      const classesResponse = await api.get(`/test/${id}/classes`);
      console.log("🏫 Turmas encontradas:", classesResponse.data);
      setClasses(classesResponse.data || []);

      // Calcular total de alunos
      const totalStudentsCount = classesResponse.data?.reduce((total, classTest) => {
        return total + (classTest.students_count || 0);
      }, 0) || 0;
      console.log("👥 Total de alunos calculado:", totalStudentsCount);
      setTotalStudents(totalStudentsCount);

      // Carregar avaliações geradas
      console.log("📋 Carregando avaliações geradas...");
      const formsResponse = await api.get(`/physical-tests/test/${id}/forms`);
      console.log("📄 Avaliações geradas:", formsResponse.data);
      
      // Separar formulários combinados e individuais
      const forms = formsResponse.data.forms || [];
      const combinedForms = forms.filter(form => !form.student_id);
      const individualForms = forms.filter(form => form.student_id);
      
      console.log("📄 Formulários combinados:", combinedForms.length);
      console.log("👤 Formulários individuais:", individualForms.length);
      console.log("📊 Total de formulários:", forms.length);
      
      setGeneratedForms(forms);

      // Carregar resultados de correção (se houver)
      // TODO: Implementar endpoint para buscar resultados
      
    } catch (error) {
      console.error("Erro ao carregar dados da prova física:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da prova física.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateForms = async () => {
    if (!id) return;

    try {
      setIsGenerating(true);
      setCorrectionProgress(0);

      // Simular progresso
      const progressInterval = setInterval(() => {
        setCorrectionProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await api.post(`/physical-tests/test/${id}/generate-forms`);
      
      clearInterval(progressInterval);
      setCorrectionProgress(100);

      console.log("✅ Resposta da geração de formulários:", response.data);
      console.log("📝 Formulários gerados:", response.data.forms);
      console.log("📊 Total de formulários:", response.data.generated_forms);

      setTestStatus(prev => prev ? {
        ...prev,
        generated_forms: response.data.generated_forms,
        last_generation: new Date().toISOString()
      } : null);

      setGeneratedForms(response.data.forms || []);

      toast({
        title: "Sucesso!",
        description: `${response.data.generated_forms} avaliações foram geradas com sucesso.`,
      });

    } catch (error: any) {
      console.error("Erro ao gerar avaliações:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Não foi possível gerar as avaliações.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setCorrectionProgress(0);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessCorrection = async () => {
    if (!uploadedImage || !id) return;

    try {
      setIsProcessing(true);
      setCorrectionProgress(0);

      const formData = new FormData();
      formData.append('image', uploadedImage);

      // Simular progresso
      const progressInterval = setInterval(() => {
        setCorrectionProgress(prev => Math.min(prev + 15, 90));
      }, 300);

      const response = await api.post(`/physical-tests/test/${id}/process-correction`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);
      setCorrectionProgress(100);

      // Adicionar resultado à lista
      const newResult: CorrectionResult = {
        student_id: response.data.student_id,
        student_name: response.data.student_name || "Aluno não identificado",
        correct_answers: response.data.correction_results.correct_answers,
        incorrect_answers: response.data.correction_results.incorrect_answers,
        unanswered: response.data.correction_results.unanswered,
        total_questions: response.data.correction_results.total_questions,
        score: Math.round((response.data.correction_results.correct_answers / response.data.correction_results.total_questions) * 100),
        corrected_image: response.data.corrected_image,
        processed_at: new Date().toISOString()
      };

      setCorrectionResults(prev => [newResult, ...prev]);

      toast({
        title: "Correção processada!",
        description: `Prova corrigida com sucesso. Nota: ${newResult.score}%`,
      });

      setShowCorrectionDialog(false);
      setUploadedImage(null);
      setPreviewImage(null);

    } catch (error: any) {
      console.error("Erro ao processar correção:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Não foi possível processar a correção.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setCorrectionProgress(0);
    }
  };

  const handleDownloadForm = async (form: GeneratedForm) => {
    try {
      const response = await api.get(`/physical-tests/test/${id}/download/${form.id}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileName = form.student_id 
        ? `Avaliacao_${form.student_name.replace(/\s+/g, '_')}.pdf`
        : `Avaliacao_Combinada_${form.student_name.replace(/\s+/g, '_')}.pdf`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Erro ao baixar avaliação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar a avaliação.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteForm = (formId: string) => {
    setFormToDelete(formId);
    setDeleteDialogOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedForms.length === 0) return;
    setFormToDelete('bulk');
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!formToDelete || !id) return;

    try {
      setIsDeleting(true);
      console.log("🗑️ Iniciando exclusão:", { formToDelete, id, selectedForms });

      if (formToDelete === 'bulk') {
        // Exclusão em massa
        console.log("📦 Exclusão em massa - IDs selecionados:", selectedForms);
        const response = await api.delete(`/physical-tests/test/${id}/forms`);
        console.log("✅ Resposta da exclusão em massa:", response.data);
        
        toast({
          title: "Sucesso!",
          description: `${response.data.deleted_forms || selectedForms.length} avaliações foram excluídas com sucesso.`,
        });

        // Atualizar lista
        setGeneratedForms([]);
        setSelectedForms([]);
        
        // Atualizar status
        setTestStatus(prev => prev ? {
          ...prev,
          generated_forms: 0,
          corrected_forms: 0
        } : null);

      } else {
        // Exclusão individual
        console.log("🔍 Exclusão individual - Form ID:", formToDelete);
        const response = await api.delete(`/physical-tests/form/${formToDelete}`);
        console.log("✅ Resposta da exclusão individual:", response.data);
        
        toast({
          title: "Sucesso!",
          description: "Avaliação excluída com sucesso.",
        });

        // Remover da lista
        setGeneratedForms(prev => prev.filter(form => form.id !== formToDelete));
        setSelectedForms(prev => prev.filter(id => id !== formToDelete));
        
        // Atualizar status
        setTestStatus(prev => prev ? {
          ...prev,
          generated_forms: prev.generated_forms - 1,
          corrected_forms: Math.max(0, prev.corrected_forms - 1)
        } : null);
      }

    } catch (error: any) {
      console.error("Erro ao excluir avaliação(ões):", error);
      
      let errorMessage = "Não foi possível excluir a(s) avaliação(ões).";
      
      if (error.response?.status === 404) {
        errorMessage = "Avaliação(ões) não encontrada(s).";
      } else if (error.response?.status === 403) {
        errorMessage = "Sem permissão para excluir esta(s) avaliação(ões).";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setFormToDelete(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedForms(generatedForms.map(form => form.id));
    } else {
      setSelectedForms([]);
    }
  };

  const handleSelectOne = (formId: string, checked: boolean) => {
    if (checked) {
      setSelectedForms(prev => [...prev, formId]);
    } else {
      setSelectedForms(prev => prev.filter(id => id !== formId));
    }
  };

  const loadStudents = async () => {
    if (!id) return;

    try {
      setIsLoadingStudents(true);
      console.log("👥 Carregando alunos das turmas...");
      
      // Usar as turmas já carregadas
      if (!classes || classes.length === 0) {
        console.log("⚠️ Nenhuma turma disponível");
        setStudents([]);
        return;
      }

      // Buscar alunos de todas as turmas
      const allStudents = [];
      for (const classTest of classes) {
        console.log(`👥 Carregando alunos da turma: ${classTest.class.name}`);
        const studentsResponse = await api.get(`/students/classes/${classTest.class.id}`);
        console.log(`👥 Alunos da turma ${classTest.class.name}:`, studentsResponse.data);
        
        // Adicionar informações da turma e class_test aos alunos
        const studentsWithClassInfo = studentsResponse.data.map(student => ({
          ...student,
          class_name: classTest.class.name,
          class_test_id: classTest.class_test_id,
          school_name: classTest.class.school.name,
          grade_name: classTest.class.grade.name,
          application: classTest.application,
          expiration: classTest.expiration,
          status: classTest.status
        }));
        
        allStudents.push(...studentsWithClassInfo);
      }
      
      console.log("👥 Total de alunos encontrados:", allStudents.length);
      setStudents(allStudents);
    } catch (error) {
      console.error("Erro ao carregar alunos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de alunos.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleOpenStudentModal = () => {
    setShowStudentModal(true);
    setStudentSearchTerm("");
    setSelectedClassFilter("all");
    loadStudents();
  };

  // Filtrar alunos baseado na busca e turma
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                         student.registration?.toLowerCase().includes(studentSearchTerm.toLowerCase());
    const matchesClass = selectedClassFilter === "all" || student.class_name === selectedClassFilter;
    return matchesSearch && matchesClass;
  });

  // Obter lista única de turmas para o filtro
  const uniqueClasses = [...new Set(students.map(student => student.class_name))].filter(Boolean);

  const handleGenerateIndividual = async (studentId: string, studentName: string) => {
    if (!id) return;

    try {
      setIsGeneratingIndividual(true);
      console.log("🎯 Gerando prova individual para:", { studentId, studentName, testId: id });

      const response = await api.post(`/physical-tests/test/${id}/student/${studentId}/generate`);
      console.log("✅ Resposta da geração individual:", response.data);

      toast({
        title: "Sucesso!",
        description: `Prova individual gerada com sucesso para ${studentName}.`,
      });

      // Atualizar lista de formulários
      setGeneratedForms(prev => [...prev, ...response.data.forms]);
      
      // Atualizar status
      setTestStatus(prev => prev ? {
        ...prev,
        generated_forms: prev.generated_forms + response.data.generated_forms
      } : null);

      setShowStudentModal(false);

    } catch (error: any) {
      console.error("Erro ao gerar prova individual:", error);
      
      let errorMessage = "Não foi possível gerar a prova individual.";
      
      if (error.response?.status === 404) {
        errorMessage = "Aluno ou avaliação não encontrado.";
      } else if (error.response?.status === 403) {
        errorMessage = "Sem permissão para gerar prova para este aluno.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingIndividual(false);
    }
  };

  const getStatusBadge = (status: PhysicalTestStatus) => {
    // Verificar se tem aplicações (independente do campo is_applied)
    const hasApplications = status.class_tests && status.class_tests.length > 0;
    
    if (!hasApplications) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Não Aplicada</Badge>;
    }
    
    // Verificar status das aplicações
    const hasAgendada = status.class_tests?.some(ct => ct.status === 'agendada');
    const hasAtiva = status.class_tests?.some(ct => ct.status === 'ativa');
    const hasFinalizada = status.class_tests?.some(ct => ct.status === 'finalizada');
    
    if (hasAgendada && !hasAtiva && !hasFinalizada) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Agendada</Badge>;
    }
    
    if (hasAtiva) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Ativa</Badge>;
    }
    
    if (hasFinalizada) {
      return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Finalizada</Badge>;
    }
    
    if (status.generated_forms === 0) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Aplicada - Sem Avaliações</Badge>;
    }
    
    if (status.corrected_forms === status.generated_forms) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Totalmente Corrigida</Badge>;
    }
    
    return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Parcialmente Corrigida</Badge>;
  };

  // Verificar se pode gerar formulários baseado no status das aplicações
  const canGenerateForms = testStatus?.class_tests?.some((classTest: any) => 
    classTest.status === 'agendada' || classTest.status === 'ativa' || classTest.status === 'finalizada'
  ) || false;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!testStatus) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Prova não encontrada ou não foi aplicada ainda.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prova Física</h1>
          <p className="text-muted-foreground">{testStatus.test_title}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
        >
          Voltar
        </Button>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Status da Prova
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                {getStatusBadge(testStatus)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Total de Alunos:</span>
                <span className="text-sm">{totalStudents}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Avaliações Geradas:</span>
                <span className="text-sm">{generatedForms.length}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Corrigidas:</span>
                <span className="text-sm">{testStatus.corrected_forms}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicador de loading durante exclusão */}
      {isDeleting && (
        <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <RefreshCw className="h-4 w-4 mr-2 animate-spin text-red-600" />
          <span className="text-sm text-red-700">
            Excluindo avaliação(ões)...
          </span>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="forms" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="forms">Avaliações</TabsTrigger>
          <TabsTrigger value="correction">Correção</TabsTrigger>
          <TabsTrigger value="results">Resultados</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        {/* Tab: Avaliações */}
        <TabsContent value="forms" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Avaliações Geradas</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={handleOpenStudentModal}
                    disabled={!canGenerateForms}
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Gerar Individual
                  </Button>
                  <Button
                    onClick={handleGenerateForms}
                    disabled={isGenerating || !canGenerateForms}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Gerar Prova Física
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isGenerating && (
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Gerando avaliações...</span>
                    <span>{correctionProgress}%</span>
                  </div>
                  <Progress value={correctionProgress} className="w-full" />
                </div>
              )}

              {/* Ações em lote */}
              {selectedForms.length > 0 && (
                <div className="flex items-center justify-between bg-red-50 p-3 rounded-lg">
                  <span className="text-sm text-red-800">
                    {selectedForms.length} avaliação(ões) selecionada(s)
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Excluindo...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir ({selectedForms.length})
                      </>
                    )}
                  </Button>
                </div>
              )}

              {generatedForms.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {canGenerateForms 
                      ? "Nenhuma avaliação foi gerada ainda. Clique em 'Gerar Prova Física' para começar."
                      : "A prova precisa ser aplicada antes de gerar as avaliações físicas."
                    }
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            generatedForms.length > 0 &&
                            selectedForms.length === generatedForms.length
                          }
                          onCheckedChange={handleSelectAll}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead>Avaliação</TableHead>
                      <TableHead>QR Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Gerado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedForms.map((form) => (
                      <TableRow key={form.id} data-state={selectedForms.includes(form.id) && "selected"}>
                        <TableCell>
                          <Checkbox
                            checked={selectedForms.includes(form.id)}
                            onCheckedChange={(checked) => handleSelectOne(form.id, !!checked)}
                            aria-label={`Selecionar ${form.student_name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {form.student_id ? (
                              <>
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-blue-600">
                                    {form.student_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span>{form.student_name}</span>
                              </>
                            ) : (
                              <>
                                <FileText className="h-4 w-4 text-green-600" />
                                <span className="text-green-700 font-medium">{form.student_name}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <QrCode className="h-4 w-4" />
                            <span className="text-xs font-mono">
                              {form.qr_code_data === "combined" ? "Combinado" : form.qr_code_data}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {form.student_id ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 w-fit">
                                Individual
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 w-fit">
                                Combinado
                              </Badge>
                            )}
                            {form.is_corrected ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 w-fit">
                                Corrigido
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 w-fit">
                                Pendente
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(form.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadForm(form)}
                              title="Baixar"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleDeleteForm(form.id)}
                                  className="text-red-600 focus:text-red-700 cursor-pointer"
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      Excluindo...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Correção */}
        <TabsContent value="correction" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Processar Correção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-upload">Imagem do Gabarito Preenchido</Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Faça upload de uma foto do gabarito preenchido pelo aluno.
                </p>
              </div>

              {previewImage && (
                <div className="space-y-4">
                  <div>
                    <Label>Preview da Imagem</Label>
                    <div className="mt-2 border rounded-lg p-4">
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="max-w-full h-auto max-h-64 mx-auto"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleProcessCorrection}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Processar Correção
                      </>
                    )}
                  </Button>

                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Processando correção...</span>
                        <span>{correctionProgress}%</span>
                      </div>
                      <Progress value={correctionProgress} className="w-full" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Resultados */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resultados Processados</CardTitle>
            </CardHeader>
            <CardContent>
              {correctionResults.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum resultado de correção foi processado ainda.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Avaliação</TableHead>
                      <TableHead>Acertos</TableHead>
                      <TableHead>Erros</TableHead>
                      <TableHead>Sem Resposta</TableHead>
                      <TableHead>Nota</TableHead>
                      <TableHead>Processado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {correctionResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{result.student_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {result.correct_answers}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            {result.incorrect_answers}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                            {result.unanswered}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={
                              result.score >= 70 
                                ? "bg-green-100 text-green-800" 
                                : result.score >= 50 
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {result.score}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(result.processed_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>Imagem Corrigida - {result.student_name}</DialogTitle>
                                <DialogDescription>
                                  Visualização da imagem processada com as marcações detectadas.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex justify-center">
                                <img
                                  src={result.corrected_image}
                                  alt="Imagem corrigida"
                                  className="max-w-full h-auto"
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Configurações */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações de Layout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Parâmetros de Layout</h3>
                  <div className="space-y-2">
                    <Label>Tamanho do Formulário</Label>
                    <div className="flex gap-2">
                      <Input value="720" disabled className="w-20" />
                      <span className="flex items-center">x</span>
                      <Input value="320" disabled className="w-20" />
                      <span className="flex items-center text-sm text-muted-foreground">pixels</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tamanho do QR Code</Label>
                    <div className="flex gap-2">
                      <Input value="100" disabled className="w-20" />
                      <span className="flex items-center">x</span>
                      <Input value="100" disabled className="w-20" />
                      <span className="flex items-center text-sm text-muted-foreground">pixels</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tamanho dos Círculos</Label>
                    <div className="flex gap-2">
                      <Input value="18" disabled className="w-20" />
                      <span className="flex items-center">x</span>
                      <Input value="18" disabled className="w-20" />
                      <span className="flex items-center text-sm text-muted-foreground">pixels</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Detecção de Marcações</h3>
                  <div className="space-y-2">
                    <Label>Threshold Adaptativo</Label>
                    <div className="flex gap-2">
                      <Input value="70" disabled className="w-20" />
                      <span className="flex items-center text-sm text-muted-foreground">% de pixels brancos</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Confiança Mínima</Label>
                    <div className="flex gap-2">
                      <Input value="70" disabled className="w-20" />
                      <span className="flex items-center text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Máscara Circular</Label>
                    <Badge variant="outline">Ativada</Badge>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Estas configurações são definidas pelo sistema e não podem ser alteradas pelo usuário.
                  Elas garantem a precisão na detecção das marcações dos gabaritos.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {formToDelete === 'bulk'
                ? `Tem certeza que deseja excluir ${selectedForms.length} avaliação(ões)? Esta ação não pode ser desfeita.`
                : "Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Confirmar Exclusão"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de seleção de alunos */}
      <Dialog open={showStudentModal} onOpenChange={setShowStudentModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Selecionar Aluno</DialogTitle>
            <DialogDescription>
              Escolha um aluno para gerar uma prova física individual.
              {students.length > 0 && (
                <span className="block mt-1 text-sm font-medium">
                  {filteredStudents.length} de {students.length} aluno(s) encontrado(s)
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {isLoadingStudents ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando alunos...</span>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhum aluno encontrado para esta avaliação.
                </p>
              </div>
            ) : (
              <>
                {/* Filtros */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Buscar por nome ou matrícula..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                    />
                  </div>
                  {uniqueClasses.length > 1 && (
                    <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filtrar por turma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as turmas</SelectItem>
                        {uniqueClasses.map((className) => (
                          <SelectItem key={className} value={className}>
                            {className}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Lista de alunos */}
                <div className="max-h-96 overflow-y-auto">
                  <div className="grid gap-2">
                    {filteredStudents.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          Nenhum aluno encontrado com os filtros aplicados.
                        </p>
                      </div>
                    ) : (
                      filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleGenerateIndividual(student.id, student.name)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {student.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {student.class_name && (
                              <p>Turma: {student.class_name}</p>
                            )}
                            {student.school_name && (
                              <p>Escola: {student.school_name}</p>
                            )}
                            {student.registration && (
                              <p>Matrícula: {student.registration}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={isGeneratingIndividual}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isGeneratingIndividual ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            Gerar
                          </>
                        )}
                      </Button>
                    </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
