import React from 'react';
import { ResultsTableProps } from '../../../types/results-table';
import { TableHeader } from './TableHeader';
import { TableRow } from './TableRow';
import { TableLegend } from './TableLegend';

export const ResultsTable: React.FC<ResultsTableProps> = ({
  students,
  totalQuestions,
  startQuestionNumber = 1,
  onViewStudentDetails,
  questoes,
  questionsWithSkills,
  skillsMapping,
  skillsBySubject,
  detailedReport,
  visibleFields = {
    turma: true,
    habilidade: true,
    questoes: true,
    percentualTurma: true,
    total: true,
    nota: true,
    proficiencia: true,
    nivel: true
  },
  subjectFilter
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-max border border-gray-300 text-center text-sm shadow-md rounded-lg">
        <TableHeader
          totalQuestions={totalQuestions}
          startQuestionNumber={startQuestionNumber}
          questoes={questoes}
          questionsWithSkills={questionsWithSkills}
          skillsMapping={skillsMapping}
          skillsBySubject={skillsBySubject}
          detailedReport={detailedReport}
          visibleFields={visibleFields}
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
              detailedReport={detailedReport}
            />
          ))}
        </tbody>
      </table>
      
      <TableLegend />
    </div>
  );
}; 