import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    ArrowLeft,
    CheckCircle2,
    AlertTriangle,
    Award,
    Target,
    BarChart3,
    FileText,
    Clock,
    Users,
    XCircle,
    RefreshCw,
    Minus,
    Eye,
    Info,
    TrendingUp,
    Activity
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useStudentAggregatedResults } from "./hooks/useStudentAggregatedResults";
import { useAggregatedResults } from "./hooks/useAggregatedResults";
import { CompletionStatusLevel } from "./types/completion";

interface StudentDetailedResultsProps {
    onBack: () => void;
}

// ✅ COMPONENTE: PartialProgressBadge - Badge para progresso parcial
const PartialProgressBadge: React.FC<{
    studentName?: string;
    completionLevel: CompletionStatusLevel;
    progressPercentage: number;
    timeSpent: number;
}> = ({ studentName, completionLevel, progressPercentage, timeSpent }) => {
    const getBadgeConfig = () => {
        switch (completionLevel) {
            case CompletionStatusLevel.PARTIALLY_COMPLETE:
                return {
                    className: "bg-yellow-100 text-yellow-800 border-yellow-300",
                    icon: <Clock className="h-4 w-4 mr-2" />,
                    text: "Em Andamento"
                };
            case CompletionStatusLevel.MOSTLY_COMPLETE:
                return {
                    className: "bg-blue-100 text-blue-800 border-blue-300",
                    icon: <TrendingUp className="h-4 w-4 mr-2" />,
                    text: "Quase Completo"
                };
            case CompletionStatusLevel.NOT_STARTED:
                return {
                    className: "bg-gray-100 text-gray-800 border-gray-300",
                    icon: <Minus className="h-4 w-4 mr-2" />,
                    text: "Não Iniciado"
                };
            default:
                return {
                    className: "bg-red-100 text-red-800 border-red-300",
                    icon: <XCircle className="h-4 w-4 mr-2" />,
                    text: "Incompleto"
                };
        }
    };

    const badgeConfig = getBadgeConfig();

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge className={`${badgeConfig.className} px-3 py-1 cursor-help`}>
                        {badgeConfig.icon}
                        {studentName} - {badgeConfig.text} ({progressPercentage.toFixed(1)}%)
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="space-y-2">
                        <div className="font-semibold">Status Detalhado:</div>
                        <div className="text-sm">
                            • Progresso: {progressPercentage.toFixed(1)}%<br/>
                            • Tempo gasto: {timeSpent}min<br/>
                            • Status: {badgeConfig.text}
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

// ✅ COMPONENTE: RealTimeStatusCard - Card de status tempo real
const RealTimeStatusCard: React.FC<{
    isRealTimeMode: boolean;
    onToggleRealTime: (enabled: boolean) => void;
    lastUpdate: Date;
    autoRefreshEnabled: boolean;
    onToggleAutoRefresh: (enabled: boolean) => void;
}> = ({ isRealTimeMode, onToggleRealTime, lastUpdate, autoRefreshEnabled, onToggleAutoRefresh }) => (
    <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Controles de Visualização
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {/* Toggle Tempo Real */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="text-sm font-medium">Modo Tempo Real</div>
                    <div className="text-xs text-gray-600">
                        {isRealTimeMode 
                            ? "Mostrando progresso em tempo real (incluindo dados parciais)"
                            : "Mostrando apenas dados completos e validados"
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
            </div>
        </CardContent>
    </Card>
);

// ✅ COMPONENTE: IncompleteStudentAlert - Alerta para aluno incompleto (MELHORADO)
const IncompleteStudentAlert: React.FC<{
    studentName?: string;
    completionLevel: CompletionStatusLevel;
    quickStats: {
        hasStarted: boolean;
        hasAnswered: boolean;
        estimatedCompletion: number;
        timeSpent: number;
    };
    onRetry: () => void;
    isRealTimeMode: boolean;
    onEnableRealTime: () => void;
}> = ({ studentName, completionLevel, quickStats, onRetry, isRealTimeMode, onEnableRealTime }) => {
    const getAlertConfig = () => {
        switch (completionLevel) {
            case CompletionStatusLevel.NOT_STARTED:
                return {
                    color: "bg-gray-100 border-gray-300 text-gray-800",
                    icon: <Minus className="h-5 w-5 text-gray-600" />,
                    title: "Avaliação Não Iniciada",
                    description: "O aluno ainda não começou esta avaliação."
                };
            case CompletionStatusLevel.PARTIALLY_COMPLETE:
                return {
                    color: "bg-yellow-100 border-yellow-300 text-yellow-800",
                    icon: <Clock className="h-5 w-5 text-yellow-600" />,
                    title: "Avaliação Em Andamento",
                    description: "O aluno iniciou mas não finalizou a avaliação."
                };
            case CompletionStatusLevel.MOSTLY_COMPLETE:
                return {
                    color: "bg-blue-100 border-blue-300 text-blue-800",
                    icon: <TrendingUp className="h-5 w-5 text-blue-600" />,
                    title: "Avaliação Quase Completa",
                    description: "O aluno respondeu a maioria das questões, mas ainda não finalizou."
                };
            default:
                return {
                    color: "bg-red-100 border-red-300 text-red-800",
                    icon: <XCircle className="h-5 w-5 text-red-600" />,
                    title: "Avaliação Incompleta",
                    description: "Não foi possível carregar os dados da avaliação."
                };
        }
    };

    const alertConfig = getAlertConfig();

    return (
        <Card className={`border-2 ${alertConfig.color}`}>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {alertConfig.icon}
                        {alertConfig.title}
                    </div>
                    {!isRealTimeMode && quickStats.hasStarted && (
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={onEnableRealTime}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Progresso
                        </Button>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Alert className="border-0 bg-transparent p-0">
                        <AlertDescription className="text-sm">
                            <strong>{studentName || 'O aluno'}</strong> {alertConfig.description}
                        </AlertDescription>
                    </Alert>

                    {/* Progresso Atual */}
                    {quickStats.hasStarted && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Progresso da Avaliação</span>
                                <span className="font-bold">{quickStats.estimatedCompletion.toFixed(1)}%</span>
                            </div>
                            <Progress value={quickStats.estimatedCompletion} className="h-2" />
                        </div>
                    )}

                    {/* Estatísticas Rápidas */}
                    <div className="grid grid-cols-2 gap-4 text-center text-sm">
                        <div className="space-y-1">
                            <div className="font-bold text-lg">
                                {quickStats.hasStarted ? '✓' : '✗'}
                            </div>
                            <div className="text-xs text-gray-600">Iniciou</div>
                        </div>
                        <div className="space-y-1">
                            <div className="font-bold text-lg">
                                {quickStats.timeSpent}min
                            </div>
                            <div className="text-xs text-gray-600">Tempo Gasto</div>
                        </div>
                    </div>

                    {/* Recomendações Baseadas no Modo */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="text-xs text-blue-800">
                            <strong>Próximos Passos:</strong>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                                {!isRealTimeMode && quickStats.hasStarted && (
                                    <li>
                                        <button 
                                            className="text-blue-700 underline hover:text-blue-900"
                                            onClick={onEnableRealTime}
                                        >
                                            Ativar modo tempo real
                                        </button> para acompanhar o progresso
                                    </li>
                                )}
                                {completionLevel === CompletionStatusLevel.NOT_STARTED && (
                                    <>
                                        <li>Verificar se o aluno teve acesso à avaliação</li>
                                        <li>Confirmar se as instruções foram passadas adequadamente</li>
                                        <li>Checar se há problemas técnicos impedindo o acesso</li>
                                    </>
                                )}
                                {(completionLevel === CompletionStatusLevel.PARTIALLY_COMPLETE || 
                                  completionLevel === CompletionStatusLevel.MOSTLY_COMPLETE) && (
                                    <>
                                        <li>Entrar em contato com o aluno para finalizar a avaliação</li>
                                        <li>Verificar se houve problemas técnicos durante a aplicação</li>
                                        <li>Considerar permitir tempo adicional se necessário</li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onRetry} className="flex-1">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Verificar Novamente
                        </Button>
                        {!isRealTimeMode && quickStats.hasStarted && (
                            <Button onClick={onEnableRealTime} className="flex-1">
                                <Eye className="h-4 w-4 mr-2" />
                                Acompanhar Progresso
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// ✅ COMPONENTE: CompletedStudentBadge - Badge verde para aluno completo (MELHORADO)
const CompletedStudentBadge: React.FC<{ 
    studentName?: string;
    completionTime?: string;
    qualityScore?: number;
}> = ({ studentName, completionTime, qualityScore }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Badge className="bg-green-100 text-green-800 border-green-300 px-3 py-1 cursor-help">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {studentName} - Avaliação Concluída
                </Badge>
            </TooltipTrigger>
            <TooltipContent>
                <div className="space-y-2">
                    <div className="font-semibold">Status Completo:</div>
                    <div className="text-sm">
                        • Status: Concluída com sucesso<br/>
                        {completionTime && `• Finalizada: ${completionTime}`}<br/>
                        {qualityScore && `• Qualidade: ${qualityScore.toFixed(1)}%`}<br/>
                        • Dados válidos para análise
                    </div>
                </div>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

// ✅ COMPONENTE: StudentStatsCard - Card de estatísticas do aluno (MELHORADO)
const StudentStatsCard: React.FC<{
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
    isPartial?: boolean;
    tooltip?: string;
}> = ({ title, value, subtitle, icon, color, isPartial = false, tooltip }) => {
    const CardContent_Component = (
        <Card className={`border ${isPartial ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'}`}>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {icon}
                    {title}
                    {isPartial && <Clock className="h-3 w-3 text-yellow-600" />}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${color}`}>
                    {value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {subtitle}
                </p>
                {isPartial && (
                    <p className="text-xs text-yellow-700 mt-1 font-medium">
                        Dados parciais
                    </p>
                )}
            </CardContent>
        </Card>
    );

    if (tooltip) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {CardContent_Component}
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="text-sm">{tooltip}</div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return CardContent_Component;
};

// ✅ COMPONENTE PRINCIPAL REFATORADO
export default function StudentDetailedResults({ onBack }: StudentDetailedResultsProps) {
    const { id: evaluationId, studentId } = useParams<{ id: string; studentId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    // ✅ ESTADOS PARA CONTROLE DE VISUALIZAÇÃO
    const [isRealTimeMode, setIsRealTimeMode] = useState(false);
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // ✅ 1. HOOK AGREGADO PARA CONTEXTO GERAL DA AVALIAÇÃO
    const {
        allStudents,
        completionStatus: generalStatus,
        stats: generalStats
    } = useAggregatedResults(evaluationId || '', {
        enablePartialView: isRealTimeMode,
        autoRefresh: autoRefreshEnabled,
        refreshInterval: 30000
    });

    // ✅ 2. HOOK ESPECÍFICO DO ALUNO COM CONFIGURAÇÕES ADAPTÁVEIS
    const {
        data,
        isLoading,
        isCheckingCompletion,
        error,
        refetch,
        canAnalyze,
        shouldShowResults,
        completionLevel,
        quickStats
    } = useStudentAggregatedResults(
        evaluationId || '',
        studentId || '',
        {
            includeAnswers: isRealTimeMode, // Carregar respostas apenas se modo tempo real
            autoLoadDetails: completionLevel === CompletionStatusLevel.COMPLETE // Carregar detalhes apenas se completo
        }
    );

    // ✅ ENCONTRAR DADOS DO ALUNO NO CONTEXTO GERAL
    const studentInContext = allStudents.find(s => s.id === studentId);

    // ✅ HANDLERS PARA CONTROLES
    const handleToggleRealTime = (enabled: boolean) => {
        setIsRealTimeMode(enabled);
        if (enabled) {
            setLastUpdate(new Date());
            toast({
                title: "Modo Tempo Real Ativado",
                description: "Agora você pode acompanhar o progresso em tempo real.",
            });
        } else {
            setAutoRefreshEnabled(false);
            toast({
                title: "Modo Tempo Real Desativado",
                description: "Voltando a mostrar apenas dados completos e validados.",
            });
        }
    };

    const handleToggleAutoRefresh = (enabled: boolean) => {
        setAutoRefreshEnabled(enabled);
        if (enabled) {
            toast({
                title: "Auto-atualização Ativada",
                description: "Os dados serão atualizados automaticamente a cada 30 segundos.",
            });
        }
    };

    const handleRefresh = async () => {
        setLastUpdate(new Date());
        await refetch();
        toast({
            title: "Dados Atualizados",
            description: "As informações foram atualizadas com sucesso.",
        });
    };

    // ✅ EFEITO PARA AUTO-REFRESH
    useEffect(() => {
        if (!autoRefreshEnabled) return;

        const interval = setInterval(() => {
            handleRefresh();
        }, 30000);

        return () => clearInterval(interval);
    }, [autoRefreshEnabled, refetch]);

    // Estados de loading diferentes
    if (isLoading || isCheckingCompletion) {
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
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-4 w-16" />
                                    </div>
                                </div>
                            ))}
                        </div>
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
                        <XCircle className="w-8 h-8 text-red-600" />
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

    // ✅ LÓGICA PARA MOSTRAR DADOS PARCIAIS OU COMPLETOS
    const shouldShowPartialData = isRealTimeMode && 
        (completionLevel === CompletionStatusLevel.PARTIALLY_COMPLETE || 
         completionLevel === CompletionStatusLevel.MOSTLY_COMPLETE);

    const shouldShowIncompleteAlert = !canAnalyze || 
        (completionLevel !== CompletionStatusLevel.COMPLETE && !shouldShowPartialData);

    // ✅ MOSTRAR ALERTA DE ALUNO INCOMPLETO (quando não está em modo tempo real)
    if (shouldShowIncompleteAlert) {
        return (
            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold">Resultados do Aluno</h1>
                        <p className="text-muted-foreground">
                            Detalhes da avaliação individual
                        </p>
                    </div>
                </div>

                {/* Controles de Visualização */}
                <RealTimeStatusCard
                    isRealTimeMode={isRealTimeMode}
                    onToggleRealTime={handleToggleRealTime}
                    lastUpdate={lastUpdate}
                    autoRefreshEnabled={autoRefreshEnabled}
                    onToggleAutoRefresh={handleToggleAutoRefresh}
                />

                {/* ✅ ALERTA DE ALUNO INCOMPLETO MELHORADO */}
                <IncompleteStudentAlert
                    studentName={data?.student_name}
                    completionLevel={completionLevel}
                    quickStats={quickStats}
                    onRetry={handleRefresh}
                    isRealTimeMode={isRealTimeMode}
                    onEnableRealTime={() => handleToggleRealTime(true)}
                />
            </div>
        );
    }

    // ✅ RENDERIZAÇÃO PRINCIPAL - DADOS COMPLETOS OU PARCIAIS
    const studentResults = data;
    const isPartialData = shouldShowPartialData;
    
    if (!studentResults?.result && !isPartialData) {
        return (
            <div className="container mx-auto px-4 py-6">
                <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Dados de resultados não disponíveis
                    </h3>
                    <p className="text-gray-600 mb-4">
                        {completionLevel === CompletionStatusLevel.COMPLETE
                            ? "Embora o aluno tenha completado a avaliação, os resultados não estão disponíveis."
                            : "O aluno ainda não completou a avaliação."
                        }
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
                    <h1 className="text-2xl font-bold">Resultados Detalhados do Aluno</h1>
                    <p className="text-muted-foreground">
                        {isRealTimeMode 
                            ? "Análise individual com dados em tempo real"
                            : "Análise individual completa da avaliação"
                        }
                    </p>
                </div>
                
                {/* ✅ BADGE DINÂMICO BASEADO NO STATUS */}
                {completionLevel === CompletionStatusLevel.COMPLETE ? (
                    <CompletedStudentBadge 
                        studentName={data?.student_name}
                        completionTime={studentResults?.session?.submittedAt 
                            ? new Date(studentResults.session.submittedAt).toLocaleString('pt-BR')
                            : undefined
                        }
                        qualityScore={100}
                    />
                ) : (
                    <PartialProgressBadge
                        studentName={data?.student_name}
                        completionLevel={completionLevel}
                        progressPercentage={quickStats.estimatedCompletion}
                        timeSpent={quickStats.timeSpent}
                    />
                )}
            </div>

            {/* Controles de Visualização */}
            <RealTimeStatusCard
                isRealTimeMode={isRealTimeMode}
                onToggleRealTime={handleToggleRealTime}
                lastUpdate={lastUpdate}
                autoRefreshEnabled={autoRefreshEnabled}
                onToggleAutoRefresh={handleToggleAutoRefresh}
            />

            {/* ✅ ALERTA INFORMATIVO PARA DADOS PARCIAIS */}
            {isPartialData && (
                <Alert className="border-yellow-300 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                        <strong>Visualização em Tempo Real:</strong> Os dados mostrados podem estar incompletos. 
                        O aluno ainda está realizando a avaliação. Dados oficiais estarão disponíveis após a conclusão.
                    </AlertDescription>
                </Alert>
            )}

            {/* Estatísticas Gerais */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StudentStatsCard
                    title="Total de Questões"
                    value={studentResults?.session?.total_questions || studentInContext?.session?.totalQuestions || 0}
                    subtitle={`${studentResults?.session?.answered_questions || studentInContext?.session?.answeredQuestions || 0} respondidas`}
                    icon={<FileText className="h-4 w-4 text-blue-600" />}
                    color="text-blue-600"
                    isPartial={isPartialData}
                    tooltip={isPartialData ? "Número de questões pode aumentar conforme o aluno progride" : undefined}
                />

                <StudentStatsCard
                    title="Acertos"
                    value={studentResults?.result?.correct_answers || studentInContext?.result?.correctAnswers || 0}
                    subtitle={`${((studentResults?.result?.correct_answers || studentInContext?.result?.correctAnswers || 0) / (studentResults?.session?.total_questions || studentInContext?.session?.totalQuestions || 1) * 100).toFixed(1)}% de acerto`}
                    icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
                    color="text-green-600"
                    isPartial={isPartialData}
                    tooltip={isPartialData ? "Taxa de acerto baseada nas questões respondidas até agora" : undefined}
                />

                <StudentStatsCard
                    title="Nota Atual"
                    value={isPartialData 
                        ? `${((studentResults?.result?.correct_answers || 0) / (studentResults?.session?.answered_questions || 1) * 10).toFixed(1)}`
                        : studentResults?.result?.grade?.toFixed(1) || studentInContext?.result?.grade?.toFixed(1) || 'N/A'
                    }
                    subtitle={isPartialData 
                        ? "Projeção baseada no progresso atual"
                        : `De ${studentResults?.result?.max_possible_score || 10} pontos possíveis`
                    }
                    icon={<Award className="h-4 w-4 text-purple-600" />}
                    color="text-purple-600"
                    isPartial={isPartialData}
                    tooltip={isPartialData ? "Nota oficial será calculada após conclusão da avaliação" : undefined}
                />

                <StudentStatsCard
                    title="Proficiência"
                    value={isPartialData 
                        ? "Em cálculo..."
                        : studentResults?.result?.proficiencia?.toFixed(0) || studentInContext?.result?.proficiency?.toFixed(0) || 'N/A'
                    }
                    subtitle={isPartialData 
                        ? "Será calculada após conclusão"
                        : `Nível: ${studentResults?.result?.classificacao || studentInContext?.result?.classification || 'Não classificado'}`
                    }
                    icon={<BarChart3 className="h-4 w-4 text-orange-600" />}
                    color="text-orange-600"
                    isPartial={isPartialData}
                    tooltip={isPartialData ? "Proficiência é calculada apenas com avaliações completas" : undefined}
                />

                <StudentStatsCard
                    title="Tempo Gasto"
                    value={`${quickStats.timeSpent}min`}
                    subtitle={isPartialData ? "Tempo em andamento" : "Duração total da avaliação"}
                    icon={<Clock className="h-4 w-4 text-gray-600" />}
                    color="text-gray-600"
                    isPartial={isPartialData}
                    tooltip={isPartialData ? "Cronômetro ainda está rodando" : undefined}
                />
            </div>

            {/* Classificação do Aluno */}
            {!isPartialData && studentResults?.result && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Classificação de Proficiência</span>
                            <Badge className={`${
                                studentResults.result.classificacao === 'Avançado' ? 'bg-green-100 text-green-800 border-green-300' :
                                studentResults.result.classificacao === 'Adequado' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                studentResults.result.classificacao === 'Básico' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                'bg-red-100 text-red-800 border-red-300'
                            }`}>
                                {studentResults.result.classificacao || 'Não Classificado'}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Progresso de Proficiência */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Nível de Proficiência Alcançado</span>
                                    <span className="font-bold">
                                        {studentResults.result.proficiencia?.toFixed(0) || 0} pontos
                                    </span>
                                </div>
                                <Progress 
                                    value={Math.min((studentResults.result.proficiencia || 0) / 500 * 100, 100)} 
                                    className="h-3" 
                                />
                            </div>

                            {/* Detalhes da Performance */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    <div>
                                        <div className="text-lg font-bold text-green-600">
                                            {studentResults.result.correct_answers}
                                        </div>
                                        <div className="text-xs text-gray-600">Questões Corretas</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold text-red-600">
                                            {(studentResults.session?.answered_questions || 0) - studentResults.result.correct_answers}
                                        </div>
                                        <div className="text-xs text-gray-600">Questões Incorretas</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold text-purple-600">
                                            {studentResults.result.total_score}
                                        </div>
                                        <div className="text-xs text-gray-600">Pontuação Total</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold text-blue-600">
                                            {((studentResults.result.correct_answers / (studentResults.session?.total_questions || 1)) * 100).toFixed(1)}%
                                        </div>
                                        <div className="text-xs text-gray-600">Taxa de Acerto</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Progresso em Tempo Real */}
            {isPartialData && (
                <Card className="bg-yellow-50 border-yellow-200">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-4 w-4 text-yellow-600" />
                            Progresso em Tempo Real
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Progresso da Avaliação</span>
                                <span className="font-bold">{quickStats.estimatedCompletion.toFixed(1)}%</span>
                            </div>
                            <Progress value={quickStats.estimatedCompletion} className="h-3" />
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-center text-sm">
                            <div>
                                <div className="text-lg font-bold text-blue-600">
                                    {studentResults?.session?.answered_questions || 0}
                                </div>
                                <div className="text-xs text-gray-600">Questões Respondidas</div>
                            </div>
                            <div>
                                <div className="text-lg font-bold text-green-600">
                                    {studentResults?.result?.correct_answers || 0}
                                </div>
                                <div className="text-xs text-gray-600">Acertos Até Agora</div>
                            </div>
                            <div>
                                <div className="text-lg font-bold text-orange-600">
                                    {quickStats.timeSpent}min
                                </div>
                                <div className="text-xs text-gray-600">Tempo Decorrido</div>
                            </div>
                        </div>

                        <div className="bg-white border border-yellow-300 rounded-lg p-3">
                            <div className="text-xs text-yellow-800">
                                <strong>Nota:</strong> O aluno ainda está realizando a avaliação. 
                                Os dados são atualizados automaticamente e podem mudar a qualquer momento.
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Informações Complementares */}
            <Card className={isPartialData ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        {isPartialData ? (
                            <>
                                <Clock className="h-4 w-4 text-yellow-600" />
                                Avaliação em Andamento
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                Avaliação Concluída com Sucesso
                            </>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className={`text-sm space-y-2 ${isPartialData ? 'text-yellow-800' : 'text-green-800'}`}>
                    <p>
                        <strong>Status:</strong> {isPartialData 
                            ? "O aluno está realizando a avaliação em tempo real."
                            : "O aluno completou integralmente esta avaliação e todos os dados necessários para análise estão disponíveis."
                        }
                    </p>
                    <p>
                        <strong>Qualidade dos Dados:</strong> {isPartialData
                            ? "Os dados mostrados são atualizados em tempo real, mas podem estar incompletos."
                            : "Os resultados apresentados foram validados e estão prontos para análise pedagógica."
                        }
                    </p>
                    <p>
                        <strong>Última Atualização:</strong> {lastUpdate.toLocaleString('pt-BR')}
                    </p>
                    {isRealTimeMode && (
                        <p>
                            <strong>Modo de Visualização:</strong> Tempo Real {autoRefreshEnabled && "(Auto-atualização ativa)"}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Botão de Atualização Manual */}
            <div className="flex justify-center">
                <Button onClick={handleRefresh} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar Dados
                </Button>
            </div>
        </div>
    );
} 
} 