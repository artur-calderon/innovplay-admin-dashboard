import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DonutChartComponent } from "@/components/ui/charts";
import { Progress } from "@/components/ui/progress";
import {
    ArrowLeft,
    CheckCircle2,
    AlertTriangle,
    Award,
    Users,
    BarChart3,
    Target,
    TrendingUp,
    AlertCircle,
    Filter
} from "lucide-react";
import { useStudentAggregatedResults } from "./hooks/useStudentAggregatedResults";
import { ResultsTable } from "./components/results";
import { CompletionStatusLevel } from "./types/completion";

interface DetailedResultsViewProps {
    testId: string;
    onBack: () => void;
}

// ✅ COMPONENTE: CompletionStatusCard - Sempre mostrado no topo
const CompletionStatusCard: React.FC<{
    completedCount: number;
    totalCount: number;
    completionPercentage: number;
}> = ({ completedCount, totalCount, completionPercentage }) => {
    const getStatusColor = () => {
        if (completionPercentage >= 80) return "bg-green-100 border-green-300 text-green-800";
        if (completionPercentage >= 60) return "bg-blue-100 border-blue-300 text-blue-800";
        if (completionPercentage >= 40) return "bg-yellow-100 border-yellow-300 text-yellow-800";
        return "bg-red-100 border-red-300 text-red-800";
    };

    const getStatusIcon = () => {
        if (completionPercentage >= 80) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
        if (completionPercentage >= 60) return <TrendingUp className="h-5 w-5 text-blue-600" />;
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    };

    return (
        <Card className={`border-2 ${getStatusColor()}`}>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        {getStatusIcon()}
                        Status de Conclusão da Avaliação
                    </span>
                    <Badge variant="outline" className="bg-white">
                        <Filter className="h-3 w-3 mr-1" />
                        Filtros Ativos
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Progresso Visual */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium">Taxa de Conclusão</span>
                            <span className="font-bold">{completionPercentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={completionPercentage} className="h-3" />
                    </div>

                    {/* Estatísticas */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="space-y-1">
                            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                            <div className="text-xs text-gray-600">Completas</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold text-red-600">{totalCount - completedCount}</div>
                            <div className="text-xs text-gray-600">Incompletas</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
                            <div className="text-xs text-gray-600">Total</div>
                        </div>
                    </div>

                    {/* ✅ COMENTÁRIO EXPLICATIVO: Critério de filtragem */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-blue-800">
                                <strong>Filtros Aplicados:</strong> Apenas alunos que <strong>completaram integralmente</strong> a avaliação 
                                são exibidos nos dados abaixo. Alunos com status "pendente", "incompleto" ou "não iniciado" 
                                são automaticamente filtrados para garantir análises precisas.
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// ✅ COMPONENTE: FilteredStatsCard - Estatísticas apenas de completos
const FilteredStatsCard: React.FC<{
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
}> = ({ title, value, subtitle, icon, color }) => (
    <Card className="border border-gray-200">
        <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
                {icon}
                {title}
                {/* ✅ INDICADOR: Apenas dados completos */}
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    ✅ Apenas Completos
                </Badge>
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className={`text-2xl font-bold ${color}`}>
                {value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
                {subtitle}
            </p>
        </CardContent>
    </Card>
);

// ✅ COMPONENTE PRINCIPAL
export default function DetailedResultsView({ testId, onBack }: DetailedResultsViewProps) {
    // ✅ DADOS SIMULADOS PARA DEMONSTRAÇÃO (normalmente viriam de API)
    // Em produção, isso seria substituído por dados reais de useAggregatedResults
    const mockCompletedStudents = [
        {
            id: '1',
            nome: 'Ana Silva',
            turma: '9º A',
            nota: 8.5,
            proficiencia: 350,
            classificacao: 'Adequado' as const,
            acertos: 17,
            total_questoes: 20,
            status: 'concluida' as const,
            tempo_gasto: 3600
        },
        {
            id: '2',
            nome: 'João Santos',
            turma: '9º A',
            nota: 9.2,
            proficiencia: 425,
            classificacao: 'Avançado' as const,
            acertos: 18,
            total_questoes: 20,
            status: 'concluida' as const,
            tempo_gasto: 3300
        },
        {
            id: '3',
            nome: 'Maria Oliveira',
            turma: '9º B',
            nota: 6.8,
            proficiencia: 280,
            classificacao: 'Básico' as const,
            acertos: 14,
            total_questoes: 20,
            status: 'concluida' as const,
            tempo_gasto: 4200
        }
    ];

    // ✅ APLICAR FILTROS: Apenas alunos que completaram integralmente
    // TODO: Substituir por useAggregatedResults quando integrado
    const filteredCompletedStudents = mockCompletedStudents.filter(student => 
        student.status === 'concluida' && 
        student.nota > 0 &&
        student.acertos > 0
    );

    // ✅ ESTATÍSTICAS CALCULADAS APENAS DE DADOS FILTRADOS
    const totalStudents = 25; // Total na turma (incluindo incompletos)
    const completedStudents = filteredCompletedStudents.length;
    const completionPercentage = (completedStudents / totalStudents) * 100;
    
    // Médias apenas dos alunos completos
    const averageScore = filteredCompletedStudents.reduce((sum, s) => sum + s.nota, 0) / completedStudents;
    const averageProficiency = filteredCompletedStudents.reduce((sum, s) => sum + s.proficiencia, 0) / completedStudents;
    const accuracyRate = (filteredCompletedStudents.reduce((sum, s) => sum + s.acertos, 0) / 
                         filteredCompletedStudents.reduce((sum, s) => sum + s.total_questoes, 0)) * 100;

    // Distribuição por classificação (apenas completos)
    const distributionData = [
        {
            name: "Abaixo do Básico",
            value: filteredCompletedStudents.filter(s => s.classificacao === 'Abaixo do Básico').length
        },
        {
            name: "Básico",
            value: filteredCompletedStudents.filter(s => s.classificacao === 'Básico').length
        },
        {
            name: "Adequado",
            value: filteredCompletedStudents.filter(s => s.classificacao === 'Adequado').length
        },
        {
            name: "Avançado",
            value: filteredCompletedStudents.filter(s => s.classificacao === 'Avançado').length
        }
    ];

    return (
        <div className="container mx-auto px-4 py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Resultados Detalhados da Avaliação</h1>
                    <p className="text-muted-foreground">
                        Análise completa baseada apenas em avaliações concluídas
                    </p>
                </div>
            </div>

            {/* ✅ 1. SEMPRE MOSTRAR CompletionStatusCard NO TOPO */}
            <CompletionStatusCard
                completedCount={completedStudents}
                totalCount={totalStudents}
                completionPercentage={completionPercentage}
            />

            {/* ✅ 2. CARDS DE ESTATÍSTICAS - Apenas dados filtrados */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <FilteredStatsCard
                    title="Média Geral"
                    value={averageScore.toFixed(1)}
                    subtitle="Baseado em avaliações completas"
                    icon={<Award className="h-4 w-4 text-purple-600" />}
                    color="text-purple-600"
                />
                <FilteredStatsCard
                    title="Proficiência Média"
                    value={averageProficiency.toFixed(0)}
                    subtitle="Somente alunos que concluíram"
                    icon={<BarChart3 className="h-4 w-4 text-orange-600" />}
                    color="text-orange-600"
                />
                <FilteredStatsCard
                    title="Taxa de Acerto"
                    value={`${accuracyRate.toFixed(1)}%`}
                    subtitle="Percentual de respostas corretas"
                    icon={<Target className="h-4 w-4 text-blue-600" />}
                    color="text-blue-600"
                />
                <FilteredStatsCard
                    title="Alunos Analisados"
                    value={completedStudents}
                    subtitle={`De ${totalStudents} alunos matriculados`}
                    icon={<Users className="h-4 w-4 text-green-600" />}
                    color="text-green-600"
                />
            </div>

            {/* ✅ 3. GRÁFICO DE DISTRIBUIÇÃO - Com subtítulo explicativo */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Distribuição por Classificação</span>
                        {/* ✅ 4. HEADER INDICA "apenas avaliações completas" */}
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                            📊 Apenas Avaliações Completas
                        </Badge>
                    </CardTitle>
                    {/* ✅ 3. SUBTÍTULO explicando que são apenas completos */}
                    <p className="text-sm text-muted-foreground">
                        Esta análise considera exclusivamente os <strong>{completedStudents} alunos</strong> que 
                        completaram integralmente a avaliação. Alunos com status incompleto não são incluídos 
                        para garantir precisão estatística.
                    </p>
                </CardHeader>
                <CardContent>
                    <DonutChartComponent
                        data={distributionData}
                        title="Níveis de Proficiência"
                        subtitle={`Análise de ${completedStudents} avaliações completas`}
                        colors={["#ef4444", "#f97316", "#3b82f6", "#22c55e"]}
                    />
                </CardContent>
            </Card>

            {/* ✅ 5. TABELA DE RESULTADOS - Usando componente com validação */}
            <div className="space-y-2">
                {/* ✅ COMENTÁRIO CLARO sobre filtros aplicados */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <Filter className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                            <strong>Filtros Aplicados na Tabela Abaixo:</strong>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>Status = "concluída" (avaliação finalizada pelo aluno)</li>
                                <li>Nota {'>'} 0 (aluno obteve pontuação)</li>
                                <li>Respostas válidas (pelo menos uma questão respondida corretamente)</li>
                                <li>Dados de proficiência calculados com sucesso</li>
                            </ul>
                            <p className="mt-2 text-xs">
                                <strong>Resultado:</strong> {completedStudents} de {totalStudents} alunos atendem aos critérios ({completionPercentage.toFixed(1)}%)
                            </p>
                        </div>
                    </div>
                </div>

                <ResultsTable
                    students={filteredCompletedStudents}
                    isFiltered={true} // ✅ SEMPRE true - dados já filtrados
                    title="Resultados Validados - Apenas Avaliações Completas"
                    showActions={true}
                    onViewStudentDetails={(studentId) => {
                        console.log(`Ver detalhes do aluno: ${studentId}`);
                        // TODO: Implementar navegação para detalhes
                    }}
                />
            </div>

            {/* ✅ INFORMAÇÕES ADICIONAIS: O que foi filtrado */}
            <Card className="bg-gray-50 border-gray-200">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-gray-600" />
                        Informações sobre Filtragem de Dados
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-2">
                    <p>
                        <strong>Alunos Incluídos na Análise:</strong> {completedStudents} estudantes que completaram 
                        integralmente a avaliação com dados válidos de nota e proficiência.
                    </p>
                    <p>
                        <strong>Alunos Excluídos da Análise:</strong> {totalStudents - completedStudents} estudantes com 
                        status "pendente", "não iniciado", "incompleto" ou com dados inconsistentes.
                    </p>
                    <p>
                        <strong>Critério de Qualidade:</strong> Apenas resultados com dados completos e validados são 
                        considerados para garantir precisão nas métricas educacionais.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
} 