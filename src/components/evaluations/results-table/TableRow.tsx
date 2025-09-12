import React from 'react';
import { Eye, Check, X, Minus } from 'lucide-react';
import { StudentResult, VisibleFields } from '../../../types/results-table';

// Interface para questões da tabela_detalhada
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

interface TableRowProps {
  student: StudentResult;
  studentIndex: number;
  totalQuestions: number;
  visibleFields: VisibleFields;
  onViewStudentDetails: (studentId: string) => void;
  detailedReport?: any;
  evaluationId?: string;
  // ✅ NOVO: Dados da tabela_detalhada para mapear respostas corretas
  tabelaDetalhada?: {
    disciplinas: TabelaDetalhadaDisciplina[];
  };
}

export const TableRow: React.FC<TableRowProps> = ({
  student,
  studentIndex,
  totalQuestions,
  visibleFields,
  onViewStudentDetails,
  detailedReport,
  evaluationId,
  tabelaDetalhada
}) => {
  
  // ✅ NOVO: Processar respostas reais da tabela_detalhada
  const processStudentAnswers = React.useMemo(() => {
    if (!tabelaDetalhada?.disciplinas?.length || !student.respostas) {
      return {};
    }

    const answersMap: Record<number, { respondeu: boolean; acertou: boolean }> = {};

    // Mapear respostas do aluno por número da questão
    student.respostas.forEach(resposta => {
      answersMap[resposta.questao_numero] = {
        respondeu: !resposta.resposta_em_branco,
        acertou: resposta.resposta_correta
      };
    });

    return answersMap;
  }, [tabelaDetalhada, student.respostas]);

  // ✅ NOVO: Obter todas as questões ordenadas
  const allQuestions = React.useMemo(() => {
    if (!tabelaDetalhada?.disciplinas?.length) {
      return [];
    }

    const questions: Array<{
      numero: number;
      habilidade: string;
      codigo_habilidade: string;
      question_id: string;
      disciplina: string;
    }> = [];

    tabelaDetalhada.disciplinas.forEach(disciplina => {
      disciplina.questoes.forEach(questao => {
        questions.push({
          numero: questao.numero,
          habilidade: questao.habilidade,
          codigo_habilidade: questao.codigo_habilidade,
          question_id: questao.question_id,
          disciplina: disciplina.nome
        });
      });
    });

    return questions.sort((a, b) => a.numero - b.numero);
  }, [tabelaDetalhada]);

  return (
    <tr 
      className="border-b hover:bg-gray-50 cursor-pointer group"
      onClick={() => onViewStudentDetails(student.id)}
      title="Clique para ver resultados detalhados do aluno"
    >
      {/* Nome do Aluno */}
      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap border border-gray-300">
        <div className="flex items-center gap-2">
          <span>{student.nome}</span>
          <Eye className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </td>

      {/* Questões individuais */}
      {allQuestions.map((questao) => {
        const answer = processStudentAnswers[questao.numero];
        
        return (
          <td key={`${student.id}-${questao.disciplina}-q${questao.numero}`} className="px-2 py-3 text-center border border-gray-300">
            {answer ? (
              // Aluno respondeu
              answer.acertou ? (
                <Check className="w-4 h-4 text-green-700 mx-auto" title={`Q${questao.numero} - ${questao.disciplina}: Acertou`} />
              ) : (
                <X className="w-4 h-4 text-red-600 mx-auto" title={`Q${questao.numero} - ${questao.disciplina}: Errou`} />
              )
            ) : (
              // Aluno não respondeu
              <Minus className="w-4 h-4 text-gray-400 mx-auto" title={`Q${questao.numero} - ${questao.disciplina}: Não respondeu`} />
            )}
          </td>
        );
      })}

      {/* Total de acertos */}
      <td className="px-4 py-3 text-sm font-semibold text-center border border-gray-300">
        {student.acertos}
      </td>

      {/* Nota */}
      <td className="px-4 py-3 text-sm text-center border border-gray-300">
        {student.nota.toFixed(1)}
      </td>

      {/* Proficiência */}
      <td className="px-4 py-3 text-sm text-center border border-gray-300">
        {student.proficiencia}
      </td>

      {/* Nível */}
      <td className="px-4 py-3 text-sm font-medium text-center border border-gray-300">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-white ${
          student.classificacao === 'Avançado'
            ? 'bg-green-600'
            : student.classificacao === 'Adequado'
            ? 'bg-green-400'
            : student.classificacao === 'Básico'
            ? 'bg-yellow-500'
            : student.classificacao === 'Abaixo do Básico'
            ? 'bg-red-500'
            : 'bg-red-500'
        }`}>
          {student.classificacao || 'Abaixo do Básico'}
        </span>
      </td>
    </tr>
  );
}; 