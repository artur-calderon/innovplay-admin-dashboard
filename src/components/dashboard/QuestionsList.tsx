import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Calendar, User, Eye } from "lucide-react";
import { api } from "@/lib/api";

interface Question {
  id: string;
  title: string;
  subject: string;
  grade: string;
  createdBy: string;
  createdAt: string;
  difficulty: 'easy' | 'medium' | 'hard';
  totalAttempts: number;
}

export default function QuestionsList() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getMockData = (): Question[] => [
    {
      id: '1',
      title: 'Qual é a fórmula para calcular a área de um triângulo?',
      subject: 'Matemática',
      grade: '9º Ano',
      createdBy: 'Prof. João Silva',
      createdAt: '2024-01-15',
      difficulty: 'medium',
      totalAttempts: 150
    },
    {
      id: '2',
      title: 'Identifique a figura de linguagem na frase: "O tempo voa quando estamos felizes."',
      subject: 'Português',
      grade: '8º Ano',
      createdBy: 'Prof. Maria Santos',
      createdAt: '2024-01-14',
      difficulty: 'hard',
      totalAttempts: 120
    },
    {
      id: '3',
      title: 'Qual é o processo responsável pela fotossíntese nas plantas?',
      subject: 'Ciências',
      grade: '7º Ano',
      createdBy: 'Prof. Ana Costa',
      createdAt: '2024-01-13',
      difficulty: 'medium',
      totalAttempts: 95
    },
    {
      id: '4',
      title: 'Calcule o valor de x na equação: 2x + 5 = 15',
      subject: 'Matemática',
      grade: '8º Ano',
      createdBy: 'Prof. Carlos Lima',
      createdAt: '2024-01-12',
      difficulty: 'easy',
      totalAttempts: 200
    },
    {
      id: '5',
      title: 'Quais são os principais biomas brasileiros?',
      subject: 'Geografia',
      grade: '9º Ano',
      createdBy: 'Prof. Pedro Oliveira',
      createdAt: '2024-01-11',
      difficulty: 'medium',
      totalAttempts: 180
    }
  ];

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Usar endpoint de questões para buscar dados reais
        const response = await api.get('/questions/recent', {
          params: {
            per_page: 20,
            sort: 'created_at',
            order: 'desc'
          }
        });

        const data = response.data;
        
        if (data && Array.isArray(data) && data.length > 0) {
          // Processar dados das questões
          const questionsList = data
            .map((question: any) => ({
              id: question.id,
              title: question.title || question.text || `Questão ${question.id}`,
              subject: question.subject?.name || 'Disciplina não informada',
              grade: question.grade?.name || question.education_stage?.name || 'Série não informada',
              createdBy: question.creator?.name || question.created_by_name || 'Professor não informado',
              createdAt: question.created_at ? new Date(question.created_at).toLocaleDateString('pt-BR') : 'Data não informada',
              difficulty: getDifficultyLevel(question.difficulty || 'medium'),
              totalAttempts: question.total_attempts || 0
            }))
            .filter(question => question.title !== `Questão ${question.id}`) // Filtrar questões válidas
            .slice(0, 10);

          if (questionsList.length > 0) {
            setQuestions(questionsList);
          } else {
            setQuestions(getMockData());
          }
        } else {
          setQuestions(getMockData());
        }
      } catch (error) {
        console.error('Erro ao buscar questões:', error);
        setQuestions(getMockData());
        setError(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const getDifficultyLevel = (difficulty: string): Question['difficulty'] => {
    if (difficulty === 'hard' || difficulty === 'difícil') return 'hard';
    if (difficulty === 'easy' || difficulty === 'fácil') return 'easy';
    return 'medium';
  };

  const getDifficultyColor = (difficulty: Question['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
    }
  };

  const getDifficultyText = (difficulty: Question['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return 'Fácil';
      case 'medium':
        return 'Médio';
      case 'hard':
        return 'Difícil';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            Lista de Questões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            Lista de Questões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 py-4">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-500" />
          Lista de Questões
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {questions.map((question) => (
            <div key={question.id} className="p-3 rounded-lg border hover:bg-gray-50 transition-colors">
              {/* Header com questão e dificuldade */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-2 mb-1">
                    {question.title}
                  </h4>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{question.subject}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{question.grade}</span>
                  </div>
                </div>
                <Badge className={`text-xs ${getDifficultyColor(question.difficulty)}`}>
                  {getDifficultyText(question.difficulty)}
                </Badge>
              </div>

              {/* Informações adicionais */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{question.createdBy}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{question.createdAt}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{question.totalAttempts} tentativas</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

