import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft,
  Download,
  Printer,
  FileText,
  Users,
  Target,
  Award,
  BookOpen,
  TrendingUp,
  TrendingDown,
  BarChart,
  PieChart,
  File,
  FileSpreadsheet,
  ChevronDown
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EvaluationResultsData } from "@/types/evaluation-results";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface EvaluationReportProps {
  onBack?: () => void;
}

export default function EvaluationReport({ onBack }: EvaluationReportProps) {
  const [results, setResults] = useState<EvaluationResultsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setIsLoading(true);
      const response = await EvaluationResultsApiService.getEvaluations();
      setResults(response.results);
      setIsBackendConnected(response.isBackendConnected);
      
      if (!response.isBackendConnected) {
        toast({
          title: "Usando dados de exemplo",
          description: "Não foi possível conectar com o backend. Exibindo dados de exemplo.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar resultados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados para o relatório",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDFBase = async () => {
    if (!reportRef.current) return null;
    
    try {
      // Capturar o conteúdo do relatório como imagem
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      // Carregar a logo
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      const logoPromise = new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => reject(new Error('Erro ao carregar logo'));
        logoImg.src = '/logo-header.png';
      });

      try {
        await logoPromise;
        
        // Configurações da logo
        const logoWidth = 40; // largura da logo em mm
        const logoHeight = (logoImg.height * logoWidth) / logoImg.width; // manter proporção
        const logoX = imgWidth - logoWidth - 10; // posição X (10mm da margem direita)
        const logoY = 10; // posição Y (10mm do topo)
        
        // Adicionar primeira página com logo
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        pdf.addImage(logoImg.src, 'PNG', logoX, logoY, logoWidth, logoHeight);
        heightLeft -= pageHeight;
        
        // Adicionar páginas adicionais se necessário
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          // Adicionar logo também nas páginas seguintes
          pdf.addImage(logoImg.src, 'PNG', logoX, logoY, logoWidth, logoHeight);
          heightLeft -= pageHeight;
        }
      } catch (logoError) {
        console.warn('Erro ao carregar logo, gerando PDF sem logo:', logoError);
        // Gerar PDF sem logo em caso de erro
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }
      
      return pdf;
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw error;
    }
  };

  const savePDFReport = async () => {
    setIsGenerating(true);
    
    try {
      const pdf = await generatePDFBase();
      if (!pdf) return;
      
      // Salvar o PDF
      const fileName = `relatorio-avaliacoes-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "PDF salvo com sucesso!",
        description: "O relatório foi baixado em formato PDF.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar PDF",
        description: "Não foi possível salvar o relatório em PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const printPDFReport = async () => {
    setIsGenerating(true);
    
    try {
      const pdf = await generatePDFBase();
      if (!pdf) return;
      
      // Abrir o PDF em uma nova janela para impressão
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      
      toast({
        title: "PDF aberto para impressão!",
        description: "O relatório foi aberto em uma nova aba para impressão.",
      });
    } catch (error) {
      toast({
        title: "Erro ao imprimir PDF",
        description: "Não foi possível abrir o PDF para impressão",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCSVReport = async () => {
    try {
      setIsGenerating(true);
      
      // Gerar conteúdo CSV a partir dos dados atuais
      const csvContent = generateCSVFromResults(results);
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-avaliacoes-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "Relatório CSV gerado!",
        description: "O arquivo CSV foi baixado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório CSV",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateExcelReport = async () => {
    try {
      setIsGenerating(true);
      
      // Gerar dados Excel a partir dos dados atuais
      const excelData = generateExcelFromResults(results);
      
      // Criar um novo workbook
      const workbook = XLSX.utils.book_new();
      
      // Criar planilha do resumo
      const summaryWorksheet = XLSX.utils.aoa_to_sheet(excelData.summary);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Resumo');
      
      // Criar planilha de análise de dificuldade
      const difficultyWorksheet = XLSX.utils.aoa_to_sheet(excelData.difficulty);
      XLSX.utils.book_append_sheet(workbook, difficultyWorksheet, 'Análise Dificuldade');
      
      // Criar planilha de resultados das avaliações
      const evaluationsWorksheet = XLSX.utils.aoa_to_sheet(excelData.evaluations);
      XLSX.utils.book_append_sheet(workbook, evaluationsWorksheet, 'Avaliações');
      
      // Aplicar formatação básica
      const range = XLSX.utils.decode_range(summaryWorksheet['!ref'] || 'A1');
      
      // Definir larguras das colunas
      summaryWorksheet['!cols'] = [
        { wch: 30 }, // Coluna A
        { wch: 15 }, // Coluna B
        { wch: 15 }, // Coluna C
        { wch: 20 }, // Coluna D
        { wch: 15 }, // Coluna E
        { wch: 12 }, // Coluna F
        { wch: 12 }, // Coluna G
        { wch: 10 }, // Coluna H
        { wch: 15 }, // Coluna I
        { wch: 12 }, // Coluna J
        { wch: 12 }  // Coluna K
      ];
      
      difficultyWorksheet['!cols'] = [
        { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];
      
      evaluationsWorksheet['!cols'] = [
        { wch: 30 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }
      ];
      
      // Gerar o arquivo Excel
      const fileName = `relatorio-avaliacoes-${new Date().toISOString().split('T')[0]}.xlsx`;
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(blob, fileName);
      
      toast({
        title: "Excel gerado com sucesso!",
        description: "O relatório foi baixado em formato Excel (.xlsx).",
      });
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      toast({
        title: "Erro ao gerar Excel",
        description: "Não foi possível gerar o relatório em Excel",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const printReport = () => {
    if (reportRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Relatório de Avaliações</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .section { margin-bottom: 25px; }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
                .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                .stat-value { font-size: 24px; font-weight: bold; color: #2563eb; }
                .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
                .progress-bar { width: 100%; height: 20px; background-color: #f0f0f0; border-radius: 10px; overflow: hidden; }
                .progress-fill { height: 100%; background-color: #10b981; }
                @media print { .no-print { display: none; } }
              </style>
            </head>
            <body>
              ${reportRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  // Função para gerar CSV a partir dos resultados
  const generateCSVFromResults = (results: EvaluationResultsData[]): string => {
    const headers = [
      'Avaliação',
      'Disciplina',
      'Curso',
      'Série',
      'Escola',
      'Município',
      'Data Aplicação',
      'Status',
      'Total Alunos',
      'Participantes',
      'Média',
      'Proficiência',
      'Abaixo Básico',
      'Básico',
      'Adequado',
      'Avançado'
    ];
    
    const rows = results.map(result => [
      result.evaluationTitle,
      result.subject,
      result.course,
      result.grade,
      result.school,
      result.municipality,
      new Date(result.appliedAt).toLocaleDateString('pt-BR'),
      result.status === 'completed' ? 'Concluída' : 'Pendente',
      result.totalStudents.toString(),
      result.completedStudents.toString(),
      result.averageRawScore.toFixed(1),
      result.averageProficiency.toString(),
      result.distributionByLevel.abaixo_do_basico.toString(),
      result.distributionByLevel.basico.toString(),
      result.distributionByLevel.adequado.toString(),
      result.distributionByLevel.avancado.toString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  // Função para gerar dados Excel a partir dos resultados
  const generateExcelFromResults = (results: EvaluationResultsData[]) => {
    const summary = [
      ['Resumo Executivo - Relatório de Avaliações'],
      [''],
      ['Estatística', 'Valor'],
      ['Total de Avaliações', results.length.toString()],
      ['Avaliações Concluídas', results.filter(r => r.status === 'completed').length.toString()],
      ['Total de Alunos', results.reduce((sum, r) => sum + r.totalStudents, 0).toString()],
      ['Alunos Participantes', results.reduce((sum, r) => sum + r.completedStudents, 0).toString()],
      ['Média Geral', (results.reduce((sum, r) => sum + r.averageRawScore, 0) / results.length).toFixed(1)],
      ['Proficiência Média', (results.reduce((sum, r) => sum + r.averageProficiency, 0) / results.length).toFixed(0)]
    ];

    const difficulty = [
      ['Análise por Nível de Dificuldade'],
      [''],
      ['Avaliação', 'Abaixo do Básico', 'Básico', 'Adequado', 'Avançado', 'Total'],
      ...results.map(result => [
        result.evaluationTitle,
        result.distributionByLevel.abaixo_do_basico.toString(),
        result.distributionByLevel.basico.toString(),
        result.distributionByLevel.adequado.toString(),
        result.distributionByLevel.avancado.toString(),
        result.completedStudents.toString()
      ])
    ];

    const evaluations = [
      ['Detalhamento das Avaliações'],
      [''],
      ['Avaliação', 'Disciplina', 'Curso', 'Série', 'Escola', 'Município', 'Data', 'Status', 'Participação'],
      ...results.map(result => [
        result.evaluationTitle,
        result.subject,
        result.course,
        result.grade,
        result.school,
        result.municipality,
        new Date(result.appliedAt).toLocaleDateString('pt-BR'),
        result.status === 'completed' ? 'Concluída' : 'Pendente',
        `${result.completedStudents}/${result.totalStudents}`
      ])
    ];

    return {
      summary,
      difficulty,
      evaluations
    };
  };

  // Cálculos para estatísticas gerais
  const completedResults = results.filter(r => r.status === 'completed');
  const pendingResults = results.filter(r => r.status === 'pending');
  const totalStudents = results.reduce((sum, r) => sum + r.totalStudents, 0);
  const totalCompleted = results.reduce((sum, r) => sum + r.completedStudents, 0);
  const averageScore = completedResults.length > 0 
    ? completedResults.reduce((sum, r) => sum + r.averageRawScore, 0) / completedResults.length 
    : 0;
  const averageProficiency = completedResults.length > 0
    ? completedResults.reduce((sum, r) => sum + r.averageProficiency, 0) / completedResults.length
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold">Relatório de Avaliações</h2>
            <p className="text-sm text-muted-foreground">
              Relatório completo gerado em {new Date().toLocaleDateString('pt-BR')}
              {!isBackendConnected && (
                <span className="ml-2 text-orange-600">(dados de exemplo)</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printReport} className="no-print">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={generateExcelReport} disabled={isGenerating} className="no-print">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {isGenerating ? 'Gerando...' : 'Excel'}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={isGenerating} className="no-print">
                <File className="h-4 w-4 mr-2" />
                {isGenerating ? 'Gerando...' : 'PDF'}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={savePDFReport} disabled={isGenerating}>
                <Download className="h-4 w-4 mr-2" />
                Salvar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={printPDFReport} disabled={isGenerating}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Conteúdo do Relatório */}
      <div ref={reportRef} className="space-y-8">
        {/* Estatísticas Gerais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Resumo Executivo
            </CardTitle>
            <CardDescription>
              Visão geral do desempenho de todas as avaliações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{results.length}</div>
                <div className="text-sm text-muted-foreground">Total de Avaliações</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{completedResults.length}</div>
                <div className="text-sm text-muted-foreground">Concluídas</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{totalCompleted}</div>
                <div className="text-sm text-muted-foreground">Alunos Participantes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{averageScore.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">Média Geral</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">{averageProficiency.toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">Proficiência Média</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status das Avaliações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Status das Avaliações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg bg-green-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{completedResults.length}</div>
                    <div className="text-sm text-green-700">Concluídas</div>
                  </div>
                  <Award className="h-8 w-8 text-green-600" />
                </div>
                <Progress value={(completedResults.length / results.length) * 100} className="mt-2" />
              </div>

              <div className="p-4 border rounded-lg bg-orange-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{pendingResults.length}</div>
                    <div className="text-sm text-orange-700">Pendentes</div>
                  </div>
                  <FileText className="h-8 w-8 text-orange-600" />
                </div>
                <Progress value={(pendingResults.length / results.length) * 100} className="mt-2" />
              </div>

              <div className="p-4 border rounded-lg bg-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{totalStudents}</div>
                    <div className="text-sm text-blue-700">Total de Alunos</div>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {totalCompleted} participaram ({totalStudents > 0 ? ((totalCompleted / totalStudents) * 100).toFixed(1) : '0'}%)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalhamento por Avaliação */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento por Avaliação</CardTitle>
            <CardDescription>
              Resultados individuais de cada avaliação aplicada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Avaliação</TableHead>
                  <TableHead>Disciplina</TableHead>
                  <TableHead>Participação</TableHead>
                  <TableHead>Média</TableHead>
                  <TableHead>Proficiência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="font-medium">{result.evaluationTitle}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{result.subject}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{result.completedStudents}/{result.totalStudents}</span>
                        <Progress 
                          value={(result.completedStudents / result.totalStudents) * 100} 
                          className="w-16 h-2" 
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{result.averageRawScore.toFixed(1)}</span>
                        {result.averageRawScore >= 7 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={result.averageRawScore >= 6 ? "default" : "destructive"}>
                        {result.averageProficiency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={result.status === 'completed' ? 'default' : 'secondary'}
                      >
                        {result.status === 'completed' ? 'Concluída' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(result.appliedAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Análise de Desempenho */}
        <Card>
          <CardHeader>
            <CardTitle>Análise de Desempenho por Nível</CardTitle>
            <CardDescription>
              Distribuição dos alunos por nível de proficiência
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {completedResults.map((result) => (
                <div key={result.id} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">{result.evaluationTitle}</h4>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-medium">Abaixo do Básico</span>
                      </div>
                      <div className="text-lg font-bold">{result.distributionByLevel.abaixo_do_basico}</div>
                      <div className="text-xs text-muted-foreground">alunos</div>
                    </div>
                    
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm font-medium">Básico</span>
                      </div>
                      <div className="text-lg font-bold">{result.distributionByLevel.basico}</div>
                      <div className="text-xs text-muted-foreground">alunos</div>
                    </div>
                    
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <span className="text-sm font-medium">Adequado</span>
                      </div>
                      <div className="text-lg font-bold">{result.distributionByLevel.adequado}</div>
                      <div className="text-xs text-muted-foreground">alunos</div>
                    </div>
                    
                    <div className="p-3 bg-green-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 bg-green-700 rounded-full"></div>
                        <span className="text-sm font-medium text-white">Avançado</span>
                      </div>
                      <div className="text-lg font-bold text-white">{result.distributionByLevel.avancado}</div>
                      <div className="text-xs text-green-200">alunos</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 