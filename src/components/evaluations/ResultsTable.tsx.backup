import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Users,
    Eye,
    Award,
    Target,
    BarChart3
} from "lucide-react";

interface StudentResult {
    id: string;
    nome: string;
    turma: string;
    nota: number;
    proficiencia: number;
    classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
    acertos: number;
    total_questoes: number;
    status: 'concluida' | 'pendente' | 'nao_respondida';
    tempo_gasto?: number;
}

interface ResultsTableProps {
    students: StudentResult[];
    isFiltered: boolean;
    onViewStudentDetails?: (studentId: string) => void;
    title?: string;
    showActions?: boolean;
}

const ResultsTable: React.FC<ResultsTableProps> = ({
    students,
    isFiltered,
    onViewStudentDetails,
    title = "Resultados dos Alunos",
    showActions = true
}) => {
    // ✅ 1. Validação de dados filtrados
    if (!isFiltered) {
        return (
            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Erro de Dados
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                            <strong>Dados não filtrados detectados!</strong>
                            <br />
                            Esta tabela deve receber apenas dados que já foram filtrados e validados.
                            Por favor, aplique os filtros apropriados antes de exibir a tabela.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    // ✅ 5. Filtrar apenas alunos com status concluída (remover incompletos)
    const completedStudents = students.filter(student => 
        student.status === 'concluida' && student.nota > 0
    );

    // Função para obter cor da classificação
    const getClassificationColor = (classification: string) => {
        switch (classification) {
            case 'Avançado':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'Adequado':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'Básico':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'Abaixo do Básico':
                return 'bg-red-100 text-red-800 border-red-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    // Função para formatar tempo
    const formatTime = (seconds?: number) => {
        if (!seconds) return 'N/A';
        const minutes = Math.floor(seconds / 60);
        return `${minutes}min`;
    };

    // Se não há alunos concluídos para mostrar
    if (completedStudents.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Nenhum resultado concluído
                        </h3>
                        <p className="text-gray-600">
                            Não há alunos com avaliações concluídas para exibir.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {title}
                    </span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        ✅ Dados Validados
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="border border-gray-300 p-3 text-left font-semibold">
                                    Status
                                </th>
                                <th className="border border-gray-300 p-3 text-left font-semibold">
                                    Aluno
                                </th>
                                <th className="border border-gray-300 p-3 text-left font-semibold">
                                    Turma
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold">
                                    Acertos
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold">
                                    Nota
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold">
                                    Proficiência
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold">
                                    Classificação
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold">
                                    Tempo
                                </th>
                                {showActions && (
                                    <th className="border border-gray-300 p-3 text-center font-semibold">
                                        Ações
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {completedStudents.map((student, index) => (
                                <tr 
                                    key={student.id}
                                    className={`hover:bg-gray-50 transition-colors ${
                                        index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                                    }`}
                                >
                                    {/* ✅ 3. Check verde para indicar conclusão */}
                                    <td className="border border-gray-300 p-3 text-center">
                                        <div className="flex items-center justify-center">
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        </div>
                                    </td>
                                    
                                    <td className="border border-gray-300 p-3">
                                        <div className="font-medium text-gray-900">
                                            {student.nome}
                                        </div>
                                    </td>
                                    
                                    <td className="border border-gray-300 p-3">
                                        <Badge variant="outline" className="text-xs">
                                            {student.turma}
                                        </Badge>
                                    </td>
                                    
                                    <td className="border border-gray-300 p-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Target className="h-4 w-4 text-blue-600" />
                                            <span className="font-semibold">
                                                {student.acertos}/{student.total_questoes}
                                            </span>
                                        </div>
                                    </td>
                                    
                                    <td className="border border-gray-300 p-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Award className="h-4 w-4 text-purple-600" />
                                            <span className="font-bold text-purple-600">
                                                {student.nota.toFixed(1)}
                                            </span>
                                        </div>
                                    </td>
                                    
                                    <td className="border border-gray-300 p-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <BarChart3 className="h-4 w-4 text-orange-600" />
                                            <span className="font-bold text-orange-600">
                                                {student.proficiencia.toFixed(0)}
                                            </span>
                                        </div>
                                    </td>
                                    
                                    <td className="border border-gray-300 p-3 text-center">
                                        <Badge className={getClassificationColor(student.classificacao)}>
                                            {student.classificacao}
                                        </Badge>
                                    </td>
                                    
                                    <td className="border border-gray-300 p-3 text-center text-sm text-gray-600">
                                        {formatTime(student.tempo_gasto)}
                                    </td>
                                    
                                    {showActions && (
                                        <td className="border border-gray-300 p-3 text-center">
                                            {onViewStudentDetails && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onViewStudentDetails(student.id)}
                                                    onContextMenu={(e) => {
                                                        e.preventDefault();
                                                        const url = `/app/avaliacao/${window.location.pathname.split('/')[3]}/aluno/${student.id}/resultados`;
                                                        window.open(url, '_blank');
                                                    }}
                                                    title="Clique esquerdo: ver detalhes | Clique direito: abrir em nova guia"
                                                    className="text-xs"
                                                >
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    Ver
                                                </Button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* ✅ 4. Rodapé com contagem de alunos exibidos */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold text-blue-800">
                                Resultados Validados
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-blue-700">Alunos exibidos:</span>
                                <Badge className="bg-blue-600 text-white">
                                    {completedStudents.length}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">Total original:</span>
                                <Badge variant="outline">
                                    {students.length}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    
                    {/* Estatísticas rápidas */}
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div className="flex items-center gap-2">
                            <Award className="h-3 w-3 text-purple-600" />
                            <span>Média Nota: <strong>{
                                (completedStudents.reduce((sum, s) => sum + s.nota, 0) / completedStudents.length).toFixed(1)
                            }</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-3 w-3 text-orange-600" />
                            <span>Média Proficiência: <strong>{
                                (completedStudents.reduce((sum, s) => sum + s.proficiencia, 0) / completedStudents.length).toFixed(0)
                            }</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Target className="h-3 w-3 text-blue-600" />
                            <span>Taxa Acerto: <strong>{
                                ((completedStudents.reduce((sum, s) => sum + s.acertos, 0) / 
                                completedStudents.reduce((sum, s) => sum + s.total_questoes, 0)) * 100).toFixed(1)
                            }%</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            <span>Avançados: <strong>{
                                completedStudents.filter(s => s.classificacao === 'Avançado').length
                            }</strong></span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ResultsTable; 