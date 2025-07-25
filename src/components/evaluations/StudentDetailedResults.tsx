import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
    Award
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";

interface StudentDetailedResultsProps {
    onBack: () => void;
}

interface StudentDetailedResult {
    test_id: string;
    student_id: string;
    student_db_id: string;
    student_name?: string; // ✅ Adicionado para exibir o nome do aluno
    total_questions: number;
    answered_questions: number;
    correct_answers: number;
    score_percentage: number;
    total_score: number;
    max_possible_score: number;
    grade: number;
    proficiencia: number;
    classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
    calculated_at: string;
    status?: 'concluida' | 'nao_respondida';
    answers: Array<{
        question_id: string;
        question_number: number;
        question_text: string;
        question_type: 'multipleChoice' | 'open' | 'trueFalse';
        question_value: number;
        student_answer: string;
        answered_at: string;
        is_correct: boolean;
        score: number;
        feedback: string | null;
        corrected_by: string | null;
        corrected_at: string | null;
    }>;
}

// Componente da tabela de resultados com estrutura IDÊNTICA à tabela principal
const ResultsTable = ({ answers, correctAnswersCount, proficiencia, classificacao, studentResults }: {
    answers: StudentDetailedResult['answers'];
    correctAnswersCount: number;
    proficiencia: number;
    classificacao: string;
    studentResults: StudentDetailedResult;
}) => {
    // ✅ CORRIGIDO: Usar total_questions do studentResults, não do length das respostas
    const totalQuestions = studentResults.total_questions || answers.length;
    
    // ✅ CORRIGIDO: Ordenar respostas por número da questão e remover duplicatas
    const sortedAnswers = answers
        .sort((a, b) => a.question_number - b.question_number)
        .filter((answer, index, self) => 
            index === 0 || answer.question_number !== self[index - 1].question_number
        );
    
    console.log('📊 Respostas ordenadas:', sortedAnswers.map(a => ({
        question_number: a.question_number,
        is_correct: a.is_correct
    })));
    
    // ✅ REMOVIDO: Função mockada de normalização de UUID

    // ✅ REMOVIDO: Funções mockadas de geração de códigos de habilidade
    // Os códigos reais devem vir da API

    // ✅ REMOVIDO: Dados mockados de porcentagens da turma
    // As porcentagens da turma devem vir da API real
    const generateTurmaPercentages = () => {
        return Array.from({ length: totalQuestions }, () => {
            // ✅ TODO: Implementar quando a API retornar dados reais de porcentagem da turma
            return 0; // Valor padrão até implementar dados reais
        });
    };

    const turmaPercentages = generateTurmaPercentages();
    
    // ✅ DEBUG: Verificar dados da tabela
    console.log('📊 Dados da tabela:', {
        totalQuestions,
        answersLength: answers.length,
        sortedAnswersLength: sortedAnswers.length,
        correctAnswersCount,
        proficiencia: studentResults.proficiencia,
        classificacao: studentResults.classificacao,
        grade: studentResults.grade,
        turmaPercentagesLength: turmaPercentages.length
    });
    
    // ✅ DEBUG: Verificar estrutura das respostas
    console.log('📊 Estrutura das respostas originais:', answers.map(a => ({
        question_number: a.question_number,
        is_correct: a.is_correct,
        question_id: a.question_id
    })));
    
    console.log('📊 Estrutura das respostas ordenadas:', sortedAnswers.map(a => ({
        question_number: a.question_number,
        is_correct: a.is_correct,
        question_id: a.question_id
    })));

    return (
        <div className="overflow-x-auto">
            <table className="min-w-max border border-gray-300 text-center text-sm shadow-md rounded-lg">
                <thead>
                    {/* Cabeçalho principal */}
                    <tr className="bg-gray-100">
                        <th className="p-2 min-w-[150px] text-left border-r border-gray-300">Aluno</th>
                        {Array.from({ length: totalQuestions }, (_, i) => {
                            const questionNumber = i + 1;
                            
                            return (
                                <th key={`header-q${i}`} className="p-2 min-w-[80px] border-r border-gray-300">
                                    Q{questionNumber}
                                </th>
                            );
                        })}
                        <th className="p-2 bg-gray-50">Total</th>
                        <th className="p-2 bg-gray-50">Nota</th>
                        <th className="p-2 bg-gray-50">Proficiência</th>
                        <th className="p-2 bg-gray-50">Nível</th>
                    </tr>
                    
                    {/* Linha de habilidades */}
                    <tr className="bg-gray-50">
                        <td className="p-1 text-left border-r border-gray-300 text-xs font-mono text-gray-600">
                            Habilidade
                        </td>
                        {Array.from({ length: totalQuestions }, (_, i) => {
                            const questionNumber = i + 1;
                            const answer = sortedAnswers[i];
                            
                            // ✅ TODO: Usar códigos reais de habilidade da API quando disponíveis
                            let habilidadeCode = 'N/A';
                            let disciplinaIndicator = '';
                            
                            if (answer && answer.question_id) {
                                // ✅ TODO: Buscar código real da habilidade da API
                                habilidadeCode = `Q${questionNumber}`;
                                disciplinaIndicator = ' 📚';
                            }
                            
                            return (
                                <td key={`habilidade-q${i}`} className="p-1 border-r border-gray-300 text-xs font-mono text-gray-600">
                                    <span>{habilidadeCode}{disciplinaIndicator}</span>
                                </td>
                            );
                        })}
                        <td className="p-1 bg-gray-100 text-xs font-mono text-gray-600"></td>
                        <td className="p-1 bg-gray-100 text-xs font-mono text-gray-600"></td>
                        <td className="p-1 bg-gray-100 text-xs font-mono text-gray-600"></td>
                        <td className="p-1 bg-gray-100 text-xs font-mono text-gray-600"></td>
                    </tr>
                    
                    {/* Linha de porcentagem da turma */}
                    <tr className="bg-blue-50">
                        <td className="p-1 text-left border-r border-gray-300 text-xs font-semibold text-blue-700">
                            % Turma
                        </td>
                        {Array.from({ length: totalQuestions }, (_, i) => {
                            const questionNumber = i + 1;
                            const answer = sortedAnswers[i];
                            const percentage = turmaPercentages[i];
                            
                            return (
                                <td key={`turma-q${i}`} className="p-1 border-r border-gray-300">
                                    <div className="text-xs font-bold text-gray-500">
                                        {percentage > 0 ? `${percentage.toFixed(0)}%` : 'N/A'}
                                    </div>
                                </td>
                            );
                        })}
                        <td className="p-1 bg-gray-100 text-xs font-semibold text-blue-700"></td>
                        <td className="p-1 bg-gray-100 text-xs font-semibold text-blue-700"></td>
                        <td className="p-1 bg-gray-100 text-xs font-semibold text-blue-700"></td>
                        <td className="p-1 bg-gray-100 text-xs font-semibold text-blue-700"></td>
                    </tr>
                </thead>
                <tbody>
                    {/* Linha de dados do aluno específico */}
                    <tr className="border-t border-gray-300">
                        <td className="p-2 border-t border-gray-200 text-left border-r border-gray-300">
                            <div className="font-medium text-blue-600">
                                {studentResults?.student_name || `Aluno ${studentResults?.student_id?.slice(-4) || 'N/A'}`}
                            </div>
                        </td>
                        {Array.from({ length: totalQuestions }, (_, i) => {
                            const questionNumber = i + 1;
                            const answer = sortedAnswers[i];
                            
                            // ✅ DEBUG: Verificar cada questão
                            console.log(`Questão ${questionNumber}:`, {
                                found: !!answer,
                                isCorrect: answer?.is_correct,
                                questionNumber: answer?.question_number,
                                index: i
                            });
                            
                            return (
                                <td key={`answer-q${i}`} className="p-2 border-t border-gray-200 border-r border-gray-300">
                                    <div className="text-xl">
                                        {answer ? (
                                            answer.is_correct ? (
                                                <span className="text-blue-600">✓</span>
                                            ) : (
                                                <span className="text-red-500">✗</span>
                                            )
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </div>
                                </td>
                            );
                        })}
                        <td className="p-2 border-t border-gray-200 font-semibold bg-gray-50">{studentResults.correct_answers}</td>
                        <td className="p-2 border-t border-gray-200 font-semibold bg-gray-50">{studentResults.grade.toFixed(1)}</td>
                        <td className="p-2 border-t border-gray-200 font-semibold bg-gray-50">{studentResults.proficiencia.toFixed(0)}</td>
                        <td className="p-2 border-t border-gray-200 bg-gray-50">
                            <span className={`px-2 py-1 rounded-full text-xs text-white ${
                                studentResults?.classificacao === 'Abaixo do Básico' ? 'bg-red-500' :
                                studentResults?.classificacao === 'Básico' ? 'bg-yellow-400' :
                                studentResults?.classificacao === 'Adequado' ? 'bg-blue-500' :
                                'bg-green-500'
                            }`}>
                                {studentResults?.classificacao || 'Não informado'}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
            
            {/* Legenda */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600 space-y-2">
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
                            <span className="text-green-600 font-bold">60%+</span>
                            <span>Turma teve bom desempenho</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-red-500 font-bold">&lt;60%</span>
                            <span>Turma teve dificuldade</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const getClassificationColor = (classification: string) => {
    switch (classification) {
        case 'Avançado': return 'border-l-green-500';
        case 'Adequado': return 'border-l-blue-500';
        case 'Básico': return 'border-l-yellow-500';
        case 'Abaixo do Básico': return 'border-l-red-500';
        default: return 'border-l-gray-500';
    }
};

const getClassificationTextColor = (classification: string) => {
    switch (classification) {
        case 'Avançado': return 'text-green-600';
        case 'Adequado': return 'text-blue-600';
        case 'Básico': return 'text-yellow-600';
        case 'Abaixo do Básico': return 'text-red-600';
        default: return 'text-gray-600';
    }
};

export default function StudentDetailedResults({ onBack }: StudentDetailedResultsProps) {
    const { id: evaluationId, studentId } = useParams<{ id: string; studentId: string }>();
    const [studentResults, setStudentResults] = useState<StudentDetailedResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        if (evaluationId && studentId) {
            console.log('🔄 useEffect executado:', { evaluationId, studentId });
            fetchStudentResults();
        }
    }, [evaluationId, studentId]);

    const fetchStudentResults = async () => {
        try {
            setIsLoading(true);
            
            if (!evaluationId || !studentId) {
                throw new Error("ID da avaliação ou aluno não fornecido");
            }

            console.log('🔍 Iniciando busca de resultados:', { evaluationId, studentId });
            console.log('📡 Chamando API...');

            // ✅ CORRIGIDO: Usar a API correta do backend
            const result = await EvaluationResultsApiService.getStudentResults(evaluationId, studentId);
            
            if (!result) {
                throw new Error("Resultados do aluno não encontrados no servidor");
            }

            console.log('📊 Resultado bruto da API:', result);
            console.log('📊 Dados do aluno recebidos:', result);
            
            // ✅ DEBUG: Verificar estrutura dos dados
            const dataStructure = {
                hasStudentName: !!result.student_name,
                hasAnswers: !!result.answers && result.answers.length > 0,
                answersLength: result.answers?.length || 0,
                hasProficiencia: !!result.proficiencia,
                hasClassificacao: !!result.classificacao,
                hasGrade: !!result.grade,
                totalQuestions: result.total_questions,
                answeredQuestions: result.answered_questions
            };
            console.log('📊 Estrutura dos dados:', dataStructure);
            
            console.log('✅ Definindo dados no estado...');
            setStudentResults(result);
        } catch (error: unknown) {
            console.error("❌ Erro ao buscar resultados do aluno:", error);
            
            // ✅ CORRIGIDO: Mensagens de erro mais específicas
            let errorMessage = "Não foi possível carregar os resultados do aluno";
            
            const errorObj = error as { message?: string; code?: string; response?: { status?: number } };
            
            if (errorObj.message?.includes('CORS') || errorObj.code === 'ERR_NETWORK') {
                errorMessage = "Erro de conexão com o servidor. Verifique se o backend está rodando em http://localhost:5000";
            } else if (errorObj.message?.includes('não encontrados')) {
                errorMessage = "Resultados do aluno não encontrados ou não disponíveis";
            } else if (errorObj.response?.status === 404) {
                errorMessage = "Aluno ou avaliação não encontrados no servidor";
            } else if (errorObj.response?.status >= 500) {
                errorMessage = "Erro interno do servidor. Tente novamente mais tarde";
            }
            
            toast({
                title: "Erro",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportResults = async () => {
        try {
            const XLSX = await import('xlsx');
            const { saveAs } = await import('file-saver');

            if (!studentResults) {
                toast({
                    title: "Nenhum dado para exportar",
                    description: "Não há resultados para gerar a planilha",
                    variant: "destructive",
                });
                return;
            }

            // Criar dados da planilha
            const worksheetData = [
                ['Questão', 'Pergunta', 'Tipo', 'Resposta do Aluno', 'Acertou', 'Pontuação'],
                ...studentResults.answers.map((answer, index) => [
                    answer.question_number,
                    answer.question_text,
                    answer.question_type,
                    answer.student_answer,
                    answer.is_correct ? 'Sim' : 'Não',
                    answer.score
                ])
            ];

            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados');

            const fileName = `resultados-aluno-${studentId}-${new Date().toISOString().split('T')[0]}.xlsx`;
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            saveAs(blob, fileName);

            toast({
                title: "Exportação concluída!",
                description: "Os resultados do aluno foram exportados com sucesso.",
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
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                        <Skeleton className="h-3 w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!studentResults) {
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
                        Resultados não encontrados
                    </h3>
                    <p className="text-gray-600">
                        Os resultados detalhados do aluno não foram encontrados.
                    </p>
                </div>
            </div>
        );
    }

    // Verificar se o aluno não respondeu a avaliação
    if (studentResults.status === 'nao_respondida' || studentResults.answered_questions === 0) {
        return (
            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Resultados do Aluno</h1>
                        <p className="text-muted-foreground">
                            Status da participação na avaliação
                        </p>
                    </div>
                </div>

                {/* Card de Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                            Avaliação Não Respondida
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="h-8 w-8 text-orange-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Aluno não participou da avaliação
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Este aluno não possui respostas registradas para esta avaliação.
                            </p>

                            {/* Informações da avaliação */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mt-6">
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <div className="text-2xl font-bold text-gray-600">{studentResults.total_questions}</div>
                                    <div className="text-sm text-gray-600">Total de Questões</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <div className="text-2xl font-bold text-gray-600">{studentResults.answered_questions}</div>
                                    <div className="text-sm text-gray-600">Questões Respondidas</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <div className="text-2xl font-bold text-gray-600">{studentResults.correct_answers}</div>
                                    <div className="text-sm text-gray-600">Acertos</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <div className="text-2xl font-bold text-gray-600">{studentResults.grade.toFixed(1)}</div>
                                    <div className="text-sm text-gray-600">Nota Final</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <div className="text-2xl font-bold text-gray-600">{studentResults.proficiencia.toFixed(1)}</div>
                                    <div className="text-sm text-gray-600">Proficiência</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ✅ CORRIGIDO: Calcular estatísticas baseadas nos dados disponíveis
    const wrongAnswers = studentResults.answers?.filter(a => !a.is_correct) || [];
    const correctAnswers = studentResults.answers?.filter(a => a.is_correct) || [];
    const blankAnswers = studentResults.total_questions - studentResults.answered_questions;
    
    // ✅ CORRIGIDO: Se não há respostas detalhadas, usar dados básicos
    const hasDetailedAnswers = studentResults.answers && studentResults.answers.length > 0;
    const correctAnswersCount = hasDetailedAnswers ? correctAnswers.length : studentResults.correct_answers;
    const wrongAnswersCount = hasDetailedAnswers ? wrongAnswers.length : (studentResults.answered_questions - studentResults.correct_answers);
    
    // ✅ DEBUG: Verificar cálculos
    console.log('📊 Cálculos das estatísticas:', {
        totalQuestions: studentResults.total_questions,
        answeredQuestions: studentResults.answered_questions,
        correctAnswersFromAPI: studentResults.correct_answers,
        correctAnswersFromDetails: correctAnswers.length,
        wrongAnswersFromDetails: wrongAnswers.length,
        blankAnswers,
        hasDetailedAnswers,
        finalCorrectAnswersCount: correctAnswersCount
    });

    return (
        <div className="container mx-auto px-4 py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Resultados Detalhados do Aluno</h1>
                    <p className="text-muted-foreground">
                        Análise completa das respostas e desempenho
                    </p>
                </div>
            </div>

            {/* Estatísticas Gerais */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            Total de Questões
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {studentResults.total_questions}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {studentResults.answered_questions} respondidas
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            Acertos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {studentResults.correct_answers}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {((studentResults.correct_answers / studentResults.total_questions) * 100).toFixed(1)}% de acerto
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Target className="h-4 w-4 text-purple-600" />
                            Nota Final
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                            {studentResults.grade.toFixed(1)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Pontuação: {studentResults.total_score.toFixed(1)}/{studentResults.max_possible_score.toFixed(1)}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-orange-600" />
                            Proficiência
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {studentResults.proficiencia.toFixed(1)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {studentResults.classificacao}
                        </p>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 ${getClassificationColor(studentResults.classificacao)}`}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Award className="h-4 w-4" />
                            Classificação
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${getClassificationTextColor(studentResults.classificacao)}`}>
                            {studentResults.classificacao}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Nível de desempenho
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Resumo das Respostas */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Resumo das Respostas</span>
                        <Button onClick={handleExportResults} variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Exportar
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                            <div>
                                <div className="text-2xl font-bold text-green-600">{correctAnswersCount}</div>
                                <div className="text-sm text-green-700">Acertos</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
                            <XCircle className="h-8 w-8 text-red-600" />
                            <div>
                                <div className="text-2xl font-bold text-red-600">{wrongAnswersCount}</div>
                                <div className="text-sm text-red-700">Erros</div>
                            </div>
                        </div>

                            <div>
                                                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Lista de Questões */}
            <Card>
                <CardHeader>
                    <CardTitle>Questões Respondidas</CardTitle>
                </CardHeader>
                <CardContent>
                    {hasDetailedAnswers ? (
                        <ResultsTable
                            answers={studentResults.answers}
                            correctAnswersCount={studentResults.correct_answers} // ✅ Usar dados da API diretamente
                            proficiencia={studentResults.proficiencia}
                            classificacao={studentResults.classificacao}
                            studentResults={studentResults}
                        />
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="h-8 w-8 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Respostas Detalhadas Não Disponíveis
                            </h3>
                            <p className="text-gray-600 mb-4">
                                As respostas detalhadas das questões não estão disponíveis no momento.
                            </p>
                            
                            {/* Resumo das questões */}
                            <div className="grid gap-4 md:grid-cols-3 mt-6">
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">{correctAnswersCount}</div>
                                    <div className="text-sm text-green-700">Questões Corretas</div>
                                </div>
                                <div className="text-center p-4 bg-red-50 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600">{wrongAnswersCount}</div>
                                    <div className="text-sm text-red-700">Questões Incorretas</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <div className="text-2xl font-bold text-gray-600">{blankAnswers}</div>
                            
                                </div>
                            </div>
                            
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-700">
                                    <strong>Resumo:</strong> O aluno respondeu {studentResults.answered_questions} de {studentResults.total_questions} questões, 
                                    acertando {correctAnswersCount} ({((correctAnswersCount / studentResults.total_questions) * 100).toFixed(1)}% de acerto).
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 