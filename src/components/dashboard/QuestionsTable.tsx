
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Plus } from "lucide-react";

type Question = {
  id: number;
  question: string;
  level: string;
  series: string;
  discipline: string;
  difficulty: string;
  weight: number;
};

// Sample data for questions
const questions: Question[] = [
  {
    id: 1,
    question: "Qual é a capital do Brasil?",
    level: "Fundamental",
    series: "5º ano",
    discipline: "Geografia",
    difficulty: "Fácil",
    weight: 1,
  },
  {
    id: 2,
    question: "Qual é o resultado de 7 × 8?",
    level: "Fundamental",
    series: "3º ano",
    discipline: "Matemática",
    difficulty: "Fácil",
    weight: 1,
  },
  {
    id: 3,
    question: "O que é fotossíntese?",
    level: "Fundamental",
    series: "7º ano",
    discipline: "Ciências",
    difficulty: "Médio",
    weight: 2,
  },
  {
    id: 4,
    question: "Quais são os estados da matéria?",
    level: "Fundamental",
    series: "6º ano",
    discipline: "Ciências",
    difficulty: "Médio",
    weight: 2,
  },
  {
    id: 5,
    question: "Resolva a equação: 2x + 5 = 15",
    level: "Fundamental",
    series: "8º ano",
    discipline: "Matemática",
    difficulty: "Médio",
    weight: 2,
  },
];

export default function QuestionsTable() {
  return (
    <div className="mobile-card">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="mobile-subtitle font-semibold">Tabela de Questões</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="mobile-button text-xs sm:text-sm">
            <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Editar Pesos</span>
            <span className="sm:hidden">Editar</span>
          </Button>
          <Button size="sm" className="mobile-button text-xs sm:text-sm">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Adicionar</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>
      
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Questão</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Série</TableHead>
              <TableHead>Disciplina</TableHead>
              <TableHead>Dificuldade</TableHead>
              <TableHead>Peso</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question) => (
              <TableRow key={question.id}>
                <TableCell className="font-medium">{question.question}</TableCell>
                <TableCell>{question.level}</TableCell>
                <TableCell>{question.series}</TableCell>
                <TableCell>{question.discipline}</TableCell>
                <TableCell>{question.difficulty}</TableCell>
                <TableCell>{question.weight}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
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
              <h3 className="font-medium text-sm">{question.question}</h3>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Edit className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div><span className="font-medium">Nível:</span> {question.level}</div>
              <div><span className="font-medium">Série:</span> {question.series}</div>
              <div><span className="font-medium">Disciplina:</span> {question.discipline}</div>
              <div><span className="font-medium">Dificuldade:</span> {question.difficulty}</div>
              <div><span className="font-medium">Peso:</span> {question.weight}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
