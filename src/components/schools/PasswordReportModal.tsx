import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { FileSpreadsheet, Download, Loader2, Calendar } from "lucide-react";
import { useAuth } from "@/context/authContext";

interface PasswordReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName: string;
  cityId: string;
  classes: Array<{
    id: string;
    name: string;
    grade?: string | { id: string; name: string; education_stage: any };
  }>;
}

interface Grade {
  id: string;
  name: string;
}

export function PasswordReportModal({
  isOpen,
  onClose,
  schoolId,
  schoolName,
  cityId,
  classes,
}: PasswordReportModalProps) {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const { toast } = useToast();

  // Estados dos filtros
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Estados dos dados
  const [grades, setGrades] = useState<Grade[]>([]);

  // Carregar séries disponíveis das turmas da escola
  useEffect(() => {
    const loadGrades = async () => {
      if (!isOpen || classes.length === 0) {
        setGrades([]);
        return;
      }

      setIsLoadingGrades(true);
      try {
        // Extrair séries únicas das turmas
        const gradeMap = new Map<string, Grade>();
        
        classes.forEach((classItem) => {
          if (classItem.grade) {
            if (typeof classItem.grade === "object" && classItem.grade !== null) {
              const grade = classItem.grade as { id: string; name: string };
              if (grade.id && !gradeMap.has(grade.id)) {
                gradeMap.set(grade.id, {
                  id: grade.id,
                  name: grade.name || "",
                });
              }
            }
          }
        });

        setGrades(Array.from(gradeMap.values()));
      } catch (error) {
        console.error("Erro ao carregar séries:", error);
        setGrades([]);
      } finally {
        setIsLoadingGrades(false);
      }
    };

    loadGrades();
  }, [isOpen, classes]);

  // Resetar filtros quando o modal fechar
  useEffect(() => {
    if (!isOpen) {
      setSelectedGrade("all");
      setSelectedClass("all");
      setDateFrom("");
      setDateTo("");
    }
  }, [isOpen]);

  // Filtrar turmas por série selecionada
  const filteredClasses = selectedGrade === "all" 
    ? classes 
    : classes.filter((classItem) => {
        if (!classItem.grade) return false;
        if (typeof classItem.grade === "object" && classItem.grade !== null) {
          return (classItem.grade as { id: string }).id === selectedGrade;
        }
        return false;
      });

  const handleGenerateReport = async () => {
    // Validação de datas
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      toast({
        title: "Erro de validação",
        description: "A data inicial não pode ser maior que a data final.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);

      // Construir query parameters
      const params = new URLSearchParams();
      
      if (cityId) {
        params.append("city_id", cityId);
      }
      
      if (schoolId) {
        params.append("school_id", schoolId);
      }
      
      if (selectedClass !== "all") {
        params.append("class_id", selectedClass);
      }
      
      if (selectedGrade !== "all") {
        params.append("grade_id", selectedGrade);
      }
      
      if (dateFrom) {
        params.append("date_from", dateFrom);
      }
      
      if (dateTo) {
        params.append("date_to", dateTo);
      }

      const url = `/students/password-report?${params.toString()}`;

      // Fazer requisição com responseType blob para receber o arquivo Excel
      const response = await api.get(url, {
        responseType: "blob",
        validateStatus: (status) => status < 500, // Aceitar status < 500 para poder verificar o conteúdo
      });

      // Verificar se a resposta é um erro (blob pode conter JSON de erro)
      const contentType = response.headers["content-type"] || response.headers["Content-Type"] || "";
      
      // Se o Content-Type for JSON ou o status não for 2xx, significa que é um erro
      if (contentType.includes("application/json") || (response.status >= 400 && response.status < 500)) {
        // Converter blob para texto e depois para JSON
        const text = await response.data.text();
        let errorData;
        
        try {
          errorData = JSON.parse(text);
        } catch (parseError) {
          // Se não conseguir parsear, usar mensagem padrão
          console.error("Erro ao parsear resposta de erro:", parseError);
          errorData = { error: "Erro ao processar resposta do servidor." };
        }
        
        toast({
          title: "Erro ao gerar relatório",
          description: errorData.error || "Não foi possível gerar o relatório. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      // Criar blob do arquivo Excel
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Criar URL do blob
      const blobUrl = window.URL.createObjectURL(blob);

      // Criar link de download
      const link = document.createElement("a");
      link.href = blobUrl;

      // Definir nome do arquivo
      const fileName = `relatorio-senhas-${schoolName.replace(/\s+/g, "_")}-${new Date().toISOString().split("T")[0]}.xlsx`;
      link.download = fileName;

      // Adicionar ao DOM, clicar e remover
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Limpar URL do blob
      window.URL.revokeObjectURL(blobUrl);

      toast({
        title: "Relatório gerado com sucesso!",
        description: "O arquivo Excel foi baixado automaticamente.",
      });

      // Fechar modal após sucesso
      onClose();
    } catch (error: any) {
      console.error("Erro ao gerar relatório:", error);
      
      let errorMessage = "Não foi possível gerar o relatório. Tente novamente.";
      
      // Se o erro tem response com blob, tentar extrair a mensagem JSON
      if (error.response?.data && error.response.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // Se não conseguir parsear, usar mensagem padrão
          console.error("Erro ao parsear resposta de erro:", parseError);
        }
      } else if (error.response?.data?.error) {
        // Se o erro já vem como JSON normal
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro ao gerar relatório",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Relatório de Senhas e Logins
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base mt-2">
            Gere um relatório em Excel com as senhas e logins dos alunos da escola{" "}
            <strong>{schoolName}</strong>. Todos os filtros são opcionais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações pré-preenchidas */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2 text-blue-800 dark:text-blue-400">
              Filtros pré-selecionados:
            </h4>
            <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
              <p>
                <strong>Escola:</strong> {schoolName}
              </p>
              <p>
                <strong>Cidade:</strong> Já incluída no filtro
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Série */}
            <div className="space-y-2">
              <Label htmlFor="grade">Série</Label>
              <Select
                value={selectedGrade}
                onValueChange={setSelectedGrade}
                disabled={isLoadingGrades || isGenerating}
              >
                <SelectTrigger id="grade">
                  <SelectValue placeholder="Selecione a série (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as séries</SelectItem>
                  {grades.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Turma */}
            <div className="space-y-2">
              <Label htmlFor="class">Turma</Label>
              <Select
                value={selectedClass}
                onValueChange={setSelectedClass}
                disabled={isGenerating || (selectedGrade !== "all" && filteredClasses.length === 0)}
              >
                <SelectTrigger id="class">
                  <SelectValue placeholder="Selecione a turma (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {filteredClasses.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedGrade !== "all" && filteredClasses.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma turma encontrada para esta série.
                </p>
              )}
            </div>

            {/* Data Inicial */}
            <div className="space-y-2">
              <Label htmlFor="dateFrom">
                <Calendar className="inline h-4 w-4 mr-1" />
                Data Inicial (opcional)
              </Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={isGenerating}
                max={dateTo || undefined}
              />
            </div>

            {/* Data Final */}
            <div className="space-y-2">
              <Label htmlFor="dateTo">
                <Calendar className="inline h-4 w-4 mr-1" />
                Data Final (opcional)
              </Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={isGenerating}
                min={dateFrom || undefined}
              />
            </div>
          </div>

          {/* Informação sobre filtros */}
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Dica:</strong> Se nenhum filtro for selecionado, o relatório incluirá
              todos os alunos da escola. Use os filtros para refinar os resultados.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isGenerating}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="w-full sm:w-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando relatório...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Gerar Relatório
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

