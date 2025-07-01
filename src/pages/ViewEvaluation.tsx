import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Play, ArrowLeft, Eye, Users, BookOpen, FileText, Calendar, User, MapPin, School } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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

// Interfaces based on the provided JSON structure
interface Author {
  id: string;
  name: string;
}

interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  number: number;
  text: string;
  formattedText?: string;
  type: string;
  value: number;
  difficulty: string;
  skills: string[];
  options?: QuestionOption[];
  solution: string;
  subjectId?: string; // ID da matéria da questão
  subject?: { id: string; name: string }; // Adicionado para compatibilidade com backend
}

interface Subject {
  id: string;
  name: string;
}

interface Municipality {
  id: string;
  name: string;
}

interface SchoolInfo {
  id: string;
  name: string;
}

interface Evaluation {
  id: string;
  title: string;
  description: string | null;
  course: {
    id: string;
    name: string;
  } | null;
  model: string;
  subject: {
    id: string;
    name: string;
  };
  subjects_info?: Subject[]; // Array de matérias da avaliação
  grade: {
    id: string;
    name: string;
  } | null;
  max_score: number | null;
  createdBy: Author;
  createdAt: string;
  questions: Question[];
  municipalities?: Municipality[];
  schools?: SchoolInfo[];
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
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const fetchEvaluation = async () => {
      if (!id) return;
      try {
        const response = await api.get(`/test/${id}`);
        console.log(response.data)
        setEvaluation(response.data);
      } catch (error) {
        console.error("Erro ao buscar avaliação:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar a avaliação",
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

      toast({
        title: "Sucesso",
        description: "Avaliação excluída com sucesso!",
      });

      navigate("/app/avaliacoes");
    } catch (error) {
      console.error("Erro ao excluir avaliação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a avaliação",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleApply = () => {
    navigate(`/app/avaliacao/${id}/aplicar`);
  };

  const handleBack = () => {
    navigate("/app/avaliacoes");
  };

  // Função para agrupar questões por matéria
  const groupQuestionsBySubject = (): QuestionsBySubject => {
    if (!evaluation) return {};

    const questionsBySubject: QuestionsBySubject = {};

    // Se temos subjects_info, usamos para criar a estrutura
    if (evaluation.subjects_info && evaluation.subjects_info.length > 0) {
      evaluation.subjects_info.forEach(subject => {
        questionsBySubject[subject.id] = {
          subject,
          questions: []
        };
      });

      // Distribuir questões pelas matérias
      evaluation.questions.forEach(question => {
        const subjId = question.subject?.id;
        if (subjId && questionsBySubject[subjId]) {
          questionsBySubject[subjId].questions.push(question);
        } else {
          // Se não tem subject ou não encontrou a matéria, coloca na primeira
          const firstSubjectId = Object.keys(questionsBySubject)[0];
          if (firstSubjectId) {
            questionsBySubject[firstSubjectId].questions.push(question);
          }
        }
      });
    } else {
      // Fallback para avaliações antigas com apenas uma matéria
      questionsBySubject[evaluation.subject.id] = {
        subject: evaluation.subject,
        questions: evaluation.questions
      };
    }

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
  const subjectsCount = evaluation.subjects_info?.length || 1;
  const municipalitiesCount = evaluation.municipalities?.length || 0;
  const schoolsCount = evaluation.schools?.length || 0;

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
          <Button size="sm" onClick={handleApply}>
            <Play className="h-4 w-4 mr-2" />
            Aplicar Avaliação
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              Municípios selecionados
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
              Escolas participantes
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
                {evaluation.subjects_info && evaluation.subjects_info.length > 0 ? (
                  evaluation.subjects_info.map((subject) => (
                    <Badge key={subject.id} variant="outline" className="text-xs">
                      {subject.name}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="text-xs">
                    {evaluation.subject?.name || 'Não informado'}
                  </Badge>
                )}
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
              Municípios e Escolas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Municípios ({municipalitiesCount})
              </label>
              <div className="max-h-32 overflow-y-auto">
                {(evaluation.municipalities && evaluation.municipalities.length > 0) ? (
                  <ul className="space-y-1">
                    {evaluation.municipalities.map((m: Municipality, idx: number) => (
                      <li key={m.id || m.name || idx} className="text-sm bg-gray-50 px-2 py-1 rounded">
                        {m.name}
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
                      <li key={s.id || s.name || idx} className="text-sm bg-gray-50 px-2 py-1 rounded">
                        {s.name}
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
      </div>

      {/* Questions by Subject */}
      <div className="space-y-8">
        {Object.entries(questionsBySubject).map(([subjectId, subjectData]) => (
          <Card key={subjectId} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 text-white rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-800">{subjectData.subject.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {subjectData.questions.length} questão{subjectData.questions.length !== 1 ? 'ões' : ''} cadastrada{subjectData.questions.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {subjectData.questions.length} questão{subjectData.questions.length !== 1 ? 'ões' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-8">
                {subjectData.questions.map((question, index) => (
                  <div key={question.id} className="question-preview-content bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Header da questão */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-3">
                            Questão {question.number || index + 1}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs bg-white">
                              {question.type === 'open' ? 'Dissertativa' : 
                               question.type === 'multipleChoice' ? 'Múltipla Escolha' :
                               question.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-white">
                              {question.value} pontos
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-white">
                              {question.difficulty}
                            </Badge>
                            {Array.isArray(question.skills) && question.skills.length > 0 && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                {question.skills.length} habilidade{question.skills.length !== 1 ? 's' : ''}
                              </Badge>
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
                          dangerouslySetInnerHTML={{ __html: question.text }}
                        />
                      </div>

                      {/* Segundo Enunciado (se houver) */}
                      {question.formattedText && question.formattedText !== question.text && (
                        <div className="prose prose-sm max-w-none question-continuation">
                          <div
                            className="text-base leading-relaxed text-gray-700 p-4 bg-blue-50 rounded-lg border border-blue-200"
                            dangerouslySetInnerHTML={{ __html: question.formattedText }}
                          />
                        </div>
                      )}

                      {/* Alternativas para questões de múltipla escolha */}
                      {question.type === 'multipleChoice' && question.options && question.options.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg text-gray-700 flex items-center gap-2">
                            <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm">🔢</span>
                            Alternativas
                          </h4>
                          <div className="space-y-3">
                            {question.options.map((option, optionIndex) => (
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
                                  {String.fromCharCode(65 + optionIndex)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-base leading-relaxed ${
                                    option.isCorrect ? 'font-medium text-green-800' : 'text-gray-700'
                                  }`}>
                                    <div dangerouslySetInnerHTML={{ __html: option.text }} />
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
                      {question.type === 'open' && (
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
                      {question.solution && question.solution.trim() !== '' && (
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
                                dangerouslySetInnerHTML={{ __html: question.solution }}
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
                            <span className="text-gray-700">{question.difficulty}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                            <span className="font-medium text-gray-600">Valor:</span> 
                            <span className="text-gray-700">{question.value} pontos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                            <span className="font-medium text-gray-600">Habilidades:</span> 
                            <span className="text-gray-700">
                              {Array.isArray(question.skills) && question.skills.length > 0
                                ? `${question.skills.length} cadastrada${question.skills.length !== 1 ? 's' : ''}`
                                : 'Nenhuma'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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