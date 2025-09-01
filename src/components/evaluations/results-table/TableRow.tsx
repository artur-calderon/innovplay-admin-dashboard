import React from 'react';
import { Eye, Check, X, Minus } from 'lucide-react';
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
  
  // Respostas determinísticas (compatível com DetailedResultsView)
  // true = acerto, false = erro, null = não respondeu
  const questionAnswers: Array<boolean | null> = React.useMemo(() => {
    const answers: Array<boolean | null> = Array.from({ length: totalQuestions }, () => null);
    const correct = Number(student.acertos || 0);
    const wrong = Number(student.erros || 0);
    const answered = Math.min(totalQuestions, Math.max(0, correct + wrong));

    // Preencher acertos
    for (let i = 0; i < Math.min(correct, totalQuestions); i++) {
      answers[i] = true;
    }

    // Preencher erros logo após os acertos
    for (let i = correct; i < answered; i++) {
      if (i < totalQuestions) {
        answers[i] = false;
      }
    }

    return answers;
  }, [student.acertos, student.erros, totalQuestions]);

  return (
    <tr 
      className="border-b hover:bg-gray-50 cursor-pointer group"
      onClick={() => onViewStudentDetails(student.id)}
      title="Clique para ver resultados detalhados do aluno"
    >
      {/* Nome do Aluno */}
      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10 border-r-2 border-gray-200">
        <div className="flex items-center gap-2">
          <span>{student.nome}</span>
          <Eye className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </td>

      {/* Questões individuais */}
      {visibleFields?.questoes && Array.from({ length: totalQuestions }, (_, index) => {
        const answer = questionAnswers[index];
        return (
          <td key={`${student.id}-q${index}`} className="px-2 py-3 text-center border-r-2 border-gray-200">
            {answer === true ? (
              <Check className="w-4 h-4 text-green-700 mx-auto" />
            ) : (
              <X className="w-4 h-4 text-red-600 mx-auto" />
            )}
          </td>
        );
      })}

      {/* Total de acertos */}
      {visibleFields?.total && (
        <td className="px-4 py-3 text-sm font-semibold text-center">
          {student.acertos}
        </td>
      )}

      {/* Nota */}
      {visibleFields?.nota && (
        <td className="px-4 py-3 text-sm text-center">
          {student.nota.toFixed(1)}
        </td>
      )}

      {/* Proficiência */}
      {visibleFields?.proficiencia && (
        <td className="px-4 py-3 text-sm text-center">
          {student.proficiencia.toFixed(0)}
        </td>
      )}

      {/* Nível */}
      {visibleFields?.nivel && (
        <td className="px-4 py-3 text-sm font-medium text-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-white ${
            student.classificacao === 'Avançado'
              ? 'bg-green-600'
              : student.classificacao === 'Adequado'
              ? 'bg-green-400'
              : student.classificacao === 'Básico'
              ? 'bg-yellow-500'
              : 'bg-red-500'
          }`}>
            {student.classificacao}
          </span>
        </td>
      )}
    </tr>
  );
}; 