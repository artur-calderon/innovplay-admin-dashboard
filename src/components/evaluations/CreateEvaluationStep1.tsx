import React, { useState, useEffect } from "react";
import CreateEvaluationForm from "./CreateEvaluationForm";
import { EvaluationFormData } from "./types";
import { api } from "@/lib/api";

interface Subject {
  id: string;
  name: string;
}

interface CreateEvaluationStep1Props {
  onNext: (data: EvaluationFormData) => void;
  initialData?: EvaluationFormData;
}

export const CreateEvaluationStep1 = ({ onNext, initialData }: CreateEvaluationStep1Props) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Buscar todas as disciplinas disponíveis
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await api.get("/subjects");
        setSubjects(response.data || []);
      } catch (error) {
        console.error("Erro ao buscar disciplinas:", error);
      }
    };
    fetchSubjects();
  }, []);

  // Adaptar os dados do formulário para o formato esperado por onNext
  const handleSubmit = (data: any) => {
    // Mapear IDs das disciplinas para objetos completos
    const selectedSubjects = data.subjects?.map((subjectId: string) => {
      const subject = subjects.find(s => s.id === subjectId);
      return {
        id: subjectId,
        name: subject?.name || `Disciplina ${subjectId}`
      };
    }) || [];

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
      subjects: selectedSubjects, // Array de objetos { id, name }
      subject: data.subjects?.[0] || "", // Para compatibilidade com código legado
      questions: [],
      startDateTime: data.startDateTime,
      duration: data.duration,
      classes: data.classes,
    };
    
    console.log("📤 Dados adaptados do Step1 para Step2:", {
      selectedSubjectsCount: selectedSubjects.length,
      subjects: selectedSubjects,
      originalSubjects: data.subjects
    });
    
    onNext(adaptedData);
  };

  // Converter os dados iniciais para o formato esperado pelo CreateEvaluationForm
  const convertedInitialData = initialData ? {
    title: initialData.title,
    description: initialData.description,
    startDateTime: initialData.startDateTime,
    duration: initialData.duration,
    subjects: initialData.subjects?.map(s => s.id) || [], // Converter objetos para IDs
    classes: initialData.classes || [],
  } : undefined;

  return (
    <div>
      <CreateEvaluationForm 
        onSubmit={handleSubmit} 
        initialData={convertedInitialData} 
      />
    </div>
  );
}; 