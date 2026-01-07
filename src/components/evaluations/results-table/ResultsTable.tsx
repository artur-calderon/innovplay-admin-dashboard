import React from 'react';
import { ResultsTableProps } from '../../../types/results-table';
import { TableHeader } from './TableHeader';
import { TableRow } from './TableRow';
import { TableLegend } from './TableLegend';

// Interface para dados da tabela_detalhada
interface TabelaDetalhadaQuestao {
  numero: number;
  habilidade: string;
  codigo_habilidade: string;
  question_id: string;
}

interface TabelaDetalhadaDisciplina {
  id: string;
  nome: string;
  questoes: TabelaDetalhadaQuestao[];
}

interface ExtendedResultsTableProps extends ResultsTableProps {
  // ✅ NOVO: Dados da tabela_detalhada
  tabelaDetalhada?: {
    disciplinas: TabelaDetalhadaDisciplina[];
  };
}

export const ResultsTable: React.FC<ExtendedResultsTableProps> = ({
  students,
  totalQuestions,
  startQuestionNumber = 1,
  onViewStudentDetails,
  questoes,
  visibleFields = {
    turma: false,
    habilidade: true,
    questoes: true,
    percentualTurma: true,
    total: true,
    nota: true,
    proficiencia: true,
    nivel: true
  },
  subjectFilter,
  evaluationId,
  successThreshold = 60,
  tabelaDetalhada
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-max border border-border text-center text-sm shadow-md rounded-lg bg-card">
        <TableHeader
          totalQuestions={totalQuestions}
          startQuestionNumber={startQuestionNumber}
          questoes={questoes}
          visibleFields={visibleFields}
          tabelaDetalhada={tabelaDetalhada}
          students={students}
          successThreshold={successThreshold}
        />
        <tbody>
          {students.map((student, studentIndex) => (
            <TableRow
              key={`${student.id || 'student'}-${studentIndex}`}
              student={student}
              studentIndex={studentIndex}
              totalQuestions={totalQuestions}
              visibleFields={visibleFields}
              onViewStudentDetails={onViewStudentDetails}
              evaluationId={evaluationId}
              tabelaDetalhada={tabelaDetalhada}
            />
          ))}
        </tbody>
      </table>
      
      <TableLegend />
    </div>
  );
}; 