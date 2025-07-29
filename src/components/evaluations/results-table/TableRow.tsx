import React from 'react';
import { Eye } from 'lucide-react';
import { StudentResult, VisibleFields } from '../../../types/results-table';
import { useStudentAnswers, useRealStudentData, useCorrectStudentDataSimple, useCorrectStudentAnswers } from '../../../hooks/useResultsTable';

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
  const answers = useStudentAnswers(student, totalQuestions, detailedReport);
  const realStudentData = useRealStudentData(student, detailedReport);
  // ✅ NOVO: Usar dados corretos do endpoint específico
  const { correctData: correctStudentData, loading: correctDataLoading } = useCorrectStudentDataSimple(student, evaluationId || '');
  // ✅ NOVO: Usar respostas corretas do endpoint /alunos (que tem as respostas individuais)
  const { correctAnswers, loading: correctAnswersLoading } = useCorrectStudentAnswers(student, totalQuestions, evaluationId || '');
  
    // ✅ DEBUG: Log dos dados do aluno para verificar consistência
  React.useEffect(() => {
    if (correctStudentData && correctAnswers.length > 0) {
      console.log(`🔍 Dados do aluno ${student.nome}:`, {
        // Dados corretos do endpoint /alunos
        dados_corretos: {
          acertos: correctStudentData.acertos,
          nota: correctStudentData.nota,
          proficiencia: correctStudentData.proficiencia,
          classificacao: correctStudentData.classificacao,
          respostas: correctAnswers.filter(a => a !== null).length
        },
        // Respostas individuais corretas
        respostas_individuals: correctAnswers.map((answer, index) => ({
          questao: index + 1,
          correta: answer
        }))
      });
    }
  }, [student, correctStudentData, correctAnswers]);

  return (
    <tr 
      className="hover:bg-gray-50 cursor-pointer group"
      onClick={() => onViewStudentDetails(student.id)}
      title="Clique para ver resultados detalhados do aluno"
    >
      <td className="p-2 border-t border-gray-200 text-left border-r-2 border-gray-200">
        <div className="font-medium hover:text-blue-600 transition-colors flex items-center gap-2">
          {student.nome}
          <Eye className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </td>
      {visibleFields?.questoes && (() => {
        // ✅ Usar respostas corretas se disponíveis, senão usar respostas antigas
        const answersToShow = correctAnswersLoading ? Array.from({ length: totalQuestions }, () => null) : 
                             correctAnswers.length > 0 ? correctAnswers : answers;
        
        return answersToShow.map((answer, questionIndex) => (
          <td key={`${student.id}-q${questionIndex}`} className="px-4 py-2 border-t border-gray-200 border-r-2 border-gray-200 text-center align-middle">
            <div className="flex justify-center items-center h-full">
              {correctAnswersLoading ? (
                <span className="text-gray-400 text-sm" title="Carregando...">...</span>
              ) : answer === true ? (
                <span className="text-green-700 text-2xl font-bold" title="Acertou">✓</span>
              ) : answer === false ? (
                <span className="text-red-600 text-2xl font-bold" title="Errou">✗</span>
              ) : answer === null ? (
                <span className="text-gray-400 text-lg font-bold" title="Não respondida">-</span>
              ) : answer === undefined ? (
                <span className="text-gray-300 text-sm" title="Questão não disponível">○</span>
              ) : (
                <span className="text-gray-400 text-lg font-bold" title="Status desconhecido">?</span>
              )}
            </div>
          </td>
        ));
      })()}
                    {visibleFields?.total && (
        <td className="p-2 border-t border-gray-200 font-semibold bg-gray-50 text-center">
          {(() => {
            // ✅ Aguardar dados corretos carregarem
            if (correctDataLoading) {
              console.log(`⏳ Carregando dados corretos para ${student.nome}...`);
              return <span className="text-gray-400">...</span>;
            }
            
            const acertos = correctStudentData?.acertos || realStudentData.acertos;
            console.log(`🔍 Acertos para ${student.nome}:`, {
              correctStudentData: correctStudentData?.acertos,
              realStudentData: realStudentData.acertos,
              final: acertos,
              loading: correctDataLoading
            });
            return acertos;
          })()}
        </td>
      )}
      {visibleFields?.nota && (
        <td className="p-2 border-t border-gray-200 font-semibold bg-gray-50 text-center">
          {(() => {
            // ✅ Aguardar dados corretos carregarem
            if (correctDataLoading) {
              return <span className="text-gray-400">...</span>;
            }
            
            const nota = correctStudentData?.nota || realStudentData.nota;
            console.log(`🔍 Nota para ${student.nome}:`, {
              correctStudentData: correctStudentData?.nota,
              realStudentData: realStudentData.nota,
              final: nota,
              loading: correctDataLoading
            });
            return nota.toFixed(1);
          })()}
        </td>
      )}
      {visibleFields?.proficiencia && (
        <td className="p-2 border-t border-gray-200 font-semibold bg-gray-50 text-center">
          {(() => {
            // ✅ Aguardar dados corretos carregarem
            if (correctDataLoading) {
              return <span className="text-gray-400">...</span>;
            }
            
            const proficiencia = correctStudentData?.proficiencia || realStudentData.proficiencia;
            console.log(`🔍 Proficiência para ${student.nome}:`, {
              correctStudentData: correctStudentData?.proficiencia,
              realStudentData: realStudentData.proficiencia,
              final: proficiencia,
              loading: correctDataLoading
            });
            return proficiencia.toFixed(0);
          })()}
        </td>
      )}
      {visibleFields?.nivel && (
        <td className="p-2 border-t border-gray-200 bg-gray-50 text-center">
          {(() => {
            // ✅ Aguardar dados corretos carregarem
            if (correctDataLoading) {
              return <span className="text-gray-400">...</span>;
            }
            
            const classificacao = correctStudentData?.classificacao || realStudentData.classificacao;
            console.log(`🔍 Classificação para ${student.nome}:`, {
              correctStudentData: correctStudentData?.classificacao,
              realStudentData: realStudentData.classificacao,
              final: classificacao,
              loading: correctDataLoading
            });
            return (
              <span className={`px-2 py-1 rounded-full text-xs text-white ${
                classificacao === 'Abaixo do Básico' ? 'bg-red-500' :
                classificacao === 'Básico' ? 'bg-yellow-400' :
                classificacao === 'Adequado' ? 'bg-blue-500' :
                'bg-green-500'
              }`}>
                {classificacao}
              </span>
            );
          })()}
        </td>
      )}
    </tr>
  );
}; 