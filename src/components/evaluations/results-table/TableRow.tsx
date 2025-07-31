import React from 'react';
import { Eye, Check, X } from 'lucide-react';
import { StudentResult, VisibleFields } from '../../../types/results-table';

interface TableRowProps {
  student: StudentResult;
  studentIndex: number;
  totalQuestions: number;
  visibleFields: VisibleFields;
  onViewStudentDetails: (studentId: string) => void;
  detailedReport?: any;
  evaluationId?: string;
}

export const TableRow: React.FC<TableRowProps> = ({
  student,
  studentIndex,
  totalQuestions,
  visibleFields,
  onViewStudentDetails,
  detailedReport,
  evaluationId
}) => {
  
  // Gerar respostas simuladas baseadas nos acertos do aluno
  const generateQuestionAnswers = () => {
    const answers = [];
    const correctAnswers = student.acertos || 0;
    
    for (let i = 0; i < totalQuestions; i++) {
      // Primeiras questões são corretas baseadas no número de acertos
      if (i < correctAnswers) {
        answers.push(true);
      } else {
        answers.push(false);
      }
    }
    
    // Embaralhar para parecer mais realista
    const shuffled = [...answers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  };

  const questionAnswers = generateQuestionAnswers();

  return (
    <tr className="border-b hover:bg-gray-50">
      {/* Nome do Aluno */}
      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
        {student.nome}
      </td>

      {/* Questões individuais */}
      {Array.from({ length: totalQuestions }, (_, index) => (
        <td key={`q${index + 1}`} className="px-2 py-3 text-center">
          {questionAnswers[index] ? (
            <Check className="w-4 h-4 text-green-600 mx-auto" />
          ) : (
            <X className="w-4 h-4 text-red-600 mx-auto" />
          )}
        </td>
      ))}

      {/* Total de acertos */}
      <td className="px-4 py-3 text-sm font-medium text-center">
        {student.acertos}
      </td>

      {/* Nota */}
      <td className="px-4 py-3 text-sm font-medium text-center">
        {student.nota.toFixed(1)}
      </td>

      {/* Proficiência */}
      <td className="px-4 py-3 text-sm font-medium text-center">
        {student.proficiencia.toFixed(0)}
      </td>

      {/* Nível */}
      <td className="px-4 py-3 text-sm font-medium text-center">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          student.classificacao === 'Avançado' 
            ? 'bg-green-600 text-white' // Verde escuro
            : student.classificacao === 'Adequado'
            ? 'bg-green-400 text-white' // Verde claro
            : student.classificacao === 'Básico'
            ? 'bg-yellow-400 text-yellow-900' // Amarelo
            : student.classificacao === 'Abaixo do Básico'
            ? 'bg-red-500 text-white' // Vermelho
            : 'bg-gray-100 text-gray-800' // Sem Nota
        }`}>
          {student.classificacao || 'Sem Nota'}
        </span>
      </td>
    </tr>
  );
}; 