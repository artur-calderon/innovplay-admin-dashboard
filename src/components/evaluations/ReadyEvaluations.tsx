
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// Mock data for ready evaluations
const readyEvaluationsMock = [
  {
    id: "1",
    title: "Matemática - Operações Básicas",
    subject: "Matemática",
    grade: "4º Ano",
    questionCount: 15,
    description: "Avaliação com questões de adição, subtração, multiplicação e divisão.",
  },
  {
    id: "2",
    title: "Português - Interpretação de Texto",
    subject: "Português",
    grade: "6º Ano",
    questionCount: 12,
    description: "Avaliação com textos variados e questões de interpretação.",
  },
  {
    id: "3",
    title: "Ciências - Meio Ambiente",
    subject: "Ciências",
    grade: "5º Ano",
    questionCount: 10,
    description: "Questões sobre ecologia, sustentabilidade e conservação ambiental.",
  },
  {
    id: "4",
    title: "História - Grandes Civilizações",
    subject: "História",
    grade: "7º Ano",
    questionCount: 20,
    description: "Avaliação sobre as principais civilizações antigas e suas contribuições.",
  },
  {
    id: "5",
    title: "Geografia - Cartografia",
    subject: "Geografia",
    grade: "8º Ano",
    questionCount: 15,
    description: "Questões sobre mapas, coordenadas geográficas e escalas.",
  },
  {
    id: "6",
    title: "Matemática - Geometria",
    subject: "Matemática",
    grade: "9º Ano",
    questionCount: 18,
    description: "Avaliação sobre figuras geométricas, ângulos e teoremas.",
  },
];

interface ReadyEvaluationsProps {
  onUseEvaluation: (evaluation: any) => void;
}

export function ReadyEvaluations({ onUseEvaluation }: ReadyEvaluationsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [evaluations, setEvaluations] = useState(readyEvaluationsMock);
  
  const filteredEvaluations = evaluations.filter(
    (evaluation) =>
      evaluation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar avaliações prontas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredEvaluations.length > 0 ? (
          filteredEvaluations.map((evaluation) => (
            <Card key={evaluation.id} className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">{evaluation.title}</CardTitle>
                <CardDescription>
                  {evaluation.subject} | {evaluation.grade}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-gray-500">{evaluation.description}</p>
                <p className="text-sm font-medium mt-2">
                  {evaluation.questionCount} questões
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => onUseEvaluation(evaluation)}
                  className="w-full sm:w-auto"
                >
                  Usar Avaliação
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            Nenhuma avaliação encontrada com os termos pesquisados.
          </div>
        )}
      </div>
    </div>
  );
}
