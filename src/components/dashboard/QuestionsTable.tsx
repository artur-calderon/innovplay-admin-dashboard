import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Plus, List } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

interface Question {
  id: string;
  title: string;
  text: string;
  grade?: {
    id: string;
    name: string;
  };
  subject?: {
    id: string;
    name: string;
  };
  difficulty: string;
  value: number;
  type: string;
}

export default function QuestionsTable() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        
        // Buscar questões da API (limitando a 5 para o dashboard)
        const response = await api.get("/questions/");
        if (response.data && Array.isArray(response.data)) {
          // Pegar apenas as 5 primeiras questões para o dashboard
          const dashboardQuestions = response.data.slice(0, 5);
          setQuestions(dashboardQuestions);
        }
      } catch (error) {
        console.error("Erro ao buscar questões:", error);
        // Em caso de erro, deixar lista vazia
        setQuestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const handleNavigateToQuestions = () => {
    navigate("/app/questoes");
  };

  const handleNavigateToCreateQuestion = () => {
    navigate("/app/criar-questao");
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'multipleChoice':
        return 'Múltipla Escolha';
      case 'open':
        return 'Dissertativa';
      case 'trueFalse':
        return 'V/F';
      default:
        return type;
    }
  };

  return (
    <div className="mobile-card">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="mobile-subtitle font-semibold">Questões Recentes</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="mobile-button text-xs sm:text-sm"
            onClick={handleNavigateToQuestions}
          >
            <List className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Ver Todas</span>
            <span className="sm:hidden">Todas</span>
          </Button>
          <Button 
            size="sm" 
            className="mobile-button text-xs sm:text-sm"
            onClick={handleNavigateToCreateQuestion}
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nova Questão</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-3">
          {/* Desktop Table Skeleton */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Questão</TableHead>
                  <TableHead>Disciplina</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Dificuldade</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards Skeleton */}
          <div className="lg:hidden space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-8 w-8" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : questions.length > 0 ? (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Questão</TableHead>
                  <TableHead>Disciplina</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Dificuldade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell className="font-medium">
                      {truncateText(question.title || question.text)}
                    </TableCell>
                    <TableCell>{question.subject?.name || "N/A"}</TableCell>
                    <TableCell>{question.grade?.name || "N/A"}</TableCell>
                    <TableCell>{question.difficulty}</TableCell>
                    <TableCell>{getQuestionTypeLabel(question.type)}</TableCell>
                    <TableCell>{question.value}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => navigate(`/app/questao/${question.id}/editar`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {questions.map((question) => (
              <div key={question.id} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-sm">
                    {truncateText(question.title || question.text, 40)}
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => navigate(`/app/questao/${question.id}/editar`)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div><span className="font-medium">Disciplina:</span> {question.subject?.name || "N/A"}</div>
                  <div><span className="font-medium">Série:</span> {question.grade?.name || "N/A"}</div>
                  <div><span className="font-medium">Dificuldade:</span> {question.difficulty}</div>
                  <div><span className="font-medium">Valor:</span> {question.value}</div>
                  <div className="col-span-2">
                    <span className="font-medium">Tipo:</span> {getQuestionTypeLabel(question.type)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <List className="h-12 w-12 text-gray-300 mb-2" />
          <p className="text-sm mb-4">Nenhuma questão cadastrada ainda</p>
          <Button 
            size="sm"
            onClick={handleNavigateToCreateQuestion}
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeira Questão
          </Button>
        </div>
      )}
    </div>
  );
}
