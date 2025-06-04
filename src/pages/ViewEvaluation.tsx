import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Play } from "lucide-react";

// Mock data - será substituído por dados do banco
const mockEvaluation = {
  id: "1",
  title: "Matemática - Operações Básicas",
  subject: "Matemática",
  grade: "4º Ano",
  questionCount: 15,
  description: "Avaliação com questões de adição, subtração, multiplicação e divisão.",
  creationDate: "2024-03-20",
  questions: [
    {
      id: "1",
      question: "Quanto é 2 + 2?",
      type: "multiple_choice",
      options: ["3", "4", "5", "6"],
      correctAnswer: "4"
    },
    {
      id: "2",
      question: "Quanto é 5 x 5?",
      type: "multiple_choice",
      options: ["20", "25", "30", "35"],
      correctAnswer: "25"
    }
  ]
};

export default function ViewEvaluation() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Funções de ação
  const handleEdit = () => {
    navigate(`/app/avaliacao/${id}/editar`);
  };

  const handleDelete = () => {
    // Implementar lógica de exclusão
    console.log("Excluir avaliação:", id);
  };

  const handleApply = () => {
    navigate(`/app/avaliacao/${id}/aplicar`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Cabeçalho com título e botões de ação */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{mockEvaluation.title}</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2 text-red-500" />
            Excluir
          </Button>
          <Button onClick={handleApply}>
            <Play className="h-4 w-4 mr-2" />
            Aplicar Avaliação
          </Button>
        </div>
      </div>

      {/* Informações da Avaliação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Disciplina</label>
              <p>{mockEvaluation.subject}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Série</label>
              <p>{mockEvaluation.grade}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Número de Questões</label>
              <p>{mockEvaluation.questionCount}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Data de Criação</label>
              <p>{new Date(mockEvaluation.creationDate).toLocaleDateString('pt-BR')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{mockEvaluation.description}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Questões */}
      <Card>
        <CardHeader>
          <CardTitle>Questões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {mockEvaluation.questions.map((question, index) => (
              <div key={question.id} className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Questão {index + 1}</h3>
                <p className="mb-4">{question.question}</p>
                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className={`p-2 rounded ${
                        option === question.correctAnswer
                          ? "bg-green-50 border border-green-200"
                          : "bg-gray-50"
                      }`}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 