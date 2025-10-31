import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Upload, FileSpreadsheet, Download, X, CheckCircle, AlertCircle, Loader2, FileText } from "lucide-react";

interface BulkUploadStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName: string;
  onSuccess: () => void;
}

interface UploadResult {
  mensagem: string;
  resumo: {
    total_linhas: number;
    sucessos: number;
    erros: number;
  };
  alunos_criados: Array<{
    nome: string;
    email: string;
    senha: string;
    data_nascimento: string;
    matricula: string;
    escola: string;
    endereco_escola: string;
    estado_escola: string;
    municipio_escola: string;
    curso: string;
    serie: string;
    turma: string;
    foto_perfil?: string;
  }>;
  erros: Array<{
    linha: number;
    campo: string;
    valor: string;
    erro: string;
  }>;
}

export function BulkUploadStudentsModal({
  isOpen,
  onClose,
  schoolId,
  schoolName,
  onSuccess,
}: BulkUploadStudentsModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Formato não suportado",
        description: "Por favor, selecione um arquivo CSV, XLS ou XLSX",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await api.post('/users/bulk-upload-students', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadResult(response.data);
      
      if (response.data.resumo.sucessos > 0) {
        toast({
          title: "Upload concluído com sucesso!",
          description: `${response.data.resumo.sucessos} alunos foram criados`,
        });
        onSuccess();
      } else {
        toast({
          title: "Upload concluído com erros",
          description: "Nenhum aluno foi criado. Verifique os erros abaixo.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Erro no upload:', error);
      
      let errorMessage = "Erro ao fazer upload do arquivo";
      if (error.response?.data?.erro) {
        errorMessage = error.response.data.erro;
      } else if (error.response?.data?.mensagem) {
        errorMessage = error.response.data.mensagem;
      }
      
      toast({
        title: "Erro no upload",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadResult(null);
    onClose();
  };

  const downloadCSVTemplate = () => {
    const csvContent = `nome,email,senha,data_nascimento,matricula,escola,endereco_escola,estado_escola,municipio_escola,curso,serie,turma
João Silva,joao.silva@email.com,123456,15/03/2008,2024001,${schoolName},Rua das Flores 123,SP,São Paulo,Anos Finais,6º Ano,Turma A
Maria Santos,maria.santos@email.com,123456,22/07/2008,2024002,${schoolName},Rua das Flores 123,SP,São Paulo,Anos Finais,6º Ano,Turma A
Pedro Oliveira,pedro.oliveira@email.com,123456,10/11/2008,2024003,${schoolName},Rua das Flores 123,SP,São Paulo,Anos Finais,6º Ano,Turma B
Ana Costa,ana.costa@email.com,123456,05/05/2008,2024004,${schoolName},Rua das Flores 123,SP,São Paulo,Anos Finais,6º Ano,Turma B
Lucas Ferreira,lucas.ferreira@email.com,123456,18/09/2008,2024005,${schoolName},Rua das Flores 123,SP,São Paulo,Anos Finais,6º Ano,Turma C
Julia Rodrigues,julia.rodrigues@email.com,123456,12/12/2008,2024006,${schoolName},Rua das Flores 123,SP,São Paulo,Anos Finais,6º Ano,Turma C
Carlos Lima,carlos.lima@email.com,123456,25/04/2008,2024007,${schoolName},Rua das Flores 123,SP,São Paulo,Anos Finais,6º Ano,Turma C
Fernanda Costa,fernanda.costa@email.com,123456,30/01/2009,2024008,${schoolName},Av. Principal 456,RJ,Rio de Janeiro,Anos Finais,6º Ano,Turma A
Roberto Alves,roberto.alves@email.com,123456,14/06/2009,2024009,${schoolName},Av. Principal 456,RJ,Rio de Janeiro,Anos Finais,6º Ano,Turma A
Patricia Souza,patricia.souza@email.com,123456,08/08/2009,2024010,${schoolName},Av. Principal 456,RJ,Rio de Janeiro,Anos Finais,6º Ano,Turma B`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_alunos.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadExcelTemplate = async () => {
    try {
      // Importar a biblioteca XLSX dinamicamente
      const XLSX = await import('xlsx');
      
      // Dados do template
      const templateData = [
        ['nome', 'email', 'senha', 'data_nascimento', 'matricula', 'escola', 'endereco_escola', 'estado_escola', 'municipio_escola', 'curso', 'serie', 'turma'],
        ['João Silva', 'joao.silva@email.com', '123456', '15/03/2008', '2024001', schoolName, 'Rua das Flores 123', 'SP', 'São Paulo', 'Anos Finais', '6º Ano', 'Turma A'],
        ['Maria Santos', 'maria.santos@email.com', '123456', '22/07/2008', '2024002', schoolName, 'Rua das Flores 123', 'SP', 'São Paulo', 'Anos Finais', '6º Ano', 'Turma A'],
        ['Pedro Oliveira', 'pedro.oliveira@email.com', '123456', '10/11/2008', '2024003', schoolName, 'Rua das Flores 123', 'SP', 'São Paulo', 'Anos Finais', '6º Ano', 'Turma B'],
        ['Ana Costa', 'ana.costa@email.com', '123456', '05/05/2008', '2024004', schoolName, 'Rua das Flores 123', 'SP', 'São Paulo', 'Anos Finais', '6º Ano', 'Turma B'],
        ['Lucas Ferreira', 'lucas.ferreira@email.com', '123456', '18/09/2008', '2024005', schoolName, 'Rua das Flores 123', 'SP', 'São Paulo', 'Anos Finais', '6º Ano', 'Turma C'],
        ['Julia Rodrigues', 'julia.rodrigues@email.com', '123456', '12/12/2008', '2024006', schoolName, 'Rua das Flores 123', 'SP', 'São Paulo', 'Anos Finais', '6º Ano', 'Turma C'],
        ['Carlos Lima', 'carlos.lima@email.com', '123456', '25/04/2008', '2024007', schoolName, 'Rua das Flores 123', 'SP', 'São Paulo', 'Anos Finais', '6º Ano', 'Turma C'],
        ['Fernanda Costa', 'fernanda.costa@email.com', '123456', '30/01/2009', '2024008', schoolName, 'Av. Principal 456', 'RJ', 'Rio de Janeiro', 'Anos Finais', '6º Ano', 'Turma A'],
        ['Roberto Alves', 'roberto.alves@email.com', '123456', '14/06/2009', '2024009', schoolName, 'Av. Principal 456', 'RJ', 'Rio de Janeiro', 'Anos Finais', '6º Ano', 'Turma A'],
        ['Patricia Souza', 'patricia.souza@email.com', '123456', '08/08/2009', '2024010', schoolName, 'Av. Principal 456', 'RJ', 'Rio de Janeiro', 'Anos Finais', '6º Ano', 'Turma B']
      ];
      
      // Criar planilha
      const worksheet = XLSX.utils.aoa_to_sheet(templateData);
      
      // Configurar largura das colunas
      const columnWidths = [
        { wch: 20 }, // nome
        { wch: 25 }, // email
        { wch: 10 }, // senha
        { wch: 15 }, // data_nascimento
        { wch: 12 }, // matricula
        { wch: 25 }, // escola
        { wch: 30 }, // endereco_escola
        { wch: 8 },  // estado_escola
        { wch: 20 }, // municipio_escola
        { wch: 20 }, // curso
        { wch: 12 }, // serie
        { wch: 12 }  // turma
      ];
      worksheet['!cols'] = columnWidths;
      
      // Estilizar cabeçalho (primeira linha)
      for (let col = 0; col < templateData[0].length; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4472C4" } },
            alignment: { horizontal: "center" }
          };
        }
      }
      
      // Estilizar linhas de exemplo (linhas 2-11)
      for (let row = 1; row < templateData.length; row++) {
        for (let col = 0; col < templateData[row].length; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (worksheet[cellAddress]) {
            worksheet[cellAddress].s = {
              fill: { fgColor: { rgb: "F2F2F2" } }
            };
          }
        }
      }
      
      // Criar workbook e adicionar planilha
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Alunos');
      
      // Gerar arquivo Excel
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      
      // Criar blob e download
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_alunos.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Modelo Excel baixado",
        description: "O arquivo Excel (.xlsx) foi baixado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao gerar arquivo Excel:', error);
      toast({
        title: "Erro ao gerar arquivo Excel",
        description: "Não foi possível gerar o arquivo Excel. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-3xl lg:max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            Importar Alunos em Massa
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Importe uma lista de alunos através de um arquivo CSV ou Excel. 
            O arquivo deve conter as colunas: <strong>nome, email, senha, data_nascimento, matricula, escola, endereco_escola, estado_escola, municipio_escola, curso, serie e turma</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 py-4">
          {/* Template Download */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Modelos de Arquivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Baixe os modelos com as colunas necessárias para importação. O arquivo Excel pode ser editado diretamente.
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={downloadCSVTemplate}>
                    <FileText className="h-4 w-4 mr-2" />
                    Baixar CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadExcelTemplate}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Baixar Excel (.xlsx)
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                  <strong>Colunas do arquivo:</strong> nome, email, senha, data_nascimento, matricula, escola, endereco_escola, estado_escola, municipio_escola, curso, serie, turma
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Selecionar Arquivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                
                {!selectedFile ? (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Arraste e solte um arquivo aqui
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        ou clique para selecionar
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Selecionar Arquivo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FileSpreadsheet className="h-12 w-12 mx-auto text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remover
                      </Button>
                      <Button
                        onClick={handleUpload}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Enviar Arquivo
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upload Result */}
          {uploadResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resultado do Upload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {uploadResult.resumo.total_linhas}
                    </div>
                    <div className="text-xs text-gray-500">Total de Linhas</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {uploadResult.resumo.sucessos}
                    </div>
                    <div className="text-xs text-green-600">Sucessos</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {uploadResult.resumo.erros}
                    </div>
                    <div className="text-xs text-red-600">Erros</div>
                  </div>
                </div>

                {/* Success Message */}
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      {uploadResult.mensagem}
                    </span>
                  </div>
                </div>

                {/* Created Students */}
                {uploadResult.alunos_criados.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Alunos Criados</h4>
                    <div className="space-y-2">
                                             {uploadResult.alunos_criados.map((aluno, index) => (
                         <div key={index} className="flex items-center gap-3 p-2 bg-green-50 rounded border border-green-200">
                           <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                           <div className="flex-1 min-w-0">
                             <div className="text-sm font-medium">{aluno.nome}</div>
                             <div className="text-xs text-gray-600">{aluno.email}</div>
                             <div className="text-xs text-gray-500">Matrícula: {aluno.matricula}</div>
                           </div>
                           <div className="text-xs text-gray-500 text-right">
                             <div>{aluno.turma} - {aluno.serie}</div>
                             <div>Nasc: {aluno.data_nascimento}</div>
                             <div>Curso: {aluno.curso}</div>
                           </div>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {uploadResult.erros.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-red-700">Erros Encontrados</h4>
                    <div className="space-y-2">
                      {uploadResult.erros.map((erro, index) => (
                        <div key={index} className="flex items-start gap-3 p-2 bg-red-50 rounded border border-red-200">
                          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-red-800">
                              Linha {erro.linha}: {erro.campo}
                            </div>
                            <div className="text-xs text-red-600">
                              Valor: {erro.valor}
                            </div>
                            <div className="text-xs text-red-600">
                              Erro: {erro.erro}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
