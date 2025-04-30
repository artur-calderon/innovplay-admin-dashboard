
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
    <div className="bg-white p-4 rounded-xl shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Tabela de Questões</h2>
        <div className="space-x-2">
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Editar Pesos
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
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
    </div>
  );
}
