import { toast } from '@/hooks/use-toast';

export function scrollToFirstError(errors: Record<string, any>) {
  const firstErrorField = Object.keys(errors)[0];
  if (!firstErrorField) return;

  const element = document.querySelector(`[name="${firstErrorField}"]`) 
    || document.getElementById(firstErrorField);
  
  if (element) {
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    
    // Destacar campo com animação
    element.classList.add('field-error-highlight');
    setTimeout(() => {
      element.classList.remove('field-error-highlight');
    }, 2000);
  }
}

export function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    title: 'Título',
    description: 'Descrição',
    type: 'Tipo de Avaliação',
    model: 'Modelo',
    course: 'Curso',
    grade: 'Série',
    state: 'Estado',
    municipality: 'Município',
    selectedSchools: 'Escolas',
    subjects: 'Disciplinas',
    selectedClasses: 'Turmas',
    duration: 'Duração',
    educationStageId: 'Curso',
    subjectId: 'Disciplina',
    difficulty: 'Dificuldade',
    value: 'Valor da Questão',
    text: 'Enunciado',
    secondStatement: 'Segundo Enunciado',
    solution: 'Resolução',
    skills: 'Habilidades',
    questionType: 'Tipo de Questão',
    options: 'Alternativas',
    // Adicionar outros campos conforme necessário
  };
  return labels[fieldName] || fieldName;
}
