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
import { FileSpreadsheet, FileText, Download, Loader2, Calendar } from "lucide-react";
import { useAuth } from "@/context/authContext";

type ReportFormat = "excel" | "pdf";

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

  // Formato do relatório: Excel ou PDF
  const [reportFormat, setReportFormat] = useState<ReportFormat>("excel");

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
      setReportFormat("excel");
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
    // Validação de datas (apenas para Excel)
    if (reportFormat === "excel" && dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      toast({
        title: "Erro de validação",
        description: "A data inicial não pode ser maior que a data final.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);

      if (reportFormat === "pdf") {
        // --- Relatório PDF ---
        const params = new URLSearchParams();
        if (schoolId) params.append("school_id", schoolId);
        if (selectedGrade !== "all") params.append("grade_id", selectedGrade);
        if (selectedClass !== "all") params.append("class_id", selectedClass);

        const url = `/students/password-report/pdf?${params.toString()}`;
        const response = await api.get(url, {
          responseType: "blob",
          validateStatus: (status) => status < 500,
        });

        const contentType = response.headers["content-type"] || response.headers["Content-Type"] || "";
        if (contentType.includes("application/json") || (response.status >= 400 && response.status < 500)) {
          const text = await response.data.text();
          let errorData: { error?: string };
          try {
            errorData = JSON.parse(text);
          } catch {
            errorData = { error: "Erro ao processar resposta do servidor." };
          }
          toast({
            title: "Erro ao gerar relatório",
            description: errorData.error || "Não foi possível gerar o relatório PDF. Tente novamente.",
            variant: "destructive",
          });
          return;
        }

        const blob = new Blob([response.data], { type: "application/pdf" });
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;

        const contentDisposition = response.headers["content-disposition"] || response.headers["Content-Disposition"];
        let fileName = `relatorio_acesso_alunos_${schoolName.replace(/\s+/g, "_")}_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.pdf`;
        if (typeof contentDisposition === "string" && contentDisposition.includes("filename=")) {
          const match = contentDisposition.match(/filename[*]?=(?:UTF-8'')?["']?([^"'\s;]+)["']?/i);
          if (match?.[1]) fileName = match[1].trim();
        }
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);

        toast({
          title: "Relatório gerado com sucesso!",
          description: "O arquivo PDF foi baixado automaticamente.",
        });
        onClose();
        return;
      }

      // --- Relatório Excel ---
      const params = new URLSearchParams();
      if (cityId) params.append("city_id", cityId);
      if (schoolId) params.append("school_id", schoolId);
      if (selectedClass !== "all") params.append("class_id", selectedClass);
      if (selectedGrade !== "all") params.append("grade_id", selectedGrade);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      const url = `/students/password-report?${params.toString()}`;
      const response = await api.get(url, {
        responseType: "blob",
        validateStatus: (status) => status < 500,
      });

      const contentType = response.headers["content-type"] || response.headers["Content-Type"] || "";
      if (contentType.includes("application/json") || (response.status >= 400 && response.status < 500)) {
        const text = await response.data.text();
        let errorData: { error?: string };
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = { error: "Erro ao processar resposta do servidor." };
        }
        toast({
          title: "Erro ao gerar relatório",
          description: errorData.error || "Não foi possível gerar o relatório. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `relatorio-senhas-${schoolName.replace(/\s+/g, "_")}-${new Date().toISOString().split("T")[0]}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast({
        title: "Relatório gerado com sucesso!",
        description: "O arquivo Excel foi baixado automaticamente.",
      });
      onClose();
    } catch (error: unknown) {
      console.error("Erro ao gerar relatório:", error);
      let errorMessage = "Não foi possível gerar o relatório. Tente novamente.";

      if (error && typeof error === "object" && "response" in error) {
        const err = error as { response?: { data?: Blob | { error?: string } } };
        if (err.response?.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const errorData = JSON.parse(text);
            errorMessage = errorData.error || errorMessage;
          } catch {
            // ignore
          }
        } else if (err.response?.data && typeof err.response.data === "object" && "error" in err.response.data) {
          errorMessage = (err.response.data as { error: string }).error;
        }
      } else if (error instanceof Error && error.message) {
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
            Gere um relatório com as senhas e logins dos alunos da escola{" "}
            <strong>{schoolName}</strong>. Escolha o formato (Excel ou PDF) e opcionalmente filtre por série ou turma.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Formato do relatório */}
          <div className="space-y-2">
            <Label>Formato do relatório</Label>
            <Select
              value={reportFormat}
              onValueChange={(v) => setReportFormat(v as ReportFormat)}
              disabled={isGenerating}
            >
              <SelectTrigger className="max-w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    Excel (.xlsx)
                  </span>
                </SelectItem>
                <SelectItem value="pdf">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-red-600" />
                    PDF
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Informações pré-preenchidas */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2 text-blue-800 dark:text-blue-400">
              Filtros pré-selecionados:
            </h4>
            <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
              <p>
                <strong>Escola:</strong> {schoolName}
              </p>
              {reportFormat === "excel" && (
                <p>
                  <strong>Cidade:</strong> Já incluída no filtro
                </p>
              )}
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

            {/* Datas: apenas para Excel */}
            {reportFormat === "excel" && (
              <>
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
              </>
            )}
          </div>

          {/* Informação sobre filtros */}
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Dica:</strong> Se nenhum filtro for selecionado, o relatório incluirá
              todos os alunos da escola. Use série ou turma para refinar.
              {reportFormat === "excel" && " No Excel, você também pode filtrar por período (datas)."}
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

