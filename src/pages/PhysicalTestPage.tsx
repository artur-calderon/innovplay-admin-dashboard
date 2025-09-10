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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  FileText,
  Download,
  Trash2,
  Users,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
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
}

interface GeneratedForm {
  id: string;
  test_id: string;
  student_id: string;
  student_name: string;
  class_test_id: string;
  form_pdf_url: string | null;
  answer_sheet_url: string | null;
  correction_image_url: string | null;
  has_pdf_data: boolean;
  has_answer_sheet_data: boolean;
  has_correction_data: boolean;
  qr_code_data: string;
  qr_code_coordinates: any;
  status: string;
  is_corrected: boolean;
  generated_at: string;
  corrected_at: string | null;
  processed_at: string | null;
  created_at: string;
}

interface CorrectionResult {
  message: string;
  student_id: string;
  test_id: string;
  class_test_id: string;
  correct_answers: number;
  total_questions: number;
  score_percentage: number;
  grade: number;
  proficiency: number;
  classification: string;
  answers_detected: number;
  qr_data: {
    student_id: string;
    test_id: string;
    class_test_id: string;
    timestamp: string;
  };
}

export default function PhysicalTestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Estados principais
  const [isLoading, setIsLoading] = useState(true);
  const [testStatus, setTestStatus] = useState<PhysicalTestStatus | null>(null);
  const [generatedForms, setGeneratedForms] = useState<GeneratedForm[]>([]);
  const [correctionResult, setCorrectionResult] = useState<CorrectionResult | null>(null);

  // Estados para geração de formulários
  const [isGenerating, setIsGenerating] = useState(false);
  const [correctionProgress, setCorrectionProgress] = useState(0);

  // Estados para correção
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados para gerenciamento de formulários
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para alunos
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
      const statusResponse = await api.get(`/physical-tests/test/${id}/status`);
      setTestStatus(statusResponse.data);

      // Carregar formulários gerados
      const formsResponse = await api.get(`/physical-tests/test/${id}/forms`);
      console.log("📋 Resposta da API de formulários:", formsResponse.data);
      setGeneratedForms(formsResponse.data.forms || []);

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
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

      // Mapear form_id para id para compatibilidade
      const mappedForms = (response.data.generated_forms || []).map((form: any) => ({
        ...form,
        id: form.form_id, // Mapear form_id para id
        created_at: new Date().toISOString() // Adicionar timestamp se não existir
      }));
      setGeneratedForms(mappedForms);

      toast({
        title: "Avaliações geradas!",
        description: `${response.data.generated_forms?.length || 0} avaliações foram geradas com sucesso.`,
      });

    } catch (error: any) {
      console.error("Erro ao gerar formulários:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao gerar avaliações",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setCorrectionProgress(0);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      setCorrectionResult(null); // Limpar resultado anterior
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      console.log("📸 Imagem selecionada:", file.name);
    }
  };

  const handleProcessCorrection = async () => {
    if (!uploadedImage || !id) return;

    try {
      setIsProcessing(true);
      setCorrectionProgress(0);

      // Converter imagem para base64
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(uploadedImage);
      });

      // Simular progresso
      const progressInterval = setInterval(() => {
        setCorrectionProgress(prev => Math.min(prev + 15, 90));
      }, 300);

      const response = await api.post(`/physical-tests/test/${id}/process-correction`, {
        image: base64Image
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearInterval(progressInterval);
      setCorrectionProgress(100);

      // Armazenar resultado da correção
      setCorrectionResult(response.data);

      toast({
        title: "Correção processada!",
        description: `Prova corrigida com sucesso. Nota: ${response.data.grade}`,
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

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Avaliacao_${form.student_name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download iniciado",
        description: "O arquivo PDF está sendo baixado.",
      });
    } catch (error) {
      console.error("Erro ao baixar formulário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar o formulário.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadAll = async () => {
    if (!id) return;

    try {
      const response = await api.get(`/physical-tests/test/${id}/download-all`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Nome do arquivo com timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const testTitle = testStatus?.test_title?.replace(/\s+/g, '_') || 'Avaliacao';
      link.download = `Avaliacoes_${testTitle}_${timestamp}.zip`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download iniciado",
        description: "O arquivo ZIP está sendo baixado.",
      });
    } catch (error) {
      console.error("Erro ao baixar todos os formulários:", error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar os formulários.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteForm = (formId: string) => {
    setFormToDelete(formId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!formToDelete || !id) return;

    try {
      setIsDeleting(true);
      await api.delete(`/physical-tests/form/${formToDelete}`);
      
      setGeneratedForms(prev => prev.filter(form => form.id !== formToDelete));
      
      toast({
        title: "Avaliação excluída",
        description: "A avaliação foi excluída com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao excluir formulário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a avaliação.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setFormToDelete(null);
    }
  };

  const handleDeleteAllForms = async () => {
    if (!id) return;

    try {
      setIsDeleting(true);
      await api.delete(`/physical-tests/test/${id}/forms`);
      
      setGeneratedForms([]);
      
      toast({
        title: "Avaliações excluídas",
        description: "Todas as avaliações foram excluídas com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao excluir formulários:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir as avaliações.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const loadStudents = async () => {
    if (!id) return;

    try {
      setIsLoadingStudents(true);
      const response = await api.get(`/test/${id}/classes`);
      setStudents(response.data.students || []);
      setTotalStudents(response.data.total_students || 0);
      setClasses(response.data.classes || []);
    } catch (error) {
      console.error("Erro ao carregar alunos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os alunos.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleGenerateIndividual = async (studentId: string) => {
    if (!id) return;

    try {
      setIsGeneratingIndividual(true);
      const response = await api.post(`/physical-tests/test/${id}/student/${studentId}/generate`);

      // Mapear form_id para id para compatibilidade
      const mappedForms = (response.data.forms || []).map((form: any) => ({
        ...form,
        id: form.form_id, // Mapear form_id para id
        created_at: new Date().toISOString() // Adicionar timestamp se não existir
      }));
      setGeneratedForms(prev => [...prev, ...mappedForms]);

      toast({
        title: "Avaliação gerada!",
        description: "Avaliação individual gerada com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao gerar formulário individual:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao gerar avaliação individual",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingIndividual(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(studentSearchTerm.toLowerCase());
    const matchesClass = selectedClassFilter === "all" || student.class_id === selectedClassFilter;
    return matchesSearch && matchesClass;
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!testStatus) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Não foi possível carregar os dados da prova física.
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
          <h1 className="text-3xl font-bold">{testStatus.test_title}</h1>
          <p className="text-muted-foreground">Gerenciamento de Prova Física</p>
        </div>
        <Button onClick={() => navigate(-1)} variant="outline">
          Voltar
        </Button>
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testStatus.total_students}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formulários Gerados</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testStatus.generated_forms}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formulários Corrigidos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testStatus.corrected_forms}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={testStatus.is_applied ? "default" : "secondary"}>
              {testStatus.is_applied ? "Aplicada" : "Não Aplicada"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="forms" className="space-y-6">
        <TabsList>
          <TabsTrigger value="forms">Avaliações Geradas</TabsTrigger>
          <TabsTrigger value="correction">Correção</TabsTrigger>
          <TabsTrigger value="students">Alunos</TabsTrigger>
        </TabsList>

        {/* Tab: Avaliações Geradas */}
        <TabsContent value="forms" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Avaliações Geradas</CardTitle>
                <div className="flex gap-2">
                  {generatedForms.length > 0 && (
                    <>
                      <Button
                        onClick={handleDownloadAll}
                        variant="outline"
                        className="border-purple-600 text-purple-600 hover:bg-purple-50"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar Todos ({generatedForms.length})
                      </Button>
                      <Button
                        onClick={handleDeleteAllForms}
                        variant="outline"
                        disabled={isDeleting}
                        className="border-red-600 text-red-600 hover:bg-red-50"
                      >
                        {isDeleting ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Excluindo...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Todas
                          </>
                        )}
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={handleGenerateForms}
                    disabled={isGenerating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Gerando... {correctionProgress}%
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Gerar Avaliações
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isGenerating && (
                <div className="mb-4">
                  <Progress value={correctionProgress} className="w-full" />
                </div>
              )}

              {generatedForms.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma avaliação gerada</h3>
                  <p className="text-muted-foreground mb-4">
                    Clique em "Gerar Avaliações" para criar os formulários para todos os alunos.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aluno</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Gerado em</TableHead>
                        <TableHead>Corrigido em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {generatedForms.map((form) => (
                        <TableRow key={form.id}>
                          <TableCell className="font-medium">
                            {form.student_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant={form.is_corrected ? "default" : "secondary"}>
                              {form.is_corrected ? "Corrigido" : "Pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(form.generated_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            {form.corrected_at 
                              ? new Date(form.corrected_at).toLocaleDateString('pt-BR')
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDownloadForm(form)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Baixar PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteForm(form.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Correção */}
        <TabsContent value="correction" className="space-y-6">
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

                  {/* Resultado da Correção */}
                  {correctionResult && (
                    <div className="space-y-4">
                      <Label>Resultado da Correção</Label>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
                        {/* Informações do Aluno */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Aluno ID:</span>
                            <span className="text-sm bg-white px-2 py-1 rounded">
                              {correctionResult.student_id}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Teste ID:</span>
                            <span className="text-sm bg-white px-2 py-1 rounded">
                              {correctionResult.test_id}
                            </span>
                          </div>
                        </div>

                        {/* Estatísticas da Prova */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-3 rounded border">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {correctionResult.correct_answers}/{correctionResult.total_questions}
                              </div>
                              <div className="text-sm text-gray-600">Acertos</div>
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {correctionResult.score_percentage.toFixed(1)}%
                              </div>
                              <div className="text-sm text-gray-600">Percentual</div>
                            </div>
                          </div>
                        </div>

                        {/* Nota e Classificação */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-3 rounded border">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-purple-600">
                                {correctionResult.grade}
                              </div>
                              <div className="text-sm text-gray-600">Nota</div>
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <div className="text-center">
                              <div className="text-lg font-bold text-orange-600">
                                {correctionResult.classification}
                              </div>
                              <div className="text-sm text-gray-600">Classificação</div>
                            </div>
                          </div>
                        </div>

                        {/* Proficiência */}
                        <div className="bg-white p-3 rounded border">
                          <div className="text-center">
                            <div className="text-xl font-bold text-indigo-600">
                              {correctionResult.proficiency}
                            </div>
                            <div className="text-sm text-gray-600">Proficiência</div>
                          </div>
                        </div>

                        {/* Respostas Detectadas */}
                        <div className="bg-white p-3 rounded border">
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-700">
                              {correctionResult.answers_detected} respostas detectadas
                            </div>
                            <div className="text-sm text-gray-600">de {correctionResult.total_questions} questões</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleProcessCorrection}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processando... {correctionProgress}%
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Processar Correção
                      </>
                    )}
                  </Button>

                  {isProcessing && (
                    <div className="space-y-2">
                      <Progress value={correctionProgress} className="w-full" />
                      <p className="text-sm text-muted-foreground text-center">
                        Analisando imagem e processando correção...
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Alunos */}
        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Alunos da Prova</CardTitle>
                <Button onClick={loadStudents} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Carregar Alunos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingStudents ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Filtros */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar aluno..."
                          value={studentSearchTerm}
                          onChange={(e) => setStudentSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filtrar por turma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as turmas</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lista de Alunos */}
                  <div className="space-y-2">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium">{student.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {student.class_name} • {student.email}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleGenerateIndividual(student.id)}
                          disabled={isGeneratingIndividual}
                          size="sm"
                        >
                          {isGeneratingIndividual ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>

                  {filteredStudents.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum aluno encontrado</h3>
                      <p className="text-muted-foreground">
                        {studentSearchTerm || selectedClassFilter !== "all"
                          ? "Tente ajustar os filtros de busca."
                          : "Clique em 'Carregar Alunos' para ver a lista de alunos."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
