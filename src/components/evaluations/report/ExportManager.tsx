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
import { ERROR_MESSAGES, SUCCESS_MESSAGES, EXPORT_CONFIG } from "../results/constants";

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
          description: SUCCESS_MESSAGES.EXPORT_COMPLETED,
        });
      }, 1000);

    } catch (error) {
      setIsExporting(false);
      setExportProgress(0);
      
      toast({
        title: "Erro na exportação",
        description: ERROR_MESSAGES.SERVER_ERROR,
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
    // Importar bibliotecas necessárias
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    
    // Criar elemento temporário para renderizar o relatório
    const reportElement = document.createElement('div');
    reportElement.style.cssText = `
      position: absolute;
      top: -10000px;
      left: -10000px;
      width: 800px;
      background: white;
      padding: 20px;
      font-family: Arial, sans-serif;
    `;
    
    // Gerar HTML baseado no template escolhido
    let reportHTML = '';
    
    if (options.template === 'summary') {
      reportHTML = generateSummaryHTML(data, options);
    } else if (options.template === 'detailed') {
      reportHTML = generateDetailedHTML(data, options);
    } else {
      reportHTML = generateStandardHTML(data, options);
    }
    
    reportElement.innerHTML = reportHTML;
    document.body.appendChild(reportElement);
    
    // Gerar canvas da imagem
    const canvas = await html2canvas(reportElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    
    // Remover elemento temporário
    document.body.removeChild(reportElement);
    
    // Criar PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    
    let position = 0;
    
    // Adicionar primeira página
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    // Adicionar páginas adicionais se necessário
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    // Salvar PDF
    const fileName = `relatorio-${options.template}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  const exportToExcel = async (
    data: EvaluationResultsData[], 
    options: ExportOptions
  ): Promise<void> => {
    // Importar bibliotecas necessárias
    const XLSX = await import('xlsx');
    const { saveAs } = await import('file-saver');
    
    // Criar workbook
    const workbook = XLSX.utils.book_new();
    
    // Planilha de resumo (sempre incluída)
    const summaryData = [
      ['Relatório de Avaliações - ' + options.template.toUpperCase()],
      [''],
      ['Estatística', 'Valor'],
      ['Total de Avaliações', data.length],
      ['Avaliações Concluídas', data.filter(r => r.status === 'completed').length],
      ['Total de Alunos', data.reduce((sum, r) => sum + r.totalStudents, 0)],
      ['Alunos Participantes', data.reduce((sum, r) => sum + r.completedStudents, 0)],
      ['Média Geral', (data.reduce((sum, r) => sum + r.averageRawScore, 0) / data.length).toFixed(1)],
      ['Proficiência Média', (data.reduce((sum, r) => sum + r.averageProficiency, 0) / data.length).toFixed(0)],
      [''],
      ['Relatório gerado em:', new Date().toLocaleDateString('pt-BR')]
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
    
    // Incluir estatísticas avançadas se solicitado
    if (options.includeStatistics) {
      const statsData = [
        ['Estatísticas Avançadas'],
        [''],
        ['Métrica', 'Valor'],
        ['Desvio Padrão das Notas', calculateStandardDeviation(data.map(r => r.averageRawScore)).toFixed(2)],
        ['Mediana das Notas', calculateMedian(data.map(r => r.averageRawScore)).toFixed(1)],
        ['Taxa de Participação Média', ((data.reduce((sum, r) => sum + (r.completedStudents / r.totalStudents), 0) / data.length) * 100).toFixed(1) + '%'],
        [''],
        ['Distribuição por Nível de Proficiência:'],
        ['Abaixo do Básico', data.reduce((sum, r) => sum + r.distributionByLevel.abaixo_do_basico, 0)],
        ['Básico', data.reduce((sum, r) => sum + r.distributionByLevel.basico, 0)],
        ['Adequado', data.reduce((sum, r) => sum + r.distributionByLevel.adequado, 0)],
        ['Avançado', data.reduce((sum, r) => sum + r.distributionByLevel.avancado, 0)]
      ];
      
      const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
      statsSheet['!cols'] = [{ wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, statsSheet, 'Estatísticas');
    }
    
    // Detalhes das avaliações
    const detailsData = [
      ['Detalhamento das Avaliações'],
      [''],
      ['Avaliação', 'Disciplina', 'Curso', 'Série', 'Escola', 'Data', 'Status', 'Participantes', 'Média', 'Proficiência'],
      ...data.map(result => [
        result.evaluationTitle,
        result.subject,
        result.course,
        result.grade,
        result.school,
        new Date(result.appliedAt).toLocaleDateString('pt-BR'),
        result.status === 'completed' ? 'Concluída' : 'Pendente',
        `${result.completedStudents}/${result.totalStudents}`,
        result.averageRawScore.toFixed(1),
        result.averageProficiency
      ])
    ];
    
    const detailsSheet = XLSX.utils.aoa_to_sheet(detailsData);
    detailsSheet['!cols'] = [
      { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, 
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 10 }
    ];
    XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Avaliações');
    
    // Incluir resultados individuais se solicitado
    if (options.includeIndividualResults) {
      const studentsData = [
        ['Resultados Individuais dos Alunos'],
        [''],
        ['Aluno', 'Avaliação', 'Turma', 'Acertos', 'Proficiência', 'Nota', 'Classificação']
      ];
      
      data.forEach(evaluation => {
        if (evaluation.studentsData) {
          evaluation.studentsData.forEach(student => {
            studentsData.push([
              student.studentName,
              evaluation.evaluationTitle,
              student.studentClass,
              student.correctAnswers,
              student.proficiencyScore,
              student.rawScore.toFixed(1),
              student.classification
            ]);
          });
        }
      });
      
      const studentsSheet = XLSX.utils.aoa_to_sheet(studentsData);
      studentsSheet['!cols'] = [
        { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(workbook, studentsSheet, 'Alunos');
    }
    
    // Comparação entre turmas se solicitado
    if (options.includeClassComparison && data.some(r => r.classesPerformance && r.classesPerformance.length > 0)) {
      const classesData = [
        ['Comparação entre Turmas'],
        [''],
        ['Turma', 'Avaliação', 'Média da Turma', 'Proficiência Média', 'Alunos', 'Taxa de Participação']
      ];
      
      data.forEach(evaluation => {
        if (evaluation.classesPerformance) {
          evaluation.classesPerformance.forEach(classPerf => {
            classesData.push([
              classPerf.className,
              evaluation.evaluationTitle,
              classPerf.averageScore.toFixed(1),
              classPerf.averageProficiency,
              classPerf.totalStudents,
              ((classPerf.completedStudents / classPerf.totalStudents) * 100).toFixed(1) + '%'
            ]);
          });
        }
      });
      
      const classesSheet = XLSX.utils.aoa_to_sheet(classesData);
      classesSheet['!cols'] = [
        { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 8 }, { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(workbook, classesSheet, 'Turmas');
    }
    
    // Gerar arquivo Excel
    const fileName = `relatorio-${options.template}-${new Date().toISOString().split('T')[0]}.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    saveAs(blob, fileName);
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

// Funções auxiliares para cálculos estatísticos
function calculateStandardDeviation(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calculateMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  } else {
    return sorted[middle];
  }
}

// Funções para gerar HTML dos relatórios
function generateSummaryHTML(data: EvaluationResultsData[], options: ExportOptions): string {
  const totalStudents = data.reduce((sum, r) => sum + r.totalStudents, 0);
  const totalCompleted = data.reduce((sum, r) => sum + r.completedStudents, 0);
  const averageScore = data.reduce((sum, r) => sum + r.averageRawScore, 0) / data.length;
  
  return `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #1f2937; margin-bottom: 10px;">Resumo Executivo</h1>
      <p style="color: #6b7280; margin: 0;">Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0;">
      <div style="text-align: center; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="font-size: 32px; font-weight: bold; color: #2563eb;">${data.length}</div>
        <div style="font-size: 14px; color: #6b7280;">Avaliações</div>
      </div>
      <div style="text-align: center; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="font-size: 32px; font-weight: bold; color: #10b981;">${data.filter(r => r.status === 'completed').length}</div>
        <div style="font-size: 14px; color: #6b7280;">Concluídas</div>
      </div>
      <div style="text-align: center; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="font-size: 32px; font-weight: bold; color: #8b5cf6;">${totalCompleted}</div>
        <div style="font-size: 14px; color: #6b7280;">Participantes</div>
      </div>
      <div style="text-align: center; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">${averageScore.toFixed(1)}</div>
        <div style="font-size: 14px; color: #6b7280;">Média Geral</div>
      </div>
    </div>
    
    <div style="margin-top: 40px;">
      <h2 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Principais Indicadores</h2>
      <ul style="list-style: none; padding: 0;">
        <li style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
          <strong>Taxa de Participação:</strong> ${((totalCompleted / totalStudents) * 100).toFixed(1)}%
        </li>
        <li style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
          <strong>Avaliações Pendentes:</strong> ${data.filter(r => r.status === 'pending').length}
        </li>
        <li style="padding: 10px 0;">
          <strong>Proficiência Média:</strong> ${(data.reduce((sum, r) => sum + r.averageProficiency, 0) / data.length).toFixed(0)}
        </li>
      </ul>
    </div>
  `;
}

function generateStandardHTML(data: EvaluationResultsData[], options: ExportOptions): string {
  return `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #1f2937; margin-bottom: 10px;">Relatório de Avaliações</h1>
      <p style="color: #6b7280; margin: 0;">Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>
    
    ${generateSummaryHTML(data, options)}
    
    <div style="margin-top: 40px;">
      <h2 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Detalhamento das Avaliações</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Avaliação</th>
            <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Disciplina</th>
            <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">Participação</th>
            <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">Média</th>
            <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(result => `
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">${result.evaluationTitle}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px;">${result.subject}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">${result.completedStudents}/${result.totalStudents}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">${result.averageRawScore.toFixed(1)}</td>
              <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: center;">
                <span style="padding: 2px 8px; border-radius: 4px; font-size: 12px; ${result.status === 'completed' ? 'background-color: #d1fae5; color: #065f46;' : 'background-color: #fef3c7; color: #92400e;'}">
                  ${result.status === 'completed' ? 'Concluída' : 'Pendente'}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function generateDetailedHTML(data: EvaluationResultsData[], options: ExportOptions): string {
  const totalDistribution = data.reduce((acc, r) => ({
    abaixo_do_basico: acc.abaixo_do_basico + r.distributionByLevel.abaixo_do_basico,
    basico: acc.basico + r.distributionByLevel.basico,
    adequado: acc.adequado + r.distributionByLevel.adequado,
    avancado: acc.avancado + r.distributionByLevel.avancado
  }), { abaixo_do_basico: 0, basico: 0, adequado: 0, avancado: 0 });
  
  return `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #1f2937; margin-bottom: 10px;">Relatório Detalhado de Avaliações</h1>
      <p style="color: #6b7280; margin: 0;">Análise completa gerada em ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>
    
    ${generateStandardHTML(data, options)}
    
    <div style="margin-top: 40px;">
      <h2 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Distribuição por Nível de Proficiência</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0;">
        <div style="text-align: center; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #fef2f2;">
          <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${totalDistribution.abaixo_do_basico}</div>
          <div style="font-size: 12px; color: #dc2626;">Abaixo do Básico</div>
        </div>
        <div style="text-align: center; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #fefce8;">
          <div style="font-size: 24px; font-weight: bold; color: #ca8a04;">${totalDistribution.basico}</div>
          <div style="font-size: 12px; color: #ca8a04;">Básico</div>
        </div>
        <div style="text-align: center; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f0fdf4;">
          <div style="font-size: 24px; font-weight: bold; color: #16a34a;">${totalDistribution.adequado}</div>
          <div style="font-size: 12px; color: #16a34a;">Adequado</div>
        </div>
        <div style="text-align: center; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f0fdf4;">
          <div style="font-size: 24px; font-weight: bold; color: #15803d;">${totalDistribution.avancado}</div>
          <div style="font-size: 12px; color: #15803d;">Avançado</div>
        </div>
      </div>
    </div>
    
    ${options.includeStatistics ? `
      <div style="margin-top: 40px;">
        <h2 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Estatísticas Avançadas</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tbody>
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 10px; font-weight: bold;">Desvio Padrão das Notas</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px;">${calculateStandardDeviation(data.map(r => r.averageRawScore)).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 10px; font-weight: bold;">Mediana das Notas</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px;">${calculateMedian(data.map(r => r.averageRawScore)).toFixed(1)}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #e5e7eb; padding: 10px; font-weight: bold;">Taxa de Participação Média</td>
              <td style="border: 1px solid #e5e7eb; padding: 10px;">${((data.reduce((sum, r) => sum + (r.completedStudents / r.totalStudents), 0) / data.length) * 100).toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    ` : ''}
  `;
} 