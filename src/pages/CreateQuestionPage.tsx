import React from "react";
import { useNavigate } from "react-router-dom";
import QuestionForm from "@/components/evaluations/questions/QuestionForm";
import { Question } from "@/components/evaluations/types";

const CreateQuestionPage = () => {
  const navigate = useNavigate();

  const handleQuestionAdded = (question: Question) => {
    // Handle the newly added question
    console.log("New question added:", question);
    // Navigate back to the questions list
    navigate("/app/cadastros/questao");
  };

  return (
    <div className="container mx-auto py-6">
      <QuestionForm
        open={true}
        onClose={() => navigate("/app/cadastros/questao")}
        subjectId={null}
        onQuestionAdded={handleQuestionAdded}
        questionNumber={1}
      />
    </div>
  );
};

export default CreateQuestionPage; 