import React, { useState } from 'react';
import { CheckCircle2, Target, Gauge, Award, Users } from 'lucide-react';
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

    // ✅ NOVO: Log detalhado do processamento no TableHeader
    console.log('🔍 [DEBUG] TableHeader - Processando questões:');
    console.log('📊 Dados da tabela_detalhada:', tabelaDetalhada);

    // Coletar todas as questões de todas as disciplinas
    tabelaDetalhada.disciplinas.forEach((disciplina, disciplinaIndex) => {
      console.log(`📚 Disciplina ${disciplinaIndex + 1}: ${disciplina.nome}`);
      disciplina.questoes.forEach((questao, questaoIndex) => {
        console.log(`    Q${questao.numero} (índice ${questaoIndex}): ${questao.habilidade} [${questao.codigo_habilidade}]`);
        
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
    const sortedQuestions = allQuestions.sort((a, b) => a.numero - b.numero);
    
    console.log('📝 TableHeader - Questões ordenadas para renderização:');
    sortedQuestions.forEach((questao, index) => {
      console.log(`  ${index + 1}. Q${questao.numero} - ${questao.disciplina}: ${questao.habilidade}`);
    });

    return sortedQuestions;
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
      {/* Cabeçalho simplificado - uma única linha */}
      <tr className="bg-gradient-to-r from-gray-100 to-gray-200 border-b-2 border-gray-300">
        <th className="border border-gray-300 p-2 text-center font-semibold text-gray-700">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              ALUNO
            </div>
            {visibleFields.habilidade && (
              <div className="text-xs text-blue-600 font-medium">HABILIDADE</div>
            )}
            {visibleFields.percentualTurma && (
              <div className="text-xs text-green-600 font-medium">% DA TURMA</div>
            )}
          </div>
        </th>
        {processedQuestions.map((questao, index) => (
          <th key={questao.question_id} className="border border-gray-300 p-1 text-center font-semibold hover:bg-gray-200 transition-colors">
            <div className="text-xs font-bold text-gray-800">Q{questao.numero}</div>
            <div className="text-xs text-gray-600 mt-1">{questao.disciplina}</div>
            {visibleFields.habilidade && (
              <div 
                className="text-xs font-semibold text-blue-600 cursor-help hover:bg-blue-100 rounded px-1 py-0.5 transition-colors mt-1" 
                title={questao.habilidade}
                onMouseEnter={() => setHoveredSkill(questao.habilidade)}
                onMouseLeave={() => setHoveredSkill(null)}
              >
                {questao.codigo_habilidade}
              </div>
            )}
            {visibleFields.percentualTurma && (
              <div className="mt-1">
                {(() => {
                  const stats = getQuestionStats(questao.numero);
                  return (
                    <div className={`text-xs font-semibold px-2 py-1 rounded ${getPercentageColor(stats.percentage)}`}>
                      {stats.percentage}%
                    </div>
                  );
                })()}
              </div>
            )}
          </th>
        ))}
        <th className="border border-gray-300 p-2 text-center font-semibold text-gray-700">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            TOTAL
          </div>
        </th>
        <th className="border border-gray-300 p-2 text-center font-semibold text-gray-700">
          <div className="flex items-center justify-center gap-1">
            <Target className="h-4 w-4" />
            NOTA
          </div>
        </th>
        <th className="border border-gray-300 p-2 text-center font-semibold text-gray-700">
          <div className="flex items-center justify-center gap-1">
            <Gauge className="h-4 w-4" />
            PROFICIÊNCIA
          </div>
        </th>
        <th className="border border-gray-300 p-2 text-center font-semibold text-gray-700">
          <div className="flex items-center justify-center gap-1">
            <Award className="h-4 w-4" />
            NÍVEL
          </div>
        </th>
      </tr>
    </thead>
  );
};