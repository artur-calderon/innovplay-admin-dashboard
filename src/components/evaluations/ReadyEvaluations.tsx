import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mock data for ready evaluations
const readyEvaluationsMock = [
  {
    id: "1",
    title: "Matemática - Operações Básicas",
    subject: "Matemática",
    grade: "4º Ano",
    questionCount: 15,
    description: "Avaliação com questões de adição, subtração, multiplicação e divisão.",
    creationDate: "2024-03-20",
  },
  {
    id: "2",
    title: "Português - Interpretação de Texto",
    subject: "Português",
    grade: "6º Ano",
    questionCount: 12,
    description: "Avaliação com textos variados e questões de interpretação.",
    creationDate: "2024-03-19",
  },
  {
    id: "3",
    title: "Ciências - Meio Ambiente",
    subject: "Ciências",
    grade: "5º Ano",
    questionCount: 10,
    description: "Questões sobre ecologia, sustentabilidade e conservação ambiental.",
    creationDate: "2024-03-18",
  },
  {
    id: "4",
    title: "História - Grandes Civilizações",
    subject: "História",
    grade: "7º Ano",
    questionCount: 20,
    description: "Avaliação sobre as principais civilizações antigas e suas contribuições.",
    creationDate: "2024-03-17",
  },
  {
    id: "5",
    title: "Geografia - Cartografia",
    subject: "Geografia",
    grade: "8º Ano",
    questionCount: 15,
    description: "Questões sobre mapas, coordenadas geográficas e escalas.",
    creationDate: "2024-03-16",
  },
  {
    id: "6",
    title: "Matemática - Geometria",
    subject: "Matemática",
    grade: "9º Ano",
    questionCount: 18,
    description: "Avaliação sobre figuras geométricas, ângulos e teoremas.",
    creationDate: "2024-03-15",
  },
];

interface Evaluation {
  id: string;
  title: string;
  subject: string;
  grade: string;
  questionCount: number;
  description: string;
  creationDate: string;
}

interface ReadyEvaluationsProps {
  onUseEvaluation: (evaluation: Evaluation) => void;
}

export function ReadyEvaluations({ onUseEvaluation }: ReadyEvaluationsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [evaluations, setEvaluations] = useState(readyEvaluationsMock);
  const navigate = useNavigate();
  
  const filteredEvaluations = evaluations.filter(
    (evaluation) =>
      evaluation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleView = (evaluationId: string) => {
    navigate(`/app/avaliacao/${evaluationId}`);
  };

  return (
    <div>
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar minhas avaliações prontas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden overflow-x-auto">
        <div className="min-w-full">
          <Table>
            <TableCaption>Lista de avaliações prontas disponíveis</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Título</TableHead>
                <TableHead className="hidden sm:table-cell">Disciplina</TableHead>
                <TableHead className="hidden md:table-cell">Série</TableHead>
                <TableHead className="hidden md:table-cell">Nº Questões</TableHead>
                <TableHead className="hidden lg:table-cell">Data de criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvaluations.length > 0 ? (
                filteredEvaluations.map((evaluation) => (
                  <TableRow key={evaluation.id}>
                    <TableCell className="font-medium">{evaluation.title}</TableCell>
                    <TableCell className="hidden sm:table-cell">{evaluation.subject}</TableCell>
                    <TableCell className="hidden md:table-cell">{evaluation.grade}</TableCell>
                    <TableCell className="hidden md:table-cell">{evaluation.questionCount}</TableCell>
                    <TableCell className="hidden lg:table-cell">{formatDate(evaluation.creationDate)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(evaluation.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {/* <Button
                        variant="ghost"
                        size="sm"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button> */}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Nenhuma avaliação encontrada com os termos pesquisados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
