import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EvaluationApiService } from '@/services/evaluationApi';
import { OlimpiadasApiService } from '@/services/olimpiadasApi';
import TakeEvaluation from '@/components/evaluations/TakeEvaluation';
import { TestData } from '@/types/evaluation-types';

export default function OlimpiadaStudent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState<TestData | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadOlimpiada();
    }
  }, [id]);

  const loadOlimpiada = async () => {
    if (!id) return;

    setLoading(true);
    try {
      // Buscar dados da olimpíada
      const olimpiada = await OlimpiadasApiService.getOlimpiada(id);
      
      // Buscar dados do teste (questões)
      const test = await EvaluationApiService.getTestData(id);
      
      setTestData(test);
      
      // Verificar se já completou
      try {
        const sessionInfo = await EvaluationApiService.getTestSessionInfo(id);
        if (sessionInfo.status === 'finalizada') {
          setHasCompleted(true);
          // Buscar resultados
          const resultsData = await OlimpiadasApiService.getOlimpiadaResults(id);
          // Encontrar resultado do aluno atual
          // Nota: Seria necessário buscar o ID do aluno logado
          // Por enquanto, vamos apenas marcar como completo
        }
      } catch (error) {
        // Sessão não existe ainda, pode fazer a olimpíada
        console.log('Sessão não encontrada, aluno pode fazer a olimpíada');
      }
    } catch (error) {
      console.error('Erro ao carregar olimpíada:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar olimpíada',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Olimpíada não encontrada</p>
            <Button onClick={() => navigate('/aluno/olimpiadas')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se já completou, mostrar resultado
  if (hasCompleted) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-950/20 dark:via-amber-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-6 w-6 text-yellow-600" />
              <CardTitle className="text-2xl">Olimpíada Concluída!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">{testData.title}</h2>
              <Badge variant="outline" className="text-sm">
                {testData.subject.name}
              </Badge>
            </div>

            {results && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white/50 dark:bg-gray-900/50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Nota</div>
                      <div className="text-3xl font-bold text-yellow-600">
                        {results.score?.toFixed(1) || '0.0'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 dark:bg-gray-900/50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Acertos</div>
                      <div className="text-3xl font-bold text-green-600">
                        {results.correct_answers || 0}/{results.total_questions || 0}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 dark:bg-gray-900/50">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Classificação</div>
                      <Badge className="text-lg px-4 py-2">
                        {results.classification || 'N/A'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/aluno/olimpiadas')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Olimpíadas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renderizar TakeEvaluation com tema de olimpíadas
  return (
    <div className="olimpiada-theme">
      <TakeEvaluation />
    </div>
  );
}
