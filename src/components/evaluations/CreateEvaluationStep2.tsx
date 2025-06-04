import { useState } from "react";
import { useAuth } from "@/context/authContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import QuestionForm from "./questions/QuestionForm";
import { QuestionBank } from "./QuestionBank";
import { EvaluationFormData, Question } from "./types";

interface CreateEvaluationStep2Props {
  data: EvaluationFormData;
  onBack: () => void;
  onSubmit: (data: EvaluationFormData) => void;
}

export function CreateEvaluationStep2({ data, onBack, onSubmit }: CreateEvaluationStep2Props) {
  const { user } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  const handleAddQuestion = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setShowQuestionForm(true);
  };

  const handleSearchQuestion = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setShowQuestionBank(true);
  };

  const handleQuestionFormClose = () => {
    setShowQuestionForm(false);
    setSelectedSubject(null);
  };

  const handleQuestionBankClose = () => {
    setShowQuestionBank(false);
    setSelectedSubject(null);
  };

  const handleQuestionAdded = (question: Question) => {
    setQuestions([...questions, question]);
  };

  const handleQuestionsSelectedFromBank = (questionsFromBank: Question[]) => {
    setQuestions([...questions, ...questionsFromBank]);
  };

  const getQuestionsForSubject = (subjectId: string) => {
    return questions.filter(q => q.subjectId === subjectId);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {user.role === "admin" && data.type === "SIMULADO" ? (
          // Admin view for simulated test
          data.subjects?.map((subject) => (
            <Card key={subject.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{subject.name}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddQuestion(subject.id)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Questão
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearchQuestion(subject.id)}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Buscar Questão
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Quantidade de questões: {subject.questionCount}
                </p>
                <div className="space-y-2">
                  {getQuestionsForSubject(subject.id).map((question) => (
                    <div
                      key={question.id}
                      className="p-3 border rounded-md"
                    >
                      <p className="font-medium">Questão {question.number}</p>
                      <p className="text-sm text-muted-foreground">{question.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          // Teacher view or regular evaluation
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Questões</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddQuestion("main")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Questão
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearchQuestion("main")}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Buscar Questão
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {questions.map((question) => (
                  <div
                    key={question.id}
                    className="p-3 border rounded-md"
                  >
                    <p className="font-medium">Questão {question.number}</p>
                    <p className="text-sm text-muted-foreground">{question.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} className="w-full">
          Voltar
        </Button>
        <Button
          onClick={() => onSubmit({ ...data, questions })}
          className="w-full"
        >
          Finalizar
        </Button>
      </div>

      {showQuestionForm && (
        <QuestionForm
          open={showQuestionForm}
          onClose={handleQuestionFormClose}
          subjectId={selectedSubject}
          onQuestionAdded={handleQuestionAdded}
          questionNumber={questions.length + 1}
        />
      )}

      <QuestionBank
        open={showQuestionBank}
        onClose={handleQuestionBankClose}
        subjectId={selectedSubject}
        onQuestionSelected={handleQuestionAdded}
      />
    </div>
  );
} 