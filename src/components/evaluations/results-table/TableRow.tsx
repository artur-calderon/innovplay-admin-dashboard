import React from 'react';
import { Eye } from 'lucide-react';
import { StudentResult, VisibleFields } from '../../../types/results-table';
import { useStudentAnswers, useRealStudentData } from '../../../hooks/useResultsTable';

interface TableRowProps {
  student: StudentResult;
  studentIndex: number;
  totalQuestions: number;
  visibleFields: VisibleFields;
  onViewStudentDetails: (studentId: string) => void;
  detailedReport?: any;
}

export const TableRow: React.FC<TableRowProps> = ({
  student,
  studentIndex,
  totalQuestions,
  visibleFields,
  onViewStudentDetails,
  detailedReport
}) => {
  const answers = useStudentAnswers(student, totalQuestions, detailedReport);
  const realStudentData = useRealStudentData(student, detailedReport);
  
    // ✅ DEBUG: Log dos dados do aluno para verificar consistência
  React.useEffect(() => {
    if (detailedReport?.alunos) {
      const alunoData = detailedReport.alunos.find((a: any) => a.id === student.id);
      if (alunoData) {
        // ✅ Calcular dados reais baseados nas respostas individuais
        const totalQuestions = detailedReport.questoes?.length || 0;
        const respostas = alunoData.respostas || [];
        
        const acertosReais = respostas.filter((r: any) => r.resposta_correta === true).length;
        const errosReais = respostas.filter((r: any) => r.resposta_correta === false).length;
        const naoRespondidas = totalQuestions - acertosReais - errosReais;
        
        // Calcular nota real (0-10)
        const percentualAcertos = totalQuestions > 0 ? (acertosReais / totalQuestions) * 100 : 0;
        const notaReal = (percentualAcertos / 100) * 10;
        
        // Estimar proficiência real
        const proficienciaReal = notaReal * 40; // 10 = 400, 5 = 200, etc.
        
        // Determinar classificação real
        let classificacaoReal = 'Abaixo do Básico';
        if (notaReal >= 7.5) classificacaoReal = 'Avançado';
        else if (notaReal >= 6.0) classificacaoReal = 'Adequado';
        else if (notaReal >= 4.0) classificacaoReal = 'Básico';
        
        console.log(`🔍 Dados do aluno ${student.nome}:`, {
          // Dados do frontend (student) - INCORRETOS
          frontend_incorreto: {
            acertos: student.acertos,
            nota: student.nota,
            proficiencia: student.proficiencia,
            classificacao: student.classificacao
          },
          // Dados do backend (alunoData) - INCORRETOS
          backend_incorreto: {
            total_acertos: alunoData.total_acertos,
            nota_final: alunoData.nota_final,
            proficiencia: alunoData.proficiencia,
            classificacao: alunoData.classificacao,
            respostas: alunoData.respostas?.length || 0
          },
          // ✅ DADOS REAIS CALCULADOS
          dados_reais: {
            acertos: acertosReais,
            erros: errosReais,
            nao_respondidas: naoRespondidas,
            nota: notaReal,
            proficiencia: proficienciaReal,
            classificacao: classificacaoReal
          },
          // Respostas individuais
          respostas: alunoData.respostas?.map((r: any) => ({
            questao: r.questao_numero,
            correta: r.resposta_correta,
            em_branco: r.resposta_em_branco
          })) || []
        });
      }
    }
  }, [student, detailedReport]);

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
      {visibleFields?.questoes && answers.map((answer, questionIndex) => (
        <td key={`${student.id}-q${questionIndex}`} className="px-4 py-2 border-t border-gray-200 border-r-2 border-gray-200 text-center align-middle">
          <div className="flex justify-center items-center h-full">
            {answer === true ? (
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
      ))}
      {visibleFields?.total && (
        <td className="p-2 border-t border-gray-200 font-semibold bg-gray-50 text-center">
          {realStudentData.acertos}
        </td>
      )}
      {visibleFields?.nota && (
        <td className="p-2 border-t border-gray-200 font-semibold bg-gray-50 text-center">
          {realStudentData.nota.toFixed(1)}
        </td>
      )}
      {visibleFields?.proficiencia && (
        <td className="p-2 border-t border-gray-200 font-semibold bg-gray-50 text-center">
          {realStudentData.proficiencia.toFixed(0)}
        </td>
      )}
      {visibleFields?.nivel && (
        <td className="p-2 border-t border-gray-200 bg-gray-50 text-center">
          <span className={`px-2 py-1 rounded-full text-xs text-white ${
            realStudentData.classificacao === 'Abaixo do Básico' ? 'bg-red-500' :
            realStudentData.classificacao === 'Básico' ? 'bg-yellow-400' :
            realStudentData.classificacao === 'Adequado' ? 'bg-blue-500' :
            'bg-green-500'
          }`}>
            {realStudentData.classificacao}
          </span>
        </td>
      )}
    </tr>
  );
}; 