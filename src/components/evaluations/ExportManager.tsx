import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Settings,
  CheckCircle2
} from "lucide-react";

import { EvaluationResultsData } from "@/types/evaluation-results";

interface ExportOptions {
  format: 'pdf' | 'excel';
  includeCharts: boolean;
  includeIndividualResults: boolean;
  includeStatistics: boolean;
  includeQuestionAnalysis: boolean;
  includeClassComparison: boolean;
  template: 'standard' | 'detailed' | 'summary';
}

interface ExportManagerProps {
  results: EvaluationResultsData[];
  selectedResult?: EvaluationResultsData;
  onExport: (options: ExportOptions) => Promise<void>;
}

export function ExportManager({ results, selectedResult, onExport }: ExportManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeCharts: true,
    includeIndividualResults: true,
    includeStatistics: true,
    includeQuestionAnalysis: false,
    includeClassComparison: true,
    template: 'standard'
  });

  const { toast } = useToast();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportProgress(0);

      // Simular progresso da exportação
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      await onExport(options);

      // Finalizar progresso
      clearInterval(progressInterval);
      setExportProgress(100);

      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setIsOpen(false);
        
        toast({
          title: "Exportação concluída!",
          description: `Relatório em ${options.format.toUpperCase()} foi gerado com sucesso.`,
        });
      }, 1000);

    } catch (error) {
      setIsExporting(false);
      setExportProgress(0);
      
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o relatório. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const updateOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const getEstimatedSize = () => {
    let baseSize = selectedResult ? 1 : results.length;
    
    if (options.includeCharts) baseSize *= 1.5;
    if (options.includeIndividualResults) baseSize *= 2;
    if (options.includeQuestionAnalysis) baseSize *= 1.8;
    
    return Math.round(baseSize * 0.5); // MB estimado
  };

  const getEstimatedTime = () => {
    const baseTime = selectedResult ? 5 : results.length * 2;
    return Math.round(baseTime + (options.includeCharts ? 10 : 0));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar Avançado
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurar Exportação
          </DialogTitle>
          <DialogDescription>
            Personalize o relatório conforme suas necessidades
          </DialogDescription>
        </DialogHeader>

        {isExporting ? (
          <div className="space-y-4 py-6">
            <div className="text-center">
              <div className="text-lg font-semibold">Gerando relatório...</div>
              <div className="text-sm text-muted-foreground">
                Processando dados e formatando documento
              </div>
            </div>
            
            <Progress value={exportProgress} className="w-full" />
            
            <div className="text-center text-sm text-muted-foreground">
              {exportProgress.toFixed(0)}% concluído
            </div>

            {exportProgress === 100 && (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Relatório pronto!</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Formato */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Formato de Exportação</Label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    options.format === 'pdf' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateOption('format', 'pdf')}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="font-medium">PDF</div>
                      <div className="text-xs text-muted-foreground">
                        Ideal para apresentações
                      </div>
                    </div>
                  </div>
                </div>
                
                <div
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    options.format === 'excel' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateOption('format', 'excel')}
                >
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Excel</div>
                      <div className="text-xs text-muted-foreground">
                        Para análise de dados
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Template */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Modelo do Relatório</Label>
              <Select 
                value={options.template} 
                onValueChange={(value: 'standard' | 'detailed' | 'summary') => updateOption('template', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">
                    <div>
                      <div className="font-medium">Resumo Executivo</div>
                      <div className="text-xs text-muted-foreground">Apenas estatísticas principais</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="standard">
                    <div>
                      <div className="font-medium">Padrão</div>
                      <div className="text-xs text-muted-foreground">Relatório completo balanceado</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="detailed">
                    <div>
                      <div className="font-medium">Detalhado</div>
                      <div className="text-xs text-muted-foreground">Análise completa e profunda</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Opções de Conteúdo */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Conteúdo a Incluir</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="charts"
                    checked={options.includeCharts}
                    onCheckedChange={(checked) => updateOption('includeCharts', !!checked)}
                  />
                  <Label htmlFor="charts" className="text-sm">
                    Gráficos e visualizações
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="individual"
                    checked={options.includeIndividualResults}
                    onCheckedChange={(checked) => updateOption('includeIndividualResults', !!checked)}
                  />
                  <Label htmlFor="individual" className="text-sm">
                    Resultados individuais dos alunos
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="statistics"
                    checked={options.includeStatistics}
                    onCheckedChange={(checked) => updateOption('includeStatistics', !!checked)}
                  />
                  <Label htmlFor="statistics" className="text-sm">
                    Análise estatística avançada
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="questions"
                    checked={options.includeQuestionAnalysis}
                    onCheckedChange={(checked) => updateOption('includeQuestionAnalysis', !!checked)}
                  />
                  <Label htmlFor="questions" className="text-sm">
                    Análise por questão
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="classes"
                    checked={options.includeClassComparison}
                    onCheckedChange={(checked) => updateOption('includeClassComparison', !!checked)}
                  />
                  <Label htmlFor="classes" className="text-sm">
                    Comparação entre turmas
                  </Label>
                </div>
              </div>
            </div>

            {/* Informações da Exportação */}
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="font-medium text-gray-700">Tamanho estimado:</div>
                  <div className="text-gray-600">~{getEstimatedSize()} MB</div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Tempo estimado:</div>
                  <div className="text-gray-600">~{getEstimatedTime()}s</div>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <Button 
                onClick={handleExport} 
                className="flex-1"
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                Gerar Relatório
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isExporting}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Hook para gerenciar exportações
export function useAdvancedExport() {
  const { toast } = useToast();

  const exportToPDF = async (
    data: EvaluationResultsData[], 
    options: ExportOptions
  ): Promise<void> => {
    // TODO: Implementar exportação PDF real com jsPDF
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Exportando para PDF com opções:', options);
        console.log('Dados:', data);
        resolve();
      }, 2000);
    });
  };

  const exportToExcel = async (
    data: EvaluationResultsData[], 
    options: ExportOptions
  ): Promise<void> => {
    // TODO: Implementar exportação Excel real com XLSX
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Exportando para Excel com opções:', options);
        console.log('Dados:', data);
        resolve();
      }, 2000);
    });
  };

  const handleExport = async (
    data: EvaluationResultsData[], 
    options: ExportOptions
  ): Promise<void> => {
    try {
      if (options.format === 'pdf') {
        await exportToPDF(data, options);
      } else {
        await exportToExcel(data, options);
      }
    } catch (error) {
      console.error('Erro na exportação:', error);
      throw error;
    }
  };

  return {
    exportToPDF,
    exportToExcel,
    handleExport
  };
} 