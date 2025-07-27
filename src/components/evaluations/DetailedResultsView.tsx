import React, { useState, useEffect } from "react";
import { DonutChartComponent } from "@/components/ui/charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    ArrowLeft,
    Download,
    CheckCircle2,
    XCircle,
    Minus,
    Clock,
    Target,
    BarChart3,
    FileText,
    AlertTriangle,
    Award,
    Users,
    Search,
    TrendingUp,
    TrendingDown,
    Eye,
    RefreshCw,
    AlertCircle,
    BookOpen,
    CheckCircle,
    Activity,
    Filter
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAggregatedResults } from "./results/hooks/useAggregatedResults";
import { CompletionStatusLevel } from "./results/types/completion";

// ✅ INTERFACES SIMPLIFICADAS - Usando dados dos hooks refatorados
interface DetailedResultsViewProps {
    onBack: () => void;
}

interface EvaluationInfo {
    id: string;
    titulo: string;
    disciplina: string;
    disciplinas?: string[];
    curso: string;
    serie: string;
    grade_id?: string;
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

// ✅ COMPONENTE: RealTimeControlsCard - Controles de tempo real
const RealTimeControlsCard: React.FC<{
    isRealTimeMode: boolean;
    onToggleRealTime: (enabled: boolean) => void;
    lastUpdate: Date;
    autoRefreshEnabled: boolean;
    onToggleAutoRefresh: (enabled: boolean) => void;
    completionStats: {
        total: number;
        completed: number;
        partial: number;
        completionRate: number;
    };
}> = ({ 
    isRealTimeMode, 
    onToggleRealTime, 
    lastUpdate, 
    autoRefreshEnabled, 
    onToggleAutoRefresh,
    completionStats
}) => (
    <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Controles de Visualização
                <Badge variant="outline" className="ml-auto">
                    {completionStats.completed}/{completionStats.total} completos
                </Badge>
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {/* Toggle Tempo Real */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="text-sm font-medium">Modo Tempo Real</div>
                    <div className="text-xs text-gray-600">
                        {isRealTimeMode 
                            ? "Mostrando todos os alunos (incluindo progresso parcial)"
                            : "Mostrando apenas alunos com avaliação completa"
                        }
                    </div>
                </div>
                <Switch
                    checked={isRealTimeMode}
                    onCheckedChange={onToggleRealTime}
                />
            </div>

            {/* Toggle Auto-Refresh */}
            {isRealTimeMode && (
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="text-sm font-medium">Atualização Automática</div>
                        <div className="text-xs text-gray-600">
                            Atualizar dados automaticamente a cada 30 segundos
                        </div>
                    </div>
                    <Switch
                        checked={autoRefreshEnabled}
                        onCheckedChange={onToggleAutoRefresh}
                    />
                </div>
            )}

            {/* Status da Atualização */}
            <div className="bg-white border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Última atualização:</span>
                    <span className="font-medium">
                        {lastUpdate.toLocaleTimeString('pt-BR')}
                    </span>
                </div>
                {completionStats.partial > 0 && (
                    <div className="mt-2 text-xs text-yellow-700">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        {completionStats.partial} aluno(s) com progresso parcial
                    </div>
                )}
            </div>
        </CardContent>
    </Card>
);

// ✅ COMPONENTE: CompletionStatusCard - Status de completude melhorado
const CompletionStatusCard: React.FC<{
    stats: {
        total: number;
        completed: number;
        partial: number;
        completionRate: number;
    };
    isRealTimeMode: boolean;
}> = ({ stats, isRealTimeMode }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Status de Completude da Avaliação
                {isRealTimeMode && (
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs ml-auto">
                        <Activity className="w-3 h-3 mr-1" />
                        Tempo Real
                    </Badge>
                )}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Total de Alunos</div>
                    <div className="text-2xl font-bold text-gray-900">
                        {stats.total}
                    </div>
                </div>
                
                <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Concluídos</div>
                    <div className="text-2xl font-bold text-green-600">
                        {stats.completed}
                    </div>
                </div>
                
                <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                        {isRealTimeMode ? "Em Andamento" : "Incompletos"}
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">
                        {stats.partial}
                    </div>
                </div>
                
                <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Taxa de Conclusão</div>
                    <div className="text-2xl font-bold text-blue-600">
                        {stats.completionRate.toFixed(1)}%
                    </div>
                </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso da Avaliação</span>
                    <span className="font-medium">
                        {stats.completionRate.toFixed(1)}%
                    </span>
                </div>
                <Progress 
                    value={stats.completionRate} 
                    className="h-2"
                />
            </div>
            
            {/* Alerta baseado no modo */}
            {isRealTimeMode && stats.partial > 0 ? (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">
                            Monitoramento em Tempo Real Ativo
                        </span>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                        Acompanhando {stats.partial} aluno(s) com avaliação em andamento
                    </p>
                </div>
            ) : !isRealTimeMode && stats.partial > 0 ? (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                            Filtros Aplicados - Apenas Dados Completos
                        </span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                        {stats.partial} aluno(s) com progresso parcial não estão sendo exibidos. 
                        Ative o "Modo Tempo Real" para acompanhar o progresso.
                    </p>
                </div>
            ) : (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                            Todos os Alunos Completaram a Avaliação
                        </span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                        Todos os dados estão validados e prontos para análise pedagógica
                    </p>
                </div>
            )}
        </CardContent>
    </Card>
);

// Componente da tabela de resultados dos alunos (mantido igual)
const StudentsResultsTable = ({ 
    students, 
    totalQuestions, 
    startQuestionNumber = 1,
    onViewStudentDetails,
    questoes,
    questionsWithSkills,
    skillsMapping,
    skillsBySubject,
    detailedReport,
    visibleFields = {
        turma: true,
        habilidade: true,
        questoes: true,
        percentualTurma: true,
        total: true,
        nota: true,
        proficiencia: true,
        nivel: true
    },
    subjectFilter,
    showAll = false
}: {
    students: any[];
    totalQuestions: number;
    startQuestionNumber?: number;
    onViewStudentDetails: (studentId: string) => void;
    questoes?: any[];
    questionsWithSkills?: any[];
    skillsMapping?: Record<string, string>;
    skillsBySubject?: any;
    detailedReport?: any;
    visibleFields?: any;
    subjectFilter?: string;
    showAll?: boolean;
}) => {
    // ✅ USAR DADOS DOS HOOKS REFATORADOS
    const filteredStudents = showAll 
        ? students // Mostrar todos os alunos (incluindo parciais)
        : students.filter(student => student.isComplete); // Apenas completos

    // ✅ FUNÇÃO PARA VERIFICAR SE ALUNO É PARCIAL
    const isStudentPartial = (student: any) => {
        return !student.isComplete || student.completionStatus !== CompletionStatusLevel.COMPLETE;
    };

    // ✅ FUNÇÃO PARA OBTER BADGE DE STATUS DO ALUNO
    const getStudentStatusBadge = (student: any) => {
        if (student.isComplete && student.completionStatus === CompletionStatusLevel.COMPLETE) {
            return (
                <Badge className="bg-green-100 text-green-800 text-xs ml-2">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completo
                </Badge>
            );
        } else {
            const progressPercentage = student.session?.progress || 0;
            return (
                <Badge className="bg-yellow-100 text-yellow-800 text-xs ml-2">
                    <Clock className="w-3 h-3 mr-1" />
                    Parcial ({progressPercentage.toFixed(1)}%)
                </Badge>
            );
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-max border border-gray-300 text-center text-sm shadow-md rounded-lg">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="p-2 min-w-[150px] text-left border-r border-gray-300">Aluno</th>
                        {visibleFields?.questoes && Array.from({ length: totalQuestions }, (_, i) => (
                            <th key={`header-q${i}`} className="p-2 min-w-[80px] border-r border-gray-300">
                                Q{i + 1}
                            </th>
                        ))}
                        {visibleFields?.total && <th className="p-2 bg-gray-50">Total</th>}
                        {visibleFields?.nota && <th className="p-2 bg-gray-50">Nota</th>}
                        {visibleFields?.proficiencia && <th className="p-2 bg-gray-50">Proficiência</th>}
                        {visibleFields?.nivel && <th className="p-2 bg-gray-50">Nível</th>}
                    </tr>
                </thead>
                <tbody>
                    {filteredStudents.map((student, studentIndex) => (
                        <tr key={`${student.id || 'student'}-${studentIndex}`} 
                            className={`hover:bg-gray-50 cursor-pointer group ${
                                isStudentPartial(student) ? 'bg-yellow-50' : ''
                            }`}
                            onClick={() => onViewStudentDetails(student.id)}
                            title="Clique para ver resultados detalhados do aluno">
                            <td className="p-2 border-t border-gray-200 text-left border-r border-gray-300">
                                <div className="font-medium hover:text-blue-600 transition-colors flex items-center gap-2">
                                    {student.name || student.nome}
                                    {showAll && getStudentStatusBadge(student)}
                                    <Eye className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </td>
                            {visibleFields?.questoes && Array.from({ length: totalQuestions }, (_, questionIndex) => (
                                <td key={`${student.id}-q${questionIndex}`} className="p-2 border-t border-gray-200 border-r border-gray-300">
                                    <div className="text-xl">
                                        {questionIndex < (student.result?.correctAnswers || 0) ? (
                                            <span className="text-blue-600">✓</span>
                                        ) : questionIndex < (student.result?.correctAnswers || 0) + (student.result?.wrongAnswers || 0) ? (
                                            <span className="text-red-500">✗</span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </div>
                                </td>
                            ))}
                            {visibleFields?.total && <td className="p-2 border-t border-gray-200 font-semibold bg-gray-50">{student.result?.correctAnswers || 0}</td>}
                            {visibleFields?.nota && <td className="p-2 border-t border-gray-200 font-semibold bg-gray-50">{(student.result?.grade || 0).toFixed(1)}</td>}
                            {visibleFields?.proficiencia && <td className="p-2 border-t border-gray-200 font-semibold bg-gray-50">{(student.result?.proficiency || 0).toFixed(0)}</td>}
                            {visibleFields?.nivel && (
                                <td className="p-2 border-t border-gray-200 bg-gray-50">
                                    <span className={`px-2 py-1 rounded-full text-xs text-white ${
                                        student.result?.classification === 'Abaixo do Básico' ? 'bg-red-500' :
                                        student.result?.classification === 'Básico' ? 'bg-yellow-400' :
                                        student.result?.classification === 'Adequado' ? 'bg-blue-500' :
                                        'bg-green-500'
                                    }`}>
                                        {student.result?.classification || 'N/A'}
                                    </span>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {/* ✅ RODAPÉ INFORMATIVO MELHORADO */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-700">
                            Exibindo {filteredStudents.length} de {students.length} alunos
                        </div>
                        {showAll && (
                            <div className="text-yellow-700">
                                <Clock className="w-3 h-3 inline mr-1" />
                                Incluindo alunos com progresso parcial
                            </div>
                        )}
                    </div>
                    
                    <div className="font-semibold text-gray-700">Legenda:</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-1">
                            <span className="text-blue-600 text-lg">✓</span>
                            <span>Aluno acertou</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-red-500 text-lg">✗</span>
                            <span>Aluno errou</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-gray-400 text-lg">-</span>
                            <span>Não respondeu</span>
                        </div>
                        {showAll && (
                            <>
                                <div className="flex items-center gap-1">
                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Completo
                                    </Badge>
                                    <span>Aluno finalizou</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Parcial
                                    </Badge>
                                    <span>Aluno em andamento</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ✅ COMPONENTE PRINCIPAL REFATORADO
export default function DetailedResultsView({ onBack }: DetailedResultsViewProps) {
    const { id: evaluationId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    // ✅ ESTADOS PARA CONTROLE DE VISUALIZAÇÃO
    const [isRealTimeMode, setIsRealTimeMode] = useState(false);
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // ✅ ESTADOS PARA FILTROS E UI
    const [searchTerm, setSearchTerm] = useState('');
    const [classificationFilter, setClassificationFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [visibleFields, setVisibleFields] = useState({
        turma: true,
        habilidade: true,
        questoes: true,
        percentualTurma: true,
        total: true,
        nota: true,
        proficiencia: true,
        nivel: true
    });

    // ✅ HOOK REFATORADO - FONTE ÚNICA DE DADOS
    const {
        students: allStudents,
        validResults,
        partialResults,
        stats,
        completionStatus,
        isLoading,
        error,
        refetch,
        hasIncompleteStudents
    } = useAggregatedResults(evaluationId || '', {
        enablePartialView: isRealTimeMode,
        autoRefresh: autoRefreshEnabled,
        refreshInterval: 30000,
        includePartialInStats: isRealTimeMode
    });

    // ✅ DADOS DERIVADOS DOS HOOKS
    const studentsToShow = isRealTimeMode ? allStudents : allStudents.filter(s => s.isComplete);
    const evaluationInfo: EvaluationInfo | null = stats ? {
        id: evaluationId || '',
        titulo: 'Avaliação Detalhada', // TODO: Buscar do backend
        disciplina: 'Múltiplas Disciplinas', // TODO: Buscar do backend
        curso: 'Ensino Fundamental', // TODO: Buscar do backend
        serie: '9º Ano', // TODO: Buscar do backend
        escola: 'Escola Municipal', // TODO: Buscar do backend
        municipio: 'São Paulo', // TODO: Buscar do backend
        data_aplicacao: new Date().toISOString(),
        status: completionStatus.hasIncompleteStudents ? 'em_andamento' : 'concluida',
        total_alunos: stats.total,
        alunos_participantes: stats.completed + stats.partial,
        alunos_ausentes: stats.total - (stats.completed + stats.partial),
        media_nota: stats.validStats?.averageScore || 0,
        media_proficiencia: stats.validStats?.averageProficiency || 0,
        distribuicao_classificacao: {
            abaixo_do_basico: 0, // TODO: Calcular dos dados reais
            basico: 0,
            adequado: 0,
            avancado: 0
        }
    } : null;

    // ✅ HANDLERS PARA CONTROLES
    const handleToggleRealTime = (enabled: boolean) => {
        setIsRealTimeMode(enabled);
        setLastUpdate(new Date());
        toast({
            title: enabled ? "Modo Tempo Real Ativado" : "Modo Tempo Real Desativado",
            description: enabled 
                ? "Agora você pode acompanhar o progresso em tempo real."
                : "Voltando a mostrar apenas dados completos e validados.",
        });
    };

    const handleToggleAutoRefresh = (enabled: boolean) => {
        setAutoRefreshEnabled(enabled);
        toast({
            title: enabled ? "Auto-atualização Ativada" : "Auto-atualização Desativada",
            description: enabled 
                ? "Os dados serão atualizados automaticamente a cada 30 segundos."
                : "Atualização automática foi desabilitada.",
        });
    };

    const handleRefresh = async () => {
        setLastUpdate(new Date());
        await refetch();
        toast({
            title: "Dados Atualizados",
            description: "As informações foram atualizadas com sucesso.",
        });
    };

    const handleViewStudentDetails = (studentId: string) => {
        navigate(`/app/avaliacao/${evaluationId}/aluno/${studentId}/resultados`);
    };

    // ✅ EFEITO PARA AUTO-REFRESH
    useEffect(() => {
        if (!autoRefreshEnabled) return;

        const interval = setInterval(() => {
            handleRefresh();
        }, 30000);

        return () => clearInterval(interval);
    }, [autoRefreshEnabled, refetch]);

    // ✅ FILTROS APLICADOS AOS DADOS DOS HOOKS
    const filteredStudents = React.useMemo(() => {
        return studentsToShow.filter(student => {
            const matchesSearch = searchTerm === '' || 
                (student.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (student.class || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesClassification = classificationFilter === 'all' || 
                student.result?.classification === classificationFilter;
            
            const matchesStatus = statusFilter === 'all' || 
                (statusFilter === 'concluida' ? student.isComplete : !student.isComplete);
            
            return matchesSearch && matchesClassification && matchesStatus;
        });
    }, [studentsToShow, searchTerm, classificationFilter, statusFilter]);

    // Estados de loading
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
            </div>
        );
    }

    // Estado de erro
    if (error) {
        return (
            <div className="container mx-auto px-4 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="outline" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>
                </div>
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Erro ao Carregar Dados
                    </h3>
                    <p className="text-gray-600 mb-4">
                        {error}
                    </p>
                    <Button onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Tentar Novamente
                    </Button>
                </div>
            </div>
        );
    }

    if (!evaluationInfo || !stats) {
        return (
            <div className="container mx-auto px-4 py-6">
                <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Avaliação não encontrada
                    </h3>
                    <p className="text-gray-600 mb-4">
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
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{evaluationInfo.titulo}</h1>
                    <p className="text-muted-foreground">
                        {isRealTimeMode 
                            ? "Resultados detalhados com monitoramento em tempo real"
                            : "Resultados detalhados (apenas dados completos e validados)"
                        }
                    </p>
                </div>
                
                <Button 
                    variant="outline" 
                    onClick={handleRefresh}
                    disabled={isLoading}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </div>

            {/* ✅ CONTROLES DE VISUALIZAÇÃO */}
            <RealTimeControlsCard
                isRealTimeMode={isRealTimeMode}
                onToggleRealTime={handleToggleRealTime}
                lastUpdate={lastUpdate}
                autoRefreshEnabled={autoRefreshEnabled}
                onToggleAutoRefresh={handleToggleAutoRefresh}
                completionStats={{
                    total: stats.total,
                    completed: stats.completed,
                    partial: stats.partial,
                    completionRate: stats.completionRate
                }}
            />

            {/* ✅ STATUS DE COMPLETUDE MELHORADO */}
            <CompletionStatusCard
                stats={{
                    total: stats.total,
                    completed: stats.completed,
                    partial: stats.partial,
                    completionRate: stats.completionRate
                }}
                isRealTimeMode={isRealTimeMode}
            />

            {/* Informações da Avaliação */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Informações da Avaliação</span>
                        <Badge className={
                            evaluationInfo.status === 'concluida' ? 'bg-green-100 text-green-800' :
                            evaluationInfo.status === 'em_andamento' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                        }>
                            {evaluationInfo.status === 'concluida' ? 'Concluída' :
                                evaluationInfo.status === 'em_andamento' ? 'Em Andamento' : 'Pendente'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Disciplina</div>
                            <div className="font-semibold">{evaluationInfo.disciplina}</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Série</div>
                            <div className="font-semibold">{evaluationInfo.serie}</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Escola</div>
                            <div className="font-semibold">{evaluationInfo.escola}</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Município</div>
                            <div className="font-semibold">{evaluationInfo.municipio}</div>
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
                            <div className="text-sm font-medium text-muted-foreground">Nota Geral</div>
                            <div className="text-2xl font-bold text-purple-600">
                                {evaluationInfo.media_nota.toFixed(1)}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Proficiência</div>
                            <div className="text-2xl font-bold text-orange-600">
                                {evaluationInfo.media_proficiencia.toFixed(1)}
                            </div>
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
                                    placeholder="Buscar por nome do aluno..."
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
                                <SelectItem value="all">Todas as classificações</SelectItem>
                                <SelectItem value="Abaixo do Básico">Abaixo do Básico</SelectItem>
                                <SelectItem value="Básico">Básico</SelectItem>
                                <SelectItem value="Adequado">Adequado</SelectItem>
                                <SelectItem value="Avançado">Avançado</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os status</SelectItem>
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
                        <span>
                            Resultados dos Alunos
                            {isRealTimeMode && (
                                <Badge className="ml-2 bg-yellow-100 text-yellow-800 text-xs">
                                    <Activity className="w-3 h-3 mr-1" />
                                    Tempo Real
                                </Badge>
                            )}
                        </span>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline">
                                {filteredStudents.length} {filteredStudents.length === 1 ? 'aluno' : 'alunos'}
                            </Badge>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredStudents.length > 0 ? (
                        <StudentsResultsTable 
                            students={filteredStudents} 
                            totalQuestions={20} // TODO: Buscar do backend
                            startQuestionNumber={1}
                            onViewStudentDetails={handleViewStudentDetails}
                            questoes={[]} // TODO: Buscar do backend
                            questionsWithSkills={[]} // TODO: Buscar do backend
                            skillsMapping={{}} // TODO: Buscar do backend
                            skillsBySubject={{}} // TODO: Buscar do backend
                            detailedReport={null} // TODO: Buscar do backend
                            visibleFields={visibleFields}
                            subjectFilter="all"
                            showAll={isRealTimeMode}
                        />
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Nenhum aluno encontrado
                            </h3>
                            <p className="text-gray-600">
                                {searchTerm || classificationFilter !== 'all' || statusFilter !== 'all'
                                    ? 'Ajuste os filtros para ver os alunos.'
                                    : 'Não há alunos registrados nesta avaliação.'}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 