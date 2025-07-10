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
import { CalendarDays, Clock, Loader2, Play, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

const startEvaluationSchema = z.object({
  startDateTime: z.string().min(1, "Selecione a data e hora de início"),
  endDateTime: z.string().min(1, "Selecione a data e hora de término"),
}).refine((data) => {
  if (data.startDateTime && data.endDateTime) {
    return new Date(data.endDateTime) > new Date(data.startDateTime);
  }
  return true;
}, {
  message: "A data de término deve ser posterior à data de início",
  path: ["endDateTime"],
});

type StartEvaluationFormValues = z.infer<typeof startEvaluationSchema>;

interface Class {
  id?: string;
  class?: {
    id: string;
    name: string;
  };
  name?: string;
  school_id?: string;
  grade_id?: string;
  students_count?: number;
  school?: {
    id: string;
    name: string;
  };
  grade?: {
    id: string;
    name: string;
    education_stage_id: string;
    education_stage?: {
      id: string;
      name: string;
    };
  };
}

interface StartEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (startDateTime: string, endDateTime: string) => Promise<void>;
  evaluation: {
    id: string;
    title: string;
    subject: { id: string; name: string };
    questions: Array<any>;
    duration?: number;
  } | null;
}

export default function StartEvaluationModal({
  isOpen,
  onClose,
  onConfirm,
  evaluation
}: StartEvaluationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const { toast } = useToast();

  const form = useForm<StartEvaluationFormValues>({
    resolver: zodResolver(startEvaluationSchema),
    defaultValues: {
      startDateTime: "",
      endDateTime: "",
    },
  });

  const startDateTime = form.watch("startDateTime");
  const endDateTime = form.watch("endDateTime");

  const loadEvaluationClasses = async () => {
    if (!evaluation) return;
    try {
      setIsLoadingClasses(true);
      const response = await api.get(`/test/${evaluation.id}/classes`);
      setClasses(response.data || []);
    } catch (error) {
      console.error("Erro ao carregar turmas da avaliação:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar turmas vinculadas à avaliação. Verifique sua conexão.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingClasses(false);
    }
  };

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

  const applyEvaluation = async (values: StartEvaluationFormValues) => {
    if (!evaluation) return;
    try {
      setIsLoading(true);
      // Log para depuração
      console.log("CLASSES PARA APLICAR:", classes);
      const classesData = classes.map(classItem => {
        console.log("classItem:", classItem);
        return {
          class_id: classItem.class?.id,
          application: startDateTime,
          expiration: endDateTime
        };
      });
      const payload = { classes: classesData };
      console.log("PAYLOAD PARA O BACKEND:", payload);
      // Corrigir endpoint para aplicar avaliação (singular)
      const response = await api.post(`/test/${evaluation.id}/apply`, payload);
      if (response.data.warnings && response.data.warnings.length > 0) {
        toast({
          title: "Avaliação aplicada com avisos",
          description: `Avaliação aplicada com sucesso para ${response.data.applied_classes.length} turmas. Avisos: ${response.data.warnings.join(', ')}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Avaliação aplicada com sucesso!",
          description: `Avaliação aplicada para ${response.data.applied_classes.length} turmas`,
        });
      }
      if (onConfirm) {
        await onConfirm(values.startDateTime, values.endDateTime);
      }
      form.reset();
      onClose();
    } catch (error: any) {
      let errorMessage = "Erro ao aplicar avaliação. Tente novamente.";
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.error === "No classes were applied") {
          errorMessage = "Nenhuma turma foi aplicada. Verifique os dados e tente novamente.";
        } else if (errorData.details) {
          errorMessage = `Erro: ${errorData.details.join(', ')}`;
        }
      }
      toast({
        title: "Erro ao aplicar avaliação",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (values: StartEvaluationFormValues) => {
    await applyEvaluation(values);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  useEffect(() => {
    if (isOpen && evaluation) {
      loadEvaluationClasses();
    }
  }, [isOpen, evaluation]);

  if (!evaluation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
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
              <h4 className="text-sm font-semibold text-blue-800 mb-2">
                Informações da Avaliação
              </h4>
              <div className="space-y-1 text-sm text-blue-700">
                <p><strong>Disciplina:</strong> {evaluation.subject.name}</p>
                <p><strong>Questões:</strong> {evaluation.questions.length}</p>
                <p><strong>Duração individual:</strong> {evaluation.duration || 60} minutos</p>
              </div>
            </div>

            {/* Informações das Turmas */}
            <div className="space-y-4">
              {/* <div className="flex items-center">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Turmas
                </Label>
              </div> */}

              {classes.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>{classes.length}</strong> turma{classes.length > 1 ? 's' : ''} receberá{classes.length > 1 ? 'ão' : ''} esta avaliação
                  </p>
                </div>
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
                        Quando a avaliação ficará disponível
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
                        Quando a avaliação será encerrada
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {calculateTotalPeriod() && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">
                      Período de disponibilidade: {calculateTotalPeriod()}
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    A avaliação ficará disponível para os alunos durante este período e aparecerá na agenda deles
                  </p>
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
                disabled={isLoading || !calculateTotalPeriod() || classes.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Aplicar Avaliação
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