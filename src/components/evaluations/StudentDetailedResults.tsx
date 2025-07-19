import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
    ArrowLeft,
    Download,
    CheckCircle2,
    XCircle,
    Minus,
    Clock,
    Target,
    BarChart3,
    FileText
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
    total_questions: number;
    answered_questions: number;
    correct_answers: number;
    score_percentage: number;
    total_score: number;
    max_possible_score: number;
    answers: Array<{
        question_id: string;
        question_text: string;
        question_type: 'multipleChoice' | 'open' | 'trueFalse';
        correct_answer: string;
        student_answer: string;
        options: string[];
        is_correct: boolean;
        score: number;
    }>;
}

export default function StudentDetailedResults({ onBack }: StudentDetailedResultsProps) {
    const { id: evaluationId, studentId } = useParams<{ id: string; studentId: string }>();
    const [studentResults, setStudentResults] = useState<StudentDetailedResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        if (evaluationId && studentId) {
            fetchStudentResults();
        }
    }, [evaluationId, studentId]);

    const fetchStudentResults = async () => {
        try {
            setIsLoading(true);
            const results = await EvaluationResultsApiService.getStudentDetailedResults(evaluationId!, studentId!);
            setStudentResults(results);
        } catch (error) {
            console.error("Erro ao buscar resultados do aluno:", error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar os resultados detalhados do aluno",
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
                ['Questão', 'Pergunta', 'Tipo', 'Resposta Correta', 'Resposta do Aluno', 'Acertou', 'Pontuação'],
                ...studentResults.answers.map((answer, index) => [
                    index + 1,
                    answer.question_text,
                    answer.question_type,
                    answer.correct_answer,
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

    const wrongAnswers = studentResults.answers.filter(a => !a.is_correct);
    const correctAnswers = studentResults.answers.filter(a => a.is_correct);
    const blankAnswers = studentResults.total_questions - studentResults.answered_questions;

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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                            Pontuação
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                            {studentResults.total_score.toFixed(1)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Máximo: {studentResults.max_possible_score.toFixed(1)}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-orange-600" />
                            Percentual
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {studentResults.score_percentage.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Desempenho geral
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
                                <div className="text-2xl font-bold text-green-600">{correctAnswers.length}</div>
                                <div className="text-sm text-green-700">Acertos</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
                            <XCircle className="h-8 w-8 text-red-600" />
                            <div>
                                <div className="text-2xl font-bold text-red-600">{wrongAnswers.length}</div>
                                <div className="text-sm text-red-700">Erros</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <Minus className="h-8 w-8 text-gray-600" />
                            <div>
                                <div className="text-2xl font-bold text-gray-600">{blankAnswers}</div>
                                <div className="text-sm text-gray-700">Em Branco</div>
                            </div>
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
                    <div className="space-y-4">
                        {studentResults.answers.map((answer, index) => (
                            <div key={answer.question_id} className="border rounded-lg p-4">
                                <div className="space-y-3">
                                    {/* Cabeçalho da questão */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">Questão {index + 1}</Badge>
                                            <Badge variant="outline">{answer.question_type}</Badge>
                                            <Badge className={answer.is_correct ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}>
                                                {answer.is_correct ? 'Correta' : 'Incorreta'}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            Pontuação: {answer.score.toFixed(1)}
                                        </div>
                                    </div>

                                    {/* Texto da questão */}
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">{answer.question_text}</h4>
                                    </div>

                                    {/* Opções (se for múltipla escolha) */}
                                    {answer.question_type === 'multipleChoice' && answer.options && (
                                        <div className="space-y-2">
                                            <div className="text-sm font-medium text-gray-700">Opções:</div>
                                            <div className="grid gap-2">
                                                {answer.options.map((option, optionIndex) => (
                                                    <div key={optionIndex} className="flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${option === answer.correct_answer
                                                                ? 'border-green-500 bg-green-100'
                                                                : option === answer.student_answer && !answer.is_correct
                                                                    ? 'border-red-500 bg-red-100'
                                                                    : 'border-gray-300'
                                                            }`}>
                                                            {option === answer.correct_answer && (
                                                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                            )}
                                                            {option === answer.student_answer && !answer.is_correct && (
                                                                <XCircle className="h-3 w-3 text-red-600" />
                                                            )}
                                                        </div>
                                                        <span className={`text-sm ${option === answer.correct_answer
                                                                ? 'text-green-700 font-medium'
                                                                : option === answer.student_answer && !answer.is_correct
                                                                    ? 'text-red-700 font-medium'
                                                                    : 'text-gray-600'
                                                            }`}>
                                                            {option}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Respostas */}
                                    <div className="grid gap-2 md:grid-cols-2">
                                        <div>
                                            <div className="text-sm font-medium text-gray-700 mb-1">Resposta Correta:</div>
                                            <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                                                {answer.correct_answer}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-700 mb-1">Resposta do Aluno:</div>
                                            <div className={`text-sm p-2 rounded ${answer.is_correct
                                                    ? 'text-green-700 bg-green-50'
                                                    : 'text-red-700 bg-red-50'
                                                }`}>
                                                {answer.student_answer || 'Em branco'}
                                            </div>
                                        </div>
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