import React, { useState } from 'react';
import { CheckCircle2, Target, Gauge, Award } from 'lucide-react';
import { QuestionData, VisibleFields } from '../../../types/results-table';

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

interface TableHeaderProps {
  totalQuestions: number;
  startQuestionNumber: number;
  questoes?: QuestionData[];
  visibleFields: VisibleFields;
  // ✅ NOVO: Dados da tabela_detalhada
  tabelaDetalhada?: {
    disciplinas: TabelaDetalhadaDisciplina[];
  };
  students?: Array<{
    id: string;
    nome: string;
    acertos: number;
    erros: number;
    em_branco: number;
    respostas?: Array<{
      questao_id: string;
      questao_numero: number;
      resposta_correta: boolean;
      resposta_em_branco: boolean;
      tempo_gasto: number;
    }>;
    [key: string]: any;
  }>;
  successThreshold?: number;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  totalQuestions,
  startQuestionNumber,
  questoes,
  visibleFields,
  tabelaDetalhada,
  students = [],
  successThreshold = 60
}) => {
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  // ✅ NOVO: Processar questões da tabela_detalhada
  const processQuestionsFromTabelaDetalhada = () => {
    if (!tabelaDetalhada?.disciplinas?.length) {
      return [];
    }

    const allQuestions: Array<{
      numero: number;
      habilidade: string;
      codigo_habilidade: string;
      question_id: string;
      disciplina: string;
      disciplina_id: string;
    }> = [];

    // Coletar todas as questões de todas as disciplinas
    tabelaDetalhada.disciplinas.forEach(disciplina => {
      disciplina.questoes.forEach(questao => {
        allQuestions.push({
          numero: questao.numero,
          habilidade: questao.habilidade,
          codigo_habilidade: questao.codigo_habilidade,
          question_id: questao.question_id,
          disciplina: disciplina.nome,
          disciplina_id: disciplina.id
        });
      });
    });

    // Ordenar por número da questão
    return allQuestions.sort((a, b) => a.numero - b.numero);
  };

  const processedQuestions = processQuestionsFromTabelaDetalhada();

  // Função para calcular estatísticas de uma questão
  const getQuestionStats = (questionNumber: number) => {
    if (!students.length) return { correct: 0, total: 0, percentage: 0 };

    let correct = 0;
    let total = 0;

    students.forEach(student => {
      if (student.respostas) {
        const response = student.respostas.find(r => r.questao_numero === questionNumber);
        if (response && !response.resposta_em_branco) {
          total++;
          if (response.resposta_correta) {
            correct++;
          }
        }
      }
    });
    
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { correct, total, percentage };
  };

  // Função para obter cor baseada na porcentagem de acertos
  const getPercentageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
    if (percentage >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  // Função para obter cor baseada no threshold
  const getThresholdColor = (percentage: number) => {
    return percentage >= successThreshold ? 'text-green-600' : 'text-red-600';
  };

  return (
    <thead>
      {/* Linha 1: Cabeçalhos principais */}
      <tr className="bg-gray-100">
        <th rowSpan={3} className="border border-gray-300 p-2 text-center font-semibold">ALUNO</th>
        {processedQuestions.map((questao) => (
          <th key={questao.question_id} className="border border-gray-300 p-1 text-center font-semibold">
            <div className="text-xs font-bold">Q{questao.numero}</div>
            <div className="text-xs text-gray-600 mt-1">{questao.disciplina}</div>
          </th>
        ))}
        <th rowSpan={3} className="border border-gray-300 p-2 text-center font-semibold">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            TOTAL
          </div>
        </th>
        <th rowSpan={3} className="border border-gray-300 p-2 text-center font-semibold">
          <div className="flex items-center justify-center gap-1">
            <Target className="h-4 w-4" />
            NOTA
          </div>
        </th>
        <th rowSpan={3} className="border border-gray-300 p-2 text-center font-semibold">
          <div className="flex items-center justify-center gap-1">
            <Gauge className="h-4 w-4" />
            PROFICIÊNCIA
          </div>
        </th>
        <th rowSpan={3} className="border border-gray-300 p-2 text-center font-semibold">
          <div className="flex items-center justify-center gap-1">
            <Award className="h-4 w-4" />
            NÍVEL
          </div>
        </th>
      </tr>
      
      {/* Linha 2: HABILIDADE */}
      <tr className="bg-green-50">
        <td className="border border-gray-300 p-1 text-center">
          <div className="text-xs font-semibold text-blue-600">HABILIDADE</div>
        </td>
        {processedQuestions.map((questao) => (
          <td key={`skill-${questao.question_id}`} className="border border-gray-300 p-1 text-center">
            <div 
              className="text-xs font-semibold text-blue-600 cursor-help"
              title={questao.habilidade}
            >
              {questao.codigo_habilidade}
            </div>
          </td>
        ))}
        <td className="border border-gray-300 p-1 text-center"></td>
        <td className="border border-gray-300 p-1 text-center"></td>
        <td className="border border-gray-300 p-1 text-center"></td>
        <td className="border border-gray-300 p-1 text-center"></td>
      </tr>
      
      {/* Linha 3: % DA TURMA */}
      <tr className="bg-green-50">
        <td className="border border-gray-300 p-1 text-center">
          <div className="text-xs font-semibold text-green-600">% DA TURMA</div>
          <div className="text-xs text-green-500">(SÓ QUEM FEZ)</div>
        </td>
        {processedQuestions.map((questao) => {
          const stats = getQuestionStats(questao.numero);
          return (
            <td key={`stats-${questao.question_id}`} className="border border-gray-300 p-1 text-center">
              <div className="text-xs font-semibold text-green-600">{stats.percentage}%</div>
            </td>
          );
        })}
        <td className="border border-gray-300 p-1 text-center"></td>
        <td className="border border-gray-300 p-1 text-center"></td>
        <td className="border border-gray-300 p-1 text-center"></td>
        <td className="border border-gray-300 p-1 text-center"></td>
      </tr>
    </thead>
  );
};