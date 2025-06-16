import React from "react";
import QuestionForm from "@/components/evaluations/questions/QuestionForm";

export default function CreateQuestionPage() {
    return (
        <div className="container mx-auto py-6">
            <h1 className="text-2xl font-bold mb-6">Criar Questão</h1>
            <QuestionForm
                open={true}
                onClose={() => { }}
                onQuestionAdded={() => { }}
                questionNumber={1}
                evaluationData={{
                    course: "",
                    grade: "",
                    subject: "",
                }}
            />
        </div>
    );
} 