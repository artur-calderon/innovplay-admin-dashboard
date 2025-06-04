import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { QuestionBank } from "@/components/evaluations/QuestionBank";
import { Question } from "@/components/evaluations/types";

const QuestionsPage = () => {
  const navigate = useNavigate();
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  const handleQuestionSelected = (question: Question) => {
    setQuestions([...questions, question]);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Questões</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsBankOpen(true)}
          >
            Banco de Questões
          </Button>
          <Button 
            onClick={() => navigate("/app/cadastros/questao/criar")}
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova Questão
          </Button>
        </div>
      </div>

      {/* Table of questions */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-3 text-left">Número</th>
              <th className="px-4 py-3 text-left">Título</th>
              <th className="px-4 py-3 text-left">Disciplina</th>
              <th className="px-4 py-3 text-left">Série</th>
              <th className="px-4 py-3 text-left">Dificuldade</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Valor</th>
            </tr>
          </thead>
          <tbody>
            {questions.length > 0 ? (
              questions.map((question) => (
                <tr key={question.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{question.number}</td>
                  <td className="px-4 py-3">{question.title}</td>
                  <td className="px-4 py-3">{question.subject}</td>
                  <td className="px-4 py-3">{question.grade}</td>
                  <td className="px-4 py-3">{question.difficulty}</td>
                  <td className="px-4 py-3">
                    {question.type === "multipleChoice" ? "Múltipla Escolha" : "Dissertativa"}
                  </td>
                  <td className="px-4 py-3">{question.value}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-3 text-center text-gray-500">
                  Nenhuma questão cadastrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <QuestionBank
        open={isBankOpen}
        onClose={() => setIsBankOpen(false)}
        subjectId={null}
        onQuestionSelected={handleQuestionSelected}
      />
    </div>
  );
};

export default QuestionsPage; 