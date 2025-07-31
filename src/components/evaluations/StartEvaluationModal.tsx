import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Loader2, Play, Users, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

// Schema de validação
const startEvaluationSchema = z.object({
  startDateTime: z.string().min(1, "Selecione a data e hora de início"),
  endDateTime: z.string().min(1, "Selecione a data e hora de término"),
}).refine((data) => {
  if (data.startDateTime && data.endDateTime) {
    const startDate = new Date(data.startDateTime);
    const endDate = new Date(data.endDateTime);
    const now = new Date();
    
    // Início e fim não podem ser no passado
    if (startDate < now || endDate < now) {
      return false;
    }
    // Fim deve ser posterior ao início
    if (endDate <= startDate) {
      return false;
    }
    return true;
  }
  return true;
}, {
  message: "Verifique as datas: início e término devem ser no futuro e o término deve ser posterior ao início.",
  path: ["endDateTime"],
});

type StartEvaluationFormValues = z.infer<typeof startEvaluationSchema>;

interface EvaluationClass {
  id: string;
  name: string;
  school_name: string;
  grade_name: string;
  students_count: number;
  status?: "applied" | "configured";
  current_application?: string;
  current_expiration?: string;
  class_test_id?: string;
}

interface StartEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (startDateTime: string, endDateTime: string, classIds: string[]) => Promise<void>;
  evaluation: {
    id: string;
    title: string;
    subject: { id: string; name: string };
    subjects?: Array<{ id: string; name: string }>;
    questions: Array<Record<string, unknown>>;
    duration?: number;
    schools?: Array<{ id: string; name: string }>;
    municipalities?: Array<{ id: string; name: string }>;
    grade?: { id: string; name: string };
  } | null;
}

export default function StartEvaluationModal({
  isOpen,
  onClose,
  onConfirm,
  evaluation
}: StartEvaluationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [evaluationClasses, setEvaluationClasses] = useState<EvaluationClass[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<StartEvaluationFormValues>({
    resolver: zodResolver(startEvaluationSchema),
    defaultValues: {
      startDateTime: "",
      endDateTime: "",
    },
  });

  // Watch dos campos
  const startDateTime = form.watch("startDateTime");
  const endDateTime = form.watch("endDateTime");

  // Buscar turmas da avaliação quando abrir o modal
  useEffect(() => {
    if (isOpen && evaluation) {
      // Limpar formulário e estado
      form.reset({
        startDateTime: "",
        endDateTime: "",
      });
      setError(null);
      setEvaluationClasses([]);
      
      // Buscar turmas que receberão esta avaliação
      fetchEvaluationClasses();
    }
  }, [isOpen, evaluation]);

  const fetchEvaluationClasses = async () => {
    if (!evaluation) return;
    
    try {
      setIsLoadingClasses(true);
      console.log("🔍 Buscando turmas para avaliação:", evaluation.id);
      
      // Buscar turmas já aplicadas para esta avaliação
      const response = await api.get(`/test/${evaluation.id}/classes`);
      console.log("📋 Resposta da API de turmas:", response.data);
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Mapear dados do backend para o formato esperado pelo componente
        const classes = response.data.map((item: Record<string, unknown>) => ({
          id: (item.class as Record<string, unknown>).id as string,
          name: (item.class as Record<string, unknown>).name as string,
          school_name: ((item.class as Record<string, unknown>).school as Record<string, unknown>)?.name as string || "Escola não informada",
          grade_name: ((item.class as Record<string, unknown>).grade as Record<string, unknown>)?.name as string || "Série não informada",
          students_count: (item.students_count as number) || 0,
          // Dados adicionais para referência
          class_test_id: item.class_test_id as string,
          current_application: item.application as string,
          current_expiration: item.expiration as string,
          status: ((item.status as string) || "configured") as "applied" | "configured"  // "applied" ou "configured"
        }));
        
        setEvaluationClasses(classes);
        console.log("✅ Turmas processadas:", classes);
        
        // Se chegou aqui e tem turmas, limpar qualquer erro anterior
        setError(null);
      } else {
        console.log("⚠️ Nenhuma turma encontrada para esta avaliação");
        setEvaluationClasses([]);
        setError("Esta avaliação ainda não foi aplicada para nenhuma turma. Para aplicar, primeiro você precisa configurar as turmas no processo de criação da avaliação.");
      }
    } catch (error: unknown) {
      console.error("❌ Erro ao buscar turmas:", error);
      setEvaluationClasses([]);
      
      const errorResponse = error as { response?: { status?: number } };
      if (errorResponse.response?.status === 404) {
        setError("Esta avaliação ainda não foi aplicada para nenhuma turma. Para aplicar, primeiro você precisa configurar as turmas no processo de criação da avaliação.");
      } else if (errorResponse.response?.status === 403) {
        setError("Você não tem permissão para visualizar as turmas desta avaliação.");
      } else if (errorResponse.response?.status === 401) {
        setError("Sua sessão expirou. Faça login novamente.");
      } else {
        setError("Erro ao carregar turmas. Verifique sua conexão e tente novamente.");
      }
    } finally {
      setIsLoadingClasses(false);
    }
  };

  // Função para calcular a duração total do período
  const calculateTotalPeriod = () => {
    if (!startDateTime || !endDateTime) return null;
    
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    
    if (end <= start) return null;
    
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} dia${diffDays > 1 ? 's' : ''} e ${diffHours}h${diffMinutes}min`;
    } else if (diffHours > 0) {
      return `${diffHours}h${diffMinutes}min`;
    } else {
      return `${diffMinutes} minutos`;
    }
  };

  const handleSubmit = async (values: StartEvaluationFormValues) => {
    if (evaluationClasses.length === 0) {
      toast({
        title: "Erro",
        description: "Esta avaliação não possui turmas configuradas",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Aplicar para todas as turmas configuradas
      const classIds = evaluationClasses.map(c => c.id);
      await onConfirm(values.startDateTime, values.endDateTime, classIds);
      
      toast({
        title: "✅ Avaliação aplicada com sucesso!",
        description: `A avaliação "${evaluation?.title}" foi aplicada para ${evaluationClasses.length} turma(s) e ficará disponível no horário configurado.`,
      });
      
      form.reset();
      onClose();
    } catch (error) {
      console.error("Erro ao aplicar avaliação:", error);
      toast({
        title: "Erro ao aplicar avaliação",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setError(null);
    setEvaluationClasses([]);
    onClose();
  };

  const getTotalStudents = () => {
    return evaluationClasses.reduce((total, cls) => total + cls.students_count, 0);
  };

  if (!evaluation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-green-600" />
            Aplicar Avaliação
          </DialogTitle>
          <DialogDescription>
            Configure quando a avaliação "{evaluation.title}" ficará disponível para os alunos
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Informações da Avaliação */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Informações da Avaliação
              </h4>
              <div className="space-y-2 text-sm text-blue-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Disciplina(s):</span>
                    <p className="mt-1">{
                      evaluation.subjects && evaluation.subjects.length > 0 
                        ? evaluation.subjects.map(s => s.name).join(", ")
                        : evaluation.subject.name
                    }</p>
                  </div>
                  <div>
                    <span className="font-medium">Série:</span>
                    <p className="mt-1">{evaluation.grade?.name || "Não informada"}</p>
                  </div>
                  <div>
                    <span className="font-medium">Questões:</span>
                    <p className="mt-1">{evaluation.questions.length}</p>
                  </div>
                  <div>
                    <span className="font-medium">Duração:</span>
                    <p className="mt-1">{evaluation.duration || 60} minutos</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações das Turmas */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Turmas para aplicação
              </h4>
              
              {isLoadingClasses ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando turmas...
                </div>
              ) : error ? (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : evaluationClasses.length > 0 ? (
                <div className="space-y-3">
                  {/* Verificar se há turmas já aplicadas */}
                  {evaluationClasses.some(cls => cls.status === "applied") && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-xs text-blue-800 mb-2">
                        ⚠️ Esta avaliação já foi aplicada anteriormente. Você pode reaplicar com novos horários.
                      </p>
                      <div className="flex items-center gap-4 text-sm text-blue-700">
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          Reaplicação
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  {/* Verificar se há turmas apenas configuradas */}
                  {evaluationClasses.some(cls => cls.status === "configured") && (
                    <div className="bg-green-100 border border-green-300 rounded p-3">
                      <p className="text-xs text-green-800 mb-2">
                        ✅ Turmas configuradas durante a criação da avaliação. Primeira aplicação.
                      </p>
                      <div className="flex items-center gap-4 text-sm text-green-700">
                        <Badge variant="outline" className="bg-green-200 text-green-800">
                          Primeira aplicação
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-700 mb-3">
                    <Badge variant="outline" className="bg-gray-100 text-gray-800">
                      {evaluationClasses.length} turma{evaluationClasses.length > 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="outline" className="bg-gray-100 text-gray-800">
                      {evaluationClasses.reduce((total, cls) => total + cls.students_count, 0)} alunos
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {evaluationClasses.map((cls) => (
                      <div key={cls.id} className="bg-white border border-green-200 rounded p-2">
                        <div className="text-sm font-medium text-green-800 flex items-center gap-2">
                          {cls.name}
                          {cls.status === "applied" && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600">
                              Aplicada
                            </Badge>
                          )}
                          {cls.status === "configured" && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-600">
                              Nova
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-green-600">
                          {cls.school_name} • {cls.grade_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {cls.students_count} aluno{cls.students_count !== 1 ? 's' : ''}
                        </div>
                        {cls.current_application && (
                          <div className="text-xs text-gray-500 mt-1">
                            Aplicação anterior: {new Date(cls.current_application).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Esta avaliação ainda não foi aplicada para nenhuma turma. Configure as turmas no processo de criação da avaliação primeiro.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Campos de Data */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Data e Hora de Início *
                      </FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormDescription>
                        Quando a avaliação ficará disponível para os alunos
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Data e Hora de Término *
                      </FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormDescription>
                        Quando a avaliação será encerrada automaticamente
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Resumo do Período */}
              {calculateTotalPeriod() && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">
                      Período de disponibilidade: {calculateTotalPeriod()}
                    </span>
                  </div>
                  <div className="text-xs text-purple-600 space-y-1">
                    <p>• A avaliação ficará disponível na agenda dos alunos</p>
                    <p>• Status será "Agendada" até o horário de início</p>
                    <p>• Alunos poderão clicar em "Iniciar Avaliação" apenas no período configurado</p>
                    <p>• Após finalizar, o botão mudará para "Concluída"</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !calculateTotalPeriod() || evaluationClasses.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aplicando...
                  </>
                ) : evaluationClasses.length === 0 ? (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Configurar turmas primeiro
                  </>
                ) : evaluationClasses.some(cls => cls.status === "applied") ? (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Reaplicar para {evaluationClasses.length} turma{evaluationClasses.length > 1 ? 's' : ''}
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Aplicar para {evaluationClasses.length} turma{evaluationClasses.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 