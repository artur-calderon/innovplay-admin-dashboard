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

// ✅ TIPOS PARA A TABELA DE RESULTADOS
interface StudentData {
    id: string;
    name: string;
    class: string;
    school?: string;
    isComplete: boolean;
    completionStatus: CompletionStatusLevel;
    session?: {
        id: string;
        status: string;
        startedAt: string;
        submittedAt?: string;
        totalQuestions: number;
        answeredQuestions: number;
        timeSpent: number;
        completionPercentage: number;
        progress?: number;
    };
    result?: {
        grade: number;
        proficiency: number;
        classification: string;
        correctAnswers: number;
        totalQuestions: number;
        scorePercentage: number;
    };
}

interface QuestionData {
    id: string;
    question: string;
    skill?: string;
    subject?: string;
}

interface SkillsMapping {
    [key: string]: string;
}

interface SkillsBySubject {
    [subject: string]: string[];
}

interface DetailedReport {
    [key: string]: unknown;
}

interface VisibleFields {
    turma: boolean;
    habilidade: boolean;
    questoes: boolean;
    percentualTurma: boolean;
    total: boolean;
    nota: boolean;
    proficiencia: boolean;
    nivel: boolean;
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
}> = ({ stats, isRealTimeMode }) => {
    const getStatusColor = () => {
        if (stats.completionRate >= 80) return "bg-green-100 border-green-300 text-green-800";
        if (stats.completionRate >= 60) return "bg-blue-100 border-blue-300 text-blue-800";
        if (stats.completionRate >= 40) return "bg-yellow-100 border-yellow-300 text-yellow-800";
        return "bg-red-100 border-red-300 text-red-800";
    };

    const getStatusIcon = () => {
        if (stats.completionRate >= 80) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
        if (stats.completionRate >= 60) return <TrendingUp className="h-5 w-5 text-blue-600" />;
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    };

    return (
        <Card className={`border-2 ${getStatusColor()}`}>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        {getStatusIcon()}
                        Status de Completude da Avaliação
                        {isRealTimeMode && (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs ml-auto">
                                <Activity className="w-3 h-3 mr-1" />
                                Tempo Real
                            </Badge>
                        )}
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
                            <span className="font-bold">{stats.completionRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={stats.completionRate} className="h-3" />
                    </div>

                    {/* Estatísticas */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="space-y-1">
                            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                            <div className="text-xs text-gray-600">Completas</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold text-red-600">{stats.partial}</div>
                            <div className="text-xs text-gray-600">Incompletas</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
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
    students: StudentData[];
    totalQuestions: number;
    startQuestionNumber?: number;
    onViewStudentDetails: (studentId: string) => void;
    questoes?: QuestionData[];
    questionsWithSkills?: QuestionData[];
    skillsMapping?: SkillsMapping;
    skillsBySubject?: SkillsBySubject;
    detailedReport?: DetailedReport;
    visibleFields?: VisibleFields;
    subjectFilter?: string;
    showAll?: boolean;
}) => {
    // ✅ USAR DADOS DOS HOOKS REFATORADOS
    const filteredStudents = showAll 
        ? students // Mostrar todos os alunos (incluindo parciais)
        : students.filter(student => student.isComplete); // Apenas completos

    // ✅ FUNÇÃO PARA VERIFICAR SE ALUNO É PARCIAL
    const isStudentPartial = (student: StudentData) => {
        return !student.isComplete || student.completionStatus !== CompletionStatusLevel.COMPLETE;
    };

    // ✅ FUNÇÃO PARA OBTER BADGE DE STATUS DO ALUNO
    const getStudentStatusBadge = (student: StudentData) => {
        if (student.isComplete && student.completionStatus === CompletionStatusLevel.COMPLETE) {
            return (
                <Badge className="bg-green-100 text-green-800 text-xs ml-2">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completo
                </Badge>
            );
        } else {
            const progressPercentage = student.session?.progress || student.session?.completionPercentage || 0;
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
                            onContextMenu={(e) => {
                                e.preventDefault();
                                const url = `/app/avaliacao/${window.location.pathname.split('/')[3]}/aluno/${student.id}/resultados`;
                                window.open(url, '_blank');
                            }}
                            title="Clique esquerdo: ver detalhes | Clique direito: abrir em nova guia">
                            <td className="p-2 border-t border-gray-200 text-left border-r border-gray-300">
                                <div className="font-medium hover:text-blue-600 transition-colors flex items-center gap-2">
                                    {student.name || student.name}
                                    {showAll && getStudentStatusBadge(student)}
                                    <Eye className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </td>
                            {visibleFields?.questoes && Array.from({ length: totalQuestions }, (_, questionIndex) => (
                                <td key={`${student.id}-q${questionIndex}`} className="p-2 border-t border-gray-200 border-r border-gray-300">
                                    <div className="text-xl">
                                        {questionIndex < (student.result?.correctAnswers || 0) ? (
                                            <span className="text-blue-600">✓</span>
                                        ) : questionIndex < (student.result?.correctAnswers || 0) + (student.result?.correctAnswers || 0) ? (
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
    const [visibleFields, setVisibleFields] = useState<VisibleFields>({
        turma: true,
        habilidade: true,
        questoes: true,
        percentualTurma: true,
        total: true,
        nota: true,
        proficiencia: true,
        nivel: true
    });

    // ✅ HOOK REFATORADO - FONTE ÚNICA DE DADOS (SEM TRY/CATCH - REGRAS DE HOOKS)
    const aggregatedResults = useAggregatedResults(evaluationId || '', {
        enablePartialView: isRealTimeMode,
        autoRefresh: false, // ✅ DESABILITADO: Auto-refresh por padrão para evitar chamadas excessivas
        refreshInterval: 30000,
        includePartialInStats: isRealTimeMode
    });

    // ✅ EXTRAIR DADOS COM VERIFICAÇÕES DE SEGURANÇA
    const {
        students: allStudents = [],
        allStudents: allStudentsWithPartial = [],
        stats = null,
        completionStatus = null,
        isLoading = false,
        error = null,
        refetch = async () => {},
        hasIncompleteStudents = false
    } = aggregatedResults || {};

    // ✅ DADOS DERIVADOS DOS HOOKS COM VERIFICAÇÕES DE SEGURANÇA
    const studentsToShow = isRealTimeMode ? (allStudentsWithPartial || []) : (allStudents || []);
    const evaluationInfo: EvaluationInfo | null = stats ? {
        id: evaluationId || '',
        titulo: 'Avaliação Detalhada', // TODO: Buscar do backend
        disciplina: 'Múltiplas Disciplinas', // TODO: Buscar do backend
        curso: 'Ensino Fundamental', // TODO: Buscar do backend
        serie: '9º Ano', // TODO: Buscar do backend
        escola: 'Escola Municipal', // TODO: Buscar do backend
        municipio: 'São Paulo', // TODO: Buscar do backend
        data_aplicacao: new Date().toISOString(),
        status: completionStatus?.hasIncompleteStudents ? 'em_andamento' : 'concluida',
        total_alunos: stats.totalStudents || 0,
        alunos_participantes: (stats.completedStudents || 0) + (stats.partialStudents || 0),
        alunos_ausentes: (stats.totalStudents || 0) - ((stats.completedStudents || 0) + (stats.partialStudents || 0)),
        media_nota: stats.validStats?.averageGrade || 0,
        media_proficiencia: stats.validStats?.averageProficiency || 0,
        distribuicao_classificacao: stats.validStats?.classificationDistribution || {
            abaixo_do_basico: 0,
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

    // ✅ FILTROS APLICADOS AOS DADOS DOS HOOKS COM VERIFICAÇÕES DE SEGURANÇA
    const filteredStudents = React.useMemo(() => {
        if (!Array.isArray(studentsToShow)) {
            console.warn('studentsToShow não é um array:', studentsToShow);
            return [];
        }

        return studentsToShow.filter(student => {
            if (!student) {
                console.warn('Estudante inválido encontrado:', student);
                return false;
            }

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

    // ✅ VERIFICAÇÃO DE DADOS VÁLIDOS
    if (!aggregatedResults) {
        return (
            <div className="container mx-auto px-4 py-6">
                <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Erro ao Carregar Dados
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Não foi possível carregar os dados da avaliação. O hook useAggregatedResults falhou.
                    </p>
                    <div className="space-y-2">
                        <Button onClick={() => window.location.reload()}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Recarregar Página
                        </Button>
                        <Button variant="outline" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ✅ FALLBACK TEMPORÁRIO: Dados mockados para demonstração
    if (isLoading && (!studentsToShow || studentsToShow.length === 0) && !aggregatedResults?.students?.length) {
        const mockStudents: StudentData[] = [
            {
                id: '1',
                name: 'João Silva',
                class: '9º Ano A',
                school: 'Escola Municipal',
                isComplete: true,
                completionStatus: CompletionStatusLevel.COMPLETE,
                session: {
                    id: 'session-1',
                    status: 'completed',
                    startedAt: '2024-01-15T10:00:00Z',
                    submittedAt: '2024-01-15T11:30:00Z',
                    totalQuestions: 20,
                    answeredQuestions: 20,
                    timeSpent: 5400,
                    completionPercentage: 100
                },
                result: {
                    grade: 8.5,
                    proficiency: 325,
                    classification: 'Adequado',
                    correctAnswers: 17,
                    totalQuestions: 20,
                    scorePercentage: 85
                }
            },
            {
                id: '2',
                name: 'Maria Santos',
                class: '9º Ano A',
                school: 'Escola Municipal',
                isComplete: true,
                completionStatus: CompletionStatusLevel.COMPLETE,
                session: {
                    id: 'session-2',
                    status: 'completed',
                    startedAt: '2024-01-15T10:00:00Z',
                    submittedAt: '2024-01-15T11:45:00Z',
                    totalQuestions: 20,
                    answeredQuestions: 20,
                    timeSpent: 6300,
                    completionPercentage: 100
                },
                result: {
                    grade: 9.2,
                    proficiency: 380,
                    classification: 'Avançado',
                    correctAnswers: 18,
                    totalQuestions: 20,
                    scorePercentage: 92
                }
            },
            {
                id: '3',
                name: 'Pedro Costa',
                class: '9º Ano A',
                school: 'Escola Municipal',
                isComplete: false,
                completionStatus: CompletionStatusLevel.PARTIALLY_COMPLETE,
                session: {
                    id: 'session-3',
                    status: 'in_progress',
                    startedAt: '2024-01-15T10:00:00Z',
                    submittedAt: undefined,
                    totalQuestions: 20,
                    answeredQuestions: 12,
                    timeSpent: 3600,
                    completionPercentage: 60,
                    progress: 60
                },
                result: {
                    grade: 0,
                    proficiency: 0,
                    classification: 'N/A',
                    correctAnswers: 0,
                    totalQuestions: 20,
                    scorePercentage: 0
                }
            }
        ];

        const mockStats = {
            totalStudents: 3,
            completedStudents: 2,
            partialStudents: 1,
            completionRate: 66.7,
            validStats: {
                averageGrade: 8.85,
                averageProficiency: 352.5,
                averageAccuracy: 88.5,
                averageTimeSpent: 5850,
                classificationDistribution: {
                    abaixo_do_basico: 0,
                    basico: 0,
                    adequado: 1,
                    avancado: 1
                }
            }
        };

        return (
            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold">Avaliação de Matemática - 9º Ano</h1>
                        <p className="text-muted-foreground">
                            Resultados detalhados (dados de demonstração)
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

                {/* Controles de Visualização */}
                <RealTimeControlsCard
                    isRealTimeMode={isRealTimeMode}
                    onToggleRealTime={handleToggleRealTime}
                    lastUpdate={lastUpdate}
                    autoRefreshEnabled={autoRefreshEnabled}
                    onToggleAutoRefresh={handleToggleAutoRefresh}
                    completionStats={{
                        total: mockStats.totalStudents,
                        completed: mockStats.completedStudents,
                        partial: mockStats.partialStudents,
                        completionRate: mockStats.completionRate
                    }}
                />

                {/* Status de Completude */}
                <CompletionStatusCard
                    stats={{
                        total: mockStats.totalStudents,
                        completed: mockStats.completedStudents,
                        partial: mockStats.partialStudents,
                        completionRate: mockStats.completionRate
                    }}
                    isRealTimeMode={isRealTimeMode}
                />

                {/* Informações da Avaliação */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Informações da Avaliação</span>
                            <Badge className="bg-green-100 text-green-800">
                                Concluída
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">Disciplina</div>
                                <div className="font-semibold">Matemática</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">Série</div>
                                <div className="font-semibold">9º Ano</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">Escola</div>
                                <div className="font-semibold">Escola Municipal</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">Município</div>
                                <div className="font-semibold">São Paulo</div>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">Total de Alunos</div>
                                <div className="text-2xl font-bold text-blue-600">{mockStats.totalStudents}</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">Participantes</div>
                                <div className="text-2xl font-bold text-green-600">{mockStats.completedStudents + mockStats.partialStudents}</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">Nota Geral</div>
                                <div className="text-2xl font-bold text-purple-600">
                                    {mockStats.validStats.averageGrade.toFixed(1)}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground">Proficiência</div>
                                <div className="text-2xl font-bold text-orange-600">
                                    {mockStats.validStats.averageProficiency.toFixed(1)}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Lista de Alunos */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>
                                Resultados dos Alunos
                                <Badge className="ml-2 bg-yellow-100 text-yellow-800 text-xs">
                                    <Activity className="w-3 h-3 mr-1" />
                                    Dados de Demonstração
                                </Badge>
                            </span>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                    {mockStudents.length} alunos
                                </Badge>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <StudentsResultsTable 
                            students={mockStudents} 
                            totalQuestions={20}
                            startQuestionNumber={1}
                            onViewStudentDetails={handleViewStudentDetails}
                            questoes={[]}
                            questionsWithSkills={[]}
                            skillsMapping={{}}
                            skillsBySubject={{}}
                            detailedReport={null}
                            visibleFields={visibleFields}
                            subjectFilter="all"
                            showAll={isRealTimeMode}
                        />
                    </CardContent>
                </Card>
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

    // ✅ VERIFICAÇÃO DE DADOS VÁLIDOS ADICIONAL
    if (!stats || !completionStatus) {
        return (
            <div className="container mx-auto px-4 py-6">
                <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Dados Indisponíveis
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Os dados da avaliação não estão disponíveis no momento. 
                        {!stats && ' Estatísticas não carregadas.'}
                        {!completionStatus && ' Status de completude não carregado.'}
                    </p>
                    <div className="space-y-2">
                        <Button onClick={handleRefresh}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Tentar Novamente
                        </Button>
                        <Button variant="outline" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar
                        </Button>
                    </div>
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
                        {!evaluationInfo && ' Informações da avaliação não carregadas.'}
                        {!stats && ' Estatísticas não carregadas.'}
                    </p>
                    <div className="space-y-2">
                        <Button onClick={handleRefresh}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Tentar Novamente
                        </Button>
                        <Button variant="outline" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar
                        </Button>
                    </div>
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
                    total: stats?.totalStudents || 0,
                    completed: stats?.completedStudents || 0,
                    partial: stats?.partialStudents || 0,
                    completionRate: stats?.completionRate || 0
                }}
            />

            {/* ✅ STATUS DE COMPLETUDE MELHORADO */}
            <CompletionStatusCard
                stats={{
                    total: stats?.totalStudents || 0,
                    completed: stats?.completedStudents || 0,
                    partial: stats?.partialStudents || 0,
                    completionRate: stats?.completionRate || 0
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