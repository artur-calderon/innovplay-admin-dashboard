import React from "react";
import CreateEvaluationForm from "./CreateEvaluationForm";
import { EvaluationFormData } from "./types";

interface CreateEvaluationStep1Props {
  onNext: (data: EvaluationFormData) => void;
  initialData?: EvaluationFormData;
}

export const CreateEvaluationStep1 = ({ onNext, initialData }: CreateEvaluationStep1Props) => {
  // Adaptar os dados do formulário mockado para o formato esperado por onNext
  const handleSubmit = (data: any) => {
    // Converter os dados do CreateEvaluationForm para o formato esperado pelo CreateEvaluationStep2
    const adaptedData: EvaluationFormData = {
      title: data.name,
      description: data.description,
      municipalities: [data.municipio],
      schools: [data.school],
      course: data.course,
      grade: data.grade,
      classId: "",
      type: "AVALIACAO" as const,
      model: "SAEB" as const,
      subjects: [{ id: data.subject, name: data.subjectName || "Disciplina Selecionada" }],
      subject: data.subject,
      questions: [],
      startDateTime: data.startDateTime,
      duration: data.duration,
      classes: data.classes,
    };
    
    onNext(adaptedData);
  };

  return (
    <div>
      <CreateEvaluationForm onSubmit={handleSubmit} initialData={initialData} />
    </div>
  );
}; 