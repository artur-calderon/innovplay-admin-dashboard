import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
    ArrowLeft,
    Download,
    TrendingUp,
    Users,
    Target,
    Clock,
    CheckCircle2,
    XCircle,
    Minus,
    Search,
    Eye,
    BarChart3
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";

// Importar a interface DetailedReport do serviço
interface DetailedReport {
    avaliacao: {
        id: string;
        titulo: string;
        disciplina: string;
        total_questoes: number;
    };
    questoes: Array<{
        id: string;
        numero: number;
        texto: string;
        habilidade: string;
        codigo_habilidade: string;
        tipo: 'multipleChoice' | 'open' | 'trueFalse';
        dificuldade: 'Fácil' | 'Médio' | 'Difícil';
        porcentagem_acertos: number;
        porcentagem_erros: number;
    }>;
    alunos: Array<{
        id: string;
        nome: string;
        turma: string;
        respostas: Array<{
            questao_id: string;
            questao_numero: number;
            resposta_correta: boolean;
            resposta_em_branco: boolean;
            tempo_gasto: number;
        }>;
        total_acertos: number;
        total_erros: number;
        total_em_branco: number;
        nota_final: number;
        proficiencia: number;
        classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
        status: 'concluida' | 'nao_respondida';
    }>;
}

interface DetailedResultsViewProps {
    onBack: () => void;
}

interface StudentResult {
    id: string;
    nome: string;
    turma: string;
    nota: number;
    proficiencia: number;
    classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
    questoes_respondidas: number;
    acertos: number;
    erros: number;
    em_branco: number;
    tempo_gasto: number;
    status: 'concluida' | 'pendente';
}

interface EvaluationInfo {
    id: string;
    titulo: string;
    disciplina: string;
    curso: string;
    serie: string;
    escola: string;
    municipio: string;
    data_aplicacao: string;
    status: 'concluida' | 'em_andamento' | 'pendente';
    total_alunos: number;
    alunos_participantes: number;
    alunos_ausentes: number;
    media_nota: number;
    media_proficiencia: number;
    distribuicao_classificacao: {
        abaixo_do_basico: number;
        basico: number;
        adequado: number;
        avancado: number;
    };
}

export default function DetailedResultsView({ onBack }: DetailedResultsViewProps) {
    const { id: evaluationId } = useParams<{ id: string }>();
    const [evaluationInfo, setEvaluationInfo] = useState<EvaluationInfo | null>(null);
    const [students, setStudents] = useState<StudentResult[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<StudentResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [classificationFilter, setClassificationFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        if (evaluationId) {
            fetchDetailedResults();
        }
    }, [evaluationId]);

    // Filtrar alunos baseado nos filtros
    useEffect(() => {
        let filtered = students;

        // Filtro por busca
        if (searchTerm) {
            filtered = filtered.filter(student =>
                student.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                student.turma.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtro por classificação
        if (classificationFilter !== 'all') {
            filtered = filtered.filter(student => student.classificacao === classificationFilter);
        }

        // Filtro por status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(student => student.status === statusFilter);
        }

        setFilteredStudents(filtered);
    }, [students, searchTerm, classificationFilter, statusFilter]);

    const fetchDetailedResults = async () => {
        try {
            setIsLoading(true);

            console.log("🔍 Buscando avaliação específica:", evaluationId);

            // Buscar relatório detalhado da avaliação
            const detailedReport: DetailedReport | null = await EvaluationResultsApiService.getDetailedReport(evaluationId!);

            console.log("📊 Relatório detalhado:", detailedReport);

            if (detailedReport) {
                // Transformar dados do relatório para o formato esperado
                const evaluationInfo: EvaluationInfo = {
                    id: detailedReport.avaliacao.id,
                    titulo: detailedReport.avaliacao.titulo,
                    disciplina: detailedReport.avaliacao.disciplina,
                    curso: '', // Não disponível no relatório
                    serie: '', // Não disponível no relatório
                    escola: '', // Não disponível no relatório
                    municipio: '', // Não disponível no relatório
                    data_aplicacao: new Date().toISOString(), // Não disponível no relatório
                    status: 'concluida',
                    total_alunos: detailedReport.alunos.length,
                    alunos_participantes: detailedReport.alunos.filter(a => a.status === 'concluida').length,
                    alunos_ausentes: detailedReport.alunos.filter(a => a.status === 'nao_respondida').length,
                    media_nota: detailedReport.alunos.filter(a => a.status === 'concluida').length > 0
                        ? detailedReport.alunos.filter(a => a.status === 'concluida').reduce((sum, aluno) => sum + aluno.nota_final, 0) / detailedReport.alunos.filter(a => a.status === 'concluida').length
                        : 0,
                    media_proficiencia: detailedReport.alunos.filter(a => a.status === 'concluida').length > 0
                        ? detailedReport.alunos.filter(a => a.status === 'concluida').reduce((sum, aluno) => sum + aluno.proficiencia, 0) / detailedReport.alunos.filter(a => a.status === 'concluida').length
                        : 0,
                    distribuicao_classificacao: {
                        abaixo_do_basico: detailedReport.alunos.filter(a => a.classificacao === 'Abaixo do Básico').length,
                        basico: detailedReport.alunos.filter(a => a.classificacao === 'Básico').length,
                        adequado: detailedReport.alunos.filter(a => a.classificacao === 'Adequado').length,
                        avancado: detailedReport.alunos.filter(a => a.classificacao === 'Avançado').length,
                    }
                };

                setEvaluationInfo(evaluationInfo);

                // Transformar alunos do relatório para o formato esperado
                const studentsData: StudentResult[] = detailedReport.alunos.map(aluno => ({
                    id: aluno.id,
                    nome: aluno.nome,
                    turma: aluno.turma,
                    nota: aluno.nota_final,
                    proficiencia: aluno.proficiencia,
                    classificacao: aluno.classificacao,
                    questoes_respondidas: aluno.total_acertos + aluno.total_erros,
                    acertos: aluno.total_acertos,
                    erros: aluno.total_erros,
                    em_branco: aluno.total_em_branco,
                    tempo_gasto: aluno.respostas.reduce((sum, resp) => sum + resp.tempo_gasto, 0),
                    status: aluno.status === 'concluida' ? 'concluida' : 'pendente'
                }));

                setStudents(studentsData);
            } else {
                console.error("Avaliação não encontrada:", evaluationId);
                toast({
                    title: "Avaliação não encontrada",
                    description: "Não foi possível encontrar os dados da avaliação",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Erro ao buscar resultados detalhados:", error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar os resultados detalhados",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getClassificationColor = (classification: string) => {
        switch (classification) {
            case 'Avançado': return 'bg-green-100 text-green-800 border-green-300';
            case 'Adequado': return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'Básico': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'Abaixo do Básico': return 'bg-red-100 text-red-800 border-red-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'concluida': return 'bg-green-100 text-green-800 border-green-300';
            case 'pendente': return 'bg-gray-100 text-gray-800 border-gray-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    // Função utilitária para tratar valores vazios
    const formatFieldValue = (value: string | null | undefined, fallback: string = 'Não informado') => {
        if (!value || value.trim() === '') return fallback;
        return value;
    };

    const handleViewStudentDetails = (studentId: string) => {
        navigate(`/app/avaliacao/${evaluationId}/aluno/${studentId}/resultados`);
    };

    const handleExportStudents = async () => {
        try {
            const XLSX = await import('xlsx');
            const { saveAs } = await import('file-saver');

            if (filteredStudents.length === 0) {
                toast({
                    title: "Nenhum dado para exportar",
                    description: "Não há alunos para gerar a planilha",
                    variant: "destructive",
                });
                return;
            }

            // Criar dados da planilha
            const worksheetData = [
                ['Nome', 'Turma', 'Nota', 'Proficiência', 'Classificação', 'Questões Respondidas', 'Acertos', 'Erros', 'Tempo (min)', 'Status'],
                ...filteredStudents.map(student => [
                    student.nome,
                    student.turma,
                    student.nota.toFixed(1),
                    student.proficiencia.toFixed(1),
                    student.classificacao,
                    student.questoes_respondidas,
                    student.acertos,
                    student.erros,
                    Math.floor(student.tempo_gasto / 60),
                    student.status === 'concluida' ? 'Concluída' : 'Pendente'
                ])
            ];

            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Alunos');

            const fileName = `resultados-alunos-${evaluationInfo?.titulo.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            saveAs(blob, fileName);

            toast({
                title: "Exportação concluída!",
                description: "Os resultados dos alunos foram exportados com sucesso.",
            });
        } catch (error) {
            console.error("Erro na exportação:", error);
            toast({
                title: "Erro na exportação",
                description: "Não foi possível exportar os resultados",
                variant: "destructive",
            });
        }
    };

    const uniqueClassifications = [...new Set(students.map(s => s.classificacao))];

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-6 space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>
                    <Skeleton className="h-8 w-64" />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                            <CardHeader className="pb-3">
                                <Skeleton className="h-4 w-32" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-24" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-3 w-1/2" />
                                        </div>
                                        <div className="flex gap-2">
                                            <Skeleton className="h-8 w-20" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!evaluationInfo) {
        return (
            <div className="container mx-auto px-4 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="outline" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>
                </div>
                <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Avaliação não encontrada
                    </h3>
                    <p className="text-gray-600">
                        A avaliação solicitada não foi encontrada ou não possui resultados disponíveis.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{evaluationInfo.titulo}</h1>
                    <p className="text-muted-foreground">
                        Resultados detalhados dos alunos
                    </p>
                </div>
            </div>

            {/* Informações da Avaliação */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Informações da Avaliação</span>
                        <Badge className={getStatusColor(evaluationInfo.status)}>
                            {evaluationInfo.status === 'concluida' ? 'Concluída' :
                                evaluationInfo.status === 'em_andamento' ? 'Em Andamento' : 'Pendente'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Disciplina</div>
                            <div className="font-semibold">{formatFieldValue(evaluationInfo.disciplina, 'Disciplina não informada')}</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Série</div>
                            <div className="font-semibold">{formatFieldValue(evaluationInfo.serie, 'Série não informada')}</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Escola</div>
                            <div className="font-semibold">{formatFieldValue(evaluationInfo.escola, 'Escola não informada')}</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Município</div>
                            <div className="font-semibold">{formatFieldValue(evaluationInfo.municipio, 'Município não informado')}</div>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Total de Alunos</div>
                            <div className="text-2xl font-bold text-blue-600">{evaluationInfo.total_alunos}</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Participantes</div>
                            <div className="text-2xl font-bold text-green-600">{evaluationInfo.alunos_participantes}</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Média Geral</div>
                            <div className="text-2xl font-bold text-purple-600">{evaluationInfo.media_nota.toFixed(1)}</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Média Proficiência</div>
                            <div className="text-2xl font-bold text-orange-600">{evaluationInfo.media_proficiencia.toFixed(1)}</div>
                        </div>
                    </div>

                    {/* Distribuição de classificação */}
                    <div className="mt-6">
                        <div className="text-sm font-medium text-muted-foreground mb-3">Distribuição por Classificação</div>
                        <div className="flex gap-4">
                            <Badge variant="outline" className="text-red-600 border-red-300">
                                Abaixo do Básico: {evaluationInfo.distribuicao_classificacao.abaixo_do_basico}
                            </Badge>
                            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                                Básico: {evaluationInfo.distribuicao_classificacao.basico}
                            </Badge>
                            <Badge variant="outline" className="text-blue-600 border-blue-300">
                                Adequado: {evaluationInfo.distribuicao_classificacao.adequado}
                            </Badge>
                            <Badge variant="outline" className="text-green-600 border-green-300">
                                Avançado: {evaluationInfo.distribuicao_classificacao.avancado}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nome do aluno ou turma..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={classificationFilter} onValueChange={setClassificationFilter}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder="Classificação" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Classificações</SelectItem>
                                {uniqueClassifications.map(classification => (
                                    <SelectItem key={classification} value={classification}>{classification}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Status</SelectItem>
                                <SelectItem value="concluida">Concluída</SelectItem>
                                <SelectItem value="pendente">Pendente</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Lista de Alunos */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Resultados dos Alunos</span>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline">
                                {filteredStudents.length} {filteredStudents.length === 1 ? 'aluno' : 'alunos'}
                            </Badge>
                            <Button onClick={handleExportStudents} variant="outline">
                                <Download className="h-4 w-4 mr-2" />
                                Exportar
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredStudents.length > 0 ? (
                        <div className="space-y-4">
                            {filteredStudents.map((student) => {
                                const accuracyRate = student.questoes_respondidas > 0
                                    ? (student.acertos / student.questoes_respondidas) * 100
                                    : 0;

                                return (
                                    <div key={student.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                            {/* Informações principais */}
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-lg">{student.nome}</h3>
                                                    <Badge variant="outline">{student.turma}</Badge>
                                                    <Badge className={getStatusColor(student.status)}>
                                                        {student.status === 'concluida' ? 'Concluída' : 'Pendente'}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <div className="flex items-center gap-2">
                                                        <Target className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm font-medium">
                                                            Nota: {student.nota.toFixed(1)}
                                                        </span>
                                                        {student.nota >= 7 ? (
                                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                                        ) : (
                                                            <XCircle className="h-4 w-4 text-orange-600" />
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm font-medium">
                                                            Proficiência: {student.proficiencia.toFixed(1)}
                                                        </span>
                                                    </div>

                                                    <Badge className={getClassificationColor(student.classificacao)}>
                                                        {student.classificacao}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm">
                                                            {student.questoes_respondidas} questões respondidas
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                        <span className="text-sm text-green-600">{student.acertos} acertos</span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <XCircle className="h-4 w-4 text-red-600" />
                                                        <span className="text-sm text-red-600">{student.erros} erros</span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm">
                                                            {Math.floor(student.tempo_gasto / 60)} min
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">Taxa de acerto:</span>
                                                    <Progress value={accuracyRate} className="w-32 h-2" />
                                                    <span className="text-xs font-medium">{accuracyRate.toFixed(1)}%</span>
                                                </div>
                                            </div>

                                            {/* Ações */}
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleViewStudentDetails(student.id)}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Ver Detalhes
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Nenhum aluno encontrado
                            </h3>
                            <p className="text-gray-600">
                                {searchTerm || classificationFilter !== 'all' || statusFilter !== 'all'
                                    ? 'Tente ajustar os filtros para ver mais resultados.'
                                    : 'Ainda não há alunos com resultados disponíveis para esta avaliação.'
                                }
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 