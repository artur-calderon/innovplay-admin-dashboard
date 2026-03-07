import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Circle,
  AlertCircle,
  FileText,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface DetailedQuestion {
  question: number;
  alternatives: string[];
  num_alternatives: number;
  student_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  status: 'correct' | 'incorrect' | 'blank';
}

interface CorrectionResult {
  id: string;
  gabarito_id: string;
  gabarito_title: string;
  student_id: string;
  student_name: string;
  detected_answers?: Record<string, string | null>; // Formato antigo (fallback)
  answer_key?: Record<string, string>; // Formato antigo (fallback)
  detailed_questions?: DetailedQuestion[]; // Novo formato
  correct_answers: number;
  total_questions: number;
  incorrect_answers: number;
  unanswered_questions: number;
  answered_questions: number;
  score_percentage: number;
  grade: number;
  proficiency: number;
  classification: string;
  corrected_at: string;
  detection_method?: string;
}

export default function AnswerSheetResults() {
  const { gabaritoId } = useParams<{ gabaritoId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [results, setResults] = useState<CorrectionResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailedResults, setDetailedResults] = useState<Record<string, CorrectionResult>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (gabaritoId) {
      fetchResults();
    }
  }, [gabaritoId]);

  const fetchResults = async () => {
    if (!gabaritoId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Tentar buscar todos os resultados de um gabarito
      // Primeiro tenta buscar lista de resultados por gabarito_id
      try {
        const response = await api.get(`/answer-sheets/results?gabarito_id=${gabaritoId}`);
        const resultsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.results || response.data.data || []);
        setResults(resultsData);
      } catch (firstError: any) {
        // Se não funcionar, tenta buscar por lista de resultados do gabarito
        try {
          const response = await api.get(`/answer-sheets/gabarito/${gabaritoId}/results`);
          const resultsData = Array.isArray(response.data) 
            ? response.data 
            : (response.data.results || response.data.data || []);
          setResults(resultsData);
        } catch (secondError: any) {
          // Última tentativa: buscar um resultado específico (pode não retornar lista)
          try {
            const response = await api.get(`/answer-sheets/result/${gabaritoId}`);
            // Se retornar um único resultado, tratar como array
            const singleResult = response.data;
            if (singleResult && singleResult.id) {
              setResults([singleResult]);
            } else {
              setResults([]);
            }
          } catch (thirdError: any) {
            setResults([]);
          }
        }
      }
    } catch (error: any) {
      setError(error.response?.data?.error || error.message || 'Não foi possível carregar os resultados.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/app/cartao-resposta');
  };

  const fetchDetailedResult = async (resultId: string) => {
    // Se já temos os detalhes, não buscar novamente
    if (detailedResults[resultId]) {
      return;
    }

    try {
      setLoadingDetails(prev => ({ ...prev, [resultId]: true }));
      
      const response = await api.get(`/answer-sheets/result/${resultId}`);
      const detailedResult: CorrectionResult = response.data;
      
      setDetailedResults(prev => ({
        ...prev,
        [resultId]: detailedResult
      }));
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes completos.',
        variant: 'destructive',
      });
    } finally {
      setLoadingDetails(prev => ({ ...prev, [resultId]: false }));
    }
  };

  const handleAccordionChange = (value: string) => {
    if (value) {
      // Quando o accordion é expandido, buscar detalhes se ainda não foram carregados
      fetchDetailedResult(value);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Cartões Gerados
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Cartões Gerados
          </Button>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                Não há resultados disponíveis
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Ainda não foram realizadas correções para este gabarito.
              </p>
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Cartões Gerados
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Resultados de Correção</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {results[0]?.gabarito_title || 'Visualize os resultados das correções realizadas'}
          </p>
        </div>
        <div className="flex justify-center w-full sm:w-auto sm:justify-end">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Cartões Gerados
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {results.map((result) => {
          const detailedResult = detailedResults[result.id] || result;
          const isLoadingDetail = loadingDetails[result.id];

          return (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{result.student_name}</CardTitle>
                    <CardDescription className="mt-1">
                      {result.gabarito_title}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {result.grade.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.score_percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Estatísticas gerais */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Acertos</p>
                    <p className="text-2xl font-bold text-green-600">
                      {result.correct_answers}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      de {result.total_questions}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Erros</p>
                    <p className="text-2xl font-bold text-red-600">
                      {result.incorrect_answers}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Em Branco</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {result.unanswered_questions}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Classificação</p>
                    <p className="text-lg font-semibold">
                      {result.classification}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Proficiência: {result.proficiency.toFixed(1)}
                    </p>
                  </div>
                </div>

                {/* Metadados */}
                <div className="mb-6 pt-4 border-t text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <div>
                      <p>Corrigido em: {new Date(result.corrected_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <Badge variant="outline">
                      {result.gabarito_title}
                    </Badge>
                  </div>
                </div>

                {/* Accordion para detalhes completos */}
                <Accordion type="single" collapsible onValueChange={handleAccordionChange}>
                  <AccordionItem value={result.id}>
                    <AccordionTrigger className="text-base font-semibold">
                      Ver Detalhes Completos das Respostas
                    </AccordionTrigger>
                    <AccordionContent>
                      {isLoadingDetail ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                          <span className="text-muted-foreground">Carregando detalhes...</span>
                        </div>
                      ) : (
                        <div className="pt-4">
                          <ScrollArea className="h-[500px]">
                            <div className="p-6 space-y-6">
                              {/* Informações do aluno */}
                              <div className="p-4 bg-muted/50 rounded-lg border">
                                <div className="flex items-center gap-2 mb-3">
                                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                                  <h4 className="font-semibold text-sm">Informações do Aluno</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Nome: </span>
                                    <span className="font-medium">{detailedResult.student_name}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Prova: </span>
                                    <span className="font-medium">{detailedResult.gabarito_title}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Tabela de questões */}
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-border">
                                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                                  <h3 className="text-sm font-semibold text-foreground">Respostas do Aluno</h3>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {detailedResult.total_questions} {detailedResult.total_questions === 1 ? 'questão' : 'questões'}
                                  </span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse">
                                    <thead>
                                      <tr className="border-b border-border bg-muted">
                                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground w-20">Questão</th>
                                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Alternativas</th>
                                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground w-24">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {detailedResult.detailed_questions && Array.isArray(detailedResult.detailed_questions) && detailedResult.detailed_questions.length > 0 ? (
                                        // NOVO FORMATO: Usar detailed_questions
                                        detailedResult.detailed_questions.map((q) => {
                                          return (
                                            <tr
                                              key={q.question}
                                              className="border-b border-border hover:bg-muted transition-colors"
                                            >
                                              {/* Coluna Questão */}
                                              <td className="py-3 px-3">
                                                <span className="text-sm font-medium text-foreground">
                                                  Q{q.question}
                                                </span>
                                              </td>

                                              {/* Coluna Alternativas */}
                                              <td className="py-3 px-3">
                                                <div className="space-y-1.5">
                                                  {q.alternatives.map((letter) => {
                                                    const isSelected = q.student_answer === letter;
                                                    const isCorrectAlt = q.correct_answer === letter;
                                                    
                                                    // Determinar classes de fundo e texto
                                                    let bgClass = '';
                                                    let textClass = '';
                                                    let borderClass = '';
                                                    
                                                    if (isSelected && isCorrectAlt) {
                                                      // Alternativa selecionada e correta
                                                      bgClass = 'bg-green-100';
                                                      textClass = 'text-green-900';
                                                      borderClass = 'border-green-300';
                                                    } else if (isSelected && !isCorrectAlt) {
                                                      // Alternativa selecionada mas incorreta
                                                      bgClass = 'bg-red-100';
                                                      textClass = 'text-red-900';
                                                      borderClass = 'border-red-300';
                                                    } else if (isCorrectAlt) {
                                                      // Alternativa correta mas não selecionada
                                                      bgClass = 'bg-green-50';
                                                      textClass = 'text-green-800';
                                                      borderClass = 'border-green-200';
                                                    } else {
                                                      // Alternativa neutra
                                                      bgClass = 'bg-muted';
                                                      textClass = 'text-foreground';
                                                      borderClass = 'border-border';
                                                    }

                                                    return (
                                                      <div
                                                        key={letter}
                                                        className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded border ${bgClass} ${textClass} ${borderClass}`}
                                                      >
                                                        <span className="font-medium w-4">{letter})</span>
                                                        <span className="flex-1">Alternativa {letter}</span>
                                                        <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                                          {isSelected && (
                                                            <span className="text-[10px] font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">Marcada</span>
                                                          )}
                                                          {isCorrectAlt && (
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                                          )}
                                                          {isSelected && !isCorrectAlt && (
                                                            <XCircle className="h-3.5 w-3.5 text-red-600" />
                                                          )}
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </td>

                                              {/* Coluna Status */}
                                              <td className="py-3 px-3">
                                                <div className="flex items-center gap-2">
                                                  {q.status === 'blank' ? (
                                                    <>
                                                      <Circle className="h-4 w-4 text-gray-400" />
                                                      <span className="text-xs text-muted-foreground">Em branco</span>
                                                    </>
                                                  ) : q.status === 'correct' ? (
                                                    <>
                                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                      <span className="text-xs text-green-700 font-medium">Correta</span>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <XCircle className="h-4 w-4 text-red-500" />
                                                      <span className="text-xs text-red-700 font-medium">Incorreta</span>
                                                    </>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })
                                      ) : detailedResult.answer_key && typeof detailedResult.answer_key === 'object' ? (
                                        // FALLBACK: Formato antigo (detected_answers + answer_key)
                                        Object.keys(detailedResult.answer_key)
                                          .sort((a, b) => parseInt(a) - parseInt(b))
                                          .map((questionNum) => {
                                            const studentAnswer = detailedResult.detected_answers?.[questionNum] ?? null;
                                            const correctAnswer = detailedResult.answer_key![questionNum];
                                            const isCorrect = studentAnswer === correctAnswer;
                                            const isUnanswered = studentAnswer === null;
                                            const alternatives = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

                                            return (
                                              <tr
                                                key={questionNum}
                                                className="border-b border-border hover:bg-muted transition-colors"
                                              >
                                                <td className="py-3 px-3">
                                                  <span className="text-sm font-medium text-foreground">
                                                    Q{questionNum}
                                                  </span>
                                                </td>
                                                <td className="py-3 px-3">
                                                  <div className="space-y-1.5">
                                                    {alternatives.map((letter) => {
                                                      const isSelected = studentAnswer === letter;
                                                      const isCorrectAlt = correctAnswer === letter;
                                                      
                                                      let bgClass = '';
                                                      let textClass = '';
                                                      let borderClass = '';
                                                      
                                                      if (isSelected && isCorrectAlt) {
                                                        bgClass = 'bg-green-100';
                                                        textClass = 'text-green-900';
                                                        borderClass = 'border-green-300';
                                                      } else if (isSelected && !isCorrectAlt) {
                                                        bgClass = 'bg-red-100';
                                                        textClass = 'text-red-900';
                                                        borderClass = 'border-red-300';
                                                      } else if (isCorrectAlt) {
                                                        bgClass = 'bg-green-50';
                                                        textClass = 'text-green-800';
                                                        borderClass = 'border-green-200';
                                                      } else {
                                                        bgClass = 'bg-muted';
                                                        textClass = 'text-foreground';
                                                        borderClass = 'border-border';
                                                      }

                                                      return (
                                                        <div
                                                          key={letter}
                                                          className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded border ${bgClass} ${textClass} ${borderClass}`}
                                                        >
                                                          <span className="font-medium w-4">{letter})</span>
                                                          <span className="flex-1">Alternativa {letter}</span>
                                                          <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                                            {isSelected && (
                                                              <span className="text-[10px] font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">Marcada</span>
                                                            )}
                                                            {isCorrectAlt && (
                                                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                                            )}
                                                            {isSelected && !isCorrectAlt && (
                                                              <XCircle className="h-3.5 w-3.5 text-red-600" />
                                                            )}
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </td>
                                                <td className="py-3 px-3">
                                                  <div className="flex items-center gap-2">
                                                    {isUnanswered ? (
                                                      <>
                                                        <Circle className="h-4 w-4 text-gray-400" />
                                                        <span className="text-xs text-muted-foreground">Em branco</span>
                                                      </>
                                                    ) : isCorrect ? (
                                                      <>
                                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                        <span className="text-xs text-green-700 font-medium">Correta</span>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <XCircle className="h-4 w-4 text-red-500" />
                                                        <span className="text-xs text-red-700 font-medium">Incorreta</span>
                                                      </>
                                                    )}
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })
                                      ) : (
                                        <tr>
                                          <td colSpan={3} className="text-center py-8 text-muted-foreground">
                                            Nenhuma questão disponível
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
