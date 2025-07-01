import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Save, CheckCircle, AlertTriangle, User, FileText, School, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Student {
  id: string;
  name: string;
  email?: string;
  class_name: string;
  answers: Record<string, string>;
  completed: boolean;
  score?: number;
  observations?: string;
}

interface PhysicalEvaluation {
  id: string;
  title: string;
  subject: string;
  total_questions: number;
  questions: Array<{
    id: string;
    number: number;
    text: string;
    options: Array<{
      id: string;
      text: string;
      letter: string;
      isCorrect: boolean;
    }>;
    correct_answer: string;
  }>;
}

interface School {
  id: string;
  name: string;
  city: string;
}

export default function PhysicalAnswerSheet() {
  const [searchParams] = useSearchParams();
  const [evaluations, setEvaluations] = useState<PhysicalEvaluation[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<string>("");
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Estados para o gabarito
  const [currentStudentAnswers, setCurrentStudentAnswers] = useState<Record<string, string>>({});
  const [currentStudentObservations, setCurrentStudentObservations] = useState("");

  useEffect(() => {
    fetchInitialData();
    
    // Verificar se tem parâmetros na URL
    const evalId = searchParams.get('evaluation');
    const schoolId = searchParams.get('school');
    
    if (evalId) setSelectedEvaluation(evalId);
    if (schoolId) setSelectedSchool(schoolId);
  }, [searchParams]);

  useEffect(() => {
    if (selectedEvaluation && selectedSchool) {
      fetchStudents();
    }
  }, [selectedEvaluation, selectedSchool]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Dados simulados para demonstração
      setEvaluations([
        {
          id: "1",
          title: "Prova de Matemática - 5º Ano",
          subject: "Matemática",
          total_questions: 10,
          questions: Array.from({ length: 10 }, (_, i) => ({
            id: `q${i + 1}`,
            number: i + 1,
            text: `Questão ${i + 1} - Exemplo de questão de matemática`,
            options: [
              { id: "a", text: "Opção A", letter: "A", isCorrect: i % 4 === 0 },
              { id: "b", text: "Opção B", letter: "B", isCorrect: i % 4 === 1 },
              { id: "c", text: "Opção C", letter: "C", isCorrect: i % 4 === 2 },
              { id: "d", text: "Opção D", letter: "D", isCorrect: i % 4 === 3 },
            ],
            correct_answer: ["A", "B", "C", "D"][i % 4]
          }))
        }
      ]);
      
      setSchools([
        { id: "1", name: "E.M. João Silva", city: "São Paulo" },
        { id: "2", name: "E.E. Maria Santos", city: "Rio de Janeiro" },
        { id: "3", name: "Colégio Dom Pedro", city: "Belo Horizonte" }
      ]);
    } catch (error) {
      console.error("Erro ao buscar dados iniciais:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      
      // Dados simulados para demonstração
      setStudents([
        {
          id: "1",
          name: "Ana Silva Santos",
          email: "ana.silva@email.com",
          class_name: "5º Ano A",
          answers: {},
          completed: false
        },
        {
          id: "2",
          name: "Bruno Costa Lima",
          email: "bruno.costa@email.com",
          class_name: "5º Ano A",
          answers: { "1": "A", "2": "B", "3": "C" },
          completed: false,
          score: 7.5
        }
      ]);
    } catch (error) {
      console.error("Erro ao buscar alunos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de alunos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentSelect = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setSelectedStudent(studentId);
      setCurrentStudentAnswers(student.answers || {});
      setCurrentStudentObservations(student.observations || "");
    }
  };

  const handleAnswerChange = (questionNumber: string, answer: string) => {
    setCurrentStudentAnswers(prev => ({
      ...prev,
      [questionNumber]: answer
    }));
  };

  const calculateScore = () => {
    const selectedEval = evaluations.find(e => e.id === selectedEvaluation);
    if (!selectedEval) return 0;

    const correctAnswers = selectedEval.questions.filter(q => 
      currentStudentAnswers[q.number.toString()] === q.correct_answer
    ).length;

    return Math.round((correctAnswers / selectedEval.questions.length) * 10 * 100) / 100;
  };

  const handleSaveAnswers = async () => {
    if (!selectedStudent || !selectedEvaluation) return;

    try {
      setIsSaving(true);
      
      const score = calculateScore();
      
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Atualizar o estado local
      setStudents(prev => prev.map(student => 
        student.id === selectedStudent 
          ? { 
              ...student, 
              answers: currentStudentAnswers,
              observations: currentStudentObservations,
              score,
              completed: Object.keys(currentStudentAnswers).length === evaluations.find(e => e.id === selectedEvaluation)?.total_questions
            }
          : student
      ));

      toast({
        title: "Sucesso!",
        description: `Gabarito salvo. Nota calculada: ${score}`,
      });
      
    } catch (error) {
      console.error("Erro ao salvar respostas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as respostas. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.class_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedEvaluationData = evaluations.find(e => e.id === selectedEvaluation);
  const selectedStudentData = students.find(s => s.id === selectedStudent);
  const selectedSchoolData = schools.find(s => s.id === selectedSchool);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Cartão Resposta Digital</h1>
        <p className="text-muted-foreground">
          Preencha os gabaritos das avaliações físicas aplicadas
        </p>
      </div>

      {/* Seletores */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selecionar Avaliação</CardTitle>
            <CardDescription>
              Escolha a avaliação física para corrigir
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Avaliação:</Label>
              <Select value={selectedEvaluation} onValueChange={setSelectedEvaluation}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma avaliação física" />
                </SelectTrigger>
                <SelectContent>
                  {evaluations.map((evaluation) => (
                    <SelectItem key={evaluation.id} value={evaluation.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{evaluation.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {evaluation.subject} • {evaluation.total_questions} questões
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selecionar Escola</CardTitle>
            <CardDescription>
              Escola onde a prova foi aplicada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Escola:</Label>
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a escola" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      <div className="flex items-center gap-2">
                        <School className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{school.name}</div>
                          <div className="text-xs text-muted-foreground">{school.city}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Alunos e Gabarito */}
      {selectedEvaluation && selectedSchool && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Lista de Alunos */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Alunos ({filteredStudents.length})
              </CardTitle>
              <CardDescription>
                {selectedSchoolData?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar aluno..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Lista */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredStudents.map((student) => (
                  <Card 
                    key={student.id} 
                    className={`p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedStudent === student.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => handleStudentSelect(student.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{student.name}</div>
                        <div className="text-xs text-muted-foreground">{student.class_name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {student.completed ? (
                          <Badge className="text-xs bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completo
                          </Badge>
                        ) : Object.keys(student.answers).length > 0 ? (
                          <Badge className="text-xs bg-orange-100 text-orange-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Parcial
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Pendente
                          </Badge>
                        )}
                      </div>
                    </div>
                    {student.score && (
                      <div className="mt-2 text-xs">
                        <span className="font-medium">Nota: {student.score}</span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Gabarito */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Gabarito Digital
                  </CardTitle>
                  <CardDescription>
                    {selectedStudentData ? 
                      `${selectedStudentData.name} - ${selectedEvaluationData?.title}` : 
                      "Selecione um aluno para preencher o gabarito"
                    }
                  </CardDescription>
                </div>
                {selectedStudent && (
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      Nota: {calculateScore()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Object.keys(currentStudentAnswers).length} / {selectedEvaluationData?.total_questions} questões
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedStudent && selectedEvaluationData ? (
                <>
                  {/* Grade de respostas */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {selectedEvaluationData.questions.map((question) => (
                      <div key={question.id} className="space-y-2">
                        <Label className="text-sm font-medium">
                          Questão {question.number}
                        </Label>
                        <div className="grid grid-cols-2 gap-1">
                          {question.options.map((option) => (
                            <Button
                              key={option.id}
                              variant={
                                currentStudentAnswers[question.number.toString()] === option.letter
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              className={`h-8 w-8 p-0 ${
                                currentStudentAnswers[question.number.toString()] === option.letter
                                  ? option.isCorrect
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-red-600 hover:bg-red-700"
                                  : ""
                              }`}
                              onClick={() => handleAnswerChange(question.number.toString(), option.letter)}
                            >
                              {option.letter}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Observações */}
                  <div className="space-y-2">
                    <Label>Observações (opcional):</Label>
                    <Textarea
                      value={currentStudentObservations}
                      onChange={(e) => setCurrentStudentObservations(e.target.value)}
                      placeholder="Adicione observações sobre o desempenho do aluno..."
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* Botões de ação */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {Object.keys(currentStudentAnswers).length === selectedEvaluationData.total_questions 
                        ? "✓ Gabarito completo" 
                        : `${selectedEvaluationData.total_questions - Object.keys(currentStudentAnswers).length} questões restantes`
                      }
                    </div>
                    <Button
                      onClick={handleSaveAnswers}
                      disabled={isSaving || Object.keys(currentStudentAnswers).length === 0}
                      className="min-w-[120px]"
                    >
                      {isSaving ? (
                        "Salvando..."
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Gabarito
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Selecione um aluno para começar a preencher o gabarito</p>
                  <p className="text-sm mt-1">
                    As respostas serão salvas automaticamente e a nota calculada em tempo real
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Estado vazio */}
      {(!selectedEvaluation || !selectedSchool) && (
        <Card>
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-1">
              Selecione uma avaliação e uma escola para começar
            </p>
            <p className="text-sm text-muted-foreground">
              O sistema carregará automaticamente a lista de alunos para correção
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 