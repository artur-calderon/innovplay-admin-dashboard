
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Check } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

// Mock data for question bank
const questionBankMock = [
  {
    id: "1",
    text: "Qual é o resultado de 25 × 4?",
    subject: "Matemática",
    grade: "5º Ano",
    difficulty: "Fácil",
    type: "Múltipla escolha",
  },
  {
    id: "2",
    text: "Quem escreveu a obra 'Dom Casmurro'?",
    subject: "Português",
    grade: "9º Ano",
    difficulty: "Médio",
    type: "Múltipla escolha",
  },
  {
    id: "3",
    text: "Qual é o maior planeta do Sistema Solar?",
    subject: "Ciências",
    grade: "6º Ano",
    difficulty: "Fácil",
    type: "Múltipla escolha",
  },
  {
    id: "4",
    text: "Quais são as principais causas da Revolução Francesa?",
    subject: "História",
    grade: "8º Ano",
    difficulty: "Difícil",
    type: "Dissertativa",
  },
  {
    id: "5",
    text: "Cite as principais características do relevo brasileiro.",
    subject: "Geografia",
    grade: "7º Ano",
    difficulty: "Médio",
    type: "Dissertativa",
  },
  {
    id: "6",
    text: "Resolva a seguinte equação: 2x + 5 = 15",
    subject: "Matemática",
    grade: "7º Ano",
    difficulty: "Médio",
    type: "Múltipla escolha",
  },
  {
    id: "7",
    text: "Quais são os verbos irregulares na frase: 'Ele foi ao mercado e trouxe frutas'?",
    subject: "Português",
    grade: "6º Ano",
    difficulty: "Médio",
    type: "Múltipla escolha",
  },
  {
    id: "8",
    text: "Explique o processo de fotossíntese.",
    subject: "Ciências",
    grade: "8º Ano",
    difficulty: "Difícil",
    type: "Dissertativa",
  },
];

// Filter options
const subjects = ["Matemática", "Português", "Ciências", "História", "Geografia"];
const grades = ["5º Ano", "6º Ano", "7º Ano", "8º Ano", "9º Ano"];
const difficulties = ["Fácil", "Médio", "Difícil"];
const types = ["Múltipla escolha", "Dissertativa", "Verdadeiro ou Falso"];

interface QuestionBankProps {
  onCreateEvaluation: (evaluation: any) => void;
}

export function QuestionBank({ onCreateEvaluation }: QuestionBankProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [questions, setQuestions] = useState(questionBankMock);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    subject: "",
    grade: "",
    difficulty: "",
    type: "",
  });
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [evaluationTitle, setEvaluationTitle] = useState("");
  const [evaluationGrade, setEvaluationGrade] = useState("");

  const filteredQuestions = questions.filter(
    (question) => {
      const matchesSearch = question.text.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = !filters.subject || question.subject === filters.subject;
      const matchesGrade = !filters.grade || question.grade === filters.grade;
      const matchesDifficulty = !filters.difficulty || question.difficulty === filters.difficulty;
      const matchesType = !filters.type || question.type === filters.type;

      return matchesSearch && matchesSubject && matchesGrade && matchesDifficulty && matchesType;
    }
  );

  const toggleQuestionSelection = (questionId: string) => {
    if (selectedQuestions.includes(questionId)) {
      setSelectedQuestions(selectedQuestions.filter(id => id !== questionId));
    } else {
      setSelectedQuestions([...selectedQuestions, questionId]);
    }
  };

  const handleCreateEvaluation = () => {
    const selectedQuestionObjects = questions.filter(q => selectedQuestions.includes(q.id));
    
    onCreateEvaluation({
      title: evaluationTitle,
      subject: filters.subject || "Múltiplas disciplinas",
      grade: evaluationGrade || filters.grade || "Múltiplas séries",
      questions: selectedQuestionObjects.map(q => ({
        text: q.text,
        options: ["Opção A", "Opção B", "Opção C", "Opção D"],
        answer: "A"
      })),
    });
    
    setSelectedQuestions([]);
    setIsCreateDialogOpen(false);
    setEvaluationTitle("");
    setEvaluationGrade("");
  };

  const resetFilters = () => {
    setFilters({
      subject: "",
      grade: "",
      difficulty: "",
      type: "",
    });
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar no banco de questões..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
                {Object.values(filters).some(Boolean) && (
                  <span className="ml-1 rounded-full bg-primary w-5 h-5 text-[10px] flex items-center justify-center text-primary-foreground">
                    {Object.values(filters).filter(Boolean).length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Filtros</h4>
                  <p className="text-sm text-muted-foreground">
                    Filtre as questões por disciplina, série, dificuldade e tipo
                  </p>
                </div>
                <div className="grid gap-2">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="subject">Disciplina</Label>
                    <select
                      id="subject"
                      className="col-span-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={filters.subject}
                      onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                    >
                      <option value="">Todas</option>
                      {subjects.map((subject) => (
                        <option key={subject} value={subject}>
                          {subject}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="grade">Série</Label>
                    <select
                      id="grade"
                      className="col-span-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={filters.grade}
                      onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                    >
                      <option value="">Todas</option>
                      {grades.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="difficulty">Dificuldade</Label>
                    <select
                      id="difficulty"
                      className="col-span-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={filters.difficulty}
                      onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                    >
                      <option value="">Todas</option>
                      {difficulties.map((difficulty) => (
                        <option key={difficulty} value={difficulty}>
                          {difficulty}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="type">Tipo</Label>
                    <select
                      id="type"
                      className="col-span-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={filters.type}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    >
                      <option value="">Todos</option>
                      {types.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button variant="outline" onClick={resetFilters}>
                  Limpar Filtros
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={selectedQuestions.length === 0}>
                Criar Avaliação ({selectedQuestions.length})
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Avaliação</DialogTitle>
                <DialogDescription>
                  Configure os detalhes da avaliação que será criada com as {selectedQuestions.length} questões selecionadas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="eval-title">Título da Avaliação</Label>
                  <Input
                    id="eval-title"
                    placeholder="Digite o título da avaliação"
                    value={evaluationTitle}
                    onChange={(e) => setEvaluationTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eval-grade">Série</Label>
                  <select
                    id="eval-grade"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={evaluationGrade}
                    onChange={(e) => setEvaluationGrade(e.target.value)}
                  >
                    <option value="">Selecione uma série</option>
                    {grades.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateEvaluation} 
                    disabled={!evaluationTitle}
                  >
                    Criar Avaliação
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={filteredQuestions.length > 0 && selectedQuestions.length === filteredQuestions.length}
                    onChange={() => {
                      if (selectedQuestions.length === filteredQuestions.length) {
                        setSelectedQuestions([]);
                      } else {
                        setSelectedQuestions(filteredQuestions.map(q => q.id));
                      }
                    }}
                  />
                </div>
              </TableHead>
              <TableHead>Questão</TableHead>
              <TableHead className="w-[120px]">Disciplina</TableHead>
              <TableHead className="w-[100px]">Série</TableHead>
              <TableHead className="w-[110px]">Dificuldade</TableHead>
              <TableHead className="w-[150px]">Tipo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuestions.length > 0 ? (
              filteredQuestions.map((question) => (
                <TableRow key={question.id} onClick={() => toggleQuestionSelection(question.id)} className="cursor-pointer">
                  <TableCell>
                    <div className="flex items-center justify-center">
                      <div className={`h-5 w-5 rounded border flex items-center justify-center ${
                        selectedQuestions.includes(question.id) 
                          ? "bg-primary border-primary" 
                          : "border-gray-300"
                      }`}>
                        {selectedQuestions.includes(question.id) && (
                          <Check className="h-3.5 w-3.5 text-white" />
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{question.text}</TableCell>
                  <TableCell>{question.subject}</TableCell>
                  <TableCell>{question.grade}</TableCell>
                  <TableCell>{question.difficulty}</TableCell>
                  <TableCell>{question.type}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Nenhuma questão encontrada com os filtros atuais.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
