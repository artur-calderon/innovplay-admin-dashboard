import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Check, Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Question, QuestionOption } from "./types"; // Import Question and QuestionOption types

// Mock data for question bank - Updated to match the fuller Question type
const questionBankMock: Question[] = [
  {
    id: "1",
    number: 1,
    text: "Qual é o resultado de 25 × 4?",
    subjectId: "math", // Assuming subjectId exists now
    subject: "Matemática",
    grade: "5º Ano",
    difficulty: "Fácil",
    type: "multipleChoice",
    value: 1.0,
    solution: "",
    options: [
      { id: "a", text: "10", isCorrect: false },
      { id: "b", text: "100", isCorrect: true },
      { id: "c", text: "1000", isCorrect: false },
      { id: "d", text: "254", isCorrect: false },
    ],
    title: "Multiplicação simples",
    skills: "Cálculo básico",
    topics: ["Multiplicação"],
  },
  {
    id: "2",
    number: 2,
    text: "Quem escreveu a obra 'Dom Casmurro'?",
    subjectId: "portuguese",
    subject: "Português",
    grade: "9º Ano",
    difficulty: "Médio",
    type: "multipleChoice",
    value: 1.0,
    solution: "Machado de Assis",
    options: [
      { id: "a", text: "José de Alencar", isCorrect: false },
      { id: "b", text: "Machado de Assis", isCorrect: true },
      { id: "c", text: "Clarice Lispector", isCorrect: false },
      { id: "d", text: "Monteiro Lobato", isCorrect: false },
    ],
    title: "Literatura Brasileira",
    skills: "Leitura e Interpretação",
    topics: ["Romantismo"],
  },
  {
    id: "3",
    number: 3,
    text: "Qual é o maior planeta do Sistema Solar?",
    subjectId: "science",
    subject: "Ciências",
    grade: "6º Ano",
    difficulty: "Fácil",
    type: "multipleChoice",
    value: 1.0,
    solution: "Júpiter",
    options: [
      { id: "a", text: "Terra", isCorrect: false },
      { id: "b", text: "Marte", isCorrect: false },
      { id: "c", text: "Júpiter", isCorrect: true },
      { id: "d", text: "Saturno", isCorrect: false },
    ],
    title: "Sistema Solar",
    skills: "Conhecimentos gerais",
    topics: ["Astronomia"],
  },
  {
    id: "4",
    number: 4,
    text: "Quais são as principais causas da Revolução Francesa?",
    subjectId: "history",
    subject: "História",
    grade: "8º Ano",
    difficulty: "Difícil",
    type: "essay",
    value: 2.0,
    solution: "Resposta esperada inclui desigualdade social, crise econômica, ideias iluministas, etc.",
    title: "Revolução Francesa",
    skills: "Análise histórica",
    topics: ["História Moderna"],
  },
  {
    id: "5",
    number: 5,
    text: "Cite as principais características do relevo brasileiro.",
    subjectId: "geography",
    subject: "Geografia",
    grade: "7º Ano",
    difficulty: "Médio",
    type: "essay",
    value: 2.0,
    solution: "Resposta esperada inclui planaltos, planícies, depressões, etc.",
    title: "Relevo do Brasil",
    skills: "Geografia física",
    topics: ["Geomorfologia"],
  },
  {
    id: "6",
    number: 6,
    text: "Resolva a seguinte equação: 2x + 5 = 15",
    subjectId: "math",
    subject: "Matemática",
    grade: "7º Ano",
    difficulty: "Médio",
    type: "multipleChoice",
    value: 1.0,
    solution: "2x = 10, x = 5",
    options: [
      { id: "a", text: "3", isCorrect: false },
      { id: "b", text: "5", isCorrect: true },
      { id: "c", text: "7", isCorrect: false },
      { id: "d", text: "10", isCorrect: false },
    ],
    title: "Equação do 1º grau",
    skills: "Resolução de problemas",
    topics: ["Álgebra"],
  },
];

// Filter options (should ideally come from an API/store)
const subjects = ["Matemática", "Português", "Ciências", "História", "Geografia"];
const grades = ["5º Ano", "6º Ano", "7º Ano", "8º Ano", "9º Ano"];
const difficulties = ["Fácil", "Médio", "Difícil"];
const types = ["multipleChoice", "essay"]; // Using keys matching Question type

interface EvaluationFromBank {
  title: string;
  subject: string; // Or subjectId if preferred
  grade: string; // Or gradeId if preferred
  questions: Question[]; // Use the full Question type now
}

interface QuestionBankProps {
  open: boolean;
  onClose: () => void;
  subjectId: string | null; // Can be used to pre-filter questions
  onQuestionSelected: (question: Question) => void; // Callback for selecting a single question
  // If selecting multiple questions at once is needed, add a new prop:
  // onQuestionsSelected: (questions: Question[]) => void;
  onCreateEvaluation?: (evaluation: EvaluationFromBank) => void;
}

export function QuestionBank({
  open,
  onClose,
  subjectId,
  onQuestionSelected,
  onCreateEvaluation
}: QuestionBankProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [questions, setQuestions] = useState<Question[]>(questionBankMock);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]); // Stores IDs of selected questions
  const [filters, setFilters] = useState({
    subject: "",
    grade: "",
    difficulty: "",
    type: "",
  });

  // State for the internal Create Evaluation dialog (if still needed)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [evaluationTitle, setEvaluationTitle] = useState("");
  const [evaluationGrade, setEvaluationGrade] = useState("");

  const filteredQuestions = questions.filter(
    (question) => {
      const matchesSearch = question.text.toLowerCase().includes(searchTerm.toLowerCase());
      // Filter by subjectId prop if provided
      const matchesSubjectId = !subjectId || question.subjectId === subjectId; // Match subjectId prop to question.subjectId
      // Filter by filter state
      const matchesSubject = !filters.subject || question.subject === filters.subject;
      const matchesGrade = !filters.grade || question.grade === filters.grade;
      const matchesDifficulty = !filters.difficulty || question.difficulty === filters.difficulty;
      const matchesType = !filters.type || question.type === filters.type;

      return matchesSearch && matchesSubjectId && matchesSubject && matchesGrade && matchesDifficulty && matchesType;
    }
  );

  const toggleQuestionSelection = (questionId: string) => {
    if (selectedQuestions.includes(questionId)) {
      setSelectedQuestions(selectedQuestions.filter(id => id !== questionId));
    } else {
      setSelectedQuestions([...selectedQuestions, questionId]);
    }
  };

  // This handler is for the internal 'Create Evaluation' button within QuestionBank
  const handleCreateEvaluation = () => {
    const selectedQuestionObjects = questions.filter(q => selectedQuestions.includes(q.id));

    if(onCreateEvaluation) {
       onCreateEvaluation({
        title: evaluationTitle,
        subject: filters.subject || "Múltiplas disciplinas", // Use selected filter or a default
        grade: evaluationGrade || filters.grade || "Múltiplas séries", // Use dialog input or filter
        questions: selectedQuestionObjects, // Pass the full question objects
      });
    }

    // Reset state after creating evaluation
    setSelectedQuestions([]);
    setIsCreateDialogOpen(false);
    setEvaluationTitle("");
    setEvaluationGrade("");
     // Decide if closing the bank modal is needed here
     // onClose();
  };

  // This handler is for the 'Add Selected' button, used when QuestionBank is a selection tool
   const handleSelectQuestions = () => {
     const selectedQuestionObjects = questions.filter(q => selectedQuestions.includes(q.id));
     // Assuming onQuestionSelected is meant to add questions one by one
     selectedQuestionObjects.forEach(q => onQuestionSelected(q));
     // If onQuestionsSelected (plural) is added, use that instead:
     // if(onQuestionsSelected) { onQuestionsSelected(selectedQuestionObjects); }

     setSelectedQuestions([]); // Clear selection
     onClose(); // Close the modal after selecting
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
    <Dialog open={open} onOpenChange={onClose}> {/* Use Dialog to control visibility */}
      <DialogContent className="max-w-screen-lg overflow-y-auto max-h-[90vh]"> {/* Increased max-width for better table view */}
        <DialogHeader>
          <DialogTitle>Banco de Questões</DialogTitle>
          <DialogDescription>
            Selecione as questões que deseja adicionar.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 -mx-4"> {/* Added padding to content inside dialog */}
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
                              {type === 'multipleChoice' ? 'Múltipla Escolha' : 'Dissertativa'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button variant="outline" onClick={resetFilters} className="col-span-3">
                        Limpar Filtros
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {/* Internal Create Evaluation Dialog Trigger (if still needed) */}
              {/* <DialogTrigger asChild> */}
                {/* <Button disabled={selectedQuestions.length === 0}> */}
                  {/* Criar Avaliação ({selectedQuestions.length}) */}
                {/* </Button> */}
              {/* </DialogTrigger> */}
            </div>
          </div>

          {/* Questions Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto mb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead className="min-w-[200px]">Questão</TableHead> {/* Added min-width */}
                  <TableHead className="w-32 hidden sm:table-cell">Disciplina</TableHead>
                  <TableHead className="w-24 hidden md:table-cell">Série</TableHead>
                  <TableHead className="w-24 hidden lg:table-cell">Dificuldade</TableHead>
                   <TableHead className="w-24 hidden lg:table-cell">Tipo</TableHead> {/* Added Type column */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.length > 0 ? (
                  filteredQuestions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="w-12">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleQuestionSelection(question.id)}
                          className={cn("rounded-full", selectedQuestions.includes(question.id) ? "bg-green-500 text-white hover:bg-green-600" : "hover:bg-gray-200")}
                        >
                          {selectedQuestions.includes(question.id) ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{question.text}</TableCell>
                      <TableCell className="hidden sm:table-cell">{question.subject}</TableCell>
                      <TableCell className="hidden md:table-cell">{question.grade}</TableCell>
                      <TableCell className="hidden lg:table-cell">{question.difficulty}</TableCell>
                       <TableCell className="w-24 hidden lg:table-cell">{question.type === 'multipleChoice' ? 'Múltipla Escolha' : 'Dissertativa'}</TableCell> {/* Display Type */}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500"> {/* Updated colspan */}
                      Nenhuma questão encontrada com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSelectQuestions} disabled={selectedQuestions.length === 0}>Adicionar Selecionadas ({selectedQuestions.length})</Button>
          </div>
        </div>
         {/* Internal Create Evaluation Dialog Content (if still needed) */}
         {/* <DialogContent>...</DialogContent> */}
          {/* Move internal dialog logic here or remove if not needed when used as a selection tool */}
      </DialogContent>
    </Dialog>
     /* Render internal Create Evaluation Dialog outside the main Dialog if needed */
     /* {isCreateDialogOpen && onCreateEvaluation && (...) } */
  );
}
