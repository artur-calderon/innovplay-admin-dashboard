import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, ArrowLeft, Eye, Users, BookOpen, FileText, Calendar, User, MapPin, School, Play } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import StartEvaluationModal from "@/components/evaluations/StartEvaluationModal";
import { convertDateTimeLocalToISO } from "@/utils/date";
import { Evaluation, Subject, Grade, Municipality, SchoolInfo, AppliedClass, Author, Question, getEvaluationSubjects, getEvaluationSubjectsCount } from "@/types/evaluation-types";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/components/evaluations/results/constants";
import { useEvaluations } from "@/hooks/use-cache";

// Função para processar HTML e adicionar classes CSS para imagens
const processHtmlWithImages = (html: string): string => {
  if (!html) return '';
  
  // Adiciona classes CSS para imagens
  return html
    .replace(/<img([^>]*)>/gi, '<img$1 class="max-w-full h-auto rounded-lg shadow-sm border border-gray-200">')
    .replace(/<p([^>]*)>/gi, '<p$1 class="mb-4">')
    .replace(/<h1([^>]*)>/gi, '<h1$1 class="text-2xl font-bold mb-4">')
    .replace(/<h2([^>]*)>/gi, '<h2$1 class="text-xl font-bold mb-3">')
    .replace(/<h3([^>]*)>/gi, '<h3$1 class="text-lg font-bold mb-2">')
    .replace(/<h4([^>]*)>/gi, '<h4$1 class="text-base font-bold mb-2">')
    .replace(/<h5([^>]*)>/gi, '<h5$1 class="text-sm font-bold mb-2">')
    .replace(/<h6([^>]*)>/gi, '<h6$1 class="text-xs font-bold mb-2">')
    .replace(/<ul([^>]*)>/gi, '<ul$1 class="list-disc list-inside mb-4 space-y-1">')
    .replace(/<ol([^>]*)>/gi, '<ol$1 class="list-decimal list-inside mb-4 space-y-1">')
    .replace(/<li([^>]*)>/gi, '<li$1 class="mb-1">')
    .replace(/<blockquote([^>]*)>/gi, '<blockquote$1 class="border-l-4 border-blue-500 pl-4 italic text-gray-600 mb-4">')
    .replace(/<code([^>]*)>/gi, '<code$1 class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">')
    .replace(/<pre([^>]*)>/gi, '<pre$1 class="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4">')
    .replace(/<table([^>]*)>/gi, '<table$1 class="w-full border-collapse border border-gray-300 mb-4">')
    .replace(/<th([^>]*)>/gi, '<th$1 class="border border-gray-300 px-4 py-2 bg-gray-100 font-bold">')
    .replace(/<td([^>]*)>/gi, '<td$1 class="border border-gray-300 px-4 py-2">')
    .replace(/<strong([^>]*)>/gi, '<strong$1 class="font-bold">')
    .replace(/<em([^>]*)>/gi, '<em$1 class="italic">')
    .replace(/<u([^>]*)>/gi, '<u$1 class="underline">');
};

// Interfaces locais para questões (estendem a interface base)
interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

// Interface para questões agrupadas por matéria
interface QuestionsBySubject {
  [subjectId: string]: {
    subject: Subject;
    questions: Question[];
  };
}

export default function ViewEvaluation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { invalidateAfterCRUD } = useEvaluations();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStartEvaluationModal, setShowStartEvaluationModal] = useState(false);
  
  // Estados para mapeamento de habilidades
  const [skillsMapping, setSkillsMapping] = useState<Record<string, string>>({});
  const [skillsBySubject, setSkillsBySubject] = useState<Record<string, Array<{
    id: string | null;
    code: string;
    description: string;
    source: 'database' | 'question';
  }>>>({});

  useEffect(() => {
    const fetchEvaluation = async () => {
      if (!id) return;
      try {
        const response = await api.get(`/test/${id}`);
        console.log("Resposta da API:", response.data);
        console.log("Campo secondStatement nas questões:", response.data.questions?.map(q => ({
          id: q.id,
          secondStatement: q.secondStatement,
          text: q.text,
          formattedText: q.formattedText
        })));
        setEvaluation(response.data);
        
        // Buscar skills da avaliação para mapeamento
        try {
          const evaluationSkills = await EvaluationResultsApiService.getSkillsByEvaluation(id);
          
          if (evaluationSkills && evaluationSkills.length > 0) {
            // Criar mapeamento UUID -> Código real organizado por disciplina
            const newSkillsMapping: Record<string, string> = {};
            const skillsBySubject: Record<string, Array<{
              id: string | null;
              code: string;
              description: string;
              source: 'database' | 'question';
            }>> = {};
            
            evaluationSkills.forEach(skill => {
              // Mapear UUID para código real
              if (skill.id && skill.code) {
                newSkillsMapping[skill.id] = skill.code;
              }
              
              // Organizar skills por disciplina
              const subjectId = skill.subject_id;
              if (!skillsBySubject[subjectId]) {
                skillsBySubject[subjectId] = [];
              }
              skillsBySubject[subjectId].push({
                id: skill.id,
                code: skill.code,
                description: skill.description,
                source: skill.source
              });
            });
            
            setSkillsMapping(newSkillsMapping);
            setSkillsBySubject(skillsBySubject);
            
          }
        } catch (error) {
          console.error("Erro ao carregar skills da avaliação:", error);
          // Continuar sem skills se houver erro
        }
      } catch (error) {
        console.error("Erro ao buscar avaliação:", error);
        toast({
          title: "Erro",
          description: ERROR_MESSAGES.EVALUATION_LOAD_FAILED,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvaluation();
  }, [id, toast]);

  const handleEdit = () => {
    navigate(`/app/avaliacao/${id}/editar`);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!id) return;

    try {
      setIsDeleting(true);
      await api.delete(`/test/${id}`);

      // Invalidar cache após exclusão
      await invalidateAfterCRUD();

      toast({
        title: SUCCESS_MESSAGES.EVALUATION_DELETED,
        description: SUCCESS_MESSAGES.EVALUATION_DELETED,
      });

      navigate("/app/avaliacoes");
    } catch (error) {
      console.error("Erro ao excluir avaliação:", error);
      toast({
        title: "Erro",
        description: ERROR_MESSAGES.EVALUATION_DELETE_FAILED,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleBack = () => {
    navigate("/app/avaliacoes");
  };

  const handleStartEvaluation = () => {
    setShowStartEvaluationModal(true);
  };

  const handleConfirmStartEvaluation = async (startDateTime: string, endDateTime: string, classIds: string[]) => {
    if (!evaluation) return;

    // Capturar timezone do usuário automaticamente
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // ✅ CORREÇÃO: Verificar se já está em formato ISO com timezone antes de converter
    // O StartEvaluationModal já converte para ISO, então só precisamos converter se ainda não estiver
    const isISOFormat = (dateStr: string) => {
      // Verifica se tem timezone offset (formato +/-HH:MM no final)
      const timezonePattern = /[+-]\d{2}:\d{2}$/;
      return timezonePattern.test(dateStr);
    };

    const startDateTimeISO = isISOFormat(startDateTime)
      ? startDateTime
      : convertDateTimeLocalToISO(startDateTime);
    const endDateTimeISO = isISOFormat(endDateTime)
      ? endDateTime
      : convertDateTimeLocalToISO(endDateTime);

    console.log("🚀 Aplicando avaliação (ViewEvaluation):", {
      evaluationId: evaluation.id,
      classIds,
      original: { startDateTime, endDateTime },
      converted: { startDateTimeISO, endDateTimeISO },
      timezone: userTimezone
    });

    try {
      // ✅ CORREÇÃO: Usar o mesmo endpoint e formato que ReadyEvaluations.tsx
      // Mudar de PUT /test/${id}/start para POST /test/${id}/apply
      const classesData = classIds.map(classId => ({
        class_id: classId,
        application: startDateTimeISO,
        expiration: endDateTimeISO
      }));

      console.log("📡 Enviando dados para API:", {
        url: `/test/${evaluation.id}/apply`,
        data: { classes: classesData, timezone: userTimezone }
      });

      const applyResponse = await api.post(`/test/${evaluation.id}/apply`, {
        classes: classesData,
        timezone: userTimezone
      });

      console.log("✅ Resposta da API:", applyResponse.data);

      // Invalidar cache após aplicar avaliação
      await invalidateAfterCRUD();

      toast({
        title: SUCCESS_MESSAGES.EVALUATION_APPLIED,
        description: `A avaliação "${evaluation.title}" foi aplicada para ${classIds.length} turma(s) e ficará disponível no horário configurado.`,
      });

      setShowStartEvaluationModal(false);
      
      // Recarregar os dados da avaliação para refletir o novo status
      const evaluationResponse = await api.get(`/test/${evaluation.id}`);
      setEvaluation(evaluationResponse.data);
      
    } catch (error: unknown) {
      console.error("❌ Erro ao aplicar avaliação:", error);

      let errorMessage: string = ERROR_MESSAGES.EVALUATION_APPLY_FAILED;

      const apiError = error as { response?: { status?: number; data?: { error?: string } } };
      
      if (apiError.response?.status === 404) {
        errorMessage = ERROR_MESSAGES.EVALUATION_NOT_FOUND;
      } else if (apiError.response?.status === 403) {
        errorMessage = ERROR_MESSAGES.FORBIDDEN;
      } else if (apiError.response?.status === 400) {
        errorMessage = apiError.response.data?.error || ERROR_MESSAGES.EVALUATION_INVALID_DATA;
      } else if (apiError.response?.data?.error) {
        errorMessage = apiError.response.data.error;
      }

      toast({
        title: ERROR_MESSAGES.EVALUATION_APPLY_FAILED,
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Função para buscar descrição da habilidade
  const getSkillDescription = (skillId: string) => {
    // Limpar o skillId removendo chaves se existirem
    const cleanSkillId = skillId.replace(/[{}]/g, '');
    
    // Primeiro, tentar mapear UUID para código se necessário
    const skillCode = skillsMapping[cleanSkillId] || cleanSkillId;
    
    // Buscar em todas as disciplinas - tentar tanto por ID quanto por código
    for (const [subjectId, skills] of Object.entries(skillsBySubject)) {
      // Tentar encontrar por ID limpo primeiro
      let skill = skills.find(s => s.id === cleanSkillId);
      if (skill) {
        return skill.description;
      }
      
      // Tentar encontrar por ID original (com chaves)
      skill = skills.find(s => s.id === skillId);
      if (skill) {
        return skill.description;
      }
      
      // Tentar encontrar por código
      skill = skills.find(s => s.code === skillCode);
      if (skill) {
        return skill.description;
      }
    }
    
    return null;
  };

  // Função para obter o código da habilidade (para exibição)
  const getSkillCode = (skillId: string) => {
    // Limpar o skillId removendo chaves se existirem
    const cleanSkillId = skillId.replace(/[{}]/g, '');
    
    const mappedCode = skillsMapping[cleanSkillId];
    if (mappedCode) {
      return mappedCode;
    }
    
    // Se não encontrou no mapeamento, tentar buscar diretamente nas skills
    for (const [subjectId, skills] of Object.entries(skillsBySubject)) {
      const skill = skills.find(s => s.id === cleanSkillId);
      if (skill) {
        return skill.code;
      }
    }
    
    // Fallback: retornar o ID limpo se não encontrar
    return cleanSkillId;
  };

  // Função para agrupar questões por matéria
  const groupQuestionsBySubject = (): QuestionsBySubject => {
    if (!evaluation) {
      return {};
    }

    const questionsBySubject: QuestionsBySubject = {};

    // Usar função helper padronizada para obter disciplinas
    const subjects = getEvaluationSubjects(evaluation);

    // Criar estrutura para cada disciplina
    if (subjects.length > 0) {
      subjects.forEach(subject => {
        questionsBySubject[subject.id] = {
          subject,
          questions: []
        };
      });
    } else {
      // Fallback: se não há disciplinas, criar uma estrutura vazia
      return {};
    }

    // Distribuir questões pelas matérias
    evaluation.questions?.forEach((question) => {
      const q = question as Question & { value?: number; solution?: string; skills?: string[] };
      const subjId = q.subject?.id;
      
      if (subjId && questionsBySubject[subjId]) {
        questionsBySubject[subjId].questions.push(q);
      } else {
        // Se não tem subject ou não encontrou a matéria, coloca na primeira
        const firstSubjectId = Object.keys(questionsBySubject)[0];
        if (firstSubjectId) {
          questionsBySubject[firstSubjectId].questions.push(q);
        }
      }
    });

    return questionsBySubject;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6">
        {/* Breadcrumb */}
        <Skeleton className="h-5 w-64" />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-80" />
            <Skeleton className="h-4 w-60" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
            <CardContent className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Questions skeleton */}
        <Card>
          <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Avaliação não encontrada</h2>
          <p className="text-gray-600 mb-4">A avaliação que você está procurando não foi encontrada.</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Avaliações
          </Button>
        </div>
      </div>
    );
  }

  const questionsBySubject = groupQuestionsBySubject();
  const totalQuestions = evaluation.questions.length;
  const subjectsCount = getEvaluationSubjectsCount(evaluation);
  const municipalitiesCount = evaluation.municipalities_count || evaluation.municipalities?.length || 0;
  const schoolsCount = evaluation.schools_count || evaluation.schools?.length || 0;
  const totalStudents = evaluation.total_students || 0;
  const appliedClassesCount = evaluation.applied_classes_count || 0;

  return (
    <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={handleBack} className="cursor-pointer">
              Avaliações
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{evaluation.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="hidden sm:flex"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
          <h1 className="text-xl md:text-2xl font-bold">{evaluation.title}</h1>
          <p className="text-muted-foreground">
            Visualize os detalhes e questões da avaliação
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleStartEvaluation}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Play className="h-4 w-4 mr-2" />
            Aplicar Avaliação
          </Button>
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDelete} 
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Questões
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuestions}</div>
            <p className="text-xs text-muted-foreground">
              Total de questões
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Alunos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {appliedClassesCount > 0 ? `Em ${appliedClassesCount} turmas` : 'Prova entregue'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Disciplinas
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subjectsCount}</div>
            <p className="text-xs text-muted-foreground">
              Disciplinas envolvidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Municípios
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{municipalitiesCount}</div>
            <p className="text-xs text-muted-foreground">
              {municipalitiesCount === 1 ? 'Município selecionado' : 'Municípios selecionados'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Escolas
            </CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schoolsCount}</div>
            <p className="text-xs text-muted-foreground">
              {schoolsCount === 1 ? 'Escola participante' : 'Escolas participantes'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Informações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Curso</label>
              <p className="text-sm">{evaluation.course?.name || 'Não informado'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Disciplinas</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {(() => {
                  const subjects = getEvaluationSubjects(evaluation);
                  if (subjects.length > 0) {
                    return (
                      <>
                        {subjects.map((subject) => (
                          <Badge key={subject.id} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {subject.name}
                          </Badge>
                        ))}
                        {evaluation.subjects_count && evaluation.subjects_count > subjects.length && (
                          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-300">
                            +{evaluation.subjects_count - subjects.length} outras
                          </Badge>
                        )}
                      </>
                    );
                  }
                  return (
                    <Badge variant="outline" className="text-xs">
                      Não informado
                    </Badge>
                  );
                })()}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Série</label>
              <p className="text-sm">{evaluation.grade?.name || 'Não informada'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Modelo</label>
              <p className="text-sm">{evaluation.model || 'Não informado'}</p>
            </div>
            <div className="flex items-center gap-4 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {new Date(evaluation.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {evaluation.createdBy?.name || 'Não informado'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Aplicação da Prova
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status de Aplicação */}
            <div className="flex items-center gap-3 mb-4">
                             <Badge 
                 variant={evaluation.is_applied ? "default" : "secondary"}
                 className={evaluation.is_applied 
                   ? "bg-green-100 text-green-800 border-green-200" 
                   : "bg-yellow-100 text-yellow-800 border-yellow-200"
                 }
               >
                 {evaluation.is_applied ? "✅ Aplicada" : "❌ Não aplicada"}
               </Badge>
              {evaluation.status && (
                <Badge variant="outline" className="text-xs">
                  Status: {evaluation.status}
                </Badge>
              )}
            </div>

            {/* Informações de aplicação */}
            {evaluation.is_applied && evaluation.applied_classes && evaluation.applied_classes.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">
                    {totalStudents} alunos receberam a prova
                  </span>
                </div>
                <p className="text-sm text-green-700 mb-4">
                  Distribuída em {appliedClassesCount} turmas de {schoolsCount} escolas
                </p>
                
                {/* Turmas aplicadas */}
                <div>
                  <label className="text-sm font-medium text-green-700 mb-2 block">
                    Turmas onde foi aplicada:
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {evaluation.applied_classes
                      .filter(appliedClass => appliedClass.class_test_id !== null)
                      .map((appliedClass, idx) => (
                        <div key={appliedClass.class.id || idx} className="bg-white/80 rounded-lg p-3 border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-green-800">
                              {appliedClass.class.name}
                            </span>
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                              {appliedClass.class.students_count} alunos
                            </Badge>
                          </div>
                          <div className="text-xs text-green-600 space-y-1">
                            <div className="flex items-center gap-1">
                              <School className="h-3 w-3" />
                              <span>{appliedClass.class.school.name}</span>
                            </div>
                            {appliedClass.application && appliedClass.expiration && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {new Date(appliedClass.application).toLocaleDateString('pt-BR')} às {new Date(appliedClass.application).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(appliedClass.expiration).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Turmas pendentes */}
            {!evaluation.is_applied && evaluation.applied_classes && evaluation.applied_classes.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-800">
                    {totalStudents} alunos agendados para receber a prova
                  </span>
                </div>
                <p className="text-sm text-yellow-700 mb-4">
                  Agendada para {appliedClassesCount} turmas de {schoolsCount} escolas
                </p>
                
                <div>
                  <label className="text-sm font-medium text-yellow-700 mb-2 block">
                    Turmas agendadas:
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {evaluation.applied_classes.map((appliedClass, idx) => (
                      <div key={appliedClass.class.id || idx} className="bg-white/80 rounded-lg p-3 border border-yellow-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-yellow-800">
                            {appliedClass.class.name}
                          </span>
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                            {appliedClass.class.students_count} alunos
                          </Badge>
                        </div>
                        <div className="text-xs text-yellow-600">
                          <div className="flex items-center gap-1">
                            <School className="h-3 w-3" />
                            <span>{appliedClass.class.school.name}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quando não há turmas aplicadas ou agendadas */}
            {(!evaluation.applied_classes || evaluation.applied_classes.length === 0) && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-gray-500" />
                  <span className="font-semibold text-gray-700">
                    Nenhuma turma selecionada
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Esta avaliação ainda não foi agendada para nenhuma turma.
                </p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Municípios ({municipalitiesCount})
              </label>
              <div className="max-h-32 overflow-y-auto">
                {(evaluation.municipalities && evaluation.municipalities.length > 0) ? (
                  <ul className="space-y-1">
                    {evaluation.municipalities.map((m: Municipality, idx: number) => (
                      <li key={m.id || m.name || idx} className="text-sm bg-blue-50 px-3 py-2 rounded border border-blue-200 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{m.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum município selecionado</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Escolas ({schoolsCount})
              </label>
              <div className="max-h-32 overflow-y-auto">
                {(evaluation.schools && evaluation.schools.length > 0) ? (
                  <ul className="space-y-1">
                    {evaluation.schools.map((s: SchoolInfo, idx: number) => (
                      <li key={s.id || s.name || idx} className="text-sm bg-gray-50 px-3 py-2 rounded border border-gray-200 flex items-center gap-2">
                        <School className="h-4 w-4 text-gray-600" />
                        <span className="font-medium">{s.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma escola selecionada</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Turmas Selecionadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Turmas Selecionadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              // Mapear e deduplicar turmas de applied_classes
              const selectedClasses = (evaluation.applied_classes || [])
                .map(appliedClass => appliedClass.class)
                .filter((classItem, index, self) => 
                  self.findIndex(c => c.id === classItem.id) === index
                );

              if (selectedClasses.length > 0) {
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {selectedClasses.length} turma{selectedClasses.length > 1 ? 's' : ''} selecionada{selectedClasses.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto space-y-3">
                      {selectedClasses.map((classItem, idx) => (
                        <div key={classItem.id || idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-800">
                              {classItem.name}
                            </span>
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              {classItem.students_count} alunos
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center gap-2">
                              <School className="h-4 w-4" />
                              <span>{classItem.school.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              <span>{classItem.grade.name}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              } else if (evaluation.classes && evaluation.classes.length > 0) {
                // Fallback: mostrar contagem de turmas pelos IDs
                return (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-yellow-600" />
                      <span className="font-semibold text-yellow-800">
                        {evaluation.classes.length} turma{evaluation.classes.length > 1 ? 's' : ''} selecionada{evaluation.classes.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-sm text-yellow-700">
                      IDs das turmas: {evaluation.classes.join(', ')}
                    </p>
                    <p className="text-xs text-yellow-600 mt-2">
                      Detalhes completos das turmas serão exibidos após a aplicação da avaliação.
                    </p>
                  </div>
                );
              } else {
                // Nenhuma turma selecionada
                return (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-gray-500" />
                      <span className="font-semibold text-gray-700">
                        Nenhuma turma selecionada
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Esta avaliação ainda não foi associada a nenhuma turma.
                    </p>
                  </div>
                );
              }
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Questions by Subject */}
      <div className="space-y-8">
        {Object.keys(questionsBySubject).length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Questões da Avaliação
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-12">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhuma questão encontrada
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Esta avaliação ainda não possui questões cadastradas.
                  </p>
                  <Button onClick={handleEdit} variant="outline">
                    <Pencil className="h-4 w-4 mr-2" />
                    Adicionar Questões
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          Object.entries(questionsBySubject).map(([subjectId, subjectData]) => (
            <Card key={subjectId} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 text-white rounded-lg flex items-center justify-center">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-800">{subjectData.subject.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {subjectData.questions.length} questões cadastradas
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {subjectData.questions.length} questões
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-8">
                  {subjectData.questions.map((question, index) => {
                    const q = question as Question & { value?: number; solution?: string; skills?: string[]; secondStatement?: string };
                    const questionData = {
                      id: q.id,
                      text: q.text,
                      type: q.type,
                      difficulty: q.difficulty,
                      value: q.value,
                      options: q.options || [],
                      solution: q.solution || '',
                      subject: q.subject,
                      skills: q.skills || []
                    };
                    
                    return (
                    <div key={q.id} className="question-preview-content bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {/* Header da questão */}
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-800 mb-3">
                              Questão {index + 1}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {Array.isArray(q.skills) && q.skills.length > 0 && (
                                q.skills.map((skill, skillIndex) => {
                                  const skillCode = getSkillCode(skill);
                                  const skillDescription = getSkillDescription(skill);
                                  return (
                                    <div key={skillIndex} className="group relative">
                                      <Badge 
                                        variant="outline" 
                                        className="text-xs bg-blue-50 text-blue-700 font-medium cursor-help hover:bg-blue-100 transition-colors"
                                        title={skillDescription || skillCode}
                                      >
                                        {skillCode}
                                        {skillDescription && (
                                          <span className="ml-1 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">ℹ️</span>
                                        )}
                                      </Badge>
                                      {skillDescription && (
                                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded-lg p-3 max-w-xs shadow-lg">
                                          <div className="font-bold text-blue-200 mb-1">{skillCode}</div>
                                          <div className="leading-relaxed">{skillDescription}</div>
                                          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Conteúdo da questão */}
                      <div className="p-6 space-y-6">
                        {/* Enunciado */}
                        <div className="prose prose-sm max-w-none question-statement">
                          <div
                            className="text-base leading-relaxed text-gray-700 p-4 bg-gray-50 rounded-lg border"
                            dangerouslySetInnerHTML={{ __html: processHtmlWithImages(q.formattedText || q.text) }}
                          />
                        </div>

                        {/* Segundo Enunciado (se houver) */}
                        {(q.secondStatement || (q.formattedText && q.formattedText !== q.text)) && (
                          <div className="prose prose-sm max-w-none question-continuation">
                            <div
                              className="text-base leading-relaxed text-gray-700 p-4 bg-blue-50 rounded-lg border border-blue-200"
                              dangerouslySetInnerHTML={{ __html: processHtmlWithImages(q.secondStatement || q.formattedText || '') }}
                            />
                          </div>
                        )}


                        {/* Alternativas para questões de múltipla escolha */}
                        {(q.type === 'multipleChoice' || q.type === 'multiple_choice') && (q.options || q.alternatives) && (q.options?.length > 0 || q.alternatives?.length > 0) && (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-lg text-gray-700 flex items-center gap-2">
                              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm">🔢</span>
                              Alternativas
                            </h4>
                            <div className="space-y-3">
                              {(q.options || q.alternatives || []).map((option, optionIndex) => (
                                <div
                                  key={optionIndex}
                                  className={`alternative-item flex items-start gap-4 p-5 rounded-xl border transition-all duration-200 ${
                                    option.isCorrect
                                      ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm"
                                      : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                                  }`}
                                >
                                  <div
                                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-200 ${
                                      option.isCorrect 
                                        ? 'bg-green-500 text-white border-green-500 shadow-lg' 
                                        : 'bg-gray-50 border-gray-300 text-gray-600'
                                    }`}
                                  >
                                    {option.id || String.fromCharCode(65 + optionIndex)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-base leading-relaxed ${
                                      option.isCorrect ? 'font-medium text-green-800' : 'text-gray-700'
                                    }`}>
                                      <div dangerouslySetInnerHTML={{ __html: processHtmlWithImages(option.text) }} />
                                    </div>
                                    {option.isCorrect && (
                                      <Badge variant="outline" className="mt-3 text-xs bg-green-50 text-green-700 border-green-200">
                                        ✓ Resposta Correta
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Área de resposta para questões dissertativas */}
                        {q.type === 'open' && (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-lg text-gray-700 flex items-center gap-2">
                              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm">✍️</span>
                              Área de Resposta
                            </h4>
                            <div className="answer-area bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-6 relative overflow-hidden">
                              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-purple-600 opacity-60"></div>
                              <div className="space-y-3">
                                <p className="text-sm font-medium text-gray-600">
                                  Espaço destinado para a resposta do estudante
                                </p>
                                <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-4 min-h-[120px] flex items-center justify-center">
                                  <p className="text-gray-400 text-sm leading-relaxed text-center">
                                    📝 O estudante desenvolverá sua resposta neste espaço durante a avaliação, demonstrando conhecimento e raciocínio sobre o tema abordado.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Resolução/Gabarito (se houver) */}
                        {q.solution && q.solution.trim() !== '' && (
                          <div className="space-y-4 border-t border-gray-200 pt-6">
                            <h4 className="font-semibold text-lg text-gray-700 flex items-center gap-2">
                              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm">💡</span>
                              Resolução
                            </h4>
                            <div className="resolution-content bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 relative overflow-hidden">
                              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-600"></div>
                              <div className="prose prose-sm max-w-none">
                                <div
                                  className="text-base leading-relaxed text-gray-700"
                                  dangerouslySetInnerHTML={{ __html: processHtmlWithImages(q.solution) }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Metadados da questão */}
                        <div className="bg-gray-50 rounded-lg p-4 border-t border-gray-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                              <span className="font-medium text-gray-600">Dificuldade:</span> 
                              <span className="text-gray-700">{q.difficulty}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                              <span className="font-medium text-gray-600">Valor:</span> 
                              <span className="text-gray-700">{q.value || q.points || 0} pontos</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                              <span className="font-medium text-gray-600">Habilidades:</span> 
                              <span className="text-gray-700">
                                {Array.isArray(q.skills) && q.skills.length > 0
                                  ? `${q.skills.length} habilidade${q.skills.length > 1 ? 's' : ''}`
                                  : 'Nenhuma habilidade definida'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Aplicar Avaliação */}
      <StartEvaluationModal
        isOpen={showStartEvaluationModal}
        onClose={() => setShowStartEvaluationModal(false)}
        onConfirm={handleConfirmStartEvaluation}
        evaluation={evaluation}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a avaliação "{evaluation?.title}"?
              Esta ação não pode ser desfeita e todas as questões associadas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 