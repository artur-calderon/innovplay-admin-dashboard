import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Eye, FileText, FileSpreadsheet, Users, Target, TrendingUp, TrendingDown } from "lucide-react";
import { EvaluationResultsData, proficiencyColors, proficiencyLabels, ProficiencyLevel, getProficiencyTableInfo } from "@/types/evaluation-results";

interface ResultsTableProps {
  results: EvaluationResultsData[];
  onViewDetails: (result: EvaluationResultsData) => void;
  onExportPDF: (resultId: string) => void;
  onExportExcel: (resultId: string) => void;
}

export function ResultsTable({ results, onViewDetails, onExportPDF, onExportExcel }: ResultsTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'pending':
        return 'Pendente';
      case 'in_progress':
        return 'Em Andamento';
      default:
        return 'Desconhecido';
    }
  };

  // ✅ CORRIGIDO: Usar tabela de proficiência baseada no contexto da avaliação
  const getProficiencyLevel = (proficiency: number, grade?: string, subject?: string): ProficiencyLevel => {
    const tableInfo = getProficiencyTableInfo(grade, subject);
    const table = tableInfo.table;
    
    if (proficiency <= table.abaixo_do_basico.max) return 'abaixo_do_basico';
    if (proficiency <= table.basico.max) return 'basico';
    if (proficiency <= table.adequado.max) return 'adequado';
    return 'avancado';
  };

  const getDistributionSummary = (distribution: any) => {
    const total = Object.values(distribution).reduce((sum: number, count: any) => sum + count, 0);
    const max = Math.max(...Object.values(distribution) as number[]);
    const maxLevel = Object.entries(distribution).find(([_, count]) => count === max)?.[0] as ProficiencyLevel;
    
    return {
      total,
      predominant: maxLevel ? proficiencyLabels[maxLevel] : 'N/A',
      predominantCount: max
    };
  };

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Nenhum resultado encontrado
        </h3>
        <p className="text-gray-600">
          Ajuste os filtros para ver os resultados das avaliações.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Avaliação</TableHead>
            <TableHead>Participação</TableHead>
            <TableHead>Média de Nota</TableHead>
            <TableHead>Média de Proficiência</TableHead>
            <TableHead>Classificação Predominante</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => {
            const proficiencyLevel = getProficiencyLevel(result.averageProficiency, result.grade, result.subject);
            const proficiencyColor = proficiencyColors[proficiencyLevel];
            const participationRate = (result.completedStudents / result.totalStudents) * 100;
            const distribution = getDistributionSummary(result.distributionByLevel);

            return (
              <TableRow key={result.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{result.evaluationTitle}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {result.subject}
                      </Badge>
                      <span>•</span>
                      <span>{result.grade}</span>
                      <span>•</span>
                      <span>{result.school}</span>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {result.completedStudents}/{result.totalStudents}
                      </span>
                    </div>
                    <Progress value={participationRate} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {participationRate.toFixed(1)}%
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-bold">
                      {result.averageRawScore.toFixed(1)}
                    </div>
                    {result.averageRawScore >= 7 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">de 10.0</div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-lg font-bold">
                      {Math.round(result.averageProficiency)}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${proficiencyColor.bg} ${proficiencyColor.text} ${proficiencyColor.border}`}
                    >
                      {proficiencyLabels[proficiencyLevel]}
                    </Badge>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {distribution.predominant}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {distribution.predominantCount} de {distribution.total} alunos
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <Badge className={getStatusColor(result.status)}>
                    {getStatusText(result.status)}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(result.appliedAt)}
                  </div>
                </TableCell>
                
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(result)}
                      title="Ver Detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onExportPDF(result.id)}
                      title="Exportar PDF"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onExportExcel(result.id)}
                      title="Exportar Excel"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// Skeleton para carregamento
export function ResultsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 